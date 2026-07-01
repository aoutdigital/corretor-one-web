import { fail, ok, type ApiResult } from "@/lib/api/result";

const SOCIAL_PROOF_TYPES = new Set([
  "ENTREGA_CHAVES",
  "ASSINATURA_CONTRATO",
  "ASSINATURA_ESCRITURA",
  "DEPOIMENTO",
  "COMPRA_REALIZADA",
  "VENDA_REALIZADA",
  "LOCACAO_REALIZADA",
  "POS_VENDA",
]);

const SOCIAL_PROOF_STATUS = new Set(["RASCUNHO", "PUBLICADO", "ARQUIVADO"]);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SocialProofPayload = {
  tipo?: string;
  titulo?: string;
  descricao?: string | null;
  depoimento?: string | null;
  cliente_nome_publico?: string | null;
  localidade?: string | null;
  data_momento?: string | null;
  tags?: string[];
  imagem_url?: string | null;
  imagem_alt?: string | null;
  midia_id?: string | null;
  consentimento_imagem_confirmado?: boolean;
  status?: string;
  ordem?: number;
  destaque?: boolean;
};

function asObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseNullableString(value: unknown, field: string, maxLength: number): ApiResult<string | null> {
  if (value === undefined) return ok(undefined as unknown as string | null);
  if (value === null) return ok(null);
  if (typeof value !== "string") return fail("VALIDATION_ERROR", `${field} must be a string or null`);

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return fail("VALIDATION_ERROR", `${field} must contain at most ${maxLength} characters`);
  }
  return ok(trimmed || null);
}

function parseDate(value: unknown): ApiResult<string | null> {
  if (value === undefined) return ok(undefined as unknown as string | null);
  if (value === null || value === "") return ok(null);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fail("VALIDATION_ERROR", "data_momento must be YYYY-MM-DD or null");
  }
  return ok(value);
}

export function validateSocialProofPayload(payload: unknown, mode: "create" | "update"): ApiResult<SocialProofPayload> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const parsed: SocialProofPayload = {};

  if ("tipo" in payload) {
    if (typeof payload.tipo !== "string" || !SOCIAL_PROOF_TYPES.has(payload.tipo)) {
      return fail("VALIDATION_ERROR", "Invalid tipo");
    }
    parsed.tipo = payload.tipo;
  } else if (mode === "create") {
    return fail("VALIDATION_ERROR", "tipo is required");
  }

  if ("titulo" in payload) {
    if (typeof payload.titulo !== "string") return fail("VALIDATION_ERROR", "titulo must be a string");
    const titulo = payload.titulo.trim();
    if (titulo.length < 1 || titulo.length > 120) {
      return fail("VALIDATION_ERROR", "titulo must contain 1 to 120 characters");
    }
    parsed.titulo = titulo;
  } else if (mode === "create") {
    return fail("VALIDATION_ERROR", "titulo is required");
  }

  for (const [field, maxLength] of [
    ["descricao", 260],
    ["depoimento", 520],
    ["cliente_nome_publico", 80],
    ["localidade", 120],
    ["imagem_alt", 180],
  ] as const) {
    if (!(field in payload)) continue;
    const result = parseNullableString(payload[field], field, maxLength);
    if (!result.ok) return result;
    parsed[field] = result.data;
  }

  if ("data_momento" in payload) {
    const result = parseDate(payload.data_momento);
    if (!result.ok) return result;
    parsed.data_momento = result.data;
  }

  if ("tags" in payload) {
    if (!Array.isArray(payload.tags) || !payload.tags.every((item) => typeof item === "string")) {
      return fail("VALIDATION_ERROR", "tags must be string[]");
    }
    parsed.tags = payload.tags.map((item) => item.trim()).filter(Boolean).slice(0, 8);
  }

  if ("imagem_url" in payload) {
    const result = parseNullableString(payload.imagem_url, "imagem_url", 2048);
    if (!result.ok) return result;
    parsed.imagem_url = result.data;
  }

  if ("midia_id" in payload) {
    const result = parseNullableString(payload.midia_id, "midia_id", 64);
    if (!result.ok) return result;
    if (result.data && !UUID_REGEX.test(result.data)) {
      return fail("VALIDATION_ERROR", "midia_id must be a valid UUID");
    }
    parsed.midia_id = result.data;
  }

  if ("status" in payload) {
    if (typeof payload.status !== "string" || !SOCIAL_PROOF_STATUS.has(payload.status)) {
      return fail("VALIDATION_ERROR", "Invalid status");
    }
    parsed.status = payload.status;
  }

  if ("ordem" in payload) {
    if (typeof payload.ordem !== "number" || !Number.isFinite(payload.ordem)) {
      return fail("VALIDATION_ERROR", "ordem must be a number");
    }
    parsed.ordem = Math.trunc(payload.ordem);
  }

  for (const field of ["destaque", "consentimento_imagem_confirmado"] as const) {
    if (!(field in payload)) continue;
    if (typeof payload[field] !== "boolean") return fail("VALIDATION_ERROR", `${field} must be a boolean`);
    parsed[field] = payload[field];
  }

  return ok(parsed);
}
