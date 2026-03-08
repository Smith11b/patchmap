(function () {
  if (window.__patchmap_loaded__) return;
  window.__patchmap_loaded__ = true;

  let currentLookupData = null;
  let currentPatchMapData = null;

  function debugGitHubFileSelectors() {
  const debug = {
    dataPath: document.querySelectorAll("[data-path]").length,
    dataTagsearchPath: document.querySelectorAll("[data-tagsearch-path]").length,
    fileDataPath: document.querySelectorAll(".file[data-path]").length,
    jsFileDataPath: document.querySelectorAll(".js-file[data-path]").length,
    divDataPath: document.querySelectorAll("div[data-path]").length,
    detailsDataPath: document.querySelectorAll("details[data-path]").length,
  };

  console.log("PatchMap: GitHub file selector counts", debug);

  const sample = Array.from(
    document.querySelectorAll("[data-path], [data-tagsearch-path]")
  )
    .slice(0, 10)
    .map((el) => ({
      tag: el.tagName,
      dataPath: el.getAttribute("data-path"),
      dataTagsearchPath: el.getAttribute("data-tagsearch-path"),
      className: el.className,
    }));

  console.log("PatchMap: GitHub file selector sample", sample);
}

  function extensionFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "PATCHMAP_FETCH",
          url,
          options,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response) {
            reject(new Error("No response from background script"));
            return;
          }

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          resolve({
            ok: response.ok,
            status: response.status,
            json: async () => JSON.parse(response.text),
            text: async () => response.text,
          });
        }
      );
    });
  }

function parseGitHubPr() {
  const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;

  return {
    provider: "github",
    owner: match[1],
    name: match[2],
    prNumber: match[3],
  };
}

function parseGitLabMr() {
  const match = window.location.pathname.match(/^\/(.+)\/-\/merge_requests\/(\d+)/);
  if (!match) return null;

  const projectPath = match[1];
  const prNumber = match[2];

  return {
    provider: "gitlab",
    projectPath,
    prNumber,
  };
}

function parseCurrentProviderPr() {
  const github = parseGitHubPr();
  if (github) return github;

  const gitlab = parseGitLabMr();
  if (gitlab) return gitlab;

  return null;
}

function isGitHubPrPage() {
  return !!parseGitHubPr();
}

function isGitLabMrPage() {
  return !!parseGitLabMr();
}

