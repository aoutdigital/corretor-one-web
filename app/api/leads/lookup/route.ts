import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { findLeadByUniqueKey } from "@/lib/db/leads";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

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

function normalizePhoneToBrE164(rawPhone: string | null): string | null {
  if (!rawPhone) return null;

  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;

  return `+${withCountry}`;
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const telefone = searchParams.get("telefone");

  const result = await findLeadByUniqueKey(accessToken, {
    email,
    telefone_e164: normalizePhoneToBrE164(telefone),
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: statusFromErrorCode(result.error.code),
    });
  }

  return NextResponse.json(result);
}
