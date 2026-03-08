import { ProviderPullRequestData, ProviderPullRequestFile } from "@/lib/providers/types";

type GitLabMergeRequestResponse = {
  iid: number;
  title: string;
  description: string | null;
  state: "opened" | "closed" | "merged" | "locked";
  source_branch: string;
  target_branch: string;
  diff_refs?: {
    base_sha?: string;
    head_sha?: string;
    start_sha?: string;
  } | null;
};

function getGitLabBaseUrl(explicitBaseUrl?: string | null): string {
  const baseUrl = explicitBaseUrl ?? process.env.GITLAB_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing GITLAB_BASE_URL");
  }

  return baseUrl.replace(/\/+$/, "");
}

function getGitLabHeaders(token?: string | null): HeadersInit {
  const authToken = token ?? process.env.GITLAB_TOKEN;
  if (!authToken) {
    throw new Error("Missing GITLAB_TOKEN");
  }

  return {
    "PRIVATE-TOKEN": authToken,
    Accept: "application/json",
  };
}

function getFileExtension(filePath: string): string | null {
  const lastSegment = filePath.split("/").pop();
  if (!lastSegment || !lastSegment.includes(".")) return null;
  return lastSegment.split(".").pop() ?? null;
}

function getTopLevelDir(filePath: string): string | null {
  return filePath.split("/")[0] ?? null;
}

function mapGitLabState(
  state: GitLabMergeRequestResponse["state"]
): ProviderPullRequestData["state"] {
  switch (state) {
    case "merged":
      return "merged";
    case "closed":
    case "locked":
      return "closed";
    case "opened":
    default:
      return "open";
  }
}

function parseRawDiffFiles(rawDiff: string): ProviderPullRequestFile[] {
  const blocks = rawDiff
    .split("diff --git ")
    .map((part) => part.trimEnd())
    .filter(Boolean)
    .map((part) => `diff --git ${part}`);

  const files: ProviderPullRequestFile[] = [];

  for (const [index, block] of blocks.entries()) {
    const lines = block.split("\n");
    const header = lines[0] ?? "";
    const match = header.match(/^diff --git a\/(.+?) b\/(.+)$/);

    if (!match) {
      continue;
    }

    const oldPath = match[1];
    let nextFilePath = match[2];
    let nextOldFilePath: string | null = oldPath === nextFilePath ? null : oldPath;
    let changeType: ProviderPullRequestFile["changeType"] = "modified";

    for (const line of lines) {
      if (line.startsWith("new file mode ")) {
        changeType = "added";
      } else if (line.startsWith("deleted file mode ")) {
        changeType = "deleted";
      } else if (line.startsWith("rename from ")) {
        changeType = "renamed";
        nextOldFilePath = line.replace("rename from ", "").trim();
      } else if (line.startsWith("rename to ")) {
        nextFilePath = line.replace("rename to ", "").trim();
      }
    }

    files.push({
      filePath: nextFilePath,
      oldFilePath: nextOldFilePath,
      changeType,
      patchText: block,
      fileExtension: getFileExtension(nextFilePath),
      topLevelDir: getTopLevelDir(nextFilePath),
      displayOrder: index,
    });
  }

  return files;
}


async function fetchJson<T>(url: string, token?: string | null): Promise<T> {
  const response = await fetch(url, {
    headers: getGitLabHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitLab API request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

async function fetchText(url: string, token?: string | null): Promise<string> {
  const response = await fetch(url, {
    headers: getGitLabHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitLab API request failed (${response.status}): ${text}`);
  }

  return response.text();
}

export function splitGitLabProjectPath(projectPath: string): {
  owner: string;
  name: string;
} {
  const parts = projectPath.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error(
      `Invalid GitLab projectPath: "${projectPath}". Expected at least group/project.`
    );
  }

  return {
    owner: parts.slice(0, -1).join("/"),
    name: parts[parts.length - 1],
  };
}

export async function getGitLabPullRequestData(params: {
  projectPath: string;
  prNumber: number;
  token?: string | null;
  baseUrl?: string | null;
}): Promise<ProviderPullRequestData> {
  const baseUrl = getGitLabBaseUrl(params.baseUrl);
  const projectId = encodeURIComponent(params.projectPath);

  const mergeRequestUrl = `${baseUrl}/api/v4/projects/${projectId}/merge_requests/${params.prNumber}`;
  const rawDiffsUrl = `${baseUrl}/api/v4/projects/${projectId}/merge_requests/${params.prNumber}/raw_diffs`;

  const [mergeRequest, rawDiff] = await Promise.all([
    fetchJson<GitLabMergeRequestResponse>(mergeRequestUrl, params.token),
    fetchText(rawDiffsUrl, params.token),
  ]);

  const files = parseRawDiffFiles(rawDiff);
  const projectParts = splitGitLabProjectPath(params.projectPath);

  return {
    provider: "gitlab",
    ownerOrNamespace: projectParts.owner,
    repoName: projectParts.name,
    prNumber: mergeRequest.iid,
    title: mergeRequest.title,
    description: mergeRequest.description,
    sourceBranch: mergeRequest.source_branch,
    targetBranch: mergeRequest.target_branch,
    baseSha: mergeRequest.diff_refs?.base_sha ?? null,
    headSha: mergeRequest.diff_refs?.head_sha ?? null,
    state: mapGitLabState(mergeRequest.state),
    files,
  };
}
