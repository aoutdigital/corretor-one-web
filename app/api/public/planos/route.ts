import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PlanoPublico = {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
  preco_anual: number | null;
  limite_imoveis: number | null;
  limite_emails_mes: number | null;
  limite_whatsapp_mes: number | null;
  ayka_franquia_mensal: number;
  recursos: Record<string, unknown> | null;
};

export async function GET() {
  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: "planos") => {
      select: (columns: string) => {
        eq: (column: "ativo", value: boolean) => {
          order: (
            column: "preco_mensal",
            options: { ascending: boolean },
          ) => Promise<{ data: PlanoPublico[] | null; error: { message: string } | null }>;
        };
      };
    };
  };

  const result = await admin
    .from("planos")
    .select(
      "id,nome,slug,preco_mensal,preco_anual,limite_imoveis,limite_emails_mes,limite_whatsapp_mes,ayka_franquia_mensal,recursos",
    )
    .eq("ativo", true)
    .order("preco_mensal", { ascending: true });

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: result.error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: result.data ?? [] }, { status: 200 });
}
