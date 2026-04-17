import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { processNextEmpreendimentoPublicationJob } from "@/lib/db/empreendimento-publicacao-jobs";
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

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const result = await processNextEmpreendimentoPublicationJob(accessToken);
  if (!result.ok) {
    return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  }

  return NextResponse.json(result);
}
