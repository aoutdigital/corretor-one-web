-- F52 - Imóveis: bairro_comercial como texto livre

begin;

do $$
declare
  column_data_type text;
begin
  select c.data_type
    into column_data_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'imoveis'
    and c.column_name = 'bairro_comercial';

  if column_data_type is null then
    alter table public.imoveis
      add column bairro_comercial text;
  elsif column_data_type = 'boolean' then
    alter table public.imoveis
      alter column bairro_comercial drop default;

    alter table public.imoveis
      alter column bairro_comercial drop not null;

    alter table public.imoveis
      alter column bairro_comercial type text
      using (
        case
          when bairro_comercial = true then bairro
          else null
        end
      );
  end if;
end $$;

commit;
