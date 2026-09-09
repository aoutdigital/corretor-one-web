-- Admin foundation: internal users, RBAC roles and immutable audit trail.

do $$ begin
  create type public.papel_admin as enum ('ADM', 'SUPORTE', 'MARKETING');
exception when duplicate_object then
  alter type public.papel_admin add value if not exists 'SUPORTE';
end $$;

do $$ begin
  create type public.status_admin as enum ('ATIVO', 'SUSPENSO');
exception when duplicate_object then null;
end $$;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  email text not null,
  papel public.papel_admin not null,
  status public.status_admin not null default 'ATIVO',
  last_login_at timestamptz,
  created_by uuid references public.admin_users(id) on delete set null,
  notas text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists admin_users_email_unique_ci on public.admin_users (lower(email));
create index if not exists admin_users_status_papel_idx on public.admin_users (status, papel);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete restrict,
  acao text not null,
  recurso_tipo text not null,
  recurso_id text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  justificativa text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_audit_logs_admin_created_idx on public.admin_audit_logs (admin_user_id, created_at desc);
create index if not exists admin_audit_logs_recurso_idx on public.admin_audit_logs (recurso_tipo, recurso_id, created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

-- No client policies by design. Access is only through server routes after RBAC validation.

drop trigger if exists trg_admin_users_set_updated_at on public.admin_users;
create trigger trg_admin_users_set_updated_at before update on public.admin_users
for each row execute function public.set_updated_at();
