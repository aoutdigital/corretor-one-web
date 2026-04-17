-- F31 - Migra tipos de empreendimento de JSONB para estrutura relacional com plantas

begin;

create table if not exists public.empreendimento_tipos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  ordem int not null default 0,
  nome text,
  torre_nome text,
  tipologia text,
  area_privativa numeric,
  dormitorios int,
  suites int,
  banheiros int,
  vagas int,
  qtd_unidades int,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint empreendimento_tipos_ordem_check check (ordem >= 0),
  constraint empreendimento_tipos_area_privativa_check check (area_privativa is null or area_privativa >= 0),
  constraint empreendimento_tipos_dormitorios_check check (dormitorios is null or dormitorios >= 0),
  constraint empreendimento_tipos_suites_check check (suites is null or suites >= 0),
  constraint empreendimento_tipos_banheiros_check check (banheiros is null or banheiros >= 0),
  constraint empreendimento_tipos_vagas_check check (vagas is null or vagas >= 0),
  constraint empreendimento_tipos_qtd_unidades_check check (qtd_unidades is null or qtd_unidades >= 0),
  constraint empreendimento_tipos_empreendimento_ordem_unique unique (empreendimento_id, ordem)
);

create index if not exists empreendimento_tipos_owner_empreendimento_idx
  on public.empreendimento_tipos (owner_id, empreendimento_id, ordem);

create table if not exists public.empreendimento_tipos_plantas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  empreendimento_tipo_id uuid not null references public.empreendimento_tipos (id) on delete cascade,
  midia_id uuid not null references public.midia (id) on delete cascade,
  ordem int not null default 0,
  alt text,
  legenda text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint empreendimento_tipos_plantas_ordem_check check (ordem between 0 and 2),
  constraint empreendimento_tipos_plantas_unique_ordem unique (empreendimento_tipo_id, ordem),
  constraint empreendimento_tipos_plantas_unique_midia unique (empreendimento_tipo_id, midia_id)
);

create index if not exists empreendimento_tipos_plantas_owner_empreendimento_idx
  on public.empreendimento_tipos_plantas (owner_id, empreendimento_id, empreendimento_tipo_id, ordem);

create index if not exists empreendimento_tipos_plantas_midia_idx
  on public.empreendimento_tipos_plantas (midia_id);

-- Backfill do JSONB legado (tipos_cadastro) para tabela relacional.
insert into public.empreendimento_tipos (
  owner_id,
  empreendimento_id,
  ordem,
  nome,
  torre_nome,
  tipologia,
  area_privativa,
  dormitorios,
  suites,
  banheiros,
  vagas,
  qtd_unidades
)
select
  e.owner_id,
  e.id as empreendimento_id,
  (j.ordinality - 1)::int as ordem,
  nullif(trim(j.item ->> 'nome'), '') as nome,
  nullif(trim(j.item ->> 'torre_nome'), '') as torre_nome,
  nullif(trim(j.item ->> 'tipologia'), '') as tipologia,
  case
    when coalesce(trim(j.item ->> 'area_privativa'), '') ~ '^\\d+(?:[\\.,]\\d+)?$'
      then replace(trim(j.item ->> 'area_privativa'), ',', '.')::numeric
    else null
  end as area_privativa,
  case
    when coalesce(trim(j.item ->> 'dormitorios'), '') ~ '^\\d+$'
      then (trim(j.item ->> 'dormitorios'))::int
    else null
  end as dormitorios,
  case
    when coalesce(trim(j.item ->> 'suites'), '') ~ '^\\d+$'
      then (trim(j.item ->> 'suites'))::int
    else null
  end as suites,
  case
    when coalesce(trim(j.item ->> 'banheiros'), '') ~ '^\\d+$'
      then (trim(j.item ->> 'banheiros'))::int
    else null
  end as banheiros,
  case
    when coalesce(trim(j.item ->> 'vagas'), '') ~ '^\\d+$'
      then (trim(j.item ->> 'vagas'))::int
    else null
  end as vagas,
  case
    when coalesce(trim(j.item ->> 'qtd_unidades'), '') ~ '^\\d+$'
      then (trim(j.item ->> 'qtd_unidades'))::int
    else null
  end as qtd_unidades
from public.empreendimentos e
cross join lateral jsonb_array_elements(coalesce(e.tipos_cadastro, '[]'::jsonb)) with ordinality as j(item, ordinality)
on conflict (empreendimento_id, ordem) do update
set
  nome = excluded.nome,
  torre_nome = excluded.torre_nome,
  tipologia = excluded.tipologia,
  area_privativa = excluded.area_privativa,
  dormitorios = excluded.dormitorios,
  suites = excluded.suites,
  banheiros = excluded.banheiros,
  vagas = excluded.vagas,
  qtd_unidades = excluded.qtd_unidades,
  updated_at = timezone('utc', now());

drop trigger if exists trg_empreendimento_tipos_set_updated_at on public.empreendimento_tipos;
create trigger trg_empreendimento_tipos_set_updated_at
before update on public.empreendimento_tipos
for each row
execute function public.set_updated_at();

drop trigger if exists trg_empreendimento_tipos_plantas_set_updated_at on public.empreendimento_tipos_plantas;
create trigger trg_empreendimento_tipos_plantas_set_updated_at
before update on public.empreendimento_tipos_plantas
for each row
execute function public.set_updated_at();

alter table public.empreendimento_tipos enable row level security;
alter table public.empreendimento_tipos_plantas enable row level security;

drop policy if exists empreendimento_tipos_select_own on public.empreendimento_tipos;
create policy empreendimento_tipos_select_own
  on public.empreendimento_tipos
  for select
  using (owner_id = auth.uid());

drop policy if exists empreendimento_tipos_insert_own on public.empreendimento_tipos;
create policy empreendimento_tipos_insert_own
  on public.empreendimento_tipos
  for insert
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_tipos_update_own on public.empreendimento_tipos;
create policy empreendimento_tipos_update_own
  on public.empreendimento_tipos
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_tipos_delete_own on public.empreendimento_tipos;
create policy empreendimento_tipos_delete_own
  on public.empreendimento_tipos
  for delete
  using (owner_id = auth.uid());

drop policy if exists empreendimento_tipos_plantas_select_own on public.empreendimento_tipos_plantas;
create policy empreendimento_tipos_plantas_select_own
  on public.empreendimento_tipos_plantas
  for select
  using (owner_id = auth.uid());

drop policy if exists empreendimento_tipos_plantas_insert_own on public.empreendimento_tipos_plantas;
create policy empreendimento_tipos_plantas_insert_own
  on public.empreendimento_tipos_plantas
  for insert
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_tipos_plantas_update_own on public.empreendimento_tipos_plantas;
create policy empreendimento_tipos_plantas_update_own
  on public.empreendimento_tipos_plantas
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_tipos_plantas_delete_own on public.empreendimento_tipos_plantas;
create policy empreendimento_tipos_plantas_delete_own
  on public.empreendimento_tipos_plantas
  for delete
  using (owner_id = auth.uid());

commit;
