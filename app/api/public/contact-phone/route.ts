import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ContactPhonePayload = {
  nickname?: unknown;
  imovel_id?: unknown;
  website?: unknown;
};

function parseString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocalPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const localDigits = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (localDigits.length < 10 || localDigits.length > 11) return null;
  return localDigits;
}

function formatBrazilianPhone(localDigits: string) {
  const ddd = localDigits.slice(0, 2);
  const prefix = localDigits.length === 11 ? localDigits.slice(2, 7) : localDigits.slice(2, 6);
  const suffix = localDigits.length === 11 ? localDigits.slice(7) : localDigits.slice(6);
  return `(${ddd}) ${prefix}-${suffix}`;
}

export async function POST(request: Request) {
  let body: ContactPhonePayload;

  try {
    body = (await request.json()) as ContactPhonePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON", message: "Requisição inválida." } },
      { status: 400 },
    );
  }

  if (parseString(body.website)) {
    return NextResponse.json({ ok: true, data: { phone: null, tel_href: null } });
  }

  const nickname = parseString(body.nickname).toLowerCase();
  const imovelId = parseString(body.imovel_id);

  if (!/^[a-z0-9]{1,35}$/.test(nickname)) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Perfil inválido." } },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const profileResult = await supabase
    .from("profiles")
    .select("id,nickname,telefone,status")
    .eq("nickname", nickname)
    .eq("status", "ATIVO")
    .maybeSingle();

  if (profileResult.error) {
    return NextResponse.json(
      { ok: false, error: { code: "PROFILE_ERROR", message: "Não foi possível localizar o corretor." } },
      { status: 500 },
    );
  }

  const profile = profileResult.data;
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Corretor não encontrado." } },
      { status: 404 },
    );
  }

  if (imovelId) {
    const propertyResult = await supabase
      .from("imoveis")
      .select("id,owner_id,status")
      .eq("id", imovelId)
      .eq("owner_id", profile.id)
      .eq("status", "PUBLICADO")
      .maybeSingle();

    if (propertyResult.error) {
      return NextResponse.json(
        { ok: false, error: { code: "PROPERTY_ERROR", message: "Não foi possível validar o imóvel." } },
        { status: 500 },
      );
    }

    if (!propertyResult.data) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Imóvel não encontrado." } },
        { status: 404 },
      );
    }
  }

  const localDigits = normalizeLocalPhone(profile.telefone);
  if (!localDigits) {
    return NextResponse.json(
      { ok: false, error: { code: "PHONE_UNAVAILABLE", message: "Telefone indisponível no momento." } },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        phone: formatBrazilianPhone(localDigits),
        tel_href: `tel:0${localDigits}`,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
