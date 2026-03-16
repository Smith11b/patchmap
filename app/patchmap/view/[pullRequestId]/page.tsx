"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SuggestedGroup = {
  title: string;
  description?: string;
  orderIndex: number;
  fileIds: string[];
};

type SuggestedGroupsResponse = {
  pullRequestId: string;
  groups: SuggestedGroup[];
};

type LookupResponse = {
  files: Array<{
    id: string;
    filePath: string;
    oldFilePath?: string | null;
    changeType: "added" | "modified" | "deleted" | "renamed";
    patchText?: string | null;
    displayOrder: number;
  }>;
};

type PatchMapResponse = {
  patchmap: {
    id: string;
    pullRequestId: string;
    versionNumber: number;
    status: "draft" | "published";
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    id: string;
    purpose?: string | null;
    riskNotes?: string | null;
    testNotes?: string | null;
    behaviorChangeNotes?: string | null;
    demoable?: boolean | null;
    demoNotes?: string | null;
    generatedMarkdown?: string | null;
  } | null;
  groups: Array<{
    id: string;
    title: string;
    description?: string | null;
    orderIndex: number;
    fileIds: string[];
  }>;
  walkthrough: {
    id: string;
    title?: string | null;
    introNotes?: string | null;
    steps: Array<{
      id: string;
      prFileId: string;
      title?: string | null;
      notes?: string | null;
      orderIndex: number;
    }>;
  } | null;
};

function diffLineClass(line: string): string {
  if (line.startsWith("+")) return "pm-diff-line pm-diff-add";
  if (line.startsWith("-")) return "pm-diff-line pm-diff-del";
  if (line.startsWith("@@")) return "pm-diff-line pm-diff-hunk";
  return "pm-diff-line";
}

