import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type RelatedPropertiesScope = "broker" | "portal";
export type RelatedPropertiesOperation = "venda" | "aluguel";
export type RelatedPropertiesLayer = "same_empreendimento" | "same_cep" | "same_bairro" | "same_cidade";

export const RELATED_PROPERTY_SELECT = [
  "id",
  "owner_id",
  "slug_publico",
  "titulo",
  "codigo",
  "finalidade",
  "tipo_negociacao",
  "tipo",
  "subtipo",
  "descricao",
  "descricao_curta",
  "empreendimento_id",
  "cozinhas",
  "cidade",
  "bairro",
  "bairro_comercial",
  "estado",
  "cep",
  "logradouro",
  "numero",
  "endereco_complemento",
  "enderecovisualizacao",
  "ocultar_numero_publico",
  "mostrar_complemento_no_anuncio",
  "localizacao_contexto",
  "preco_venda",
  "preco_locacao",
  "condominio",
  "iptu",
  "iptu_periodicidade",
  "valor_m2",
  "area_util",
  "area_total",
  "area_terreno",
  "dormitorios",
  "suites",
  "banheiros",
  "lavabos",
  "salas",
  "vagas",
  "vaga_tamanhos",
  "vaga_coberturas",
  "vaga_tipos",
  "andar",
  "mostrar_andar_no_anuncio",
  "ano_construcao",
  "caracteristicas",
  "estado_conservacao",
  "vista",
  "financiavel",
  "aceita_permuta",
  "permite_visita_imediata",
  "usar_caracteristicas_empreendimento",
  "lat",
  "lng",
  "status",
  "destaque",
  "publicado_em",
  "updated_at",
].join(",");

export type RelatedProperty = Pick<
  Database["public"]["Tables"]["imoveis"]["Row"],
  | "id"
  | "owner_id"
  | "slug_publico"
  | "titulo"
  | "codigo"
  | "finalidade"
  | "tipo_negociacao"
  | "tipo"
  | "subtipo"
  | "descricao"
  | "descricao_curta"
  | "empreendimento_id"
  | "cozinhas"
  | "cidade"
  | "bairro"
  | "bairro_comercial"
  | "estado"
  | "cep"
  | "logradouro"
  | "numero"
  | "endereco_complemento"
  | "enderecovisualizacao"
  | "ocultar_numero_publico"
  | "mostrar_complemento_no_anuncio"
  | "localizacao_contexto"
  | "preco_venda"
  | "preco_locacao"
  | "condominio"
  | "iptu"
  | "iptu_periodicidade"
  | "valor_m2"
  | "area_util"
  | "area_total"
  | "area_terreno"
  | "dormitorios"
  | "suites"
  | "banheiros"
  | "lavabos"
  | "salas"
  | "vagas"
  | "vaga_tamanhos"
  | "vaga_coberturas"
  | "vaga_tipos"
  | "andar"
  | "mostrar_andar_no_anuncio"
  | "ano_construcao"
  | "caracteristicas"
  | "estado_conservacao"
  | "vista"
  | "financiavel"
  | "aceita_permuta"
  | "permite_visita_imediata"
  | "usar_caracteristicas_empreendimento"
  | "lat"
  | "lng"
  | "status"
  | "destaque"
  | "publicado_em"
  | "updated_at"
>;

export type ScoredRelatedProperty = RelatedProperty & {
  relatedScore: number;
  relatedLayer: RelatedPropertiesLayer;
  relatedReasons: string[];
};

type LayerConfig = {
  key: RelatedPropertiesLayer;
  reason: string;
  locationScore: number;
  limit: number;
  cap: number;
  weights: {
    location: number;
    price: number;
    area: number;
    bedrooms: number;
    suites: number;
    parking: number;
    recency: number;
  };
};

