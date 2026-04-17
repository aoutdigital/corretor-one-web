const COMMERCIAL_TIPO_VALUES = new Set([
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "GALPAO_DEPOSITO_ARMAZEM",
  "GARAGEM",
  "HOTEL_MOTEL_POUSADA",
  "PONTO_COMERCIAL_LOJA_BOX",
  "PREDIO_EDIFICIO_INTEIRO",
  "SHOPPING",
  "SELF_STORAGE",
]);

const VERTICAL_RESIDENTIAL_TIPO_VALUES = new Set([
  "APARTAMENTO",
  "COBERTURA",
  "FLAT",
  "KITNET_CONJUGADO",
  "LOFT",
  "STUDIO",
]);

const APARTAMENTO_SUBTIPO_BY_TIPO: Record<string, string> = {
  COBERTURA: "cobertura",
  FLAT: "flat",
  KITNET_CONJUGADO: "kitnet",
  LOFT: "loft",
  STUDIO: "studio",
};

const CATEGORIA_BY_TIPO: Record<string, string> = {
  APARTAMENTO: "apartamento",
  COBERTURA: "apartamento",
  FLAT: "apartamento",
  KITNET_CONJUGADO: "apartamento",
  LOFT: "apartamento",
  STUDIO: "apartamento",
  CASA: "casa",
  CASA_DE_CONDOMINIO: "casa",
  CASA_DE_VILA: "casa",
  FAZENDA_SITIO_CHACARA: "casa",
  LOTE_TERRENO: "terreno",
  CASA_COMERCIAL: "casa-comercial",
  ESCRITORIO: "escritorio",
  GALPAO_DEPOSITO_ARMAZEM: "galpao",
  GARAGEM: "garagem",
  HOTEL_MOTEL_POUSADA: "hotel",
  PONTO_COMERCIAL_LOJA_BOX: "loja",
  PREDIO_EDIFICIO_INTEIRO: "predio",
  SHOPPING: "shopping",
  SELF_STORAGE: "self-storage",
};

export type ImovelPublicUrlInput = {
  finalidade?: unknown;
  tipo_negociacao?: unknown;
  estado?: unknown;
  cidade?: unknown;
  bairro?: unknown;
  bairro_comercial?: unknown;
  tipo?: unknown;
  subtipo?: unknown;
  dormitorios?: unknown;
  suites?: unknown;
  salas?: unknown;
  area_util?: unknown;
  area_total?: unknown;
  area_terreno?: unknown;
  vagas?: unknown;
  empreendimento_nome?: unknown;
  codigo?: unknown;
};

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveIntOrNull(value: unknown): number | null {
  const parsed = toNumberOrNull(value);
  if (parsed == null) return null;
  const rounded = Math.round(parsed);
  return rounded > 0 ? rounded : null;
}

function toAreaToken(value: unknown): string | null {
  const parsed = toNumberOrNull(value);
  if (parsed == null || parsed <= 0) return null;
  return String(Math.round(parsed));
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function token(value: unknown): string | null {
  const asString = toStringOrNull(value);
  if (!asString) return null;
  const slug = slugify(asString);
  return slug || null;
}

function normalizeSubtipoToken(subtipoRaw: unknown, categoriaToken: string): string | null {
  const subtipoToken = token(subtipoRaw);
  if (!subtipoToken || subtipoToken === "padrao") return null;

  if (subtipoToken === "cobertura-padrao") return "cobertura";
  if (subtipoToken === "cobertura-duplex") return "duplex";
  if (subtipoToken === "cobertura-triplex") return "triplex";

  if (subtipoToken.startsWith(`${categoriaToken}-`)) {
    const withoutPrefix = subtipoToken.slice(categoriaToken.length + 1);
    return withoutPrefix || null;
  }

  return subtipoToken;
}

function resolveCategoriaSubcategoria(input: ImovelPublicUrlInput): {
  tipo: string | null;
  categoria: string | null;
  subcategoria: string | null;
} {
  const tipoRaw = toStringOrNull(input.tipo)?.toUpperCase() ?? null;
  if (!tipoRaw) return { tipo: null, categoria: null, subcategoria: null };

  const categoriaToken = CATEGORIA_BY_TIPO[tipoRaw] ?? token(tipoRaw);
  if (!categoriaToken) return { tipo: tipoRaw, categoria: null, subcategoria: null };

  const mappedSubcategoria = APARTAMENTO_SUBTIPO_BY_TIPO[tipoRaw] ?? null;
  const subcategoriaFromSubtipo = normalizeSubtipoToken(input.subtipo, categoriaToken);
  const subcategoria = subcategoriaFromSubtipo ?? mappedSubcategoria;

  return { tipo: tipoRaw, categoria: categoriaToken, subcategoria };
}

function compactTokens(values: Array<string | null>): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const normalized = value.trim().replace(/-+/g, "-");
    if (!normalized) continue;
    out.push(normalized);
  }
  return out;
}

