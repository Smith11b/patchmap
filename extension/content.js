(function () {
  if (window.__patchmap_loaded__) return;
  window.__patchmap_loaded__ = true;

  function parseGitHubPr() {
    const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) return null;

    return {
      provider: "github",
      owner: match[1],
      name: match[2],
      prNumber: match[3]
    };
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
        <div id="patchmap-content"></div>
      </div>
    `;
    return panel;
  }

  function renderNotFound() {
    const status = document.getElementById("patchmap-status");
    const content = document.getElementById("patchmap-content");
    if (!status || !content) return;

    status.textContent = "No PatchMap found for this PR.";
    content.innerHTML = "";
  }

  function renderError(message) {
    const status = document.getElementById("patchmap-status");
    const content = document.getElementById("patchmap-content");
    if (!status || !content) return;

    status.textContent = `Error: ${message}`;
    content.innerHTML = "";
  }

  function renderPatchMap(data) {
    const status = document.getElementById("patchmap-status");
    const content = document.getElementById("patchmap-content");
    if (!status || !content) return;

    status.textContent = "Loaded";

    const summary = data.summary || {};
    const groups = data.groups || [];

    content.innerHTML = `
      <div class="patchmap-section">
        ${summary.purpose ? `<div><strong>Purpose</strong><p>${escapeHtml(summary.purpose)}</p></div>` : ""}
        ${summary.behaviorChangeNotes ? `<div><strong>Behavior Change</strong><p>${escapeHtml(summary.behaviorChangeNotes)}</p></div>` : ""}
        ${summary.riskNotes ? `<div><strong>Risk</strong><p>${escapeHtml(summary.riskNotes)}</p></div>` : ""}
        ${summary.testNotes ? `<div><strong>Tests</strong><p>${escapeHtml(summary.testNotes)}</p></div>` : ""}
      </div>

      <div class="patchmap-section">
        <strong>Walkthrough</strong>
        <ol>
          ${groups.map(group => `<li><strong>${escapeHtml(group.title)}</strong>${group.description ? `<div>${escapeHtml(group.description)}</div>` : ""}</li>`).join("")}
        </ol>
      </div>
    `;
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadPatchMap() {
    const pr = parseGitHubPr();
    if (!pr) return;

    try {
      const lookupUrl = new URL("http://localhost:3000/api/pull-requests/lookup");
      lookupUrl.searchParams.set("provider", pr.provider);
      lookupUrl.searchParams.set("owner", pr.owner);
      lookupUrl.searchParams.set("name", pr.name);
      lookupUrl.searchParams.set("prNumber", pr.prNumber);

      const lookupResponse = await fetch(lookupUrl.toString());
      if (lookupResponse.status === 404) {
        renderNotFound();
        return;
      }
      if (!lookupResponse.ok) {
        throw new Error("Failed to look up PR");
      }

      const lookupData = await lookupResponse.json();
      const pullRequestId = lookupData.pullRequest.id;

      const patchMapUrl = new URL("http://localhost:3000/api/patchmaps/by-pr");
      patchMapUrl.searchParams.set("pullRequestId", pullRequestId);

      const patchMapResponse = await fetch(patchMapUrl.toString());
      if (patchMapResponse.status === 404) {
        renderNotFound();
        return;
      }
      if (!patchMapResponse.ok) {
        throw new Error("Failed to load PatchMap");
      }

      const patchMapData = await patchMapResponse.json();
      renderPatchMap(patchMapData);
    } catch (error) {
      renderError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  function init() {
    const pr = parseGitHubPr();
    if (!pr) return;

    const button = createButton();
    const panel = createPanel();

    document.body.appendChild(button);
    document.body.appendChild(panel);

    button.addEventListener("click", () => {
      panel.classList.add("open");
      loadPatchMap();
    });

    panel.querySelector("#patchmap-close")?.addEventListener("click", () => {
      panel.classList.remove("open");
    });

    console.log("PatchMap detected PR:", pr);
  }

  init();
})();
