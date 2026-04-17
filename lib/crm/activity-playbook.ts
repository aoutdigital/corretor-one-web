import type { Database } from "@/lib/supabase/database.types";

export type ActivityCategory = Database["public"]["Enums"]["categoria_atividade"];
export type ActivityModel = Database["public"]["Enums"]["modelo_atividade"];
export type ActivityType = Database["public"]["Enums"]["tipo_atividade"];
export type LeadStatus = Database["public"]["Enums"]["status_lead"];

export type ActivityCategoryMeta = {
  label: string;
  description: string;
};

export type ActivityModelMeta = {
  category: ActivityCategory;
  label: string;
  description: string;
  defaultType: ActivityType;
  notePlaceholder: string;
};

export const ACTIVITY_CATEGORY_ORDER: ActivityCategory[] = [
  "QUALIFICACAO",
  "EM_ATENDIMENTO",
  "NEGOCIACAO",
  "FECHAMENTO",
  "POS_VENDA",
  "OUTROS",
];

export const ACTIVITY_CATEGORY_META: Record<ActivityCategory, ActivityCategoryMeta> = {
  QUALIFICACAO: {
    label: "Qualificação",
    description: "Primeiros contatos, perfil, urgência e validação do interesse.",
  },
  EM_ATENDIMENTO: {
    label: "Em atendimento",
    description: "Follow-up, seleção de imóveis, visitas e retornos comerciais.",
  },
  NEGOCIACAO: {
    label: "Negociação",
    description: "Propostas, contrapropostas, alinhamento de condições e documentos.",
  },
  FECHAMENTO: {
    label: "Fechamento",
    description: "Contrato, jurídico, assinatura, vistoria e entrega.",
  },
  POS_VENDA: {
    label: "Pós-venda",
    description: "Relacionamento, indicação e reativação de novas demandas.",
  },
  OUTROS: {
    label: "Outros",
    description: "Ação operacional personalizada fora do playbook padrão.",
  },
};

