-- F45 - Preenchimento de aplicabilidade (tipo/subtipo) para características de imóveis

begin;

-- 1) Baseline por tipo_uso para escopo IMOVEL.
-- Mantém o catálogo pronto para filtros por tipo e evita ruído grosseiro.
update public.caracteristicas_catalogo c
set
  tipos_imovel = case
    -- Apenas residencial
    when c.tipos_uso @> array['RESIDENCIAL']::public.tipo_uso[]
      and not (c.tipos_uso @> array['COMERCIAL']::public.tipo_uso[])
      then array[
        'APARTAMENTO',
        'CASA',
        'CASA_DE_CONDOMINIO',
        'CASA_DE_VILA',
        'COBERTURA',
        'FAZENDA_SITIO_CHACARA',
        'FLAT',
        'KITNET_CONJUGADO',
        'LOFT',
        'LOTE_TERRENO',
        'STUDIO'
      ]::public.tipo_imovel[]

    -- Apenas comercial
    when c.tipos_uso @> array['COMERCIAL']::public.tipo_uso[]
      and not (c.tipos_uso @> array['RESIDENCIAL']::public.tipo_uso[])
      then array[
        'CASA_COMERCIAL',
        'ESCRITORIO',
        'GALPAO_DEPOSITO_ARMAZEM',
        'GARAGEM',
        'HOTEL_MOTEL_POUSADA',
        'LOTE_TERRENO',
        'PONTO_COMERCIAL_LOJA_BOX',
        'PREDIO_EDIFICIO_INTEIRO',
        'SHOPPING',
        'SELF_STORAGE'
      ]::public.tipo_imovel[]

    -- Residencial + comercial
    else array[
      'APARTAMENTO',
      'CASA',
      'CASA_DE_CONDOMINIO',
      'CASA_DE_VILA',
      'COBERTURA',
      'FAZENDA_SITIO_CHACARA',
      'FLAT',
      'KITNET_CONJUGADO',
      'LOFT',
      'LOTE_TERRENO',
      'STUDIO',
      'CASA_COMERCIAL',
      'ESCRITORIO',
      'GALPAO_DEPOSITO_ARMAZEM',
      'GARAGEM',
      'HOTEL_MOTEL_POUSADA',
      'PONTO_COMERCIAL_LOJA_BOX',
      'PREDIO_EDIFICIO_INTEIRO',
      'SHOPPING',
      'SELF_STORAGE'
    ]::public.tipo_imovel[]
  end,
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where c.escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 2) Ajustes finos por chave: rural (evita aparecer em apartamento, studio etc.)
update public.caracteristicas_catalogo
set tipos_imovel = array['FAZENDA_SITIO_CHACARA']::public.tipo_imovel[]
where chave in (
  'CASA_CASEIRO',
  'CASA_SEDE',
  'CELEIRO',
  'CURRAL',
  'PASTO',
  'POCO',
  'POCO_ARTESIANO'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- Casa de fundo: restringe a imóveis tipo casa/rural.
update public.caracteristicas_catalogo
set tipos_imovel = array['CASA', 'CASA_DE_VILA', 'CASA_DE_CONDOMINIO', 'FAZENDA_SITIO_CHACARA']::public.tipo_imovel[]
where chave = 'CASA_FUNDO'
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 3) Ajustes finos: comercial de escritório/andar.
update public.caracteristicas_catalogo
set
  tipos_imovel = array['ESCRITORIO', 'PREDIO_EDIFICIO_INTEIRO']::public.tipo_imovel[],
  subtipos_imovel = array['ANDAR_INTEIRO']::public.subtipo_imovel[]
where chave = 'ANDAR_INTEIRO'
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

update public.caracteristicas_catalogo
set
  tipos_imovel = array['ESCRITORIO', 'PREDIO_EDIFICIO_INTEIRO']::public.tipo_imovel[],
  subtipos_imovel = array['MEIO_ANDAR']::public.subtipo_imovel[]
where chave = 'MEIO_ANDAR'
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

update public.caracteristicas_catalogo
set tipos_imovel = array['ESCRITORIO', 'PREDIO_EDIFICIO_INTEIRO', 'CASA_COMERCIAL']::public.tipo_imovel[]
where chave in ('PISO_ELEVADO', 'POSSUI_DIVISORIA')
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 4) Ajustes finos: varandas com foco em tipologias verticais.
update public.caracteristicas_catalogo
set tipos_imovel = array['APARTAMENTO', 'COBERTURA', 'STUDIO', 'LOFT', 'FLAT', 'KITNET_CONJUGADO']::public.tipo_imovel[]
where chave in ('VARANDA', 'VARANDA_FECHADO_VIDRO', 'VARANDA_GOURMET', 'CHURRASQUEIRA_VARANDA')
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 5) Ajustes finos: itens de casa (não exibir para apartamentos por padrão).
update public.caracteristicas_catalogo
set tipos_imovel = array['CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA', 'FAZENDA_SITIO_CHACARA']::public.tipo_imovel[]
where chave in ('QUINTAL', 'EDICULA', 'LAJE')
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 6) Chave explicitamente ligada a subtipo residencial.
update public.caracteristicas_catalogo
set
  tipos_imovel = array['CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA']::public.tipo_imovel[],
  subtipos_imovel = array['GEMINADA']::public.subtipo_imovel[]
where chave = 'GEMINADA'
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

commit;
