-- F9 - OTP de contato (SMS/WhatsApp) para onboarding e autenticações futuras
-- Fonte: docs/data-model.md + docs/enums.md

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_tipo') then
    create type public.user_tipo as enum (
      'PORTAL',
      'CORRETOR'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_verificacao') then
    create type public.status_verificacao as enum (
      'PENDENTE',
      'VERIFICADO',
      'EXPIRADO',
      'BLOQUEADO'
    );
  end if;
end $$;

create table if not exists public.verificacoes_contato (
  id uuid primary key default gen_random_uuid(),
  user_tipo public.user_tipo not null,
  user_id uuid not null,
  canal public.canal_contato not null,
  destino text not null,
  codigo_hash text not null,
  expira_em timestamptz not null,
  tentativas int not null default 0,
  status public.status_verificacao not null default 'PENDENTE',
  enviado_em timestamptz not null default timezone('utc', now()),
  verificado_em timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists verificacoes_contato_lookup_idx
  on public.verificacoes_contato (user_tipo, user_id, canal, destino, status, created_at desc);

create index if not exists verificacoes_contato_expira_em_idx
  on public.verificacoes_contato (expira_em);

alter table public.verificacoes_contato enable row level security;

