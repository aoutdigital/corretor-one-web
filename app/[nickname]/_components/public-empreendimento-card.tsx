import Image from "next/image";
import Link from "next/link";
import { Buildings, CalendarBlank, HouseLine, MapPin } from "@phosphor-icons/react/dist/ssr";

import type { Database } from "@/lib/supabase/database.types";

type EmpreendimentoRow = Database["public"]["Tables"]["empreendimentos"]["Row"];

export type PublicEmpreendimentoCardItem = Pick<
  EmpreendimentoRow,
  | "id"
  | "slug_publico"
  | "nome"
  | "resumo_curto"
  | "descricao"
  | "logradouro"
  | "numero"
  | "bairro"
  | "cidade"
  | "estado"
  | "fase"
  | "estagio_obra"
  | "previsao_entrega_em"
  | "n_torres"
  | "n_unidades"
  | "publicado_em"
> & {
  capa_url_publica_thumb_webp: string | null;
};

export function PublicEmpreendimentoCard({
  nickname,
  empreendimento,
}: {
  nickname: string;
  empreendimento: PublicEmpreendimentoCardItem;
}) {
  const href = `/${nickname}/${empreendimento.slug_publico}`;
  const phase = formatPhaseLabel(empreendimento.fase);
  const stage = formatEnumLabel(empreendimento.estagio_obra);
  const description = stripHtml(empreendimento.resumo_curto || empreendimento.descricao);
  const address = buildAddressLine(empreendimento);
  const facts = [
    phase ? { icon: Buildings, label: phase } : null,
    stage ? { icon: HouseLine, label: stage } : null,
    empreendimento.n_unidades
      ? { icon: Buildings, label: `${empreendimento.n_unidades} unidades` }
      : null,
    empreendimento.previsao_entrega_em
      ? { icon: CalendarBlank, label: `Entrega ${formatMonthYear(empreendimento.previsao_entrega_em)}` }
      : null,
  ].filter((item): item is { icon: typeof Buildings; label: string } => Boolean(item));

  return (
    <Link
      href={href}
      className="group block h-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.55)] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-stone-100">
        {empreendimento.capa_url_publica_thumb_webp ? (
          <Image
            src={empreendimento.capa_url_publica_thumb_webp}
            alt={empreendimento.nome}
            fill
            sizes="(min-width: 1280px) 33vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--grey-olive)]">
            <Buildings size={38} weight="light" />
          </div>
        )}
        {phase ? (
          <span className="absolute bottom-3 right-3 inline-flex max-w-[72%] items-center rounded-full bg-white/84 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-700 shadow-sm backdrop-blur">
            <span className="truncate">{phase}</span>
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <p className="flex items-start gap-1.5 text-sm font-light leading-snug text-slate-500">
          <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--grey-olive)]" />
          <span className="line-clamp-2">{address}</span>
        </p>
        <h3 className="mt-3 line-clamp-2 text-xl font-light leading-snug text-slate-950 transition group-hover:text-[var(--grey-olive)]">
          {empreendimento.nome}
        </h3>
        {description ? (
          <p className="mt-3 line-clamp-2 text-sm font-light leading-6 text-slate-600">{description}</p>
        ) : null}
        {facts.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            {facts.slice(0, 4).map((fact) => {
              const Icon = fact.icon;
              return (
                <span
                  key={fact.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  <Icon size={14} className="text-[var(--grey-olive)]" />
                  {fact.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function buildAddressLine(
  empreendimento: Pick<EmpreendimentoRow, "logradouro" | "numero" | "bairro" | "cidade" | "estado">,
) {
  const street = [empreendimento.logradouro, empreendimento.numero].filter(Boolean).join(", ");
  return [street, empreendimento.bairro, `${empreendimento.cidade}/${empreendimento.estado}`]
    .filter(Boolean)
    .join(" - ");
}

function formatMonthYear(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatPhaseLabel(value: string | null) {
  if (value === "NA_PLANTA") return "Na planta";
  if (value === "EM_CONSTRUCAO") return "Em construção";
  if (value === "ENTREGUE") return "Entregue";
  return formatEnumLabel(value);
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripHtml(value: string | null | undefined) {
  return value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
}
