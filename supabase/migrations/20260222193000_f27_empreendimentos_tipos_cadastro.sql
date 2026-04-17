-- F27 - Cadastro de tipos por empreendimento (JSON estruturado)

begin;

alter table public.empreendimentos
  add column if not exists tipos_cadastro jsonb not null default '[]'::jsonb;

alter table public.empreendimentos
  drop constraint if exists empreendimentos_tipos_cadastro_array_check;

alter table public.empreendimentos
  add constraint empreendimentos_tipos_cadastro_array_check
  check (jsonb_typeof(tipos_cadastro) = 'array');

commit;