const LAYERS: LayerConfig[] = [
  {
    key: "same_empreendimento",
    reason: "Mesmo empreendimento",
    locationScore: 100,
    limit: 12,
    cap: 2,
    weights: { location: 45, price: 10, area: 10, bedrooms: 10, suites: 6, parking: 6, recency: 13 },
  },
  {
    key: "same_cep",
    reason: "Mesmo CEP",
    locationScore: 85,
    limit: 12,
    cap: 2,
    weights: { location: 40, price: 15, area: 15, bedrooms: 10, suites: 5, parking: 5, recency: 10 },
  },
  {
    key: "same_bairro",
    reason: "Mesmo bairro",
    locationScore: 65,
    limit: 20,
    cap: 2,
    weights: { location: 30, price: 25, area: 20, bedrooms: 10, suites: 5, parking: 5, recency: 5 },
  },
  {
    key: "same_cidade",
    reason: "Mesma cidade",
    locationScore: 35,
    limit: 30,
    cap: 1,
    weights: { location: 20, price: 35, area: 30, bedrooms: 5, suites: 3, parking: 5, recency: 2 },
  },
];

type FindRelatedPropertiesInput = {
  supabase: SupabaseClient<Database>;
  baseProperty: RelatedProperty;
  operation: RelatedPropertiesOperation;
  scope: RelatedPropertiesScope;
  brokerId?: string;
  limit?: number;
  excludeIds?: string[];
};

type CandidateWithLayer = {
  property: RelatedProperty;
  layer: LayerConfig;
};

export async function findRelatedProperties({
  supabase,
  baseProperty,
  operation,
  scope,
  brokerId,
  limit = 4,
  excludeIds = [],
}: FindRelatedPropertiesInput): Promise<ScoredRelatedProperty[]> {
  if (!baseProperty.slug_publico || limit <= 0) return [];

  const candidates = new Map<string, CandidateWithLayer>();
  const excluded = new Set([baseProperty.id, ...excludeIds]);

  for (const layer of LAYERS) {
    const rows = await fetchLayerCandidates({
      supabase,
      baseProperty,
      operation,
      scope,
      brokerId,
      layer,
      excludedIds: Array.from(excluded),
    });

    for (const property of rows) {
      if (excluded.has(property.id) || candidates.has(property.id)) continue;
      candidates.set(property.id, { property, layer });
    }
  }

  const scored = Array.from(candidates.values())
    .map(({ property, layer }) => scoreRelatedProperty(baseProperty, property, operation, layer))
    .filter((item) => item.relatedScore >= 50)
    .sort((a, b) => {
      if (b.relatedScore !== a.relatedScore) return b.relatedScore - a.relatedScore;
      if (Number(b.destaque) !== Number(a.destaque)) return Number(b.destaque) - Number(a.destaque);
      return dateMs(b.publicado_em ?? b.updated_at) - dateMs(a.publicado_em ?? a.updated_at);
    });

  return applyDisplayRules(scored, limit);
}

async function fetchLayerCandidates({
  supabase,
  baseProperty,
  operation,
  scope,
  brokerId,
  layer,
  excludedIds,
}: {
  supabase: SupabaseClient<Database>;
  baseProperty: RelatedProperty;
  operation: RelatedPropertiesOperation;
  scope: RelatedPropertiesScope;
  brokerId?: string;
  layer: LayerConfig;
  excludedIds: string[];
}) {
  if (!canQueryLayer(baseProperty, layer.key)) return [];

  let query = supabase
    .from("imoveis")
    .select(RELATED_PROPERTY_SELECT)
    .eq("status", "PUBLICADO")
    .eq("tipo", baseProperty.tipo)
    .not("slug_publico", "is", null)
    .order("destaque", { ascending: false })
    .order("publicado_em", { ascending: false })
    .limit(layer.limit);

  if (scope === "broker") {
    query = query.eq("owner_id", brokerId ?? baseProperty.owner_id);
  }

  if (baseProperty.subtipo) {
    query = query.eq("subtipo", baseProperty.subtipo);
  }

  for (const id of excludedIds) {
    query = query.neq("id", id);
  }

  query = applyOperationFilter(query, operation);
  query = applyLayerFilter(query, baseProperty, layer.key);

  const result = await query;

  if (result.error) {
    throw new Error(`Erro ao buscar imóveis relacionados (${layer.key}): ${result.error.message}`);
  }

  return ((result.data ?? []) as unknown as RelatedProperty[]).filter((item) =>
    matchesOperation(item, operation),
  );
}

