-- F17 - Fila de publicacao de empreendimentos (background)

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_publicacao_empreendimento_job') then
    create type public.status_publicacao_empreendimento_job as enum (
      'PENDENTE',
      'PROCESSANDO',
      'CONCLUIDO',
      'ERRO'
    );
  end if;
end $$;

create table if not exists public.empreendimento_publicacao_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  status public.status_publicacao_empreendimento_job not null default 'PENDENTE',
  tentativas int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  erro text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists empreendimento_publicacao_jobs_owner_status_idx
  on public.empreendimento_publicacao_jobs (owner_id, status, created_at);

create index if not exists empreendimento_publicacao_jobs_empreendimento_idx
  on public.empreendimento_publicacao_jobs (empreendimento_id, created_at desc);

drop trigger if exists trg_empreendimento_publicacao_jobs_set_updated_at
  on public.empreendimento_publicacao_jobs;
create trigger trg_empreendimento_publicacao_jobs_set_updated_at
before update on public.empreendimento_publicacao_jobs
for each row
execute function public.set_updated_at();

alter table public.empreendimento_publicacao_jobs enable row level security;

drop policy if exists empreendimento_publicacao_jobs_select_own on public.empreendimento_publicacao_jobs;
create policy empreendimento_publicacao_jobs_select_own
  on public.empreendimento_publicacao_jobs
  for select
  using (owner_id = auth.uid());

drop policy if exists empreendimento_publicacao_jobs_insert_own on public.empreendimento_publicacao_jobs;
create policy empreendimento_publicacao_jobs_insert_own
  on public.empreendimento_publicacao_jobs
  for insert
  with check (owner_id = auth.uid());

drop policy if exists empreendimento_publicacao_jobs_update_own on public.empreendimento_publicacao_jobs;
create policy empreendimento_publicacao_jobs_update_own
  on public.empreendimento_publicacao_jobs
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

commit;
