import { fail, ok, type ApiResult } from "@/lib/api/result";

const ORIGEM_LEAD_VALUES = new Set([
  "CORRETOR_ONE",
  "GRUPO_OLX",
  "GOOGLE_ADS",
  "META_ADS",
  "INDICACAO",
  "EVENTO",
  "FEIRA",
  "PLANTAO",
  "IMOVELWEB",
  "CHAVES_NA_MAO",
  "CASA_MINEIRA",
  "LUGAR_CERTO",
  "MERCADO_LIVRE",
  "MEU_IMOVEL",
  "DREAMCASA",
  "QUINTO_ANDAR",
  "LOFT",
  "I123",
  "AGENTE_IMOVEL",
  "TROVIT",
  "IMOVEIS_CURITIBA",
  "WHATSAPP_BUSINESS",
  "OUTRO",
]);

export type LeadCaptureInput = {
  owner_id: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  telefone_e164?: string | null;
  origem: string;
  mensagem?: string | null;
  imovel_id?: string | null;
  utm?: Record<string, unknown> | null;
};

function asObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseNullableString(value: unknown, field: string): ApiResult<string | null> {
  if (value === null || value === undefined) return ok(null);
  if (typeof value !== "string") {
    return fail("VALIDATION_ERROR", `${field} must be a string`);
  }
  const trimmed = value.trim();
  return ok(trimmed.length === 0 ? null : trimmed);
}

export function validateLeadCaptureInput(payload: unknown): ApiResult<LeadCaptureInput> {
  if (!asObject(payload)) {
    return fail("VALIDATION_ERROR", "Body must be a JSON object");
  }

  const ownerId = payload.owner_id;
  if (typeof ownerId !== "string" || ownerId.trim().length === 0) {
    return fail("VALIDATION_ERROR", "owner_id is required");
  }

  const origem = payload.origem;
  if (typeof origem !== "string" || !ORIGEM_LEAD_VALUES.has(origem)) {
    return fail("VALIDATION_ERROR", "origem is required and must be valid");
  }

  const nome = parseNullableString(payload.nome, "nome");
  if (!nome.ok) return nome;

  const email = parseNullableString(payload.email, "email");
  if (!email.ok) return email;

  const telefone = parseNullableString(payload.telefone, "telefone");
  if (!telefone.ok) return telefone;

  const telefoneE164 = parseNullableString(payload.telefone_e164, "telefone_e164");
  if (!telefoneE164.ok) return telefoneE164;

  const mensagem = parseNullableString(payload.mensagem, "mensagem");
  if (!mensagem.ok) return mensagem;

  const imovelId = parseNullableString(payload.imovel_id, "imovel_id");
  if (!imovelId.ok) return imovelId;

  const utm = payload.utm;
  if (utm !== null && utm !== undefined && !asObject(utm)) {
    return fail("VALIDATION_ERROR", "utm must be an object or null");
  }

  if (!email.data && !telefoneE164.data) {
    return fail("VALIDATION_ERROR", "At least one key is required: email or telefone_e164");
  }

  return ok({
    owner_id: ownerId.trim(),
    nome: nome.data,
    email: email.data,
    telefone: telefone.data,
    telefone_e164: telefoneE164.data,
    origem,
    mensagem: mensagem.data,
    imovel_id: imovelId.data,
    utm: (utm as Record<string, unknown> | null | undefined) ?? null,
  });
}

