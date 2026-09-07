-- Landing pages V1: editor por blocos, namespace público compartilhado e métricas.

do $$ begin
  create type public.landing_page_status as enum ('RASCUNHO', 'PUBLICADO', 'ARQUIVADO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.landing_page_tipo as enum (
    'PRE_LANCAMENTO', 'LANCAMENTO', 'LISTA_ESPERA', 'IMOVEL_DESTAQUE',
    'EMPREENDIMENTO', 'CAPTACAO_IMOVEL', 'CURADORIA', 'EVENTO', 'CAMPANHA_GENERICA'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.public_path_resource as enum ('EMPREENDIMENTO', 'LANDING_PAGE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.landing_page_event_type as enum ('VIEW', 'FORM_START', 'FORM_SUBMIT', 'CTA_CLICK');
exception when duplicate_object then null; end $$;

create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status public.landing_page_status not null default 'RASCUNHO',
  tipo public.landing_page_tipo not null default 'CAMPANHA_GENERICA',
  nome_interno text not null,
  titulo text not null,
  subtitulo text,
  slug text not null,
  conteudo_blocos jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  tema_config jsonb not null default '{"preset":"ELEGANTE"}'::jsonb,
  imovel_id uuid references public.imoveis(id) on delete set null,
  empreendimento_id uuid references public.empreendimentos(id) on delete set null,
  meta_title text,
  meta_description text,
  og_image_url text,
  indexar boolean not null default false,
  publicado_em timestamptz,
  encerramento_em timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint landing_pages_owner_slug_unique unique(owner_id, slug),
  constraint landing_pages_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint landing_pages_slug_reserved_check check (
    slug not in ('artigos', 'imoveis', 'empreendimentos', 'venda', 'aluguel', 'anuncie', 'logo', 'logo-white')
  ),
  constraint landing_pages_nome_len_check check (char_length(trim(nome_interno)) between 3 and 120),
  constraint landing_pages_titulo_len_check check (char_length(trim(titulo)) between 3 and 140),
  constraint landing_pages_subtitulo_len_check check (subtitulo is null or char_length(subtitulo) <= 240),
  constraint landing_pages_meta_title_len_check check (meta_title is null or char_length(meta_title) <= 70),
  constraint landing_pages_meta_description_len_check check (meta_description is null or char_length(meta_description) <= 180)
);

create index if not exists landing_pages_owner_status_updated_idx on public.landing_pages(owner_id, status, updated_at desc);
create index if not exists landing_pages_owner_tipo_idx on public.landing_pages(owner_id, tipo);

create table if not exists public.profile_public_paths (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  resource_type public.public_path_resource not null,
  resource_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_public_paths_owner_slug_unique unique(owner_id, slug),
  constraint profile_public_paths_resource_unique unique(resource_type, resource_id),
  constraint profile_public_paths_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

insert into public.profile_public_paths(owner_id, slug, resource_type, resource_id)
select owner_id, slug_publico, 'EMPREENDIMENTO'::public.public_path_resource, id
from public.empreendimentos
where slug_publico is not null and slug_publico <> ''
on conflict do nothing;

create or replace function public.sync_profile_public_path()
returns trigger language plpgsql security definer set search_path = public as $$
declare resource public.public_path_resource := tg_argv[0]::public.public_path_resource;
declare resource_slug text;
begin
  if tg_op = 'DELETE' then
    delete from public.profile_public_paths where resource_type = resource and resource_id = old.id;
    return old;
  end if;
  resource_slug := case
    when resource = 'EMPREENDIMENTO' then to_jsonb(new) ->> 'slug_publico'
    else to_jsonb(new) ->> 'slug'
  end;
  if tg_op = 'UPDATE' then
    delete from public.profile_public_paths where resource_type = resource and resource_id = new.id;
  end if;
  if resource_slug is not null and resource_slug <> '' then
    insert into public.profile_public_paths(owner_id, slug, resource_type, resource_id)
    values(new.owner_id, resource_slug, resource, new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_empreendimentos_public_path on public.empreendimentos;
create trigger trg_empreendimentos_public_path after insert or update or delete on public.empreendimentos
for each row execute function public.sync_profile_public_path('EMPREENDIMENTO');

drop trigger if exists trg_landing_pages_public_path on public.landing_pages;
create trigger trg_landing_pages_public_path after insert or update or delete on public.landing_pages
for each row execute function public.sync_profile_public_path('LANDING_PAGE');

create table if not exists public.landing_page_events (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  event_type public.landing_page_event_type not null,
  visitor_id text,
  page_url text,
  referrer text,
  utm jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists landing_page_events_page_type_created_idx on public.landing_page_events(landing_page_id, event_type, created_at desc);
create index if not exists landing_page_events_owner_created_idx on public.landing_page_events(owner_id, created_at desc);

create table if not exists public.lead_empreendimentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lead_empreendimentos_unique unique(lead_id, empreendimento_id)
);
create index if not exists lead_empreendimentos_owner_idx on public.lead_empreendimentos(owner_id);

drop trigger if exists trg_landing_pages_set_updated_at on public.landing_pages;
create trigger trg_landing_pages_set_updated_at before update on public.landing_pages
for each row execute function public.set_updated_at();
drop trigger if exists trg_profile_public_paths_set_updated_at on public.profile_public_paths;
create trigger trg_profile_public_paths_set_updated_at before update on public.profile_public_paths
for each row execute function public.set_updated_at();
drop trigger if exists trg_lead_empreendimentos_set_updated_at on public.lead_empreendimentos;
create trigger trg_lead_empreendimentos_set_updated_at before update on public.lead_empreendimentos
for each row execute function public.set_updated_at();

alter table public.landing_pages enable row level security;
alter table public.profile_public_paths enable row level security;
alter table public.landing_page_events enable row level security;
alter table public.lead_empreendimentos enable row level security;

create policy landing_pages_select_own_or_public on public.landing_pages for select
using (
  owner_id = auth.uid()
  or (
    status = 'PUBLICADO'
    and exists (
      select 1
      from public.profiles profile
      where profile.id = landing_pages.owner_id
        and profile.status = 'ATIVO'
    )
  )
);
create policy landing_pages_insert_own on public.landing_pages for insert with check (owner_id = auth.uid());
create policy landing_pages_update_own on public.landing_pages for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy landing_pages_delete_own on public.landing_pages for delete using (owner_id = auth.uid());

create policy profile_public_paths_select_public on public.profile_public_paths for select using (true);

create policy landing_page_events_select_own on public.landing_page_events for select using (owner_id = auth.uid());

create policy lead_empreendimentos_select_own on public.lead_empreendimentos for select using (owner_id = auth.uid());
create policy lead_empreendimentos_insert_own on public.lead_empreendimentos for insert with check (owner_id = auth.uid());
create policy lead_empreendimentos_update_own on public.lead_empreendimentos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy lead_empreendimentos_delete_own on public.lead_empreendimentos for delete using (owner_id = auth.uid());
