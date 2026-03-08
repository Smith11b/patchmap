import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueWorkspaceSlug(base: string): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const normalized = slugify(base) || "workspace";
  let candidate = normalized;

  for (let i = 0; i < 25; i += 1) {
    const { data, error } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check workspace slug: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }

    candidate = `${normalized}-${i + 2}`;
  }

  throw new Error("Could not generate unique workspace slug");
}

export async function ensureUserProfile(user: { id: string; email?: string | null }) {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }
}

export async function getUserWorkspaces(userId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      role,
      workspaces!inner(
        id,
        name,
        slug,
        owner_user_id,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { referencedTable: "workspaces", ascending: true });

  if (error) {
    throw new Error(`Failed to load workspaces: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const workspace = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: row.role,
      isOwner: workspace.owner_user_id === userId,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    };
  });
}

export async function createWorkspace(params: {
  userId: string;
  name: string;
  slug?: string;
}) {
  const supabase = createAdminSupabaseClient();
  const slug = params.slug ? await uniqueWorkspaceSlug(params.slug) : await uniqueWorkspaceSlug(params.name);

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: params.name,
      slug,
      owner_user_id: params.userId,
    })
    .select("id, name, slug, owner_user_id, created_at, updated_at")
    .single();

  if (workspaceError || !workspace) {
    throw new Error(`Failed to create workspace: ${workspaceError?.message ?? "unknown error"}`);
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: params.userId,
    role: "owner",
  });

  if (memberError) {
    throw new Error(`Failed to create workspace membership: ${memberError.message}`);
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role: "owner",
    isOwner: true,
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
  };
}

export async function ensureDefaultWorkspace(params: {
  userId: string;
  email?: string | null;
}) {
  const workspaces = await getUserWorkspaces(params.userId);

  if (workspaces.length > 0) {
    return workspaces;
  }

  const workspaceName =
    params.email?.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "My Workspace";

  await createWorkspace({
    userId: params.userId,
    name: workspaceName,
    slug: params.email?.split("@")[0],
  });

  return getUserWorkspaces(params.userId);
}

export async function createWorkspaceInvite(params: {
  workspaceId: string;
  invitedByUserId: string;
  email: string;
}) {
  const supabase = createAdminSupabaseClient();

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: params.workspaceId,
      invited_by_user_id: params.invitedByUserId,
      email: params.email.toLowerCase().trim(),
      token,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id, workspace_id, email, token, status, expires_at, created_at")
    .single();

  if (error || !invite) {
    throw new Error(`Failed to create invite: ${error?.message ?? "unknown error"}`);
  }

  return invite;
}

export async function listWorkspaceInvites(workspaceId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, email, status, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list invites: ${error.message}`);
  }

  return data ?? [];
}

export async function acceptWorkspaceInvite(params: {
  token: string;
  userId: string;
  userEmail?: string | null;
}) {
  const supabase = createAdminSupabaseClient();

  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, email, status, expires_at")
    .eq("token", params.token)
    .maybeSingle();

  if (inviteError) {
    throw new Error(`Failed to load invite: ${inviteError.message}`);
  }

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status !== "pending") {
    throw new Error("Invite is no longer pending");
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("Invite has expired");
  }

  if (params.userEmail && invite.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    throw new Error("Invite email does not match authenticated user");
  }

  const { error: memberError } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: invite.workspace_id,
      user_id: params.userId,
      role: "member",
    },
    {
      onConflict: "workspace_id,user_id",
    }
  );

  if (memberError) {
    throw new Error(`Failed to create workspace membership: ${memberError.message}`);
  }

  const { error: inviteUpdateError } = await supabase
    .from("workspace_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (inviteUpdateError) {
    throw new Error(`Failed to mark invite accepted: ${inviteUpdateError.message}`);
  }

  return invite.workspace_id;
}


