// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type UserTipo = "PORTAL" | "CORRETOR";
type SmsProvider = "smtp2go";

type SendSmsRequest = {
  phone: string;
  user_tipo: UserTipo;
  user_id: string;
  provider?: SmsProvider;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhoneToBrE164(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;

  return `+${withCountry}`;
}

function generateCode(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function resolveProvider(provider?: string): SmsProvider {
  const fromRequest = provider?.trim().toLowerCase();
  if (fromRequest === "smtp2go") return "smtp2go";

  const defaultProvider = (Deno.env.get("SMS_PROVIDER_DEFAULT") ?? "smtp2go").trim().toLowerCase();
  if (defaultProvider === "smtp2go") return "smtp2go";

  throw new Error(`Unsupported SMS provider: ${provider ?? defaultProvider}`);
}

async function sendViaSmtp2Go(toE164: string, message: string) {
  const apiKey = getEnv("SMTP2GO_API_KEY");
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

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`smtp2go send failed: ${JSON.stringify(data)}`);
  }
}

async function dispatchSms(provider: SmsProvider, toE164: string, message: string) {
  switch (provider) {
    case "smtp2go":
      return sendViaSmtp2Go(toE164, message);
    default:
      throw new Error(`Provider not implemented: ${provider}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: { code: "METHOD_NOT_ALLOWED" } });
  }

  try {
    const body = (await req.json()) as Partial<SendSmsRequest>;
    const provider = resolveProvider(body.provider);
    const phone = (body.phone ?? "").trim();
    const userTipo = body.user_tipo;
    const userId = (body.user_id ?? "").trim();

    if (!phone || !userTipo || !userId) {
      return json(400, {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "phone, user_tipo and user_id are required",
        },
      });
    }

    if (userTipo !== "PORTAL" && userTipo !== "CORRETOR") {
      return json(400, {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "user_tipo must be PORTAL or CORRETOR" },
      });
    }

    const phoneE164 = normalizePhoneToBrE164(phone);
    if (!phoneE164) {
      return json(400, {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid BR phone format" },
      });
    }

    const code = generateCode();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

    const insertResult = await supabase.from("verificacoes_contato").insert({
      user_tipo: userTipo,
      user_id: userId,
      canal: "WHATSAPP",
      destino: phoneE164,
      codigo_hash: codeHash,
      expira_em: expiresAt,
      tentativas: 0,
      status: "PENDENTE",
      enviado_em: new Date().toISOString(),
    });

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: { code: "DATABASE_ERROR", message: insertResult.error.message },
      });
    }

    const message = `Corretor.one: Confirme seu numero COD ${code}`;
    await dispatchSms(provider, phoneE164, message);

    return json(200, {
      ok: true,
      data: {
        provider,
        phone_e164: phoneE164,
        expires_at: expiresAt,
      },
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});
