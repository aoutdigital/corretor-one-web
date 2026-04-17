-- F39 - Campo textual de comissão de aluguel no imóvel

begin;

alter table public.imoveis
  add column if not exists comissao_locacao text;

commit;
