import { fail, ok, type ApiResult } from "@/lib/api/result";
import { isValidActivityModelForCategory } from "@/lib/crm/activity-playbook";
import {
  mapFaseToLegacyEtapa,
  mapLegacyEtapaToFase,
  mapLegacyFinalidadeToModalidade,
  mapModalidadeToLegacyFinalidade,
} from "@/lib/crm/oportunidades";
import type { CreateAtividadeInput } from "@/lib/db/atividades";
import type { Json, Database } from "@/lib/supabase/database.types";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadBriefingInsert = Database["public"]["Tables"]["lead_briefings"]["Insert"];
type NegocioInsert = Database["public"]["Tables"]["negocios"]["Insert"];
type NegocioUpdate = Database["public"]["Tables"]["negocios"]["Update"];
type AtividadeInsert = Database["public"]["Tables"]["atividades"]["Insert"];
type AtividadeUpdate = Database["public"]["Tables"]["atividades"]["Update"];
type PropostaInsert = Database["public"]["Tables"]["propostas"]["Insert"];
type PropostaUpdate = Database["public"]["Tables"]["propostas"]["Update"];
type TimelineInsert = Database["public"]["Tables"]["timeline_eventos"]["Insert"];
type NegocioParteInsert = Database["public"]["Tables"]["negocio_partes"]["Insert"];
type NegocioParteUpdate = Database["public"]["Tables"]["negocio_partes"]["Update"];
type NegocioPartePessoaInsert = Database["public"]["Tables"]["negocio_parte_pessoas"]["Insert"];
type NegocioPartePessoaUpdate = Database["public"]["Tables"]["negocio_parte_pessoas"]["Update"];
type NegocioCorretorInsert = Database["public"]["Tables"]["negocio_corretores"]["Insert"];
type NegocioCorretorUpdate = Database["public"]["Tables"]["negocio_corretores"]["Update"];
type PropostaCreateValidated = Omit<PropostaInsert, "owner_id" | "negocio_id"> & {
  negocio_id: string;
};

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

function asNullableInteger(value: unknown): number | null | undefined {
  const parsed = asNullableNumber(value);
  if (parsed === undefined || parsed === null) return parsed;
  return Number.isInteger(parsed) ? parsed : undefined;
}

function asNullableStringArray(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  return items;
}

function asNullableJson(value: unknown): Json | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value as Json;
}

function onlyDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

function isValidCpf(value: string) {
  const digits = onlyDigits(value, 11);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const numbers = digits.split("").map((char) => Number(char));
  const firstVerifierBase = numbers
    .slice(0, 9)
    .reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstVerifier = (firstVerifierBase * 10) % 11;
  if ((firstVerifier === 10 ? 0 : firstVerifier) !== numbers[9]) return false;

  const secondVerifierBase = numbers
    .slice(0, 10)
    .reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondVerifier = (secondVerifierBase * 10) % 11;

  return (secondVerifier === 10 ? 0 : secondVerifier) === numbers[10];
}

function roundCurrencyValue(value: number | null | undefined) {
  return Math.round((value ?? 0) * 100) / 100;
}

function roundPercentValue(value: number | null | undefined) {
  return Math.round((value ?? 0) * 100) / 100;
}

function resolveNegocioCommissionFields(params: {
  valor: number | null | undefined;
  comissaopercentual: number | null | undefined;
  comissaovalor: number | null | undefined;
}): ApiResult<{
  comissaopercentual: number | null;
  comissaovalor: number | null;
}> {
  const valor = params.valor ?? null;
  let comissaopercentual = params.comissaopercentual ?? null;
  let comissaovalor = params.comissaovalor ?? null;

  if (valor == null || valor <= 0) {
    return ok({
      comissaopercentual,
      comissaovalor,
    });
  }

  if (comissaopercentual != null && comissaovalor == null) {
    comissaovalor = roundCurrencyValue((valor * comissaopercentual) / 100);
  } else if (comissaovalor != null && comissaopercentual == null) {
    comissaopercentual = roundPercentValue((comissaovalor / valor) * 100);
  } else if (comissaopercentual != null && comissaovalor != null) {
    const expectedValue = roundCurrencyValue((valor * comissaopercentual) / 100);
    if (expectedValue !== roundCurrencyValue(comissaovalor)) {
      return fail("VALIDATION_ERROR", "A comissão deve ser consistente entre percentual e valor");
    }
  }

  return ok({
    comissaopercentual,
    comissaovalor,
  });
}

