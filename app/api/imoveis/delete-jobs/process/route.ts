import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { processImovelDeleteJobs } from "@/lib/db/imovel-delete-jobs";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
    { status: 401 },
  );
}

async function handle(request: Request) {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET?.trim();
  const requestSecret = request.headers.get("x-cron-secret")?.trim();

  if (!configuredSecret || !requestSecret || requestSecret !== configuredSecret) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 10;

  const result = await processImovelDeleteJobs(limit);
  if (!result.ok) {
    return NextResponse.json(result, { status: statusFromErrorCode(result.error.code) });
  }

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
