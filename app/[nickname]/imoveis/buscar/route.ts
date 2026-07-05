import { NextResponse, type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ nickname: string }>;
};

const TIPO_SLUGS: Record<string, string> = {
  APARTAMENTO: "apartamento",
  CASA: "casa",
  CASA_DE_CONDOMINIO: "casa-de-condominio",
  CASA_DE_VILA: "casa-de-vila",
  COBERTURA: "cobertura",
  CASA_COMERCIAL: "casa-comercial",
  ESCRITORIO: "escritorio",
  FAZENDA_SITIO_CHACARA: "fazenda-sitio-chacara",
  FLAT: "flat",
  GALPAO_DEPOSITO_ARMAZEM: "galpao-deposito-armazem",
  GARAGEM: "garagem",
  KITNET_CONJUGADO: "kitnet-conjugado",
  HOTEL_MOTEL_POUSADA: "hotel-motel-pousada",
  LOFT: "loft",
  LOTE_TERRENO: "terreno",
  SHOPPING: "shopping",
  PONTO_COMERCIAL_LOJA_BOX: "loja",
  PREDIO_EDIFICIO_INTEIRO: "predio-edificio-inteiro",
  SELF_STORAGE: "self-storage",
  STUDIO: "studio",
};

const REFINEMENT_KEYS = [
  "busca",
  "preco_min",
  "preco_max",
  "condominio_max",
  "iptu_max",
  "area_min",
  "area_max",
  "suites",
  "banheiros",
  "vagas",
  "ordenar",
];

const NUMERIC_KEYS = new Set([
  "preco_min",
  "preco_max",
  "condominio_max",
  "iptu_max",
  "area_min",
  "area_max",
  "suites",
  "banheiros",
  "vagas",
]);

export async function GET(request: NextRequest, context: RouteContext) {
  const { nickname } = await context.params;
  const params = request.nextUrl.searchParams;
  const operacao = normalizeOperation(params.get("operacao"));
  const tipos = params.getAll("tipo").map(normalizeValue).filter(Boolean);
  const singleTipo = tipos.length === 1 ? tipos[0] : "";
  const cidade = normalizeValue(params.get("cidade"));
  const bairro = normalizeValue(params.get("bairro"));
  const dormitorios = normalizePositiveInteger(params.get("dormitorios"));
  const hasCanonicalIntent = Boolean(operacao && (singleTipo || cidade || bairro || dormitorios));
  const target = new URL(`/${nickname}/imoveis`, request.nextUrl.origin);

  if (hasCanonicalIntent) {
    const slugParts = [operacao];
    const tipoSlug = singleTipo ? TIPO_SLUGS[singleTipo] : null;
    if (tipoSlug) slugParts.push(tipoSlug);
    if (cidade) slugParts.push(slugifyText(cidade));
    if (bairro && cidade) slugParts.push(slugifyText(bairro));
    if (dormitorios) slugParts.push(`${dormitorios}-dormitorios`);
    target.pathname = `/${nickname}/imoveis/${slugParts.join("-")}`;

    if (bairro && !cidade) target.searchParams.set("bairro", bairro);
  } else if (operacao) {
    target.searchParams.set("operacao", operacao);
  }

  if (!hasCanonicalIntent || !singleTipo) {
    for (const tipo of tipos) target.searchParams.append("tipo", tipo);
  }
  if (!hasCanonicalIntent && cidade) target.searchParams.set("cidade", cidade);
  if (!hasCanonicalIntent && bairro) target.searchParams.set("bairro", bairro);
  if (!hasCanonicalIntent && dormitorios) target.searchParams.set("dormitorios", String(dormitorios));

  for (const key of REFINEMENT_KEYS) {
    const value = NUMERIC_KEYS.has(key) ? normalizeIntegerValue(params.get(key)) : normalizeValue(params.get(key));
    if (!value) continue;
    if (key === "ordenar" && value === "recentes") continue;
    target.searchParams.set(key, value);
  }

  return NextResponse.redirect(target);
}

function normalizeOperation(value: string | null) {
  if (value === "aluguel") return "aluguel";
  if (value === "venda") return "venda";
  return "";
}

function normalizeValue(value: string | null) {
  return value?.trim() ?? "";
}

function normalizePositiveInteger(value: string | null) {
  const parsed = Number.parseInt(normalizeIntegerValue(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeIntegerValue(value: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function slugifyText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
