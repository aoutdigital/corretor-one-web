import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { getImovelAmbientes, replaceImovelAmbientes, type ImovelAmbienteInput } from "@/lib/db/imoveis";
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
  const result = await getImovelAmbientes(accessToken, id);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}

export async function PUT(request: Request, { params }: Params) {
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

  const ambientes = Array.isArray((body as { ambientes?: unknown[] })?.ambientes)
    ? ((body as { ambientes: ImovelAmbienteInput[] }).ambientes ?? [])
    : null;

  if (!ambientes) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Field 'ambientes' must be an array.",
        },
      },
      { status: 400 },
    );
  }

  const result = await replaceImovelAmbientes(accessToken, id, ambientes);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
