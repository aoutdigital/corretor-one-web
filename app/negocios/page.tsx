"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChartLine,
  ClockCounterClockwise,
  EnvelopeSimple,
  FileText,
  FunnelSimple,
  House,
  Megaphone,
  Phone,
  Plus,
  Trash,
  Users,
  Waveform,
  X,
} from "@phosphor-icons/react";
import { FormEvent, ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { LeadAvatar } from "@/app/_components/lead-avatar";
import { FloatingToastViewport, type FloatingToastItem } from "@/app/_components/floating-toast";
import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth } from "@/lib/client/auth-api";

type LeadStatus =
  | "NOVO"
  | "ABERTO"
  | "EM_ATENDIMENTO"
  | "QUALIFICADO"
  | "OPORTUNIDADE"
  | "CLIENTE"
  | "DESQUALIFICADO";

type LeadInterest = "COMPRAR" | "ALUGAR";

type LeadDirectoryItem = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  interesse: LeadInterest | null;
  imoveis_interesse_total: number;
  ultimo_imovel_interesse: {
    imovel_id: string;
    titulo: string | null;
    codigo: string | null;
    cidade: string | null;
    estado: string | null;
    foto_url: string | null;
    interesse_em: string | null;
  } | null;
  atividades_total: number;
  atividades_pendentes: number;
  proxima_atividade_em: string | null;
  proxima_visita_em: string | null;
  negocios_total: number;
  oportunidades_total: number;
  propostas_total: number;
  maior_valor: number | null;
};

type LeadLookupItem = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

type CreateLeadFormState = {
  telefone: string;
  email: string;
  firstName: string;
  lastName: string;
  origem: string;
  status: LeadStatus;
};

type CreateLeadStep = "phone" | "email" | "details" | "duplicate";

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

const PAGE_SIZE_OPTIONS = [20, 30, 50, 100] as const;
const MANUAL_CREATE_STATUS_OPTIONS: LeadStatus[] = [
  "ABERTO",
  "EM_ATENDIMENTO",
  "QUALIFICADO",
  "OPORTUNIDADE",
  "CLIENTE",
];

