import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import { captureLeadByKeys } from "@/lib/db/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

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
  briefing?: unknown;
};

type LeadBriefingRow = Database["public"]["Tables"]["lead_briefings"]["Row"];
type LeadBriefingInsert = Database["public"]["Tables"]["lead_briefings"]["Insert"];
type LeadBriefingUpdate = Database["public"]["Tables"]["lead_briefings"]["Update"];
type GeolocacaoInsert = Database["public"]["Tables"]["geolocacoes"]["Insert"];
type TimelineInsert = Database["public"]["Tables"]["timeline_eventos"]["Insert"];
type Json = Database["public"]["Tables"]["timeline_eventos"]["Insert"]["detalhes"];
type Uf = Database["public"]["Enums"]["uf"];

type CuradoriaBriefing = {
  objetivolead: LeadBriefingInsert["objetivolead"];
  tiponegociacao: LeadBriefingInsert["tiponegociacao"];
  tipouso: LeadBriefingInsert["tipouso"];
  tipoimovel: LeadBriefingInsert["tipoimovel"];
  categoriaimovel: string[] | null;
  subcategoriaimovel: string[] | null;
  intencao_compra: LeadBriefingInsert["intencao_compra"];
  valor_min: number | null;
  valor_max: number | null;
  area_util_min: number | null;
  area_util_max: number | null;
  quartos_min: number | null;
  suites_min: number | null;
  vagas_min: number | null;
  geolocacao_id?: string | null;
  localizacao_texto: string | null;
  lat: number | null;
  lng: number | null;
  raio_km: number | null;
  texto_livre: string | null;
};

type PublicPlacePayload = {
  place_id?: unknown;
  formatted_address?: unknown;
  name?: unknown;
  logradouro?: unknown;
  numero?: unknown;
  bairro?: unknown;
  cidade?: unknown;
  estado?: unknown;
  cep?: unknown;
  lat?: unknown;
  lng?: unknown;
  address_components?: unknown;
};

type PropertyContext = {
  id: string;
  title: string;
  code: string | null;
  operationLabel: string;
  priceLabel: string | null;
  allowsImmediateVisit: boolean;
};

const SAO_PAULO_UTC_OFFSET_HOURS = -3;
const CONFIRMATION_BUSINESS_START_MINUTES = 8 * 60;
const CONFIRMATION_BUSINESS_END_MINUTES = 18 * 60;
const CONFIRMATION_DUE_BUSINESS_MINUTES = 60;
const LEAD_BRIEFING_SELECT = [
  "id",
  "objetivolead",
  "tipouso",
  "tipoimovel",
  "categoriaimovel",
  "subcategoriaimovel",
  "tiponegociacao",
  "intencao_compra",
  "valor_min",
  "valor_max",
  "area_util_min",
  "area_util_max",
  "quartos_min",
  "suites_min",
  "vagas_min",
  "geolocacao_id",
  "localizacao_texto",
  "lat",
  "lng",
  "raio_km",
  "texto_livre",
].join(",");

const OBJECTIVE_VALUES = new Set(["COMPRAR", "ALUGAR", "VENDER"]);
const TIPO_USO_VALUES = new Set(["RESIDENCIAL", "COMERCIAL"]);
const INTENCAO_VALUES = new Set(["MORADIA", "INVESTIMENTO"]);
const TIPO_IMOVEL_VALUES = new Set([
  "APARTAMENTO",
  "CASA",
  "CASA_DE_CONDOMINIO",
  "CASA_DE_VILA",
  "COBERTURA",
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "FAZENDA_SITIO_CHACARA",
  "FLAT",
  "GALPAO_DEPOSITO_ARMAZEM",
  "GARAGEM",
  "KITNET_CONJUGADO",
  "HOTEL_MOTEL_POUSADA",
  "LOFT",
  "LOTE_TERRENO",
  "PONTO_COMERCIAL_LOJA_BOX",
  "SHOPPING",
  "PREDIO_EDIFICIO_INTEIRO",
  "SELF_STORAGE",
  "STUDIO",
]);

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

function parseFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^\d,-]/g, "").replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseMinOption(value: unknown) {
  const number = parseFiniteNumber(value);
  if (number == null || number < 0) return null;
  return Math.min(Math.floor(number), 20);
}

function parseAllowedStringArray(value: unknown, allowed: Set<string>, limit = 8) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = values
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter((item) => item && allowed.has(item));
  return Array.from(new Set(normalized)).slice(0, limit);
}

