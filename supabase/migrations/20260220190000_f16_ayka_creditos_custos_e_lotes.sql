-- F16 - Ayka credits engine: action costs, monthly grant cycles, lots and ledger

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ayka_mov_tipo') then
    create type public.ayka_mov_tipo as enum ('CREDITO', 'DEBITO');
  end if;

  if not exists (select 1 from pg_type where typname = 'ayka_origem') then
    create type public.ayka_origem as enum ('FRANQUIA', 'AVULSO', 'BONUS');
  end if;
end $$;

create table if not exists public.ayka_custos_acoes (
  id uuid primary key default gen_random_uuid(),
  acao_codigo text not null,
  modelo text not null,
  custo_creditos int not null,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ayka_custos_acoes_acao_codigo_check check (acao_codigo ~ '^[A-Z0-9_]+$'),
  constraint ayka_custos_acoes_modelo_check check (modelo ~ '^[A-Z0-9_]+$'),
  constraint ayka_custos_acoes_custo_creditos_check check (custo_creditos > 0),
  unique (acao_codigo, modelo)
);

create index if not exists ayka_custos_acoes_ativo_idx
  on public.ayka_custos_acoes (ativo);

create table if not exists public.ayka_franquia_ciclos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  assinatura_id uuid not null references public.assinaturas (id) on delete cascade,
  plano_id uuid not null references public.planos (id) on delete restrict,
  ciclo_inicio timestamptz not null,
  ciclo_fim timestamptz not null,
  creditos int not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ayka_franquia_ciclos_creditos_check check (creditos >= 0),
  constraint ayka_franquia_ciclos_ciclo_range_check check (ciclo_fim > ciclo_inicio),
  unique (owner_id, assinatura_id, ciclo_inicio)
);

create index if not exists ayka_franquia_ciclos_owner_idx
  on public.ayka_franquia_ciclos (owner_id, ciclo_inicio desc);

create table if not exists public.ayka_creditos_lotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  origem public.ayka_origem not null,
  creditos_total int not null,
  creditos_disponiveis int not null,
  expira_em timestamptz,
  franquia_ciclo_id uuid references public.ayka_franquia_ciclos (id) on delete set null,
  compra_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ayka_creditos_lotes_total_check check (creditos_total > 0),
  constraint ayka_creditos_lotes_disponiveis_check check (creditos_disponiveis >= 0 and creditos_disponiveis <= creditos_total)
);

create unique index if not exists ayka_creditos_lotes_franquia_ciclo_unique
  on public.ayka_creditos_lotes (franquia_ciclo_id)
  where franquia_ciclo_id is not null;

create index if not exists ayka_creditos_lotes_owner_expira_idx
  on public.ayka_creditos_lotes (owner_id, expira_em);

create table if not exists public.ayka_movimentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  mov_tipo public.ayka_mov_tipo not null,
  origem public.ayka_origem not null,
  acao_codigo text not null,
  modelo text,
  quantidade int not null,
  custo_creditos int not null,
  lote_id uuid references public.ayka_creditos_lotes (id) on delete set null,
  referencia_tipo text,
  referencia_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ayka_movimentos_acao_codigo_check check (acao_codigo ~ '^[A-Z0-9_]+$'),
  constraint ayka_movimentos_modelo_check check (modelo is null or modelo ~ '^[A-Z0-9_]+$'),
  constraint ayka_movimentos_quantidade_check check (quantidade > 0),
  constraint ayka_movimentos_custo_creditos_check check (custo_creditos > 0)
);

create index if not exists ayka_movimentos_owner_created_idx
  on public.ayka_movimentos (owner_id, created_at desc);

create index if not exists ayka_movimentos_owner_acao_idx
  on public.ayka_movimentos (owner_id, acao_codigo, created_at desc);

drop trigger if exists trg_ayka_custos_acoes_set_updated_at on public.ayka_custos_acoes;
create trigger trg_ayka_custos_acoes_set_updated_at
before update on public.ayka_custos_acoes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_ayka_creditos_lotes_set_updated_at on public.ayka_creditos_lotes;
create trigger trg_ayka_creditos_lotes_set_updated_at
before update on public.ayka_creditos_lotes
for each row
execute function public.set_updated_at();

alter table public.ayka_custos_acoes enable row level security;
alter table public.ayka_franquia_ciclos enable row level security;
alter table public.ayka_creditos_lotes enable row level security;
alter table public.ayka_movimentos enable row level security;

drop policy if exists ayka_custos_acoes_select_authenticated on public.ayka_custos_acoes;
create policy ayka_custos_acoes_select_authenticated
  on public.ayka_custos_acoes
  for select
  using (auth.role() = 'authenticated');

drop policy if exists ayka_franquia_ciclos_select_own on public.ayka_franquia_ciclos;
create policy ayka_franquia_ciclos_select_own
  on public.ayka_franquia_ciclos
  for select
  using (owner_id = auth.uid());

drop policy if exists ayka_creditos_lotes_select_own on public.ayka_creditos_lotes;
create policy ayka_creditos_lotes_select_own
  on public.ayka_creditos_lotes
  for select
  using (owner_id = auth.uid());

drop policy if exists ayka_movimentos_select_own on public.ayka_movimentos;
create policy ayka_movimentos_select_own
  on public.ayka_movimentos
  for select
  using (owner_id = auth.uid());

insert into public.ayka_custos_acoes (acao_codigo, modelo, custo_creditos, ativo)
values
  ('CRIAR_DESCRICAO_EMPREENDIMENTO', 'GEMINI', 2, true)
on conflict (acao_codigo, modelo) do update
set
  custo_creditos = excluded.custo_creditos,
  ativo = excluded.ativo;

commit;
