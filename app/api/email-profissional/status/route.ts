import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileMini = {
  id: string;
  nickname: string | null;
  plano_id: string | null;
};

type PlanoMini = {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
};

type EmailProfissionalRow = {
  id: string;
  owner_id: string;
  email: string;
  status: "SOLICITADO" | "ATIVO" | "SUSPENSO" | "DESATIVADO" | "ERRO";
  usar_senha_login: boolean;
  solicitado_em: string;
  ativado_em: string | null;
  desativado_em: string | null;
  erro_detalhe: string | null;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const authClient = createSupabaseServerClient(accessToken);
  const authResult = await authClient.auth.getUser();
  if (!authResult.data.user) return unauthorizedResponse();

  const userId = authResult.data.user.id;
  const admin = createSupabaseAdminClient();

  const profileResult = await admin
    .from("profiles")
    .select("id,nickname,plano_id")
    .eq("id", userId)
    .maybeSingle<ProfileMini>();

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Profile not found",
        },
      },
      { status: 404 },
    );
  }

  let plano: (PlanoMini & { is_paid: boolean }) | null = null;
  if (profileResult.data.plano_id) {
    const planoResult = await admin
      .from("planos")
      .select("id,nome,slug,preco_mensal")
      .eq("id", profileResult.data.plano_id)
      .maybeSingle<PlanoMini>();

    if (planoResult.data) {
      plano = {
        ...planoResult.data,
        is_paid: Number(planoResult.data.preco_mensal ?? 0) > 0,
      };
    }
  }

  const emailClient = createSupabaseAdminClient() as unknown as {
    from: (table: "emails_profissionais") => {
      select: (columns: string) => {
        eq: (column: "owner_id", value: string) => {
          maybeSingle: () => Promise<{
            data: EmailProfissionalRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const emailResult = await emailClient
    .from("emails_profissionais")
    .select("id,owner_id,email,status,usar_senha_login,solicitado_em,ativado_em,desativado_em,erro_detalhe")
    .eq("owner_id", userId)
    .maybeSingle();

  if (emailResult.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: emailResult.error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        profile: profileResult.data,
        plano,
        email_profissional: emailResult.data,
      },
    },
    { status: 200 },
  );
}
