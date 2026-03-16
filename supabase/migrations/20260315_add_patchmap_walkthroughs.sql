create table if not exists public.patchmap_walkthroughs (
  id uuid primary key default gen_random_uuid(),
  patchmap_id uuid not null unique references public.patchmaps(id) on delete cascade,
  title text,
  intro_notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patchmap_walkthrough_steps (
  id uuid primary key default gen_random_uuid(),
  walkthrough_id uuid not null references public.patchmap_walkthroughs(id) on delete cascade,
  pr_file_id uuid not null references public.pr_files(id) on delete cascade,
  title text,
  notes text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patchmap_walkthrough_steps_walkthrough_id_idx
  on public.patchmap_walkthrough_steps(walkthrough_id);

create index if not exists patchmap_walkthrough_steps_pr_file_id_idx
  on public.patchmap_walkthrough_steps(pr_file_id);
