"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DiffPanel } from "@/app/components/patchmap/diff-panel";
import { GroupFileList } from "@/app/components/patchmap/group-file-list";
import { WalkthroughStepList } from "@/app/components/patchmap/walkthrough-step-list";
import { findGroupIndexForFile, mapStoredGroupsToSuggestedGroups } from "@/lib/patchmap/ui-utils";
import { usePatchMapWorkspace } from "@/lib/patchmap/use-patchmap-workspace";

export default function PatchMapReadOnlyPage() {
  const params = useParams<{ pullRequestId: string }>();
  const pullRequestId = params.pullRequestId ?? "";
  const { isLoading, loadError, fileMap, patchmap, suggestedGroups } = usePatchMapWorkspace({
    pullRequestId,
    includeSuggestions: true,
    missingPullRequestMessage: "Missing pull request id.",
    lookupErrorMessage: "Unable to fetch PR files for viewer.",
    loadErrorMessage: "Unable to load read-only patchmap",
    suggestionsErrorMessage: "Unable to fetch suggested file groups.",
  });

  const [manualSelectedGroupIndex, setManualSelectedGroupIndex] = useState(0);
  const [manualSelectedFileId, setManualSelectedFileId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const summary = patchmap?.summary ?? null;
  const walkthrough = patchmap?.walkthrough ?? null;
  const draftGroups = patchmap ? mapStoredGroupsToSuggestedGroups(patchmap.groups) : [];
  const groups =
    draftGroups.some((group) => group.fileIds.length > 0) ? draftGroups : suggestedGroups;
  const currentStep = walkthrough?.steps[currentStepIndex] ?? null;
  const walkthroughEnabled = Boolean(walkthrough?.steps.length);
  const activeWalkthrough = walkthrough && walkthrough.steps.length > 0 ? walkthrough : null;
  const groupedSelectedGroupIndex = groups[manualSelectedGroupIndex] ? manualSelectedGroupIndex : 0;
  const selectedGroupIndex = walkthroughEnabled
    ? findGroupIndexForFile(currentStep?.prFileId ?? "", groups)
    : groupedSelectedGroupIndex;
  const selectedGroup = groups[selectedGroupIndex] ?? null;
  const groupedSelectedFileId =
    manualSelectedFileId && selectedGroup?.fileIds.includes(manualSelectedFileId)
      ? manualSelectedFileId
      : selectedGroup?.fileIds[0] ?? null;
  const selectedFileId = walkthroughEnabled
    ? currentStep?.prFileId ?? null
    : groupedSelectedFileId;
  const selectedFile = selectedFileId ? fileMap.get(selectedFileId) : null;

  function goToStep(nextIndex: number) {
    if (!walkthrough) return;
    const step = walkthrough.steps[nextIndex];
    if (!step) return;

    setCurrentStepIndex(nextIndex);
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
      <section className="pm-page-intro pm-card px-6 py-6 md:px-7 md:py-7">
        <div className="pm-context-kicker">
          {walkthroughEnabled ? "Reviewer walkthrough" : "Read-only patchmap view"}
        </div>
        <h1 className="pm-hero-title mt-2">
          {walkthroughEnabled ? walkthrough?.title || "Review Walkthrough" : "PatchMap Snapshot"}
        </h1>
        <p className="pm-hero-subtitle pm-section-lead">
          {walkthroughEnabled
            ? "Follow the author’s intended review sequence file by file."
            : "Review-only mode for previously generated patchmaps."}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/dashboard" className="pm-button pm-button-secondary">Back to Dashboard</Link>
          <Link href={`/patchmap/${pullRequestId}`} className="pm-button pm-button-secondary">Open Editable View</Link>
        </div>
      </section>

      {activeWalkthrough ? (
        <section className="pm-emphasis-card mt-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="pm-step-chip">Primary Review Mode</div>
              <div className="pm-emphasis-title mt-3">Follow the guided walkthrough first</div>
              <p className="pm-emphasis-copy">
                The author has prepared a file-by-file path. Use the grouped view below only as supporting context.
              </p>
            </div>
            <div className="pm-soft-panel">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                Review length
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--pm-brand-navy)]">
                {activeWalkthrough.steps.length} steps
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="pm-emphasis-card mt-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="pm-step-chip">Grouped Review Mode</div>
              <div className="pm-emphasis-title mt-3">This PR does not have a walkthrough</div>
              <p className="pm-emphasis-copy">
                Review it through the groups below. If this change needs more author guidance, ask for a walkthrough from the editable view.
              </p>
            </div>
            <div>
              <Link href={`/patchmap/${pullRequestId}`} className="pm-button pm-button-primary">
                Open Author View
              </Link>
            </div>
          </div>
        </section>
      )}

      {summary ? (
        <article className="pm-card mt-8 p-6 md:p-7">
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

      {activeWalkthrough ? (
        <section className="pm-card mt-8 p-5 md:p-6">
          <div className="pm-card-header">
            <div>
              <h2 className="pm-card-title">Step-Through Review</h2>
              <p className="pm-card-subtitle">
                Step through the review in the order the author prepared.
              </p>
            </div>
            <span className="pm-pill">
              Step {currentStepIndex + 1} of {activeWalkthrough.steps.length}
            </span>
          </div>

          {activeWalkthrough.introNotes ? (
            <div className="pm-alert">{activeWalkthrough.introNotes}</div>
          ) : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="pm-soft-panel">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
                Walkthrough Steps
              </div>
              <WalkthroughStepList
                steps={activeWalkthrough.steps}
                fileMap={fileMap}
                activeIndex={currentStepIndex}
                onSelect={goToStep}
              />
            </aside>

            <div className="pm-grid-content-fix rounded-xl border border-[var(--pm-border)] bg-white p-5">
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
                    disabled={currentStepIndex >= activeWalkthrough.steps.length - 1}
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

              <DiffPanel file={selectedFile} className="mt-4" />
            </div>
          </div>
        </section>
      ) : null}

      <section className="pm-card mt-8 p-5 md:p-6">
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

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="pm-soft-panel">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">Groups</div>
            <div className="mt-3 grid gap-2">
              {groups.map((group, index) => (
                <button
                  key={`${group.title}-${index}`}
                  type="button"
                  onClick={() => {
                    setManualSelectedGroupIndex(index);
                    setManualSelectedFileId(group.fileIds[0] ?? null);
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

          <div className="pm-grid-content-fix rounded-xl border border-[var(--pm-border)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[var(--pm-brand-navy)]">{selectedGroup?.title ?? "No group selected"}</h3>
              <span className="pm-pill">{selectedGroup?.fileIds.length ?? 0} files</span>
            </div>
            {selectedGroup?.description ? <p className="mt-2 text-sm text-[var(--pm-text-soft)]">{selectedGroup.description}</p> : null}

            {selectedGroup && selectedGroup.fileIds.length > 0 ? (
              <>
                <div className="mt-3">
                  <GroupFileList
                    fileIds={selectedGroup.fileIds}
                    fileMap={fileMap}
                    selectedFileId={selectedFileId}
                    onSelect={setManualSelectedFileId}
                  />
                </div>

                {selectedFileId && !walkthroughEnabled ? (
                  <DiffPanel file={selectedFile} className="mt-2" />
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




