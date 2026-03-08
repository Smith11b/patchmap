import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerFromProviderSchema } from "@/lib/schemas/register-from-provider";
import { registerFromProvider } from "@/lib/services/register-from-provider";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { assertWorkspaceMembership } from "@/lib/workspaces/access";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = registerFromProviderSchema.parse(json);

    const membership = await assertWorkspaceMembership(auth.user.id, parsed.workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await registerFromProvider({ input: parsed, userId: auth.user.id });

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
