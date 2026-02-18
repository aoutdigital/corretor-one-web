-- F12 - Stripe billing integration columns and constraints

alter table public.planos
  add column if not exists stripe_product_id text,
  add column if not exists stripe_price_id_mensal text,
  add column if not exists stripe_price_id_anual text;

create unique index if not exists planos_stripe_price_mensal_unique
  on public.planos (stripe_price_id_mensal)
  where stripe_price_id_mensal is not null;

create unique index if not exists planos_stripe_price_anual_unique
  on public.planos (stripe_price_id_anual)
  where stripe_price_id_anual is not null;

alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_unique
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.assinaturas
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_current_period_end timestamptz;

create unique index if not exists assinaturas_owner_unique
  on public.assinaturas (owner_id);

create unique index if not exists assinaturas_stripe_subscription_id_unique
  on public.assinaturas (stripe_subscription_id)
  where stripe_subscription_id is not null;
