import type { SupabaseClient } from "@supabase/supabase-js";

import { fail, ok, type ApiResult } from "@/lib/api/result";
import { isVisitActivity } from "@/lib/crm/activity-playbook";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError as mapAuthenticatedDbError } from "@/lib/db/_errors";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LeadCaptureInput } from "@/lib/validation/lead-capture";

type DbErrorLike = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type LeadBriefingRow = Database["public"]["Tables"]["lead_briefings"]["Row"];
type LeadBriefingInsert = Database["public"]["Tables"]["lead_briefings"]["Insert"];
type LeadBriefingUpdate = Database["public"]["Tables"]["lead_briefings"]["Update"];
type LeadImovelRow = Database["public"]["Tables"]["lead_imoveis"]["Row"];
type LeadLocalizacaoInteresseRow = Database["public"]["Tables"]["lead_localizacoes_interesse"]["Row"];
type LeadLocalizacaoInteresseInsert = Database["public"]["Tables"]["lead_localizacoes_interesse"]["Insert"];
type NegocioRow = Database["public"]["Tables"]["negocios"]["Row"];
type AtividadeRow = Database["public"]["Tables"]["atividades"]["Row"];
type PropostaRow = Database["public"]["Tables"]["propostas"]["Row"];
type TimelineEventoRow = Database["public"]["Tables"]["timeline_eventos"]["Row"];
type GeolocacaoRow = Database["public"]["Tables"]["geolocacoes"]["Row"];
type ImovelRow = Database["public"]["Tables"]["imoveis"]["Row"];
type ImovelMidiaPublicaRow = Database["public"]["Tables"]["imovel_midia_publica"]["Row"];
type UserBriefingRow = Database["public"]["Tables"]["user_briefings"]["Row"];

type CaptureOutcome = {
  lead_id: string;
  action: "created" | "updated";
};

function normalizeLocationText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildLeadLocationText(parts: Array<string | null | undefined>) {
  return parts
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join(" - ");
}

function areCloseCoordinates(
  leftLat: number | null | undefined,
  leftLng: number | null | undefined,
  rightLat: number | null | undefined,
  rightLng: number | null | undefined,
) {
  if (leftLat == null || leftLng == null || rightLat == null || rightLng == null) return false;
  return Math.abs(leftLat - rightLat) < 0.00001 && Math.abs(leftLng - rightLng) < 0.00001;
}

function mapLeadLocalizacaoWorkspaceItem(params: {
  item: Pick<LeadLocalizacaoInteresseRow, "id" | "geolocacao_id" | "localizacao_texto" | "lat" | "lng" | "raio_km" | "created_at">;
  geolocacao?: Pick<GeolocacaoRow, "endereco_formatado" | "bairro" | "cidade" | "uf" | "lat" | "lng"> | null;
}): LeadWorkspaceLocalizacaoItem {
  const { item, geolocacao } = params;

  return {
    id: item.id,
    geolocacao_id: item.geolocacao_id,
    localizacao_texto: item.localizacao_texto,
    endereco_formatado: geolocacao?.endereco_formatado ?? null,
    bairro: geolocacao?.bairro ?? null,
    cidade: geolocacao?.cidade ?? null,
    estado: geolocacao?.uf ?? null,
    lat: item.lat ?? geolocacao?.lat ?? null,
    lng: item.lng ?? geolocacao?.lng ?? null,
    raio_km: item.raio_km,
    created_at: item.created_at,
  };
}

const LEAD_BRIEFING_SELECT = [
  "id",
  "objetivolead",
  "tipouso",
  "tipoimovel",
  "categoriaimovel",
  "subcategoriaimovel",
  "construcao",
  "tiponegociacao",
  "intencao_compra",
  "valor_min",
  "valor_max",
  "area_util_min",
  "area_util_max",
  "quartos_min",
  "suites_min",
  "vagas_min",
  "caracteristicas_residenciais",
  "area_util_min_comercial",
  "area_util_max_comercial",
  "vagas_min_comercial",
  "caracteristicas_comerciais",
  "geolocacao_id",
  "localizacao_texto",
  "lat",
  "lng",
  "raio_km",
  "texto_livre",
  "conteudos",
  "canais",
  "created_at",
  "updated_at",
].join(",");

type LeadBriefingShape = Pick<
  LeadBriefingRow,
  | "id"
  | "objetivolead"
  | "tipouso"
  | "tipoimovel"
  | "categoriaimovel"
  | "subcategoriaimovel"
  | "construcao"
  | "tiponegociacao"
  | "intencao_compra"
  | "valor_min"
  | "valor_max"
  | "area_util_min"
  | "area_util_max"
  | "quartos_min"
  | "suites_min"
  | "vagas_min"
  | "caracteristicas_residenciais"
  | "area_util_min_comercial"
  | "area_util_max_comercial"
  | "vagas_min_comercial"
  | "caracteristicas_comerciais"
  | "geolocacao_id"
  | "localizacao_texto"
  | "lat"
  | "lng"
  | "raio_km"
  | "texto_livre"
  | "conteudos"
  | "canais"
  | "created_at"
  | "updated_at"
>;

export type UpdateLeadBriefingInput = Partial<
  Omit<LeadBriefingInsert, "id" | "owner_id" | "lead_id" | "created_at" | "updated_at">
>;

export type CreateLeadInput = {
  nome: string;
  profissao?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  uf?: LeadInsert["uf"];
  pais?: string | null;
  email?: string | null;
  telefone?: string | null;
  telefone_e164?: string | null;
  origem?: LeadInsert["origem"];
  status?: LeadInsert["status"];
  aguardando_produto?: boolean;
  mensagem?: string | null;
  imovel_id?: string | null;
};

export type UpdateLeadInput = {
  nome?: string | null;
  profissao?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  uf?: LeadInsert["uf"];
  pais?: string | null;
  email?: string | null;
  telefone?: string | null;
  telefone_e164?: string | null;
  origem?: LeadInsert["origem"];
  status?: LeadInsert["status"];
  motivo_desqualificacao?: LeadInsert["motivo_desqualificacao"];
  aguardando_produto?: boolean;
  mensagem?: string | null;
};

export type LeadWorkspaceImovelItem = {
  id: string;
  relacao_id: string | null;
  titulo: string | null;
  codigo: string | null;
  tipo: string | null;
  subtipo: string | null;
  tipo_negociacao: string | null;
  logradouro: string | null;
  numero: string | null;
  finalidade: string | null;
  status: string | null;
  bairro_comercial: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  area_util: number | null;
  area_terreno: number | null;
  dormitorios: number | null;
  suites: number | null;
  salas: number | null;
  vagas: number | null;
  lat: number | null;
  lng: number | null;
  preco_venda: number | null;
  preco_locacao: number | null;
  comissao_venda_percentual: number | null;
  foto_url: string | null;
  associado_em: string | null;
};

export type LeadWorkspaceLocalizacaoItem = {
  id: string;
  geolocacao_id: string | null;
  localizacao_texto: string | null;
  endereco_formatado: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  lat: number | null;
  lng: number | null;
  raio_km: number | null;
  created_at: string;
};

