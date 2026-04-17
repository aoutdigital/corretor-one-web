-- F32 - Fila assíncrona para exclusão física de mídias no storage

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_midia_delete_job') then
    create type public.status_midia_delete_job as enum (
      'PENDENTE',
      'PROCESSANDO',
      'CONCLUIDO',
      'ERRO',
      'CANCELADO'
    );
  end if;
end $$;

create table if not exists public.midia_delete_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  midia_id uuid,
  storage_provider text not null default 'SUPABASE',
  storage_bucket text not null,
  storage_path text not null,
  status public.status_midia_delete_job not null default 'PENDENTE',
  tentativas int not null default 0,
  erro text,
  next_retry_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint midia_delete_jobs_storage_unique unique (storage_provider, storage_bucket, storage_path)
);

create index if not exists midia_delete_jobs_owner_status_idx
  on public.midia_delete_jobs (owner_id, status, created_at);

create index if not exists midia_delete_jobs_status_retry_idx
  on public.midia_delete_jobs (status, next_retry_at, created_at);

drop trigger if exists trg_midia_delete_jobs_set_updated_at on public.midia_delete_jobs;
create trigger trg_midia_delete_jobs_set_updated_at
before update on public.midia_delete_jobs
for each row
execute function public.set_updated_at();

alter table public.midia_delete_jobs enable row level security;

drop policy if exists midia_delete_jobs_select_own on public.midia_delete_jobs;
create policy midia_delete_jobs_select_own
  on public.midia_delete_jobs
  for select
  using (owner_id = auth.uid());

drop policy if exists midia_delete_jobs_insert_own on public.midia_delete_jobs;
create policy midia_delete_jobs_insert_own
  on public.midia_delete_jobs
  for insert
  with check (owner_id = auth.uid());

drop policy if exists midia_delete_jobs_update_own on public.midia_delete_jobs;
create policy midia_delete_jobs_update_own
  on public.midia_delete_jobs
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

commit;
