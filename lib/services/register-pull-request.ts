import {
  RegisterPullRequestRequest,
  RegisterPullRequestResponse,
} from "@/lib/schemas/register-pull-request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getFileExtension(filePath: string): string | null {
  const lastSegment = filePath.split("/").pop();
  if (!lastSegment || !lastSegment.includes(".")) {
    return null;
  }

  return lastSegment.split(".").pop() ?? null;
}

function getTopLevelDir(filePath: string): string | null {
  const first = filePath.split("/")[0];
  return first || null;
}

export async function registerPullRequest(
  input: RegisterPullRequestRequest
): Promise<RegisterPullRequestResponse> {
  const supabase = createServerSupabaseClient();

  const { workspaceSlug, repository, pullRequest, files } = input;

  // 1. Find workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, name")
    .eq("slug", workspaceSlug)
    .single();

  if (workspaceError || !workspace) {
    throw new Error(`Workspace not found for slug: ${workspaceSlug}`);
  }

  // 2. Upsert repository
  const { data: repositoryRows, error: repositoryError } = await supabase
    .from("repositories")
    .upsert(
      {
        workspace_id: workspace.id,
        provider: repository.provider,
        owner: repository.owner,
        name: repository.name,
        default_branch: repository.defaultBranch ?? null,
        external_repo_id: repository.externalRepoId ?? null,
      },
      {
        onConflict: "provider,owner,name",
      }
    )
    .select("id, provider, owner, name")
    .single();

  if (repositoryError || !repositoryRows) {
    throw new Error(
      `Failed to upsert repository: ${repositoryError?.message ?? "unknown error"}`
    );
  }

  const repo = repositoryRows;

  // 3. Upsert pull request
  const { data: pullRequestRow, error: pullRequestError } = await supabase
    .from("pull_requests")
    .upsert(
      {
        repository_id: repo.id,
        provider: repository.provider,
        pr_number: pullRequest.prNumber,
        title: pullRequest.title,
        description: pullRequest.description ?? null,
        url: pullRequest.url,
        source_branch: pullRequest.sourceBranch ?? null,
        target_branch: pullRequest.targetBranch ?? null,
        base_sha: pullRequest.baseSha ?? null,
        head_sha: pullRequest.headSha ?? null,
        state: pullRequest.state ?? "open",
      },
      {
        onConflict: "repository_id,pr_number",
      }
    )
    .select("id, pr_number, title, url, state")
    .single();

  if (pullRequestError || !pullRequestRow) {
    throw new Error(
      `Failed to upsert pull request: ${pullRequestError?.message ?? "unknown error"}`
    );
  }

  const pr = pullRequestRow;

  // 4. Replace PR files
  const { error: deleteFilesError } = await supabase
    .from("pr_files")
    .delete()
    .eq("pull_request_id", pr.id);

  if (deleteFilesError) {
    throw new Error(
      `Failed to clear PR files: ${deleteFilesError.message}`
    );
  }

  if (files.length > 0) {
    const fileRows = files.map((file) => ({
      pull_request_id: pr.id,
      file_path: file.filePath,
      old_file_path: file.oldFilePath ?? null,
      change_type: file.changeType,
      file_extension:
        file.fileExtension ?? getFileExtension(file.filePath),
      top_level_dir: file.topLevelDir ?? getTopLevelDir(file.filePath),
      display_order: file.displayOrder,
    }));

    const { error: insertFilesError } = await supabase
      .from("pr_files")
      .insert(fileRows);

    if (insertFilesError) {
      throw new Error(
        `Failed to insert PR files: ${insertFilesError.message}`
      );
    }
  }

  return {
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
    },
    repository: {
      id: repo.id,
      provider: repo.provider,
      owner: repo.owner,
      name: repo.name,
    },
    pullRequest: {
      id: pr.id,
      prNumber: pr.pr_number,
      title: pr.title,
      url: pr.url,
      state: pr.state,
    },
    fileCount: files.length,
  };
}