export type LeadWorkspace = {
  lead: Pick<
    LeadRow,
    | "id"
    | "nome"
    | "profissao"
    | "endereco"
    | "numero"
    | "complemento"
    | "bairro"
    | "cep"
    | "cidade"
    | "uf"
    | "pais"
    | "email"
    | "telefone"
    | "telefone_e164"
    | "origem"
    | "status"
    | "motivo_desqualificacao"
    | "aguardando_produto"
    | "mensagem"
    | "created_at"
    | "updated_at"
  >;
  briefing: LeadBriefingShape | null;
  summary: {
    finalidades: Array<NonNullable<NegocioRow["finalidade"]>>;
    valor_min: number | null;
    valor_max: number | null;
    atividades_total: number;
    atividades_pendentes: number;
    propostas_total: number;
    negocios_total: number;
    oportunidades_total: number;
    proxima_visita_em: string | null;
  };
  imoveis_interesse: LeadWorkspaceImovelItem[];
  localizacoes_interesse: LeadWorkspaceLocalizacaoItem[];
  atividades: Array<
    Pick<AtividadeRow, "id" | "categoria" | "modelo" | "titulo" | "tipo" | "status" | "descricao" | "quando_em" | "created_at">
  >;
  propostas: Array<
    Pick<PropostaRow, "id" | "negocio_id" | "titulo" | "tipo" | "status" | "valor" | "created_at" | "updated_at">
  >;
  negocios: Array<
    Pick<
      NegocioRow,
      | "id"
      | "titulo"
      | "modalidade"
      | "fase"
      | "subfase_juridica"
      | "etapa"
      | "finalidade"
      | "valor"
      | "valor_estimado"
      | "comissaopercentual"
      | "comissaovalor"
      | "imovel_id"
      | "observacoes"
      | "proxima_acao_em"
      | "created_at"
      | "updated_at"
    >
  >;
  timeline: Array<Pick<TimelineEventoRow, "id" | "tipo" | "titulo" | "detalhes" | "created_at">>;
};

export type LeadDirectoryItem = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: LeadRow["origem"];
  status: LeadRow["status"];
  aguardando_produto: boolean;
  created_at: string;
  updated_at: string;
  interesse: NegocioRow["finalidade"] | null;
  imoveis_interesse_total: number;
  ultimo_imovel_interesse: {
    imovel_id: string;
    titulo: string | null;
    codigo: string | null;
    cidade: string | null;
    estado: string | null;
    foto_url: string | null;
    interesse_em: string | null;
  } | null;
  atividades_total: number;
  atividades_pendentes: number;
  proxima_atividade_em: string | null;
  proxima_visita_em: string | null;
  negocios_total: number;
  oportunidades_total: number;
  propostas_total: number;
  maior_valor: number | null;
};

export type LeadLookupItem = Pick<
  LeadRow,
  "id" | "nome" | "email" | "telefone" | "origem" | "status" | "created_at" | "updated_at"
>;

function mapLeadCaptureDbError<T>(error: DbErrorLike): ApiResult<T> {
  if (error.code === "23505") {
    return fail("CONFLICT", error.message, { details: error.details, hint: error.hint });
  }

  if (error.code === "23514" || error.code === "P0001") {
    return fail("VALIDATION_ERROR", error.message, {
      details: error.details,
      hint: error.hint,
    });
  }

  return fail("DATABASE_ERROR", error.message, { details: error.details, hint: error.hint });
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length === 0 ? null : normalized;
}

function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = phone.trim();
  return normalized.length === 0 ? null : normalized;
}

function trimNullableString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeBriefingStringArray<T extends string>(value: T[] | null | undefined): T[] | null {
  if (!value || value.length === 0) return null;
  const normalized = value
    .map((item) => item.trim())
    .filter((item): item is T => item.length > 0);
  return normalized.length > 0 ? normalized : null;
}

function deriveTipoNegociacaoFromObjetivoLead(
  objetivos: LeadBriefingInsert["objetivolead"] | null | undefined,
): LeadBriefingInsert["tiponegociacao"] {
  const values = new Set(objetivos ?? []);
  const derived: NonNullable<LeadBriefingInsert["tiponegociacao"]> = [];
  if (values.has("COMPRAR") || values.has("VENDER")) derived.push("VENDA");
  if (values.has("ALUGAR")) derived.push("ALUGUEL");
  return derived.length > 0 ? derived : null;
}

function deriveObjetivoLeadFromTipoNegociacao(
  tipos: LeadBriefingInsert["tiponegociacao"] | null | undefined,
): LeadBriefingInsert["objetivolead"] {
  const values = new Set(tipos ?? []);
  const derived: NonNullable<LeadBriefingInsert["objetivolead"]> = [];
  if (values.has("VENDA")) derived.push("COMPRAR");
  if (values.has("ALUGUEL")) derived.push("ALUGAR");
  return derived.length > 0 ? derived : null;
}

function buildLeadBriefingPatch(input: UpdateLeadBriefingInput): LeadBriefingUpdate {
  const payload: LeadBriefingUpdate = {};

  if (Object.prototype.hasOwnProperty.call(input, "objetivolead")) {
    payload.objetivolead = normalizeBriefingStringArray(input.objetivolead);
    payload.tiponegociacao = deriveTipoNegociacaoFromObjetivoLead(payload.objetivolead);
  }
  if (Object.prototype.hasOwnProperty.call(input, "tipouso")) payload.tipouso = input.tipouso ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "tipoimovel")) {
    payload.tipoimovel = normalizeBriefingStringArray(input.tipoimovel);
  }
  if (Object.prototype.hasOwnProperty.call(input, "categoriaimovel")) {
    payload.categoriaimovel = normalizeBriefingStringArray(input.categoriaimovel);
  }
  if (Object.prototype.hasOwnProperty.call(input, "subcategoriaimovel")) {
    payload.subcategoriaimovel = normalizeBriefingStringArray(input.subcategoriaimovel);
  }
  if (Object.prototype.hasOwnProperty.call(input, "construcao")) {
    payload.construcao = normalizeBriefingStringArray(input.construcao);
  }
  if (
    Object.prototype.hasOwnProperty.call(input, "tiponegociacao") &&
    !Object.prototype.hasOwnProperty.call(input, "objetivolead")
  ) {
    payload.tiponegociacao = normalizeBriefingStringArray(input.tiponegociacao);
    payload.objetivolead = deriveObjetivoLeadFromTipoNegociacao(payload.tiponegociacao);
  }
  if (Object.prototype.hasOwnProperty.call(input, "intencao_compra")) {
    payload.intencao_compra = input.intencao_compra ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "valor_min")) payload.valor_min = input.valor_min ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "valor_max")) payload.valor_max = input.valor_max ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "area_util_min")) {
    payload.area_util_min = input.area_util_min ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "area_util_max")) {
    payload.area_util_max = input.area_util_max ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "quartos_min")) payload.quartos_min = input.quartos_min ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "suites_min")) payload.suites_min = input.suites_min ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "vagas_min")) payload.vagas_min = input.vagas_min ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "caracteristicas_residenciais")) {
    payload.caracteristicas_residenciais = normalizeBriefingStringArray(input.caracteristicas_residenciais);
  }
  if (Object.prototype.hasOwnProperty.call(input, "area_util_min_comercial")) {
    payload.area_util_min_comercial = input.area_util_min_comercial ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "area_util_max_comercial")) {
    payload.area_util_max_comercial = input.area_util_max_comercial ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "vagas_min_comercial")) {
    payload.vagas_min_comercial = input.vagas_min_comercial ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "caracteristicas_comerciais")) {
    payload.caracteristicas_comerciais = normalizeBriefingStringArray(input.caracteristicas_comerciais);
  }
  if (Object.prototype.hasOwnProperty.call(input, "geolocacao_id")) {
    payload.geolocacao_id = trimNullableString(input.geolocacao_id);
  }
  if (Object.prototype.hasOwnProperty.call(input, "localizacao_texto")) {
    payload.localizacao_texto = trimNullableString(input.localizacao_texto);
  }
  if (Object.prototype.hasOwnProperty.call(input, "lat")) payload.lat = input.lat ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "lng")) payload.lng = input.lng ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "raio_km")) payload.raio_km = input.raio_km ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "texto_livre")) {
    payload.texto_livre = trimNullableString(input.texto_livre);
  }
  if (Object.prototype.hasOwnProperty.call(input, "conteudos")) {
    payload.conteudos = normalizeBriefingStringArray(input.conteudos);
  }
  if (Object.prototype.hasOwnProperty.call(input, "canais")) {
    payload.canais = normalizeBriefingStringArray(input.canais);
  }

  return payload;
}

