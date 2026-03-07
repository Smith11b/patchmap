import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { generateAndStorePatchMapMarkdown } from "@/lib/services/generate-patchmap-markdown";

const generatePatchMapMarkdownSchema = z.object({
  patchmapId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = generatePatchMapMarkdownSchema.parse(json);

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
