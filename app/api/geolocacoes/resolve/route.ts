import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ResolveGeoBody = {
  place_id?: string | null;
  address_json?: Record<string, unknown> | null;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  endereco_formatado?: string;
};

export async function POST(request: Request) {
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

  let body: ResolveGeoBody;
  try {
    body = (await request.json()) as ResolveGeoBody;
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

  const authClient = createSupabaseServerClient(accessToken);
  const auth = await authClient.auth.getUser();
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

  const logradouro = String(body.logradouro ?? "").trim();
  const numero = String(body.numero ?? "").trim();
  const bairro = String(body.bairro ?? "").trim();
  const cidade = String(body.cidade ?? "").trim();
  const uf = String(body.uf ?? "").trim().toUpperCase();
  const placeId = body.place_id?.trim() || null;
  const enderecoFormatado = String(body.endereco_formatado ?? "").trim();
  const hasTextualLocation = Boolean(placeId || enderecoFormatado || logradouro || bairro || cidade || uf);
  const hasCoordinates = body.lat != null && body.lng != null;

  if (!hasTextualLocation && !hasCoordinates) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Informe uma localidade válida ou coordenadas para resolver a geolocalização",
        },
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
      insert: (values: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
  };

  if (placeId) {
    const existing = await admin
      .from("geolocacoes")
      .select("id")
      .eq("place_id", placeId)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_ERROR",
            message: existing.error.message,
          },
        },
        { status: 500 },
      );
    }

    if (existing.data?.id) {
      return NextResponse.json({
        ok: true,
        data: { id: existing.data.id },
      });
    }
  }

  const insert = await admin
    .from("geolocacoes")
    .insert({
      place_id: placeId,
      address_json: body.address_json ?? {},
      logradouro,
      numero,
      bairro,
      cidade,
      uf,
      cep: body.cep ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      endereco_formatado:
        enderecoFormatado ||
        [logradouro, numero, bairro, cidade, uf].filter(Boolean).join(", ") ||
        [bairro, cidade, uf].filter(Boolean).join(" - ") ||
        null,
    })
    .select("id")
    .single();

  if (insert.error || !insert.data?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: insert.error?.message ?? "Falha ao criar geolocalização",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { id: insert.data.id },
  });
}
