import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  suggestPatchMapGroupsQuerySchema,
  suggestPatchMapGroupsResponseSchema,
} from "@/lib/schemas/suggest-patchmap-groups";
import { suggestPatchMapGroups } from "@/lib/services/suggest-patchmap-groups";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = suggestPatchMapGroupsQuerySchema.parse({
      pullRequestId: searchParams.get("pullRequestId"),
    });

    const result = await suggestPatchMapGroups(parsed);
    const response = suggestPatchMapGroupsResponseSchema.parse(result);

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
