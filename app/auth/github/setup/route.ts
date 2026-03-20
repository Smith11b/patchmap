import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGitHubAppInstallation } from "@/lib/providers/github-app";
import { upsertGitHubAppInstallationForUser } from "@/lib/services/github-app-installations";

const GITHUB_APP_STATE_COOKIE = "pm-github-app-state";

function redirectToSettings(requestUrl: URL, params: Record<string, string>) {
  const redirectUrl = new URL("/settings", requestUrl.origin);

  Object.entries(params).forEach(([key, value]) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const installationIdValue = requestUrl.searchParams.get("installation_id");
  const state = requestUrl.searchParams.get("state");
  const setupAction = requestUrl.searchParams.get("setup_action");

  if (!installationIdValue || !state) {
    return redirectToSettings(requestUrl, {
      github_app: "error",
      message: "Missing GitHub installation callback details.",
    });
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GITHUB_APP_STATE_COOKIE)?.value;
  cookieStore.delete(GITHUB_APP_STATE_COOKIE);

  if (!expectedState || expectedState !== state) {
    return redirectToSettings(requestUrl, {
      github_app: "error",
      message: "GitHub connection state expired. Try connecting again.",
    });
  }

  const installationId = Number(installationIdValue);
  if (!Number.isFinite(installationId)) {
    return redirectToSettings(requestUrl, {
      github_app: "error",
      message: "Invalid GitHub installation id.",
    });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToSettings(requestUrl, {
      github_app: "error",
      message: "Sign in again before connecting GitHub.",
    });
  }

  try {
    const installation = await getGitHubAppInstallation(installationId);

    await upsertGitHubAppInstallationForUser({
      userId: user.id,
      githubInstallationId: installation.id,
      accountLogin: installation.account?.login ?? "unknown",
      accountType: installation.account?.type ?? "User",
      targetId: installation.account?.id ?? null,
      repositoriesSelection: installation.repository_selection,
    });

    return redirectToSettings(requestUrl, {
      github_app: setupAction === "update" ? "updated" : "connected",
    });
  } catch (error) {
    return redirectToSettings(requestUrl, {
      github_app: "error",
      message: error instanceof Error ? error.message : "Failed to finish GitHub setup.",
    });
  }
}
