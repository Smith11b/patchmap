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
    createdAt: z.string(),
    updatedAt: z.string(),
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
});

export type GetPatchMapByPrQuery = z.infer<typeof getPatchMapByPrQuerySchema>;
export type GetPatchMapByPrResponse = z.infer<
  typeof getPatchMapByPrResponseSchema
>;