export const ACTIVITY_MODEL_META: Record<ActivityModel, ActivityModelMeta> = {
  QUALIFICACAO_PRIMEIRO_CONTATO: {
    category: "QUALIFICACAO",
    label: "Primeiro contato",
    description: "Abrir o relacionamento e validar a resposta do lead.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Contexto inicial, origem do lead e abordagem desejada.",
  },
  QUALIFICACAO_RECONTATO: {
    category: "QUALIFICACAO",
    label: "Recontato",
    description: "Retomar uma tentativa anterior sem resposta.",
    defaultType: "WHATSAPP",
    notePlaceholder: "O que ja foi tentado e qual gancho usar no retorno.",
  },
  QUALIFICACAO_VALIDAR_PERFIL: {
    category: "QUALIFICACAO",
    label: "Validar perfil",
    description: "Confirmar renda, momento e aderência ao produto.",
    defaultType: "LIGACAO",
    notePlaceholder: "Pontos do perfil que precisam ser confirmados.",
  },
  QUALIFICACAO_CONFIRMAR_INTERESSE: {
    category: "QUALIFICACAO",
    label: "Confirmar interesse",
    description: "Entender se o lead segue ativo na busca ou decisao.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Interesse atual, duvidas e recorte do lead.",
  },
  QUALIFICACAO_ENTENDER_URGENCIA: {
    category: "QUALIFICACAO",
    label: "Entender urgência",
    description: "Mapear prazo e gatilho real de compra ou locação.",
    defaultType: "LIGACAO",
    notePlaceholder: "Prazo, motivacao e nivel de prioridade.",
  },
  QUALIFICACAO_ENVIAR_APRESENTACAO: {
    category: "QUALIFICACAO",
    label: "Enviar apresentação inicial",
    description: "Mandar introdução, portfólio ou proposta de atendimento.",
    defaultType: "EMAIL",
    notePlaceholder: "O que deve entrar na apresentacao ou mensagem inicial.",
  },
  EM_ATENDIMENTO_FOLLOW_UP: {
    category: "EM_ATENDIMENTO",
    label: "Follow-up",
    description: "Cobrar retorno e manter a negociacao viva.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Pendencia, contexto e proximo objetivo do contato.",
  },
  EM_ATENDIMENTO_ENVIAR_SELECAO: {
    category: "EM_ATENDIMENTO",
    label: "Enviar seleção de imóveis",
    description: "Compartilhar uma curadoria alinhada ao briefing do lead.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Recorte da selecao, criterio e observacoes para o envio.",
  },
  EM_ATENDIMENTO_AGENDAR_VISITA: {
    category: "EM_ATENDIMENTO",
    label: "Agendar visita",
    description: "Definir horario e alinhar disponibilidade das partes.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Endereco, janela de horario e pessoas envolvidas.",
  },
  EM_ATENDIMENTO_CONFIRMAR_VISITA: {
    category: "EM_ATENDIMENTO",
    label: "Confirmar visita",
    description: "Reforcar o compromisso e evitar no-show.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Ponto de encontro, horario e combinados finais.",
  },
  EM_ATENDIMENTO_VISITA_PRESENCIAL: {
    category: "EM_ATENDIMENTO",
    label: "Visita presencial",
    description: "Executar a visita física ao imóvel.",
    defaultType: "VISITA",
    notePlaceholder: "Detalhes logisticos, participantes e pontos de observacao.",
  },
  EM_ATENDIMENTO_VISITA_VIRTUAL: {
    category: "EM_ATENDIMENTO",
    label: "Visita virtual",
    description: "Conduzir chamada ou apresentação remota do imóvel.",
    defaultType: "REUNIAO",
    notePlaceholder: "Link, roteiro rapido e pontos a enfatizar.",
  },
  EM_ATENDIMENTO_RETORNO_POS_VISITA: {
    category: "EM_ATENDIMENTO",
    label: "Retorno pós-visita",
    description: "Capturar percepção, objeções e próximos passos.",
    defaultType: "LIGACAO",
    notePlaceholder: "Feedback esperado, objecoes e proxima conversao.",
  },
  NEGOCIACAO_APRESENTAR_PROPOSTA: {
    category: "NEGOCIACAO",
    label: "Apresentar proposta",
    description: "Levar a proposta ao cliente com contexto e seguranca.",
    defaultType: "REUNIAO",
    notePlaceholder: "Valor, condicoes e narrativa da proposta.",
  },
  NEGOCIACAO_AVALIAR_PROPOSTA: {
    category: "NEGOCIACAO",
    label: "Avaliar proposta",
    description: "Revisar viabilidade, margem e estrategia de resposta.",
    defaultType: "TAREFA",
    notePlaceholder: "Criticos da proposta, limite e proxima decisao.",
  },
  NEGOCIACAO_TRABALHAR_CONTRAPROPOSTA: {
    category: "NEGOCIACAO",
    label: "Trabalhar contraproposta",
    description: "Conduzir ajuste de valor e condições entre as partes.",
    defaultType: "REUNIAO",
    notePlaceholder: "Ponto de partida, limite e margem de concessao.",
  },
  NEGOCIACAO_ALINHAR_CONDICOES: {
    category: "NEGOCIACAO",
    label: "Alinhar condições",
    description: "Ajustar detalhes comerciais antes do fechamento.",
    defaultType: "LIGACAO",
    notePlaceholder: "Parcelamento, prazo, garantias ou condicoes especiais.",
  },
  NEGOCIACAO_SOLICITAR_DOCUMENTOS: {
    category: "NEGOCIACAO",
    label: "Solicitar documentos",
    description: "Pedir os documentos necessarios para seguir com seguranca.",
    defaultType: "EMAIL",
    notePlaceholder: "Lista de documentos e observacoes da solicitacao.",
  },
  NEGOCIACAO_CONFIRMAR_SINAL: {
    category: "NEGOCIACAO",
    label: "Confirmar sinal ou reserva",
    description: "Validar comprometimento e proximo passo financeiro.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Valor do sinal, prazo e evidencias esperadas.",
  },
  FECHAMENTO_ELABORAR_CONTRATO: {
    category: "FECHAMENTO",
    label: "Elaborar contrato",
    description: "Preparar a documentacao comercial do fechamento.",
    defaultType: "TAREFA",
    notePlaceholder: "Minuta, partes envolvidas e clausulas sensiveis.",
  },
  FECHAMENTO_ACOMPANHAR_JURIDICO: {
    category: "FECHAMENTO",
    label: "Acompanhar jurídico",
    description: "Seguir com ajustes, validações e retorno do jurídico.",
    defaultType: "TAREFA",
    notePlaceholder: "Pontos juridicos pendentes e prazo interno.",
  },
  FECHAMENTO_ASSINATURA: {
    category: "FECHAMENTO",
    label: "Assinatura",
    description: "Coordenar assinatura e conferencias finais.",
    defaultType: "REUNIAO",
    notePlaceholder: "Formato da assinatura, participantes e pendencias finais.",
  },
  FECHAMENTO_APROVACAO_CADASTRAL: {
    category: "FECHAMENTO",
    label: "Aprovação cadastral",
    description: "Acompanhar análise cadastral ou garantia locatícia.",
    defaultType: "TAREFA",
    notePlaceholder: "Status da aprovacao, documentos e responsavel.",
  },
  FECHAMENTO_VISTORIA_FINAL: {
    category: "FECHAMENTO",
    label: "Vistoria final",
    description: "Organizar vistoria e ultima checagem antes da entrega.",
    defaultType: "VISITA",
    notePlaceholder: "Checklist final, itens sensiveis e responsaveis.",
  },
  FECHAMENTO_ENTREGA_CHAVES: {
    category: "FECHAMENTO",
    label: "Entrega de chaves",
    description: "Concluir a passagem final e registrar o fechamento.",
    defaultType: "VISITA",
    notePlaceholder: "Horario, local e documento ou termo associado.",
  },
  POS_VENDA_AGRADECIMENTO: {
    category: "POS_VENDA",
    label: "Agradecimento",
    description: "Registrar cuidado e consolidar a experiência do cliente.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Mensagem-chave, tom e proximos combinados.",
  },
  POS_VENDA_PEDIR_INDICACAO: {
    category: "POS_VENDA",
    label: "Pedir indicação",
    description: "Ativar recomendações e novas oportunidades.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Momento certo e abordagem para pedir indicacao.",
  },
  POS_VENDA_RELACIONAMENTO: {
    category: "POS_VENDA",
    label: "Relacionamento",
    description: "Manter o cliente aquecido para futuras oportunidades.",
    defaultType: "WHATSAPP",
    notePlaceholder: "Assunto do contato e motivo do relacionamento.",
  },
  POS_VENDA_NOVA_DEMANDA: {
    category: "POS_VENDA",
    label: "Nova demanda",
    description: "Reabrir conversa com novo objetivo comercial.",
    defaultType: "LIGACAO",
    notePlaceholder: "Nova necessidade, timing e produto desejado.",
  },
  OUTROS_ACAO_PERSONALIZADA: {
    category: "OUTROS",
    label: "Ação personalizada",
    description: "Tarefa livre para exceções do fluxo.",
    defaultType: "TAREFA",
    notePlaceholder: "Descreva o contexto para a equipe ou para voce do futuro.",
  },
};

