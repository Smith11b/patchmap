import { ZodSchema } from "zod";

export function parseOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  return schema.parse(input);
}
