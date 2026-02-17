import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UF_LIST = [
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
] as const;

type Uf = (typeof UF_LIST)[number];

const UF_VALUES = new Set<Uf>(UF_LIST);

function isUf(value: string): value is Uf {
  return UF_VALUES.has(value as Uf);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const uf = String((body as Record<string, unknown>)?.uf ?? "").toUpperCase();
  const creciNumero = String((body as Record<string, unknown>)?.creci_numero ?? "").trim();

  if (!isUf(uf)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "UF invalida" } },
      { status: 400 },
    );
  }

  if (!/^[0-9]{1,6}$/.test(creciNumero)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "CRECI deve ter de 1 a 6 digitos numericos",
        },
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  const duplicateResult = await admin
    .from("profiles")
    .select("id")
    .eq("creci_uf", uf)
    .eq("creci_numero", creciNumero)
    .eq("creci_sufixo", "F")
    .maybeSingle();

  if (duplicateResult.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: duplicateResult.error.message } },
      { status: 500 },
    );
  }

  if (duplicateResult.data) {
    return NextResponse.json(
      {
        ok: true,
        data: {
          valid: false,
          reason: "DUPLICATE",
          message: "Este CRECI ja esta vinculado a uma conta.",
        },
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        valid: true,
        message: "CRECI validado com sucesso.",
      },
    },
    { status: 200 },
  );
}
