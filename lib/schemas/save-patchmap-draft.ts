import { z } from "zod";

export const patchmapStatusSchema = z.enum(["draft", "published"]);

export const savePatchMapDraftGroupSchema = z.object({
  title: z.string().min(1, "Group title is required"),
  description: z.string().nullable().optional(),
  groupType: z.string().nullable().optional(),
  confidenceScore: z.number().min(0).max(100).nullable().optional(),
  orderIndex: z.number().int().min(0),
  fileIds: z.array(z.string().uuid()).default([]),
});

export const savePatchMapDraftSummarySchema = z.object({
  purpose: z.string().nullable().optional(),
  riskNotes: z.string().nullable().optional(),
  testNotes: z.string().nullable().optional(),
  behaviorChangeNotes: z.string().nullable().optional(),
  demoable: z.boolean().nullable().optional(),
  demoNotes: z.string().nullable().optional(),
});

export const savePatchMapDraftWalkthroughStepSchema = z.object({
  prFileId: z.string().uuid(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  orderIndex: z.number().int().min(0),
});

export const savePatchMapDraftWalkthroughSchema = z.object({
  title: z.string().nullable().optional(),
  introNotes: z.string().nullable().optional(),
  steps: z.array(savePatchMapDraftWalkthroughStepSchema),
});

export const savePatchMapDraftSchema = z.object({
  pullRequestId: z.string().uuid(),
  patchmap: z
    .object({
      id: z.string().uuid().optional(),
      status: patchmapStatusSchema.default("draft"),
      versionNumber: z.number().int().positive().optional(),
    })
    .optional(),
  summary: savePatchMapDraftSummarySchema,
  groups: z.array(savePatchMapDraftGroupSchema),
  walkthrough: savePatchMapDraftWalkthroughSchema.nullable().optional(),
});

export const savePatchMapDraftResponseSchema = z.object({
  patchmap: z.object({
    id: z.string().uuid(),
    pullRequestId: z.string().uuid(),
    versionNumber: z.number().int(),
    status: patchmapStatusSchema,
  }),
  summary: z.object({
    id: z.string().uuid(),
    purpose: z.string().nullable().optional(),
    riskNotes: z.string().nullable().optional(),
    testNotes: z.string().nullable().optional(),
    behaviorChangeNotes: z.string().nullable().optional(),
    demoable: z.boolean().nullable().optional(),
    demoNotes: z.string().nullable().optional(),
  }),
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

export type SavePatchMapDraftRequest = z.infer<typeof savePatchMapDraftSchema>;
export type SavePatchMapDraftResponse = z.infer<
  typeof savePatchMapDraftResponseSchema
>;
