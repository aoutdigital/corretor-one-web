"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CalendarBlank,
  FileText,
  House,
  IdentificationCard,
  Scales,
  ThumbsDown,
  ThumbsUp,
  User,
  UserPlus,
  UserSwitch,
} from "@phosphor-icons/react";
import { type Dispatch, FormEvent, type SetStateAction, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { FloatingToastViewport, type FloatingToastItem } from "@/app/_components/floating-toast";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import {
  NEGOCIO_FASE_LABEL,
  NEGOCIO_MODALIDADE_LABEL,
  SUBFASE_JURIDICA_LABEL,
  type FaseNegocio,
  type SubfaseJuridicaNegocio,
} from "@/lib/crm/oportunidades";
import type { NegocioWorkspace } from "@/lib/db/negocios";
import { UF_OPTIONS } from "@/lib/location/constants";

type OpportunityPercentFieldKey =
  | "recursoproprios_percentual"
  | "financiamento_percentual"
  | "fgts_percentual"
  | "outrosrecursos_percentual";

type PaymentAmountInputs = Record<OpportunityPercentFieldKey, string>;

type OpportunityFormState = {
  titulo: string;
  fase: FaseNegocio;
  subfase_juridica: SubfaseJuridicaNegocio | "";
  valor: string;
  comissao_percentual: string;
  observacoes: string;
};

type OpportunityPropostaTipo = NegocioWorkspace["propostas"][number]["tipo"];
type OpportunityPropostaStatus = NegocioWorkspace["propostas"][number]["status"];

type OpportunityProposalFormState = {
  titulo: string;
  tipo: OpportunityPropostaTipo;
  valor: string;
  vencimento_em: string;
};

type OpportunityWorkspaceTab = "negociacao" | "juridico" | "timeline" | "atividades";

type OpportunityParte = NegocioWorkspace["partes"][number];
type OpportunityPartePessoa = OpportunityParte["pessoas"][number];
type OpportunityCorretor = NegocioWorkspace["corretores"][number];

type OpportunityParteFormState = {
  papel: OpportunityParte["papel"];
  tipo_pessoa: OpportunityParte["tipo_pessoa"];
  razao_social: string;
  cnpj: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
};

type OpportunityPartePessoaFormState = {
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
};

type OpportunityCorretorFormState = {
  nome: string;
  email: string;
  telefone: string;
  percentual_comissao: string;
  valor_comissao: string;
  vinculado_corretor_parceiro: boolean;
};

const JURIDICO_SUBFASES = Object.entries(SUBFASE_JURIDICA_LABEL) as Array<
  [SubfaseJuridicaNegocio, string]
>;

const OPPORTUNITY_PHASE_TRACK = [
  {
    key: "NEGOCIACAO" as const,
    label: "Negociação",
    description: "Condições e proposta.",
    icon: Briefcase,
    accent: "sky" as const,
  },
  {
    key: "JURIDICO" as const,
    label: "Jurídico",
    description: "Documentos e assinatura.",
    icon: Scales,
    accent: "violet" as const,
  },
  {
    key: "GANHO" as const,
    label: "Ganho",
    description: "Negócio confirmado.",
    icon: ThumbsUp,
    accent: "emerald" as const,
  },
  {
    key: "PERDIDO" as const,
    label: "Perdido",
    description: "Negociação encerrada.",
    icon: ThumbsDown,
    accent: "rose" as const,
  },
];

const PAYMENT_ROWS: Array<{
  key: OpportunityPercentFieldKey;
  label: string;
  hint: string;
}> = [
  {
    key: "recursoproprios_percentual",
    label: "Recursos próprios",
    hint: "Entrada e capital próprio.",
  },
  {
    key: "financiamento_percentual",
    label: "Financiamento",
    hint: "Parcela vinda do banco.",
  },
  {
    key: "fgts_percentual",
    label: "FGTS",
    hint: "Saldo usado na operação.",
  },
  {
    key: "outrosrecursos_percentual",
    label: "Outros recursos",
    hint: "Qualquer composição complementar.",
  },
];

const PAYMENT_SUMMARY_LABELS: Record<keyof ReturnType<typeof buildPaymentValues>, string> = {
  recursoproprios: "Recursos próprios",
  financiamento: "Financiamento",
  fgts: "FGTS",
  outrosrecursos: "Outros recursos",
};

const PROPOSTA_TIPO_LABEL: Record<OpportunityPropostaTipo, string> = {
  COMERCIAL: "Comercial",
  EMPREENDIMENTO: "Empreendimento",
  IMOVEL: "Imóvel",
  SELECAO: "Seleção",
};

const PROPOSTA_STATUS_META: Record<
  OpportunityPropostaStatus,
  {
    label: string;
    className: string;
  }
> = {
  RASCUNHO: {
    label: "Rascunho",
    className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
  ENVIADA: {
    label: "Enviada",
    className: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  },
  ACEITA: {
    label: "Aceita",
    className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  },
  RECUSADA: {
    label: "Recusada",
    className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
  },
  EXPIRADA: {
    label: "Expirada",
    className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  },
};

const INITIAL_PROPOSAL_FORM: OpportunityProposalFormState = {
  titulo: "",
  tipo: "COMERCIAL",
  valor: "",
  vencimento_em: "",
};

const INITIAL_PARTE_FORM: OpportunityParteFormState = {
  papel: "COMPRADOR",
  tipo_pessoa: "FISICA",
  razao_social: "",
  cnpj: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  pais: "Brasil",
};

const INITIAL_PARTE_PESSOA_FORM: OpportunityPartePessoaFormState = {
  nome_completo: "",
  email: "",
  telefone: "",
  cpf: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  pais: "Brasil",
};

const INITIAL_CORRETOR_FORM: OpportunityCorretorFormState = {
  nome: "",
  email: "",
  telefone: "",
  percentual_comissao: "",
  valor_comissao: "",
  vinculado_corretor_parceiro: false,
};

function mapParteToForm(parte: OpportunityParte): OpportunityParteFormState {
  return {
    papel: parte.papel,
    tipo_pessoa: parte.tipo_pessoa,
    razao_social: parte.razao_social ?? "",
    cnpj: parte.cnpj ?? "",
    cep: parte.cep ?? "",
    endereco: parte.endereco ?? "",
    numero: parte.numero ?? "",
    complemento: parte.complemento ?? "",
    bairro: parte.bairro ?? "",
    cidade: parte.cidade ?? "",
    uf: parte.uf ?? "",
    pais: parte.pais ?? "Brasil",
  };
}

function mapPartePessoaToForm(pessoa: OpportunityPartePessoa): OpportunityPartePessoaFormState {
  return {
    nome_completo: pessoa.nome_completo,
    email: pessoa.email,
    telefone: pessoa.telefone ?? "",
    cpf: formatCpfInput(pessoa.cpf),
    cep: pessoa.cep,
    endereco: pessoa.endereco,
    numero: pessoa.numero,
    complemento: pessoa.complemento ?? "",
    bairro: pessoa.bairro,
    cidade: pessoa.cidade,
    uf: pessoa.uf,
    pais: pessoa.pais,
  };
}

function mapCorretorToForm(corretor: OpportunityCorretor): OpportunityCorretorFormState {
  return {
    nome: corretor.nome,
    email: corretor.email ?? "",
    telefone: corretor.telefone ?? "",
    percentual_comissao: formatPercentInput(corretor.percentual_comissao),
    valor_comissao: formatCurrencyInput(corretor.valor_comissao),
    vinculado_corretor_parceiro: corretor.vinculado_corretor_parceiro,
  };
}

function buildPaymentValues(paymentAmountInputs: PaymentAmountInputs) {
  return {
    recursoproprios: parseCurrencyInput(paymentAmountInputs.recursoproprios_percentual) ?? 0,
    financiamento: parseCurrencyInput(paymentAmountInputs.financiamento_percentual) ?? 0,
    fgts: parseCurrencyInput(paymentAmountInputs.fgts_percentual) ?? 0,
    outrosrecursos: parseCurrencyInput(paymentAmountInputs.outrosrecursos_percentual) ?? 0,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function parseCurrencyInput(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const numeric = Number(digits);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

function formatCpfInput(value: string | null | undefined) {
  const digits = normalizeDigits(value ?? "", 11);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatCepInput(value: string | null | undefined) {
  const digits = normalizeDigits(value ?? "", 8);
  if (!digits) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

function isValidCpf(value: string | null | undefined) {
  const digits = normalizeDigits(value ?? "", 11);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const numbers = digits.split("").map((char) => Number(char));
  const firstVerifierBase = numbers
    .slice(0, 9)
    .reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstVerifier = (firstVerifierBase * 10) % 11;
  if ((firstVerifier === 10 ? 0 : firstVerifier) !== numbers[9]) return false;

  const secondVerifierBase = numbers
    .slice(0, 10)
    .reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondVerifier = (secondVerifierBase * 10) % 11;

  return (secondVerifier === 10 ? 0 : secondVerifier) === numbers[10];
}

function formatPercentInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(".", ",");
}

function parsePercentInput(value: string | null | undefined) {
  if (!value) return 0;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseDateInputToIso(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value: string | null | undefined, mode: "date" | "datetime" = "date") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(mode === "datetime" ? { timeStyle: "short" } : {}),
  }).format(date);
}

function buildMoneyInputClass() {
  return "opportunity-modal-input min-w-0 w-full appearance-none border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none outline-none ring-0 placeholder:text-slate-400";
}

function buildTextareaClass() {
  return "opportunity-modal-textarea rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white";
}

function getCompletionClass(complete: boolean) {
  return complete
    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
}

function getPhaseTrackNodeClass(accent: (typeof OPPORTUNITY_PHASE_TRACK)[number]["accent"], active: boolean) {
  if (!active) {
    return {
      card: "bg-transparent text-slate-500 shadow-none",
      iconWrap: "border-slate-200 bg-white/95 text-slate-400",
      eyebrow: "text-slate-400",
      title: "text-slate-700",
      description: "text-slate-400",
    };
  }

  if (accent === "violet") {
    return {
      card: "bg-transparent text-violet-700 shadow-none",
      iconWrap:
        "border-violet-500 bg-[linear-gradient(180deg,rgba(139,92,246,1),rgba(124,58,237,1))] text-white shadow-[0_14px_34px_rgba(124,58,237,0.26)] ring-4 ring-violet-100/90",
      eyebrow: "text-violet-500",
      title: "text-slate-900",
      description: "text-slate-500",
    };
  }

  if (accent === "emerald") {
    return {
      card: "bg-transparent text-emerald-700 shadow-none",
      iconWrap:
        "border-emerald-500 bg-[linear-gradient(180deg,rgba(16,185,129,1),rgba(5,150,105,1))] text-white shadow-[0_14px_34px_rgba(16,185,129,0.24)] ring-4 ring-emerald-100/90",
      eyebrow: "text-emerald-500",
      title: "text-slate-900",
      description: "text-slate-500",
    };
  }

  if (accent === "rose") {
    return {
      card: "bg-transparent text-rose-700 shadow-none",
      iconWrap:
        "border-rose-500 bg-[linear-gradient(180deg,rgba(244,63,94,1),rgba(225,29,72,1))] text-white shadow-[0_14px_34px_rgba(244,63,94,0.24)] ring-4 ring-rose-100/90",
      eyebrow: "text-rose-500",
      title: "text-slate-900",
      description: "text-slate-500",
    };
  }

  return {
    card: "bg-transparent text-sky-700 shadow-none",
    iconWrap:
      "border-sky-500 bg-[linear-gradient(180deg,rgba(14,165,233,1),rgba(2,132,199,1))] text-white shadow-[0_14px_34px_rgba(14,165,233,0.24)] ring-4 ring-sky-100/90",
    eyebrow: "text-sky-500",
    title: "text-slate-900",
    description: "text-slate-500",
  };
}

function mapWorkspaceToForm(workspace: NegocioWorkspace): OpportunityFormState {
  return {
    titulo: workspace.negocio.titulo ?? "",
    fase: workspace.negocio.fase,
    subfase_juridica: workspace.negocio.subfase_juridica ?? "",
    valor: formatCurrencyInput(workspace.negocio.valor),
    comissao_percentual: formatPercentInput(workspace.negocio.comissaopercentual),
    observacoes: workspace.negocio.observacoes ?? "",
  };
}

function mapWorkspaceToAmountInputs(workspace: NegocioWorkspace): PaymentAmountInputs {
  return {
    recursoproprios_percentual: formatCurrencyInput(workspace.negocio.recursopropriovalor),
    financiamento_percentual: formatCurrencyInput(workspace.negocio.financiamentovalor),
    fgts_percentual: formatCurrencyInput(workspace.negocio.fgtsvalor),
    outrosrecursos_percentual: formatCurrencyInput(workspace.negocio.outrosrecursosvalor),
  };
}

export default function NegocioDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const negocioId = params.id;

  const [workspace, setWorkspace] = useState<NegocioWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<FloatingToastItem[]>([]);
  const [form, setForm] = useState<OpportunityFormState | null>(null);
  const [commissionAmountInput, setCommissionAmountInput] = useState("");
  const [commissionEditedField, setCommissionEditedField] = useState<"percent" | "amount">("percent");
  const [paymentPercentInputs, setPaymentPercentInputs] = useState<Record<OpportunityPercentFieldKey, string>>({
    recursoproprios_percentual: "",
    financiamento_percentual: "",
    fgts_percentual: "",
    outrosrecursos_percentual: "",
  });
  const [paymentAmountInputs, setPaymentAmountInputs] = useState<PaymentAmountInputs>({
    recursoproprios_percentual: "",
    financiamento_percentual: "",
    fgts_percentual: "",
    outrosrecursos_percentual: "",
  });
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState<OpportunityProposalFormState>(INITIAL_PROPOSAL_FORM);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [proposalDocumentOpenId, setProposalDocumentOpenId] = useState<string | null>(null);
  const [generatingProposalPdfId, setGeneratingProposalPdfId] = useState<string | null>(null);
  const [proposalPdfUrls, setProposalPdfUrls] = useState<Record<string, string>>({});
  const [savingJuridico, setSavingJuridico] = useState(false);
  const [activeTab, setActiveTab] = useState<OpportunityWorkspaceTab>("negociacao");
  const [parteFormOpen, setParteFormOpen] = useState(false);
  const [parteWizardStep, setParteWizardStep] = useState<1 | 2 | 3>(1);
  const [parteWizardMode, setParteWizardMode] = useState<"CADASTRAR" | "VINCULAR">("CADASTRAR");
  const [parteForm, setParteForm] = useState<OpportunityParteFormState>(INITIAL_PARTE_FORM);
  const [partePessoaForm, setPartePessoaForm] = useState<OpportunityPartePessoaFormState>(INITIAL_PARTE_PESSOA_FORM);
  const [partePessoaCpfTouched, setPartePessoaCpfTouched] = useState(false);
  const [createParteWithPessoa, setCreateParteWithPessoa] = useState(true);
  const [savingParte, setSavingParte] = useState(false);
  const [editingParteId, setEditingParteId] = useState<string | null>(null);
  const [editingParteForm, setEditingParteForm] = useState<OpportunityParteFormState>(INITIAL_PARTE_FORM);
  const [savingParteEdit, setSavingParteEdit] = useState(false);
  const [addingPessoaParteId, setAddingPessoaParteId] = useState<string | null>(null);
  const [addingPessoaForm, setAddingPessoaForm] = useState<OpportunityPartePessoaFormState>(INITIAL_PARTE_PESSOA_FORM);
  const [savingPessoaCreate, setSavingPessoaCreate] = useState(false);
  const [editingPessoaRef, setEditingPessoaRef] = useState<{ parteId: string; pessoaId: string } | null>(null);
  const [editingPessoaForm, setEditingPessoaForm] = useState<OpportunityPartePessoaFormState>(INITIAL_PARTE_PESSOA_FORM);
  const [savingPessoaEdit, setSavingPessoaEdit] = useState(false);
  const [deletingParteId, setDeletingParteId] = useState<string | null>(null);
  const [deletingPessoaRef, setDeletingPessoaRef] = useState<{ parteId: string; pessoaId: string } | null>(null);
  const [addingCorretorOpen, setAddingCorretorOpen] = useState(false);
  const [addingCorretorForm, setAddingCorretorForm] = useState<OpportunityCorretorFormState>(INITIAL_CORRETOR_FORM);
  const [savingCorretorCreate, setSavingCorretorCreate] = useState(false);
  const [editingCorretorId, setEditingCorretorId] = useState<string | null>(null);
  const [editingCorretorForm, setEditingCorretorForm] = useState<OpportunityCorretorFormState>(INITIAL_CORRETOR_FORM);
  const [savingCorretorEdit, setSavingCorretorEdit] = useState(false);
  const [deletingCorretorId, setDeletingCorretorId] = useState<string | null>(null);

  function pushToast(kind: FloatingToastItem["kind"], message: string, duration = 3200) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [
      ...current,
      {
        id,
        kind,
        message,
        durationMs: duration,
        onClose: () => setToasts((items) => items.filter((item) => item.id !== id)),
      },
    ]);
  }

  async function handlePessoaCepBlur(
    cepValue: string,
    setter: Dispatch<SetStateAction<OpportunityPartePessoaFormState>>,
  ) {
    const cepDigits = normalizeDigits(cepValue, 8);
    if (cepDigits.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { cache: "no-store" });
      if (!response.ok) {
        pushToast("warning", "Não foi possível consultar o CEP agora.");
        return;
      }

      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (data.erro) {
        pushToast("warning", "CEP não encontrado.");
        return;
      }

      setter((current) => ({
        ...current,
        endereco: data.logradouro?.trim() || current.endereco,
        complemento: data.complemento?.trim() || current.complemento,
        bairro: data.bairro?.trim() || current.bairro,
        cidade: data.localidade?.trim() || current.cidade,
        uf: data.uf?.trim() || current.uf,
      }));
    } catch {
      pushToast("warning", "Falha ao consultar CEP.");
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const result = await apiFetchWithAuth<NegocioWorkspace>(`/api/negocios/${negocioId}`);
      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setWorkspace(result.data);
      setForm(mapWorkspaceToForm(result.data));
      setCommissionAmountInput(formatCurrencyInput(result.data.negocio.comissaovalor));

      const totalValue = result.data.negocio.valor ?? null;
      const amounts = mapWorkspaceToAmountInputs(result.data);
      setPaymentAmountInputs(amounts);
      setPaymentPercentInputs({
        recursoproprios_percentual:
          totalValue && result.data.negocio.recursopropriovalor
            ? formatPercentInput((result.data.negocio.recursopropriovalor / totalValue) * 100)
            : "",
        financiamento_percentual:
          totalValue && result.data.negocio.financiamentovalor
            ? formatPercentInput((result.data.negocio.financiamentovalor / totalValue) * 100)
            : "",
        fgts_percentual:
          totalValue && result.data.negocio.fgtsvalor ? formatPercentInput((result.data.negocio.fgtsvalor / totalValue) * 100) : "",
        outrosrecursos_percentual:
          totalValue && result.data.negocio.outrosrecursosvalor
            ? formatPercentInput((result.data.negocio.outrosrecursosvalor / totalValue) * 100)
            : "",
      });
      setCommissionEditedField("percent");
    }

    if (negocioId) void load();
  }, [negocioId]);

  const totalValue = useMemo(() => (form ? parseCurrencyInput(form.valor) : null), [form]);
  const commissionValue = useMemo(() => parseCurrencyInput(commissionAmountInput), [commissionAmountInput]);
  const commissionPercent = useMemo(() => (form ? parsePercentInput(form.comissao_percentual) : 0), [form]);

  const paymentSummary = useMemo(() => {
    const values = buildPaymentValues(paymentAmountInputs);
    const amountTotal = values.recursoproprios + values.financiamento + values.fgts + values.outrosrecursos;
    const remainingAmount = totalValue == null ? null : totalValue - amountTotal;
    const remainingPercent =
      totalValue && totalValue > 0 && remainingAmount != null ? Math.round((remainingAmount / totalValue) * 100 * 100) / 100 : 0;

    return {
      values,
      amountTotal,
      remainingAmount,
      remainingPercent,
      isComplete: totalValue != null && remainingAmount === 0,
    };
  }, [paymentAmountInputs, totalValue]);

  const paymentCompositionSummary = useMemo(() => {
    if (!totalValue || totalValue <= 0) return "Sem composição definida";

    const items = Object.entries(paymentSummary.values)
      .map(([key, amount]) => ({
        key: key as keyof typeof paymentSummary.values,
        amount,
        percent: amount > 0 ? (amount / totalValue) * 100 : 0,
      }))
      .filter((item) => item.amount > 0);

    if (items.length === 0) return "Sem composição definida";

    return items
      .map((item) => `${formatPercentInput(item.percent)}% ${PAYMENT_SUMMARY_LABELS[item.key]}`)
      .join(" • ");
  }, [paymentSummary, totalValue]);

  const compradorPartes = useMemo(
    () => workspace?.partes.filter((parte) => parte.papel === "COMPRADOR") ?? [],
    [workspace?.partes],
  );
  const vendedorPartes = useMemo(
    () => workspace?.partes.filter((parte) => parte.papel === "VENDEDOR") ?? [],
    [workspace?.partes],
  );

  const corretorParceiroSugestao = useMemo(() => {
    if (!workspace?.imovel) return null;
    if (!workspace.imovel.veio_do_bolsao || !workspace.imovel.captacao_corretor_parceiro) return null;

    const nome = workspace.imovel.corretor_parceiro_nome?.trim() ?? "";
    const email = workspace.imovel.corretor_parceiro_email?.trim() ?? "";
    const telefone = workspace.imovel.corretor_parceiro_telefone?.trim() ?? "";
    if (!nome && !email && !telefone) return null;

    return {
      nome: nome || "Corretor parceiro",
      email,
      telefone,
    };
  }, [workspace?.imovel]);

  const canSuggestPartnerCorretor = useMemo(() => {
    if (!workspace || !corretorParceiroSugestao) return false;

    const normalizedEmail = corretorParceiroSugestao.email.trim().toLowerCase();
    const normalizedTelefone = normalizeDigits(corretorParceiroSugestao.telefone);
    const normalizedNome = corretorParceiroSugestao.nome.trim().toLowerCase();

    return !workspace.corretores.some((item) => {
      const sameEmail =
        normalizedEmail.length > 0 && (item.email?.trim().toLowerCase() ?? "") === normalizedEmail;
      const sameTelefone =
        normalizedTelefone.length > 0 && normalizeDigits(item.telefone ?? "") === normalizedTelefone;
      const sameNome =
        normalizedNome.length > 0 && item.nome.trim().toLowerCase() === normalizedNome;
      return sameEmail || sameTelefone || sameNome;
    });
  }, [workspace, corretorParceiroSugestao]);

  const corretoresEnvolvidos = useMemo(() => {
    if (!workspace) return [];
    if (workspace.corretores.length > 0) {
      return workspace.corretores.map((corretor) => ({
        nome: corretor.nome,
        email: corretor.email ?? "",
        telefone: corretor.telefone ?? "",
        tipo: corretor.vinculado_corretor_parceiro ? "Corretor parceiro" : "Divisão de comissão",
      }));
    }

    if (!workspace.imovel) return [];
    const nome = workspace.imovel.corretor_parceiro_nome?.trim() ?? "";
    const email = workspace.imovel.corretor_parceiro_email?.trim() ?? "";
    const telefone = workspace.imovel.corretor_parceiro_telefone?.trim() ?? "";
    if (!nome && !email && !telefone) return [];

    return [
      {
        nome,
        email,
        telefone,
        tipo: workspace.imovel.captacao_corretor_parceiro
          ? "Corretor parceiro (imóvel)"
          : "Corretor responsável (imóvel)",
      },
    ];
  }, [workspace]);

  const canCreateProposal = compradorPartes.length > 0 && vendedorPartes.length > 0;
  const hasAcceptedProposal = useMemo(
    () => workspace?.propostas.some((proposta) => proposta.status === "ACEITA") ?? false,
    [workspace?.propostas],
  );
  const selectedProposalDocument = useMemo(
    () =>
      proposalDocumentOpenId && workspace
        ? workspace.propostas.find((proposta) => proposta.id === proposalDocumentOpenId) ?? null
        : null,
    [proposalDocumentOpenId, workspace],
  );
  const selectedProposalDocumentId = selectedProposalDocument?.id ?? null;
  const selectedProposalDocumentMidiaId = selectedProposalDocument?.arquivo_midia_id ?? null;
  const selectedProposalPdfUrl =
    selectedProposalDocument ? proposalPdfUrls[selectedProposalDocument.id] ?? "" : "";
  const shouldCreatePessoaInWizard = parteWizardMode === "VINCULAR" || createParteWithPessoa || parteForm.tipo_pessoa === "FISICA";

  useEffect(() => {
    const proposalId = selectedProposalDocumentId;
    const arquivoMidiaId = selectedProposalDocumentMidiaId;

    if (!proposalId) return;
    if (!arquivoMidiaId) return;
    if (proposalPdfUrls[proposalId]) return;

    const resolvedProposalId = proposalId;
    let active = true;

    async function loadExistingProposalPdfUrl() {
      const result = await apiFetchWithAuth<{
        proposta_id: string;
        arquivo_midia_id: string | null;
        arquivo_url: string | null;
      }>(`/api/propostas/${proposalId}/documento`);

      if (!active || !result.ok || !result.data.arquivo_url) return;
      const arquivoUrl = result.data.arquivo_url;
      setProposalPdfUrls((current) => ({
        ...current,
        [resolvedProposalId]: arquivoUrl,
      }));
    }

    void loadExistingProposalPdfUrl();

    return () => {
      active = false;
    };
  }, [proposalPdfUrls, selectedProposalDocumentId, selectedProposalDocumentMidiaId]);

  const wizardSuggestedInfo = useMemo(() => {
    if (!workspace) return null;

    if (parteForm.papel === "COMPRADOR") {
      return {
        title: "Lead da oportunidade",
        ctaPrimary: "Vincular esse lead",
        ctaSecondary: "Cadastrar outro comprador",
        nome: workspace.lead.nome || "Lead sem nome",
        email: workspace.lead.email ?? "",
        telefone: workspace.lead.telefone ?? "",
        endereco:
          [
            workspace.lead.endereco,
            workspace.lead.numero,
            workspace.lead.bairro,
            workspace.lead.cidade && workspace.lead.uf
              ? `${workspace.lead.cidade}/${workspace.lead.uf}`
              : workspace.lead.cidade || workspace.lead.uf,
          ]
            .filter(Boolean)
            .join(" • ") || "",
        available: true,
        unavailableReason: "",
      };
    }

    const imovel = workspace.imovel;
    const nome = imovel?.corretor_parceiro_nome?.trim() ?? "";
    const email = imovel?.corretor_parceiro_email?.trim() ?? "";
    const telefone = imovel?.corretor_parceiro_telefone?.trim() ?? "";
    const endereco =
      [
        imovel?.logradouro,
        imovel?.numero,
        imovel?.bairro_comercial || imovel?.bairro,
        imovel ? `${imovel.cidade}/${imovel.estado}` : "",
      ]
        .filter(Boolean)
        .join(" • ") || "";

    let unavailableReason = "";
    if (!imovel) {
      unavailableReason = "Não há imóvel associado para sugerir proprietário.";
    } else if (imovel.captacao_corretor_parceiro) {
      unavailableReason = "Este imóvel está em captação por corretor parceiro. Sem dados de proprietário para vínculo.";
    } else if (!nome && !email && !telefone) {
      unavailableReason = "Preencha nome/e-mail/telefone do proprietário no imóvel para habilitar vínculo rápido.";
    }

    return {
      title: "Proprietário do imóvel",
      ctaPrimary: "Vincular esse proprietário",
      ctaSecondary: "Cadastrar outro vendedor",
      nome: nome || "Proprietário sem nome",
      email,
      telefone,
      endereco,
      available: unavailableReason.length === 0,
      unavailableReason,
    };
  }, [workspace, parteForm.papel]);

  function handleValueChange(nextValue: string) {
    if (!form) return;
    const parsedNextValue = parseCurrencyInput(nextValue);
    const currentAmounts = {
      recursoproprios_percentual: parseCurrencyInput(paymentAmountInputs.recursoproprios_percentual) ?? 0,
      financiamento_percentual: parseCurrencyInput(paymentAmountInputs.financiamento_percentual) ?? 0,
      fgts_percentual: parseCurrencyInput(paymentAmountInputs.fgts_percentual) ?? 0,
      outrosrecursos_percentual: parseCurrencyInput(paymentAmountInputs.outrosrecursos_percentual) ?? 0,
    };

    setForm((current) => (current ? { ...current, valor: nextValue.replace(/[^\d.]/g, "") ? formatCurrencyInput(parsedNextValue) : "" } : current));

    if (commissionEditedField === "amount") {
      const nextPercent =
        parsedNextValue && parsedNextValue > 0 && commissionValue != null
          ? formatPercentInput((commissionValue / parsedNextValue) * 100)
          : "";
      setForm((current) => (current ? { ...current, comissao_percentual: nextPercent } : current));
    } else {
      setCommissionAmountInput(
        parsedNextValue && commissionPercent > 0 ? formatCurrencyInput((parsedNextValue * commissionPercent) / 100) : "",
      );
    }

    if (!parsedNextValue || parsedNextValue <= 0) {
      setPaymentPercentInputs({
        recursoproprios_percentual: "",
        financiamento_percentual: "",
        fgts_percentual: "",
        outrosrecursos_percentual: "",
      });
      return;
    }

    setPaymentPercentInputs({
      recursoproprios_percentual: formatPercentInput((currentAmounts.recursoproprios_percentual / parsedNextValue) * 100),
      financiamento_percentual: formatPercentInput((currentAmounts.financiamento_percentual / parsedNextValue) * 100),
      fgts_percentual: formatPercentInput((currentAmounts.fgts_percentual / parsedNextValue) * 100),
      outrosrecursos_percentual: formatPercentInput((currentAmounts.outrosrecursos_percentual / parsedNextValue) * 100),
    });
  }

  function handleCommissionPercentChange(nextValue: string) {
    if (!form) return;
    const parsedPercent = parsePercentInput(nextValue);
    setCommissionEditedField("percent");
    setForm((current) => (current ? { ...current, comissao_percentual: nextValue.replace(/[^\d,.-]/g, "") } : current));
    setCommissionAmountInput(totalValue && parsedPercent > 0 ? formatCurrencyInput((totalValue * parsedPercent) / 100) : "");
  }

  function handleCommissionAmountChange(nextValue: string) {
    if (!form) return;
    const parsedAmount = parseCurrencyInput(nextValue);
    setCommissionEditedField("amount");
    setCommissionAmountInput(nextValue.replace(/[^\d.]/g, "") ? formatCurrencyInput(parsedAmount) : "");
    setForm((current) =>
      current
        ? {
            ...current,
            comissao_percentual:
              totalValue && totalValue > 0 && parsedAmount != null ? formatPercentInput((parsedAmount / totalValue) * 100) : "",
          }
        : current,
    );
  }

  function handlePaymentPercentChange(key: OpportunityPercentFieldKey, nextValue: string) {
    const parsedPercent = parsePercentInput(nextValue);
    setPaymentPercentInputs((current) => ({
      ...current,
      [key]: nextValue.replace(/[^\d,.-]/g, ""),
    }));
    setPaymentAmountInputs((current) => ({
      ...current,
      [key]: totalValue && parsedPercent > 0 ? formatCurrencyInput((totalValue * parsedPercent) / 100) : "",
    }));
  }

  function handlePaymentAmountChange(key: OpportunityPercentFieldKey, nextValue: string) {
    const parsedAmount = parseCurrencyInput(nextValue);
    setPaymentAmountInputs((current) => ({
      ...current,
      [key]: nextValue.replace(/[^\d.]/g, "") ? formatCurrencyInput(parsedAmount) : "",
    }));
    setPaymentPercentInputs((current) => ({
      ...current,
      [key]: totalValue && totalValue > 0 && parsedAmount != null ? formatPercentInput((parsedAmount / totalValue) * 100) : "",
    }));
  }

  function handleProposalValueChange(nextValue: string) {
    const parsed = parseCurrencyInput(nextValue);
    setProposalForm((current) => ({
      ...current,
      valor: nextValue.replace(/[^\d.]/g, "") ? formatCurrencyInput(parsed) : "",
    }));
  }

  async function handleCreateProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !form) return;
    if (!canCreateProposal) {
      pushToast("warning", "Cadastre ao menos um comprador e um vendedor para gerar a proposta.");
      return;
    }

    const proposalTitle = proposalForm.titulo.trim();
    if (!proposalTitle) {
      pushToast("warning", "Informe um título para a proposta.");
      return;
    }

    const proposalType = proposalForm.tipo;
    const proposalValue = parseCurrencyInput(proposalForm.valor);
    const negotiationValue = parseCurrencyInput(form.valor);
    const resolvedProposalValue = proposalValue ?? negotiationValue;
    const proposalDueDateIso = parseDateInputToIso(proposalForm.vencimento_em);
    const proposalContent = {
      oportunidade: {
        titulo: form.titulo.trim() || workspace.negocio.titulo || null,
        valor: negotiationValue,
        comissao_percentual: parsePercentInput(form.comissao_percentual),
        comissao_valor: commissionValue,
        observacoes: form.observacoes.trim() || null,
      },
      partes: workspace.partes.map((parte) => ({
        papel: parte.papel,
        tipo_pessoa: parte.tipo_pessoa,
        identificacao: parte.razao_social || parte.pessoas[0]?.nome_completo || null,
        pessoas: parte.pessoas.map((pessoa) => ({
          nome_completo: pessoa.nome_completo,
          email: pessoa.email,
          cpf: pessoa.cpf,
        })),
      })),
    };

    setCreatingProposal(true);
    const result = await apiFetchWithAuth<{ id: string }>("/api/propostas", {
      method: "POST",
      body: JSON.stringify({
        lead_id: workspace.lead.id,
        negocio_id: workspace.negocio.id,
        titulo: proposalTitle,
        tipo: proposalType,
        valor: resolvedProposalValue,
        conteudo: proposalContent,
        vencimento_em: proposalDueDateIso,
      }),
    });
    setCreatingProposal(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    const nowIso = new Date().toISOString();
    setWorkspace((current) => {
      if (!current) return current;

      const created: NegocioWorkspace["propostas"][number] = {
        id: result.data.id,
        owner_id: current.negocio.owner_id,
        lead_id: current.lead.id,
        negocio_id: current.negocio.id,
        titulo: proposalTitle,
        tipo: proposalType,
        status: "RASCUNHO",
        valor: resolvedProposalValue,
        conteudo: proposalContent,
        arquivo_midia_id: null,
        enviada_em: null,
        vencimento_em: proposalDueDateIso,
        created_at: nowIso,
        updated_at: nowIso,
      };

      return {
        ...current,
        propostas: [created, ...current.propostas],
      };
    });

    setProposalForm(INITIAL_PROPOSAL_FORM);
    setProposalFormOpen(false);
    pushToast("success", "Proposta criada e vinculada à oportunidade.");
  }

  async function handleGenerateProposalPdf(propostaId: string) {
    if (!workspace) return;

    setGeneratingProposalPdfId(propostaId);
    const result = await apiFetchWithAuth<{
      proposta_id: string;
      arquivo_midia_id: string;
      arquivo_url: string;
      conteudo: NegocioWorkspace["propostas"][number]["conteudo"];
      generated_at: string;
    }>(`/api/propostas/${propostaId}/documento`, {
      method: "POST",
    });
    setGeneratingProposalPdfId(null);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setProposalPdfUrls((current) => ({
      ...current,
      [propostaId]: result.data.arquivo_url,
    }));
    setWorkspace((current) =>
      current
        ? {
            ...current,
            propostas: current.propostas.map((item) =>
              item.id === propostaId
                ? {
                    ...item,
                    arquivo_midia_id: result.data.arquivo_midia_id,
                    conteudo: result.data.conteudo,
                    updated_at: result.data.generated_at,
                  }
                : item,
            ),
          }
        : current,
    );

    window.open(result.data.arquivo_url, "_blank", "noopener,noreferrer");
    pushToast("success", "PDF da proposta gerado com sucesso.");
  }

  async function handleAdvanceToJuridico(withSimpleApproval: boolean) {
    if (!workspace || !form) return;
    if (!withSimpleApproval && !hasAcceptedProposal) {
      pushToast("warning", "A oportunidade precisa de uma proposta aceita para avançar automaticamente.");
      return;
    }

    if (withSimpleApproval) {
      const confirmed = window.confirm(
        "Avançar para Jurídico com aprovação simples, mesmo sem proposta aceita?",
      );
      if (!confirmed) return;
    }

    setSavingJuridico(true);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/negocios/${negocioId}`, {
      method: "PATCH",
      body: JSON.stringify({
        fase: "JURIDICO",
        subfase_juridica: form.subfase_juridica || null,
      }),
    });
    setSavingJuridico(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    const nowIso = new Date().toISOString();
    setForm((current) => (current ? { ...current, fase: "JURIDICO" } : current));
    setWorkspace((current) =>
      current
        ? {
            ...current,
            negocio: {
              ...current.negocio,
              fase: "JURIDICO",
              subfase_juridica: form.subfase_juridica || null,
              updated_at: nowIso,
            },
          }
        : current,
    );
    pushToast("success", withSimpleApproval ? "Oportunidade avançou para Jurídico por aprovação simples." : "Oportunidade avançou para Jurídico.");
  }

  async function handleSaveJuridico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !form) return;
    if (form.fase !== "JURIDICO") {
      pushToast("warning", "A oportunidade precisa estar na fase Jurídico para salvar subfases.");
      return;
    }

    setSavingJuridico(true);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/negocios/${negocioId}`, {
      method: "PATCH",
      body: JSON.stringify({
        fase: "JURIDICO",
        subfase_juridica: form.subfase_juridica || null,
      }),
    });
    setSavingJuridico(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    const nowIso = new Date().toISOString();
    setWorkspace((current) =>
      current
        ? {
            ...current,
            negocio: {
              ...current.negocio,
              fase: "JURIDICO",
              subfase_juridica: form.subfase_juridica || null,
              updated_at: nowIso,
            },
          }
        : current,
    );
    pushToast("success", "Dados do Jurídico atualizados.");
  }

function asTrimmedOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstNonEmptyText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }

  return "";
}

  function buildPartePayload(source: OpportunityParteFormState) {
    const tipoPessoa = source.tipo_pessoa;
    return {
      papel: source.papel,
      tipo_pessoa: tipoPessoa,
      razao_social: tipoPessoa === "JURIDICA" ? asTrimmedOrNull(source.razao_social) : null,
      cnpj: tipoPessoa === "JURIDICA" ? asTrimmedOrNull(source.cnpj) : null,
      cep: asTrimmedOrNull(source.cep),
      endereco: asTrimmedOrNull(source.endereco),
      numero: asTrimmedOrNull(source.numero),
      complemento: asTrimmedOrNull(source.complemento),
      bairro: asTrimmedOrNull(source.bairro),
      cidade: asTrimmedOrNull(source.cidade),
      uf: asTrimmedOrNull(source.uf),
      pais: asTrimmedOrNull(source.pais),
    };
  }

  function validatePessoaForm(source: OpportunityPartePessoaFormState) {
    if (!source.nome_completo.trim()) return "Nome completo é obrigatório.";
    if (!source.email.trim()) return "E-mail é obrigatório.";
    if (!source.telefone.trim()) return "Telefone é obrigatório.";
    if (!source.cpf.trim()) return "CPF é obrigatório.";
    if (!isValidCpf(source.cpf)) return "CPF inválido.";
    if (!source.cep.trim()) return "CEP é obrigatório.";
    if (!source.endereco.trim()) return "Endereço é obrigatório.";
    if (!source.numero.trim()) return "Número é obrigatório.";
    if (!source.bairro.trim()) return "Bairro é obrigatório.";
    if (!source.cidade.trim()) return "Cidade é obrigatória.";
    if (!source.uf.trim()) return "UF é obrigatória.";
    if (!source.pais.trim()) return "País é obrigatório.";
    return null;
  }

  function buildPessoaPayload(source: OpportunityPartePessoaFormState) {
    return {
      nome_completo: source.nome_completo.trim(),
      email: source.email.trim(),
      telefone: source.telefone.trim(),
      cpf: normalizeDigits(source.cpf, 11),
      cep: source.cep.trim(),
      endereco: source.endereco.trim(),
      numero: source.numero.trim(),
      complemento: asTrimmedOrNull(source.complemento),
      bairro: source.bairro.trim(),
      cidade: source.cidade.trim(),
      uf: source.uf.trim(),
      pais: source.pais.trim(),
    };
  }

  function validateCorretorForm(source: OpportunityCorretorFormState) {
    if (!source.nome.trim()) return "Nome do corretor é obrigatório.";

    if (source.percentual_comissao.trim()) {
      const percentual = parsePercentInput(source.percentual_comissao);
      if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) {
        return "Percentual da comissão deve estar entre 0,01 e 100.";
      }
    }

    if (source.valor_comissao.trim()) {
      const valor = parseCurrencyInput(source.valor_comissao);
      if (valor == null || valor < 0) return "Valor da comissão é inválido.";
    }

    return null;
  }

  function buildCorretorPayload(source: OpportunityCorretorFormState) {
    const percentual = source.percentual_comissao.trim() ? parsePercentInput(source.percentual_comissao) : null;
    const valor = source.valor_comissao.trim() ? parseCurrencyInput(source.valor_comissao) : null;

    return {
      nome: source.nome.trim(),
      email: asTrimmedOrNull(source.email),
      telefone: asTrimmedOrNull(source.telefone),
      percentual_comissao: percentual != null && percentual > 0 ? percentual : null,
      valor_comissao: valor != null && valor > 0 ? valor : null,
      vinculado_corretor_parceiro: source.vinculado_corretor_parceiro,
    };
  }

  async function handleCreateCorretor() {
    if (!workspace) return;

    const validationError = validateCorretorForm(addingCorretorForm);
    if (validationError) {
      pushToast("warning", validationError);
      return;
    }

    setSavingCorretorCreate(true);
    const result = await apiFetchWithAuth<OpportunityCorretor>(`/api/negocios/${negocioId}/corretores`, {
      method: "POST",
      body: JSON.stringify(buildCorretorPayload(addingCorretorForm)),
    });
    setSavingCorretorCreate(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            corretores: [...current.corretores, result.data],
          }
        : current,
    );
    setAddingCorretorOpen(false);
    setAddingCorretorForm(INITIAL_CORRETOR_FORM);
    pushToast("success", "Corretor adicionado à divisão de comissão.");
  }

  async function handleUpdateCorretor() {
    if (!editingCorretorId) return;

    const validationError = validateCorretorForm(editingCorretorForm);
    if (validationError) {
      pushToast("warning", validationError);
      return;
    }

    setSavingCorretorEdit(true);
    const result = await apiFetchWithAuth<OpportunityCorretor>(
      `/api/negocios/${negocioId}/corretores/${editingCorretorId}`,
      {
        method: "PATCH",
        body: JSON.stringify(buildCorretorPayload(editingCorretorForm)),
      },
    );
    setSavingCorretorEdit(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            corretores: current.corretores.map((item) => (item.id === editingCorretorId ? result.data : item)),
          }
        : current,
    );
    setEditingCorretorId(null);
    setEditingCorretorForm(INITIAL_CORRETOR_FORM);
    pushToast("success", "Corretor atualizado.");
  }

  async function handleDeleteCorretor(corretorId: string) {
    if (!window.confirm("Deseja remover este corretor da divisão de comissão?")) return;
    setDeletingCorretorId(corretorId);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/negocios/${negocioId}/corretores/${corretorId}`, {
      method: "DELETE",
    });
    setDeletingCorretorId(null);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            corretores: current.corretores.filter((item) => item.id !== corretorId),
          }
        : current,
    );
    if (editingCorretorId === corretorId) {
      setEditingCorretorId(null);
      setEditingCorretorForm(INITIAL_CORRETOR_FORM);
    }
    pushToast("success", "Corretor removido.");
  }

  async function handleLinkPartnerCorretor() {
    if (!corretorParceiroSugestao) {
      pushToast("warning", "Não encontramos dados do corretor parceiro no imóvel.");
      return;
    }
    if (!canSuggestPartnerCorretor) {
      pushToast("warning", "Corretor parceiro já está vinculado na divisão de comissão.");
      return;
    }

    setSavingCorretorCreate(true);
    const result = await apiFetchWithAuth<OpportunityCorretor>(`/api/negocios/${negocioId}/corretores`, {
      method: "POST",
      body: JSON.stringify({
        nome: corretorParceiroSugestao.nome,
        email: corretorParceiroSugestao.email || null,
        telefone: corretorParceiroSugestao.telefone || null,
        percentual_comissao: null,
        valor_comissao: null,
        vinculado_corretor_parceiro: true,
      }),
    });
    setSavingCorretorCreate(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            corretores: [...current.corretores, result.data],
          }
        : current,
    );
    pushToast("success", "Corretor parceiro vinculado na comissão.");
  }

  function buildLeadPartePrefill(): Partial<OpportunityParteFormState> | null {
    if (!workspace) return null;
    return {
      cep: workspace.lead.cep ?? "",
      endereco: workspace.lead.endereco ?? "",
      numero: workspace.lead.numero ?? "",
      complemento: workspace.lead.complemento ?? "",
      bairro: workspace.lead.bairro ?? "",
      cidade: workspace.lead.cidade ?? "",
      uf: workspace.lead.uf ?? "",
      pais: workspace.lead.pais ?? "Brasil",
    };
  }

  function buildImovelProprietarioPartePrefill(): Partial<OpportunityParteFormState> | null {
    if (!workspace?.imovel) return null;
    return {
      cep: "",
      endereco: firstNonEmptyText(workspace.imovel.logradouro),
      numero: firstNonEmptyText(workspace.imovel.numero),
      complemento: "",
      bairro: firstNonEmptyText(workspace.imovel.bairro_comercial, workspace.imovel.bairro),
      cidade: firstNonEmptyText(workspace.imovel.cidade),
      uf: firstNonEmptyText(workspace.imovel.estado),
      pais: "Brasil",
    };
  }

  function buildLeadPessoaPrefill(): Partial<OpportunityPartePessoaFormState> | null {
    if (!workspace) return null;
    return {
      nome_completo: workspace.lead.nome,
      email: workspace.lead.email ?? "",
      telefone: workspace.lead.telefone ?? "",
      cep: workspace.lead.cep ?? "",
      endereco: workspace.lead.endereco ?? "",
      numero: workspace.lead.numero ?? "",
      complemento: workspace.lead.complemento ?? "",
      bairro: workspace.lead.bairro ?? "",
      cidade: workspace.lead.cidade ?? "",
      uf: workspace.lead.uf ?? "",
      pais: workspace.lead.pais ?? "Brasil",
    };
  }

  function buildImovelProprietarioPrefill(): Partial<OpportunityPartePessoaFormState> | null {
    if (!workspace?.imovel) return null;
    if (workspace.imovel.captacao_corretor_parceiro) return null;

    const nome = workspace.imovel.corretor_parceiro_nome?.trim() ?? "";
    const email = workspace.imovel.corretor_parceiro_email?.trim() ?? "";
    const telefone = workspace.imovel.corretor_parceiro_telefone?.trim() ?? "";
    if (!nome && !email && !telefone) return null;

    return {
      nome_completo: nome,
      email,
      telefone,
      cep: "",
      endereco: firstNonEmptyText(workspace.imovel.logradouro),
      numero: firstNonEmptyText(workspace.imovel.numero),
      complemento: "",
      bairro: firstNonEmptyText(workspace.imovel.bairro_comercial, workspace.imovel.bairro),
      cidade: firstNonEmptyText(workspace.imovel.cidade),
      uf: firstNonEmptyText(workspace.imovel.estado),
      pais: "Brasil",
    };
  }

  function applyLeadPrefillToPessoa(setter: (value: OpportunityPartePessoaFormState) => void) {
    const prefill = buildLeadPessoaPrefill();
    if (!prefill) {
      pushToast("warning", "Não foi possível carregar dados do lead para preencher.");
      return;
    }

    setter({
      ...INITIAL_PARTE_PESSOA_FORM,
      ...prefill,
      cpf: "",
    });
    setPartePessoaCpfTouched(false);
  }

  function openParteWizard(papel: OpportunityParte["papel"]) {
    setParteForm({
      ...INITIAL_PARTE_FORM,
      papel,
    });
    setPartePessoaForm(INITIAL_PARTE_PESSOA_FORM);
    setPartePessoaCpfTouched(false);
    setCreateParteWithPessoa(true);
    setParteWizardMode("VINCULAR");
    setParteWizardStep(1);
    setParteFormOpen(true);
    setEditingParteId(null);
  }

  function closeParteWizard() {
    setParteFormOpen(false);
    setParteWizardStep(1);
    setParteWizardMode("CADASTRAR");
    setParteForm(INITIAL_PARTE_FORM);
    setPartePessoaForm(INITIAL_PARTE_PESSOA_FORM);
    setPartePessoaCpfTouched(false);
    setCreateParteWithPessoa(true);
  }

  function applyWizardVinculacaoPrefill() {
    const partePrefill =
      parteForm.papel === "COMPRADOR" ? buildLeadPartePrefill() : buildImovelProprietarioPartePrefill();
    const pessoaPrefill =
      parteForm.papel === "COMPRADOR" ? buildLeadPessoaPrefill() : buildImovelProprietarioPrefill();

    if (!partePrefill && !pessoaPrefill) {
      pushToast("warning", "Não encontramos dados base para vinculação automática.");
      return;
    }

    setParteForm((current) => ({
      ...current,
      ...(partePrefill ?? {}),
      tipo_pessoa: "FISICA",
      razao_social: "",
      cnpj: "",
    }));
    setPartePessoaForm({
      ...INITIAL_PARTE_PESSOA_FORM,
      ...(pessoaPrefill ?? {}),
      cpf: "",
    });
    setPartePessoaCpfTouched(false);
  }

  function startWizardSuggestedLink() {
    if (!wizardSuggestedInfo?.available) {
      pushToast(
        "warning",
        wizardSuggestedInfo?.unavailableReason || "Não foi possível usar os dados sugeridos para vínculo.",
      );
      return;
    }

    setParteWizardMode("VINCULAR");
    setCreateParteWithPessoa(true);
    applyWizardVinculacaoPrefill();
    setParteWizardStep(3);
  }

  function startWizardManualCadastro() {
    setParteWizardMode("CADASTRAR");
    setParteForm((current) => ({
      ...INITIAL_PARTE_FORM,
      papel: current.papel,
    }));
    setPartePessoaForm(INITIAL_PARTE_PESSOA_FORM);
    setPartePessoaCpfTouched(false);
    setCreateParteWithPessoa(true);
    setParteWizardStep(2);
  }

  function applyProprietarioPrefillToPessoa(setter: (value: OpportunityPartePessoaFormState) => void) {
    const prefill = buildImovelProprietarioPrefill();
    if (!prefill) {
      const isCaptacaoParceiro = workspace?.imovel?.captacao_corretor_parceiro === true;
      pushToast(
        "warning",
        isCaptacaoParceiro
          ? "Este imóvel está com captação por corretor parceiro. Não há dados do proprietário para prefill."
          : "Não encontramos dados do proprietário do imóvel para preencher.",
      );
      return;
    }

    setter({
      ...INITIAL_PARTE_PESSOA_FORM,
      ...prefill,
      cpf: "",
    });
    setPartePessoaCpfTouched(false);
  }

  async function handleCreateParte(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;

    const payload = buildPartePayload(parteForm);
    if (parteForm.tipo_pessoa === "JURIDICA" && (!payload.razao_social || !payload.cnpj)) {
      pushToast("warning", "Para pessoa jurídica, informe razão social e CNPJ.");
      return;
    }

    const shouldCreatePessoa = shouldCreatePessoaInWizard;
    if (shouldCreatePessoa) {
      const pessoaError = validatePessoaForm(partePessoaForm);
      if (pessoaError) {
        if (pessoaError === "CPF inválido.") {
          setPartePessoaCpfTouched(true);
        }
        pushToast("warning", pessoaError);
        return;
      }
    }

    setSavingParte(true);
    const parteResult = await apiFetchWithAuth<OpportunityParte>(`/api/negocios/${negocioId}/partes`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!parteResult.ok) {
      setSavingParte(false);
      pushToast("error", parteResult.error, 4200);
      return;
    }

    let createdPessoa: OpportunityPartePessoa | null = null;
    if (shouldCreatePessoa) {
      const pessoaResult = await apiFetchWithAuth<OpportunityPartePessoa>(
        `/api/negocios/${negocioId}/partes/${parteResult.data.id}/pessoas`,
        {
          method: "POST",
          body: JSON.stringify(buildPessoaPayload(partePessoaForm)),
        },
      );
      if (!pessoaResult.ok) {
        await apiFetchWithAuth<{ id: string }>(`/api/negocios/${negocioId}/partes/${parteResult.data.id}`, {
          method: "DELETE",
        });
        setSavingParte(false);
        pushToast("error", "Não foi possível cadastrar a pessoa vinculada. A criação da parte foi desfeita.", 4200);
        return;
      }
      createdPessoa = pessoaResult.data;
    }

    setSavingParte(false);
    setWorkspace((current) =>
      current
        ? {
            ...current,
            partes: [
              ...current.partes,
              {
                ...parteResult.data,
                pessoas: createdPessoa ? [createdPessoa] : [],
              },
            ],
          }
        : current,
    );
    setParteForm(INITIAL_PARTE_FORM);
    setPartePessoaForm(INITIAL_PARTE_PESSOA_FORM);
    setPartePessoaCpfTouched(false);
    setCreateParteWithPessoa(true);
    setParteWizardStep(1);
    setParteWizardMode("CADASTRAR");
    setParteFormOpen(false);
    pushToast("success", "Parte cadastrada na oportunidade.");
  }

  async function handleUpdateParte(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingParteId) return;

    const payload = buildPartePayload(editingParteForm);
    if (editingParteForm.tipo_pessoa === "JURIDICA" && (!payload.razao_social || !payload.cnpj)) {
      pushToast("warning", "Para pessoa jurídica, informe razão social e CNPJ.");
      return;
    }

    setSavingParteEdit(true);
    const result = await apiFetchWithAuth<OpportunityParte>(`/api/negocios/${negocioId}/partes/${editingParteId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setSavingParteEdit(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            partes: current.partes.map((item) =>
              item.id === editingParteId
                ? {
                    ...item,
                    ...result.data,
                  }
                : item,
            ),
          }
        : current,
    );
    setEditingParteId(null);
    setEditingParteForm(INITIAL_PARTE_FORM);
    pushToast("success", "Parte atualizada.");
  }

  async function handleDeleteParte(parteId: string) {
    if (!window.confirm("Deseja remover esta parte da oportunidade?")) return;
    setDeletingParteId(parteId);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/negocios/${negocioId}/partes/${parteId}`, {
      method: "DELETE",
    });
    setDeletingParteId(null);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            partes: current.partes.filter((item) => item.id !== parteId),
          }
        : current,
    );
    pushToast("success", "Parte removida.");
  }

  function openAddPessoaForm(parte: OpportunityParte) {
    const maybePrefill = parte.papel === "COMPRADOR" ? buildLeadPessoaPrefill() : buildImovelProprietarioPrefill();
    setAddingPessoaForm({
      ...INITIAL_PARTE_PESSOA_FORM,
      ...(maybePrefill ?? {}),
      cpf: "",
    });
    setAddingPessoaParteId(parte.id);
  }

  async function handleCreatePessoa(event: FormEvent<HTMLFormElement>, parteId: string) {
    event.preventDefault();
    const validationError = validatePessoaForm(addingPessoaForm);
    if (validationError) {
      pushToast("warning", validationError);
      return;
    }

    setSavingPessoaCreate(true);
    const result = await apiFetchWithAuth<OpportunityPartePessoa>(`/api/negocios/${negocioId}/partes/${parteId}/pessoas`, {
      method: "POST",
      body: JSON.stringify(buildPessoaPayload(addingPessoaForm)),
    });
    setSavingPessoaCreate(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            partes: current.partes.map((item) =>
              item.id === parteId
                ? {
                    ...item,
                    pessoas: [...item.pessoas, result.data],
                  }
                : item,
            ),
          }
        : current,
    );
    setAddingPessoaParteId(null);
    setAddingPessoaForm(INITIAL_PARTE_PESSOA_FORM);
    pushToast("success", "Pessoa vinculada à parte.");
  }

  async function handleUpdatePessoa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPessoaRef) return;

    const validationError = validatePessoaForm(editingPessoaForm);
    if (validationError) {
      pushToast("warning", validationError);
      return;
    }

    setSavingPessoaEdit(true);
    const result = await apiFetchWithAuth<OpportunityPartePessoa>(
      `/api/negocios/${negocioId}/partes/${editingPessoaRef.parteId}/pessoas/${editingPessoaRef.pessoaId}`,
      {
        method: "PATCH",
        body: JSON.stringify(buildPessoaPayload(editingPessoaForm)),
      },
    );
    setSavingPessoaEdit(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            partes: current.partes.map((parte) =>
              parte.id === editingPessoaRef.parteId
                ? {
                    ...parte,
                    pessoas: parte.pessoas.map((pessoa) =>
                      pessoa.id === editingPessoaRef.pessoaId ? result.data : pessoa,
                    ),
                  }
                : parte,
            ),
          }
        : current,
    );
    setEditingPessoaRef(null);
    setEditingPessoaForm(INITIAL_PARTE_PESSOA_FORM);
    pushToast("success", "Pessoa atualizada.");
  }

  async function handleDeletePessoa(parteId: string, pessoaId: string) {
    if (!window.confirm("Deseja remover esta pessoa da parte?")) return;
    setDeletingPessoaRef({ parteId, pessoaId });

    const result = await apiFetchWithAuth<{ id: string }>(
      `/api/negocios/${negocioId}/partes/${parteId}/pessoas/${pessoaId}`,
      {
        method: "DELETE",
      },
    );
    setDeletingPessoaRef(null);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            partes: current.partes.map((parte) =>
              parte.id === parteId
                ? {
                    ...parte,
                    pessoas: parte.pessoas.filter((pessoa) => pessoa.id !== pessoaId),
                  }
                : parte,
            ),
          }
        : current,
    );
    pushToast("success", "Pessoa removida da parte.");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !form) return;

    const nextTotal = parseCurrencyInput(form.valor);
    if (workspace.negocio.modalidade === "VENDA" && nextTotal != null && !paymentSummary.isComplete) {
      pushToast("warning", "A composição financeira precisa fechar exatamente 100% do valor.");
      return;
    }

    setSaving(true);

    const nextFase = form.fase;
    const nowIso = new Date().toISOString();
    const payload = {
      titulo: form.titulo.trim() || null,
      fase: nextFase,
      subfase_juridica: nextFase === "JURIDICO" ? (form.subfase_juridica || null) : null,
      valor: nextTotal,
      comissaopercentual: commissionPercent > 0 ? commissionPercent : null,
      comissaovalor: commissionValue ?? null,
      recursopropriovalor: paymentSummary.values.recursoproprios,
      financiamentovalor: paymentSummary.values.financiamento,
      fgtsvalor: paymentSummary.values.fgts,
      outrosrecursosvalor: paymentSummary.values.outrosrecursos,
      observacoes: form.observacoes.trim() || null,
      ganho_em: nextFase === "GANHO" ? (workspace.negocio.ganho_em ?? nowIso) : null,
      perdido_em: nextFase === "PERDIDO" ? (workspace.negocio.perdido_em ?? nowIso) : null,
    };

    const result = await apiFetchWithAuth<{ id: string }>(`/api/negocios/${negocioId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!result.ok) {
      pushToast("error", result.error, 4200);
      return;
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            negocio: {
              ...current.negocio,
              ...payload,
              updated_at: nowIso,
              subfase_juridica: payload.subfase_juridica,
            },
          }
        : current,
    );
    pushToast("success", "Oportunidade atualizada.");
  }

  if (loading) {
    return (
      <AppShell title="Oportunidade" subtitle="Carregando negociação...">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm text-slate-500">Carregando oportunidade...</div>
      </AppShell>
    );
  }

  if (error || !workspace || !form) {
    return (
      <AppShell title="Oportunidade" subtitle="Não foi possível carregar a negociação.">
        <div className="rounded-[32px] border border-rose-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-rose-700">{error ?? "A oportunidade não foi encontrada."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Tentar novamente
            </button>
            <Link
              href="/negocios"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Voltar para negócios
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const opportunityTitle = form.titulo.trim() || workspace.negocio.titulo?.trim() || "Oportunidade sem título";

  return (
    <AppShell
      title="Workspace da Oportunidade"
      subtitle="Negociação, jurídico, atividades e timeline em uma página dedicada."
      mainClassName="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm"
      rightSlot={
        <div className="flex items-center gap-2">
          <Link
            href={`/lead/${workspace.lead.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Voltar para lead
            <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            onClick={() => router.push("/negocios")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Voltar para negócios
          </button>
        </div>
      }
    >
      <FloatingToastViewport items={toasts} />

      <section className="overflow-hidden bg-white">
        <div className="px-6 pb-5 pt-6 md:px-8 md:pb-6 md:pt-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Funil da oportunidade</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">Próximos caminhos da negociação</h2>
          </div>

          <div className="mt-6 overflow-x-auto pb-1">
            <div className="relative min-w-[760px] md:min-w-0">
              <div className="absolute left-[9%] right-[9%] top-14 h-[3px] rounded-full bg-[linear-gradient(90deg,rgba(148,163,184,0.16),rgba(148,163,184,0.48),rgba(148,163,184,0.16))]" />
              <div className="grid grid-cols-4 gap-8">
                {OPPORTUNITY_PHASE_TRACK.map((step) => {
                  const Icon = step.icon;
                  const active = form.fase === step.key;
                  const styles = getPhaseTrackNodeClass(step.accent, active);

                  return (
                    <div key={step.key} className={`relative rounded-[26px] px-2 py-4 transition ${styles.card}`}>
                      <div className="flex flex-col items-center text-center">
                        <span className={`relative z-10 inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full border ${styles.iconWrap}`}>
                          <Icon size={34} weight={active ? "fill" : "regular"} />
                        </span>
                        <p className={`mb-[3px] mt-4 text-[1.5rem] font-semibold tracking-[-0.05em] leading-[1.5rem] ${styles.title}`}>{step.label}</p>
                        <p className={`max-w-[16rem] text-[0.8rem] leading-5 ${styles.description}`}>{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-7 pt-5 md:px-8 md:pb-8 md:pt-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-900">{opportunityTitle}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {NEGOCIO_MODALIDADE_LABEL[workspace.negocio.modalidade]}
                </span>
                <span className="inline-flex items-center gap-2">
                  <User size={16} />
                  {workspace.lead.nome}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarBlank size={16} />
                  Criada em {formatDate(workspace.negocio.created_at, "datetime")}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarBlank size={16} />
                  Atualizada em {formatDate(workspace.negocio.updated_at, "datetime")}
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/88 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {typeof totalValue === "number" ? formatCurrency(totalValue) : "Sem valor"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Comissão</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {commissionValue != null && commissionValue > 0 ? formatCurrency(commissionValue) : "Não definida"}
                  </p>
                  {commissionPercent > 0 ? <p className="mt-1 text-xs text-slate-500">{formatPercentInput(commissionPercent)}%</p> : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Composição</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{paymentCompositionSummary}</p>
                  {!paymentSummary.isComplete ? (
                    <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCompletionClass(paymentSummary.isComplete)}`}>
                      {`${formatPercentInput(Math.abs(paymentSummary.remainingPercent))}% ${paymentSummary.remainingPercent > 0 ? "faltando" : "acima"}`}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Partes</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{workspace.partes.length}</p>
                  <p className="mt-1 text-xs text-slate-500">cadastros vinculados</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-y border-slate-200/70 bg-white px-6 pt-4 md:px-8">
          <div className="flex flex-wrap items-end gap-2">
            {[
              {
                key: "negociacao" as const,
                label: "Negociação",
                icon: House,
                meta: "dados e financeiro",
                accent: "sky" as const,
              },
              {
                key: "juridico" as const,
                label: "Jurídico",
                icon: Scales,
                meta:
                  form.fase === "JURIDICO"
                    ? form.subfase_juridica
                      ? SUBFASE_JURIDICA_LABEL[form.subfase_juridica]
                      : "Em andamento"
                    : "Aguardando avanço",
                accent: "violet" as const,
              },
              {
                key: "atividades" as const,
                label: "Atividades",
                icon: Briefcase,
                meta: `${workspace.atividades.length} registro(s)`,
                accent: "emerald" as const,
              },
              {
                key: "timeline" as const,
                label: "Timeline",
                icon: FileText,
                meta: `${workspace.timeline.length} evento(s)`,
                accent: "amber" as const,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              const activeClassName =
                tab.accent === "sky"
                  ? "border-sky-200 border-b-white bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(224,242,254,0.88))] text-sky-700 shadow-[0_18px_34px_rgba(14,165,233,0.12)]"
                  : tab.accent === "violet"
                    ? "border-violet-200 border-b-white bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(237,233,254,0.88))] text-violet-700 shadow-[0_18px_34px_rgba(124,58,237,0.12)]"
                    : tab.accent === "amber"
                      ? "border-amber-200 border-b-white bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.88))] text-amber-700 shadow-[0_18px_34px_rgba(245,158,11,0.12)]"
                      : "border-emerald-200 border-b-white bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.88))] text-emerald-700 shadow-[0_18px_34px_rgba(16,185,129,0.12)]";

              const iconClassName =
                tab.accent === "sky"
                  ? active
                    ? "border-sky-200 bg-sky-50 text-sky-600"
                    : "border-slate-200 bg-white text-slate-400"
                  : tab.accent === "violet"
                    ? active
                      ? "border-violet-200 bg-violet-50 text-violet-600"
                      : "border-slate-200 bg-white text-slate-400"
                    : tab.accent === "amber"
                      ? active
                        ? "border-amber-200 bg-amber-50 text-amber-600"
                        : "border-slate-200 bg-white text-slate-400"
                      : active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-white text-slate-400";

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    if (tab.key !== "negociacao" && proposalFormOpen) {
                      setProposalFormOpen(false);
                      setProposalForm(INITIAL_PROPOSAL_FORM);
                    }
                    setActiveTab(tab.key);
                  }}
                  className={`relative -mb-px inline-flex items-center gap-3 rounded-t-[22px] border px-4 py-3 text-left transition md:px-5 ${
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
                    <span className="mt-1 block text-[11px] font-medium text-slate-500">{tab.meta}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white px-6 py-6 xl:px-8">
          {activeTab === "negociacao" ? (
            <div className="grid gap-6">
              <div className="grid gap-6">
                <form onSubmit={handleSave} className="grid gap-6">
                  <section className="rounded-[30px] border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Card 1 • Detalhes</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Detalhes da negociação</h2>
                      </div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--primary-scarlet)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Salvando..." : "Salvar oportunidade"}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Lead associado</p>
                          <div className="mt-3 space-y-1 text-sm text-slate-600">
                            <p className="font-semibold text-slate-900">{workspace.lead.nome}</p>
                            <p>{workspace.lead.email || "Sem e-mail"}</p>
                            <p>{workspace.lead.telefone || "Sem telefone"}</p>
                            <p>
                              {[
                                workspace.lead.endereco,
                                workspace.lead.numero,
                                workspace.lead.bairro,
                                workspace.lead.cidade && workspace.lead.uf
                                  ? `${workspace.lead.cidade}/${workspace.lead.uf}`
                                  : workspace.lead.cidade || workspace.lead.uf,
                              ]
                                .filter(Boolean)
                                .join(" • ") || "Sem endereço"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Imóvel associado</p>
                          {workspace.imovel ? (
                            <div className="mt-3 space-y-1 text-sm text-slate-600">
                              <p className="font-semibold text-slate-900">{workspace.imovel.headline}</p>
                              <p>{workspace.imovel.codigo ? `Código ${workspace.imovel.codigo}` : "Sem código"}</p>
                              <p>
                                {[
                                  workspace.imovel.logradouro,
                                  workspace.imovel.numero,
                                  workspace.imovel.bairro_comercial || workspace.imovel.bairro,
                                  `${workspace.imovel.cidade}/${workspace.imovel.estado}`,
                                ]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-slate-500">Nenhum imóvel associado.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-slate-700">Título</span>
                        <input
                          value={form.titulo}
                          onChange={(event) =>
                            setForm((current) => (current ? { ...current, titulo: event.target.value } : current))
                          }
                          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                          placeholder="Ex.: Negociação do apartamento em Santana"
                        />
                      </label>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-slate-700">Valor da oportunidade</span>
                          <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-[var(--blue-slate)] focus-within:bg-white">
                            <span className="mr-3 text-sm font-semibold text-slate-500">R$</span>
                            <input
                              value={form.valor}
                              onChange={(event) => handleValueChange(event.target.value)}
                              className={buildMoneyInputClass()}
                              inputMode="numeric"
                              placeholder="1.280.000"
                            />
                          </div>
                        </label>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% da comissão</span>
                              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                <input
                                  value={form.comissao_percentual}
                                  onChange={(event) => handleCommissionPercentChange(event.target.value)}
                                  className={buildMoneyInputClass()}
                                  inputMode="decimal"
                                  placeholder="0"
                                />
                                <span className="ml-2 text-sm font-semibold text-slate-500">%</span>
                              </div>
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor da comissão</span>
                              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                <span className="mr-2 text-sm font-semibold text-slate-500">R$</span>
                                <input
                                  value={commissionAmountInput}
                                  onChange={(event) => handleCommissionAmountChange(event.target.value)}
                                  className={buildMoneyInputClass()}
                                  inputMode="numeric"
                                  placeholder="0"
                                />
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Corretores na comissão</p>
                            <p className="mt-1 text-sm text-slate-600">Defina os corretores que vão dividir esta comissão.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canSuggestPartnerCorretor ? (
                              <button
                                type="button"
                                onClick={() => void handleLinkPartnerCorretor()}
                                disabled={savingCorretorCreate}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Vincular corretor parceiro
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setAddingCorretorOpen(true);
                                setEditingCorretorId(null);
                                setAddingCorretorForm(
                                  canSuggestPartnerCorretor && corretorParceiroSugestao
                                    ? {
                                        ...INITIAL_CORRETOR_FORM,
                                        nome: corretorParceiroSugestao.nome,
                                        email: corretorParceiroSugestao.email,
                                        telefone: corretorParceiroSugestao.telefone,
                                        vinculado_corretor_parceiro: true,
                                      }
                                    : INITIAL_CORRETOR_FORM,
                                );
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Adicionar corretor
                            </button>
                          </div>
                        </div>

                        {addingCorretorOpen ? (
                          <div
                            className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleCreateCorretor();
                              }
                            }}
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nome</span>
                                <input
                                  value={addingCorretorForm.nome}
                                  onChange={(event) =>
                                    setAddingCorretorForm((current) => ({ ...current, nome: event.target.value }))
                                  }
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">E-mail</span>
                                <input
                                  value={addingCorretorForm.email}
                                  onChange={(event) =>
                                    setAddingCorretorForm((current) => ({ ...current, email: event.target.value }))
                                  }
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Telefone</span>
                                <input
                                  value={addingCorretorForm.telefone}
                                  onChange={(event) =>
                                    setAddingCorretorForm((current) => ({ ...current, telefone: event.target.value }))
                                  }
                                  inputMode="tel"
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% da comissão</span>
                                <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                  <input
                                    value={addingCorretorForm.percentual_comissao}
                                    onChange={(event) =>
                                      setAddingCorretorForm((current) => ({
                                        ...current,
                                        percentual_comissao: event.target.value.replace(/[^\d,.-]/g, ""),
                                      }))
                                    }
                                    className={buildMoneyInputClass()}
                                    inputMode="decimal"
                                    placeholder="0"
                                  />
                                  <span className="ml-2 text-sm font-semibold text-slate-500">%</span>
                                </div>
                              </label>
                              <label className="grid gap-1 sm:col-span-2">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor da comissão</span>
                                <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                  <span className="mr-2 text-sm font-semibold text-slate-500">R$</span>
                                  <input
                                    value={addingCorretorForm.valor_comissao}
                                    onChange={(event) => {
                                      const parsed = parseCurrencyInput(event.target.value);
                                      setAddingCorretorForm((current) => ({
                                        ...current,
                                        valor_comissao: event.target.value.replace(/[^\d.]/g, "")
                                          ? formatCurrencyInput(parsed)
                                          : "",
                                      }));
                                    }}
                                    className={buildMoneyInputClass()}
                                    inputMode="numeric"
                                    placeholder="0"
                                  />
                                </div>
                              </label>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                              <input
                                type="checkbox"
                                checked={addingCorretorForm.vinculado_corretor_parceiro}
                                onChange={(event) =>
                                  setAddingCorretorForm((current) => ({
                                    ...current,
                                    vinculado_corretor_parceiro: event.target.checked,
                                  }))
                                }
                              />
                              Corretor parceiro do imóvel
                            </label>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingCorretorOpen(false);
                                  setAddingCorretorForm(INITIAL_CORRETOR_FORM);
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCreateCorretor()}
                                disabled={savingCorretorCreate}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingCorretorCreate ? "Salvando..." : "Salvar corretor"}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-4 grid gap-3">
                          {workspace.corretores.map((corretor) => (
                            <div key={corretor.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{corretor.nome}</p>
                                    {corretor.vinculado_corretor_parceiro ? (
                                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                                        Corretor parceiro
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {[corretor.email, corretor.telefone].filter(Boolean).join(" • ") || "Sem contato informado"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {[
                                      corretor.percentual_comissao != null && corretor.percentual_comissao > 0
                                        ? `${formatPercentInput(corretor.percentual_comissao)}%`
                                        : null,
                                      corretor.valor_comissao != null && corretor.valor_comissao > 0
                                        ? formatCurrency(corretor.valor_comissao)
                                        : null,
                                    ].filter(Boolean).join(" • ") || "Sem divisão definida"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingCorretorOpen(false);
                                      setEditingCorretorId(corretor.id);
                                      setEditingCorretorForm(mapCorretorToForm(corretor));
                                    }}
                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteCorretor(corretor.id)}
                                    disabled={deletingCorretorId === corretor.id}
                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deletingCorretorId === corretor.id ? "Removendo..." : "Excluir"}
                                  </button>
                                </div>
                              </div>

                              {editingCorretorId === corretor.id ? (
                                <div
                                  className="mt-3 grid gap-3 border-t border-slate-200 pt-3"
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void handleUpdateCorretor();
                                    }
                                  }}
                                >
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="grid gap-1">
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nome</span>
                                      <input
                                        value={editingCorretorForm.nome}
                                        onChange={(event) =>
                                          setEditingCorretorForm((current) => ({ ...current, nome: event.target.value }))
                                        }
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                      />
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">E-mail</span>
                                      <input
                                        value={editingCorretorForm.email}
                                        onChange={(event) =>
                                          setEditingCorretorForm((current) => ({ ...current, email: event.target.value }))
                                        }
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                      />
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Telefone</span>
                                      <input
                                        value={editingCorretorForm.telefone}
                                        onChange={(event) =>
                                          setEditingCorretorForm((current) => ({ ...current, telefone: event.target.value }))
                                        }
                                        inputMode="tel"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                      />
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% da comissão</span>
                                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                        <input
                                          value={editingCorretorForm.percentual_comissao}
                                          onChange={(event) =>
                                            setEditingCorretorForm((current) => ({
                                              ...current,
                                              percentual_comissao: event.target.value.replace(/[^\d,.-]/g, ""),
                                            }))
                                          }
                                          className={buildMoneyInputClass()}
                                          inputMode="decimal"
                                          placeholder="0"
                                        />
                                        <span className="ml-2 text-sm font-semibold text-slate-500">%</span>
                                      </div>
                                    </label>
                                    <label className="grid gap-1 sm:col-span-2">
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor da comissão</span>
                                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                        <span className="mr-2 text-sm font-semibold text-slate-500">R$</span>
                                        <input
                                          value={editingCorretorForm.valor_comissao}
                                          onChange={(event) => {
                                            const parsed = parseCurrencyInput(event.target.value);
                                            setEditingCorretorForm((current) => ({
                                              ...current,
                                              valor_comissao: event.target.value.replace(/[^\d.]/g, "")
                                                ? formatCurrencyInput(parsed)
                                                : "",
                                            }));
                                          }}
                                          className={buildMoneyInputClass()}
                                          inputMode="numeric"
                                          placeholder="0"
                                        />
                                      </div>
                                    </label>
                                  </div>
                                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={editingCorretorForm.vinculado_corretor_parceiro}
                                      onChange={(event) =>
                                        setEditingCorretorForm((current) => ({
                                          ...current,
                                          vinculado_corretor_parceiro: event.target.checked,
                                        }))
                                      }
                                    />
                                    Corretor parceiro do imóvel
                                  </label>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCorretorId(null);
                                        setEditingCorretorForm(INITIAL_CORRETOR_FORM);
                                      }}
                                      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleUpdateCorretor()}
                                      disabled={savingCorretorEdit}
                                      className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {savingCorretorEdit ? "Salvando..." : "Salvar corretor"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))}

                          {workspace.corretores.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
                              Nenhum corretor definido na divisão da comissão.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-slate-700">Observações</span>
                        <textarea
                          value={form.observacoes}
                          onChange={(event) =>
                            setForm((current) => (current ? { ...current, observacoes: event.target.value } : current))
                          }
                          rows={4}
                          className={buildTextareaClass()}
                          placeholder="Condições acordadas, riscos, contexto da negociação e próximos passos."
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Financeiro</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Composição do pagamento</h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Total: {typeof totalValue === "number" ? formatCurrency(totalValue) : "Sem valor"}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCompletionClass(paymentSummary.isComplete)}`}>
                          {paymentSummary.isComplete
                            ? "100% fechado"
                            : `${formatPercentInput(Math.abs(paymentSummary.remainingPercent))}% ${paymentSummary.remainingPercent > 0 ? "faltando" : "acima"}`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {PAYMENT_ROWS.map((row) => (
                        <div key={row.key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                              <p className="mt-1 text-sm text-slate-500">{row.hint}</p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">% do total</span>
                              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                <input
                                  value={paymentPercentInputs[row.key]}
                                  onChange={(event) => handlePaymentPercentChange(row.key, event.target.value)}
                                  className={buildMoneyInputClass()}
                                  inputMode="decimal"
                                  placeholder="0"
                                />
                                <span className="ml-2 text-sm font-semibold text-slate-500">%</span>
                              </div>
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor</span>
                              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                                <span className="mr-2 text-sm font-semibold text-slate-500">R$</span>
                                <input
                                  value={paymentAmountInputs[row.key]}
                                  onChange={(event) => handlePaymentAmountChange(row.key, event.target.value)}
                                  className={buildMoneyInputClass()}
                                  inputMode="numeric"
                                  placeholder="0"
                                />
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </form>
              </div>
            </div>
          ) : null}

          {activeTab === "negociacao" ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <IdentificationCard size={14} />
                  Card 2 • Partes Envolvidas
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openParteWizard("COMPRADOR")}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    <UserPlus size={16} />
                    Cadastrar / Vincular Comprador
                  </button>
                  <button
                    type="button"
                    onClick={() => openParteWizard("VENDEDOR")}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <UserSwitch size={16} />
                    Cadastrar / Vincular Vendedor
                  </button>
                  <span className="text-xs font-semibold text-slate-500">{workspace.partes.length}</span>
                </div>
              </div>
              {parteFormOpen ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/35" onClick={closeParteWizard} />
                  <div className="relative w-[min(980px,100%)] max-h-[92vh] overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.28)]">
                    <form onSubmit={handleCreateParte} className="grid gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                            {parteForm.papel === "COMPRADOR" ? "Cadastro Comprador" : "Cadastro Vendedor"}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={closeParteWizard}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Fechar
                        </button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        {[
                          { step: 1 as const, label: "1. Tipo de ação" },
                          { step: 2 as const, label: "2. Dados da parte" },
                          { step: 3 as const, label: "3. Pessoa vinculada" },
                        ].map((item) => (
                          <div
                            key={item.step}
                            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                              parteWizardStep === item.step
                                ? "border-[var(--blue-slate)] bg-sky-50 text-sky-700"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>

                      {parteWizardStep === 1 ? (
                        <div className="grid gap-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {wizardSuggestedInfo?.title || "Dados sugeridos"}
                            </p>
                            <p className="mt-2 text-base font-semibold text-slate-900">
                              {wizardSuggestedInfo?.nome || "Sem nome disponível"}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {[wizardSuggestedInfo?.email, wizardSuggestedInfo?.telefone].filter(Boolean).join(" • ") ||
                                "Sem e-mail/telefone informado"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {wizardSuggestedInfo?.endereco || "Sem endereço informado"}
                            </p>
                            {!wizardSuggestedInfo?.available && wizardSuggestedInfo?.unavailableReason ? (
                              <p className="mt-2 text-xs font-medium text-amber-700">{wizardSuggestedInfo.unavailableReason}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={startWizardSuggestedLink}
                              disabled={!wizardSuggestedInfo?.available}
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--blue-slate)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {wizardSuggestedInfo?.ctaPrimary || "Vincular dados sugeridos"}
                            </button>
                            <button
                              type="button"
                              onClick={startWizardManualCadastro}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              {wizardSuggestedInfo?.ctaSecondary || "Cadastrar outro"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {parteWizardStep === 2 ? (
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <label className="grid gap-1 sm:max-w-xs">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tipo de pessoa</span>
                            <select
                              value={parteForm.tipo_pessoa}
                              onChange={(event) =>
                                setParteForm((current) => ({
                                  ...current,
                                  tipo_pessoa: event.target.value as OpportunityParte["tipo_pessoa"],
                                  razao_social: event.target.value === "JURIDICA" ? current.razao_social : "",
                                  cnpj: event.target.value === "JURIDICA" ? current.cnpj : "",
                                }))
                              }
                              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                            >
                              <option value="FISICA">Pessoa física</option>
                              <option value="JURIDICA">Pessoa jurídica</option>
                            </select>
                          </label>
                          {parteForm.tipo_pessoa === "JURIDICA" ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Razão social</span>
                                <input
                                  value={parteForm.razao_social}
                                  onChange={(event) => setParteForm((current) => ({ ...current, razao_social: event.target.value }))}
                                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CNPJ</span>
                                <input
                                  value={parteForm.cnpj}
                                  onChange={(event) => setParteForm((current) => ({ ...current, cnpj: event.target.value }))}
                                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                />
                              </label>
                            </div>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="grid gap-1 sm:col-span-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Endereço</span>
                              <input
                                value={parteForm.endereco}
                                onChange={(event) => setParteForm((current) => ({ ...current, endereco: event.target.value }))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Número</span>
                              <input
                                value={parteForm.numero}
                                onChange={(event) => setParteForm((current) => ({ ...current, numero: event.target.value }))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-4">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CEP</span>
                              <input
                                value={parteForm.cep}
                                onChange={(event) => setParteForm((current) => ({ ...current, cep: event.target.value }))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1 sm:col-span-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bairro</span>
                              <input
                                value={parteForm.bairro}
                                onChange={(event) => setParteForm((current) => ({ ...current, bairro: event.target.value }))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">UF</span>
                              <select
                                value={parteForm.uf}
                                onChange={(event) => setParteForm((current) => ({ ...current, uf: event.target.value }))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              >
                                <option value="">Selecione</option>
                                {UF_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cidade</span>
                              <input
                                value={parteForm.cidade}
                                onChange={(event) => setParteForm((current) => ({ ...current, cidade: event.target.value }))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">País</span>
                              <input
                                value={parteForm.pais}
                                onChange={(event) => setParteForm((current) => ({ ...current, pais: event.target.value }))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                          </div>
                          <label className="grid gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Complemento</span>
                            <input
                              value={parteForm.complemento}
                              onChange={(event) => setParteForm((current) => ({ ...current, complemento: event.target.value }))}
                              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                            />
                          </label>
                        </div>
                      ) : null}

                      {parteWizardStep === 3 ? (
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">Pessoa vinculada</p>
                            {parteWizardMode === "CADASTRAR" ? (
                              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={createParteWithPessoa || parteForm.tipo_pessoa === "FISICA"}
                                  onChange={(event) => setCreateParteWithPessoa(event.target.checked)}
                                  disabled={parteForm.tipo_pessoa === "FISICA"}
                                />
                                Cadastrar agora
                              </label>
                            ) : (
                              <span className="text-xs font-medium text-slate-600">Vinculação selecionada</span>
                            )}
                          </div>
                          {parteWizardMode === "CADASTRAR" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => applyLeadPrefillToPessoa((value) => setPartePessoaForm(value))}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Usar dados do lead
                              </button>
                              <button
                                type="button"
                                onClick={() => applyProprietarioPrefillToPessoa((value) => setPartePessoaForm(value))}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Usar proprietário do imóvel
                              </button>
                            </div>
                          ) : null}
                          {shouldCreatePessoaInWizard ? (
                            <div className="grid gap-3">
                              <div className="grid gap-3 sm:grid-cols-12">
                                <label className="grid gap-1 sm:col-span-6">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nome completo</span>
                                  <input
                                    value={partePessoaForm.nome_completo}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, nome_completo: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <label className="grid gap-1 sm:col-span-6">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">E-mail</span>
                                  <input
                                    value={partePessoaForm.email}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, email: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-12">
                                <label className="grid gap-1 sm:col-span-6">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Telefone</span>
                                  <input
                                    value={partePessoaForm.telefone}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, telefone: event.target.value }))
                                    }
                                    inputMode="tel"
                                    placeholder="(11) 99999-9999"
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <label className="grid gap-1 sm:col-span-6">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CPF</span>
                                  <input
                                    value={partePessoaForm.cpf}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))
                                    }
                                    onBlur={() => setPartePessoaCpfTouched(true)}
                                    inputMode="numeric"
                                    placeholder="000.000.000-00"
                                    className={`h-11 rounded-xl bg-white px-3 text-sm text-slate-900 outline-none ${
                                      partePessoaCpfTouched && partePessoaForm.cpf.trim().length > 0 && !isValidCpf(partePessoaForm.cpf)
                                        ? "border border-rose-400 focus:border-rose-500"
                                        : "border border-slate-200 focus:border-[var(--blue-slate)]"
                                    }`}
                                  />
                                  {partePessoaCpfTouched && partePessoaForm.cpf.trim().length > 0 && !isValidCpf(partePessoaForm.cpf) ? (
                                    <span className="text-xs font-medium text-rose-600">CPF inválido.</span>
                                  ) : null}
                                </label>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-[15fr_35fr_15fr_35fr]">
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CEP</span>
                                  <input
                                    value={partePessoaForm.cep}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => {
                                        const nextCep = formatCepInput(event.target.value);
                                        const cepChanged = normalizeDigits(nextCep, 8) !== normalizeDigits(current.cep, 8);
                                        return {
                                          ...current,
                                          cep: nextCep,
                                          numero: cepChanged ? "" : current.numero,
                                        };
                                      })
                                    }
                                    onBlur={() => void handlePessoaCepBlur(partePessoaForm.cep, setPartePessoaForm)}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Endereço</span>
                                  <input
                                    value={partePessoaForm.endereco}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, endereco: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Número</span>
                                  <input
                                    value={partePessoaForm.numero}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, numero: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Complemento</span>
                                  <input
                                    value={partePessoaForm.complemento}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, complemento: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-4">
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bairro</span>
                                  <input
                                    value={partePessoaForm.bairro}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, bairro: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cidade</span>
                                  <input
                                    value={partePessoaForm.cidade}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, cidade: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">UF</span>
                                  <select
                                    value={partePessoaForm.uf}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, uf: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  >
                                    <option value="">Selecione</option>
                                    {UF_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">País</span>
                                  <input
                                    value={partePessoaForm.pais}
                                    onChange={(event) =>
                                      setPartePessoaForm((current) => ({ ...current, pais: event.target.value }))
                                    }
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">Sem pessoa vinculada nesta etapa.</p>
                          )}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
                        {parteWizardStep > 1 ? (
                          <button
                            type="button"
                            onClick={() => setParteWizardStep((current) => (current > 1 ? ((current - 1) as 1 | 2 | 3) : current))}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Voltar
                          </button>
                        ) : null}
                        {parteWizardStep === 2 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setParteWizardStep(3);
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--blue-slate)] px-3 text-sm font-semibold text-white"
                          >
                            Continuar
                          </button>
                        ) : null}
                        {parteWizardStep === 3 ? (
                          <button
                            type="submit"
                            disabled={savingParte}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingParte ? "Salvando..." : "Concluir cadastro"}
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                <div className="rounded-[22px] border border-violet-200 bg-violet-50/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-500">Corretores</p>
                  {corretoresEnvolvidos.length > 0 ? (
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      {corretoresEnvolvidos.map((corretor) => (
                        <div key={`${corretor.nome}-${corretor.email}-${corretor.telefone}`}>
                          <p className="font-medium text-slate-900">{corretor.nome || "Corretor sem nome"}</p>
                          <p className="text-xs text-slate-500">{corretor.tipo}</p>
                          <p>{[corretor.email, corretor.telefone].filter(Boolean).join(" • ") || "Sem contato informado"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Nenhum corretor vinculado na comissão desta oportunidade.</p>
                  )}
                </div>
                {workspace.partes.length > 0 ? (
                  workspace.partes.map((parte) => (
                    <div
                      key={parte.id}
                      className={`rounded-[22px] border p-4 ${
                        parte.papel === "COMPRADOR" ? "border-sky-200 bg-sky-50/60" : "border-rose-200 bg-rose-50/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                                parte.papel === "COMPRADOR"
                                  ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                                  : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                              }`}
                            >
                              {parte.papel === "COMPRADOR" ? "Comprador" : "Vendedor"}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 ring-1 ring-slate-200">
                              {parte.tipo_pessoa === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {parte.razao_social?.trim() || parte.pessoas[0]?.nome_completo || "Parte sem identificação"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{parte.pessoas.length} pessoa(s) vinculada(s)</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingParteId(parte.id);
                              setEditingParteForm(mapParteToForm(parte));
                              setAddingPessoaParteId(null);
                              setEditingPessoaRef(null);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Editar parte
                          </button>
                          <button
                            type="button"
                            onClick={() => openAddPessoaForm(parte)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Adicionar pessoa
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteParte(parte.id)}
                            disabled={deletingParteId === parte.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingParteId === parte.id ? "Removendo..." : "Excluir parte"}
                          </button>
                        </div>
                      </div>

                      {editingParteId === parte.id ? (
                        <form onSubmit={handleUpdateParte} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Papel</span>
                              <select
                                value={editingParteForm.papel}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({
                                    ...current,
                                    papel: event.target.value as OpportunityParte["papel"],
                                  }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              >
                                <option value="COMPRADOR">Comprador</option>
                                <option value="VENDEDOR">Vendedor</option>
                              </select>
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tipo</span>
                              <select
                                value={editingParteForm.tipo_pessoa}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({
                                    ...current,
                                    tipo_pessoa: event.target.value as OpportunityParte["tipo_pessoa"],
                                  }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              >
                                <option value="FISICA">Pessoa física</option>
                                <option value="JURIDICA">Pessoa jurídica</option>
                              </select>
                            </label>
                          </div>
                          {editingParteForm.tipo_pessoa === "JURIDICA" ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Razão social</span>
                                <input
                                  value={editingParteForm.razao_social}
                                  onChange={(event) =>
                                    setEditingParteForm((current) => ({ ...current, razao_social: event.target.value }))
                                  }
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CNPJ</span>
                                <input
                                  value={editingParteForm.cnpj}
                                  onChange={(event) =>
                                    setEditingParteForm((current) => ({ ...current, cnpj: event.target.value }))
                                  }
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                />
                              </label>
                            </div>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="grid gap-1 sm:col-span-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Endereço</span>
                              <input
                                value={editingParteForm.endereco}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({ ...current, endereco: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Número</span>
                              <input
                                value={editingParteForm.numero}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({ ...current, numero: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-4">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CEP</span>
                              <input
                                value={editingParteForm.cep}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({ ...current, cep: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1 sm:col-span-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bairro</span>
                              <input
                                value={editingParteForm.bairro}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({ ...current, bairro: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">UF</span>
                              <select
                                value={editingParteForm.uf}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({ ...current, uf: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              >
                                <option value="">Selecione</option>
                                {UF_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cidade</span>
                              <input
                                value={editingParteForm.cidade}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({ ...current, cidade: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">País</span>
                              <input
                                value={editingParteForm.pais}
                                onChange={(event) =>
                                  setEditingParteForm((current) => ({ ...current, pais: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingParteId(null);
                                setEditingParteForm(INITIAL_PARTE_FORM);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={savingParteEdit}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingParteEdit ? "Salvando..." : "Salvar parte"}
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {addingPessoaParteId === parte.id ? (
                        <form onSubmit={(event) => handleCreatePessoa(event, parte.id)} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => applyLeadPrefillToPessoa((value) => setAddingPessoaForm(value))}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Usar dados do lead
                            </button>
                            <button
                              type="button"
                              onClick={() => applyProprietarioPrefillToPessoa((value) => setAddingPessoaForm(value))}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Usar proprietário do imóvel
                            </button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="grid gap-1 sm:col-span-3">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nome completo</span>
                              <input
                                value={addingPessoaForm.nome_completo}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, nome_completo: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">E-mail</span>
                              <input
                                value={addingPessoaForm.email}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, email: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Telefone</span>
                              <input
                                value={addingPessoaForm.telefone}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, telefone: event.target.value }))
                                }
                                inputMode="tel"
                                placeholder="(11) 99999-9999"
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CPF</span>
                              <input
                                value={addingPessoaForm.cpf}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))
                                }
                                inputMode="numeric"
                                placeholder="000.000.000-00"
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-4">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CEP</span>
                              <input
                                value={addingPessoaForm.cep}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => {
                                    const nextCep = formatCepInput(event.target.value);
                                    const cepChanged = normalizeDigits(nextCep, 8) !== normalizeDigits(current.cep, 8);
                                    return {
                                      ...current,
                                      cep: nextCep,
                                      numero: cepChanged ? "" : current.numero,
                                    };
                                  })
                                }
                                onBlur={() => void handlePessoaCepBlur(addingPessoaForm.cep, setAddingPessoaForm)}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1 sm:col-span-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bairro</span>
                              <input
                                value={addingPessoaForm.bairro}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, bairro: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">UF</span>
                              <select
                                value={addingPessoaForm.uf}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, uf: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              >
                                <option value="">Selecione</option>
                                {UF_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="grid gap-1 sm:col-span-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Endereço</span>
                              <input
                                value={addingPessoaForm.endereco}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, endereco: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Número</span>
                              <input
                                value={addingPessoaForm.numero}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, numero: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cidade</span>
                              <input
                                value={addingPessoaForm.cidade}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, cidade: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">País</span>
                              <input
                                value={addingPessoaForm.pais}
                                onChange={(event) =>
                                  setAddingPessoaForm((current) => ({ ...current, pais: event.target.value }))
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                              />
                            </label>
                          </div>
                          <label className="grid gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Complemento</span>
                            <input
                              value={addingPessoaForm.complemento}
                              onChange={(event) =>
                                setAddingPessoaForm((current) => ({ ...current, complemento: event.target.value }))
                              }
                              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                            />
                          </label>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAddingPessoaParteId(null);
                                setAddingPessoaForm(INITIAL_PARTE_PESSOA_FORM);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={savingPessoaCreate}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingPessoaCreate ? "Salvando..." : "Salvar pessoa"}
                            </button>
                          </div>
                        </form>
                      ) : null}

                      <div className="mt-4 grid gap-3">
                        {parte.pessoas.map((pessoa) => (
                          <div
                            key={pessoa.id}
                            className={`rounded-2xl border bg-white/90 p-3 ${
                              parte.papel === "COMPRADOR" ? "border-sky-100" : "border-rose-100"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{pessoa.nome_completo}</p>
                                <p className="mt-1 text-xs text-slate-500">{pessoa.email}</p>
                                <p className="mt-1 text-xs text-slate-500">{pessoa.telefone ?? "Sem telefone"}</p>
                                <p className="mt-1 text-xs text-slate-500">CPF: {formatCpfInput(pessoa.cpf)}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {[pessoa.endereco, pessoa.numero, pessoa.bairro, `${pessoa.cidade}/${pessoa.uf}`].filter(Boolean).join(" • ")}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPessoaRef({ parteId: parte.id, pessoaId: pessoa.id });
                                    setEditingPessoaForm(mapPartePessoaToForm(pessoa));
                                    setAddingPessoaParteId(null);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeletePessoa(parte.id, pessoa.id)}
                                  disabled={
                                    deletingPessoaRef?.parteId === parte.id && deletingPessoaRef?.pessoaId === pessoa.id
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingPessoaRef?.parteId === parte.id && deletingPessoaRef?.pessoaId === pessoa.id
                                    ? "Removendo..."
                                    : "Excluir"}
                                </button>
                              </div>
                            </div>

                            {editingPessoaRef?.parteId === parte.id && editingPessoaRef?.pessoaId === pessoa.id ? (
                              <form onSubmit={handleUpdatePessoa} className="mt-3 grid gap-3 border-t border-slate-200 pt-3">
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <label className="grid gap-1 sm:col-span-3">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nome completo</span>
                                    <input
                                      value={editingPessoaForm.nome_completo}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, nome_completo: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">E-mail</span>
                                    <input
                                      value={editingPessoaForm.email}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, email: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Telefone</span>
                                    <input
                                      value={editingPessoaForm.telefone}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, telefone: event.target.value }))
                                      }
                                      inputMode="tel"
                                      placeholder="(11) 99999-9999"
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CPF</span>
                                    <input
                                      value={editingPessoaForm.cpf}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))
                                      }
                                      inputMode="numeric"
                                      placeholder="000.000.000-00"
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-4">
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">CEP</span>
                                    <input
                                      value={editingPessoaForm.cep}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => {
                                          const nextCep = formatCepInput(event.target.value);
                                          const cepChanged = normalizeDigits(nextCep, 8) !== normalizeDigits(current.cep, 8);
                                          return {
                                            ...current,
                                            cep: nextCep,
                                            numero: cepChanged ? "" : current.numero,
                                          };
                                        })
                                      }
                                      onBlur={() => void handlePessoaCepBlur(editingPessoaForm.cep, setEditingPessoaForm)}
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                  <label className="grid gap-1 sm:col-span-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bairro</span>
                                    <input
                                      value={editingPessoaForm.bairro}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, bairro: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">UF</span>
                                    <select
                                      value={editingPessoaForm.uf}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, uf: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    >
                                      <option value="">Selecione</option>
                                      {UF_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <label className="grid gap-1 sm:col-span-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Endereço</span>
                                    <input
                                      value={editingPessoaForm.endereco}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, endereco: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Número</span>
                                    <input
                                      value={editingPessoaForm.numero}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, numero: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cidade</span>
                                    <input
                                      value={editingPessoaForm.cidade}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, cidade: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                  <label className="grid gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">País</span>
                                    <input
                                      value={editingPessoaForm.pais}
                                      onChange={(event) =>
                                        setEditingPessoaForm((current) => ({ ...current, pais: event.target.value }))
                                      }
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                    />
                                  </label>
                                </div>
                                <label className="grid gap-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Complemento</span>
                                  <input
                                    value={editingPessoaForm.complemento}
                                    onChange={(event) =>
                                      setEditingPessoaForm((current) => ({ ...current, complemento: event.target.value }))
                                    }
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                                  />
                                </label>
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPessoaRef(null);
                                      setEditingPessoaForm(INITIAL_PARTE_PESSOA_FORM);
                                    }}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={savingPessoaEdit}
                                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingPessoaEdit ? "Salvando..." : "Salvar pessoa"}
                                  </button>
                                </div>
                              </form>
                            ) : null}
                          </div>
                        ))}

                        {parte.pessoas.length === 0 ? (
                          <div
                            className={`rounded-[18px] border border-dashed bg-white/90 px-3 py-4 text-xs text-slate-500 ${
                              parte.papel === "COMPRADOR" ? "border-sky-200" : "border-rose-200"
                            }`}
                          >
                            Ainda não há pessoas vinculadas a esta parte.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Compradores e vendedores ainda não foram cadastrados nesta oportunidade.
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "negociacao" ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <FileText size={14} />
                  Card 3 • Propostas
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!canCreateProposal) {
                        pushToast("warning", "Cadastre ao menos um comprador e um vendedor antes de criar proposta.");
                        return;
                      }
                      if (proposalFormOpen) {
                        setProposalForm(INITIAL_PROPOSAL_FORM);
                        setProposalFormOpen(false);
                        return;
                      }
                      setProposalForm({
                        ...INITIAL_PROPOSAL_FORM,
                        valor: totalValue ? formatCurrencyInput(totalValue) : "",
                      });
                      setProposalFormOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {proposalFormOpen ? "Cancelar" : "Nova proposta"}
                  </button>
                  <span className="text-xs font-semibold text-slate-500">{workspace.propostas.length}</span>
                </div>
              </div>
              {!canCreateProposal ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Para gerar proposta, é obrigatório ter ao menos um comprador e um vendedor.
                </div>
              ) : null}
              {proposalFormOpen ? (
                <form onSubmit={handleCreateProposal} className="mt-4 grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Título</span>
                      <input
                        value={proposalForm.titulo}
                        onChange={(event) => setProposalForm((current) => ({ ...current, titulo: event.target.value }))}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                        placeholder="Ex.: Proposta comercial inicial"
                        required
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tipo</span>
                      <select
                        value={proposalForm.tipo}
                        onChange={(event) =>
                          setProposalForm((current) => ({
                            ...current,
                            tipo: event.target.value as OpportunityPropostaTipo,
                          }))
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                      >
                        {Object.entries(PROPOSTA_TIPO_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[200px_220px_auto] sm:items-end">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valor (opcional)</span>
                      <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[var(--blue-slate)]">
                        <span className="mr-2 text-sm font-semibold text-slate-500">R$</span>
                        <input
                          value={proposalForm.valor}
                          onChange={(event) => handleProposalValueChange(event.target.value)}
                          className={buildMoneyInputClass()}
                          inputMode="numeric"
                          placeholder="0"
                        />
                      </div>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Vencimento</span>
                      <input
                        type="date"
                        value={proposalForm.vencimento_em}
                        onChange={(event) =>
                          setProposalForm((current) => ({ ...current, vencimento_em: event.target.value }))
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)]"
                      />
                    </label>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProposalFormOpen(false);
                          setProposalForm(INITIAL_PROPOSAL_FORM);
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Fechar
                      </button>
                      <button
                        type="submit"
                        disabled={creatingProposal}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creatingProposal ? "Criando..." : "Criar proposta"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Avanço para jurídico</p>
                <p className="mt-1 text-sm text-slate-600">
                  Fluxo recomendado: proposta aceita. Também existe avanço por aprovação simples.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAdvanceToJuridico(false)}
                    disabled={!hasAcceptedProposal || savingJuridico}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--blue-slate)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingJuridico ? "Avançando..." : "Avançar (proposta aceita)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAdvanceToJuridico(true)}
                    disabled={savingJuridico}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aprovação simples
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {workspace.propostas.length > 0 ? (
                  workspace.propostas.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.titulo || "Proposta sem título"}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PROPOSTA_STATUS_META[item.status].className}`}>
                              {PROPOSTA_STATUS_META[item.status].label}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {PROPOSTA_TIPO_LABEL[item.tipo]}
                            </span>
                            {typeof item.valor === "number" ? <span>{formatCurrency(item.valor)}</span> : null}
                            {item.vencimento_em ? <span>Vence em {formatDate(item.vencimento_em)}</span> : null}
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                item.arquivo_midia_id
                                  ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                              }`}
                            >
                              {item.arquivo_midia_id ? "PDF gerado" : "PDF pendente"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setProposalDocumentOpenId(item.id)}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Documento
                          </button>
                          <Link
                            href={`/lead/${workspace.lead.id}/propostas/${item.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Abrir proposta
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Nenhuma proposta vinculada ainda.
                  </div>
                )}
              </div>
              {selectedProposalDocument ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/35" onClick={() => setProposalDocumentOpenId(null)} />
                  <div className="relative w-[min(1080px,100%)] max-h-[92vh] overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.28)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                          Documento da proposta
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Revise o conteúdo abaixo e gere o PDF para assinatura.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProposalDocumentOpenId(null)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Proposta</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {selectedProposalDocument.titulo || "Proposta sem título"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {PROPOSTA_TIPO_LABEL[selectedProposalDocument.tipo]} • {PROPOSTA_STATUS_META[selectedProposalDocument.status].label}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Valor:{" "}
                            {typeof selectedProposalDocument.valor === "number"
                              ? formatCurrency(selectedProposalDocument.valor)
                              : typeof workspace.negocio.valor === "number"
                                ? formatCurrency(workspace.negocio.valor)
                                : "Não informado"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Vencimento:{" "}
                            {selectedProposalDocument.vencimento_em
                              ? formatDate(selectedProposalDocument.vencimento_em)
                              : "Não informado"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Oportunidade</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {workspace.negocio.titulo?.trim() || "Oportunidade sem título"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Valor: {typeof workspace.negocio.valor === "number" ? formatCurrency(workspace.negocio.valor) : "Não informado"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Comissão:{" "}
                            {typeof workspace.negocio.comissaovalor === "number"
                              ? formatCurrency(workspace.negocio.comissaovalor)
                              : "Não informado"}
                            {typeof workspace.negocio.comissaopercentual === "number"
                              ? ` (${formatPercentInput(workspace.negocio.comissaopercentual)}%)`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Lead associado</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{workspace.lead.nome || "Lead sem nome"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[workspace.lead.email, workspace.lead.telefone].filter(Boolean).join(" • ") || "Sem contato"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[
                              workspace.lead.cep,
                              workspace.lead.endereco,
                              workspace.lead.numero,
                              workspace.lead.complemento,
                              workspace.lead.bairro,
                              workspace.lead.cidade,
                              workspace.lead.uf,
                              workspace.lead.pais,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "Sem endereço"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Imóvel associado</p>
                          {workspace.imovel ? (
                            <>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{workspace.imovel.headline}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {[workspace.imovel.cidade, workspace.imovel.estado].filter(Boolean).join("/") || "Local não informado"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {[workspace.imovel.logradouro, workspace.imovel.numero, workspace.imovel.bairro].filter(Boolean).join(" • ") ||
                                  "Endereço não informado"}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 text-xs text-slate-500">Sem imóvel associado.</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Condições de pagamento</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {[
                            { label: "Recursos próprios", value: workspace.negocio.recursopropriovalor },
                            { label: "Financiamento", value: workspace.negocio.financiamentovalor },
                            { label: "FGTS", value: workspace.negocio.fgtsvalor },
                            { label: "Outros recursos", value: workspace.negocio.outrosrecursosvalor },
                          ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {typeof item.value === "number" ? formatCurrency(item.value) : "Não informado"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Partes envolvidas</p>
                        <div className="mt-2 grid gap-2">
                          {workspace.partes.map((parte) => (
                            <div key={parte.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {parte.papel === "COMPRADOR" ? "Comprador" : "Vendedor"} •{" "}
                                {parte.tipo_pessoa === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {parte.razao_social?.trim() || parte.pessoas[0]?.nome_completo || "Parte sem identificação"}
                              </p>
                              <div className="mt-1 text-xs text-slate-500">
                                {parte.pessoas.length > 0
                                  ? parte.pessoas.map((pessoa) => pessoa.nome_completo).join(" • ")
                                  : "Sem pessoas vinculadas"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {workspace.negocio.observacoes ? (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Observações</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{workspace.negocio.observacoes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                      {selectedProposalPdfUrl ? (
                        <a
                          href={selectedProposalPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Baixar último PDF
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleGenerateProposalPdf(selectedProposalDocument.id)}
                        disabled={generatingProposalPdfId === selectedProposalDocument.id}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {generatingProposalPdfId === selectedProposalDocument.id ? "Gerando PDF..." : "Gerar PDF"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === "juridico" ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-5">
              <form onSubmit={handleSaveJuridico} className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Card • Detalhes do Jurídico</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Jurídico da oportunidade</h2>
                  </div>
                  <button
                    type="submit"
                    disabled={savingJuridico}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingJuridico ? "Salvando..." : "Salvar jurídico"}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Fase atual</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{NEGOCIO_FASE_LABEL[form.fase]}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Propostas aceitas</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {workspace.propostas.filter((item) => item.status === "ACEITA").length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Partes cadastradas</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{workspace.partes.length}</p>
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Subfase jurídica</span>
                  <select
                    value={form.subfase_juridica}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, fase: "JURIDICO", subfase_juridica: event.target.value as SubfaseJuridicaNegocio | "" } : current,
                      )
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[var(--blue-slate)] focus:bg-white"
                  >
                    <option value="">Selecione</option>
                    {JURIDICO_SUBFASES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAdvanceToJuridico(false)}
                    disabled={!hasAcceptedProposal || savingJuridico}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--blue-slate)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Avançar com proposta aceita
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAdvanceToJuridico(true)}
                    disabled={savingJuridico}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aprovação simples e avançar
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {activeTab === "timeline" ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Scales size={14} />
                  Timeline
                </div>
                <span className="text-xs font-semibold text-slate-500">{workspace.timeline.length} evento(s)</span>
              </div>
              <div className="mt-4 space-y-3">
                {workspace.timeline.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
                      <span className="text-xs text-slate-500">{formatDate(item.created_at, "datetime")}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">{item.tipo}</p>
                  </div>
                ))}
                {workspace.timeline.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    A timeline desta oportunidade ainda está vazia.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeTab === "atividades" ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Briefcase size={14} />
                  Atividades
                </div>
                <span className="text-xs font-semibold text-slate-500">{workspace.atividades.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {workspace.atividades.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{item.status}</span>
                      {item.quando_em ? <span>{formatDate(item.quando_em, "datetime")}</span> : null}
                    </div>
                  </div>
                ))}
                {workspace.atividades.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Nenhuma atividade vinculada a esta oportunidade.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
