-- F4 - Geolocations, Imoveis, Empreendimentos (backend base)
-- Source: docs/data-model.md + docs/enums.md

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_imovel') then
    create type public.tipo_imovel as enum (
      'APARTAMENTO',
      'CASA',
      'CASA_DE_CONDOMINIO',
      'CASA_DE_VILA',
      'COBERTURA',
      'CASA_COMERCIAL',
      'ESCRITORIO',
      'FAZENDA_SITIO_CHACARA',
      'FLAT',
      'GALPAO_DEPOSITO_ARMAZEM',
      'GARAGEM',
      'KITNET_CONJUGADO',
      'HOTEL_MOTEL_POUSADA',
      'LOFT',
      'LOTE_TERRENO',
      'PONTO_COMERCIAL_LOJA_BOX',
      'PREDIO_EDIFICIO_INTEIRO',
      'STUDIO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subtipo_imovel') then
    create type public.subtipo_imovel as enum (
      'COBERTURA',
      'DUPLEX',
      'TRIPLEX',
      'GARDEN',
      'LOFT',
      'CONJUNTO_COMERCIAL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_imovel') then
    create type public.status_imovel as enum (
      'RASCUNHO',
      'PUBLICADO',
      'PAUSADO',
      'VENDIDO',
      'ALUGADO',
      'INATIVO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'periodicidade') then
    create type public.periodicidade as enum (
      'MENSAL',
      'ANUAL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vaga_tamanho') then
    create type public.vaga_tamanho as enum (
      'PEQUENA',
      'MEDIA',
      'GRANDE'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vaga_cobertura') then
    create type public.vaga_cobertura as enum (
      'COBERTA',
      'DESCOBERTA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vaga_tipo') then
    create type public.vaga_tipo as enum (
      'PRIVATIVA',
      'LIVRE'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_vista') then
    create type public.tipo_vista as enum (
      'LIVRE',
      'PARQUE',
      'CIDADE',
      'MAR',
      'VERDE'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_conservacao') then
    create type public.estado_conservacao as enum (
      'NOVO',
      'REFORMADO',
      'BOM',
      'A_REFORMAR'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'origem_imovel') then
    create type public.origem_imovel as enum (
      'MANUAL',
      'IMPORTACAO',
      'INTEGRACAO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fase_empreendimento') then
    create type public.fase_empreendimento as enum (
      'NA_PLANTA',
      'EM_CONSTRUCAO',
      'ENTREGUE'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estagio_obra') then
    create type public.estagio_obra as enum (
      'FUNDACAO',
      'ESTRUTURA',
      'ALVENARIA',
      'INSTALACOES',
      'ACABAMENTO',
      'FINALIZACAO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_empreendimento') then
    create type public.status_empreendimento as enum (
      'RASCUNHO',
      'PUBLICADO',
      'PAUSADO',
      'INATIVO'
    );
  end if;
end $$;

create table if not exists public.geolocacoes (
  id uuid primary key default gen_random_uuid(),
  place_id text unique,
  address_json jsonb not null,
  logradouro text,
  numero text,
  bairro text,
  cidade text,
  uf public.uf,
  cep text,
  lat numeric,
  lng numeric,
  endereco_formatado text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists geolocacoes_cidade_idx on public.geolocacoes (cidade);
create index if not exists geolocacoes_uf_idx on public.geolocacoes (uf);
create index if not exists geolocacoes_bairro_idx on public.geolocacoes (bairro);
create index if not exists geolocacoes_place_id_idx on public.geolocacoes (place_id);

drop trigger if exists trg_geolocacoes_set_updated_at on public.geolocacoes;
create trigger trg_geolocacoes_set_updated_at
before update on public.geolocacoes
for each row
execute function public.set_updated_at();

create table if not exists public.empreendimentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  imobiliaria_id uuid,
  slug_publico text not null,
  nome text not null,
  descricao text,
  geolocacao_id uuid not null references public.geolocacoes (id),
  logradouro text not null,
  numero text not null,
  bairro text not null,
  cidade text not null,
  estado public.uf not null,
  cep text,
  lat numeric,
  lng numeric,
  address_json jsonb,
  fase public.fase_empreendimento not null default 'ENTREGUE',
  previsao_entrega_em date,
  estagio_obra public.estagio_obra,
  ano_construcao int,
  n_torres int,
  n_andares int,
  n_unidades int,
  construtora text,
  incorporadora text,
  administradora text,
  caracteristicas text[],
  status public.status_empreendimento not null default 'RASCUNHO',
  publicado_em timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint empreendimentos_owner_slug_unique unique (owner_id, slug_publico)
);

create index if not exists empreendimentos_owner_id_idx on public.empreendimentos (owner_id);
create index if not exists empreendimentos_status_idx on public.empreendimentos (status);
create index if not exists empreendimentos_estado_cidade_idx on public.empreendimentos (estado, cidade);

drop trigger if exists trg_empreendimentos_set_updated_at on public.empreendimentos;
create trigger trg_empreendimentos_set_updated_at
before update on public.empreendimentos
for each row
execute function public.set_updated_at();

create table if not exists public.imoveis (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  imobiliaria_id uuid,
  empreendimento_id uuid references public.empreendimentos (id) on delete set null,
  codigo text not null,
  slug_publico text not null,
  titulo text not null,
  descricao text not null,
  descricao_curta text,
  finalidade public.finalidade not null,
  tipo public.tipo_imovel not null,
  subtipo public.subtipo_imovel,
  status public.status_imovel not null default 'RASCUNHO',
  exclusividade boolean not null default false,
  destaque boolean not null default false,
  preco_venda numeric,
  preco_locacao numeric,
  valor_m2 numeric,
  condominio numeric,
  iptu numeric,
  iptu_periodicidade public.periodicidade,
  aceita_permuta boolean not null default false,
  financiavel boolean not null default true,
  area_util numeric,
  area_total numeric,
  area_terreno numeric,
  frente_metros numeric,
  fundos_metros numeric,
  dormitorios int,
  suites int,
  banheiros int,
  lavabos int,
  vagas int,
  vaga_tamanhos public.vaga_tamanho[],
  vaga_coberturas public.vaga_cobertura[],
  vaga_tipos public.vaga_tipo[],
  andar int,
  ultimo_andar boolean not null default false,
  unidade_numero text,
  ano_construcao int,
  geolocacao_id uuid not null references public.geolocacoes (id),
  logradouro text not null,
  numero text not null,
  bairro text not null,
  cidade text not null,
  cep text,
  bairro_comercial boolean not null default false,
  estado public.uf not null,
  lat numeric,
  lng numeric,
  address_json jsonb not null,
  endereco_complemento text,
  ocultar_numero_publico boolean not null default false,
  usar_midias_empreendimento boolean not null default true,
  usar_caracteristicas_empreendimento boolean not null default true,
  caracteristicas text[],
  vista public.tipo_vista,
  estado_conservacao public.estado_conservacao,
  placa_no_local boolean not null default false,
  chaves_na_mao boolean not null default false,
  permite_visita_imediata boolean not null default false,
  origem_cadastro public.origem_imovel not null default 'MANUAL',
  integracao_externa_id text,
  publicado_em timestamptz,
  meta_title text,
  meta_description text,
  indexar_google boolean not null default true,
  views_count int not null default 0,
  favoritos_count int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint imoveis_owner_codigo_unique unique (owner_id, codigo),
  constraint imoveis_owner_slug_unique unique (owner_id, slug_publico)
);

create index if not exists imoveis_owner_id_idx on public.imoveis (owner_id);
create index if not exists imoveis_status_idx on public.imoveis (status);
create index if not exists imoveis_finalidade_idx on public.imoveis (finalidade);
create index if not exists imoveis_tipo_idx on public.imoveis (tipo);
create index if not exists imoveis_cidade_idx on public.imoveis (cidade);
create index if not exists imoveis_bairro_idx on public.imoveis (bairro);
create index if not exists imoveis_preco_venda_idx on public.imoveis (preco_venda);
create index if not exists imoveis_preco_locacao_idx on public.imoveis (preco_locacao);

drop trigger if exists trg_imoveis_set_updated_at on public.imoveis;
create trigger trg_imoveis_set_updated_at
before update on public.imoveis
for each row
execute function public.set_updated_at();

alter table public.empreendimentos enable row level security;
alter table public.imoveis enable row level security;

drop policy if exists empreendimentos_select_own on public.empreendimentos;
create policy empreendimentos_select_own
  on public.empreendimentos
  for select
  using (owner_id = auth.uid());

drop policy if exists empreendimentos_insert_own on public.empreendimentos;
create policy empreendimentos_insert_own
  on public.empreendimentos
  for insert
  with check (owner_id = auth.uid());

drop policy if exists empreendimentos_update_own on public.empreendimentos;
create policy empreendimentos_update_own
  on public.empreendimentos
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists empreendimentos_delete_own on public.empreendimentos;
create policy empreendimentos_delete_own
  on public.empreendimentos
  for delete
  using (owner_id = auth.uid());

drop policy if exists imoveis_select_own on public.imoveis;
create policy imoveis_select_own
  on public.imoveis
  for select
  using (owner_id = auth.uid());

drop policy if exists imoveis_insert_own on public.imoveis;
create policy imoveis_insert_own
  on public.imoveis
  for insert
  with check (owner_id = auth.uid());

drop policy if exists imoveis_update_own on public.imoveis;
create policy imoveis_update_own
  on public.imoveis
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists imoveis_delete_own on public.imoveis;
create policy imoveis_delete_own
  on public.imoveis
  for delete
  using (owner_id = auth.uid());

