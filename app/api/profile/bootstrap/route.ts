import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { ensureProfileOnFirstLogin } from "@/lib/db/profiles";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);

  if (!accessToken) {
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

  const result = await ensureProfileOnFirstLogin(accessToken);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 200 });
}

