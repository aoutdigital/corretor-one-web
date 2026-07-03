"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Bathtub,
  Bed,
  Buildings,
  CaretDown,
  CheckCircle,
  CookingPot,
  Car,
  HouseLine,
  Info,
  MapPin,
  Ruler,
  X,
} from "@phosphor-icons/react";

type StatIconKey = "area" | "bed" | "bath" | "car" | "living" | "kitchen";

export type PropertyInsightsData = {
  stats: Array<{
    label: string;
    value: string;
    unit: string | null;
    detail: string | null;
    detailItems: string[];
    iconKey: StatIconKey;
    secondary: { label: string; value: string; unit: string | null } | null;
  }>;
  ambientes: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    area: string | null;
    tags: string[];
  }>;
  features: string[];
  description: {
    short: string | null;
    html: string;
  };
  location: {
    address: string;
    summary: string | null;
    groups: Array<{ title: string; items: string[] }>;
    mapQuery: string;
  };
  empreendimento: {
    name: string;
    href: string;
    imageUrl: string | null;
    summary: string | null;
    descriptionHtml: string;
    facts: Array<{ label: string; value: string }>;
    features: string[];
  } | null;
};

export function PropertyInsights({ data }: { data: PropertyInsightsData }) {
  const [showEmpreendimento, setShowEmpreendimento] = useState(false);
  const empreendimento = data.empreendimento;
  const hasLocationContext = Boolean(data.location.summary || data.location.groups.length);
  const hasEmpreendimentoDetails = Boolean(
    empreendimento && (empreendimento.descriptionHtml || empreendimento.features.length || empreendimento.facts.length),
  );

  useEffect(() => {
    if (!showEmpreendimento) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowEmpreendimento(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEmpreendimento]);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">O imóvel</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="text-3xl font-bold text-slate-950">Dados principais</h2>
        </div>

        {data.stats.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.stats.map((stat) => (
              <div
                key={`${stat.label}-${stat.value}`}
                className="relative flex min-h-20 gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3"
              >
                {stat.detailItems.length ? <StatDetailTooltip items={stat.detailItems} /> : null}
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--grey-olive)] shadow-sm">
                  <StatIcon iconKey={stat.iconKey} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={stat.secondary ? "grid grid-cols-2 gap-3" : "block"}>
                    <span>
                      <span className="flex items-baseline gap-1 text-slate-950">
                        <span className="text-3xl font-light leading-none">{stat.value}</span>
                        {stat.unit ? <span className="text-sm font-bold leading-none">{stat.unit}</span> : null}
                      </span>
                      <span className="mt-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                        {stat.label}
                      </span>
                    </span>
                    {stat.secondary ? (
                      <span className="border-l border-stone-200 pl-3">
                        <span className="flex items-baseline gap-1 text-slate-950">
                          <span className="text-3xl font-light leading-none">{stat.secondary.value}</span>
                          {stat.secondary.unit ? <span className="text-sm font-bold leading-none">{stat.secondary.unit}</span> : null}
                        </span>
                        <span className="mt-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                          {stat.secondary.label}
                        </span>
                      </span>
                    ) : null}
                  </span>
                  {stat.detail ? (
                    <span className="mt-2 block text-xs font-light leading-5 text-slate-500">{stat.detail}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {data.features.length ? (
          <div className="mt-6 border-t border-stone-100 pt-5">
            <p className="text-sm font-bold text-slate-950">Características</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.features.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 ring-1 ring-stone-200"
                >
                  <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {data.ambientes.length ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">Ambientes</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Detalhes por espaço</h2>

          <div className="mt-5 divide-y divide-stone-100 rounded-lg border border-stone-200">
            {data.ambientes.map((ambiente) => (
              <details key={ambiente.id} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition hover:bg-stone-50">
                  <span className="min-w-0">
                    <span className="block font-bold leading-snug text-slate-950">{ambiente.title}</span>
                    <span className="mt-1 block text-sm font-light text-slate-500">
                      {[ambiente.subtitle, ambiente.area].filter(Boolean).join(" · ") || "Ver detalhes do ambiente"}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-stone-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                    Detalhes
                    <CaretDown size={14} className="transition group-open:rotate-180" />
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  {ambiente.tags.length ? (
                    <div className="flex flex-wrap gap-2">
                      {ambiente.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-stone-50 px-3 py-1.5 text-sm font-bold text-slate-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-light text-slate-500">Detalhamento disponível mediante consulta.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section id="descricao" className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">Descrição</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Conheça este imóvel</h2>
        {data.description.short ? (
          <p className="mt-4 text-lg font-light leading-8 text-slate-700">{data.description.short}</p>
        ) : null}
        <div
          className="mt-5 space-y-4 text-sm font-light leading-7 text-slate-700 [&_em]:italic [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-4 [&_strong]:font-bold [&_ul]:space-y-1"
          dangerouslySetInnerHTML={{ __html: data.description.html }}
        />
      </section>

      <section id="localizacao" className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">Sobre a localização</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-50 text-[var(--grey-olive)]">
            <MapPin size={22} />
          </span>
          <div>
            <h2 className="text-3xl font-bold text-slate-950">{data.location.address}</h2>
            {data.location.summary ? (
              <p className="mt-3 text-sm font-light leading-7 text-slate-600">{data.location.summary}</p>
            ) : null}
          </div>
        </div>

        {hasLocationContext ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {data.location.groups.map((group) => (
              <div key={group.title} className="min-w-[190px] flex-1 rounded-lg bg-stone-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--grey-olive)]">{group.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {empreendimento ? (
          <article className="mt-6 overflow-hidden rounded-lg border border-stone-200">
            <div className="relative aspect-[16/7] bg-stone-100">
              {empreendimento.imageUrl ? (
                <Image src={empreendimento.imageUrl} alt={empreendimento.name} fill sizes="820px" className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400">
                  <Buildings size={38} />
                </div>
              )}
            </div>
            <div className="p-4 md:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--grey-olive)]">
                Empreendimento nessa localização
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-950">{empreendimento.name}</h3>
              {empreendimento.summary ? (
                <p className="mt-2 text-sm font-light leading-6 text-slate-600">{empreendimento.summary}</p>
              ) : null}
              {empreendimento.facts.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {empreendimento.facts.slice(0, 6).map((fact) => (
                    <span key={fact.label} className="rounded-full bg-stone-50 px-3 py-1.5 text-sm text-slate-700">
                      <strong>{fact.label}:</strong> {fact.value}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={empreendimento.href}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--black)] px-3 py-2 text-sm font-bold text-white transition hover:bg-[var(--blue-slate)]"
                >
                  Página do empreendimento
                  <ArrowRight size={15} />
                </Link>
                {hasEmpreendimentoDetails ? (
                  <button
                    type="button"
                    onClick={() => setShowEmpreendimento(true)}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--grey-olive)]"
                  >
                    Ver detalhes
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
          <iframe
            title={`Mapa de ${data.location.address}`}
            src={`https://maps.google.com/maps?q=${data.location.mapQuery}&z=15&output=embed`}
            className="h-[280px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {showEmpreendimento && empreendimento ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes de ${empreendimento.name}`}
          onMouseDown={() => setShowEmpreendimento(false)}
        >
          <div
            className="max-h-[86vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--grey-olive)]">Empreendimento</p>
                <h3 className="text-xl font-bold text-slate-950">{empreendimento.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmpreendimento(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-slate-700 transition hover:bg-stone-50"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-[0.9fr_1.1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100">
                {empreendimento.imageUrl ? (
                  <Image src={empreendimento.imageUrl} alt={empreendimento.name} fill sizes="360px" className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400">
                    <HouseLine size={36} />
                  </div>
                )}
              </div>
              <div>
                {empreendimento.descriptionHtml ? (
                  <div
                    className="space-y-3 text-sm font-light leading-7 text-slate-700 [&_em]:italic [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: empreendimento.descriptionHtml }}
                  />
                ) : empreendimento.summary ? (
                  <p className="text-sm font-light leading-7 text-slate-700">{empreendimento.summary}</p>
                ) : null}
                {empreendimento.features.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-bold text-slate-950">Características</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {empreendimento.features.map((feature) => (
                        <span key={feature} className="rounded-full bg-stone-50 px-3 py-1.5 text-sm font-bold text-slate-700">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Link
                  href={empreendimento.href}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--primary-scarlet)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
                >
                  Abrir página
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatIcon({ iconKey }: { iconKey: StatIconKey }) {
  const size = 22;
  if (iconKey === "area") return <Ruler size={size} />;
  if (iconKey === "bed") return <Bed size={size} />;
  if (iconKey === "bath") return <Bathtub size={size} />;
  if (iconKey === "car") return <Car size={size} />;
  if (iconKey === "kitchen") return <CookingPot size={size} />;
  return <Armchair size={size} />;
}

function StatDetailTooltip({ items }: { items: string[] }) {
  return (
    <span className="group/stat-tooltip absolute right-3 top-3 z-10 inline-flex" tabIndex={0} aria-label="Detalhes da vaga">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-500 shadow-sm transition group-hover/stat-tooltip:border-[var(--grey-olive)] group-hover/stat-tooltip:text-slate-950 group-focus/stat-tooltip:border-[var(--grey-olive)] group-focus/stat-tooltip:text-slate-950">
        <Info size={13} weight="bold" />
      </span>
      <span className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-56 rounded-md bg-slate-900 px-2.5 py-2 text-[11px] leading-snug text-white shadow-lg group-hover/stat-tooltip:block group-focus/stat-tooltip:block">
        {items.join(" · ")}
      </span>
    </span>
  );
}