export function validateCreateLead(payload: unknown): ApiResult<Omit<LeadInsert, "owner_id" | "email_lower">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const nome = asNullableString(payload.nome);
  if (!nome) return fail("VALIDATION_ERROR", "nome is required");

  return ok({
    nome,
    profissao: asNullableString(payload.profissao),
    endereco: asNullableString(payload.endereco),
    numero: asNullableString(payload.numero),
    complemento: asNullableString(payload.complemento),
    bairro: asNullableString(payload.bairro),
    cep: asNullableString(payload.cep),
    cidade: asNullableString(payload.cidade),
    uf: (payload.uf as LeadInsert["uf"]) ?? null,
    pais: asNullableString(payload.pais),
    email: asNullableString(payload.email),
    telefone: asNullableString(payload.telefone),
    telefone_e164: asNullableString(payload.telefone_e164),
    origem: (payload.origem as LeadInsert["origem"]) ?? "OUTRO",
    status: (payload.status as LeadInsert["status"]) ?? "NOVO",
    aguardando_produto: payload.aguardando_produto === true,
    mensagem: asNullableString(payload.mensagem),
    imovel_id: asNullableString(payload.imovel_id),
    motivo_desqualificacao: null,
    utm: null,
  });
}

export function validateUpdateLead(
  payload: unknown,
): ApiResult<Partial<Omit<LeadInsert, "owner_id" | "email_lower" | "utm" | "imovel_id">>> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const patch: Partial<Omit<LeadInsert, "owner_id" | "email_lower" | "utm" | "imovel_id">> = {};

  if ("nome" in payload) {
    const nome = asNullableString(payload.nome);
    if (!nome) return fail("VALIDATION_ERROR", "nome is required");
    patch.nome = nome;
  }
  if ("profissao" in payload) patch.profissao = asNullableString(payload.profissao);
  if ("endereco" in payload) patch.endereco = asNullableString(payload.endereco);
  if ("numero" in payload) patch.numero = asNullableString(payload.numero);
  if ("complemento" in payload) patch.complemento = asNullableString(payload.complemento);
  if ("bairro" in payload) patch.bairro = asNullableString(payload.bairro);
  if ("cep" in payload) patch.cep = asNullableString(payload.cep);
  if ("cidade" in payload) patch.cidade = asNullableString(payload.cidade);
  if ("uf" in payload) patch.uf = (payload.uf as LeadInsert["uf"]) ?? null;
  if ("pais" in payload) patch.pais = asNullableString(payload.pais);
  if ("email" in payload) patch.email = asNullableString(payload.email);
  if ("telefone" in payload) patch.telefone = asNullableString(payload.telefone);
  if ("telefone_e164" in payload) patch.telefone_e164 = asNullableString(payload.telefone_e164);
  if ("origem" in payload) patch.origem = payload.origem as LeadInsert["origem"];
  if ("status" in payload) patch.status = payload.status as LeadInsert["status"];
  if ("motivo_desqualificacao" in payload) {
    patch.motivo_desqualificacao =
      (asNullableString(payload.motivo_desqualificacao) as LeadInsert["motivo_desqualificacao"]) ?? null;
  }
  if ("aguardando_produto" in payload) patch.aguardando_produto = payload.aguardando_produto === true;
  if ("mensagem" in payload) patch.mensagem = asNullableString(payload.mensagem);

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  return ok(patch);
}

export function validateAssociateLeadImovel(
  payload: unknown,
): ApiResult<{
  lead_id: string;
  imovel_id: string;
}> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }
  if (typeof payload.imovel_id !== "string" || payload.imovel_id.trim() === "") {
    return fail("VALIDATION_ERROR", "imovel_id is required");
  }

  return ok({
    lead_id: payload.lead_id,
    imovel_id: payload.imovel_id,
  });
}

export function validateCreateLeadLocalizacaoInteresse(
  payload: unknown,
): ApiResult<{
  lead_id: string;
  geolocacao_id?: string | null;
  localizacao_texto?: string | null;
  lat?: number | null;
  lng?: number | null;
  raio_km?: number | null;
}> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }

  const geolocacaoId = asNullableString(payload.geolocacao_id);
  const localizacaoTexto = asNullableString(payload.localizacao_texto);
  const lat = asNullableNumber(payload.lat);
  const lng = asNullableNumber(payload.lng);
  const raioKm = asNullableNumber(payload.raio_km);

  if (!geolocacaoId && !localizacaoTexto && (lat == null || lng == null)) {
    return fail("VALIDATION_ERROR", "Provide geolocacao_id, localizacao_texto or lat/lng");
  }

  return ok({
    lead_id: payload.lead_id.trim(),
    geolocacao_id: geolocacaoId,
    localizacao_texto: localizacaoTexto,
    lat,
    lng,
    raio_km: raioKm,
  });
}

