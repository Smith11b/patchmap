import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getPatchMapByPrQuerySchema,
  getPatchMapByPrResponseSchema,
} from "@/lib/schemas/get-patchmap-by-pr";
import { getPatchMapByPr } from "@/lib/services/get-patchmap-by-pr";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership, getWorkspaceIdForPullRequest } from "@/lib/workspaces/access";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const parsed = getPatchMapByPrQuerySchema.parse({
      pullRequestId: searchParams.get("pullRequestId"),
    });

    const workspaceId = await getWorkspaceIdForPullRequest(parsed.pullRequestId);
    if (!workspaceId) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 });
    }

    const membership = await assertWorkspaceMembership(auth.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getPatchMapByPr(parsed);

    if (!result) {
      return NextResponse.json(
        { error: "PatchMap not found" },
        { status: 404 }
      );
    }

    const response = getPatchMapByPrResponseSchema.parse(result);

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

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
