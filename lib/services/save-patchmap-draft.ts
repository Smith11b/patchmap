import {
  SavePatchMapDraftRequest,
  SavePatchMapDraftResponse,
} from "@/lib/schemas/save-patchmap-draft";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function savePatchMapDraft(
  input: SavePatchMapDraftRequest
): Promise<SavePatchMapDraftResponse> {
  const supabase = createServerSupabaseClient();

  const status = input.patchmap?.status ?? "draft";
  const requestedVersionNumber = input.patchmap?.versionNumber ?? 1;

  // 1. Ensure PR exists
  const { data: pullRequest, error: pullRequestError } = await supabase
    .from("pull_requests")
    .select("id")
    .eq("id", input.pullRequestId)
    .single();

  if (pullRequestError || !pullRequest) {
    throw new Error("Pull request not found");
  }

  // 2. Find existing patchmap by id if provided, otherwise use PR + version
  let existingPatchmapId: string | null = input.patchmap?.id ?? null;

  if (!existingPatchmapId) {
    const { data: existingPatchmap } = await supabase
      .from("patchmaps")
      .select("id, version_number, status")
      .eq("pull_request_id", input.pullRequestId)
      .eq("version_number", requestedVersionNumber)
      .maybeSingle();

    existingPatchmapId = existingPatchmap?.id ?? null;
  }

  // 3. Upsert patchmap
  let patchmapRow:
    | {
        id: string;
        pull_request_id: string;
        version_number: number;
        status: "draft" | "published";
      }
    | null = null;

  if (existingPatchmapId) {
    const { data, error } = await supabase
      .from("patchmaps")
      .update({
        status,
      })
      .eq("id", existingPatchmapId)
      .select("id, pull_request_id, version_number, status")
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to update patchmap: ${error?.message ?? "unknown error"}`
      );
    }

    patchmapRow = data;
  } else {
    const { data, error } = await supabase
      .from("patchmaps")
      .insert({
        pull_request_id: input.pullRequestId,
        version_number: requestedVersionNumber,
        status,
      })
      .select("id, pull_request_id, version_number, status")
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to create patchmap: ${error?.message ?? "unknown error"}`
      );
    }

    patchmapRow = data;
  }

  const patchmapId = patchmapRow.id;

  // 4. Load existing groups so we can remove old file mappings first
  const { data: existingGroups, error: existingGroupsError } = await supabase
    .from("patchmap_groups")
    .select("id")
    .eq("patchmap_id", patchmapId);

  if (existingGroupsError) {
    throw new Error(
      `Failed to load existing patchmap groups: ${existingGroupsError.message}`
    );
  }

  const existingGroupIds = (existingGroups ?? []).map((g) => g.id);

  if (existingGroupIds.length > 0) {
    const { error: deleteGroupFilesError } = await supabase
      .from("patchmap_group_files")
      .delete()
      .in("patchmap_group_id", existingGroupIds);

    if (deleteGroupFilesError) {
      throw new Error(
        `Failed to clear existing patchmap group files: ${deleteGroupFilesError.message}`
      );
    }
  }

  const { error: deleteGroupsError } = await supabase
    .from("patchmap_groups")
    .delete()
    .eq("patchmap_id", patchmapId);

  if (deleteGroupsError) {
    throw new Error(
      `Failed to clear existing patchmap groups: ${deleteGroupsError.message}`
    );
  }

  // 5. Upsert summary
  const { data: summaryRow, error: summaryError } = await supabase
    .from("patchmap_summaries")
    .upsert(
      {
        patchmap_id: patchmapId,
        purpose: input.summary.purpose ?? null,
        risk_notes: input.summary.riskNotes ?? null,
        test_notes: input.summary.testNotes ?? null,
        behavior_change_notes: input.summary.behaviorChangeNotes ?? null,
      },
      {
        onConflict: "patchmap_id",
      }
    )
    .select("id, purpose, risk_notes, test_notes, behavior_change_notes")
    .single();

  if (summaryError || !summaryRow) {
    throw new Error(
      `Failed to save patchmap summary: ${summaryError?.message ?? "unknown error"}`
    );
  }

  // 6. Create groups one-by-one so we can capture IDs
  const savedGroups: SavePatchMapDraftResponse["groups"] = [];

  for (const group of input.groups) {
    const { data: groupRow, error: groupError } = await supabase
      .from("patchmap_groups")
      .insert({
        patchmap_id: patchmapId,
        title: group.title,
        description: group.description ?? null,
        group_type: group.groupType ?? null,
        confidence_score: group.confidenceScore ?? null,
        order_index: group.orderIndex,
      })
      .select("id, title, description, group_type, confidence_score, order_index")
      .single();

    if (groupError || !groupRow) {
      throw new Error(
        `Failed to create patchmap group: ${groupError?.message ?? "unknown error"}`
      );
    }

    if (group.fileIds.length > 0) {
      const groupFileRows = group.fileIds.map((fileId, index) => ({
        patchmap_group_id: groupRow.id,
        pr_file_id: fileId,
        order_index: index,
      }));

      const { error: groupFilesError } = await supabase
        .from("patchmap_group_files")
        .insert(groupFileRows);

      if (groupFilesError) {
        throw new Error(
          `Failed to save patchmap group files: ${groupFilesError.message}`
        );
      }
    }

    savedGroups.push({
      id: groupRow.id,
      title: groupRow.title,
      description: groupRow.description,
      groupType: groupRow.group_type,
      confidenceScore: groupRow.confidence_score,
      orderIndex: groupRow.order_index,
      fileIds: group.fileIds,
    });
  }

  return {
    patchmap: {
      id: patchmapRow.id,
      pullRequestId: patchmapRow.pull_request_id,
      versionNumber: patchmapRow.version_number,
      status: patchmapRow.status,
    },
    summary: {
      id: summaryRow.id,
      purpose: summaryRow.purpose,
      riskNotes: summaryRow.risk_notes,
      testNotes: summaryRow.test_notes,
      behaviorChangeNotes: summaryRow.behavior_change_notes,
    },
    groups: savedGroups,
  };
}
