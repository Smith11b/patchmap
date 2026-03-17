"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DiffPanel } from "@/app/components/patchmap/diff-panel";
import { WalkthroughStepList } from "@/app/components/patchmap/walkthrough-step-list";
import { PatchMapReviewStatus, UpdateReviewStatusResponse } from "@/lib/patchmap/ui-types";
import { usePatchMapWorkspace } from "@/lib/patchmap/use-patchmap-workspace";

export default function PatchMapWalkthroughReviewPage() {
  const params = useParams<{ pullRequestId: string }>();
  const pullRequestId = params.pullRequestId ?? "";
  const { isLoading, loadError, fileMap, patchmap } = usePatchMapWorkspace({
    pullRequestId,
    missingPullRequestMessage: "Missing pull request id.",
    lookupErrorMessage: "Unable to fetch PR files for walkthrough review.",
    loadErrorMessage: "Unable to load walkthrough review",
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [reviewStatus, setReviewStatus] = useState<PatchMapReviewStatus>("not_started");
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const patchmapId = patchmap?.patchmap.id ?? null;

  const walkthrough = patchmap?.walkthrough ?? null;
  const activeWalkthrough = walkthrough && walkthrough.steps.length > 0 ? walkthrough : null;
  const currentStep = activeWalkthrough?.steps[currentStepIndex] ?? null;
  const selectedFile = currentStep ? fileMap.get(currentStep.prFileId) : null;

  useEffect(() => {
    if (!patchmap) {
      return;
    }

    setReviewStatus(patchmap.review.currentUserStatus);
  }, [patchmap]);

  useEffect(() => {
    if (!patchmap || patchmap.review.currentUserStatus !== "not_started") {
      return;
    }

    async function markInProgress() {
      try {
        const response = await fetch("/api/patchmaps/review-state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            patchmapId,
            status: "in_progress",
          }),
        });

        if (!response.ok) {
          return;
        }

        setReviewStatus("in_progress");
      } catch {
        // Best-effort beta behavior; reviewers can still continue even if this update fails.
      }
    }

    void markInProgress();
  }, [patchmap, patchmapId]);

  if (!activeWalkthrough) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">
          <h1 className="pm-card-title">No walkthrough available</h1>
          <p className="pm-card-subtitle mt-3">
            This PatchMap does not include an authored walkthrough.
          </p>
          <div className="mt-4">
            <Link href={`/patchmap/view/${pullRequestId}`} className="pm-button pm-button-secondary">
              Back to Review
            </Link>
          </div>
        </div>
      </main>
    );
  }

  function goToStep(nextIndex: number) {
    if (!activeWalkthrough) {
      return;
    }

    const step = activeWalkthrough.steps[nextIndex];
    if (!step) {
      return;
    }

    setCurrentStepIndex(nextIndex);
  }

  async function updateReviewStatus(status: PatchMapReviewStatus) {
    if (!patchmapId) {
      return;
    }

    try {
      setIsUpdatingReview(true);
      const response = await fetch("/api/patchmaps/review-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patchmapId,
          status,
        }),
      });

      const data = (await response.json()) as UpdateReviewStatusResponse | { error: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to update review status");
      }

      setReviewStatus((data as UpdateReviewStatusResponse).status);
    } finally {
      setIsUpdatingReview(false);
    }
  }

  if (isLoading) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">Loading walkthrough...</div>
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
        <div className="pm-context-kicker">Guided Walkthrough</div>
        <h1 className="pm-hero-title mt-2">{activeWalkthrough.title || "Review Walkthrough"}</h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Follow the author’s intended review sequence file by file.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={`/patchmap/view/${pullRequestId}`} className="pm-button pm-button-secondary">
            Back to Review
          </Link>
          <Link href={`/patchmap/view/${pullRequestId}/grouped`} className="pm-button pm-button-secondary">
            Open Grouped Review
          </Link>
        </div>
      </section>

      <section className="pm-emphasis-card mt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="pm-step-chip">Current Progress</div>
            <div className="pm-emphasis-title mt-3">
              Step {currentStepIndex + 1} of {activeWalkthrough.steps.length}
            </div>
            <p className="pm-emphasis-copy">
              Use the notes and step order below as the author’s intended path through the change.
            </p>
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
      </section>

      <section className="pm-emphasis-card mt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="pm-step-chip">Your Review Status</div>
            <div className="pm-emphasis-title mt-3">
              {reviewStatus === "approved" ? "Approved" : reviewStatus === "in_progress" ? "In Progress" : "Not Started"}
            </div>
            <p className="pm-emphasis-copy">
              Mark the walkthrough approved when you have finished reviewing the guided path.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="pm-button pm-button-secondary"
              type="button"
              onClick={() => updateReviewStatus("in_progress")}
              disabled={isUpdatingReview || reviewStatus === "in_progress"}
            >
              Mark In Progress
            </button>
            <button
              className="pm-button pm-button-primary"
              type="button"
              onClick={() => updateReviewStatus("approved")}
              disabled={isUpdatingReview || reviewStatus === "approved"}
            >
              Approve Review
            </button>
          </div>
        </div>
      </section>

      <section className="pm-card mt-8 p-5 md:p-6">
        {activeWalkthrough.introNotes ? (
          <div className="pm-alert mb-5">{activeWalkthrough.introNotes}</div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
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
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
              Current Step
            </div>
            <h2 className="mt-1 text-lg font-semibold text-[var(--pm-brand-navy)]">
              {currentStep?.title || selectedFile?.filePath || "No step selected"}
            </h2>

            {currentStep?.notes ? (
              <div className="pm-soft-panel mt-4">
                <div className="pm-context-kicker">Author Notes</div>
                <div className="mt-3 whitespace-pre-wrap text-[0.98rem] leading-7 text-[var(--pm-text)]">
                  {currentStep.notes}
                </div>
              </div>
            ) : (
              <div className="pm-alert mt-4">No author notes for this step.</div>
            )}

            <DiffPanel file={selectedFile} className="mt-4" />
          </div>
        </div>
      </section>
    </main>
  );
}
