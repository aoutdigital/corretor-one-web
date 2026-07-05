-- F71 - Profile authority numbers
-- Adds controlled public authority metrics for broker profiles.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_authority_number_type') then
    create type public.profile_authority_number_type as enum (
      'VGV_NEGOCIADO',
      'IMOVEIS_VENDIDOS_ALUGADOS',
      'CLIENTES_ATENDIDOS',
      'ANOS_CARREIRA'
    );
  end if;
end
$$;

create table if not exists public.profile_authority_numbers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tipo public.profile_authority_number_type not null,
  valor text not null,
  rotulo text not null,
  descricao text,
  ordem integer not null default 0,
  visivel boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint profile_authority_numbers_owner_tipo_unique unique (owner_id, tipo),
  constraint profile_authority_numbers_valor_len check (char_length(btrim(valor)) between 1 and 24),
  constraint profile_authority_numbers_rotulo_len check (char_length(btrim(rotulo)) between 1 and 80),
  constraint profile_authority_numbers_descricao_len check (descricao is null or char_length(btrim(descricao)) <= 160),
  constraint profile_authority_numbers_ordem_check check (ordem >= 0)
);

create index if not exists profile_authority_numbers_owner_ordem_idx
  on public.profile_authority_numbers (owner_id, ordem, created_at);

create index if not exists profile_authority_numbers_owner_visible_idx
  on public.profile_authority_numbers (owner_id, visivel, ordem);

create or replace function public.profile_authority_numbers_limit_visible()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  visible_count integer;
begin
  if new.visivel then
    select count(*)
      into visible_count
      from public.profile_authority_numbers
     where owner_id = new.owner_id
       and visivel = true
       and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if visible_count >= 3 then
      raise exception 'profile can display at most 3 authority numbers';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profile_authority_numbers_limit_visible on public.profile_authority_numbers;
create trigger trg_profile_authority_numbers_limit_visible
  before insert or update of owner_id, visivel
  on public.profile_authority_numbers
  for each row
  execute function public.profile_authority_numbers_limit_visible();

drop trigger if exists trg_profile_authority_numbers_set_updated_at on public.profile_authority_numbers;
create trigger trg_profile_authority_numbers_set_updated_at
  before update on public.profile_authority_numbers
  for each row
  execute function public.set_updated_at();

alter table public.profile_authority_numbers enable row level security;

drop policy if exists profile_authority_numbers_owner_select on public.profile_authority_numbers;
create policy profile_authority_numbers_owner_select
  on public.profile_authority_numbers
  for select
  using (owner_id = auth.uid());

drop policy if exists profile_authority_numbers_owner_insert on public.profile_authority_numbers;
create policy profile_authority_numbers_owner_insert
  on public.profile_authority_numbers
  for insert
  with check (owner_id = auth.uid());

drop policy if exists profile_authority_numbers_owner_update on public.profile_authority_numbers;
create policy profile_authority_numbers_owner_update
  on public.profile_authority_numbers
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists profile_authority_numbers_owner_delete on public.profile_authority_numbers;
create policy profile_authority_numbers_owner_delete
  on public.profile_authority_numbers
  for delete
  using (owner_id = auth.uid());

drop policy if exists profile_authority_numbers_public_read_visible on public.profile_authority_numbers;
create policy profile_authority_numbers_public_read_visible
  on public.profile_authority_numbers
  for select
  using (
    visivel = true
    and exists (
      select 1
        from public.profiles p
       where p.id = owner_id
         and p.status = 'ATIVO'::public.status_usuario
         and p.nickname is not null
    )
  );
