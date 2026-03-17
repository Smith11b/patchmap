import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type RecentPatchMapItem = {
  patchmap: {
    id: string;
    pullRequestId: string;
    versionNumber: number;
    status: "draft" | "published";
    reviewRequestedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  review: {
    currentUserStatus: "not_started" | "in_progress" | "approved";
  };
  repository: {
    id: string;
    provider: "github" | "gitlab" | "azure";
    owner: string;
    name: string;
  };
  pullRequest: {
    id: string;
    prNumber: number;
    title: string;
    url: string;
    state: "open" | "closed" | "merged";
  };
};

export async function listRecentPatchMapsByWorkspace(
  workspaceId: string,
  userId: string,
  limit = 50
): Promise<RecentPatchMapItem[]> {
  const supabase = createAdminSupabaseClient();

  const { data: pullRequests, error: pullRequestError } = await supabase
    .from("pull_requests")
    .select(
      `
      id,
      pr_number,
      title,
      url,
      state,
      repositories!inner(
        id,
        provider,
        owner,
        name,
        workspace_id
      )
    `
    )
    .eq("repositories.workspace_id", workspaceId)
    .limit(500);

  if (pullRequestError) {
    throw new Error(`Failed to load pull requests for workspace: ${pullRequestError.message}`);
  }

  const normalizedPullRequests = (pullRequests ?? []).map((pr) => {
    const repo = Array.isArray(pr.repositories) ? pr.repositories[0] : pr.repositories;
    return {
      id: pr.id,
      prNumber: pr.pr_number,
      title: pr.title,
      url: pr.url,
      state: pr.state,
      repository: repo,
    };
  });

  if (normalizedPullRequests.length === 0) {
    return [];
  }

  const pullRequestIds = normalizedPullRequests.map((pr) => pr.id);

  const { data: patchmaps, error: patchmapsError } = await supabase
    .from("patchmaps")
    .select("id, pull_request_id, version_number, status, review_requested_at, created_at, updated_at")
    .in("pull_request_id", pullRequestIds)
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (patchmapsError) {
    throw new Error(`Failed to load patchmaps: ${patchmapsError.message}`);
  }

  const latestByPullRequest = new Map<string, (typeof patchmaps)[number]>();

  for (const patchmap of patchmaps ?? []) {
    const existing = latestByPullRequest.get(patchmap.pull_request_id);
    if (!existing) {
      latestByPullRequest.set(patchmap.pull_request_id, patchmap);
      continue;
    }

    if (new Date(patchmap.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
      latestByPullRequest.set(patchmap.pull_request_id, patchmap);
    }
  }

  const patchmapIds = (patchmaps ?? []).map((patchmap) => patchmap.id);
  const { data: reviewRows, error: reviewError } = await supabase
    .from("patchmap_review_states")
    .select("patchmap_id, status")
    .eq("user_id", userId)
    .in("patchmap_id", patchmapIds);

  if (reviewError && !reviewError.message.includes("patchmap_review_states")) {
    throw new Error(`Failed to load patchmap review states: ${reviewError.message}`);
  }

  const reviewByPatchmapId = new Map(
    (reviewRows ?? []).map((row) => [row.patchmap_id, row.status] as const)
  );

  return normalizedPullRequests
    .map((pr) => {
      const patchmap = latestByPullRequest.get(pr.id);
      if (!patchmap || !pr.repository) return null;

      return {
        patchmap: {
          id: patchmap.id,
          pullRequestId: patchmap.pull_request_id,
          versionNumber: patchmap.version_number,
          status: patchmap.status,
          reviewRequestedAt: patchmap.review_requested_at,
          createdAt: patchmap.created_at,
          updatedAt: patchmap.updated_at,
        },
        review: {
          currentUserStatus: reviewByPatchmapId.get(patchmap.id) ?? "not_started",
        },
        repository: {
          id: pr.repository.id,
          provider: pr.repository.provider,
          owner: pr.repository.owner,
          name: pr.repository.name,
        },
        pullRequest: {
          id: pr.id,
          prNumber: pr.prNumber,
          title: pr.title,
          url: pr.url,
          state: pr.state,
        },
      } as RecentPatchMapItem;
    })
    .filter((item): item is RecentPatchMapItem => Boolean(item))
    .sort((a, b) => new Date(b.patchmap.updatedAt).getTime() - new Date(a.patchmap.updatedAt).getTime())
    .slice(0, limit);
}
