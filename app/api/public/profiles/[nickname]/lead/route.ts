import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { captureLeadByKeys } from "@/lib/db/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type RouteContext = {
  params: Promise<{ nickname: string }>;
};

type ProfileLeadIntent = "COMPRAR" | "ALUGAR" | "VENDER" | "FALAR";
type LeadBriefingInsert = Database["public"]["Tables"]["lead_briefings"]["Insert"];

const INTENT_LABELS: Record<ProfileLeadIntent, string> = {
  COMPRAR: "Quero comprar",
  ALUGAR: "Quero alugar",
  VENDER: "Quero vender ou captar meu imóvel",
  FALAR: "Quero falar com o corretor",
};

function asObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseNullableString(value: unknown) {
  const parsed = parseString(value);
  return parsed.length > 0 ? parsed : null;
}

function normalizePhoneToBrE164(value: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  const plusDigits = trimmed.startsWith("+") ? `+${trimmed.replace(/\D/g, "")}` : null;
  if (plusDigits && /^\+\d{8,15}$/.test(plusDigits)) return plusDigits;

  const digits = trimmed.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;

  return null;
}

function isEmail(value: string | null) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeIntent(value: unknown): ProfileLeadIntent | null {
  if (value === "COMPRAR" || value === "ALUGAR" || value === "VENDER" || value === "FALAR") return value;
  return null;
}

function getTiponegociacao(intent: ProfileLeadIntent): LeadBriefingInsert["tiponegociacao"] {
  if (intent === "ALUGAR") return ["ALUGUEL"];
  if (intent === "COMPRAR" || intent === "VENDER") return ["VENDA"];
  return null;
}

function getObjetivoLead(intent: ProfileLeadIntent): LeadBriefingInsert["objetivolead"] {
  if (intent === "COMPRAR" || intent === "ALUGAR" || intent === "VENDER") return [intent];
  return null;
}

function buildLeadMessage(intent: ProfileLeadIntent, message: string | null, preferredChannel: string | null) {
  return [
    `Origem: perfil público Corretor.one`,
    `Objetivo: ${INTENT_LABELS[intent]}`,
    preferredChannel ? `Canal preferido: ${preferredChannel}` : null,
    message ? `Mensagem: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request, { params }: RouteContext) {
  const { nickname } = await params;
  const normalizedNickname = nickname.trim().toLowerCase();

  if (!/^[a-z0-9]{1,35}$/.test(normalizedNickname)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Nickname inválido" } },
      { status: 400 },
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

  if (!asObject(body)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Body must be a JSON object" } },
      { status: 400 },
    );
  }

  if (parseString(body.website).length > 0) {
    return NextResponse.json({ ok: true, data: { accepted: true } }, { status: 200 });
  }

  const intent = normalizeIntent(body.intent);
  const nome = parseString(body.nome);
  const email = parseNullableString(body.email)?.toLowerCase() ?? null;
  const telefone = parseNullableString(body.telefone);
  const telefoneE164 = normalizePhoneToBrE164(telefone);
  const mensagem = parseNullableString(body.mensagem);
  const preferredChannel = parseNullableString(body.preferred_channel);

  if (!intent) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Selecione um objetivo" } },
      { status: 400 },
    );
  }

  if (nome.length < 2) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Informe seu nome" } },
      { status: 400 },
    );
  }

  if (email && !isEmail(email)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Informe um e-mail válido" } },
      { status: 400 },
    );
  }

  if (telefone && !telefoneE164) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Informe um telefone válido" } },
      { status: 400 },
    );
  }

  if (!email && !telefoneE164) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Informe telefone ou e-mail" } },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("id")
    .eq("nickname", normalizedNickname)
    .eq("status", "ATIVO")
    .maybeSingle();

  if (profileResult.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: profileResult.error.message } },
      { status: 500 },
    );
  }

  if (!profileResult.data) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Perfil não encontrado" } },
      { status: 404 },
    );
  }

  const leadResult = await captureLeadByKeys({
    owner_id: profileResult.data.id,
    nome,
    email,
    telefone,
    telefone_e164: telefoneE164,
    origem: "CORRETOR_ONE",
    mensagem: buildLeadMessage(intent, mensagem, preferredChannel),
    imovel_id: null,
    utm: {
      source: "public_profile",
      nickname: normalizedNickname,
      intent,
      preferred_channel: preferredChannel,
    },
  });

  if (!leadResult.ok) {
    return NextResponse.json(leadResult, {
      status: statusFromErrorCode(leadResult.error.code),
    });
  }

  const objetivoLead = getObjetivoLead(intent);
  const tiponegociacao = getTiponegociacao(intent);

  if (objetivoLead) {
    const briefingResult = await admin
      .from("lead_briefings")
      .upsert(
        {
          owner_id: profileResult.data.id,
          lead_id: leadResult.data.lead_id,
          objetivolead: objetivoLead,
          tiponegociacao,
          texto_livre: mensagem,
          canais: preferredChannel === "Email" ? ["EMAIL"] : preferredChannel === "WhatsApp" ? ["WHATSAPP"] : null,
        },
        { onConflict: "lead_id" },
      )
      .select("id")
      .single();

    if (briefingResult.error) {
      return NextResponse.json(
        { ok: false, error: { code: "DATABASE_ERROR", message: briefingResult.error.message } },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, data: { accepted: true, action: leadResult.data.action } }, { status: 200 });
}
