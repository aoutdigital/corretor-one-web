import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { removeLeadLocalizacaoInteresse } from "@/lib/db/leads";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

type Params = {
  params: Promise<{ id: string; locationId: string }>;
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

export async function DELETE(_request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(_request);
  if (!accessToken) return unauthorizedResponse();

  const { id, locationId } = await params;
  const result = await removeLeadLocalizacaoInteresse(accessToken, {
    lead_id: id,
    localizacao_id: locationId,
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
