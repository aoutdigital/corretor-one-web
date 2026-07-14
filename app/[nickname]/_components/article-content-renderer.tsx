"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bathtub,
  Bed,
  Buildings,
  Car,
  CaretLeft,
  CaretRight,
  HouseLine,
  ImageSquare,
  MapPin,
  PhoneCall,
  Ruler,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";

import { ARTIGO_CTA_CONFIGS, type ArtigoBlock, type ArtigoConteudo, type ArtigoCtaType, type ArtigoPropertyCarouselFilters } from "@/lib/artigos/content";
import { buildImovelHeaderTitle } from "@/lib/imoveis/display-title";
import type { PublicPropertyCardImovel } from "./public-property-card";
import { LeadCuradoriaButton } from "./lead-curadoria-button";
import { LeadWhatsAppButton } from "./lead-whatsapp-button";
import { ProtectedPhoneButton } from "./protected-phone-button";

type ArticleContentRendererProps = {
  content: ArtigoConteudo;
  nickname: string;
  brokerName: string;
  avatarUrl?: string | null;
  creci?: string | null;
  interactive?: boolean;
};

type ArticleLightboxImage = {
  key: string;
  url: string;
  alt: string;
  caption?: string | null;
};
type ArticlePropertyItem = PublicPropertyCardImovel & {
  capa_url_publica_thumb_webp?: string | null;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function ArticleContentRenderer({
  content,
  nickname,
  brokerName,
  avatarUrl,
  creci,
  interactive = true,
}: ArticleContentRendererProps) {
  const lightboxImages = useMemo(() => collectArticleImages(content), [content]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowLeft") {
        setLightboxIndex((current) => (current === null ? current : (current - 1 + lightboxImages.length) % lightboxImages.length));
      }
      if (event.key === "ArrowRight") {
        setLightboxIndex((current) => (current === null ? current : (current + 1) % lightboxImages.length));
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, lightboxImages.length]);

  function openLightbox(imageKey: string) {
    const index = lightboxImages.findIndex((image) => image.key === imageKey);
    if (index >= 0) setLightboxIndex(index);
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-8 text-slate-700">
        {content.blocks.map((block) => (
          <ArticleBlockRenderer
            key={block.id}
            block={block}
            nickname={nickname}
            brokerName={brokerName}
            avatarUrl={avatarUrl}
            creci={creci}
            interactive={interactive}
            onOpenImage={openLightbox}
          />
        ))}
      </div>
      {interactive && lightboxIndex !== null && lightboxImages[lightboxIndex] ? (
        <ArticleImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrevious={() => setLightboxIndex((current) => (current === null ? current : (current - 1 + lightboxImages.length) % lightboxImages.length))}
          onNext={() => setLightboxIndex((current) => (current === null ? current : (current + 1) % lightboxImages.length))}
        />
      ) : null}
    </>
  );
}