function applyOperationFilter<T>(query: T, operation: RelatedPropertiesOperation): T {
  const queryWithOr = query as T & { or: (filters: string) => T };
  if (operation === "aluguel") {
    return queryWithOr.or("tipo_negociacao.in.(ALUGUEL,VENDA_E_ALUGUEL),finalidade.eq.ALUGAR");
  }
  return queryWithOr.or("tipo_negociacao.in.(VENDA,VENDA_E_ALUGUEL),finalidade.eq.COMPRAR");
}

function applyLayerFilter<T>(query: T, baseProperty: RelatedProperty, layer: RelatedPropertiesLayer): T {
  const filterable = query as T & {
    eq: (column: string, value: string) => T;
  };

  if (layer === "same_empreendimento" && baseProperty.empreendimento_id) {
    return filterable.eq("empreendimento_id", baseProperty.empreendimento_id);
  }

  if (layer === "same_cep" && baseProperty.cep) {
    return filterable.eq("cep", baseProperty.cep);
  }

  if (layer === "same_bairro") {
    let next = filterable.eq("estado", baseProperty.estado);
    next = (next as T & { eq: (column: string, value: string) => T }).eq("cidade", baseProperty.cidade);
    return (next as T & { eq: (column: string, value: string) => T }).eq("bairro", baseProperty.bairro);
  }

  const next = filterable.eq("estado", baseProperty.estado);
  return (next as T & { eq: (column: string, value: string) => T }).eq("cidade", baseProperty.cidade);
}

function canQueryLayer(baseProperty: RelatedProperty, layer: RelatedPropertiesLayer) {
  if (layer === "same_empreendimento") return Boolean(baseProperty.empreendimento_id);
  if (layer === "same_cep") return Boolean(baseProperty.cep);
  if (layer === "same_bairro") return Boolean(baseProperty.bairro && baseProperty.cidade && baseProperty.estado);
  return Boolean(baseProperty.cidade && baseProperty.estado);
}

function scoreRelatedProperty(
  baseProperty: RelatedProperty,
  candidate: RelatedProperty,
  operation: RelatedPropertiesOperation,
  layer: LayerConfig,
): ScoredRelatedProperty {
  const priceScore = scorePrice(baseProperty, candidate, operation);
  const areaScore = scoreArea(baseProperty.area_util, candidate.area_util);
  const bedroomsScore = scoreAbsoluteCount(baseProperty.dormitorios, candidate.dormitorios, 55);
  const suitesScore = scoreAbsoluteCount(baseProperty.suites, candidate.suites, 50);
  const parkingScore = scoreParking(baseProperty.vagas, candidate.vagas);
  const recencyScore = scoreRecency(candidate.publicado_em ?? candidate.updated_at);

  const score =
    (layer.locationScore * layer.weights.location +
      priceScore * layer.weights.price +
      areaScore * layer.weights.area +
      bedroomsScore * layer.weights.bedrooms +
      suitesScore * layer.weights.suites +
      parkingScore * layer.weights.parking +
      recencyScore * layer.weights.recency) /
    100;

  return {
    ...candidate,
    relatedScore: Math.round(score),
    relatedLayer: layer.key,
    relatedReasons: buildReasons(layer, {
      priceScore,
      areaScore,
      bedroomsScore,
      suitesScore,
      parkingScore,
    }),
  };
}

function buildReasons(
  layer: LayerConfig,
  scores: {
    priceScore: number;
    areaScore: number;
    bedroomsScore: number;
    suitesScore: number;
    parkingScore: number;
  },
) {
  const reasons = [layer.reason];
  if (scores.priceScore >= 65) reasons.push("Valor compatível");
  if (scores.areaScore >= 80) reasons.push("Área útil parecida");
  if (scores.bedroomsScore === 100) reasons.push("Mesmo número de dormitórios");
  if (scores.suitesScore === 100) reasons.push("Mesmo número de suítes");
  if (scores.parkingScore >= 80) reasons.push("Vagas compatíveis");
  return reasons;
}

