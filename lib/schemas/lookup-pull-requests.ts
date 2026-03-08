import { z } from "zod";
import { providerSchema, pullRequestStateSchema } from "@/lib/schemas/register-pull-request";

const optionalPositiveInt = z.preprocess(
  (value) => (value === null || value === undefined || value === "" ? undefined : value),
  z.coerce.number().int().positive("PR number must be a positive integer").optional()
);

export const lookupPullRequestQuerySchema = z
  .object({
    workspaceId: z.string().uuid("Workspace id must be a valid UUID").optional(),
    provider: providerSchema.optional(),
    owner: z.string().min(1, "Repository owner is required").optional(),
    name: z.string().min(1, "Repository name is required").optional(),
    prNumber: optionalPositiveInt,
    pullRequestId: z.string().uuid("Pull request id must be a valid UUID").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.pullRequestId) {
      return;
    }

    const missing: string[] = [];
    if (!value.workspaceId) missing.push("workspaceId");
    if (!value.provider) missing.push("provider");
    if (!value.owner) missing.push("owner");
    if (!value.name) missing.push("name");
    if (!value.prNumber) missing.push("prNumber");

    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required query fields: ${missing.join(", ")}`,
        path: [],
      });
    }
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
      patchText: z.string().nullable().optional(),
      fileExtension: z.string().nullable().optional(),
      topLevelDir: z.string().nullable().optional(),
      displayOrder: z.number().int(),
    })
  ),
});

export type LookupPullRequestQuery = z.infer<typeof lookupPullRequestQuerySchema>;
export type LookupPullRequestResponse = z.infer<typeof lookupPullRequestResponseSchema>;
