-- F58 - CRM atividades com categoria e modelo comercial

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_atividade') then
    create type public.categoria_atividade as enum (
      'QUALIFICACAO',
      'EM_ATENDIMENTO',
      'NEGOCIACAO',
      'FECHAMENTO',
      'POS_VENDA',
      'OUTROS'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'modelo_atividade') then
    create type public.modelo_atividade as enum (
      'QUALIFICACAO_PRIMEIRO_CONTATO',
      'QUALIFICACAO_RECONTATO',
      'QUALIFICACAO_VALIDAR_PERFIL',
      'QUALIFICACAO_CONFIRMAR_INTERESSE',
      'QUALIFICACAO_ENTENDER_URGENCIA',
      'QUALIFICACAO_ENVIAR_APRESENTACAO',
      'EM_ATENDIMENTO_FOLLOW_UP',
      'EM_ATENDIMENTO_ENVIAR_SELECAO',
      'EM_ATENDIMENTO_AGENDAR_VISITA',
      'EM_ATENDIMENTO_CONFIRMAR_VISITA',
      'EM_ATENDIMENTO_VISITA_PRESENCIAL',
      'EM_ATENDIMENTO_VISITA_VIRTUAL',
      'EM_ATENDIMENTO_RETORNO_POS_VISITA',
      'NEGOCIACAO_APRESENTAR_PROPOSTA',
      'NEGOCIACAO_AVALIAR_PROPOSTA',
      'NEGOCIACAO_TRABALHAR_CONTRAPROPOSTA',
      'NEGOCIACAO_ALINHAR_CONDICOES',
      'NEGOCIACAO_SOLICITAR_DOCUMENTOS',
      'NEGOCIACAO_CONFIRMAR_SINAL',
      'FECHAMENTO_ELABORAR_CONTRATO',
      'FECHAMENTO_ACOMPANHAR_JURIDICO',
      'FECHAMENTO_ASSINATURA',
      'FECHAMENTO_APROVACAO_CADASTRAL',
      'FECHAMENTO_VISTORIA_FINAL',
      'FECHAMENTO_ENTREGA_CHAVES',
      'POS_VENDA_AGRADECIMENTO',
      'POS_VENDA_PEDIR_INDICACAO',
      'POS_VENDA_RELACIONAMENTO',
      'POS_VENDA_NOVA_DEMANDA',
      'OUTROS_ACAO_PERSONALIZADA'
    );
  end if;
end $$;

create or replace function public.is_modelo_atividade_compativel(
  _categoria public.categoria_atividade,
  _modelo public.modelo_atividade
)
returns boolean
language sql
immutable
as $$
  select case _categoria
    when 'QUALIFICACAO' then _modelo in (
      'QUALIFICACAO_PRIMEIRO_CONTATO',
      'QUALIFICACAO_RECONTATO',
      'QUALIFICACAO_VALIDAR_PERFIL',
      'QUALIFICACAO_CONFIRMAR_INTERESSE',
      'QUALIFICACAO_ENTENDER_URGENCIA',
      'QUALIFICACAO_ENVIAR_APRESENTACAO'
    )
    when 'EM_ATENDIMENTO' then _modelo in (
      'EM_ATENDIMENTO_FOLLOW_UP',
      'EM_ATENDIMENTO_ENVIAR_SELECAO',
      'EM_ATENDIMENTO_AGENDAR_VISITA',
      'EM_ATENDIMENTO_CONFIRMAR_VISITA',
      'EM_ATENDIMENTO_VISITA_PRESENCIAL',
      'EM_ATENDIMENTO_VISITA_VIRTUAL',
      'EM_ATENDIMENTO_RETORNO_POS_VISITA'
    )
    when 'NEGOCIACAO' then _modelo in (
      'NEGOCIACAO_APRESENTAR_PROPOSTA',
      'NEGOCIACAO_AVALIAR_PROPOSTA',
      'NEGOCIACAO_TRABALHAR_CONTRAPROPOSTA',
      'NEGOCIACAO_ALINHAR_CONDICOES',
      'NEGOCIACAO_SOLICITAR_DOCUMENTOS',
      'NEGOCIACAO_CONFIRMAR_SINAL'
    )
    when 'FECHAMENTO' then _modelo in (
      'FECHAMENTO_ELABORAR_CONTRATO',
      'FECHAMENTO_ACOMPANHAR_JURIDICO',
      'FECHAMENTO_ASSINATURA',
      'FECHAMENTO_APROVACAO_CADASTRAL',
      'FECHAMENTO_VISTORIA_FINAL',
      'FECHAMENTO_ENTREGA_CHAVES'
    )
    when 'POS_VENDA' then _modelo in (
      'POS_VENDA_AGRADECIMENTO',
      'POS_VENDA_PEDIR_INDICACAO',
      'POS_VENDA_RELACIONAMENTO',
      'POS_VENDA_NOVA_DEMANDA'
    )
    when 'OUTROS' then _modelo in (
      'OUTROS_ACAO_PERSONALIZADA'
    )
    else false
  end;
$$;

alter table public.atividades
  add column if not exists categoria public.categoria_atividade,
  add column if not exists modelo public.modelo_atividade;

update public.atividades
set
  categoria = 'EM_ATENDIMENTO',
  modelo = 'EM_ATENDIMENTO_VISITA_PRESENCIAL'
where tipo = 'VISITA'
  and (categoria is null or modelo is null);

update public.atividades
set
  categoria = coalesce(categoria, 'OUTROS'::public.categoria_atividade),
  modelo = coalesce(modelo, 'OUTROS_ACAO_PERSONALIZADA'::public.modelo_atividade)
where categoria is null
   or modelo is null;

alter table public.atividades
  alter column categoria set default 'OUTROS',
  alter column categoria set not null,
  alter column modelo set default 'OUTROS_ACAO_PERSONALIZADA',
  alter column modelo set not null;

alter table public.atividades
  drop constraint if exists atividades_categoria_modelo_check;

alter table public.atividades
  add constraint atividades_categoria_modelo_check
  check (public.is_modelo_atividade_compativel(categoria, modelo));

create index if not exists atividades_owner_categoria_status_quando_idx
  on public.atividades (owner_id, categoria, status, quando_em);

create index if not exists atividades_owner_modelo_status_quando_idx
  on public.atividades (owner_id, modelo, status, quando_em);

commit;
