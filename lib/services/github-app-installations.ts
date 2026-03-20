import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type GitHubAppInstallationRecord = {
  id: string;
  githubInstallationId: number;
  accountLogin: string;
  accountType: string;
  targetId: number | null;
  repositoriesSelection: string | null;
  installedAt: string;
  updatedAt: string;
};

function mapInstallationRow(row: {
  id: string;
  github_installation_id: number;
  account_login: string;
  account_type: string;
  target_id: number | null;
  repositories_selection: string | null;
  installed_at: string;
  updated_at: string;
}): GitHubAppInstallationRecord {
  return {
    id: row.id,
    githubInstallationId: row.github_installation_id,
    accountLogin: row.account_login,
    accountType: row.account_type,
    targetId: row.target_id,
    repositoriesSelection: row.repositories_selection,
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertGitHubAppInstallationForUser(params: {
  userId: string;
  githubInstallationId: number;
  accountLogin: string;
  accountType: string;
  targetId?: number | null;
  repositoriesSelection?: string | null;
}) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("github_app_user_installations")
    .upsert(
      {
        user_id: params.userId,
        github_installation_id: params.githubInstallationId,
        account_login: params.accountLogin,
        account_type: params.accountType,
        target_id: params.targetId ?? null,
        repositories_selection: params.repositoriesSelection ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "github_installation_id",
      }
    )
    .select(
      "id, github_installation_id, account_login, account_type, target_id, repositories_selection, installed_at, updated_at"
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to save GitHub App installation: ${error?.message ?? "unknown error"}`);
  }

  return mapInstallationRow(data);
}

export async function listGitHubAppInstallationsForUser(userId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("github_app_user_installations")
    .select(
      "id, github_installation_id, account_login, account_type, target_id, repositories_selection, installed_at, updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load GitHub App installations: ${error.message}`);
  }

  return (data ?? []).map(mapInstallationRow);
}

export async function removeGitHubAppInstallationForUser(params: {
  userId: string;
  installationId: string;
}) {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("github_app_user_installations")
    .delete()
    .eq("user_id", params.userId)
    .eq("id", params.installationId);

  if (error) {
    throw new Error(`Failed to remove GitHub App installation: ${error.message}`);
  }
}

export async function getMatchingGitHubAppInstallationForUser(params: {
  userId: string;
  owner: string;
}) {
  const installations = await listGitHubAppInstallationsForUser(params.userId);
  return (
    installations.find(
      (installation) => installation.accountLogin.toLowerCase() === params.owner.toLowerCase()
    ) ?? null
  );
}
