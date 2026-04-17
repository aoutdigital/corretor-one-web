import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { listEmpreendimentosParaAssociacao } from "@/lib/db/imoveis";
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

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const includeId = searchParams.get("include_id")?.trim() || undefined;

  const result = await listEmpreendimentosParaAssociacao(accessToken, q, includeId);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
