-- F42 - Adiciona VARANDA ao enum de tipo de ambiente de imóvel

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'tipo_ambiente_imovel'
      and e.enumlabel = 'VARANDA'
  ) then
    alter type public.tipo_ambiente_imovel add value 'VARANDA';
  end if;
end $$;

commit;
