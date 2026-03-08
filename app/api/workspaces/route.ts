import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  createWorkspace,
  ensureDefaultWorkspace,
  ensureUserProfile,
  getUserWorkspaces,
} from "@/lib/workspaces/service";

const createWorkspaceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
});

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    await ensureUserProfile({ id: auth.user.id, email: auth.user.email });
    const workspaces = await ensureDefaultWorkspace({
      userId: auth.user.id,
      email: auth.user.email,
    });

    return NextResponse.json({ workspaces }, { status: 200 });
  } catch (error) {
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
    const parsed = createWorkspaceSchema.parse(json);

    const workspace = await createWorkspace({
      userId: auth.user.id,
      name: parsed.name,
      slug: parsed.slug,
    });

    const workspaces = await getUserWorkspaces(auth.user.id);

    return NextResponse.json({ workspace, workspaces }, { status: 201 });
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