function parseStringTokenArray(value: unknown, limit = 8) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = values
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter((item) => /^[A-Z0-9_]{2,60}$/.test(item));
  return Array.from(new Set(normalized)).slice(0, limit);
}

function parseRadiusKm(value: unknown) {
  const number = parseFiniteNumber(value);
  if (number == null) return null;
  const allowed = [1, 3, 5, 10, 20];
  return allowed.includes(number) ? number : null;
}

function isEmptyBriefingValue(value: unknown) {
  return value == null || (Array.isArray(value) && value.length === 0) || value === "";
}

function mergeBriefingWithCuradoriaPriority(current: LeadBriefingRow, next: CuradoriaBriefing): LeadBriefingUpdate {
  const patch: LeadBriefingUpdate = {};
  const entries = Object.entries(next) as Array<[keyof CuradoriaBriefing, CuradoriaBriefing[keyof CuradoriaBriefing]]>;

  for (const [key, value] of entries) {
    if (key === "geolocacao_id") continue;
    if (isEmptyBriefingValue(value)) continue;
    (patch as Record<string, unknown>)[key] = value;
  }

  if (next.geolocacao_id) {
    patch.geolocacao_id = next.geolocacao_id;
  }

  return patch;
}

function getFormTimelineTitle(formKey: string) {
  if (formKey === "whatsapp_contact") return "Formulário de WhatsApp preenchido";
  if (formKey === "property_info") return "Formulário de atendimento preenchido";
  if (formKey === "visit_schedule") return "Formulário de agendamento de visita preenchido";
  if (formKey === "curadoria") return "Formulário de curadoria preenchido";
  return "Formulário público preenchido";
}

