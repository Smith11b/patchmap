import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getGitHubAppInstallUrl } from "@/lib/providers/github-app";

const GITHUB_APP_STATE_COOKIE = "pm-github-app-state";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) {
    return auth.response;
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(GITHUB_APP_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(getGitHubAppInstallUrl(state));
}
