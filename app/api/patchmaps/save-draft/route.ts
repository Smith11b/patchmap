import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  savePatchMapDraftSchema,
  savePatchMapDraftResponseSchema,
} from "@/lib/schemas/save-patchmap-draft";
import { savePatchMapDraft } from "@/lib/services/save-patchmap-draft";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  assertWorkspaceMembership,
  canUserEditPatchmap,
  getPatchmapAuthorship,
  getLatestPatchmapForPullRequest,
  getWorkspaceIdForPullRequest,
} from "@/lib/workspaces/access";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = savePatchMapDraftSchema.parse(json);

    const workspaceId = await getWorkspaceIdForPullRequest(parsed.pullRequestId);
    if (!workspaceId) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 });
    }

    const membership = await assertWorkspaceMembership(auth.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authoringPatchmap = parsed.patchmap?.id
      ? await getPatchmapAuthorship(parsed.patchmap.id)
      : await getLatestPatchmapForPullRequest(parsed.pullRequestId);

    if (
      authoringPatchmap &&
      !canUserEditPatchmap(membership, auth.user.id, authoringPatchmap.created_by_user_id)
    ) {
      return NextResponse.json({ error: "Only the patchmap author or workspace owner can edit this PatchMap" }, { status: 403 });
    }

    const result = await savePatchMapDraft(parsed, auth.user.id);
    const response = savePatchMapDraftResponseSchema.parse(result);

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
