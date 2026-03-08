-- Auth + workspace-scoped access foundations.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx
  on public.workspace_members(user_id);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_invites_workspace_id_idx
  on public.workspace_invites(workspace_id);

create table if not exists public.user_provider_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'gitlab')),
  encrypted_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

-- Move repository uniqueness to workspace scope.
create unique index if not exists repositories_workspace_provider_owner_name_uidx
  on public.repositories(workspace_id, provider, owner, name);

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'repositories_provider_owner_name_key'
  ) then
    alter table public.repositories drop constraint repositories_provider_owner_name_key;
  end if;
end $$;

-- Backfill memberships for existing owner_user_id where available.
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_user_id, 'owner'
from public.workspaces w
where w.owner_user_id is not null
on conflict (workspace_id, user_id) do nothing;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