function extractLeadBriefingFromUserBriefing(
  briefing: Pick<
    UserBriefingRow,
    | "objetivolead"
    | "tipouso"
    | "tipoimovel"
    | "categoriaimovel"
    | "subcategoriaimovel"
    | "construcao"
    | "tiponegociacao"
    | "intencao_compra"
    | "valor_min"
    | "valor_max"
    | "area_util_min"
    | "area_util_max"
    | "quartos_min"
    | "suites_min"
    | "vagas_min"
    | "caracteristicas_residenciais"
    | "area_util_min_comercial"
    | "area_util_max_comercial"
    | "vagas_min_comercial"
    | "caracteristicas_comerciais"
    | "geolocacao_id"
    | "localizacao_texto"
    | "lat"
    | "lng"
    | "raio_km"
    | "texto_livre"
    | "conteudos"
    | "canais"
  >,
): Omit<LeadBriefingInsert, "id" | "owner_id" | "lead_id" | "created_at" | "updated_at"> {
  return {
    objetivolead: briefing.objetivolead ?? deriveObjetivoLeadFromTipoNegociacao(briefing.tiponegociacao),
    tipouso: briefing.tipouso,
    tipoimovel: briefing.tipoimovel,
    categoriaimovel: briefing.categoriaimovel,
    subcategoriaimovel: briefing.subcategoriaimovel,
    construcao: briefing.construcao,
    tiponegociacao: briefing.tiponegociacao,
    intencao_compra: briefing.intencao_compra,
    valor_min: briefing.valor_min,
    valor_max: briefing.valor_max,
    area_util_min: briefing.area_util_min,
    area_util_max: briefing.area_util_max,
    quartos_min: briefing.quartos_min,
    suites_min: briefing.suites_min,
    vagas_min: briefing.vagas_min,
    caracteristicas_residenciais: briefing.caracteristicas_residenciais,
    area_util_min_comercial: briefing.area_util_min_comercial,
    area_util_max_comercial: briefing.area_util_max_comercial,
    vagas_min_comercial: briefing.vagas_min_comercial,
    caracteristicas_comerciais: briefing.caracteristicas_comerciais,
    geolocacao_id: briefing.geolocacao_id,
    localizacao_texto: briefing.localizacao_texto,
    lat: briefing.lat,
    lng: briefing.lng,
    raio_km: briefing.raio_km,
    texto_livre: briefing.texto_livre,
    conteudos: briefing.conteudos,
    canais: briefing.canais,
  };
}

type SafeTimelineClient = {
  from: (table: string) => {
    insert: (value: unknown) => Promise<{ error: DbErrorLike | null }>;
  };
};

async function insertLeadSystemTimelineEvent(
  client: SupabaseClient<Database>,
  ownerId: string,
  leadId: string,
  title: string,
  details: Record<string, unknown>,
): Promise<void> {
  const timelineClient = client as unknown as SafeTimelineClient;
  const result = await timelineClient.from("timeline_eventos").insert({
    owner_id: ownerId,
    lead_id: leadId,
    tipo: "SISTEMA",
    titulo: title,
    detalhes: details,
  });

  if (result.error) {
    // If table is still absent in some env, do not break lead ingestion.
    if (result.error.code === "42P01") return;
    throw new Error(result.error.message);
  }
}

async function findExistingLeadByKeys(
  client: SupabaseClient<Database>,
  ownerId: string,
  emailLower: string | null,
  phoneE164: string | null,
): Promise<ApiResult<LeadRow | null>> {
  let byEmail: LeadRow | null = null;
  let byPhone: LeadRow | null = null;

  if (emailLower) {
    const query = await client
      .from("leads")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("email_lower", emailLower)
      .maybeSingle();
    if (query.error) return mapLeadCaptureDbError(query.error);
    byEmail = query.data;
  }

  if (phoneE164) {
    const query = await client
      .from("leads")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("telefone_e164", phoneE164)
      .maybeSingle();
    if (query.error) return mapLeadCaptureDbError(query.error);
    byPhone = query.data;
  }

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    return fail(
      "CONFLICT",
      "Capture keys match different leads for the same owner",
      {
        lead_id_email: byEmail.id,
        lead_id_phone: byPhone.id,
      },
    );
  }

  return ok(byEmail ?? byPhone ?? null);
}

async function seedLeadBriefingFromPortalUserIfMissing(
  client: SupabaseClient<Database>,
  ownerId: string,
  leadId: string,
  portalUserId: string | null | undefined,
): Promise<ApiResult<void>> {
  if (!portalUserId) return ok(undefined);

  const existingLeadBriefing = await client
    .from("lead_briefings")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existingLeadBriefing.error) return mapLeadCaptureDbError(existingLeadBriefing.error);
  if (existingLeadBriefing.data) return ok(undefined);

  const scopedBriefingResult = await client
    .from("user_briefings")
    .select(LEAD_BRIEFING_SELECT)
    .eq("user_id", portalUserId)
    .eq("corretor_id", ownerId)
    .eq("ativo", true)
    .maybeSingle();

  if (scopedBriefingResult.error) return mapLeadCaptureDbError(scopedBriefingResult.error);

  const generalBriefingResult =
    scopedBriefingResult.data === null
      ? await client
          .from("user_briefings")
          .select(LEAD_BRIEFING_SELECT)
          .eq("user_id", portalUserId)
          .eq("escopo", "GERAL")
          .eq("ativo", true)
          .maybeSingle()
      : { data: null, error: null };

  if (generalBriefingResult.error) return mapLeadCaptureDbError(generalBriefingResult.error);

  const sourceBriefing = (scopedBriefingResult.data ?? generalBriefingResult.data) as
    | LeadBriefingShape
    | null;
  if (!sourceBriefing) return ok(undefined);

  const insertResult = await client
    .from("lead_briefings")
    .insert({
      owner_id: ownerId,
      lead_id: leadId,
      ...extractLeadBriefingFromUserBriefing(sourceBriefing),
    })
    .select("id")
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === "23505") return ok(undefined);
    return mapLeadCaptureDbError(insertResult.error);
  }

  return ok(undefined);
}

