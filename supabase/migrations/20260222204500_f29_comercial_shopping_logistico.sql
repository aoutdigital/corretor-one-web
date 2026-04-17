-- F29 - Comercial: categorias Shopping/Logistico + tipologias Loja/Box e Galpao

begin;

alter table public.empreendimentos
  drop constraint if exists empreendimentos_categoria_comercial_check;

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipologias_comerciais_allowed_check;

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipologias_comerciais_por_categoria_check;

update public.empreendimentos
set
  categoria_comercial = 'SHOPPING',
  tipologias_comerciais = case
    when coalesce(cardinality(tipologias_comerciais), 0) > 0 then tipologias_comerciais
    else array['LOJA_BOX']::text[]
  end
where tipo_uso = 'COMERCIAL'
  and categoria_imovel::text = 'PONTO_COMERCIAL_LOJA_BOX'
  and (
    categoria_comercial is null
    or categoria_comercial = 'ESCRITORIO_CONJUNTO'
  );

update public.empreendimentos
set
  categoria_comercial = 'LOGISTICO',
  tipologias_comerciais = case
    when coalesce(cardinality(tipologias_comerciais), 0) > 0 then tipologias_comerciais
    else array['GALPAO']::text[]
  end
where tipo_uso = 'COMERCIAL'
  and categoria_imovel::text = 'GALPAO_DEPOSITO_ARMAZEM'
  and (
    categoria_comercial is null
    or categoria_comercial = 'ESCRITORIO_CONJUNTO'
  );

update public.empreendimentos
set tipologias_comerciais = coalesce(
  (
    select array_agg(item)
    from unnest(tipologias_comerciais) as item
    where item in (
      'PADRAO',
      'DUPLEX',
      'TRIPLEX',
      'COBERTURA',
      'LAJE_INTEIRA',
      'MEIA_LAJE',
      'TERREO',
      'CASA_PADRAO',
      'SOBRADO',
      'LOTE_TERRENO',
      'LOJA_BOX',
      'GALPAO'
    )
  ),
  '{}'::text[]
);

alter table public.empreendimentos
  add constraint empreendimentos_categoria_comercial_check
  check (
    categoria_comercial is null
    or categoria_comercial in ('ESCRITORIO_CONJUNTO', 'CASAS', 'TERRENOS', 'SHOPPING', 'LOGISTICO')
  );

alter table public.empreendimentos
  add constraint empreendimentos_tipologias_comerciais_allowed_check
  check (
    tipologias_comerciais <@ array[
      'PADRAO',
      'DUPLEX',
      'TRIPLEX',
      'COBERTURA',
      'LAJE_INTEIRA',
      'MEIA_LAJE',
      'TERREO',
      'CASA_PADRAO',
      'SOBRADO',
      'LOTE_TERRENO',
      'LOJA_BOX',
      'GALPAO'
    ]::text[]
  );

alter table public.empreendimentos
  add constraint empreendimentos_tipologias_comerciais_por_categoria_check
  check (
    categoria_comercial is null
    or (
      categoria_comercial = 'ESCRITORIO_CONJUNTO'
      and tipologias_comerciais <@ array['PADRAO', 'DUPLEX', 'TRIPLEX', 'COBERTURA', 'LAJE_INTEIRA', 'MEIA_LAJE', 'TERREO']::text[]
    )
    or (
      categoria_comercial = 'CASAS'
      and tipologias_comerciais <@ array['CASA_PADRAO', 'SOBRADO']::text[]
    )
    or (
      categoria_comercial = 'TERRENOS'
      and tipologias_comerciais <@ array['LOTE_TERRENO']::text[]
    )
    or (
      categoria_comercial = 'SHOPPING'
      and tipologias_comerciais <@ array['LOJA_BOX']::text[]
    )
    or (
      categoria_comercial = 'LOGISTICO'
      and tipologias_comerciais <@ array['GALPAO']::text[]
    )
  );

commit;