function applyDisplayRules(items: ScoredRelatedProperty[], limit: number) {
  const strong = items.filter((item) => item.relatedScore >= 70);
  const filler = items.filter((item) => item.relatedScore >= 50 && item.relatedScore < 70);
  const ordered = [...strong, ...filler];
  const layerCounts = new Map<RelatedPropertiesLayer, number>();
  const selected: ScoredRelatedProperty[] = [];

  for (const item of ordered) {
    const layer = LAYERS.find((entry) => entry.key === item.relatedLayer);
    const cap = layer?.cap ?? limit;
    const count = layerCounts.get(item.relatedLayer) ?? 0;
    if (count >= cap) continue;

    selected.push(item);
    layerCounts.set(item.relatedLayer, count + 1);
    if (selected.length >= limit) break;
  }

  return selected;
}

function scoreArea(baseArea: number | null, candidateArea: number | null) {
  if (!baseArea || !candidateArea) return 50;

  if (baseArea <= 50) {
    const diff = Math.abs(candidateArea - baseArea);
    if (diff <= 8) return 100;
    if (diff <= 12) return 80;
    if (diff <= 18) return 55;
    if (diff <= 24) return 30;
    return 0;
  }

  const diff = Math.abs(candidateArea - baseArea) / baseArea;
  if (diff <= 0.1) return 100;
  if (diff <= 0.2) return 80;
  if (diff <= 0.3) return 55;
  if (diff <= 0.4) return 30;
  return 0;
}

function scorePrice(
  baseProperty: RelatedProperty,
  candidate: RelatedProperty,
  operation: RelatedPropertiesOperation,
) {
  const basePrice = getOperationPrice(baseProperty, operation);
  const candidatePrice = getOperationPrice(candidate, operation);
  if (!basePrice || !candidatePrice) return 0;

  const diff = Math.abs(candidatePrice - basePrice) / basePrice;

  if (operation === "aluguel") {
    if (diff <= 0.05) return 100;
    if (diff <= 0.1) return 85;
    if (diff <= 0.15) return 65;
    if (diff <= 0.25) return 35;
    return 0;
  }

  if (basePrice <= 1_500_000) {
    if (diff <= 0.05) return 100;
    if (diff <= 0.1) return 85;
    if (diff <= 0.15) return 65;
    if (diff <= 0.2) return 45;
    if (diff <= 0.3) return 20;
    return 0;
  }

  if (diff <= 0.1) return 100;
  if (diff <= 0.15) return 80;
  if (diff <= 0.25) return 55;
  if (diff <= 0.35) return 25;
  return 0;
}

function scoreAbsoluteCount(baseValue: number | null, candidateValue: number | null, oneDiffScore: number) {
  if (baseValue == null || candidateValue == null) return 50;
  const diff = Math.abs(candidateValue - baseValue);
  if (diff === 0) return 100;
  if (diff === 1) return oneDiffScore;
  return 0;
}

function scoreParking(baseValue: number | null, candidateValue: number | null) {
  const base = baseValue ?? 0;
  const candidate = candidateValue ?? 0;
  if (base === candidate) return 100;
  if (candidate > base) return base === 0 ? 85 : 80;
  if (base > 0 && candidate === 0) return 0;
  if (base - candidate === 1) return 35;
  return 0;
}

function scoreRecency(value: string | null) {
  const timestamp = dateMs(value);
  if (!timestamp) return 30;

  const days = (Date.now() - timestamp) / 86_400_000;
  if (days <= 15) return 100;
  if (days <= 45) return 80;
  if (days <= 90) return 55;
  return 30;
}

function getOperationPrice(property: RelatedProperty, operation: RelatedPropertiesOperation) {
  return operation === "aluguel" ? property.preco_locacao : property.preco_venda;
}

function matchesOperation(
  property: Pick<RelatedProperty, "tipo_negociacao" | "finalidade">,
  operation: RelatedPropertiesOperation,
) {
  if (operation === "aluguel") {
    return (
      property.tipo_negociacao === "ALUGUEL" ||
      property.tipo_negociacao === "VENDA_E_ALUGUEL" ||
      property.finalidade === "ALUGAR"
    );
  }

  return (
    property.tipo_negociacao === "VENDA" ||
    property.tipo_negociacao === "VENDA_E_ALUGUEL" ||
    property.finalidade === "COMPRAR"
  );
}

function dateMs(value: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
