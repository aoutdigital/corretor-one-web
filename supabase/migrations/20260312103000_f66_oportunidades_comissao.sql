-- f66_oportunidades_comissao.sql
-- Adiciona comissão percentual/valor em oportunidades (negocios) e
-- semeia o padrão inicial a partir do imóvel associado quando disponível.

alter table public.negocios
  add column if not exists comissaopercentual numeric;

alter table public.negocios
  add column if not exists comissaovalor numeric;

update public.negocios as n
set comissaopercentual = i.comissao_venda_percentual,
    comissaovalor = case
      when coalesce(n.valor, n.valor_estimado) is not null and i.comissao_venda_percentual is not null
        then round((coalesce(n.valor, n.valor_estimado) * i.comissao_venda_percentual) / 100, 2)
      else n.comissaovalor
    end
from public.imoveis as i
where n.imovel_id = i.id
  and n.modalidade = 'VENDA'
  and n.comissaopercentual is null
  and n.comissaovalor is null
  and i.comissao_venda_percentual is not null;

alter table public.negocios
  drop constraint if exists negocios_comissao_nao_negativa_chk;

alter table public.negocios
  add constraint negocios_comissao_nao_negativa_chk
  check (
    coalesce(comissaopercentual, 0) >= 0
    and coalesce(comissaovalor, 0) >= 0
  )
  not valid;

alter table public.negocios
  drop constraint if exists negocios_comissao_consistente_chk;

alter table public.negocios
  add constraint negocios_comissao_consistente_chk
  check (
    valor is null
    or comissaopercentual is null
    or comissaovalor is null
    or round((valor * comissaopercentual) / 100, 2) = round(comissaovalor, 2)
  )
  not valid;
