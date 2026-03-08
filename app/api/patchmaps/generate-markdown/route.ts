import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { generateAndStorePatchMapMarkdown } from "@/lib/services/generate-patchmap-markdown";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership, getWorkspaceIdForPatchmap } from "@/lib/workspaces/access";

const generatePatchMapMarkdownSchema = z.object({
  patchmapId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = generatePatchMapMarkdownSchema.parse(json);

    const workspaceId = await getWorkspaceIdForPatchmap(parsed.patchmapId);
    if (!workspaceId) {
      return NextResponse.json({ error: "PatchMap not found" }, { status: 404 });
    }

    const membership = await assertWorkspaceMembership(auth.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const markdown = await generateAndStorePatchMapMarkdown(parsed.patchmapId);

    return NextResponse.json(
      {
        patchmapId: parsed.patchmapId,
        markdown,
      },
      { status: 200 }
    );
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
