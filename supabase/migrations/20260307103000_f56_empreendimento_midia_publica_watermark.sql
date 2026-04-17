-- F56 - Empreendimento: assets públicos de imagem com marca d'água

begin;

create table if not exists public.empreendimento_midia_publica (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  midia_id uuid not null references public.midia (id) on delete cascade,
  midia_relacao_id uuid not null references public.midia_relacoes (id) on delete cascade,
  ordem int not null default 0,
  indice_publico int not null,
  slug_publico text not null,
  storage_provider public.storage_provider not null default 'SUPABASE',
  storage_bucket text not null,
  storage_path text not null,
  url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint empreendimento_midia_publica_indice_publico_check check (indice_publico >= 1),
  constraint empreendimento_midia_publica_unique_relacao unique (midia_relacao_id),
  constraint empreendimento_midia_publica_unique_empreendimento_indice unique (empreendimento_id, indice_publico),
  constraint empreendimento_midia_publica_unique_empreendimento_midia unique (empreendimento_id, midia_id),
  constraint empreendimento_midia_publica_unique_storage unique (storage_provider, storage_bucket, storage_path)
);

create index if not exists empreendimento_midia_publica_owner_empreendimento_idx
  on public.empreendimento_midia_publica (owner_id, empreendimento_id);

create index if not exists empreendimento_midia_publica_empreendimento_ordem_idx
  on public.empreendimento_midia_publica (empreendimento_id, ordem, indice_publico);

create index if not exists empreendimento_midia_publica_slug_publico_idx
  on public.empreendimento_midia_publica (slug_publico);

drop trigger if exists trg_empreendimento_midia_publica_set_updated_at on public.empreendimento_midia_publica;
create trigger trg_empreendimento_midia_publica_set_updated_at
before update on public.empreendimento_midia_publica
for each row
execute function public.set_updated_at();

alter table public.empreendimento_midia_publica enable row level security;

drop policy if exists empreendimento_midia_publica_select_own on public.empreendimento_midia_publica;
create policy empreendimento_midia_publica_select_own
  on public.empreendimento_midia_publica
  for select
  using (owner_id = auth.uid());

drop policy if exists empreendimento_midia_publica_insert_own on public.empreendimento_midia_publica;
create policy empreendimento_midia_publica_insert_own
  on public.empreendimento_midia_publica
  for insert
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_midia_publica_update_own on public.empreendimento_midia_publica;
create policy empreendimento_midia_publica_update_own
  on public.empreendimento_midia_publica
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_midia_publica_delete_own on public.empreendimento_midia_publica;
create policy empreendimento_midia_publica_delete_own
  on public.empreendimento_midia_publica
  for delete
  using (owner_id = auth.uid());

drop policy if exists empreendimento_midia_publica_public_read_published on public.empreendimento_midia_publica;
create policy empreendimento_midia_publica_public_read_published
  on public.empreendimento_midia_publica
  for select
  using (
    exists (
      select 1
      from public.empreendimentos e
      where e.id = empreendimento_midia_publica.empreendimento_id
        and e.status = 'PUBLICADO'::public.status_empreendimento
    )
  );

commit;
