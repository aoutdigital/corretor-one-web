-- F2 - CRM core tables
-- Creates: negocios, atividades, timeline_eventos, propostas
-- Includes enums, indexes, constraints, and RLS owner-based policies.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'finalidade') then
    create type public.finalidade as enum (
      'COMPRAR',
      'ALUGAR'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'etapa_negocio') then
    create type public.etapa_negocio as enum (
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
  if not exists (select 1 from pg_type where typname = 'tipo_proposta') then
    create type public.tipo_proposta as enum (
      'SELECAO',
      'IMOVEL',
      'EMPREENDIMENTO',
      'COMERCIAL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_proposta') then
    create type public.status_proposta as enum (
      'RASCUNHO',
      'ENVIADA',
      'ACEITA',
      'RECUSADA',
      'EXPIRADA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_atividade') then
    create type public.tipo_atividade as enum (
      'LIGACAO',
      'WHATSAPP',
      'EMAIL',
      'VISITA',
      'REUNIAO',
      'TAREFA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_atividade') then
    create type public.status_atividade as enum (
      'PENDENTE',
      'CONCLUIDA',
      'CANCELADA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_timeline') then
    create type public.tipo_timeline as enum (
      'STATUS',
      'PROPOSTA',
      'ATIVIDADE',
      'NOTA',
      'SISTEMA'
    );
  end if;
end $$;

create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  titulo text,
  etapa public.etapa_negocio not null default 'NOVO',
  valor_estimado numeric,
  finalidade public.finalidade,
  imovel_id uuid,
  empreendimento_id uuid,
  lista_id uuid,
  notas text,
  proxima_acao_em timestamptz,
  fechado_em timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  negocio_id uuid references public.negocios (id) on delete set null,
  titulo text not null,
  tipo public.tipo_proposta not null,
  status public.status_proposta not null default 'RASCUNHO',
  valor numeric,
  conteudo jsonb,
  arquivo_midia_id uuid,
  enviada_em timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  negocio_id uuid references public.negocios (id) on delete set null,
  tipo public.tipo_atividade not null,
  titulo text not null,
  descricao text,
  quando_em timestamptz,
  concluida_em timestamptz,
  status public.status_atividade not null default 'PENDENTE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.timeline_eventos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  negocio_id uuid references public.negocios (id) on delete set null,
  tipo public.tipo_timeline not null,
  titulo text not null,
  detalhes jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists negocios_owner_id_idx
  on public.negocios (owner_id);
create index if not exists negocios_lead_id_idx
  on public.negocios (lead_id);
create index if not exists negocios_owner_etapa_idx
  on public.negocios (owner_id, etapa);
create index if not exists negocios_proxima_acao_em_idx
  on public.negocios (proxima_acao_em);

create index if not exists propostas_owner_id_idx
  on public.propostas (owner_id);
create index if not exists propostas_lead_id_idx
  on public.propostas (lead_id);
create index if not exists propostas_negocio_id_idx
  on public.propostas (negocio_id);
create index if not exists propostas_owner_status_idx
  on public.propostas (owner_id, status);

create index if not exists atividades_owner_id_idx
  on public.atividades (owner_id);
create index if not exists atividades_lead_id_idx
  on public.atividades (lead_id);
create index if not exists atividades_negocio_id_idx
  on public.atividades (negocio_id);
create index if not exists atividades_owner_status_idx
  on public.atividades (owner_id, status);
create index if not exists atividades_quando_em_idx
  on public.atividades (quando_em);

create index if not exists timeline_eventos_owner_id_idx
  on public.timeline_eventos (owner_id);
create index if not exists timeline_eventos_lead_id_idx
  on public.timeline_eventos (lead_id);
create index if not exists timeline_eventos_negocio_id_idx
  on public.timeline_eventos (negocio_id);
create index if not exists timeline_eventos_created_at_idx
  on public.timeline_eventos (created_at desc);

create or replace function public.check_negocio_matches_lead()
returns trigger
language plpgsql
as $$
declare
  negocio_lead_id uuid;
begin
  if new.negocio_id is null then
    return new;
  end if;

  select lead_id into negocio_lead_id
  from public.negocios
  where id = new.negocio_id;

  if negocio_lead_id is null then
    raise exception 'negocio_id does not exist';
  end if;

  if negocio_lead_id <> new.lead_id then
    raise exception 'negocio_id must belong to the same lead_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_atividades_negocio_lead_consistency on public.atividades;
create trigger trg_atividades_negocio_lead_consistency
before insert or update of lead_id, negocio_id on public.atividades
for each row
execute function public.check_negocio_matches_lead();

drop trigger if exists trg_timeline_eventos_negocio_lead_consistency on public.timeline_eventos;
create trigger trg_timeline_eventos_negocio_lead_consistency
before insert or update of lead_id, negocio_id on public.timeline_eventos
for each row
execute function public.check_negocio_matches_lead();

drop trigger if exists trg_propostas_negocio_lead_consistency on public.propostas;
create trigger trg_propostas_negocio_lead_consistency
before insert or update of lead_id, negocio_id on public.propostas
for each row
execute function public.check_negocio_matches_lead();

drop trigger if exists trg_negocios_set_updated_at on public.negocios;
create trigger trg_negocios_set_updated_at
before update on public.negocios
for each row
execute function public.set_updated_at();

drop trigger if exists trg_propostas_set_updated_at on public.propostas;
create trigger trg_propostas_set_updated_at
before update on public.propostas
for each row
execute function public.set_updated_at();

drop trigger if exists trg_atividades_set_updated_at on public.atividades;
create trigger trg_atividades_set_updated_at
before update on public.atividades
for each row
execute function public.set_updated_at();

alter table public.negocios enable row level security;
alter table public.propostas enable row level security;
alter table public.atividades enable row level security;
alter table public.timeline_eventos enable row level security;

drop policy if exists negocios_select_own on public.negocios;
create policy negocios_select_own
  on public.negocios
  for select
  using (owner_id = auth.uid());

drop policy if exists negocios_insert_own on public.negocios;
create policy negocios_insert_own
  on public.negocios
  for insert
  with check (owner_id = auth.uid());

drop policy if exists negocios_update_own on public.negocios;
create policy negocios_update_own
  on public.negocios
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists negocios_delete_own on public.negocios;
create policy negocios_delete_own
  on public.negocios
  for delete
  using (owner_id = auth.uid());

drop policy if exists propostas_select_own on public.propostas;
create policy propostas_select_own
  on public.propostas
  for select
  using (owner_id = auth.uid());

drop policy if exists propostas_insert_own on public.propostas;
create policy propostas_insert_own
  on public.propostas
  for insert
  with check (owner_id = auth.uid());

drop policy if exists propostas_update_own on public.propostas;
create policy propostas_update_own
  on public.propostas
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists propostas_delete_own on public.propostas;
create policy propostas_delete_own
  on public.propostas
  for delete
  using (owner_id = auth.uid());

drop policy if exists atividades_select_own on public.atividades;
create policy atividades_select_own
  on public.atividades
  for select
  using (owner_id = auth.uid());

drop policy if exists atividades_insert_own on public.atividades;
create policy atividades_insert_own
  on public.atividades
  for insert
  with check (owner_id = auth.uid());

drop policy if exists atividades_update_own on public.atividades;
create policy atividades_update_own
  on public.atividades
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists atividades_delete_own on public.atividades;
create policy atividades_delete_own
  on public.atividades
  for delete
  using (owner_id = auth.uid());

drop policy if exists timeline_eventos_select_own on public.timeline_eventos;
create policy timeline_eventos_select_own
  on public.timeline_eventos
  for select
  using (owner_id = auth.uid());

drop policy if exists timeline_eventos_insert_own on public.timeline_eventos;
create policy timeline_eventos_insert_own
  on public.timeline_eventos
  for insert
  with check (owner_id = auth.uid());

drop policy if exists timeline_eventos_update_own on public.timeline_eventos;
create policy timeline_eventos_update_own
  on public.timeline_eventos
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists timeline_eventos_delete_own on public.timeline_eventos;
create policy timeline_eventos_delete_own
  on public.timeline_eventos
  for delete
  using (owner_id = auth.uid());

