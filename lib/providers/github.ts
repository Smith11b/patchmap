import { ProviderPullRequestData, ProviderPullRequestFile } from "@/lib/providers/types";

type GitHubPullRequestResponse = {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  merged_at: string | null;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
};

type GitHubPullRequestFileResponse = {
  filename: string;
  previous_filename?: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | string;
};

function getGitHubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function getFileExtension(filePath: string): string | null {
  const lastSegment = filePath.split("/").pop();
  if (!lastSegment || !lastSegment.includes(".")) return null;
  return lastSegment.split(".").pop() ?? null;
}

function getTopLevelDir(filePath: string): string | null {
  return filePath.split("/")[0] ?? null;
}

function mapGitHubFileStatus(
  status: GitHubPullRequestFileResponse["status"]
): ProviderPullRequestFile["changeType"] {
  switch (status) {
    case "added":
      return "added";
    case "removed":
      return "deleted";
    case "renamed":
      return "renamed";
    default:
      return "modified";
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: getGitHubHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

async function fetchPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequestResponse> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  return fetchJson<GitHubPullRequestResponse>(url);
}

async function fetchPullRequestFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequestFileResponse[]> {
  const allFiles: GitHubPullRequestFileResponse[] = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const pageFiles = await fetchJson<GitHubPullRequestFileResponse[]>(url);

    allFiles.push(...pageFiles);

    if (pageFiles.length < 100) {
      break;
    }

    page += 1;
  }

  return allFiles;
}

export async function getGitHubPullRequestData(params: {
  owner: string;
  repo: string;
  prNumber: number;
}): Promise<ProviderPullRequestData> {
  const [pullRequest, files] = await Promise.all([
    fetchPullRequest(params.owner, params.repo, params.prNumber),
    fetchPullRequestFiles(params.owner, params.repo, params.prNumber),
  ]);

  return {
    provider: "github",
    ownerOrNamespace: params.owner,
    repoName: params.repo,
    prNumber: pullRequest.number,
    title: pullRequest.title,
    description: pullRequest.body,
    sourceBranch: pullRequest.head.ref,
    targetBranch: pullRequest.base.ref,
    baseSha: pullRequest.base.sha,
    headSha: pullRequest.head.sha,
    state: pullRequest.merged_at
      ? "merged"
      : pullRequest.state === "closed"
        ? "closed"
        : "open",
    files: files.map((file, index) => ({
      filePath: file.filename,
      oldFilePath: file.previous_filename ?? null,
      changeType: mapGitHubFileStatus(file.status),
      fileExtension: getFileExtension(file.filename),
      topLevelDir: getTopLevelDir(file.filename),
      displayOrder: index,
    })),
  };
}
