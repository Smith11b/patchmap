-- Stores unified diff text for each file so the UI can render a PR code/diff viewer.
alter table public.pr_files
  add column if not exists patch_text text;
