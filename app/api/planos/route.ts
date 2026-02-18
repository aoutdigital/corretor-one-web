import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PlanoListItem = {
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

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
      { status: 401 },
    );
  }

  const authClient = createSupabaseServerClient(accessToken);
  const authResult = await authClient.auth.getUser();
  if (!authResult.data.user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid access token" } },
      { status: 401 },
    );
  }

  const admin = createSupabaseAdminClient() as unknown as {
    from: (table: "planos") => {
      select: (columns: string) => {
        eq: (column: "ativo", value: boolean) => {
          order: (
            column: "preco_mensal",
            options: { ascending: boolean },
          ) => Promise<{ data: PlanoListItem[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
  const result = (await admin
    .from("planos")
    .select(
      "id,nome,slug,preco_mensal,preco_anual,limite_imoveis,limite_emails_mes,limite_whatsapp_mes,ayka_franquia_mensal,recursos",
    )
    .eq("ativo", true)
    .order("preco_mensal", { ascending: true })) as {
    data: PlanoListItem[] | null;
    error: { message: string } | null;
  };

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: result.error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: result.data ?? [],
    },
    { status: 200 },
  );
}
