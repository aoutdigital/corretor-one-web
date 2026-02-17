import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("imoveis")
    .select("id, slug_publico, titulo, finalidade, tipo, status, cidade, bairro, estado, preco_venda, preco_locacao, owner_id")
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

