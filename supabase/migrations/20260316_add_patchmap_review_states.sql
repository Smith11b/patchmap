alter table public.patchmaps
  add column if not exists published_at timestamptz,
  add column if not exists published_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists review_requested_at timestamptz,
  add column if not exists review_requested_by_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.patchmap_review_states (
  id uuid primary key default gen_random_uuid(),
  patchmap_id uuid not null references public.patchmaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'approved')),
  started_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patchmap_id, user_id)
);

create index if not exists patchmap_review_states_patchmap_id_idx
  on public.patchmap_review_states(patchmap_id);

create index if not exists patchmap_review_states_user_id_idx
  on public.patchmap_review_states(user_id);
