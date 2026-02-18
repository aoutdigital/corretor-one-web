-- F11 - E-mail profissional corretor.one (preparação para integração provider)
-- Regra: disponível para planos pagos; solicitação manual do usuário.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_email_profissional') then
    create type public.status_email_profissional as enum (
      'SOLICITADO',
      'ATIVO',
      'SUSPENSO',
      'DESATIVADO',
      'ERRO'
    );
  end if;
end $$;

create table if not exists public.emails_profissionais (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  email text not null unique,
  status public.status_email_profissional not null default 'SOLICITADO',
  provider text,
  provider_account_id text,
  usar_senha_login boolean not null default true,
  solicitado_em timestamptz not null default timezone('utc', now()),
  ativado_em timestamptz,
  desativado_em timestamptz,
  erro_detalhe text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists emails_profissionais_owner_status_idx
  on public.emails_profissionais (owner_id, status);

create index if not exists emails_profissionais_email_idx
  on public.emails_profissionais (email);

drop trigger if exists trg_emails_profissionais_set_updated_at on public.emails_profissionais;
create trigger trg_emails_profissionais_set_updated_at
before update on public.emails_profissionais
for each row
execute function public.set_updated_at();

alter table public.emails_profissionais enable row level security;

drop policy if exists emails_profissionais_select_own on public.emails_profissionais;
create policy emails_profissionais_select_own
  on public.emails_profissionais
  for select
  using (owner_id = auth.uid());

drop policy if exists emails_profissionais_insert_own on public.emails_profissionais;
create policy emails_profissionais_insert_own
  on public.emails_profissionais
  for insert
  with check (owner_id = auth.uid());

drop policy if exists emails_profissionais_update_own on public.emails_profissionais;
create policy emails_profissionais_update_own
  on public.emails_profissionais
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists emails_profissionais_delete_own on public.emails_profissionais;
create policy emails_profissionais_delete_own
  on public.emails_profissionais
  for delete
  using (owner_id = auth.uid());
