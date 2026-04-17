import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { addLeadLocalizacaoInteresse } from "@/lib/db/leads";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { validateCreateLeadLocalizacaoInteresse } from "@/lib/validation/crm";

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

export async function POST(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      },
      { status: 400 },
    );
  }

  const validation = validateCreateLeadLocalizacaoInteresse({
    ...(typeof body === "object" && body ? body : {}),
    lead_id: id,
  });
  if (!validation.ok) {
    return NextResponse.json(validation, {
      status: statusFromErrorCode(validation.error.code),
    });
  }

  const result = await addLeadLocalizacaoInteresse(accessToken, validation.data);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 201 });
}
