"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CredentialStatus = {
  github: { provider: "github"; updated_at: string } | null;
  gitlab: { provider: "gitlab"; updated_at: string } | null;
};

type GitHubAppInstallation = {
  id: string;
  githubInstallationId: number;
  accountLogin: string;
  accountType: string;
  targetId: number | null;
  repositoriesSelection: string | null;
  installedAt: string;
  updatedAt: string;
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

export default function SettingsPage() {
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [githubInstallations, setGitHubInstallations] = useState<GitHubAppInstallation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const [githubToken, setGithubToken] = useState("");
  const [gitlabToken, setGitlabToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceSlug, setNewWorkspaceSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const githubConnected = Boolean(status?.github);
  const gitlabConnected = Boolean(status?.gitlab);
  const hasGitHubAppAccess = githubInstallations.length > 0;

  async function loadStatus() {
    setError(null);
    const response = await fetch("/api/profile/provider-credentials");
    const data = await response.json();

    if (!response.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to load settings");
      return;
    }

    setStatus(data.credentials as CredentialStatus);
  }

  async function loadGitHubInstallations() {
    setError(null);
    const response = await fetch("/api/integrations/github/installations");
    const data = await response.json();

    if (!response.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to load GitHub installations");
      return;
    }

    setGitHubInstallations((data.installations ?? []) as GitHubAppInstallation[]);
  }

  async function loadWorkspaces() {
    const response = await fetch("/api/workspaces");
    const data = await response.json();

    if (!response.ok) {
      setWorkspaceError(typeof data?.error === "string" ? data.error : "Failed to load workspaces");
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
    }
  }

  useEffect(() => {
    void Promise.all([loadStatus(), loadWorkspaces(), loadGitHubInstallations()]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const githubAppStatus = params.get("github_app");
    const message = params.get("message");

    if (!githubAppStatus) {
      return;
    }

    if (githubAppStatus === "error") {
      setError(message ?? "Failed to connect GitHub App.");
    }

    if (githubAppStatus === "connected" || githubAppStatus === "updated") {
      void loadGitHubInstallations();
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  async function saveCredential(provider: "github" | "gitlab", token: string) {
    if (!token.trim()) return;

    setBusy(`${provider}-save`);
    setError(null);

    const response = await fetch("/api/profile/provider-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, token: token.trim() }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to save credential");
      setBusy(null);
      return;
    }

    setStatus(data.credentials as CredentialStatus);
    if (provider === "github") setGithubToken("");
    if (provider === "gitlab") setGitlabToken("");
    setBusy(null);
  }

  async function revokeCredential(provider: "github" | "gitlab") {
    setBusy(`${provider}-delete`);
    setError(null);

    const response = await fetch("/api/profile/provider-credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to revoke credential");
      setBusy(null);
      return;
    }

    setStatus(data.credentials as CredentialStatus);
    setBusy(null);
  }

  async function disconnectGitHubInstallation(installationId: string) {
    setBusy(`github-app-delete-${installationId}`);
    setError(null);

    const response = await fetch("/api/integrations/github/installations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to disconnect GitHub App");
      setBusy(null);
      return;
    }

    setGitHubInstallations((data.installations ?? []) as GitHubAppInstallation[]);
    setBusy(null);
  }

  async function handleCreateWorkspace() {
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName, slug: newWorkspaceSlug || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create workspace");
      }

      const nextWorkspaces = (data.workspaces ?? []) as WorkspaceSummary[];
      const created = data.workspace as WorkspaceSummary;

      setWorkspaces(nextWorkspaces);
      setActiveWorkspaceId(created.id);
      setNewWorkspaceName("");
      setNewWorkspaceSlug("");
      setWorkspaceError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pm-active-workspace", created.id);
      }
    } catch (createError) {
      setWorkspaceError(createError instanceof Error ? createError.message : "Failed to create workspace");
    }
  }

  async function handleInviteMember() {
    if (!activeWorkspaceId || !inviteEmail.trim()) return;

    try {
      const response = await fetch("/api/workspaces/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, email: inviteEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to invite member");
      }
      setInviteEmail("");
      setWorkspaceError(null);
    } catch (inviteError) {
      setWorkspaceError(inviteError instanceof Error ? inviteError.message : "Failed to invite member");
    }
  }

  async function handleAcceptInvite() {
    if (!inviteToken.trim()) return;

    try {
      const response = await fetch("/api/workspaces/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to accept invite");
      }

      const nextWorkspaces = (data.workspaces ?? []) as WorkspaceSummary[];
      setWorkspaces(nextWorkspaces);
      if (data.workspaceId) {
        setActiveWorkspaceId(data.workspaceId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("pm-active-workspace", data.workspaceId);
        }
      }
      setInviteToken("");
      setWorkspaceError(null);
    } catch (acceptError) {
      setWorkspaceError(acceptError instanceof Error ? acceptError.message : "Failed to accept invite");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-6 py-6 md:px-7 md:py-7">
        <div className="pm-context-kicker">Profile, workspaces, and provider access</div>
        <h1 className="pm-hero-title mt-2">Settings</h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Manage your personal provider credentials and workspace membership.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/register" className="pm-button pm-button-secondary">
            Back to Register
          </Link>
          <button className="pm-button pm-button-secondary" type="button" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </section>

      <section className="pm-emphasis-card mt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="pm-step-chip">Setup Checklist</div>
            <div className="pm-emphasis-title mt-3">Configure access before you start registering PRs</div>
            <p className="pm-emphasis-copy">
              The most important tasks here are choosing the right workspace and saving the provider tokens your team needs for import.
            </p>
          </div>
          <div className="pm-soft-panel">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
              Best next step
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--pm-brand-navy)]">
              Save tokens, then return to Register
            </div>
          </div>
        </div>
      </section>

      <section className="pm-fade-stagger mt-8 grid gap-5 md:grid-cols-2">
        <article className="pm-card p-6 md:p-7 md:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="pm-card-title">GitHub App Access</h2>
              <p className="pm-card-subtitle">
                Connect PatchMap to your GitHub account or organization so shared and org repos can be imported without relying on a personal token alone.
              </p>
            </div>
            <a className="pm-button pm-button-primary" href="/api/integrations/github/connect">
              Connect GitHub
            </a>
          </div>

          <div className="pm-soft-panel mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pm-text-soft)]">
              Recommended for org repos
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--pm-text)]">
              Install the PatchMap GitHub App on the organizations or repositories you want to import. You can still keep a personal access token below as a fallback for personal repos.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {hasGitHubAppAccess ? (
              githubInstallations.map((installation) => (
                <div
                  key={installation.id}
                  className="pm-soft-panel flex flex-wrap items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-[var(--pm-text-strong)]">
                        {installation.accountLogin}
                      </div>
                      <span className="pm-pill">{installation.accountType}</span>
                      <span className="pm-pill">
                        {installation.repositoriesSelection === "all"
                          ? "All repositories"
                          : "Selected repositories"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--pm-text-soft)]">
                      Connected {new Date(installation.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="pm-button pm-button-secondary"
                    type="button"
                    onClick={() => disconnectGitHubInstallation(installation.id)}
                    disabled={busy !== null}
                  >
                    Disconnect
                  </button>
                </div>
              ))
            ) : (
              <div className="pm-alert">
                No GitHub App installations connected yet. Use <span className="font-semibold">Connect GitHub</span> above to authorize org and shared repositories.
              </div>
            )}
          </div>
        </article>

        <article className="pm-card p-6 md:p-7">
          <h2 className="pm-card-title">GitHub Token</h2>
          <p className="pm-card-subtitle">
            Status: {status?.github ? `Connected (${new Date(status.github.updated_at).toLocaleString()})` : "Not set"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--pm-text-soft)]">
            Best for personal repos or as a fallback when a GitHub App installation is not available.
          </p>
          <label className="pm-label mt-2">
            Personal Access Token
            <input
              className="pm-input"
              type={githubConnected ? "text" : "password"}
              value={githubConnected ? "************************" : githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              readOnly={githubConnected}
              disabled={githubConnected}
              aria-label={githubConnected ? "GitHub token is saved and masked" : "GitHub personal access token"}
            />
          </label>
          {githubConnected ? (
            <p className="mt-2 text-xs text-[var(--pm-text-soft)]">
              Token is protected. Revoke it to enter a new value.
            </p>
          ) : null}
          <div className="mt-2 flex gap-3">
            {!githubConnected ? (
              <button
                className="pm-button pm-button-primary"
                type="button"
                onClick={() => saveCredential("github", githubToken)}
                disabled={busy !== null || !githubToken.trim()}
              >
                Save
              </button>
            ) : null}
            <button
              className="pm-button pm-button-secondary"
              type="button"
              onClick={() => revokeCredential("github")}
              disabled={busy !== null || !githubConnected}
            >
              Revoke
            </button>
          </div>
        </article>

        <article className="pm-card p-6 md:p-7">
          <h2 className="pm-card-title">GitLab Token</h2>
          <p className="pm-card-subtitle">
            Status: {status?.gitlab ? `Connected (${new Date(status.gitlab.updated_at).toLocaleString()})` : "Not set"}
          </p>
          <label className="pm-label mt-2">
            Personal Access Token
            <input
              className="pm-input"
              type={gitlabConnected ? "text" : "password"}
              value={gitlabConnected ? "************************" : gitlabToken}
              onChange={(e) => setGitlabToken(e.target.value)}
              readOnly={gitlabConnected}
              disabled={gitlabConnected}
              aria-label={gitlabConnected ? "GitLab token is saved and masked" : "GitLab personal access token"}
            />
          </label>
          {gitlabConnected ? (
            <p className="mt-2 text-xs text-[var(--pm-text-soft)]">
              Token is protected. Revoke it to enter a new value.
            </p>
          ) : null}
          <div className="mt-2 flex gap-3">
            {!gitlabConnected ? (
              <button
                className="pm-button pm-button-primary"
                type="button"
                onClick={() => saveCredential("gitlab", gitlabToken)}
                disabled={busy !== null || !gitlabToken.trim()}
              >
                Save
              </button>
            ) : null}
            <button
              className="pm-button pm-button-secondary"
              type="button"
              onClick={() => revokeCredential("gitlab")}
              disabled={busy !== null || !gitlabConnected}
            >
              Revoke
            </button>
          </div>
        </article>
      </section>

      <section className="pm-fade-stagger mt-5 grid gap-5 md:grid-cols-2">
        <article className="pm-card p-6 md:p-7">
          <h2 className="pm-card-title">Workspaces</h2>
          <p className="pm-card-subtitle">Create and select active workspace context.</p>

          <label className="pm-label mt-2">
            Active Workspace
            <select
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

          <div className="mt-2 grid gap-4">
            <label className="pm-label">
              New Workspace Name
              <input className="pm-input" value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} />
            </label>
            <label className="pm-label">
              Optional Slug
              <input className="pm-input" value={newWorkspaceSlug} onChange={(e) => setNewWorkspaceSlug(e.target.value)} />
            </label>
            <button className="pm-button pm-button-primary" type="button" onClick={handleCreateWorkspace}>
              Create Workspace
            </button>
          </div>
        </article>

        <article className="pm-card p-6 md:p-7">
          <h2 className="pm-card-title">Invites</h2>
          <p className="pm-card-subtitle">Invite members and accept invite tokens.</p>

          {activeWorkspace?.isOwner ? (
            <div className="grid gap-4">
              <label className="pm-label mt-2">
                Invite Member Email
                <input className="pm-input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </label>
              <button className="pm-button pm-button-primary" type="button" onClick={handleInviteMember}>
                Send Invite
              </button>
            </div>
          ) : (
            <div className="pm-alert mt-2">Select an owner workspace to send invites.</div>
          )}

          <div className="mt-2 grid gap-4">
            <label className="pm-label">
              Accept Invite Token
              <input className="pm-input" value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} />
            </label>
            <button className="pm-button pm-button-secondary" type="button" onClick={handleAcceptInvite}>
              Accept Invite
            </button>
          </div>
        </article>
      </section>

      {error ? <div className="pm-alert pm-alert-error mt-2">{error}</div> : null}
      {workspaceError ? <div className="pm-alert pm-alert-error mt-2">{workspaceError}</div> : null}
    </main>
  );
}
