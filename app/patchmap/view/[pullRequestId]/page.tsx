"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SummaryDocument } from "@/app/components/patchmap/summary-document";
import { mapStoredGroupsToSuggestedGroups } from "@/lib/patchmap/ui-utils";
import { usePatchMapWorkspace } from "@/lib/patchmap/use-patchmap-workspace";

export default function PatchMapReviewPage() {
  const params = useParams<{ pullRequestId: string }>();
  const pullRequestId = params.pullRequestId ?? "";
  const { isLoading, loadError, patchmap, suggestedGroups } = usePatchMapWorkspace({
    pullRequestId,
    includeSuggestions: true,
    missingPullRequestMessage: "Missing pull request id.",
    lookupErrorMessage: "Unable to fetch PR files for review.",
    loadErrorMessage: "Unable to load PatchMap review",
    suggestionsErrorMessage: "Unable to fetch suggested file groups.",
  });

  if (isLoading) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">Loading review...</div>
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

  if (!patchmap) {
    return (
      <main className="pm-shell">
        <div className="pm-card p-6">
          <h1 className="pm-card-title">PatchMap not found</h1>
          <p className="pm-card-subtitle mt-3">
            There is not a saved PatchMap review for this pull request yet.
          </p>
        </div>
      </main>
    );
  }

  const draftGroups = mapStoredGroupsToSuggestedGroups(patchmap.groups);
  const groups =
    draftGroups.some((group) => group.fileIds.length > 0) ? draftGroups : suggestedGroups;
  const walkthroughAvailable = Boolean(patchmap.walkthrough?.steps.length);
  const reviewStatus = patchmap.review.currentUserStatus;
  const reviewStatusLabel =
    reviewStatus === "approved"
      ? "Approved"
      : reviewStatus === "in_progress"
        ? "In Progress"
        : "Not Started";

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-6 py-6 md:px-7 md:py-7">
        <div className="pm-context-kicker">Review Entry</div>
        <h1 className="pm-hero-title mt-2">
          {patchmap.walkthrough?.title || "PatchMap Review"}
        </h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Start with the written review summary below. Then choose the grouped review for the main structure, or the walkthrough for a guided deep dive.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {patchmap.permissions.canEdit ? (
            <Link href={`/patchmap/${pullRequestId}`} className="pm-button pm-button-primary">
              Edit PatchMap
            </Link>
          ) : null}
          <Link href={`/patchmap/view/${pullRequestId}/grouped`} className="pm-button pm-button-primary">
            Start Review
          </Link>
          {walkthroughAvailable ? (
            <Link href={`/patchmap/view/${pullRequestId}/walkthrough`} className="pm-button pm-button-secondary">
              Start Walkthrough
            </Link>
          ) : null}
          <Link href="/dashboard" className="pm-button pm-button-secondary">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="pm-fade-stagger mt-8 grid gap-5">
        <article className="pm-emphasis-card">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="pm-step-chip">Review Mode</div>
              <div className="pm-emphasis-title mt-3">Use grouped review as the shared baseline</div>
              <p className="pm-emphasis-copy">
                Grouped review gives everyone the main structure. The walkthrough is optional and best when the author wants to guide reviewers through the change step by step.
              </p>
            </div>
            <div className="pm-soft-stack">
              <div className="pm-soft-panel">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                  Groups
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--pm-brand-navy)]">
                  {groups.length}
                </div>
              </div>
              <div className="pm-soft-panel">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                  PatchMap Status
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--pm-brand-navy)]">
                  {patchmap.patchmap.status === "published" ? "Review Requested" : "Draft"}
                </div>
              </div>
              <div className="pm-soft-panel">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                  Your Review
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--pm-brand-navy)]">
                  {reviewStatusLabel}
                </div>
              </div>
              <div className="pm-soft-panel">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
                  Walkthrough
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--pm-brand-navy)]">
                  {walkthroughAvailable ? `${patchmap.walkthrough?.steps.length ?? 0} steps` : "Not included"}
                </div>
              </div>
            </div>
          </div>
        </article>

        <SummaryDocument summary={patchmap.summary} />
      </section>
    </main>
  );
}
