-- F24 - Bootstrap/fix de colunas e constraints de tipologias em empreendimentos

begin;

alter table public.empreendimentos
  add column if not exists categoria_residencial text,
  add column if not exists tipologias_residenciais text[] not null default '{}'::text[],
  add column if not exists categoria_comercial text,
  add column if not exists tipologias_comerciais text[] not null default '{}'::text[];

-- Backfill residencial para bases que ainda nao receberam F18.
update public.empreendimentos
set
  categoria_residencial = case
    when categoria_residencial is not null then categoria_residencial
    when categoria_imovel::text in ('CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA') then 'CASAS'
    when categoria_imovel::text = 'LOTE_TERRENO' then 'TERRENOS'
    else 'APARTAMENTOS'
  end,
  tipologias_residenciais = case
    when coalesce(cardinality(tipologias_residenciais), 0) > 0 then tipologias_residenciais
    when categoria_imovel::text = 'COBERTURA' then array['COBERTURA']::text[]
    when categoria_imovel::text = 'GARDEN' then array['GARDEN']::text[]
    when categoria_imovel::text = 'STUDIO' then array['STUDIO']::text[]
    when categoria_imovel::text in ('CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA') then array['CASA_PADRAO']::text[]
    when categoria_imovel::text = 'LOTE_TERRENO' then array['LOTE_TERRENO']::text[]
    else array['APARTAMENTO_PADRAO']::text[]
  end
where tipo_uso = 'RESIDENCIAL';

-- Backfill comercial para bases que ainda nao receberam F19.
update public.empreendimentos
set
  categoria_comercial = case
    when categoria_comercial is not null then categoria_comercial
    when categoria_imovel::text = 'CASA_COMERCIAL' then 'CASAS'
    else 'ESCRITORIO_CONJUNTO'
  end,
  tipologias_comerciais = case
    when coalesce(cardinality(tipologias_comerciais), 0) > 0 then tipologias_comerciais
    when categoria_imovel::text = 'CASA_COMERCIAL' then array['CASA_PADRAO']::text[]
    else array['PADRAO']::text[]
  end
where tipo_uso = 'COMERCIAL';

-- Higieniza valores fora da lista permitida antes de reaplicar constraints.
update public.empreendimentos
set tipologias_residenciais = coalesce(
  (
    select array_agg(item)
    from unnest(tipologias_residenciais) as item
    where item in (
      'APARTAMENTO_PADRAO',
      'DUPLEX',
      'TRIPLEX',
      'COBERTURA',
      'GARDEN',
      'STUDIO',
      'CASA_PADRAO',
      'SOBRADO',
      'LOTE_TERRENO'
    )
  ),
  '{}'::text[]
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
      'SOBRADO'
    )
  ),
  '{}'::text[]
);

-- Garante defaults minimos quando o uso exige categoria/tipologia.
update public.empreendimentos
set
  categoria_residencial = coalesce(categoria_residencial, 'APARTAMENTOS'),
  tipologias_residenciais = case
    when coalesce(cardinality(tipologias_residenciais), 0) > 0 then tipologias_residenciais
    else array['APARTAMENTO_PADRAO']::text[]
  end
where tipo_uso = 'RESIDENCIAL';

update public.empreendimentos
set
  categoria_comercial = coalesce(categoria_comercial, 'ESCRITORIO_CONJUNTO'),
  tipologias_comerciais = case
    when coalesce(cardinality(tipologias_comerciais), 0) > 0 then tipologias_comerciais
    else array['PADRAO']::text[]
  end
where tipo_uso = 'COMERCIAL';

-- Limpa campos de uso oposto para respeitar checks.
update public.empreendimentos
set
  categoria_comercial = null,
  tipologias_comerciais = '{}'::text[]
where tipo_uso <> 'COMERCIAL';

update public.empreendimentos
set
  categoria_residencial = null,
  tipologias_residenciais = '{}'::text[]
where tipo_uso <> 'RESIDENCIAL';

alter table public.empreendimentos
  drop constraint if exists empreendimentos_categoria_residencial_check;
alter table public.empreendimentos
  add constraint empreendimentos_categoria_residencial_check
  check (
    categoria_residencial is null
    or categoria_residencial in ('APARTAMENTOS', 'CASAS', 'TERRENOS')
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipologias_residenciais_allowed_check;
alter table public.empreendimentos
  add constraint empreendimentos_tipologias_residenciais_allowed_check
  check (
    tipologias_residenciais <@ array[
      'APARTAMENTO_PADRAO',
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
      and tipologias_residenciais <@ array['APARTAMENTO_PADRAO', 'DUPLEX', 'TRIPLEX', 'COBERTURA', 'GARDEN', 'STUDIO']::text[]
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
  drop constraint if exists empreendimentos_tipo_uso_residencial_tipologias_check;
alter table public.empreendimentos
  add constraint empreendimentos_tipo_uso_residencial_tipologias_check
  check (
    (tipo_uso = 'RESIDENCIAL' and categoria_residencial is not null and coalesce(cardinality(tipologias_residenciais), 0) > 0)
    or (tipo_uso <> 'RESIDENCIAL' and categoria_residencial is null and coalesce(cardinality(tipologias_residenciais), 0) = 0)
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_categoria_comercial_check;
alter table public.empreendimentos
  add constraint empreendimentos_categoria_comercial_check
  check (
    categoria_comercial is null
    or categoria_comercial in ('ESCRITORIO_CONJUNTO', 'CASAS')
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
      'SOBRADO'
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
  );

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipo_uso_comercial_tipologias_check;
alter table public.empreendimentos
  add constraint empreendimentos_tipo_uso_comercial_tipologias_check
  check (
    (tipo_uso = 'COMERCIAL' and categoria_comercial is not null and coalesce(cardinality(tipologias_comerciais), 0) > 0)
    or (tipo_uso <> 'COMERCIAL' and categoria_comercial is null and coalesce(cardinality(tipologias_comerciais), 0) = 0)
  );

create index if not exists empreendimentos_categoria_residencial_idx
  on public.empreendimentos (categoria_residencial);

create index if not exists empreendimentos_categoria_comercial_idx
  on public.empreendimentos (categoria_comercial);

commit;
