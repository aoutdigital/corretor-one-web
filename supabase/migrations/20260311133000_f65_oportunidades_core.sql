-- f65_oportunidades_core.sql
-- Estrutura o núcleo das oportunidades do CRM sobre a tabela legado `negocios`
-- e cria as tabelas auxiliares para compradores/vendedores.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'modalidade_negocio') then
    create type public.modalidade_negocio as enum ('VENDA', 'LOCACAO', 'CAPTACAO');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fase_negocio') then
    create type public.fase_negocio as enum ('NEGOCIACAO', 'JURIDICO', 'PERDIDO', 'GANHO');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subfase_juridica_negocio') then
    create type public.subfase_juridica_negocio as enum (
      'DOCUMENTOS_RECEBIDOS',
      'ANALISE_DOCUMENTAL',
      'PENDENCIA_DOCUMENTAL',
      'DOCUMENTACAO_APROVADA',
      'MINUTA_DE_CONTRATO_ENVIADA',
      'MINUTA_DE_CONTRATO_APROVADA',
      'ASSINATURA_AGENDADA',
      'CONTRATO_ASSINADO',
      'REGISTRO_EM_CARTORIO',
      'REGISTRO_CONCLUIDO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'papel_parte_negocio') then
    create type public.papel_parte_negocio as enum ('COMPRADOR', 'VENDEDOR');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_pessoa_negocio') then
    create type public.tipo_pessoa_negocio as enum ('FISICA', 'JURIDICA');
  end if;
end $$;

alter table public.negocios
  add column if not exists modalidade public.modalidade_negocio not null default 'VENDA';

alter table public.negocios
  add column if not exists fase public.fase_negocio not null default 'NEGOCIACAO';

alter table public.negocios
  add column if not exists subfase_juridica public.subfase_juridica_negocio;

alter table public.negocios
  add column if not exists valor numeric;

alter table public.negocios
  add column if not exists financiamentovalor numeric;

alter table public.negocios
  add column if not exists recursopropriovalor numeric;

alter table public.negocios
  add column if not exists fgtsvalor numeric;

alter table public.negocios
  add column if not exists outrosrecursosvalor numeric;

alter table public.negocios
  add column if not exists observacoes text;

alter table public.negocios
  add column if not exists perdido_em timestamptz;

alter table public.negocios
  add column if not exists ganho_em timestamptz;

update public.negocios
set modalidade = case
  when finalidade = 'ALUGAR' then 'LOCACAO'::public.modalidade_negocio
  else 'VENDA'::public.modalidade_negocio
end;

update public.negocios
set fase = case
  when etapa = 'CLIENTE' then 'GANHO'::public.fase_negocio
  when etapa = 'DESQUALIFICADO' then 'PERDIDO'::public.fase_negocio
  else 'NEGOCIACAO'::public.fase_negocio
end;

update public.negocios
set valor = coalesce(valor, valor_estimado),
    observacoes = coalesce(observacoes, notas),
    ganho_em = case
      when etapa = 'CLIENTE' then coalesce(ganho_em, fechado_em, updated_at)
      else ganho_em
    end,
    perdido_em = case
      when etapa = 'DESQUALIFICADO' then coalesce(perdido_em, fechado_em, updated_at)
      else perdido_em
    end;

update public.negocios
set recursopropriovalor = coalesce(recursopropriovalor, valor)
where modalidade = 'VENDA'
  and valor is not null
  and coalesce(financiamentovalor, 0) = 0
  and coalesce(recursopropriovalor, 0) = 0
  and coalesce(fgtsvalor, 0) = 0
  and coalesce(outrosrecursosvalor, 0) = 0;

create index if not exists negocios_owner_fase_idx
  on public.negocios (owner_id, fase);

create index if not exists negocios_owner_modalidade_idx
  on public.negocios (owner_id, modalidade);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'negocios_imovel_id_fkey'
      and conrelid = 'public.negocios'::regclass
  ) then
    alter table public.negocios
      add constraint negocios_imovel_id_fkey
      foreign key (imovel_id)
      references public.imoveis (id)
      on delete set null
      not valid;
  end if;
end $$;

alter table public.negocios
  drop constraint if exists negocios_subfase_juridica_consistency_chk;

alter table public.negocios
  add constraint negocios_subfase_juridica_consistency_chk
  check (subfase_juridica is null or fase = 'JURIDICO')
  not valid;

alter table public.negocios
  drop constraint if exists negocios_juridico_requires_imovel_chk;

alter table public.negocios
  add constraint negocios_juridico_requires_imovel_chk
  check (fase <> 'JURIDICO' or imovel_id is not null)
  not valid;

alter table public.negocios
  drop constraint if exists negocios_ganho_requires_imovel_chk;

alter table public.negocios
  add constraint negocios_ganho_requires_imovel_chk
  check (fase <> 'GANHO' or imovel_id is not null)
  not valid;

alter table public.negocios
  drop constraint if exists negocios_valores_financeiros_nao_negativos_chk;

alter table public.negocios
  add constraint negocios_valores_financeiros_nao_negativos_chk
  check (
    coalesce(valor, 0) >= 0
    and coalesce(financiamentovalor, 0) >= 0
    and coalesce(recursopropriovalor, 0) >= 0
    and coalesce(fgtsvalor, 0) >= 0
    and coalesce(outrosrecursosvalor, 0) >= 0
  )
  not valid;

