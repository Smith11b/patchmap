export type SuggestedGroup = {
  title: string;
  description?: string;
  orderIndex: number;
  fileIds: string[];
};

export type SuggestedGroupsResponse = {
  pullRequestId: string;
  groups: SuggestedGroup[];
};

export type LookupFile = {
  id: string;
  filePath: string;
  oldFilePath?: string | null;
  changeType: "added" | "modified" | "deleted" | "renamed";
  patchText?: string | null;
  displayOrder: number;
};

export type LookupResponse = {
  files: LookupFile[];
};

export type PatchMapWalkthroughStep = {
  id: string;
  prFileId: string;
  title?: string | null;
  notes?: string | null;
  orderIndex: number;
};

export type PatchMapWalkthrough = {
  id: string;
  title?: string | null;
  introNotes?: string | null;
  steps: PatchMapWalkthroughStep[];
} | null;

export type PatchMapSummary = {
  id: string;
  purpose?: string | null;
  riskNotes?: string | null;
  testNotes?: string | null;
  behaviorChangeNotes?: string | null;
  demoable?: boolean | null;
  demoNotes?: string | null;
  generatedMarkdown?: string | null;
} | null;

export type PatchMapGroupRecord = {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  fileIds: string[];
};

export type PatchMapResponse = {
  patchmap: {
    id: string;
    pullRequestId: string;
    versionNumber: number;
    status: "draft" | "published";
    createdAt: string;
    updatedAt: string;
  };
  summary: PatchMapSummary;
  groups: PatchMapGroupRecord[];
  walkthrough: PatchMapWalkthrough;
};

export type SaveDraftResponse = {
  patchmap: {
    id: string;
    pullRequestId: string;
    versionNumber: number;
    status: "draft" | "published";
  };
  summary: Exclude<PatchMapSummary, null>;
  groups: PatchMapGroupRecord[];
  walkthrough: PatchMapWalkthrough;
};

export type GenerateMarkdownResponse = {
  patchmapId: string;
  markdown: string;
};

export type WalkthroughStepDraft = {
  prFileId: string;
  title: string;
  notes: string;
};

export type PatchMapIdentityDraft = {
  id?: string;
  status: "draft" | "published";
  versionNumber: number;
};

export type PatchMapSummaryDraft = {
  purpose?: string | null;
  riskNotes?: string | null;
  testNotes?: string | null;
  behaviorChangeNotes?: string | null;
  demoable?: boolean | null;
  demoNotes?: string | null;
};

export type PatchMapWalkthroughDraft = {
  title?: string | null;
  introNotes?: string | null;
  steps: Array<{
    prFileId: string;
    title?: string | null;
    notes?: string | null;
    orderIndex: number;
  }>;
};

export type SaveDraftPayload = {
  pullRequestId: string;
  patchmap: PatchMapIdentityDraft;
  summary: PatchMapSummaryDraft;
  groups: Array<{
    title: string;
    description?: string | null;
    orderIndex: number;
    fileIds: string[];
  }>;
  walkthrough: PatchMapWalkthroughDraft | null;
};
