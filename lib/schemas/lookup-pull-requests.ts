import { z } from "zod";
import { providerSchema, pullRequestStateSchema } from "@/lib/schemas/register-pull-request";

export const lookupPullRequestQuerySchema = z.object({
  provider: providerSchema,
  owner: z.string().min(1, "Repository owner is required"),
  name: z.string().min(1, "Repository name is required"),
  prNumber: z.coerce.number().int().positive("PR number must be a positive integer"),
});

export const lookupPullRequestResponseSchema = z.object({
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
    sourceBranch: z.string().nullable().optional(),
    targetBranch: z.string().nullable().optional(),
    baseSha: z.string().nullable().optional(),
    headSha: z.string().nullable().optional(),
  }),
  files: z.array(
    z.object({
      id: z.string().uuid(),
      filePath: z.string(),
      oldFilePath: z.string().nullable().optional(),
      changeType: z.enum(["added", "modified", "deleted", "renamed"]),
      fileExtension: z.string().nullable().optional(),
      topLevelDir: z.string().nullable().optional(),
      displayOrder: z.number().int(),
    })
  ),
});

export type LookupPullRequestQuery = z.infer<typeof lookupPullRequestQuerySchema>;
export type LookupPullRequestResponse = z.infer<typeof lookupPullRequestResponseSchema>;
