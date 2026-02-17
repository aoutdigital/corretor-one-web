import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { captureLeadByKeys } from "@/lib/db/leads";
import { validateLeadCaptureInput } from "@/lib/validation/lead-capture";

function isAuthorized(request: Request): boolean {
  const expected = process.env.LEADS_CAPTURE_API_KEY;
  if (!expected) return false;

  const provided = request.headers.get("x-capture-key");
  return provided === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid x-capture-key",
        },
      },
      { status: 401 },
    );
  }

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

  const validation = validateLeadCaptureInput(body);
  if (!validation.ok) {
    return NextResponse.json(validation, {
      status: statusFromErrorCode(validation.error.code),
    });
  }

  const result = await captureLeadByKeys(validation.data);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result, { status: 200 });
}

