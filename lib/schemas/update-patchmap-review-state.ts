import { z } from "zod";

export const patchmapReviewStatusSchema = z.enum(["not_started", "in_progress", "approved"]);

export const updatePatchmapReviewStateSchema = z.object({
  patchmapId: z.string().uuid(),
  status: patchmapReviewStatusSchema,
});

export const updatePatchmapReviewStateResponseSchema = z.object({
  patchmapId: z.string().uuid(),
  status: patchmapReviewStatusSchema,
  startedAt: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
});

export type UpdatePatchmapReviewStateRequest = z.infer<typeof updatePatchmapReviewStateSchema>;
export type UpdatePatchmapReviewStateResponse = z.infer<typeof updatePatchmapReviewStateResponseSchema>;
