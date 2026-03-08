import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  getUserProviderCredentialStatus,
  removeUserProviderToken,
  upsertUserProviderToken,
} from "@/lib/services/user-provider-credentials";

const providerSchema = z.enum(["github", "gitlab"]);

const updateCredentialSchema = z.object({
  provider: providerSchema,
  token: z.string().min(10),
});

const deleteCredentialSchema = z.object({
  provider: providerSchema,
});

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const status = await getUserProviderCredentialStatus(auth.user.id);

    return NextResponse.json({ credentials: status }, { status: 200 });
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
    const parsed = updateCredentialSchema.parse(json);

    await upsertUserProviderToken({
      userId: auth.user.id,
      provider: parsed.provider,
      token: parsed.token,
    });

    const status = await getUserProviderCredentialStatus(auth.user.id);
    return NextResponse.json({ credentials: status }, { status: 200 });
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

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const json = await request.json();
    const parsed = deleteCredentialSchema.parse(json);

    await removeUserProviderToken({
      userId: auth.user.id,
      provider: parsed.provider,
    });

    const status = await getUserProviderCredentialStatus(auth.user.id);
    return NextResponse.json({ credentials: status }, { status: 200 });
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
