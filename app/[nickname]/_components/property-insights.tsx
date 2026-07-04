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
  CookingPot,
  Car,
  Info,
  MagnifyingGlassPlus,
  MapPin,
  Ruler,
  X,
} from "@phosphor-icons/react";
import { ImageLightbox } from "./image-lightbox";

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
    images: Array<{ url: string }>;
    summary: string | null;
    descriptionHtml: string;
    facts: Array<{ label: string; value: string }>;
    features: string[];
  } | null;
};

export function PropertyInsights({ data }: { data: PropertyInsightsData }) {
  const [showEmpreendimento, setShowEmpreendimento] = useState(false);
  const [empreendimentoLightboxIndex, setEmpreendimentoLightboxIndex] = useState<number | null>(null);
  const empreendimento = data.empreendimento;
  const hasLocationContext = Boolean(data.location.summary || data.location.groups.length);
  const hasEmpreendimentoDetails = Boolean(
    empreendimento && (empreendimento.descriptionHtml || empreendimento.features.length || empreendimento.facts.length),
  );

  useEffect(() => {
    if (!showEmpreendimento) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowEmpreendimento(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
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
            <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm font-normal leading-snug text-slate-600">
                  <span className="mt-0.5 text-[var(--grey-olive)]">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {data.ambientes.length ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">Ambientes</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Detalhes por espaço</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {data.ambientes.map((ambiente) => (
              <article key={ambiente.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <h3 className="text-lg font-bold leading-snug text-slate-950">{ambiente.title}</h3>
                {ambiente.tags.length ? (
                  <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {ambiente.tags.map((tag) => (
                      <li key={tag} className="flex items-start gap-2.5 text-sm font-normal leading-snug text-slate-600">
                        <span className="mt-0.5 text-[var(--grey-olive)]">✓</span>
                        <span>{tag}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm font-light text-slate-500">Detalhamento disponível mediante consulta.</p>
                )}
              </article>
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
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.location.groups.map((group) => (
              <div key={group.title} className="rounded-lg bg-stone-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--grey-olive)]">{group.title}</p>
                <ul className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm font-normal leading-snug text-slate-600">
                      <span className="mt-0.5 text-[var(--grey-olive)]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {empreendimento ? (
          <article className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col p-4 md:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--grey-olive)]">
                  Empreendimento
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-950">
                  <Link href={empreendimento.href} className="transition hover:text-[var(--grey-olive)]">
                    {empreendimento.name}
                  </Link>
                </h3>
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
                <div className="mt-5 flex flex-wrap gap-2 lg:mt-auto lg:pt-6">
                  {hasEmpreendimentoDetails ? (
                    <button
                      type="button"
                      onClick={() => setShowEmpreendimento(true)}
                      className="inline-flex items-center gap-2 px-0 py-2 text-sm font-bold text-[var(--grey-olive)] transition hover:text-slate-950"
                    >
                      Veja todas as características
                      <ArrowRight size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
              <EmpreendimentoGalleryGrid
                name={empreendimento.name}
                images={empreendimento.images}
                onOpenImage={setEmpreendimentoLightboxIndex}
              />
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
            className="max-h-[86vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-2xl"
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
            <div className="p-5">
              {empreendimento.descriptionHtml ? (
                <div
                  className="space-y-3 text-sm font-light leading-7 text-slate-700 [&_em]:italic [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_strong]:font-bold"
                  dangerouslySetInnerHTML={{ __html: empreendimento.descriptionHtml }}
                />
              ) : empreendimento.summary ? (
                <p className="text-sm font-light leading-7 text-slate-700">{empreendimento.summary}</p>
              ) : null}
              {empreendimento.features.length ? (
                <div className="mt-6 border-t border-stone-100 pt-5">
                  <p className="text-sm font-bold text-slate-950">Características</p>
                  <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {empreendimento.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm font-normal leading-snug text-slate-600">
                        <span className="mt-0.5 text-[var(--grey-olive)]">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {empreendimento ? (
        <ImageLightbox
          title={empreendimento.name}
          images={empreendimento.images}
          activeIndex={empreendimentoLightboxIndex}
          onActiveIndexChange={setEmpreendimentoLightboxIndex}
          onClose={() => setEmpreendimentoLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}

function EmpreendimentoGalleryGrid({
  name,
  images,
  onOpenImage,
}: {
  name: string;
  images: Array<{ url: string }>;
  onOpenImage: (index: number) => void;
}) {
  const cover = images[0] ?? null;
  const thumbnails = images.slice(1, 4);
  const remaining = Math.max(images.length - 4, 0);

  if (!cover) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-stone-400">
        <Buildings size={38} />
      </div>
    );
  }

  return (
    <div className="grid min-h-[320px] grid-cols-3 grid-rows-[1fr_1fr_0.62fr] gap-2 p-2 lg:min-h-[360px]">
      <button
        type="button"
        onClick={() => onOpenImage(0)}
        className="group relative col-span-3 row-span-2 cursor-zoom-in overflow-hidden rounded-lg bg-stone-200 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-[color:rgba(145,139,118,0.28)]"
        aria-label={`Ampliar imagem principal de ${name}`}
      >
        <Image
          src={cover.url}
          alt={name}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.035]"
          unoptimized
        />
        <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          <MagnifyingGlassPlus size={18} weight="bold" />
        </span>
      </button>
      {thumbnails.map((image, index) => (
        <button
          type="button"
          key={`${image.url}-${index}`}
          onClick={() => onOpenImage(index + 1)}
          className="group relative cursor-zoom-in overflow-hidden rounded-lg bg-stone-200 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-[color:rgba(145,139,118,0.28)]"
          aria-label={`Ampliar imagem ${index + 2} de ${name}`}
        >
          <Image
            src={image.url}
            alt={`${name} - imagem ${index + 2}`}
            fill
            sizes="(min-width: 1024px) 180px, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.035]"
            unoptimized
          />
          <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
            <MagnifyingGlassPlus size={18} weight="bold" />
          </span>
          {index === 2 && remaining > 0 ? (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-sm font-bold text-white backdrop-blur-[1px]">
              +{remaining} imagens
            </span>
          ) : null}
        </button>
      ))}
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