async function insertPublicFormTimelineEvent(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  ownerId: string;
  leadId: string;
  formKey: string;
  pageUrl: string | null;
  referrer: string | null;
  property: PropertyContext | null;
  briefing: CuradoriaBriefing | null;
  visit: { label: string; scheduledAt: string } | null;
}) {
  const details: TimelineInsert["detalhes"] = {
    source: "public_form",
    form_key: input.formKey,
    page_url: input.pageUrl,
    referrer: input.referrer,
    imovel_id: input.property?.id ?? null,
    imovel_titulo: input.property?.title ?? null,
    imovel_codigo: input.property?.code ?? null,
    finalidade: input.property?.operationLabel ?? null,
    briefing: input.briefing,
    visit: input.visit,
  } as Json;

  const result = await input.admin.from("timeline_eventos").insert({
    owner_id: input.ownerId,
    lead_id: input.leadId,
    negocio_id: null,
    tipo: "SISTEMA",
    titulo: getFormTimelineTitle(input.formKey),
    detalhes: details,
  });

  if (result.error) {
    if (result.error.code === "42P01") return;
    throw new Error(result.error.message);
  }
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

function parseCuradoriaBriefing(value: unknown) {
  if (!asObject(value)) return { ok: false as const, message: "Informe os dados da curadoria." };

  const objectives = parseAllowedStringArray(value.objetivolead, OBJECTIVE_VALUES, 3);
  if (objectives.length === 0) return { ok: false as const, message: "Escolha a finalidade da curadoria." };

  const tipoUso = parseString(value.tipouso).toUpperCase();
  if (!TIPO_USO_VALUES.has(tipoUso)) return { ok: false as const, message: "Escolha o tipo de uso do imóvel." };

  const tipoimovel = parseAllowedStringArray(value.tipoimovel, TIPO_IMOVEL_VALUES, 4);
  if (tipoimovel.length === 0) return { ok: false as const, message: "Escolha pelo menos um tipo de imóvel." };

  const location = asObject(value.localizacao) ? value.localizacao : {};
  const place = asObject(location.place) ? (location.place as PublicPlacePayload) : {};
  const placeText =
    parseNullableString(place.formatted_address) ??
    parseNullableString(place.name) ??
    parseNullableString(location.localizacao_texto);

  const lat = parseFiniteNumber(place.lat);
  const lng = parseFiniteNumber(place.lng);
  const raioKm = parseRadiusKm(location.raio_km) ?? 5;

  if (!placeText || lat == null || lng == null) {
    return { ok: false as const, message: "Escolha uma região no mapa para a curadoria." };
  }

  const tiponegociacao = objectives.includes("COMPRAR") && objectives.includes("ALUGAR")
    ? ["VENDA_E_ALUGUEL" as const]
    : [
        objectives.includes("ALUGAR") ? "ALUGUEL" as const : null,
        objectives.includes("COMPRAR") || objectives.includes("VENDER") ? "VENDA" as const : null,
      ].filter(Boolean);
  const intencao = parseString(value.intencao_compra).toUpperCase();
  const valorMin = parseFiniteNumber(value.valor_min);
  const valorMax = parseFiniteNumber(value.valor_max);
  const areaMin = parseFiniteNumber(value.area_util_min);
  const areaMax = parseFiniteNumber(value.area_util_max);

  return {
    ok: true as const,
    briefing: {
      objetivolead: objectives as CuradoriaBriefing["objetivolead"],
      tiponegociacao: tiponegociacao.length > 0 ? tiponegociacao as CuradoriaBriefing["tiponegociacao"] : null,
      tipouso: tipoUso as CuradoriaBriefing["tipouso"],
      tipoimovel: tipoimovel as CuradoriaBriefing["tipoimovel"],
      categoriaimovel: parseStringTokenArray(value.categoriaimovel, 4),
      subcategoriaimovel: parseStringTokenArray(value.subcategoriaimovel, 6),
      intencao_compra: INTENCAO_VALUES.has(intencao) ? intencao as CuradoriaBriefing["intencao_compra"] : null,
      valor_min: valorMin && valorMin > 0 ? valorMin : null,
      valor_max: valorMax && valorMax > 0 ? valorMax : null,
      area_util_min: areaMin && areaMin > 0 ? areaMin : null,
      area_util_max: areaMax && areaMax > 0 ? areaMax : null,
      quartos_min: parseMinOption(value.quartos_min),
      suites_min: parseMinOption(value.suites_min),
      vagas_min: parseMinOption(value.vagas_min),
      localizacao_texto: placeText,
      lat,
      lng,
      raio_km: raioKm,
      texto_livre: parseNullableString(value.texto_livre),
    } satisfies CuradoriaBriefing,
    place,
  };
}

async function resolvePublicBriefingGeolocation(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  place: PublicPlacePayload;
}) {
  const placeId = parseNullableString(input.place.place_id);
  const lat = parseFiniteNumber(input.place.lat);
  const lng = parseFiniteNumber(input.place.lng);
  const formattedAddress = parseNullableString(input.place.formatted_address);

  if (!placeId || !formattedAddress || lat == null || lng == null) return null;

  const geolocacaoPayload: GeolocacaoInsert = {
    place_id: placeId,
    address_json: {
      ...input.place,
      source: "PUBLIC_CURADORIA",
    } as GeolocacaoInsert["address_json"],
    logradouro: parseNullableString(input.place.logradouro),
    numero: parseNullableString(input.place.numero),
    bairro: parseNullableString(input.place.bairro),
    cidade: parseNullableString(input.place.cidade),
    uf: parseNullableString(input.place.estado) as Uf | null,
    cep: parseNullableString(input.place.cep),
    lat,
    lng,
    endereco_formatado: formattedAddress,
  };

  const result = await input.admin
    .from("geolocacoes")
    .upsert(geolocacaoPayload, { onConflict: "place_id" })
    .select("id")
    .single();

  if (result.error) throw new Error(result.error.message);
  return result.data.id as string;
}

async function upsertCuradoriaLeadBriefing(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  ownerId: string;
  leadId: string;
  briefing: CuradoriaBriefing;
}) {
  const currentResult = await input.admin
    .from("lead_briefings")
    .select(LEAD_BRIEFING_SELECT)
    .eq("owner_id", input.ownerId)
    .eq("lead_id", input.leadId)
    .maybeSingle();

  if (currentResult.error) throw new Error(currentResult.error.message);

  if (!currentResult.data) {
    const insertResult = await input.admin
      .from("lead_briefings")
      .insert({
        owner_id: input.ownerId,
        lead_id: input.leadId,
        ...input.briefing,
      })
      .select("id")
      .single();

    if (insertResult.error) throw new Error(insertResult.error.message);
    return "created" as const;
  }

  const patch = mergeBriefingWithCuradoriaPriority(currentResult.data as unknown as LeadBriefingRow, input.briefing);
  if (Object.keys(patch).length === 0) return "unchanged" as const;

  const updateResult = await input.admin
    .from("lead_briefings")
    .update(patch)
    .eq("owner_id", input.ownerId)
    .eq("lead_id", input.leadId)
    .select("id")
    .single();

  if (updateResult.error) throw new Error(updateResult.error.message);
  return "updated" as const;
}

