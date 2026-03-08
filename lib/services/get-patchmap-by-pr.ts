import {
  GetPatchMapByPrQuery,
  GetPatchMapByPrResponse,
} from "@/lib/schemas/get-patchmap-by-pr";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getPatchMapByPr(
  input: GetPatchMapByPrQuery
): Promise<GetPatchMapByPrResponse | null> {
  const supabase = createAdminSupabaseClient();

  const { data: patchmapRow, error: patchmapError } = await supabase
    .from("patchmaps")
    .select(`
      id,
      pull_request_id,
      version_number,
      status,
      created_at,
      updated_at
    `)
    .eq("pull_request_id", input.pullRequestId)
    .order("version_number", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (patchmapError) {
    throw new Error(`Failed to load patchmap: ${patchmapError.message}`);
  }

  if (!patchmapRow) {
    return null;
  }

  const patchmapId = patchmapRow.id;

  const { data: summaryRow, error: summaryError } = await supabase
    .from("patchmap_summaries")
    .select(`
      id,
      purpose,
      risk_notes,
      test_notes,
      behavior_change_notes,
      demoable,
      demo_notes,
      generated_markdown
    `)
    .eq("patchmap_id", patchmapId)
    .maybeSingle();

  if (summaryError) {
    throw new Error(`Failed to load patchmap summary: ${summaryError.message}`);
  }

  const { data: groupRows, error: groupError } = await supabase
    .from("patchmap_groups")
    .select(`
      id,
      title,
      description,
      group_type,
      confidence_score,
      order_index
    `)
    .eq("patchmap_id", patchmapId)
    .order("order_index", { ascending: true });

  if (groupError) {
    throw new Error(`Failed to load patchmap groups: ${groupError.message}`);
  }

  const groups = [];

  for (const groupRow of groupRows ?? []) {
    const { data: groupFileRows, error: groupFilesError } = await supabase
      .from("patchmap_group_files")
      .select(`
        pr_file_id,
        order_index
      `)
      .eq("patchmap_group_id", groupRow.id)
      .order("order_index", { ascending: true });

    if (groupFilesError) {
      throw new Error(
        `Failed to load patchmap group files: ${groupFilesError.message}`
      );
    }

    groups.push({
      id: groupRow.id,
      title: groupRow.title,
      description: groupRow.description,
      groupType: groupRow.group_type,
      confidenceScore: groupRow.confidence_score,
      orderIndex: groupRow.order_index,
      fileIds: (groupFileRows ?? []).map((row) => row.pr_file_id),
    });
  }

  return {
    patchmap: {
      id: patchmapRow.id,
      pullRequestId: patchmapRow.pull_request_id,
      versionNumber: patchmapRow.version_number,
      status: patchmapRow.status,
      createdAt: patchmapRow.created_at,
      updatedAt: patchmapRow.updated_at,
    },
    summary: summaryRow
      ? {
          id: summaryRow.id,
          purpose: summaryRow.purpose,
          riskNotes: summaryRow.risk_notes,
          testNotes: summaryRow.test_notes,
          behaviorChangeNotes: summaryRow.behavior_change_notes,
          demoable: summaryRow.demoable,
          demoNotes: summaryRow.demo_notes,
          generatedMarkdown: summaryRow.generated_markdown,
        }
      : null,
    groups,
  };
}


