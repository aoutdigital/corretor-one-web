-- F6 - Portal users relations and public/private access policies
-- Creates: user_favoritos, user_follows, user_briefings
-- Adds public read policies for published rows.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'escopo_briefing') then
    create type public.escopo_briefing as enum (
      'GERAL',
      'CORRETOR'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_uso') then
    create type public.tipo_uso as enum (
      'RESIDENCIAL',
      'COMERCIAL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_construcao') then
    create type public.tipo_construcao as enum (
      'PRONTO_USO',
      'NA_PLANTA',
      'EM_CONSTRUCAO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_negociacao') then
    create type public.tipo_negociacao as enum (
      'VENDA',
      'ALUGUEL',
      'VENDA_E_ALUGUEL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'intencao_compra') then
    create type public.intencao_compra as enum (
      'MORADIA',
      'INVESTIMENTO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_conteudo') then
    create type public.tipo_conteudo as enum (
      'IMOVEL',
      'EMPREENDIMENTO',
      'ARTIGO',
      'NEWSLETTER'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'caracteristica_comercial') then
    create type public.caracteristica_comercial as enum (
      'PROX_METRO',
      'ALTA_CIRCULACAO',
      'FRENTE_RUA',
      'ESTACIONAMENTO',
      'PISO_ELEVADO',
      'AR_CONDICIONADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'caracteristica_imovel') then
    create type public.caracteristica_imovel as enum (
      'CONEXAO_A_INTERNET',
      'AMBIENTES_INTEGRADOS',
      'ANDAR_INTEIRO',
      'AQUARIO',
      'AREA_DE_SERVICO',
      'ARMARIO_EMBUTIDO_NO_QUARTO',
      'ARMARIO_NA_COZINHA',
      'ARMARIO_NO_BANHEIRO',
      'BANHEIRA',
      'BANHEIRO_DE_SERVICO',
      'BAR',
      'BOX_BLINDEX',
      'CARPETE',
      'CASA_DE_CASEIRO',
      'CASA_DE_FUNDO',
      'CASA_SEDE',
      'CHURRASQUEIRA_NA_VARANDA',
      'CHUVEIRO_A_GAS',
      'CIMENTO_QUEIMADO',
      'COPA',
      'COZINHA_GOURMET',
      'COZINHA_GRANDE',
      'DEPENDENCIA_DE_EMPREGADOS',
      'DEPOSITO',
      'DESPENSA',
      'DRYWALL',
      'EDICULA',
      'ESCADA',
      'ESCRITORIO',
      'FOGAO',
      'FORNO_DE_PIZZA',
      'FREEZER',
      'GEMINADA',
      'GESSO_SANCA_TETO_REBAIXADO',
      'HIDROMASSAGEM',
      'IMOVEL_DE_ESQUINA',
      'INTERFONE',
      'ISOLAMENTO_ACUSTICO',
      'ISOLAMENTO_TERMICO',
      'JANELA_DE_ALUMINIO',
      'JANELA_GRANDE',
      'LAJE',
      'MEIO_ANDAR',
      'MEZANINO',
      'MOVEL_PLANEJADO',
      'MURO_DE_VIDRO',
      'MURO_E_GRADE',
      'OFURO',
      'PE_DIREITO_ALTO',
      'PISCINA_PRIVATIVA',
      'PISO_DE_MADEIRA',
      'PISO_ELEVADO',
      'PISO_FRIO',
      'PISO_LAMINADO',
      'PISO_VINILICO',
      'PLATIBANDA',
      'PORCELANATO',
      'POSSUI_DIVISORIA',
      'QUARTO_DE_SERVICO',
      'QUARTO_EXTRA_REVERSIVEL',
      'QUINTAL',
      'SALA_DE_ALMOCO',
      'SALA_DE_JANTAR',
      'SALA_GRANDE',
      'SALA_PEQUENA',
      'TV_A_CABO',
      'VARANDA',
      'VARANDA_FECHADA_COM_VIDRO',
      'VENTILACAO_NATURAL',
      'VISTA_PARA_O_MAR',
      'VISTA_PANORAMICA',
      'VISTA_PARA_A_MONTANHA',
      'VISTA_PARA_LAGO',
      'ACEITA_ANIMAIS',
      'AR_CONDICIONADO',
      'CLOSET',
      'COZINHA_AMERICANA',
      'LAREIRA',
      'MOBILIADO',
      'VARANDA_GOURMET'
    );
  end if;
end $$;

create table if not exists public.user_favoritos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.portal_users (id) on delete cascade,
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.portal_users (id) on delete cascade,
  corretor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_follows_user_corretor_unique unique (user_id, corretor_id)
);

create table if not exists public.user_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.portal_users (id) on delete cascade,
  escopo public.escopo_briefing not null,
  corretor_id uuid references public.profiles (id) on delete cascade,
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
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_briefings_escopo_corretor_check check (
    (escopo = 'GERAL' and corretor_id is null)
    or (escopo = 'CORRETOR' and corretor_id is not null)
  )
);

create index if not exists user_favoritos_user_id_idx on public.user_favoritos (user_id);
create index if not exists user_favoritos_imovel_id_idx on public.user_favoritos (imovel_id);

create index if not exists user_follows_user_id_idx on public.user_follows (user_id);
create index if not exists user_follows_corretor_id_idx on public.user_follows (corretor_id);

create index if not exists user_briefings_user_id_idx on public.user_briefings (user_id);
create index if not exists user_briefings_corretor_id_idx on public.user_briefings (corretor_id);

create unique index if not exists user_briefings_user_geral_unique
  on public.user_briefings (user_id, escopo)
  where escopo = 'GERAL';

create unique index if not exists user_briefings_user_corretor_unique
  on public.user_briefings (user_id, corretor_id)
  where escopo = 'CORRETOR' and corretor_id is not null;

drop trigger if exists trg_user_briefings_set_updated_at on public.user_briefings;
create trigger trg_user_briefings_set_updated_at
before update on public.user_briefings
for each row
execute function public.set_updated_at();

alter table public.user_favoritos enable row level security;
alter table public.user_follows enable row level security;
alter table public.user_briefings enable row level security;

drop policy if exists user_favoritos_select_own on public.user_favoritos;
create policy user_favoritos_select_own
  on public.user_favoritos
  for select
  using (user_id = auth.uid());

drop policy if exists user_favoritos_insert_own on public.user_favoritos;
create policy user_favoritos_insert_own
  on public.user_favoritos
  for insert
  with check (user_id = auth.uid());

drop policy if exists user_favoritos_update_own on public.user_favoritos;
create policy user_favoritos_update_own
  on public.user_favoritos
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_favoritos_delete_own on public.user_favoritos;
create policy user_favoritos_delete_own
  on public.user_favoritos
  for delete
  using (user_id = auth.uid());

drop policy if exists user_follows_select_own on public.user_follows;
create policy user_follows_select_own
  on public.user_follows
  for select
  using (user_id = auth.uid());

drop policy if exists user_follows_insert_own on public.user_follows;
create policy user_follows_insert_own
  on public.user_follows
  for insert
  with check (user_id = auth.uid());

drop policy if exists user_follows_update_own on public.user_follows;
create policy user_follows_update_own
  on public.user_follows
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_follows_delete_own on public.user_follows;
create policy user_follows_delete_own
  on public.user_follows
  for delete
  using (user_id = auth.uid());

drop policy if exists user_briefings_select_own on public.user_briefings;
create policy user_briefings_select_own
  on public.user_briefings
  for select
  using (user_id = auth.uid());

drop policy if exists user_briefings_insert_own on public.user_briefings;
create policy user_briefings_insert_own
  on public.user_briefings
  for insert
  with check (user_id = auth.uid());

drop policy if exists user_briefings_update_own on public.user_briefings;
create policy user_briefings_update_own
  on public.user_briefings
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_briefings_delete_own on public.user_briefings;
create policy user_briefings_delete_own
  on public.user_briefings
  for delete
  using (user_id = auth.uid());

-- Public read policies for portal routes (published/active only)
drop policy if exists profiles_public_read_active on public.profiles;
create policy profiles_public_read_active
  on public.profiles
  for select
  using (
    status = 'ATIVO'::public.status_usuario
    and nickname is not null
  );

drop policy if exists imoveis_public_read_published on public.imoveis;
create policy imoveis_public_read_published
  on public.imoveis
  for select
  using (status = 'PUBLICADO'::public.status_imovel);

drop policy if exists empreendimentos_public_read_published on public.empreendimentos;
create policy empreendimentos_public_read_published
  on public.empreendimentos
  for select
  using (status = 'PUBLICADO'::public.status_empreendimento);

