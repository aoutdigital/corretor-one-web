-- F5 - Media foundation
-- Creates: midia, midia_variantes, midia_relacoes
-- Includes enums, constraints, indexes, and owner-based RLS.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_midia') then
    create type public.tipo_midia as enum (
      'IMAGEM',
      'VIDEO',
      'PDF'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'storage_provider') then
    create type public.storage_provider as enum (
      'SUPABASE',
      'S3'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'variante_tipo') then
    create type public.variante_tipo as enum (
      'THUMB_150',
      'W240',
      'W360',
      'W480',
      'W768',
      'W1024',
      'FULL_1920'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'alt_origem') then
    create type public.alt_origem as enum (
      'MANUAL',
      'AYKA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ref_tipo') then
    create type public.ref_tipo as enum (
      'IMOVEL',
      'EMPREENDIMENTO',
      'ARTIGO',
      'CAMPANHA',
      'TEMPLATE',
      'OUTRO'
    );
  end if;
end $$;

create table if not exists public.midia (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  tipo public.tipo_midia not null,
  storage_provider public.storage_provider not null default 'SUPABASE',
  storage_bucket text not null,
  storage_path text not null,
  url text not null,
  largura int,
  altura int,
  tamanho_bytes bigint,
  alt text,
  titulo text,
  legenda text,
  caracteristica text,
  alt_gerado_em timestamptz,
  alt_origem public.alt_origem not null default 'MANUAL',
  hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.midia_variantes (
  id uuid primary key default gen_random_uuid(),
  midia_id uuid not null references public.midia (id) on delete cascade,
  tipo public.variante_tipo not null,
  largura int not null,
  altura int not null,
  storage_path text not null,
  tamanho_bytes bigint,
  created_at timestamptz not null default timezone('utc', now()),
  constraint midia_variantes_midia_tipo_unique unique (midia_id, tipo)
);

create table if not exists public.midia_relacoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  ref_tipo public.ref_tipo not null,
  ref_id uuid not null,
  midia_id uuid not null references public.midia (id) on delete cascade,
  ordem int not null default 0,
  grupo text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint midia_relacoes_ref_midia_unique unique (ref_tipo, ref_id, midia_id)
);

create index if not exists midia_owner_id_idx on public.midia (owner_id);
create index if not exists midia_tipo_idx on public.midia (tipo);
create index if not exists midia_created_at_idx on public.midia (created_at desc);

create index if not exists midia_variantes_midia_id_idx on public.midia_variantes (midia_id);

create index if not exists midia_relacoes_owner_id_idx on public.midia_relacoes (owner_id);
create index if not exists midia_relacoes_ref_tipo_ref_id_idx on public.midia_relacoes (ref_tipo, ref_id);
create index if not exists midia_relacoes_midia_id_idx on public.midia_relacoes (midia_id);

alter table public.midia enable row level security;
alter table public.midia_variantes enable row level security;
alter table public.midia_relacoes enable row level security;

drop policy if exists midia_select_own on public.midia;
create policy midia_select_own
  on public.midia
  for select
  using (owner_id = auth.uid());

drop policy if exists midia_insert_own on public.midia;
create policy midia_insert_own
  on public.midia
  for insert
  with check (owner_id = auth.uid());

drop policy if exists midia_update_own on public.midia;
create policy midia_update_own
  on public.midia
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists midia_delete_own on public.midia;
create policy midia_delete_own
  on public.midia
  for delete
  using (owner_id = auth.uid());

drop policy if exists midia_relacoes_select_own on public.midia_relacoes;
create policy midia_relacoes_select_own
  on public.midia_relacoes
  for select
  using (owner_id = auth.uid());

drop policy if exists midia_relacoes_insert_own on public.midia_relacoes;
create policy midia_relacoes_insert_own
  on public.midia_relacoes
  for insert
  with check (owner_id = auth.uid());

drop policy if exists midia_relacoes_update_own on public.midia_relacoes;
create policy midia_relacoes_update_own
  on public.midia_relacoes
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists midia_relacoes_delete_own on public.midia_relacoes;
create policy midia_relacoes_delete_own
  on public.midia_relacoes
  for delete
  using (owner_id = auth.uid());

drop policy if exists midia_variantes_select_own on public.midia_variantes;
create policy midia_variantes_select_own
  on public.midia_variantes
  for select
  using (
    exists (
      select 1
      from public.midia m
      where m.id = midia_variantes.midia_id
        and m.owner_id = auth.uid()
    )
  );

drop policy if exists midia_variantes_insert_own on public.midia_variantes;
create policy midia_variantes_insert_own
  on public.midia_variantes
  for insert
  with check (
    exists (
      select 1
      from public.midia m
      where m.id = midia_variantes.midia_id
        and m.owner_id = auth.uid()
    )
  );

drop policy if exists midia_variantes_update_own on public.midia_variantes;
create policy midia_variantes_update_own
  on public.midia_variantes
  for update
  using (
    exists (
      select 1
      from public.midia m
      where m.id = midia_variantes.midia_id
        and m.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.midia m
      where m.id = midia_variantes.midia_id
        and m.owner_id = auth.uid()
    )
  );

drop policy if exists midia_variantes_delete_own on public.midia_variantes;
create policy midia_variantes_delete_own
  on public.midia_variantes
  for delete
  using (
    exists (
      select 1
      from public.midia m
      where m.id = midia_variantes.midia_id
        and m.owner_id = auth.uid()
    )
  );

