import { getGitHubPullRequestData } from "@/lib/providers/github";
import {
  getGitLabPullRequestData,
  splitGitLabProjectPath,
} from "@/lib/providers/gitlab";
import { RegisterFromProviderRequest } from "@/lib/schemas/register-from-provider";
import { getUserProviderToken } from "@/lib/services/user-provider-credentials";
import { registerPullRequest } from "@/lib/services/register-pull-request";

function allowProviderTokenFallback(): boolean {
  return process.env.ALLOW_PROVIDER_TOKEN_FALLBACK === "true";
}

export async function registerFromProvider(params: {
  input: RegisterFromProviderRequest;
  userId: string;
}) {
  const { input, userId } = params;

  switch (input.provider) {
    case "github": {
      const userToken = await getUserProviderToken({ userId, provider: "github" });

      if (!userToken && !allowProviderTokenFallback()) {
        throw new Error("Missing GitHub credential. Add a token in profile settings.");
      }

      const providerData = await getGitHubPullRequestData({
        owner: input.owner,
        repo: input.name,
        prNumber: input.prNumber,
        token: userToken,
      });

      return registerPullRequest({
        workspaceId: input.workspaceId,
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
      const userToken = await getUserProviderToken({ userId, provider: "gitlab" });

      if (!userToken && !allowProviderTokenFallback()) {
        throw new Error("Missing GitLab credential. Add a token in profile settings.");
      }

      const providerData = await getGitLabPullRequestData({
        projectPath: input.projectPath,
        prNumber: input.prNumber,
        token: userToken,
      });

      const projectParts = splitGitLabProjectPath(input.projectPath);
      const baseUrl = process.env.GITLAB_BASE_URL?.replace(/\/+$/, "");

      if (!baseUrl) {
        throw new Error("Missing GITLAB_BASE_URL");
      }

      return registerPullRequest({
        workspaceId: input.workspaceId,
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
      throw new Error("Provider not supported yet");
  }
}

