import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { captureLeadByKeys } from "@/lib/db/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ nickname: string; slugImovel: string }>;
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

function buildLeadMessage(input: {
  title: string;
  operation: string;
  price: number | null;
  message: string | null;
}) {
  return [
    "Origem: imóvel público Corretor.one",
    `Imóvel: ${input.title}`,
    `Operação: ${input.operation}`,
    input.price != null ? `Valor de referência: ${input.price}` : null,
    input.message ? `Mensagem: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request, { params }: RouteContext) {
  const { nickname, slugImovel } = await params;
  const normalizedNickname = nickname.trim().toLowerCase();
  const normalizedSlug = slugImovel.trim().toLowerCase();

  if (!/^[a-z0-9]{1,35}$/.test(normalizedNickname) || normalizedSlug.length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "URL inválida" } },
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

  const nome = parseString(body.nome);
  const email = parseNullableString(body.email)?.toLowerCase() ?? null;
  const telefone = parseNullableString(body.telefone);
  const telefoneE164 = normalizePhoneToBrE164(telefone);
  const mensagem = parseNullableString(body.mensagem);

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

  const imovelResult = await admin
    .from("imoveis")
    .select("id,owner_id,titulo,tipo_negociacao,preco_venda,preco_locacao")
    .eq("owner_id", profileResult.data.id)
    .eq("slug_publico", normalizedSlug)
    .eq("status", "PUBLICADO")
    .maybeSingle();

  if (imovelResult.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: imovelResult.error.message } },
      { status: 500 },
    );
  }

  if (!imovelResult.data) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Imóvel não encontrado" } },
      { status: 404 },
    );
  }

  const operation = imovelResult.data.tipo_negociacao === "ALUGUEL" ? "Aluguel" : "Venda";
  const price = imovelResult.data.tipo_negociacao === "ALUGUEL" ? imovelResult.data.preco_locacao : imovelResult.data.preco_venda;
  const leadResult = await captureLeadByKeys({
    owner_id: profileResult.data.id,
    nome,
    email,
    telefone,
    telefone_e164: telefoneE164,
    origem: "CORRETOR_ONE",
    mensagem: buildLeadMessage({
      title: imovelResult.data.titulo,
      operation,
      price,
      message: mensagem,
    }),
    imovel_id: imovelResult.data.id,
    utm: {
      source: "public_property",
      nickname: normalizedNickname,
      slug_imovel: normalizedSlug,
    },
  });

  if (!leadResult.ok) {
    return NextResponse.json(leadResult, {
      status: statusFromErrorCode(leadResult.error.code),
    });
  }

  const relationResult = await admin
    .from("lead_imoveis")
    .upsert(
      {
        owner_id: profileResult.data.id,
        lead_id: leadResult.data.lead_id,
        imovel_id: imovelResult.data.id,
      },
      { onConflict: "lead_id,imovel_id" },
    )
    .select("id")
    .single();

  if (relationResult.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: relationResult.error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { accepted: true, action: leadResult.data.action } }, { status: 200 });
}
