import {
  LookupFile,
  PatchMapResponse,
  SuggestedGroup,
  WalkthroughStepDraft,
} from "@/lib/patchmap/ui-types";

export function diffLineClass(line: string): string {
  if (line.startsWith("+")) return "pm-diff-line pm-diff-add";
  if (line.startsWith("-")) return "pm-diff-line pm-diff-del";
  if (line.startsWith("@@")) return "pm-diff-line pm-diff-hunk";
  return "pm-diff-line";
}

export function demoableToValue(demoable?: boolean | null): "" | "yes" | "no" {
  if (demoable === true) return "yes";
  if (demoable === false) return "no";
  return "";
}

export function createFileMap(files: LookupFile[]): Map<string, LookupFile> {
  return new Map(files.map((file) => [file.id, file] as const));
}

export function mapStoredGroupsToSuggestedGroups(
  groups: PatchMapResponse["groups"]
): SuggestedGroup[] {
  return groups.map((group) => ({
    title: group.title,
    description: group.description ?? undefined,
    orderIndex: group.orderIndex,
    fileIds: group.fileIds,
  }));
}

export function mapWalkthroughToDraftSteps(
  walkthrough: NonNullable<PatchMapResponse["walkthrough"]>,
  fileMap: Map<string, LookupFile>
): WalkthroughStepDraft[] {
  return walkthrough.steps.map((step) => ({
    prFileId: step.prFileId,
    title: step.title ?? fileMap.get(step.prFileId)?.filePath ?? "",
    notes: step.notes ?? "",
  }));
}

export function buildSeedWalkthroughSteps(
  groups: SuggestedGroup[],
  files: LookupFile[],
  fileMap: Map<string, LookupFile>
): WalkthroughStepDraft[] {
  const groupedFileIds = groups.flatMap((group) => group.fileIds);
  const seedFileIds = groupedFileIds.length > 0 ? groupedFileIds : files.map((file) => file.id);

  return seedFileIds.map((fileId) => ({
    prFileId: fileId,
    title: fileMap.get(fileId)?.filePath ?? "",
    notes: "",
  }));
}

export function findGroupIndexForFile(fileId: string, groups: SuggestedGroup[]): number {
  return groups.findIndex((group) => group.fileIds.includes(fileId));
}
