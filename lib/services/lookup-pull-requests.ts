import {
  LookupPullRequestQuery,
  LookupPullRequestResponse,
} from "@/lib/schemas/lookup-pull-requests";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RepositoryRow = {
  id: string;
  provider: "github" | "gitlab" | "azure";
  owner: string;
  name: string;
  workspace: { id: string; slug: string; name: string } | Array<{ id: string; slug: string; name: string }>;
};

type PullRequestRow = {
  id: string;
  pr_number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  source_branch: string | null;
  target_branch: string | null;
  base_sha: string | null;
  head_sha: string | null;
  repository_id: string;
};

function normalizeWorkspace(workspace: RepositoryRow["workspace"]) {
  return Array.isArray(workspace) ? workspace[0] : workspace;
}

async function mapResponse(repository: RepositoryRow, pullRequest: PullRequestRow): Promise<LookupPullRequestResponse> {
  const supabase = createAdminSupabaseClient();

  const { data: files, error: filesError } = await supabase
    .from("pr_files")
    .select(
      `
      id,
      file_path,
      old_file_path,
      change_type,
      patch_text,
      file_extension,
      top_level_dir,
      display_order
    `
    )
    .eq("pull_request_id", pullRequest.id)
    .order("display_order", { ascending: true });

  if (filesError) {
    throw new Error(`Failed to load PR files: ${filesError.message}`);
  }

  const workspace = normalizeWorkspace(repository.workspace);
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

export async function lookupPullRequest(
  input: LookupPullRequestQuery
): Promise<LookupPullRequestResponse | null> {
  const supabase = createAdminSupabaseClient();

  if (input.pullRequestId) {
    const { data: pullRequest, error: pullRequestError } = await supabase
      .from("pull_requests")
      .select(
        `
        id,
        repository_id,
        pr_number,
        title,
        url,
        state,
        source_branch,
        target_branch,
        base_sha,
        head_sha
      `
      )
      .eq("id", input.pullRequestId)
      .maybeSingle();

    if (pullRequestError || !pullRequest) {
      return null;
    }

    const { data: repository, error: repositoryError } = await supabase
      .from("repositories")
      .select(
        `
        id,
        provider,
        owner,
        name,
        workspace:workspaces (
          id,
          slug,
          name
        )
      `
      )
      .eq("id", pullRequest.repository_id)
      .maybeSingle();

    if (repositoryError || !repository) {
      return null;
    }

    return mapResponse(repository, pullRequest);
  }

  const { workspaceId, provider, owner, name, prNumber } = input;

  if (!workspaceId || !provider || !owner || !name || !prNumber) {
    return null;
  }

  const { data: repository, error: repositoryError } = await supabase
    .from("repositories")
    .select(
      `
      id,
      provider,
      owner,
      name,
      workspace:workspaces (
        id,
        slug,
        name
      )
    `
    )
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("owner", owner)
    .eq("name", name)
    .maybeSingle();

  if (repositoryError || !repository) {
    return null;
  }

  const { data: pullRequest, error: pullRequestError } = await supabase
    .from("pull_requests")
    .select(
      `
      id,
      repository_id,
      pr_number,
      title,
      url,
      state,
      source_branch,
      target_branch,
      base_sha,
      head_sha
    `
    )
    .eq("repository_id", repository.id)
    .eq("pr_number", prNumber)
    .maybeSingle();

  if (pullRequestError || !pullRequest) {
    return null;
  }

  return mapResponse(repository, pullRequest);
}