export const ACTIVITY_MODELS_BY_CATEGORY: Record<ActivityCategory, ActivityModel[]> = {
  QUALIFICACAO: [
    "QUALIFICACAO_PRIMEIRO_CONTATO",
    "QUALIFICACAO_RECONTATO",
    "QUALIFICACAO_VALIDAR_PERFIL",
    "QUALIFICACAO_CONFIRMAR_INTERESSE",
    "QUALIFICACAO_ENTENDER_URGENCIA",
    "QUALIFICACAO_ENVIAR_APRESENTACAO",
  ],
  EM_ATENDIMENTO: [
    "EM_ATENDIMENTO_FOLLOW_UP",
    "EM_ATENDIMENTO_ENVIAR_SELECAO",
    "EM_ATENDIMENTO_AGENDAR_VISITA",
    "EM_ATENDIMENTO_CONFIRMAR_VISITA",
    "EM_ATENDIMENTO_VISITA_PRESENCIAL",
    "EM_ATENDIMENTO_VISITA_VIRTUAL",
    "EM_ATENDIMENTO_RETORNO_POS_VISITA",
  ],
  NEGOCIACAO: [
    "NEGOCIACAO_APRESENTAR_PROPOSTA",
    "NEGOCIACAO_AVALIAR_PROPOSTA",
    "NEGOCIACAO_TRABALHAR_CONTRAPROPOSTA",
    "NEGOCIACAO_ALINHAR_CONDICOES",
    "NEGOCIACAO_SOLICITAR_DOCUMENTOS",
    "NEGOCIACAO_CONFIRMAR_SINAL",
  ],
  FECHAMENTO: [
    "FECHAMENTO_ELABORAR_CONTRATO",
    "FECHAMENTO_ACOMPANHAR_JURIDICO",
    "FECHAMENTO_ASSINATURA",
    "FECHAMENTO_APROVACAO_CADASTRAL",
    "FECHAMENTO_VISTORIA_FINAL",
    "FECHAMENTO_ENTREGA_CHAVES",
  ],
  POS_VENDA: [
    "POS_VENDA_AGRADECIMENTO",
    "POS_VENDA_PEDIR_INDICACAO",
    "POS_VENDA_RELACIONAMENTO",
    "POS_VENDA_NOVA_DEMANDA",
  ],
  OUTROS: ["OUTROS_ACAO_PERSONALIZADA"],
};

