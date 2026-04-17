-- F51 - Código ONE somente na publicação (rascunho sem código)

begin;

alter table public.imoveis
  alter column codigo drop not null;

alter table public.imoveis
  drop constraint if exists imoveis_owner_codigo_unique;

create unique index if not exists imoveis_owner_codigo_unique_idx
  on public.imoveis (owner_id, codigo)
  where codigo is not null;

commit;
