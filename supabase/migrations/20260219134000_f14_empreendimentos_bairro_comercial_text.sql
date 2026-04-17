-- F14 - Empreendimentos: bairro_comercial como texto livre

do $$
declare
  current_type text;
begin
  select c.data_type
    into current_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'empreendimentos'
    and c.column_name = 'bairro_comercial';

  if current_type is null then
    alter table public.empreendimentos
      add column bairro_comercial text;
  elsif current_type = 'boolean' then
    alter table public.empreendimentos
      alter column bairro_comercial drop default;

    alter table public.empreendimentos
      alter column bairro_comercial drop not null;

    alter table public.empreendimentos
      alter column bairro_comercial type text
      using (
        case
          when bairro_comercial = true then bairro
          else null
        end
      );
  end if;
end $$;
