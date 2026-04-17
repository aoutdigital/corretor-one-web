-- F13 - Empreendimentos multistep com rascunho automático
-- Inclui: tabela de rascunhos + colunas novas em empreendimentos.

alter table public.empreendimentos
  add column if not exists tipo_uso public.tipo_uso,
  add column if not exists categoria_imovel public.tipo_imovel,
  add column if not exists bairro_comercial boolean not null default false,
  add column if not exists obra_percentuais jsonb;

create table if not exists public.empreendimento_rascunhos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  etapa_atual int not null default 1,
  titulo text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint empreendimento_rascunhos_etapa_check check (etapa_atual >= 1 and etapa_atual <= 8)
);

create index if not exists empreendimento_rascunhos_owner_id_idx
  on public.empreendimento_rascunhos (owner_id);

create index if not exists empreendimento_rascunhos_owner_updated_idx
  on public.empreendimento_rascunhos (owner_id, updated_at desc);

drop trigger if exists trg_empreendimento_rascunhos_set_updated_at on public.empreendimento_rascunhos;
create trigger trg_empreendimento_rascunhos_set_updated_at
before update on public.empreendimento_rascunhos
for each row
execute function public.set_updated_at();

alter table public.empreendimento_rascunhos enable row level security;

drop policy if exists empreendimento_rascunhos_select_own on public.empreendimento_rascunhos;
create policy empreendimento_rascunhos_select_own
  on public.empreendimento_rascunhos
  for select
  using (owner_id = auth.uid());

drop policy if exists empreendimento_rascunhos_insert_own on public.empreendimento_rascunhos;
create policy empreendimento_rascunhos_insert_own
  on public.empreendimento_rascunhos
  for insert
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_rascunhos_update_own on public.empreendimento_rascunhos;
create policy empreendimento_rascunhos_update_own
  on public.empreendimento_rascunhos
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_rascunhos_delete_own on public.empreendimento_rascunhos;
create policy empreendimento_rascunhos_delete_own
  on public.empreendimento_rascunhos
  for delete
  using (owner_id = auth.uid());
