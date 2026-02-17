-- T1 - Supabase schema baseline (CRM first)
-- Source of truth: docs/data-model.md + docs/enums.md + tasks.md

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'origem_lead') then
    create type public.origem_lead as enum (
      'CORRETOR_ONE',
      'GRUPO_OLX',
      'GOOGLE_ADS',
      'META_ADS',
      'INDICACAO',
      'EVENTO',
      'FEIRA',
      'PLANTAO',
      'IMOVELWEB',
      'CHAVES_NA_MAO',
      'CASA_MINEIRA',
      'LUGAR_CERTO',
      'MERCADO_LIVRE',
      'MEU_IMOVEL',
      'DREAMCASA',
      'QUINTO_ANDAR',
      'LOFT',
      'I123',
      'AGENTE_IMOVEL',
      'TROVIT',
      'IMOVEIS_CURITIBA',
      'WHATSAPP_BUSINESS',
      'OUTRO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_lead') then
    create type public.status_lead as enum (
      'NOVO',
      'ABERTO',
      'EM_ATENDIMENTO',
      'QUALIFICADO',
      'OPORTUNIDADE',
      'CLIENTE',
      'DESQUALIFICADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'motivo_desqualificacao') then
    create type public.motivo_desqualificacao as enum (
      'NAO_RESPONDEU_TENTATIVAS_DE_CONTATO',
      'CONTATO_INVALIDO',
      'SOLICITOU_NAO_SER_CONTATADO',
      'ORCAMENTO_INCOMPATIVEL',
      'SEM_PERFIL_DE_COMPRA',
      'APENAS_PESQUISA_OU_CURIOSIDADE',
      'SEM_URGENCIA_NO_MOMENTO',
      'NAO_ENCONTROU_IMOVEIS_COMPATIVEIS',
      'LOCALIZACAO_NAO_ATENDE',
      'CARACTERISTICAS_NAO_ATENDEM',
      'JA_FECHOU_COM_OUTRO_CORRETOR_OU_IMOBILIARIA',
      'ADIOU_DECISAO',
      'MUDANCA_DE_PLANOS_PESSOAIS_OU_FINANCEIROS',
      'LEAD_DUPLICADO_OU_INVALIDO',
      'SPAM_OU_TESTE',
      'PERDA_POR_FALHA_NO_ATENDIMENTO',
      'OUTRO'
    );
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  primeiro_nome text,
  sobrenome text,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  nome text not null,
  email text,
  email_lower text generated always as (lower(email)) stored,
  telefone text,
  telefone_e164 text,
  origem public.origem_lead not null,
  mensagem text,
  imovel_id uuid,
  utm jsonb,
  status public.status_lead not null default 'NOVO',
  motivo_desqualificacao public.motivo_desqualificacao,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leads_motivo_desqualificacao_ck check (
    (
      status = 'DESQUALIFICADO' and motivo_desqualificacao is not null
    ) or (
      status <> 'DESQUALIFICADO' and motivo_desqualificacao is null
    )
  )
);

create table if not exists public.lead_imoveis (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  imovel_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lead_imoveis_lead_imovel_unique unique (lead_id, imovel_id)
);

create table if not exists public.lead_localizacoes_interesse (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  geolocacao_id uuid,
  localizacao_texto text,
  lat numeric,
  lng numeric,
  raio_km numeric,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lead_localizacoes_interesse_origem_ck check (
    geolocacao_id is not null
    or localizacao_texto is not null
    or (lat is not null and lng is not null)
  )
);

create index if not exists leads_owner_id_idx
  on public.leads (owner_id);

create index if not exists leads_owner_status_idx
  on public.leads (owner_id, status);

create index if not exists leads_created_at_idx
  on public.leads (created_at desc);

create unique index if not exists leads_owner_email_lower_unique
  on public.leads (owner_id, email_lower)
  where email_lower is not null;

create index if not exists lead_imoveis_owner_id_idx
  on public.lead_imoveis (owner_id);

create index if not exists lead_imoveis_lead_id_idx
  on public.lead_imoveis (lead_id);

create index if not exists lead_localizacoes_interesse_owner_id_idx
  on public.lead_localizacoes_interesse (owner_id);

create index if not exists lead_localizacoes_interesse_lead_id_idx
  on public.lead_localizacoes_interesse (lead_id);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_leads_set_updated_at on public.leads;
create trigger trg_leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

drop trigger if exists trg_lead_imoveis_set_updated_at on public.lead_imoveis;
create trigger trg_lead_imoveis_set_updated_at
before update on public.lead_imoveis
for each row
execute function public.set_updated_at();

drop trigger if exists trg_lead_localizacoes_interesse_set_updated_at on public.lead_localizacoes_interesse;
create trigger trg_lead_localizacoes_interesse_set_updated_at
before update on public.lead_localizacoes_interesse
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_imoveis enable row level security;
alter table public.lead_localizacoes_interesse enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
  on public.profiles
  for delete
  using (id = auth.uid());

drop policy if exists leads_select_own on public.leads;
create policy leads_select_own
  on public.leads
  for select
  using (owner_id = auth.uid());

drop policy if exists leads_insert_own on public.leads;
create policy leads_insert_own
  on public.leads
  for insert
  with check (owner_id = auth.uid());

drop policy if exists leads_update_own on public.leads;
create policy leads_update_own
  on public.leads
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists leads_delete_own on public.leads;
create policy leads_delete_own
  on public.leads
  for delete
  using (owner_id = auth.uid());

drop policy if exists lead_imoveis_select_own on public.lead_imoveis;
create policy lead_imoveis_select_own
  on public.lead_imoveis
  for select
  using (owner_id = auth.uid());

drop policy if exists lead_imoveis_insert_own on public.lead_imoveis;
create policy lead_imoveis_insert_own
  on public.lead_imoveis
  for insert
  with check (owner_id = auth.uid());

drop policy if exists lead_imoveis_update_own on public.lead_imoveis;
create policy lead_imoveis_update_own
  on public.lead_imoveis
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists lead_imoveis_delete_own on public.lead_imoveis;
create policy lead_imoveis_delete_own
  on public.lead_imoveis
  for delete
  using (owner_id = auth.uid());

drop policy if exists lead_localizacoes_interesse_select_own on public.lead_localizacoes_interesse;
create policy lead_localizacoes_interesse_select_own
  on public.lead_localizacoes_interesse
  for select
  using (owner_id = auth.uid());

drop policy if exists lead_localizacoes_interesse_insert_own on public.lead_localizacoes_interesse;
create policy lead_localizacoes_interesse_insert_own
  on public.lead_localizacoes_interesse
  for insert
  with check (owner_id = auth.uid());

drop policy if exists lead_localizacoes_interesse_update_own on public.lead_localizacoes_interesse;
create policy lead_localizacoes_interesse_update_own
  on public.lead_localizacoes_interesse
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists lead_localizacoes_interesse_delete_own on public.lead_localizacoes_interesse;
create policy lead_localizacoes_interesse_delete_own
  on public.lead_localizacoes_interesse
  for delete
  using (owner_id = auth.uid());

