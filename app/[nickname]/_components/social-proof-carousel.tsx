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
  const loopTimeoutRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldLoop = items.length > 1;
  const displayItems = shouldLoop ? [...items, ...items] : items;

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(scrollFrameRef.current);
      window.clearTimeout(loopTimeoutRef.current);
    };
  }, []);

  if (items.length === 0) return null;

  function getCardStep() {
    const scroller = scrollRef.current;
    if (!scroller) return 0;
    const firstCard = scroller.firstElementChild?.firstElementChild as HTMLElement | null;
    const secondCard = scroller.firstElementChild?.children[1] as HTMLElement | null;
    if (!firstCard) return 0;
    if (!secondCard) return firstCard.offsetWidth;
    return secondCard.offsetLeft - firstCard.offsetLeft;
  }

  function jumpToDisplayIndex(index: number) {
    const cardStep = getCardStep();
    if (cardStep <= 0) return;
    scrollRef.current?.scrollTo({ left: cardStep * index, behavior: "instant" });
  }

  function scrollToDisplayIndex(index: number) {
    const cardStep = getCardStep();
    if (cardStep <= 0) return;
    scrollRef.current?.scrollTo({ left: cardStep * index, behavior: "smooth" });
  }

  function scrollToSlide(index: number) {
    const nextIndex = ((index % items.length) + items.length) % items.length;
    setActiveIndex(nextIndex);
    scrollToDisplayIndex(nextIndex);
  }

  function previousSlide() {
    window.clearTimeout(loopTimeoutRef.current);

    if (activeIndex === 0 && shouldLoop) {
      jumpToDisplayIndex(items.length);
      window.requestAnimationFrame(() => scrollToDisplayIndex(items.length - 1));
      setActiveIndex(items.length - 1);
      return;
    }

    scrollToSlide(activeIndex - 1);
  }

  function nextSlide() {
    window.clearTimeout(loopTimeoutRef.current);

    if (activeIndex === items.length - 1 && shouldLoop) {
      scrollToDisplayIndex(items.length);
      setActiveIndex(0);
      loopTimeoutRef.current = window.setTimeout(() => jumpToDisplayIndex(0), 520);
      return;
    }

    scrollToSlide(activeIndex + 1);
  }

  function handleCarouselScroll() {
    window.cancelAnimationFrame(scrollFrameRef.current);

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      const cardStep = getCardStep();
      if (!scroller || cardStep === 0) return;

      const displayIndex = Math.max(0, Math.round(scroller.scrollLeft / cardStep));
      const logicalIndex = displayIndex % items.length;
      setActiveIndex(logicalIndex);

      if (shouldLoop && displayIndex >= items.length) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = window.setTimeout(() => jumpToDisplayIndex(logicalIndex), 180);
      }
    });
  }

  return (
    <section id="provas-sociais" className="overflow-hidden bg-white text-slate-950">
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
              Provas sociais
            </p>
            <h2 className="mt-2 max-w-3xl text-4xl font-light leading-tight md:text-5xl">
              Momentos reais da minha jornada
            </h2>
            <p className="mt-4 max-w-2xl font-light leading-7 text-slate-600">
              Entregas, assinaturas e histórias de clientes que acompanhei de perto.
            </p>
          </div>

          {shouldLoop ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previousSlide}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-900 shadow-sm transition hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)]"
                aria-label="Ver provas sociais anteriores"
              >
                <CaretLeft size={20} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-900 shadow-sm transition hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)]"
                aria-label="Ver próximas provas sociais"
              >
                <CaretRight size={20} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pb-14 pt-4">
        <div
          ref={scrollRef}
          className="-mt-10 overflow-x-auto scroll-smooth overscroll-x-contain pb-20 pt-10 pl-[max(1.25rem,calc((100vw-80rem)/2+1.25rem))] pr-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          aria-live="polite"
          onScroll={handleCarouselScroll}
        >
          <div className="flex snap-x snap-mandatory gap-5">
            {displayItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="w-[86vw] max-w-[430px] shrink-0 snap-start sm:w-[58vw] lg:w-[31vw]"
              >
                <SocialProofCard item={item} />
              </div>
            ))}
          </div>
        </div>

        {shouldLoop ? (
          <div className="relative z-10 -mt-11 flex justify-center gap-2">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSlide(index)}
                className={[
                  "h-2.5 rounded-full transition",
                  index === activeIndex ? "w-8 bg-[var(--grey-olive)]" : "w-2.5 bg-stone-300 hover:bg-stone-400",
                ].join(" ")}
                aria-label={`Ver prova social ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
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
    <article className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
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
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-white/94 px-2.5 py-1.5 text-[11px] font-bold text-slate-900 shadow-sm backdrop-blur">
          <span className="text-[var(--grey-olive)]">{getTypeIcon(item.tipo, 14)}</span>
          {typeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-2xl font-light leading-tight text-slate-950">{item.titulo}</h3>
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
