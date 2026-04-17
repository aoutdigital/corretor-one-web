import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import {
  listMidiaPublicaEmpreendimento,
  syncEmpreendimentoPublicMidia,
} from "@/lib/db/midia";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

type Params = {
  params: Promise<{ id: string }>;
};

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

export async function GET(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await params;
  const result = await listMidiaPublicaEmpreendimento(accessToken, id);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await params;

  const syncResult = await syncEmpreendimentoPublicMidia(accessToken, id);
  if (!syncResult.ok) {
    return NextResponse.json(syncResult, {
      status: statusFromErrorCode(syncResult.error.code),
    });
  }

  const listResult = await listMidiaPublicaEmpreendimento(accessToken, id);
  if (!listResult.ok) {
    return NextResponse.json(listResult, {
      status: statusFromErrorCode(listResult.error.code),
    });
  }

  return NextResponse.json(listResult);
}