alter table public.negocios
  drop constraint if exists negocios_composicao_venda_fecha_valor_chk;

alter table public.negocios
  add constraint negocios_composicao_venda_fecha_valor_chk
  check (
    modalidade <> 'VENDA'
    or valor is null
    or round(
      coalesce(financiamentovalor, 0)
      + coalesce(recursopropriovalor, 0)
      + coalesce(fgtsvalor, 0)
      + coalesce(outrosrecursosvalor, 0),
      2
    ) = round(valor, 2)
  )
  not valid;

create table if not exists public.negocio_partes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  papel public.papel_parte_negocio not null,
  tipo_pessoa public.tipo_pessoa_negocio not null,
  razao_social text,
  cnpj text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf public.uf,
  pais text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.negocio_partes
  drop constraint if exists negocio_partes_tipo_pessoa_consistency_chk;

alter table public.negocio_partes
  add constraint negocio_partes_tipo_pessoa_consistency_chk
  check (
    (
      tipo_pessoa = 'JURIDICA'
      and razao_social is not null
      and cnpj is not null
    )
    or (
      tipo_pessoa = 'FISICA'
      and razao_social is null
      and cnpj is null
    )
  )
  not valid;

create index if not exists negocio_partes_owner_id_idx
  on public.negocio_partes (owner_id);

create index if not exists negocio_partes_negocio_id_idx
  on public.negocio_partes (negocio_id);

create index if not exists negocio_partes_papel_idx
  on public.negocio_partes (papel);

create table if not exists public.negocio_parte_pessoas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  negocio_parte_id uuid not null references public.negocio_partes (id) on delete cascade,
  nome_completo text not null,
  email text not null,
  cpf text not null,
  cep text not null,
  endereco text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  uf public.uf not null,
  pais text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists negocio_parte_pessoas_owner_id_idx
  on public.negocio_parte_pessoas (owner_id);

create index if not exists negocio_parte_pessoas_negocio_parte_id_idx
  on public.negocio_parte_pessoas (negocio_parte_id);

create or replace function public.check_negocio_parte_matches_negocio()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  negocio_owner_id uuid;
begin
  select owner_id
    into negocio_owner_id
  from public.negocios
  where id = new.negocio_id;

  if negocio_owner_id is null then
    raise exception 'negocio_id does not exist';
  end if;

  if negocio_owner_id <> new.owner_id then
    raise exception 'negocio owner mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.check_negocio_parte_pessoa_matches_parte()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parte_owner_id uuid;
begin
  select owner_id
    into parte_owner_id
  from public.negocio_partes
  where id = new.negocio_parte_id;

  if parte_owner_id is null then
    raise exception 'negocio_parte_id does not exist';
  end if;

  if parte_owner_id <> new.owner_id then
    raise exception 'negocio parte owner mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_negocio_partes_owner_consistency on public.negocio_partes;
create trigger trg_negocio_partes_owner_consistency
before insert or update of owner_id, negocio_id on public.negocio_partes
for each row
execute function public.check_negocio_parte_matches_negocio();

drop trigger if exists trg_negocio_parte_pessoas_owner_consistency on public.negocio_parte_pessoas;
create trigger trg_negocio_parte_pessoas_owner_consistency
before insert or update of owner_id, negocio_parte_id on public.negocio_parte_pessoas
for each row
execute function public.check_negocio_parte_pessoa_matches_parte();

drop trigger if exists trg_negocio_partes_set_updated_at on public.negocio_partes;
create trigger trg_negocio_partes_set_updated_at
before update on public.negocio_partes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_negocio_parte_pessoas_set_updated_at on public.negocio_parte_pessoas;
create trigger trg_negocio_parte_pessoas_set_updated_at
before update on public.negocio_parte_pessoas
for each row
execute function public.set_updated_at();

alter table public.negocio_partes enable row level security;
alter table public.negocio_parte_pessoas enable row level security;

drop policy if exists negocio_partes_select_own on public.negocio_partes;
create policy negocio_partes_select_own
  on public.negocio_partes
  for select
  using (owner_id = auth.uid());

drop policy if exists negocio_partes_insert_own on public.negocio_partes;
create policy negocio_partes_insert_own
  on public.negocio_partes
  for insert
  with check (owner_id = auth.uid());

drop policy if exists negocio_partes_update_own on public.negocio_partes;
create policy negocio_partes_update_own
  on public.negocio_partes
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists negocio_partes_delete_own on public.negocio_partes;
create policy negocio_partes_delete_own
  on public.negocio_partes
  for delete
  using (owner_id = auth.uid());

drop policy if exists negocio_parte_pessoas_select_own on public.negocio_parte_pessoas;
create policy negocio_parte_pessoas_select_own
  on public.negocio_parte_pessoas
  for select
  using (owner_id = auth.uid());

drop policy if exists negocio_parte_pessoas_insert_own on public.negocio_parte_pessoas;
create policy negocio_parte_pessoas_insert_own
  on public.negocio_parte_pessoas
  for insert
  with check (owner_id = auth.uid());

drop policy if exists negocio_parte_pessoas_update_own on public.negocio_parte_pessoas;
create policy negocio_parte_pessoas_update_own
  on public.negocio_parte_pessoas
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists negocio_parte_pessoas_delete_own on public.negocio_parte_pessoas;
create policy negocio_parte_pessoas_delete_own
  on public.negocio_parte_pessoas
  for delete
  using (owner_id = auth.uid());
