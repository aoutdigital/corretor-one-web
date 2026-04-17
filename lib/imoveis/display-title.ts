export type ImovelDisplayTitleInput = {
  titulo?: string | null;
  codigo?: string | null;
  finalidade?: string | null;
  tipo_negociacao?: string | null;
  tipo?: string | null;
  subtipo?: string | null;
  area_util?: number | null;
  area_terreno?: number | null;
  dormitorios?: number | null;
  suites?: number | null;
  salas?: number | null;
  vagas?: number | null;
  bairro_comercial?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

const COMMERCIAL_TIPO_IMOVEL = new Set([
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "GALPAO_DEPOSITO_ARMAZEM",
  "HOTEL_MOTEL_POUSADA",
  "PONTO_COMERCIAL_LOJA_BOX",
  "PREDIO_EDIFICIO_INTEIRO",
  "SHOPPING",
  "SELF_STORAGE",
]);

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatTipo(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatM2Compact(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const numeric = Number(value);
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);
  return `${formatted}m²`;
}

function getCategoriaTitulo(tipo: string | null | undefined) {
  const normalized = (tipo ?? "").trim().toUpperCase();
  if (normalized === "ESCRITORIO") return "Sala comercial";
  return formatTipo(tipo);
}

function getSubtipoTitulo(subtipo: string | null | undefined) {
  if (!subtipo) return "";
  const normalized = subtipo.trim().toUpperCase();
  if (!normalized || normalized === "PADRAO") return "";
  const semPadrao = normalized.endsWith("_PADRAO") ? normalized.replace(/_PADRAO$/, "") : normalized;
  if (!semPadrao || semPadrao === "PADRAO") return "";
  return formatTipo(semPadrao);
}

function getFinalidadeTitulo(item: ImovelDisplayTitleInput) {
  const tipoNegociacao = (item.tipo_negociacao ?? "").toUpperCase();
  if (tipoNegociacao === "VENDA_E_ALUGUEL") return "à venda ou locação";
  if (tipoNegociacao === "ALUGUEL") return "para locação";
  if (tipoNegociacao === "VENDA") return "à venda";
  const finalidade = (item.finalidade ?? "").toUpperCase();
  if (finalidade === "ALUGAR") return "para locação";
  return "à venda";
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildImovelHeaderTitle(item: ImovelDisplayTitleInput) {
  const categoriaBase = getCategoriaTitulo(item.tipo);
  const subtipo = getSubtipoTitulo(item.subtipo);
  const categoriaNormalized = categoriaBase.trim().toLowerCase();
  const subtipoNormalized = subtipo.trim().toLowerCase();
  const categoriaComSubtipo =
    subtipoNormalized && subtipoNormalized !== categoriaNormalized
      ? `${categoriaBase} ${subtipo}`
      : categoriaBase;
  const finalidadeTexto = getFinalidadeTitulo(item);
  const areaUtil = formatM2Compact(item.area_util);
  const areaTerreno = formatM2Compact(item.area_terreno);
  const isComercial = COMMERCIAL_TIPO_IMOVEL.has((item.tipo ?? "").toUpperCase());

  const partes: string[] = [];
  const primeiraParte = `${categoriaComSubtipo} ${finalidadeTexto}`.trim();
  if (primeiraParte.length > 0 && primeiraParte !== "-") partes.push(primeiraParte);

  if (areaUtil && areaTerreno) {
    partes.push(`${areaUtil} área útil em terreno de ${areaTerreno}`);
  } else if (areaUtil) {
    partes.push(areaUtil);
  } else if (areaTerreno) {
    partes.push(`terreno de ${areaTerreno}`);
  }

  if (isComercial) {
    if ((item.salas ?? 0) > 0) partes.push(pluralize(item.salas ?? 0, "sala", "salas"));
    if ((item.vagas ?? 0) > 0) partes.push(pluralize(item.vagas ?? 0, "vaga", "vagas"));
  } else {
    if ((item.dormitorios ?? 0) > 0) partes.push(pluralize(item.dormitorios ?? 0, "Dormitório", "Dormitórios"));
    if ((item.suites ?? 0) > 0) partes.push(pluralize(item.suites ?? 0, "Suíte", "Suítes"));
    if ((item.dormitorios ?? 0) === 0 && (item.suites ?? 0) === 0 && (item.vagas ?? 0) > 0) {
      partes.push(pluralize(item.vagas ?? 0, "vaga", "vagas"));
    }
  }

  const bairroComercial = normalizeOptionalText(item.bairro_comercial);
  const bairro = normalizeOptionalText(item.bairro);
  const cidade = normalizeOptionalText(item.cidade);
  const estado = normalizeOptionalText(item.estado);
  const cidadeUf = [cidade, estado].filter(Boolean).join("/");
  const localizacao = [bairroComercial || bairro, cidadeUf].filter(Boolean).join(" - ");
  if (localizacao.length > 0) partes.push(localizacao);

  const tituloGerado = partes.join(", ").trim();
  if (tituloGerado.length > 0) return tituloGerado;
  if (item.titulo?.trim().length) return item.titulo.trim();
  if (item.codigo?.trim().length) return `Imóvel ${item.codigo.trim()}`;
  return "Imóvel";
}
