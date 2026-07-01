"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
  tags: string[];
  imagem_url: string | null;
  imagem_alt: string | null;
};

const ITEMS_PER_PAGE = 3;

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

function getTypeIcon(type: string) {
  if (type === "ENTREGA_CHAVES") return <Key size={18} weight="fill" />;
  if (type === "ASSINATURA_CONTRATO" || type === "ASSINATURA_ESCRITURA") return <Signature size={18} />;
  if (type === "DEPOIMENTO") return <ChatCircleText size={18} />;
  if (type === "POS_VENDA") return <SealCheck size={18} />;
  return <HouseLine size={18} />;
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
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

  const visibleItems = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, page]);

  if (items.length === 0) return null;

  function previousPage() {
    setPage((current) => (current === 0 ? pageCount - 1 : current - 1));
  }

  function nextPage() {
    setPage((current) => (current + 1 >= pageCount ? 0 : current + 1));
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

          {pageCount > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previousPage}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white transition hover:bg-white/15"
                aria-label="Ver provas sociais anteriores"
              >
                <CaretLeft size={20} />
              </button>
              <button
                type="button"
                onClick={nextPage}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white transition hover:bg-white/15"
                aria-label="Ver próximas provas sociais"
              >
                <CaretRight size={20} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3" aria-live="polite">
          {visibleItems.map((item) => (
            <SocialProofCard key={item.id} item={item} />
          ))}
        </div>

        {pageCount > 1 ? (
          <div className="mt-7 flex justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index)}
                className={[
                  "h-2.5 rounded-full transition",
                  index === page ? "w-8 bg-[var(--primary-scarlet)]" : "w-2.5 bg-white/30 hover:bg-white/55",
                ].join(" ")}
                aria-label={`Ver grupo ${index + 1} de provas sociais`}
                aria-current={index === page ? "true" : undefined}
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
    <article className="overflow-hidden rounded-lg border border-white/12 bg-white text-slate-950 shadow-sm">
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
        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm">
          <span className="text-[var(--primary-scarlet)]">{getTypeIcon(item.tipo)}</span>
          {typeLabel}
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold leading-tight text-slate-950">{item.titulo}</h3>
        {bodyText ? <p className="mt-3 line-clamp-4 font-light leading-7 text-slate-600">{bodyText}</p> : null}
        {meta ? <p className="mt-4 text-sm font-bold text-slate-700">{meta}</p> : null}

        {item.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-light text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
