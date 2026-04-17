-- F26 - Preposicoes em localidades e referencia unica de bairros

begin;

alter table public.referencia_localidades
  add column if not exists preposicao_em text not null default 'em';

alter table public.referencia_localidades
  drop constraint if exists referencia_localidades_preposicao_em_check;

alter table public.referencia_localidades
  add constraint referencia_localidades_preposicao_em_check
  check (preposicao_em in ('em', 'no', 'na'));

create table if not exists public.referencia_bairros (
  id uuid primary key default gen_random_uuid(),
  bairro text not null,
  bairro_normalizado text not null,
  preposicao_em text not null default 'em',
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint referencia_bairros_bairro_normalizado_unique unique (bairro_normalizado),
  constraint referencia_bairros_preposicao_em_check check (preposicao_em in ('em', 'no', 'na'))
);

create index if not exists referencia_bairros_ativo_idx
  on public.referencia_bairros (ativo);

create index if not exists referencia_bairros_bairro_idx
  on public.referencia_bairros (lower(bairro));

drop trigger if exists trg_referencia_bairros_set_updated_at on public.referencia_bairros;
create trigger trg_referencia_bairros_set_updated_at
before update on public.referencia_bairros
for each row
execute function public.set_updated_at();

alter table public.referencia_bairros enable row level security;

drop policy if exists referencia_bairros_select_authenticated on public.referencia_bairros;
create policy referencia_bairros_select_authenticated
  on public.referencia_bairros
  for select
  using (auth.role() = 'authenticated');

drop policy if exists referencia_bairros_insert_authenticated on public.referencia_bairros;
create policy referencia_bairros_insert_authenticated
  on public.referencia_bairros
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists referencia_bairros_update_authenticated on public.referencia_bairros;
create policy referencia_bairros_update_authenticated
  on public.referencia_bairros
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

commit;
