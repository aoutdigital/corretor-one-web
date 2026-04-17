-- F18 - Estrutura residencial hierarquica para empreendimentos
-- Objetivo: suportar residencial com multiplas tipologias (ex: apartamento padrao + cobertura + studio)

begin;

alter table public.empreendimentos
  add column if not exists categoria_residencial text,
  add column if not exists tipologias_residenciais text[] not null default '{}'::text[];

-- Backfill inicial para nao quebrar dados existentes.
update public.empreendimentos
set
  categoria_residencial = case
    when tipo_uso <> 'RESIDENCIAL' then null
    when categoria_imovel in ('CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA') then 'CASAS'
    when categoria_imovel = 'LOTE_TERRENO' then 'TERRENOS'
    else 'APARTAMENTOS'
  end,
  tipologias_residenciais = case
    when tipo_uso <> 'RESIDENCIAL' then '{}'::text[]
    when categoria_imovel = 'COBERTURA' then array['COBERTURA']::text[]
    when categoria_imovel = 'GARDEN' then array['GARDEN']::text[]
    when categoria_imovel = 'STUDIO' then array['STUDIO']::text[]
    when categoria_imovel in ('CASA', 'CASA_DE_CONDOMINIO', 'CASA_DE_VILA') then array['CASA_PADRAO']::text[]
    when categoria_imovel = 'LOTE_TERRENO' then array['LOTE_TERRENO']::text[]
    else array['APARTAMENTO_PADRAO']::text[]
  end
where
  tipo_uso = 'RESIDENCIAL'
  and (
    categoria_residencial is null
    or coalesce(cardinality(tipologias_residenciais), 0) = 0
  );

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
      and tipologias_residenciais <@ array['APARTAMENTO_PADRAO', 'COBERTURA', 'GARDEN', 'STUDIO']::text[]
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

create index if not exists empreendimentos_categoria_residencial_idx
  on public.empreendimentos (categoria_residencial);

commit;
