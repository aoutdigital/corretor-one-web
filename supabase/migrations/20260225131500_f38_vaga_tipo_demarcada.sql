-- F38 - Adiciona opção DEMARCADA ao enum de tipo de vaga

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'vaga_tipo'
      and e.enumlabel = 'DEMARCADA'
  ) then
    alter type public.vaga_tipo add value 'DEMARCADA';
  end if;
end $$;

commit;