export function validateCreateNegocio(payload: unknown): ApiResult<Omit<NegocioInsert, "owner_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }

  const modalidade =
    (payload.modalidade as NegocioInsert["modalidade"]) ??
    mapLegacyFinalidadeToModalidade((payload.finalidade as NegocioInsert["finalidade"]) ?? null) ??
    "VENDA";
  const fase =
    (payload.fase as NegocioInsert["fase"]) ??
    mapLegacyEtapaToFase((payload.etapa as NegocioInsert["etapa"]) ?? null);
  const subfaseJuridica = (payload.subfase_juridica as NegocioInsert["subfase_juridica"]) ?? null;
  const imovelId = asNullableString(payload.imovel_id);
  const valor = asNullableNumber(payload.valor) ?? asNullableNumber(payload.valor_estimado);
  const comissaopercentual = asNullableNumber(payload.comissaopercentual) ?? null;
  const comissaovalor = asNullableNumber(payload.comissaovalor) ?? null;
  const financiamentovalor = asNullableNumber(payload.financiamentovalor) ?? null;
  const recursopropriovalor = asNullableNumber(payload.recursopropriovalor) ?? null;
  const fgtsvalor = asNullableNumber(payload.fgtsvalor) ?? null;
  const outrosrecursosvalor = asNullableNumber(payload.outrosrecursosvalor) ?? null;
  const observacoes = asNullableString(payload.observacoes) ?? asNullableString(payload.notas);

  if (subfaseJuridica && fase !== "JURIDICO") {
    return fail("VALIDATION_ERROR", "subfase_juridica requires fase JURIDICO");
  }

  if ((fase === "JURIDICO" || fase === "GANHO") && !imovelId) {
    return fail("VALIDATION_ERROR", "imovel_id is required for fase JURIDICO or GANHO");
  }

  const commissionResult = resolveNegocioCommissionFields({
    valor,
    comissaopercentual,
    comissaovalor,
  });
  if (!commissionResult.ok) return commissionResult;

  if (modalidade === "VENDA") {
    if (valor == null) return fail("VALIDATION_ERROR", "valor is required for modalidade VENDA");

    const financialTotal = roundCurrencyValue(
      (financiamentovalor ?? 0) + (recursopropriovalor ?? 0) + (fgtsvalor ?? 0) + (outrosrecursosvalor ?? 0),
    );
    if (financialTotal !== roundCurrencyValue(valor)) {
      return fail("VALIDATION_ERROR", "A composição financeira deve fechar o valor da oportunidade");
    }
  }

  return ok({
    lead_id: payload.lead_id.trim(),
    titulo: asNullableString(payload.titulo),
    modalidade,
    fase,
    subfase_juridica: subfaseJuridica,
    valor,
    comissaopercentual: commissionResult.data.comissaopercentual,
    comissaovalor: commissionResult.data.comissaovalor,
    financiamentovalor,
    recursopropriovalor,
    fgtsvalor,
    outrosrecursosvalor,
    etapa: mapFaseToLegacyEtapa(fase),
    valor_estimado: valor,
    finalidade: mapModalidadeToLegacyFinalidade(modalidade),
    imovel_id: imovelId,
    empreendimento_id: asNullableString(payload.empreendimento_id),
    lista_id: asNullableString(payload.lista_id),
    notas: observacoes,
    observacoes,
    proxima_acao_em: asNullableString(payload.proxima_acao_em),
    fechado_em: asNullableString(payload.fechado_em),
    perdido_em: asNullableString(payload.perdido_em),
    ganho_em: asNullableString(payload.ganho_em),
  });
}

