-- F43 - Persistencia da etapa atual do multistep de imóveis em rascunho

begin;

alter table public.imoveis
  add column if not exists step_rascunho int not null default 1;

alter table public.imoveis
  drop constraint if exists imoveis_step_rascunho_range_check;
alter table public.imoveis
  add constraint imoveis_step_rascunho_range_check
  check (step_rascunho between 1 and 10);

create index if not exists imoveis_owner_status_step_rascunho_idx
  on public.imoveis (owner_id, status, step_rascunho);

commit;
