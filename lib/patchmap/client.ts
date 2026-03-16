import {
  GenerateMarkdownResponse,
  LookupResponse,
  PatchMapResponse,
  SaveDraftPayload,
  SaveDraftResponse,
  SuggestedGroupsResponse,
} from "@/lib/patchmap/ui-types";

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    throw new Error(("error" in data && data.error) || fallbackMessage);
  }

  return data as T;
}

export async function fetchLookupFiles(
  pullRequestId: string,
  fallbackMessage: string
): Promise<LookupResponse> {
  const response = await fetch(`/api/pull-requests/lookup?pullRequestId=${pullRequestId}`);
  return readJson<LookupResponse>(response, fallbackMessage);
}

export async function fetchSuggestedGroups(
  pullRequestId: string,
  fallbackMessage: string
): Promise<SuggestedGroupsResponse> {
  const response = await fetch(`/api/patchmaps/suggest-groups?pullRequestId=${pullRequestId}`);
  return readJson<SuggestedGroupsResponse>(response, fallbackMessage);
}

export async function fetchPatchMapByPullRequest(pullRequestId: string): Promise<PatchMapResponse | null> {
  const response = await fetch(`/api/patchmaps/by-pr?pullRequestId=${pullRequestId}`);

  if (response.status === 404) {
    return null;
  }

  return readJson<PatchMapResponse>(response, "Unable to load patchmap");
}

export async function savePatchMapDraft(payload: SaveDraftPayload): Promise<SaveDraftResponse> {
  const response = await fetch("/api/patchmaps/save-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<SaveDraftResponse>(response, "Failed to save draft");
}

export async function generatePatchMapMarkdown(
  patchmapId: string
): Promise<GenerateMarkdownResponse> {
  const response = await fetch("/api/patchmaps/generate-markdown", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ patchmapId }),
  });

  return readJson<GenerateMarkdownResponse>(response, "Failed to generate markdown");
}