function toUniqueSlug(baseTokens: string[]): string {
  return baseTokens
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveImovelPublicRouteSegment(input: ImovelPublicUrlInput): "venda" | "aluguel" {
  const tipoNegociacao = toStringOrNull(input.tipo_negociacao)?.toUpperCase();
  if (tipoNegociacao === "ALUGUEL") return "aluguel";
  if (tipoNegociacao === "VENDA" || tipoNegociacao === "VENDA_E_ALUGUEL") return "venda";

  const finalidade = toStringOrNull(input.finalidade)?.toUpperCase();
  if (finalidade === "ALUGAR") return "aluguel";
  return "venda";
}

export function buildImovelPublicSlug(input: ImovelPublicUrlInput): string {
  const locationUf = token(input.estado);
  const locationCidade = token(input.cidade);
  const locationBairroRef = token(input.bairro_comercial) ?? token(input.bairro);

  const { tipo, categoria, subcategoria } = resolveCategoriaSubcategoria(input);
  const isCommercial = Boolean(tipo && COMMERCIAL_TIPO_VALUES.has(tipo));
  const isVerticalResidential = Boolean(tipo && VERTICAL_RESIDENTIAL_TIPO_VALUES.has(tipo));

  const dormitorios = toPositiveIntOrNull(input.dormitorios);
  const suites = toPositiveIntOrNull(input.suites);
  const salas = toPositiveIntOrNull(input.salas);
  const vagas = toPositiveIntOrNull(input.vagas);
  const areaUtil = toAreaToken(input.area_util);
  const areaTotal = toAreaToken(input.area_total);
  const areaTerreno = toAreaToken(input.area_terreno);
  const empreendimentoNome = token(input.empreendimento_nome);
  const codigo = token(input.codigo);

  const atributos: Array<string | null> = [];

  if (isCommercial) {
    atributos.push(salas ? `${salas}-salas` : null);
    atributos.push(areaUtil ? `${areaUtil}m` : null);
    atributos.push(vagas ? `${vagas}-vagas` : null);
  } else if (isVerticalResidential) {
    atributos.push(dormitorios ? `${dormitorios}-dormitorios` : null);
    atributos.push(suites ? `${suites}-suites` : null);
    atributos.push(areaUtil ? `${areaUtil}m` : null);
    atributos.push(vagas ? `${vagas}-vagas` : null);
  } else {
    atributos.push(dormitorios ? `${dormitorios}-dormitorios` : null);
    atributos.push(suites ? `${suites}-suites` : null);
    atributos.push(areaUtil ? `${areaUtil}m` : null);
    atributos.push(areaTerreno ? `${areaTerreno}m-terreno` : areaTotal ? `${areaTotal}m-area-total` : null);
    atributos.push(vagas ? `${vagas}-vagas` : null);
  }

  const tokens = compactTokens([
    locationUf,
    locationCidade,
    locationBairroRef,
    categoria,
    subcategoria,
    ...atributos,
    empreendimentoNome ? `no-${empreendimentoNome}` : null,
    codigo,
  ]);

  const slug = toUniqueSlug(tokens);
  return slug || "imovel";
}

export function willImovelPublicUrlChange(
  currentInput: ImovelPublicUrlInput,
  nextInput: ImovelPublicUrlInput,
): boolean {
  return (
    resolveImovelPublicRouteSegment(currentInput) !== resolveImovelPublicRouteSegment(nextInput) ||
    buildImovelPublicSlug(currentInput) !== buildImovelPublicSlug(nextInput)
  );
}

