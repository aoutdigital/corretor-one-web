import { fail, ok, type ApiResult } from "@/lib/api/result";
import type { Json, Database } from "@/lib/supabase/database.types";

type NegocioInsert = Database["public"]["Tables"]["negocios"]["Insert"];
type NegocioUpdate = Database["public"]["Tables"]["negocios"]["Update"];
type AtividadeInsert = Database["public"]["Tables"]["atividades"]["Insert"];
type AtividadeUpdate = Database["public"]["Tables"]["atividades"]["Update"];
type PropostaInsert = Database["public"]["Tables"]["propostas"]["Insert"];
type PropostaUpdate = Database["public"]["Tables"]["propostas"]["Update"];
type TimelineInsert = Database["public"]["Tables"]["timeline_eventos"]["Insert"];

function asObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

function asNullableJson(value: unknown): Json | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value as Json;
}

export function validateCreateNegocio(payload: unknown): ApiResult<Omit<NegocioInsert, "owner_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }

  return ok({
    lead_id: payload.lead_id,
    titulo: asNullableString(payload.titulo),
    etapa: (payload.etapa as NegocioInsert["etapa"]) ?? "NOVO",
    valor_estimado: asNullableNumber(payload.valor_estimado),
    finalidade: (payload.finalidade as NegocioInsert["finalidade"]) ?? null,
    imovel_id: asNullableString(payload.imovel_id),
    empreendimento_id: asNullableString(payload.empreendimento_id),
    lista_id: asNullableString(payload.lista_id),
    notas: asNullableString(payload.notas),
    proxima_acao_em: asNullableString(payload.proxima_acao_em),
  });
}

export function validateUpdateNegocio(payload: unknown): ApiResult<NegocioUpdate> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  const patch: NegocioUpdate = {};

  if ("titulo" in payload) patch.titulo = asNullableString(payload.titulo);
  if ("etapa" in payload) patch.etapa = payload.etapa as NegocioUpdate["etapa"];
  if ("valor_estimado" in payload) patch.valor_estimado = asNullableNumber(payload.valor_estimado);
  if ("finalidade" in payload) patch.finalidade = payload.finalidade as NegocioUpdate["finalidade"];
  if ("imovel_id" in payload) patch.imovel_id = asNullableString(payload.imovel_id);
  if ("empreendimento_id" in payload)
    patch.empreendimento_id = asNullableString(payload.empreendimento_id);
  if ("lista_id" in payload) patch.lista_id = asNullableString(payload.lista_id);
  if ("notas" in payload) patch.notas = asNullableString(payload.notas);
  if ("proxima_acao_em" in payload) patch.proxima_acao_em = asNullableString(payload.proxima_acao_em);
  if ("fechado_em" in payload) patch.fechado_em = asNullableString(payload.fechado_em);

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateCreateAtividade(
  payload: unknown,
): ApiResult<Omit<AtividadeInsert, "owner_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }
  if (typeof payload.titulo !== "string" || payload.titulo.trim() === "") {
    return fail("VALIDATION_ERROR", "titulo is required");
  }
  if (typeof payload.tipo !== "string" || payload.tipo.trim() === "") {
    return fail("VALIDATION_ERROR", "tipo is required");
  }

  return ok({
    lead_id: payload.lead_id,
    negocio_id: asNullableString(payload.negocio_id),
    tipo: payload.tipo as AtividadeInsert["tipo"],
    titulo: payload.titulo,
    descricao: asNullableString(payload.descricao),
    quando_em: asNullableString(payload.quando_em),
    status: (payload.status as AtividadeInsert["status"]) ?? "PENDENTE",
  });
}

export function validateUpdateAtividade(payload: unknown): ApiResult<AtividadeUpdate> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  const patch: AtividadeUpdate = {};

  if ("negocio_id" in payload) patch.negocio_id = asNullableString(payload.negocio_id);
  if ("tipo" in payload) patch.tipo = payload.tipo as AtividadeUpdate["tipo"];
  if ("titulo" in payload) patch.titulo = asNullableString(payload.titulo) ?? undefined;
  if ("descricao" in payload) patch.descricao = asNullableString(payload.descricao);
  if ("quando_em" in payload) patch.quando_em = asNullableString(payload.quando_em);
  if ("status" in payload) patch.status = payload.status as AtividadeUpdate["status"];
  if ("concluida_em" in payload) patch.concluida_em = asNullableString(payload.concluida_em);

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateCreateProposta(payload: unknown): ApiResult<Omit<PropostaInsert, "owner_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }
  if (typeof payload.titulo !== "string" || payload.titulo.trim() === "") {
    return fail("VALIDATION_ERROR", "titulo is required");
  }
  if (typeof payload.tipo !== "string" || payload.tipo.trim() === "") {
    return fail("VALIDATION_ERROR", "tipo is required");
  }

  return ok({
    lead_id: payload.lead_id,
    negocio_id: asNullableString(payload.negocio_id),
    titulo: payload.titulo,
    tipo: payload.tipo as PropostaInsert["tipo"],
    status: (payload.status as PropostaInsert["status"]) ?? "RASCUNHO",
    valor: asNullableNumber(payload.valor),
    conteudo: asNullableJson(payload.conteudo),
    arquivo_midia_id: asNullableString(payload.arquivo_midia_id),
    enviada_em: asNullableString(payload.enviada_em),
  });
}

export function validateUpdateProposta(payload: unknown): ApiResult<PropostaUpdate> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  const patch: PropostaUpdate = {};

  if ("negocio_id" in payload) patch.negocio_id = asNullableString(payload.negocio_id);
  if ("titulo" in payload) patch.titulo = asNullableString(payload.titulo) ?? undefined;
  if ("status" in payload) patch.status = payload.status as PropostaUpdate["status"];
  if ("valor" in payload) patch.valor = asNullableNumber(payload.valor);
  if ("conteudo" in payload) patch.conteudo = asNullableJson(payload.conteudo);
  if ("arquivo_midia_id" in payload) patch.arquivo_midia_id = asNullableString(payload.arquivo_midia_id);
  if ("enviada_em" in payload) patch.enviada_em = asNullableString(payload.enviada_em);

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateCreateTimeline(payload: unknown): ApiResult<Omit<TimelineInsert, "owner_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }
  if (typeof payload.tipo !== "string" || payload.tipo.trim() === "") {
    return fail("VALIDATION_ERROR", "tipo is required");
  }
  if (typeof payload.titulo !== "string" || payload.titulo.trim() === "") {
    return fail("VALIDATION_ERROR", "titulo is required");
  }

  return ok({
    lead_id: payload.lead_id,
    negocio_id: asNullableString(payload.negocio_id),
    tipo: payload.tipo as TimelineInsert["tipo"],
    titulo: payload.titulo,
    detalhes: asNullableJson(payload.detalhes),
  });
}

