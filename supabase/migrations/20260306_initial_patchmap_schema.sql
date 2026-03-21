create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('github', 'gitlab', 'azure')),
  owner text not null,
  name text not null,
  default_branch text,
  external_repo_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repositories_workspace_id_idx
  on public.repositories(workspace_id);

create unique index if not exists repositories_workspace_provider_owner_name_uidx
  on public.repositories(workspace_id, provider, owner, name);

create table if not exists public.pull_requests (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  provider text not null check (provider in ('github', 'gitlab', 'azure')),
  pr_number integer not null check (pr_number > 0),
  title text not null,
  description text,
  url text not null,
  source_branch text,
  target_branch text,
  base_sha text,
  head_sha text,
  state text not null default 'open' check (state in ('open', 'closed', 'merged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repository_id, pr_number)
);

create index if not exists pull_requests_repository_id_idx
  on public.pull_requests(repository_id);

create table if not exists public.pr_files (
  id uuid primary key default gen_random_uuid(),
  pull_request_id uuid not null references public.pull_requests(id) on delete cascade,
  file_path text not null,
  old_file_path text,
  change_type text not null check (change_type in ('added', 'modified', 'deleted', 'renamed')),
  patch_text text,
  file_extension text,
  top_level_dir text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pr_files_pull_request_id_idx
  on public.pr_files(pull_request_id);

create table if not exists public.patchmaps (
  id uuid primary key default gen_random_uuid(),
  pull_request_id uuid not null references public.pull_requests(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  published_by_user_id uuid references auth.users(id) on delete set null,
  review_requested_at timestamptz,
  review_requested_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pull_request_id, version_number)
);

create index if not exists patchmaps_pull_request_id_idx
  on public.patchmaps(pull_request_id);

create table if not exists public.patchmap_summaries (
  id uuid primary key default gen_random_uuid(),
  patchmap_id uuid not null unique references public.patchmaps(id) on delete cascade,
  purpose text,
  risk_notes text,
  test_notes text,
  behavior_change_notes text,
  demoable boolean,
  demo_notes text,
  generated_markdown text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patchmap_groups (
  id uuid primary key default gen_random_uuid(),
  patchmap_id uuid not null references public.patchmaps(id) on delete cascade,
  title text not null,
  description text,
  group_type text,
  confidence_score numeric(5,2),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patchmap_groups_patchmap_id_idx
  on public.patchmap_groups(patchmap_id);

create table if not exists public.patchmap_group_files (
  patchmap_group_id uuid not null references public.patchmap_groups(id) on delete cascade,
  pr_file_id uuid not null references public.pr_files(id) on delete cascade,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (patchmap_group_id, pr_file_id)
);

create index if not exists patchmap_group_files_pr_file_id_idx
  on public.patchmap_group_files(pr_file_id);

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_repositories_updated_at on public.repositories;
create trigger set_repositories_updated_at
before update on public.repositories
for each row execute function public.set_updated_at();

drop trigger if exists set_pull_requests_updated_at on public.pull_requests;
create trigger set_pull_requests_updated_at
before update on public.pull_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_pr_files_updated_at on public.pr_files;
create trigger set_pr_files_updated_at
before update on public.pr_files
for each row execute function public.set_updated_at();

drop trigger if exists set_patchmaps_updated_at on public.patchmaps;
create trigger set_patchmaps_updated_at
before update on public.patchmaps
for each row execute function public.set_updated_at();

drop trigger if exists set_patchmap_summaries_updated_at on public.patchmap_summaries;
create trigger set_patchmap_summaries_updated_at
before update on public.patchmap_summaries
for each row execute function public.set_updated_at();

drop trigger if exists set_patchmap_groups_updated_at on public.patchmap_groups;
create trigger set_patchmap_groups_updated_at
before update on public.patchmap_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_patchmap_group_files_updated_at on public.patchmap_group_files;
create trigger set_patchmap_group_files_updated_at
before update on public.patchmap_group_files
for each row execute function public.set_updated_at();
