import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { uploadMidia } from "@/lib/db/midia";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { inspectImage } from "@/lib/media/image-metadata";

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid form-data payload",
        },
      },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "file is required",
        },
      },
      { status: 400 },
    );
  }

  const refTipoValue = form.get("ref_tipo");
  const refIdValue = form.get("ref_id");
  const grupoValue = form.get("grupo");
  const ordemValue = form.get("ordem");
  const tituloValue = form.get("titulo");
  const altValue = form.get("alt");
  const legendaValue = form.get("legenda");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspection = inspectImage(bytes, { fileName: file.name, mimeType: file.type });
  const allowedFormats = new Set(["JPEG", "PNG", "WEBP", "HEIC", "HEIF", "UNKNOWN"]);

  if (inspection.format !== "UNKNOWN") {
    if (!allowedFormats.has(inspection.format)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Formato de imagem não permitido.",
          },
        },
        { status: 400 },
      );
    }

    if (inspection.isAnimated) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Imagens animadas não são permitidas.",
          },
        },
        { status: 400 },
      );
    }
  }

  // Recreate File because arrayBuffer() can consume stream in some runtimes.
  const normalizedFile = new File([bytes], file.name, {
    type: file.type || "application/octet-stream",
    lastModified: file.lastModified,
  });

  const result = await uploadMidia(accessToken, {
    file: normalizedFile,
    ref_tipo:
      typeof refTipoValue === "string" && refTipoValue.length > 0
        ? (refTipoValue as Parameters<typeof uploadMidia>[1]["ref_tipo"])
        : undefined,
    ref_id: typeof refIdValue === "string" && refIdValue.length > 0 ? refIdValue : undefined,
    grupo: typeof grupoValue === "string" && grupoValue.length > 0 ? grupoValue : null,
    ordem: typeof ordemValue === "string" && ordemValue.length > 0 ? Number(ordemValue) : 0,
    titulo: typeof tituloValue === "string" && tituloValue.length > 0 ? tituloValue : null,
    alt: typeof altValue === "string" && altValue.length > 0 ? altValue : null,
    legenda: typeof legendaValue === "string" && legendaValue.length > 0 ? legendaValue : null,
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 201 });
}
