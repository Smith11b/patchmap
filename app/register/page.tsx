"use client";

import { FormEvent, useMemo, useState } from "react";

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
      error:
        "Unsupported URL format. Use a GitHub PR URL or GitLab MR URL.",
    };
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (
    host === "github.com" &&
    segments.length >= 4 &&
    segments[2] === "pull"
  ) {
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

export default function RegisterPage() {
  const [prUrl, setPrUrl] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState(DEFAULT_WORKSPACE_SLUG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);

  const parsed = useMemo(() => parseProviderUrl(prUrl), [prUrl]);

  const submitDisabled =
    isSubmitting || !prUrl.trim() || !workspaceSlug.trim() || "error" in parsed;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextWorkspaceSlug = workspaceSlug.trim();
    const validation = parseProviderUrl(prUrl);

    setFormError(null);
    setRequestError(null);
    setResult(null);

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
          typeof data?.error === "string"
            ? data.error
            : "Failed to register pull request.";
        setRequestError(message);
        return;
      }

      setResult(data as RegisterResponse);
    } catch {
      setRequestError("Request failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Register Pull Request From Provider URL</h1>
      <p>Paste a GitHub PR URL or GitLab MR URL to register it in a workspace.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          PR / MR URL
          <input
            type="url"
            value={prUrl}
            onChange={(event) => setPrUrl(event.target.value)}
            placeholder="https://github.com/org/repo/pull/123"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>

        <label>
          Workspace slug
          <input
            type="text"
            value={workspaceSlug}
            onChange={(event) => setWorkspaceSlug(event.target.value)}
            placeholder={DEFAULT_WORKSPACE_SLUG}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>

        {prUrl.trim() && "error" in parsed ? (
          <p style={{ color: "crimson", margin: 0 }}>{parsed.error}</p>
        ) : null}

        {formError ? <p style={{ color: "crimson", margin: 0 }}>{formError}</p> : null}
        {requestError ? (
          <p style={{ color: "crimson", margin: 0 }}>{requestError}</p>
        ) : null}

        <button type="submit" disabled={submitDisabled} style={{ padding: "0.6rem" }}>
          {isSubmitting ? "Registering..." : "Register Pull Request"}
        </button>
      </form>

      {result ? (
        <section
          style={{
            marginTop: "1.25rem",
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: "1rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Registration successful</h2>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>
              Repository: {result.repository.owner}/{result.repository.name} (
              {result.repository.provider})
            </li>
            <li>
              PR: #{result.pullRequest.prNumber} — {result.pullRequest.title}
            </li>
            <li>File count: {result.fileCount}</li>
          </ul>
        </section>
      ) : null}
    </main>
  );
}
