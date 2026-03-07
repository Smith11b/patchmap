import { z } from "zod";

const githubRegisterFromProviderSchema = z.object({
  workspaceSlug: z.string().min(1),
  provider: z.literal("github"),
  owner: z.string().min(1),
  name: z.string().min(1),
  prNumber: z.number().int().positive(),
});

const gitlabRegisterFromProviderSchema = z.object({
  workspaceSlug: z.string().min(1),
  provider: z.literal("gitlab"),
  projectPath: z.string().min(1),
  prNumber: z.number().int().positive(),
});

export const registerFromProviderSchema = z.discriminatedUnion("provider", [
  githubRegisterFromProviderSchema,
  gitlabRegisterFromProviderSchema,
]);

export type RegisterFromProviderRequest = z.infer<
  typeof registerFromProviderSchema
>;
