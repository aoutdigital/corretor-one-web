-- Atribuição de marketing transversal para todos os recursos públicos.

do $$ begin
  create type public.public_resource_type as enum ('PROFILE', 'PROPERTY', 'DEVELOPMENT', 'ARTICLE', 'LANDING_PAGE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.public_event_type as enum ('VIEW', 'FORM_START', 'FORM_SUBMIT', 'CTA_CLICK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.marketing_channel as enum ('DIRECT', 'ORGANIC_SEARCH', 'PAID_SEARCH', 'ORGANIC_SOCIAL', 'PAID_SOCIAL', 'EMAIL', 'REFERRAL', 'OTHER');
exception when duplicate_object then null; end $$;

create table if not exists public.marketing_touchpoints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  visitor_id uuid not null,
  session_id uuid not null,
  resource_type public.public_resource_type not null,
  resource_id uuid,
  channel public.marketing_channel not null,
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  click_ids jsonb not null default '{}'::jsonb,
  landing_url text,
  referrer text,
  is_direct boolean not null default false,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_touchpoints_visitor_idx on public.marketing_touchpoints(owner_id, visitor_id, occurred_at desc);
create index if not exists marketing_touchpoints_session_idx on public.marketing_touchpoints(session_id);
create index if not exists marketing_touchpoints_campaign_idx on public.marketing_touchpoints(owner_id, campaign, occurred_at desc) where campaign is not null;

create table if not exists public.public_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  visitor_id uuid not null,
  session_id uuid not null,
  touchpoint_id uuid references public.marketing_touchpoints(id) on delete set null,
  resource_type public.public_resource_type not null,
  resource_id uuid,
  event_type public.public_event_type not null,
  page_url text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists public_events_owner_created_idx on public.public_events(owner_id, occurred_at desc);
create index if not exists public_events_resource_idx on public.public_events(owner_id, resource_type, resource_id, event_type, occurred_at desc);
create index if not exists public_events_visitor_idx on public.public_events(owner_id, visitor_id, occurred_at desc);

-- Preserva as métricas históricas das LPs; novos eventos usam apenas public_events.
insert into public.public_events(owner_id, visitor_id, session_id, resource_type, resource_id, event_type, page_url, metadata, occurred_at)
select owner_id,
  case when visitor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then visitor_id::uuid else gen_random_uuid() end,
  gen_random_uuid(), 'LANDING_PAGE'::public.public_resource_type, landing_page_id,
  event_type::text::public.public_event_type, page_url,
  metadata || jsonb_build_object('legacy_landing_page_event_id', id), created_at
from public.landing_page_events;

create table if not exists public.lead_attributions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade unique,
  conversion_event_id uuid references public.public_events(id) on delete set null,
  first_touch_id uuid references public.marketing_touchpoints(id) on delete set null,
  last_touch_id uuid references public.marketing_touchpoints(id) on delete set null,
  last_non_direct_touch_id uuid references public.marketing_touchpoints(id) on delete set null,
  assisted_touch_ids uuid[] not null default '{}',
  sessions_count integer not null default 0 check (sessions_count >= 0),
  touchpoints_count integer not null default 0 check (touchpoints_count >= 0),
  days_to_convert integer not null default 0 check (days_to_convert >= 0),
  attribution_window_days integer not null default 180 check (attribution_window_days between 1 and 730),
  snapshot jsonb not null default '{}'::jsonb,
  converted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lead_attributions_owner_converted_idx on public.lead_attributions(owner_id, converted_at desc);

alter table public.marketing_touchpoints enable row level security;
alter table public.public_events enable row level security;
alter table public.lead_attributions enable row level security;

create policy marketing_touchpoints_select_own on public.marketing_touchpoints for select using (owner_id = auth.uid());
create policy public_events_select_own on public.public_events for select using (owner_id = auth.uid());
create policy lead_attributions_select_own on public.lead_attributions for select using (owner_id = auth.uid());

drop trigger if exists trg_lead_attributions_set_updated_at on public.lead_attributions;
create trigger trg_lead_attributions_set_updated_at before update on public.lead_attributions
for each row execute function public.set_updated_at();
