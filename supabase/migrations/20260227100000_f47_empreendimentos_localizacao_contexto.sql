-- F47 - Contexto estruturado de localização para enriquecimento de empreendimentos

begin;

alter table public.empreendimentos
  add column if not exists localizacao_contexto jsonb not null default '{}'::jsonb;

alter table public.empreendimentos
  drop constraint if exists empreendimentos_localizacao_contexto_object_check;
alter table public.empreendimentos
  add constraint empreendimentos_localizacao_contexto_object_check
  check (jsonb_typeof(localizacao_contexto) = 'object');

commit;
