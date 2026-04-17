-- F33 - Base do multistep de imoveis (negociacao, ocupacao e ambientes)

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'aceita_parceria_status') then
    create type public.aceita_parceria_status as enum (
      'SIM',
      'NAO',
      'SOB_ANALISE'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ocupacao_imovel') then
    create type public.ocupacao_imovel as enum (
      'PROPRIETARIO_RESIDE_NO_IMOVEL',
      'IMOVEL_DESOCUPADO',
      'IMOVEL_COM_INQUILINO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_ambiente_imovel') then
    create type public.tipo_ambiente_imovel as enum (
      'DORMITORIO',
      'COZINHA',
      'SALA'
    );
  end if;
end $$;

alter table public.imoveis
  add column if not exists tipo_negociacao public.tipo_negociacao,
  add column if not exists comissao_venda_percentual numeric,
  add column if not exists minimo_aceito_em_maos numeric,
  add column if not exists descricao_permuta text,
  add column if not exists veio_do_bolsao boolean not null default false,
  add column if not exists captacao_corretor_parceiro boolean not null default false,
  add column if not exists corretor_parceiro_nome text,
  add column if not exists corretor_parceiro_telefone text,
  add column if not exists corretor_parceiro_email text,
  add column if not exists comissao_captador_percentual numeric,
  add column if not exists comissao_vendedor_percentual numeric,
  add column if not exists outras_comissoes_percentual numeric,
  add column if not exists exclusividade_data_vencimento date,
  add column if not exists exclusividade_observacoes text,
  add column if not exists disponibilizar_no_bolsao_parceria boolean not null default false,
  add column if not exists aceite_corretor_exclusivo boolean not null default false,
  add column if not exists regra_geral_exclusividade text,
  add column if not exists aceita_parceria_status public.aceita_parceria_status,
  add column if not exists divisao_comissao_parceria text,
  add column if not exists ocupacao_imovel public.ocupacao_imovel,
  add column if not exists observacoes_gerais text,
  add column if not exists salas int,
  add column if not exists cozinhas int,
  add column if not exists lateral_1_metros numeric,
  add column if not exists lateral_2_metros numeric;

update public.imoveis
set tipo_negociacao = case
  when finalidade = 'COMPRAR' then 'VENDA'::public.tipo_negociacao
  when finalidade = 'ALUGAR' then 'ALUGUEL'::public.tipo_negociacao
  else tipo_negociacao
end
where tipo_negociacao is null;

alter table public.imoveis
  drop constraint if exists imoveis_comissao_venda_percentual_check;
alter table public.imoveis
  add constraint imoveis_comissao_venda_percentual_check
  check (
    comissao_venda_percentual is null
    or (comissao_venda_percentual >= 0 and comissao_venda_percentual <= 100)
  );

alter table public.imoveis
  drop constraint if exists imoveis_comissao_captador_percentual_check;
alter table public.imoveis
  add constraint imoveis_comissao_captador_percentual_check
  check (
    comissao_captador_percentual is null
    or (comissao_captador_percentual >= 0 and comissao_captador_percentual <= 100)
  );

alter table public.imoveis
  drop constraint if exists imoveis_comissao_vendedor_percentual_check;
alter table public.imoveis
  add constraint imoveis_comissao_vendedor_percentual_check
  check (
    comissao_vendedor_percentual is null
    or (comissao_vendedor_percentual >= 0 and comissao_vendedor_percentual <= 100)
  );

alter table public.imoveis
  drop constraint if exists imoveis_outras_comissoes_percentual_check;
alter table public.imoveis
  add constraint imoveis_outras_comissoes_percentual_check
  check (
    outras_comissoes_percentual is null
    or (outras_comissoes_percentual >= 0 and outras_comissoes_percentual <= 100)
  );

alter table public.imoveis
  drop constraint if exists imoveis_salas_nonnegative_check;
alter table public.imoveis
  add constraint imoveis_salas_nonnegative_check
  check (salas is null or salas >= 0);

alter table public.imoveis
  drop constraint if exists imoveis_cozinhas_nonnegative_check;
alter table public.imoveis
  add constraint imoveis_cozinhas_nonnegative_check
  check (cozinhas is null or cozinhas >= 0);

alter table public.imoveis
  drop constraint if exists imoveis_lateral_1_metros_nonnegative_check;
alter table public.imoveis
  add constraint imoveis_lateral_1_metros_nonnegative_check
  check (lateral_1_metros is null or lateral_1_metros >= 0);

alter table public.imoveis
  drop constraint if exists imoveis_lateral_2_metros_nonnegative_check;
alter table public.imoveis
  add constraint imoveis_lateral_2_metros_nonnegative_check
  check (lateral_2_metros is null or lateral_2_metros >= 0);

create table if not exists public.imovel_ambientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  tipo_ambiente public.tipo_ambiente_imovel not null,
  ordem int not null default 0,
  principal boolean not null default false,
  area_m2 numeric,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint imovel_ambientes_ordem_nonnegative_check check (ordem >= 0),
  constraint imovel_ambientes_area_nonnegative_check check (area_m2 is null or area_m2 >= 0),
  constraint imovel_ambientes_dados_object_check check (jsonb_typeof(dados) = 'object'),
  constraint imovel_ambientes_unique_ordem unique (imovel_id, tipo_ambiente, ordem)
);

create unique index if not exists imovel_ambientes_unique_principal_por_tipo_idx
  on public.imovel_ambientes (imovel_id, tipo_ambiente)
  where principal = true;

create index if not exists imovel_ambientes_owner_imovel_tipo_idx
  on public.imovel_ambientes (owner_id, imovel_id, tipo_ambiente, ordem);

drop trigger if exists trg_imovel_ambientes_set_updated_at on public.imovel_ambientes;
create trigger trg_imovel_ambientes_set_updated_at
before update on public.imovel_ambientes
for each row
execute function public.set_updated_at();

alter table public.imovel_ambientes enable row level security;

drop policy if exists imovel_ambientes_select_own on public.imovel_ambientes;
create policy imovel_ambientes_select_own
  on public.imovel_ambientes
  for select
  using (owner_id = auth.uid());

drop policy if exists imovel_ambientes_insert_own on public.imovel_ambientes;
create policy imovel_ambientes_insert_own
  on public.imovel_ambientes
  for insert
  with check (owner_id = auth.uid());

drop policy if exists imovel_ambientes_update_own on public.imovel_ambientes;
create policy imovel_ambientes_update_own
  on public.imovel_ambientes
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists imovel_ambientes_delete_own on public.imovel_ambientes;
create policy imovel_ambientes_delete_own
  on public.imovel_ambientes
  for delete
  using (owner_id = auth.uid());

commit;