export async function captureLeadByKeys(
  input: LeadCaptureInput,
): Promise<ApiResult<CaptureOutcome>> {
  const client = createSupabaseAdminClient();
  const emailLower = normalizeEmail(input.email);
  const phoneE164 = normalizePhoneE164(input.telefone_e164);

  const existing = await findExistingLeadByKeys(
    client,
    input.owner_id,
    emailLower,
    phoneE164,
  );
  if (!existing.ok) return existing;

  if (existing.data) {
    const current = existing.data;
    const patch: LeadUpdate = {
      nome: input.nome ?? current.nome,
      email: input.email ?? current.email,
      telefone: input.telefone ?? current.telefone,
      telefone_e164: phoneE164 ?? current.telefone_e164,
      origem: input.origem as LeadUpdate["origem"],
      mensagem: input.mensagem ?? current.mensagem,
      imovel_id: input.imovel_id ?? current.imovel_id,
      utm: (input.utm ?? current.utm) as LeadUpdate["utm"],
      form_key: input.form_key ?? current.form_key,
      page_url: input.page_url ?? current.page_url,
      referrer: input.referrer ?? current.referrer,
      form_payload: (input.form_payload ?? current.form_payload) as LeadUpdate["form_payload"],
    };

    const updateResult = await client
      .from("leads")
      .update(patch)
      .eq("id", current.id)
      .select("id")
      .single();
    if (updateResult.error) return mapLeadCaptureDbError(updateResult.error);

    const seedResult = await seedLeadBriefingFromPortalUserIfMissing(
      client,
      input.owner_id,
      current.id,
      input.portal_user_id,
    );
    if (!seedResult.ok) return seedResult;

    await insertLeadSystemTimelineEvent(
      client,
      input.owner_id,
      current.id,
      "Lead atualizado por nova captura",
      { source: "public_capture", action: "updated" },
    );
    return ok({ lead_id: current.id, action: "updated" });
  }

  if (!input.nome) {
    return fail("VALIDATION_ERROR", "nome is required when creating a new lead");
  }

  const insertPayload: LeadInsert = {
    owner_id: input.owner_id,
    nome: input.nome,
    email: input.email ?? null,
    telefone: input.telefone ?? null,
    telefone_e164: phoneE164,
    origem: input.origem as LeadInsert["origem"],
    mensagem: input.mensagem ?? null,
    imovel_id: input.imovel_id ?? null,
    utm: (input.utm ?? null) as LeadInsert["utm"],
    form_key: input.form_key ?? null,
    page_url: input.page_url ?? null,
    referrer: input.referrer ?? null,
    form_payload: (input.form_payload ?? {}) as LeadInsert["form_payload"],
  };

  const insertResult = await client
    .from("leads")
    .insert(insertPayload)
    .select("id")
    .single();
  if (insertResult.error) return mapLeadCaptureDbError(insertResult.error);

  const seedResult = await seedLeadBriefingFromPortalUserIfMissing(
    client,
    input.owner_id,
    insertResult.data.id,
    input.portal_user_id,
  );
  if (!seedResult.ok) return seedResult;

  await insertLeadSystemTimelineEvent(
    client,
    input.owner_id,
    insertResult.data.id,
    "Lead criado por nova captura",
    { source: "public_capture", action: "created" },
  );
  return ok({ lead_id: insertResult.data.id, action: "created" });
}

export async function listLeads(accessToken: string): Promise<ApiResult<LeadRow[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("leads")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (result.error) return mapAuthenticatedDbError(result.error);
  return ok((result.data ?? []) as LeadRow[]);
}

function coerceE164(value: string | null | undefined): string | null {
  const normalized = normalizePhoneE164(value);
  if (!normalized) return null;
  return /^\+\d{8,15}$/.test(normalized) ? normalized : null;
}

export async function findLeadByUniqueKey(
  accessToken: string,
  input: {
    email?: string | null;
    telefone_e164?: string | null;
  },
): Promise<ApiResult<LeadLookupItem | null>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const emailLower = normalizeEmail(input.email);
  const phoneE164 = coerceE164(input.telefone_e164);

  if (!emailLower && !phoneE164) {
    return fail("VALIDATION_ERROR", "email or telefone_e164 is required");
  }

  const { user, client } = auth.data;

  let byEmail: LeadLookupItem | null = null;
  let byPhone: LeadLookupItem | null = null;

  if (emailLower) {
    const result = await client
      .from("leads")
      .select("id,nome,email,telefone,origem,status,created_at,updated_at")
      .eq("owner_id", user.id)
      .eq("email_lower", emailLower)
      .maybeSingle();
    if (result.error) return mapAuthenticatedDbError(result.error);
    byEmail = (result.data ?? null) as LeadLookupItem | null;
  }

  if (phoneE164) {
    const result = await client
      .from("leads")
      .select("id,nome,email,telefone,origem,status,created_at,updated_at")
      .eq("owner_id", user.id)
      .eq("telefone_e164", phoneE164)
      .maybeSingle();
    if (result.error) return mapAuthenticatedDbError(result.error);
    byPhone = (result.data ?? null) as LeadLookupItem | null;
  }

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    return fail("CONFLICT", "Unique keys match different leads for the same owner", {
      lead_id_email: byEmail.id,
      lead_id_phone: byPhone.id,
    });
  }

  return ok(byPhone ?? byEmail ?? null);
}

export async function createLead(
  accessToken: string,
  input: CreateLeadInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.nome || input.nome.trim().length === 0) {
    return fail("VALIDATION_ERROR", "nome is required");
  }

  const { user, client } = auth.data;
  const payload: LeadInsert = {
    owner_id: user.id,
    nome: input.nome.trim(),
    email: normalizeEmail(input.email),
    telefone: input.telefone?.trim() || null,
    telefone_e164: coerceE164(input.telefone_e164 ?? input.telefone),
    origem: input.origem ?? "OUTRO",
    status: input.status ?? "NOVO",
    aguardando_produto: input.aguardando_produto ?? false,
    profissao: input.profissao?.trim() || null,
    endereco: input.endereco?.trim() || null,
    numero: input.numero?.trim() || null,
    complemento: input.complemento?.trim() || null,
    bairro: input.bairro?.trim() || null,
    cep: input.cep?.trim() || null,
    cidade: input.cidade?.trim() || null,
    uf: input.uf ?? null,
    pais: input.pais?.trim() || null,
    mensagem: input.mensagem?.trim() || null,
    imovel_id: input.imovel_id ?? null,
    motivo_desqualificacao: null,
    utm: null,
  };

  const result = await client
    .from("leads")
    .insert(payload)
    .select("id")
    .single();

  if (result.error) return mapAuthenticatedDbError(result.error);

  await insertLeadSystemTimelineEvent(
    client,
    user.id,
    result.data.id,
    "Lead criado manualmente",
    { source: "crm_manual" },
  );

  return ok({ id: result.data.id as string });
}

