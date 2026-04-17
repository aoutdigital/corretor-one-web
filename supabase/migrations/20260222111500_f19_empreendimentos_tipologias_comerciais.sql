-- F19 - Estrutura comercial hierarquica para empreendimentos

begin;

alter table public.empreendimentos
  add column if not exists categoria_comercial text,
  add column if not exists tipologias_comerciais text[] not null default '{}'::text[];

-- Backfill inicial para dados legados comerciais.
update public.empreendimentos
set
  categoria_comercial = case
    when categoria_imovel = 'CASA_COMERCIAL' then 'CASAS'
    else 'ESCRITORIO_CONJUNTO'
  end,
  tipologias_comerciais = case
    when categoria_imovel = 'CASA_COMERCIAL' then array['CASA_PADRAO']::text[]
    else array['PADRAO']::text[]
  end
where
  tipo_uso = 'COMERCIAL'
  and (
    categoria_comercial is null
    or coalesce(cardinality(tipologias_comerciais), 0) = 0
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

create index if not exists empreendimentos_categoria_comercial_idx
  on public.empreendimentos (categoria_comercial);

commit;
