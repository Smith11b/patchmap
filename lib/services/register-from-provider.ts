import { getGitHubPullRequestData } from "@/lib/providers/github";
import {
  getGitLabPullRequestData,
  splitGitLabProjectPath,
} from "@/lib/providers/gitlab";
import { registerPullRequest } from "@/lib/services/register-pull-request";
import { RegisterFromProviderRequest } from "@/lib/schemas/register-from-provider";

export async function registerFromProvider(input: RegisterFromProviderRequest) {
  switch (input.provider) {
    case "github": {
      const providerData = await getGitHubPullRequestData({
        owner: input.owner,
        repo: input.name,
        prNumber: input.prNumber,
      });

      return registerPullRequest({
        workspaceSlug: input.workspaceSlug,
        repository: {
          provider: "github",
          owner: input.owner,
          name: input.name,
          defaultBranch: providerData.targetBranch,
          externalRepoId: null,
        },
        pullRequest: {
          prNumber: providerData.prNumber,
          title: providerData.title,
          description: providerData.description,
          url: `https://github.com/${input.owner}/${input.name}/pull/${input.prNumber}`,
          sourceBranch: providerData.sourceBranch,
          targetBranch: providerData.targetBranch,
          baseSha: providerData.baseSha,
          headSha: providerData.headSha,
          state: providerData.state,
        },
        files: providerData.files,
      });
    }

    case "gitlab": {
      const providerData = await getGitLabPullRequestData({
        projectPath: input.projectPath,
        prNumber: input.prNumber,
      });

      const projectParts = splitGitLabProjectPath(input.projectPath);
      const baseUrl = process.env.GITLAB_BASE_URL?.replace(/\/+$/, "");

      if (!baseUrl) {
        throw new Error("Missing GITLAB_BASE_URL");
      }

      return registerPullRequest({
        workspaceSlug: input.workspaceSlug,
        repository: {
          provider: "gitlab",
          owner: projectParts.owner,
          name: projectParts.name,
          defaultBranch: providerData.targetBranch,
          externalRepoId: null,
        },
        pullRequest: {
          prNumber: providerData.prNumber,
          title: providerData.title,
          description: providerData.description,
          url: `${baseUrl}/${input.projectPath}/-/merge_requests/${input.prNumber}`,
          sourceBranch: providerData.sourceBranch,
          targetBranch: providerData.targetBranch,
          baseSha: providerData.baseSha,
          headSha: providerData.headSha,
          state: providerData.state,
        },
        files: providerData.files,
      });
    }

    default:
      throw new Error(`Provider not supported yet`);
  }
}
