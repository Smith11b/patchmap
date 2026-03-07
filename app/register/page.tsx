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

export default function RegisterPage() {
  const [prUrl, setPrUrl] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState(DEFAULT_WORKSPACE_SLUG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [groupingError, setGroupingError] = useState<string | null>(null);
  const [groups, setGroups] = useState<SuggestedGroup[]>([]);
  const [fileMap, setFileMap] = useState<Map<string, LookupResponse["files"][number]>>(
    new Map()
  );
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});

  const parsed = useMemo(() => parseProviderUrl(prUrl), [prUrl]);

  const submitDisabled =
    isSubmitting || !prUrl.trim() || !workspaceSlug.trim() || "error" in parsed;

  const selectedGroup = groups[selectedGroupIndex] ?? null;

  async function loadGroupsAndFiles(
    payload: RegisterRequestPayload,
    registerData: RegisterResponse
  ) {
    const [lookupResponse, groupsResponse] = await Promise.all([
      fetch(`/api/pull-requests/lookup?${buildLookupQuery(payload).toString()}`),
      fetch(
        `/api/patchmaps/suggest-groups?pullRequestId=${registerData.pullRequest.id}`
      ),
    ]);

    if (!lookupResponse.ok) {
      throw new Error("Unable to fetch PR files for viewer.");
    }

    if (!groupsResponse.ok) {
      throw new Error("Unable to fetch suggested file groups.");
    }

    const lookupData = (await lookupResponse.json()) as LookupResponse;
    const suggestedData = (await groupsResponse.json()) as SuggestedGroupsResponse;

    const nextFileMap = new Map(
      lookupData.files.map((file) => [file.id, file] as const)
    );

    setFileMap(nextFileMap);
    setGroups(suggestedData.groups);

    if (suggestedData.groups.length > 0) {
      setSelectedGroupIndex(0);
      const firstFile = suggestedData.groups[0].fileIds[0] ?? null;
      setSelectedFileId(firstFile);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextWorkspaceSlug = workspaceSlug.trim();
    const validation = parseProviderUrl(prUrl);

    setFormError(null);
    setRequestError(null);
    setGroupingError(null);
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
          typeof data?.error === "string"
            ? data.error
            : "Failed to register pull request.";
        setRequestError(message);
        return;
      }

      const registerData = data as RegisterResponse;
      setResult(registerData);

      try {
        await loadGroupsAndFiles(validation.payload, registerData);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load grouped viewer details.";
        setGroupingError(message);
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

  return (
    <main style={{ maxWidth: 980, margin: "2rem auto", padding: "0 1rem" }}>
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

      {groupingError ? (
        <p style={{ color: "crimson", marginTop: "1rem" }}>{groupingError}</p>
      ) : null}

      {groups.length > 0 ? (
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Grouped PR Viewer + Reviewer Notes</h2>
          <p style={{ marginTop: 0 }}>
            Files are auto-grouped. Select a group and add non-code reviewer annotations
            to help walkthroughs.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "260px 1fr",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            <aside style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem" }}>
              <strong>Auto Groups</strong>
              <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
                {groups.map((group, index) => (
                  <button
                    key={`${group.title}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedGroupIndex(index);
                      setSelectedFileId(group.fileIds[0] ?? null);
                    }}
                    style={{
                      textAlign: "left",
                      border: "1px solid #ccc",
                      borderRadius: 6,
                      padding: "0.5rem",
                      background: index === selectedGroupIndex ? "#f5f7ff" : "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{group.title}</div>
                    <div style={{ fontSize: "0.85rem", color: "#444" }}>
                      {group.fileIds.length} file(s)
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem" }}>
              <strong>{selectedGroup?.title ?? "No group selected"}</strong>
              {selectedGroup?.description ? (
                <p style={{ marginTop: "0.4rem" }}>{selectedGroup.description}</p>
              ) : null}

              {selectedGroup && selectedGroup.fileIds.length > 0 ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.4rem",
                      marginTop: "0.6rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {selectedGroup.fileIds.map((fileId) => {
                      const file = fileMap.get(fileId);

                      return (
                        <button
                          key={fileId}
                          type="button"
                          onClick={() => setSelectedFileId(fileId)}
                          style={{
                            border: "1px solid #bbb",
                            borderRadius: 999,
                            background: selectedFileId === fileId ? "#eef3ff" : "#fff",
                            padding: "0.2rem 0.6rem",
                          }}
                        >
                          {file?.filePath ?? fileId}
                        </button>
                      );
                    })}
                  </div>

                  {selectedFileId ? (
                    <div>
                      <div
                        style={{
                          border: "1px solid #333",
                          borderRadius: 6,
                          overflow: "hidden",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div style={{ background: "#111", color: "#eee", padding: "0.5rem" }}>
                          {fileMap.get(selectedFileId)?.filePath ?? "Unknown file"}
                        </div>
                        {fileMap.get(selectedFileId)?.patchText ? (
                          <pre
                            style={{
                              margin: 0,
                              padding: "0.75rem",
                              background: "#0d1117",
                              color: "#e6edf3",
                              minHeight: 140,
                              overflowX: "auto",
                            }}
                          >
                            {fileMap
                              .get(selectedFileId)
                              ?.patchText?.split("\n")
                              .map((line, index) => {
                                const baseStyle = {
                                  display: "block",
                                  fontFamily:
                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                } as const;

                                if (line.startsWith("+")) {
                                  return (
                                    <span
                                      key={`${index}-${line}`}
                                      style={{ ...baseStyle, background: "#12261e", color: "#7ee787" }}
                                    >
                                      {line}
                                    </span>
                                  );
                                }

                                if (line.startsWith("-")) {
                                  return (
                                    <span
                                      key={`${index}-${line}`}
                                      style={{ ...baseStyle, background: "#2d1617", color: "#ffa198" }}
                                    >
                                      {line}
                                    </span>
                                  );
                                }

                                if (line.startsWith("@@")) {
                                  return (
                                    <span
                                      key={`${index}-${line}`}
                                      style={{ ...baseStyle, background: "#1d2530", color: "#79c0ff" }}
                                    >
                                      {line}
                                    </span>
                                  );
                                }

                                return (
                                  <span key={`${index}-${line}`} style={baseStyle}>
                                    {line}
                                  </span>
                                );
                              })}
                          </pre>
                        ) : (
                          <div
                            style={{
                              margin: 0,
                              padding: "0.75rem",
                              background: "#1e1e1e",
                              color: "#e6e6e6",
                              minHeight: 140,
                            }}
                          >
                            Diff content not available for this file.
                          </div>
                        )}
                      </div>

                      <label style={{ display: "grid", gap: "0.25rem" }}>
                        Reviewer annotation (stored in UI state for now)
                        <textarea
                          value={annotations[selectedFileId] ?? ""}
                          onChange={(event) =>
                            handleAnnotationChange(selectedFileId, event.target.value)
                          }
                          placeholder="Explain what this file is doing and how to review it."
                          rows={4}
                          style={{ width: "100%", padding: "0.5rem" }}
                        />
                      </label>
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ marginTop: "0.75rem" }}>No files in selected group.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
