-- F46 - Pente fino de aplicabilidade por tipo/subtipo em características de imóvel

begin;

-- Blocos base reutilizados via updates (sem função para manter migration simples e auditável)

-- 1) Coberturas específicas por subtipo
update public.caracteristicas_catalogo
set
  tipos_imovel = array['COBERTURA']::public.tipo_imovel[],
  subtipos_imovel = array['COBERTURA_PADRAO', 'COBERTURA_DUPLEX', 'COBERTURA_TRIPLEX']::public.subtipo_imovel[]
where chave in (
  'SOLARIUM',
  'VARANDA_GOURMET',
  'VARANDA_FECHADO_VIDRO'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 2) Varanda e churrasqueira de varanda: tipologias verticais + casa de condomínio/vila
update public.caracteristicas_catalogo
set
  tipos_imovel = array['APARTAMENTO', 'COBERTURA', 'FLAT', 'KITNET_CONJUGADO', 'LOFT', 'STUDIO', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA']::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in ('VARANDA', 'CHURRASQUEIRA_VARANDA')
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 3) Características predominantemente de casa / quintal
update public.caracteristicas_catalogo
set
  tipos_imovel = array['CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA', 'FAZENDA_SITIO_CHACARA']::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in (
  'CANIL',
  'EDICULA',
  'LAJE',
  'QUINTAL',
  'MURO_GRADE',
  'MURO_VIDRO',
  'PORTAO_ELETRONICO',
  'ENTRADA_LATERAL'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 4) Rural / sítio / fazenda (restrito)
update public.caracteristicas_catalogo
set
  tipos_imovel = array['FAZENDA_SITIO_CHACARA']::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in (
  'CASA_CASEIRO',
  'CASA_SEDE',
  'CELEIRO',
  'CURRAL',
  'LAGO',
  'PASTO',
  'POCO',
  'POCO_ARTESIANO',
  'POMAR',
  'RIO',
  'ORQUIDARIO',
  'REDARIO',
  'HORTA'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 5) Geminada explicitamente ligada ao subtipo
update public.caracteristicas_catalogo
set
  tipos_imovel = array['CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA']::public.tipo_imovel[],
  subtipos_imovel = array['GEMINADA']::public.subtipo_imovel[]
where chave = 'GEMINADA'
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 6) Escritório / corporativo por andar
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
set
  tipos_imovel = array['ESCRITORIO', 'PREDIO_EDIFICIO_INTEIRO', 'CASA_COMERCIAL']::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in (
  'PISO_ELEVADO',
  'POSSUI_DIVISORIA',
  'SALA_REUNIAO',
  'ISOLAMENTO_ACUSTICO',
  'ISOLAMENTO_TERMICO',
  'DRYWALL',
  'PE_DIREITO_ALTO'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 7) Varejo / shopping / loja
update public.caracteristicas_catalogo
set
  tipos_imovel = array['PONTO_COMERCIAL_LOJA_BOX', 'SHOPPING', 'CASA_COMERCIAL', 'PREDIO_EDIFICIO_INTEIRO']::public.tipo_imovel[],
  subtipos_imovel = array['LOJA_BOX']::public.subtipo_imovel[]
where chave in ('CINEMA', 'MEZANINO')
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 8) Logístico / armazenagem
update public.caracteristicas_catalogo
set
  tipos_imovel = array['GALPAO_DEPOSITO_ARMAZEM', 'SELF_STORAGE', 'PREDIO_EDIFICIO_INTEIRO']::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in ('DEPOSITO', 'RESERVATORIO_AGUA', 'GERADOR')
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 9) Acabamentos residenciais internos (remove ruído em comercial puro)
update public.caracteristicas_catalogo
set
  tipos_imovel = array[
    'APARTAMENTO',
    'CASA',
    'CASA_DE_CONDOMINIO',
    'CASA_DE_VILA',
    'COBERTURA',
    'FLAT',
    'KITNET_CONJUGADO',
    'LOFT',
    'STUDIO',
    'FAZENDA_SITIO_CHACARA'
  ]::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in (
  'ARMARIO_QUARTO',
  'ARMARIO_COZINHA',
  'BOX_BLINDEX',
  'CARPETE',
  'CIMENTO_QUEIMADO',
  'CLOSET',
  'COZINHA_AMERICANA',
  'COZINHA_GOURMET',
  'COZINHA_GRANDE',
  'CHUVEIRO_GAS',
  'FOGAO',
  'FREEZER',
  'JANELA_ALUMINIO',
  'JANELA_GRANDE',
  'LAREIRA',
  'MOVEL_PLANEJADO',
  'PISO_MADEIRA',
  'PISO_FRIO',
  'PISO_LAMINADO',
  'PISO_VINILICO',
  'PISO_PORCELANATO',
  'SALA_JANTAR',
  'SALA_GRANDE',
  'SALA_PEQUENA',
  'TV_CABO',
  'VENTILACAO_NATURAL'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 10) Áreas molhadas/lazer interno residencial
update public.caracteristicas_catalogo
set
  tipos_imovel = array['APARTAMENTO', 'CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA', 'COBERTURA', 'FLAT', 'LOFT', 'STUDIO', 'FAZENDA_SITIO_CHACARA']::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in (
  'BANHEIRA',
  'BAR_PISCINA',
  'DECK',
  'HIDROMASSAGEM',
  'OFURO',
  'PISCINA',
  'PISCINA_AQUECIDA',
  'PISCINA_COBERTA',
  'PISCINA_INFANTIL',
  'PISCINA_ADULTO',
  'PISCINA_PRIVATIVA',
  'SAUNA',
  'SPA'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 11) Quadras e esporte: casa/condomínio/rural (não escritório/loja)
update public.caracteristicas_catalogo
set
  tipos_imovel = array['CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA', 'FAZENDA_SITIO_CHACARA']::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in (
  'CAMPO_FUTEBOL',
  'CAMPO_GOLFE',
  'PISTA_COOPER',
  'PISTA_SKATE',
  'PLAYGROUND',
  'QUADRA_POLIESPORTIVA',
  'QUADRA_SQUASH',
  'QUADRA_TENIS'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

-- 12) Segurança e infraestrutura genérica para imóveis de qualquer natureza
update public.caracteristicas_catalogo
set
  tipos_imovel = array[
    'APARTAMENTO',
    'CASA',
    'CASA_DE_CONDOMINIO',
    'CASA_DE_VILA',
    'COBERTURA',
    'FLAT',
    'KITNET_CONJUGADO',
    'LOFT',
    'STUDIO',
    'FAZENDA_SITIO_CHACARA',
    'LOTE_TERRENO',
    'CASA_COMERCIAL',
    'ESCRITORIO',
    'GALPAO_DEPOSITO_ARMAZEM',
    'GARAGEM',
    'HOTEL_MOTEL_POUSADA',
    'PONTO_COMERCIAL_LOJA_BOX',
    'PREDIO_EDIFICIO_INTEIRO',
    'SHOPPING',
    'SELF_STORAGE'
  ]::public.tipo_imovel[],
  subtipos_imovel = '{}'::public.subtipo_imovel[]
where chave in (
  'ACESSO_PCD',
  'CAMERA_SEGURANCA',
  'CERCA',
  'ELEVADOR',
  'ENTRADA_SERVICO',
  'IMOVEL_ESQUINA',
  'INTERFONE',
  'INTERNET',
  'SISTEMA_ALARME',
  'VIGIA'
)
  and escopos @> array['IMOVEL']::public.caracteristica_escopo[];

commit;
