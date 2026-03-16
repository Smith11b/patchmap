"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DiffPanel } from "@/app/components/patchmap/diff-panel";
import { GroupFileList } from "@/app/components/patchmap/group-file-list";
import {
  SaveDraftPayload,
  SuggestedGroup,
  WalkthroughStepDraft,
} from "@/lib/patchmap/ui-types";
import { demoableToValue } from "@/lib/patchmap/ui-utils";
import { usePatchMapDraftActions } from "@/lib/patchmap/use-patchmap-draft-actions";
import { usePatchMapWorkspace } from "@/lib/patchmap/use-patchmap-workspace";

type DragState = {
  fileId: string;
};

export default function PatchMapPage() {
  const params = useParams<{ pullRequestId: string }>();
  const pullRequestId = params.pullRequestId ?? "";
  const { saveDraft, generateMarkdown } = usePatchMapDraftActions();
  const {
    isLoading,
    loadError,
    suggestionsError,
    fileMap,
    patchmap,
    suggestedGroups,
  } = usePatchMapWorkspace({
    pullRequestId,
    includeSuggestions: true,
    missingPullRequestMessage: "Missing pull request id. Re-open from Register page.",
    lookupErrorMessage: "Unable to fetch PR files for viewer.",
    loadErrorMessage: "Unable to load patchmap workspace",
    suggestionsErrorMessage: "Unable to fetch suggested file groups.",
  });

  const [groupingError, setGroupingError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [groups, setGroups] = useState<SuggestedGroup[]>([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [walkthroughEnabled, setWalkthroughEnabled] = useState(false);
  const [walkthroughTitle, setWalkthroughTitle] = useState("");
  const [walkthroughIntro, setWalkthroughIntro] = useState("");
  const [walkthroughSteps, setWalkthroughSteps] = useState<WalkthroughStepDraft[]>([]);

  const [patchmapId, setPatchmapId] = useState<string | null>(null);
  const [patchmapStatus, setPatchmapStatus] = useState<"draft" | "published">("draft");
  const [patchmapVersion, setPatchmapVersion] = useState(1);

  const [purpose, setPurpose] = useState("");
  const [behaviorChangeNotes, setBehaviorChangeNotes] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [demoable, setDemoable] = useState<"" | "yes" | "no">("");
  const [demoNotes, setDemoNotes] = useState("");
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isGeneratingMarkdown, setIsGeneratingMarkdown] = useState(false);

  useEffect(() => {
    setGroupingError(suggestionsError);
  }, [suggestionsError]);

  useEffect(() => {
    if (isLoading || loadError) {
      return;
    }

    setDraftError(null);

    if (patchmap) {
      setPatchmapId(patchmap.patchmap.id);
      setPatchmapStatus(patchmap.patchmap.status);
      setPatchmapVersion(patchmap.patchmap.versionNumber);

      setPurpose(patchmap.summary?.purpose ?? "");
      setBehaviorChangeNotes(patchmap.summary?.behaviorChangeNotes ?? "");
      setRiskNotes(patchmap.summary?.riskNotes ?? "");
      setTestNotes(patchmap.summary?.testNotes ?? "");
      setDemoable(demoableToValue(patchmap.summary?.demoable));
      setDemoNotes(patchmap.summary?.demoNotes ?? "");
      setGeneratedMarkdown(patchmap.summary?.generatedMarkdown ?? "");

      if (patchmap.walkthrough) {
        setWalkthroughEnabled(true);
        setWalkthroughTitle(patchmap.walkthrough.title ?? "");
        setWalkthroughIntro(patchmap.walkthrough.introNotes ?? "");
        setWalkthroughSteps(
          patchmap.walkthrough.steps.map((step) => ({
            prFileId: step.prFileId,
            title: step.title ?? "",
            notes: step.notes ?? "",
          }))
        );
      } else {
        setWalkthroughEnabled(false);
        setWalkthroughTitle("");
        setWalkthroughIntro("");
        setWalkthroughSteps([]);
      }
    } else {
      setPatchmapId(null);
      setPatchmapStatus("draft");
      setPatchmapVersion(1);
      setPurpose("");
      setBehaviorChangeNotes("");
      setRiskNotes("");
      setTestNotes("");
      setDemoable("");
      setDemoNotes("");
      setGeneratedMarkdown("");
      setWalkthroughEnabled(false);
      setWalkthroughTitle("");
      setWalkthroughIntro("");
      setWalkthroughSteps([]);
    }

    const draftGroups =
      patchmap?.groups.map((group) => ({
        title: group.title,
        description: group.description ?? undefined,
        orderIndex: group.orderIndex,
        fileIds: group.fileIds,
      })) ?? [];
    const nextGroups =
      draftGroups.some((group) => group.fileIds.length > 0) ? draftGroups : suggestedGroups;

    setGroups(nextGroups);
    setSelectedGroupIndex(nextGroups.length > 0 ? 0 : -1);
    const firstGroupWithFiles = nextGroups.find((group) => group.fileIds.length > 0);
    setSelectedFileId(firstGroupWithFiles?.fileIds[0] ?? null);
  }, [isLoading, loadError, patchmap, suggestedGroups]);

  const selectedGroup = groups[selectedGroupIndex] ?? null;
  const selectedFile = selectedFileId ? fileMap.get(selectedFileId) : null;
  const assignedFileIds = new Set(groups.flatMap((group) => group.fileIds));
  const ungroupedFileIds = Array.from(fileMap.values())
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .filter((file) => !assignedFileIds.has(file.id))
    .map((file) => file.id);

  function normalizeGroups(nextGroups: SuggestedGroup[]) {
    return nextGroups.map((group, index) => ({
      ...group,
      orderIndex: index,
    }));
  }

  function updateGroup(index: number, patch: Partial<SuggestedGroup>) {
    setGroups((prev) =>
      normalizeGroups(prev.map((group, groupIndex) => (groupIndex === index ? { ...group, ...patch } : group)))
    );
  }

  function addGroup() {
    setGroups((prev) =>
      normalizeGroups([
        ...prev,
        {
          title: `New Group ${prev.length + 1}`,
          description: "",
          orderIndex: prev.length,
          fileIds: [],
        },
      ])
    );
    setSelectedGroupIndex(groups.length);
  }

  function removeGroup(index: number) {
    setGroups((prev) => {
      const nextGroups = normalizeGroups(prev.filter((_, groupIndex) => groupIndex !== index));
      setSelectedGroupIndex((currentIndex) => {
        if (nextGroups.length === 0) {
          setSelectedFileId(null);
          return 0;
        }

        const nextIndex = Math.min(currentIndex, nextGroups.length - 1);
        setSelectedFileId(nextGroups[nextIndex]?.fileIds[0] ?? null);
        return nextIndex;
      });
      return nextGroups;
    });
  }

  function moveGroup(groupIndex: number, direction: -1 | 1) {
    setGroups((prev) => {
      const targetIndex = groupIndex + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const nextGroups = [...prev];
      const [movedGroup] = nextGroups.splice(groupIndex, 1);
      nextGroups.splice(targetIndex, 0, movedGroup);

      setSelectedGroupIndex((currentIndex) => {
        if (currentIndex === groupIndex) return targetIndex;
        if (direction === -1 && currentIndex === targetIndex) return targetIndex + 1;
        if (direction === 1 && currentIndex === targetIndex) return targetIndex - 1;
        return currentIndex;
      });

      return normalizeGroups(nextGroups);
    });
  }

  function moveFileToGroup(fileId: string, destinationGroupIndex: number | null) {
    setGroups((prev) => {
      const nextGroups = prev.map((group) => ({
        ...group,
        fileIds: group.fileIds.filter((id) => id !== fileId),
      }));

      if (destinationGroupIndex !== null && nextGroups[destinationGroupIndex]) {
        nextGroups[destinationGroupIndex] = {
          ...nextGroups[destinationGroupIndex],
          fileIds: [...nextGroups[destinationGroupIndex].fileIds, fileId],
        };
      }

      const normalized = normalizeGroups(nextGroups);

      if (destinationGroupIndex !== null) {
        setSelectedGroupIndex(destinationGroupIndex);
      }

      setSelectedFileId(fileId);
      return normalized;
    });
  }

  function beginDrag(fileId: string) {
    setDragState({ fileId });
  }

  function endDrag() {
    setDragState(null);
  }

  function handleDrop(destinationGroupIndex: number | null) {
    if (!dragState) return;
    moveFileToGroup(dragState.fileId, destinationGroupIndex);
    setDragState(null);
  }

  function buildDraftPayload(): SaveDraftPayload {
    return {
      pullRequestId,
      patchmap: patchmapId
        ? {
            id: patchmapId,
            status: patchmapStatus,
            versionNumber: patchmapVersion,
          }
        : {
            status: "draft",
            versionNumber: 1,
          },
      summary: {
        purpose: purpose || null,
        riskNotes: riskNotes || null,
        testNotes: testNotes || null,
        behaviorChangeNotes: behaviorChangeNotes || null,
        demoable: demoable === "yes" ? true : demoable === "no" ? false : null,
        demoNotes: demoNotes || null,
      },
      groups: groups.map((group, index) => ({
        title: group.title,
        description: group.description || null,
        orderIndex: typeof group.orderIndex === "number" ? group.orderIndex : index,
        fileIds: group.fileIds,
      })),
      walkthrough: walkthroughEnabled
        ? {
            title: walkthroughTitle || null,
            introNotes: walkthroughIntro || null,
            steps: walkthroughSteps.map((step, index) => ({
              prFileId: step.prFileId,
              title: step.title || null,
              notes: step.notes || null,
              orderIndex: index,
            })),
          }
        : null,
    };
  }

  async function persistDraft(): Promise<string> {
    const saved = await saveDraft(buildDraftPayload());
    setPatchmapId(saved.patchmap.id);
    setPatchmapStatus(saved.patchmap.status);
    setPatchmapVersion(saved.patchmap.versionNumber);

    return saved.patchmap.id;
  }

  async function handleSaveDraft() {
    try {
      setIsSavingDraft(true);
      setDraftError(null);
      await persistDraft();
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleGenerateMarkdown() {
    try {
      setIsGeneratingMarkdown(true);
      setDraftError(null);

      const id = await persistDraft();
      const result = await generateMarkdown(id);
      setGeneratedMarkdown(result.markdown);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Failed to generate markdown");
    } finally {
      setIsGeneratingMarkdown(false);
    }
  }

  async function handleCopyMarkdown() {
    if (!generatedMarkdown.trim()) return;

    try {
      await navigator.clipboard.writeText(generatedMarkdown);
    } catch {
      setDraftError("Unable to copy markdown to clipboard.");
    }
  }

  if (isLoading) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">Loading PatchMap workspace...</div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">
          <div className="pm-alert pm-alert-error">{loadError}</div>
          <div className="mt-2">
            <Link href="/register" className="pm-button pm-button-secondary">
              Back to Register
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-6 py-6 md:px-7 md:py-7">
        <div className="pm-context-kicker">Grouped review workspace</div>
        <h1 className="pm-hero-title mt-2">PatchMap Viewer</h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Review grouped files, capture intent, and generate markdown ready for PR comments.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/register" className="pm-button pm-button-secondary">
            Back to Register
          </Link>
          <Link href={`/patchmap/${pullRequestId}/walkthrough`} className="pm-button pm-button-primary">
            {walkthroughEnabled ? "Edit Walkthrough" : "Create Walkthrough"}
          </Link>
          <Link href={`/patchmap/view/${pullRequestId}`} className="pm-button pm-button-secondary">
            Open Reviewer View
          </Link>
          <Link href="/settings" className="pm-button pm-button-secondary">
            Settings
          </Link>
        </div>
      </section>

      <section className="pm-fade-stagger mt-8 grid gap-5">
        <article className="pm-emphasis-card">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="pm-step-chip">Recommended Flow</div>
              <div className="pm-emphasis-title mt-3">Choose your review mode</div>
              <p className="pm-emphasis-copy">
                Keep small PRs in grouped review. For larger changes, create a walkthrough so reviewers can follow a guided path.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="pm-soft-panel">
                <div className="pm-emphasis-title">Grouped Review</div>
                <p className="pm-emphasis-copy">Best when ordering and grouping are enough context on their own.</p>
                <div className="mt-3">
                  <span className="pm-pill">Default mode</span>
                </div>
              </div>
              <div className="pm-soft-panel">
                <div className="pm-emphasis-title">Guided Walkthrough</div>
                <p className="pm-emphasis-copy">Use when reviewers need a file-by-file path, custom notes, and stronger author guidance.</p>
                <div className="mt-3">
                  <Link href={`/patchmap/${pullRequestId}/walkthrough`} className="pm-button pm-button-primary">
                    {walkthroughEnabled ? "Edit Walkthrough" : "Create Walkthrough"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="pm-card p-6 md:p-7">
          <div className="pm-card-header">
            <div>
              <h2 className="pm-card-title">PatchMap Draft + Markdown</h2>
              <p className="pm-card-subtitle">
                Fill out summary details, save draft metadata, and generate markdown for your PR.
              </p>
            </div>
            <span className="pm-pill">{patchmapId ? "Existing Draft" : "New Draft"}</span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="pm-label" htmlFor="purpose">
              Purpose
              <textarea
                id="purpose"
                className="pm-textarea"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>

            <label className="pm-label" htmlFor="behaviorChangeNotes">
              Behavior Change
              <textarea
                id="behaviorChangeNotes"
                className="pm-textarea"
                value={behaviorChangeNotes}
                onChange={(event) => setBehaviorChangeNotes(event.target.value)}
              />
            </label>

            <label className="pm-label" htmlFor="riskNotes">
              Risk Notes
              <textarea
                id="riskNotes"
                className="pm-textarea"
                value={riskNotes}
                onChange={(event) => setRiskNotes(event.target.value)}
              />
            </label>

            <label className="pm-label" htmlFor="testNotes">
              Test Notes
              <textarea
                id="testNotes"
                className="pm-textarea"
                value={testNotes}
                onChange={(event) => setTestNotes(event.target.value)}
              />
            </label>

            <label className="pm-label" htmlFor="demoable">
              Demoable
              <select
                id="demoable"
                className="pm-select"
                value={demoable}
                onChange={(event) => setDemoable(event.target.value as "" | "yes" | "no")}
              >
                <option value="">Not set</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>

            <label className="pm-label" htmlFor="demoNotes">
              Demo Notes
              <textarea
                id="demoNotes"
                className="pm-textarea"
                value={demoNotes}
                onChange={(event) => setDemoNotes(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="pm-button pm-button-secondary"
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isGeneratingMarkdown}
            >
              {isSavingDraft ? "Saving Draft..." : "Save Draft"}
            </button>
            <button
              className="pm-button pm-button-primary"
              type="button"
              onClick={handleGenerateMarkdown}
              disabled={isGeneratingMarkdown || isSavingDraft}
            >
              {isGeneratingMarkdown ? "Generating..." : "Generate Markdown"}
            </button>
            <button
              className="pm-button pm-button-secondary"
              type="button"
              onClick={handleCopyMarkdown}
              disabled={!generatedMarkdown.trim()}
            >
              Copy Markdown
            </button>
          </div>

          {draftError ? <div className="pm-alert pm-alert-error mt-2">{draftError}</div> : null}

          <label className="pm-label mt-4" htmlFor="generatedMarkdown">
            Generated Markdown
            <textarea
              id="generatedMarkdown"
              className="pm-textarea min-h-[260px] font-mono text-sm"
              value={generatedMarkdown}
              readOnly
            />
          </label>
        </article>

        {groupingError ? <div className="pm-alert pm-alert-error">{groupingError}</div> : null}

        {groups.length > 0 || fileMap.size > 0 ? (
          <section className="pm-card p-5 md:p-6">
            <div className="pm-card-header">
              <div>
                <h2 className="pm-card-title">Grouped PR Viewer</h2>
                <p className="pm-card-subtitle">
                  Fix auto-grouping with drag and drop. Use the dedicated walkthrough builder when this PR needs a guided review.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/patchmap/${pullRequestId}/walkthrough`} className="pm-button pm-button-secondary">
                  {walkthroughEnabled ? "Edit Walkthrough" : "Create Walkthrough"}
                </Link>
                <button className="pm-button pm-button-secondary" type="button" onClick={addGroup}>
                  Add Group
                </button>
              </div>
            </div>

            <div className="pm-muted-panel mb-5">
              <div className="pm-emphasis-title">Start here</div>
              <p className="pm-emphasis-copy">
                Correct the groups on the left first. Once the structure feels right, decide whether this PR needs a walkthrough.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="pm-soft-panel">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
                  Review Groups
                </div>
                <div className="mt-2 text-xs text-[var(--pm-text-soft)]">
                  Drag files between groups or into ungrouped when the auto-grouping misses.
                </div>

                <div
                  className={`mt-3 min-w-0 rounded-lg border border-dashed px-3 py-3 ${
                    dragState ? "border-[var(--pm-brand-teal)] bg-white" : "border-[var(--pm-border)] bg-white/70"
                  }`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(null)}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
                    Ungrouped Files
                  </div>
                  <div className="mt-2">
                    {ungroupedFileIds.length > 0 ? (
                      <GroupFileList
                        fileIds={ungroupedFileIds}
                        fileMap={fileMap}
                        selectedFileId={selectedFileId}
                        draggable
                        onDragStart={beginDrag}
                        onDragEnd={endDrag}
                        onSelect={(fileId) => {
                          setSelectedFileId(fileId);
                          setSelectedGroupIndex(-1);
                        }}
                      />
                    ) : (
                      <div className="text-xs text-[var(--pm-text-soft)]">All files are currently assigned to a group.</div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  {groups.map((group, index) => {
                    const isActive = index === selectedGroupIndex;
                    return (
                      <div
                        key={`${group.title}-${index}`}
                        className={`min-w-0 rounded-lg border px-3 py-3 text-left transition ${
                          isActive
                            ? "border-[var(--pm-brand-teal)] bg-white shadow-sm"
                            : "border-[var(--pm-border)] bg-white/80 hover:border-[var(--pm-border-strong)]"
                        }`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleDrop(index)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGroupIndex(index);
                              setSelectedFileId(group.fileIds[0] ?? null);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="break-words text-sm font-semibold text-[var(--pm-brand-navy)]">
                              {group.title}
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--pm-text-soft)]">{group.fileIds.length} file(s)</div>
                          </button>
                          <div className="flex shrink-0 gap-1">
                            <button
                              className="rounded border border-[var(--pm-border)] px-2 py-1 text-xs text-[var(--pm-text-soft)] hover:border-[var(--pm-border-strong)]"
                              type="button"
                              onClick={() => moveGroup(index, -1)}
                              disabled={index === 0}
                            >
                              Up
                            </button>
                            <button
                              className="rounded border border-[var(--pm-border)] px-2 py-1 text-xs text-[var(--pm-text-soft)] hover:border-[var(--pm-border-strong)]"
                              type="button"
                              onClick={() => moveGroup(index, 1)}
                              disabled={index === groups.length - 1}
                            >
                              Down
                            </button>
                            <button
                              className="rounded border border-[var(--pm-border)] px-2 py-1 text-xs text-[var(--pm-text-soft)] hover:border-red-300 hover:text-red-700"
                              type="button"
                              onClick={() => removeGroup(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <label className="pm-label mt-3" htmlFor={`group-title-${index}`}>
                          Title
                          <input
                            id={`group-title-${index}`}
                            className="pm-input"
                            value={group.title}
                            onChange={(event) => updateGroup(index, { title: event.target.value })}
                          />
                        </label>

                        <label className="pm-label mt-2" htmlFor={`group-description-${index}`}>
                          Description
                          <textarea
                            id={`group-description-${index}`}
                            className="pm-textarea"
                            rows={3}
                            value={group.description ?? ""}
                            onChange={(event) => updateGroup(index, { description: event.target.value })}
                            placeholder="What should the reviewer focus on in this group?"
                          />
                        </label>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <GroupFileList
                            fileIds={group.fileIds}
                            fileMap={fileMap}
                            selectedFileId={selectedFileId}
                            draggable
                            onDragStart={beginDrag}
                            onDragEnd={endDrag}
                            onSelect={(fileId) => {
                              setSelectedGroupIndex(index);
                              setSelectedFileId(fileId);
                            }}
                            emptyMessage="Drop files here."
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div className="pm-grid-content-fix rounded-xl border border-[var(--pm-border)] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-[var(--pm-brand-navy)]">
                    {selectedGroup?.title ?? "No group selected"}
                  </h3>
                  <span className="pm-pill">{selectedGroup?.fileIds.length ?? 0} files</span>
                </div>
                {selectedGroup?.description ? (
                  <p className="mt-2 text-sm text-[var(--pm-text-soft)]">{selectedGroup.description}</p>
                ) : null}

                {selectedGroup && selectedGroup.fileIds.length > 0 ? (
                  <>
                    <div className="mt-3">
                      <GroupFileList
                        fileIds={selectedGroup.fileIds}
                        fileMap={fileMap}
                        selectedFileId={selectedFileId}
                        onSelect={setSelectedFileId}
                      />
                    </div>

                    {selectedFileId ? (
                      <div className="mt-2 grid gap-4">
                        <DiffPanel file={selectedFile} />
                      </div>
                    ) : null}
                  </>
                ) : selectedFile ? (
                  <div className="mt-2 grid gap-4">
                    <DiffPanel file={selectedFile} />
                  </div>
                ) : (
                  <div className="pm-alert mt-2">No files in selected group.</div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}