export async function updateLead(
  accessToken: string,
  leadId: string,
  input: UpdateLeadInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(input).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const currentLeadResult = await client
    .from("leads")
    .select("id,status,motivo_desqualificacao,aguardando_produto")
    .eq("id", leadId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (currentLeadResult.error) return mapAuthenticatedDbError(currentLeadResult.error);
  if (!currentLeadResult.data) return fail("NOT_FOUND", "Lead not found");

  const currentLead = currentLeadResult.data as Pick<
    LeadRow,
    "id" | "status" | "motivo_desqualificacao" | "aguardando_produto"
  >;
  const payload: LeadUpdate = {};

  if (Object.prototype.hasOwnProperty.call(input, "nome")) {
    const nome = input.nome?.trim();
    if (!nome) return fail("VALIDATION_ERROR", "nome is required");
    payload.nome = nome;
  }

  if (Object.prototype.hasOwnProperty.call(input, "email")) {
    payload.email = normalizeEmail(input.email);
  }

  if (Object.prototype.hasOwnProperty.call(input, "profissao")) {
    payload.profissao = input.profissao?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "endereco")) {
    payload.endereco = input.endereco?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "numero")) {
    payload.numero = input.numero?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "complemento")) {
    payload.complemento = input.complemento?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "bairro")) {
    payload.bairro = input.bairro?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "cep")) {
    payload.cep = input.cep?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "cidade")) {
    payload.cidade = input.cidade?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "uf")) {
    payload.uf = input.uf ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "pais")) {
    payload.pais = input.pais?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "telefone")) {
    payload.telefone = input.telefone?.trim() || null;
  }

  if (
    Object.prototype.hasOwnProperty.call(input, "telefone") ||
    Object.prototype.hasOwnProperty.call(input, "telefone_e164")
  ) {
    payload.telefone_e164 = coerceE164(input.telefone_e164 ?? input.telefone);
  }

  if (Object.prototype.hasOwnProperty.call(input, "origem")) {
    payload.origem = input.origem;
  }

  if (Object.prototype.hasOwnProperty.call(input, "status")) {
    payload.status = input.status;
  }

  if (Object.prototype.hasOwnProperty.call(input, "motivo_desqualificacao")) {
    payload.motivo_desqualificacao = input.motivo_desqualificacao ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "aguardando_produto")) {
    payload.aguardando_produto = input.aguardando_produto === true;
  }

  if (Object.prototype.hasOwnProperty.call(input, "mensagem")) {
    payload.mensagem = input.mensagem?.trim() || null;
  }

  const nextStatus = payload.status ?? currentLead.status;
  const nextMotivo =
    Object.prototype.hasOwnProperty.call(payload, "motivo_desqualificacao")
      ? payload.motivo_desqualificacao ?? null
      : currentLead.motivo_desqualificacao;
  const nextAguardandoProduto =
    Object.prototype.hasOwnProperty.call(payload, "aguardando_produto")
      ? payload.aguardando_produto === true
      : currentLead.aguardando_produto;

  if (nextStatus === "DESQUALIFICADO" && !nextMotivo) {
    return fail("VALIDATION_ERROR", "motivo_desqualificacao is required when status is DESQUALIFICADO");
  }

  if (nextStatus !== "DESQUALIFICADO") {
    payload.motivo_desqualificacao = null;
  }

  if (nextStatus === "OPORTUNIDADE" || nextStatus === "CLIENTE" || nextStatus === "DESQUALIFICADO") {
    payload.aguardando_produto = false;
  } else if (Object.prototype.hasOwnProperty.call(input, "aguardando_produto")) {
    payload.aguardando_produto = nextAguardandoProduto;
  }

  const result = await client
    .from("leads")
    .update(payload)
    .eq("id", leadId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapAuthenticatedDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Lead not found");

  return ok({ id: result.data.id as string });
}

export async function upsertLeadBriefing(
  accessToken: string,
  leadId: string,
  input: UpdateLeadBriefingInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(input).length === 0) {
    return fail("VALIDATION_ERROR", "No briefing fields provided to update");
  }

  const { user, client } = auth.data;
  const leadResult = await client
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (leadResult.error) return mapAuthenticatedDbError(leadResult.error);
  if (!leadResult.data) return fail("NOT_FOUND", "Lead not found");

  const result = await client
    .from("lead_briefings")
    .upsert(
      {
        owner_id: user.id,
        lead_id: leadId,
        ...buildLeadBriefingPatch(input),
      },
      { onConflict: "lead_id" },
    )
    .select("id")
    .single();

  if (result.error) return mapAuthenticatedDbError(result.error);
  return ok({ id: result.data.id as string });
}

export async function addLeadLocalizacaoInteresse(
  accessToken: string,
  input: {
    lead_id: string;
    geolocacao_id?: string | null;
    localizacao_texto?: string | null;
    lat?: number | null;
    lng?: number | null;
    raio_km?: number | null;
  },
): Promise<ApiResult<LeadWorkspaceLocalizacaoItem>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id) {
    return fail("VALIDATION_ERROR", "lead_id is required");
  }

  const { user, client } = auth.data;

  const leadResult = await client
    .from("leads")
    .select("id")
    .eq("id", input.lead_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (leadResult.error) return mapAuthenticatedDbError(leadResult.error);
  if (!leadResult.data) return fail("NOT_FOUND", "Lead not found");

  const existingResult = await client
    .from("lead_localizacoes_interesse")
    .select("id,geolocacao_id,localizacao_texto,lat,lng,raio_km,created_at")
    .eq("owner_id", user.id)
    .eq("lead_id", input.lead_id)
    .order("created_at", { ascending: false });

  if (existingResult.error) return mapAuthenticatedDbError(existingResult.error);

  const existingItems = (existingResult.data ?? []) as Pick<
    LeadLocalizacaoInteresseRow,
    "id" | "geolocacao_id" | "localizacao_texto" | "lat" | "lng" | "raio_km" | "created_at"
  >[];

  const normalizedText = normalizeLocationText(input.localizacao_texto);
  const existingDuplicate =
    existingItems.find((item) => input.geolocacao_id && item.geolocacao_id === input.geolocacao_id) ??
    existingItems.find((item) => {
      if (!normalizedText) return false;
      return (
        normalizeLocationText(item.localizacao_texto) === normalizedText &&
        areCloseCoordinates(item.lat, item.lng, input.lat, input.lng)
      );
    });

  const geolocacaoResult =
    input.geolocacao_id
      ? await client
          .from("geolocacoes")
          .select("endereco_formatado,bairro,cidade,uf,lat,lng")
          .eq("id", input.geolocacao_id)
          .maybeSingle()
      : { data: null, error: null };

  if (geolocacaoResult.error) return mapAuthenticatedDbError(geolocacaoResult.error);

  const geolocacao = (geolocacaoResult.data ?? null) as Pick<
    GeolocacaoRow,
    "endereco_formatado" | "bairro" | "cidade" | "uf" | "lat" | "lng"
  > | null;

  if (existingDuplicate) {
    return ok(
      mapLeadLocalizacaoWorkspaceItem({
        item: existingDuplicate,
        geolocacao,
      }),
    );
  }

  const payload: LeadLocalizacaoInteresseInsert = {
    owner_id: user.id,
    lead_id: input.lead_id,
    geolocacao_id: input.geolocacao_id ?? null,
    localizacao_texto: input.localizacao_texto?.trim() || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    raio_km: input.raio_km ?? null,
  };

  const insertResult = await client
    .from("lead_localizacoes_interesse")
    .insert(payload)
    .select("id,geolocacao_id,localizacao_texto,lat,lng,raio_km,created_at")
    .single();

  if (insertResult.error) return mapAuthenticatedDbError(insertResult.error);

  return ok(
    mapLeadLocalizacaoWorkspaceItem({
      item: insertResult.data as Pick<
        LeadLocalizacaoInteresseRow,
        "id" | "geolocacao_id" | "localizacao_texto" | "lat" | "lng" | "raio_km" | "created_at"
      >,
      geolocacao,
    }),
  );
}

export async function removeLeadLocalizacaoInteresse(
  accessToken: string,
  input: {
    lead_id: string;
    localizacao_id: string;
  },
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id || !input.localizacao_id) {
    return fail("VALIDATION_ERROR", "lead_id and localizacao_id are required");
  }

  const { user, client } = auth.data;
  const result = await client
    .from("lead_localizacoes_interesse")
    .delete()
    .eq("id", input.localizacao_id)
    .eq("lead_id", input.lead_id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapAuthenticatedDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Localização not found");

  return ok({ id: result.data.id as string });
}

