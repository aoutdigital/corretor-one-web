-- F25 - Recria check de aplicabilidade da estrutura vertical conforme colunas atuais

begin;

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
