alter table public.patchmaps
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists updated_by_user_id uuid references auth.users(id) on delete set null;

update public.patchmaps p
set
  created_by_user_id = coalesce(p.created_by_user_id, w.created_by_user_id),
  updated_by_user_id = coalesce(p.updated_by_user_id, w.updated_by_user_id, w.created_by_user_id)
from public.patchmap_walkthroughs w
where w.patchmap_id = p.id;

create index if not exists patchmaps_created_by_user_id_idx
  on public.patchmaps(created_by_user_id);

create index if not exists patchmaps_updated_by_user_id_idx
  on public.patchmaps(updated_by_user_id);
