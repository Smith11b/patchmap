import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthResult =
  | { user: User }
  | { response: NextResponse<{ error: string }> };

export async function requireApiUser(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user };
}
