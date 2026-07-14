-- F70 - Artigos do corretor
-- Core de publicacao por blocos controlados, categorias de sistema e listagem publica.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'artigo_status') then
    create type public.artigo_status as enum (
      'RASCUNHO',
      'PUBLICADO',
      'ARQUIVADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'artigo_categoria') then
    create type public.artigo_categoria as enum (
      'LOCAL',
      'GUIA_COMPRA',
      'GUIA_VENDA',
      'LOCACAO',
      'INVESTIMENTO',
      'FINANCIAMENTO_DOCUMENTACAO',
      'MERCADO_IMOBILIARIO',
      'EMPREENDIMENTO',
      'DECORACAO_REFORMA',
      'INSTITUCIONAL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'artigos_ordenacao_publica') then
    create type public.artigos_ordenacao_publica as enum (
      'PUBLICACAO_DESC',
      'ATUALIZACAO_DESC',
      'MANUAL'
    );
  end if;
end $$;

create table if not exists public.artigos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status public.artigo_status not null default 'RASCUNHO',
  categoria public.artigo_categoria not null default 'MERCADO_IMOBILIARIO',
  titulo text not null,
  subtitulo text,
  resumo text,
  slug text not null,
  capa_midia_id uuid references public.midia (id) on delete set null,
  capa_url text,
  conteudo_blocos jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  tags text[] not null default '{}',
  meta_title text,
  meta_description text,
  canonical_url text,
  indexar boolean not null default true,
  leitura_minutos int not null default 1,
  ordem_manual int not null default 0,
  publicado_em timestamptz,
  arquivado_em timestamptz,

  -- Categoria LOCAL
  local_nome text,
  local_categoria text,
  local_horario_funcionamento text,
  local_website_url text,
  local_whatsapp text,
  local_telefone text,
  geolocacao_id uuid references public.geolocacoes (id) on delete set null,
  localizacao_texto text,
  local_payload jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint artigos_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artigos_titulo_len_check check (char_length(trim(titulo)) between 8 and 120),
  constraint artigos_subtitulo_len_check check (subtitulo is null or char_length(subtitulo) <= 180),
  constraint artigos_resumo_len_check check (resumo is null or char_length(resumo) <= 260),
  constraint artigos_meta_title_len_check check (meta_title is null or char_length(meta_title) <= 70),
  constraint artigos_meta_description_len_check check (meta_description is null or char_length(meta_description) <= 180),
  constraint artigos_canonical_url_len_check check (canonical_url is null or char_length(canonical_url) <= 300),
  constraint artigos_leitura_minutos_check check (leitura_minutos between 1 and 90),
  constraint artigos_owner_slug_unique unique (owner_id, slug)
);

create index if not exists artigos_owner_status_publicado_idx
  on public.artigos (owner_id, status, publicado_em desc);

create index if not exists artigos_owner_categoria_idx
  on public.artigos (owner_id, categoria);

create index if not exists artigos_owner_ordem_idx
  on public.artigos (owner_id, ordem_manual, publicado_em desc);

create table if not exists public.profile_artigos_config (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  ordenacao_publica public.artigos_ordenacao_publica not null default 'PUBLICACAO_DESC',
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.artigo_categoria_sugestoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  nome text not null,
  contexto text,
  status text not null default 'PENDENTE',
  created_at timestamptz not null default timezone('utc', now()),
  constraint artigo_categoria_sugestoes_nome_len_check check (char_length(trim(nome)) between 3 and 60),
  constraint artigo_categoria_sugestoes_status_check check (status in ('PENDENTE', 'APROVADA', 'RECUSADA'))
);

create index if not exists artigo_categoria_sugestoes_owner_created_idx
  on public.artigo_categoria_sugestoes (owner_id, created_at desc);

drop trigger if exists trg_artigos_set_updated_at on public.artigos;
create trigger trg_artigos_set_updated_at
before update on public.artigos
for each row execute function public.set_updated_at();

drop trigger if exists trg_profile_artigos_config_set_updated_at on public.profile_artigos_config;
create trigger trg_profile_artigos_config_set_updated_at
before update on public.profile_artigos_config
for each row execute function public.set_updated_at();

alter table public.artigos enable row level security;
alter table public.profile_artigos_config enable row level security;
alter table public.artigo_categoria_sugestoes enable row level security;

drop policy if exists artigos_select_own_or_public on public.artigos;
create policy artigos_select_own_or_public
  on public.artigos
  for select
  using (owner_id = auth.uid() or status = 'PUBLICADO');

drop policy if exists artigos_insert_own on public.artigos;
create policy artigos_insert_own
  on public.artigos
  for insert
  with check (owner_id = auth.uid());

drop policy if exists artigos_update_own on public.artigos;
create policy artigos_update_own
  on public.artigos
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists artigos_delete_own on public.artigos;
create policy artigos_delete_own
  on public.artigos
  for delete
  using (owner_id = auth.uid());

drop policy if exists profile_artigos_config_select_own on public.profile_artigos_config;
create policy profile_artigos_config_select_own
  on public.profile_artigos_config
  for select
  using (owner_id = auth.uid());

drop policy if exists profile_artigos_config_insert_own on public.profile_artigos_config;
create policy profile_artigos_config_insert_own
  on public.profile_artigos_config
  for insert
  with check (owner_id = auth.uid());

drop policy if exists profile_artigos_config_update_own on public.profile_artigos_config;
create policy profile_artigos_config_update_own
  on public.profile_artigos_config
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists artigo_categoria_sugestoes_select_own on public.artigo_categoria_sugestoes;
create policy artigo_categoria_sugestoes_select_own
  on public.artigo_categoria_sugestoes
  for select
  using (owner_id = auth.uid());

drop policy if exists artigo_categoria_sugestoes_insert_own on public.artigo_categoria_sugestoes;
create policy artigo_categoria_sugestoes_insert_own
  on public.artigo_categoria_sugestoes
  for insert
  with check (owner_id = auth.uid());
