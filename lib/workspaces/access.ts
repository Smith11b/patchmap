import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type WorkspaceMembership = {
  workspace_id: string;
  role: string;
};

export async function assertWorkspaceMembership(userId: string, workspaceId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check workspace membership: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data;
}

export async function getLatestPatchmapForPullRequest(
  pullRequestId: string
): Promise<{ id: string; created_by_user_id: string | null } | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("patchmaps")
    .select("id, created_by_user_id, version_number, created_at")
    .eq("pull_request_id", pullRequestId)
    .order("version_number", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve latest patchmap: ${error.message}`);
  }

  return data;
}

export async function getPatchmapAuthorship(
  patchmapId: string
): Promise<{ id: string; created_by_user_id: string | null } | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("patchmaps")
    .select("id, created_by_user_id")
    .eq("id", patchmapId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load patchmap authorship: ${error.message}`);
  }

  return data;
}

export function canUserEditPatchmap(
  membership: WorkspaceMembership | null,
  userId: string,
  patchmapAuthorUserId: string | null
): boolean {
  if (!membership) {
    return false;
  }

  return membership.role === "owner" || patchmapAuthorUserId === userId;
}

export async function getWorkspaceIdForPullRequest(pullRequestId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("pull_requests")
    .select("id, repositories!inner(workspace_id)")
    .eq("id", pullRequestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve pull request workspace: ${error.message}`);
  }

  if (!data) return null;

  const repo = Array.isArray(data.repositories) ? data.repositories[0] : data.repositories;
  return repo?.workspace_id ?? null;
}

export async function getWorkspaceIdForPatchmap(patchmapId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("patchmaps")
    .select("id, pull_requests!inner(repositories!inner(workspace_id))")
    .eq("id", patchmapId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve patchmap workspace: ${error.message}`);
  }

  if (!data) return null;

  const pr = Array.isArray(data.pull_requests) ? data.pull_requests[0] : data.pull_requests;
  const repo = Array.isArray(pr?.repositories) ? pr.repositories[0] : pr?.repositories;

  return repo?.workspace_id ?? null;
}
