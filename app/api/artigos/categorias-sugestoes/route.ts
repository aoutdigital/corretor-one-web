import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { suggestArtigoCategoria } from "@/lib/db/artigos";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const result = await suggestArtigoCategoria(accessToken, body as Parameters<typeof suggestArtigoCategoria>[1]);
  if (!result.ok) return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  return NextResponse.json(result, { status: 201 });
}
