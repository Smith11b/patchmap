import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership } from "@/lib/workspaces/access";
import { parseProviderPullRequestUrl } from "@/lib/providers/parse-provider-pull-request-url";
import { registerFromProvider } from "@/lib/services/register-from-provider";
import type { RegisterFromProviderRequest } from "@/lib/schemas/register-from-provider";

const registerByUrlSchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.url(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = registerByUrlSchema.parse(json);

    const membership = await assertWorkspaceMembership(auth.user.id, parsed.workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parseResult = parseProviderPullRequestUrl(parsed.url);
    if ("error" in parseResult) {
      return NextResponse.json({ error: parseResult.error }, { status: 400 });
    }

    const input = {
      ...parseResult.payload,
      workspaceId: parsed.workspaceId,
    } as RegisterFromProviderRequest;

    const result = await registerFromProvider({
      input,
      userId: auth.user.id,
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

    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
