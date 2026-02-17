-- F1.4 - Role separation between corretor (profiles) and portal user (portal_users)
-- - Creates/adjusts portal_users table
-- - Prevents same auth user from coexisting in profiles and portal_users

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_portal_user') then
    create type public.status_portal_user as enum (
      'ATIVO',
      'SUSPENSO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'canal_contato') then
    create type public.canal_contato as enum (
      'EMAIL',
      'WHATSAPP'
    );
  end if;
end $$;

create table if not exists public.portal_users (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  sobrenome text not null,
  email text not null unique,
  telefone text,
  telefone_e164 text,
  foto_url text,
  status public.status_portal_user not null default 'ATIVO',
  canais public.canal_contato[],
  aceite_marketing_em timestamptz,
  email_verificado_em timestamptz,
  whatsapp_verificado_em timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists portal_users_status_idx
  on public.portal_users (status);

create index if not exists portal_users_telefone_e164_idx
  on public.portal_users (telefone_e164);

drop trigger if exists trg_portal_users_set_updated_at on public.portal_users;
create trigger trg_portal_users_set_updated_at
before update on public.portal_users
for each row
execute function public.set_updated_at();

create or replace function public.enforce_user_role_exclusive()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'profiles' then
    if exists (select 1 from public.portal_users pu where pu.id = new.id) then
      raise exception 'user cannot be both corretor (profiles) and portal_user';
    end if;
  elsif tg_table_name = 'portal_users' then
    if exists (select 1 from public.profiles p where p.id = new.id) then
      raise exception 'user cannot be both portal_user and corretor (profiles)';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_role_exclusive on public.profiles;
create trigger trg_profiles_role_exclusive
before insert or update of id on public.profiles
for each row
execute function public.enforce_user_role_exclusive();

drop trigger if exists trg_portal_users_role_exclusive on public.portal_users;
create trigger trg_portal_users_role_exclusive
before insert or update of id on public.portal_users
for each row
execute function public.enforce_user_role_exclusive();

