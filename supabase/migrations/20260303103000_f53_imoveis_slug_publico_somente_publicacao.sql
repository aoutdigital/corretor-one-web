-- F53 - Imóvel: slug_publico nullable no rascunho e único apenas quando preenchido

begin;

alter table public.imoveis
  alter column slug_publico drop not null;

alter table public.imoveis
  drop constraint if exists imoveis_owner_slug_unique;

drop index if exists public.imoveis_owner_slug_unique;

drop index if exists public.imoveis_owner_slug_unique_idx;

create unique index if not exists imoveis_owner_slug_unique_idx
  on public.imoveis (owner_id, slug_publico)
  where slug_publico is not null;

commit;
