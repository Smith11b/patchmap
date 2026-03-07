import { autoGroupFiles } from "@/lib/patchmap/auto-group-files";
import {
  SuggestPatchMapGroupsQuery,
  SuggestPatchMapGroupsResponse,
} from "@/lib/schemas/suggest-patchmap-groups";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function suggestPatchMapGroups(
  input: SuggestPatchMapGroupsQuery
): Promise<SuggestPatchMapGroupsResponse> {
  const supabase = createServerSupabaseClient();

  const { data: files, error } = await supabase
    .from("pr_files")
    .select(`
      id,
      file_path,
      old_file_path,
      change_type,
      file_extension,
      top_level_dir,
      display_order
    `)
    .eq("pull_request_id", input.pullRequestId)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load PR files: ${error.message}`);
  }

  const normalizedFiles =
    files?.map((file) => ({
      id: file.id,
      filePath: file.file_path,
      oldFilePath: file.old_file_path,
      changeType: file.change_type,
      fileExtension: file.file_extension,
      topLevelDir: file.top_level_dir,
      displayOrder: file.display_order,
    })) ?? [];

  const groups = autoGroupFiles(normalizedFiles);

  return {
    pullRequestId: input.pullRequestId,
    groups,
  };
}
