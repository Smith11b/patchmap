"use client";

import React, { useMemo, useState } from "react";

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

type LookupResponse = {
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
    sourceBranch?: string | null;
    targetBranch?: string | null;
    baseSha?: string | null;
    headSha?: string | null;
  };
  files: Array<{
    id: string;
    filePath: string;
    oldFilePath?: string | null;
    changeType: "added" | "modified" | "deleted" | "renamed";
    fileExtension?: string | null;
    topLevelDir?: string | null;
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
    groupType?: string | null;
    confidenceScore?: number | null;
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
    groupType?: string | null;
    confidenceScore?: number | null;
    orderIndex: number;
    fileIds: string[];
  }>;
};

type GenerateMarkdownResponse = {
  patchmapId: string;
  markdown: string;
};

type DraftGroup = {
  title: string;
  description: string;
  orderIndex: number;
  fileIds: string[];
};

const SAMPLE_FILES = `[
  {
    "filePath": "src/main/java/com/acme/actor/ActorEntity.java",
    "changeType": "added",
    "displayOrder": 0
  },
  {
    "filePath": "src/main/java/com/acme/actor/ActorRepository.java",
    "changeType": "added",
    "displayOrder": 1
  },
  {
    "filePath": "src/main/java/com/acme/actor/ActorResolveService.java",
    "changeType": "modified",
    "displayOrder": 2
  }
]`;

