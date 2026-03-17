import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership } from "@/lib/workspaces/access";
import { listRecentPatchMapsByWorkspace } from "@/lib/services/list-recent-patchmaps";

const querySchema = z.object({
  workspaceId: z.string().uuid("Workspace id must be a valid UUID"),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const parsed = querySchema.parse({
      workspaceId: searchParams.get("workspaceId"),
      limit: searchParams.get("limit") ?? undefined,
    });

    const membership = await assertWorkspaceMembership(auth.user.id, parsed.workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = await listRecentPatchMapsByWorkspace(parsed.workspaceId, auth.user.id, parsed.limit ?? 50);

    return NextResponse.json({ workspaceId: parsed.workspaceId, items }, { status: 200 });
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
