-- F15 - Catálogo unificado de características + relações N:N + mapeamentos de integração
-- Fonte: docs/templates/01_caracteristicas_catalogo_enriquecido.csv
-- Regra: catálogo único para IMÓVEL e EMPREENDIMENTO, com filtros por escopo e tipo_uso.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'caracteristica_escopo') then
    create type public.caracteristica_escopo as enum ('IMOVEL', 'EMPREENDIMENTO');
  end if;
end $$;

create table if not exists public.caracteristicas_catalogo (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  label_pt text not null,
  escopos public.caracteristica_escopo[] not null,
  tipos_uso public.tipo_uso[] not null,
  categoria_empreendimento text,
  subcategoria_imovel text,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint caracteristicas_catalogo_chave_check check (chave ~ '^[A-Z0-9_]+$'),
  constraint caracteristicas_catalogo_escopos_not_empty check (coalesce(array_length(escopos, 1), 0) > 0),
  constraint caracteristicas_catalogo_tipos_uso_not_empty check (coalesce(array_length(tipos_uso, 1), 0) > 0)
);

create index if not exists caracteristicas_catalogo_label_idx
  on public.caracteristicas_catalogo (lower(label_pt));

create index if not exists caracteristicas_catalogo_escopos_gin_idx
  on public.caracteristicas_catalogo using gin (escopos);

create index if not exists caracteristicas_catalogo_tipos_uso_gin_idx
  on public.caracteristicas_catalogo using gin (tipos_uso);

create index if not exists caracteristicas_catalogo_cat_empreendimento_idx
  on public.caracteristicas_catalogo (categoria_empreendimento, lower(label_pt));

create index if not exists caracteristicas_catalogo_subcat_imovel_idx
  on public.caracteristicas_catalogo (subcategoria_imovel, lower(label_pt));

drop trigger if exists trg_caracteristicas_catalogo_set_updated_at on public.caracteristicas_catalogo;
create trigger trg_caracteristicas_catalogo_set_updated_at
before update on public.caracteristicas_catalogo
for each row
execute function public.set_updated_at();

alter table public.caracteristicas_catalogo enable row level security;

drop policy if exists caracteristicas_catalogo_select_authenticated on public.caracteristicas_catalogo;
create policy caracteristicas_catalogo_select_authenticated
  on public.caracteristicas_catalogo
  for select
  using (auth.role() = 'authenticated');

