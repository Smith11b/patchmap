import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/security/credentials";

export type ProviderName = "github" | "gitlab";

export async function upsertUserProviderToken(params: {
  userId: string;
  provider: ProviderName;
  token: string;
}) {
  const supabase = createAdminSupabaseClient();
  const encryptedToken = encryptSecret(params.token);

  const { error } = await supabase.from("user_provider_credentials").upsert(
    {
      user_id: params.userId,
      provider: params.provider,
      encrypted_token: encryptedToken,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,provider",
    }
  );

  if (error) {
    throw new Error(`Failed to save provider credential: ${error.message}`);
  }
}

export async function removeUserProviderToken(params: {
  userId: string;
  provider: ProviderName;
}) {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("user_provider_credentials")
    .delete()
    .eq("user_id", params.userId)
    .eq("provider", params.provider);

  if (error) {
    throw new Error(`Failed to remove provider credential: ${error.message}`);
  }
}

export async function getUserProviderToken(params: {
  userId: string;
  provider: ProviderName;
}): Promise<string | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("user_provider_credentials")
    .select("encrypted_token")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read provider credential: ${error.message}`);
  }

  if (!data?.encrypted_token) {
    return null;
  }

  return decryptSecret(data.encrypted_token);
}

export async function getUserProviderCredentialStatus(userId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("user_provider_credentials")
    .select("provider, updated_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load provider credential status: ${error.message}`);
  }

  return {
    github: data?.find((row) => row.provider === "github") ?? null,
    gitlab: data?.find((row) => row.provider === "gitlab") ?? null,
  };
}