export async function associateLeadImovel(
  accessToken: string,
  input: {
    lead_id: string;
    imovel_id: string;
  },
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id || !input.imovel_id) {
    return fail("VALIDATION_ERROR", "lead_id and imovel_id are required");
  }

  const { user, client } = auth.data;

  const [leadResult, imovelResult] = await Promise.all([
    client
      .from("leads")
      .select("id,imovel_id")
      .eq("id", input.lead_id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    client
      .from("imoveis")
      .select("id,geolocacao_id,logradouro,numero,bairro,cidade,estado,lat,lng")
      .eq("id", input.imovel_id)
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  if (leadResult.error) return mapAuthenticatedDbError(leadResult.error);
  if (imovelResult.error) return mapAuthenticatedDbError(imovelResult.error);
  if (!leadResult.data) return fail("NOT_FOUND", "Lead not found");
  if (!imovelResult.data) return fail("NOT_FOUND", "Imóvel not found");

  const relationResult = await client
    .from("lead_imoveis")
    .upsert(
      {
        owner_id: user.id,
        lead_id: input.lead_id,
        imovel_id: input.imovel_id,
      },
      { onConflict: "lead_id,imovel_id" },
    )
    .select("id")
    .single();

  if (relationResult.error) return mapAuthenticatedDbError(relationResult.error);

  if (!leadResult.data.imovel_id) {
    const defaultImovelResult = await client
      .from("leads")
      .update({ imovel_id: input.imovel_id, aguardando_produto: false })
      .eq("id", input.lead_id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (defaultImovelResult.error) return mapAuthenticatedDbError(defaultImovelResult.error);
  } else {
    const leadProductFlagResult = await client
      .from("leads")
      .update({ aguardando_produto: false })
      .eq("id", input.lead_id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (leadProductFlagResult.error) return mapAuthenticatedDbError(leadProductFlagResult.error);
  }

  const imovelLocationText = buildLeadLocationText([
    imovelResult.data.bairro,
    imovelResult.data.cidade,
    imovelResult.data.estado,
  ]);

  if (imovelResult.data.geolocacao_id || imovelLocationText || (imovelResult.data.lat != null && imovelResult.data.lng != null)) {
    const locationResult = await addLeadLocalizacaoInteresse(accessToken, {
      lead_id: input.lead_id,
      geolocacao_id: imovelResult.data.geolocacao_id,
      localizacao_texto: imovelLocationText || null,
      lat: imovelResult.data.lat,
      lng: imovelResult.data.lng,
    });

    if (!locationResult.ok) return locationResult;
  }

  return ok({ id: relationResult.data.id as string });
}

export async function getLeadWorkspace(
  accessToken: string,
  leadId: string,
): Promise<ApiResult<LeadWorkspace>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const leadResult = await client
    .from("leads")
    .select("id,nome,profissao,endereco,numero,complemento,bairro,cep,cidade,uf,pais,email,telefone,telefone_e164,origem,status,motivo_desqualificacao,aguardando_produto,mensagem,imovel_id,created_at,updated_at")
    .eq("id", leadId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (leadResult.error) return mapAuthenticatedDbError(leadResult.error);
  if (!leadResult.data) return fail("NOT_FOUND", "Lead not found");

  const lead = leadResult.data as Pick<
    LeadRow,
    | "id"
    | "nome"
    | "profissao"
    | "endereco"
    | "numero"
    | "complemento"
    | "bairro"
    | "cep"
    | "cidade"
    | "uf"
    | "pais"
    | "email"
    | "telefone"
    | "telefone_e164"
    | "origem"
    | "status"
    | "motivo_desqualificacao"
    | "aguardando_produto"
    | "mensagem"
    | "imovel_id"
    | "created_at"
    | "updated_at"
  >;

  const [
    leadBriefingResult,
    negociosResult,
    atividadesResult,
    propostasResult,
    timelineResult,
    leadImoveisResult,
    localizacoesResult,
  ] = await Promise.all([
    client
      .from("lead_briefings")
      .select(LEAD_BRIEFING_SELECT)
      .eq("owner_id", user.id)
      .eq("lead_id", leadId)
      .maybeSingle(),
    client
      .from("negocios")
      .select(
        "id,titulo,modalidade,fase,subfase_juridica,etapa,finalidade,valor,valor_estimado,comissaopercentual,comissaovalor,imovel_id,observacoes,proxima_acao_em,created_at,updated_at",
      )
      .eq("owner_id", user.id)
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false }),
    client
      .from("atividades")
      .select("id,categoria,modelo,titulo,tipo,status,descricao,quando_em,created_at")
      .eq("owner_id", user.id)
      .eq("lead_id", leadId)
      .order("quando_em", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    client
      .from("propostas")
      .select("id,negocio_id,titulo,tipo,status,valor,created_at,updated_at")
      .eq("owner_id", user.id)
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false }),
    client
      .from("timeline_eventos")
      .select("id,tipo,titulo,detalhes,created_at")
      .eq("owner_id", user.id)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true }),
    client
      .from("lead_imoveis")
      .select("id,lead_id,imovel_id,created_at")
      .eq("owner_id", user.id)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    client
      .from("lead_localizacoes_interesse")
      .select("id,geolocacao_id,localizacao_texto,lat,lng,raio_km,created_at")
      .eq("owner_id", user.id)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
  ]);

  if (leadBriefingResult.error) return mapAuthenticatedDbError(leadBriefingResult.error);
  if (negociosResult.error) return mapAuthenticatedDbError(negociosResult.error);
  if (atividadesResult.error) return mapAuthenticatedDbError(atividadesResult.error);
  if (propostasResult.error) return mapAuthenticatedDbError(propostasResult.error);
  if (timelineResult.error) return mapAuthenticatedDbError(timelineResult.error);
  if (leadImoveisResult.error) return mapAuthenticatedDbError(leadImoveisResult.error);
  if (localizacoesResult.error) return mapAuthenticatedDbError(localizacoesResult.error);

  const negocios = (negociosResult.data ?? []) as LeadWorkspace["negocios"];
  const briefing = (leadBriefingResult.data ?? null) as LeadWorkspace["briefing"];
  const atividades = (atividadesResult.data ?? []) as LeadWorkspace["atividades"];
  const propostas = (propostasResult.data ?? []) as LeadWorkspace["propostas"];
  const timeline = (timelineResult.data ?? []) as LeadWorkspace["timeline"];
  const leadImoveis = (leadImoveisResult.data ?? []) as Pick<
    LeadImovelRow,
    "id" | "lead_id" | "imovel_id" | "created_at"
  >[];
  const localizacoes = (localizacoesResult.data ?? []) as Pick<
    LeadLocalizacaoInteresseRow,
    "id" | "geolocacao_id" | "localizacao_texto" | "lat" | "lng" | "raio_km" | "created_at"
  >[];

  const leadInteresses = [...leadImoveis];
  if (lead.imovel_id && !leadInteresses.some((item) => item.imovel_id === lead.imovel_id)) {
    leadInteresses.push({
      id: lead.imovel_id,
      lead_id: lead.id,
      imovel_id: lead.imovel_id,
      created_at: lead.updated_at,
    });
  }

  leadInteresses.sort((left, right) => right.created_at.localeCompare(left.created_at));
  const uniqueImovelIds = Array.from(new Set(leadInteresses.map((item) => item.imovel_id)));
  const geolocacaoIds = Array.from(
    new Set(
      localizacoes
        .map((item) => item.geolocacao_id)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  );

  const imoveisResult =
    uniqueImovelIds.length > 0
      ? await client
        .from("imoveis")
        .select(
            "id,titulo,codigo,tipo,subtipo,tipo_negociacao,logradouro,numero,finalidade,status,bairro_comercial,bairro,cidade,estado,area_util,area_terreno,dormitorios,suites,salas,vagas,lat,lng,preco_venda,preco_locacao,comissao_venda_percentual",
          )
          .eq("owner_id", user.id)
          .in("id", uniqueImovelIds)
      : { data: [], error: null };

  if (imoveisResult.error) return mapAuthenticatedDbError(imoveisResult.error);

  const imovelMidiaResult =
    uniqueImovelIds.length > 0
      ? await client
          .from("imovel_midia_publica")
          .select("imovel_id,url,ordem")
          .eq("owner_id", user.id)
          .in("imovel_id", uniqueImovelIds)
          .order("ordem", { ascending: true })
      : { data: [], error: null };

  if (imovelMidiaResult.error) return mapAuthenticatedDbError(imovelMidiaResult.error);

  const geolocacoesResult =
    geolocacaoIds.length > 0
      ? await client
          .from("geolocacoes")
          .select("id,endereco_formatado,bairro,cidade,uf,lat,lng")
          .in("id", geolocacaoIds)
      : { data: [], error: null };

  if (geolocacoesResult.error) return mapAuthenticatedDbError(geolocacoesResult.error);

  const imoveis = (imoveisResult.data ?? []) as Pick<
    ImovelRow,
    | "id"
    | "titulo"
    | "codigo"
    | "tipo"
    | "subtipo"
    | "tipo_negociacao"
    | "logradouro"
    | "numero"
    | "finalidade"
    | "status"
    | "bairro_comercial"
    | "bairro"
    | "cidade"
    | "estado"
    | "area_util"
    | "area_terreno"
    | "dormitorios"
    | "suites"
    | "salas"
    | "vagas"
    | "lat"
    | "lng"
    | "preco_venda"
    | "preco_locacao"
    | "comissao_venda_percentual"
  >[];
  const imovelMidias = (imovelMidiaResult.data ?? []) as Pick<
    ImovelMidiaPublicaRow,
    "imovel_id" | "url" | "ordem"
  >[];
  const geolocacoes = (geolocacoesResult.data ?? []) as Pick<
    GeolocacaoRow,
    "id" | "endereco_formatado" | "bairro" | "cidade" | "uf" | "lat" | "lng"
  >[];

  const imoveisById = new Map(imoveis.map((item) => [item.id, item]));
  const geolocacoesById = new Map(geolocacoes.map((item) => [item.id, item]));
  const firstPhotoByImovelId = new Map<string, string>();
  for (const media of imovelMidias) {
    if (!media.imovel_id || firstPhotoByImovelId.has(media.imovel_id)) continue;
    firstPhotoByImovelId.set(media.imovel_id, media.url);
  }

  const imoveisInteresse = leadInteresses.reduce<LeadWorkspaceImovelItem[]>((acc, relacao) => {
    const imovel = imoveisById.get(relacao.imovel_id);
    if (!imovel) return acc;

    acc.push({
      id: imovel.id,
      relacao_id: relacao.id,
      titulo: imovel.titulo,
      codigo: imovel.codigo,
      tipo: imovel.tipo,
      subtipo: imovel.subtipo,
      tipo_negociacao: imovel.tipo_negociacao,
      logradouro: imovel.logradouro,
      numero: imovel.numero,
      finalidade: imovel.finalidade,
      status: imovel.status,
      bairro_comercial: imovel.bairro_comercial,
      bairro: imovel.bairro,
      cidade: imovel.cidade,
      estado: imovel.estado,
      area_util: imovel.area_util,
      area_terreno: imovel.area_terreno,
      dormitorios: imovel.dormitorios,
      suites: imovel.suites,
      salas: imovel.salas,
      vagas: imovel.vagas,
      lat: imovel.lat,
      lng: imovel.lng,
      preco_venda: imovel.preco_venda,
      preco_locacao: imovel.preco_locacao,
      comissao_venda_percentual: imovel.comissao_venda_percentual,
      foto_url: firstPhotoByImovelId.get(imovel.id) ?? null,
      associado_em: relacao.created_at,
    });

    return acc;
  }, []);

  const localizacoesInteresse = localizacoes.map((item) => {
    const geolocacao = item.geolocacao_id ? geolocacoesById.get(item.geolocacao_id) ?? null : null;
    return {
      id: item.id,
      geolocacao_id: item.geolocacao_id,
      localizacao_texto: item.localizacao_texto,
      endereco_formatado: geolocacao?.endereco_formatado ?? null,
      bairro: geolocacao?.bairro ?? null,
      cidade: geolocacao?.cidade ?? null,
      estado: geolocacao?.uf ?? null,
      lat: item.lat ?? geolocacao?.lat ?? null,
      lng: item.lng ?? geolocacao?.lng ?? null,
      raio_km: item.raio_km,
      created_at: item.created_at,
    } satisfies LeadWorkspaceLocalizacaoItem;
  });

  const finalidades = Array.from(
    new Set(
      negocios
        .map((item) => item.finalidade)
        .filter((item): item is NonNullable<NegocioRow["finalidade"]> => item === "COMPRAR" || item === "ALUGAR"),
    ),
  );

  const negocioValores = negocios
    .map((item) => (typeof item.valor === "number" ? item.valor : item.valor_estimado))
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item));

  const imovelValores = imoveisInteresse.flatMap((item) => {
    const values: number[] = [];
    if (typeof item.preco_venda === "number" && Number.isFinite(item.preco_venda)) values.push(item.preco_venda);
    if (typeof item.preco_locacao === "number" && Number.isFinite(item.preco_locacao)) values.push(item.preco_locacao);
    return values;
  });

  const valueCandidates = negocioValores.length > 0 ? negocioValores : imovelValores;
  const valorMin = valueCandidates.length > 0 ? Math.min(...valueCandidates) : null;
  const valorMax = valueCandidates.length > 0 ? Math.max(...valueCandidates) : null;
  const proximaVisita =
    atividades.find((item) => item.status === "PENDENTE" && item.quando_em && isVisitActivity(item))?.quando_em ?? null;

  return ok({
    lead: {
      id: lead.id,
      nome: lead.nome,
      profissao: lead.profissao,
      endereco: lead.endereco,
      numero: lead.numero,
      complemento: lead.complemento,
      bairro: lead.bairro,
      cep: lead.cep,
      cidade: lead.cidade,
      uf: lead.uf,
      pais: lead.pais,
      email: lead.email,
      telefone: lead.telefone,
      telefone_e164: lead.telefone_e164,
      origem: lead.origem,
      status: lead.status,
      motivo_desqualificacao: lead.motivo_desqualificacao,
      aguardando_produto: lead.aguardando_produto,
      mensagem: lead.mensagem,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    },
    briefing,
    summary: {
      finalidades,
      valor_min: valorMin,
      valor_max: valorMax,
      atividades_total: atividades.length,
      atividades_pendentes: atividades.filter((item) => item.status === "PENDENTE").length,
      propostas_total: propostas.length,
      negocios_total: negocios.length,
      oportunidades_total: negocios.filter((item) => item.etapa === "OPORTUNIDADE").length,
      proxima_visita_em: proximaVisita,
    },
    imoveis_interesse: imoveisInteresse,
    localizacoes_interesse: localizacoesInteresse,
    atividades,
    propostas,
    negocios,
    timeline,
  });
}

