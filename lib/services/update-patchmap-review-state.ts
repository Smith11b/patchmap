import {
  UpdatePatchmapReviewStateRequest,
  UpdatePatchmapReviewStateResponse,
} from "@/lib/schemas/update-patchmap-review-state";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function updatePatchmapReviewState(
  input: UpdatePatchmapReviewStateRequest,
  userId: string
): Promise<UpdatePatchmapReviewStateResponse> {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const payload = {
    patchmap_id: input.patchmapId,
    user_id: userId,
    status: input.status,
    started_at: input.status === "not_started" ? null : now,
    approved_at: input.status === "approved" ? now : null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("patchmap_review_states")
    .upsert(payload, { onConflict: "patchmap_id,user_id" })
    .select("patchmap_id, status, started_at, approved_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update patchmap review state: ${error?.message ?? "unknown error"}`);
  }

  return {
    patchmapId: data.patchmap_id,
    status: data.status,
    startedAt: data.started_at,
    approvedAt: data.approved_at,
  };
}
