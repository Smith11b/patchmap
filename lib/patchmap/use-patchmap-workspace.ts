"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchLookupFiles, fetchPatchMapByPullRequest, fetchSuggestedGroups } from "@/lib/patchmap/client";
import { LookupFile, PatchMapResponse, SuggestedGroup } from "@/lib/patchmap/ui-types";
import { createFileMap } from "@/lib/patchmap/ui-utils";

type UsePatchMapWorkspaceOptions = {
  pullRequestId: string;
  includeSuggestions?: boolean;
  missingPullRequestMessage: string;
  lookupErrorMessage: string;
  loadErrorMessage: string;
  suggestionsErrorMessage?: string;
};

type UsePatchMapWorkspaceResult = {
  isLoading: boolean;
  loadError: string | null;
  suggestionsError: string | null;
  files: LookupFile[];
  fileMap: Map<string, LookupFile>;
  patchmap: PatchMapResponse | null;
  suggestedGroups: SuggestedGroup[];
  reload: () => Promise<void>;
};

export function usePatchMapWorkspace({
  pullRequestId,
  includeSuggestions = false,
  missingPullRequestMessage,
  lookupErrorMessage,
  loadErrorMessage,
  suggestionsErrorMessage,
}: UsePatchMapWorkspaceOptions): UsePatchMapWorkspaceResult {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [files, setFiles] = useState<LookupFile[]>([]);
  const [fileMap, setFileMap] = useState<Map<string, LookupFile>>(new Map());
  const [patchmap, setPatchmap] = useState<PatchMapResponse | null>(null);
  const [suggestedGroups, setSuggestedGroups] = useState<SuggestedGroup[]>([]);

  const reload = useCallback(async () => {
    if (!pullRequestId) {
      setLoadError(missingPullRequestMessage);
      setSuggestionsError(null);
      setFiles([]);
      setFileMap(new Map());
      setPatchmap(null);
      setSuggestedGroups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setSuggestionsError(null);

    try {
      const [lookupData, patchmapData, suggestionsResult] = await Promise.all([
        fetchLookupFiles(pullRequestId, lookupErrorMessage),
        fetchPatchMapByPullRequest(pullRequestId),
        includeSuggestions
          ? fetchSuggestedGroups(
              pullRequestId,
              suggestionsErrorMessage ?? "Unable to fetch suggested file groups."
            ).catch((error: unknown) => ({
              error:
                error instanceof Error
                  ? error.message
                  : suggestionsErrorMessage ?? "Unable to fetch suggested file groups.",
            }))
          : Promise.resolve(null),
      ]);

      setFiles(lookupData.files);
      setFileMap(createFileMap(lookupData.files));
      setPatchmap(patchmapData);

      if (includeSuggestions) {
        if (suggestionsResult && "error" in suggestionsResult) {
          setSuggestedGroups([]);
          setSuggestionsError(suggestionsResult.error);
        } else {
          setSuggestedGroups(suggestionsResult?.groups ?? []);
        }
      } else {
        setSuggestedGroups([]);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : loadErrorMessage);
      setFiles([]);
      setFileMap(new Map());
      setPatchmap(null);
      setSuggestedGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    includeSuggestions,
    loadErrorMessage,
    lookupErrorMessage,
    missingPullRequestMessage,
    pullRequestId,
    suggestionsErrorMessage,
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    isLoading,
    loadError,
    suggestionsError,
    files,
    fileMap,
    patchmap,
    suggestedGroups,
    reload,
  };
}