export function validateUpdateNegocio(payload: unknown): ApiResult<NegocioUpdate> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  const patch: NegocioUpdate = {};

  if ("titulo" in payload) patch.titulo = asNullableString(payload.titulo);

  if ("modalidade" in payload || "finalidade" in payload) {
    const modalidade =
      (payload.modalidade as NegocioUpdate["modalidade"]) ??
      mapLegacyFinalidadeToModalidade((payload.finalidade as NegocioUpdate["finalidade"]) ?? null);

    if (modalidade) {
      patch.modalidade = modalidade;
      patch.finalidade = mapModalidadeToLegacyFinalidade(modalidade);
    } else if ("finalidade" in payload) {
      patch.finalidade = (payload.finalidade as NegocioUpdate["finalidade"]) ?? null;
    }
  }

  if ("fase" in payload || "etapa" in payload) {
    const fase =
      (payload.fase as NegocioUpdate["fase"]) ??
      mapLegacyEtapaToFase((payload.etapa as NegocioUpdate["etapa"]) ?? null);

    patch.fase = fase;
    patch.etapa = mapFaseToLegacyEtapa(fase);

    if (fase !== "JURIDICO" && !("subfase_juridica" in payload)) {
      patch.subfase_juridica = null;
    }
  }

  if ("subfase_juridica" in payload) {
    patch.subfase_juridica = (payload.subfase_juridica as NegocioUpdate["subfase_juridica"]) ?? null;
  }

  if ("valor" in payload || "valor_estimado" in payload) {
    const valor = asNullableNumber(payload.valor) ?? asNullableNumber(payload.valor_estimado);
    patch.valor = valor;
    patch.valor_estimado = valor;
  }

  if ("comissaopercentual" in payload) patch.comissaopercentual = asNullableNumber(payload.comissaopercentual);
  if ("comissaovalor" in payload) patch.comissaovalor = asNullableNumber(payload.comissaovalor);

  if ("financiamentovalor" in payload) patch.financiamentovalor = asNullableNumber(payload.financiamentovalor);
  if ("recursopropriovalor" in payload) patch.recursopropriovalor = asNullableNumber(payload.recursopropriovalor);
  if ("fgtsvalor" in payload) patch.fgtsvalor = asNullableNumber(payload.fgtsvalor);
  if ("outrosrecursosvalor" in payload) {
    patch.outrosrecursosvalor = asNullableNumber(payload.outrosrecursosvalor);
  }

  if ("imovel_id" in payload) patch.imovel_id = asNullableString(payload.imovel_id);
  if ("empreendimento_id" in payload)
    patch.empreendimento_id = asNullableString(payload.empreendimento_id);
  if ("lista_id" in payload) patch.lista_id = asNullableString(payload.lista_id);

  if ("observacoes" in payload || "notas" in payload) {
    const observacoes = asNullableString(payload.observacoes) ?? asNullableString(payload.notas);
    patch.observacoes = observacoes;
    patch.notas = observacoes;
  }

  if ("proxima_acao_em" in payload) patch.proxima_acao_em = asNullableString(payload.proxima_acao_em);
  if ("fechado_em" in payload) patch.fechado_em = asNullableString(payload.fechado_em);
  if ("perdido_em" in payload) patch.perdido_em = asNullableString(payload.perdido_em);
  if ("ganho_em" in payload) patch.ganho_em = asNullableString(payload.ganho_em);

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateUpdateLeadBriefing(
  payload: unknown,
): ApiResult<Partial<Omit<LeadBriefingInsert, "id" | "owner_id" | "lead_id" | "created_at" | "updated_at">>> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const patch: Partial<Omit<LeadBriefingInsert, "id" | "owner_id" | "lead_id" | "created_at" | "updated_at">> = {};

  if ("objetivolead" in payload)
    patch.objetivolead = asNullableStringArray(payload.objetivolead) as LeadBriefingInsert["objetivolead"];
  if ("tipouso" in payload) patch.tipouso = (payload.tipouso as LeadBriefingInsert["tipouso"]) ?? null;
  if ("tipoimovel" in payload) patch.tipoimovel = asNullableStringArray(payload.tipoimovel) as LeadBriefingInsert["tipoimovel"];
  if ("categoriaimovel" in payload) patch.categoriaimovel = asNullableStringArray(payload.categoriaimovel);
  if ("subcategoriaimovel" in payload) patch.subcategoriaimovel = asNullableStringArray(payload.subcategoriaimovel);
  if ("construcao" in payload)
    patch.construcao = asNullableStringArray(payload.construcao) as LeadBriefingInsert["construcao"];
  if ("tiponegociacao" in payload)
    patch.tiponegociacao = asNullableStringArray(payload.tiponegociacao) as LeadBriefingInsert["tiponegociacao"];
  if ("intencao_compra" in payload)
    patch.intencao_compra = (payload.intencao_compra as LeadBriefingInsert["intencao_compra"]) ?? null;
  if ("valor_min" in payload) patch.valor_min = asNullableNumber(payload.valor_min);
  if ("valor_max" in payload) patch.valor_max = asNullableNumber(payload.valor_max);
  if ("area_util_min" in payload) patch.area_util_min = asNullableNumber(payload.area_util_min);
  if ("area_util_max" in payload) patch.area_util_max = asNullableNumber(payload.area_util_max);
  if ("quartos_min" in payload) patch.quartos_min = asNullableInteger(payload.quartos_min);
  if ("suites_min" in payload) patch.suites_min = asNullableInteger(payload.suites_min);
  if ("vagas_min" in payload) patch.vagas_min = asNullableInteger(payload.vagas_min);
  if ("caracteristicas_residenciais" in payload) {
    patch.caracteristicas_residenciais = asNullableStringArray(
      payload.caracteristicas_residenciais,
    ) as LeadBriefingInsert["caracteristicas_residenciais"];
  }
  if ("area_util_min_comercial" in payload) {
    patch.area_util_min_comercial = asNullableNumber(payload.area_util_min_comercial);
  }
  if ("area_util_max_comercial" in payload) {
    patch.area_util_max_comercial = asNullableNumber(payload.area_util_max_comercial);
  }
  if ("vagas_min_comercial" in payload) {
    patch.vagas_min_comercial = asNullableInteger(payload.vagas_min_comercial);
  }
  if ("caracteristicas_comerciais" in payload) {
    patch.caracteristicas_comerciais = asNullableStringArray(
      payload.caracteristicas_comerciais,
    ) as LeadBriefingInsert["caracteristicas_comerciais"];
  }
  if ("geolocacao_id" in payload) patch.geolocacao_id = asNullableString(payload.geolocacao_id);
  if ("localizacao_texto" in payload) patch.localizacao_texto = asNullableString(payload.localizacao_texto);
  if ("lat" in payload) patch.lat = asNullableNumber(payload.lat);
  if ("lng" in payload) patch.lng = asNullableNumber(payload.lng);
  if ("raio_km" in payload) patch.raio_km = asNullableNumber(payload.raio_km);
  if ("texto_livre" in payload) patch.texto_livre = asNullableString(payload.texto_livre);
  if ("conteudos" in payload)
    patch.conteudos = asNullableStringArray(payload.conteudos) as LeadBriefingInsert["conteudos"];
  if ("canais" in payload)
    patch.canais = asNullableStringArray(payload.canais) as LeadBriefingInsert["canais"];

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No briefing fields provided to update");
  }

  return ok(patch);
}

