/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "member";
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecentPatchMapItem = {
  patchmap: {
    id: string;
    pullRequestId: string;
    versionNumber: number;
    status: "draft" | "published";
    reviewRequestedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  review: {
    currentUserStatus: "not_started" | "in_progress" | "approved";
  };
  repository: {
    id: string;
    provider: "github" | "gitlab" | "azure";
    owner: string;
    name: string;
  };
  pullRequest: {
    id: string;
    prNumber: number;
    title: string;
    url: string;
    state: "open" | "closed" | "merged";
  };
};

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [items, setItems] = useState<RecentPatchMapItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/workspaces");
    const data = await response.json();

    if (!response.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to load workspaces");
      setLoading(false);
      return;
    }

    const nextWorkspaces = (data.workspaces ?? []) as WorkspaceSummary[];
    setWorkspaces(nextWorkspaces);

    const persisted =
      typeof window !== "undefined" ? window.localStorage.getItem("pm-active-workspace") : null;
    const next = nextWorkspaces.find((w) => w.id === persisted) ?? nextWorkspaces[0] ?? null;

    if (next) {
      setActiveWorkspaceId(next.id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pm-active-workspace", next.id);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadRecentPatchmaps = useCallback(async (workspaceId: string) => {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/patchmaps/recent?workspaceId=${workspaceId}`);
    const data = await response.json();

    if (!response.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to load recent patchmaps");
      setLoading(false);
      return;
    }

    setItems((data.items ?? []) as RecentPatchMapItem[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);
  useEffect(() => {
    if (!activeWorkspaceId) return;
    void loadRecentPatchmaps(activeWorkspaceId);
  }, [activeWorkspaceId, loadRecentPatchmaps]);

  const groupedByRepo = useMemo(() => {
    const map = new Map<string, { repoLabel: string; provider: string; items: RecentPatchMapItem[] }>();

    for (const item of items) {
      const key = `${item.repository.owner}/${item.repository.name}`;
      if (!map.has(key)) {
        map.set(key, {
          repoLabel: key,
          provider: item.repository.provider,
          items: [],
        });
      }

      map.get(key)?.items.push(item);
    }

    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-6 py-6 md:px-7 md:py-7">
        <div className="pm-context-kicker">Workspace dashboard</div>
        <h1 className="pm-hero-title mt-2">Recent PatchMaps</h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Browse recent PatchMaps in your active workspace, grouped by repository for quick change awareness.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/register" className="pm-button pm-button-primary">
            Register PR
          </Link>
          <Link href="/settings" className="pm-button pm-button-secondary">
            Settings
          </Link>
        </div>
      </section>

      <section className="pm-emphasis-card mt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="pm-step-chip">Next Action</div>
            <div className="pm-emphasis-title mt-3">Start by registering a PR or opening a review</div>
            <p className="pm-emphasis-copy">
              Use this page as your review inbox. New work starts with registering a PR, and existing work should open directly into review.
            </p>
          </div>
          <div>
            <Link href="/register" className="pm-button pm-button-primary">
              Register PR
            </Link>
          </div>
        </div>
      </section>

      <section className="pm-fade-stagger mt-8 grid gap-5">
        <article className="pm-card p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="pm-label" htmlFor="activeWorkspaceId">
              Active Workspace
              <select
                id="activeWorkspaceId"
                className="pm-select"
                value={activeWorkspaceId}
                onChange={(event) => {
                  setActiveWorkspaceId(event.target.value);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("pm-active-workspace", event.target.value);
                  }
                }}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.role})
                  </option>
                ))}
              </select>
            </label>
            <div className="pm-pill">{items.length} PatchMap(s)</div>
          </div>
        </article>

        {loading ? <div className="pm-card p-6">Loading dashboard...</div> : null}
        {error ? <div className="pm-alert pm-alert-error">{error}</div> : null}

        {!loading && !error && groupedByRepo.length === 0 ? (
          <div className="pm-card p-6">
            <h2 className="pm-card-title">No PatchMaps yet</h2>
            <p className="pm-card-subtitle">
              Register a pull request to create your first workspace PatchMap.
            </p>
          </div>
        ) : null}

        {!loading && !error
          ? groupedByRepo.map((repoGroup) => (
              <article key={repoGroup.repoLabel} className="pm-card p-5 md:p-6">
                <div className="pm-card-header">
                  <div>
                    <h2 className="pm-card-title">{repoGroup.repoLabel}</h2>
                    <p className="pm-card-subtitle">{repoGroup.provider.toUpperCase()} repository</p>
                  </div>
                  <span className="pm-pill">{repoGroup.items.length} recent</span>
                </div>

                <div className="mt-2 grid gap-3">
                  {repoGroup.items.map((item) => (
                    <div key={item.patchmap.id} className="pm-soft-panel">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[var(--pm-brand-navy)]">
                          PR #{item.pullRequest.prNumber}: {item.pullRequest.title}
                        </div>
                        <span className="pm-pill">v{item.patchmap.versionNumber}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--pm-text-soft)]">
                        Updated {new Date(item.patchmap.updatedAt).toLocaleString()} - {item.patchmap.status}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="pm-pill">
                          {item.patchmap.status === "published" ? "Review Requested" : "Draft"}
                        </span>
                        <span className="pm-pill">
                          Your Review: {item.review.currentUserStatus.replace("_", " ")}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/patchmap/${item.pullRequest.id}`}
                          className="pm-button pm-button-primary"
                        >
                          Edit PatchMap
                        </Link>
                        <Link
                          href={`/patchmap/view/${item.pullRequest.id}`}
                          className="pm-button pm-button-secondary"
                        >
                          Open Review
                        </Link>
                        <a href={item.pullRequest.url} target="_blank" rel="noreferrer" className="pm-button pm-button-secondary">
                          Open PR
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))
          : null}

        <article className="pm-card p-5 md:p-6">
          <h2 className="pm-card-title">Coming Next</h2>
          <p className="pm-card-subtitle">
            This area is reserved for additional workspace intelligence cards (health, review throughput, risk hotspots).
          </p>
        </article>
      </section>
    </main>
  );
}









