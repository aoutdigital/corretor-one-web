import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { enqueueEmpreendimentoPublicationJob } from "@/lib/db/empreendimento-publicacao-jobs";
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

export async function POST(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

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

  const { id } = await params;
  const payload = (body && typeof body === "object" ? body : {}) as {
    imagens?: unknown;
    videos?: unknown;
  };

  const result = await enqueueEmpreendimentoPublicationJob(accessToken, id, {
    imagens: Array.isArray(payload.imagens)
      ? payload.imagens
          .filter(
            (item): item is { midiaId?: unknown; ordem?: unknown; alt?: unknown; legenda?: unknown; caracteristica?: unknown } =>
              typeof item === "object" && item !== null,
          )
          .map((item) => ({
            midiaId: typeof item.midiaId === "string" ? item.midiaId : "",
            ordem: typeof item.ordem === "number" && Number.isFinite(item.ordem) ? item.ordem : 0,
            alt: typeof item.alt === "string" ? item.alt : "",
            legenda: typeof item.legenda === "string" ? item.legenda : "",
            caracteristica: typeof item.caracteristica === "string" ? item.caracteristica : "",
          }))
          .filter((item) => item.midiaId.length > 0)
      : [],
    videos: Array.isArray(payload.videos)
      ? payload.videos
          .filter((item): item is { url?: unknown } => typeof item === "object" && item !== null)
          .map((item) => ({ url: typeof item.url === "string" ? item.url : "" }))
          .filter((item) => item.url.length > 0)
      : [],
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  }

  return NextResponse.json(result, { status: 202 });
}
