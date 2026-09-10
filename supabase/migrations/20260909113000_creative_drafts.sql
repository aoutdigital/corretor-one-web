create table if not exists public.creative_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  objetivo public.objetivo_template not null,
  template_id uuid not null references public.templates(id) on delete restrict,
  subject_type public.public_resource_type not null,
  subject_id uuid not null,
  formato public.creative_output_format not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists creative_drafts_owner_updated_idx
  on public.creative_drafts(owner_id, updated_at desc);

alter table public.creative_drafts enable row level security;
create policy creative_drafts_select_own on public.creative_drafts for select using (owner_id = auth.uid());
create policy creative_drafts_insert_own on public.creative_drafts for insert with check (owner_id = auth.uid());
create policy creative_drafts_update_own on public.creative_drafts for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy creative_drafts_delete_own on public.creative_drafts for delete using (owner_id = auth.uid());

drop trigger if exists trg_creative_drafts_set_updated_at on public.creative_drafts;
create trigger trg_creative_drafts_set_updated_at
before update on public.creative_drafts
for each row execute function public.set_updated_at();
