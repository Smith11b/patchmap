"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "member";
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

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

function patchmapHref(pullRequestId: string) {
  return `/patchmap/${pullRequestId}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const [prUrl, setPrUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);

  const parsed = useMemo(() => parseProviderUrl(prUrl), [prUrl]);

  const submitDisabled =
    isSubmitting || !prUrl.trim() || !activeWorkspaceId || "error" in parsed;

  useEffect(() => {
    void loadWorkspaces().catch((error) => {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to load workspaces");
    });
  }, []);

  async function loadWorkspaces() {
    const response = await fetch("/api/workspaces");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : "Failed to load workspaces");
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
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const workspaceId = activeWorkspaceId;
    const validation = parseProviderUrl(prUrl);

    setFormError(null);
    setRequestError(null);
    setResult(null);

    if (!workspaceId) {
      setFormError("Select a workspace first.");
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
          workspaceId,
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
      router.push(patchmapHref(registerData.pullRequest.id));
    } catch {
      setRequestError("Request failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-5 py-5 md:px-6 md:py-6">
        <div className="pm-context-kicker">Provider ingestion and workspace-scoped PR registration</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span className="pm-pill">Register</span>
          <span className="pm-pill">Workspace Scoped</span>
        </div>
        <h1 className="pm-hero-title mt-2">Register Pull Request</h1>
        <p className="pm-hero-subtitle">
          Paste a GitHub PR URL or GitLab MR URL to ingest PR data. Then open the dedicated PatchMap
          workspace to review files, annotate groups, and generate markdown.
        </p>
      </section>

      <section className="pm-fade-stagger mt-6 grid gap-4">
        <article className="pm-card p-5 md:p-6">
          <div className="pm-card-header">
            <div>
              <h2 className="pm-card-title">PR Source</h2>
              <p className="pm-card-subtitle">Provider URL + active workspace</p>
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

              <label className="pm-label" htmlFor="activeWorkspaceId">
                Workspace
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
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="pm-button pm-button-primary" type="submit" disabled={submitDisabled}>
                {isSubmitting ? "Registering..." : "Register Pull Request"}
              </button>
              <Link href="/settings" className="pm-button pm-button-secondary">
                Manage Workspaces + Tokens
              </Link>
            </div>

            {prUrl.trim() && "error" in parsed ? (
              <div className="pm-alert pm-alert-error">{parsed.error}</div>
            ) : null}
            {formError ? <div className="pm-alert pm-alert-error">{formError}</div> : null}
            {requestError ? <div className="pm-alert pm-alert-error">{requestError}</div> : null}
            {workspaceError ? <div className="pm-alert pm-alert-error">{workspaceError}</div> : null}
          </form>
        </article>

        {result ? (
          <article className="pm-card p-5 md:p-6">
            <div className="pm-card-header">
              <div>
                <h2 className="pm-card-title">Registration Successful</h2>
                <p className="pm-card-subtitle">
                  PR metadata has been saved. Continue in the PatchMap workspace.
                </p>
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
            <div className="mt-2">
              <Link className="pm-button pm-button-primary" href={patchmapHref(result.pullRequest.id)}>
                Open PatchMap Viewer
              </Link>
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}