export default function TestPage() {
  const [workspaceSlug, setWorkspaceSlug] = useState("patchmap-dev");
  const [provider, setProvider] = useState<"github" | "gitlab" | "azure">(
    "github"
  );
  const [owner, setOwner] = useState("acme-bank");
  const [repoName, setRepoName] = useState("identity-bridge");
  const [prNumber, setPrNumber] = useState("142");
  const [title, setTitle] = useState("Add actor persistence for identity linking");
  const [description, setDescription] = useState(
    "Initial persistence support for actors."
  );
  const [url, setUrl] = useState(
    "https://github.com/acme-bank/identity-bridge/pull/142"
  );
  const [sourceBranch, setSourceBranch] = useState("feature/actor-persistence");
  const [targetBranch, setTargetBranch] = useState("main");
  const [baseSha, setBaseSha] = useState("abc123");
  const [headSha, setHeadSha] = useState("def456");
  const [filesJson, setFilesJson] = useState(SAMPLE_FILES);

  const [lookupResponse, setLookupResponse] = useState<LookupResponse | null>(
    null
  );
  const [patchMapResponse, setPatchMapResponse] =
    useState<PatchMapResponse | null>(null);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");

  const [purpose, setPurpose] = useState(
    "Introduce actor persistence to support identity linking."
  );
  const [behaviorChangeNotes, setBehaviorChangeNotes] = useState(
    "Resolved actors are now persisted after successful resolution."
  );
  const [riskNotes, setRiskNotes] = useState(
    "Low risk. Adds persistence but does not alter existing read flow."
  );
  const [testNotes, setTestNotes] = useState(
    "Added repository and service unit tests."
  );
  const [demoable, setDemoable] = useState<"" | "yes" | "no">("yes");
  const [demoNotes, setDemoNotes] = useState(
    "Demo from PR description: run through grouped walkthrough and key API behavior changes."
  );

  const [groups, setGroups] = useState<DraftGroup[]>([
    {
      title: "Add actor persistence layer",
      description: "Adds persistence model and repository for actors.",
      orderIndex: 0,
      fileIds: [],
    },
    {
      title: "Persist actors after resolution",
      description: "Updates service logic to save actors after resolving them.",
      orderIndex: 1,
      fileIds: [],
    },
  ]);

  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const parsedFilesPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(filesJson);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [filesJson]);

  const availableFiles = lookupResponse?.files ?? [];

  function setError(message: string) {
    setStatus(`❌ ${message}`);
  }

  function setSuccess(message: string) {
    setStatus(`✅ ${message}`);
  }

  function updateGroup(index: number, patch: Partial<DraftGroup>) {
    setGroups((prev) =>
      prev.map((group, i) => (i === index ? { ...group, ...patch } : group))
    );
  }

  function toggleFileForGroup(groupIndex: number, fileId: string) {
    const group = groups[groupIndex];
    const exists = group.fileIds.includes(fileId);

    updateGroup(groupIndex, {
      fileIds: exists
        ? group.fileIds.filter((id) => id !== fileId)
        : [...group.fileIds, fileId],
    });
  }

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        orderIndex: prev.length,
        fileIds: [],
      },
    ]);
  }

  function removeGroup(index: number) {
    setGroups((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((group, i) => ({ ...group, orderIndex: i }))
    );
  }

  async function registerPullRequest() {
    try {
      setBusy("register");
      setStatus("");

      const files = JSON.parse(filesJson);

      const response = await fetch("/api/pull-requests/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceSlug,
          repository: {
            provider,
            owner,
            name: repoName,
            defaultBranch: targetBranch || null,
          },
          pullRequest: {
            prNumber: Number(prNumber),
            title,
            description: description || null,
            url,
            sourceBranch: sourceBranch || null,
            targetBranch: targetBranch || null,
            baseSha: baseSha || null,
            headSha: headSha || null,
            state: "open",
          },
          files,
        }),
      });

      const data = (await response.json()) as RegisterResponse | { error: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to register PR");
      }

      setSuccess("Pull request registered");
      await lookupPullRequest();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function lookupPullRequest() {
    try {
      setBusy("lookup");
      setStatus("");

      const params = new URLSearchParams({
        provider,
        owner,
        name: repoName,
        prNumber,
      });

      const response = await fetch(`/api/pull-requests/lookup?${params}`);
      const data = (await response.json()) as LookupResponse | { error: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to look up PR");
      }

      setLookupResponse(data as LookupResponse);
      setSuccess("Pull request loaded");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function loadPatchMap() {
    try {
      if (!lookupResponse?.pullRequest.id) {
        throw new Error("Look up the pull request first");
      }

      setBusy("loadPatchmap");
      setStatus("");

      const params = new URLSearchParams({
        pullRequestId: lookupResponse.pullRequest.id,
      });

      const response = await fetch(`/api/patchmaps/by-pr?${params}`);
      const data = (await response.json()) as PatchMapResponse | { error: string };

      if (response.status === 404) {
        setPatchMapResponse(null);
        setGeneratedMarkdown("");
        setSuccess("No PatchMap found yet for this PR");
        return;
      }

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to load PatchMap");
      }

      const patchmap = data as PatchMapResponse;
      setPatchMapResponse(patchmap);

      if (patchmap.summary) {
        setPurpose(patchmap.summary.purpose ?? "");
        setBehaviorChangeNotes(patchmap.summary.behaviorChangeNotes ?? "");
        setRiskNotes(patchmap.summary.riskNotes ?? "");
        setTestNotes(patchmap.summary.testNotes ?? "");
        setDemoable(
          patchmap.summary.demoable === true
            ? "yes"
            : patchmap.summary.demoable === false
              ? "no"
              : ""
        );
        setDemoNotes(patchmap.summary.demoNotes ?? "");
        setGeneratedMarkdown(patchmap.summary.generatedMarkdown ?? "");
      }

      setGroups(
        patchmap.groups.map((group) => ({
          title: group.title,
          description: group.description ?? "",
          orderIndex: group.orderIndex,
          fileIds: group.fileIds,
        }))
      );

      setSuccess("PatchMap loaded");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft() {
    try {
      if (!lookupResponse?.pullRequest.id) {
        throw new Error("Look up the pull request first");
      }

      setBusy("saveDraft");
      setStatus("");

      const response = await fetch("/api/patchmaps/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pullRequestId: lookupResponse.pullRequest.id,
          patchmap: patchMapResponse
            ? {
                id: patchMapResponse.patchmap.id,
                status: patchMapResponse.patchmap.status,
                versionNumber: patchMapResponse.patchmap.versionNumber,
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
            orderIndex: index,
            fileIds: group.fileIds,
          })),
        }),
      });

      const data = (await response.json()) as SaveDraftResponse | { error: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to save draft");
      }

      setSuccess("PatchMap draft saved");
      await loadPatchMap();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function generateMarkdown() {
    try {
      if (!patchMapResponse?.patchmap.id) {
        throw new Error("Load or save a PatchMap first");
      }

      setBusy("generateMarkdown");
      setStatus("");

      const response = await fetch("/api/patchmaps/generate-markdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patchmapId: patchMapResponse.patchmap.id,
        }),
      });

      const data = (await response.json()) as
        | GenerateMarkdownResponse
        | { error: string };

      if (!response.ok) {
        throw new Error(
          "error" in data ? data.error : "Failed to generate markdown"
        );
      }

      setGeneratedMarkdown((data as GenerateMarkdownResponse).markdown);
      setSuccess("Markdown generated");
      await loadPatchMap();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-semibold">PatchMap Test Page</h1>
          <p className="mt-2 text-sm text-gray-600">
            Register a PR, look it up, save a PatchMap draft, and generate markdown.
          </p>
          {status ? (
            <div className="mt-4 rounded-lg border border-gray-300 px-4 py-3 text-sm">
              {status}
            </div>
          ) : null}
        </div>

        <section className="space-y-4 rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">1. Pull Request Input</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Workspace Slug" id="workspaceSlug">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
              />
            </Field>

            <Field label="Provider" id="provider">
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={provider}
                onChange={(e) =>
                  setProvider(e.target.value as "github" | "gitlab" | "azure")
                }
              >
                <option value="github">github</option>
                <option value="gitlab">gitlab</option>
                <option value="azure">azure</option>
              </select>
            </Field>

            <Field label="Owner" id="owner">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </Field>

            <Field label="Repo Name" id="repoName">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
              />
            </Field>

            <Field label="PR Number" id="prNumber">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
              />
            </Field>

            <Field label="Title" id="title">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <Field label="URL" id="url">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>

            <Field label="Description" id="description">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field label="Source Branch" id="sourceBranch">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
              />
            </Field>

            <Field label="Target Branch" id="targetBranch">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
              />
            </Field>

            <Field label="Base SHA" id="baseSha">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={baseSha}
                onChange={(e) => setBaseSha(e.target.value)}
              />
            </Field>

            <Field label="Head SHA" id="headSha">
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={headSha}
                onChange={(e) => setHeadSha(e.target.value)}
              />
            </Field>
          </div>

          <Field
            label={`Files JSON (${parsedFilesPreview} files detected)`}
            id="filesJson"
          >
            <textarea
              className="min-h-[220px] w-full rounded-lg border px-3 py-2 font-mono text-sm"
              value={filesJson}
              onChange={(e) => setFilesJson(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl border px-4 py-2"
              onClick={registerPullRequest}
              disabled={busy !== null}
            >
              {busy === "register" ? "Registering..." : "Register PR"}
            </button>

            <button
              className="rounded-xl border px-4 py-2"
              onClick={lookupPullRequest}
              disabled={busy !== null}
            >
              {busy === "lookup" ? "Loading..." : "Lookup PR"}
            </button>

            <button
              className="rounded-xl border px-4 py-2"
              onClick={loadPatchMap}
              disabled={busy !== null}
            >
              {busy === "loadPatchmap" ? "Loading..." : "Load PatchMap"}
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">2. Lookup Result</h2>

          <pre className="overflow-auto rounded-xl bg-gray-50 p-4 text-xs">
            {JSON.stringify(lookupResponse, null, 2)}
          </pre>
        </section>

        <section className="space-y-6 rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">3. PatchMap Draft</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Purpose" id="purpose">
              <textarea
                className="min-h-[90px] w-full rounded-lg border px-3 py-2"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </Field>

            <Field label="Behavior Change" id="behaviorChangeNotes">
              <textarea
                className="min-h-[90px] w-full rounded-lg border px-3 py-2"
                value={behaviorChangeNotes}
                onChange={(e) => setBehaviorChangeNotes(e.target.value)}
              />
            </Field>

            <Field label="Risk" id="riskNotes">
              <textarea
                className="min-h-[90px] w-full rounded-lg border px-3 py-2"
                value={riskNotes}
                onChange={(e) => setRiskNotes(e.target.value)}
              />
            </Field>

            <Field label="Tests" id="testNotes">
              <textarea
                className="min-h-[90px] w-full rounded-lg border px-3 py-2"
                value={testNotes}
                onChange={(e) => setTestNotes(e.target.value)}
              />
            </Field>

            <Field label="Demoable" id="demoable">
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={demoable}
                onChange={(e) => setDemoable(e.target.value as "" | "yes" | "no")}
              >
                <option value="">not set</option>
                <option value="yes">yes</option>
                <option value="no">no</option>
              </select>
            </Field>

            <Field label="Demo Notes" id="demoNotes">
              <textarea
                className="min-h-[90px] w-full rounded-lg border px-3 py-2"
                value={demoNotes}
                onChange={(e) => setDemoNotes(e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-4">
            {groups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="space-y-4 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Group {groupIndex + 1}</h3>
                  <button
                    className="rounded-lg border px-3 py-1 text-sm"
                    onClick={() => removeGroup(groupIndex)}
                    disabled={busy !== null}
                  >
                    Remove
                  </button>
                </div>

                <Field
                  label="Title"
                  id={`group-${groupIndex}-title`}
                >
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={group.title}
                    onChange={(e) =>
                      updateGroup(groupIndex, { title: e.target.value })
                    }
                  />
                </Field>

                <Field
                  label="Description"
                  id={`group-${groupIndex}-description`}
                >
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border px-3 py-2"
                    value={group.description}
                    onChange={(e) =>
                      updateGroup(groupIndex, { description: e.target.value })
                    }
                  />
                </Field>

                <div>
                  <div className="mb-2 text-sm font-medium">Files</div>
                  <div className="space-y-2 rounded-lg border p-3">
                    {availableFiles.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        Look up a PR first to attach files.
                      </div>
                    ) : (
                      availableFiles.map((file) => {
                        const checkboxId = `group-${groupIndex}-file-${file.id}`;

                        return (
                          <div key={file.id} className="flex items-start gap-3 text-sm">
                            <input
                              id={checkboxId}
                              name={checkboxId}
                              type="checkbox"
                              checked={group.fileIds.includes(file.id)}
                              onChange={() => toggleFileForGroup(groupIndex, file.id)}
                              className="mt-1"
                            />
                            <label htmlFor={checkboxId} className="font-mono">
                              {file.filePath}
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              className="rounded-xl border px-4 py-2"
              onClick={addGroup}
              disabled={busy !== null}
            >
              Add Group
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl border px-4 py-2"
              onClick={saveDraft}
              disabled={busy !== null}
            >
              {busy === "saveDraft" ? "Saving..." : "Save Draft"}
            </button>

            <button
              className="rounded-xl border px-4 py-2"
              onClick={generateMarkdown}
              disabled={busy !== null}
            >
              {busy === "generateMarkdown"
                ? "Generating..."
                : "Generate Markdown"}
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">4. Current PatchMap</h2>

          <pre className="overflow-auto rounded-xl bg-gray-50 p-4 text-xs">
            {JSON.stringify(patchMapResponse, null, 2)}
          </pre>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">5. Generated Markdown</h2>

          <Field label="Generated Markdown" id="generatedMarkdown">
            <textarea
              className="min-h-[360px] w-full rounded-xl border px-3 py-2 font-mono text-sm"
              value={generatedMarkdown}
              readOnly
            />
          </Field>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactElement;
}) {
  const child = React.cloneElement(children, {
    id,
    name: id,
  });

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {child}
    </div>
  );
}

