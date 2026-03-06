import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getPatchMapByPrQuerySchema,
  getPatchMapByPrResponseSchema,
} from "@/lib/schemas/get-patchmap-by-pr";
import { getPatchMapByPr } from "@/lib/services/get-patchmap-by-pr";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = getPatchMapByPrQuerySchema.parse({
      pullRequestId: searchParams.get("pullRequestId"),
    });

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
