import Image from "next/image";
import Link from "next/link";
import { Bathtub, Bed, Buildings, Car, HouseLine, MapPin, Ruler } from "@phosphor-icons/react/dist/ssr";

import { buildImovelHeaderTitle } from "@/lib/imoveis/display-title";
import type { Database } from "@/lib/supabase/database.types";

type ImovelRow = Database["public"]["Tables"]["imoveis"]["Row"];
type EmpreendimentoRow = Database["public"]["Tables"]["empreendimentos"]["Row"];

export type PublicPropertyCardImovel = Pick<
  ImovelRow,
  | "id"
  | "slug_publico"
  | "titulo"
  | "finalidade"
  | "tipo_negociacao"
  | "tipo"
  | "subtipo"
  | "bairro_comercial"
  | "bairro"
  | "cidade"
  | "estado"
  | "logradouro"
  | "numero"
  | "cep"
  | "endereco_complemento"
  | "enderecovisualizacao"
  | "ocultar_numero_publico"
  | "mostrar_complemento_no_anuncio"
  | "empreendimento_id"
  | "empreendimento_tipologia_label"
  | "preco_venda"
  | "preco_locacao"
  | "condominio"
  | "iptu"
  | "iptu_periodicidade"
  | "area_util"
  | "area_total"
  | "dormitorios"
  | "suites"
  | "banheiros"
  | "vagas"
  | "publicado_em"
> & {
  empreendimentos?: Pick<EmpreendimentoRow, "nome" | "slug_publico"> | null;
};

type CardStatItem = {
  icon: typeof Ruler;
  label: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function PublicPropertyCard({
  nickname,
  imovel,
  imageUrl,
}: {
  nickname: string;
  imovel: PublicPropertyCardImovel;
  imageUrl: string | null;
}) {
  const title = buildImovelHeaderTitle(imovel);
  const operation = imovel.tipo_negociacao === "ALUGUEL" ? "aluguel" : "venda";
  const price =
    imovel.tipo_negociacao === "ALUGUEL" && imovel.preco_locacao
      ? imovel.preco_locacao
      : imovel.preco_venda;
  const priceParts = price ? formatCurrencyParts(price) : null;
  const areaLabel = formatAreaSummary(imovel);
  const address = buildAddressLine(imovel);
  const empreendimentoName = imovel.empreendimentos?.nome;
  const stats = [
    areaLabel ? { icon: Ruler, label: areaLabel } : null,
    imovel.dormitorios
      ? {
          icon: Bed,
          label: `${padSmallNumber(imovel.dormitorios)} ${
            imovel.dormitorios === 1 ? "dormitório" : "dormitórios"
          }`,
        }
      : null,
    imovel.suites
      ? { icon: Bed, label: `${padSmallNumber(imovel.suites)} ${imovel.suites === 1 ? "suíte" : "suítes"}` }
      : null,
    imovel.banheiros
      ? {
          icon: Bathtub,
          label: `${padSmallNumber(imovel.banheiros)} ${imovel.banheiros === 1 ? "banheiro" : "banheiros"}`,
        }
      : null,
    imovel.vagas
      ? { icon: Car, label: `${padSmallNumber(imovel.vagas)} ${imovel.vagas === 1 ? "vaga" : "vagas"}` }
      : null,
  ].filter(isCardStatItem);
  const charges = [
    imovel.condominio ? `Cond.: ${currencyFormatter.format(imovel.condominio)}/mês` : null,
    imovel.iptu ? `IPTU: ${currencyFormatter.format(imovel.iptu)}/${imovel.iptu_periodicidade === "MENSAL" ? "mês" : "ano"}` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/${nickname}/${operation}/${imovel.slug_publico}`}
      className="group block h-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[color:rgba(145,139,118,0.55)] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-stone-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(min-width: 1280px) 33vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            unoptimized
          />
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
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--grey-olive)]">
          {formatEnumLabel(imovel.tipo)}
        </p>
        <h3 className="mt-2 line-clamp-2 text-xl font-light leading-snug text-slate-950">{title}</h3>
        <p className="mt-3 flex items-start gap-1.5 text-sm font-light leading-snug text-slate-500">
          <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--grey-olive)]" />
          <span className="line-clamp-2">{address}</span>
        </p>
        {stats.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <span
                  key={stat.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  <Icon size={14} className="text-[var(--grey-olive)]" />
                  {stat.label}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="mt-5 border-t border-stone-100 pt-4">
          {priceParts ? (
            <p className="flex items-start gap-0 text-slate-950">
              <span className="relative top-[4px] text-sm font-light">{priceParts.symbol}</span>
              <span className="text-2xl font-light tracking-[-0.01em]">{priceParts.value}</span>
            </p>
          ) : (
            <p className="text-2xl font-light tracking-[-0.01em] text-slate-950">Consulte valores</p>
          )}
          {charges.length > 0 ? (
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

function padSmallNumber(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function formatAreaSummary(imovel: PublicPropertyCardImovel) {
  if (imovel.area_util && imovel.area_total && imovel.area_util !== imovel.area_total) {
    return `${imovel.area_util} m² úteis · ${imovel.area_total} m² totais`;
  }
  const area = imovel.area_util ?? imovel.area_total;
  if (!area) return null;
  return `${area} m²`;
}

function formatCurrencyParts(value: number) {
  const formatted = currencyFormatter.format(value).replace(/\s/g, " ");
  const match = formatted.match(/^(R\$)\s*(.+)$/);
  if (!match) return { symbol: "", value: formatted };
  return { symbol: match[1], value: match[2] };
}

function isCardStatItem(value: CardStatItem | null): value is CardStatItem {
  return value !== null;
}

function buildAddressLine(imovel: PublicPropertyCardImovel) {
  const bairro = imovel.bairro_comercial || imovel.bairro;
  const cityState = `${imovel.cidade}/${imovel.estado}`;

  if (imovel.enderecovisualizacao === "END_BAIRRO") return [bairro, cityState].filter(Boolean).join(" - ");

  const shouldShowNumber = imovel.enderecovisualizacao === "END_COMPLETO" && !imovel.ocultar_numero_publico;
  const street = [imovel.logradouro, shouldShowNumber ? imovel.numero : null].filter(Boolean).join(", ");
  const complement =
    imovel.enderecovisualizacao === "END_COMPLETO" && imovel.mostrar_complemento_no_anuncio
      ? imovel.endereco_complemento
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
