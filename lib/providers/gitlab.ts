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

function getGitLabBaseUrl(): string {
  const baseUrl = process.env.GITLAB_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing GITLAB_BASE_URL");
  }

  return baseUrl.replace(/\/+$/, "");
}

function getGitLabHeaders(): HeadersInit {
  const token = process.env.GITLAB_TOKEN;
  if (!token) {
    throw new Error("Missing GITLAB_TOKEN");
  }

  return {
    "PRIVATE-TOKEN": token,
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
  const lines = rawDiff.split("\n");
  const files: ProviderPullRequestFile[] = [];

  let currentFile: ProviderPullRequestFile | null = null;
  let displayOrder = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (currentFile) {
        files.push(currentFile);
      }

      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (!match) {
        currentFile = null;
        continue;
      }

      const oldPath = match[1];
      const newPath = match[2];

      currentFile = {
        filePath: newPath,
        oldFilePath: oldPath === newPath ? null : oldPath,
        changeType: "modified",
        fileExtension: getFileExtension(newPath),
        topLevelDir: getTopLevelDir(newPath),
        displayOrder: displayOrder++,
      };

      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith("new file mode ")) {
      currentFile.changeType = "added";
    } else if (line.startsWith("deleted file mode ")) {
      currentFile.changeType = "deleted";
    } else if (line.startsWith("rename from ")) {
      currentFile.changeType = "renamed";
      currentFile.oldFilePath = line.replace("rename from ", "").trim();
    } else if (line.startsWith("rename to ")) {
      currentFile.filePath = line.replace("rename to ", "").trim();
      currentFile.fileExtension = getFileExtension(currentFile.filePath);
      currentFile.topLevelDir = getTopLevelDir(currentFile.filePath);
    }
  }

  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: getGitLabHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitLab API request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: getGitLabHeaders(),
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
}): Promise<ProviderPullRequestData> {
  const baseUrl = getGitLabBaseUrl();
  const projectId = encodeURIComponent(params.projectPath);

  const mergeRequestUrl = `${baseUrl}/api/v4/projects/${projectId}/merge_requests/${params.prNumber}`;
  const rawDiffsUrl = `${baseUrl}/api/v4/projects/${projectId}/merge_requests/${params.prNumber}/raw_diffs`;

  const [mergeRequest, rawDiff] = await Promise.all([
    fetchJson<GitLabMergeRequestResponse>(mergeRequestUrl),
    fetchText(rawDiffsUrl),
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
