-- F55 - Perfis: URLs dos logos gerados por nickname (padrão e white)

begin;

alter table public.profiles
  add column if not exists logo_nickname_url text,
  add column if not exists logo_nickname_white_url text;

commit;