export function validateCreateAtividade(
  payload: unknown,
): ApiResult<CreateAtividadeInput> {
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
  if (typeof payload.categoria !== "string" || payload.categoria.trim() === "") {
    return fail("VALIDATION_ERROR", "categoria is required");
  }
  if (typeof payload.modelo !== "string" || payload.modelo.trim() === "") {
    return fail("VALIDATION_ERROR", "modelo is required");
  }

  const categoria = payload.categoria as NonNullable<AtividadeInsert["categoria"]>;
  const modelo = payload.modelo as NonNullable<AtividadeInsert["modelo"]>;
  if (!isValidActivityModelForCategory(categoria, modelo)) {
    return fail("VALIDATION_ERROR", "modelo must be compatible with categoria");
  }

  return ok({
    lead_id: payload.lead_id,
    negocio_id: asNullableString(payload.negocio_id),
    categoria,
    modelo,
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
  if ("categoria" in payload) patch.categoria = payload.categoria as AtividadeUpdate["categoria"];
  if ("modelo" in payload) patch.modelo = payload.modelo as AtividadeUpdate["modelo"];
  if ("tipo" in payload) patch.tipo = payload.tipo as AtividadeUpdate["tipo"];
  if ("titulo" in payload) patch.titulo = asNullableString(payload.titulo) ?? undefined;
  if ("descricao" in payload) patch.descricao = asNullableString(payload.descricao);
  if ("quando_em" in payload) patch.quando_em = asNullableString(payload.quando_em);
  if ("status" in payload) patch.status = payload.status as AtividadeUpdate["status"];
  if ("concluida_em" in payload) patch.concluida_em = asNullableString(payload.concluida_em);

  if (patch.categoria && patch.modelo && !isValidActivityModelForCategory(patch.categoria, patch.modelo)) {
    return fail("VALIDATION_ERROR", "modelo must be compatible with categoria");
  }

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateCreateProposta(payload: unknown): ApiResult<PropostaCreateValidated> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.lead_id !== "string" || payload.lead_id.trim() === "") {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }
  if (typeof payload.negocio_id !== "string" || payload.negocio_id.trim() === "") {
    return fail("VALIDATION_ERROR", "negocio_id is required");
  }
  if (typeof payload.titulo !== "string" || payload.titulo.trim() === "") {
    return fail("VALIDATION_ERROR", "titulo is required");
  }
  if (typeof payload.tipo !== "string" || payload.tipo.trim() === "") {
    return fail("VALIDATION_ERROR", "tipo is required");
  }

  return ok({
    lead_id: payload.lead_id,
    negocio_id: payload.negocio_id,
    titulo: payload.titulo,
    tipo: payload.tipo as PropostaInsert["tipo"],
    status: (payload.status as PropostaInsert["status"]) ?? "RASCUNHO",
    valor: asNullableNumber(payload.valor),
    conteudo: asNullableJson(payload.conteudo),
    arquivo_midia_id: asNullableString(payload.arquivo_midia_id),
    enviada_em: asNullableString(payload.enviada_em),
    vencimento_em: asNullableString(payload.vencimento_em),
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
  if ("vencimento_em" in payload) patch.vencimento_em = asNullableString(payload.vencimento_em);

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateCreateNegocioParte(payload: unknown): ApiResult<Omit<NegocioParteInsert, "owner_id" | "negocio_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");
  if (typeof payload.papel !== "string" || payload.papel.trim() === "") {
    return fail("VALIDATION_ERROR", "papel is required");
  }
  if (typeof payload.tipo_pessoa !== "string" || payload.tipo_pessoa.trim() === "") {
    return fail("VALIDATION_ERROR", "tipo_pessoa is required");
  }

  const tipoPessoa = payload.tipo_pessoa as NegocioParteInsert["tipo_pessoa"];
  const razaoSocial = asNullableString(payload.razao_social);
  const cnpj = asNullableString(payload.cnpj);

  if (tipoPessoa === "JURIDICA") {
    if (!razaoSocial) return fail("VALIDATION_ERROR", "razao_social is required for tipo_pessoa JURIDICA");
    if (!cnpj) return fail("VALIDATION_ERROR", "cnpj is required for tipo_pessoa JURIDICA");
  }

  if (tipoPessoa === "FISICA" && (razaoSocial || cnpj)) {
    return fail("VALIDATION_ERROR", "razao_social and cnpj must be null for tipo_pessoa FISICA");
  }

  return ok({
    papel: payload.papel as NegocioParteInsert["papel"],
    tipo_pessoa: tipoPessoa,
    razao_social: tipoPessoa === "JURIDICA" ? razaoSocial : null,
    cnpj: tipoPessoa === "JURIDICA" ? cnpj : null,
    cep: asNullableString(payload.cep),
    endereco: asNullableString(payload.endereco),
    numero: asNullableString(payload.numero),
    complemento: asNullableString(payload.complemento),
    bairro: asNullableString(payload.bairro),
    cidade: asNullableString(payload.cidade),
    uf: (payload.uf as NegocioParteInsert["uf"]) ?? null,
    pais: asNullableString(payload.pais),
  });
}

export function validateUpdateNegocioParte(payload: unknown): ApiResult<Omit<NegocioParteUpdate, "owner_id" | "negocio_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const patch: Omit<NegocioParteUpdate, "owner_id" | "negocio_id"> = {};
  if ("papel" in payload) patch.papel = payload.papel as NegocioParteUpdate["papel"];
  if ("tipo_pessoa" in payload) patch.tipo_pessoa = payload.tipo_pessoa as NegocioParteUpdate["tipo_pessoa"];
  if ("razao_social" in payload) patch.razao_social = asNullableString(payload.razao_social);
  if ("cnpj" in payload) patch.cnpj = asNullableString(payload.cnpj);
  if ("cep" in payload) patch.cep = asNullableString(payload.cep);
  if ("endereco" in payload) patch.endereco = asNullableString(payload.endereco);
  if ("numero" in payload) patch.numero = asNullableString(payload.numero);
  if ("complemento" in payload) patch.complemento = asNullableString(payload.complemento);
  if ("bairro" in payload) patch.bairro = asNullableString(payload.bairro);
  if ("cidade" in payload) patch.cidade = asNullableString(payload.cidade);
  if ("uf" in payload) patch.uf = (payload.uf as NegocioParteUpdate["uf"]) ?? null;
  if ("pais" in payload) patch.pais = asNullableString(payload.pais);

  if (patch.tipo_pessoa === "FISICA") {
    if (patch.razao_social != null || patch.cnpj != null) {
      return fail("VALIDATION_ERROR", "razao_social and cnpj must be null for tipo_pessoa FISICA");
    }
  }

  if (patch.tipo_pessoa === "JURIDICA") {
    if ("razao_social" in patch && !patch.razao_social) {
      return fail("VALIDATION_ERROR", "razao_social is required for tipo_pessoa JURIDICA");
    }
    if ("cnpj" in patch && !patch.cnpj) {
      return fail("VALIDATION_ERROR", "cnpj is required for tipo_pessoa JURIDICA");
    }
  }

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateCreateNegocioPartePessoa(
  payload: unknown,
): ApiResult<Omit<NegocioPartePessoaInsert, "owner_id" | "negocio_parte_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const nomeCompleto = asNullableString(payload.nome_completo);
  if (!nomeCompleto) return fail("VALIDATION_ERROR", "nome_completo is required");
  const email = asNullableString(payload.email);
  if (!email) return fail("VALIDATION_ERROR", "email is required");
  const telefone = asNullableString(payload.telefone);
  if (!telefone) return fail("VALIDATION_ERROR", "telefone is required");
  const cpfRaw = asNullableString(payload.cpf);
  if (!cpfRaw) return fail("VALIDATION_ERROR", "cpf is required");
  const cpf = onlyDigits(cpfRaw, 11);
  if (!isValidCpf(cpf)) return fail("VALIDATION_ERROR", "cpf is invalid");
  const cep = asNullableString(payload.cep);
  if (!cep) return fail("VALIDATION_ERROR", "cep is required");
  const endereco = asNullableString(payload.endereco);
  if (!endereco) return fail("VALIDATION_ERROR", "endereco is required");
  const numero = asNullableString(payload.numero);
  if (!numero) return fail("VALIDATION_ERROR", "numero is required");
  const bairro = asNullableString(payload.bairro);
  if (!bairro) return fail("VALIDATION_ERROR", "bairro is required");
  const cidade = asNullableString(payload.cidade);
  if (!cidade) return fail("VALIDATION_ERROR", "cidade is required");
  const uf = asNullableString(payload.uf);
  if (!uf) return fail("VALIDATION_ERROR", "uf is required");
  const pais = asNullableString(payload.pais);
  if (!pais) return fail("VALIDATION_ERROR", "pais is required");

  return ok({
    nome_completo: nomeCompleto,
    email,
    telefone,
    cpf,
    cep,
    endereco,
    numero,
    complemento: asNullableString(payload.complemento),
    bairro,
    cidade,
    uf: uf as NegocioPartePessoaInsert["uf"],
    pais,
  });
}

export function validateUpdateNegocioPartePessoa(
  payload: unknown,
): ApiResult<Omit<NegocioPartePessoaUpdate, "owner_id" | "negocio_parte_id">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const patch: Omit<NegocioPartePessoaUpdate, "owner_id" | "negocio_parte_id"> = {};

  if ("nome_completo" in payload) {
    const value = asNullableString(payload.nome_completo);
    if (!value) return fail("VALIDATION_ERROR", "nome_completo is required");
    patch.nome_completo = value;
  }
  if ("email" in payload) {
    const value = asNullableString(payload.email);
    if (!value) return fail("VALIDATION_ERROR", "email is required");
    patch.email = value;
  }
  if ("telefone" in payload) {
    const value = asNullableString(payload.telefone);
    if (!value) return fail("VALIDATION_ERROR", "telefone is required");
    patch.telefone = value;
  }
  if ("cpf" in payload) {
    const value = asNullableString(payload.cpf);
    if (!value) return fail("VALIDATION_ERROR", "cpf is required");
    const cpf = onlyDigits(value, 11);
    if (!isValidCpf(cpf)) return fail("VALIDATION_ERROR", "cpf is invalid");
    patch.cpf = cpf;
  }
  if ("cep" in payload) {
    const value = asNullableString(payload.cep);
    if (!value) return fail("VALIDATION_ERROR", "cep is required");
    patch.cep = value;
  }
  if ("endereco" in payload) {
    const value = asNullableString(payload.endereco);
    if (!value) return fail("VALIDATION_ERROR", "endereco is required");
    patch.endereco = value;
  }
  if ("numero" in payload) {
    const value = asNullableString(payload.numero);
    if (!value) return fail("VALIDATION_ERROR", "numero is required");
    patch.numero = value;
  }
  if ("complemento" in payload) patch.complemento = asNullableString(payload.complemento);
  if ("bairro" in payload) {
    const value = asNullableString(payload.bairro);
    if (!value) return fail("VALIDATION_ERROR", "bairro is required");
    patch.bairro = value;
  }
  if ("cidade" in payload) {
    const value = asNullableString(payload.cidade);
    if (!value) return fail("VALIDATION_ERROR", "cidade is required");
    patch.cidade = value;
  }
  if ("uf" in payload) {
    const value = asNullableString(payload.uf);
    if (!value) return fail("VALIDATION_ERROR", "uf is required");
    patch.uf = value as NegocioPartePessoaUpdate["uf"];
  }
  if ("pais" in payload) {
    const value = asNullableString(payload.pais);
    if (!value) return fail("VALIDATION_ERROR", "pais is required");
    patch.pais = value;
  }

  if (Object.keys(patch).length === 0) return fail("VALIDATION_ERROR", "No fields provided to update");
  return ok(patch);
}

