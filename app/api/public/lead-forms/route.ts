import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { captureLeadByKeys } from "@/lib/db/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PublicLeadFormPayload = {
  form_key?: unknown;
  nickname?: unknown;
  nome?: unknown;
  sobrenome?: unknown;
  telefone?: unknown;
  email?: unknown;
  mensagem?: unknown;
  visit_date?: unknown;
  visit_time?: unknown;
  website?: unknown;
  page_url?: unknown;
  referrer?: unknown;
  utm?: unknown;
  context?: unknown;
};

type PropertyContext = {
  id: string;
  title: string;
  code: string | null;
  operationLabel: string;
  priceLabel: string | null;
  allowsImmediateVisit: boolean;
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

function sanitizePublicPageUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0]?.split("#")[0] ?? null;
  }
}

function normalizeNickname(value: unknown) {
  const nickname = parseString(value).toLowerCase();
  return /^[a-z0-9]{1,35}$/.test(nickname) ? nickname : null;
}

function normalizeEmail(value: unknown) {
  const email = parseNullableString(value)?.toLowerCase() ?? null;
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "__invalid__";
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

function buildWhatsappHref(phone: string | null, message: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function formatCurrency(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPropertyOperationLabel(value: string | null) {
  if (value === "ALUGUEL") return "Locação";
  if (value === "VENDA_E_ALUGUEL") return "Venda e locação";
  return "Venda";
}

function getPropertyPriceLabel(input: {
  tipo_negociacao: string | null;
  preco_venda: number | null;
  preco_locacao: number | null;
}) {
  const salePrice = formatCurrency(input.preco_venda);
  const rentPrice = formatCurrency(input.preco_locacao);

  if (input.tipo_negociacao === "ALUGUEL") return rentPrice ? `${rentPrice}/mês` : null;
  if (input.tipo_negociacao === "VENDA_E_ALUGUEL") {
    return [
      salePrice ? `Venda: ${salePrice}` : null,
      rentPrice ? `Locação: ${rentPrice}/mês` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return salePrice;
}

function buildLeadMessage(input: {
  brokerName: string;
  visitorName: string;
  message: string | null;
  property: PropertyContext | null;
  pageUrl: string | null;
}) {
  return [
    "Origem: botão de WhatsApp no perfil público Corretor.one",
    `Visitante: ${input.visitorName}`,
    input.property ? `Imóvel: ${input.property.title}` : "Contexto: perfil público do corretor",
    input.property?.code ? `Código: ${input.property.code}` : null,
    input.property ? `Finalidade: ${input.property.operationLabel}` : null,
    input.property?.priceLabel ? `Valor: ${input.property.priceLabel}` : null,
    input.pageUrl ? `Página: ${input.pageUrl}` : null,
    input.message ? `Mensagem: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWhatsappMessage(input: {
  brokerName: string;
  visitorName: string;
  message: string | null;
  property: PropertyContext | null;
  pageUrl: string | null;
}) {
  if (!input.property) {
    const base = `Olá, ${input.brokerName}. Sou ${input.visitorName} e quero conversar pelo seu perfil no Corretor.one.`;
    return input.message ? `${base}\n\n${input.message}` : base;
  }

  return [
    `Olá, ${input.brokerName}. Sou ${input.visitorName} e quero falar sobre este imóvel.`,
    "",
    `Imóvel: ${input.property.title}`,
    input.property.code ? `Código: ${input.property.code}` : null,
    `Finalidade: ${input.property.operationLabel}`,
    input.property.priceLabel ? `Valor: ${input.property.priceLabel}` : null,
    input.pageUrl ? `Link: ${input.pageUrl}` : null,
    input.message ? "" : null,
    input.message ? `Mensagem: ${input.message}` : null,
  ]
    .filter((item) => item !== null)
    .join("\n");
}

function getUtm(value: unknown) {
  if (!asObject(value)) return null;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => typeof item === "string" && item.trim().length > 0)
      .map(([key, item]) => [key, (item as string).trim()]),
  );
}

function parseVisitSchedule(input: {
  date: unknown;
  time: unknown;
  allowsImmediateVisit: boolean;
}) {
  const visitDate = parseString(input.date);
  const visitTime = parseString(input.time);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return { ok: false as const, message: "Informe uma data válida para a visita." };
  }

  if (!/^\d{2}:\d{2}$/.test(visitTime)) {
    return { ok: false as const, message: "Informe um horário válido para a visita." };
  }

  const [hourText, minuteText] = visitTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 8 ||
    hour > 20 ||
    minute < 0 ||
    minute > 59 ||
    (hour === 20 && minute > 0)
  ) {
    return { ok: false as const, message: "Escolha um horário entre 08:00 e 20:00." };
  }

  const scheduledAt = new Date(`${visitDate}T${visitTime}:00-03:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false as const, message: "Informe uma data e horário válidos." };
  }

  const now = new Date();
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const maxDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (scheduledAt <= now) {
    return { ok: false as const, message: "Escolha uma data e horário futuros." };
  }

  if (scheduledAt > maxDate) {
    return { ok: false as const, message: "Agende uma visita para os próximos 14 dias." };
  }

  if (!input.allowsImmediateVisit && visitDate === todayKey) {
    return { ok: false as const, message: "Este imóvel não permite visita para hoje. Escolha uma data a partir de amanhã." };
  }

  if (visitDate === todayKey) {
    const minimumSameDayDate = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    if (scheduledAt < minimumSameDayDate) {
      return { ok: false as const, message: "Para visitas hoje, escolha um horário com pelo menos 4 horas de antecedência." };
    }
  }

  return {
    ok: true as const,
    date: visitDate,
    time: visitTime,
    scheduledAt: scheduledAt.toISOString(),
    label: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(scheduledAt),
  };
}

function buildVisitLeadMessage(input: {
  visitorName: string;
  message: string | null;
  property: PropertyContext;
  pageUrl: string | null;
  visitLabel: string;
}) {
  return [
    "Origem: agendamento de visita no imóvel público Corretor.one",
    `Visitante: ${input.visitorName}`,
    `Imóvel: ${input.property.title}`,
    input.property.code ? `Código: ${input.property.code}` : null,
    `Finalidade: ${input.property.operationLabel}`,
    input.property.priceLabel ? `Valor: ${input.property.priceLabel}` : null,
    `Visita solicitada: ${input.visitLabel}`,
    input.pageUrl ? `Página: ${input.pageUrl}` : null,
    input.message ? `Mensagem: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: { code: "VALIDATION_ERROR", message } },
    { status },
  );
}

export async function POST(request: Request) {
  let body: PublicLeadFormPayload;

  try {
    const parsed: unknown = await request.json();
    if (!asObject(parsed)) return errorResponse("Dados inválidos.");
    body = parsed;
  } catch {
    return errorResponse("Dados inválidos.");
  }

  const formKey = parseString(body.form_key);

  if (parseString(body.website).length > 0) {
    return NextResponse.json({ ok: true, data: { accepted: true, whatsapp_url: null } }, { status: 200 });
  }

  if (formKey !== "whatsapp_contact" && formKey !== "visit_schedule") {
    return errorResponse("Formulário inválido.");
  }

  const nickname = normalizeNickname(body.nickname);
  if (!nickname) return errorResponse("Perfil inválido.");

  const firstName = parseString(body.nome);
  const lastName = parseNullableString(body.sobrenome);
  const visitorName = [firstName, lastName].filter(Boolean).join(" ");
  const phone = parseNullableString(body.telefone);
  const phoneE164 = normalizePhoneToBrE164(phone);
  const email = normalizeEmail(body.email);
  const message = parseNullableString(body.mensagem);
  const pageUrl = sanitizePublicPageUrl(parseNullableString(body.page_url));
  const referrer = parseNullableString(body.referrer);
  const context = asObject(body.context) ? body.context : {};
  const propertyId = parseNullableString(context.imovel_id);
  const propertyTitle = parseNullableString(context.imovel_titulo);
  let property: PropertyContext | null = null;

  if (visitorName.length < 2) return errorResponse("Informe seu nome.");
  if (!phoneE164) return errorResponse("Informe um WhatsApp válido.");
  if (!email || email === "__invalid__") return errorResponse("Informe um e-mail válido.");
  if (formKey === "visit_schedule" && !propertyId) return errorResponse("Informe o imóvel da visita.");

  const admin = createSupabaseAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("id,nickname,primeiro_nome,sobrenome,telefone,whatsapp,status")
    .eq("nickname", nickname)
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
      { ok: false, error: { code: "NOT_FOUND", message: "Perfil não encontrado." } },
      { status: 404 },
    );
  }

  if (propertyId) {
    const propertyResult = await admin
      .from("imoveis")
      .select("id,codigo,titulo,tipo_negociacao,preco_venda,preco_locacao,permite_visita_imediata")
      .eq("id", propertyId)
      .eq("owner_id", profileResult.data.id)
      .eq("status", "PUBLICADO")
      .maybeSingle();

    if (propertyResult.error) {
      return NextResponse.json(
        { ok: false, error: { code: "DATABASE_ERROR", message: propertyResult.error.message } },
        { status: 500 },
      );
    }

    if (!propertyResult.data) return errorResponse("Imóvel inválido.", 404);

    property = {
      id: propertyResult.data.id,
      title: propertyResult.data.titulo || propertyTitle || "Imóvel",
      code: propertyResult.data.codigo,
      operationLabel: getPropertyOperationLabel(propertyResult.data.tipo_negociacao),
      priceLabel: getPropertyPriceLabel({
        tipo_negociacao: propertyResult.data.tipo_negociacao,
        preco_venda: propertyResult.data.preco_venda,
        preco_locacao: propertyResult.data.preco_locacao,
      }),
      allowsImmediateVisit: propertyResult.data.permite_visita_imediata !== false,
    };
  }

  const brokerName =
    [profileResult.data.primeiro_nome, profileResult.data.sobrenome].filter(Boolean).join(" ") ||
    profileResult.data.nickname ||
    "corretor";

  const visitSchedule =
    formKey === "visit_schedule" && property
      ? parseVisitSchedule({
          date: body.visit_date,
          time: body.visit_time,
          allowsImmediateVisit: property.allowsImmediateVisit,
        })
      : null;

  if (visitSchedule && !visitSchedule.ok) return errorResponse(visitSchedule.message);

  const leadMessage =
    formKey === "visit_schedule" && property && visitSchedule?.ok
      ? buildVisitLeadMessage({
          visitorName,
          message,
          property,
          pageUrl,
          visitLabel: visitSchedule.label,
        })
      : buildLeadMessage({
          brokerName,
          visitorName,
          message,
          property,
          pageUrl,
        });
  const utm = getUtm(body.utm);
  const leadResult = await captureLeadByKeys({
    owner_id: profileResult.data.id,
    nome: visitorName,
    email,
    telefone: phone,
    telefone_e164: phoneE164,
    origem: "CORRETOR_ONE",
    mensagem: leadMessage,
    imovel_id: propertyId,
    utm: {
      ...(utm ?? {}),
      source: formKey === "visit_schedule" ? "public_visit_schedule" : "public_whatsapp_contact",
      nickname,
    },
    form_key: formKey,
    page_url: pageUrl,
    referrer,
    form_payload: {
      form_key: formKey,
      nome: firstName,
      sobrenome: lastName,
      mensagem: message,
      visit:
        visitSchedule?.ok
          ? {
              date: visitSchedule.date,
              time: visitSchedule.time,
              scheduled_at: visitSchedule.scheduledAt,
              requested_label: visitSchedule.label,
            }
          : null,
      context: {
        ...context,
        property,
      },
    },
  });

  if (!leadResult.ok) {
    return NextResponse.json(leadResult, {
      status: statusFromErrorCode(leadResult.error.code),
    });
  }

  if (formKey === "visit_schedule") {
    return NextResponse.json(
      {
        ok: true,
        data: {
          accepted: true,
          action: leadResult.data.action,
          lead_id: leadResult.data.lead_id,
          scheduled_at: visitSchedule?.ok ? visitSchedule.scheduledAt : null,
        },
      },
      { status: 200 },
    );
  }

  const whatsappMessage = buildWhatsappMessage({
    brokerName,
    visitorName,
    message,
    property,
    pageUrl,
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        accepted: true,
        action: leadResult.data.action,
        lead_id: leadResult.data.lead_id,
        whatsapp_url: buildWhatsappHref(profileResult.data.whatsapp || profileResult.data.telefone, whatsappMessage),
      },
    },
    { status: 200 },
  );
}
