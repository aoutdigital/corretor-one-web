"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Info, XCircle } from "@phosphor-icons/react/dist/ssr";

type BillingPeriod = "MENSAL" | "ANUAL";

type PlanApi = {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
  preco_anual: number | null;
  limite_imoveis: number | null;
  limite_emails_mes: number | null;
  limite_whatsapp_mes: number | null;
  ayka_franquia_mensal: number;
  recursos: Record<string, unknown> | null;
};

type PlanFeature = {
  key: string;
  label: string;
  help: string;
  enabled: boolean;
  value: string;
};

type UiPlan = {
  nome: string;
  slug: string;
  destaque: string;
  precoMensal: number;
  precoAnual: number | null;
  popular: boolean;
  features: PlanFeature[];
};

const PLAN_DESC: Record<string, string> = {
  gratis: "Entrada no ecossistema",
  presenca: "Imagem profissional",
  destaque: "Mais visibilidade",
  autoridade: "Posicionamento premium",
};

const FALLBACK_PLANS: PlanApi[] = [
  {
    id: "gratis",
    nome: "Grátis",
    slug: "gratis",
    preco_mensal: 0,
    preco_anual: 0,
    limite_imoveis: 20,
    limite_emails_mes: 0,
    limite_whatsapp_mes: 0,
    ayka_franquia_mensal: 5,
    recursos: {
      empreendimentos_limite: 20,
      landing_pages_limite: 1,
      artigos_limite: 5,
      email_corretor_one: 0,
    },
  },
  {
    id: "presenca",
    nome: "Presença",
    slug: "presenca",
    preco_mensal: 99,
    preco_anual: 891,
    limite_imoveis: 100,
    limite_emails_mes: 1000,
    limite_whatsapp_mes: 0,
    ayka_franquia_mensal: 50,
    recursos: {
      empreendimentos_limite: 100,
      landing_pages_limite: 5,
      artigos_limite: 50,
      email_corretor_one: 1,
    },
  },
  {
    id: "destaque",
    nome: "Destaque",
    slug: "destaque",
    preco_mensal: 199,
    preco_anual: 1791,
    limite_imoveis: 200,
    limite_emails_mes: 2000,
    limite_whatsapp_mes: 500,
    ayka_franquia_mensal: 100,
    recursos: {
      empreendimentos_limite: 200,
      landing_pages_limite: 10,
      artigos_limite: 100,
      email_corretor_one: 1,
      integracao_imovelweb: true,
    },
  },
  {
    id: "autoridade",
    nome: "Autoridade",
    slug: "autoridade",
    preco_mensal: 480,
    preco_anual: 4320,
    limite_imoveis: 2000,
    limite_emails_mes: 10000,
    limite_whatsapp_mes: 1000,
    ayka_franquia_mensal: 500,
    recursos: {
      empreendimentos_limite: null,
      landing_pages_limite: null,
      artigos_limite: null,
      email_corretor_one: 1,
      integracao_zap_imoveis: true,
      integracao_imovelweb: true,
      integracao_chaves_na_mao: true,
      integracao_casa_mineira: true,
    },
  },
];

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatInt(value: number | null): string {
  if (value === null) return "Ilimitado";
  return value.toLocaleString("pt-BR");
}

function annualPrice(plano: UiPlan) {
  if (typeof plano.precoAnual === "number") return plano.precoAnual;
  return Math.round(plano.precoMensal * 12 * 0.75);
}

function annualSavings(plano: UiPlan) {
  if (plano.precoMensal <= 0) return 0;
  const yearlyFromMonthly = plano.precoMensal * 12;
  return Math.max(0, yearlyFromMonthly - annualPrice(plano));
}

