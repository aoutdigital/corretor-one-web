import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;

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

  if (!GOOGLE_MAPS_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CONFIG_ERROR",
          message: "GOOGLE_MAPS_KEY não configurada",
        },
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const address = String(searchParams.get("address") ?? "").trim();

  if (address.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "address inválido",
        },
      },
      { status: 400 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "br");
  url.searchParams.set("key", GOOGLE_MAPS_KEY);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EXTERNAL_API_ERROR",
          message: `Google Geocoding retornou ${response.status}`,
        },
      },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      place_id?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
    error_message?: string;
  };

  if (payload.status !== "OK" || !payload.results?.length) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EXTERNAL_API_ERROR",
          message: payload.error_message ?? `Geocoding sem resultado (${payload.status ?? "UNKNOWN"})`,
        },
      },
      { status: 404 },
    );
  }

  const best = payload.results[0];
  return NextResponse.json({
    ok: true,
    data: {
      place_id: best.place_id ?? null,
      formatted_address: best.formatted_address ?? address,
      lat: best.geometry?.location?.lat ?? null,
      lng: best.geometry?.location?.lng ?? null,
    },
  });
}
