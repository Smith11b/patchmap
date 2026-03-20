create table if not exists public.github_app_user_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  github_installation_id bigint not null unique,
  account_login text not null,
  account_type text not null,
  target_id bigint,
  repositories_selection text,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_login)
);

create index if not exists github_app_user_installations_user_id_idx
  on public.github_app_user_installations(user_id);
