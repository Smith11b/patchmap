"use client";

import { useCallback } from "react";
import { generatePatchMapMarkdown, savePatchMapDraft } from "@/lib/patchmap/client";
import {
  GenerateMarkdownResponse,
  SaveDraftPayload,
  SaveDraftResponse,
} from "@/lib/patchmap/ui-types";

type UsePatchMapDraftActionsResult = {
  saveDraft: (payload: SaveDraftPayload) => Promise<SaveDraftResponse>;
  generateMarkdown: (patchmapId: string) => Promise<GenerateMarkdownResponse>;
};

export function usePatchMapDraftActions(): UsePatchMapDraftActionsResult {
  const saveDraft = useCallback(async (payload: SaveDraftPayload) => savePatchMapDraft(payload), []);

  const generateMarkdown = useCallback(
    async (patchmapId: string) => generatePatchMapMarkdown(patchmapId),
    []
  );

  return {
    saveDraft,
    generateMarkdown,
  };
}
