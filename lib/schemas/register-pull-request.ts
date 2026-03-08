import { z } from "zod";

export const providerSchema = z.enum(["github", "gitlab", "azure"]);

export const pullRequestStateSchema = z.enum(["open", "closed", "merged"]);

export const fileChangeTypeSchema = z.enum([
  "added",
  "modified",
  "deleted",
  "renamed",
]);

export const repositorySchema = z.object({
  provider: providerSchema,
  owner: z.string().min(1, "Repository owner is required"),
  name: z.string().min(1, "Repository name is required"),
  defaultBranch: z.string().nullable().optional(),
  externalRepoId: z.string().nullable().optional(),
});

export const pullRequestSchema = z.object({
  prNumber: z.number().int().positive("PR number must be a positive integer"),
  title: z.string().min(1, "PR title is required"),
  description: z.string().nullable().optional(),
  url: z.url("PR url must be a valid URL"),
  sourceBranch: z.string().nullable().optional(),
  targetBranch: z.string().nullable().optional(),
  baseSha: z.string().nullable().optional(),
  headSha: z.string().nullable().optional(),
  state: pullRequestStateSchema.default("open"),
});

export const pullRequestFileSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  oldFilePath: z.string().nullable().optional(),
  changeType: fileChangeTypeSchema,
  patchText: z.string().nullable().optional(),
  fileExtension: z.string().nullable().optional(),
  topLevelDir: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0),
});

export const registerPullRequestSchema = z.object({
  workspaceId: z.string().uuid("Workspace id must be a valid UUID"),
  repository: repositorySchema,
  pullRequest: pullRequestSchema,
  files: z.array(pullRequestFileSchema),
});

export type Provider = z.infer<typeof providerSchema>;
export type PullRequestState = z.infer<typeof pullRequestStateSchema>;
export type FileChangeType = z.infer<typeof fileChangeTypeSchema>;

export type RepositoryInput = z.infer<typeof repositorySchema>;
export type PullRequestInput = z.infer<typeof pullRequestSchema>;
export type PullRequestFileInput = z.infer<typeof pullRequestFileSchema>;

export type RegisterPullRequestRequest = z.infer<
  typeof registerPullRequestSchema
>;


export const registerPullRequestResponseSchema = z.object({
  workspace: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
  }),
  repository: z.object({
    id: z.string().uuid(),
    provider: providerSchema,
    owner: z.string(),
    name: z.string(),
  }),
  pullRequest: z.object({
    id: z.string().uuid(),
    prNumber: z.number().int(),
    title: z.string(),
    url: z.string(),
    state: pullRequestStateSchema,
  }),
  fileCount: z.number().int().min(0),
});

export type RegisterPullRequestResponse = z.infer<
  typeof registerPullRequestResponseSchema
>;
