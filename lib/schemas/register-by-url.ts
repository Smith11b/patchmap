import { z } from "zod";

export const registerByUrlSchema = z.object({
  workspaceId: z.string().uuid("Workspace id must be a valid UUID"),
  url: z.url("URL must be a valid URL"),
});

export type RegisterByUrlRequest = z.infer<typeof registerByUrlSchema>;
