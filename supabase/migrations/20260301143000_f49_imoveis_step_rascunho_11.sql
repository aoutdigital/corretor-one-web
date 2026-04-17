-- F49 - Permite etapa 11 no step_rascunho do multistep de imóveis

begin;

alter table public.imoveis
  drop constraint if exists imoveis_step_rascunho_range_check;

alter table public.imoveis
  add constraint imoveis_step_rascunho_range_check
  check (step_rascunho between 1 and 11);

commit;
