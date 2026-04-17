import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function findComponent(components: AddressComponent[], type: string) {
  return components.find((component) => component.types.includes(type));
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
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
  const placeId = String(searchParams.get("placeId") ?? "").trim();

  if (!placeId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "placeId é obrigatório",
        },
      },
      { status: 400 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "place_id,name,formatted_address,address_components,geometry",
  );
  url.searchParams.set("language", "pt-BR");
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
          message: `Google Place Details retornou ${response.status}`,
        },
      },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as {
    status?: string;
    result?: {
      place_id?: string;
      name?: string;
      formatted_address?: string;
      address_components?: AddressComponent[];
      geometry?: {
        location?: { lat?: number; lng?: number };
      };
    };
    error_message?: string;
  };

  if (payload.status !== "OK" || !payload.result) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EXTERNAL_API_ERROR",
          message: payload.error_message ?? `Falha no Google Place Details (${payload.status ?? "UNKNOWN"})`,
        },
      },
      { status: 502 },
    );
  }

  const components = payload.result.address_components ?? [];
  const streetNumber = findComponent(components, "street_number")?.long_name ?? "";
  const route = firstNonEmpty([
    findComponent(components, "route")?.long_name,
    findComponent(components, "premise")?.long_name,
    findComponent(components, "establishment")?.long_name,
    findComponent(components, "point_of_interest")?.long_name,
    findComponent(components, "intersection")?.long_name,
    findComponent(components, "sublocality_level_1")?.long_name,
    findComponent(components, "sublocality")?.long_name,
    payload.result.name,
    payload.result.formatted_address?.split(",")[0],
  ]);
  const neighborhood =
    findComponent(components, "sublocality_level_1")?.long_name ??
    findComponent(components, "sublocality")?.long_name ??
    findComponent(components, "neighborhood")?.long_name ??
    "";
  const city =
    findComponent(components, "administrative_area_level_2")?.long_name ??
    findComponent(components, "locality")?.long_name ??
    "";
  const uf = findComponent(components, "administrative_area_level_1")?.short_name ?? "";
  const cep = findComponent(components, "postal_code")?.long_name ?? "";
  const lat = payload.result.geometry?.location?.lat ?? null;
  const lng = payload.result.geometry?.location?.lng ?? null;

  return NextResponse.json({
    ok: true,
    data: {
      place_id: payload.result.place_id ?? placeId,
      name: payload.result.name ?? "",
      formatted_address: payload.result.formatted_address ?? "",
      logradouro: route,
      numero: streetNumber,
      bairro: neighborhood,
      cidade: city,
      estado: uf.toUpperCase(),
      cep,
      lat,
      lng,
      address_components: components,
    },
  });
}
