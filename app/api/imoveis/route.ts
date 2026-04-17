import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { createImovel, listImoveis } from "@/lib/db/imoveis";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

function unauthorizedResponse() {
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

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const result = await listImoveis(accessToken);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Accept empty body for quick draft creation.
  }

  const result = await createImovel(accessToken, body as Parameters<typeof createImovel>[1]);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 201 });
}
