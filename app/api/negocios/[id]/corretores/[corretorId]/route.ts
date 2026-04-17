import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { deleteNegocioCorretor, updateNegocioCorretor } from "@/lib/db/negocios";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { validateUpdateNegocioCorretor } from "@/lib/validation/crm";

type Params = {
  params: Promise<{ id: string; corretorId: string }>;
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

export async function PATCH(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id, corretorId } = await params;

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

  const validation = validateUpdateNegocioCorretor(body);
  if (!validation.ok) {
    return NextResponse.json(validation, {
      status: statusFromErrorCode(validation.error.code),
    });
  }

  const result = await updateNegocioCorretor(accessToken, id, corretorId, validation.data);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}

export async function DELETE(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { id, corretorId } = await params;
  const result = await deleteNegocioCorretor(accessToken, id, corretorId);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
