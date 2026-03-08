"use client";

import { FormEvent, useMemo, useState } from "react";
import { BrandLockup } from "@/app/components/brand-lockup";

type RegisterResponse = {
  workspace: {
    id: string;
    slug: string;
    name: string;
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
  fileCount: number;
};

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
};

type GenerateMarkdownResponse = {
  patchmapId: string;
  markdown: string;
};

type RegisterRequestPayload =
  | {
      provider: "github";
      owner: string;
      name: string;
      prNumber: number;
    }
  | {
      provider: "gitlab";
      projectPath: string;
      prNumber: number;
    };

const DEFAULT_WORKSPACE_SLUG = "patchmap-dev";

function parseProviderUrl(rawUrl: string):
  | { payload: RegisterRequestPayload }
  | { error: string } {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return { error: "PR/MR URL is required." };
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return {
      error: "Unsupported URL format. Use a GitHub PR URL or GitLab MR URL.",
    };
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "github.com" && segments.length >= 4 && segments[2] === "pull") {
    const prNumber = Number(segments[3]);

    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      return { error: "GitHub PR number is invalid." };
    }

    return {
      payload: {
        provider: "github",
        owner: segments[0],
        name: segments[1],
        prNumber,
      },
    };
  }

  const separatorIndex = segments.indexOf("-");
  if (
    separatorIndex > 0 &&
    segments[separatorIndex + 1] === "merge_requests" &&
    segments.length > separatorIndex + 2
  ) {
    const prNumber = Number(segments[separatorIndex + 2]);

    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      return { error: "GitLab MR number is invalid." };
    }

    const projectPath = segments.slice(0, separatorIndex).join("/");
    if (!projectPath) {
      return { error: "GitLab project path is invalid." };
    }

    return {
      payload: {
        provider: "gitlab",
        projectPath,
        prNumber,
      },
    };
  }

  return {
    error: "Unsupported URL format. Use a GitHub PR URL or GitLab MR URL.",
  };
}

function buildLookupQuery(payload: RegisterRequestPayload): URLSearchParams {
  if (payload.provider === "github") {
    return new URLSearchParams({
      provider: payload.provider,
      owner: payload.owner,
      name: payload.name,
      prNumber: String(payload.prNumber),
    });
  }

  const [owner, name] = payload.projectPath.split(/\/(?!.*\/)/);

  return new URLSearchParams({
    provider: payload.provider,
    owner,
    name,
    prNumber: String(payload.prNumber),
  });
}

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

