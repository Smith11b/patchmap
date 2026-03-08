import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  lookupPullRequestQuerySchema,
  lookupPullRequestResponseSchema,
} from "@/lib/schemas/lookup-pull-requests";
import { lookupPullRequest } from "@/lib/services/lookup-pull-requests";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership, getWorkspaceIdForPullRequest } from "@/lib/workspaces/access";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const optionalParam = (value: string | null) => value ?? undefined;

    const parsed = lookupPullRequestQuerySchema.parse({
      workspaceId: optionalParam(searchParams.get("workspaceId")),
      provider: optionalParam(searchParams.get("provider")),
      owner: optionalParam(searchParams.get("owner")),
      name: optionalParam(searchParams.get("name")),
      prNumber: optionalParam(searchParams.get("prNumber")),
      pullRequestId: optionalParam(searchParams.get("pullRequestId")),
    });

    const workspaceId = parsed.pullRequestId
      ? await getWorkspaceIdForPullRequest(parsed.pullRequestId)
      : parsed.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 });
    }

    const membership = await assertWorkspaceMembership(auth.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await lookupPullRequest(parsed);

    if (!result) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 });
    }

    const response = lookupPullRequestResponseSchema.parse(result);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

