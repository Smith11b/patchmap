"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DiffPanel } from "@/app/components/patchmap/diff-panel";
import { GroupFileList } from "@/app/components/patchmap/group-file-list";
import { PatchMapReviewStatus, UpdateReviewStatusResponse } from "@/lib/patchmap/ui-types";
import { mapStoredGroupsToSuggestedGroups } from "@/lib/patchmap/ui-utils";
import { usePatchMapWorkspace } from "@/lib/patchmap/use-patchmap-workspace";

export default function PatchMapGroupedReviewPage() {
  const params = useParams<{ pullRequestId: string }>();
  const pullRequestId = params.pullRequestId ?? "";
  const { isLoading, loadError, fileMap, patchmap, suggestedGroups } = usePatchMapWorkspace({
    pullRequestId,
    includeSuggestions: true,
    missingPullRequestMessage: "Missing pull request id.",
    lookupErrorMessage: "Unable to fetch PR files for grouped review.",
    loadErrorMessage: "Unable to load grouped review",
    suggestionsErrorMessage: "Unable to fetch suggested file groups.",
  });
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<PatchMapReviewStatus>("not_started");
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const patchmapId = patchmap?.patchmap.id ?? null;

  const draftGroups = patchmap?.groups ? mapStoredGroupsToSuggestedGroups(patchmap.groups) : [];
  const groups =
    draftGroups.some((group) => group.fileIds.length > 0) ? draftGroups : suggestedGroups;
  const boundedGroupIndex = groups[selectedGroupIndex] ? selectedGroupIndex : 0;
  const selectedGroup = groups[boundedGroupIndex] ?? null;
  const activeFileId =
    selectedFileId && selectedGroup?.fileIds.includes(selectedFileId)
      ? selectedFileId
      : selectedGroup?.fileIds[0] ?? null;
  const selectedFile = activeFileId ? fileMap.get(activeFileId) : null;
  const walkthroughAvailable = Boolean(patchmap?.walkthrough?.steps.length);

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
        <div className="pm-card p-6">Loading grouped review...</div>
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
        <div className="pm-context-kicker">Grouped Review</div>
        <h1 className="pm-hero-title mt-2">Review by file group</h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Use the grouped structure as the main review path. Open the walkthrough only if you want the author’s guided sequence too.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={`/patchmap/view/${pullRequestId}`} className="pm-button pm-button-secondary">
            Back to Review
          </Link>
          {walkthroughAvailable ? (
            <Link href={`/patchmap/view/${pullRequestId}/walkthrough`} className="pm-button pm-button-primary">
              Start Walkthrough
            </Link>
          ) : null}
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
              Use grouped review as your main path, then mark the review approved when you are done.
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

      {walkthroughAvailable ? (
        <section className="pm-emphasis-card mt-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="pm-step-chip">Walkthrough Available</div>
              <div className="pm-emphasis-title mt-3">Need the author’s deeper framing?</div>
              <p className="pm-emphasis-copy">
                This PR also includes a guided walkthrough. Use it when you want the intended review order and file-by-file notes.
              </p>
            </div>
            <Link href={`/patchmap/view/${pullRequestId}/walkthrough`} className="pm-button pm-button-primary">
              Start Walkthrough
            </Link>
          </div>
        </section>
      ) : null}

      <section className="pm-card mt-8 p-5 md:p-6">
        <div className="pm-card-header">
          <div>
            <h2 className="pm-card-title">Review Groups</h2>
            <p className="pm-card-subtitle">
              Move through the groups, then inspect the files inside each one.
            </p>
          </div>
          <span className="pm-pill">{groups.length} groups</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="pm-soft-panel">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
              Groups
            </div>
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
                    index === boundedGroupIndex
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
                    selectedFileId={activeFileId}
                    onSelect={setSelectedFileId}
                  />
                </div>
                {activeFileId ? <DiffPanel file={selectedFile} className="mt-3" /> : null}
              </>
            ) : (
              <div className="pm-alert mt-4">No files in this group.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
