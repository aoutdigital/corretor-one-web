import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("profiles")
    .select("id, nickname, primeiro_nome, sobrenome, avatar_url, bio, uf, cidades_foco")
    .eq("status", "ATIVO")
    .not("nickname", "is", null)
    .order("updated_at", { ascending: false });

  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "DATABASE_ERROR", message: result.error.message },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: result.data ?? [] });
}