-- Relação N:N para imóveis
create table if not exists public.imovel_caracteristicas (
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  caracteristica_id uuid not null references public.caracteristicas_catalogo (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (imovel_id, caracteristica_id)
);

create index if not exists imovel_caracteristicas_caracteristica_idx
  on public.imovel_caracteristicas (caracteristica_id);

alter table public.imovel_caracteristicas enable row level security;

drop policy if exists imovel_caracteristicas_select_own on public.imovel_caracteristicas;
create policy imovel_caracteristicas_select_own
  on public.imovel_caracteristicas
  for select
  using (
    exists (
      select 1
      from public.imoveis i
      where i.id = imovel_caracteristicas.imovel_id
        and i.owner_id = auth.uid()
    )
  );

drop policy if exists imovel_caracteristicas_insert_own on public.imovel_caracteristicas;
create policy imovel_caracteristicas_insert_own
  on public.imovel_caracteristicas
  for insert
  with check (
    exists (
      select 1
      from public.imoveis i
      where i.id = imovel_caracteristicas.imovel_id
        and i.owner_id = auth.uid()
    )
  );

drop policy if exists imovel_caracteristicas_delete_own on public.imovel_caracteristicas;
create policy imovel_caracteristicas_delete_own
  on public.imovel_caracteristicas
  for delete
  using (
    exists (
      select 1
      from public.imoveis i
      where i.id = imovel_caracteristicas.imovel_id
        and i.owner_id = auth.uid()
    )
  );

-- Relação N:N para empreendimentos
create table if not exists public.empreendimento_caracteristicas (
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  caracteristica_id uuid not null references public.caracteristicas_catalogo (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (empreendimento_id, caracteristica_id)
);

create index if not exists empreendimento_caracteristicas_caracteristica_idx
  on public.empreendimento_caracteristicas (caracteristica_id);

alter table public.empreendimento_caracteristicas enable row level security;

drop policy if exists empreendimento_caracteristicas_select_own on public.empreendimento_caracteristicas;
create policy empreendimento_caracteristicas_select_own
  on public.empreendimento_caracteristicas
  for select
  using (
    exists (
      select 1
      from public.empreendimentos e
      where e.id = empreendimento_caracteristicas.empreendimento_id
        and e.owner_id = auth.uid()
    )
  );

drop policy if exists empreendimento_caracteristicas_insert_own on public.empreendimento_caracteristicas;
create policy empreendimento_caracteristicas_insert_own
  on public.empreendimento_caracteristicas
  for insert
  with check (
    exists (
      select 1
      from public.empreendimentos e
      where e.id = empreendimento_caracteristicas.empreendimento_id
        and e.owner_id = auth.uid()
    )
  );

drop policy if exists empreendimento_caracteristicas_delete_own on public.empreendimento_caracteristicas;
create policy empreendimento_caracteristicas_delete_own
  on public.empreendimento_caracteristicas
  for delete
  using (
    exists (
      select 1
      from public.empreendimentos e
      where e.id = empreendimento_caracteristicas.empreendimento_id
        and e.owner_id = auth.uid()
    )
  );

-- Catálogo de provedores de integração (para mapeamentos XML/JSON)
create table if not exists public.integracao_provedores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  formato text not null default 'XML',
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integracao_provedores_codigo_check check (codigo ~ '^[A-Z0-9_]+$')
);

drop trigger if exists trg_integracao_provedores_set_updated_at on public.integracao_provedores;
create trigger trg_integracao_provedores_set_updated_at
before update on public.integracao_provedores
for each row
execute function public.set_updated_at();

alter table public.integracao_provedores enable row level security;

drop policy if exists integracao_provedores_select_authenticated on public.integracao_provedores;
create policy integracao_provedores_select_authenticated
  on public.integracao_provedores
  for select
  using (auth.role() = 'authenticated');

-- Mapeamentos por provedor (ex.: label/field de XML por característica)
create table if not exists public.caracteristica_mapeamentos_provedor (
  id uuid primary key default gen_random_uuid(),
  caracteristica_id uuid not null references public.caracteristicas_catalogo (id) on delete cascade,
  provedor_id uuid not null references public.integracao_provedores (id) on delete cascade,
  external_key text,
  external_label text,
  xml_path text,
  valor_verdadeiro text,
  valor_falso text,
  transformacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (caracteristica_id, provedor_id)
);

create index if not exists caracteristica_mapeamentos_provedor_provedor_idx
  on public.caracteristica_mapeamentos_provedor (provedor_id, ativo);

drop trigger if exists trg_caracteristica_mapeamentos_provedor_set_updated_at on public.caracteristica_mapeamentos_provedor;
create trigger trg_caracteristica_mapeamentos_provedor_set_updated_at
before update on public.caracteristica_mapeamentos_provedor
for each row
execute function public.set_updated_at();

alter table public.caracteristica_mapeamentos_provedor enable row level security;

drop policy if exists caracteristica_mapeamentos_provedor_select_authenticated on public.caracteristica_mapeamentos_provedor;
create policy caracteristica_mapeamentos_provedor_select_authenticated
  on public.caracteristica_mapeamentos_provedor
  for select
  using (auth.role() = 'authenticated');

-- Seed base de provedores
insert into public.integracao_provedores (codigo, nome, formato, ativo)
values
  ('ZAP', 'Zap Imóveis', 'XML', true),
  ('IMOVELWEB', 'Imovelweb', 'XML', true),
  ('CHAVES_NA_MAO', 'Chaves na Mão', 'XML', true)
on conflict (codigo) do update
set
  nome = excluded.nome,
  formato = excluded.formato,
  ativo = excluded.ativo;

-- Seed de catálogo de características (todas as linhas do CSV aprovado)
insert into public.caracteristicas_catalogo (
  chave,
  label_pt,
  escopos,
  tipos_uso,
  categoria_empreendimento,
  subcategoria_imovel,
  ativo
)
values
  (
    'ACADEMIA',
    'Academia',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'ACEITA_ANIMAIS',
    'Aceita animais',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lifestyle',
    'Pets',
    true
  ),
  (
    'ACESSO_PCD',
    'Acesso para deficientes',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'AMBIENTES_INTEGRADOS',
    'Ambientes integrados',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'ANDAR_INTEIRO',
    'Andar inteiro',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'AQUARIO',
    'Aquário',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'AR_CONDICIONADO',
    'Ar-condicionado',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'AREA_LAZER',
    'Área de lazer',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Empreendimento',
    'Residencial',
    true
  ),
  (
    'AREA_SERVICO',
    'Área de serviço',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'ARMARIO_QUARTO',
    'Armário embutido no quarto',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'ARMARIO_COZINHA',
    'Armário na cozinha',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'ARMARIO_BANHEIRO',
    'Armário no banheiro',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'ARVORE_FRUTIFERA',
    'Árvore frutífera',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'ARVORISMO',
    'Arvorismo',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'BANHEIRA',
    'Banheira',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'BANHEIRO_SERVICO',
    'Banheiro de serviço',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'BAR',
    'Bar',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'BAR_PISCINA',
    'Bar na piscina',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'BIBLIOTECA',
    'Biblioteca',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'BICICLETARIO',
    'Bicicletário',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'BOX_BLINDEX',
    'Box blindex',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'BRINQUEDOTECA',
    'Brinquedoteca',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Empreendimento',
    'Residencial',
    true
  ),
  (
    'CAMERA_SEGURANCA',
    'Câmera de segurança',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'CAMPO_FUTEBOL',
    'Campo de futebol',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'CAMPO_GOLFE',
    'Campo de golfe',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'CANIL',
    'Canil',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lifestyle',
    'Pets',
    true
  ),
  (
    'CARPETE',
    'Carpete',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'CASA_CASEIRO',
    'Casa de caseiro',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Rural',
    'Estrutura',
    true
  ),
  (
    'CASA_FUNDO',
    'Casa de fundo',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Rural',
    'Estrutura',
    true
  ),
  (
    'CASA_SEDE',
    'Casa sede',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Rural',
    'Estrutura',
    true
  ),
  (
    'CELEIRO',
    'Celeiro',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Rural',
    'Estrutura',
    true
  ),
  (
    'CENTRO_ESTETICA',
    'Centro de estética',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'CERCA',
    'Cerca',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'CHILDREN_CARE',
    'Children care',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'CHURRASQUEIRA',
    'Churrasqueira',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'CHURRASQUEIRA_VARANDA',
    'Churrasqueira na varanda',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'CHUVEIRO_GAS',
    'Chuveiro a gás',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'CIMENTO_QUEIMADO',
    'Cimento queimado',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'CINEMA',
    'Cinema',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['COMERCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'CLOSET',
    'Closet',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'COBERTURA_COLETIVA',
    'Cobertura coletiva',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Empreendimento',
    'Residencial',
    true
  ),
  (
    'COFFE_SHOP',
    'Coffee shop',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Empreendimento',
    'Comercial',
    true
  ),
  (
    'CONDOMINIO_FECHADO',
    'Condomínio fechado',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'INTERNET',
    'Conexão à internet',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Tecnologia',
    'Conectividade',
    true
  ),
  (
    'COPA',
    'Copa',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'COWORKING',
    'Coworking',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'COZINHA_AMERICANA',
    'Cozinha americana',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'COZINHA_GOURMET',
    'Cozinha gourmet',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'COZINHA_GRANDE',
    'Cozinha grande',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'CURRAL',
    'Curral',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Rural',
    'Estrutura',
    true
  ),
  (
    'DECK',
    'Deck',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'DEPENDENCIA_EMPREGADOS',
    'Dependência de empregados',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'DEPOSITO',
    'Depósito',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'DESPENSA',
    'Despensa',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'DRYWALL',
    'Drywall',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'EDICULA',
    'Edícula',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'ELEVADOR',
    'Elevador',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'ENTRADA_SERVICO',
    'Entrada de serviço',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'ENTRADA_LATERAL',
    'Entrada lateral',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'ESCADA',
    'Escada',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'ESCRITORIO',
    'Escritório',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'ESPACO_GOURMET',
    'Espaço gourmet',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'ESPACO_PET',
    'Espaço Pet',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'ESPACO_TEEN',
    'Espaço teen',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'ESPACO_VERDE',
    'Espaço verde / Parque',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'ESPACO_ZEN',
    'Espaço zen',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'ESTACIONAMENTO_VISITANTES',
    'Estacionamento para visitantes',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'FOGAO',
    'Fogão',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'FORNO_PIZZA',
    'Forno de pizza',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'FREEZER',
    'Freezer',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'GEMINADA',
    'Geminada',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'GERADOR',
    'Gerador elétrico',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'GESSO',
    'Gesso - Sanca - Teto Rebaixado',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'GRAMADO',
    'Gramado',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'GUARITA',
    'Guarita',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'HALL',
    'Hall de entrada',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Empreendimento',
    'Comercial',
    true
  ),
  (
    'HELIPONTO',
    'Heliponto',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'HIDROMASSAGEM',
    'Hidromassagem',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'HORTA',
    'Horta',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'IMOVEL_ESQUINA',
    'Imóvel de esquina',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'INTERFONE',
    'Interfone',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'ISOLAMENTO_ACUSTICO',
    'Isolamento acústico',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'ISOLAMENTO_TERMICO',
    'Isolamento térmico',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'JANELA_ALUMINIO',
    'Janela de alumínio',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'JANELA_GRANDE',
    'Janela grande',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'JARDIM',
    'Jardim',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'LAGO',
    'Lago',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'LAJE',
    'Laje',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'LAREIRA',
    'Lareira',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'LAVANDERIA',
    'Lavanderia',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'MARINA',
    'Marina',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'MEIO_ANDAR',
    'Meio andar',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'MEZANINO',
    'Mezanino',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'MOBILIADO',
    'Mobiliado',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'MOVEL_PLANEJADO',
    'Móvel planejado',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'MURO_ESCALADA',
    'Muro de escalada',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Empreendimento',
    'Residencial',
    true
  ),
  (
    'MURO_VIDRO',
    'Muro de vidro',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'MURO_GRADE',
    'Muro e grade',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'OFURO',
    'Ofurô',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'ORQUIDARIO',
    'Orquidário',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'PASTO',
    'Pasto',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'PE_DIREITO_ALTO',
    'Pé direito alto',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'PISCINA',
    'Piscina',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'PISCINA_AQUECIDA',
    'Piscina aquecida',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'PISCINA_COBERTA',
    'Piscina coberta',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'PISCINA_INFANTIL',
    'Piscina infantil',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'PISCINA_ADULTO',
    'Piscina para adulto',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'PISCINA_PRIVATIVA',
    'Piscina privativa',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'PISO_MADEIRA',
    'Piso de madeira',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'PISO_ELEVADO',
    'Piso elevado',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'PISO_FRIO',
    'Piso frio',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'PISO_LAMINADO',
    'Piso laminado',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'PISO_VINILICO',
    'Piso vinílico',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'PISTA_COOPER',
    'Pista de cooper',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'PISTA_SKATE',
    'Pista de skate',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'PLATIBANDA',
    'Platibanda',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'PLAYGROUND',
    'Playground',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Geral',
    'Outros',
    true
  ),
  (
    'POCO',
    'Poço',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Rural',
    'Estrutura',
    true
  ),
  (
    'POCO_ARTESIANO',
    'Poço artesiano',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Rural',
    'Estrutura',
    true
  ),
  (
    'POMAR',
    'Pomar',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'PISO_PORCELANATO',
    'Porcelanato',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'PORTAO_ELETRONICO',
    'Portão eletrônico',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'PORTARIA_24H',
    'Portaria 24h',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'POSSUI_DIVISORIA',
    'Possui divisória',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Comercial',
    true
  ),
  (
    'PRACA',
    'Praça',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'QUADRA_SQUASH',
    'Quadra de squash',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'QUADRA_TENIS',
    'Quadra de tênis',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'QUADRA_POLIESPORTIVA',
    'Quadra poliesportiva',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Esporte',
    true
  ),
  (
    'QUARTO_SERVICO',
    'Quarto de serviço',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'QUARTO_EXTRA_REVERSIVEL',
    'Quarto extra reversível',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'QUINTAL',
    'Quintal',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Residencial',
    true
  ),
  (
    'RECEPCAO',
    'Recepção',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Infraestrutura',
    'Operação',
    true
  ),
  (
    'REDARIO',
    'Redario',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'RESERVATORIO_AGUA',
    'Reservatório de água',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'RESTAURANTE',
    'Restaurante',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'RIO',
    'Rio',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'RONDA_VIGILANCIA',
    'Ronda/Vigilância',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'SALA_ALMOCO',
    'Sala de almoço',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'SALA_JANTAR',
    'Sala de jantar',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'SALA_MASSAGEM',
    'Sala de massagem',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'SALA_REUNIAO',
    'Sala de reunião',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'SALA_GRANDE',
    'Sala grande',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'SALA_PEQUENA',
    'Sala pequena',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'SALA_CONVENCAO',
    'Salão de convenção',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Ambientes',
    true
  ),
  (
    'SALAO_FESTAS',
    'Salão de festas',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'SALAO_JOGOS',
    'Salão de jogos',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'SAUNA',
    'Sauna',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'SERVICOS_PPU',
    'Serviços pay per use',
    array['EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Serviços',
    'Conveniência',
    true
  ),
  (
    'SISTEMA_ALARME',
    'Sistema de alarme',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'SOLARIUM',
    'Solarium',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'SPA',
    'Spa',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Lazer',
    'Água e bem-estar',
    true
  ),
  (
    'TV_CABO',
    'TV a cabo',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Tecnologia',
    'Conectividade',
    true
  ),
  (
    'VARANDA',
    'Varanda',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'VARANDA_FECHADO_VIDRO',
    'Varanda fechada com vidro',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'VARANDA_GOURMET',
    'Varanda gourmet',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'VENTILACAO_NATURAL',
    'Ventilação natural',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Imóvel',
    'Acabamentos e conforto',
    true
  ),
  (
    'VESTIARIO_DIARISTAS',
    'Vestiário para diaristas',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'VIGIA',
    'Vigia',
    array['IMOVEL', 'EMPREENDIMENTO']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Segurança',
    'Controle de acesso',
    true
  ),
  (
    'VISTA_PANORAMICA',
    'Vista panorâmica',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'VISTA_MONTANHA',
    'Vista para a montanha',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'VISTA_LAGO',
    'Vista para lago',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  ),
  (
    'VISTA_MAR',
    'Vista para o mar',
    array['IMOVEL']::public.caracteristica_escopo[],
    array['RESIDENCIAL', 'COMERCIAL']::public.tipo_uso[],
    'Ambiente',
    'Natureza e vista',
    true
  )
on conflict (chave) do update
set
  label_pt = excluded.label_pt,
  escopos = excluded.escopos,
  tipos_uso = excluded.tipos_uso,
  categoria_empreendimento = excluded.categoria_empreendimento,
  subcategoria_imovel = excluded.subcategoria_imovel,
  ativo = excluded.ativo;

commit;
