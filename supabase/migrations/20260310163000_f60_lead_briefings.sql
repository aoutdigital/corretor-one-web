-- f60_lead_briefings.sql
-- Espelha o briefing estruturado do portal no CRM, desacoplado de portal_users.

create table if not exists public.lead_briefings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  tipouso public.tipo_uso,
  tipoimovel public.tipo_imovel[],
  categoriaimovel text[],
  construcao public.tipo_construcao[],
  tiponegociacao public.tipo_negociacao[],
  intencao_compra public.intencao_compra,
  valor_min numeric,
  valor_max numeric,
  area_util_min numeric,
  area_util_max numeric,
  quartos_min int,
  suites_min int,
  vagas_min int,
  caracteristicas_residenciais public.caracteristica_imovel[],
  area_util_min_comercial numeric,
  area_util_max_comercial numeric,
  vagas_min_comercial int,
  caracteristicas_comerciais public.caracteristica_comercial[],
  geolocacao_id uuid references public.geolocacoes (id) on delete set null,
  localizacao_texto text,
  lat numeric,
  lng numeric,
  raio_km numeric,
  texto_livre text,
  conteudos public.tipo_conteudo[],
  canais public.canal_contato[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lead_briefings_lead_unique unique (lead_id)
);

create index if not exists lead_briefings_owner_id_idx
  on public.lead_briefings (owner_id);

create index if not exists lead_briefings_lead_id_idx
  on public.lead_briefings (lead_id);

create index if not exists lead_briefings_geolocacao_id_idx
  on public.lead_briefings (geolocacao_id);

drop trigger if exists trg_lead_briefings_set_updated_at on public.lead_briefings;
create trigger trg_lead_briefings_set_updated_at
before update on public.lead_briefings
for each row
execute function public.set_updated_at();

alter table public.lead_briefings enable row level security;

drop policy if exists lead_briefings_select_own on public.lead_briefings;
create policy lead_briefings_select_own
  on public.lead_briefings
  for select
  using (owner_id = auth.uid());

drop policy if exists lead_briefings_insert_own on public.lead_briefings;
create policy lead_briefings_insert_own
  on public.lead_briefings
  for insert
  with check (owner_id = auth.uid());

drop policy if exists lead_briefings_update_own on public.lead_briefings;
create policy lead_briefings_update_own
  on public.lead_briefings
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists lead_briefings_delete_own on public.lead_briefings;
create policy lead_briefings_delete_own
  on public.lead_briefings
  for delete
  using (owner_id = auth.uid());
