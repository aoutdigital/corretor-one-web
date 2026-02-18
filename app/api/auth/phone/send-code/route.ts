import { createHash, randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SmsProvider = "smtp2go";

type VerificationRow = {
  id: string;
  created_at: string;
};

const CODE_EXPIRES_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 5 * 60;

function normalizePhoneToBrE164(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;

  return `+${withCountry}`;
}

function resolveProvider(input?: string): SmsProvider {
  const requested = (input ?? "").trim().toLowerCase();
  if (requested === "smtp2go") return "smtp2go";

  const fallback = (process.env.SMS_PROVIDER_DEFAULT ?? "smtp2go").trim().toLowerCase();
  if (fallback === "smtp2go") return "smtp2go";

  throw new Error(`Unsupported SMS provider: ${input ?? fallback}`);
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return `${randomInt(100000, 1000000)}`;
}

async function sendViaSmtp2Go(toE164: string, message: string) {
  const apiKey = process.env.SMTP2GO_API_KEY;
  if (!apiKey) {
    throw new Error("Missing SMTP2GO_API_KEY");
  }

  const response = await fetch("https://api.smtp2go.com/v3/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Smtp2go-Api-Key": apiKey,
    },
    body: JSON.stringify({
      destination: [toE164],
      content: message,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: { succeeded?: number; failed?: number } }
    | null;

  if (!response.ok || payload?.data?.failed) {
    throw new Error("Failed to send SMS via SMTP2GO");
  }
}

async function dispatchSms(provider: SmsProvider, toE164: string, message: string) {
  switch (provider) {
    case "smtp2go":
      await sendViaSmtp2Go(toE164, message);
      break;
    default:
      throw new Error(`Provider not implemented: ${provider}`);
  }
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
  const providerInput = String((body as Record<string, unknown>)?.provider ?? "");

  const phoneE164 = normalizePhoneToBrE164(rawPhone);
  if (!phoneE164) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Telefone inválido" } },
      { status: 400 },
    );
  }

  let provider: SmsProvider;
  try {
    provider = resolveProvider(providerInput);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Unsupported provider",
        },
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  const latest = (await admin
    .from("verificacoes_contato" as never)
    .select("id,created_at")
    .eq("user_tipo", "CORRETOR")
    .eq("user_id", userId)
    .eq("canal", "WHATSAPP")
    .eq("destino", phoneE164)
    .in("status", ["PENDENTE", "BLOQUEADO"] as never)
    .order("created_at", { ascending: false })
    .limit(1)) as { data: VerificationRow[] | null; error: { message: string } | null };

  if (latest.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: latest.error.message } },
      { status: 500 },
    );
  }

  const lastRow = (latest.data?.[0] ?? null) as VerificationRow | null;
  if (lastRow) {
    const secondsSinceLast = Math.floor((Date.now() - new Date(lastRow.created_at).getTime()) / 1000);
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = RESEND_COOLDOWN_SECONDS - secondsSinceLast;
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMIT",
            message: `Aguarde ${retryAfterSeconds}s para reenviar o código`,
            retry_after_seconds: retryAfterSeconds,
          },
        },
        { status: 429 },
      );
    }
  }

  const expirePending = (await admin
    .from("verificacoes_contato" as never)
    .update({ status: "EXPIRADO" } as never)
    .eq("user_tipo", "CORRETOR")
    .eq("user_id", userId)
    .eq("canal", "WHATSAPP")
    .eq("destino", phoneE164)
    .eq("status", "PENDENTE")) as { error: { message: string } | null };

  if (expirePending.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: expirePending.error.message } },
      { status: 500 },
    );
  }

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000).toISOString();

  const inserted = (await admin.from("verificacoes_contato" as never).insert({
    user_tipo: "CORRETOR",
    user_id: userId,
    canal: "WHATSAPP",
    destino: phoneE164,
    codigo_hash: codeHash,
    expira_em: expiresAt,
    tentativas: 0,
    status: "PENDENTE",
    enviado_em: new Date().toISOString(),
  } as never).select("id").single()) as { data: { id: string } | null; error: { message: string } | null };

  if (inserted.error || !inserted.data) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "DATABASE_ERROR", message: inserted.error?.message ?? "Falha ao salvar OTP" },
      },
      { status: 500 },
    );
  }

  try {
    await dispatchSms(provider, phoneE164, `Corretor.one: Confirme seu numero COD ${code}`);
  } catch (error) {
    await admin
      .from("verificacoes_contato" as never)
      .update({ status: "EXPIRADO" } as never)
      .eq("id", inserted.data.id);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PROVIDER_ERROR",
          message: error instanceof Error ? error.message : "Falha ao enviar SMS",
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        phone_e164: phoneE164,
        expires_at: expiresAt,
        retry_after_seconds: RESEND_COOLDOWN_SECONDS,
      },
    },
    { status: 200 },
  );
}
