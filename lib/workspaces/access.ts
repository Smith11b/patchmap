import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
