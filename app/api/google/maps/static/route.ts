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
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const zoom = Number(searchParams.get("zoom") ?? "16");
  const width = Number(searchParams.get("w") ?? "900");
  const height = Number(searchParams.get("h") ?? "420");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "lat/lng inválidos",
        },
      },
      { status: 400 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("size", `${Math.min(width, 1280)}x${Math.min(height, 640)}`);
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("markers", `color:0xe5232b|${lat},${lng}`);
  url.searchParams.set("key", GOOGLE_MAPS_KEY);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EXTERNAL_API_ERROR",
          message: `Google Static Maps retornou ${response.status}`,
        },
      },
      { status: 502 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const bytes = await response.arrayBuffer();

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
