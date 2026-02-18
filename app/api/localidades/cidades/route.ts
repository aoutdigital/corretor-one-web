import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UF_VALUES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

type IbgeCidade = {
  id: number;
  nome: string;
};

async function ensureCitiesCached(uf: string) {
  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: string) => {
      select: (columns: string, options?: Record<string, unknown>) => {
        eq: (column: string, value: unknown) => {
          eq: (column: string, value: unknown) => Promise<{ count: number | null; error: { message: string } | null }>;
        };
      };
      upsert: (rows: unknown[], options?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
    };
  };

  const countResult = await admin
    .from("referencia_localidades")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "CIDADE")
    .eq("uf", uf);

  if (countResult.error) {
    throw new Error(countResult.error.message);
  }

  if ((countResult.count ?? 0) > 0) {
    return;
  }

  const ibgeResponse = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!ibgeResponse.ok) {
    throw new Error(`IBGE request failed with status ${ibgeResponse.status}`);
  }

  const ibgeData = (await ibgeResponse.json()) as IbgeCidade[];
  const nowIso = new Date().toISOString();

  const rows = ibgeData.map((item) => ({
    tipo: "CIDADE",
    codigo_ibge: item.id,
    uf,
    nome: item.nome,
    payload: item,
    updated_at: nowIso,
  }));

  const upsertResult = await admin.from("referencia_localidades").upsert(rows, { onConflict: "codigo_ibge" });
  if (upsertResult.error) {
    throw new Error(upsertResult.error.message);
  }
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing bearer token",
        },
      },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const uf = String(searchParams.get("uf") ?? "").toUpperCase();
  const q = String(searchParams.get("q") ?? "").trim();

  if (!UF_VALUES.has(uf)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "UF inválida",
        },
      },
      { status: 400 },
    );
  }

  try {
    await ensureCitiesCached(uf);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "IBGE_SYNC_ERROR",
          message: error instanceof Error ? error.message : "Erro ao sincronizar cidades",
        },
      },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => {
          eq: (column: string, value: unknown) => {
            ilike: (column: string, value: string) => {
              order: (column: string) => {
                limit: (
                  value: number,
                ) => Promise<{ data: { codigo_ibge: number; nome: string; uf: string }[] | null; error: { message: string } | null }>;
              };
            };
            order: (column: string) => {
              limit: (
                value: number,
              ) => Promise<{ data: { codigo_ibge: number; nome: string; uf: string }[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
  };

  const baseQuery = admin.from("referencia_localidades").select("codigo_ibge,nome,uf").eq("tipo", "CIDADE").eq("uf", uf);

  if (q.length < 1) {
    return NextResponse.json(
      {
        ok: true,
        data: [],
      },
      { status: 200 },
    );
  }

  const result = await baseQuery.ilike("nome", `${q}%`).order("nome").limit(30);

  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: result.error.message,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: result.data ?? [],
    },
    { status: 200 },
  );
}