export default function PatchMapReadOnlyPage() {
  const params = useParams<{ pullRequestId: string }>();
  const pullRequestId = params.pullRequestId ?? "";

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [groups, setGroups] = useState<SuggestedGroup[]>([]);
  const [fileMap, setFileMap] = useState<Map<string, LookupResponse["files"][number]>>(new Map());
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [summary, setSummary] = useState<PatchMapResponse["summary"]>(null);
  const [walkthrough, setWalkthrough] = useState<PatchMapResponse["walkthrough"]>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const selectedGroup = groups[selectedGroupIndex] ?? null;
  const selectedFile = selectedFileId ? fileMap.get(selectedFileId) : null;
  const currentStep = walkthrough?.steps[currentStepIndex] ?? null;
  const walkthroughEnabled = Boolean(walkthrough?.steps.length);

  function findGroupIndexForFile(fileId: string, candidateGroups: SuggestedGroup[]) {
    return candidateGroups.findIndex((group) => group.fileIds.includes(fileId));
  }

  const loadData = useCallback(async () => {
    const [lookupResponse, groupsResponse, patchmapResponse] = await Promise.all([
      fetch(`/api/pull-requests/lookup?pullRequestId=${pullRequestId}`),
      fetch(`/api/patchmaps/suggest-groups?pullRequestId=${pullRequestId}`),
      fetch(`/api/patchmaps/by-pr?pullRequestId=${pullRequestId}`),
    ]);

    if (!lookupResponse.ok) {
      throw new Error("Unable to fetch PR files for viewer.");
    }

    const lookupData = (await lookupResponse.json()) as LookupResponse;
    const nextFileMap = new Map(lookupData.files.map((file) => [file.id, file] as const));
    setFileMap(nextFileMap);

    if (patchmapResponse.ok) {
      const patchmapData = (await patchmapResponse.json()) as PatchMapResponse;
      setSummary(patchmapData.summary);
      setWalkthrough(patchmapData.walkthrough);

      const hasDraftGroups = patchmapData.groups.some((group) => group.fileIds.length > 0);
      if (hasDraftGroups) {
        const mapped = patchmapData.groups.map((group) => ({
          title: group.title,
          description: group.description ?? undefined,
          orderIndex: group.orderIndex,
          fileIds: group.fileIds,
        }));
        setGroups(mapped);
        if (patchmapData.walkthrough?.steps.length) {
          const firstStepFileId = patchmapData.walkthrough.steps[0].prFileId;
          setCurrentStepIndex(0);
          setSelectedFileId(firstStepFileId);
          const groupIndex = findGroupIndexForFile(firstStepFileId, mapped);
          setSelectedGroupIndex(groupIndex >= 0 ? groupIndex : 0);
        } else {
          const firstGroupWithFiles = mapped.find((group) => group.fileIds.length > 0);
          setSelectedGroupIndex(0);
          setSelectedFileId(firstGroupWithFiles?.fileIds[0] ?? null);
        }
        return;
      }
    }

    if (groupsResponse.ok) {
      const suggestedData = (await groupsResponse.json()) as SuggestedGroupsResponse;
      setGroups(suggestedData.groups);
      setSelectedGroupIndex(0);
      setSelectedFileId(suggestedData.groups[0]?.fileIds[0] ?? null);
    }
  }, [pullRequestId]);

  useEffect(() => {
    async function run() {
      setIsLoading(true);
      setLoadError(null);
      try {
        await loadData();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load read-only patchmap");
      } finally {
        setIsLoading(false);
      }
    }

    if (!pullRequestId) {
      setLoadError("Missing pull request id.");
      setIsLoading(false);
      return;
    }

    void run();
  }, [pullRequestId, loadData]);

  function goToStep(nextIndex: number) {
    if (!walkthrough) return;
    const step = walkthrough.steps[nextIndex];
    if (!step) return;

    setCurrentStepIndex(nextIndex);
    setSelectedFileId(step.prFileId);

    const groupIndex = findGroupIndexForFile(step.prFileId, groups);
    if (groupIndex >= 0) {
      setSelectedGroupIndex(groupIndex);
    }
  }

  if (isLoading) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">Loading PatchMap...</div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="pm-shell">
        <div className="pm-alert pm-alert-error">{loadError}</div>
      </main>
    );
  }

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-5 py-5 md:px-6 md:py-6">
        <div className="pm-context-kicker">
          {walkthroughEnabled ? "Reviewer walkthrough" : "Read-only patchmap view"}
        </div>
        <h1 className="pm-hero-title mt-2">
          {walkthroughEnabled ? walkthrough?.title || "Review Walkthrough" : "PatchMap Snapshot"}
        </h1>
        <p className="pm-hero-subtitle">
          {walkthroughEnabled
            ? "Follow the author’s intended review sequence file by file."
            : "Review-only mode for previously generated patchmaps."}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/dashboard" className="pm-button pm-button-secondary">Back to Dashboard</Link>
          <Link href={`/patchmap/${pullRequestId}`} className="pm-button pm-button-secondary">Open Editable View</Link>
        </div>
      </section>

      {summary ? (
        <article className="pm-card mt-6 p-5 md:p-6">
          <h2 className="pm-card-title">Summary</h2>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <div><strong>Purpose:</strong> {summary.purpose || "-"}</div>
            <div><strong>Behavior:</strong> {summary.behaviorChangeNotes || "-"}</div>
            <div><strong>Risk:</strong> {summary.riskNotes || "-"}</div>
            <div><strong>Tests:</strong> {summary.testNotes || "-"}</div>
            <div><strong>Demoable:</strong> {summary.demoable === null || summary.demoable === undefined ? "-" : summary.demoable ? "Yes" : "No"}</div>
            <div><strong>Demo Notes:</strong> {summary.demoNotes || "-"}</div>
          </div>
          <label className="pm-label mt-2">
            Generated Markdown
            <textarea className="pm-textarea min-h-[220px] font-mono text-sm" readOnly value={summary.generatedMarkdown || ""} />
          </label>
        </article>
      ) : null}

      {walkthroughEnabled ? (
        <section className="pm-card mt-6 p-4 md:p-5">
          <div className="pm-card-header">
            <div>
              <h2 className="pm-card-title">Step-Through Review</h2>
              <p className="pm-card-subtitle">
                Step through the review in the order the author prepared.
              </p>
            </div>
            <span className="pm-pill">
              Step {currentStepIndex + 1} of {walkthrough.steps.length}
            </span>
          </div>

          {walkthrough.introNotes ? (
            <div className="pm-alert">{walkthrough.introNotes}</div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface-muted)] p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
                Walkthrough Steps
              </div>
              <div className="mt-3 grid gap-2">
                {walkthrough.steps.map((step, index) => {
                  const file = fileMap.get(step.prFileId);
                  const isActive = index === currentStepIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => goToStep(index)}
                      className={`min-w-0 rounded-lg border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-[var(--pm-brand-teal)] bg-white shadow-sm"
                          : "border-[var(--pm-border)] bg-white/80 hover:border-[var(--pm-border-strong)]"
                      }`}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                        Step {index + 1}
                      </div>
                      <div className="mt-1 break-words text-sm font-semibold text-[var(--pm-brand-navy)]">
                        {step.title || file?.filePath || "Untitled step"}
                      </div>
                      <div className="mt-1 truncate text-xs text-[var(--pm-text-soft)]">
                        {file?.filePath || step.prFileId}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="pm-grid-content-fix rounded-xl border border-[var(--pm-border)] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                    Current Step
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--pm-brand-navy)]">
                    {currentStep?.title || selectedFile?.filePath || "No step selected"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="pm-button pm-button-secondary"
                    type="button"
                    onClick={() => goToStep(currentStepIndex - 1)}
                    disabled={currentStepIndex === 0}
                  >
                    Previous
                  </button>
                  <button
                    className="pm-button pm-button-primary"
                    type="button"
                    onClick={() => goToStep(currentStepIndex + 1)}
                    disabled={currentStepIndex >= walkthrough.steps.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>

              {currentStep?.notes ? (
                <label className="pm-label mt-4">
                  Author Notes
                  <textarea
                    className="pm-textarea"
                    rows={5}
                    readOnly
                    value={currentStep.notes}
                  />
                </label>
              ) : (
                <div className="pm-alert mt-4">No author notes for this step.</div>
              )}

              <div className="pm-diff mt-4">
                <div className="pm-diff-header">{selectedFile?.filePath ?? "Unknown file"}</div>
                {selectedFile?.patchText ? (
                  <pre className="pm-diff-body">
                    {selectedFile.patchText.split("\n").map((line, index) => (
                      <span key={`${index}-${line}`} className={diffLineClass(line)}>{line}</span>
                    ))}
                  </pre>
                ) : (
                  <div className="pm-diff-body">Diff content not available for this file.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="pm-card mt-6 p-4 md:p-5">
        <div className="pm-card-header">
          <div>
            <h2 className="pm-card-title">{walkthroughEnabled ? "Supporting Groups" : "Grouped PR Viewer"}</h2>
            <p className="pm-card-subtitle">
              {walkthroughEnabled
                ? "Use the groups for extra orientation while the walkthrough drives the review flow."
                : "Read-only grouped file exploration."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface-muted)] p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">Groups</div>
            <div className="mt-3 grid gap-2">
              {groups.map((group, index) => (
                <button
                  key={`${group.title}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedGroupIndex(index);
                    setSelectedFileId(group.fileIds[0] ?? null);
                  }}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    index === selectedGroupIndex
                      ? "border-[var(--pm-brand-teal)] bg-white shadow-sm"
                      : "border-[var(--pm-border)] bg-white/80 hover:border-[var(--pm-border-strong)]"
                  }`}
                >
                  <div className="text-sm font-semibold text-[var(--pm-brand-navy)]">{group.title}</div>
                  <div className="mt-0.5 text-xs text-[var(--pm-text-soft)]">{group.fileIds.length} file(s)</div>
                </button>
              ))}
            </div>
          </aside>

          <div className="pm-grid-content-fix rounded-xl border border-[var(--pm-border)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[var(--pm-brand-navy)]">{selectedGroup?.title ?? "No group selected"}</h3>
              <span className="pm-pill">{selectedGroup?.fileIds.length ?? 0} files</span>
            </div>
            {selectedGroup?.description ? <p className="mt-2 text-sm text-[var(--pm-text-soft)]">{selectedGroup.description}</p> : null}

            {selectedGroup && selectedGroup.fileIds.length > 0 ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedGroup.fileIds.map((fileId) => {
                    const file = fileMap.get(fileId);
                    return (
                      <button
                        key={fileId}
                        type="button"
                        onClick={() => setSelectedFileId(fileId)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          selectedFileId === fileId
                            ? "border-[var(--pm-brand-teal)] bg-[rgba(20,151,154,0.12)] text-[var(--pm-brand-navy)]"
                            : "border-[var(--pm-border)] bg-white text-[var(--pm-text-soft)] hover:border-[var(--pm-border-strong)]"
                        }`}
                      >
                        {file?.filePath ?? fileId}
                      </button>
                    );
                  })}
                </div>

                {selectedFileId && !walkthroughEnabled ? (
                  <div className="pm-diff mt-2">
                    <div className="pm-diff-header">{selectedFile?.filePath ?? "Unknown file"}</div>
                    {selectedFile?.patchText ? (
                      <pre className="pm-diff-body">
                        {selectedFile.patchText.split("\n").map((line, index) => (
                          <span key={`${index}-${line}`} className={diffLineClass(line)}>{line}</span>
                        ))}
                      </pre>
                    ) : (
                      <div className="pm-diff-body">Diff content not available for this file.</div>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="pm-alert mt-2">No files in selected group.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}




