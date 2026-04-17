import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { removeMidiaImovel, updateMidiaMetadata } from "@/lib/db/midia";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

type Params = {
  params: Promise<{ id: string; midiaId: string }>;
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

  const { midiaId } = await params;

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

  const patch = (body ?? {}) as {
    titulo?: unknown;
    alt?: unknown;
    legenda?: unknown;
    caracteristica?: unknown;
  };

  const hasAnyField =
    Object.prototype.hasOwnProperty.call(patch, "titulo") ||
    Object.prototype.hasOwnProperty.call(patch, "alt") ||
    Object.prototype.hasOwnProperty.call(patch, "legenda") ||
    Object.prototype.hasOwnProperty.call(patch, "caracteristica");

  if (!hasAnyField) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "At least one field is required: titulo, alt, legenda, caracteristica",
        },
      },
      { status: 400 },
    );
  }

  const normalize = (value: unknown): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  if (
    (patch.titulo !== undefined && patch.titulo !== null && typeof patch.titulo !== "string") ||
    (patch.alt !== undefined && patch.alt !== null && typeof patch.alt !== "string") ||
    (patch.legenda !== undefined && patch.legenda !== null && typeof patch.legenda !== "string") ||
    (patch.caracteristica !== undefined &&
      patch.caracteristica !== null &&
      typeof patch.caracteristica !== "string")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "titulo, alt, legenda e caracteristica devem ser string ou null",
        },
      },
      { status: 400 },
    );
  }

  const result = await updateMidiaMetadata(accessToken, midiaId, {
    titulo: normalize(patch.titulo),
    alt: normalize(patch.alt),
    legenda: normalize(patch.legenda),
    caracteristica: normalize(patch.caracteristica),
  });

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

  const { id, midiaId } = await params;

  const result = await removeMidiaImovel(accessToken, id, midiaId);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
