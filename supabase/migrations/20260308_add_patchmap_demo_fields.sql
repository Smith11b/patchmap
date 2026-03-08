-- Adds demo metadata fields for generated PatchMap markdown context.
alter table public.patchmap_summaries
  add column if not exists demoable boolean,
  add column if not exists demo_notes text;
