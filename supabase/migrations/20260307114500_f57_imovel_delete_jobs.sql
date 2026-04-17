-- F57 - Fila assíncrona para limpeza de exclusão de imóveis

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_imovel_delete_job') then
    create type public.status_imovel_delete_job as enum (
      'PENDENTE',
      'PROCESSANDO',
      'CONCLUIDO',
      'ERRO'
    );
  end if;
end $$;

create table if not exists public.imovel_delete_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  imovel_id uuid not null,
  status public.status_imovel_delete_job not null default 'PENDENTE',
  tentativas int not null default 0,
  erro text,
  next_retry_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint imovel_delete_jobs_owner_imovel_unique unique (owner_id, imovel_id)
);

create index if not exists imovel_delete_jobs_owner_status_idx
  on public.imovel_delete_jobs (owner_id, status, created_at);

create index if not exists imovel_delete_jobs_status_retry_idx
  on public.imovel_delete_jobs (status, next_retry_at, created_at);

drop trigger if exists trg_imovel_delete_jobs_set_updated_at on public.imovel_delete_jobs;
create trigger trg_imovel_delete_jobs_set_updated_at
before update on public.imovel_delete_jobs
for each row
execute function public.set_updated_at();

alter table public.imovel_delete_jobs enable row level security;

drop policy if exists imovel_delete_jobs_select_own on public.imovel_delete_jobs;
create policy imovel_delete_jobs_select_own
  on public.imovel_delete_jobs
  for select
  using (owner_id = auth.uid());

drop policy if exists imovel_delete_jobs_insert_own on public.imovel_delete_jobs;
create policy imovel_delete_jobs_insert_own
  on public.imovel_delete_jobs
  for insert
  with check (owner_id = auth.uid());

drop policy if exists imovel_delete_jobs_update_own on public.imovel_delete_jobs;
create policy imovel_delete_jobs_update_own
  on public.imovel_delete_jobs
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

commit;
