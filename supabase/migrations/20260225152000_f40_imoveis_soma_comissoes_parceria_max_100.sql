-- F40 - Soma das comissões de parceria não pode ultrapassar 100%

begin;

alter table public.imoveis
  drop constraint if exists imoveis_comissoes_parceria_total_max_100_check;

alter table public.imoveis
  add constraint imoveis_comissoes_parceria_total_max_100_check
  check (
    coalesce(comissao_captador_percentual, 0) +
    coalesce(comissao_vendedor_percentual, 0) +
    coalesce(outras_comissoes_percentual, 0) <= 100
  );

commit;