const SORT_OPTIONS = [
  { value: "CREATED_DESC", label: "Data de cadastro" },
  { value: "UPDATED_DESC", label: "Data de atualização" },
  { value: "VALUE_DESC", label: "Maior valor" },
  { value: "VALUE_ASC", label: "Menor valor" },
  { value: "NAME_ASC", label: "A-Z" },
  { value: "NAME_DESC", label: "Z-A" },
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

const INITIAL_CREATE_LEAD_FORM: CreateLeadFormState = {
  telefone: "",
  email: "",
  firstName: "",
  lastName: "",
  origem: "OUTRO",
  status: "ABERTO",
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

function formatCurrency(value: number | null) {
  if (typeof value !== "number") return "Sem valor";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
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

function splitLeadName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const firstName = parts[0] ?? fullName.trim();
  const lastName = parts.slice(1).join(" ") || null;
  return { firstName, lastName };
}

function getInterestLabel(value: LeadInterest | null) {
  if (value === "COMPRAR") return "Comprar";
  if (value === "ALUGAR") return "Alugar";
  return "Sem definição";
}

function getInterestBadgeClass(value: LeadInterest | null) {
  if (value === "COMPRAR") return "bg-[var(--primary-scarlet)]/10 text-[var(--primary-scarlet)]";
  if (value === "ALUGAR") return "bg-[var(--blue-slate)]/10 text-[var(--blue-slate)]";
  return "bg-slate-100 text-slate-600";
}

function hasOpportunity(item: LeadDirectoryItem) {
  return item.status === "OPORTUNIDADE" || item.oportunidades_total > 0;
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

function normalizePhoneToBrE164(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;

  return `+${withCountry}`;
}

function LeadSignalPill({
  icon,
  children,
  tone = "neutral",
}: {
  icon: ReactNode;
  children: ReactNode;
  tone?: "neutral" | "blue" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-[var(--blue-slate)]/10 text-[var(--blue-slate)] ring-[var(--blue-slate)]/10"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${toneClass}`}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

async function fetchLeadDirectory() {
  return apiFetchWithAuth<LeadDirectoryItem[]>("/api/leads/directory");
}

async function lookupLeadByUniqueKey(input: { telefone?: string; email?: string }) {
  const params = new URLSearchParams();
  if (input.telefone) params.set("telefone", input.telefone);
  if (input.email) params.set("email", input.email);
  return apiFetchWithAuth<LeadLookupItem | null>(`/api/leads/lookup?${params.toString()}`);
}

export default function NegociosPage() {
  const [items, setItems] = useState<LeadDirectoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [quickQuery, setQuickQuery] = useState("");
  const deferredQuickQuery = useDeferredValue(quickQuery);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [interestFilter, setInterestFilter] = useState("");
  const [onlyWithOpportunity, setOnlyWithOpportunity] = useState(false);
  const [onlyWithPendingActivities, setOnlyWithPendingActivities] = useState(false);
  const [onlyWithInterestedProperties, setOnlyWithInterestedProperties] = useState(false);

  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>("UPDATED_DESC");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [createLeadForm, setCreateLeadForm] = useState<CreateLeadFormState>(INITIAL_CREATE_LEAD_FORM);
  const [createLeadStep, setCreateLeadStep] = useState<CreateLeadStep>("phone");
  const [checkingUniqueKey, setCheckingUniqueKey] = useState(false);
  const [createLeadLookupError, setCreateLeadLookupError] = useState<string | null>(null);
  const [duplicateLead, setDuplicateLead] = useState<LeadLookupItem | null>(null);
  const [duplicateStage, setDuplicateStage] = useState<"phone" | "email" | null>(null);
  const [creatingLead, setCreatingLead] = useState(false);

  const [toasts, setToasts] = useState<FloatingToastItem[]>([]);
  const toastIdRef = useRef(0);

  function pushToast(kind: FloatingToastItem["kind"], message: string, durationMs?: number) {
    toastIdRef.current += 1;
    const id = `toast-${toastIdRef.current}`;
    setToasts((current) => [
      ...current,
      {
        id,
        kind,
        message,
        durationMs,
        onClose: () => {
          setToasts((next) => next.filter((item) => item.id !== id));
        },
      },
    ]);
  }

  async function loadData(options?: { silent?: boolean }) {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await fetchLeadDirectory();
    if (!result.ok) {
      setError(result.error);
      if (!options?.silent) {
        pushToast("error", result.error);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setItems(result.data);
    setSelectedIds((current) => {
      const availableIds = new Set(result.data.map((item) => item.id));
      return current.filter((id) => availableIds.has(id));
    });
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await fetchLeadDirectory();
      if (!active) return;

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setItems(result.data);
      setLoading(false);
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  const availableOrigins = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.origem))).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = normalizeText(deferredQuickQuery);

    return items.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (originFilter && item.origem !== originFilter) return false;
      if (interestFilter === "COMPRAR" && item.interesse !== "COMPRAR") return false;
      if (interestFilter === "ALUGAR" && item.interesse !== "ALUGAR") return false;
      if (interestFilter === "NONE" && item.interesse !== null) return false;
      if (onlyWithOpportunity && !hasOpportunity(item)) return false;
      if (onlyWithPendingActivities && item.atividades_pendentes === 0) return false;
      if (onlyWithInterestedProperties && item.imoveis_interesse_total === 0) return false;

      if (!query) return true;

      const haystack = [
        item.nome,
        item.email,
        item.telefone,
        item.ultimo_imovel_interesse?.titulo,
        item.ultimo_imovel_interesse?.codigo,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      return haystack.includes(query);
    });
  }, [
    deferredQuickQuery,
    interestFilter,
    items,
    onlyWithInterestedProperties,
    onlyWithOpportunity,
    onlyWithPendingActivities,
    originFilter,
    statusFilter,
  ]);

  const sortedItems = useMemo(() => {
    const next = [...filteredItems];

    next.sort((left, right) => {
      if (sortBy === "CREATED_DESC") {
        return right.created_at.localeCompare(left.created_at);
      }

      if (sortBy === "UPDATED_DESC") {
        return right.updated_at.localeCompare(left.updated_at);
      }

      if (sortBy === "VALUE_DESC") {
        return (right.maior_valor ?? Number.NEGATIVE_INFINITY) - (left.maior_valor ?? Number.NEGATIVE_INFINITY);
      }

      if (sortBy === "VALUE_ASC") {
        return (left.maior_valor ?? Number.POSITIVE_INFINITY) - (right.maior_valor ?? Number.POSITIVE_INFINITY);
      }

      if (sortBy === "NAME_ASC") {
        return left.nome.localeCompare(right.nome, "pt-BR");
      }

      return right.nome.localeCompare(left.nome, "pt-BR");
    });

    return next;
  }, [filteredItems, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedItems]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const currentPageIds = currentItems.map((item) => item.id);
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((itemId) => selectedIdSet.has(itemId));

  const totalOpportunities = useMemo(() => {
    return filteredItems.filter((item) => hasOpportunity(item)).length;
  }, [filteredItems]);

  const totalPendingActivities = useMemo(() => {
    return filteredItems.reduce((total, item) => total + item.atividades_pendentes, 0);
  }, [filteredItems]);

  const totalInterestedProperties = useMemo(() => {
    return filteredItems.filter((item) => item.imoveis_interesse_total > 0).length;
  }, [filteredItems]);

  const pageNumbers = useMemo(() => {
    return buildPageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  function resetAdvancedFilters() {
    setStatusFilter("");
    setOriginFilter("");
    setInterestFilter("");
    setOnlyWithOpportunity(false);
    setOnlyWithPendingActivities(false);
    setOnlyWithInterestedProperties(false);
    setPage(1);
  }

  function toggleLeadSelection(leadId: string) {
    setSelectedIds((current) =>
      current.includes(leadId) ? current.filter((item) => item !== leadId) : [...current, leadId],
    );
  }

  function toggleCurrentPageSelection() {
    if (allCurrentPageSelected) {
      setSelectedIds((current) => current.filter((item) => !currentPageIds.includes(item)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...currentPageIds])));
  }

  function handleBulkAction(actionLabel: string) {
    pushToast("info", `${actionLabel} para ${selectedIds.length} lead(s) entra na próxima etapa.`, 3200);
  }

  function resetCreateLeadModal() {
    setShowCreateLeadModal(false);
    setCreateLeadForm(INITIAL_CREATE_LEAD_FORM);
    setCreateLeadStep("phone");
    setCreateLeadLookupError(null);
    setDuplicateLead(null);
    setDuplicateStage(null);
    setCheckingUniqueKey(false);
  }

  async function handlePhoneStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateLeadLookupError(null);

    const normalizedPhone = normalizePhoneToBrE164(createLeadForm.telefone);
    if (!normalizedPhone) {
      setCreateLeadLookupError("Informe um celular válido com DDD.");
      return;
    }

    setCheckingUniqueKey(true);

    const result = await lookupLeadByUniqueKey({ telefone: createLeadForm.telefone });
    setCheckingUniqueKey(false);

    if (!result.ok) {
      setCreateLeadLookupError(result.error);
      return;
    }

    if (result.data) {
      setDuplicateLead(result.data);
      setDuplicateStage("phone");
      setCreateLeadStep("duplicate");
      return;
    }

    setCreateLeadStep("email");
  }

  async function handleEmailStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateLeadLookupError(null);

    if (!createLeadForm.email.trim()) {
      setCreateLeadStep("details");
      return;
    }

    setCheckingUniqueKey(true);

    const result = await lookupLeadByUniqueKey({ email: createLeadForm.email.trim() });
    setCheckingUniqueKey(false);

    if (!result.ok) {
      setCreateLeadLookupError(result.error);
      return;
    }

    if (result.data) {
      setDuplicateLead(result.data);
      setDuplicateStage("email");
      setCreateLeadStep("duplicate");
      return;
    }

    setCreateLeadStep("details");
  }

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = [createLeadForm.firstName.trim(), createLeadForm.lastName.trim()]
      .filter((part) => part.length > 0)
      .join(" ");

    if (!fullName) {
      pushToast("warning", "Informe nome e sobrenome para continuar.");
      return;
    }

    setCreatingLead(true);

    const result = await apiFetchWithAuth<{ id: string }>("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        nome: fullName,
        email: createLeadForm.email || null,
        telefone: createLeadForm.telefone || null,
        telefone_e164: normalizePhoneToBrE164(createLeadForm.telefone),
        origem: createLeadForm.origem,
        status: createLeadForm.status,
      }),
    });

    setCreatingLead(false);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    resetCreateLeadModal();
    pushToast("success", "Lead criado com sucesso.");
    await loadData({ silent: true });
  }

  return (
    <AppShell
      title="Leads"
      subtitle="A base comercial viva do corretor.one, pronta para relacionamento, mídia e venda."
      rightSlot={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData({ silent: true })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <ClockCounterClockwise size={16} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      }
    >
      <FloatingToastViewport items={toasts} />

      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Não foi possível carregar toda a operação de leads. {error}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(177,4,47,0.10),transparent_36%),linear-gradient(135deg,#ffffff,#f8fafc)] p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-h-14 min-w-[320px] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
              <Users size={18} className="text-slate-400" />
              <input
                value={quickQuery}
                onChange={(event) => {
                  setQuickQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Busca rápida por nome, email ou telefone"
                className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters((current) => !current)}
              className={`inline-flex h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition ${
                showAdvancedFilters
                  ? "border-[var(--blue-slate)] bg-[var(--blue-slate)] text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <FunnelSimple size={16} />
              Busca avançada
            </button>

            <Link
              href="/negocios/funil"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--blue-slate),#153a63)] px-4 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(24,62,110,0.24)]"
            >
              <Waveform size={16} />
              Funil de negócios
            </Link>

            <button
              type="button"
              onClick={() => {
                setCreateLeadForm(INITIAL_CREATE_LEAD_FORM);
                setCreateLeadStep("phone");
                setCreateLeadLookupError(null);
                setDuplicateLead(null);
                setDuplicateStage(null);
                setShowCreateLeadModal(true);
              }}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--primary-scarlet)] px-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(177,4,47,0.22)]"
            >
              <Plus size={16} />
              Novo lead
            </button>
          </div>

          {showAdvancedFilters ? (
            <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1 text-sm text-slate-600">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Todos</option>
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-600">
                Origem
                <select
                  value={originFilter}
                  onChange={(event) => {
                    setOriginFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Todas</option>
                  {availableOrigins.map((origin) => (
                    <option key={origin} value={origin}>
                      {formatEnumLabel(origin)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm text-slate-600">
                Interesse
                <select
                  value={interestFilter}
                  onChange={(event) => {
                    setInterestFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Todos</option>
                  <option value="COMPRAR">Comprar</option>
                  <option value="ALUGAR">Alugar</option>
                  <option value="NONE">Sem definição</option>
                </select>
              </label>

              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={resetAdvancedFilters}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Limpar filtros
                </button>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWithOpportunity}
                  onChange={(event) => {
                    setOnlyWithOpportunity(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                />
                Somente leads com oportunidade
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWithPendingActivities}
                  onChange={(event) => {
                    setOnlyWithPendingActivities(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                />
                Somente com atividades pendentes
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWithInterestedProperties}
                  onChange={(event) => {
                    setOnlyWithInterestedProperties(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                />
                Somente com imóveis de interesse
              </label>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-white bg-white/95 p-4">
              <div className="mb-2 inline-flex rounded-xl bg-slate-100 p-2 text-[var(--blue-slate)]">
                <Users size={18} />
              </div>
              <p className="text-2xl font-semibold text-slate-900">{filteredItems.length}</p>
              <p className="text-sm text-slate-500">Leads no recorte</p>
            </article>

            <article className="rounded-2xl border border-white bg-white/95 p-4">
              <div className="mb-2 inline-flex rounded-xl bg-slate-100 p-2 text-[var(--blue-slate)]">
                <ChartLine size={18} />
              </div>
              <p className="text-2xl font-semibold text-slate-900">{totalOpportunities}</p>
              <p className="text-sm text-slate-500">Com oportunidade ativa</p>
            </article>

            <article className="rounded-2xl border border-white bg-white/95 p-4">
              <div className="mb-2 inline-flex rounded-xl bg-slate-100 p-2 text-[var(--blue-slate)]">
                <ClockCounterClockwise size={18} />
              </div>
              <p className="text-2xl font-semibold text-slate-900">{totalPendingActivities}</p>
              <p className="text-sm text-slate-500">Atividades pendentes</p>
            </article>

            <article className="rounded-2xl border border-white bg-white/95 p-4">
              <div className="mb-2 inline-flex rounded-xl bg-slate-100 p-2 text-[var(--blue-slate)]">
                <House size={18} />
              </div>
              <p className="text-2xl font-semibold text-slate-900">{totalInterestedProperties}</p>
              <p className="text-sm text-slate-500">Com imóveis de interesse</p>
            </article>
          </div>
        </section>

        {selectedIds.length > 0 ? (
          <section className="sticky top-20 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedIds.length} lead(s) selecionado(s)</p>
                <p className="text-sm text-slate-500">Prepare ações em lote de mídia, relacionamento e audiência.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkAction("Email marketing")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <EnvelopeSimple size={15} />
                  Email marketing
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction("Campanhas")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Megaphone size={15} />
                  Campanhas
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction("Audiência")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Users size={15} />
                  Audiência
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction("Exclusão")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm text-rose-700 hover:bg-rose-50"
                >
                  <Trash size={15} />
                  Excluir
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Carteira de leads</h2>
              <p className="text-sm text-slate-500">
                Visualize relacionamento, interesse, atividade e contexto de imóvel em uma só leitura.
              </p>
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allCurrentPageSelected}
                onChange={toggleCurrentPageSelection}
                className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
              />
              Selecionar todos desta página
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-500">{sortedItems.length} lead(s) encontrado(s)</p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-500">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as (typeof SORT_OPTIONS)[number]["value"])}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">Itens por página</label>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                Carregando leads...
              </div>
            ) : null}

            {!loading && currentItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                Nenhum lead encontrado com os filtros atuais.
              </div>
            ) : null}

            {currentItems.map((item) => {
              const { firstName, lastName } = splitLeadName(item.nome);
              const selected = selectedIdSet.has(item.id);
              const updatedAtLabel = formatRelativeToNow(item.updated_at);

              return (
                <article
                  key={item.id}
                  className={`rounded-[28px] border p-4 transition ${
                    selected
                      ? "border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)]/5 shadow-[0_20px_48px_rgba(177,4,47,0.12)]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleLeadSelection(item.id)}
                            className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                            aria-label={`Selecionar ${item.nome}`}
                          />
                        </div>

                        <LeadAvatar name={item.nome} email={item.email} size="sm" />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-slate-900 sm:text-xl">
                              <span>{firstName}</span>
                              {lastName ? <span className="text-slate-500"> {lastName}</span> : null}
                            </h3>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                STATUS_META[item.status].className
                              }`}
                            >
                              {STATUS_META[item.status].label}
                            </span>
                            {hasOpportunity(item) ? (
                              <LeadSignalPill icon={<ChartLine size={13} weight="bold" />} tone="amber">
                                {item.oportunidades_total > 0 ? `${item.oportunidades_total} oportunidade(s)` : "Oportunidade"}
                              </LeadSignalPill>
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {item.telefone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone size={13} className="text-slate-400" />
                                <span>{formatPhoneDisplay(item.telefone)}</span>
                              </span>
                            ) : null}
                            {item.email ? (
                              <span className="inline-flex max-w-full items-center gap-1.5">
                                <EnvelopeSimple size={13} className="text-slate-400" />
                                <span className="truncate">{item.email}</span>
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarBlank size={13} className="text-slate-400" />
                              <span>{formatDate(item.created_at)}</span>
                            </span>
                            {updatedAtLabel ? (
                              <span className="inline-flex items-center gap-1.5">
                                <ClockCounterClockwise size={13} className="text-slate-400" />
                                <span>{updatedAtLabel}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <Link
                          href={`/lead/${item.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--blue-slate)] px-4 text-sm font-semibold text-white"
                        >
                          Abrir lead
                        </Link>
                        <Link
                          href="/negocios/funil"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Funil
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getInterestBadgeClass(item.interesse)}`}>
                        {getInterestLabel(item.interesse)}
                      </span>
                      <LeadSignalPill icon={<Megaphone size={13} weight="fill" />}>
                        {formatEnumLabel(item.origem)}
                      </LeadSignalPill>
                      {item.atividades_total > 0 ? (
                        <LeadSignalPill icon={<Waveform size={13} weight="bold" />}>
                          {item.atividades_total} atividade{item.atividades_total === 1 ? "" : "s"}
                        </LeadSignalPill>
                      ) : null}
                      {item.propostas_total > 0 ? (
                        <LeadSignalPill icon={<FileText size={13} weight="bold" />} tone="blue">
                          {item.propostas_total} proposta{item.propostas_total === 1 ? "" : "s"}
                        </LeadSignalPill>
                      ) : null}
                      {item.proxima_visita_em ? (
                        <LeadSignalPill icon={<CalendarBlank size={13} weight="bold" />} tone="blue">
                          {formatDate(item.proxima_visita_em, "datetime")}
                        </LeadSignalPill>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                      <div className="min-w-0 flex-1">
                        {item.ultimo_imovel_interesse ? (
                          <div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                            {item.ultimo_imovel_interesse.foto_url ? (
                              <Image
                                src={item.ultimo_imovel_interesse.foto_url}
                                alt={item.ultimo_imovel_interesse.titulo ?? "Imóvel de interesse"}
                                width={56}
                                height={56}
                                className="h-14 w-14 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                                <House size={18} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <LeadSignalPill icon={<House size={13} weight="bold" />}>
                                  {item.imoveis_interesse_total} interesse{item.imoveis_interesse_total === 1 ? "" : "s"}
                                </LeadSignalPill>
                                {item.ultimo_imovel_interesse.codigo ? (
                                  <span className="text-[11px] font-medium text-slate-400">
                                    Cód. {item.ultimo_imovel_interesse.codigo}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                                {item.ultimo_imovel_interesse.titulo ?? "Imóvel sem título"}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {item.ultimo_imovel_interesse.cidade && item.ultimo_imovel_interesse.estado
                                  ? `${item.ultimo_imovel_interesse.cidade}/${item.ultimo_imovel_interesse.estado}`
                                  : "Localização não informada"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                            Sem imóvel de interesse associado.
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        {typeof item.maior_valor === "number" ? (
                          <span className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
                            {formatCurrency(item.maior_valor)}
                          </span>
                        ) : null}
                        {item.negocios_total > 0 ? (
                          <LeadSignalPill icon={<ChartLine size={13} weight="bold" />}>
                            {item.negocios_total} negócio{item.negocios_total === 1 ? "" : "s"}
                          </LeadSignalPill>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!loading ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                Página {currentPage} de {totalPages}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CaretLeft size={14} />
                </button>

                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium ${
                      pageNumber === currentPage
                        ? "bg-[var(--blue-slate)] text-white"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {showCreateLeadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Novo lead</h2>
                <p className="text-sm text-slate-500">
                  Primeiro validamos as chaves únicas. Só depois abrimos os dados comerciais.
                </p>
              </div>
              <button
                type="button"
                onClick={resetCreateLeadModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar criação de lead"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  createLeadStep === "phone" || (createLeadStep === "duplicate" && duplicateStage === "phone")
                    ? "bg-[var(--primary-scarlet)] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                1. Celular
              </div>
              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  createLeadStep === "email" || (createLeadStep === "duplicate" && duplicateStage === "email")
                    ? "bg-[var(--blue-slate)] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                2. E-mail
              </div>
              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  createLeadStep === "details"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                3. Dados comerciais
              </div>
            </div>

            {createLeadStep === "phone" ? (
              <form onSubmit={handlePhoneStepSubmit} className="mt-5 grid gap-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Celular do lead</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Usamos o celular como primeira chave de deduplicação.
                  </p>

                  <label className="mt-4 grid gap-1 text-sm text-slate-600">
                    Celular
                    <input
                      value={createLeadForm.telefone}
                      onChange={(event) =>
                        setCreateLeadForm((current) => ({
                          ...current,
                          telefone: formatPhoneDisplay(event.target.value),
                        }))
                      }
                      placeholder="(31) 99999-9999"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                      required
                    />
                  </label>
                </div>

                {createLeadLookupError ? (
                  <p className="text-sm text-rose-600">{createLeadLookupError}</p>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={resetCreateLeadModal}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={checkingUniqueKey}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkingUniqueKey ? "Verificando..." : "Continuar"}
                  </button>
                </div>
              </form>
            ) : null}

            {createLeadStep === "email" ? (
              <form onSubmit={handleEmailStepSubmit} className="mt-5 grid gap-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">E-mail do lead</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Se houver e-mail, validamos a segunda chave única antes de seguir.
                  </p>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Celular confirmado: <span className="font-semibold text-slate-900">{createLeadForm.telefone}</span>
                  </div>

                  <label className="mt-4 grid gap-1 text-sm text-slate-600">
                    E-mail
                    <input
                      type="email"
                      value={createLeadForm.email}
                      onChange={(event) =>
                        setCreateLeadForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="ana@email.com"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Se não tiver e-mail agora, pode seguir sem preencher.</p>
                </div>

                {createLeadLookupError ? (
                  <p className="text-sm text-rose-600">{createLeadLookupError}</p>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateLeadLookupError(null);
                      setCreateLeadStep("phone");
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={checkingUniqueKey}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--blue-slate)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkingUniqueKey ? "Verificando..." : "Continuar"}
                  </button>
                </div>
              </form>
            ) : null}

            {createLeadStep === "details" ? (
              <form onSubmit={handleCreateLead} className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    Celular: {createLeadForm.telefone}
                  </span>
                  {createLeadForm.email ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      E-mail: {createLeadForm.email}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">
                      Sem e-mail informado
                    </span>
                  )}
                </div>

                <label className="grid gap-1 text-sm text-slate-600">
                  Nome
                  <input
                    value={createLeadForm.firstName}
                    onChange={(event) =>
                      setCreateLeadForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                    placeholder="Ex: Ana"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm text-slate-600">
                  Sobrenome
                  <input
                    value={createLeadForm.lastName}
                    onChange={(event) =>
                      setCreateLeadForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                    placeholder="Ex: Souza"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm text-slate-600">
                  Origem
                  <select
                    value={createLeadForm.origem}
                    onChange={(event) => setCreateLeadForm((current) => ({ ...current, origem: event.target.value }))}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    {ORIGEM_LEAD_OPTIONS.map((origin) => (
                      <option key={origin} value={origin}>
                        {formatEnumLabel(origin)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm text-slate-600">
                  Estado inicial
                  <select
                    value={createLeadForm.status}
                    onChange={(event) =>
                      setCreateLeadForm((current) => ({ ...current, status: event.target.value as LeadStatus }))
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    {MANUAL_CREATE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_META[status].label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="md:col-span-2 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Leads criados manualmente não entram como `Novo`; já nascem em estado comercial.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateLeadStep("email")}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={creatingLead}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingLead ? "Criando..." : "Criar lead"}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}

            {createLeadStep === "duplicate" && duplicateLead ? (
              <div className="mt-5 grid gap-4">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Encontramos um lead já cadastrado com este {duplicateStage === "phone" ? "celular" : "e-mail"}.
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Em vez de criar um duplicado, o ideal é continuar o trabalho no lead existente.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-4">
                    <LeadAvatar name={duplicateLead.nome} email={duplicateLead.email} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">{duplicateLead.nome}</p>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            STATUS_META[duplicateLead.status].className
                          }`}
                        >
                          {STATUS_META[duplicateLead.status].label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Origem: {formatEnumLabel(duplicateLead.origem)}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>{duplicateLead.email ?? "E-mail não informado"}</p>
                        <p>{formatPhoneDisplay(duplicateLead.telefone) || "Telefone não informado"}</p>
                        <p>Atualizado em {formatDate(duplicateLead.updated_at, "datetime")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const nextStep = duplicateStage === "phone" ? "phone" : "email";
                      setDuplicateLead(null);
                      setDuplicateStage(null);
                      setCreateLeadLookupError(null);
                      setCreateLeadStep(nextStep);
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ajustar {duplicateStage === "phone" ? "celular" : "e-mail"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetCreateLeadModal}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Fechar
                    </button>
                    <Link
                      href={`/lead/${duplicateLead.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--blue-slate)] px-4 text-sm font-semibold text-white"
                    >
                      Abrir lead existente
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
