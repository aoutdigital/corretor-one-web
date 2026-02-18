-- F10 - Billing base: planos e assinaturas
-- Fonte: docs/data-model.md + docs/enums.md + Planos Beta.xlsx

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_assinatura') then
    create type public.status_assinatura as enum (
      'ATIVA',
      'PENDENTE',
      'ATRASADA',
      'CANCELADA'
    );
  end if;
end $$;

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  preco_mensal numeric not null default 0,
  preco_anual numeric,
  limite_imoveis int,
  limite_emails_mes int,
  limite_whatsapp_mes int,
  limite_storage_mb int,
  ayka_franquia_mensal int not null default 0,
  recursos jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  plano_id uuid not null references public.planos (id),
  status public.status_assinatura not null default 'PENDENTE',
  inicio_em timestamptz not null default timezone('utc', now()),
  fim_em timestamptz,
  cancelado_em timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists planos_ativo_idx
  on public.planos (ativo);

create index if not exists assinaturas_owner_id_idx
  on public.assinaturas (owner_id);

create index if not exists assinaturas_plano_id_idx
  on public.assinaturas (plano_id);

create index if not exists assinaturas_owner_status_idx
  on public.assinaturas (owner_id, status);

drop trigger if exists trg_planos_set_updated_at on public.planos;
create trigger trg_planos_set_updated_at
before update on public.planos
for each row
execute function public.set_updated_at();

alter table public.planos enable row level security;
alter table public.assinaturas enable row level security;

drop policy if exists planos_select_public on public.planos;
create policy planos_select_public
  on public.planos
  for select
  using (ativo = true);

drop policy if exists assinaturas_select_own on public.assinaturas;
create policy assinaturas_select_own
  on public.assinaturas
  for select
  using (owner_id = auth.uid());

drop policy if exists assinaturas_insert_own on public.assinaturas;
create policy assinaturas_insert_own
  on public.assinaturas
  for insert
  with check (owner_id = auth.uid());

drop policy if exists assinaturas_update_own on public.assinaturas;
create policy assinaturas_update_own
  on public.assinaturas
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists assinaturas_delete_own on public.assinaturas;
create policy assinaturas_delete_own
  on public.assinaturas
  for delete
  using (owner_id = auth.uid());

insert into public.planos (
  nome,
  slug,
  preco_mensal,
  preco_anual,
  limite_imoveis,
  limite_emails_mes,
  limite_whatsapp_mes,
  limite_storage_mb,
  ayka_franquia_mensal,
  recursos,
  ativo
)
values
  (
    'Grátis',
    'gratis',
    0,
    null,
    20,
    0,
    0,
    null,
    5,
    jsonb_build_object(
      'email_corretor_one', 0,
      'empreendimentos_limite', 20,
      'crm_leads_limite', 200,
      'landing_pages_limite', 1,
      'artigos_limite', 5,
      'integracao_zap_imoveis', false,
      'integracao_imovelweb', false,
      'integracao_chaves_na_mao', false,
      'integracao_casa_mineira', false
    ),
    true
  ),
  (
    'Presença',
    'presenca',
    99,
    null,
    100,
    1000,
    0,
    null,
    50,
    jsonb_build_object(
      'email_corretor_one', 1,
      'empreendimentos_limite', 100,
      'crm_leads_limite', 1000,
      'landing_pages_limite', 5,
      'artigos_limite', 50,
      'integracao_zap_imoveis', false,
      'integracao_imovelweb', false,
      'integracao_chaves_na_mao', false,
      'integracao_casa_mineira', false
    ),
    true
  ),
  (
    'Destaque',
    'destaque',
    199,
    null,
    200,
    2000,
    500,
    null,
    100,
    jsonb_build_object(
      'email_corretor_one', 1,
      'empreendimentos_limite', 200,
      'crm_leads_limite', 2000,
      'landing_pages_limite', 10,
      'artigos_limite', 100,
      'integracao_zap_imoveis', false,
      'integracao_imovelweb', true,
      'integracao_chaves_na_mao', false,
      'integracao_casa_mineira', false
    ),
    true
  ),
  (
    'Autoridade',
    'autoridade',
    480,
    null,
    2000,
    10000,
    1000,
    null,
    500,
    jsonb_build_object(
      'email_corretor_one', 1,
      'empreendimentos_limite', null,
      'crm_leads_limite', 10000,
      'landing_pages_limite', null,
      'artigos_limite', null,
      'integracao_zap_imoveis', true,
      'integracao_imovelweb', true,
      'integracao_chaves_na_mao', true,
      'integracao_casa_mineira', true
    ),
    true
  )
on conflict (slug) do update
set
  nome = excluded.nome,
  preco_mensal = excluded.preco_mensal,
  preco_anual = excluded.preco_anual,
  limite_imoveis = excluded.limite_imoveis,
  limite_emails_mes = excluded.limite_emails_mes,
  limite_whatsapp_mes = excluded.limite_whatsapp_mes,
  limite_storage_mb = excluded.limite_storage_mb,
  ayka_franquia_mensal = excluded.ayka_franquia_mensal,
  recursos = excluded.recursos,
  ativo = excluded.ativo;