export async function listLeadDirectory(accessToken: string): Promise<ApiResult<LeadDirectoryItem[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const [
    leadsResult,
    negociosResult,
    atividadesResult,
    propostasResult,
    leadImoveisResult,
    imoveisResult,
    imovelMidiaResult,
  ] = await Promise.all([
    client
      .from("leads")
      .select("id,nome,email,telefone,origem,status,aguardando_produto,imovel_id,created_at,updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    client
      .from("negocios")
      .select("id,lead_id,modalidade,fase,etapa,finalidade,valor,valor_estimado,updated_at")
      .eq("owner_id", user.id),
    client
      .from("atividades")
      .select("id,lead_id,modelo,tipo,status,quando_em,created_at")
      .eq("owner_id", user.id),
    client
      .from("propostas")
      .select("id,lead_id")
      .eq("owner_id", user.id),
    client
      .from("lead_imoveis")
      .select("lead_id,imovel_id,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    client
      .from("imoveis")
      .select("id,titulo,codigo,cidade,estado")
      .eq("owner_id", user.id),
    client
      .from("imovel_midia_publica")
      .select("imovel_id,url,ordem")
      .eq("owner_id", user.id)
      .order("ordem", { ascending: true }),
  ]);

  if (leadsResult.error) return mapAuthenticatedDbError(leadsResult.error);
  if (negociosResult.error) return mapAuthenticatedDbError(negociosResult.error);
  if (atividadesResult.error) return mapAuthenticatedDbError(atividadesResult.error);
  if (propostasResult.error) return mapAuthenticatedDbError(propostasResult.error);
  if (leadImoveisResult.error) return mapAuthenticatedDbError(leadImoveisResult.error);
  if (imoveisResult.error) return mapAuthenticatedDbError(imoveisResult.error);
  if (imovelMidiaResult.error) return mapAuthenticatedDbError(imovelMidiaResult.error);

  const leads = (leadsResult.data ?? []) as Pick<
    LeadRow,
    "id" | "nome" | "email" | "telefone" | "origem" | "status" | "aguardando_produto" | "imovel_id" | "created_at" | "updated_at"
  >[];
  const negocios = (negociosResult.data ?? []) as Pick<
    NegocioRow,
    "id" | "lead_id" | "modalidade" | "fase" | "etapa" | "finalidade" | "valor" | "valor_estimado" | "updated_at"
  >[];
  const atividades = (atividadesResult.data ?? []) as Pick<
    AtividadeRow,
    "id" | "lead_id" | "modelo" | "tipo" | "status" | "quando_em" | "created_at"
  >[];
  const propostas = (propostasResult.data ?? []) as Pick<PropostaRow, "id" | "lead_id">[];
  const leadImoveis = (leadImoveisResult.data ?? []) as Pick<
    LeadImovelRow,
    "lead_id" | "imovel_id" | "created_at"
  >[];
  const imoveis = (imoveisResult.data ?? []) as Pick<
    ImovelRow,
    "id" | "titulo" | "codigo" | "cidade" | "estado"
  >[];
  const imovelMidias = (imovelMidiaResult.data ?? []) as Pick<
    ImovelMidiaPublicaRow,
    "imovel_id" | "url" | "ordem"
  >[];

  const imoveisById = new Map(imoveis.map((item) => [item.id, item]));

  const firstPhotoByImovelId = new Map<string, string>();
  for (const media of imovelMidias) {
    if (!media.imovel_id || firstPhotoByImovelId.has(media.imovel_id)) continue;
    firstPhotoByImovelId.set(media.imovel_id, media.url);
  }

  const negociosByLead = new Map<string, typeof negocios>();
  for (const negocio of negocios) {
    const current = negociosByLead.get(negocio.lead_id) ?? [];
    current.push(negocio);
    negociosByLead.set(negocio.lead_id, current);
  }

  const atividadesByLead = new Map<string, typeof atividades>();
  for (const atividade of atividades) {
    const current = atividadesByLead.get(atividade.lead_id) ?? [];
    current.push(atividade);
    atividadesByLead.set(atividade.lead_id, current);
  }

  const propostasByLead = new Map<string, typeof propostas>();
  for (const proposta of propostas) {
    const current = propostasByLead.get(proposta.lead_id) ?? [];
    current.push(proposta);
    propostasByLead.set(proposta.lead_id, current);
  }

  const leadImoveisByLead = new Map<string, typeof leadImoveis>();
  for (const relacao of leadImoveis) {
    const current = leadImoveisByLead.get(relacao.lead_id) ?? [];
    current.push(relacao);
    leadImoveisByLead.set(relacao.lead_id, current);
  }

  const directory = leads.map((lead) => {
    const leadNegocios = (negociosByLead.get(lead.id) ?? []).sort((left, right) =>
      right.updated_at.localeCompare(left.updated_at),
    );
    const leadAtividades = (atividadesByLead.get(lead.id) ?? []).sort((left, right) => {
      const leftTime = left.quando_em ?? left.created_at;
      const rightTime = right.quando_em ?? right.created_at;
      return leftTime.localeCompare(rightTime);
    });
    const leadPropostas = propostasByLead.get(lead.id) ?? [];
    const leadInteresses = [...(leadImoveisByLead.get(lead.id) ?? [])];

    if (lead.imovel_id && !leadInteresses.some((entry) => entry.imovel_id === lead.imovel_id)) {
      leadInteresses.push({
        lead_id: lead.id,
        imovel_id: lead.imovel_id,
        created_at: lead.updated_at,
      });
    }

    leadInteresses.sort((left, right) => right.created_at.localeCompare(left.created_at));

    const uniqueImovelIds = Array.from(new Set(leadInteresses.map((entry) => entry.imovel_id)));
    const latestInterest = leadInteresses[0] ?? null;
    const latestImovel = latestInterest ? imoveisById.get(latestInterest.imovel_id) ?? null : null;
    const latestInteresse = leadNegocios.find((item) => item.finalidade !== null)?.finalidade ?? null;
    const maiorValor =
      leadNegocios.reduce<number | null>((maxValue, item) => {
        const currentValue = typeof item.valor === "number" ? item.valor : item.valor_estimado;
        if (typeof currentValue !== "number") return maxValue;
        if (maxValue === null || currentValue > maxValue) return currentValue;
        return maxValue;
      }, null) ?? null;
    const proximaAtividade =
      leadAtividades.find((item) => item.status === "PENDENTE" && item.quando_em)?.quando_em ?? null;
    const proximaVisita =
      leadAtividades.find(
        (item) => item.status === "PENDENTE" && item.quando_em && isVisitActivity(item),
      )?.quando_em ?? null;

    return {
      id: lead.id,
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      origem: lead.origem,
      status: lead.status,
      aguardando_produto: lead.aguardando_produto,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      interesse: latestInteresse,
      imoveis_interesse_total: uniqueImovelIds.length,
      ultimo_imovel_interesse: latestInterest
        ? {
            imovel_id: latestInterest.imovel_id,
            titulo: latestImovel?.titulo ?? null,
            codigo: latestImovel?.codigo ?? null,
            cidade: latestImovel?.cidade ?? null,
            estado: latestImovel?.estado ?? null,
            foto_url: firstPhotoByImovelId.get(latestInterest.imovel_id) ?? null,
            interesse_em: latestInterest.created_at,
          }
        : null,
      atividades_total: leadAtividades.length,
      atividades_pendentes: leadAtividades.filter((item) => item.status === "PENDENTE").length,
      proxima_atividade_em: proximaAtividade,
      proxima_visita_em: proximaVisita,
      negocios_total: leadNegocios.length,
      oportunidades_total: leadNegocios.filter((item) => item.etapa === "OPORTUNIDADE").length,
      propostas_total: leadPropostas.length,
      maior_valor: maiorValor,
    } satisfies LeadDirectoryItem;
  });

  return ok(directory);
}
