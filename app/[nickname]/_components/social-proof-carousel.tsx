"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  ChatCircleText,
  HouseLine,
  Key,
  SealCheck,
  Signature,
} from "@phosphor-icons/react";

export type SocialProofItem = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  depoimento: string | null;
  cliente_nome_publico: string | null;
  localidade: string | null;
  data_momento: string | null;
  imagem_url: string | null;
  imagem_alt: string | null;
};

const DESKTOP_ITEMS_PER_VIEW = 3;

const TYPE_LABELS: Record<string, string> = {
  ENTREGA_CHAVES: "Entrega de chaves",
  ASSINATURA_CONTRATO: "Contrato assinado",
  ASSINATURA_ESCRITURA: "Escritura assinada",
  DEPOIMENTO: "Depoimento",
  COMPRA_REALIZADA: "Compra realizada",
  VENDA_REALIZADA: "Venda realizada",
  LOCACAO_REALIZADA: "Locação realizada",
  POS_VENDA: "Pós-venda",
};

function getTypeIcon(type: string, size = 18) {
  if (type === "ENTREGA_CHAVES") return <Key size={size} weight="fill" />;
  if (type === "ASSINATURA_CONTRATO" || type === "ASSINATURA_ESCRITURA") return <Signature size={size} />;
  if (type === "DEPOIMENTO") return <ChatCircleText size={size} />;
  if (type === "POS_VENDA") return <SealCheck size={size} />;
  return <HouseLine size={size} />;
}

function formatMomentDate(value: string | null) {
  if (!value) return null;
  const [year, month] = value.split("-");
  if (!year || !month) return null;

  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function SocialProofCarousel({ items }: { items: SocialProofItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(DESKTOP_ITEMS_PER_VIEW);

  useEffect(() => {
    function updateItemsPerView() {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setItemsPerView(3);
        return;
      }

      if (window.matchMedia("(min-width: 640px)").matches) {
        setItemsPerView(2);
        return;
      }

      setItemsPerView(1);
    }

    updateItemsPerView();
    window.addEventListener("resize", updateItemsPerView);

    return () => window.removeEventListener("resize", updateItemsPerView);
  }, []);

  useEffect(() => {
    return () => window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const maxStartIndex = Math.max(0, items.length - itemsPerView);
  const slideCount = maxStartIndex + 1;
  const currentIndex = Math.min(activeIndex, maxStartIndex);

  if (items.length === 0) return null;

  function getCardWidth() {
    const scroller = scrollRef.current;
    if (!scroller || items.length === 0) return 0;
    return scroller.scrollWidth / items.length;
  }

  function scrollToSlide(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), maxStartIndex);
    const cardWidth = getCardWidth();

    setActiveIndex(nextIndex);

    if (cardWidth > 0) {
      scrollRef.current?.scrollTo({
        left: cardWidth * nextIndex,
        behavior: "smooth",
      });
    }
  }

  function previousSlide() {
    scrollToSlide(currentIndex === 0 ? maxStartIndex : currentIndex - 1);
  }

  function nextSlide() {
    scrollToSlide(currentIndex >= maxStartIndex ? 0 : currentIndex + 1);
  }

  const cardBasis = `${100 / itemsPerView}%`;

  function handleCarouselScroll() {
    window.cancelAnimationFrame(scrollFrameRef.current);

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      const cardWidth = getCardWidth();
      if (!scroller || cardWidth === 0) return;

      const nextIndex = Math.min(maxStartIndex, Math.max(0, Math.round(scroller.scrollLeft / cardWidth)));
      setActiveIndex(nextIndex);
    });
  }

  return (
    <section id="provas-sociais" className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--primary-scarlet)]">
              Provas sociais
            </p>
            <h2 className="mt-2 max-w-3xl text-3xl font-bold">Momentos reais da jornada</h2>
            <p className="mt-4 max-w-2xl font-light leading-7 text-white/70">
              Entregas, assinaturas e histórias de clientes acompanhadas de perto.
            </p>
          </div>

          {maxStartIndex > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previousSlide}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white transition hover:bg-white/15"
                aria-label="Ver provas sociais anteriores"
              >
                <CaretLeft size={20} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white transition hover:bg-white/15"
                aria-label="Ver próximas provas sociais"
              >
                <CaretRight size={20} />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={scrollRef}
          className="-mx-2 mt-8 overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] md:overflow-x-hidden [&::-webkit-scrollbar]:hidden"
          aria-live="polite"
          onScroll={handleCarouselScroll}
        >
          <div className="flex snap-x snap-mandatory">
            {items.map((item) => (
              <div
                key={item.id}
                className="shrink-0 snap-start px-2"
                style={{ flexBasis: cardBasis, maxWidth: cardBasis }}
              >
                <SocialProofCard item={item} />
              </div>
            ))}
          </div>
        </div>

        {slideCount > 1 ? (
          <div className="mt-7 flex justify-center gap-2">
            {Array.from({ length: slideCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollToSlide(index)}
                className={[
                  "h-2.5 rounded-full transition",
                  index === currentIndex ? "w-8 bg-[var(--primary-scarlet)]" : "w-2.5 bg-white/30 hover:bg-white/55",
                ].join(" ")}
                aria-label={`Ver prova social ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SocialProofCard({ item }: { item: SocialProofItem }) {
  const typeLabel = TYPE_LABELS[item.tipo] ?? item.tipo.replace(/_/g, " ").toLowerCase();
  const dateLabel = formatMomentDate(item.data_momento);
  const bodyText = item.depoimento || item.descricao;
  const meta = [item.cliente_nome_publico, item.localidade, dateLabel].filter(Boolean).join(" - ");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-white/12 bg-white text-slate-950 shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        {item.imagem_url ? (
          <Image
            src={item.imagem_url}
            alt={item.imagem_alt || item.titulo}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[var(--blue-slate)]">
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-sm">
              {getTypeIcon(item.tipo)}
            </span>
          </div>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-slate-900 shadow-sm backdrop-blur">
          <span className="text-[var(--primary-scarlet)]">{getTypeIcon(item.tipo, 14)}</span>
          {typeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-xl font-bold leading-tight text-slate-950">{item.titulo}</h3>
        {bodyText ? <SocialProofBodyText text={bodyText} /> : null}
        {meta ? <p className="mt-auto pt-5 text-sm font-bold text-slate-700">{meta}</p> : null}
      </div>
    </article>
  );
}

function SocialProofBodyText({ text }: { text: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    const target = element;
    let frame = 0;

    function updateOverflow() {
      setHasOverflow(target.scrollHeight > target.clientHeight + 2);
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateOverflow);
    }

    scheduleUpdate();

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(target);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text]);

  return (
    <div className="relative mt-3">
      <div
        ref={scrollRef}
        className={[
          "max-h-24 overflow-y-auto pr-2 [scrollbar-width:thin]",
          hasOverflow ? "pb-8" : "pb-0",
        ].join(" ")}
      >
        <p className="font-light leading-7 text-slate-600">{text}</p>
      </div>
      {hasOverflow ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white via-white/90 to-transparent" />
      ) : null}
    </div>
  );
}
