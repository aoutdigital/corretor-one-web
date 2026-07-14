import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const PROPERTY_SELECT = [
  "id",
  "slug_publico",
  "titulo",
  "finalidade",
  "tipo_negociacao",
  "tipo",
  "subtipo",
  "bairro_comercial",
  "bairro",
  "cidade",
  "estado",
  "logradouro",
  "numero",
  "cep",
  "endereco_complemento",
  "enderecovisualizacao",
  "ocultar_numero_publico",
  "mostrar_complemento_no_anuncio",
  "empreendimento_id",
  "empreendimento_tipologia_label",
  "empreendimentos(nome,slug_publico,caracteristicas)",
  "preco_venda",
  "preco_locacao",
  "condominio",
  "iptu",
  "iptu_periodicidade",
  "area_util",
  "area_total",
  "dormitorios",
  "suites",
  "banheiros",
  "vagas",
  "publicado_em",
  "caracteristicas",
].join(",");

type RouteContext = {
  params: Promise<{ nickname: string }>;
};

type PropertyRow = Record<string, unknown> & {
  id: string;
  preco_venda?: number | null;
  preco_locacao?: number | null;
  caracteristicas?: string[] | null;
  empreendimentos?: { caracteristicas?: string[] | null } | null;
};

type MediaRow = {
  imovel_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { nickname } = await context.params;
  const supabase = createSupabaseServerClient();
  const searchParams = request.nextUrl.searchParams;
  const normalizedNickname = nickname.trim().toLowerCase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,nickname,status")
    .eq("nickname", normalizedNickname)
    .eq("status", "ATIVO")
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: "Falha ao localizar corretor." }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Corretor não encontrado." }, { status: 404 });
  }

  let query = supabase
    .from("imoveis")
    .select(PROPERTY_SELECT)
    .eq("owner_id", profile.id)
    .eq("status", "PUBLICADO")
    .not("slug_publico", "is", null)
    .order("publicado_em", { ascending: false })
    .limit(60);

  const propertyId = searchParams.get("property_id")?.trim();
  if (propertyId) query = query.eq("id", propertyId).limit(1);

  const cidade = searchParams.get("cidade")?.trim();
  const bairro = searchParams.get("bairro")?.trim();
  const empreendimentoId = searchParams.get("empreendimento_id")?.trim();
  const dormitoriosMin = parsePositiveNumber(searchParams.get("dormitorios_min"));
  const suitesMin = parsePositiveNumber(searchParams.get("suites_min"));
  const vagasMin = parsePositiveNumber(searchParams.get("vagas_min"));
  const caracteristicasImovel = searchParams.getAll("caracteristicas_imovel").map((item) => item.trim()).filter(Boolean);

  if (cidade) query = query.ilike("cidade", cidade);
  if (bairro) query = query.ilike("bairro", bairro);
  if (empreendimentoId) query = query.eq("empreendimento_id", empreendimentoId);
  if (dormitoriosMin) query = query.gte("dormitorios", dormitoriosMin);
  if (suitesMin) query = query.gte("suites", suitesMin);
  if (vagasMin) query = query.gte("vagas", vagasMin);
  if (caracteristicasImovel.length) query = query.contains("caracteristicas", caracteristicasImovel);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "Falha ao buscar imóveis do artigo." }, { status: 500 });
  }

  const valorMin = parsePositiveNumber(searchParams.get("valor_min"));
  const valorMax = parsePositiveNumber(searchParams.get("valor_max"));
  const caracteristicasEmpreendimento = searchParams
    .getAll("caracteristicas_empreendimento")
    .map((item) => item.trim())
    .filter(Boolean);

  const rows = (data ?? []) as unknown as PropertyRow[];

  const filtered = rows.filter((property) => {
    const price = getComparablePrice(property);
    if (valorMin && (!price || price < valorMin)) return false;
    if (valorMax && (!price || price > valorMax)) return false;
    if (caracteristicasEmpreendimento.length) {
      const enterpriseCharacteristics = new Set(property.empreendimentos?.caracteristicas ?? []);
      return caracteristicasEmpreendimento.every((item) => enterpriseCharacteristics.has(item));
    }
    return true;
  });

  const limit = Math.min(Math.max(parsePositiveNumber(searchParams.get("limit")) ?? 8, 1), 12);
  const sliced = filtered.slice(0, limit);
  const mediaById = await getPropertyMedia(sliced.map((property) => property.id));

  return NextResponse.json({
    ok: true,
    data: sliced.map((property) => ({
      ...property,
      capa_url_publica_thumb_webp: getPublicImageUrl(mediaById.get(property.id)?.[0]?.url),
    })),
  });
}

async function getPropertyMedia(propertyIds: string[]) {
  const mediaById = new Map<string, MediaRow[]>();
  if (!propertyIds.length) return mediaById;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("imovel_midia_publica")
    .select("imovel_id,indice_publico,ordem,url")
    .in("imovel_id", propertyIds)
    .order("imovel_id", { ascending: true })
    .order("indice_publico", { ascending: true })
    .order("ordem", { ascending: true });

  for (const item of (data ?? []) as MediaRow[]) {
    const current = mediaById.get(item.imovel_id) ?? [];
    current.push(item);
    mediaById.set(item.imovel_id, current);
  }
  return mediaById;
}

function parsePositiveNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getComparablePrice(property: PropertyRow) {
  if (typeof property.preco_venda === "number" && property.preco_venda > 0) return property.preco_venda;
  if (typeof property.preco_locacao === "number" && property.preco_locacao > 0) return property.preco_locacao;
  return null;
}

function getPublicImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/${url}`;
}
