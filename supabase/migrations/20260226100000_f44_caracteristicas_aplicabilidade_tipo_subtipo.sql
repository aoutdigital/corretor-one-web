-- F44 - Aplicabilidade de características por tipo/subtipo de imóvel + expansão de enums

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'tipo_imovel'
      and e.enumlabel = 'SHOPPING'
  ) then
    alter type public.tipo_imovel add value 'SHOPPING';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'tipo_imovel'
      and e.enumlabel = 'SELF_STORAGE'
  ) then
    alter type public.tipo_imovel add value 'SELF_STORAGE';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'ANDAR_INTEIRO'
  ) then
    alter type public.subtipo_imovel add value 'ANDAR_INTEIRO';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'MEIO_ANDAR'
  ) then
    alter type public.subtipo_imovel add value 'MEIO_ANDAR';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'LOJA_BOX'
  ) then
    alter type public.subtipo_imovel add value 'LOJA_BOX';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'COBERTURA_PADRAO'
  ) then
    alter type public.subtipo_imovel add value 'COBERTURA_PADRAO';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'COBERTURA_DUPLEX'
  ) then
    alter type public.subtipo_imovel add value 'COBERTURA_DUPLEX';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'COBERTURA_TRIPLEX'
  ) then
    alter type public.subtipo_imovel add value 'COBERTURA_TRIPLEX';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'SOBRADO'
  ) then
    alter type public.subtipo_imovel add value 'SOBRADO';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subtipo_imovel'
      and e.enumlabel = 'GEMINADA'
  ) then
    alter type public.subtipo_imovel add value 'GEMINADA';
  end if;
end $$;

alter table public.caracteristicas_catalogo
  add column if not exists tipos_imovel public.tipo_imovel[] not null default '{}'::public.tipo_imovel[],
  add column if not exists subtipos_imovel public.subtipo_imovel[] not null default '{}'::public.subtipo_imovel[];

create index if not exists caracteristicas_catalogo_tipos_imovel_gin_idx
  on public.caracteristicas_catalogo using gin (tipos_imovel);

create index if not exists caracteristicas_catalogo_subtipos_imovel_gin_idx
  on public.caracteristicas_catalogo using gin (subtipos_imovel);

commit;
