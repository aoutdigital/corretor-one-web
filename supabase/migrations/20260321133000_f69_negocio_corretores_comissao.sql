create table if not exists public.negocio_corretores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  percentual_comissao numeric,
  valor_comissao numeric,
  vinculado_corretor_parceiro boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.negocio_corretores
  drop constraint if exists negocio_corretores_percentual_comissao_chk;

alter table public.negocio_corretores
  add constraint negocio_corretores_percentual_comissao_chk
  check (percentual_comissao is null or (percentual_comissao >= 0 and percentual_comissao <= 100));

alter table public.negocio_corretores
  drop constraint if exists negocio_corretores_valor_comissao_chk;

alter table public.negocio_corretores
  add constraint negocio_corretores_valor_comissao_chk
  check (valor_comissao is null or valor_comissao >= 0);

create index if not exists negocio_corretores_owner_id_idx
  on public.negocio_corretores (owner_id);

create index if not exists negocio_corretores_negocio_id_idx
  on public.negocio_corretores (negocio_id);

create or replace function public.check_negocio_corretor_matches_negocio()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  negocio_owner_id uuid;
begin
  select owner_id
    into negocio_owner_id
  from public.negocios
  where id = new.negocio_id;

  if negocio_owner_id is null then
    raise exception 'negocio_id does not exist';
  end if;

  if negocio_owner_id <> new.owner_id then
    raise exception 'negocio corretor owner mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_negocio_corretores_owner_consistency on public.negocio_corretores;
create trigger trg_negocio_corretores_owner_consistency
before insert or update of owner_id, negocio_id on public.negocio_corretores
for each row
execute function public.check_negocio_corretor_matches_negocio();

drop trigger if exists trg_negocio_corretores_set_updated_at on public.negocio_corretores;
create trigger trg_negocio_corretores_set_updated_at
before update on public.negocio_corretores
for each row
execute function public.set_updated_at();

alter table public.negocio_corretores enable row level security;

drop policy if exists negocio_corretores_select_own on public.negocio_corretores;
create policy negocio_corretores_select_own
  on public.negocio_corretores
  for select
  using (owner_id = auth.uid());

drop policy if exists negocio_corretores_insert_own on public.negocio_corretores;
create policy negocio_corretores_insert_own
  on public.negocio_corretores
  for insert
  with check (owner_id = auth.uid());

drop policy if exists negocio_corretores_update_own on public.negocio_corretores;
create policy negocio_corretores_update_own
  on public.negocio_corretores
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists negocio_corretores_delete_own on public.negocio_corretores;
create policy negocio_corretores_delete_own
  on public.negocio_corretores
  for delete
  using (owner_id = auth.uid());
