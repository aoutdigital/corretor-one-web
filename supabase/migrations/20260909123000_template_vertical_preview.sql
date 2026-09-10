alter table public.templates
  add column if not exists preview_vertical_url text;

alter table public.template_versions
  add column if not exists preview_url text,
  add column if not exists preview_vertical_url text;
