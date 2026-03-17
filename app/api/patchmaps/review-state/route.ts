import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  updatePatchmapReviewStateResponseSchema,
  updatePatchmapReviewStateSchema,
} from "@/lib/schemas/update-patchmap-review-state";
import { updatePatchmapReviewState } from "@/lib/services/update-patchmap-review-state";
import { assertWorkspaceMembership, getWorkspaceIdForPatchmap } from "@/lib/workspaces/access";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = updatePatchmapReviewStateSchema.parse(json);

    const workspaceId = await getWorkspaceIdForPatchmap(parsed.patchmapId);
    if (!workspaceId) {
      return NextResponse.json({ error: "PatchMap not found" }, { status: 404 });
    }

    const membership = await assertWorkspaceMembership(auth.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await updatePatchmapReviewState(parsed, auth.user.id);
    const response = updatePatchmapReviewStateResponseSchema.parse(result);

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

    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
