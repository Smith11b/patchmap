import { createHash } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { generatePatchMapMarkdown } from "@/lib/markdown/generate-patchmap-markdown";

type PullRequestForMarkdown = {
  provider: "github" | "gitlab" | "azure";
  url: string;
};

function buildGitHubDiffUrl(prUrl: string, filePath: string): string {
  const normalizedPrUrl = prUrl.replace(/\/+$/, "");
  const digest = createHash("sha256").update(filePath).digest("hex");
  return `${normalizedPrUrl}/files#diff-${digest}`;
}

function buildGitLabDiffUrl(prUrl: string, filePath: string): string {
  const normalizedPrUrl = prUrl.replace(/\/+$/, "");
  // GitLab supports direct links to diff files from the MR changes view.
  return `${normalizedPrUrl}/diffs#${encodeURIComponent(filePath)}`;
}

function buildProviderFileUrl(pullRequest: PullRequestForMarkdown, filePath: string): string | null {
  if (!pullRequest.url) {
    return null;
  }

  switch (pullRequest.provider) {
    case "github":
      return buildGitHubDiffUrl(pullRequest.url, filePath);
    case "gitlab":
      return buildGitLabDiffUrl(pullRequest.url, filePath);
    default:
      return null;
  }
}

export async function generateAndStorePatchMapMarkdown(
  patchmapId: string
): Promise<string> {
  const supabase = createAdminSupabaseClient();

  const { data: patchmapRow, error: patchmapError } = await supabase
    .from("patchmaps")
    .select(`
      id,
      pull_requests (
        provider,
        url
      )
    `)
    .eq("id", patchmapId)
    .single();

  if (patchmapError || !patchmapRow) {
    throw new Error(`Failed to load patchmap context: ${patchmapError?.message ?? "unknown error"}`);
  }

  const pullRequest = Array.isArray(patchmapRow.pull_requests)
    ? patchmapRow.pull_requests[0]
    : patchmapRow.pull_requests;

  if (!pullRequest) {
    throw new Error("Missing pull request for patchmap");
  }

  const { data: summaryRow, error: summaryError } = await supabase
    .from("patchmap_summaries")
    .select(`
      id,
      purpose,
      risk_notes,
      test_notes,
      behavior_change_notes,
      demoable,
      demo_notes
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
    files: Array<{
      path: string;
      url?: string | null;
    }>;
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

    const files = (groupFileRows ?? [])
      .map((row) => {
        const prFile = Array.isArray(row.pr_files) ? row.pr_files[0] : row.pr_files;
        const path = prFile?.file_path ?? null;
        if (!path) return null;

        return {
          path,
          url: buildProviderFileUrl(pullRequest, path),
        };
      })
      .filter(
        (value): value is { path: string; url: string | null } => value !== null
      );

    groupsWithFiles.push({
      title: group.title,
      description: group.description,
      orderIndex: group.order_index,
      files,
    });
  }

  const markdown = generatePatchMapMarkdown({
    summary: summaryRow
      ? {
          purpose: summaryRow.purpose,
          behaviorChangeNotes: summaryRow.behavior_change_notes,
          riskNotes: summaryRow.risk_notes,
          testNotes: summaryRow.test_notes,
          demoable: summaryRow.demoable,
          demoNotes: summaryRow.demo_notes,
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


