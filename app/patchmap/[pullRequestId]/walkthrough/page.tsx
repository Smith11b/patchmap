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

type WalkthroughStepDraft = {
  prFileId: string;
  title: string;
  notes: string;
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

type SaveDraftResponse = {
  patchmap: {
    id: string;
    pullRequestId: string;
    versionNumber: number;
    status: "draft" | "published";
  };
  summary: {
    id: string;
    purpose?: string | null;
    riskNotes?: string | null;
    testNotes?: string | null;
    behaviorChangeNotes?: string | null;
    demoable?: boolean | null;
    demoNotes?: string | null;
  };
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

function demoableToValue(demoable?: boolean | null): "" | "yes" | "no" {
  if (demoable === true) return "yes";
  if (demoable === false) return "no";
  return "";
}

export default function PatchMapWalkthroughBuilderPage() {
  const params = useParams<{ pullRequestId: string }>();
  const pullRequestId = params.pullRequestId ?? "";

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [fileMap, setFileMap] = useState<Map<string, LookupResponse["files"][number]>>(new Map());
  const [groups, setGroups] = useState<SuggestedGroup[]>([]);
  const [walkthroughTitle, setWalkthroughTitle] = useState("");
  const [walkthroughIntro, setWalkthroughIntro] = useState("");
  const [walkthroughSteps, setWalkthroughSteps] = useState<WalkthroughStepDraft[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const [patchmapId, setPatchmapId] = useState<string | null>(null);
  const [patchmapStatus, setPatchmapStatus] = useState<"draft" | "published">("draft");
  const [patchmapVersion, setPatchmapVersion] = useState(1);

  const [purpose, setPurpose] = useState("");
  const [behaviorChangeNotes, setBehaviorChangeNotes] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [demoable, setDemoable] = useState<"" | "yes" | "no">("");
  const [demoNotes, setDemoNotes] = useState("");

  const selectedStep = walkthroughSteps[selectedStepIndex] ?? null;
  const selectedFile = selectedStep ? fileMap.get(selectedStep.prFileId) : null;
  const groupedFileIds = groups.flatMap((group) => group.fileIds);
  const allKnownFileIds = groupedFileIds.length > 0 ? groupedFileIds : Array.from(fileMap.keys());
  const availableFileIds = allKnownFileIds.filter(
    (fileId) => !walkthroughSteps.some((step) => step.prFileId === fileId)
  );

  const loadData = useCallback(async () => {
    const [lookupResponse, patchmapResponse] = await Promise.all([
      fetch(`/api/pull-requests/lookup?pullRequestId=${pullRequestId}`),
      fetch(`/api/patchmaps/by-pr?pullRequestId=${pullRequestId}`),
    ]);

    if (!lookupResponse.ok) {
      throw new Error("Unable to fetch PR files for walkthrough builder.");
    }

    const lookupData = (await lookupResponse.json()) as LookupResponse;
    const nextFileMap = new Map(lookupData.files.map((file) => [file.id, file] as const));
    setFileMap(nextFileMap);

    if (patchmapResponse.status === 404) {
      setGroups([]);
      setWalkthroughTitle("");
      setWalkthroughIntro("");
      setWalkthroughSteps([]);
      return;
    }

    const patchmapData = (await patchmapResponse.json()) as PatchMapResponse | { error: string };

    if (!patchmapResponse.ok) {
      throw new Error("error" in patchmapData ? patchmapData.error : "Unable to load patchmap");
    }

    const patchmap = patchmapData as PatchMapResponse;

    setPatchmapId(patchmap.patchmap.id);
    setPatchmapStatus(patchmap.patchmap.status);
    setPatchmapVersion(patchmap.patchmap.versionNumber);

    setPurpose(patchmap.summary?.purpose ?? "");
    setBehaviorChangeNotes(patchmap.summary?.behaviorChangeNotes ?? "");
    setRiskNotes(patchmap.summary?.riskNotes ?? "");
    setTestNotes(patchmap.summary?.testNotes ?? "");
    setDemoable(demoableToValue(patchmap.summary?.demoable));
    setDemoNotes(patchmap.summary?.demoNotes ?? "");

    const nextGroups = patchmap.groups.map((group) => ({
      title: group.title,
      description: group.description ?? undefined,
      orderIndex: group.orderIndex,
      fileIds: group.fileIds,
    }));
    setGroups(nextGroups);

    if (patchmap.walkthrough) {
      setWalkthroughTitle(patchmap.walkthrough.title ?? "");
      setWalkthroughIntro(patchmap.walkthrough.introNotes ?? "");
      setWalkthroughSteps(
        patchmap.walkthrough.steps.map((step) => ({
          prFileId: step.prFileId,
          title: step.title ?? nextFileMap.get(step.prFileId)?.filePath ?? "",
          notes: step.notes ?? "",
        }))
      );
      setSelectedStepIndex(0);
    } else {
      const initialFileIds = nextGroups.flatMap((group) => group.fileIds);
      const seedFileIds = initialFileIds.length > 0 ? initialFileIds : lookupData.files.map((file) => file.id);
      setWalkthroughTitle("Review Walkthrough");
      setWalkthroughIntro("");
      setWalkthroughSteps(
        seedFileIds.map((fileId) => ({
          prFileId: fileId,
          title: nextFileMap.get(fileId)?.filePath ?? "",
          notes: "",
        }))
      );
      setSelectedStepIndex(0);
    }
  }, [pullRequestId]);

  useEffect(() => {
    async function run() {
      if (!pullRequestId) {
        setIsLoading(false);
        setLoadError("Missing pull request id.");
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setDraftError(null);

      try {
        await loadData();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load walkthrough builder");
      } finally {
        setIsLoading(false);
      }
    }

    void run();
  }, [pullRequestId, loadData]);

  function updateStep(index: number, patch: Partial<WalkthroughStepDraft>) {
    setWalkthroughSteps((prev) =>
      prev.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step))
    );
  }

  function moveStep(index: number, direction: -1 | 1) {
    setWalkthroughSteps((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const nextSteps = [...prev];
      const [movedStep] = nextSteps.splice(index, 1);
      nextSteps.splice(targetIndex, 0, movedStep);
      setSelectedStepIndex(targetIndex);
      return nextSteps;
    });
  }

  function removeStep(index: number) {
    setWalkthroughSteps((prev) => {
      const nextSteps = prev.filter((_, stepIndex) => stepIndex !== index);
      setSelectedStepIndex((currentIndex) => Math.max(0, Math.min(currentIndex, nextSteps.length - 1)));
      return nextSteps;
    });
  }

  function addStep(fileId: string) {
    setWalkthroughSteps((prev) => [
      ...prev,
      {
        prFileId: fileId,
        title: fileMap.get(fileId)?.filePath ?? "",
        notes: "",
      },
    ]);
    setSelectedStepIndex(walkthroughSteps.length);
  }

  async function saveWalkthroughDraft() {
    const response = await fetch("/api/patchmaps/save-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
        walkthrough: {
          title: walkthroughTitle || null,
          introNotes: walkthroughIntro || null,
          steps: walkthroughSteps.map((step, index) => ({
            prFileId: step.prFileId,
            title: step.title || null,
            notes: step.notes || null,
            orderIndex: index,
          })),
        },
      }),
    });

    const data = (await response.json()) as SaveDraftResponse | { error: string };

    if (!response.ok) {
      throw new Error("error" in data ? data.error : "Failed to save walkthrough");
    }

    const saved = data as SaveDraftResponse;
    setPatchmapId(saved.patchmap.id);
    setPatchmapStatus(saved.patchmap.status);
    setPatchmapVersion(saved.patchmap.versionNumber);
  }

  async function handleSaveDraft() {
    try {
      setIsSavingDraft(true);
      setDraftError(null);
      await saveWalkthroughDraft();
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Failed to save walkthrough");
    } finally {
      setIsSavingDraft(false);
    }
  }

  if (isLoading) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">Loading walkthrough builder...</div>
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
        <div className="pm-context-kicker">Walkthrough Builder</div>
        <h1 className="pm-hero-title mt-2">Author Review Walkthrough</h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Build a guided review sequence with the diff visible while you write each step.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href={`/patchmap/${pullRequestId}`} className="pm-button pm-button-secondary">
            Back to PatchMap
          </Link>
          <Link href={`/patchmap/view/${pullRequestId}`} className="pm-button pm-button-secondary">
            Open Reviewer View
          </Link>
          <button
            className="pm-button pm-button-primary"
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
          >
            {isSavingDraft ? "Saving..." : "Save Walkthrough"}
          </button>
        </div>
      </section>

      {draftError ? <div className="pm-alert pm-alert-error mt-6">{draftError}</div> : null}

      <section className="pm-emphasis-card mt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="pm-step-chip">Builder Focus</div>
            <div className="pm-emphasis-title mt-3">Write notes with the diff in view</div>
            <p className="pm-emphasis-copy">
              Pick a step on the left, write the guidance in the center, and use the file list on the right to decide what belongs in the walkthrough at all.
            </p>
          </div>
          <div className="pm-soft-panel">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
              Current progress
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--pm-brand-navy)]">
              {walkthroughSteps.length} step(s)
            </div>
          </div>
        </div>
      </section>

      <section className="pm-card mt-8 p-6 md:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="pm-label" htmlFor="walkthroughTitle">
            Walkthrough Title
            <input
              id="walkthroughTitle"
              className="pm-input"
              value={walkthroughTitle}
              onChange={(event) => setWalkthroughTitle(event.target.value)}
              placeholder="Example: API changes walkthrough"
            />
          </label>

          <label className="pm-label md:col-span-2" htmlFor="walkthroughIntro">
            Walkthrough Intro
            <textarea
              id="walkthroughIntro"
              className="pm-textarea"
              rows={4}
              value={walkthroughIntro}
              onChange={(event) => setWalkthroughIntro(event.target.value)}
              placeholder="Explain how reviewers should approach this walkthrough."
            />
          </label>
        </div>
      </section>

      <section className="pm-card mt-8 p-5 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_260px]">
          <aside className="pm-soft-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
                  Steps
                </div>
                <div className="mt-1 text-xs text-[var(--pm-text-soft)]">{walkthroughSteps.length} in walkthrough</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {walkthroughSteps.map((step, index) => {
                const file = fileMap.get(step.prFileId);
                const active = index === selectedStepIndex;
                return (
                  <button
                    key={`${step.prFileId}-${index}`}
                    type="button"
                    onClick={() => setSelectedStepIndex(index)}
                    className={`min-w-0 rounded-lg border px-3 py-3 text-left transition ${
                      active
                        ? "border-[var(--pm-brand-teal)] bg-white shadow-sm"
                        : "border-[var(--pm-border)] bg-white/80 hover:border-[var(--pm-border-strong)]"
                    }`}
                  >
                    <div className="pm-step-chip">
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

            <div className="pm-grid-content-fix rounded-xl border border-[var(--pm-border)] bg-white p-5">
            {selectedStep ? (
              <>
                <div className="pm-muted-panel mb-4">
                  <div className="pm-emphasis-title">What to write here</div>
                  <p className="pm-emphasis-copy">
                    Explain why this file appears at this point in the review and what the reviewer should confirm before moving on.
                  </p>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                      Editing Step {selectedStepIndex + 1}
                    </div>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--pm-brand-navy)]">
                      {selectedFile?.filePath || selectedStep.prFileId}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="pm-button pm-button-secondary"
                      type="button"
                      onClick={() => moveStep(selectedStepIndex, -1)}
                      disabled={selectedStepIndex === 0}
                    >
                      Move Up
                    </button>
                    <button
                      className="pm-button pm-button-secondary"
                      type="button"
                      onClick={() => moveStep(selectedStepIndex, 1)}
                      disabled={selectedStepIndex === walkthroughSteps.length - 1}
                    >
                      Move Down
                    </button>
                    <button
                      className="pm-button pm-button-secondary"
                      type="button"
                      onClick={() => removeStep(selectedStepIndex)}
                    >
                      Remove Step
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="pm-label" htmlFor="stepTitle">
                    Step Title
                    <input
                      id="stepTitle"
                      className="pm-input"
                      value={selectedStep.title}
                      onChange={(event) => updateStep(selectedStepIndex, { title: event.target.value })}
                      placeholder={selectedFile?.filePath || "Name this step"}
                    />
                  </label>

                  <label className="pm-label" htmlFor="stepNotes">
                    Step Notes
                    <textarea
                      id="stepNotes"
                      className="pm-textarea"
                      rows={6}
                      value={selectedStep.notes}
                      onChange={(event) => updateStep(selectedStepIndex, { notes: event.target.value })}
                      placeholder="Describe what changed here and what the reviewer should verify."
                    />
                  </label>

                  <div className="pm-diff">
                    <div className="pm-diff-header">{selectedFile?.filePath ?? "Unknown file"}</div>
                    {selectedFile?.patchText ? (
                      <pre className="pm-diff-body">
                        {selectedFile.patchText.split("\n").map((line, index) => (
                          <span key={`${index}-${line}`} className={diffLineClass(line)}>
                            {line}
                          </span>
                        ))}
                      </pre>
                    ) : (
                      <div className="pm-diff-body">Diff content not available for this file.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="pm-alert">Add a file on the right to start your walkthrough.</div>
            )}
          </div>

          <aside className="pm-soft-panel">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
              Add Files
            </div>
            <div className="mt-1 text-xs text-[var(--pm-text-soft)]">
              Pull in only the files that need an explicit guided review.
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {availableFileIds.length > 0 ? (
                availableFileIds.map((fileId) => {
                  const file = fileMap.get(fileId);
                  return (
                    <button
                      key={fileId}
                      type="button"
                      className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-[var(--pm-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--pm-text-soft)] hover:border-[var(--pm-border-strong)]"
                      onClick={() => addStep(fileId)}
                      title={file?.filePath ?? fileId}
                    >
                      + {file?.filePath ?? fileId}
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-[var(--pm-text-soft)]">All current files are already included.</div>
              )}
            </div>

            {groups.length > 0 ? (
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
                  Current Groups
                </div>
                <div className="mt-3 grid gap-2">
                  {groups.map((group, index) => (
                    <div key={`${group.title}-${index}`} className="rounded-lg border border-[var(--pm-border)] bg-white p-3">
                      <div className="text-sm font-semibold text-[var(--pm-brand-navy)]">{group.title}</div>
                      <div className="mt-1 text-xs text-[var(--pm-text-soft)]">{group.fileIds.length} file(s)</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
