import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  registerPullRequestSchema,
  registerPullRequestResponseSchema,
} from "@/lib/schemas/register-pull-request";
import { registerPullRequest } from "@/lib/services/register-pull-request";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership } from "@/lib/workspaces/access";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = registerPullRequestSchema.parse(json);

    const membership = await assertWorkspaceMembership(auth.user.id, parsed.workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
