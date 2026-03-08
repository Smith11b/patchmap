import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { acceptWorkspaceInvite, getUserWorkspaces } from "@/lib/workspaces/service";

const acceptInviteSchema = z.object({
  token: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = acceptInviteSchema.parse(json);

    const workspaceId = await acceptWorkspaceInvite({
      token: parsed.token,
      userId: auth.user.id,
      userEmail: auth.user.email,
    });

    const workspaces = await getUserWorkspaces(auth.user.id);

    return NextResponse.json({ workspaceId, workspaces }, { status: 200 });
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
