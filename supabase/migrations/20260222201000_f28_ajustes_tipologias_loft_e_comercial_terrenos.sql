-- F28 - Ajustes de tipologias: LOFT residencial e TERRENOS comercial

begin;

update public.empreendimentos
set
  categoria_comercial = 'TERRENOS',
  tipologias_comerciais = case
    when coalesce(cardinality(tipologias_comerciais), 0) > 0 then tipologias_comerciais
    else array['LOTE_TERRENO']::text[]
  end
where tipo_uso = 'COMERCIAL'
  and categoria_imovel::text = 'LOTE_TERRENO'
  and (
    categoria_comercial is null
    or categoria_comercial = 'ESCRITORIO_CONJUNTO'
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipologias_residenciais_allowed_check;
alter table public.empreendimentos
  add constraint empreendimentos_tipologias_residenciais_allowed_check
  check (
    tipologias_residenciais <@ array[
      'APARTAMENTO_PADRAO',
      'LOFT',
      'DUPLEX',
      'TRIPLEX',
      'COBERTURA',
      'GARDEN',
      'STUDIO',
      'CASA_PADRAO',
      'SOBRADO',
      'LOTE_TERRENO'
    ]::text[]
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipologias_residenciais_por_categoria_check;
alter table public.empreendimentos
  add constraint empreendimentos_tipologias_residenciais_por_categoria_check
  check (
    categoria_residencial is null
    or (
      categoria_residencial = 'APARTAMENTOS'
      and tipologias_residenciais <@ array['APARTAMENTO_PADRAO', 'LOFT', 'DUPLEX', 'TRIPLEX', 'COBERTURA', 'GARDEN', 'STUDIO']::text[]
    )
    or (
      categoria_residencial = 'CASAS'
      and tipologias_residenciais <@ array['CASA_PADRAO', 'SOBRADO']::text[]
    )
    or (
      categoria_residencial = 'TERRENOS'
      and tipologias_residenciais <@ array['LOTE_TERRENO']::text[]
    )
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_categoria_comercial_check;
alter table public.empreendimentos
  add constraint empreendimentos_categoria_comercial_check
  check (
    categoria_comercial is null
    or categoria_comercial in ('ESCRITORIO_CONJUNTO', 'CASAS', 'TERRENOS')
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipologias_comerciais_allowed_check;
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
      'LOTE_TERRENO'
    ]::text[]
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipologias_comerciais_por_categoria_check;
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
  );

commit;
