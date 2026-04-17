-- F50 - Registro sequencial Corretor.one por perfil e padrão de código de imóvel

begin;

create sequence if not exists public.corretor_one_registro_seq
  as bigint
  start with 1001
  increment by 1
  minvalue 1001
  no maxvalue
  cache 1;

alter table public.profiles
  add column if not exists corretor_one_registro int;

with ordered as (
  select
    p.id,
    row_number() over (order by p.created_at asc, p.id asc)::int + 1000 as registro
  from public.profiles p
  where p.corretor_one_registro is null
)
update public.profiles p
set corretor_one_registro = ordered.registro
from ordered
where p.id = ordered.id;

select setval(
  'public.corretor_one_registro_seq',
  greatest(coalesce((select max(corretor_one_registro) from public.profiles), 1000), 1000),
  true
);

alter table public.profiles
  alter column corretor_one_registro set default nextval('public.corretor_one_registro_seq');

create unique index if not exists profiles_corretor_one_registro_unique
  on public.profiles (corretor_one_registro)
  where corretor_one_registro is not null;

alter table public.profiles
  alter column corretor_one_registro set not null;

commit;
