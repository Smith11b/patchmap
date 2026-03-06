import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  lookupPullRequestQuerySchema,
  lookupPullRequestResponseSchema,
} from "@/lib/schemas/lookup-pull-requests";
import { lookupPullRequest } from "@/lib/services/lookup-pull-requests";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = lookupPullRequestQuerySchema.parse({
      provider: searchParams.get("provider"),
      owner: searchParams.get("owner"),
      name: searchParams.get("name"),
      prNumber: searchParams.get("prNumber"),
    });

    const result = await lookupPullRequest(parsed);

    if (!result) {
      return NextResponse.json(
        { error: "Pull request not found" },
        { status: 404 }
      );
    }

    const response = lookupPullRequestResponseSchema.parse(result);

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
