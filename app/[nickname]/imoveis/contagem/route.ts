import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type RouteContext = {
  params: Promise<{ nickname: string }>;
};

type ImovelRow = Pick<
  Database["public"]["Tables"]["imoveis"]["Row"],
  "titulo" | "tipo" | "subtipo" | "bairro" | "cidade" | "estado"
>;

const IMOVEL_TIPOS = [
  "APARTAMENTO",
  "CASA",
  "CASA_DE_CONDOMINIO",
  "CASA_DE_VILA",
  "COBERTURA",
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "FAZENDA_SITIO_CHACARA",
  "FLAT",
  "GALPAO_DEPOSITO_ARMAZEM",
  "GARAGEM",
  "KITNET_CONJUGADO",
  "HOTEL_MOTEL_POUSADA",
  "LOFT",
  "LOTE_TERRENO",
  "SHOPPING",
  "PONTO_COMERCIAL_LOJA_BOX",
  "PREDIO_EDIFICIO_INTEIRO",
  "SELF_STORAGE",
  "STUDIO",
] as const;

type ImovelTipo = (typeof IMOVEL_TIPOS)[number];

export async function GET(request: NextRequest, context: RouteContext) {
  const { nickname } = await context.params;
  const supabase = createSupabaseServerClient();
  const params = request.nextUrl.searchParams;
  const profileResult = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname.trim().toLowerCase())
    .eq("status", "ATIVO")
    .maybeSingle();

  if (profileResult.error) {
    return NextResponse.json({ count: 0 }, { status: 500 });
  }

  const ownerId = profileResult.data?.id;
  if (!ownerId) return NextResponse.json({ count: 0 });

  const busca = normalizeValue(params.get("busca"));
  const operacao = params.get("operacao") === "aluguel" ? "aluguel" : "venda";
  const tipos = normalizeTipos(params.getAll("tipo"));
  const cidade = normalizeValue(params.get("cidade"));
  const bairro = normalizeValue(params.get("bairro"));
  const dormitorios = parsePositiveInteger(params.get("dormitorios"));
  const banheiros = parsePositiveInteger(params.get("banheiros"));
  const vagas = parsePositiveInteger(params.get("vagas"));
  const areaMin = parsePositiveInteger(params.get("area_min"));
  const areaMax = parsePositiveInteger(params.get("area_max"));
  const precoMin = parsePositiveInteger(params.get("preco_min"));
  const precoMax = parsePositiveInteger(params.get("preco_max"));
  const condominioMax = parsePositiveInteger(params.get("condominio_max"));
  const iptuMax = parsePositiveInteger(params.get("iptu_max"));
  const priceColumn = operacao === "aluguel" ? "preco_locacao" : "preco_venda";

  let query = supabase
    .from("imoveis")
    .select(busca ? "titulo,tipo,subtipo,bairro,cidade,estado" : "id", { count: "exact", head: !busca })
    .eq("owner_id", ownerId)
    .eq("status", "PUBLICADO")
    .not("slug_publico", "is", null);

  if (operacao === "aluguel") {
    query = query.or("tipo_negociacao.eq.ALUGUEL,tipo_negociacao.eq.VENDA_E_ALUGUEL,finalidade.eq.ALUGAR");
  } else {
    query = query.or("tipo_negociacao.eq.VENDA,tipo_negociacao.eq.VENDA_E_ALUGUEL,finalidade.eq.COMPRAR");
  }

  if (tipos.length === 1) query = query.eq("tipo", tipos[0]);
  if (tipos.length > 1) query = query.in("tipo", tipos);
  if (cidade) query = query.eq("cidade", cidade);
  if (bairro) query = query.eq("bairro", bairro);
  if (dormitorios !== null) query = query.gte("dormitorios", dormitorios);
  if (banheiros !== null) query = query.gte("banheiros", banheiros);
  if (vagas !== null) query = query.gte("vagas", vagas);
  if (areaMin !== null) query = query.gte("area_util", areaMin);
  if (areaMax !== null) query = query.lte("area_util", areaMax);
  if (precoMin !== null) query = query.gte(priceColumn, precoMin);
  if (precoMax !== null) query = query.lte(priceColumn, precoMax);
  if (condominioMax !== null) query = query.lte("condominio", condominioMax);
  if (iptuMax !== null) query = query.lte("iptu", iptuMax);

  const result = await query;
  if (result.error) return NextResponse.json({ count: 0 }, { status: 500 });

  if (!busca) return NextResponse.json({ count: result.count ?? 0 });

  const search = normalizeSearch(busca);
  const rows = (result.data ?? []) as unknown as ImovelRow[];
  const count = rows.filter((imovel) => {
    const haystack = normalizeSearch(
      [imovel.titulo, imovel.tipo, imovel.subtipo, imovel.bairro, imovel.cidade, imovel.estado].filter(Boolean).join(" "),
    );
    return haystack.includes(search);
  }).length;

  return NextResponse.json({ count });
}

function normalizeValue(value: string | null) {
  return value?.trim() ?? "";
}

function normalizeTipos(values: string[]) {
  return values.filter((value): value is ImovelTipo => IMOVEL_TIPOS.includes(value as ImovelTipo));
}

function parsePositiveInteger(value: string | null) {
  const parsed = Number.parseInt(value?.replace(/\D/g, "") ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