function buildPlan(raw: PlanApi): UiPlan {
  const recursos = raw.recursos ?? {};
  const empreendimentos = asNumber(recursos.empreendimentos_limite);
  const landingPages = asNumber(recursos.landing_pages_limite);
  const artigos = asNumber(recursos.artigos_limite);
  const emailProfissional = (asNumber(recursos.email_corretor_one) ?? 0) > 0;

  const integracoes = [
    asBoolean(recursos.integracao_zap_imoveis) ? "Zap" : null,
    asBoolean(recursos.integracao_imovelweb) ? "Imovelweb" : null,
    asBoolean(recursos.integracao_chaves_na_mao) ? "Chaves na Mão" : null,
    asBoolean(recursos.integracao_casa_mineira) ? "Casa Mineira" : null,
  ].filter(Boolean) as string[];

  const allFeatures: PlanFeature[] = [
    {
      key: "perfil_publico",
      label: "Perfil público profissional",
      help: "Página pública em corretor.one/nickname para fortalecer sua marca.",
      enabled: true,
      value: "corretor.one/nickname",
    },
    {
      key: "imoveis",
      label: "Imóveis",
      help: "Quantidade máxima de imóveis ativos no plano.",
      enabled: true,
      value: formatInt(raw.limite_imoveis),
    },
    {
      key: "empreendimentos",
      label: "Empreendimentos",
      help: "Quantidade máxima de empreendimentos cadastrados.",
      enabled: true,
      value: formatInt(empreendimentos),
    },
    {
      key: "captacao",
      label: "Sistema de captação de imóveis",
      help: "Fluxo de captação para atrair proprietários e novos imóveis.",
      enabled: true,
      value: "Incluído",
    },
    {
      key: "landing_pages",
      label: "Landing pages",
      help: "Quantidade de páginas de captura públicas.",
      enabled: true,
      value: formatInt(landingPages),
    },
    {
      key: "artigos",
      label: "Criação de artigos",
      help: "Quantidade disponível para artigos de conteúdo.",
      enabled: true,
      value: formatInt(artigos),
    },
    {
      key: "email_marketing",
      label: "Campanhas Email Marketing",
      help: "Limite mensal de campanhas ou envios de e-mail.",
      enabled: true,
      value: formatInt(raw.limite_emails_mes),
    },
    {
      key: "whatsapp",
      label: "Campanhas WhatsApp",
      help: "Limite mensal de disparos e campanhas via WhatsApp.",
      enabled: (raw.limite_whatsapp_mes ?? 0) > 0,
      value: (raw.limite_whatsapp_mes ?? 0) > 0 ? formatInt(raw.limite_whatsapp_mes) : "Não incluso",
    },
    {
      key: "integracoes",
      label: "Integrações com portais",
      help: "Publicação automatizada em portais imobiliários parceiros.",
      enabled: integracoes.length > 0,
      value: integracoes.length > 0 ? integracoes.join(", ") : "Não incluso",
    },
    {
      key: "ayka",
      label: "Créditos Ayka",
      help: "Franquia mensal de créditos para recursos AYKA.",
      enabled: true,
      value: formatInt(raw.ayka_franquia_mensal),
    },
    {
      key: "email_profissional",
      label: "E-mail profissional",
      help: "Endereço @corretor.one para uso profissional.",
      enabled: emailProfissional,
      value: emailProfissional ? "Incluído" : "Não incluso",
    },
    {
      key: "telefonia",
      label: "Telefonia digital (número fixo)",
      help: "Número fixo virtual para atendimento comercial.",
      enabled: raw.slug === "autoridade",
      value: raw.slug === "autoridade" ? "Incluído" : "Não incluso",
    },
    {
      key: "nfe",
      label: "Emissão de Notas Fiscais",
      help: "Suporte à emissão de NFs no fluxo operacional.",
      enabled: raw.slug === "autoridade",
      value: raw.slug === "autoridade" ? "Incluído" : "Não incluso",
    },
    {
      key: "contabilidade",
      label: "Contabilidade",
      help: "Recurso futuro para suporte contábil.",
      enabled: raw.slug === "autoridade",
      value: raw.slug === "autoridade" ? "Em breve" : "Não incluso",
    },
    {
      key: "juridico",
      label: "Suporte jurídico",
      help: "Recurso futuro para apoio jurídico.",
      enabled: raw.slug === "autoridade",
      value: raw.slug === "autoridade" ? "Em breve" : "Não incluso",
    },
  ];

  const enabledFeatures = allFeatures.filter((item) => item.enabled);
  const disabledFeatures = allFeatures.filter((item) => !item.enabled);

  return {
    nome: raw.nome,
    slug: raw.slug,
    destaque: PLAN_DESC[raw.slug] ?? "Plano corretor.one",
    precoMensal: raw.preco_mensal,
    precoAnual: raw.preco_anual,
    popular: raw.slug === "destaque",
    features: [...enabledFeatures, ...disabledFeatures],
  };
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex shrink-0 cursor-help">
      <Info size={14} className="text-slate-400" />
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-56 rounded-lg border border-slate-200 bg-white p-2 text-xs font-normal text-slate-600 shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function PublicPricingSection() {
  const [period, setPeriod] = useState<BillingPeriod>("MENSAL");
  const [plansRaw, setPlansRaw] = useState<PlanApi[]>(FALLBACK_PLANS);

  useEffect(() => {
    let mounted = true;
    fetch("/api/public/planos", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { ok?: boolean; data?: PlanApi[] }) => {
        if (!mounted || !json?.ok || !Array.isArray(json.data) || json.data.length === 0) return;
        setPlansRaw(json.data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const plans = useMemo(() => plansRaw.map(buildPlan), [plansRaw]);

  return (
    <section id="planos" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold md:text-5xl">Comece grátis. Cresça com estrutura.</h2>
        <p className="mt-3 text-base font-light text-[var(--blue-slate)]">
          Planos claros para cada fase da sua operação.
        </p>
        <div className="mt-6 inline-flex rounded-full border border-slate-300 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setPeriod("MENSAL")}
            className={`cursor-pointer rounded-full px-5 py-2 text-sm ${
              period === "MENSAL"
                ? "bg-[var(--primary-scarlet)] text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPeriod("ANUAL")}
            className={`cursor-pointer rounded-full px-5 py-2 text-sm ${
              period === "ANUAL"
                ? "bg-[var(--primary-scarlet)] text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Anual
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold text-emerald-700">Legenda:</span> check verde = recurso incluído, cinza =
          não incluso,{" "}
          <span className="inline-flex translate-y-[2px] align-middle">
            <Info size={12} className="text-slate-400" />
          </span>{" "}
          = detalhes.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plano) => {
          const price = period === "ANUAL" ? annualPrice(plano) : plano.precoMensal;
          const priceSuffix = period === "ANUAL" ? "/ano" : "/mês";
          const saving = annualSavings(plano);

          return (
            <article
              key={plano.slug}
              className={`relative flex h-full flex-col rounded-3xl border p-6 ${
                plano.popular
                  ? "border-[#b7a46a] bg-[linear-gradient(180deg,#eee6cf_0%,#f6f2e7_38%,#ffffff_100%)] shadow-md"
                  : "border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-bold text-slate-900">{plano.nome}</h3>
                {plano.popular ? (
                  <span className="rounded-full border border-[#b7a46a] bg-[#f4edd9]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a6932]">
                    Mais popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-light text-[var(--blue-slate)]">{plano.destaque}</p>
              <p className="mt-4 text-2xl font-bold text-slate-950">
                {formatCurrency(price)}
                <span className="ml-1 text-sm font-light text-slate-500">{priceSuffix}</span>
              </p>

              {period === "MENSAL" && plano.precoMensal > 0 ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-700">Economize 25% no anual</p>
                  <p className="mt-1 text-xs text-emerald-700/90">
                    Você economiza {formatCurrency(saving)} por ano nesse plano.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPeriod("ANUAL")}
                    className="mt-2 cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Ver valor anual
                  </button>
                </div>
              ) : null}

              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plano.features.map((item) => {
                  const textClass = item.enabled ? "text-[var(--blue-slate)]" : "text-slate-400";
                  const valueClass = item.enabled ? "text-slate-900" : "text-slate-400";
                  return (
                    <li key={`${plano.slug}-${item.key}`} className="flex items-start gap-2">
                      {item.enabled ? (
                        <CheckCircle
                          size={16}
                          weight="fill"
                          className="mt-[2px] shrink-0 text-emerald-500/80"
                        />
                      ) : (
                        <XCircle size={16} weight="bold" className="mt-[2px] shrink-0 text-slate-400" />
                      )}
                      <span className={`leading-5 ${textClass}`}>
                        {item.label}: <strong className={valueClass}>{item.value}</strong>
                      </span>
                      <Tooltip text={item.help} />
                    </li>
                  );
                })}
              </ul>

              <Link
                href={`/criar-conta?plano=${plano.slug}${period === "ANUAL" ? "&periodicidade=anual" : ""}`}
                className="mt-6 inline-flex rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Começar agora
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
