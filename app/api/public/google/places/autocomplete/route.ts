import { NextResponse } from "next/server";

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;

export async function GET(request: Request) {
  if (!GOOGLE_MAPS_KEY) {
    return NextResponse.json(
      { ok: false, error: { code: "CONFIG_ERROR", message: "GOOGLE_MAPS_KEY não configurada" } },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const input = String(searchParams.get("input") ?? "").trim().slice(0, 120);

  if (input.length < 3) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", GOOGLE_MAPS_KEY);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("components", "country:br");
  url.searchParams.set("types", "geocode");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "EXTERNAL_API_ERROR", message: `Google Places retornou ${response.status}` } },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as {
    status?: string;
    predictions?: { place_id: string; description: string }[];
    error_message?: string;
  };

  if (payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EXTERNAL_API_ERROR",
          message: payload.error_message ?? `Falha no Google Places (${payload.status ?? "UNKNOWN"})`,
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: (payload.predictions ?? []).slice(0, 6).map((item) => ({
      place_id: item.place_id,
      description: item.description,
    })),
  });
}
