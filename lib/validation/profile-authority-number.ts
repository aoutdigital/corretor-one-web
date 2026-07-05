import { fail, ok, type ApiResult } from "@/lib/api/result";

const AUTHORITY_NUMBER_TYPES = new Set([
  "VGV_NEGOCIADO",
  "IMOVEIS_VENDIDOS_ALUGADOS",
  "CLIENTES_ATENDIDOS",
  "ANOS_CARREIRA",
]);

export type AuthorityNumberPayload = {
  tipo: string;
  valor: string;
  rotulo: string;
  descricao: string | null;
  ordem: number;
  visivel: boolean;
};

export type AuthorityNumbersPayload = {
  items: AuthorityNumberPayload[];
};

function asObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseString(value: unknown, field: string, minLength: number, maxLength: number): ApiResult<string> {
  if (typeof value !== "string") return fail("VALIDATION_ERROR", `${field} must be a string`);

  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return fail("VALIDATION_ERROR", `${field} must contain ${minLength} to ${maxLength} characters`);
  }

  return ok(trimmed);
}

function parseNullableString(value: unknown, field: string, maxLength: number): ApiResult<string | null> {
  if (value === undefined || value === null) return ok(null);
  if (typeof value !== "string") return fail("VALIDATION_ERROR", `${field} must be a string or null`);

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return fail("VALIDATION_ERROR", `${field} must contain at most ${maxLength} characters`);
  }

  return ok(trimmed || null);
}

export function validateAuthorityNumbersPayload(payload: unknown): ApiResult<AuthorityNumbersPayload> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (!Array.isArray(payload.items)) return fail("VALIDATION_ERROR", "items must be an array");
  if (payload.items.length > 4) return fail("VALIDATION_ERROR", "items must contain at most 4 records");

  const seenTypes = new Set<string>();
  const items: AuthorityNumberPayload[] = [];

  for (const [index, item] of payload.items.entries()) {
    if (!asObject(item)) return fail("VALIDATION_ERROR", `items[${index}] must be an object`);

    if (typeof item.tipo !== "string" || !AUTHORITY_NUMBER_TYPES.has(item.tipo)) {
      return fail("VALIDATION_ERROR", `items[${index}].tipo is invalid`);
    }

    if (seenTypes.has(item.tipo)) {
      return fail("VALIDATION_ERROR", `items[${index}].tipo is duplicated`);
    }
    seenTypes.add(item.tipo);

    const valor = parseString(item.valor, `items[${index}].valor`, 1, 24);
    if (!valor.ok) return valor;

    const rotulo = parseString(item.rotulo, `items[${index}].rotulo`, 1, 80);
    if (!rotulo.ok) return rotulo;

    const descricao = parseNullableString(item.descricao, `items[${index}].descricao`, 160);
    if (!descricao.ok) return descricao;

    const ordemValue = item.ordem ?? index;
    if (typeof ordemValue !== "number" || !Number.isFinite(ordemValue)) {
      return fail("VALIDATION_ERROR", `items[${index}].ordem must be a number`);
    }

    const visivel = item.visivel ?? true;
    if (typeof visivel !== "boolean") {
      return fail("VALIDATION_ERROR", `items[${index}].visivel must be a boolean`);
    }

    items.push({
      tipo: item.tipo,
      valor: valor.data,
      rotulo: rotulo.data,
      descricao: descricao.data,
      ordem: Math.trunc(ordemValue),
      visivel,
    });
  }

  if (items.filter((item) => item.visivel).length > 3) {
    return fail("VALIDATION_ERROR", "Only 3 authority numbers can be visible");
  }

  return ok({ items });
}
