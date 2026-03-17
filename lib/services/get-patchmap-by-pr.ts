import {
  GetPatchMapByPrQuery,
  GetPatchMapByPrResponse,
} from "@/lib/schemas/get-patchmap-by-pr";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function isMissingWalkthroughTableError(message?: string) {
  return Boolean(
    message &&
      (message.includes("patchmap_walkthroughs") ||
        message.includes("patchmap_walkthrough_steps"))
  );
}

export async function getPatchMapByPr(
  input: GetPatchMapByPrQuery,
  actorUserId?: string
): Promise<GetPatchMapByPrResponse | null> {
  const supabase = createAdminSupabaseClient();

  const { data: patchmapRow, error: patchmapError } = await supabase
    .from("patchmaps")
    .select(`
      id,
      pull_request_id,
      version_number,
      status,
      created_by_user_id,
      updated_by_user_id,
      published_at,
      published_by_user_id,
      review_requested_at,
      review_requested_by_user_id,
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

  const { data: walkthroughRow, error: walkthroughError } = await supabase
    .from("patchmap_walkthroughs")
    .select(`
      id,
      title,
      intro_notes
    `)
    .eq("patchmap_id", patchmapId)
    .maybeSingle();

  if (walkthroughError && !isMissingWalkthroughTableError(walkthroughError.message)) {
    throw new Error(`Failed to load patchmap walkthrough: ${walkthroughError.message}`);
  }

  let walkthrough: GetPatchMapByPrResponse["walkthrough"] = null;

  if (walkthroughRow) {
    const { data: stepRows, error: stepError } = await supabase
      .from("patchmap_walkthrough_steps")
      .select(`
        id,
        pr_file_id,
        title,
        notes,
        order_index
      `)
      .eq("walkthrough_id", walkthroughRow.id)
      .order("order_index", { ascending: true });

    if (stepError && !isMissingWalkthroughTableError(stepError.message)) {
      throw new Error(`Failed to load patchmap walkthrough steps: ${stepError.message}`);
    }

    walkthrough = {
      id: walkthroughRow.id,
      title: walkthroughRow.title,
      introNotes: walkthroughRow.intro_notes,
      steps: (stepRows ?? []).map((stepRow) => ({
        id: stepRow.id,
        prFileId: stepRow.pr_file_id,
        title: stepRow.title,
        notes: stepRow.notes,
        orderIndex: stepRow.order_index,
      })),
    };
  }

  let reviewState: GetPatchMapByPrResponse["review"] = {
    currentUserStatus: "not_started",
    currentUserStartedAt: null,
    currentUserApprovedAt: null,
  };

  if (actorUserId) {
    const { data: reviewRow, error: reviewError } = await supabase
      .from("patchmap_review_states")
      .select("status, started_at, approved_at")
      .eq("patchmap_id", patchmapId)
      .eq("user_id", actorUserId)
      .maybeSingle();

    if (reviewError && !reviewError.message.includes("patchmap_review_states")) {
      throw new Error(`Failed to load patchmap review state: ${reviewError.message}`);
    }

    if (reviewRow) {
      reviewState = {
        currentUserStatus: reviewRow.status,
        currentUserStartedAt: reviewRow.started_at,
        currentUserApprovedAt: reviewRow.approved_at,
      };
    }
  }

  return {
    patchmap: {
      id: patchmapRow.id,
      pullRequestId: patchmapRow.pull_request_id,
      versionNumber: patchmapRow.version_number,
      status: patchmapRow.status,
      createdByUserId: patchmapRow.created_by_user_id,
      updatedByUserId: patchmapRow.updated_by_user_id,
      publishedAt: patchmapRow.published_at,
      publishedByUserId: patchmapRow.published_by_user_id,
      reviewRequestedAt: patchmapRow.review_requested_at,
      reviewRequestedByUserId: patchmapRow.review_requested_by_user_id,
      createdAt: patchmapRow.created_at,
      updatedAt: patchmapRow.updated_at,
    },
    permissions: {
      canEdit: false,
      isAuthor: false,
      isWorkspaceOwner: false,
    },
    review: reviewState,
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
    walkthrough,
  };
}


