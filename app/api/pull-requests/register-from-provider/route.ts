import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerFromProviderSchema } from "@/lib/schemas/register-from-provider";
import { registerFromProvider } from "@/lib/services/register-from-provider";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerFromProviderSchema.parse(json);

    const result = await registerFromProvider(parsed);

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
