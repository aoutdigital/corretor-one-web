-- F23 - Modelo de API por acao AYKA (fonte no banco)

begin;

alter table public.ayka_custos_acoes
  add column if not exists modelo_api text;

update public.ayka_custos_acoes
set modelo_api = 'gemini-3-flash-preview'
where acao_codigo = 'CRIAR_DESCRICAO_EMPREENDIMENTO'
  and ativo = true
  and (modelo_api is null or btrim(modelo_api) = '');

alter table public.ayka_custos_acoes
  alter column modelo_api set not null;

alter table public.ayka_custos_acoes
  drop constraint if exists ayka_custos_acoes_modelo_api_check;

alter table public.ayka_custos_acoes
  add constraint ayka_custos_acoes_modelo_api_check
  check (length(btrim(modelo_api)) > 0);

create index if not exists ayka_custos_acoes_acao_modelo_api_idx
  on public.ayka_custos_acoes (acao_codigo, modelo_api)
  where ativo = true;

commit;
