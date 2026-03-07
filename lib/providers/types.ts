export type ProviderName = "github" | "gitlab";

export type ProviderPullRequestFile = {
  filePath: string;
  oldFilePath?: string | null;
  changeType: "added" | "modified" | "deleted" | "renamed";
  fileExtension?: string | null;
  topLevelDir?: string | null;
  displayOrder: number;
};

export type ProviderPullRequestData = {
  provider: ProviderName;
  ownerOrNamespace: string;
  repoName: string;
  prNumber: number;
  title: string;
  description: string | null;
  sourceBranch: string | null;
  targetBranch: string | null;
  baseSha: string | null;
  headSha: string | null;
  state: "open" | "closed" | "merged";
  files: ProviderPullRequestFile[];
};
