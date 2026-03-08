import {
  LookupPullRequestQuery,
  LookupPullRequestResponse,
} from "@/lib/schemas/lookup-pull-requests";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function lookupPullRequest(
  input: LookupPullRequestQuery
): Promise<LookupPullRequestResponse | null> {
  const supabase = createServerSupabaseClient();

  const { provider, owner, name, prNumber } = input;

  const { data: repository, error: repositoryError } = await supabase
    .from("repositories")
    .select(`
      id,
      provider,
      owner,
      name,
      workspace:workspaces (
        id,
        slug,
        name
      )
    `)
    .eq("provider", provider)
    .eq("owner", owner)
    .eq("name", name)
    .single();

  if (repositoryError || !repository) {
    return null;
  }

  const { data: pullRequest, error: pullRequestError } = await supabase
    .from("pull_requests")
    .select(`
      id,
      pr_number,
      title,
      url,
      state,
      source_branch,
      target_branch,
      base_sha,
      head_sha
    `)
    .eq("repository_id", repository.id)
    .eq("pr_number", prNumber)
    .single();

  if (pullRequestError || !pullRequest) {
    return null;
  }

  const { data: files, error: filesError } = await supabase
    .from("pr_files")
    .select(`
      id,
      file_path,
      old_file_path,
      change_type,
      patch_text,
      file_extension,
      top_level_dir,
      display_order
    `)
    .eq("pull_request_id", pullRequest.id)
    .order("display_order", { ascending: true });

  if (filesError) {
    throw new Error(`Failed to load PR files: ${filesError.message}`);
  }

  const workspace = Array.isArray(repository.workspace)
    ? repository.workspace[0]
    : repository.workspace;

  if (!workspace) {
    throw new Error("Repository workspace not found");
  }

  return {
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
    },
    repository: {
      id: repository.id,
      provider: repository.provider,
      owner: repository.owner,
      name: repository.name,
    },
    pullRequest: {
      id: pullRequest.id,
      prNumber: pullRequest.pr_number,
      title: pullRequest.title,
      url: pullRequest.url,
      state: pullRequest.state,
      sourceBranch: pullRequest.source_branch,
      targetBranch: pullRequest.target_branch,
      baseSha: pullRequest.base_sha,
      headSha: pullRequest.head_sha,
    },
    files: (files ?? []).map((file) => ({
      id: file.id,
      filePath: file.file_path,
      oldFilePath: file.old_file_path,
      changeType: file.change_type,
      patchText: file.patch_text,
      fileExtension: file.file_extension,
      topLevelDir: file.top_level_dir,
      displayOrder: file.display_order,
    })),
  };
}
