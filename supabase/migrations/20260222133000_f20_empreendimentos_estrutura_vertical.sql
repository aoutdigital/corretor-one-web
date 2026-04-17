-- F20 - Estrutura vertical para empreendimentos (apartamentos e escritorio/conjunto)

begin;

alter table public.empreendimentos
  add column if not exists qtd_elevadores int,
  add column if not exists unidades_por_andar int,
  add column if not exists unidades_terreo int,
  add column if not exists unidades_cobertura int;

alter table public.empreendimentos
  drop constraint if exists empreendimentos_qtd_elevadores_check;
alter table public.empreendimentos
  add constraint empreendimentos_qtd_elevadores_check
  check (qtd_elevadores is null or qtd_elevadores >= 0);

alter table public.empreendimentos
  drop constraint if exists empreendimentos_unidades_por_andar_check;
alter table public.empreendimentos
  add constraint empreendimentos_unidades_por_andar_check
  check (unidades_por_andar is null or unidades_por_andar >= 0);

alter table public.empreendimentos
  drop constraint if exists empreendimentos_unidades_terreo_check;
alter table public.empreendimentos
  add constraint empreendimentos_unidades_terreo_check
  check (unidades_terreo is null or unidades_terreo >= 0);

alter table public.empreendimentos
  drop constraint if exists empreendimentos_unidades_cobertura_check;
alter table public.empreendimentos
  add constraint empreendimentos_unidades_cobertura_check
  check (unidades_cobertura is null or unidades_cobertura >= 0);

alter table public.empreendimentos
  drop constraint if exists empreendimentos_estrutura_vertical_aplicabilidade_check;

do $$
declare
  has_categoria_residencial boolean;
  has_categoria_comercial boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empreendimentos'
      and column_name = 'categoria_residencial'
  ) into has_categoria_residencial;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empreendimentos'
      and column_name = 'categoria_comercial'
  ) into has_categoria_comercial;

  if has_categoria_residencial and has_categoria_comercial then
    execute $sql$
      alter table public.empreendimentos
        add constraint empreendimentos_estrutura_vertical_aplicabilidade_check
        check (
          (
            tipo_uso = 'RESIDENCIAL'
            and categoria_residencial = 'APARTAMENTOS'
          )
          or (
            tipo_uso = 'COMERCIAL'
            and categoria_comercial = 'ESCRITORIO_CONJUNTO'
          )
          or (
            qtd_elevadores is null
            and unidades_por_andar is null
            and unidades_terreo is null
            and unidades_cobertura is null
          )
        )
    $sql$;
  else
    execute $sql$
      alter table public.empreendimentos
        add constraint empreendimentos_estrutura_vertical_aplicabilidade_check
        check (
          qtd_elevadores is null
          and unidades_por_andar is null
          and unidades_terreo is null
          and unidades_cobertura is null
        )
    $sql$;
  end if;
end $$;

commit;
