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

  const selectedGroup = groups[selectedGroupIndex] ?? null;
  const selectedFile = selectedFileId ? fileMap.get(selectedFileId) : null;

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

      const hasDraftGroups = patchmapData.groups.some((group) => group.fileIds.length > 0);
      if (hasDraftGroups) {
        const mapped = patchmapData.groups.map((group) => ({
          title: group.title,
          description: group.description ?? undefined,
          orderIndex: group.orderIndex,
          fileIds: group.fileIds,
        }));
        setGroups(mapped);
        const firstGroupWithFiles = mapped.find((group) => group.fileIds.length > 0);
        setSelectedGroupIndex(0);
        setSelectedFileId(firstGroupWithFiles?.fileIds[0] ?? null);
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
        <div className="pm-context-kicker">Read-only patchmap view</div>
        <h1 className="pm-hero-title mt-2">PatchMap Snapshot</h1>
        <p className="pm-hero-subtitle">Review-only mode for previously generated patchmaps.</p>
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

      <section className="pm-card mt-6 p-4 md:p-5">
        <div className="pm-card-header">
          <div>
            <h2 className="pm-card-title">Grouped PR Viewer</h2>
            <p className="pm-card-subtitle">Read-only grouped file exploration.</p>
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

                {selectedFileId ? (
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