function buildCuradoriaLeadMessage(input: {
  visitorName: string;
  message: string | null;
  property: PropertyContext | null;
  pageUrl: string | null;
  briefing: CuradoriaBriefing;
}) {
  return [
    "Origem: pedido de curadoria no perfil público Corretor.one",
    `Visitante: ${input.visitorName}`,
    input.property ? `Imóvel de origem: ${input.property.title}` : null,
    input.property?.code ? `Código: ${input.property.code}` : null,
    input.briefing.objetivolead?.length ? `Finalidade: ${input.briefing.objetivolead.join(", ")}` : null,
    input.briefing.tipoimovel?.length ? `Tipos: ${input.briefing.tipoimovel.join(", ")}` : null,
    input.briefing.localizacao_texto ? `Região: ${input.briefing.localizacao_texto}` : null,
    input.briefing.raio_km ? `Raio: ${input.briefing.raio_km} km` : null,
    input.briefing.valor_max ? `Valor máximo: ${formatCurrency(input.briefing.valor_max)}` : null,
    input.briefing.quartos_min ? `Dormitórios: ${input.briefing.quartos_min}+` : null,
    input.pageUrl ? `Página: ${input.pageUrl}` : null,
    input.message ? `Mensagem: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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

function getSaoPauloLocalDateParts(date: Date) {
  const shifted = new Date(date.getTime() + SAO_PAULO_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function saoPauloLocalToIso(year: number, month: number, day: number, minutes: number) {
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      Math.floor(minutes / 60) - SAO_PAULO_UTC_OFFSET_HOURS,
      minutes % 60,
      0,
      0,
    ),
  ).toISOString();
}

function isConfirmationBusinessDay(date: Date) {
  const weekday = date.getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

function nextConfirmationBusinessDayStart(year: number, month: number, day: number, extraDays = 1) {
  const date = new Date(Date.UTC(year, month, day + extraDays));
  while (!isConfirmationBusinessDay(date)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    minutes: CONFIRMATION_BUSINESS_START_MINUTES,
  };
}

function getVisitConfirmationDueAt(now = new Date()) {
  const local = getSaoPauloLocalDateParts(now);
  const localDate = new Date(Date.UTC(local.year, local.month, local.day));

  if (!isConfirmationBusinessDay(localDate)) {
    const nextBusiness = nextConfirmationBusinessDayStart(local.year, local.month, local.day, 1);
    return saoPauloLocalToIso(
      nextBusiness.year,
      nextBusiness.month,
      nextBusiness.day,
      nextBusiness.minutes + CONFIRMATION_DUE_BUSINESS_MINUTES,
    );
  }

  if (local.minutes < CONFIRMATION_BUSINESS_START_MINUTES) {
    return saoPauloLocalToIso(
      local.year,
      local.month,
      local.day,
      CONFIRMATION_BUSINESS_START_MINUTES + CONFIRMATION_DUE_BUSINESS_MINUTES,
    );
  }

  if (local.minutes + CONFIRMATION_DUE_BUSINESS_MINUTES <= CONFIRMATION_BUSINESS_END_MINUTES) {
    return saoPauloLocalToIso(local.year, local.month, local.day, local.minutes + CONFIRMATION_DUE_BUSINESS_MINUTES);
  }

  const remainingMinutes = CONFIRMATION_BUSINESS_END_MINUTES - local.minutes;
  const nextBusiness = nextConfirmationBusinessDayStart(local.year, local.month, local.day, 1);
  return saoPauloLocalToIso(
    nextBusiness.year,
    nextBusiness.month,
    nextBusiness.day,
    nextBusiness.minutes + Math.max(CONFIRMATION_DUE_BUSINESS_MINUTES - remainingMinutes, 0),
  );
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

function buildVisitActivityDescription(input: {
  visitorName: string;
  message: string | null;
  property: PropertyContext;
  pageUrl: string | null;
  visitLabel: string;
}) {
  return [
    `Visita solicitada pelo portal para ${input.visitLabel}.`,
    "",
    `Visitante: ${input.visitorName}`,
    `Imóvel: ${input.property.title}`,
    input.property.code ? `Código: ${input.property.code}` : null,
    `Finalidade: ${input.property.operationLabel}`,
    input.property.priceLabel ? `Valor: ${input.property.priceLabel}` : null,
    input.pageUrl ? `Página: ${input.pageUrl}` : null,
    input.message ? `Mensagem do visitante: ${input.message}` : null,
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

  if (
    formKey !== "whatsapp_contact" &&
    formKey !== "property_info" &&
    formKey !== "visit_schedule" &&
    formKey !== "curadoria"
  ) {
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
  if ((formKey === "property_info" || formKey === "visit_schedule") && !propertyId) {
    return errorResponse("Informe o imóvel de interesse.");
  }

  const curadoria = formKey === "curadoria" ? parseCuradoriaBriefing(body.briefing) : null;
  if (curadoria && !curadoria.ok) return errorResponse(curadoria.message);

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
    formKey === "curadoria" && curadoria?.ok
      ? buildCuradoriaLeadMessage({
          visitorName,
          message,
          property,
          pageUrl,
          briefing: curadoria.briefing,
        })
      : formKey === "visit_schedule" && property && visitSchedule?.ok
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
      source:
        formKey === "visit_schedule"
          ? "public_visit_schedule"
          : formKey === "property_info"
            ? "public_property_info"
            : formKey === "curadoria"
              ? "public_curadoria"
              : "public_whatsapp_contact",
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
      briefing: curadoria?.ok ? curadoria.briefing : null,
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

  if (property) {
    const relationResult = await admin
      .from("lead_imoveis")
      .upsert(
        {
          owner_id: profileResult.data.id,
          lead_id: leadResult.data.lead_id,
          imovel_id: property.id,
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
  }

  try {
    await insertPublicFormTimelineEvent({
      admin,
      ownerId: profileResult.data.id,
      leadId: leadResult.data.lead_id,
      formKey,
      pageUrl,
      referrer,
      property,
      briefing: curadoria?.ok ? curadoria.briefing : null,
      visit:
        visitSchedule?.ok
          ? {
              label: visitSchedule.label,
              scheduledAt: visitSchedule.scheduledAt,
            }
          : null,
    });
  } catch (error) {
    console.error("Failed to insert public form timeline event", error);
  }

  if (formKey === "visit_schedule") {
    let activityId: string | null = null;
    let activityCreated = false;

    if (property && visitSchedule?.ok) {
      const confirmationDueAt = getVisitConfirmationDueAt();
      const existingActivityResult = await admin
        .from("atividades")
        .select("id")
        .eq("owner_id", profileResult.data.id)
        .eq("lead_id", leadResult.data.lead_id)
        .eq("modelo", "EM_ATENDIMENTO_CONFIRMAR_VISITA")
        .eq("status", "PENDENTE")
        .maybeSingle();

      if (existingActivityResult.data) {
        activityId = existingActivityResult.data.id;
      } else if (!existingActivityResult.error) {
        const activityResult = await admin
          .from("atividades")
          .insert({
            owner_id: profileResult.data.id,
            lead_id: leadResult.data.lead_id,
            negocio_id: null,
            categoria: "EM_ATENDIMENTO",
            modelo: "EM_ATENDIMENTO_CONFIRMAR_VISITA",
            tipo: "VISITA",
            titulo: "Confirmar visita solicitada pelo portal",
            descricao: buildVisitActivityDescription({
              visitorName,
              message,
              property,
              pageUrl,
              visitLabel: visitSchedule.label,
            }),
            quando_em: confirmationDueAt,
            status: "PENDENTE",
          })
          .select("id")
          .single();

        if (!activityResult.error) {
          activityId = activityResult.data.id;
          activityCreated = true;
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          accepted: true,
          action: leadResult.data.action,
          lead_id: leadResult.data.lead_id,
          activity_id: activityId,
          activity_created: activityCreated,
          scheduled_at: visitSchedule?.ok ? visitSchedule.scheduledAt : null,
        },
      },
      { status: 200 },
    );
  }

  if (formKey === "property_info") {
    return NextResponse.json(
      {
        ok: true,
        data: {
          accepted: true,
          action: leadResult.data.action,
          lead_id: leadResult.data.lead_id,
        },
      },
      { status: 200 },
    );
  }

  if (formKey === "curadoria" && curadoria?.ok) {
    try {
      const geolocacaoId = await resolvePublicBriefingGeolocation({
        admin,
        place: curadoria.place,
      });
      const briefingAction = await upsertCuradoriaLeadBriefing({
        admin,
        ownerId: profileResult.data.id,
        leadId: leadResult.data.lead_id,
        briefing: {
          ...curadoria.briefing,
          geolocacao_id: geolocacaoId,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            accepted: true,
            action: leadResult.data.action,
            lead_id: leadResult.data.lead_id,
            briefing_action: briefingAction,
          },
        },
        { status: 200 },
      );
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_ERROR",
            message: error instanceof Error ? error.message : "Falha ao salvar briefing.",
          },
        },
        { status: 500 },
      );
    }
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
