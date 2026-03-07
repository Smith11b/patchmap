import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { parseProviderPullRequestUrl } from "@/lib/providers/parse-provider-pull-request-url";
import { registerByUrlSchema } from "@/lib/schemas/register-by-url";
import { registerFromProvider } from "@/lib/services/register-from-provider";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerByUrlSchema.parse(json);

    const parseResult = parseProviderPullRequestUrl(parsed.url);

    if ("error" in parseResult) {
      return NextResponse.json({ error: parseResult.error }, { status: 400 });
    }

    const result = await registerFromProvider({
      workspaceSlug: parsed.workspaceSlug,
      ...parseResult.payload,
    });

    return NextResponse.json(result, { status: 200 });
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
