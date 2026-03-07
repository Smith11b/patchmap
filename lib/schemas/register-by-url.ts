import { z } from "zod";

export const registerByUrlSchema = z.object({
  workspaceSlug: z.string().min(1, "Workspace slug is required"),
  url: z.url("URL must be a valid URL"),
});

export type RegisterByUrlRequest = z.infer<typeof registerByUrlSchema>;
