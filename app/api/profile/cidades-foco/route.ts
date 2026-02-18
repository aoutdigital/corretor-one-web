import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

type CidadeFoco = {
  codigo_ibge: number;
  nome: string;
  uf: string;
};

export async function PATCH(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      },
      { status: 400 },
    );
  }

  const uf = String((body as Record<string, unknown>)?.uf ?? "").toUpperCase();
  const cidades = ((body as Record<string, unknown>)?.cidades ?? []) as CidadeFoco[];

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

  if (!Array.isArray(cidades) || cidades.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Informe ao menos uma cidade foco",
        },
      },
      { status: 400 },
    );
  }

  const hasInvalid = cidades.some(
    (item) =>
      typeof item?.codigo_ibge !== "number" ||
      !Number.isInteger(item.codigo_ibge) ||
      item.codigo_ibge <= 0 ||
      typeof item?.nome !== "string" ||
      !item.nome.trim() ||
      String(item?.uf ?? "").toUpperCase() !== uf,
  );

  if (hasInvalid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Lista de cidades foco inválida",
        },
      },
      { status: 400 },
    );
  }

  const client = createSupabaseServerClient(accessToken);
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid access token",
        },
      },
      { status: 401 },
    );
  }

  const normalized = cidades.map((item) => ({
    codigo_ibge: item.codigo_ibge,
    nome: item.nome.trim(),
    uf,
  }));

  const nomes = normalized.map((item) => item.nome);
  const db = client as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          select: (columns: string) => {
            maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };

  const result = await db
    .from("profiles")
    .update({
      uf,
      cidades_foco: nomes,
      cidades_foco_json: normalized,
    })
    .eq("id", auth.data.user.id)
    .select("id")
    .maybeSingle();

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

  if (!result.data) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Profile not found",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        id: result.data.id,
      },
    },
    { status: 200 },
  );
}
