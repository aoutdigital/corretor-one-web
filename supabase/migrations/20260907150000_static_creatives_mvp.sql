-- Central de Criativos: catálogo e gerações estáticas do MVP.

do $$ begin create type public.tipo_template as enum ('STATIC', 'CAROUSEL', 'VIDEO'); exception when duplicate_object then null; end $$;
do $$ begin create type public.objetivo_template as enum ('PROMOVER_IMOVEL', 'PROMOVER_EMPREENDIMENTO', 'PROMOVER_ARTIGO', 'PROMOVER_LANDING_PAGE', 'PROMOVER_PERFIL'); exception when duplicate_object then null; end $$;
do $$ begin create type public.provider_template as enum ('HTML_STATIC', 'HTML_VIDEO', 'REMOTION'); exception when duplicate_object then null; end $$;
do $$ begin create type public.creative_output_format as enum ('SQUARE', 'PORTRAIT', 'VERTICAL', 'HORIZONTAL'); exception when duplicate_object then null; end $$;
do $$ begin create type public.creative_template_mode as enum ('FIXED', 'HYBRID'); exception when duplicate_object then null; end $$;
do $$ begin create type public.tipo_post as enum ('STATIC', 'CAROUSEL', 'VIDEO'); exception when duplicate_object then null; end $$;
do $$ begin create type public.status_post as enum ('GERANDO', 'PRONTO', 'ERRO'); exception when duplicate_object then null; end $$;

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(), nome text not null, tipo public.tipo_template not null,
  objetivo public.objetivo_template not null, provider public.provider_template not null,
  renderer_key text not null, version integer not null default 1, mode public.creative_template_mode not null default 'FIXED',
  formatos public.creative_output_format[] not null default '{}', preview_url text, config jsonb not null default '{}',
  ativo boolean not null default true, created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), unique(renderer_key, version)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  subject_type public.public_resource_type not null, subject_id uuid not null,
  template_id uuid not null references public.templates(id), tipo public.tipo_post not null,
  formato public.creative_output_format not null, status public.status_post not null default 'GERANDO',
  resultado_url text, storage_bucket text, storage_path text, payload jsonb not null default '{}', erro text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists posts_owner_created_idx on public.posts(owner_id, created_at desc);
create index if not exists posts_subject_idx on public.posts(owner_id, subject_type, subject_id);

insert into public.templates(nome,tipo,objetivo,provider,renderer_key,version,mode,formatos,config,ativo)
values ('Imóvel Essencial 01','STATIC','PROMOVER_IMOVEL','HTML_STATIC','property-essential-01',1,'HYBRID',array['SQUARE','PORTRAIT','VERTICAL']::public.creative_output_format[],
  '{"headlineMax":55,"supportingTextMax":90,"ctaMax":28,"signatureRequired":true}'::jsonb,true)
on conflict(renderer_key,version) do update set nome=excluded.nome, formatos=excluded.formatos, config=excluded.config, ativo=true;

alter table public.templates enable row level security;
alter table public.posts enable row level security;
create policy templates_select_active on public.templates for select using (ativo = true);
create policy posts_select_own on public.posts for select using (owner_id = auth.uid());
drop trigger if exists trg_templates_set_updated_at on public.templates;
create trigger trg_templates_set_updated_at before update on public.templates for each row execute function public.set_updated_at();
drop trigger if exists trg_posts_set_updated_at on public.posts;
create trigger trg_posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();