export function validateCreateNegocioCorretor(
  payload: unknown,
): ApiResult<Omit<NegocioCorretorInsert, "id" | "owner_id" | "negocio_id" | "created_at" | "updated_at">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const nome = asNullableString(payload.nome);
  if (!nome) return fail("VALIDATION_ERROR", "nome is required");

  const percentualComissao = asNullableNumber(payload.percentual_comissao);
  if ("percentual_comissao" in payload && percentualComissao === undefined) {
    return fail("VALIDATION_ERROR", "percentual_comissao must be a number");
  }
  if (percentualComissao != null && (percentualComissao < 0 || percentualComissao > 100)) {
    return fail("VALIDATION_ERROR", "percentual_comissao must be between 0 and 100");
  }

  const valorComissao = asNullableNumber(payload.valor_comissao);
  if ("valor_comissao" in payload && valorComissao === undefined) {
    return fail("VALIDATION_ERROR", "valor_comissao must be a number");
  }
  if (valorComissao != null && valorComissao < 0) {
    return fail("VALIDATION_ERROR", "valor_comissao must be greater or equal to 0");
  }

  return ok({
    nome,
    email: asNullableString(payload.email),
    telefone: asNullableString(payload.telefone),
    percentual_comissao: percentualComissao ?? null,
    valor_comissao: valorComissao ?? null,
    vinculado_corretor_parceiro: payload.vinculado_corretor_parceiro === true,
  });
}

