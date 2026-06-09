import { fail, ok, type ApiResult } from "@/lib/api/result";

const GENERO_VALUES = new Set(["MASCULINO", "FEMININO", "NAO_INFORMAR"]);
const UF_VALUES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

const NICKNAME_REGEX = /^[a-z0-9]{1,35}$/;
const NICKNAME_BLOCKED_TERMS_REGEX = /(corret|imob|imov|aparta|casa)/i;
const CRECI_NUMERO_REGEX = /^[0-9]{1,6}$/;
const FRASE_IMPACTO_MAX_LENGTH = 90;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_PROFILE_PATCH_KEYS = new Set([
  "primeiro_nome",
  "sobrenome",
  "genero",
  "telefone",
  "whatsapp",
  "nickname",
  "avatar_url",
  "imagem_capa_url",
  "frase_impacto",
  "bio",
  "uf",
  "cidades_foco",
  "imoveis_residenciais",
  "imoveis_comerciais",
  "imoveis_industriais",
  "imoveis_alto_padrao",
  "imoveis_luxo",
  "imoveis_medio_padrao",
  "imoveis_baixa_renda",
  "creci_uf",
  "creci_numero",
  "creci_sufixo",
  "creci_documento_midia_id",
  "plano_id",
  "instagram",
  "linkedin",
  "pinterest",
  "tiktok",
  "twitter",
  "youtube",
]);

export type UpdateProfileInput = {
  primeiro_nome?: string | null;
  sobrenome?: string | null;
  genero?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  imagem_capa_url?: string | null;
  frase_impacto?: string | null;
  bio?: string | null;
  uf?: string | null;
  cidades_foco?: string[] | null;
  imoveis_residenciais?: boolean;
  imoveis_comerciais?: boolean;
  imoveis_industriais?: boolean;
  imoveis_alto_padrao?: boolean;
  imoveis_luxo?: boolean;
  imoveis_medio_padrao?: boolean;
  imoveis_baixa_renda?: boolean;
  creci_uf?: string | null;
  creci_numero?: string | null;
  creci_sufixo?: string | null;
  creci_documento_midia_id?: string | null;
  plano_id?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  pinterest?: string | null;
  tiktok?: string | null;
  twitter?: string | null;
  youtube?: string | null;
};

function asObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseNullableString(value: unknown, field: string): ApiResult<string | null> {
  if (value === null) return ok(null);
  if (typeof value !== "string") {
    return fail("VALIDATION_ERROR", `${field} must be a string or null`);
  }
  return ok(value.trim());
}

export function validateProfilePatch(payload: unknown): ApiResult<UpdateProfileInput> {
  if (!asObject(payload)) {
    return fail("VALIDATION_ERROR", "Body must be a JSON object");
  }

  const keys = Object.keys(payload);
  for (const key of keys) {
    if (!ALLOWED_PROFILE_PATCH_KEYS.has(key)) {
      return fail("VALIDATION_ERROR", `Field ${key} is not allowed`);
    }
  }

  const parsed: UpdateProfileInput = {};

  for (const field of [
    "primeiro_nome",
    "sobrenome",
    "telefone",
    "whatsapp",
    "avatar_url",
    "imagem_capa_url",
    "bio",
    "instagram",
    "linkedin",
    "pinterest",
    "tiktok",
    "twitter",
    "youtube",
  ] as const) {
    if (!(field in payload)) continue;
    const result = parseNullableString(payload[field], field);
    if (!result.ok) return result;
    parsed[field] = result.data;
  }

  if ("nickname" in payload) {
    const result = parseNullableString(payload.nickname, "nickname");
    if (!result.ok) return result;
    if (result.data && !NICKNAME_REGEX.test(result.data)) {
      return fail("VALIDATION_ERROR", "nickname must match ^[a-z0-9]{1,35}$");
    }
    if (result.data && NICKNAME_BLOCKED_TERMS_REGEX.test(result.data)) {
      return fail("VALIDATION_ERROR", "nickname contains blocked terms");
    }
    parsed.nickname = result.data;
  }

  if ("frase_impacto" in payload) {
    const result = parseNullableString(payload.frase_impacto, "frase_impacto");
    if (!result.ok) return result;
    if (result.data && result.data.length > FRASE_IMPACTO_MAX_LENGTH) {
      return fail("VALIDATION_ERROR", "frase_impacto must contain at most 90 characters");
    }
    parsed.frase_impacto = result.data;
  }

  if ("genero" in payload) {
    const result = parseNullableString(payload.genero, "genero");
    if (!result.ok) return result;
    if (result.data && !GENERO_VALUES.has(result.data)) {
      return fail("VALIDATION_ERROR", "Invalid genero");
    }
    parsed.genero = result.data;
  }

  if ("uf" in payload) {
    const result = parseNullableString(payload.uf, "uf");
    if (!result.ok) return result;
    if (result.data && !UF_VALUES.has(result.data)) {
      return fail("VALIDATION_ERROR", "Invalid uf");
    }
    parsed.uf = result.data;
  }

  if ("creci_uf" in payload) {
    const result = parseNullableString(payload.creci_uf, "creci_uf");
    if (!result.ok) return result;
    if (result.data && !UF_VALUES.has(result.data)) {
      return fail("VALIDATION_ERROR", "Invalid creci_uf");
    }
    parsed.creci_uf = result.data;
  }

  if ("creci_numero" in payload) {
    const result = parseNullableString(payload.creci_numero, "creci_numero");
    if (!result.ok) return result;
    if (result.data && !CRECI_NUMERO_REGEX.test(result.data)) {
      return fail("VALIDATION_ERROR", "creci_numero must contain 1 to 6 digits");
    }
    parsed.creci_numero = result.data;
  }

  if ("creci_sufixo" in payload) {
    const result = parseNullableString(payload.creci_sufixo, "creci_sufixo");
    if (!result.ok) return result;
    if (result.data && result.data !== "F") {
      return fail("VALIDATION_ERROR", "creci_sufixo must be F");
    }
    parsed.creci_sufixo = result.data;
  }

  if ("creci_documento_midia_id" in payload) {
    const result = parseNullableString(payload.creci_documento_midia_id, "creci_documento_midia_id");
    if (!result.ok) return result;
    if (result.data && !UUID_REGEX.test(result.data)) {
      return fail("VALIDATION_ERROR", "creci_documento_midia_id must be a valid UUID");
    }
    parsed.creci_documento_midia_id = result.data;
  }

  if ("plano_id" in payload) {
    const result = parseNullableString(payload.plano_id, "plano_id");
    if (!result.ok) return result;
    if (result.data && !UUID_REGEX.test(result.data)) {
      return fail("VALIDATION_ERROR", "plano_id must be a valid UUID");
    }
    parsed.plano_id = result.data;
  }

  if ("cidades_foco" in payload) {
    const value = payload.cidades_foco;
    if (value === null) {
      parsed.cidades_foco = null;
    } else if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      parsed.cidades_foco = value.map((item) => item.trim());
    } else {
      return fail("VALIDATION_ERROR", "cidades_foco must be string[] or null");
    }
  }

  for (const field of [
    "imoveis_residenciais",
    "imoveis_comerciais",
    "imoveis_industriais",
    "imoveis_alto_padrao",
    "imoveis_luxo",
    "imoveis_medio_padrao",
    "imoveis_baixa_renda",
  ] as const) {
    if (!(field in payload)) continue;
    if (typeof payload[field] !== "boolean") {
      return fail("VALIDATION_ERROR", `${field} must be a boolean`);
    }
    parsed[field] = payload[field];
  }

  return ok(parsed);
}
