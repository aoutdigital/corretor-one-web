-- F48 - Contexto estruturado de localização para imóveis

begin;

alter table public.imoveis
  add column if not exists localizacao_contexto jsonb not null default '{}'::jsonb;

alter table public.imoveis
  drop constraint if exists imoveis_localizacao_contexto_object_check;
alter table public.imoveis
  add constraint imoveis_localizacao_contexto_object_check
  check (jsonb_typeof(localizacao_contexto) = 'object');

commit;

