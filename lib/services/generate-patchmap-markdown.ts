import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generatePatchMapMarkdown } from "@/lib/markdown/generate-patchmap-markdown";

export async function generateAndStorePatchMapMarkdown(
  patchmapId: string
): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data: summaryRow, error: summaryError } = await supabase
    .from("patchmap_summaries")
    .select(`
      id,
      purpose,
      risk_notes,
      test_notes,
      behavior_change_notes
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
      order_index
    `)
    .eq("patchmap_id", patchmapId)
    .order("order_index", { ascending: true });

  if (groupError) {
    throw new Error(`Failed to load patchmap groups: ${groupError.message}`);
  }

  const groupsWithFiles: Array<{
    title: string;
    description?: string | null;
    orderIndex: number;
    filePaths: string[];
  }> = [];

  for (const group of groupRows ?? []) {
    const { data: groupFileRows, error: groupFileError } = await supabase
      .from("patchmap_group_files")
      .select(`
        order_index,
        pr_files (
          file_path
        )
      `)
      .eq("patchmap_group_id", group.id)
      .order("order_index", { ascending: true });

    if (groupFileError) {
      throw new Error(
        `Failed to load patchmap group file paths: ${groupFileError.message}`
      );
    }

    const filePaths = (groupFileRows ?? [])
      .map((row) => {
        const prFile = Array.isArray(row.pr_files) ? row.pr_files[0] : row.pr_files;
        return prFile?.file_path ?? null;
      })
      .filter((value): value is string => Boolean(value));

    groupsWithFiles.push({
      title: group.title,
      description: group.description,
      orderIndex: group.order_index,
      filePaths,
    });
  }

  const markdown = generatePatchMapMarkdown({
    summary: summaryRow
      ? {
          purpose: summaryRow.purpose,
          behaviorChangeNotes: summaryRow.behavior_change_notes,
          riskNotes: summaryRow.risk_notes,
          testNotes: summaryRow.test_notes,
        }
      : null,
    groups: groupsWithFiles,
  });

  const { error: updateError } = await supabase
    .from("patchmap_summaries")
    .update({
      generated_markdown: markdown,
    })
    .eq("patchmap_id", patchmapId);

  if (updateError) {
    throw new Error(
      `Failed to store generated markdown: ${updateError.message}`
    );
  }

  return markdown;
}
