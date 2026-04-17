-- F30 - Empreendimento: slug_publico nullable no rascunho e unico apenas quando preenchido

begin;

alter table public.empreendimentos
  alter column slug_publico drop not null;

alter table public.empreendimentos
  drop constraint if exists empreendimentos_owner_slug_unique;

drop index if exists public.empreendimentos_owner_slug_unique;

drop index if exists public.empreendimentos_owner_slug_unique_idx;

create unique index if not exists empreendimentos_owner_slug_unique_idx
  on public.empreendimentos (owner_id, slug_publico)
  where slug_publico is not null;

commit;