export function validateUpdateNegocioCorretor(
  payload: unknown,
): ApiResult<Omit<NegocioCorretorUpdate, "id" | "owner_id" | "negocio_id" | "created_at" | "updated_at">> {
  if (!asObject(payload)) return fail("VALIDATION_ERROR", "Body must be a JSON object");

  const patch: Omit<NegocioCorretorUpdate, "id" | "owner_id" | "negocio_id" | "created_at" | "updated_at"> = {};

  if ("nome" in payload) {
    const value = asNullableString(payload.nome);
    if (!value) return fail("VALIDATION_ERROR", "nome is required");
    patch.nome = value;
  }

  if ("email" in payload) patch.email = asNullableString(payload.email);
  if ("telefone" in payload) patch.telefone = asNullableString(payload.telefone);

  if ("percentual_comissao" in payload) {
    const value = asNullableNumber(payload.percentual_comissao);
    if (value === undefined) return fail("VALIDATION_ERROR", "percentual_comissao must be a number");
    if (value != null && (value < 0 || value > 100)) {
      return fail("VALIDATION_ERROR", "percentual_comissao must be between 0 and 100");
    }
    patch.percentual_comissao = value;
  }

  if ("valor_comissao" in payload) {
    const value = asNullableNumber(payload.valor_comissao);
    if (value === undefined) return fail("VALIDATION_ERROR", "valor_comissao must be a number");
    if (value != null && value < 0) {
      return fail("VALIDATION_ERROR", "valor_comissao must be greater or equal to 0");
    }
    patch.valor_comissao = value;
  }

  if ("vinculado_corretor_parceiro" in payload) {
    patch.vinculado_corretor_parceiro = payload.vinculado_corretor_parceiro === true;
  }

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
