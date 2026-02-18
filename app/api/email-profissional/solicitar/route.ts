import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { evaluatePasswordPolicy } from "@/lib/security/password-policy";
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

type RequestBody = {
  password?: string;
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
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    body = {};
  }

  const password = body.password ?? "";
  const passwordPolicy = evaluatePasswordPolicy(password);
  if (!passwordPolicy.isValid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Senha inválida. Use no mínimo 8 caracteres, 1 letra maiúscula e 1 número.",
        },
      },
      { status: 400 },
    );
  }

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
      { ok: false, error: { code: "NOT_FOUND", message: "Profile not found" } },
      { status: 404 },
    );
  }

  const profile = profileResult.data;
  if (!profile.nickname) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Defina um nickname antes de solicitar o e-mail profissional.",
        },
      },
      { status: 400 },
    );
  }

  if (!profile.plano_id) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PLAN_REQUIRED",
          message: "Faça upgrade para um plano pago para solicitar seu e-mail profissional.",
        },
      },
      { status: 402 },
    );
  }

  const planoResult = await admin
    .from("planos")
    .select("id,nome,slug,preco_mensal")
    .eq("id", profile.plano_id)
    .maybeSingle<PlanoMini>();

  if (!planoResult.data || Number(planoResult.data.preco_mensal ?? 0) <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PLAN_REQUIRED",
          message: "Este recurso está disponível apenas para planos pagos.",
        },
      },
      { status: 402 },
    );
  }

  const emailClient = createSupabaseAdminClient() as unknown as {
    from: (table: "emails_profissionais") => {
      upsert: (
        values: {
          owner_id: string;
          email: string;
          status: "SOLICITADO";
          usar_senha_login: boolean;
          solicitado_em: string;
          ativado_em: null;
          desativado_em: null;
        },
        options: { onConflict: "owner_id" },
      ) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: EmailProfissionalRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const emailProfissional = `${profile.nickname}@corretor.one`;
  const upsertResult = await emailClient
    .from("emails_profissionais")
    .upsert(
      {
        owner_id: userId,
        email: emailProfissional,
        status: "SOLICITADO",
        usar_senha_login: false,
        solicitado_em: new Date().toISOString(),
        ativado_em: null,
        desativado_em: null,
      },
      { onConflict: "owner_id" },
    )
    .select("id,owner_id,email,status,usar_senha_login,solicitado_em,ativado_em,desativado_em")
    .single();

  if (upsertResult.error || !upsertResult.data) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: upsertResult.error?.message ?? "Failed to request e-mail" } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        ...upsertResult.data,
        provider_status: "pending_manual_integration",
      },
    },
    { status: 200 },
  );
}