function getProviderDisplayName(provider) {
  switch (provider) {
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    default:
      return "Provider";
  }
}

  function getWorkspaceSlug() {
    return "patchmap-dev";
  }

  function getPrTitle() {
  const selectors = [
    '[data-testid="issue-title"]',
    ".js-issue-title",
    ".gh-header-title .js-issue-title",
    '[data-testid="issuable-title"]',
    ".issuable-details .title",
    ".detail-page-header .title",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }

  const pr = parseCurrentProviderPr();
  return `PR ${pr?.prNumber ?? ""}`.trim();
}

 function getPrDescription() {
  const selectors = [
    '[data-testid="issue-body"]',
    ".comment-body",
    '[data-testid="description"]',
    ".description",
    ".issuable-description",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }

  return null;
}

  function getChangedFiles() {
  const fileMap = new Map();

  const selectors = [
    "[data-path]",
    "[data-tagsearch-path]",
    ".file[data-path]",
    ".js-file[data-path]",
    "div[data-path]",
    "details[data-path]",
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((el) => {
      const filePath =
        el.getAttribute("data-path") ||
        el.getAttribute("data-tagsearch-path");

      if (!filePath) return;
      if (fileMap.has(filePath)) return;

      fileMap.set(filePath, {
        filePath,
        changeType: inferChangeType(el, filePath),
        fileExtension: getFileExtension(filePath),
        topLevelDir: getTopLevelDir(filePath),
        displayOrder: fileMap.size,
      });
    });
  }

  const files = Array.from(fileMap.values());

  console.log("PatchMap: getChangedFiles selectors result", files);
  return files;
}

 function inferChangeType(fileElement, filePath) {
  const text = (fileElement.textContent || "").toLowerCase();
  const path = (filePath || "").toLowerCase();

  if (text.includes("renamed") || path.includes("=>")) return "renamed";
  if (text.includes("deleted")) return "deleted";
  if (text.includes("added")) return "added";

  return "modified";
}

  function getFileExtension(filePath) {
    const lastSegment = filePath.split("/").pop();
    if (!lastSegment || !lastSegment.includes(".")) return null;
    return lastSegment.split(".").pop() ?? null;
  }

  function getTopLevelDir(filePath) {
    return filePath.split("/")[0] ?? null;
  }

  function createButton() {
    const button = document.createElement("button");
    button.id = "patchmap-toggle";
    button.textContent = "PatchMap";
    return button;
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "patchmap-panel";
    panel.innerHTML = `
      <div id="patchmap-header">
        <strong>PatchMap</strong>
        <button id="patchmap-close" type="button">×</button>
      </div>
      <div id="patchmap-body">
        <div id="patchmap-status">Loading...</div>
        <div id="patchmap-actions"></div>
        <div id="patchmap-content"></div>
      </div>
    `;
    return panel;
  }

  function setStatus(message) {
    const status = document.getElementById("patchmap-status");
    if (status) status.textContent = message;
  }

  function setActions(html) {
    const actions = document.getElementById("patchmap-actions");
    if (actions) actions.innerHTML = html;
  }

  function setContent(html) {
    const content = document.getElementById("patchmap-content");
    if (content) content.innerHTML = html;
  }

  function clearPanel() {
    setActions("");
    setContent("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function findGitHubDescriptionTextarea() {
    const selectors = [
      'textarea[name="pull_request[body]"]',
      'textarea[name="issue[body]"]',
      "textarea.js-comment-field",
      "textarea",
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el instanceof HTMLTextAreaElement) {
        return el;
      }
    }

    return null;
  }

  function findGitHubEditDescriptionButton() {
    const elements = Array.from(document.querySelectorAll("button, summary"));
    return elements.find((el) => {
      const text = el.textContent?.trim().toLowerCase() || "";
      return text === "edit" || text === "edit description";
    });
  }

  async function ensureGitHubDescriptionEditorOpen() {
    let textarea = findGitHubDescriptionTextarea();
    if (textarea) return textarea;

    const editButton = findGitHubEditDescriptionButton();
    if (editButton) {
      editButton.click();
      await wait(500);
    }

    textarea = findGitHubDescriptionTextarea();
    return textarea;
  }

  function upsertPatchMapSection(existingText, patchMapMarkdown) {
    const startMarker = "<!-- PATCHMAP:START -->";
    const endMarker = "<!-- PATCHMAP:END -->";

    const startIndex = existingText.indexOf(startMarker);
    const endIndex = existingText.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const before = existingText.slice(0, startIndex).trimEnd();
      const after = existingText.slice(endIndex + endMarker.length).trimStart();

      return [before, patchMapMarkdown, after]
        .filter(Boolean)
        .join("\n\n")
        .trim();
    }

    return [existingText.trim(), patchMapMarkdown]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  function setNativeTextareaValue(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;

    if (setter) {
      setter.call(textarea, value);
    } else {
      textarea.value = value;
    }

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function resolveGroupFiles(fileIds) {
    const availableFiles = currentLookupData?.files || [];
    const fileMap = new Map(availableFiles.map((file) => [file.id, file]));

    return fileIds.map((fileId) => fileMap.get(fileId)).filter(Boolean);
  }

 function renderUnregisteredPr(prInfo) {
  const repoLabel =
    prInfo.provider === "github"
      ? `${prInfo.owner}/${prInfo.name}`
      : prInfo.projectPath;

  setStatus("This PR is not registered in PatchMap.");
  setActions(`
    <button id="patchmap-register-btn" class="patchmap-action-btn" type="button">
      Register PR
    </button>
  `);
  setContent(`
    <div class="patchmap-section">
      <div><strong>Provider</strong></div>
      <div>${escapeHtml(getProviderDisplayName(prInfo.provider))}</div>
    </div>
    <div class="patchmap-section">
      <div><strong>Repo</strong></div>
      <div>${escapeHtml(repoLabel)}</div>
    </div>
    <div class="patchmap-section">
      <div><strong>PR</strong></div>
      <div>#${escapeHtml(prInfo.prNumber)}</div>
    </div>
    <div class="patchmap-section">
      <div><strong>Tip</strong></div>
      <div>Register this PR to load files and create a PatchMap draft.</div>
    </div>
  `);

  document
    .getElementById("patchmap-register-btn")
    ?.addEventListener("click", async () => {
      await registerCurrentPr();
    });
}

  function renderMissingPatchMap(lookupData) {
    setStatus("PR is registered, but no PatchMap draft exists yet.");
    setActions(`
      <button id="patchmap-create-draft-btn" class="patchmap-action-btn" type="button">
        Create PatchMap Draft
      </button>
    `);
    setContent(`
      <div class="patchmap-section">
        <div><strong>PR</strong></div>
        <div>#${escapeHtml(String(lookupData.pullRequest.prNumber))} · ${escapeHtml(
          lookupData.pullRequest.title
        )}</div>
      </div>
      <div class="patchmap-section">
        <div><strong>Registered Files</strong></div>
        <div>${lookupData.files?.length ?? 0} file(s)</div>
      </div>
      <div class="patchmap-section">
        <div><strong>Next Step</strong></div>
        <div>Create an empty PatchMap draft for this PR.</div>
      </div>
    `);

    document
      .getElementById("patchmap-create-draft-btn")
      ?.addEventListener("click", async () => {
        await createEmptyPatchMapDraft(lookupData.pullRequest.id);
      });
  }

  function renderError(message) {
    setStatus(`Error: ${message}`);
    clearPanel();
  }

  function renderPatchMap(data) {
    currentPatchMapData = data;

    const summary = data.summary || {};
    const groups = data.groups || [];

    setStatus("Loaded");
    setActions(`
      <button id="patchmap-auto-group-btn" class="patchmap-action-btn" type="button">
        Auto Group Files
      </button>
      <button id="patchmap-edit-summary-btn" class="patchmap-action-btn" type="button">
        Edit Summary
      </button>
      <button id="patchmap-copy-markdown-btn" class="patchmap-action-btn" type="button">
        Copy Markdown
      </button>
      <button id="patchmap-insert-description-btn" class="patchmap-action-btn" type="button">
        Insert into PR Description
      </button>
    `);

    setContent(`
      <div class="patchmap-section">
        ${summary.purpose ? `<div><strong>Purpose</strong><p>${escapeHtml(summary.purpose)}</p></div>` : ""}
        ${summary.behaviorChangeNotes ? `<div><strong>Behavior Change</strong><p>${escapeHtml(summary.behaviorChangeNotes)}</p></div>` : ""}
        ${summary.riskNotes ? `<div><strong>Risk</strong><p>${escapeHtml(summary.riskNotes)}</p></div>` : ""}
        ${summary.testNotes ? `<div><strong>Tests</strong><p>${escapeHtml(summary.testNotes)}</p></div>` : ""}
        ${summary.demoable === true ? `<div><strong>Demoable</strong><p>Yes</p></div>` : ""}
        ${summary.demoable === false ? `<div><strong>Demoable</strong><p>No</p></div>` : ""}
        ${summary.demoNotes ? `<div><strong>Demo Notes</strong><p>${escapeHtml(summary.demoNotes)}</p></div>` : ""}
      </div>

      <div class="patchmap-section">
        <strong>Walkthrough</strong>
        ${
          groups.length === 0
            ? `<div class="patchmap-empty">No groups yet. Try Auto Group Files.</div>`
            : `
              <div class="patchmap-group-list">
                ${groups
                  .map((group) => {
                    const files = resolveGroupFiles(group.fileIds || []);
                    return `
                      <div class="patchmap-group-card">
                        <div class="patchmap-group-title-row">
                          <strong>${escapeHtml(group.title)}</strong>
                          <span class="patchmap-group-count">${files.length} file(s)</span>
                        </div>
                        ${
                          group.description
                            ? `<div class="patchmap-group-description">${escapeHtml(
                                group.description
                              )}</div>`
                            : ""
                        }
                        ${
                          files.length > 0
                            ? `
                              <ul class="patchmap-file-list">
                                ${files
                                  .map(
                                    (file) => `
                                      <li class="patchmap-file-item">
                                        <code>${escapeHtml(file.filePath)}</code>
                                      </li>
                                    `
                                  )
                                  .join("")}
                              </ul>
                            `
                            : `<div class="patchmap-empty-files">No files attached</div>`
                        }
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `
        }
      </div>
    `);

    document
      .getElementById("patchmap-auto-group-btn")
      ?.addEventListener("click", async () => {
        await autoGroupCurrentPatchMap();
      });

    document
      .getElementById("patchmap-edit-summary-btn")
      ?.addEventListener("click", () => {
        renderSummaryEditor();
      });

    document
      .getElementById("patchmap-copy-markdown-btn")
      ?.addEventListener("click", async () => {
        try {
          const patchmapId = data.patchmap?.id;
          if (!patchmapId) throw new Error("Missing patchmap id");

          const response = await extensionFetch(
            "http://localhost:3000/api/patchmaps/generate-markdown",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ patchmapId }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to generate markdown");
          }

          const json = await response.json();
          await navigator.clipboard.writeText(json.markdown);
          setStatus("Markdown copied to clipboard");
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Failed to copy markdown"
          );
        }
      });

    document
      .getElementById("patchmap-insert-description-btn")
      ?.addEventListener("click", async () => {
        try {
            const prInfo = parseCurrentProviderPr();
if (!prInfo) throw new Error("Could not determine current provider");

if (prInfo.provider !== "github") {
  throw new Error("Insert into PR Description is only implemented for GitHub right now");
}
          const patchmapId = data.patchmap?.id;
          if (!patchmapId) throw new Error("Missing patchmap id");

          setStatus("Generating markdown...");

          const response = await extensionFetch(
            "http://localhost:3000/api/patchmaps/generate-markdown",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ patchmapId }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to generate markdown");
          }

          const json = await response.json();
          const markdown = json.markdown;

          setStatus("Opening PR description editor...");

          const textarea = await ensureGitHubDescriptionEditorOpen();
          if (!textarea) {
            throw new Error("Could not find GitHub PR description editor");
          }

          const nextValue = upsertPatchMapSection(textarea.value || "", markdown);
          setNativeTextareaValue(textarea, nextValue);

          setStatus(
            "PatchMap inserted into PR description. Save the PR description to persist it."
          );
        } catch (error) {
          renderError(
            error instanceof Error
              ? error.message
              : "Failed to insert into PR description"
          );
        }
      });
  }

  function renderSummaryEditor() {
    if (!currentPatchMapData || !currentLookupData) return;

    const summary = currentPatchMapData.summary || {};

    setStatus("Editing summary");
    setActions(`
      <button id="patchmap-save-summary-btn" class="patchmap-action-btn" type="button">
        Save Summary
      </button>
      <button id="patchmap-cancel-summary-btn" class="patchmap-action-btn" type="button">
        Cancel
      </button>
    `);

    setContent(`
      <div class="patchmap-section">
        <label class="patchmap-field-label" for="patchmap-purpose">Purpose</label>
        <textarea id="patchmap-purpose" class="patchmap-textarea">${escapeHtml(
          summary.purpose || ""
        )}</textarea>
      </div>

      <div class="patchmap-section">
        <label class="patchmap-field-label" for="patchmap-behavior-change">Behavior Change</label>
        <textarea id="patchmap-behavior-change" class="patchmap-textarea">${escapeHtml(
          summary.behaviorChangeNotes || ""
        )}</textarea>
      </div>

      <div class="patchmap-section">
        <label class="patchmap-field-label" for="patchmap-risk">Risk</label>
        <textarea id="patchmap-risk" class="patchmap-textarea">${escapeHtml(
          summary.riskNotes || ""
        )}</textarea>
      </div>

      <div class="patchmap-section">
        <label class="patchmap-field-label" for="patchmap-tests">Tests</label>
        <textarea id="patchmap-tests" class="patchmap-textarea">${escapeHtml(
          summary.testNotes || ""
        )}</textarea>
      </div>

      <div class="patchmap-section">
        <label class="patchmap-field-label" for="patchmap-demoable">Demoable</label>
        <select id="patchmap-demoable" class="patchmap-textarea">
          <option value="">Not set</option>
          <option value="yes" ${summary.demoable === true ? "selected" : ""}>Yes</option>
          <option value="no" ${summary.demoable === false ? "selected" : ""}>No</option>
        </select>
      </div>

      <div class="patchmap-section">
        <label class="patchmap-field-label" for="patchmap-demo-notes">Demo Notes</label>
        <textarea id="patchmap-demo-notes" class="patchmap-textarea">${escapeHtml(
          summary.demoNotes || ""
        )}</textarea>
      </div>
    `);

    document
      .getElementById("patchmap-save-summary-btn")
      ?.addEventListener("click", async () => {
        await saveSummaryOnly();
      });

    document
      .getElementById("patchmap-cancel-summary-btn")
      ?.addEventListener("click", () => {
        renderPatchMap(currentPatchMapData);
      });
  }

  async function saveSummaryOnly() {
    if (!currentPatchMapData || !currentLookupData) return;

    try {
      setStatus("Saving summary...");

      const purpose = document.getElementById("patchmap-purpose")?.value ?? "";
      const behaviorChangeNotes =
        document.getElementById("patchmap-behavior-change")?.value ?? "";
      const riskNotes = document.getElementById("patchmap-risk")?.value ?? "";
      const testNotes = document.getElementById("patchmap-tests")?.value ?? "";
      const demoableSelection = document.getElementById("patchmap-demoable")?.value ?? "";
      const demoNotes = document.getElementById("patchmap-demo-notes")?.value ?? "";
      const demoable =
        demoableSelection === "yes"
          ? true
          : demoableSelection === "no"
            ? false
            : null;

      const response = await extensionFetch(
        "http://localhost:3000/api/patchmaps/save-draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pullRequestId: currentPatchMapData.patchmap.pullRequestId,
            patchmap: {
              id: currentPatchMapData.patchmap.id,
              status: currentPatchMapData.patchmap.status,
              versionNumber: currentPatchMapData.patchmap.versionNumber,
            },
            summary: {
              purpose: purpose || null,
              riskNotes: riskNotes || null,
              testNotes: testNotes || null,
              behaviorChangeNotes: behaviorChangeNotes || null,
              demoable,
              demoNotes: demoNotes || null,
            },
            groups: (currentPatchMapData.groups || []).map((group, index) => ({
              title: group.title,
              description: group.description || null,
              orderIndex:
                typeof group.orderIndex === "number" ? group.orderIndex : index,
              fileIds: group.fileIds || [],
            })),
          }),
        }
      );

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "Failed to save summary");
      }

      setStatus("Summary saved");
      await loadPatchMap();
    } catch (error) {
      renderError(error instanceof Error ? error.message : "Failed to save summary");
    }
  }

  async function lookupPullRequest(prInfo) {
  const lookupUrl = new URL("http://localhost:3000/api/pull-requests/lookup");

  if (prInfo.provider === "github") {
    lookupUrl.searchParams.set("provider", "github");
    lookupUrl.searchParams.set("owner", prInfo.owner);
    lookupUrl.searchParams.set("name", prInfo.name);
    lookupUrl.searchParams.set("prNumber", prInfo.prNumber);
  } else if (prInfo.provider === "gitlab") {
    const parts = prInfo.projectPath.split("/").filter(Boolean);
    const name = parts[parts.length - 1];
    const owner = parts.slice(0, -1).join("/");

    lookupUrl.searchParams.set("provider", "gitlab");
    lookupUrl.searchParams.set("owner", owner);
    lookupUrl.searchParams.set("name", name);
    lookupUrl.searchParams.set("prNumber", prInfo.prNumber);
  } else {
    throw new Error("Unsupported provider");
  }

  const response = await extensionFetch(lookupUrl.toString());

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to look up PR");
  }

  return await response.json();
}

  async function loadPatchMapByPullRequestId(pullRequestId) {
    const patchMapUrl = new URL("http://localhost:3000/api/patchmaps/by-pr");
    patchMapUrl.searchParams.set("pullRequestId", pullRequestId);

    const response = await extensionFetch(patchMapUrl.toString());

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error("Failed to load PatchMap");
    }

    return await response.json();
  }

  async function autoGroupCurrentPatchMap() {
    if (!currentPatchMapData || !currentLookupData) return;

    try {
      const availableFiles = currentLookupData?.files || [];
      if (availableFiles.length === 0) {
        renderError(
          "This PR has no registered files yet. Open the 'Files changed' tab and register the PR again."
        );
        return;
      }

      setStatus("Generating suggested groups...");

      const suggestUrl = new URL("http://localhost:3000/api/patchmaps/suggest-groups");
      suggestUrl.searchParams.set(
        "pullRequestId",
        currentPatchMapData.patchmap.pullRequestId
      );

      const suggestResponse = await extensionFetch(suggestUrl.toString());

      if (!suggestResponse.ok) {
        const json = await suggestResponse.json().catch(() => null);
        throw new Error(json?.error || "Failed to suggest groups");
      }

      const suggested = await suggestResponse.json();
      console.log("PatchMap suggested groups:", suggested);

      setStatus("Saving suggested groups...");

      const saveResponse = await extensionFetch(
        "http://localhost:3000/api/patchmaps/save-draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pullRequestId: currentPatchMapData.patchmap.pullRequestId,
            patchmap: {
              id: currentPatchMapData.patchmap.id,
              status: currentPatchMapData.patchmap.status,
              versionNumber: currentPatchMapData.patchmap.versionNumber,
            },
            summary: {
              purpose: currentPatchMapData.summary?.purpose ?? null,
              riskNotes: currentPatchMapData.summary?.riskNotes ?? null,
              testNotes: currentPatchMapData.summary?.testNotes ?? null,
              behaviorChangeNotes:
                currentPatchMapData.summary?.behaviorChangeNotes ?? null,
              demoable: currentPatchMapData.summary?.demoable ?? null,
              demoNotes: currentPatchMapData.summary?.demoNotes ?? null,
            },
            groups: suggested.groups.map((group, index) => ({
              title: group.title,
              description: group.description,
              orderIndex:
                typeof group.orderIndex === "number" ? group.orderIndex : index,
              fileIds: group.fileIds,
            })),
          }),
        }
      );

      if (!saveResponse.ok) {
        const json = await saveResponse.json().catch(() => null);
        throw new Error(json?.error || "Failed to save suggested groups");
      }

      console.log("PatchMap saved suggested groups");
      setStatus("Suggested groups saved");
      await loadPatchMap();
    } catch (error) {
      renderError(
        error instanceof Error ? error.message : "Failed to auto-group files"
      );
    }
  }

  async function createEmptyPatchMapDraft(pullRequestId) {
    try {
      setStatus("Creating empty PatchMap draft...");
      clearPanel();

      const response = await extensionFetch(
        "http://localhost:3000/api/patchmaps/save-draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pullRequestId,
            patchmap: {
              status: "draft",
              versionNumber: 1,
            },
            summary: {
              purpose: null,
              riskNotes: null,
              testNotes: null,
              behaviorChangeNotes: null,
              demoable: null,
              demoNotes: null,
            },
            groups: [],
          }),
        }
      );

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "Failed to create PatchMap draft");
      }

      setStatus("PatchMap draft created");
      await loadPatchMap();
    } catch (error) {
      renderError(
        error instanceof Error ? error.message : "Failed to create PatchMap draft"
      );
    }
  }

  async function loadPatchMap() {
   const prInfo = parseCurrentProviderPr();
    if (!prInfo) return;

    try {
      setStatus("Loading...");
      clearPanel();

      const lookupData = await lookupPullRequest(prInfo);
      currentLookupData = lookupData;

      if (!lookupData) {
        renderUnregisteredPr(prInfo);
        return;
      }

      const pullRequestId = lookupData.pullRequest.id;
      const patchMapData = await loadPatchMapByPullRequestId(pullRequestId);

      if (!patchMapData) {
        renderMissingPatchMap(lookupData);
        return;
      }

      renderPatchMap(patchMapData);
    } catch (error) {
      renderError(error instanceof Error ? error.message : "Unknown error");
    }
  }

 async function registerCurrentPr() {
  const prInfo = parseCurrentProviderPr();
  if (!prInfo) return;

  try {
    setStatus(`Registering PR from ${getProviderDisplayName(prInfo.provider)} provider...`);
    clearPanel();

    let payload;

    if (prInfo.provider === "github") {
      payload = {
        workspaceSlug: getWorkspaceSlug(),
        provider: "github",
        owner: prInfo.owner,
        name: prInfo.name,
        prNumber: Number(prInfo.prNumber),
      };
    } else if (prInfo.provider === "gitlab") {
      payload = {
        workspaceSlug: getWorkspaceSlug(),
        provider: "gitlab",
        projectPath: prInfo.projectPath,
        prNumber: Number(prInfo.prNumber),
      };
    } else {
      throw new Error("Unsupported provider");
    }

    console.log("PatchMap: register-from-provider payload", payload);

    const response = await extensionFetch(
      "http://localhost:3000/api/pull-requests/register-from-provider",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const json = await response.json().catch(() => null);
      throw new Error(json?.error || "Failed to register PR");
    }

    setStatus("PR registered, loading PatchMap...");
    await loadPatchMap();
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Failed to register PR");
  }
}

  function init() {
    const pr = parseCurrentProviderPr();
    if (!pr) return;

    const existingButton = document.getElementById("patchmap-toggle");
    const existingPanel = document.getElementById("patchmap-panel");

    if (!existingButton) {
      const button = createButton();
      document.body.appendChild(button);

      button.addEventListener("click", () => {
        const panel = document.getElementById("patchmap-panel");
        if (!panel) return;

        panel.classList.add("open");
        loadPatchMap();
      });
    }

    if (!existingPanel) {
      const panel = createPanel();
      document.body.appendChild(panel);

      panel.querySelector("#patchmap-close")?.addEventListener("click", () => {
        panel.classList.remove("open");
      });
    }

    console.log("PatchMap detected PR:", pr);
  }

  init();
})();

