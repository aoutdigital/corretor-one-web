"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Bed,
  Briefcase,
  CalendarBlank,
  CaretLeft,
  CaretDown,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  EnvelopeSimple,
  Eye,
  FileText,
  House,
  HouseLine,
  Info,
  Key,
  MapPin,
  Megaphone,
  NotePencil,
  PhoneCall,
  Plus,
  Sparkle,
  Tag,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { FormEvent, type FocusEvent as ReactFocusEvent, ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { LeadAvatar } from "@/app/_components/lead-avatar";
import { AppShell } from "@/app/_components/app-shell";
import { CompactDateCalendar } from "@/app/_components/compact-date-calendar";
import { FloatingToastViewport, type FloatingToastItem } from "@/app/_components/floating-toast";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import {
  ACTIVITY_CATEGORY_ORDER,
  buildActivityTitleSuggestions,
  getActivityCategoryMeta,
  getActivityModelMeta,
  getSuggestedActivityCategoryForLeadStatus,
  inferActivityTypeFromModel,
  listActivityModelsByCategory,
  type ActivityCategory,
  type ActivityModel,
} from "@/lib/crm/activity-playbook";
import {
  NEGOCIO_FASE_LABEL,
  NEGOCIO_MODALIDADE_LABEL,
  SUBFASE_JURIDICA_LABEL,
  mapLegacyEtapaToFase,
  mapLegacyFinalidadeToModalidade,
  type FaseNegocio,
  type ModalidadeNegocio,
} from "@/lib/crm/oportunidades";
import type { LeadWorkspace } from "@/lib/db/leads";
import {
  describeBriefingTipologiaSelection,
  getBriefingCategoriaOptions,
  getBriefingSubcategoriaOptions,
  inferBriefingCategoriaToken,
  inferBriefingSubcategoriaToken,
  resolveBriefingTipologiaSelection,
} from "@/lib/imoveis/briefing-tipologia";
import { buildImovelHeaderTitle, type ImovelDisplayTitleInput } from "@/lib/imoveis/display-title";
import { isUfCode, UF_OPTIONS } from "@/lib/location/constants";
import { loadGoogleMapsScript } from "@/lib/location/google-maps-loader";
import type { PlaceDetails, PlacePrediction } from "@/lib/location/types";

const GOOGLE_MAPS_PUBLIC_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
const LEAD_DATA_UPDATED_TIMELINE_TITLE = "Dados do lead atualizados";

type LeadStatus = LeadWorkspace["lead"]["status"];
type LeadFinalidade = "COMPRAR" | "ALUGAR";

type OwnedImovelOption = {
  id: string;
  codigo: string | null;
  titulo: string;
  finalidade: string;
  status: string;
  bairro: string | null;
  cidade: string;
  estado: string;
  updated_at: string;
  preco_venda: number | null;
  preco_locacao: number | null;
};

type LeadOrigem = LeadWorkspace["lead"]["origem"];

type ContactFormState = {
  nome: string;
  profissao: string;
  email: string;
  telefone: string;
  origem: LeadOrigem;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
};

type LeadObjective = (typeof OBJETIVO_LEAD_OPTIONS)[number];
type LeadTipoUso = (typeof TIPO_USO_OPTIONS)[number];
type LeadIntencaoCompra = (typeof INTENCAO_COMPRA_OPTIONS)[number];
type LeadCanalContato = (typeof CANAL_CONTATO_OPTIONS)[number];
type LeadTipoConteudo = (typeof TIPO_CONTEUDO_OPTIONS)[number];
type LeadBriefingState = NonNullable<LeadWorkspace["briefing"]>;
type LeadTipoImovel = NonNullable<LeadBriefingState["tipoimovel"]>[number];
type LeadCategoriaImovel = NonNullable<LeadBriefingState["categoriaimovel"]>[number];
type LeadSubcategoriaImovel = NonNullable<LeadBriefingState["subcategoriaimovel"]>[number];
type LeadTipoNegociacao = NonNullable<LeadBriefingState["tiponegociacao"]>[number];

type ProfileFormState = {
  objetivolead: LeadObjective[];
  tipouso: LeadTipoUso | "";
  tipoimovel: LeadTipoImovel[];
  categoriaimovel: LeadCategoriaImovel[];
  subcategoriaimovel: LeadSubcategoriaImovel[];
  intencao_compra: LeadIntencaoCompra | "";
  valor_min: string;
  valor_max: string;
  area_util_min: string;
  area_util_max: string;
  area_util_min_comercial: string;
  area_util_max_comercial: string;
  quartos_min: string;
  suites_min: string;
  vagas_min: string;
  vagas_min_comercial: string;
  localizacao_texto: string;
  canais: LeadCanalContato[];
  conteudos: LeadTipoConteudo[];
  texto_livre: string;
  mensagem: string;
};

type FieldSaveState = "saving" | "saved";
type ContactAutosaveField = keyof ContactFormState;
type ProfileAutosaveField =
  | "objetivolead"
  | "tipouso"
  | "intencao_compra"
  | "tipologia"
  | "valor_min"
  | "valor_max"
  | "area_util_min"
  | "area_util_max"
  | "area_util_min_comercial"
  | "area_util_max_comercial"
  | "quartos_min"
  | "suites_min"
  | "vagas_min"
  | "vagas_min_comercial"
  | "localizacao_texto"
  | "canais"
  | "conteudos"
  | "texto_livre"
  | "mensagem";

type VisitFormState = {
  imovel_id: string;
  quando: string;
  descricao: string;
};

type CreateOpportunityFormState = {
  imovel_id: string;
  valor: string;
  comissao_percentual: string;
  recursoproprios_percentual: string;
  financiamento_percentual: string;
  fgts_percentual: string;
  outrosrecursos_percentual: string;
  observacoes: string;
};

type LeadWorkspaceAtividadeItem = LeadWorkspace["atividades"][number];
type LeadWorkspaceNegocioItem = LeadWorkspace["negocios"][number];
type LeadTimelineItem = LeadWorkspace["timeline"][number];

type LeadWorkspaceTab = "atividades" | "dadosPerfil" | "propostasImoveis" | "timeline";

type ActivityFilterKey = "TODAS" | "ATRASADA" | "AGENDADA" | "CONCLUIDA";
type CreateOpportunityStep = "imovel" | "valor" | "pagamento" | "resumo";
type OpportunityCommissionEditedField = "percent" | "amount";
type OpportunityPercentFieldKey =
  | "recursoproprios_percentual"
  | "financiamento_percentual"
  | "fgts_percentual"
  | "outrosrecursos_percentual";
type OpportunityAmountInputState = Record<OpportunityPercentFieldKey, string>;

type CreateActivityStep = "categoria" | "modelo" | "agenda" | "nota";

type CreateActivityFormState = {
  categoria: ActivityCategory | null;
  modelo: ActivityModel | null;
  tipo: LeadWorkspaceAtividadeItem["tipo"] | null;
  titulo: string;
  quando: string;
  descricao: string;
};

type CreateActivityManualSelectionState = {
  data: string;
  hora: string;
};

type RescheduleFormState = {
  nota: string;
  data: string;
  hora: string;
};

type RescheduleManualSelectionState = {
  data: string;
  hora: string;
};

type FinishActivityFormState = {
  nota: string;
  resultado: "POSITIVO" | "NEGATIVO";
};

type ConfirmVisitFormState = {
  modelo: Extract<LeadWorkspaceAtividadeItem["modelo"], "EM_ATENDIMENTO_VISITA_PRESENCIAL" | "EM_ATENDIMENTO_VISITA_VIRTUAL">;
  data: string;
  hora: string;
  nota: string;
};

type MapPoint = {
  id: string;
  label: string;
  mapAddress: string;
  lat: number;
  lng: number;
  tone: "lead" | "imovel" | "mixed";
  imoveis: Array<{
    id: string;
    codigo: string | null;
    address: string;
  }>;
};

const INITIAL_CREATE_OPPORTUNITY_FORM: CreateOpportunityFormState = {
  imovel_id: "",
  valor: "",
  comissao_percentual: "",
  recursoproprios_percentual: "100",
  financiamento_percentual: "",
  fgts_percentual: "",
  outrosrecursos_percentual: "",
  observacoes: "",
};

type InterestLocationItem = {
  id: string;
  label: string;
  meta: string | null;
  mapAddress: string;
  lat: number | null;
  lng: number | null;
  tone: "lead" | "imovel";
  imovelId: string | null;
  imovelCodigo: string | null;
};

type ActivityQuickScheduleOption = {
  id: string;
  label: string;
  hint: string;
  value: string;
};

type ActivityTimeOption = {
  value: string;
  label: string;
};

const ORIGEM_LEAD_OPTIONS = [
  "CORRETOR_ONE",
  "GRUPO_OLX",
  "GOOGLE_ADS",
  "META_ADS",
  "INDICACAO",
  "EVENTO",
  "FEIRA",
  "PLANTAO",
  "IMOVELWEB",
  "CHAVES_NA_MAO",
  "CASA_MINEIRA",
  "LUGAR_CERTO",
  "MERCADO_LIVRE",
  "MEU_IMOVEL",
  "DREAMCASA",
  "QUINTO_ANDAR",
  "LOFT",
  "I123",
  "AGENTE_IMOVEL",
  "TROVIT",
  "IMOVEIS_CURITIBA",
  "WHATSAPP_BUSINESS",
  "OUTRO",
] as const;

const OBJETIVO_LEAD_OPTIONS = ["COMPRAR", "ALUGAR", "VENDER"] as const;
const TIPO_USO_OPTIONS = ["RESIDENCIAL", "COMERCIAL"] as const;
const INTENCAO_COMPRA_OPTIONS = ["MORADIA", "INVESTIMENTO"] as const;
const CANAL_CONTATO_OPTIONS = ["EMAIL", "WHATSAPP"] as const;
const TIPO_CONTEUDO_OPTIONS = ["IMOVEL", "EMPREENDIMENTO", "ARTIGO", "NEWSLETTER"] as const;
const LEAD_PROFESSION_SUGGESTIONS = [
  "Administrador",
  "Administrador de Empresas",
  "Advogado",
  "Agrônomo",
  "Analista Administrativo",
  "Analista Comercial",
  "Analista Contábil",
  "Analista de Dados",
  "Analista de Marketing",
  "Analista de Recursos Humanos",
  "Analista de Sistemas",
  "Arquiteto",
  "Assistente Administrativo",
  "Assistente Comercial",
  "Atleta",
  "Autônomo",
  "Bancário",
  "Biomédico",
  "Cabeleireiro",
  "Caminhoneiro",
  "Chef de Cozinha",
  "Cirurgião-Dentista",
  "Comerciante",
  "Comprador",
  "Confeiteiro",
  "Consultor",
  "Consultor Financeiro",
  "Consultor Imobiliário",
  "Contabilista",
  "Contador",
  "Coordenador Comercial",
  "Corretor de Imóveis",
  "Corretor de Seguros",
  "Designer",
  "Designer de Interiores",
  "Dentista",
  "Desenvolvedor",
  "Desenvolvedor de Software",
  "Diretor",
  "Diretor Comercial",
  "Diretor Financeiro",
  "Diretor de Marketing",
  "Economista",
  "Educador Físico",
  "Eletricista",
  "Empreendedor",
  "Empresário",
  "Enfermeiro",
  "Engenheiro",
  "Engenheiro Civil",
  "Engenheiro de Produção",
  "Engenheiro de Software",
  "Engenheiro Eletricista",
  "Engenheiro Mecânico",
  "Esteticista",
  "Farmacêutico",
  "Fisioterapeuta",
  "Fotógrafo",
  "Gerente",
  "Gerente Administrativo",
  "Gerente Comercial",
  "Gerente Financeiro",
  "Gerente de Marketing",
  "Gestor Público",
  "Influenciador Digital",
  "Instrumentador Cirúrgico",
  "Investidor",
  "Jornalista",
  "Marceneiro",
  "Mecânico",
  "Médico",
  "Médico Veterinário",
  "Microempresário",
  "Motorista",
  "Nutricionista",
  "Odontólogo",
  "Operador de Máquinas",
  "Pedagogo",
  "Policial",
  "Professor",
  "Professor Universitário",
  "Programador",
  "Promotor de Vendas",
  "Proprietário de Empresa",
  "Psicólogo",
  "Psicopedagogo",
  "Publicitário",
  "Recepcionista",
  "Representante Comercial",
  "Secretário",
  "Servidor Público",
  "Sócio Proprietário",
  "Superintendente",
  "Supervisor",
  "Tabelião",
  "Técnico de Enfermagem",
  "Técnico de Informática",
  "Técnico em Edificações",
  "Técnico em Segurança do Trabalho",
  "Terapeuta",
  "Vendedor",
] as const;

const STATUS_META: Record<
  LeadStatus,
  {
    label: string;
    className: string;
  }
> = {
  NOVO: {
    label: "Novo",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  ABERTO: {
    label: "Aberto",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  EM_ATENDIMENTO: {
    label: "Em atendimento",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  QUALIFICADO: {
    label: "Qualificado",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  OPORTUNIDADE: {
    label: "Oportunidade",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CLIENTE: {
    label: "Cliente",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  DESQUALIFICADO: {
    label: "Desqualificado",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const LEAD_MANUAL_STATUS_OPTIONS: LeadStatus[] = [
  "ABERTO",
  "EM_ATENDIMENTO",
  "QUALIFICADO",
  "CLIENTE",
];

const MOTIVO_DESQUALIFICACAO_OPTIONS = [
  { value: "NAO_RESPONDEU_TENTATIVAS_DE_CONTATO", label: "Não respondeu tentativas de contato" },
  { value: "CONTATO_INVALIDO", label: "Contato inválido (telefone ou email)" },
  { value: "SOLICITOU_NAO_SER_CONTATADO", label: "Solicitou não ser mais contatado" },
  { value: "ORCAMENTO_INCOMPATIVEL", label: "Orçamento incompatível" },
  { value: "SEM_PERFIL_DE_COMPRA", label: "Sem perfil de compra" },
  { value: "APENAS_PESQUISA_OU_CURIOSIDADE", label: "Apenas pesquisa / curiosidade" },
  { value: "SEM_URGENCIA_NO_MOMENTO", label: "Sem urgência no momento" },
  { value: "NAO_ENCONTROU_IMOVEIS_COMPATIVEIS", label: "Não encontrou imóveis compatíveis" },
  { value: "LOCALIZACAO_NAO_ATENDE", label: "Localização não atende" },
  { value: "CARACTERISTICAS_NAO_ATENDEM", label: "Características não atendem" },
  {
    value: "JA_FECHOU_COM_OUTRO_CORRETOR_OU_IMOBILIARIA",
    label: "Já fechou com outro corretor ou imobiliária",
  },
  { value: "ADIOU_DECISAO", label: "Adiou decisão" },
  {
    value: "MUDANCA_DE_PLANOS_PESSOAIS_OU_FINANCEIROS",
    label: "Mudança de planos pessoais ou financeiros",
  },
  { value: "LEAD_DUPLICADO_OU_INVALIDO", label: "Lead duplicado ou inválido" },
  { value: "SPAM_OU_TESTE", label: "Spam / teste" },
  { value: "PERDA_POR_FALHA_NO_ATENDIMENTO", label: "Perda por falha no atendimento" },
  { value: "OUTRO", label: "Outro motivo / não informado" },
] as const;

type MotivoDesqualificacaoOption = (typeof MOTIVO_DESQUALIFICACAO_OPTIONS)[number]["value"];

const ACTIVITY_CATEGORY_ICON = {
  QUALIFICACAO: PhoneCall,
  EM_ATENDIMENTO: HouseLine,
  NEGOCIACAO: ChartLineUp,
  FECHAMENTO: Briefcase,
  POS_VENDA: CheckCircle,
  OUTROS: EnvelopeSimple,
} satisfies Record<ActivityCategory, typeof PhoneCall>;

const TIMELINE_META: Record<
  LeadWorkspace["timeline"][number]["tipo"],
  {
    label: string;
  }
> = {
  STATUS: {
    label: "Status",
  },
  PROPOSTA: {
    label: "Proposta",
  },
  ATIVIDADE: {
    label: "Atividade",
  },
  NOTA: {
    label: "Nota",
  },
  SISTEMA: {
    label: "Sistema",
  },
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActivityTypeLabel(value: string | null | undefined) {
  if (!value) return "-";
  if (value === "LIGACAO") return "Ligação";
  if (value === "WHATSAPP") return "WhatsApp";
  if (value === "EMAIL") return "E-mail";
  if (value === "REUNIAO") return "Reunião";
  if (value === "VISITA") return "Visita";
  if (value === "TAREFA") return "Tarefa";
  return formatEnumLabel(value);
}

function getLeadIntentMeta(intent: (typeof INTENCAO_COMPRA_OPTIONS)[number], tipoUso: string) {
  const isCommercial = tipoUso === "COMERCIAL";

  if (intent === "MORADIA") {
    return {
      title: isCommercial ? "Uso" : "Moradia",
      description: isCommercial ? "Operação do negócio." : "Compra para morar.",
      icon: isCommercial ? Briefcase : Bed,
      activeClass: isCommercial
        ? "border-amber-200 bg-[linear-gradient(180deg,#fff7ed,#ffedd5)] text-amber-800 shadow-[0_14px_32px_rgba(245,158,11,0.12)]"
        : "border-sky-200 bg-[linear-gradient(180deg,#eff6ff,#dbeafe)] text-sky-800 shadow-[0_14px_32px_rgba(59,130,246,0.12)]",
      activeIconClass: isCommercial
        ? "border-amber-200 bg-white/80 text-amber-700"
        : "border-sky-200 bg-white/80 text-sky-700",
    };
  }

  return {
    title: "Investimento",
    description: isCommercial ? "Renda e valorização." : "Patrimônio e renda.",
    icon: ChartLineUp,
    activeClass: "border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5,#d1fae5)] text-emerald-800 shadow-[0_14px_32px_rgba(16,185,129,0.12)]",
    activeIconClass: "border-emerald-200 bg-white/80 text-emerald-700",
  };
}

function getLeadObjectiveMeta(objective: (typeof OBJETIVO_LEAD_OPTIONS)[number]) {
  if (objective === "COMPRAR") {
    return {
      title: "Comprar",
      description: "Busca um imóvel.",
      icon: HouseLine,
      activeClass:
        "border-sky-200 bg-[linear-gradient(180deg,#eff6ff,#dbeafe)] text-sky-800 shadow-[0_14px_32px_rgba(59,130,246,0.12)]",
      activeIconClass: "border-sky-200 bg-white/80 text-sky-700",
    };
  }

  if (objective === "ALUGAR") {
    return {
      title: "Alugar",
      description: "Procura locação.",
      icon: Key,
      activeClass:
        "border-violet-200 bg-[linear-gradient(180deg,#f5f3ff,#ede9fe)] text-violet-800 shadow-[0_14px_32px_rgba(139,92,246,0.12)]",
      activeIconClass: "border-violet-200 bg-white/80 text-violet-700",
    };
  }

  return {
    title: "Vender",
    description: "Quer anunciar e vender.",
    icon: Tag,
    activeClass:
      "border-rose-200 bg-[linear-gradient(180deg,#fff1f2,#ffe4e6)] text-rose-800 shadow-[0_14px_32px_rgba(244,63,94,0.12)]",
    activeIconClass: "border-rose-200 bg-white/80 text-rose-700",
  };
}

function buildLeadTipologiaItems(profileForm: ProfileFormState) {
  return profileForm.tipoimovel.map((tipoImovel, index) => {
    const categoria = profileForm.categoriaimovel[index] ?? null;
    const subcategoria =
      profileForm.subcategoriaimovel[index] ??
      inferBriefingSubcategoriaToken({
        uso: profileForm.tipouso,
        categoria,
        tipoImovel,
      });

    return {
      index,
      categoriaToken: categoria,
      subcategoriaToken: subcategoria,
      ...describeBriefingTipologiaSelection({
        uso: profileForm.tipouso,
        categoria,
        subcategoria,
        tipoImovel,
      }),
    };
  });
}

function normalizeTipologiaSelectionCompare(params: {
  uso: string | null | undefined;
  categorias: string[] | null | undefined;
  subcategorias: string[] | null | undefined;
  tipos: string[] | null | undefined;
}) {
  return [...(params.tipos ?? [])]
    .map((tipoImovel, index) => {
      const categoria =
        params.categorias?.[index] ?? inferBriefingCategoriaToken({ uso: params.uso, tipoImovel }) ?? "";
      const subcategoria =
        params.subcategorias?.[index] ??
        inferBriefingSubcategoriaToken({
          uso: params.uso,
          categoria,
          tipoImovel,
        }) ??
        "";
      return [categoria, subcategoria, tipoImovel].join("|");
    })
    .sort()
    .join(";");
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getTimelineDetailsObject(details: LeadTimelineItem["detalhes"]) {
  return details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : null;
}

function hasTimelineDetails(item: unknown): item is { detalhes: LeadTimelineItem["detalhes"] } {
  return !!item && typeof item === "object" && "detalhes" in item;
}

function getTimelineChangedFields(item: Pick<LeadTimelineItem, "detalhes"> | Record<string, unknown> | null | undefined) {
  const details =
    hasTimelineDetails(item)
      ? getTimelineDetailsObject(item.detalhes)
      : ((item ?? null) as Record<string, unknown> | null);
  const rawFields = details?.campos;
  if (!Array.isArray(rawFields)) return [];

  return Array.from(
    new Set(
      rawFields
        .map((field) => String(field ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function getTimelineLocalDayKey(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toLocalDateInput(parsed);
}

function getLeadDataUpdateTimelineDayKey(value: string | null | undefined) {
  const dayKey = getTimelineLocalDayKey(value);
  if (!dayKey) return null;
  return `lead-data-update:${dayKey}`;
}

function collectLeadDataUpdateTimelineDayKeys(items: LeadTimelineItem[]) {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.titulo !== LEAD_DATA_UPDATED_TIMELINE_TITLE) continue;
    const key = getLeadDataUpdateTimelineDayKey(item.created_at);
    if (key) keys.add(key);
  }
  return keys;
}

function mergeUniqueFieldNames(...fieldLists: string[][]) {
  return Array.from(
    new Set(
      fieldLists
        .flat()
        .map((field) => field.trim())
        .filter(Boolean),
    ),
  );
}

function upsertLeadDataUpdateTimelineItem(
  items: LeadTimelineItem[],
  input: {
    createdAt: string;
    changedFields: string[];
    id?: string | null;
  },
): LeadTimelineItem[] {
  const dayKey = getLeadDataUpdateTimelineDayKey(input.createdAt);
  const changedFields = mergeUniqueFieldNames(input.changedFields);
  if (!dayKey) return items;

  let matched = false;
  const nextItems = items.map((item) => {
    if (matched || item.titulo !== LEAD_DATA_UPDATED_TIMELINE_TITLE) return item;
    if (getLeadDataUpdateTimelineDayKey(item.created_at) !== dayKey) return item;

    matched = true;
    const currentDetails = getTimelineDetailsObject(item.detalhes);
    const mergedFields = mergeUniqueFieldNames(getTimelineChangedFields(item), changedFields);

    return {
      ...item,
      detalhes: mergedFields.length > 0 ? { ...(currentDetails ?? {}), campos: mergedFields } : item.detalhes,
    };
  });

  if (matched) return nextItems;

  return [
    {
      id: input.id ?? `timeline-${dayKey}`,
      tipo: "SISTEMA",
      titulo: LEAD_DATA_UPDATED_TIMELINE_TITLE,
      detalhes: changedFields.length > 0 ? { campos: changedFields } : null,
      created_at: input.createdAt,
    },
    ...items,
  ];
}

function groupTimelineItemsForDisplay(items: LeadTimelineItem[]) {
  const grouped: LeadTimelineItem[] = [];
  const groupedIndexes = new Map<string, number>();

  for (const item of items) {
    if (item.titulo !== LEAD_DATA_UPDATED_TIMELINE_TITLE) {
      grouped.push(item);
      continue;
    }

    const dayKey = getLeadDataUpdateTimelineDayKey(item.created_at);
    if (!dayKey) {
      grouped.push(item);
      continue;
    }

    const existingIndex = groupedIndexes.get(dayKey);
    if (existingIndex == null) {
      groupedIndexes.set(dayKey, grouped.length);
      grouped.push(item);
      continue;
    }

    const existing = grouped[existingIndex];
    const existingDetails = getTimelineDetailsObject(existing.detalhes);
    const mergedFields = mergeUniqueFieldNames(getTimelineChangedFields(existing), getTimelineChangedFields(item));

    grouped[existingIndex] = {
      ...existing,
      detalhes: mergedFields.length > 0 ? { ...(existingDetails ?? {}), campos: mergedFields } : existing.detalhes,
    };
  }

  return grouped;
}

function getTimelineEventVisual(item: LeadTimelineItem) {
  const details = getTimelineDetailsObject(item.detalhes);
  const searchable = normalizeSearchText(
    [item.tipo, item.titulo, details ? JSON.stringify(details) : ""].filter(Boolean).join(" "),
  );

  const hasKeyword = (...terms: string[]) => terms.some((term) => searchable.includes(term));
  const isMarketing =
    hasKeyword("email", "abertura", "visualizacao", "visualizacao", "visualizou", "campanha", "formulario", "captura") ||
    hasKeyword("portal", "newsletter", "landing");
  const isVisit = hasKeyword("visita");
  const isProperty = hasKeyword("imovel", "empreendimento", "unidade");
  const isCommercial = item.tipo !== "SISTEMA" || isVisit || isProperty;
  const lane = isCommercial || isMarketing ? "bottom" : "top";
  const pillarLabel = lane === "top" ? "Sistema" : isMarketing ? "Marketing" : "Comercial";

  let icon = Sparkle;
  if (isMarketing && hasKeyword("email", "abertura")) icon = EnvelopeSimple;
  else if (isMarketing && hasKeyword("visualizacao", "visualizou", "portal")) icon = Eye;
  else if (isMarketing && hasKeyword("formulario", "captura", "briefing")) icon = FileText;
  else if (isMarketing) icon = Megaphone;
  else if (item.tipo === "STATUS") icon = ChartLineUp;
  else if (item.tipo === "PROPOSTA") icon = Briefcase;
  else if (item.tipo === "NOTA") icon = NotePencil;
  else if (isVisit) icon = CalendarBlank;
  else if (isProperty) icon = HouseLine;
  else if (item.tipo === "ATIVIDADE") icon = CheckCircle;

  let badgeClassName = "bg-amber-100 text-amber-800";
  let pointClassName = "border-amber-200 text-amber-700 shadow-[0_0_0_10px_rgba(251,191,36,0.12)]";
  let cardClassName = "border-amber-100 bg-[linear-gradient(180deg,#ffffff,#fff9e7)]";
  let connectorClassName = "bg-amber-200";

  if (pillarLabel === "Marketing") {
    badgeClassName = "bg-rose-100 text-rose-700";
    pointClassName = "border-rose-200 text-rose-600 shadow-[0_0_0_10px_rgba(244,63,94,0.10)]";
    cardClassName = "border-rose-100 bg-[linear-gradient(180deg,#ffffff,#fff1f2)]";
    connectorClassName = "bg-rose-200";
  } else if (pillarLabel === "Comercial") {
    badgeClassName = "bg-sky-100 text-sky-700";
    pointClassName = "border-sky-200 text-[var(--blue-slate)] shadow-[0_0_0_10px_rgba(24,62,110,0.08)]";
    cardClassName = "border-sky-100 bg-[linear-gradient(180deg,#ffffff,#f3f8ff)]";
    connectorClassName = "bg-sky-200";
  }

  let caption = TIMELINE_META[item.tipo].label;
  if (typeof details?.modelo === "string") {
    caption = formatEnumLabel(details.modelo);
  } else if (getTimelineChangedFields(details).length > 0) {
    caption = `Campos: ${getTimelineChangedFields(details).slice(0, 2).join(" · ")}`;
  } else if (typeof details?.resultado === "string") {
    caption = details.resultado === "POSITIVO" ? "Retorno positivo" : "Retorno negativo";
  } else if (isMarketing) {
    caption = "Sinal de engajamento";
  }

  return {
    lane,
    pillarLabel,
    icon,
    badgeClassName,
    pointClassName,
    cardClassName,
    connectorClassName,
    caption,
  };
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number") return "Sem valor";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatValueRange(min: number | null, max: number | null) {
  if (typeof min === "number" && typeof max === "number") {
    if (min === max) return formatCurrency(min);
    return `${formatCurrency(min)} a ${formatCurrency(max)}`;
  }
  if (typeof max === "number") return `Até ${formatCurrency(max)}`;
  if (typeof min === "number") return `A partir de ${formatCurrency(min)}`;
  return "Sem faixa definida";
}

function normalizeArrayForCompare(values: string[] | null | undefined) {
  return [...(values ?? [])]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

function toggleStringArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function formatPostalCodeDisplay(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizePostalCode(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(0, 8);
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}

function parseOptionalCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

function formatOpportunityPercentInput(value: string) {
  const cleaned = value.replace(/[^\d,]/g, "");
  if (!cleaned) return "";

  const hasComma = cleaned.includes(",");
  const [rawIntegerPart, ...rawDecimalParts] = cleaned.split(",");
  const integerPart = rawIntegerPart.replace(/\D/g, "").slice(0, 3).replace(/^0+(?=\d)/, "");
  const decimalPart = rawDecimalParts.join("").replace(/\D/g, "").slice(0, 2);
  let next = hasComma ? `${integerPart || "0"},${decimalPart}` : integerPart;

  if (hasComma && decimalPart.length === 0) {
    next = `${integerPart || "0"},`;
  }

  const parsed = parseOpportunityPercentInput(next);
  if (parsed >= 100) return "100";
  return next;
}

function parseOpportunityPercentInput(value: string) {
  if (!value.trim()) return 0;
  const normalized = value.replace(/[^\d,]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed * 100) / 100));
}

function calculateOpportunitySplitValue(totalValue: number | null, percent: number) {
  if (totalValue == null) return null;
  return Math.round(totalValue * (percent / 100) * 100) / 100;
}

function formatOpportunityPercentValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "";
  const normalized = Math.min(100, Math.max(0, Math.round(value * 100) / 100));
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(normalized) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

function calculateOpportunityPercentFromValue(totalValue: number | null, amountValue: number | null) {
  if (totalValue == null || totalValue <= 0 || amountValue == null || amountValue < 0) return null;
  return (amountValue / totalValue) * 100;
}

function formatCurrencyFormValue(value: number | null | undefined) {
  if (value == null) return "";
  return formatCurrencyInput(String(value));
}

function formatAreaInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}

function formatAreaFormValue(value: number | null | undefined) {
  if (value == null) return "";
  return formatAreaInput(String(value));
}

function parseOptionalNumberInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveLeadObjectivesFromLegacyNegotiation(values: string[] | null | undefined): LeadObjective[] {
  const set = new Set(values ?? []);
  const derived: LeadObjective[] = [];
  if (set.has("VENDA")) derived.push("COMPRAR");
  if (set.has("ALUGUEL")) derived.push("ALUGAR");
  return derived;
}

function createEmptyProfileForm(): ProfileFormState {
  return {
    objetivolead: [],
    tipouso: "",
    tipoimovel: [],
    categoriaimovel: [],
    subcategoriaimovel: [],
    intencao_compra: "",
    valor_min: "",
    valor_max: "",
    area_util_min: "",
    area_util_max: "",
    area_util_min_comercial: "",
    area_util_max_comercial: "",
    quartos_min: "",
    suites_min: "",
    vagas_min: "",
    vagas_min_comercial: "",
    localizacao_texto: "",
    canais: [],
    conteudos: [],
    texto_livre: "",
    mensagem: "",
  };
}

function buildContactFormFromLead(lead: LeadWorkspace["lead"]): ContactFormState {
  return {
    nome: lead.nome ?? "",
    profissao: lead.profissao ?? "",
    email: lead.email ?? "",
    telefone: lead.telefone ?? "",
    origem: lead.origem,
    cep: formatPostalCodeDisplay(lead.cep),
    endereco: lead.endereco ?? "",
    numero: lead.numero ?? "",
    complemento: lead.complemento ?? "",
    bairro: lead.bairro ?? "",
    cidade: lead.cidade ?? "",
    uf: lead.uf ?? "",
    pais: lead.pais ?? "Brasil",
  };
}

function getChangedContactFields(
  form: ContactFormState,
  lead: LeadWorkspace["lead"],
): ContactAutosaveField[] {
  const changed: ContactAutosaveField[] = [];
  if (form.nome.trim() !== (lead.nome ?? "")) changed.push("nome");
  if (form.profissao.trim() !== (lead.profissao ?? "")) changed.push("profissao");
  if (normalizeText(form.email) !== normalizeText(lead.email)) changed.push("email");
  if (form.telefone.trim() !== (lead.telefone ?? "")) changed.push("telefone");
  if (form.origem !== lead.origem) changed.push("origem");
  if (normalizePostalCode(form.cep) !== normalizePostalCode(lead.cep)) changed.push("cep");
  if (form.endereco.trim() !== (lead.endereco ?? "")) changed.push("endereco");
  if (form.numero.trim() !== (lead.numero ?? "")) changed.push("numero");
  if (form.complemento.trim() !== (lead.complemento ?? "")) changed.push("complemento");
  if (form.bairro.trim() !== (lead.bairro ?? "")) changed.push("bairro");
  if (form.cidade.trim() !== (lead.cidade ?? "")) changed.push("cidade");
  if (form.uf !== (lead.uf ?? "")) changed.push("uf");
  if (form.pais.trim() !== (lead.pais ?? "")) changed.push("pais");
  return changed;
}

function buildProfileBriefingPayload(form: ProfileFormState) {
  return {
    objetivolead: form.objetivolead,
    tipouso: form.tipouso || null,
    tipoimovel: form.tipoimovel,
    categoriaimovel: form.categoriaimovel,
    subcategoriaimovel: form.subcategoriaimovel,
    intencao_compra: form.intencao_compra || null,
    valor_min: parseOptionalCurrencyInput(form.valor_min),
    valor_max: parseOptionalCurrencyInput(form.valor_max),
    area_util_min: parseOptionalNumberInput(form.area_util_min),
    area_util_max: parseOptionalNumberInput(form.area_util_max),
    area_util_min_comercial: parseOptionalNumberInput(form.area_util_min_comercial),
    area_util_max_comercial: parseOptionalNumberInput(form.area_util_max_comercial),
    quartos_min: parseOptionalNumberInput(form.quartos_min),
    suites_min: parseOptionalNumberInput(form.suites_min),
    vagas_min: parseOptionalNumberInput(form.vagas_min),
    vagas_min_comercial: parseOptionalNumberInput(form.vagas_min_comercial),
    localizacao_texto: form.localizacao_texto.trim() || null,
    canais: form.canais,
    conteudos: form.conteudos,
    texto_livre: form.texto_livre.trim() || null,
  };
}

function deriveLeadNegotiationTypes(objectives: LeadObjective[]): LeadTipoNegociacao[] {
  const negotiationTypes: LeadTipoNegociacao[] = [];
  if (objectives.includes("COMPRAR")) negotiationTypes.push("VENDA");
  if (objectives.includes("ALUGAR")) negotiationTypes.push("ALUGUEL");
  return negotiationTypes;
}

function buildLocalBriefingState(params: {
  currentBriefing: LeadWorkspace["briefing"];
  leadId: string;
  payload: ReturnType<typeof buildProfileBriefingPayload>;
}) {
  const { currentBriefing, leadId, payload } = params;
  const nowIso = new Date().toISOString();

  return {
    id: currentBriefing?.id ?? `draft-${leadId}`,
    objetivolead: payload.objetivolead,
    tipouso: payload.tipouso,
    tipoimovel: payload.tipoimovel,
    categoriaimovel: payload.categoriaimovel,
    subcategoriaimovel: payload.subcategoriaimovel,
    construcao: currentBriefing?.construcao ?? null,
    tiponegociacao: deriveLeadNegotiationTypes(payload.objetivolead),
    intencao_compra: payload.intencao_compra,
    valor_min: payload.valor_min,
    valor_max: payload.valor_max,
    area_util_min: payload.area_util_min,
    area_util_max: payload.area_util_max,
    quartos_min: payload.quartos_min,
    suites_min: payload.suites_min,
    vagas_min: payload.vagas_min,
    caracteristicas_residenciais: currentBriefing?.caracteristicas_residenciais ?? null,
    area_util_min_comercial: payload.area_util_min_comercial,
    area_util_max_comercial: payload.area_util_max_comercial,
    vagas_min_comercial: payload.vagas_min_comercial,
    caracteristicas_comerciais: currentBriefing?.caracteristicas_comerciais ?? null,
    geolocacao_id: currentBriefing?.geolocacao_id ?? null,
    localizacao_texto: payload.localizacao_texto,
    lat: currentBriefing?.lat ?? null,
    lng: currentBriefing?.lng ?? null,
    raio_km: currentBriefing?.raio_km ?? null,
    texto_livre: payload.texto_livre,
    conteudos: payload.conteudos,
    canais: payload.canais,
    created_at: currentBriefing?.created_at ?? nowIso,
    updated_at: nowIso,
  } satisfies NonNullable<LeadWorkspace["briefing"]>;
}

function getChangedProfileFields(
  form: ProfileFormState,
  workspace: LeadWorkspace,
): ProfileAutosaveField[] {
  const briefing = workspace.briefing;
  const payload = buildProfileBriefingPayload(form);
  const changed: ProfileAutosaveField[] = [];

  if (
    normalizeArrayForCompare(payload.objetivolead) !==
    normalizeArrayForCompare(
      briefing?.objetivolead && briefing.objetivolead.length > 0
        ? briefing.objetivolead
        : deriveLeadObjectivesFromLegacyNegotiation(briefing?.tiponegociacao),
    )
  ) {
    changed.push("objetivolead");
  }
  if (payload.tipouso !== (briefing?.tipouso ?? null)) changed.push("tipouso");
  if (
    normalizeTipologiaSelectionCompare({
      uso: payload.tipouso ?? "",
      categorias: payload.categoriaimovel,
      subcategorias: payload.subcategoriaimovel,
      tipos: payload.tipoimovel,
    }) !==
    normalizeTipologiaSelectionCompare({
      uso: briefing?.tipouso ?? "",
      categorias: briefing?.categoriaimovel,
      subcategorias: briefing?.subcategoriaimovel,
      tipos: briefing?.tipoimovel,
    })
  ) {
    changed.push("tipologia");
  }
  if (payload.intencao_compra !== (briefing?.intencao_compra ?? null)) changed.push("intencao_compra");
  if (payload.valor_min !== (briefing?.valor_min ?? null)) changed.push("valor_min");
  if (payload.valor_max !== (briefing?.valor_max ?? null)) changed.push("valor_max");
  if (payload.area_util_min !== (briefing?.area_util_min ?? null)) changed.push("area_util_min");
  if (payload.area_util_max !== (briefing?.area_util_max ?? null)) changed.push("area_util_max");
  if (payload.area_util_min_comercial !== (briefing?.area_util_min_comercial ?? null)) {
    changed.push("area_util_min_comercial");
  }
  if (payload.area_util_max_comercial !== (briefing?.area_util_max_comercial ?? null)) {
    changed.push("area_util_max_comercial");
  }
  if (payload.quartos_min !== (briefing?.quartos_min ?? null)) changed.push("quartos_min");
  if (payload.suites_min !== (briefing?.suites_min ?? null)) changed.push("suites_min");
  if (payload.vagas_min !== (briefing?.vagas_min ?? null)) changed.push("vagas_min");
  if (payload.vagas_min_comercial !== (briefing?.vagas_min_comercial ?? null)) {
    changed.push("vagas_min_comercial");
  }
  if ((payload.localizacao_texto ?? "") !== (briefing?.localizacao_texto ?? "")) {
    changed.push("localizacao_texto");
  }
  if (normalizeArrayForCompare(payload.canais) !== normalizeArrayForCompare(briefing?.canais)) {
    changed.push("canais");
  }
  if (normalizeArrayForCompare(payload.conteudos) !== normalizeArrayForCompare(briefing?.conteudos)) {
    changed.push("conteudos");
  }
  if ((payload.texto_livre ?? "") !== (briefing?.texto_livre ?? "")) changed.push("texto_livre");
  if (form.mensagem.trim() !== (workspace.lead.mensagem ?? "")) changed.push("mensagem");

  return changed;
}

function resolveFieldSaveState<T extends string>(
  map: Partial<Record<T, FieldSaveState>>,
  fields: readonly T[],
): FieldSaveState | null {
  if (fields.some((field) => map[field] === "saving")) return "saving";
  if (fields.some((field) => map[field] === "saved")) return "saved";
  return null;
}

function buildProfileFormFromWorkspace(workspace: LeadWorkspace | null): ProfileFormState {
  if (!workspace) return createEmptyProfileForm();
  const briefing = workspace.briefing;
  const tipoUso = briefing?.tipouso ?? "";
  const tipos = [...(briefing?.tipoimovel ?? [])];
  const categorias = tipos.map((tipoImovel, index) => {
    return briefing?.categoriaimovel?.[index] ?? inferBriefingCategoriaToken({ uso: tipoUso, tipoImovel }) ?? "";
  });
  const subcategorias = tipos.map((tipoImovel, index) => {
    const categoria = categorias[index] ?? "";
    return (
      briefing?.subcategoriaimovel?.[index] ??
      inferBriefingSubcategoriaToken({
        uso: tipoUso,
        categoria,
        tipoImovel,
      }) ??
      ""
    );
  });

  return {
    objetivolead:
      briefing?.objetivolead && briefing.objetivolead.length > 0
        ? [...briefing.objetivolead]
        : deriveLeadObjectivesFromLegacyNegotiation(briefing?.tiponegociacao),
    tipouso: tipoUso,
    tipoimovel: tipos,
    categoriaimovel: categorias,
    subcategoriaimovel: subcategorias,
    intencao_compra: briefing?.intencao_compra ?? "",
    valor_min: formatCurrencyFormValue(briefing?.valor_min),
    valor_max: formatCurrencyFormValue(briefing?.valor_max),
    area_util_min: formatAreaFormValue(briefing?.area_util_min),
    area_util_max: formatAreaFormValue(briefing?.area_util_max),
    area_util_min_comercial:
      formatAreaFormValue(briefing?.area_util_min_comercial),
    area_util_max_comercial:
      formatAreaFormValue(briefing?.area_util_max_comercial),
    quartos_min: briefing?.quartos_min != null ? String(briefing.quartos_min) : "",
    suites_min: briefing?.suites_min != null ? String(briefing.suites_min) : "",
    vagas_min: briefing?.vagas_min != null ? String(briefing.vagas_min) : "",
    vagas_min_comercial:
      briefing?.vagas_min_comercial != null ? String(briefing.vagas_min_comercial) : "",
    localizacao_texto: briefing?.localizacao_texto ?? "",
    canais: [...(briefing?.canais ?? [])],
    conteudos: [...(briefing?.conteudos ?? [])],
    texto_livre: briefing?.texto_livre ?? "",
    mensagem: workspace.lead.mensagem ?? "",
  };
}

function formatPhoneDisplay(input: string | null | undefined) {
  const digitsRaw = (input ?? "").replace(/\D/g, "");
  const localDigits =
    digitsRaw.startsWith("55") && digitsRaw.length >= 12 ? digitsRaw.slice(2) : digitsRaw;
  const digits = localDigits.slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizePhoneToBrE164(rawPhone: string | null | undefined) {
  const digits = (rawPhone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;

  return `+${withCountry}`;
}

function buildWhatsappUrl(phone: string | null | undefined) {
  const e164 = normalizePhoneToBrE164(phone);
  if (!e164) return null;
  return `https://wa.me/${e164.replace(/\D/g, "")}`;
}

function buildTelHref(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `tel:${digits}`;
}

function formatDate(value: string | null, mode: "date" | "datetime" = "date") {
  if (!value) return "Sem data";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(mode === "datetime" ? { timeStyle: "short" } : {}),
  }).format(parsed);
}

function formatRelativeToNow(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return formatDate(value, "datetime");

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) return "agora";
  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `há ${minutes} min`;
  }
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `há ${hours} h`;
  }

  const days = Math.floor(diffMs / dayMs);
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  return formatDate(value);
}

function getFinalidadeLabel(value: LeadFinalidade) {
  return value === "COMPRAR" ? "Comprar" : "Alugar";
}

function getFinalidadeBadgeClass(value: LeadFinalidade) {
  return value === "COMPRAR"
    ? "bg-[var(--primary-scarlet)]/10 text-[var(--primary-scarlet)]"
    : "bg-[var(--blue-slate)]/10 text-[var(--blue-slate)]";
}

function getInterestLocationLabel(item: LeadWorkspace["localizacoes_interesse"][number]) {
  return (
    item.localizacao_texto ||
    item.endereco_formatado ||
    [item.bairro, item.cidade, item.estado].filter(Boolean).join(" - ") ||
    "Localização salva"
  );
}

function getInterestLocationMeta(item: LeadWorkspace["localizacoes_interesse"][number]) {
  const parts = [[item.bairro, item.cidade].filter(Boolean).join(" - "), item.estado].filter(Boolean);
  const text = parts.join(" · ");
  if (typeof item.raio_km === "number" && Number.isFinite(item.raio_km)) {
    return text ? `${text} · raio ${item.raio_km} km` : `Raio ${item.raio_km} km`;
  }
  return text || null;
}

function getImovelLocationLabel(item: LeadWorkspace["imoveis_interesse"][number]) {
  return [item.bairro, item.cidade, item.estado].filter(Boolean).join(" - ") || "Localização do imóvel";
}

function getImovelDisplayTitle(item: ImovelDisplayTitleInput) {
  return buildImovelHeaderTitle(item);
}

function getImovelHeadlineValue(item: LeadWorkspace["imoveis_interesse"][number]) {
  if (item.finalidade === "COMPRAR" && typeof item.preco_venda === "number") {
    return formatCurrency(item.preco_venda);
  }
  if (item.finalidade === "ALUGAR" && typeof item.preco_locacao === "number") {
    return `${formatCurrency(item.preco_locacao)}/mês`;
  }
  if (typeof item.preco_venda === "number") return formatCurrency(item.preco_venda);
  if (typeof item.preco_locacao === "number") return `${formatCurrency(item.preco_locacao)}/mês`;
  return "Preço não informado";
}

function getOpportunityImovelBaseValue(item: LeadWorkspace["imoveis_interesse"][number]) {
  if (typeof item.preco_venda === "number" && Number.isFinite(item.preco_venda)) return item.preco_venda;
  return null;
}

function getOpportunityImovelCommissionPercent(item: LeadWorkspace["imoveis_interesse"][number]) {
  if (typeof item.comissao_venda_percentual === "number" && Number.isFinite(item.comissao_venda_percentual)) {
    return item.comissao_venda_percentual;
  }
  return null;
}

function buildOpportunityTitle(params: {
  leadName: string;
  imovelTitle?: string | null;
  imovelCodigo?: string | null;
}) {
  if (params.imovelTitle?.trim()) {
    return `Oportunidade • ${params.imovelTitle.trim()}`;
  }
  if (params.imovelCodigo?.trim()) {
    return `Oportunidade • ${params.imovelCodigo.trim()}`;
  }
  return `Oportunidade • ${params.leadName}`;
}

function getOpportunityPreviousStep(step: CreateOpportunityStep): CreateOpportunityStep | null {
  if (step === "valor") return "imovel";
  if (step === "pagamento") return "valor";
  if (step === "resumo") return "pagamento";
  return null;
}

function createInitialOpportunityForm(workspace: LeadWorkspace): CreateOpportunityFormState {
  const primaryImovel =
    workspace.imoveis_interesse.find((item) => item.finalidade === "COMPRAR" || typeof item.preco_venda === "number") ??
    workspace.imoveis_interesse[0] ??
    null;
  const suggestedValue =
    (primaryImovel ? getOpportunityImovelBaseValue(primaryImovel) : null) ?? workspace.summary.valor_max ?? null;
  const suggestedCommissionPercent = primaryImovel ? getOpportunityImovelCommissionPercent(primaryImovel) : null;

  return {
    ...INITIAL_CREATE_OPPORTUNITY_FORM,
    imovel_id: primaryImovel?.id ?? "",
    valor: formatCurrencyFormValue(suggestedValue),
    comissao_percentual: formatOpportunityPercentValue(suggestedCommissionPercent),
  };
}

function buildOpportunityCommissionAmountInput(totalValue: number | null, commissionPercentInput: string) {
  return formatCurrencyFormValue(
    calculateOpportunitySplitValue(totalValue, parseOpportunityPercentInput(commissionPercentInput)),
  );
}

function buildOpportunityAmountInputs(
  totalValue: number | null,
  values: Pick<CreateOpportunityFormState, OpportunityPercentFieldKey>,
): OpportunityAmountInputState {
  return {
    recursoproprios_percentual: formatCurrencyFormValue(
      calculateOpportunitySplitValue(totalValue, parseOpportunityPercentInput(values.recursoproprios_percentual)),
    ),
    financiamento_percentual: formatCurrencyFormValue(
      calculateOpportunitySplitValue(totalValue, parseOpportunityPercentInput(values.financiamento_percentual)),
    ),
    fgts_percentual: formatCurrencyFormValue(
      calculateOpportunitySplitValue(totalValue, parseOpportunityPercentInput(values.fgts_percentual)),
    ),
    outrosrecursos_percentual: formatCurrencyFormValue(
      calculateOpportunitySplitValue(totalValue, parseOpportunityPercentInput(values.outrosrecursos_percentual)),
    ),
  };
}

function leadSupportsVendaOpportunity(workspace: LeadWorkspace) {
  const objectives = new Set(workspace.briefing?.objetivolead ?? []);
  const hasExplicitSaleObjective = objectives.has("COMPRAR");
  const hasOnlyRentObjective = objectives.size > 0 && Array.from(objectives).every((item) => item === "ALUGAR");
  const hasOnlySellObjective = objectives.size > 0 && Array.from(objectives).every((item) => item === "VENDER");
  const hasSaleImovel = workspace.imoveis_interesse.some(
    (item) => item.finalidade === "COMPRAR" || typeof item.preco_venda === "number",
  );

  if (hasExplicitSaleObjective || hasSaleImovel) return true;
  if (hasOnlyRentObjective || hasOnlySellObjective) return false;
  return true;
}

function resolveLeadNegocioFase(item: LeadWorkspaceNegocioItem): FaseNegocio {
  return item.fase ?? mapLegacyEtapaToFase(item.etapa);
}

function resolveLeadNegocioModalidade(item: LeadWorkspaceNegocioItem): ModalidadeNegocio {
  return item.modalidade ?? mapLegacyFinalidadeToModalidade(item.finalidade) ?? "VENDA";
}

function getNegocioFaseChipClass(fase: FaseNegocio) {
  if (fase === "GANHO") return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  if (fase === "PERDIDO") return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  if (fase === "JURIDICO") return "bg-violet-100 text-violet-700 ring-1 ring-violet-200";
  return "bg-sky-100 text-sky-700 ring-1 ring-sky-200";
}

function getNegocioModalidadeChipClass(modalidade: ModalidadeNegocio) {
  if (modalidade === "CAPTACAO") return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  if (modalidade === "LOCACAO") return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function getImovelMapAddress(item: LeadWorkspace["imoveis_interesse"][number]) {
  const street = [item.logradouro, item.numero].filter(Boolean).join(", ");
  const locality = [item.bairro, item.cidade, item.estado].filter(Boolean).join(" - ");
  return [street, locality].filter(Boolean).join(" · ") || getImovelLocationLabel(item);
}

function toLocalDatetimeValue(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function splitLocalDatetime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5),
  };
}

function combineLocalDateAndTime(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function getMinutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function roundUpToInterval(date: Date, intervalMinutes: number) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const remainder = minutes % intervalMinutes;
  if (remainder !== 0) {
    rounded.setMinutes(minutes + (intervalMinutes - remainder));
  }
  return rounded;
}

function moveToNextBusinessWindow(date: Date, startHour: number, businessDaysOnly: boolean) {
  const next = new Date(date);
  next.setSeconds(0, 0);

  while (businessDaysOnly && !isBusinessDay(next)) {
    next.setDate(next.getDate() + 1);
    next.setHours(startHour, 0, 0, 0);
  }

  if (getMinutesOfDay(next) < startHour * 60) {
    next.setHours(startHour, 0, 0, 0);
  }

  return next;
}

function moveToNextAllowedSlot(date: Date, input: {
  startHour: number;
  endHour: number;
  intervalMinutes: number;
  businessDaysOnly: boolean;
}) {
  const next = moveToNextBusinessWindow(date, input.startHour, input.businessDaysOnly);
  const rounded = roundUpToInterval(next, input.intervalMinutes);

  if (getMinutesOfDay(rounded) >= input.endHour * 60) {
    const shifted = new Date(rounded);
    shifted.setDate(shifted.getDate() + 1);
    shifted.setHours(input.startHour, 0, 0, 0);
    return moveToNextBusinessWindow(shifted, input.startHour, input.businessDaysOnly);
  }

  return rounded;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function parseLocalDateInput(value: string) {
  if (!value) return null;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function formatLocalDateLabel(value: string, mode: "short" | "full" = "full") {
  const parsed = parseLocalDateInput(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    ...(mode === "full" ? { year: "numeric" } : {}),
  }).format(parsed);
}

function formatTimeLabel(time: string) {
  return time;
}

function buildCalendarGrid(monthAnchor: Date, minDate: Date) {
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startWeekday);
  const minDateStart = startOfDay(minDate);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      value: toLocalDateInput(date),
      isCurrentMonth: date.getMonth() === monthAnchor.getMonth(),
      isDisabled: startOfDay(date) < minDateStart,
    };
  });
}

function getLatestStartMinutes(endHour: number, durationMinutes: number) {
  return endHour * 60 - durationMinutes;
}

function getActivityDurationMinutes(
  input: Pick<LeadWorkspaceAtividadeItem, "tipo" | "modelo"> | { tipo: string | null; modelo: string | null },
) {
  if (input.modelo === "EM_ATENDIMENTO_VISITA_VIRTUAL") return 60;
  if (input.modelo === "EM_ATENDIMENTO_VISITA_PRESENCIAL") return 90;
  if (input.tipo === "VISITA" || input.tipo === "REUNIAO") return 60;
  return 30;
}

function buildAvailableTimeOptionsForDate(input: {
  dateValue: string;
  activities: LeadWorkspace["atividades"];
  currentActivityId?: string | null;
  activityType: LeadWorkspaceAtividadeItem["tipo"] | null;
  activityModel: LeadWorkspaceAtividadeItem["modelo"] | null;
  minLeadMinutes?: number;
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
}): ActivityTimeOption[] {
  const targetDate = parseLocalDateInput(input.dateValue);
  if (!targetDate) return [];

  const now = new Date();
  const durationMinutes = getActivityDurationMinutes({
    tipo: input.activityType,
    modelo: input.activityModel,
  });
  const startHour = input.startHour ?? 7;
  const endHour = input.endHour ?? 22;
  const intervalMinutes = input.intervalMinutes ?? 15;
  const minLeadMinutes = input.minLeadMinutes ?? 15;

  const occupied = input.activities
    .filter((item) => item.id !== input.currentActivityId && item.status === "PENDENTE" && item.quando_em)
    .map((item) => {
      const start = new Date(item.quando_em as string);
      return {
        start,
        end: addMinutes(start, getActivityDurationMinutes(item)),
      };
    })
    .filter((item) => !Number.isNaN(item.start.getTime()) && isSameLocalDay(item.start, targetDate))
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  const dayStart = new Date(targetDate);
  dayStart.setHours(startHour, 0, 0, 0);

  let cursor = new Date(dayStart);
  if (isSameLocalDay(targetDate, now)) {
    const earliestToday = roundUpToInterval(addMinutes(now, minLeadMinutes), intervalMinutes);
    if (earliestToday > cursor) {
      cursor = earliestToday;
    }
  }

  const latestStartMinutes = getLatestStartMinutes(endHour, durationMinutes);
  const options: ActivityTimeOption[] = [];

  while (getMinutesOfDay(cursor) <= latestStartMinutes) {
    const end = addMinutes(cursor, durationMinutes);
    const overlapping = occupied.some((slot) => cursor < slot.end && end > slot.start);
    if (!overlapping) {
      const time = `${String(cursor.getHours()).padStart(2, "0")}:${String(cursor.getMinutes()).padStart(2, "0")}`;
      options.push({
        value: time,
        label: formatTimeLabel(time),
      });
    }
    cursor = addMinutes(cursor, intervalMinutes);
  }

  return options;
}

function buildActivityQuickScheduleOptions(input: {
  activities: LeadWorkspace["atividades"];
  currentActivityId?: string | null;
  activityType: LeadWorkspaceAtividadeItem["tipo"] | null;
  activityModel: LeadWorkspaceAtividadeItem["modelo"] | null;
  limit?: number;
}) {
  const now = new Date();
  const limit = input.limit ?? 5;
  const intervalMinutes = 30;
  const startHour = 8;
  const endHour = 20;
  const minLeadMinutes = 15;
  const suggestionsByDay = new Map<string, ActivityQuickScheduleOption[]>();

  let cursorDate = moveToNextAllowedSlot(addMinutes(now, minLeadMinutes), {
    startHour,
    endHour,
    intervalMinutes,
    businessDaysOnly: true,
  });
  let scannedDays = 0;

  while (suggestionsByDay.size < 5 && scannedDays < 15) {
    const dateValue = toLocalDateInput(cursorDate);
    const timeOptions = buildAvailableTimeOptionsForDate({
      dateValue,
      activities: input.activities,
      currentActivityId: input.currentActivityId,
      activityType: input.activityType,
      activityModel: input.activityModel,
      minLeadMinutes,
      startHour,
      endHour,
      intervalMinutes,
    });

    if (timeOptions.length > 0) {
      const options = timeOptions.slice(0, 2).map((option) => {
        const dateTimeValue = combineLocalDateAndTime(dateValue, option.value);
        const date = parseLocalDateInput(dateValue) ?? new Date();
        const today = new Date();
        const tomorrow = addMinutes(startOfDay(today), 24 * 60);
        const labelDate = new Intl.DateTimeFormat("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }).format(date);

        return {
          id: `slot-${dateTimeValue}`,
          label: isSameLocalDay(date, today) ? "Hoje" : isSameLocalDay(date, tomorrow) ? "Amanhã" : labelDate,
          hint: option.label,
          value: dateTimeValue,
        } satisfies ActivityQuickScheduleOption;
      });
      suggestionsByDay.set(dateValue, options);
    }

    const nextDate = new Date(cursorDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(startHour, 0, 0, 0);
    cursorDate = moveToNextAllowedSlot(nextDate, {
      startHour,
      endHour,
      intervalMinutes,
      businessDaysOnly: true,
    });
    scannedDays += 1;
  }

  const flattened = Array.from(suggestionsByDay.values()).flat();
  return flattened.slice(0, limit);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMapInfoCardHtml(point: MapPoint) {
  const firstImovel = point.imoveis[0] ?? null;
  const content = firstImovel
    ? `Imóvel${firstImovel.codigo ? ` Cod ${firstImovel.codigo}` : ""}: ${firstImovel.address}`
    : point.mapAddress;

  return `
    <div class="w-[180px] max-w-[180px] overflow-hidden pr-1">
      <p
        class="m-0 text-[12px] font-semibold leading-[1.35] text-slate-900"
        style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;"
      >
        ${escapeHtml(content)}
      </p>
    </div>
  `;
}

function getActivityReferenceTimestamp(item: LeadWorkspaceAtividadeItem) {
  const candidate = item.quando_em ?? item.created_at;
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getActivityVisualStatus(item: LeadWorkspaceAtividadeItem, referenceIso: string) {
  if (item.status === "CONCLUIDA") {
    return {
      label: "Concluída",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (item.quando_em && item.quando_em < referenceIso) {
    return {
      label: "Atrasada",
      className: "bg-rose-100 text-rose-700",
    };
  }

  return {
    label: "Agendada",
    className: "bg-sky-100 text-sky-700",
  };
}

function getActivityFilterKey(item: LeadWorkspaceAtividadeItem, referenceIso: string): Exclude<ActivityFilterKey, "TODAS"> {
  const visualStatus = getActivityVisualStatus(item, referenceIso);
  if (visualStatus.label === "Atrasada") return "ATRASADA";
  if (visualStatus.label === "Concluída") return "CONCLUIDA";
  return "AGENDADA";
}

function buildInlineActionClass(variant: "primary" | "secondary" = "secondary") {
  return variant === "primary"
    ? "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--blue-slate)] px-3.5 text-sm font-semibold text-white"
    : "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
}

function buildModalButtonClass(variant: "primary" | "secondary" = "secondary") {
  return variant === "primary"
    ? "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--blue-slate)] px-4 text-sm font-semibold text-white"
    : "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50";
}

function buildModalInputInnerClass() {
  return "opportunity-modal-input min-w-0 w-full appearance-none border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none outline-none ring-0 placeholder:text-slate-400";
}

function buildOpportunityModalTextareaClass() {
  return "opportunity-modal-textarea rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white";
}

function buildHeaderActionClass(variant: "slate" | "success" | "neutral" | "disabled" = "neutral") {
  if (variant === "success") {
    return "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700";
  }

  if (variant === "slate") {
    return "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50";
  }

  if (variant === "disabled") {
    return "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400";
  }

  return "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50";
}

function getActivityFilterLabel(value: ActivityFilterKey) {
  if (value === "ATRASADA") return "Atrasadas";
  if (value === "AGENDADA") return "Agendadas";
  if (value === "CONCLUIDA") return "Concluídas";
  return "Todas";
}

function QuickMetric({
  label,
  value,
  hint,
  icon,
  accentClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accentClassName: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${accentClassName}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">{value}</p>
        </div>
        {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function FieldHelpTooltip({
  text,
  placement = "bottom",
}: {
  text: string;
  placement?: "bottom" | "right-desktop";
}) {
  const bubbleClassName =
    placement === "right-desktop"
      ? "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-64 -translate-x-1/2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium leading-relaxed text-white opacity-0 shadow-[0_18px_34px_rgba(15,23,42,0.22)] transition group-hover/field-help:opacity-100 group-focus-within/field-help:opacity-100 md:left-[calc(100%+12px)] md:top-1/2 md:w-72 md:-translate-x-0 md:-translate-y-1/2"
      : "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-64 -translate-x-1/2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium leading-relaxed text-white opacity-0 shadow-[0_18px_34px_rgba(15,23,42,0.22)] transition group-hover/field-help:opacity-100 group-focus-within/field-help:opacity-100";

  return (
    <span className="group/field-help relative inline-flex">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600 focus:border-slate-300 focus:text-slate-600 focus:outline-none"
        aria-label="Mostrar ajuda do campo"
      >
        <Info size={12} weight="bold" />
      </button>
      <span className={bubbleClassName}>
        {text}
      </span>
    </span>
  );
}

function FieldSaveStatusLabel({ status }: { status: FieldSaveState | null }) {
  if (!status) return null;

  return (
    <span
      className={`text-xs font-semibold ${
        status === "saved" ? "text-emerald-500" : "text-amber-500"
      }`}
    >
      {status === "saved" ? "Salvo!" : "Salvando..."}
    </span>
  );
}

function FieldLegend({
  label,
  status = null,
  helpText,
  helpPlacement = "bottom",
  trailing,
}: {
  label: string;
  status?: FieldSaveState | null;
  helpText?: string;
  helpPlacement?: "bottom" | "right-desktop";
  trailing?: ReactNode;
}) {
  return (
    <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
      <span className="inline-flex min-w-0 items-center gap-2">
        <span>{label}</span>
        {helpText ? <FieldHelpTooltip text={helpText} placement={helpPlacement} /> : null}
      </span>
      <span className="inline-flex shrink-0 items-center gap-2">
        {trailing}
        <FieldSaveStatusLabel status={status} />
      </span>
    </span>
  );
}

function SectionCard({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  chrome = "default",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  chrome?: "default" | "flat";
}) {
  return (
    <section
      className={
        chrome === "flat"
          ? "rounded-[30px] bg-transparent p-5"
          : "rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  modalId,
  headerAction,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  modalId?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div
        id={modalId}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.24)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Lead</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Fechar janela"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="mt-5 min-h-0 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LeadDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  const [workspace, setWorkspace] = useState<LeadWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<FloatingToastItem[]>([]);

  const [contactForm, setContactForm] = useState<ContactFormState>({
    nome: "",
    profissao: "",
    email: "",
    telefone: "",
    origem: "OUTRO",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    pais: "Brasil",
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => createEmptyProfileForm());
  const [contactFieldStatus, setContactFieldStatus] = useState<Partial<Record<ContactAutosaveField, FieldSaveState>>>({});
  const [profileFieldStatus, setProfileFieldStatus] = useState<Partial<Record<ProfileAutosaveField, FieldSaveState>>>({});
  const [profileTipologiaCategoria, setProfileTipologiaCategoria] = useState("");
  const [profileTipologiaSubcategoria, setProfileTipologiaSubcategoria] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [showProfessionSuggestions, setShowProfessionSuggestions] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearchFocused, setLocationSearchFocused] = useState(false);
  const [locationPlaceOptions, setLocationPlaceOptions] = useState<PlacePrediction[]>([]);
  const [searchingLocationPlaces, setSearchingLocationPlaces] = useState(false);
  const [selectedLocationPlace, setSelectedLocationPlace] = useState<PlaceDetails | null>(null);
  const [addingLocation, setAddingLocation] = useState(false);
  const [removingLocationId, setRemovingLocationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeadWorkspaceTab>("atividades");
  const [activityFilter, setActivityFilter] = useState<ActivityFilterKey>("TODAS");
  const [savingContact, setSavingContact] = useState(false);
  const [savingLeadStatus, setSavingLeadStatus] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [desqualifyModalOpen, setDesqualifyModalOpen] = useState(false);
  const [desqualifyForm, setDesqualifyForm] = useState<{
    motivo: MotivoDesqualificacaoOption | "";
    nota: string;
  }>({
    motivo: "",
    nota: "",
  });
  const [createOpportunityModalOpen, setCreateOpportunityModalOpen] = useState(false);
  const [createOpportunityStep, setCreateOpportunityStep] = useState<CreateOpportunityStep>("imovel");
  const [createOpportunityForm, setCreateOpportunityForm] = useState<CreateOpportunityFormState>(
    INITIAL_CREATE_OPPORTUNITY_FORM,
  );
  const [createOpportunityCommissionAmountInput, setCreateOpportunityCommissionAmountInput] = useState("");
  const [createOpportunityCommissionEditedField, setCreateOpportunityCommissionEditedField] =
    useState<OpportunityCommissionEditedField>("percent");
  const [createOpportunityAmountInputs, setCreateOpportunityAmountInputs] = useState<OpportunityAmountInputState>(() =>
    buildOpportunityAmountInputs(null, INITIAL_CREATE_OPPORTUNITY_FORM),
  );
  const [creatingOpportunity, setCreatingOpportunity] = useState(false);
  const [createActivityModalOpen, setCreateActivityModalOpen] = useState(false);
  const [createActivityStep, setCreateActivityStep] = useState<CreateActivityStep>("categoria");
  const [createActivityForm, setCreateActivityForm] = useState<CreateActivityFormState>({
    categoria: null,
    modelo: null,
    tipo: null,
    titulo: "",
    quando: "",
    descricao: "",
  });
  const [showCreateActivityManualPicker, setShowCreateActivityManualPicker] = useState(false);
  const [createActivityManualSelection, setCreateActivityManualSelection] = useState<CreateActivityManualSelectionState>({
    data: "",
    hora: "",
  });
  const [createActivityCalendarMonth, setCreateActivityCalendarMonth] = useState(() => startOfDay(new Date()));
  const [createActivityCustomDate, setCreateActivityCustomDate] = useState<string | null>(null);
  const [savingCreatedActivity, setSavingCreatedActivity] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<LeadWorkspaceAtividadeItem | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleFormState>({
    nota: "",
    data: "",
    hora: "",
  });
  const [rescheduleManualSelection, setRescheduleManualSelection] = useState<RescheduleManualSelectionState>({
    data: "",
    hora: "",
  });
  const [rescheduleCalendarMonth, setRescheduleCalendarMonth] = useState(() => startOfDay(new Date()));
  const [showRescheduleManualPicker, setShowRescheduleManualPicker] = useState(false);
  const [rescheduleCustomDate, setRescheduleCustomDate] = useState<string | null>(null);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<LeadWorkspaceAtividadeItem | null>(null);
  const [completeActivityForm, setCompleteActivityForm] = useState<FinishActivityFormState>({
    nota: "",
    resultado: "POSITIVO",
  });
  const [savingComplete, setSavingComplete] = useState(false);
  const [confirmVisitTarget, setConfirmVisitTarget] = useState<LeadWorkspaceAtividadeItem | null>(null);
  const [confirmVisitForm, setConfirmVisitForm] = useState<ConfirmVisitFormState>({
    modelo: "EM_ATENDIMENTO_VISITA_PRESENCIAL",
    data: "",
    hora: "",
    nota: "",
  });
  const [savingConfirmVisit, setSavingConfirmVisit] = useState(false);

  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [ownedImoveis, setOwnedImoveis] = useState<OwnedImovelOption[]>([]);
  const [ownedImoveisLoaded, setOwnedImoveisLoaded] = useState(false);
  const [loadingOwnedImoveis, setLoadingOwnedImoveis] = useState(false);
  const [associateSearch, setAssociateSearch] = useState("");
  const deferredAssociateSearch = useDeferredValue(associateSearch);
  const [associatingImovelId, setAssociatingImovelId] = useState<string | null>(null);

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitFormState>({
    imovel_id: "",
    quando: "",
    descricao: "",
  });
  const [savingVisit, setSavingVisit] = useState(false);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapHostElementRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedWorkspaceRef = useRef(false);
  const loadedLeadIdRef = useRef<string | null>(null);
  const contactAutosaveTimeoutRef = useRef<number | null>(null);
  const profileAutosaveTimeoutRef = useRef<number | null>(null);
  const locationSearchTimeoutRef = useRef<number | null>(null);
  const leadDataUpdateTimelineKeysRef = useRef<Set<string>>(new Set());
  const contactFieldHideTimeoutsRef = useRef<Partial<Record<ContactAutosaveField, number>>>({});
  const profileFieldHideTimeoutsRef = useRef<Partial<Record<ProfileAutosaveField, number>>>({});
  const savingContactRef = useRef(false);
  const savingProfileRef = useRef(false);
  const saveContactFormRef = useRef<() => Promise<void>>(async () => undefined);
  const saveProfileFormRef = useRef<() => Promise<void>>(async () => undefined);
  const toastCounterRef = useRef(0);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const infoWindowRef = useRef<{
    close: () => void;
    setContent: (content: string | Element) => void;
    open: (options: { anchor?: unknown; map?: unknown }) => void;
  } | null>(null);
  const mapRef = useRef<{
    fitBounds: (
      bounds: { extend: (position: { lat: number; lng: number }) => void },
      padding?: number | Record<string, number>,
    ) => void;
    setCenter: (position: { lat: number; lng: number }) => void;
    setZoom: (zoom: number) => void;
  } | null>(null);
  const markerRefs = useRef<
    Array<{ setMap?: (map: unknown | null) => void; map?: unknown; addListener?: (eventName: string, handler: () => void) => void }>
  >([]);

  savingContactRef.current = savingContact;
  savingProfileRef.current = savingProfile;

  function pushToast(kind: FloatingToastItem["kind"], message: string) {
    toastCounterRef.current += 1;
    const id = `toast-${toastCounterRef.current}`;
    setToasts((current) => [
      ...current,
      {
        id,
        kind,
        message,
        onClose: () => setToasts((items) => items.filter((item) => item.id !== id)),
      },
    ]);
  }

  function clearContactFieldHideTimers(fields?: ContactAutosaveField[]) {
    const targets = fields ?? (Object.keys(contactFieldHideTimeoutsRef.current) as ContactAutosaveField[]);
    for (const field of targets) {
      const timeoutId = contactFieldHideTimeoutsRef.current[field];
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        delete contactFieldHideTimeoutsRef.current[field];
      }
    }
  }

  function clearProfileFieldHideTimers(fields?: ProfileAutosaveField[]) {
    const targets = fields ?? (Object.keys(profileFieldHideTimeoutsRef.current) as ProfileAutosaveField[]);
    for (const field of targets) {
      const timeoutId = profileFieldHideTimeoutsRef.current[field];
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        delete profileFieldHideTimeoutsRef.current[field];
      }
    }
  }

  function markContactFields(fields: ContactAutosaveField[], status: FieldSaveState) {
    if (fields.length === 0) return;
    clearContactFieldHideTimers(fields);
    setContactFieldStatus((current) => {
      const next = { ...current };
      for (const field of fields) next[field] = status;
      return next;
    });

    if (status === "saved") {
      for (const field of fields) {
        contactFieldHideTimeoutsRef.current[field] = window.setTimeout(() => {
          setContactFieldStatus((current) => {
            const next = { ...current };
            delete next[field];
            return next;
          });
          delete contactFieldHideTimeoutsRef.current[field];
        }, 2400);
      }
    }
  }

  function markProfileFields(fields: ProfileAutosaveField[], status: FieldSaveState) {
    if (fields.length === 0) return;
    clearProfileFieldHideTimers(fields);
    setProfileFieldStatus((current) => {
      const next = { ...current };
      for (const field of fields) next[field] = status;
      return next;
    });

    if (status === "saved") {
      for (const field of fields) {
        profileFieldHideTimeoutsRef.current[field] = window.setTimeout(() => {
          setProfileFieldStatus((current) => {
            const next = { ...current };
            delete next[field];
            return next;
          });
          delete profileFieldHideTimeoutsRef.current[field];
        }, 2400);
      }
    }
  }

  async function postTimelineEvent(input: {
    tipo: LeadWorkspace["timeline"][number]["tipo"];
    titulo: string;
    detalhes?: Record<string, unknown> | null;
  }) {
    if (!leadId) return;

    const result = await apiFetchWithAuth<{ id: string }>("/api/timeline", {
      method: "POST",
      body: JSON.stringify({
        lead_id: leadId,
        tipo: input.tipo,
        titulo: input.titulo,
        detalhes: input.detalhes ?? null,
      }),
    });

    return result.ok ? result.data.id : null;
  }

  useEffect(() => {
    if (!leadId) return;

    let active = true;
    const isRefreshingSameLead =
      hasLoadedWorkspaceRef.current && loadedLeadIdRef.current === leadId;

    async function run() {
      if (isRefreshingSameLead) {
        setRefreshing(true);
      } else {
        setWorkspace(null);
        setLoading(true);
        setRefreshing(false);
        leadDataUpdateTimelineKeysRef.current = new Set();
      }
      setError(null);

      const result = await apiFetchWithAuth<LeadWorkspace>(`/api/leads/${leadId}`);
      if (!active) return;

      if (!result.ok) {
        if (!isRefreshingSameLead) {
          loadedLeadIdRef.current = null;
          hasLoadedWorkspaceRef.current = false;
        }
        setError(result.error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const nextWorkspace = result.data;
      leadDataUpdateTimelineKeysRef.current = collectLeadDataUpdateTimelineDayKeys(nextWorkspace.timeline);
      setWorkspace(nextWorkspace);
      setContactForm(buildContactFormFromLead(nextWorkspace.lead));
      setProfileForm(buildProfileFormFromWorkspace(nextWorkspace));
      setContactFieldStatus({});
      setProfileFieldStatus({});
      clearContactFieldHideTimers();
      clearProfileFieldHideTimers();
      setProfileTipologiaCategoria("");
      setProfileTipologiaSubcategoria("");
      setLocationSearch("");
      setLocationPlaceOptions([]);
      setSelectedLocationPlace(null);
      setVisitForm((current) => ({
        imovel_id: current.imovel_id || nextWorkspace.imoveis_interesse[0]?.id || "",
        quando: current.quando,
        descricao: current.descricao,
      }));
      hasLoadedWorkspaceRef.current = true;
      loadedLeadIdRef.current = leadId;
      setLoading(false);
      setRefreshing(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, [leadId, reloadToken]);

  const profileTipologiaCategoriaOptions = useMemo(
    () => getBriefingCategoriaOptions(profileForm.tipouso),
    [profileForm.tipouso],
  );

  const profileTipologiaSubcategoriaOptions = useMemo(
    () => getBriefingSubcategoriaOptions(profileForm.tipouso, profileTipologiaCategoria),
    [profileForm.tipouso, profileTipologiaCategoria],
  );

  const profileTipologiaItems = useMemo(() => buildLeadTipologiaItems(profileForm), [profileForm]);
  const profileShouldShowIntent = useMemo(
    () => profileForm.objetivolead.some((item) => item === "COMPRAR" || item === "ALUGAR"),
    [profileForm.objetivolead],
  );
  const profileCanPickIntent = profileShouldShowIntent && Boolean(profileForm.tipouso);

  const associatedImovelIds = useMemo(
    () => new Set(workspace?.imoveis_interesse.map((item) => item.id) ?? []),
    [workspace],
  );

  const filteredProfessionSuggestions = useMemo(() => {
    const query = normalizeSearchText(contactForm.profissao);
    const items = query
      ? LEAD_PROFESSION_SUGGESTIONS.filter((item) => {
          const normalized = normalizeSearchText(item);
          return normalized.includes(query) && normalized !== query;
        })
      : [...LEAD_PROFESSION_SUGGESTIONS];

    return items.slice(0, 8);
  }, [contactForm.profissao]);

  const filteredOwnedImoveis = useMemo(() => {
    const baseItems = ownedImoveis.filter((item) => !associatedImovelIds.has(item.id));
    const query = normalizeText(deferredAssociateSearch);
    if (!query) return baseItems;

    return baseItems.filter((item) =>
      [item.titulo, item.codigo, item.bairro, item.cidade, item.estado]
        .filter(Boolean)
        .some((value) => normalizeText(String(value)).includes(query)),
    );
  }, [associatedImovelIds, deferredAssociateSearch, ownedImoveis]);

  const opportunitySelectedImovel = useMemo(
    () => workspace?.imoveis_interesse.find((item) => item.id === createOpportunityForm.imovel_id) ?? null,
    [createOpportunityForm.imovel_id, workspace],
  );

  const opportunitySplitPreview = useMemo(
    () => ({
      recursoproprios: parseOptionalCurrencyInput(createOpportunityAmountInputs.recursoproprios_percentual) ?? 0,
      financiamento: parseOptionalCurrencyInput(createOpportunityAmountInputs.financiamento_percentual) ?? 0,
      fgts: parseOptionalCurrencyInput(createOpportunityAmountInputs.fgts_percentual) ?? 0,
      outrosrecursos: parseOptionalCurrencyInput(createOpportunityAmountInputs.outrosrecursos_percentual) ?? 0,
    }),
    [createOpportunityAmountInputs],
  );

  const opportunityTotalValue = useMemo(
    () => parseOptionalCurrencyInput(createOpportunityForm.valor),
    [createOpportunityForm.valor],
  );

  const opportunityCommissionValue = useMemo(
    () => parseOptionalCurrencyInput(createOpportunityCommissionAmountInput),
    [createOpportunityCommissionAmountInput],
  );

  const opportunityCommissionPercent = useMemo(
    () => parseOpportunityPercentInput(createOpportunityForm.comissao_percentual),
    [createOpportunityForm.comissao_percentual],
  );

  const opportunityPercentSummary = useMemo(() => {
    const amountTotal =
      opportunitySplitPreview.recursoproprios +
      opportunitySplitPreview.financiamento +
      opportunitySplitPreview.fgts +
      opportunitySplitPreview.outrosrecursos;
    const total = opportunityTotalValue && opportunityTotalValue > 0
      ? Math.round((amountTotal / opportunityTotalValue) * 100 * 100) / 100
      : 0;
    const remainingAmount = opportunityTotalValue == null ? null : opportunityTotalValue - amountTotal;
    const remaining = opportunityTotalValue && opportunityTotalValue > 0 && remainingAmount != null
      ? Math.round((remainingAmount / opportunityTotalValue) * 100 * 100) / 100
      : 100;

    return {
      recursoproprios: parseOpportunityPercentInput(createOpportunityForm.recursoproprios_percentual),
      financiamento: parseOpportunityPercentInput(createOpportunityForm.financiamento_percentual),
      fgts: parseOpportunityPercentInput(createOpportunityForm.fgts_percentual),
      outrosrecursos: parseOpportunityPercentInput(createOpportunityForm.outrosrecursos_percentual),
      total,
      remaining,
      amountTotal,
      remainingAmount,
      isComplete: opportunityTotalValue != null && remainingAmount === 0,
    };
  }, [createOpportunityForm, opportunityTotalValue, opportunitySplitPreview]);

  const opportunitySelectableImoveis = useMemo(
    () =>
      workspace?.imoveis_interesse.filter(
        (item) => item.finalidade === "COMPRAR" || typeof item.preco_venda === "number",
      ).sort((left, right) => {
        const leftTime = left.associado_em ? new Date(left.associado_em).getTime() : 0;
        const rightTime = right.associado_em ? new Date(right.associado_em).getTime() : 0;
        return rightTime - leftTime;
      }) ?? [],
    [workspace],
  );

  const shouldCarouselOpportunityImoveis = opportunitySelectableImoveis.length > 1;
  const createOpportunityBackStep = getOpportunityPreviousStep(createOpportunityStep);

  const visibleNegocios = useMemo(() => {
    if (!workspace) return [] as Array<
      LeadWorkspaceNegocioItem & {
        faseResolved: FaseNegocio;
        modalidadeResolved: ModalidadeNegocio;
        imovel: LeadWorkspace["imoveis_interesse"][number] | null;
        propostasCount: number;
        headlineValue: number | null;
      }
    >;

    const proposalCountByNegocioId = new Map<string, number>();
    for (const proposta of workspace.propostas) {
      if (!proposta.negocio_id) continue;
      proposalCountByNegocioId.set(proposta.negocio_id, (proposalCountByNegocioId.get(proposta.negocio_id) ?? 0) + 1);
    }

    return workspace.negocios.map((item) => ({
      ...item,
      faseResolved: resolveLeadNegocioFase(item),
      modalidadeResolved: resolveLeadNegocioModalidade(item),
      imovel: workspace.imoveis_interesse.find((imovel) => imovel.id === item.imovel_id) ?? null,
      propostasCount: proposalCountByNegocioId.get(item.id) ?? 0,
      headlineValue: item.valor ?? item.valor_estimado ?? null,
    }));
  }, [workspace]);

  const profileLocationItems = useMemo(() => {
    if (!workspace) return [] as Array<{
      id: string;
      label: string;
      tone: "lead" | "imovel";
      removable: boolean;
      sourceId: string;
    }>;

    const items: Array<{
      id: string;
      label: string;
      tone: "lead" | "imovel";
      removable: boolean;
      sourceId: string;
    }> = [];
    const seen = new Set<string>();

    for (const item of workspace.localizacoes_interesse) {
      const label = getInterestLocationLabel(item);
      const key =
        typeof item.lat === "number" && typeof item.lng === "number"
          ? `${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`
          : normalizeSearchText(label);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: `lead-${item.id}`,
        label,
        tone: "lead",
        removable: true,
        sourceId: item.id,
      });
    }

    for (const item of workspace.imoveis_interesse) {
      const label = getImovelLocationLabel(item);
      const key =
        typeof item.lat === "number" && typeof item.lng === "number"
          ? `${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`
          : normalizeSearchText(label);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: `imovel-${item.id}`,
        label,
        tone: "imovel",
        removable: false,
        sourceId: item.id,
      });
    }

    return items;
  }, [workspace]);

  const locationItems = useMemo<InterestLocationItem[]>(() => {
    if (!workspace) return [];

    const items: InterestLocationItem[] = [];
    const seen = new Set<string>();

    for (const item of workspace.localizacoes_interesse) {
      const label = getInterestLocationLabel(item);
      const meta = getInterestLocationMeta(item);
      const key =
        typeof item.lat === "number" && typeof item.lng === "number"
          ? `${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`
          : normalizeSearchText(label);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: `loc-${item.id}`,
        label,
        meta,
        mapAddress: label,
        lat: item.lat,
        lng: item.lng,
        tone: "lead",
        imovelId: null,
        imovelCodigo: null,
      });
    }

    for (const item of workspace.imoveis_interesse) {
      const label = getImovelLocationLabel(item);
      const meta = getImovelHeadlineValue(item);
      const key =
        typeof item.lat === "number" && typeof item.lng === "number"
          ? `${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`
          : normalizeSearchText(label);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: `imovel-${item.id}`,
        label,
        meta,
        mapAddress: getImovelMapAddress(item),
        lat: item.lat,
        lng: item.lng,
        tone: "imovel",
        imovelId: item.id,
        imovelCodigo: item.codigo,
      });
    }

    return items;
  }, [workspace]);

  const mapPoints = useMemo<MapPoint[]>(() => {
    const pointsByKey = new Map<string, MapPoint>();

    for (const item of locationItems) {
      if (typeof item.lat !== "number" || typeof item.lng !== "number") continue;
      const key = `${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`;
      const existing = pointsByKey.get(key);

      if (!existing) {
        pointsByKey.set(key, {
          id: item.id,
          label: item.label,
          mapAddress: item.mapAddress,
          lat: item.lat,
          lng: item.lng,
          tone: item.tone,
          imoveis:
            item.imovelId
              ? [{ id: item.imovelId, codigo: item.imovelCodigo, address: item.mapAddress }]
              : [],
        });
        continue;
      }

      if (existing.tone !== item.tone) {
        existing.tone = "mixed";
      }

      if (existing.tone !== "lead" && item.tone === "lead") {
        existing.label = item.label;
        existing.mapAddress = item.mapAddress;
      }

      if (item.imovelId && !existing.imoveis.some((imovel) => imovel.id === item.imovelId)) {
        existing.imoveis.push({
          id: item.imovelId,
          codigo: item.imovelCodigo,
          address: item.mapAddress,
        });
      }
    }

    return Array.from(pointsByKey.values());
  }, [locationItems]);

  const activityStatusReferenceIso = new Date().toISOString();

  const sortedActivities = useMemo(() => {
    if (!workspace) return [];
    return [...workspace.atividades].sort(
      (left, right) => getActivityReferenceTimestamp(right) - getActivityReferenceTimestamp(left),
    );
  }, [workspace]);

  const activitySummary = useMemo(() => {
    let overdue = 0;
    let scheduled = 0;
    let completed = 0;

    for (const atividade of sortedActivities) {
      const visualStatus = getActivityVisualStatus(atividade, activityStatusReferenceIso);
      if (visualStatus.label === "Atrasada") overdue += 1;
      else if (visualStatus.label === "Concluída") completed += 1;
      else scheduled += 1;
    }

    return {
      overdue,
      scheduled,
      completed,
    };
  }, [activityStatusReferenceIso, sortedActivities]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "TODAS") return sortedActivities;
    return sortedActivities.filter(
      (atividade) => getActivityFilterKey(atividade, activityStatusReferenceIso) === activityFilter,
    );
  }, [activityFilter, activityStatusReferenceIso, sortedActivities]);

  const suggestedActivityCategory = useMemo<ActivityCategory>(
    () => getSuggestedActivityCategoryForLeadStatus(workspace?.lead.status),
    [workspace?.lead.status],
  );

  const createActivityModelOptions = useMemo(
    () => (createActivityForm.categoria ? listActivityModelsByCategory(createActivityForm.categoria) : []),
    [createActivityForm.categoria],
  );

  const selectedActivityCategoryMeta = useMemo(
    () => (createActivityForm.categoria ? getActivityCategoryMeta(createActivityForm.categoria) : null),
    [createActivityForm.categoria],
  );

  const selectedActivityModelMeta = useMemo(
    () => (createActivityForm.modelo ? getActivityModelMeta(createActivityForm.modelo) : null),
    [createActivityForm.modelo],
  );

  const createActivityQuickScheduleOptions = useMemo(
    () =>
      createActivityModalOpen && workspace
        ? buildActivityQuickScheduleOptions({
            activities: workspace.atividades,
            activityType: createActivityForm.tipo,
            activityModel: createActivityForm.modelo,
          })
        : [],
    [createActivityForm.modelo, createActivityForm.tipo, createActivityModalOpen, workspace],
  );

  const todayDateValue = toLocalDateInput(new Date());

  const createActivityManualTimeOptions = useMemo(
    () =>
      workspace && createActivityForm.tipo && createActivityManualSelection.data
        ? buildAvailableTimeOptionsForDate({
            dateValue: createActivityManualSelection.data,
            activities: workspace.atividades,
            activityType: createActivityForm.tipo,
            activityModel: createActivityForm.modelo,
          })
        : [],
    [createActivityForm.modelo, createActivityForm.tipo, createActivityManualSelection.data, workspace],
  );

  const createActivityCalendarDays = useMemo(
    () => buildCalendarGrid(createActivityCalendarMonth, new Date()),
    [createActivityCalendarMonth],
  );

  const rescheduleQuickScheduleOptions = useMemo(
    () =>
      workspace && rescheduleTarget
        ? buildAvailableTimeOptionsForDate({
            dateValue: todayDateValue,
            activities: workspace.atividades,
            currentActivityId: rescheduleTarget.id,
            activityType: rescheduleTarget.tipo,
            activityModel: rescheduleTarget.modelo,
            minLeadMinutes: 15,
            startHour: 8,
            endHour: 20,
            intervalMinutes: 30,
          }).map((option) => ({
            id: `${todayDateValue}-${option.value}`,
            label: "Hoje",
            hint: option.label,
            value: combineLocalDateAndTime(todayDateValue, option.value),
          }))
        : [],
    [rescheduleTarget, todayDateValue, workspace],
  );

  const rescheduleManualTimeOptions = useMemo(
    () =>
      workspace && rescheduleTarget && rescheduleManualSelection.data
        ? buildAvailableTimeOptionsForDate({
            dateValue: rescheduleManualSelection.data,
            activities: workspace.atividades,
            currentActivityId: rescheduleTarget.id,
            activityType: rescheduleTarget.tipo,
            activityModel: rescheduleTarget.modelo,
          })
        : [],
    [rescheduleManualSelection.data, rescheduleTarget, workspace],
  );

  const rescheduleCalendarDays = useMemo(
    () => buildCalendarGrid(rescheduleCalendarMonth, new Date()),
    [rescheduleCalendarMonth],
  );

  const visibleTimeline = useMemo(
    () => groupTimelineItemsForDisplay(workspace?.timeline ?? []),
    [workspace?.timeline],
  );

  const createActivityTitleSuggestions = useMemo(() => {
    if (!createActivityForm.modelo || !workspace) return [];
    const whenIso = createActivityForm.quando ? new Date(createActivityForm.quando).toISOString() : null;
    const primaryImovelTitle = workspace.imoveis_interesse[0] ? getImovelDisplayTitle(workspace.imoveis_interesse[0]) : null;
    return buildActivityTitleSuggestions({
      model: createActivityForm.modelo,
      leadName: workspace.lead.nome,
      whenIso,
      imovelTitle: primaryImovelTitle,
    });
  }, [createActivityForm.modelo, createActivityForm.quando, workspace]);

  function getSuggestedCreateActivityTitle(model: ActivityModel, whenValue: string) {
    if (!workspace) return "";
    const whenIso = whenValue ? new Date(whenValue).toISOString() : null;
    const primaryImovelTitle = workspace.imoveis_interesse[0] ? getImovelDisplayTitle(workspace.imoveis_interesse[0]) : null;
    return (
      buildActivityTitleSuggestions({
        model,
        leadName: workspace.lead.nome,
        whenIso,
        imovelTitle: primaryImovelTitle,
      })[0] ?? ""
    );
  }

  const effectiveMapsError =
    mapPoints.length === 0
      ? null
      : !GOOGLE_MAPS_PUBLIC_KEY
        ? "Configure NEXT_PUBLIC_GOOGLE_MAPS_KEY para habilitar o mapa interativo."
        : mapsError;

  function isAutosaveFieldElement(
    target: EventTarget | null,
  ): target is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    );
  }

  function scheduleContactAutosave(delay = 140) {
    if (contactAutosaveTimeoutRef.current) {
      window.clearTimeout(contactAutosaveTimeoutRef.current);
    }

    contactAutosaveTimeoutRef.current = window.setTimeout(() => {
      contactAutosaveTimeoutRef.current = null;

      if (savingContactRef.current) {
        scheduleContactAutosave(180);
        return;
      }

      void saveContactFormRef.current();
    }, delay);
  }

  function scheduleProfileAutosave(delay = 140) {
    if (profileAutosaveTimeoutRef.current) {
      window.clearTimeout(profileAutosaveTimeoutRef.current);
    }

    profileAutosaveTimeoutRef.current = window.setTimeout(() => {
      profileAutosaveTimeoutRef.current = null;

      if (savingProfileRef.current) {
        scheduleProfileAutosave(180);
        return;
      }

      void saveProfileFormRef.current();
    }, delay);
  }

  function handleContactFormBlurCapture(event: ReactFocusEvent<HTMLFormElement>) {
    const target = event.target;
    if (!isAutosaveFieldElement(target)) return;
    if (target.dataset.autosaveSkip === "true") return;
    scheduleContactAutosave();
  }

  function handleProfileFormBlurCapture(event: ReactFocusEvent<HTMLFormElement>) {
    const target = event.target;
    if (!isAutosaveFieldElement(target)) return;
    if (target.dataset.autosaveSkip === "true") return;
    scheduleProfileAutosave();
  }

  async function handleLookupCep() {
    const digits = contactForm.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    try {
      setLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (!response.ok || data.erro) {
        pushToast("error", "CEP não encontrado.");
        return;
      }

      setContactForm((current) => ({
        ...current,
        cep: formatPostalCodeDisplay(digits),
        endereco: data.logradouro?.trim() || current.endereco,
        bairro: data.bairro?.trim() || current.bairro,
        cidade: data.localidade?.trim() || current.cidade,
        uf: data.uf?.trim() || current.uf,
        pais: current.pais.trim() || "Brasil",
      }));
    } catch {
      pushToast("error", "Não foi possível consultar o CEP agora.");
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleContactCepBlur() {
    await handleLookupCep();
    scheduleContactAutosave();
  }

  async function handleSelectLocationPlace(option: PlacePrediction) {
    setLocationSearch(option.description);
    setLocationPlaceOptions([]);

    const result = await apiFetchWithAuth<PlaceDetails>(
      `/api/google/places/details?placeId=${encodeURIComponent(option.place_id)}`,
    );

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    setSelectedLocationPlace(result.data);
  }

  async function handleAddLeadLocation() {
    if (!leadId || !selectedLocationPlace) return;

    setAddingLocation(true);

    const resolvedAddress =
      selectedLocationPlace.formatted_address ||
      [selectedLocationPlace.bairro, selectedLocationPlace.cidade, selectedLocationPlace.estado]
        .filter(Boolean)
        .join(" - ");

    const geolocResult = await apiFetchWithAuth<{ id: string }>("/api/geolocacoes/resolve", {
      method: "POST",
      body: JSON.stringify({
        place_id: selectedLocationPlace.place_id || null,
        address_json: {
          place_id: selectedLocationPlace.place_id || null,
          place_name: selectedLocationPlace.name || null,
          formatted_address: selectedLocationPlace.formatted_address || resolvedAddress || null,
          address_components: selectedLocationPlace.address_components ?? [],
        },
        logradouro: selectedLocationPlace.logradouro || null,
        numero: selectedLocationPlace.numero || null,
        bairro: selectedLocationPlace.bairro || null,
        cidade: selectedLocationPlace.cidade || null,
        uf: selectedLocationPlace.estado || null,
        cep: selectedLocationPlace.cep || null,
        lat: selectedLocationPlace.lat,
        lng: selectedLocationPlace.lng,
        endereco_formatado: resolvedAddress || null,
      }),
    });

    if (!geolocResult.ok) {
      setAddingLocation(false);
      pushToast("error", geolocResult.error);
      return;
    }

    const locationResult = await apiFetchWithAuth<LeadWorkspace["localizacoes_interesse"][number]>(
      `/api/leads/${leadId}/localizacoes`,
      {
        method: "POST",
        body: JSON.stringify({
          geolocacao_id: geolocResult.data.id,
          localizacao_texto: resolvedAddress || null,
          lat: selectedLocationPlace.lat,
          lng: selectedLocationPlace.lng,
        }),
      },
    );

    setAddingLocation(false);

    if (!locationResult.ok) {
      pushToast("error", locationResult.error);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            localizacoes_interesse: [locationResult.data, ...current.localizacoes_interesse.filter((item) => item.id !== locationResult.data.id)],
          }
        : current,
    );
    setLocationSearch("");
    setSelectedLocationPlace(null);
    setLocationPlaceOptions([]);
    pushToast("success", "Localização adicionada ao perfil do lead.");
  }

  async function handleRemoveLeadLocation(locationId: string) {
    if (!leadId) return;

    setRemovingLocationId(locationId);
    const result = await apiFetchWithAuth<{ id: string }>(
      `/api/leads/${leadId}/localizacoes/${locationId}`,
      {
        method: "DELETE",
      },
    );
    setRemovingLocationId(null);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            localizacoes_interesse: current.localizacoes_interesse.filter((item) => item.id !== locationId),
          }
        : current,
    );
    pushToast("success", "Localização removida do lead.");
  }

  useEffect(() => {
    if (!locationSearchFocused) return;

    const query = locationSearch.trim();
    if (query.length < 3) {
      setLocationPlaceOptions([]);
      return;
    }

    if (locationSearchTimeoutRef.current) {
      window.clearTimeout(locationSearchTimeoutRef.current);
    }

    locationSearchTimeoutRef.current = window.setTimeout(async () => {
      setSearchingLocationPlaces(true);
      const result = await apiFetchWithAuth<PlacePrediction[]>(
        `/api/google/places/autocomplete?input=${encodeURIComponent(query)}`,
      );
      setSearchingLocationPlaces(false);

      if (!result.ok) {
        pushToast("error", result.error);
        return;
      }

      setLocationPlaceOptions(result.data);
    }, 300);

    return () => {
      if (locationSearchTimeoutRef.current) {
        window.clearTimeout(locationSearchTimeoutRef.current);
        locationSearchTimeoutRef.current = null;
      }
    };
  }, [locationSearch, locationSearchFocused]);

  useEffect(() => {
    if (mapPoints.length === 0 || !GOOGLE_MAPS_PUBLIC_KEY) {
      return;
    }

    let active = true;

    void loadGoogleMapsScript(GOOGLE_MAPS_PUBLIC_KEY)
      .then(() => {
        if (!active) return;
        setMapsError(null);
        setMapsReady(true);
      })
      .catch((err) => {
        if (!active) return;
        setMapsReady(false);
        setMapsError(err instanceof Error ? err.message : "Falha ao carregar Google Maps");
      });

    return () => {
      active = false;
    };
  }, [leadId, mapPoints]);

  useEffect(() => {
    if (!mapsReady) return;
    if (effectiveMapsError) return;
    if (mapPoints.length === 0) return;
    if (!window.google?.maps) return;
    if (!mapContainerRef.current) return;

    for (const marker of markerRefs.current) {
      if (typeof marker.setMap === "function") {
        marker.setMap(null);
      } else if ("map" in marker) {
        marker.map = null;
      }
    }
    markerRefs.current = [];

    const currentContainer = mapContainerRef.current;
    const initialCenter = { lat: mapPoints[0].lat, lng: mapPoints[0].lng };
    const mustRecreateMap = !mapRef.current || mapHostElementRef.current !== currentContainer;

    if (mustRecreateMap) {
      mapRef.current = new window.google.maps.Map(currentContainer, {
        center: initialCenter,
        zoom: 12,
        mapTypeId: "roadmap",
        ...(GOOGLE_MAPS_MAP_ID ? { mapId: GOOGLE_MAPS_MAP_ID } : {}),
        gestureHandling: "greedy",
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapHostElementRef.current = currentContainer;
    }

    const map = mapRef.current;
    if (!map) return;
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow({ maxWidth: 220 });
    }
    infoWindowRef.current.close();

    const bounds = new window.google.maps.LatLngBounds();
    const markerApi = window.google.maps.marker?.AdvancedMarkerElement;
    const canUseAdvancedMarker = Boolean(markerApi && GOOGLE_MAPS_MAP_ID);

    for (const point of mapPoints) {
      const position = { lat: point.lat, lng: point.lng };
      bounds.extend(position);

      if (canUseAdvancedMarker && markerApi) {
        const marker = new markerApi({
          map,
          position,
          title: point.label,
        });
        marker.addListener?.("click", () => {
          infoWindowRef.current?.setContent(renderMapInfoCardHtml(point));
          infoWindowRef.current?.open({ anchor: marker, map });
        });
        markerRefs.current.push(marker as { map?: unknown });
      } else {
        const marker = new window.google.maps.Marker({
          map,
          position,
          title: point.label,
        });
        marker.addListener?.("click", () => {
          infoWindowRef.current?.setContent(renderMapInfoCardHtml(point));
          infoWindowRef.current?.open({ anchor: marker, map });
        });
        markerRefs.current.push(marker as { setMap?: (map: unknown | null) => void });
      }
    }

    if (mapPoints.length === 1) {
      map.setCenter(initialCenter);
      map.setZoom(14);
      return;
    }

    map.fitBounds(bounds, 56);
  }, [effectiveMapsError, mapPoints, mapsReady]);

  async function ensureOwnedImoveisLoaded() {
    if (ownedImoveisLoaded || loadingOwnedImoveis) return;

    setLoadingOwnedImoveis(true);
    const result = await apiFetchWithAuth<OwnedImovelOption[]>("/api/imoveis");
    setLoadingOwnedImoveis(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    setOwnedImoveis(result.data);
    setOwnedImoveisLoaded(true);
  }

  async function saveContactForm() {
    if (!leadId || !workspace) return;

    const changedFields = getChangedContactFields(contactForm, workspace.lead);
    if (changedFields.length === 0) return;

    const invalidFields = changedFields.filter((field) => field === "nome" && !contactForm.nome.trim());
    const emailAfterSave = contactForm.email.trim();
    const phoneAfterSave = contactForm.telefone.trim();
    const emailWasRemoved = normalizeText(workspace.lead.email).length > 0 && emailAfterSave.length === 0;
    const phoneWasRemoved = (workspace.lead.telefone ?? "").trim().length > 0 && phoneAfterSave.length === 0;

    if (emailAfterSave.length === 0 && phoneAfterSave.length === 0) {
      const persistedContactForm = buildContactFormFromLead(workspace.lead);
      const identityFieldsToRestore = changedFields.filter((field) => field === "email" || field === "telefone");

      setContactForm((current) => {
        const next = { ...current };
        for (const field of identityFieldsToRestore) {
          next[field] = persistedContactForm[field];
        }
        return next;
      });
      setContactFieldStatus((current) => {
        const next = { ...current };
        for (const field of identityFieldsToRestore) delete next[field];
        return next;
      });
      pushToast("warning", "O lead precisa manter pelo menos um contato principal: e-mail ou celular.");
      return;
    }

    if (invalidFields.length > 0) {
      const persistedContactForm = buildContactFormFromLead(workspace.lead);
      setContactForm((current) => ({ ...current, nome: persistedContactForm.nome }));
      setContactFieldStatus((current) => {
        const next = { ...current };
        for (const field of invalidFields) delete next[field];
        return next;
      });
      pushToast("warning", "Nome do lead não pode ficar vazio. Restauramos o valor salvo.");
      return;
    }

    const snapshot = contactForm;
    setSavingContact(true);
    setError(null);
    markContactFields(changedFields, "saving");

    const payload = {
      nome: contactForm.nome.trim(),
      profissao: contactForm.profissao.trim() || null,
      email: contactForm.email.trim() || null,
      telefone: contactForm.telefone.trim() || null,
      telefone_e164: normalizePhoneToBrE164(contactForm.telefone),
      origem: contactForm.origem,
      cep: contactForm.cep.trim() || null,
      endereco: contactForm.endereco.trim() || null,
      numero: contactForm.numero.trim() || null,
      complemento: contactForm.complemento.trim() || null,
      bairro: contactForm.bairro.trim() || null,
      cidade: contactForm.cidade.trim() || null,
      uf: isUfCode(contactForm.uf) ? contactForm.uf : null,
      pais: contactForm.pais.trim() || null,
    };

    const result = await apiFetchWithAuth<{ id: string }>(`/api/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    setSavingContact(false);

    if (!result.ok) {
      setContactFieldStatus((current) => {
        const next = { ...current };
        for (const field of changedFields) delete next[field];
        return next;
      });
      pushToast("error", result.error);
      return;
    }

    const nextLead = {
      ...workspace.lead,
      nome: payload.nome,
      profissao: payload.profissao,
      email: payload.email,
      telefone: payload.telefone,
      telefone_e164: payload.telefone_e164,
      origem: payload.origem,
      cep: payload.cep,
      endereco: payload.endereco,
      numero: payload.numero,
      complemento: payload.complemento,
      bairro: payload.bairro,
      cidade: payload.cidade,
      uf: payload.uf,
      pais: payload.pais,
      updated_at: new Date().toISOString(),
    };
    const timelineCreatedAt = new Date().toISOString();
    const timelineDayKey = getLeadDataUpdateTimelineDayKey(timelineCreatedAt);
    const shouldPostDailyLeadUpdate =
      timelineDayKey !== null && !leadDataUpdateTimelineKeysRef.current.has(timelineDayKey);
    let createdTimelineId: string | null | undefined = null;
    let shouldHydrateLeadUpdateTimeline = !shouldPostDailyLeadUpdate;

    if (shouldPostDailyLeadUpdate) {
      createdTimelineId = await postTimelineEvent({
        tipo: "SISTEMA",
        titulo: LEAD_DATA_UPDATED_TIMELINE_TITLE,
        detalhes: { campos: changedFields },
      });

      if (createdTimelineId && timelineDayKey) {
        leadDataUpdateTimelineKeysRef.current.add(timelineDayKey);
        shouldHydrateLeadUpdateTimeline = true;
      }
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            lead: nextLead,
            timeline: shouldHydrateLeadUpdateTimeline
              ? upsertLeadDataUpdateTimelineItem(current.timeline, {
                  createdAt: timelineCreatedAt,
                  changedFields,
                  id: createdTimelineId,
                })
              : current.timeline,
          }
        : current,
    );
    setContactForm((current) => (current === snapshot ? buildContactFormFromLead(nextLead) : current));
    markContactFields(changedFields, "saved");

    if (emailWasRemoved) {
      pushToast("warning", "E-mail removido. O celular passa a ser o contato principal deste lead.");
    } else if (phoneWasRemoved) {
      pushToast("warning", "Celular removido. O e-mail passa a ser o contato principal deste lead.");
    }
  }

  async function handleSaveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveContactForm();
  }

  function handleSelectLeadTipoUso(nextTipoUso: LeadTipoUso) {
    setProfileForm((current) => {
      if (current.tipouso === nextTipoUso) return current;
      return {
        ...current,
        tipouso: nextTipoUso,
        categoriaimovel: [],
        subcategoriaimovel: [],
        tipoimovel: [],
      };
    });
    setProfileTipologiaCategoria("");
    setProfileTipologiaSubcategoria("");
    scheduleProfileAutosave();
  }

  function handleToggleLeadObjective(nextObjective: (typeof OBJETIVO_LEAD_OPTIONS)[number]) {
    setProfileForm((current) => {
      const objetivos = toggleStringArrayValue(current.objetivolead, nextObjective);
      const hasDemandObjective = objetivos.some((item) => item === "COMPRAR" || item === "ALUGAR");
      return {
        ...current,
        objetivolead: objetivos,
        intencao_compra: hasDemandObjective ? current.intencao_compra : "",
      };
    });
    scheduleProfileAutosave();
  }

  function handleAddProfileTipologia() {
    const resolved = resolveBriefingTipologiaSelection({
      uso: profileForm.tipouso,
      categoria: profileTipologiaCategoria,
      subcategoria: profileTipologiaSubcategoria,
    });
    if (!resolved) return;

    const categoriaToken = resolved.categoriaToken as LeadCategoriaImovel;
    const subcategoriaToken = resolved.subcategoriaToken as LeadSubcategoriaImovel;
    const tipoImovel = resolved.tipoImovel as LeadTipoImovel;

    setProfileForm((current) => {
      const duplicateIndex = current.categoriaimovel.findIndex(
        (item, index) =>
          item === categoriaToken && (current.subcategoriaimovel[index] ?? null) === subcategoriaToken,
      );
      if (duplicateIndex >= 0) return current;

      return {
        ...current,
        categoriaimovel: [...current.categoriaimovel, categoriaToken],
        subcategoriaimovel: [...current.subcategoriaimovel, subcategoriaToken],
        tipoimovel: [...current.tipoimovel, tipoImovel],
      };
    });
    setProfileTipologiaSubcategoria("");
    scheduleProfileAutosave();
  }

  function handleRemoveProfileTipologia(indexToRemove: number) {
    setProfileForm((current) => ({
      ...current,
      categoriaimovel: current.categoriaimovel.filter((_, index) => index !== indexToRemove),
      subcategoriaimovel: current.subcategoriaimovel.filter((_, index) => index !== indexToRemove),
      tipoimovel: current.tipoimovel.filter((_, index) => index !== indexToRemove),
    }));
    scheduleProfileAutosave();
  }

  async function saveProfileForm() {
    if (!leadId || !workspace) return;

    const changedFields = getChangedProfileFields(profileForm, workspace);
    if (changedFields.length === 0) return;

    const snapshot = profileForm;
    setSavingProfile(true);
    setError(null);
    markProfileFields(changedFields, "saving");

    const briefingPayload = buildProfileBriefingPayload(profileForm);
    const briefing = workspace.briefing;
    const shouldSaveBriefing = changedFields.some((field) => field !== "mensagem");
    const shouldSaveLeadMessage = changedFields.includes("mensagem");

    const [briefingResult, leadMessageResult] = await Promise.all([
      shouldSaveBriefing
        ? apiFetchWithAuth<{ id: string }>(`/api/leads/${leadId}/briefing`, {
            method: "PATCH",
            body: JSON.stringify(briefingPayload),
          })
        : Promise.resolve({ ok: true, data: { id: leadId } } as const),
      shouldSaveLeadMessage
        ? apiFetchWithAuth<{ id: string }>(`/api/leads/${leadId}`, {
            method: "PATCH",
            body: JSON.stringify({
              mensagem: profileForm.mensagem.trim() || null,
            }),
          })
        : Promise.resolve({ ok: true, data: { id: leadId } } as const),
    ]);

    setSavingProfile(false);

    if (!briefingResult.ok) {
      setProfileFieldStatus((current) => {
        const next = { ...current };
        for (const field of changedFields) delete next[field];
        return next;
      });
      pushToast("error", briefingResult.error);
      return;
    }

    if (!leadMessageResult.ok) {
      setProfileFieldStatus((current) => {
        const next = { ...current };
        for (const field of changedFields) delete next[field];
        return next;
      });
      pushToast("error", leadMessageResult.error);
      return;
    }

    const nextBriefing = shouldSaveBriefing
      ? buildLocalBriefingState({
          currentBriefing: briefing,
          leadId,
          payload: briefingPayload,
        })
      : briefing;
    const nextLead = shouldSaveLeadMessage
      ? {
          ...workspace.lead,
          mensagem: profileForm.mensagem.trim() || null,
          updated_at: new Date().toISOString(),
        }
      : workspace.lead;

    setWorkspace((current) =>
      current
        ? {
            ...current,
            lead: nextLead,
            briefing: nextBriefing,
          }
        : current,
    );
    setProfileForm((current) =>
      current === snapshot
        ? buildProfileFormFromWorkspace({
            ...workspace,
            lead: nextLead,
            briefing: nextBriefing,
          })
        : current,
    );
    markProfileFields(changedFields, "saved");
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveProfileForm();
  }

  useEffect(() => {
    saveContactFormRef.current = saveContactForm;
  });

  useEffect(() => {
    saveProfileFormRef.current = saveProfileForm;
  });

  useEffect(() => {
    return () => {
      if (contactAutosaveTimeoutRef.current) window.clearTimeout(contactAutosaveTimeoutRef.current);
      if (profileAutosaveTimeoutRef.current) window.clearTimeout(profileAutosaveTimeoutRef.current);
      clearContactFieldHideTimers();
      clearProfileFieldHideTimers();
    };
  }, []);

  useEffect(() => {
    if (!statusMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!statusMenuRef.current) return;
      if (statusMenuRef.current.contains(event.target as Node)) return;
      setStatusMenuOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [statusMenuOpen]);

  async function handleAssociateImovel(item: OwnedImovelOption) {
    if (!leadId) return;

    setAssociatingImovelId(item.id);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/leads/${leadId}/imoveis`, {
      method: "POST",
      body: JSON.stringify({ imovel_id: item.id }),
    });
    setAssociatingImovelId(null);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    await postTimelineEvent({
      tipo: "SISTEMA",
      titulo: "Imóvel associado ao interesse do lead",
      detalhes: {
        imovel_id: item.id,
        titulo: item.titulo,
        codigo: item.codigo,
      },
    });

    pushToast("success", "Imóvel associado ao lead.");
    setAssociateModalOpen(false);
    setReloadToken((current) => current + 1);
  }

  async function updateLeadStatus(
    nextStatus: LeadStatus,
    options?: {
      aguardandoProduto?: boolean;
      motivoDesqualificacao?: MotivoDesqualificacaoOption | null;
      nota?: string | null;
      timelineTitle?: string;
      timelineDetails?: Record<string, unknown> | null;
      successMessage?: string;
      skipTimeline?: boolean;
    },
  ) {
    if (!leadId || !workspace) return false;

    const previousStatus = workspace.lead.status;
    const previousAguardandoProduto = workspace.lead.aguardando_produto;
    const nextAguardandoProduto =
      nextStatus === "OPORTUNIDADE" || nextStatus === "CLIENTE" || nextStatus === "DESQUALIFICADO"
        ? false
        : (options?.aguardandoProduto ?? workspace.lead.aguardando_produto);
    const nextMotivoDesqualificacao =
      nextStatus === "DESQUALIFICADO" ? options?.motivoDesqualificacao ?? null : null;

    if (
      previousStatus === nextStatus &&
      previousAguardandoProduto === nextAguardandoProduto &&
      workspace.lead.motivo_desqualificacao === nextMotivoDesqualificacao
    ) {
      return true;
    }

    setSavingLeadStatus(true);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: nextStatus,
        motivo_desqualificacao: nextMotivoDesqualificacao,
        aguardando_produto: nextAguardandoProduto,
      }),
    });
    setSavingLeadStatus(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return false;
    }

    const timelineTitle =
      options?.timelineTitle ??
      (previousStatus !== nextStatus
        ? nextStatus === "DESQUALIFICADO"
          ? "Lead desqualificado"
          : `Lead movido para ${STATUS_META[nextStatus].label.toLowerCase()}`
        : nextAguardandoProduto
          ? "Lead marcado como aguardando produto"
          : "Lead saiu de aguardando produto");

    if (!options?.skipTimeline) {
      await postTimelineEvent({
        tipo: "STATUS",
        titulo: timelineTitle,
        detalhes: {
          de: previousStatus,
          para: nextStatus,
          aguardando_produto: nextAguardandoProduto,
          motivo_desqualificacao: nextMotivoDesqualificacao,
          nota: options?.nota?.trim() || null,
          ...(options?.timelineDetails ?? {}),
        },
      });
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            lead: {
              ...current.lead,
              status: nextStatus,
              motivo_desqualificacao: nextMotivoDesqualificacao,
              aguardando_produto: nextAguardandoProduto,
              updated_at: new Date().toISOString(),
            },
          }
        : current,
    );

    if (options?.successMessage) {
      pushToast("success", options.successMessage);
    }

    return true;
  }

  async function handleSelectLeadStatus(nextStatus: LeadStatus) {
    setStatusMenuOpen(false);
    if (nextStatus === "DESQUALIFICADO") {
      setDesqualifyForm({
        motivo: (workspace?.lead.motivo_desqualificacao as MotivoDesqualificacaoOption | null) ?? "",
        nota: "",
      });
      setDesqualifyModalOpen(true);
      return;
    }

    const updated = await updateLeadStatus(nextStatus, {
      successMessage: `Lead marcado como ${STATUS_META[nextStatus].label.toLowerCase()}.`,
    });
    if (updated) setReloadToken((current) => current + 1);
  }

  async function handleToggleAguardandoProduto() {
    if (!workspace) return;
    setStatusMenuOpen(false);
    const nextValue = !workspace.lead.aguardando_produto;
    const updated = await updateLeadStatus(workspace.lead.status, {
      aguardandoProduto: nextValue,
      successMessage: nextValue ? "Lead marcado como aguardando produto." : "Lead retirado de aguardando produto.",
    });
    if (updated) setReloadToken((current) => current + 1);
  }

  async function handleConfirmDesqualification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!desqualifyForm.motivo) {
      pushToast("warning", "Selecione o motivo da desqualificação.");
      return;
    }

    const updated = await updateLeadStatus("DESQUALIFICADO", {
      motivoDesqualificacao: desqualifyForm.motivo,
      nota: desqualifyForm.nota,
      successMessage: "Lead desqualificado.",
    });
    if (!updated) return;

    setDesqualifyModalOpen(false);
    setDesqualifyForm({ motivo: "", nota: "" });
    setReloadToken((current) => current + 1);
  }

  function handleOpportunityValueInputChange(value: string) {
    const nextValue = formatCurrencyInput(value);
    const nextTotalValue = parseOptionalCurrencyInput(nextValue);
    const nextCommissionPercent =
      createOpportunityCommissionEditedField === "amount"
        ? formatOpportunityPercentValue(
            calculateOpportunityPercentFromValue(nextTotalValue, parseOptionalCurrencyInput(createOpportunityCommissionAmountInput)),
          )
        : createOpportunityForm.comissao_percentual;

    setCreateOpportunityForm((current) => ({
      ...current,
      valor: nextValue,
      comissao_percentual: nextCommissionPercent,
    }));

    if (createOpportunityCommissionEditedField !== "amount") {
      setCreateOpportunityCommissionAmountInput(
        buildOpportunityCommissionAmountInput(nextTotalValue, nextCommissionPercent),
      );
    }
  }

  function closeCreateOpportunityModal() {
    setCreateOpportunityModalOpen(false);
    setCreateOpportunityForm(INITIAL_CREATE_OPPORTUNITY_FORM);
    setCreateOpportunityCommissionAmountInput("");
    setCreateOpportunityCommissionEditedField("percent");
    setCreateOpportunityAmountInputs(buildOpportunityAmountInputs(null, INITIAL_CREATE_OPPORTUNITY_FORM));
    setCreateOpportunityStep("imovel");
  }

  function openCreateOpportunityModal() {
    if (!workspace) return;
    if (!leadSupportsVendaOpportunity(workspace)) {
      pushToast("warning", "A abertura de oportunidade está disponível por enquanto para negociações de venda.");
      return;
    }

    const nextForm = createInitialOpportunityForm(workspace);
    setCreateOpportunityForm(nextForm);
    setCreateOpportunityCommissionAmountInput(
      buildOpportunityCommissionAmountInput(parseOptionalCurrencyInput(nextForm.valor), nextForm.comissao_percentual),
    );
    setCreateOpportunityCommissionEditedField("percent");
    setCreateOpportunityAmountInputs(buildOpportunityAmountInputs(parseOptionalCurrencyInput(nextForm.valor), nextForm));
    setCreateOpportunityStep("imovel");
    setCreateOpportunityModalOpen(true);
  }

  function handleSelectOpportunityImovel(imovelId: string) {
    if (!workspace) return;
    const nextImovel = workspace.imoveis_interesse.find((item) => item.id === imovelId) ?? null;
    const nextValue =
      formatCurrencyFormValue((nextImovel ? getOpportunityImovelBaseValue(nextImovel) : null) ?? opportunityTotalValue);
    const nextCommissionPercent = formatOpportunityPercentValue(
      nextImovel ? getOpportunityImovelCommissionPercent(nextImovel) : null,
    );
    setCreateOpportunityForm((current) => ({
      ...current,
      imovel_id: imovelId,
      valor: nextValue,
      comissao_percentual: nextCommissionPercent,
    }));
    setCreateOpportunityCommissionAmountInput(
      buildOpportunityCommissionAmountInput(parseOptionalCurrencyInput(nextValue), nextCommissionPercent),
    );
    setCreateOpportunityCommissionEditedField("percent");
    setCreateOpportunityStep("valor");
  }

  function handleSelectOpportunityWithoutImovel() {
    setCreateOpportunityForm((current) => ({
      ...current,
      imovel_id: "",
      comissao_percentual: "",
    }));
    setCreateOpportunityCommissionAmountInput("");
    setCreateOpportunityCommissionEditedField("percent");
    setCreateOpportunityStep("valor");
  }

  function handleOpportunityCommissionPercentChange(value: string) {
    const nextPercent = formatOpportunityPercentInput(value);
    setCreateOpportunityCommissionEditedField("percent");
    setCreateOpportunityForm((current) => ({
      ...current,
      comissao_percentual: nextPercent,
    }));
    setCreateOpportunityCommissionAmountInput(buildOpportunityCommissionAmountInput(opportunityTotalValue, nextPercent));
  }

  function handleOpportunityCommissionAmountChange(value: string) {
    const nextAmount = formatCurrencyInput(value);
    setCreateOpportunityCommissionEditedField("amount");
    setCreateOpportunityCommissionAmountInput(nextAmount);
    setCreateOpportunityForm((current) => ({
      ...current,
      comissao_percentual: formatOpportunityPercentValue(
        calculateOpportunityPercentFromValue(opportunityTotalValue, parseOptionalCurrencyInput(nextAmount)),
      ),
    }));
  }

  function handleOpportunityPercentFieldChange(key: OpportunityPercentFieldKey, value: string) {
    const nextPercent = formatOpportunityPercentInput(value);
    setCreateOpportunityForm((current) => ({
      ...current,
      [key]: nextPercent,
    }));
    setCreateOpportunityAmountInputs((current) => ({
      ...current,
      [key]: formatCurrencyFormValue(
        calculateOpportunitySplitValue(opportunityTotalValue, parseOpportunityPercentInput(nextPercent)),
      ),
    }));
  }

  function handleOpportunityAmountFieldChange(key: OpportunityPercentFieldKey, value: string) {
    const nextAmount = formatCurrencyInput(value);
    setCreateOpportunityForm((current) => {
      const amountValue = parseOptionalCurrencyInput(nextAmount);
      return {
        ...current,
        [key]: formatOpportunityPercentValue(calculateOpportunityPercentFromValue(opportunityTotalValue, amountValue)),
      };
    });
    setCreateOpportunityAmountInputs((current) => ({
      ...current,
      [key]: nextAmount,
    }));
  }

  function handleContinueOpportunityValueStep() {
    if (opportunityTotalValue == null || opportunityTotalValue <= 0) {
      pushToast("warning", "Informe ou selecione o valor da oportunidade.");
      return;
    }
    setCreateOpportunityAmountInputs(buildOpportunityAmountInputs(opportunityTotalValue, createOpportunityForm));
    setCreateOpportunityStep("pagamento");
  }

  function handleContinueOpportunityPaymentStep() {
    if (!opportunityPercentSummary.isComplete) {
      pushToast("warning", "A composição financeira precisa somar exatamente 100%.");
      return;
    }
    setCreateOpportunityStep("resumo");
  }

  async function handleCreateOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId || !workspace) return;
    if (!leadSupportsVendaOpportunity(workspace)) {
      pushToast("warning", "Este lead ainda não está pronto para uma oportunidade de venda.");
      return;
    }
    if (opportunityTotalValue == null || opportunityTotalValue <= 0) {
      pushToast("warning", "Informe o valor total da oportunidade.");
      return;
    }
    if (!opportunityPercentSummary.isComplete) {
      pushToast("warning", "A composição financeira precisa somar exatamente 100%.");
      return;
    }

    setCreatingOpportunity(true);
    const selectedImovel = opportunitySelectedImovel;
    const hasCommissionPercent = createOpportunityForm.comissao_percentual.trim().length > 0;
    const payload = {
      lead_id: leadId,
      titulo: buildOpportunityTitle({
        leadName: workspace.lead.nome,
        imovelTitle: selectedImovel ? getImovelDisplayTitle(selectedImovel) : null,
        imovelCodigo: selectedImovel?.codigo,
      }),
      modalidade: "VENDA" as const,
      fase: "NEGOCIACAO" as const,
      imovel_id: selectedImovel?.id ?? null,
      valor: opportunityTotalValue,
      comissaopercentual: hasCommissionPercent ? opportunityCommissionPercent : null,
      comissaovalor: opportunityCommissionValue ?? null,
      recursopropriovalor: opportunitySplitPreview.recursoproprios ?? 0,
      financiamentovalor: opportunitySplitPreview.financiamento ?? 0,
      fgtsvalor: opportunitySplitPreview.fgts ?? 0,
      outrosrecursosvalor: opportunitySplitPreview.outrosrecursos ?? 0,
      observacoes: createOpportunityForm.observacoes.trim() || null,
    };

    const result = await apiFetchWithAuth<{ id: string }>("/api/negocios", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setCreatingOpportunity(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    const statusUpdated = await updateLeadStatus("OPORTUNIDADE", {
      aguardandoProduto: false,
      timelineTitle: "Oportunidade criada para este lead",
      timelineDetails: {
        negocio_id: result.data.id,
        imovel_id: selectedImovel?.id ?? null,
        valor: opportunityTotalValue,
        modalidade: "VENDA",
      },
      successMessage: "Oportunidade criada.",
    });
    if (!statusUpdated) {
      await postTimelineEvent({
        tipo: "STATUS",
        titulo: "Oportunidade criada para este lead",
        detalhes: {
          negocio_id: result.data.id,
          imovel_id: selectedImovel?.id ?? null,
          valor: opportunityTotalValue,
          modalidade: "VENDA",
        },
      });
      pushToast("warning", "A oportunidade foi criada, mas o status do lead não foi atualizado.");
    }

    router.push(`/negocios/${result.data.id}`);
  }

  async function handleScheduleVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId || !workspace) return;

    const whenIso = visitForm.quando ? new Date(visitForm.quando).toISOString() : "";
    if (!whenIso) {
      pushToast("error", "Defina a data e hora da visita.");
      return;
    }

    const selectedImovel =
      workspace.imoveis_interesse.find((item) => item.id === visitForm.imovel_id) ??
      workspace.imoveis_interesse[0] ??
      null;

    setSavingVisit(true);
    const result = await apiFetchWithAuth<{ id: string }>("/api/atividades", {
      method: "POST",
      body: JSON.stringify({
        lead_id: leadId,
        categoria: "EM_ATENDIMENTO",
        modelo: "EM_ATENDIMENTO_VISITA_PRESENCIAL",
        tipo: "VISITA",
        titulo: selectedImovel
          ? `Visita agendada • ${getImovelDisplayTitle(selectedImovel)}`
          : `Visita agendada • ${workspace.lead.nome}`,
        descricao: visitForm.descricao.trim() || null,
        quando_em: whenIso,
        status: "PENDENTE",
      }),
    });
    setSavingVisit(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    await postTimelineEvent({
      tipo: "ATIVIDADE",
      titulo: `Visita agendada para ${formatDate(whenIso, "datetime")}`,
      detalhes: {
        atividade_id: result.data.id,
        categoria: "EM_ATENDIMENTO",
        modelo: "EM_ATENDIMENTO_VISITA_PRESENCIAL",
        imovel_id: selectedImovel?.id ?? null,
      },
    });

    pushToast("success", "Visita agendada.");
    setVisitModalOpen(false);
    setVisitForm({
      imovel_id: selectedImovel?.id ?? "",
      quando: "",
      descricao: "",
    });
    setReloadToken((current) => current + 1);
  }

  function openCreateActivityModal() {
    setCreateActivityStep("categoria");
    setCreateActivityForm({
      categoria: null,
      modelo: null,
      tipo: null,
      titulo: "",
      quando: "",
      descricao: "",
    });
    setShowCreateActivityManualPicker(false);
    setCreateActivityManualSelection({
      data: "",
      hora: "",
    });
    setCreateActivityCalendarMonth(startOfDay(new Date()));
    setCreateActivityCustomDate(null);
    setCreateActivityModalOpen(true);
  }

  function openRescheduleModal(atividade: LeadWorkspaceAtividadeItem) {
    const suggestedWhen = workspace
      ? buildActivityQuickScheduleOptions({
          activities: workspace.atividades,
          currentActivityId: atividade.id,
          activityType: atividade.tipo,
          activityModel: atividade.modelo,
        })[0]?.value ?? toLocalDatetimeValue(atividade.quando_em)
      : toLocalDatetimeValue(atividade.quando_em);
    const split = splitLocalDatetime(suggestedWhen);
    const calendarBase = parseLocalDateInput(split.date) ?? startOfDay(new Date());

    setRescheduleTarget(atividade);
    setRescheduleForm({
      nota: "",
      data: split.date,
      hora: split.time,
    });
    setRescheduleManualSelection({
      data: split.date,
      hora: split.time,
    });
    setRescheduleCalendarMonth(new Date(calendarBase.getFullYear(), calendarBase.getMonth(), 1));
    setShowRescheduleManualPicker(false);
    setRescheduleCustomDate(null);
  }

  function openCompleteModal(atividade: LeadWorkspaceAtividadeItem) {
    setCompleteTarget(atividade);
    setCompleteActivityForm({
      nota: "",
      resultado: "POSITIVO",
    });
  }

  function openConfirmVisitModal(atividade: LeadWorkspaceAtividadeItem) {
    const split = splitLocalDatetime(toLocalDatetimeValue(atividade.quando_em));
    setConfirmVisitTarget(atividade);
    setConfirmVisitForm({
      modelo: "EM_ATENDIMENTO_VISITA_PRESENCIAL",
      data: split.date,
      hora: split.time,
      nota: "",
    });
  }

  async function handleCreateActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId) return;
    if (!createActivityForm.categoria || !createActivityForm.modelo || !createActivityForm.tipo) {
      pushToast("error", "Selecione a categoria e o modelo da atividade.");
      return;
    }
    if (!createActivityForm.titulo.trim()) {
      pushToast("error", "Escolha uma sugestão de título para continuar.");
      return;
    }

    const categoria = createActivityForm.categoria;
    const modelo = createActivityForm.modelo;
    const tipo = createActivityForm.tipo;

    const whenIso = createActivityForm.quando ? new Date(createActivityForm.quando).toISOString() : "";
    if (!whenIso) {
      pushToast("error", "Defina a data e hora da atividade.");
      return;
    }

    setSavingCreatedActivity(true);
    const result = await apiFetchWithAuth<{ id: string }>("/api/atividades", {
      method: "POST",
      body: JSON.stringify({
        lead_id: leadId,
        categoria,
        modelo,
        tipo,
        titulo: createActivityForm.titulo.trim(),
        descricao: createActivityForm.descricao.trim() || null,
        quando_em: whenIso,
        status: "PENDENTE",
      }),
    });
    setSavingCreatedActivity(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    setCreateActivityModalOpen(false);
    setCreateActivityStep("categoria");
    setCreateActivityForm({
      categoria: null,
      modelo: null,
      tipo: null,
      titulo: "",
      quando: "",
      descricao: "",
    });
    setShowCreateActivityManualPicker(false);
    setCreateActivityManualSelection({
      data: "",
      hora: "",
    });
    setCreateActivityCalendarMonth(startOfDay(new Date()));
    setCreateActivityCustomDate(null);
    pushToast("success", "Atividade criada.");
    setReloadToken((current) => current + 1);
  }

  async function handleRescheduleActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rescheduleTarget) return;

    const localDatetime = combineLocalDateAndTime(rescheduleForm.data, rescheduleForm.hora);
    const whenIso = localDatetime ? new Date(localDatetime).toISOString() : "";
    if (!whenIso) {
      pushToast("error", "Defina a nova data da atividade.");
      return;
    }

    const note = rescheduleForm.nota.trim();
    const mergedDescription = [rescheduleTarget.descricao?.trim(), note ? `Reagendamento: ${note}` : null]
      .filter(Boolean)
      .join("\n\n");

    setSavingReschedule(true);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/atividades/${rescheduleTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        descricao: mergedDescription || null,
        quando_em: whenIso,
        status: "PENDENTE",
        concluida_em: null,
      }),
    });
    setSavingReschedule(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    setRescheduleTarget(null);
    pushToast("success", "Atividade reagendada.");
    setReloadToken((current) => current + 1);
  }

  async function handleCompleteActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!completeTarget) return;

    const completionNote = completeActivityForm.nota.trim();
    const mergedDescription = [completeTarget.descricao?.trim(), completionNote ? `Conclusão: ${completionNote}` : null]
      .filter(Boolean)
      .join("\n\n");

    setSavingComplete(true);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/atividades/${completeTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        descricao: mergedDescription || null,
        status: "CONCLUIDA",
        concluida_em: new Date().toISOString(),
      }),
    });
    setSavingComplete(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    await postTimelineEvent({
      tipo: "ATIVIDADE",
      titulo: `Atividade concluída • ${completeActivityForm.resultado === "POSITIVO" ? "Positivo" : "Negativo"}`,
      detalhes: {
        atividade_id: completeTarget.id,
        titulo: completeTarget.titulo,
        categoria: completeTarget.categoria,
        modelo: completeTarget.modelo,
        nota: completionNote || null,
        resultado: completeActivityForm.resultado,
      },
    });

    setCompleteTarget(null);
    setCompleteActivityForm({
      nota: "",
      resultado: "POSITIVO",
    });
    pushToast("success", "Atividade finalizada.");
    setReloadToken((current) => current + 1);
  }

  async function handleConfirmVisitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmVisitTarget) return;

    const localDatetime = combineLocalDateAndTime(confirmVisitForm.data, confirmVisitForm.hora);
    const whenIso = localDatetime ? new Date(localDatetime).toISOString() : "";
    if (!whenIso) {
      pushToast("error", "Defina a data e hora da visita.");
      return;
    }

    setSavingConfirmVisit(true);
    const result = await apiFetchWithAuth<{ id: string; atividade_confirmacao_id: string }>(
      `/api/atividades/${confirmVisitTarget.id}/confirmar-visita`,
      {
        method: "POST",
        body: JSON.stringify({
          modelo: confirmVisitForm.modelo,
          quando_em: whenIso,
          descricao: confirmVisitForm.nota.trim() || null,
        }),
      },
    );
    setSavingConfirmVisit(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    await postTimelineEvent({
      tipo: "ATIVIDADE",
      titulo: `Visita confirmada para ${formatDate(whenIso, "datetime")}`,
      detalhes: {
        atividade_id: result.data.id,
        atividade_confirmacao_id: result.data.atividade_confirmacao_id,
        modelo: confirmVisitForm.modelo,
        origem: "confirmacao_visita_portal",
      },
    });

    setConfirmVisitTarget(null);
    setConfirmVisitForm({
      modelo: "EM_ATENDIMENTO_VISITA_PRESENCIAL",
      data: "",
      hora: "",
      nota: "",
    });
    pushToast("success", "Visita confirmada e agendada.");
    setReloadToken((current) => current + 1);
  }

  if (loading && !workspace) {
    return (
      <AppShell
        title="Lead"
        subtitle="Carregando detalhes do lead"
        rightSlot={
          <Link
            href="/negocios"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Voltar para leads
            <ArrowRight size={14} />
          </Link>
        }
      >
        <div className="rounded-[30px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Carregando workspace do lead...
        </div>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell
        title="Lead"
        subtitle="Não foi possível carregar o lead"
        rightSlot={
          <Link
            href="/negocios"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Voltar para leads
            <ArrowRight size={14} />
          </Link>
        }
      >
        <div className="rounded-[30px] border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700">
          {error ?? "Lead não encontrado."}
        </div>
      </AppShell>
    );
  }

  const telHref = buildTelHref(workspace.lead.telefone_e164 ?? workspace.lead.telefone);
  const whatsappHref = buildWhatsappUrl(workspace.lead.telefone_e164 ?? workspace.lead.telefone);
  const mailtoHref = workspace.lead.email ? `mailto:${workspace.lead.email}` : null;
  const updatedAtLabel = formatRelativeToNow(workspace.lead.updated_at);

  return (
    <AppShell
      title="Workspace do Lead"
      subtitle="Contato, interesse, agenda e histórico comercial em um único lugar."
      mainClassName="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm"
      rightSlot={
        <Link
          href="/negocios"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Voltar para leads
          <ArrowRight size={14} />
        </Link>
      }
    >
      <FloatingToastViewport items={toasts} />

      <div>
        <section className="overflow-hidden">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(177,4,47,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(24,62,110,0.13),transparent_36%),linear-gradient(180deg,rgba(253,244,247,0.96)_0%,rgba(248,250,252,0.95)_52%,#ffffff_80%)] px-7 pb-7 pt-8 md:px-8 md:pb-8 md:pt-9">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0">
              <div className="grid gap-4 md:grid-cols-[84px_minmax(0,1fr)] md:items-start">
                <div>
                  <LeadAvatar name={workspace.lead.nome} email={workspace.lead.email} size="lg" />
                </div>

                <div className="min-w-0">
                  <div className="min-w-0">
                    <h1 className="truncate text-[1.8rem] leading-[1.3] font-semibold tracking-[-0.05em] text-slate-900">
                      {workspace.lead.nome}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarBlank size={14} className="text-slate-400" />
                        <span>Cadastro em {formatDate(workspace.lead.created_at)}</span>
                      </span>
                      {updatedAtLabel ? (
                        <span className="inline-flex items-center gap-1.5">
                          <ClockCounterClockwise size={14} className="text-slate-400" />
                          <span>{updatedAtLabel}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:col-span-2">
                  {telHref ? (
                    <a href={telHref} className={buildHeaderActionClass("slate")}>
                      <PhoneCall size={16} />
                      Ligar
                    </a>
                  ) : (
                    <span className={buildHeaderActionClass("disabled")}>
                      <PhoneCall size={16} />
                      Sem telefone
                    </span>
                  )}

                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className={buildHeaderActionClass("success")}
                    >
                      <PhoneCall size={16} />
                      WhatsApp
                    </a>
                  ) : (
                    <span className={buildHeaderActionClass("disabled")}>
                      <PhoneCall size={16} />
                      Sem WhatsApp
                    </span>
                  )}

                  {mailtoHref ? (
                    <a href={mailtoHref} className={buildHeaderActionClass()}>
                      <EnvelopeSimple size={16} />
                      E-mail
                    </a>
                  ) : (
                    <span className={buildHeaderActionClass("disabled")}>
                      <EnvelopeSimple size={16} />
                      Sem e-mail
                    </span>
                  )}
                </div>

                <div className="divide-y divide-white/70 md:col-span-2">
                  <QuickMetric
                    label="Imóveis de interesse"
                    value={String(workspace.imoveis_interesse.length)}
                    hint={locationItems.length > 0 ? `${locationItems.length} localização(ões)` : "Sem localização salva"}
                    icon={<HouseLine size={18} weight="duotone" />}
                    accentClassName="border-[var(--blue-slate)]/15 bg-white/70 text-[var(--blue-slate)]"
                  />
                  <QuickMetric
                    label="Atividades"
                    value={String(workspace.summary.atividades_pendentes)}
                    hint={`${workspace.summary.atividades_total} registradas`}
                    icon={<CalendarBlank size={18} weight="duotone" />}
                    accentClassName="border-slate-200 bg-white/70 text-slate-600"
                  />
                  <QuickMetric
                    label="Oportunidades"
                    value={String(workspace.summary.oportunidades_total)}
                    hint={`${workspace.summary.negocios_total} negócio(s) no total`}
                    icon={<Briefcase size={18} weight="duotone" />}
                    accentClassName="border-[var(--primary-scarlet)]/15 bg-[var(--primary-scarlet)]/5 text-[var(--primary-scarlet)]"
                  />
                  <QuickMetric
                    label="Faixa de valor"
                    value={formatValueRange(workspace.summary.valor_min, workspace.summary.valor_max)}
                    hint={`${workspace.summary.propostas_total} proposta(s) registradas`}
                    icon={<ChartLineUp size={18} weight="duotone" />}
                    accentClassName="border-emerald-200 bg-emerald-50/80 text-emerald-700"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <div ref={statusMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setStatusMenuOpen((current) => !current)}
                    disabled={savingLeadStatus}
                    className={`inline-flex min-h-[70px] items-center gap-3 rounded-[24px] border bg-white px-4 py-3 text-left shadow-[0_18px_34px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_META[workspace.lead.status].className}`}
                  >
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-white/80 ${
                        workspace.lead.status === "ABERTO"
                          ? "border-sky-200 text-sky-600"
                          : workspace.lead.status === "EM_ATENDIMENTO"
                            ? "border-blue-200 text-blue-600"
                            : workspace.lead.status === "QUALIFICADO"
                              ? "border-violet-200 text-violet-600"
                              : workspace.lead.status === "OPORTUNIDADE"
                                ? "border-amber-200 text-amber-600"
                                : workspace.lead.status === "CLIENTE"
                                  ? "border-emerald-200 text-emerald-600"
                                  : workspace.lead.status === "DESQUALIFICADO"
                                    ? "border-rose-200 text-rose-600"
                                    : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <CaretDown size={16} weight="bold" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-current/70">
                        Ação do lead
                      </span>
                      <span className="mt-1 block text-base font-semibold leading-none">
                        {STATUS_META[workspace.lead.status].label}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-current/75">
                        {workspace.lead.aguardando_produto ? "Aguardando produto" : "Clique para atualizar status"}
                      </span>
                    </span>
                  </button>

                  {statusMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[280px] rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_50px_rgba(15,23,42,0.16)]">
                      <div className="px-2 pb-2 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Estágio comercial
                        </p>
                      </div>

                      <div className="grid gap-1">
                        {LEAD_MANUAL_STATUS_OPTIONS.map((item) => {
                          const active = workspace.lead.status === item;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => void handleSelectLeadStatus(item)}
                              className={`rounded-[16px] px-3 py-3 text-left text-sm transition ${
                                active
                                  ? "bg-slate-100 text-slate-900"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span className="block font-semibold">{STATUS_META[item].label}</span>
                            </button>
                          );
                        })}

                        {workspace.lead.status !== "OPORTUNIDADE" &&
                        workspace.lead.status !== "CLIENTE" &&
                        workspace.lead.status !== "DESQUALIFICADO" ? (
                          <button
                            type="button"
                            onClick={() => void handleToggleAguardandoProduto()}
                            className={`rounded-[16px] px-3 py-3 text-left text-sm transition ${
                              workspace.lead.aguardando_produto
                                ? "bg-amber-50 text-amber-900"
                                : "text-slate-600 hover:bg-amber-50 hover:text-amber-900"
                            }`}
                          >
                            <span className="block font-semibold">
                              {workspace.lead.aguardando_produto ? "Retirar aguardando produto" : "Marcar aguardando produto"}
                            </span>
                            <span className="mt-1 block text-xs text-inherit/75">
                              Mantém o lead vivo na carteira mesmo sem produto compatível no momento.
                            </span>
                          </button>
                        ) : null}

                        <div className="my-1 border-t border-slate-200" />

                        <button
                          type="button"
                          onClick={() => void handleSelectLeadStatus("DESQUALIFICADO")}
                          className="rounded-[16px] px-3 py-3 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                        >
                          <span className="block font-semibold">Desqualificar</span>
                          <span className="mt-1 block text-xs text-rose-600/80">
                            Exige motivo obrigatório para sair da carteira ativa.
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Mapa
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-900">
                      Localizações de interesse
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {mapPoints.length} ponto(s)
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                  {mapPoints.length > 0 && !effectiveMapsError ? (
                    <div ref={mapContainerRef} className="h-72 w-full" />
                  ) : effectiveMapsError ? (
                    <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-rose-600">
                      {effectiveMapsError}
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-slate-500">
                      Associe imóveis ou salve localizações de interesse para visualizar o mapa.
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {locationItems.slice(0, 6).map((item) => (
                    <span
                      key={item.id}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                        item.tone === "lead"
                          ? "bg-[var(--blue-slate)]/10 text-[var(--blue-slate)]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <MapPin size={13} />
                      <span>{item.label}</span>
                    </span>
                  ))}
                  {locationItems.length === 0 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
                      Nenhuma localização registrada ainda
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
      </div>

        <div className="border-t border-slate-200/70 bg-white">
            <div className="border-b border-slate-200/70 bg-white px-5 pt-3 md:px-7 md:pt-4">
              <div className="flex flex-wrap items-end gap-2">
              {[
                {
                  key: "atividades" as const,
                  label: "Atividades",
                  icon: CalendarBlank,
                  meta: `${workspace.summary.atividades_total} atividade(s)`,
                  accent: "sky",
                },
                {
                  key: "dadosPerfil" as const,
                  label: "Dados e Perfil",
                  icon: NotePencil,
                  meta: "cadastro e briefing",
                  accent: "violet",
                },
                {
                  key: "propostasImoveis" as const,
                  label: "Propostas e Imóveis",
                  icon: HouseLine,
                  meta: `${workspace.imoveis_interesse.length} imóvel(is) · ${workspace.summary.propostas_total} proposta(s)`,
                  accent: "rose",
                },
                {
                  key: "timeline" as const,
                  label: "Timeline",
                  icon: ChartLineUp,
                  meta: `${visibleTimeline.length} marco(s)`,
                  accent: "amber",
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;

                const activeClassName =
                  tab.accent === "sky"
                    ? "border-sky-200 border-b-white bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(224,242,254,0.88))] text-sky-700 shadow-[0_18px_34px_rgba(14,165,233,0.12)]"
                    : tab.accent === "violet"
                      ? "border-violet-200 border-b-white bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(237,233,254,0.88))] text-violet-700 shadow-[0_18px_34px_rgba(124,58,237,0.12)]"
                    : tab.accent === "rose"
                      ? "border-rose-200 border-b-white bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,228,230,0.88))] text-rose-700 shadow-[0_18px_34px_rgba(244,63,94,0.12)]"
                      : "border-amber-200 border-b-white bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.88))] text-amber-700 shadow-[0_18px_34px_rgba(245,158,11,0.12)]";

                const iconClassName =
                  tab.accent === "sky"
                    ? active
                      ? "border-sky-200 bg-sky-50 text-sky-600"
                      : "border-slate-200 bg-white text-slate-400"
                    : tab.accent === "violet"
                      ? active
                        ? "border-violet-200 bg-violet-50 text-violet-600"
                        : "border-slate-200 bg-white text-slate-400"
                    : tab.accent === "rose"
                      ? active
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-slate-200 bg-white text-slate-400"
                      : active
                        ? "border-amber-200 bg-amber-50 text-amber-600"
                        : "border-slate-200 bg-white text-slate-400";

                const metaClassName =
                  tab.accent === "sky"
                    ? active
                      ? "text-sky-600"
                      : "text-slate-400"
                    : tab.accent === "violet"
                      ? active
                        ? "text-violet-600"
                        : "text-slate-400"
                      : tab.accent === "rose"
                        ? active
                          ? "text-rose-600"
                          : "text-slate-400"
                        : active
                          ? "text-amber-600"
                          : "text-slate-400";

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative inline-flex -mb-px rounded-t-[22px] items-center gap-3 border px-4 py-3 text-left transition md:px-5 ${
                      active
                        ? activeClassName
                        : "border-transparent bg-white/55 text-slate-500 hover:border-slate-200 hover:bg-white/90 hover:text-slate-700"
                    }`}
                  >
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${iconClassName}`}>
                      <Icon size={18} weight={active ? "fill" : "regular"} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-none md:text-[15px]">{tab.label}</span>
                      <span className={`mt-1 block text-[11px] font-medium ${metaClassName}`}>{tab.meta}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

            <div className="bg-white px-5 py-6 md:px-7 md:py-7">
        {activeTab === "atividades" ? (
          <SectionCard
            eyebrow="Atividades"
            title="Gestão de atividades"
            subtitle="Crie o próximo passo, acompanhe atrasos e encerre cada retorno com contexto."
            chrome="flat"
            action={
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={openCreateActivityModal} className={buildModalButtonClass()}>
                  <Plus size={15} />
                  Criar atividade
                </button>
                <Link
                  href="/negocios/atividades"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Ver agenda
                  <ArrowRight size={14} />
                </Link>
              </div>
            }
          >
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                {
                  key: "ATRASADA" as const,
                  label: "Atrasadas",
                  count: activitySummary.overdue,
                  icon: WarningCircle,
                  toneClassName:
                    activityFilter === "ATRASADA"
                      ? "border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(255,255,255,0.98))] shadow-[0_18px_40px_rgba(244,63,94,0.14)]"
                      : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] hover:border-rose-200 hover:bg-rose-50/60",
                  iconClassName:
                    activityFilter === "ATRASADA"
                      ? "border-rose-200 bg-rose-100 text-rose-600"
                      : "border-rose-100 bg-rose-50 text-rose-500",
                  countClassName: activityFilter === "ATRASADA" ? "text-rose-700" : "text-slate-900",
                },
                {
                  key: "AGENDADA" as const,
                  label: "Agendadas",
                  count: activitySummary.scheduled,
                  icon: CalendarBlank,
                  toneClassName:
                    activityFilter === "AGENDADA"
                      ? "border-sky-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] shadow-[0_18px_40px_rgba(14,165,233,0.14)]"
                      : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] hover:border-sky-200 hover:bg-sky-50/60",
                  iconClassName:
                    activityFilter === "AGENDADA"
                      ? "border-sky-200 bg-sky-100 text-sky-600"
                      : "border-sky-100 bg-sky-50 text-sky-500",
                  countClassName: activityFilter === "AGENDADA" ? "text-sky-700" : "text-slate-900",
                },
                {
                  key: "CONCLUIDA" as const,
                  label: "Concluídas",
                  count: activitySummary.completed,
                  icon: CheckCircle,
                  toneClassName:
                    activityFilter === "CONCLUIDA"
                      ? "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] shadow-[0_18px_40px_rgba(16,185,129,0.14)]"
                      : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] hover:border-emerald-200 hover:bg-emerald-50/60",
                  iconClassName:
                    activityFilter === "CONCLUIDA"
                      ? "border-emerald-200 bg-emerald-100 text-emerald-600"
                      : "border-emerald-100 bg-emerald-50 text-emerald-500",
                  countClassName: activityFilter === "CONCLUIDA" ? "text-emerald-700" : "text-slate-900",
                },
              ].map((item) => {
                const Icon = item.icon;
                const selected = activityFilter === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActivityFilter((current) => (current === item.key ? "TODAS" : item.key))}
                    aria-pressed={selected}
                    className={`group rounded-[24px] border px-4 py-4 text-left transition duration-200 ${item.toneClassName}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${item.iconClassName}`}
                      >
                        <Icon size={20} weight={selected ? "fill" : "regular"} />
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          selected ? "bg-white/80 text-slate-600" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {selected ? "Filtrando" : "Filtrar"}
                      </span>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                        <p className={`mt-2 text-[2rem] font-semibold leading-none tracking-[-0.05em] ${item.countClassName}`}>
                          {item.count}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 transition group-hover:text-slate-500">
                        {selected ? "Clique para limpar" : "Ver na lista"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-xs font-medium text-slate-500">
                  {activityFilter === "TODAS"
                    ? `${sortedActivities.length} atividade(s) na linha do tempo`
                    : `${filteredActivities.length} atividade(s) em ${getActivityFilterLabel(activityFilter).toLowerCase()}`}
                </p>
                {activityFilter !== "TODAS" ? (
                  <button
                    type="button"
                    onClick={() => setActivityFilter("TODAS")}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Limpar filtro
                  </button>
                ) : null}
              </div>

              {filteredActivities.map((atividade) => {
                const visualStatus = getActivityVisualStatus(atividade, activityStatusReferenceIso);
                const isConcluded = visualStatus.label === "Concluída";
                const canConfirmVisit =
                  atividade.modelo === "EM_ATENDIMENTO_CONFIRMAR_VISITA" && atividade.status === "PENDENTE";

                return (
                  <article
                    key={atividade.id}
                    className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[var(--blue-slate)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--blue-slate)]">
                            {getActivityCategoryMeta(atividade.categoria).label}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {getActivityModelMeta(atividade.modelo).label}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                            {formatActivityTypeLabel(atividade.tipo)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${visualStatus.className}`}>
                            {visualStatus.label}
                          </span>
                        </div>
                        <p className="mt-3 text-base font-semibold text-slate-900">{atividade.titulo}</p>
                        {atividade.descricao ? <p className="mt-1 text-sm text-slate-500">{atividade.descricao}</p> : null}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span>
                            {atividade.quando_em
                              ? `Vencimento em ${formatDate(atividade.quando_em, "datetime")}`
                              : `Criada em ${formatDate(atividade.created_at, "datetime")}`}
                          </span>
                          <span>Registro em {formatDate(atividade.created_at, "datetime")}</span>
                        </div>
                      </div>

                      {isConcluded ? (
                        <span className="inline-flex h-9 items-center rounded-full bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-700">
                          Finalizada
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {canConfirmVisit ? (
                            <button
                              type="button"
                              onClick={() => openConfirmVisitModal(atividade)}
                              className={buildInlineActionClass("primary")}
                            >
                              <CalendarBlank size={15} />
                              Confirmar visita
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openRescheduleModal(atividade)}
                            className={buildInlineActionClass()}
                          >
                            <ClockCounterClockwise size={15} />
                            Reagendar
                          </button>
                          <button
                            type="button"
                            onClick={() => openCompleteModal(atividade)}
                            className={buildInlineActionClass(canConfirmVisit ? "secondary" : "primary")}
                          >
                            <CheckCircle size={15} />
                            Finalizar
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {sortedActivities.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma atividade registrada ainda para este lead.
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma atividade em {getActivityFilterLabel(activityFilter).toLowerCase()}.
                </div>
              ) : null}
            </div>
          </SectionCard>
        ) : activeTab === "dadosPerfil" ? (
          <div className="grid gap-4">
              <SectionCard
                eyebrow="Dados"
                title="Dados do lead"
                subtitle="Cadastro, canais de contato e endereço em um card dedicado."
                chrome="flat"
              >
                <form
                  id="lead-contact-form"
                  onSubmit={handleSaveContact}
                  onBlurCapture={handleContactFormBlurCapture}
                  className="grid gap-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Nome do lead"
                        status={resolveFieldSaveState(contactFieldStatus, ["nome"])}
                      />
                      <input
                        value={contactForm.nome}
                        onChange={(event) => setContactForm((current) => ({ ...current, nome: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="Nome e sobrenome"
                        required
                      />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Profissão"
                        helpText="Selecione uma sugestão ou complete livremente."
                        status={resolveFieldSaveState(contactFieldStatus, ["profissao"])}
                      />
                      <div className="relative">
                        <input
                          value={contactForm.profissao}
                          onFocus={() => setShowProfessionSuggestions(true)}
                          onBlur={() => {
                            window.setTimeout(() => setShowProfessionSuggestions(false), 120);
                          }}
                          onChange={(event) => {
                            setContactForm((current) => ({ ...current, profissao: event.target.value }));
                            setShowProfessionSuggestions(true);
                          }}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                          placeholder="Ex.: Médico, Empresário, Advogado"
                        />
                        {showProfessionSuggestions && filteredProfessionSuggestions.length > 0 ? (
                          <div className="absolute left-0 top-[calc(100%+4px)] z-20 max-h-56 w-full overflow-auto rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-lg">
                            {filteredProfessionSuggestions.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setContactForm((current) => ({ ...current, profissao: item }));
                                  setShowProfessionSuggestions(false);
                                }}
                                className="block w-full rounded-[14px] px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                          ) : null}
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="E-mail"
                        status={resolveFieldSaveState(contactFieldStatus, ["email"])}
                      />
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="lead@email.com"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Celular"
                        status={resolveFieldSaveState(contactFieldStatus, ["telefone"])}
                      />
                      <input
                        value={contactForm.telefone}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            telefone: formatPhoneDisplay(event.target.value),
                          }))
                        }
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="(11) 99999-9999"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Origem"
                        status={resolveFieldSaveState(contactFieldStatus, ["origem"])}
                      />
                      <select
                        value={contactForm.origem}
                        onChange={(event) => {
                          const nextOrigem = event.target.value as LeadOrigem;
                          setContactForm((current) => ({
                            ...current,
                            origem: nextOrigem,
                          }));
                        }}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                      >
                        {ORIGEM_LEAD_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {formatEnumLabel(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="CEP"
                        helpText="Ao sair do campo, tentamos preencher o endereço automaticamente."
                        helpPlacement="right-desktop"
                        status={resolveFieldSaveState(contactFieldStatus, ["cep"])}
                        trailing={loadingCep ? <span className="text-xs font-medium text-slate-400">Consultando...</span> : null}
                      />
                      <input
                        data-autosave-skip="true"
                        value={contactForm.cep}
                        onBlur={() => void handleContactCepBlur()}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            cep: formatPostalCodeDisplay(event.target.value),
                          }))
                        }
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="00000-000"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Endereço"
                        status={resolveFieldSaveState(contactFieldStatus, ["endereco"])}
                      />
                      <input
                        value={contactForm.endereco}
                        onChange={(event) =>
                          setContactForm((current) => ({ ...current, endereco: event.target.value }))
                        }
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="Rua, avenida, alameda"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.45fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Número"
                        status={resolveFieldSaveState(contactFieldStatus, ["numero"])}
                      />
                      <input
                        value={contactForm.numero}
                        onChange={(event) => setContactForm((current) => ({ ...current, numero: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="123"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Complemento"
                        status={resolveFieldSaveState(contactFieldStatus, ["complemento"])}
                      />
                      <input
                        value={contactForm.complemento}
                        onChange={(event) =>
                          setContactForm((current) => ({ ...current, complemento: event.target.value }))
                        }
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="Apto, sala, bloco"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Bairro"
                        status={resolveFieldSaveState(contactFieldStatus, ["bairro"])}
                      />
                      <input
                        value={contactForm.bairro}
                        onChange={(event) => setContactForm((current) => ({ ...current, bairro: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="Bairro"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.45fr)_minmax(0,0.75fr)]">
                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Cidade"
                        status={resolveFieldSaveState(contactFieldStatus, ["cidade"])}
                      />
                      <input
                        value={contactForm.cidade}
                        onChange={(event) => setContactForm((current) => ({ ...current, cidade: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="Cidade"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="UF"
                        status={resolveFieldSaveState(contactFieldStatus, ["uf"])}
                      />
                      <select
                        value={contactForm.uf}
                        onChange={(event) => setContactForm((current) => ({ ...current, uf: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                      >
                        <option value="">Selecione</option>
                        {UF_OPTIONS.map((itemUf) => (
                          <option key={itemUf} value={itemUf}>
                            {itemUf}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="País"
                        status={resolveFieldSaveState(contactFieldStatus, ["pais"])}
                      />
                      <input
                        value={contactForm.pais}
                        onChange={(event) => setContactForm((current) => ({ ...current, pais: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                        placeholder="Brasil"
                      />
                    </label>
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                eyebrow="Perfil"
                title="Perfil comercial do lead"
                subtitle="Briefing, objetivos, tipologia e preferências para orientar o atendimento."
                chrome="flat"
              >
                <form
                  id="lead-profile-form"
                  onSubmit={handleSaveProfile}
                  onBlurCapture={handleProfileFormBlurCapture}
                  className="grid gap-5"
                >
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <FieldLegend
                        label="Objetivo do lead"
                        status={resolveFieldSaveState(profileFieldStatus, ["objetivolead"])}
                      />
                          <div className="grid gap-2 md:grid-cols-3">
                            {OBJETIVO_LEAD_OPTIONS.map((item) => {
                              const active = profileForm.objetivolead.includes(item);
                              const meta = getLeadObjectiveMeta(item);
                              const Icon = meta.icon;
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => handleToggleLeadObjective(item)}
                                  className={`flex min-h-[66px] w-full items-center gap-2.5 rounded-[20px] border px-3 py-2.5 text-left transition ${
                                    active
                                      ? meta.activeClass
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  <span
                                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border ${
                                      active ? meta.activeIconClass : "border-slate-200 bg-slate-50 text-slate-500"
                                    }`}
                                  >
                                    <Icon size={17} weight={active ? "fill" : "regular"} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block whitespace-nowrap text-[14px] font-semibold leading-tight">
                                      {meta.title}
                                    </span>
                                    <span className="mt-0.5 block text-[10px] font-medium leading-tight text-inherit/75">
                                      {meta.description}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                    <div className="grid gap-2">
                      <FieldLegend
                        label="Tipo de uso"
                        status={resolveFieldSaveState(profileFieldStatus, ["tipouso"])}
                      />
                          <div className="grid gap-2 sm:grid-cols-2">
                            {TIPO_USO_OPTIONS.map((item) => {
                              const active = profileForm.tipouso === item;
                              const isResidential = item === "RESIDENCIAL";
                              const Icon = isResidential ? House : Briefcase;
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => handleSelectLeadTipoUso(item)}
                                  className={`flex min-h-[66px] w-full items-center gap-2.5 rounded-[20px] border px-3 py-2.5 text-left transition ${
                                    active
                                      ? isResidential
                                        ? "border-sky-200 bg-[linear-gradient(180deg,#eff6ff,#dbeafe)] text-sky-800 shadow-[0_14px_32px_rgba(59,130,246,0.12)]"
                                        : "border-amber-200 bg-[linear-gradient(180deg,#fff7ed,#ffedd5)] text-amber-800 shadow-[0_14px_32px_rgba(245,158,11,0.12)]"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  <span
                                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border ${
                                      active
                                        ? isResidential
                                          ? "border-sky-200 bg-white/80 text-sky-700"
                                          : "border-amber-200 bg-white/80 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-500"
                                    }`}
                                  >
                                    <Icon size={17} weight={active ? "fill" : "regular"} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block whitespace-nowrap text-[14px] font-semibold leading-tight">
                                      {formatEnumLabel(item)}
                                    </span>
                                    <span className="mt-0.5 block text-[10px] font-medium leading-tight text-inherit/75">
                                      {isResidential ? "Moradia" : "Uso profissional"}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                    {profileCanPickIntent ? (
                      <div className="grid gap-2">
                        <FieldLegend
                          label="Motivação"
                          status={resolveFieldSaveState(profileFieldStatus, ["intencao_compra"])}
                        />
                            <div className="grid gap-2 sm:grid-cols-2">
                              {INTENCAO_COMPRA_OPTIONS.map((item) => {
                                const active = profileForm.intencao_compra === item;
                                const meta = getLeadIntentMeta(item, profileForm.tipouso);
                                const Icon = meta.icon;
                                return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    setProfileForm((current) => ({ ...current, intencao_compra: item }));
                                    scheduleProfileAutosave();
                                  }}
                                  className={`flex min-h-[66px] w-full items-center gap-2.5 rounded-[20px] border px-3 py-2.5 text-left transition ${
                                    active
                                      ? meta.activeClass
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                  >
                                    <span
                                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border ${
                                        active ? meta.activeIconClass : "border-slate-200 bg-slate-50 text-slate-500"
                                      }`}
                                    >
                                      <Icon size={17} weight={active ? "fill" : "regular"} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block whitespace-nowrap text-[14px] font-semibold leading-tight">
                                        {meta.title}
                                      </span>
                                      <span className="mt-0.5 block text-[10px] font-medium leading-tight text-inherit/75">
                                        {meta.description}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                      </div>
                    ) : profileShouldShowIntent ? (
                      <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        Defina o tipo de uso para habilitar a motivação principal do lead.
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    <FieldLegend
                      label="Tipos de imóvel"
                      status={resolveFieldSaveState(profileFieldStatus, ["tipologia"])}
                    />

                    {!profileForm.tipouso ? (
                      <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        Selecione primeiro o tipo de uso para liberar a tipologia do briefing.
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                          <label className="grid gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Categoria
                            </span>
                                <select
                                  value={profileTipologiaCategoria}
                                  onChange={(event) => {
                                    setProfileTipologiaCategoria(event.target.value);
                                    setProfileTipologiaSubcategoria("");
                                  }}
                                  className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                >
                                  <option value="">Selecione</option>
                                  {profileTipologiaCategoriaOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                          </label>

                          <label className="grid gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Subcategoria
                            </span>
                                <select
                                  value={profileTipologiaSubcategoria}
                                  onChange={(event) => setProfileTipologiaSubcategoria(event.target.value)}
                                  disabled={!profileTipologiaCategoria}
                                  className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[var(--blue-slate)] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <option value="">{profileTipologiaCategoria ? "Selecione" : "Escolha a categoria"}</option>
                                  {profileTipologiaSubcategoriaOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                          </label>

                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              onClick={handleAddProfileTipologia}
                              disabled={!profileTipologiaCategoria || !profileTipologiaSubcategoria}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <Plus size={16} weight="bold" />
                              Adicionar tipologia
                            </button>
                          </div>
                        </div>

                        {profileTipologiaItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profileTipologiaItems.map((item) => (
                              <button
                                key={`${item.categoriaToken ?? "sem-categoria"}:${item.subcategoriaToken ?? item.tipoImovel}:${item.index}`}
                                type="button"
                                onClick={() => handleRemoveProfileTipologia(item.index)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <span>{item.displayLabel}</span>
                                <X size={14} weight="bold" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                            Adicione uma ou mais tipologias para orientar melhor o match do lead.
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <FieldLegend
                        label="Valor mínimo"
                        status={resolveFieldSaveState(profileFieldStatus, ["valor_min"])}
                      />
                          <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                              R$
                            </span>
                            <input
                              value={profileForm.valor_min}
                              onChange={(event) =>
                                setProfileForm((current) => ({
                                  ...current,
                                  valor_min: formatCurrencyInput(event.target.value),
                                }))
                              }
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                              placeholder="500.000"
                              inputMode="numeric"
                            />
                          </div>
                    </label>

                    <label className="grid gap-2">
                      <FieldLegend
                        label="Valor máximo"
                        status={resolveFieldSaveState(profileFieldStatus, ["valor_max"])}
                      />
                          <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                              R$
                            </span>
                            <input
                              value={profileForm.valor_max}
                              onChange={(event) =>
                                setProfileForm((current) => ({
                                  ...current,
                                  valor_max: formatCurrencyInput(event.target.value),
                                }))
                              }
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                              placeholder="1.200.000"
                              inputMode="numeric"
                            />
                          </div>
                    </label>
                  </div>

                  {profileForm.tipouso === "COMERCIAL" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Área mínima"
                            status={resolveFieldSaveState(profileFieldStatus, ["area_util_min_comercial"])}
                          />
                              <input
                                value={profileForm.area_util_min_comercial}
                                onChange={(event) =>
                                  setProfileForm((current) => ({
                                    ...current,
                                    area_util_min_comercial: formatAreaInput(event.target.value),
                                  }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="1.000"
                                inputMode="numeric"
                              />
                        </label>

                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Área máxima"
                            status={resolveFieldSaveState(profileFieldStatus, ["area_util_max_comercial"])}
                          />
                              <input
                                value={profileForm.area_util_max_comercial}
                                onChange={(event) =>
                                  setProfileForm((current) => ({
                                    ...current,
                                    area_util_max_comercial: formatAreaInput(event.target.value),
                                  }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="1.000"
                                inputMode="numeric"
                              />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Vagas mín."
                            status={resolveFieldSaveState(profileFieldStatus, ["vagas_min_comercial"])}
                          />
                              <input
                                value={profileForm.vagas_min_comercial}
                                onChange={(event) =>
                                  setProfileForm((current) => ({ ...current, vagas_min_comercial: event.target.value }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="0"
                                inputMode="numeric"
                              />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Área mínima"
                            status={resolveFieldSaveState(profileFieldStatus, ["area_util_min"])}
                          />
                              <input
                                value={profileForm.area_util_min}
                                onChange={(event) =>
                                  setProfileForm((current) => ({
                                    ...current,
                                    area_util_min: formatAreaInput(event.target.value),
                                  }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="1.000"
                                inputMode="numeric"
                              />
                        </label>

                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Área máxima"
                            status={resolveFieldSaveState(profileFieldStatus, ["area_util_max"])}
                          />
                              <input
                                value={profileForm.area_util_max}
                                onChange={(event) =>
                                  setProfileForm((current) => ({
                                    ...current,
                                    area_util_max: formatAreaInput(event.target.value),
                                  }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="1.000"
                                inputMode="numeric"
                              />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Dormitórios mín."
                            status={resolveFieldSaveState(profileFieldStatus, ["quartos_min"])}
                          />
                              <input
                                value={profileForm.quartos_min}
                                onChange={(event) =>
                                  setProfileForm((current) => ({ ...current, quartos_min: event.target.value }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="0"
                                inputMode="numeric"
                              />
                        </label>

                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Suítes mín."
                            status={resolveFieldSaveState(profileFieldStatus, ["suites_min"])}
                          />
                              <input
                                value={profileForm.suites_min}
                                onChange={(event) =>
                                  setProfileForm((current) => ({ ...current, suites_min: event.target.value }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="0"
                                inputMode="numeric"
                              />
                        </label>

                        <label className="grid min-w-0 gap-2">
                          <FieldLegend
                            label="Vagas mín."
                            status={resolveFieldSaveState(profileFieldStatus, ["vagas_min"])}
                          />
                              <input
                                value={profileForm.vagas_min}
                                onChange={(event) =>
                                  setProfileForm((current) => ({ ...current, vagas_min: event.target.value }))
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                                placeholder="0"
                                inputMode="numeric"
                              />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="grid gap-2">
                      <FieldLegend
                        label="Localizações de interesse"
                        helpText="Use Google Places para salvar bairros, regiões, estações e endereços no mapa do lead."
                        helpPlacement="right-desktop"
                        trailing={
                          <button
                            type="button"
                            onClick={() => void handleAddLeadLocation()}
                            disabled={!selectedLocationPlace || addingLocation}
                            className="inline-flex h-8 items-center justify-center rounded-full bg-[var(--blue-slate)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {addingLocation ? "Adicionando..." : "Adicionar"}
                          </button>
                        }
                      />
                      <div className="relative">
                        <input
                          value={locationSearch}
                          onFocus={() => setLocationSearchFocused(true)}
                          onBlur={() => {
                            window.setTimeout(() => setLocationSearchFocused(false), 120);
                          }}
                          onChange={(event) => {
                            const next = event.target.value;
                            setLocationSearch(next);
                            setSelectedLocationPlace(null);
                            if (!next.trim()) {
                              setLocationPlaceOptions([]);
                            }
                          }}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                          placeholder="Ex.: Santana, Perdizes, estação de metrô, avenida..."
                        />
                        {searchingLocationPlaces ? (
                          <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-400">
                            Buscando...
                          </span>
                        ) : null}

                        {locationSearchFocused && locationPlaceOptions.length > 0 ? (
                          <div className="absolute left-0 top-[calc(100%+4px)] z-20 max-h-56 w-full overflow-auto rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-lg">
                            {locationPlaceOptions.map((option) => (
                              <button
                                key={option.place_id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  void handleSelectLocationPlace(option);
                                }}
                                className="flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <MapPin size={14} className="text-slate-400" />
                                <span>{option.description}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3">
                        {selectedLocationPlace ? (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Selecionado
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {selectedLocationPlace.formatted_address ||
                                  [selectedLocationPlace.bairro, selectedLocationPlace.cidade, selectedLocationPlace.estado]
                                    .filter(Boolean)
                                    .join(" - ") ||
                                  locationSearch}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLocationPlace(null);
                                setLocationSearch("");
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                              aria-label="Limpar localização selecionada"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Ao associar um imóvel, a localidade dele também entra aqui automaticamente.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">Localizações já salvas</span>
                      <div className="flex flex-wrap gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3">
                        {profileLocationItems.length > 0 ? (
                          profileLocationItems.map((item) => (
                            <span
                              key={item.id}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                                item.tone === "lead"
                                  ? "bg-[var(--blue-slate)]/10 text-[var(--blue-slate)]"
                                  : "bg-white text-slate-600 ring-1 ring-slate-200"
                              }`}
                            >
                              <MapPin size={13} />
                              <span>{item.label}</span>
                              {item.removable ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveLeadLocation(item.sourceId)}
                                  disabled={removingLocationId === item.sourceId}
                                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-current/60 transition hover:text-current disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={`Remover ${item.label}`}
                                >
                                  <X size={11} />
                                </button>
                              ) : null}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200">
                            Nenhuma localização registrada ainda
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="grid gap-2">
                      <FieldLegend
                        label="Canais preferidos"
                        status={resolveFieldSaveState(profileFieldStatus, ["canais"])}
                      />
                          <div className="flex flex-wrap gap-2">
                            {CANAL_CONTATO_OPTIONS.map((item) => {
                              const active = profileForm.canais.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    setProfileForm((current) => ({
                                      ...current,
                                      canais: toggleStringArrayValue(current.canais, item),
                                    }));
                                    scheduleProfileAutosave();
                                  }}
                                  className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                                    active
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                  }`}
                                >
                                  {formatEnumLabel(item)}
                                </button>
                              );
                            })}
                          </div>
                    </div>

                    <div className="grid gap-2">
                      <FieldLegend
                        label="Conteúdos de interesse"
                        status={resolveFieldSaveState(profileFieldStatus, ["conteudos"])}
                      />
                          <div className="flex flex-wrap gap-2">
                            {TIPO_CONTEUDO_OPTIONS.map((item) => {
                              const active = profileForm.conteudos.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    setProfileForm((current) => ({
                                      ...current,
                                      conteudos: toggleStringArrayValue(current.conteudos, item),
                                    }));
                                    scheduleProfileAutosave();
                                  }}
                                  className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                                    active
                                      ? "border-violet-200 bg-violet-50 text-violet-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                  }`}
                                >
                                  {formatEnumLabel(item)}
                                </button>
                              );
                            })}
                          </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Perfil e preferências do lead"
                        status={resolveFieldSaveState(profileFieldStatus, ["texto_livre"])}
                      />
                          <textarea
                            value={profileForm.texto_livre}
                            onChange={(event) =>
                              setProfileForm((current) => ({ ...current, texto_livre: event.target.value }))
                            }
                            rows={5}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                            placeholder="Rotina, contexto familiar, estilo de vida, objeções e sinais do que realmente importa para este lead."
                          />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <FieldLegend
                        label="Observações comerciais"
                        status={resolveFieldSaveState(profileFieldStatus, ["mensagem"])}
                      />
                          <textarea
                            value={profileForm.mensagem}
                            onChange={(event) =>
                              setProfileForm((current) => ({ ...current, mensagem: event.target.value }))
                            }
                            rows={5}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                            placeholder="Resumo do momento do lead, objeções, contexto do atendimento e próximos sinais relevantes."
                          />
                    </label>
                  </div>
                </form>
              </SectionCard>
          </div>
        ) : activeTab === "propostasImoveis" ? (
          <div className="grid gap-4">
              <SectionCard
                eyebrow="Propostas"
                title="Propostas e negociações"
                subtitle="Andamento financeiro e próximos movimentos comerciais deste lead."
                chrome="flat"
                action={
                  <button
                    type="button"
                    onClick={openCreateOpportunityModal}
                    disabled={creatingOpportunity}
                    className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Criar oportunidade
                  </button>
                }
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    {workspace.summary.propostas_total} proposta(s)
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    {workspace.summary.oportunidades_total} oportunidade(s)
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    Faixa: {formatValueRange(workspace.summary.valor_min, workspace.summary.valor_max)}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">Oportunidades abertas</h3>
                    <span className="text-xs font-medium text-slate-500">
                      {visibleNegocios.length} oportunidade(s)
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {visibleNegocios.map((item) => (
                      <Link
                        key={item.id}
                        href={`/negocios/${item.id}`}
                        className="group relative block overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--blue-slate)]/30 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-slate)]/30"
                      >
                        <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[linear-gradient(135deg,rgba(15,23,42,0.12),rgba(15,23,42,0.22))] opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-100 transition duration-200 sm:opacity-0 sm:scale-[0.98] sm:group-hover:scale-100 sm:group-hover:opacity-100 sm:group-focus-visible:scale-100 sm:group-focus-visible:opacity-100">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.24)] ring-1 ring-white/70">
                            Abrir oportunidade
                            <ArrowRight size={12} />
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getNegocioModalidadeChipClass(item.modalidadeResolved)}`}
                              >
                                {NEGOCIO_MODALIDADE_LABEL[item.modalidadeResolved]}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getNegocioFaseChipClass(item.faseResolved)}`}
                              >
                                {NEGOCIO_FASE_LABEL[item.faseResolved]}
                              </span>
                              {item.subfase_juridica ? (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                  {SUBFASE_JURIDICA_LABEL[item.subfase_juridica]}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 text-base font-semibold text-slate-900">
                              {item.titulo?.trim() || "Oportunidade sem título"}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                              <span>Atualizada em {formatDate(item.updated_at, "datetime")}</span>
                              <span>Criada em {formatDate(item.created_at, "datetime")}</span>
                              {item.imovel ? (
                                <span>
                                  Imóvel: {getImovelDisplayTitle(item.imovel)}
                                </span>
                              ) : (
                                <span>Sem imóvel associado</span>
                              )}
                            </div>

                            {item.observacoes?.trim() ? (
                              <p className="mt-3 text-sm text-slate-600">{item.observacoes.trim()}</p>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                            <span className="text-sm font-semibold text-slate-900">
                              {typeof item.headlineValue === "number" ? formatCurrency(item.headlineValue) : "Sem valor"}
                            </span>
                            <div className="flex flex-wrap justify-end gap-2 text-[11px] font-medium text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                {item.propostasCount} proposta(s)
                              </span>
                              {item.proxima_acao_em ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                  Próx. ação {formatDate(item.proxima_acao_em, "date")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}

                    {visibleNegocios.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        Ainda não existe nenhuma oportunidade aberta para este lead.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">Propostas</h3>
                    <span className="text-xs font-medium text-slate-500">
                      {workspace.propostas.length} proposta(s)
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                  {workspace.propostas.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                              {formatEnumLabel(item.tipo)}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                              {formatEnumLabel(item.status)}
                            </span>
                          </div>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {item.titulo?.trim() || "Proposta sem título"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span>Atualizada em {formatDate(item.updated_at, "datetime")}</span>
                            <span>Criada em {formatDate(item.created_at, "datetime")}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                          <span className="text-sm font-semibold text-slate-900">
                            {typeof item.valor === "number" ? formatCurrency(item.valor) : "Sem valor"}
                          </span>
                          <Link
                            href={`/lead/${leadId}/propostas/${item.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--blue-slate)]"
                          >
                            Abrir proposta
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {workspace.propostas.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      Nenhuma proposta registrada ainda para este lead.
                    </div>
                  ) : null}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Interesse"
                title="Imóveis associados"
                subtitle="Imóveis conectados ao lead e ações rápidas de atendimento."
                chrome="flat"
                action={
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAssociateModalOpen(true);
                        void ensureOwnedImoveisLoaded();
                      }}
                      className={buildModalButtonClass()}
                    >
                      <Plus size={15} />
                      Associar imóvel
                    </button>
                    <button
                      type="button"
                      onClick={openCreateOpportunityModal}
                      disabled={creatingOpportunity}
                      className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Criar oportunidade
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVisitModalOpen(true);
                        setVisitForm((current) => ({
                          ...current,
                          imovel_id: current.imovel_id || workspace.imoveis_interesse[0]?.id || "",
                          quando: current.quando || toLocalDatetimeValue(workspace.summary.proxima_visita_em),
                        }));
                      }}
                      className={buildModalButtonClass()}
                    >
                      <CalendarBlank size={15} />
                      Agendar visita
                    </button>
                  </div>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {workspace.summary.finalidades.length > 0 ? (
                    workspace.summary.finalidades.map((item) => (
                      <span
                        key={item}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getFinalidadeBadgeClass(item)}`}
                      >
                        Lead deseja {getFinalidadeLabel(item).toLowerCase()}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      Objetivo ainda sem definição
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    Faixa: {formatValueRange(workspace.summary.valor_min, workspace.summary.valor_max)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    {workspace.summary.oportunidades_total} oportunidade(s)
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {workspace.imoveis_interesse.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3 sm:flex-row"
                    >
                      {item.foto_url ? (
                        <Image
                          src={item.foto_url}
                          alt={getImovelDisplayTitle(item)}
                          width={140}
                          height={104}
                          className="h-28 w-full rounded-[20px] object-cover sm:w-40"
                        />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center rounded-[20px] bg-slate-200 text-slate-500 sm:w-40">
                          <House size={22} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.codigo ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                              Cód. {item.codigo}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                            {formatEnumLabel(item.status)}
                          </span>
                          {item.finalidade === "COMPRAR" || item.finalidade === "ALUGAR" ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getFinalidadeBadgeClass(item.finalidade)}`}
                            >
                              {getFinalidadeLabel(item.finalidade)}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 truncate text-base font-semibold text-slate-900">
                          {getImovelDisplayTitle(item)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{getImovelLocationLabel(item)}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{getImovelHeadlineValue(item)}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>Associado em {formatDate(item.associado_em)}</span>
                          <Link href={`/imoveis/${item.id}`} className="inline-flex items-center gap-1 text-[var(--blue-slate)]">
                            Abrir imóvel
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {workspace.imoveis_interesse.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      Ainda não existe imóvel associado ao interesse deste lead.
                    </div>
                  ) : null}
                </div>
              </SectionCard>
          </div>
        ) : (
        <section className="rounded-[30px] bg-transparent p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Timeline</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">
                A vida comercial deste lead
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Eventos em sequência para acompanhar o relacionamento e a evolução do negócio.
              </p>
            </div>
            {refreshing ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Atualizando...
              </span>
            ) : null}
          </div>

          <div className="-mx-1 mt-5 overflow-x-auto pb-4">
            {visibleTimeline.length > 0 ? (
              <div className="relative min-w-max px-1">
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,#e2e8f0,#cbd5e1,#e2e8f0)]" />

                <div className="relative flex min-w-max">
                  {visibleTimeline.map((item) => {
                    const visual = getTimelineEventVisual(item);
                    const Icon = visual.icon;
                    const showCaption =
                      Boolean(visual.caption) &&
                      visual.caption !== TIMELINE_META[item.tipo].label &&
                      visual.caption !== visual.pillarLabel;

                    const card = (
                      <article
                        key={item.id}
                        className={`w-[216px] rounded-[20px] border px-3.5 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.04)] ${visual.cardClassName}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${visual.badgeClassName}`}>
                            {TIMELINE_META[item.tipo].label}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {formatDate(item.created_at, "datetime")}
                          </span>
                        </div>
                        <p className="mt-2.5 text-[15px] font-semibold leading-7 text-slate-900">{item.titulo}</p>
                        {showCaption ? (
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                            {visual.caption}
                          </p>
                        ) : null}
                      </article>
                    );

                    return (
                      <div
                        key={item.id}
                        className="relative grid w-[236px] shrink-0 grid-rows-[minmax(96px,1fr)_56px_minmax(96px,1fr)] px-2.5"
                      >
                        <div className={visual.lane === "top" ? "flex items-end justify-center pb-4" : ""}>
                          {visual.lane === "top" ? card : null}
                        </div>

                        <div className="relative flex items-center justify-center">
                          <span
                            className={`absolute left-1/2 h-5 w-px -translate-x-1/2 ${
                              visual.lane === "top" ? "top-0" : "bottom-0"
                            } ${visual.connectorClassName}`}
                          />
                          <div
                            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white ${visual.pointClassName}`}
                          >
                            <Icon size={16} weight="bold" />
                          </div>
                        </div>

                        <div className={visual.lane === "bottom" ? "flex items-start justify-center pt-4" : ""}>
                          {visual.lane === "bottom" ? card : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-sm text-slate-500">
                Ainda não existem eventos na timeline deste lead.
              </div>
            )}
          </div>
        </section>
        )}
          </div>
        </div>
        </section>
      </div>

      <ModalShell
        open={desqualifyModalOpen}
        title="Desqualificar lead"
        subtitle="Registre o motivo para manter a carteira limpa e a timeline comercial coerente."
        onClose={() => {
          setDesqualifyModalOpen(false);
          setDesqualifyForm({ motivo: "", nota: "" });
        }}
      >
        <form onSubmit={handleConfirmDesqualification} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Motivo</span>
            <select
              value={desqualifyForm.motivo}
              onChange={(event) =>
                setDesqualifyForm((current) => ({
                  ...current,
                  motivo: event.target.value as MotivoDesqualificacaoOption | "",
                }))
              }
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              required
            >
              <option value="">Selecione</option>
              {MOTIVO_DESQUALIFICACAO_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Nota opcional</span>
            <textarea
              value={desqualifyForm.nota}
              onChange={(event) =>
                setDesqualifyForm((current) => ({
                  ...current,
                  nota: event.target.value,
                }))
              }
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              placeholder="Contexto da perda, observações do corretor ou sinal para futuro reengajamento."
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDesqualifyModalOpen(false);
                setDesqualifyForm({ motivo: "", nota: "" });
              }}
              className={buildModalButtonClass()}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingLeadStatus || !desqualifyForm.motivo}
              className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {savingLeadStatus ? "Salvando..." : "Desqualificar lead"}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={createOpportunityModalOpen}
        modalId="create-opportunity-modal"
        title="Abrir oportunidade"
        subtitle="Fluxo rápido para abrir a negociação e seguir depois com compradores, vendedores e jurídico."
        onClose={closeCreateOpportunityModal}
        headerAction={
          createOpportunityBackStep ? (
            <button
              type="button"
              onClick={() => setCreateOpportunityStep(createOpportunityBackStep)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <CaretLeft size={16} />
              Voltar
            </button>
          ) : null
        }
      >
        <form onSubmit={handleCreateOpportunity} className="grid gap-5">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { key: "imovel" as const, label: "1. Base" },
              { key: "valor" as const, label: "2. Valor" },
              { key: "pagamento" as const, label: "3. Pagamento" },
              { key: "resumo" as const, label: "4. Resumo" },
            ].map((step, index) => {
              const active = createOpportunityStep === step.key;
              const unlocked =
                step.key === "imovel" ||
                (step.key === "valor" && createOpportunityModalOpen) ||
                (step.key === "pagamento" && opportunityTotalValue != null && opportunityTotalValue > 0) ||
                (step.key === "resumo" && opportunityPercentSummary.isComplete);

              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && setCreateOpportunityStep(step.key)}
                  className={`rounded-[20px] border px-3 py-3 text-left transition ${
                    active
                      ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8"
                      : unlocked
                        ? "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                        : "border-slate-200 bg-white opacity-60"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Etapa {index + 1}</p>
                  <p className={`mt-1 text-sm font-semibold ${active ? "text-[var(--blue-slate)]" : "text-slate-700"}`}>
                    {step.label}
                  </p>
                </button>
              );
            })}
          </div>

          {createOpportunityStep === "imovel" ? (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">A oportunidade nasce com qual base?</p>
                <p className="mt-1 text-sm text-slate-500">
                  Comece por um imóvel já associado ou siga sem vínculo. Ao clicar no card, o fluxo avança sozinho.
                </p>
              </div>

              {shouldCarouselOpportunityImoveis ? (
                <div className="-mx-1 overflow-x-auto pb-2">
                  <div className="flex gap-3 px-1">
                    {opportunitySelectableImoveis.map((item) => {
                      const purpose =
                        item.finalidade === "ALUGAR" && typeof item.preco_venda !== "number" ? "ALUGAR" : "COMPRAR";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectOpportunityImovel(item.id)}
                          className="w-[340px] shrink-0 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-3 text-left transition hover:border-[var(--blue-slate)]/30 hover:bg-[var(--blue-slate)]/5"
                        >
                          <div className="flex items-start gap-3">
                            {item.foto_url ? (
                              <Image
                                src={item.foto_url}
                                alt={getImovelDisplayTitle(item)}
                                width={80}
                                height={80}
                                className="h-20 w-20 rounded-[18px] object-cover"
                              />
                            ) : (
                              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[18px] bg-slate-200 text-slate-500">
                                <House size={18} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {item.codigo ? (
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                    {item.codigo}
                                  </span>
                                ) : null}
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getFinalidadeBadgeClass(purpose)}`}
                                >
                                  {getFinalidadeLabel(purpose)}
                                </span>
                              </div>
                              <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                                {getImovelDisplayTitle(item)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">{getImovelLocationLabel(item)}</p>
                              <p className="mt-3 text-sm font-semibold text-slate-900">{getImovelHeadlineValue(item)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {opportunitySelectableImoveis.map((item) => {
                    const purpose =
                      item.finalidade === "ALUGAR" && typeof item.preco_venda !== "number" ? "ALUGAR" : "COMPRAR";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectOpportunityImovel(item.id)}
                        className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-3 text-left transition hover:border-[var(--blue-slate)]/30 hover:bg-[var(--blue-slate)]/5"
                      >
                        <div className="flex items-start gap-3">
                          {item.foto_url ? (
                            <Image
                              src={item.foto_url}
                              alt={getImovelDisplayTitle(item)}
                              width={80}
                              height={80}
                              className="h-20 w-20 rounded-[18px] object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[18px] bg-slate-200 text-slate-500">
                              <House size={18} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.codigo ? (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                  {item.codigo}
                                </span>
                              ) : null}
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getFinalidadeBadgeClass(purpose)}`}
                              >
                                {getFinalidadeLabel(purpose)}
                              </span>
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                              {getImovelDisplayTitle(item)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{getImovelLocationLabel(item)}</p>
                            <p className="mt-3 text-sm font-semibold text-slate-900">{getImovelHeadlineValue(item)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleSelectOpportunityWithoutImovel}
                    className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fffaf0,#fff7e8)] px-4 py-4 text-left transition hover:border-amber-300 hover:shadow-[0_16px_36px_rgba(217,119,6,0.10)]"
                  >
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
                      <Sparkle size={20} />
                    </div>
                    <p className="mt-5 text-sm font-semibold text-slate-900">Seguir sem imóvel associado</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Ideal para quando a negociação existe, mas o corretor ainda vai consolidar o imóvel principal depois.
                    </p>
                  </button>
                </div>
              )}

              {shouldCarouselOpportunityImoveis ? (
                <button
                  type="button"
                  onClick={handleSelectOpportunityWithoutImovel}
                  className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fffaf0,#fff7e8)] px-4 py-4 text-left transition hover:border-amber-300 hover:shadow-[0_16px_36px_rgba(217,119,6,0.10)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
                      <Sparkle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Seguir sem imóvel associado</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Use quando a negociação ainda vai amadurecer antes de travar o imóvel principal.
                      </p>
                    </div>
                  </div>
                </button>
              ) : null}
            </div>
          ) : null}

          {createOpportunityStep === "valor" ? (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Qual valor vai guiar esta negociação?</p>
                <p className="mt-1 text-sm text-slate-500">
                  Ajuste valor e comissão se for necessário.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-900">Ajuste do valor se for necessário</span>
                    <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-[var(--blue-slate)] focus-within:bg-white">
                      <span className="mr-3 text-sm font-semibold text-slate-500">R$</span>
                      <input
                        value={createOpportunityForm.valor}
                        onChange={(event) => handleOpportunityValueInputChange(event.target.value)}
                        inputMode="numeric"
                        placeholder="Ex.: 1.280.000"
                        className={buildModalInputInnerClass()}
                      />
                    </div>
                  </label>

                  <div className="grid gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">Comissão da oportunidade</p>
                      <FieldHelpTooltip
                        text="O padrão vem da comissão de venda do imóvel associado. O corretor pode ajustar por percentual ou por valor fixo."
                        placement="bottom"
                      />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% da comissão</span>
                        <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)] focus-within:bg-white">
                          <input
                            value={createOpportunityForm.comissao_percentual}
                            onChange={(event) => handleOpportunityCommissionPercentChange(event.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className={buildModalInputInnerClass()}
                          />
                          <span className="ml-2 text-sm font-semibold text-slate-500">%</span>
                        </div>
                      </label>

                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor da comissão</span>
                        <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)] focus-within:bg-white">
                          <span className="mr-2 text-sm font-semibold text-slate-500">R$</span>
                          <input
                            value={createOpportunityCommissionAmountInput}
                            onChange={(event) => handleOpportunityCommissionAmountChange(event.target.value)}
                            inputMode="numeric"
                            placeholder="0"
                            className={buildModalInputInnerClass()}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Base escolhida</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {opportunitySelectedImovel
                      ? getImovelDisplayTitle(opportunitySelectedImovel)
                      : "Oportunidade sem imóvel"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {opportunitySelectedImovel
                      ? getImovelLocationLabel(opportunitySelectedImovel)
                      : "O imóvel principal pode ser definido depois."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      Valor: {typeof opportunityTotalValue === "number" ? formatCurrency(opportunityTotalValue) : "Sem valor"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      Comissão: {opportunityCommissionValue ? formatCurrency(opportunityCommissionValue) : "Não definida"}
                      {opportunityCommissionPercent > 0 ? ` • ${formatOpportunityPercentValue(opportunityCommissionPercent)}%` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={closeCreateOpportunityModal} className={buildModalButtonClass()}>
                  Cancelar
                </button>
                <button type="button" onClick={handleContinueOpportunityValueStep} className={buildModalButtonClass("primary")}>
                  Continuar
                </button>
              </div>
            </div>
          ) : null}

          {createOpportunityStep === "pagamento" ? (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Como o comprador vai compor o pagamento?</p>
                <p className="mt-1 text-sm text-slate-500">
                  Distribua manualmente. O corretor pode editar em percentual ou em valor, e os campos se recalculam.
                </p>
              </div>

              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    Valor total: {typeof opportunityTotalValue === "number" ? formatCurrency(opportunityTotalValue) : "Sem valor"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      opportunityPercentSummary.isComplete
                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                    }`}
                  >
                    {opportunityPercentSummary.isComplete
                      ? "100% fechado"
                      : `${formatOpportunityPercentValue(Math.abs(opportunityPercentSummary.remaining))}% ${opportunityPercentSummary.remaining > 0 ? "faltando" : "acima do limite"}`}
                  </span>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {([
                    {
                      key: "recursoproprios_percentual" as const,
                      label: "Recursos próprios",
                      helpText: "Entrada e capital próprio do comprador.",
                      percentValue: createOpportunityForm.recursoproprios_percentual,
                      amountValue: createOpportunityAmountInputs.recursoproprios_percentual,
                    },
                    {
                      key: "financiamento_percentual" as const,
                      label: "Financiamento",
                      helpText: "Parcela financiada pela instituição bancária.",
                      percentValue: createOpportunityForm.financiamento_percentual,
                      amountValue: createOpportunityAmountInputs.financiamento_percentual,
                    },
                    {
                      key: "fgts_percentual" as const,
                      label: "FGTS",
                      helpText: "Saldo usado via FGTS na composição.",
                      percentValue: createOpportunityForm.fgts_percentual,
                      amountValue: createOpportunityAmountInputs.fgts_percentual,
                    },
                    {
                      key: "outrosrecursos_percentual" as const,
                      label: "Outros recursos",
                      helpText: "Qualquer fonte complementar fora das opções principais.",
                      percentValue: createOpportunityForm.outrosrecursos_percentual,
                      amountValue: createOpportunityAmountInputs.outrosrecursos_percentual,
                    },
                  ]).map((item) => (
                    <div
                      key={item.key}
                      className="grid gap-2 rounded-[18px] border border-slate-200 bg-white p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <FieldHelpTooltip text={item.helpText} placement="bottom" />
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% do total</span>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[var(--blue-slate)] focus-within:bg-white">
                            <input
                              value={item.percentValue}
                              onChange={(event) => handleOpportunityPercentFieldChange(item.key, event.target.value)}
                              inputMode="decimal"
                              placeholder="0"
                              className={buildModalInputInnerClass()}
                            />
                            <span className="ml-2 text-sm font-semibold text-slate-500">%</span>
                          </div>
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor</span>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[var(--blue-slate)] focus-within:bg-white">
                            <span className="mr-2 text-sm font-semibold text-slate-500">R$</span>
                            <input
                              value={item.amountValue}
                              onChange={(event) => handleOpportunityAmountFieldChange(item.key, event.target.value)}
                              inputMode="numeric"
                              placeholder="0"
                              className={buildModalInputInnerClass()}
                            />
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={closeCreateOpportunityModal} className={buildModalButtonClass()}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleContinueOpportunityPaymentStep}
                  className={`${buildModalButtonClass("primary")} ${!opportunityPercentSummary.isComplete ? "cursor-not-allowed opacity-50" : ""}`}
                  disabled={!opportunityPercentSummary.isComplete}
                >
                  Continuar
                </button>
              </div>
            </div>
          ) : null}

          {createOpportunityStep === "resumo" ? (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Resumo da oportunidade</p>
                <p className="mt-1 text-sm text-slate-500">
                  Revise a negociação e registre uma nota curta antes de abrir a oportunidade.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                      Venda
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                      Negociação
                    </span>
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-900">
                    {buildOpportunityTitle({
                      leadName: workspace?.lead.nome ?? "Lead",
                      imovelTitle: opportunitySelectedImovel ? getImovelDisplayTitle(opportunitySelectedImovel) : null,
                      imovelCodigo: opportunitySelectedImovel?.codigo,
                    })}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <span>Imóvel base</span>
                      <span className="font-semibold text-slate-900">
                        {opportunitySelectedImovel ? getImovelDisplayTitle(opportunitySelectedImovel) : "Sem imóvel"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <span>Valor total</span>
                      <span className="font-semibold text-slate-900">
                        {typeof opportunityTotalValue === "number" ? formatCurrency(opportunityTotalValue) : "Sem valor"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <span>Comissão</span>
                      <span className="font-semibold text-slate-900">
                        {opportunityCommissionValue != null && opportunityCommissionValue > 0
                          ? `${formatCurrency(opportunityCommissionValue)}${opportunityCommissionPercent > 0 ? ` • ${formatOpportunityPercentValue(opportunityCommissionPercent)}%` : ""}`
                          : "Não definida"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Composição</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    {[
                      ["Recursos próprios", opportunitySplitPreview.recursoproprios],
                      ["Financiamento", opportunitySplitPreview.financiamento],
                      ["FGTS", opportunitySplitPreview.fgts],
                      ["Outros recursos", opportunitySplitPreview.outrosrecursos],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <span>{label}</span>
                        <span className="font-semibold text-slate-900">
                          {typeof value === "number" && value > 0 ? formatCurrency(value) : "R$ 0"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Observações da oportunidade</span>
                <textarea
                  value={createOpportunityForm.observacoes}
                  onChange={(event) =>
                    setCreateOpportunityForm((current) => ({
                      ...current,
                      observacoes: event.target.value,
                    }))
                  }
                  rows={4}
                  className={buildOpportunityModalTextareaClass()}
                  placeholder="Condições acordadas, timing do cliente, objeções ou qualquer contexto importante para o próximo passo."
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={closeCreateOpportunityModal} className={buildModalButtonClass()}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingOpportunity || opportunityTotalValue == null || !opportunityPercentSummary.isComplete}
                  className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {creatingOpportunity ? "Criando..." : "Abrir oportunidade"}
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </ModalShell>

      <ModalShell
        open={createActivityModalOpen}
        title="Criar atividade guiada"
        subtitle="Escolha o momento comercial, o playbook e a agenda. O restante a plataforma sugere."
        onClose={() => {
          setCreateActivityModalOpen(false);
          setCreateActivityStep("categoria");
          setShowCreateActivityManualPicker(false);
          setCreateActivityManualSelection({
            data: "",
            hora: "",
          });
          setCreateActivityCalendarMonth(startOfDay(new Date()));
          setCreateActivityCustomDate(null);
        }}
      >
        <form onSubmit={handleCreateActivity} className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { key: "categoria" as const, label: "1. Momento" },
              { key: "modelo" as const, label: "2. Playbook" },
              { key: "agenda" as const, label: "3. Agenda" },
              { key: "nota" as const, label: "4. Finalizar" },
            ].map((step, index) => {
              const active = createActivityStep === step.key;
              const unlocked =
                step.key === "categoria" ||
                (step.key === "modelo" && Boolean(createActivityForm.categoria)) ||
                (step.key === "agenda" && Boolean(createActivityForm.modelo)) ||
                (step.key === "nota" && Boolean(createActivityForm.quando));

              return (
                <div
                  key={step.key}
                  className={`rounded-[20px] border px-3 py-3 ${
                    active
                      ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8"
                      : unlocked
                        ? "border-slate-200 bg-slate-50"
                        : "border-slate-200 bg-white opacity-60"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Etapa {index + 1}</p>
                  <p className={`mt-1 text-sm font-semibold ${active ? "text-[var(--blue-slate)]" : "text-slate-700"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {createActivityStep === "categoria" ? (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Em que momento comercial está o lead?</p>
                <p className="mt-1 text-sm text-slate-500">
                  Comece pela etapa de relacionamento. Ao clicar no card, o fluxo avança sozinho.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {ACTIVITY_CATEGORY_ORDER.map((category) => {
                  const meta = getActivityCategoryMeta(category);
                  const Icon = ACTIVITY_CATEGORY_ICON[category];
                  const selected = createActivityForm.categoria === category;
                  const suggested = suggestedActivityCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setCreateActivityForm((current) => ({
                          ...current,
                          categoria: category,
                          modelo: null,
                          tipo: null,
                          titulo: "",
                        }));
                        setCreateActivityStep("modelo");
                      }}
                      className={`rounded-[24px] border px-4 py-4 text-left transition ${
                        selected
                          ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8 shadow-[0_18px_36px_rgba(24,62,110,0.12)]"
                          : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] hover:border-[var(--blue-slate)]/30 hover:bg-[var(--blue-slate)]/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[var(--blue-slate)]">
                          <Icon size={20} weight={selected ? "fill" : "regular"} />
                        </div>
                        {suggested ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                            Sugerido
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-5 text-base font-semibold text-slate-900">{meta.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{meta.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {createActivityStep === "modelo" ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedActivityCategoryMeta?.label ?? "Selecione um momento"}: qual é o próximo passo?
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Escolha um playbook pronto. O canal operacional é inferido automaticamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateActivityStep("categoria")}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Voltar
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {createActivityModelOptions.map((item) => {
                  const selected = createActivityForm.modelo === item.model;
                  return (
                    <button
                      key={item.model}
                      type="button"
                      onClick={() => {
                        setCreateActivityForm((current) => ({
                          ...current,
                          modelo: item.model,
                          tipo: inferActivityTypeFromModel(item.model),
                          titulo: getSuggestedCreateActivityTitle(item.model, current.quando),
                        }));
                        setCreateActivityStep("agenda");
                      }}
                      className={`rounded-[24px] border px-4 py-4 text-left transition ${
                        selected
                          ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8"
                          : "border-slate-200 bg-white hover:border-[var(--blue-slate)]/30 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--blue-slate)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--blue-slate)]">
                          {formatActivityTypeLabel(item.defaultType)}
                        </span>
                      </div>
                      <p className="mt-4 text-base font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {createActivityStep === "agenda" ? (
            <div className="grid gap-4">
              {showCreateActivityManualPicker ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Selecione data e horario</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Escolha o dia e depois ajuste o horario disponivel.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateActivityManualPicker(false)}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Voltar aos horarios sugeridos
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[296px_minmax(0,1fr)]">
                    <div className="mx-auto w-full max-w-[296px]">
                      <CompactDateCalendar
                        month={createActivityCalendarMonth}
                        days={createActivityCalendarDays}
                        selectedDate={createActivityManualSelection.data}
                        size="sm"
                        onPrevMonth={() =>
                          setCreateActivityCalendarMonth(
                            (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                          )
                        }
                        onNextMonth={() =>
                          setCreateActivityCalendarMonth(
                            (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                          )
                        }
                        onSelectDate={(day) => {
                          if (!workspace || day.isDisabled) return;
                          const nextTimeOptions = buildAvailableTimeOptionsForDate({
                            dateValue: day.value,
                            activities: workspace.atividades,
                            activityType: createActivityForm.tipo,
                            activityModel: createActivityForm.modelo,
                          });

                          setCreateActivityManualSelection((current) => ({
                            ...current,
                            data: day.value,
                            hora: nextTimeOptions.some((item) => item.value === current.hora)
                              ? current.hora
                              : (nextTimeOptions[0]?.value ?? ""),
                          }));
                        }}
                      />
                    </div>

                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Horario disponivel</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Faixa manual entre 07:00 e 22:00. Para hoje, so entram horarios a pelo menos 15 minutos do agora.
                      </p>

                      <label className="mt-4 grid gap-2">
                        <span className="text-sm font-medium text-slate-700">Hora</span>
                        <select
                          value={createActivityManualSelection.hora}
                          onChange={(event) =>
                            setCreateActivityManualSelection((current) => ({
                              ...current,
                              hora: event.target.value,
                            }))
                          }
                          className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                          disabled={!createActivityManualSelection.data || createActivityManualTimeOptions.length === 0}
                        >
                          <option value="">
                            {createActivityManualSelection.data
                              ? createActivityManualTimeOptions.length > 0
                                ? "Selecione um horario"
                                : "Sem horarios livres neste dia"
                              : "Escolha uma data no calendario"}
                          </option>
                          {createActivityManualTimeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateActivityManualPicker(false)}
                          className={buildModalButtonClass()}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextWhen = combineLocalDateAndTime(
                              createActivityManualSelection.data,
                              createActivityManualSelection.hora,
                            );
                            setCreateActivityForm((current) => ({
                              ...current,
                              quando: nextWhen,
                              titulo: current.modelo
                                ? getSuggestedCreateActivityTitle(current.modelo, nextWhen)
                                : current.titulo,
                            }));
                            setCreateActivityCustomDate(createActivityManualSelection.data || null);
                            setShowCreateActivityManualPicker(false);
                          }}
                          disabled={!createActivityManualSelection.data || !createActivityManualSelection.hora}
                          className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          Usar esta data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Quando essa atividade deve acontecer?</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Sugestões considerando segunda a sexta, das 08:00 às 20:00, e a agenda já ocupada.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateActivityStep("modelo")}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Voltar
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {createActivityQuickScheduleOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setCreateActivityCustomDate(null);
                          setCreateActivityForm((current) => ({
                            ...current,
                            quando: option.value,
                            titulo: current.modelo
                              ? getSuggestedCreateActivityTitle(current.modelo, option.value)
                              : current.titulo,
                          }));
                          setCreateActivityStep("nota");
                        }}
                        className={`rounded-[22px] border px-4 py-4 text-left transition ${
                          createActivityForm.quando === option.value
                            ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8"
                            : "border-slate-200 bg-white hover:border-[var(--blue-slate)]/30 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{option.hint}</p>
                      </button>
                    ))}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const sourceValue = createActivityForm.quando || createActivityQuickScheduleOptions[0]?.value || "";
                        const split = splitLocalDatetime(sourceValue);
                        const nextDate = split.date || todayDateValue;
                        const nextTimeOptions =
                          workspace && createActivityForm.tipo
                            ? buildAvailableTimeOptionsForDate({
                                dateValue: nextDate,
                                activities: workspace.atividades,
                                activityType: createActivityForm.tipo,
                                activityModel: createActivityForm.modelo,
                              })
                            : [];
                        const calendarBase = parseLocalDateInput(nextDate) ?? startOfDay(new Date());

                        setCreateActivityManualSelection({
                          data: nextDate,
                          hora: nextTimeOptions.some((item) => item.value === split.time)
                            ? split.time
                            : (nextTimeOptions[0]?.value ?? ""),
                        });
                        setCreateActivityCalendarMonth(
                          new Date(calendarBase.getFullYear(), calendarBase.getMonth(), 1),
                        );
                        setShowCreateActivityManualPicker(true);
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300 bg-[linear-gradient(180deg,#fff3c4,#f8df84)] px-4 text-sm font-semibold text-amber-900 shadow-[0_10px_24px_rgba(217,119,6,0.18)] hover:brightness-[0.99]"
                    >
                      {createActivityCustomDate
                        ? `Outra data: ${formatLocalDateLabel(createActivityCustomDate)}`
                        : "Outra data"}
                    </button>
                  </div>

                  <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {createActivityForm.quando
                      ? `Atividade prevista para ${formatDate(
                          new Date(createActivityForm.quando).toISOString(),
                          "datetime",
                        )}.`
                      : "Escolha um horario sugerido ou selecione outra data para continuar."}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!createActivityForm.quando}
                      onClick={() => setCreateActivityStep("nota")}
                      className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {createActivityStep === "nota" ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Revise a atividade e registre a nota</p>
                  <p className="mt-1 text-sm text-slate-500">
                    O título já vem sugerido pelo playbook. Você só precisa ajustar o contexto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateActivityStep("agenda")}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Voltar
                </button>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4">
                <div className="flex flex-wrap gap-2">
                  {createActivityForm.categoria ? (
                    <span className="rounded-full bg-[var(--blue-slate)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--blue-slate)]">
                      {getActivityCategoryMeta(createActivityForm.categoria).label}
                    </span>
                  ) : null}
                  {createActivityForm.modelo ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      {getActivityModelMeta(createActivityForm.modelo).label}
                    </span>
                  ) : null}
                  {createActivityForm.tipo ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                      {formatActivityTypeLabel(createActivityForm.tipo)}
                    </span>
                  ) : null}
                  {createActivityForm.quando ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                      {formatDate(new Date(createActivityForm.quando).toISOString(), "datetime")}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Sugestão de título</span>
                  <div className="grid gap-2 md:grid-cols-3">
                    {createActivityTitleSuggestions.map((option) => {
                      const selected = createActivityForm.titulo === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setCreateActivityForm((current) => ({
                              ...current,
                              titulo: option,
                            }))
                          }
                          className={`rounded-[20px] border px-3 py-3 text-left text-sm transition ${
                            selected
                              ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8 text-slate-900"
                              : "border-slate-200 bg-white text-slate-600 hover:border-[var(--blue-slate)]/30 hover:bg-slate-50"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Nota operacional</span>
                <textarea
                  value={createActivityForm.descricao}
                  onChange={(event) =>
                    setCreateActivityForm((current) => ({
                      ...current,
                      descricao: event.target.value,
                    }))
                  }
                  rows={4}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                  placeholder={selectedActivityModelMeta?.notePlaceholder ?? "Contexto, objetivo e próximos pontos desta atividade."}
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateActivityModalOpen(false);
                    setCreateActivityStep("categoria");
                  }}
                  className={buildModalButtonClass()}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCreatedActivity || !createActivityForm.titulo || !createActivityForm.quando}
                  className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {savingCreatedActivity ? "Salvando..." : "Criar atividade"}
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(rescheduleTarget)}
        title="Reagendar atividade"
        subtitle={rescheduleTarget?.titulo ?? "Escolha uma nova janela inteligente e registre uma nota curta."}
        onClose={() => {
          setRescheduleTarget(null);
          setShowRescheduleManualPicker(false);
          setRescheduleCustomDate(null);
        }}
      >
        <form onSubmit={handleRescheduleActivity} className="grid gap-4">
          {showRescheduleManualPicker ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Selecione data e horario</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Escolha o dia e depois ajuste o horario disponivel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRescheduleManualPicker(false)}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Voltar aos horarios de hoje
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[296px_minmax(0,1fr)]">
                <div className="mx-auto w-full max-w-[296px]">
                  <CompactDateCalendar
                    month={rescheduleCalendarMonth}
                    days={rescheduleCalendarDays}
                    selectedDate={rescheduleManualSelection.data}
                    size="sm"
                    onPrevMonth={() =>
                      setRescheduleCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                      )
                    }
                    onNextMonth={() =>
                      setRescheduleCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                      )
                    }
                    onSelectDate={(day) => {
                      if (!workspace || !rescheduleTarget || day.isDisabled) return;
                      const nextTimeOptions = buildAvailableTimeOptionsForDate({
                        dateValue: day.value,
                        activities: workspace.atividades,
                        currentActivityId: rescheduleTarget.id,
                        activityType: rescheduleTarget.tipo,
                        activityModel: rescheduleTarget.modelo,
                      });

                      setRescheduleManualSelection((current) => ({
                        ...current,
                        data: day.value,
                        hora: nextTimeOptions.some((item) => item.value === current.hora)
                          ? current.hora
                          : (nextTimeOptions[0]?.value ?? ""),
                      }));
                    }}
                  />
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Horario disponivel</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Faixa manual entre 07:00 e 22:00. Para hoje, so entram horarios a pelo menos 15 minutos do agora.
                  </p>

                  <label className="mt-4 grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Hora</span>
                    <select
                      value={rescheduleManualSelection.hora}
                      onChange={(event) =>
                        setRescheduleManualSelection((current) => ({
                          ...current,
                          hora: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                      disabled={!rescheduleManualSelection.data || rescheduleManualTimeOptions.length === 0}
                    >
                      <option value="">
                        {rescheduleManualSelection.data
                          ? rescheduleManualTimeOptions.length > 0
                            ? "Selecione um horario"
                            : "Sem horarios livres neste dia"
                          : "Escolha uma data no calendario"}
                      </option>
                      {rescheduleManualTimeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRescheduleManualPicker(false)}
                      className={buildModalButtonClass()}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleForm((current) => ({
                          ...current,
                          data: rescheduleManualSelection.data,
                          hora: rescheduleManualSelection.hora,
                        }));
                        setRescheduleCustomDate(rescheduleManualSelection.data || null);
                        setShowRescheduleManualPicker(false);
                      }}
                      disabled={!rescheduleManualSelection.data || !rescheduleManualSelection.hora}
                      className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Usar esta data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-slate-900">Horarios livres para hoje</p>
                <p className="mt-1 text-sm text-slate-500">
                  Faixa rápida em janela comercial, de segunda a sexta entre 08:00 e 20:00.
                  {rescheduleTarget?.quando_em ? ` Atual: ${formatDate(rescheduleTarget.quando_em, "datetime")}.` : ""}
                </p>
              </div>

              <div className="-mx-1 overflow-x-auto pb-2">
                <div className="flex min-w-max gap-3 px-1">
                  {rescheduleQuickScheduleOptions.map((option) => {
                    const split = splitLocalDatetime(option.value);
                    const isSelected =
                      rescheduleForm.data === split.date &&
                      rescheduleForm.hora === split.time;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setRescheduleForm((current) => ({
                            ...current,
                            data: split.date,
                            hora: split.time,
                          }));
                          setRescheduleCustomDate(null);
                          setShowRescheduleManualPicker(false);
                        }}
                        className={`min-w-[112px] rounded-[20px] border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8"
                            : "border-slate-200 bg-white hover:border-[var(--blue-slate)]/30 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-base font-semibold text-slate-900">{option.hint}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{option.label}</p>
                      </button>
                    );
                  })}

                  {rescheduleQuickScheduleOptions.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Nao ha horarios livres nessa data.
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleManualSelection({
                      data: rescheduleCustomDate ?? rescheduleForm.data,
                      hora: rescheduleForm.hora,
                    });
                    setShowRescheduleManualPicker(true);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300 bg-[linear-gradient(180deg,#fff3c4,#f8df84)] px-4 text-sm font-semibold text-amber-900 shadow-[0_10px_24px_rgba(217,119,6,0.18)] hover:brightness-[0.99]"
                >
                  {rescheduleCustomDate ? `Outra data: ${formatLocalDateLabel(rescheduleCustomDate)}` : "Outra data"}
                </button>
              </div>
              <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {rescheduleForm.data && rescheduleForm.hora
                  ? `Novo agendamento previsto para ${formatDate(
                      new Date(combineLocalDateAndTime(rescheduleForm.data, rescheduleForm.hora)).toISOString(),
                      "datetime",
                    )}.`
                  : "Escolha um horario rapido ou selecione outra data para continuar."}
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Nota do reagendamento</span>
                <textarea
                  value={rescheduleForm.nota}
                  onChange={(event) =>
                    setRescheduleForm((current) => ({
                      ...current,
                      nota: event.target.value,
                    }))
                  }
                  rows={4}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                  placeholder="Explique rapidamente o motivo da mudança ou o novo contexto."
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setRescheduleTarget(null)} className={buildModalButtonClass()}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingReschedule || !rescheduleForm.data || !rescheduleForm.hora}
                  className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {savingReschedule ? "Salvando..." : "Salvar reagendamento"}
                </button>
              </div>
            </>
          )}
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(confirmVisitTarget)}
        title="Confirmar visita"
        subtitle={confirmVisitTarget?.titulo ?? "Transforme a solicitação do portal em uma visita agendada."}
        onClose={() => setConfirmVisitTarget(null)}
      >
        <form onSubmit={handleConfirmVisitActivity} className="grid gap-4">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Solicitação recebida</p>
            <p className="mt-1 text-sm text-slate-500">
              {confirmVisitTarget?.quando_em
                ? `Horário pedido pelo visitante: ${formatDate(confirmVisitTarget.quando_em, "datetime")}.`
                : "Confirme uma data e horário para a visita."}
            </p>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Tipo de visita</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmVisitForm((current) => ({
                    ...current,
                    modelo: "EM_ATENDIMENTO_VISITA_PRESENCIAL",
                  }))
                }
                className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold ${
                  confirmVisitForm.modelo === "EM_ATENDIMENTO_VISITA_PRESENCIAL"
                    ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8 text-[var(--blue-slate)]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Presencial
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmVisitForm((current) => ({
                    ...current,
                    modelo: "EM_ATENDIMENTO_VISITA_VIRTUAL",
                  }))
                }
                className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold ${
                  confirmVisitForm.modelo === "EM_ATENDIMENTO_VISITA_VIRTUAL"
                    ? "border-[var(--blue-slate)] bg-[var(--blue-slate)]/8 text-[var(--blue-slate)]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Virtual
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Data</span>
              <input
                type="date"
                value={confirmVisitForm.data}
                onChange={(event) =>
                  setConfirmVisitForm((current) => ({
                    ...current,
                    data: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Horário</span>
              <input
                type="time"
                value={confirmVisitForm.hora}
                onChange={(event) =>
                  setConfirmVisitForm((current) => ({
                    ...current,
                    hora: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Observação da confirmação</span>
            <textarea
              value={confirmVisitForm.nota}
              onChange={(event) =>
                setConfirmVisitForm((current) => ({
                  ...current,
                  nota: event.target.value,
                }))
              }
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              placeholder="Ex.: confirmado por WhatsApp, portaria avisada, enviar lembrete antes da visita."
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setConfirmVisitTarget(null)} className={buildModalButtonClass()}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingConfirmVisit || !confirmVisitForm.data || !confirmVisitForm.hora}
              className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {savingConfirmVisit ? "Agendando..." : "Confirmar e agendar"}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(completeTarget)}
        title="Finalizar atividade"
        subtitle={completeTarget?.titulo ?? "Conclua a atividade e registre o resultado do contato."}
        onClose={() => setCompleteTarget(null)}
      >
        <form onSubmit={handleCompleteActivity} className="grid gap-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Resultado</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setCompleteActivityForm((current) => ({
                    ...current,
                    resultado: "POSITIVO",
                  }))
                }
                className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold ${
                  completeActivityForm.resultado === "POSITIVO"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Positivo
              </button>
              <button
                type="button"
                onClick={() =>
                  setCompleteActivityForm((current) => ({
                    ...current,
                    resultado: "NEGATIVO",
                  }))
                }
                className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold ${
                  completeActivityForm.resultado === "NEGATIVO"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Negativo
              </button>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Nota de conclusão</span>
            <textarea
              value={completeActivityForm.nota}
              onChange={(event) =>
                setCompleteActivityForm((current) => ({
                  ...current,
                  nota: event.target.value,
                }))
              }
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              placeholder="Resumo do retorno e próximos sinais percebidos."
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setCompleteTarget(null)} className={buildModalButtonClass()}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingComplete}
              className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {savingComplete ? "Finalizando..." : "Concluir atividade"}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={associateModalOpen}
        title="Associar imóvel ao lead"
        subtitle="Localize um imóvel do seu estoque e vincule ao interesse deste lead."
        onClose={() => setAssociateModalOpen(false)}
      >
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Buscar imóvel</span>
            <input
              value={associateSearch}
              onChange={(event) => setAssociateSearch(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              placeholder="Título, código, bairro ou cidade"
            />
          </label>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {loadingOwnedImoveis ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Carregando estoque...
              </div>
            ) : filteredOwnedImoveis.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum imóvel disponível com os filtros atuais.
              </div>
            ) : (
              filteredOwnedImoveis.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.codigo ? (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                          Cód. {item.codigo}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                        {formatEnumLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-900">{getImovelDisplayTitle(item)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[item.bairro, item.cidade, item.estado].filter(Boolean).join(" - ") || "Localização não informada"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {item.finalidade === "COMPRAR" && typeof item.preco_venda === "number"
                        ? formatCurrency(item.preco_venda)
                        : item.finalidade === "ALUGAR" && typeof item.preco_locacao === "number"
                          ? `${formatCurrency(item.preco_locacao)}/mês`
                          : typeof item.preco_venda === "number"
                            ? formatCurrency(item.preco_venda)
                            : typeof item.preco_locacao === "number"
                              ? `${formatCurrency(item.preco_locacao)}/mês`
                              : "Preço não informado"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAssociateImovel(item)}
                    disabled={associatingImovelId === item.id}
                    className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {associatingImovelId === item.id ? "Associando..." : "Associar"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={visitModalOpen}
        title="Agendar visita"
        subtitle="Crie uma visita pendente para este lead com data e contexto comercial."
        onClose={() => setVisitModalOpen(false)}
      >
        <form onSubmit={handleScheduleVisit} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Imóvel relacionado</span>
            <select
              value={visitForm.imovel_id}
              onChange={(event) => setVisitForm((current) => ({ ...current, imovel_id: event.target.value }))}
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
            >
              <option value="">Sem imóvel específico</option>
              {workspace.imoveis_interesse.map((item) => (
                <option key={item.id} value={item.id}>
                  {getImovelDisplayTitle(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Data e hora</span>
            <input
              type="datetime-local"
              value={visitForm.quando}
              onChange={(event) => setVisitForm((current) => ({ ...current, quando: event.target.value }))}
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Observações</span>
            <textarea
              value={visitForm.descricao}
              onChange={(event) => setVisitForm((current) => ({ ...current, descricao: event.target.value }))}
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
              placeholder="Quem participa, alinhamento da visita, pontos de atenção."
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setVisitModalOpen(false)} className={buildModalButtonClass()}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingVisit}
              className={`${buildModalButtonClass("primary")} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {savingVisit ? "Agendando..." : "Salvar visita"}
            </button>
          </div>
        </form>
      </ModalShell>
    </AppShell>
  );
}
