import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { createYoutubeMidiaImovel, listMidiaImovel, reorderMidiaImovel, uploadMidia } from "@/lib/db/midia";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { inspectImage } from "@/lib/media/image-metadata";

const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;

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
  const result = await listMidiaImovel(accessToken, id);
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
  const youtubeUrlValue = form.get("youtube_url");
  const hasYoutubeUrl = typeof youtubeUrlValue === "string" && youtubeUrlValue.trim().length > 0;

  if (!(file instanceof File) && !hasYoutubeUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "file or youtube_url is required",
        },
      },
      { status: 400 },
    );
  }

  const ordemValue = form.get("ordem");
  const tituloValue = form.get("titulo");
  const altValue = form.get("alt");
  const legendaValue = form.get("legenda");
  const caracteristicaValue = form.get("caracteristica");
  const ordem = typeof ordemValue === "string" && ordemValue.length > 0 ? Number(ordemValue) : 0;
  if (!Number.isFinite(ordem)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "ordem must be a valid number",
        },
      },
      { status: 400 },
    );
  }

  if (file instanceof File) {
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Image exceeds max size of 15MB",
          },
        },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspection = inspectImage(bytes, { fileName: file.name, mimeType: file.type });
    const allowedFormats = new Set(["JPEG", "PNG", "WEBP", "HEIC", "HEIF"]);

    if (!allowedFormats.has(inspection.format)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Formato não permitido. Use JPG, JPEG, PNG, WEBP estático, HEIC ou HEIF.",
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

    if (inspection.dimensions) {
      if (
        inspection.dimensions.width < MIN_IMAGE_WIDTH ||
        inspection.dimensions.height < MIN_IMAGE_HEIGHT
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Minimum image resolution is ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`,
            },
          },
          { status: 400 },
        );
      }
    }

    const result = await uploadMidia(accessToken, {
      file,
      ref_tipo: "IMOVEL",
      ref_id: id,
      ordem,
      titulo: typeof tituloValue === "string" && tituloValue.length > 0 ? tituloValue : null,
      alt: typeof altValue === "string" && altValue.length > 0 ? altValue : null,
      legenda: typeof legendaValue === "string" && legendaValue.length > 0 ? legendaValue : null,
      caracteristica:
        typeof caracteristicaValue === "string" && caracteristicaValue.length > 0
          ? caracteristicaValue
          : null,
    });

    if (!result.ok) {
      return NextResponse.json(result, {
        status: statusFromErrorCode(result.error.code),
      });
    }

    return NextResponse.json(result, { status: 201 });
  }

  const result = await createYoutubeMidiaImovel(
    accessToken,
    id,
    (youtubeUrlValue as string).trim(),
    ordem,
    typeof tituloValue === "string" && tituloValue.trim().length > 0 ? tituloValue.trim() : null,
  );

  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: Request, { params }: Params) {
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

  const orderedMidiaIds =
    body && typeof body === "object" && Array.isArray((body as { orderedMidiaIds?: unknown[] }).orderedMidiaIds)
      ? ((body as { orderedMidiaIds: unknown[] }).orderedMidiaIds.filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        ) as string[])
      : [];

  if (orderedMidiaIds.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "orderedMidiaIds is required",
        },
      },
      { status: 400 },
    );
  }

  const result = await reorderMidiaImovel(accessToken, id, orderedMidiaIds);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
