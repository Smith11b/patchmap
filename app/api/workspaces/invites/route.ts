import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership } from "@/lib/workspaces/access";
import { createWorkspaceInvite, listWorkspaceInvites } from "@/lib/workspaces/service";

const createInviteSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = z.string().uuid().parse(searchParams.get("workspaceId"));

    const membership = await assertWorkspaceMembership(auth.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await listWorkspaceInvites(workspaceId);
    return NextResponse.json({ invites }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = createInviteSchema.parse(json);

    const membership = await assertWorkspaceMembership(auth.user.id, parsed.workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (membership.role !== "owner") {
      return NextResponse.json({ error: "Only workspace owners can invite members" }, { status: 403 });
    }

    const invite = await createWorkspaceInvite({
      workspaceId: parsed.workspaceId,
      invitedByUserId: auth.user.id,
      email: parsed.email,
    });

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
