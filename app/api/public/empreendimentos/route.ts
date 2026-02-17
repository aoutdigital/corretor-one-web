import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("empreendimentos")
    .select("id, slug_publico, nome, descricao, cidade, estado, status, owner_id, publicado_em")
    .eq("status", "PUBLICADO")
    .order("publicado_em", { ascending: false });

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