function ArticleBlockRenderer({
  block,
  nickname,
  brokerName,
  avatarUrl,
  creci,
  interactive,
  onOpenImage,
}: {
  block: ArtigoBlock;
  nickname: string;
  brokerName: string;
  avatarUrl?: string | null;
  creci?: string | null;
  interactive: boolean;
  onOpenImage: (imageKey: string) => void;
}) {
  if (block.type === "paragraph") {
    return (
      <div
        className="article-rich-text text-lg font-light leading-8 text-slate-600 [&_a]:font-medium [&_a]:text-slate-950 [&_a]:underline [&_a]:decoration-[var(--grey-olive)] [&_a]:underline-offset-4 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_strong]:font-bold [&_strong]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: block.data.content }}
      />
    );
  }

  if (block.type === "heading") {
    if (block.data.level === 3) {
      return <h3 className="pt-3 text-2xl font-light leading-tight text-slate-950">{renderInline(block.data.content)}</h3>;
    }
    return <h2 className="pt-5 text-3xl font-light leading-tight text-slate-950 md:text-4xl">{renderInline(block.data.content)}</h2>;
  }

  if (block.type === "quote") {
    return (
      <blockquote className="rounded-2xl border-l-4 border-[var(--grey-olive)] bg-stone-50 px-6 py-5">
        <p className="text-2xl font-light leading-snug text-slate-950">“{renderInline(block.data.content)}”</p>
        {block.data.author ? <footer className="mt-4 text-sm font-bold text-[var(--grey-olive)]">{block.data.author}</footer> : null}
      </blockquote>
    );
  }

  if (block.type === "list") {
    const ListTag = block.data.style === "ordered" ? "ol" : "ul";
    return (
      <ListTag className={`space-y-3 text-lg font-light leading-8 text-slate-600 ${block.data.style === "ordered" ? "list-decimal pl-6" : ""}`}>
        {block.data.items.map((item, index) => (
          <li key={`${item}-${index}`} className={block.data.style === "bullet" ? "flex gap-3" : undefined}>
            {block.data.style === "bullet" ? (
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--grey-olive)]" />
            ) : null}
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "image") {
    const imageKey = getArticleImageKey(block.id, 0);
    return (
      <figure className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={interactive ? () => onOpenImage(imageKey) : undefined}
          className="group relative block aspect-[16/10] w-full cursor-zoom-in bg-stone-100 text-left"
          aria-label="Ampliar imagem do artigo"
        >
          <Image src={block.data.url} alt={block.data.alt} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" unoptimized />
          <span className="pointer-events-none absolute inset-0 bg-slate-950/0 transition group-hover:bg-slate-950/10" />
          <span className="pointer-events-none absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-950 opacity-0 shadow-sm transition group-hover:opacity-100">
            <ImageSquare size={20} />
          </span>
        </button>
        {block.data.caption ? <figcaption className="px-4 py-3 text-sm font-light text-slate-500">{block.data.caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === "gallery") {
    return <ArticleGallery block={block} interactive={interactive} onOpenImage={onOpenImage} />;
  }

  if (block.type === "property_feature") {
    return <ArticlePropertyFeature nickname={nickname} propertyId={block.data.propertyId} />;
  }

  if (block.type === "property_carousel") {
    return (
      <ArticlePropertyCarousel
        nickname={nickname}
        title={block.data.title}
        subtitle={block.data.subtitle}
        filters={block.data.filters}
      />
    );
  }

  if (block.type === "youtube") {
    return (
      <figure className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="bg-slate-950">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${block.data.videoId}`}
            title="Vídeo do artigo"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        {block.data.caption ? <figcaption className="px-4 py-3 text-sm font-light text-slate-500">{block.data.caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === "cta") {
    const cta = ARTIGO_CTA_CONFIGS[block.data.ctaType];
    const ctaButtonClass =
      "inline-flex items-center justify-center gap-2 rounded-full border border-[color:rgba(145,139,118,0.42)] bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-[color:rgba(145,139,118,0.72)] hover:bg-stone-50";
    const ctaPrimaryButtonClass =
      "inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[var(--grey-olive)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110";
    if (!interactive) {
      return (
        <div className="my-10 border-y border-stone-200 px-4 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--grey-olive)]">Próximo passo</p>
          <h3 className="mx-auto mt-4 max-w-2xl text-3xl font-light leading-tight text-slate-950 md:text-4xl">{cta.title}</h3>
          <p className="mx-auto mt-4 max-w-2xl text-base font-light leading-7 text-slate-600">{cta.subtitle}</p>
          <div className="mt-7 flex justify-center">
            <StaticArticleCtaButton ctaType={block.data.ctaType} buttonLabel={cta.buttonLabel} className={block.data.ctaType === "curadoria" ? ctaPrimaryButtonClass : ctaButtonClass} />
          </div>
        </div>
      );
    }

    return (
      <div className="my-10 border-y border-stone-200 px-4 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--grey-olive)]">Próximo passo</p>
        <h3 className="mx-auto mt-4 max-w-2xl text-3xl font-light leading-tight text-slate-950 md:text-4xl">{cta.title}</h3>
        <p className="mx-auto mt-4 max-w-2xl text-base font-light leading-7 text-slate-600">{cta.subtitle}</p>
        <div className="mt-7 flex justify-center">
          {block.data.ctaType === "whatsapp" ? (
            <LeadWhatsAppButton
              nickname={nickname}
              brokerName={brokerName}
              avatarUrl={avatarUrl}
              creci={creci}
              label={cta.buttonLabel}
              className={ctaButtonClass}
            >
              <WhatsappLogo size={18} className="text-emerald-600" />
              {cta.buttonLabel}
            </LeadWhatsAppButton>
          ) : block.data.ctaType === "phone" ? (
            <ProtectedPhoneButton
              nickname={nickname}
              brokerName={brokerName}
              avatarUrl={avatarUrl}
              creci={creci}
              className={ctaButtonClass}
            >
              <PhoneCall size={18} className="text-[var(--grey-olive)]" />
              {cta.buttonLabel}
            </ProtectedPhoneButton>
          ) : block.data.ctaType === "inventory" ? (
            <Link
              href={`/${nickname}/imoveis`}
              className={ctaButtonClass}
            >
              {cta.buttonLabel}
              <ArrowRight size={18} className="text-[var(--grey-olive)]" />
            </Link>
          ) : block.data.ctaType === "advertise" ? (
            <Link
              href={`/${nickname}/anuncie`}
              className={ctaButtonClass}
            >
              {cta.buttonLabel}
              <ArrowRight size={18} className="text-[var(--grey-olive)]" />
            </Link>
          ) : (
            <LeadCuradoriaButton
              nickname={nickname}
              brokerName={brokerName}
              avatarUrl={avatarUrl}
              creci={creci}
              className={ctaPrimaryButtonClass}
            >
              {cta.buttonLabel}
              <ArrowRight size={18} />
            </LeadCuradoriaButton>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "button") {
    const external = block.data.kind === "external";
    return (
      <p>
        <Link
          href={block.data.url}
          target={external ? "_blank" : undefined}
          rel={external ? "nofollow noopener noreferrer" : undefined}
          className="inline-flex items-center gap-2 rounded-lg border border-[color:rgba(145,139,118,0.45)] px-4 py-2.5 text-sm font-bold text-[var(--grey-olive)] transition hover:bg-stone-50"
        >
          {block.data.label}
          <ArrowRight size={16} />
        </Link>
      </p>
    );
  }

  return null;
}

function StaticArticleCtaButton({
  ctaType,
  buttonLabel,
  className,
}: {
  ctaType: ArtigoCtaType;
  buttonLabel: string;
  className: string;
}) {
  return (
    <span className={className}>
      {ctaType === "whatsapp" ? <WhatsappLogo size={18} className="text-emerald-600" /> : null}
      {ctaType === "phone" ? <PhoneCall size={18} className="text-[var(--grey-olive)]" /> : null}
      {buttonLabel}
      {ctaType !== "whatsapp" && ctaType !== "phone" ? <ArrowRight size={18} className={ctaType === "curadoria" ? undefined : "text-[var(--grey-olive)]"} /> : null}
    </span>
  );
}

function ArticlePropertyFeature({ nickname, propertyId }: { nickname: string; propertyId: string | null }) {
  const { items, loading } = useArticleProperties(nickname, { propertyId: propertyId ?? "", limit: 1 });
  const property = items[0];

  if (!propertyId) return null;
  if (loading) return <ArticlePropertySkeleton horizontal />;
  if (!property) return null;

  return (
    <div className="relative left-1/2 my-10 w-screen max-w-5xl -translate-x-1/2 px-5">
      <ArticlePropertyCard nickname={nickname} property={property} horizontal />
    </div>
  );
}

function ArticlePropertyCarousel({
  nickname,
  title,
  subtitle,
  filters,
}: {
  nickname: string;
  title: string;
  subtitle?: string | null;
  filters: ArtigoPropertyCarouselFilters;
}) {
  const { items, loading } = useArticleProperties(nickname, { filters, limit: 10 });

  if (loading) {
    return (
      <div className="relative left-1/2 my-12 w-screen max-w-6xl -translate-x-1/2 px-5">
        <ArticlePropertySkeleton />
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <section className="relative left-1/2 my-12 w-screen max-w-6xl -translate-x-1/2 px-5">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--grey-olive)]">Imóveis</p>
        <h3 className="mt-3 text-3xl font-light leading-tight text-slate-950 md:text-4xl">{title}</h3>
        {subtitle ? <p className="mt-3 text-base font-light leading-7 text-slate-600">{subtitle}</p> : null}
      </div>
      <div className="mt-8 flex snap-x gap-5 overflow-x-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((property) => (
          <div key={property.id} className="w-[82vw] max-w-[340px] shrink-0 snap-start sm:w-[340px]">
            <ArticlePropertyCard nickname={nickname} property={property} />
          </div>
        ))}
      </div>
    </section>
  );
}

function useArticleProperties(
  nickname: string,
  query: { propertyId?: string; filters?: ArtigoPropertyCarouselFilters; limit?: number },
) {
  const [items, setItems] = useState<ArticlePropertyItem[]>([]);
  const [loadedQueryKey, setLoadedQueryKey] = useState("");
  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  useEffect(() => {
    const parsedQuery = JSON.parse(queryKey) as {
      propertyId?: string;
      filters?: ArtigoPropertyCarouselFilters;
      limit?: number;
    };

    if (parsedQuery.propertyId !== undefined && !parsedQuery.propertyId) {
      Promise.resolve().then(() => {
        setItems([]);
        setLoadedQueryKey(queryKey);
      });
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("limit", String(parsedQuery.limit ?? 8));
    if (parsedQuery.propertyId) params.set("property_id", parsedQuery.propertyId);
    const filters = parsedQuery.filters;
    if (filters?.cidade) params.set("cidade", filters.cidade);
    if (filters?.bairro) params.set("bairro", filters.bairro);
    if (filters?.empreendimentoId) params.set("empreendimento_id", filters.empreendimentoId);
    if (filters?.dormitoriosMin) params.set("dormitorios_min", String(filters.dormitoriosMin));
    if (filters?.suitesMin) params.set("suites_min", String(filters.suitesMin));
    if (filters?.vagasMin) params.set("vagas_min", String(filters.vagasMin));
    if (filters?.valorMin) params.set("valor_min", String(filters.valorMin));
    if (filters?.valorMax) params.set("valor_max", String(filters.valorMax));
    for (const value of filters?.caracteristicasImovel ?? []) params.append("caracteristicas_imovel", value);
    for (const value of filters?.caracteristicasEmpreendimento ?? []) params.append("caracteristicas_empreendimento", value);

    fetch(`/api/public/profiles/${nickname}/article-properties?${params.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Falha ao buscar imóveis."))))
      .then((payload: { ok?: boolean; data?: ArticlePropertyItem[] }) => setItems(payload.ok ? payload.data ?? [] : []))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setItems([]);
      })
      .finally(() => setLoadedQueryKey(queryKey));

    return () => controller.abort();
  }, [nickname, queryKey]);

  return { items, loading: loadedQueryKey !== queryKey };
}

function ArticlePropertyCard({
  nickname,
  property,
  horizontal = false,
}: {
  nickname: string;
  property: ArticlePropertyItem;
  horizontal?: boolean;
}) {
  if (!property.slug_publico) return null;

  const title = buildImovelHeaderTitle(property);
  const operation = property.tipo_negociacao === "ALUGUEL" ? "aluguel" : "venda";
  const price = property.tipo_negociacao === "ALUGUEL" && property.preco_locacao ? property.preco_locacao : property.preco_venda;
  const priceParts = price ? formatCurrencyParts(price) : null;
  const stats = buildPropertyStats(property);
  const charges = [
    property.condominio ? `Cond.: ${currencyFormatter.format(property.condominio)}/mês` : null,
    property.iptu ? `IPTU: ${currencyFormatter.format(property.iptu)}/${property.iptu_periodicidade === "MENSAL" ? "mês" : "ano"}` : null,
  ].filter(Boolean);
  const imageUrl = property.capa_url_publica_thumb_webp ?? null;
  const empreendimentoName = property.empreendimentos?.nome;

  return (
    <Link
      href={`/${nickname}/${operation}/${property.slug_publico}`}
      className={`group block h-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.55)] hover:shadow-md ${
        horizontal ? "md:grid md:grid-cols-[42%_1fr]" : ""
      }`}
    >
      <div className={`relative bg-stone-100 ${horizontal ? "aspect-[4/3] md:aspect-auto md:min-h-[260px]" : "aspect-[4/3]"}`}>
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill sizes={horizontal ? "(min-width: 768px) 420px, 100vw" : "340px"} className="object-cover transition duration-500 group-hover:scale-[1.03]" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--grey-olive)]">
            <HouseLine size={36} weight="light" />
          </div>
        )}
        {empreendimentoName ? (
          <span className="absolute bottom-3 right-3 inline-flex max-w-[72%] items-center gap-1 rounded-full bg-white/82 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-700 shadow-sm backdrop-blur">
            <Buildings size={11} className="shrink-0 text-[var(--grey-olive)]" />
            <span className="truncate">{empreendimentoName}</span>
          </span>
        ) : null}
      </div>
      <div className="flex h-full flex-col p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">{formatEnumLabel(property.tipo)}</p>
        <h3 className="mt-2 line-clamp-2 text-2xl font-light leading-snug text-slate-950">{title}</h3>
        <p className="mt-3 flex items-start gap-1.5 text-sm font-light leading-snug text-slate-500">
          <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--grey-olive)]" />
          <span className="line-clamp-2">{buildAddressLine(property)}</span>
        </p>
        {stats.length ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <span key={stat.label} className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                  <Icon size={14} className="text-[var(--grey-olive)]" />
                  {stat.label}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="mt-auto border-t border-stone-100 pt-4">
          {priceParts ? (
            <p className="flex items-start gap-0 text-slate-950">
              <span className="relative top-[4px] text-sm font-light">{priceParts.symbol}</span>
              <span className="text-2xl font-light tracking-[-0.01em]">{priceParts.value}</span>
            </p>
          ) : (
            <p className="text-2xl font-light tracking-[-0.01em] text-slate-950">Consulte valores</p>
          )}
          {charges.length ? (
            <p className="mt-2 flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden text-[11px] font-light leading-none text-slate-500">
              {charges.map((charge) => (
                <span key={charge} className="min-w-0 shrink truncate">
                  {charge}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ArticlePropertySkeleton({ horizontal = false }: { horizontal?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${horizontal ? "md:grid md:grid-cols-[42%_1fr]" : "max-w-sm"}`}>
      <div className="aspect-[4/3] animate-pulse bg-stone-100" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 rounded bg-stone-100" />
        <div className="h-7 w-4/5 rounded bg-stone-100" />
        <div className="h-4 w-3/5 rounded bg-stone-100" />
        <div className="h-8 w-40 rounded bg-stone-100" />
      </div>
    </div>
  );
}

function ArticleGallery({
  block,
  interactive,
  onOpenImage,
}: {
  block: Extract<ArtigoBlock, { type: "gallery" }>;
  interactive: boolean;
  onOpenImage: (imageKey: string) => void;
}) {
  const images = block.data.images;
  if (images.length === 0) return null;

  if (images.length === 1) {
    const image = images[0];
    return (
      <figure className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <GalleryImageButton
          image={image}
          imageKey={getArticleImageKey(block.id, 0)}
          sizes="(min-width: 768px) 768px, 100vw"
          className="aspect-[16/10]"
          interactive={interactive}
          onOpenImage={onOpenImage}
        />
        {image.caption ? <figcaption className="px-4 py-3 text-sm font-light text-slate-500">{image.caption}</figcaption> : null}
      </figure>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((image, index) => (
          <figure key={`${image.url}-${index}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <GalleryImageButton
              image={image}
              imageKey={getArticleImageKey(block.id, index)}
              sizes="(min-width: 768px) 384px, 100vw"
              className="aspect-[4/3]"
              interactive={interactive}
              onOpenImage={onOpenImage}
            />
            {image.caption ? <figcaption className="px-4 py-3 text-sm font-light text-slate-500">{image.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    );
  }

  const visibleImages = images.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-3 sm:aspect-[16/9] sm:grid-cols-3 sm:grid-rows-2">
      {visibleImages.map((image, index) => (
        <figure
          key={`${image.url}-${index}`}
          className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm sm:h-full ${
            index === 0 ? "sm:col-span-2 sm:row-span-2" : ""
          }`}
        >
          <GalleryImageButton
            image={image}
            imageKey={getArticleImageKey(block.id, index)}
            sizes={index === 0 ? "(min-width: 768px) 512px, 100vw" : "(min-width: 768px) 256px, 100vw"}
            className="aspect-[4/3] sm:h-full sm:aspect-auto"
            overlayLabel={index === 2 ? `+${images.length} imagens` : undefined}
            interactive={interactive}
            onOpenImage={onOpenImage}
          />
        </figure>
      ))}
    </div>
  );
}

function GalleryImageButton({
  image,
  imageKey,
  sizes,
  className,
  overlayLabel,
  interactive,
  onOpenImage,
}: {
  image: { url: string; alt: string; caption?: string | null };
  imageKey: string;
  sizes: string;
  className: string;
  overlayLabel?: string;
  interactive: boolean;
  onOpenImage: (imageKey: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={interactive ? () => onOpenImage(imageKey) : undefined}
      className={`group relative block w-full cursor-zoom-in overflow-hidden bg-stone-100 text-left ${className}`}
      aria-label="Ampliar imagem do artigo"
    >
      <Image src={image.url} alt={image.alt} fill sizes={sizes} className="object-cover transition duration-500 group-hover:scale-[1.02]" unoptimized />
      <span className="pointer-events-none absolute inset-0 bg-slate-950/0 transition group-hover:bg-slate-950/10" />
      {overlayLabel ? (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-xl font-light text-white backdrop-blur-[1px]">
          {overlayLabel}
        </span>
      ) : (
        <span className="pointer-events-none absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-950 opacity-0 shadow-sm transition group-hover:opacity-100">
          <ImageSquare size={18} />
        </span>
      )}
    </button>
  );
}

function ArticleImageLightbox({
  images,
  index,
  onClose,
  onPrevious,
  onNext,
}: {
  images: ArticleLightboxImage[];
  index: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const image = images[index];
  if (!image) return null;
  const showNavigation = images.length > 1;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/95 px-4 py-6 text-white">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
        aria-label="Fechar imagem ampliada"
      >
        <X size={24} />
      </button>

      {showNavigation ? (
        <button
          type="button"
          onClick={onPrevious}
          className="absolute left-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
          aria-label="Imagem anterior"
        >
          <CaretLeft size={26} />
        </button>
      ) : null}

      <figure className="flex h-full w-full max-w-6xl flex-col items-center justify-center gap-4">
        <div className="relative w-full flex-1">
          <Image src={image.url} alt={image.alt} fill sizes="100vw" className="object-contain" unoptimized />
        </div>
        <figcaption className="min-h-6 text-center text-sm font-light text-white/70">
          <span className="font-medium text-white/90">{index + 1} de {images.length}</span>
          {image.caption ? <span> · {image.caption}</span> : null}
        </figcaption>
      </figure>

      {showNavigation ? (
        <button
          type="button"
          onClick={onNext}
          className="absolute right-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
          aria-label="Próxima imagem"
        >
          <CaretRight size={26} />
        </button>
      ) : null}
    </div>
  );
}

function collectArticleImages(content: ArtigoConteudo): ArticleLightboxImage[] {
  return content.blocks.flatMap((block) => {
    if (block.type === "image") {
      return [{ key: getArticleImageKey(block.id, 0), url: block.data.url, alt: block.data.alt, caption: block.data.caption }];
    }
    if (block.type === "gallery") {
      return block.data.images.map((image, index) => ({
        key: getArticleImageKey(block.id, index),
        url: image.url,
        alt: image.alt,
        caption: image.caption,
      }));
    }
    return [];
  });
}

function getArticleImageKey(blockId: string, index: number) {
  return `${blockId}:${index}`;
}

function renderInline(content: string) {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|\[[^\]]+\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content))) {
    if (match.index > lastIndex) nodes.push(content.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-bold text-slate-800">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("__") && token.endsWith("__")) {
      nodes.push(
        <span key={key} className="underline underline-offset-4">
          {token.slice(2, -2)}
        </span>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = linkMatch?.[1] ?? token;
      const url = linkMatch?.[2] ?? "";
      const safeUrl = normalizeInlineUrl(url);
      if (safeUrl) {
        const external = !safeUrl.startsWith("/");
        nodes.push(
          <Link
            key={key}
            href={safeUrl}
            target={external ? "_blank" : undefined}
            rel={external ? "nofollow noopener noreferrer" : undefined}
            className="font-medium text-slate-950 underline decoration-[var(--grey-olive)] underline-offset-4"
          >
            {label}
          </Link>,
        );
      } else {
        nodes.push(label);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < content.length) nodes.push(content.slice(lastIndex));
  return nodes;
}

function normalizeInlineUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function buildPropertyStats(property: ArticlePropertyItem) {
  const areaLabel = formatAreaSummary(property);
  return [
    areaLabel ? { icon: Ruler, label: areaLabel } : null,
    property.dormitorios ? { icon: Bed, label: `${padSmallNumber(property.dormitorios)} ${property.dormitorios === 1 ? "dormitório" : "dormitórios"}` } : null,
    property.suites ? { icon: Bed, label: `${padSmallNumber(property.suites)} ${property.suites === 1 ? "suíte" : "suítes"}` } : null,
    property.banheiros ? { icon: Bathtub, label: `${padSmallNumber(property.banheiros)} ${property.banheiros === 1 ? "banheiro" : "banheiros"}` } : null,
    property.vagas ? { icon: Car, label: `${padSmallNumber(property.vagas)} ${property.vagas === 1 ? "vaga" : "vagas"}` } : null,
  ].filter(isPropertyStat);
}

function isPropertyStat(value: { icon: typeof Ruler; label: string } | null): value is { icon: typeof Ruler; label: string } {
  return value !== null;
}

function padSmallNumber(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function formatAreaSummary(property: ArticlePropertyItem) {
  if (property.area_util && property.area_total && property.area_util !== property.area_total) {
    return `${property.area_util} m² úteis · ${property.area_total} m² totais`;
  }
  const area = property.area_util ?? property.area_total;
  if (!area) return null;
  return `${area} m²`;
}

function formatCurrencyParts(value: number) {
  const formatted = currencyFormatter.format(value).replace(/\s/g, " ");
  const match = formatted.match(/^(R\$)\s*(.+)$/);
  if (!match) return { symbol: "", value: formatted };
  return { symbol: match[1], value: match[2] };
}

function buildAddressLine(property: ArticlePropertyItem) {
  const bairro = property.bairro_comercial || property.bairro;
  const cityState = `${property.cidade}/${property.estado}`;

  if (property.enderecovisualizacao === "END_BAIRRO") return [bairro, cityState].filter(Boolean).join(" - ");

  const shouldShowNumber = property.enderecovisualizacao === "END_COMPLETO" && !property.ocultar_numero_publico;
  const street = [property.logradouro, shouldShowNumber ? property.numero : null].filter(Boolean).join(", ");
  const complement =
    property.enderecovisualizacao === "END_COMPLETO" && property.mostrar_complemento_no_anuncio
      ? property.endereco_complemento
      : null;

  return [street, complement, bairro, cityState].filter(Boolean).join(" - ");
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
