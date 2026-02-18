-- F8 - Localidades IBGE cache + cidades foco JSON padronizado no profile
-- Source: docs/data-model.md (referencia_localidades)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ref_localidade_tipo') then
    create type public.ref_localidade_tipo as enum (
      'UF',
      'CIDADE'
    );
  end if;
end $$;

create table if not exists public.referencia_localidades (
  id uuid primary key default gen_random_uuid(),
  tipo public.ref_localidade_tipo not null,
  codigo_ibge int not null unique,
  uf public.uf,
  nome text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists referencia_localidades_tipo_idx
  on public.referencia_localidades (tipo);

create index if not exists referencia_localidades_uf_idx
  on public.referencia_localidades (uf);

create index if not exists referencia_localidades_nome_idx
  on public.referencia_localidades (lower(nome));

alter table public.profiles
  add column if not exists cidades_foco_json jsonb;

drop trigger if exists trg_referencia_localidades_set_updated_at on public.referencia_localidades;
create trigger trg_referencia_localidades_set_updated_at
before update on public.referencia_localidades
for each row
execute function public.set_updated_at();

alter table public.referencia_localidades enable row level security;

drop policy if exists referencia_localidades_select_authenticated on public.referencia_localidades;
create policy referencia_localidades_select_authenticated
  on public.referencia_localidades
  for select
  using (auth.role() = 'authenticated');
