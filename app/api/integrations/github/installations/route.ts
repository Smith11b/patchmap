import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  listGitHubAppInstallationsForUser,
  removeGitHubAppInstallationForUser,
} from "@/lib/services/github-app-installations";

const deleteInstallationSchema = z.object({
  installationId: z.string().uuid(),
});

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) {
      return auth.response;
    }

    const installations = await listGitHubAppInstallationsForUser(auth.user.id);
    return NextResponse.json({ installations }, { status: 200 });
  } catch (error) {
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
    const parsed = deleteInstallationSchema.parse(json);

    await removeGitHubAppInstallationForUser({
      userId: auth.user.id,
      installationId: parsed.installationId,
    });

    const installations = await listGitHubAppInstallationsForUser(auth.user.id);
    return NextResponse.json({ installations }, { status: 200 });
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
