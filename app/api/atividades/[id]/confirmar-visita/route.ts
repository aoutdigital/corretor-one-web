import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { confirmVisitAtividade } from "@/lib/db/atividades";
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

function asObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseNullableString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

  if (!asObject(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Body must be a JSON object",
        },
      },
      { status: 400 },
    );
  }

  const modelo = parseNullableString(body.modelo);
  const quandoEm = parseNullableString(body.quando_em);
  if (modelo !== "EM_ATENDIMENTO_VISITA_PRESENCIAL" && modelo !== "EM_ATENDIMENTO_VISITA_VIRTUAL") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Informe se a visita será presencial ou virtual.",
        },
      },
      { status: 400 },
    );
  }

  if (!quandoEm) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Defina a data e hora da visita.",
        },
      },
      { status: 400 },
    );
  }

  const result = await confirmVisitAtividade(accessToken, id, {
    modelo,
    quando_em: quandoEm,
    descricao: parseNullableString(body.descricao),
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 201 });
}