export function getActivityCategoryMeta(category: ActivityCategory) {
  return ACTIVITY_CATEGORY_META[category];
}

export function getActivityModelMeta(model: ActivityModel) {
  return ACTIVITY_MODEL_META[model];
}

export function listActivityModelsByCategory(category: ActivityCategory) {
  return ACTIVITY_MODELS_BY_CATEGORY[category].map((model) => ({
    model,
    ...ACTIVITY_MODEL_META[model],
  }));
}

export function inferActivityTypeFromModel(model: ActivityModel): ActivityType {
  return ACTIVITY_MODEL_META[model].defaultType;
}

export function isValidActivityModelForCategory(category: ActivityCategory, model: ActivityModel) {
  const meta = ACTIVITY_MODEL_META[model];
  return Boolean(meta && meta.category === category);
}

export function getSuggestedActivityCategoryForLeadStatus(status: LeadStatus | null | undefined): ActivityCategory {
  if (status === "NOVO" || status === "ABERTO") return "QUALIFICACAO";
  if (status === "EM_ATENDIMENTO") return "EM_ATENDIMENTO";
  if (status === "QUALIFICADO" || status === "OPORTUNIDADE") return "NEGOCIACAO";
  if (status === "CLIENTE") return "POS_VENDA";
  return "OUTROS";
}

function formatWhenContext(whenIso: string | null | undefined) {
  if (!whenIso) return null;
  const value = new Date(whenIso);
  if (Number.isNaN(value.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const diffInDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

  if (diffInDays === 0) return `hoje, ${time}`;
  if (diffInDays === 1) return `amanhã, ${time}`;
  if (diffInDays > 1 && diffInDays < 7) {
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(value);
    return `${weekday}, ${time}`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function buildActivityTitleSuggestions(input: {
  model: ActivityModel;
  leadName?: string | null;
  whenIso?: string | null;
  imovelTitle?: string | null;
}) {
  const meta = ACTIVITY_MODEL_META[input.model];
  const leadName = input.leadName?.trim() || "lead";
  const imovelTitle = input.imovelTitle?.trim() || null;
  const whenLabel = formatWhenContext(input.whenIso);

  const options = [
    `${meta.label} • ${leadName}`,
    whenLabel ? `${meta.label} para ${whenLabel}` : null,
    imovelTitle ? `${meta.label} • ${imovelTitle}` : `${meta.label} com ${leadName}`,
  ].filter((item): item is string => Boolean(item));

  return Array.from(new Set(options));
}

export function isVisitActivity(input: {
  tipo?: ActivityType | string | null;
  modelo?: ActivityModel | string | null;
}) {
  return (
    input.tipo === "VISITA" ||
    input.modelo === "EM_ATENDIMENTO_VISITA_PRESENCIAL" ||
    input.modelo === "EM_ATENDIMENTO_VISITA_VIRTUAL"
  );
}
