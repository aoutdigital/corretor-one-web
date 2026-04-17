-- F41 - Regras e divisão de comissões para Minha exclusividade no bolsão

begin;

alter table public.imoveis
  add column if not exists exclusividade_comissao_minha_percentual numeric,
  add column if not exists exclusividade_comissao_parceiro_percentual numeric,
  add column if not exists exclusividade_outras_comissoes_percentual numeric,
  add column if not exists bolsao_permitir_mudanca_preco boolean not null default false,
  add column if not exists bolsao_permitir_download_midia_kit boolean not null default false,
  add column if not exists bolsao_somente_visitas_agendadas boolean not null default false,
  add column if not exists bolsao_somente_visitas_com_minha_presenca boolean not null default false;

alter table public.imoveis
  drop constraint if exists imoveis_exclusividade_comissao_minha_percentual_check;
alter table public.imoveis
  add constraint imoveis_exclusividade_comissao_minha_percentual_check
  check (
    exclusividade_comissao_minha_percentual is null
    or (exclusividade_comissao_minha_percentual >= 0 and exclusividade_comissao_minha_percentual <= 100)
  );

alter table public.imoveis
  drop constraint if exists imoveis_exclusividade_comissao_parceiro_percentual_check;
alter table public.imoveis
  add constraint imoveis_exclusividade_comissao_parceiro_percentual_check
  check (
    exclusividade_comissao_parceiro_percentual is null
    or (exclusividade_comissao_parceiro_percentual >= 0 and exclusividade_comissao_parceiro_percentual <= 100)
  );

alter table public.imoveis
  drop constraint if exists imoveis_exclusividade_outras_comissoes_percentual_check;
alter table public.imoveis
  add constraint imoveis_exclusividade_outras_comissoes_percentual_check
  check (
    exclusividade_outras_comissoes_percentual is null
    or (exclusividade_outras_comissoes_percentual >= 0 and exclusividade_outras_comissoes_percentual <= 100)
  );

alter table public.imoveis
  drop constraint if exists imoveis_exclusividade_comissoes_total_max_100_check;
alter table public.imoveis
  add constraint imoveis_exclusividade_comissoes_total_max_100_check
  check (
    coalesce(exclusividade_comissao_minha_percentual, 0) +
    coalesce(exclusividade_comissao_parceiro_percentual, 0) +
    coalesce(exclusividade_outras_comissoes_percentual, 0) <= 100
  );

commit;
