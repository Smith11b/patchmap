import { z } from "zod";

export const suggestPatchMapGroupsQuerySchema = z.object({
  pullRequestId: z.string().uuid(),
});

export const suggestPatchMapGroupsResponseSchema = z.object({
  pullRequestId: z.string().uuid(),
  groups: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      description: z.string(),
      orderIndex: z.number().int(),
      fileIds: z.array(z.string().uuid()),
    })
  ),
});

export type SuggestPatchMapGroupsQuery = z.infer<
  typeof suggestPatchMapGroupsQuerySchema
>;

export type SuggestPatchMapGroupsResponse = z.infer<
  typeof suggestPatchMapGroupsResponseSchema
>;
