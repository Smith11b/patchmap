import { NextResponse } from "next/server";
import {
  registerPullRequestSchema,
  registerPullRequestResponseSchema,
} from "@/lib/schemas/register-pull-request";
import { registerPullRequest } from "@/lib/services/register-pull-request";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerPullRequestSchema.parse(json);

    const result = await registerPullRequest(parsed);
    const response = registerPullRequestResponseSchema.parse(result);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
