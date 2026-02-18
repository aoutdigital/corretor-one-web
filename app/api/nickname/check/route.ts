import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NICKNAME_REGEX = /^[a-z0-9]{1,35}$/;
const NICKNAME_BLOCKED_TERMS_REGEX = /(corret|imob|imov|aparta|casa)/i;

export async function GET(request: NextRequest) {
  const nicknameRaw = request.nextUrl.searchParams.get("nickname") ?? "";
  const nickname = nicknameRaw.trim().toLowerCase();

  if (!nickname) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "nickname is required" } },
      { status: 400 },
    );
  }

  if (!NICKNAME_REGEX.test(nickname)) {
    return NextResponse.json({
      ok: true,
      data: {
        available: false,
        reason: "INVALID_FORMAT",
        suggestion: null,
      },
    });
  }

  if (NICKNAME_BLOCKED_TERMS_REGEX.test(nickname)) {
    return NextResponse.json({
      ok: true,
      data: {
        available: false,
        reason: "BLOCKED_TERM",
        suggestion: null,
      },
    });
  }

  const admin = createSupabaseAdminClient();
  const result = await admin.from("profiles").select("id").eq("nickname", nickname).maybeSingle();

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: result.error.message } },
      { status: 500 },
    );
  }

  if (result.data) {
    return NextResponse.json({
      ok: true,
      data: {
        available: false,
        reason: "TAKEN",
        suggestion: null,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      available: true,
      reason: null,
      suggestion: null,
    },
  });
}
