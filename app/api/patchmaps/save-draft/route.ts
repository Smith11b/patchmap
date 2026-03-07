import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  savePatchMapDraftSchema,
  savePatchMapDraftResponseSchema,
} from "@/lib/schemas/save-patchmap-draft";
import { savePatchMapDraft } from "@/lib/services/save-patchmap-draft";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = savePatchMapDraftSchema.parse(json);

    const result = await savePatchMapDraft(parsed);
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
