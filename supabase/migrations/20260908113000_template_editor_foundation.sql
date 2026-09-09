alter table public.templates add column if not exists draft_config jsonb;
update public.templates set draft_config = config where draft_config is null;

create table if not exists public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  version integer not null,
  config jsonb not null,
  published_by uuid not null references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint template_versions_template_version_unique unique(template_id, version)
);
create index if not exists template_versions_template_created_idx on public.template_versions(template_id, created_at desc);
alter table public.template_versions enable row level security;
