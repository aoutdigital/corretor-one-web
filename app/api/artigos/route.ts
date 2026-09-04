import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { createArtigo, listArtigos, updateArtigosConfig, updateArtigosManualOrder } from "@/lib/db/artigos";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const result = await listArtigos(accessToken);
  if (!result.ok) return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  return NextResponse.json(result);
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

  const result = await createArtigo(accessToken, body as Parameters<typeof createArtigo>[1]);
  if (!result.ok) return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: Request) {
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

  const result =
    isRecord(body) && body.action === "REORDER"
      ? await updateArtigosManualOrder(accessToken, body)
      : await updateArtigosConfig(accessToken, body as Parameters<typeof updateArtigosConfig>[1]);
  if (!result.ok) return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  return NextResponse.json(result);
}
