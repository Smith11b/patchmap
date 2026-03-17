import { z } from "zod";
import { patchmapStatusSchema } from "@/lib/schemas/save-patchmap-draft";

export const getPatchMapByPrQuerySchema = z.object({
  pullRequestId: z.string().uuid(),
});

export const getPatchMapByPrResponseSchema = z.object({
  patchmap: z.object({
    id: z.string().uuid(),
    pullRequestId: z.string().uuid(),
    versionNumber: z.number().int(),
    status: patchmapStatusSchema,
    createdByUserId: z.string().uuid().nullable().optional(),
    updatedByUserId: z.string().uuid().nullable().optional(),
    publishedAt: z.string().nullable().optional(),
    publishedByUserId: z.string().uuid().nullable().optional(),
    reviewRequestedAt: z.string().nullable().optional(),
    reviewRequestedByUserId: z.string().uuid().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  permissions: z.object({
    canEdit: z.boolean(),
    isAuthor: z.boolean(),
    isWorkspaceOwner: z.boolean(),
  }),
  review: z.object({
    currentUserStatus: z.enum(["not_started", "in_progress", "approved"]),
    currentUserStartedAt: z.string().nullable().optional(),
    currentUserApprovedAt: z.string().nullable().optional(),
  }),
  summary: z
    .object({
      id: z.string().uuid(),
      purpose: z.string().nullable().optional(),
      riskNotes: z.string().nullable().optional(),
      testNotes: z.string().nullable().optional(),
      behaviorChangeNotes: z.string().nullable().optional(),
      demoable: z.boolean().nullable().optional(),
      demoNotes: z.string().nullable().optional(),
      generatedMarkdown: z.string().nullable().optional(),
    })
    .nullable(),
  groups: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      description: z.string().nullable().optional(),
      groupType: z.string().nullable().optional(),
      confidenceScore: z.number().nullable().optional(),
      orderIndex: z.number().int(),
      fileIds: z.array(z.string().uuid()),
    })
  ),
  walkthrough: z
    .object({
      id: z.string().uuid(),
      title: z.string().nullable().optional(),
      introNotes: z.string().nullable().optional(),
      steps: z.array(
        z.object({
          id: z.string().uuid(),
          prFileId: z.string().uuid(),
          title: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
          orderIndex: z.number().int(),
        })
      ),
    })
    .nullable(),
});

export type GetPatchMapByPrQuery = z.infer<typeof getPatchMapByPrQuerySchema>;
export type GetPatchMapByPrResponse = z.infer<
  typeof getPatchMapByPrResponseSchema
>;
