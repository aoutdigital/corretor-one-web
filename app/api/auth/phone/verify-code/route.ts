import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type VerificationRow = {
  id: string;
  codigo_hash: string;
  expira_em: string;
  tentativas: number;
};

const MAX_VERIFY_ATTEMPTS = 5;

function normalizePhoneToBrE164(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;

  return `+${withCountry}`;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

async function getAuthenticatedUserId(accessToken: string): Promise<string | null> {
  const client = createSupabaseServerClient(accessToken);
  const result = await client.auth.getUser();
  return result.data.user?.id ?? null;
}

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
      { status: 401 },
    );
  }

  const userId = await getAuthenticatedUserId(accessToken);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid access token" } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const rawPhone = String((body as Record<string, unknown>)?.phone ?? "");
  const code = String((body as Record<string, unknown>)?.code ?? "").trim();

  const phoneE164 = normalizePhoneToBrE164(rawPhone);
  if (!phoneE164) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Telefone inválido" } },
      { status: 400 },
    );
  }

  if (!/^[0-9]{6}$/.test(code)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Código inválido" } },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const lookup = await admin
    .from("verificacoes_contato" as never)
    .select("id,codigo_hash,expira_em,tentativas")
    .eq("user_tipo", "CORRETOR")
    .eq("user_id", userId)
    .eq("canal", "WHATSAPP")
    .eq("destino", phoneE164)
    .eq("status", "PENDENTE")
    .order("created_at", { ascending: false })
    .limit(1);

  if (lookup.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: lookup.error.message } },
      { status: 500 },
    );
  }

  const row = (lookup.data?.[0] ?? null) as VerificationRow | null;
  if (!row) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Nenhum código pendente para este número" } },
      { status: 404 },
    );
  }

  if (new Date(row.expira_em).getTime() < Date.now()) {
    await admin
      .from("verificacoes_contato" as never)
      .update({ status: "EXPIRADO" } as never)
      .eq("id", row.id);
    return NextResponse.json(
      { ok: false, error: { code: "EXPIRED", message: "Código expirado. Solicite um novo código" } },
      { status: 400 },
    );
  }

  if (row.tentativas >= MAX_VERIFY_ATTEMPTS) {
    await admin
      .from("verificacoes_contato" as never)
      .update({ status: "BLOQUEADO" } as never)
      .eq("id", row.id);
    return NextResponse.json(
      { ok: false, error: { code: "BLOCKED", message: "Código bloqueado por excesso de tentativas" } },
      { status: 400 },
    );
  }

  const codeHash = hashCode(code);
  if (codeHash !== row.codigo_hash) {
    const nextAttempts = row.tentativas + 1;
    await admin
      .from("verificacoes_contato" as never)
      .update({
        tentativas: nextAttempts,
        status: nextAttempts >= MAX_VERIFY_ATTEMPTS ? "BLOQUEADO" : "PENDENTE",
      } as never)
      .eq("id", row.id);

    return NextResponse.json(
      { ok: false, error: { code: "INVALID_CODE", message: "Código incorreto" } },
      { status: 400 },
    );
  }

  const updateVerification = await admin
    .from("verificacoes_contato" as never)
    .update({
      status: "VERIFICADO",
      verificado_em: nowIso,
    } as never)
    .eq("id", row.id);

  if (updateVerification.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: updateVerification.error.message } },
      { status: 500 },
    );
  }

  const updateProfile = await admin
    .from("profiles")
    .update({
      telefone: phoneE164,
      whatsapp: phoneE164,
      whatsapp_verificado_em: nowIso,
    })
    .eq("id", userId);

  if (updateProfile.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: updateProfile.error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        phone_e164: phoneE164,
        verified_at: nowIso,
      },
    },
    { status: 200 },
  );
}
