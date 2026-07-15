import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

type AnyDb = {
  from: (table: string) => QueryBuilder;
};

type QueryResult = {
  data: unknown[] | null;
  error: { message?: string } | null;
};

type QueryBuilder = PromiseLike<QueryResult> & {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
};

type EnterpriseRef = {
  id: string | null;
  nome: string | null;
  bairro: string | null;
  cidade: string | null;
  caracteristicas: string[] | null;
};

type PropertyCarouselRow = {
  id: string;
  cidade: string | null;
  bairro: string | null;
  bairro_comercial: string | null;
  empreendimento_id: string | null;
  dormitorios: number | null;
  suites: number | null;
  vagas: number | null;
  preco_venda: number | null;
  preco_locacao: number | null;
  caracteristicas: string[] | null;
  empreendimentos: EnterpriseRef | EnterpriseRef[] | null;
};

type CarouselFilters = {
  cidade: string | null;
  bairro: string | null;
  empreendimentoId: string | null;
  dormitoriosMin: number | null;
  suitesMin: number | null;
  vagasMin: number | null;
  valorMin: number | null;
  valorMax: number | null;
  caracteristicasImovel: string[];
  caracteristicasEmpreendimento: string[];
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return NextResponse.json(auth, { status: statusFromErrorCode(auth.error.code) });

  const url = new URL(request.url);
  const filters = readFilters(url.searchParams);
  const db = auth.data.client as unknown as AnyDb;

  const result = await db
    .from("imoveis")
    .select(
      [
        "id",
        "cidade",
        "bairro",
        "bairro_comercial",
        "empreendimento_id",
        "dormitorios",
        "suites",
        "vagas",
        "preco_venda",
        "preco_locacao",
        "caracteristicas",
        "empreendimentos(id,nome,bairro,cidade,caracteristicas)",
      ].join(","),
    )
    .eq("owner_id", auth.data.user.id)
    .eq("status", "PUBLICADO")
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { message: "Falha ao calcular imóveis do carrossel." } },
      { status: 500 },
    );
  }

  const rows = (result.data ?? []) as PropertyCarouselRow[];
  const matchingRows = rows.filter((item) => matchesFilters(item, filters));

  return NextResponse.json({
    ok: true,
    data: {
      total: matchingRows.length,
      cities: uniqueSorted(rows.map((item) => item.cidade)),
      neighborhoods: uniqueSorted(
        rows
          .filter((item) => !filters.cidade || sameText(item.cidade, filters.cidade))
          .map((item) => item.bairro_comercial || item.bairro),
      ),
      enterprises: uniqueEnterprises(
        rows.filter((item) => {
          const neighborhood = item.bairro_comercial || item.bairro;
          return (!filters.cidade || sameText(item.cidade, filters.cidade)) && (!filters.bairro || sameText(neighborhood, filters.bairro));
        }),
      ),
    },
  });
}

function readFilters(searchParams: URLSearchParams): CarouselFilters {
  return {
    cidade: textOrNull(searchParams.get("cidade")),
    bairro: textOrNull(searchParams.get("bairro")),
    empreendimentoId: textOrNull(searchParams.get("empreendimento_id")),
    dormitoriosMin: numberOrNull(searchParams.get("dormitorios_min")),
    suitesMin: numberOrNull(searchParams.get("suites_min")),
    vagasMin: numberOrNull(searchParams.get("vagas_min")),
    valorMin: numberOrNull(searchParams.get("valor_min")),
    valorMax: numberOrNull(searchParams.get("valor_max")),
    caracteristicasImovel: searchParams.getAll("caracteristicas_imovel").map((item) => item.trim()).filter(Boolean),
    caracteristicasEmpreendimento: searchParams.getAll("caracteristicas_empreendimento").map((item) => item.trim()).filter(Boolean),
  };
}

function matchesFilters(property: PropertyCarouselRow, filters: CarouselFilters) {
  const neighborhood = property.bairro_comercial || property.bairro;
  const enterprise = getEnterprise(property.empreendimentos);
  const price = getPropertyPrice(property);

  if (filters.cidade && !sameText(property.cidade, filters.cidade)) return false;
  if (filters.bairro && !sameText(neighborhood, filters.bairro)) return false;
  if (filters.empreendimentoId && property.empreendimento_id !== filters.empreendimentoId) return false;
  if (filters.dormitoriosMin && (property.dormitorios ?? 0) < filters.dormitoriosMin) return false;
  if (filters.suitesMin && (property.suites ?? 0) < filters.suitesMin) return false;
  if (filters.vagasMin && (property.vagas ?? 0) < filters.vagasMin) return false;
  if (filters.valorMin && (!price || price < filters.valorMin)) return false;
  if (filters.valorMax && (!price || price > filters.valorMax)) return false;
  if (filters.caracteristicasImovel.length && !hasAll(property.caracteristicas, filters.caracteristicasImovel)) return false;
  if (filters.caracteristicasEmpreendimento.length && !hasAll(enterprise?.caracteristicas, filters.caracteristicasEmpreendimento)) return false;

  return true;
}

function getEnterprise(value: PropertyCarouselRow["empreendimentos"]) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function uniqueEnterprises(rows: PropertyCarouselRow[]) {
  const byId = new Map<string, { id: string; nome: string | null; bairro: string | null; cidade: string | null; status: string }>();

  for (const row of rows) {
    const enterprise = getEnterprise(row.empreendimentos);
    if (!enterprise?.id || byId.has(enterprise.id)) continue;
    byId.set(enterprise.id, {
      id: enterprise.id,
      nome: enterprise.nome,
      bairro: enterprise.bairro,
      cidade: enterprise.cidade,
      status: "PUBLICADO",
    });
  }

  return Array.from(byId.values()).sort((a, b) => String(a.nome ?? "").localeCompare(String(b.nome ?? ""), "pt-BR"));
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getPropertyPrice(property: PropertyCarouselRow) {
  return property.preco_venda && property.preco_venda > 0 ? property.preco_venda : property.preco_locacao && property.preco_locacao > 0 ? property.preco_locacao : null;
}

function hasAll(source: string[] | null | undefined, expected: string[]) {
  const current = new Set(source ?? []);
  return expected.every((item) => current.has(item));
}

function sameText(left: string | null | undefined, right: string | null | undefined) {
  return normalizeText(left) === normalizeText(right);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function textOrNull(value: string | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numberOrNull(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
