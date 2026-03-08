import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(
    {
      user: {
        id: auth.user.id,
        email: auth.user.email ?? null,
      },
    },
    { status: 200 }
  );
}
