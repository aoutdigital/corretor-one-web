import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { deleteArtigo, getArtigo, updateArtigo } from "@/lib/db/artigos";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

type Params = {
  params: Promise<{ id: string }>;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function GET(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();
  const { id } = await params;

  const result = await getArtigo(accessToken, id);
  if (!result.ok) return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  return NextResponse.json(result);
}

export async function PATCH(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const result = await updateArtigo(accessToken, id, body as Parameters<typeof updateArtigo>[2]);
  if (!result.ok) return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  return NextResponse.json(result);
}

export async function DELETE(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();
  const { id } = await params;

  const result = await deleteArtigo(accessToken, id);
  if (!result.ok) return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  return NextResponse.json(result);
}