export default function RegisterPage() {
  const [prUrl, setPrUrl] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState(DEFAULT_WORKSPACE_SLUG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isGeneratingMarkdown, setIsGeneratingMarkdown] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [groupingError, setGroupingError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [groups, setGroups] = useState<SuggestedGroup[]>([]);
  const [fileMap, setFileMap] = useState<Map<string, LookupResponse["files"][number]>>(
    new Map()
  );
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});

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

  const parsed = useMemo(() => parseProviderUrl(prUrl), [prUrl]);

  const submitDisabled =
    isSubmitting || !prUrl.trim() || !workspaceSlug.trim() || "error" in parsed;

  const selectedGroup = groups[selectedGroupIndex] ?? null;
  const selectedFile = selectedFileId ? fileMap.get(selectedFileId) : null;

  async function loadGroupsAndFiles(
    payload: RegisterRequestPayload,
    registerData: RegisterResponse
  ) {
    const [lookupResponse, groupsResponse] = await Promise.all([
      fetch(`/api/pull-requests/lookup?${buildLookupQuery(payload).toString()}`),
      fetch(`/api/patchmaps/suggest-groups?pullRequestId=${registerData.pullRequest.id}`),
    ]);

    if (!lookupResponse.ok) {
      throw new Error("Unable to fetch PR files for viewer.");
    }

    if (!groupsResponse.ok) {
      throw new Error("Unable to fetch suggested file groups.");
    }

    const lookupData = (await lookupResponse.json()) as LookupResponse;
    const suggestedData = (await groupsResponse.json()) as SuggestedGroupsResponse;

    const nextFileMap = new Map(lookupData.files.map((file) => [file.id, file] as const));

    setFileMap(nextFileMap);
    setGroups(suggestedData.groups);

    if (suggestedData.groups.length > 0) {
      setSelectedGroupIndex(0);
      setSelectedFileId(suggestedData.groups[0].fileIds[0] ?? null);
    }
  }

  async function loadPatchMapForPullRequest(pullRequestId: string) {
    const response = await fetch(`/api/patchmaps/by-pr?pullRequestId=${pullRequestId}`);

    if (response.status === 404) {
      setPatchmapId(null);
      setPatchmapStatus("draft");
      setPatchmapVersion(1);
      setGeneratedMarkdown("");
      return;
    }

    const data = (await response.json()) as PatchMapResponse | { error: string };

    if (!response.ok) {
      throw new Error("error" in data ? data.error : "Unable to load patchmap");
    }

    const patchmap = data as PatchMapResponse;

    setPatchmapId(patchmap.patchmap.id);
    setPatchmapStatus(patchmap.patchmap.status);
    setPatchmapVersion(patchmap.patchmap.versionNumber);

    if (patchmap.summary) {
      setPurpose(patchmap.summary.purpose ?? "");
      setBehaviorChangeNotes(patchmap.summary.behaviorChangeNotes ?? "");
      setRiskNotes(patchmap.summary.riskNotes ?? "");
      setTestNotes(patchmap.summary.testNotes ?? "");
      setDemoable(demoableToValue(patchmap.summary.demoable));
      setDemoNotes(patchmap.summary.demoNotes ?? "");
      setGeneratedMarkdown(patchmap.summary.generatedMarkdown ?? "");
    }

    if (patchmap.groups.length > 0) {
      setGroups(
        patchmap.groups.map((group) => ({
          title: group.title,
          description: group.description ?? undefined,
          orderIndex: group.orderIndex,
          fileIds: group.fileIds,
        }))
      );
      setSelectedGroupIndex(0);
      setSelectedFileId(patchmap.groups[0].fileIds[0] ?? null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextWorkspaceSlug = workspaceSlug.trim();
    const validation = parseProviderUrl(prUrl);

    setFormError(null);
    setRequestError(null);
    setGroupingError(null);
    setDraftError(null);
    setResult(null);
    setGroups([]);
    setFileMap(new Map());
    setSelectedFileId(null);

    if (!nextWorkspaceSlug) {
      setFormError("Workspace slug is required.");
      return;
    }

    if ("error" in validation) {
      setFormError(validation.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pull-requests/register-from-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceSlug: nextWorkspaceSlug,
          ...validation.payload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          typeof data?.error === "string" ? data.error : "Failed to register pull request.";
        setRequestError(message);
        return;
      }

      const registerData = data as RegisterResponse;
      setResult(registerData);

      try {
        await loadGroupsAndFiles(validation.payload, registerData);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load grouped viewer details.";
        setGroupingError(message);
      }

      try {
        await loadPatchMapForPullRequest(registerData.pullRequest.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load existing patchmap details.";
        setDraftError(message);
      }
    } catch {
      setRequestError("Request failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAnnotationChange(fileId: string, value: string) {
    setAnnotations((prev) => ({ ...prev, [fileId]: value }));
  }

  async function saveDraft(): Promise<string> {
    if (!result?.pullRequest.id) {
      throw new Error("Register a pull request first.");
    }

    const response = await fetch("/api/patchmaps/save-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pullRequestId: result.pullRequest.id,
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
      }),
    });

    const data = (await response.json()) as SaveDraftResponse | { error: string };

    if (!response.ok) {
      throw new Error("error" in data ? data.error : "Failed to save draft");
    }

    const saved = data as SaveDraftResponse;
    setPatchmapId(saved.patchmap.id);
    setPatchmapStatus(saved.patchmap.status);
    setPatchmapVersion(saved.patchmap.versionNumber);

    return saved.patchmap.id;
  }

  async function handleSaveDraft() {
    try {
      setIsSavingDraft(true);
      setDraftError(null);
      await saveDraft();
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

      const id = await saveDraft();

      const response = await fetch("/api/patchmaps/generate-markdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patchmapId: id }),
      });

      const data = (await response.json()) as GenerateMarkdownResponse | { error: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to generate markdown");
      }

      setGeneratedMarkdown((data as GenerateMarkdownResponse).markdown);
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

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-6 py-8 md:px-8 md:py-10">
        <BrandLockup subtitle="Provider ingestion and grouped diff review" />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span className="pm-pill">Register</span>
          <span className="pm-pill">Grouped Diff Viewer</span>
        </div>
        <h1 className="pm-hero-title mt-4">Register Pull Request From Provider URL</h1>
        <p className="pm-hero-subtitle">
          Paste a GitHub PR URL or GitLab MR URL to ingest files, generate suggested groups, and start a
          reviewer-friendly walkthrough.
        </p>
      </section>

      <section className="pm-fade-stagger mt-6 grid gap-4">
        <article className="pm-card p-5 md:p-6">
          <div className="pm-card-header">
            <div>
              <h2 className="pm-card-title">PR Source</h2>
              <p className="pm-card-subtitle">Provider URL + workspace routing</p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="pm-label" htmlFor="prUrl">
                PR / MR URL
                <input
                  id="prUrl"
                  className="pm-input"
                  type="url"
                  value={prUrl}
                  onChange={(event) => setPrUrl(event.target.value)}
                  placeholder="https://github.com/org/repo/pull/123"
                />
              </label>

              <label className="pm-label" htmlFor="workspaceSlug">
                Workspace Slug
                <input
                  id="workspaceSlug"
                  className="pm-input"
                  type="text"
                  value={workspaceSlug}
                  onChange={(event) => setWorkspaceSlug(event.target.value)}
                  placeholder={DEFAULT_WORKSPACE_SLUG}
                />
              </label>
            </div>

            {prUrl.trim() && "error" in parsed ? (
              <div className="pm-alert pm-alert-error">{parsed.error}</div>
            ) : null}
            {formError ? <div className="pm-alert pm-alert-error">{formError}</div> : null}
            {requestError ? <div className="pm-alert pm-alert-error">{requestError}</div> : null}

            <div className="flex flex-wrap gap-3">
              <button className="pm-button pm-button-primary" type="submit" disabled={submitDisabled}>
                {isSubmitting ? "Registering..." : "Register Pull Request"}
              </button>
            </div>
          </form>
        </article>

        {result ? (
          <article className="pm-card p-5 md:p-6">
            <div className="pm-card-header">
              <div>
                <h2 className="pm-card-title">Registration Successful</h2>
                <p className="pm-card-subtitle">PR metadata has been saved and is ready for grouping.</p>
              </div>
              <span className="pm-pill">{result.fileCount} files</span>
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-[var(--pm-border)] bg-[var(--pm-bg-soft)] p-3">
                <dt className="text-xs uppercase tracking-wide text-[var(--pm-text-soft)]">Provider Repo</dt>
                <dd className="mt-1 font-semibold text-[var(--pm-brand-navy)]">
                  {result.repository.owner}/{result.repository.name}
                </dd>
              </div>
              <div className="rounded-lg border border-[var(--pm-border)] bg-[var(--pm-bg-soft)] p-3">
                <dt className="text-xs uppercase tracking-wide text-[var(--pm-text-soft)]">Pull Request</dt>
                <dd className="mt-1 font-semibold text-[var(--pm-brand-navy)]">#{result.pullRequest.prNumber}</dd>
              </div>
              <div className="rounded-lg border border-[var(--pm-border)] bg-[var(--pm-bg-soft)] p-3">
                <dt className="text-xs uppercase tracking-wide text-[var(--pm-text-soft)]">State</dt>
                <dd className="mt-1 font-semibold capitalize text-[var(--pm-brand-navy)]">{result.pullRequest.state}</dd>
              </div>
            </dl>
          </article>
        ) : null}

        {groupingError ? <div className="pm-alert pm-alert-error">{groupingError}</div> : null}

        {result ? (
          <article className="pm-card p-5 md:p-6">
            <div className="pm-card-header">
              <div>
                <h2 className="pm-card-title">PatchMap Draft + Markdown</h2>
                <p className="pm-card-subtitle">
                  Fill out summary details, save draft metadata, and generate markdown for your PR description.
                </p>
              </div>
              <span className="pm-pill">{patchmapId ? "Existing Draft" : "New Draft"}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                  onChange={(event) =>
                    setDemoable(event.target.value as "" | "yes" | "no")
                  }
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

            {draftError ? <div className="pm-alert pm-alert-error mt-4">{draftError}</div> : null}

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
        ) : null}

        {groups.length > 0 ? (
          <section className="pm-card p-4 md:p-5">
            <div className="pm-card-header">
              <div>
                <h2 className="pm-card-title">Grouped PR Viewer + Reviewer Notes</h2>
                <p className="pm-card-subtitle">Select a group and annotate file intent for review walkthroughs.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
              <aside className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface-muted)] p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pm-text-soft)]">
                  Auto Groups
                </div>
                <div className="mt-3 grid gap-2">
                  {groups.map((group, index) => {
                    const isActive = index === selectedGroupIndex;
                    return (
                      <button
                        key={`${group.title}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedGroupIndex(index);
                          setSelectedFileId(group.fileIds[0] ?? null);
                        }}
                        className={`rounded-lg border px-3 py-2 text-left transition ${
                          isActive
                            ? "border-[var(--pm-brand-teal)] bg-white shadow-sm"
                            : "border-[var(--pm-border)] bg-white/80 hover:border-[var(--pm-border-strong)]"
                        }`}
                      >
                        <div className="text-sm font-semibold text-[var(--pm-brand-navy)]">{group.title}</div>
                        <div className="mt-0.5 text-xs text-[var(--pm-text-soft)]">{group.fileIds.length} file(s)</div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="rounded-xl border border-[var(--pm-border)] bg-white p-4">
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedGroup.fileIds.map((fileId) => {
                        const file = fileMap.get(fileId);
                        const active = selectedFileId === fileId;
                        return (
                          <button
                            key={fileId}
                            type="button"
                            onClick={() => setSelectedFileId(fileId)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              active
                                ? "border-[var(--pm-brand-teal)] bg-[rgba(20,151,154,0.12)] text-[var(--pm-brand-navy)]"
                                : "border-[var(--pm-border)] bg-white text-[var(--pm-text-soft)] hover:border-[var(--pm-border-strong)]"
                            }`}
                            title={file?.filePath ?? fileId}
                          >
                            {file?.filePath ?? fileId}
                          </button>
                        );
                      })}
                    </div>

                    {selectedFileId ? (
                      <div className="mt-4 grid gap-4">
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

                        <label className="pm-label" htmlFor="annotation">
                          Reviewer Annotation (UI State)
                          <textarea
                            id="annotation"
                            className="pm-textarea"
                            value={annotations[selectedFileId] ?? ""}
                            onChange={(event) =>
                              handleAnnotationChange(selectedFileId, event.target.value)
                            }
                            placeholder="Explain what this file changes and how reviewers should validate it."
                            rows={5}
                          />
                        </label>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="pm-alert mt-4">No files in selected group.</div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
