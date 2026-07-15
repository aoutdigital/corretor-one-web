import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { buildImovelHeaderTitle } from "@/lib/imoveis/display-title";

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
  in: (column: string, values: unknown[]) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
};

type PropertyOptionRow = {
  id: string;
  codigo: string | null;
  titulo: string | null;
  status: string | null;
  slug_publico: string | null;
  finalidade: string | null;
  tipo_negociacao: string | null;
  tipo: string | null;
  subtipo: string | null;
  area_util: number | null;
  area_total: number | null;
  area_terreno: number | null;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  logradouro: string | null;
  numero: string | null;
  bairro_comercial: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  updated_at: string | null;
};

type MediaRow = {
  imovel_id: string;
  indice_publico: number;
  ordem: number;
  url: string | null;
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

  const db = auth.data.client as unknown as AnyDb;
  const url = new URL(request.url);
  const query = normalizeSearch(url.searchParams.get("q"));
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 80, 1), 120);

  const result = await db
    .from("imoveis")
    .select(
      [
        "id",
        "codigo",
        "titulo",
        "status",
        "slug_publico",
        "finalidade",
        "tipo_negociacao",
        "tipo",
        "subtipo",
        "area_util",
        "area_total",
        "area_terreno",
        "dormitorios",
        "suites",
        "banheiros",
        "vagas",
        "logradouro",
        "numero",
        "bairro_comercial",
        "bairro",
        "cidade",
        "estado",
        "updated_at",
      ].join(","),
    )
    .eq("owner_id", auth.data.user.id)
    .eq("status", "PUBLICADO")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { message: "Falha ao buscar imóveis." } },
      { status: 500 },
    );
  }

  const rows = ((result.data ?? []) as PropertyOptionRow[]).filter((item) =>
    matchesQuery(
      query,
      item.codigo,
      item.titulo,
      item.logradouro,
      item.numero,
      item.bairro_comercial,
      item.bairro,
      item.cidade,
      item.estado,
      buildImovelHeaderTitle(item),
    ),
  );
  const mediaById = await getPropertyMedia(db, auth.data.user.id, rows.map((item) => item.id));

  return NextResponse.json({
    ok: true,
    data: {
      items: rows.slice(0, limit).map((item) => ({
        ...item,
        label: buildImovelHeaderTitle(item),
        capa_url_publica_thumb_webp: getPublicImageUrl(mediaById.get(item.id)?.[0]?.url),
      })),
    },
  });
}

async function getPropertyMedia(db: AnyDb, ownerId: string, propertyIds: string[]) {
  const mediaById = new Map<string, MediaRow[]>();
  if (!propertyIds.length) return mediaById;

  const result = await db
    .from("imovel_midia_publica")
    .select("imovel_id,indice_publico,ordem,url")
    .eq("owner_id", ownerId)
    .in("imovel_id", propertyIds)
    .order("imovel_id", { ascending: true })
    .order("indice_publico", { ascending: true })
    .order("ordem", { ascending: true });

  for (const item of (result.data ?? []) as MediaRow[]) {
    const current = mediaById.get(item.imovel_id) ?? [];
    current.push(item);
    mediaById.set(item.imovel_id, current);
  }

  return mediaById;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function matchesQuery(query: string, ...values: Array<string | null | undefined>) {
  if (!query) return true;
  return values.some((value) => normalizeSearch(value).includes(query));
}

function getPublicImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/${url}`;
}
