import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { cancelImovelDeleteJob, enqueueImovelDeleteJob } from "@/lib/db/imovel-delete-jobs";
import { enqueueMidiaDeleteJob, syncImovelPublicMidia } from "@/lib/db/midia";
import { buildImovelPublicSlug } from "@/lib/imoveis/public-url";

const FINALIDADE_VALUES = new Set(["COMPRAR", "ALUGAR"]);
const STATUS_VALUES = new Set(["RASCUNHO", "PUBLICADO", "PAUSADO", "VENDIDO", "ALUGADO", "INATIVO"]);
const ACEITA_PARCERIA_STATUS_VALUES = new Set(["SIM", "NAO", "SOB_ANALISE"]);
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
const BOLSAO_EXCLUSIVIDADE_MIN_DIAS = 75;
const TIPO_AMBIENTE_IMOVEL_VALUES = new Set(["DORMITORIO", "COZINHA", "SALA", "VARANDA"]);
const AMBIENTE_PISO_VALUES = new Set([
  "PORCELANATO",
  "CERAMICA",
  "LAMINADO",
  "VINILICO",
  "MADEIRA",
  "CIMENTO_QUEIMADO",
  "PEDRA_NATURAL",
  "OUTRO",
]);
const PERSIANA_TIPO_VALUES = new Set(["PADRAO", "AUTOMATIZADA"]);
const COZINHA_TIPO_VALUES = new Set([
  "AMERICANA",
  "INTEGRADA",
  "FECHADA",
  "GOURMET",
  "ILHA",
  "CORREDOR",
  "OUTRO",
]);
const COZINHA_BANCADA_VALUES = new Set([
  "GRANITO",
  "QUARTZO",
  "MARMORE",
  "PORCELANATO",
  "SUPERFICIE_SOLIDA",
  "ACO_INOX",
  "MADEIRA",
  "CONCRETO",
  "OUTRO",
]);
const SALA_TIPO_VALUES = new Set([
  "ESTAR",
  "JANTAR",
  "TV",
  "HOME_THEATER",
  "LIVING_AMPLIADO",
  "INTEGRADA_COM_VARANDA",
  "INTEGRADA_COM_COZINHA",
  "ESCRITORIO",
  "OUTRO",
]);
const SALA_LAYOUT_VALUES = new Set([
  "INTEGRADA",
  "SEPARADA",
  "CONCEITO_ABERTO",
  "DOIS_AMBIENTES",
  "TRES_AMBIENTES",
  "OUTRO",
]);
const SALA_DIFERENCIAL_VALUES = new Set([
  "PE_DIREITO_DUPLO",
  "VARANDA_INTEGRADA",
  "LAREIRA",
  "AR_CONDICIONADO",
  "ILUMINACAO_PLANEJADA",
  "PAINEL_PLANEJADO",
  "OUTRO",
]);
const VARANDA_TIPO_VALUES = new Set(["VARANDA", "VARANDA_GOURMET", "TERRACO_GOURMET"]);
const VARANDA_CHURRASQUEIRA_VALUES = new Set(["NAO_TEM", "ELETRICA", "GAS", "CARVAO"]);

export type TipoAmbienteImovel = "DORMITORIO" | "COZINHA" | "SALA" | "VARANDA";
type AmbientePisoValue =
  | "PORCELANATO"
  | "CERAMICA"
  | "LAMINADO"
  | "VINILICO"
  | "MADEIRA"
  | "CIMENTO_QUEIMADO"
  | "PEDRA_NATURAL"
  | "OUTRO";
type PersianaTipoValue = "PADRAO" | "AUTOMATIZADA";
type CozinhaTipoValue = "AMERICANA" | "INTEGRADA" | "FECHADA" | "GOURMET" | "ILHA" | "CORREDOR" | "OUTRO";
type CozinhaBancadaValue =
  | "GRANITO"
  | "QUARTZO"
  | "MARMORE"
  | "PORCELANATO"
  | "SUPERFICIE_SOLIDA"
  | "ACO_INOX"
  | "MADEIRA"
  | "CONCRETO"
  | "OUTRO";
type SalaTipoValue =
  | "ESTAR"
  | "JANTAR"
  | "TV"
  | "HOME_THEATER"
  | "LIVING_AMPLIADO"
  | "INTEGRADA_COM_VARANDA"
  | "INTEGRADA_COM_COZINHA"
  | "ESCRITORIO"
  | "OUTRO";
type SalaLayoutValue = "INTEGRADA" | "SEPARADA" | "CONCEITO_ABERTO" | "DOIS_AMBIENTES" | "TRES_AMBIENTES" | "OUTRO";
type SalaDiferencialValue =
  | "PE_DIREITO_DUPLO"
  | "VARANDA_INTEGRADA"
  | "LAREIRA"
  | "AR_CONDICIONADO"
  | "ILUMINACAO_PLANEJADA"
  | "PAINEL_PLANEJADO"
  | "OUTRO";
type VarandaTipoValue = "VARANDA" | "VARANDA_GOURMET" | "TERRACO_GOURMET";
type VarandaChurrasqueiraValue = "NAO_TEM" | "ELETRICA" | "GAS" | "CARVAO";

export type Imovel = {
  id: string;
  owner_id: string;
  codigo: string | null;
  slug_publico: string | null;
  titulo: string;
  finalidade: string;
  tipo: string;
  status: string;
  step_rascunho: number;
  cidade: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

export type CreateImovelInput = {
  codigo?: string;
  slug_publico?: string;
  titulo?: string;
  descricao?: string;
  finalidade?: string;
  tipo?: string;
  geolocacao_id?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_json?: Record<string, unknown>;
  empreendimento_id?: string | null;
  empreendimento_tipo_id?: string | null;
  empreendimento_tipologia_label?: string | null;
  enderecovisualizacao?: "END_SEM_COMPLEMENTO" | "END_COMPLETO" | "END_BAIRRO" | "END_SEM_NUMERO";
  endereco_complemento?: string | null;
  bairro_comercial?: string | null;
  andar?: number | null;
  mostrar_andar_no_anuncio?: boolean;
  mostrar_complemento_no_anuncio?: boolean;
  ocultar_numero_publico?: boolean;
  ultimo_andar?: boolean;
  area_total?: number | null;
  area_util?: number | null;
  area_terreno?: number | null;
  frente_metros?: number | null;
  fundos_metros?: number | null;
  lateral_1_metros?: number | null;
  lateral_2_metros?: number | null;
  dormitorios?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  lavabos?: number | null;
  salas?: number | null;
  cozinhas?: number | null;
  vagas?: number | null;
  vaga_tipos?: ("PRIVATIVA" | "LIVRE" | "DEMARCADA")[] | null;
  vaga_tamanhos?: ("PEQUENA" | "MEDIA" | "GRANDE")[] | null;
  vaga_coberturas?: ("COBERTA" | "DESCOBERTA")[] | null;
  caracteristicas?: string[] | null;
  tipo_negociacao?: "VENDA" | "ALUGUEL" | "VENDA_E_ALUGUEL" | null;
  preco_venda?: number | null;
  preco_locacao?: number | null;
  condominio?: number | null;
  iptu?: number | null;
  iptu_periodicidade?: "MENSAL" | "ANUAL" | null;
  comissao_locacao?: string | null;
  comissao_venda_percentual?: number | null;
  minimo_aceito_em_maos?: number | null;
  aceita_permuta?: boolean;
  descricao_permuta?: string | null;
  veio_do_bolsao?: boolean;
  captacao_corretor_parceiro?: boolean;
  corretor_parceiro_nome?: string | null;
  corretor_parceiro_telefone?: string | null;
  corretor_parceiro_email?: string | null;
  comissao_captador_percentual?: number | null;
  comissao_vendedor_percentual?: number | null;
  outras_comissoes_percentual?: number | null;
  exclusividade_comissao_minha_percentual?: number | null;
  exclusividade_comissao_parceiro_percentual?: number | null;
  exclusividade_outras_comissoes_percentual?: number | null;
  exclusividade?: boolean;
  exclusividade_data_vencimento?: string | null;
  exclusividade_observacoes?: string | null;
  disponibilizar_no_bolsao_parceria?: boolean;
  bolsao_permitir_mudanca_preco?: boolean;
  bolsao_permitir_download_midia_kit?: boolean;
  bolsao_somente_visitas_agendadas?: boolean;
  bolsao_somente_visitas_com_minha_presenca?: boolean;
  aceite_corretor_exclusivo?: boolean;
  regra_geral_exclusividade?: string | null;
  aceita_parceria_status?: "SIM" | "NAO" | "SOB_ANALISE" | null;
  divisao_comissao_parceria?: string | null;
  step_rascunho?: number;
  status?: string;
};

export type UpdateImovelInput = Partial<CreateImovelInput> & {
  publicado_em?: string | null;
};

export type DormitorioAmbienteInput = {
  eh_suite?: boolean;
  suite_principal?: boolean;
  banheiro_armarios?: boolean;
  banheiro_pia_dupla?: boolean;
  banheiro_box?: boolean;
  ar_condicionado?: boolean;
  closet?: boolean;
  armarios_planejados?: boolean;
  tem_cama?: boolean;
  tem_tv?: boolean;
  tem_varanda?: boolean;
  persiana_tipo?: PersianaTipoValue | null;
  tipo_piso?: AmbientePisoValue | null;
};

export type CozinhaAmbienteInput = {
  tipo_cozinha?: CozinhaTipoValue | null;
  armarios_planejados?: boolean;
  fogao?: boolean;
  forno?: boolean;
  geladeira?: boolean;
  microondas?: boolean;
  bancada?: boolean;
  tipo_bancada?: CozinhaBancadaValue | null;
  tipo_piso?: AmbientePisoValue | null;
};

export type SalaAmbienteInput = {
  tipo_sala?: SalaTipoValue | null;
  layout?: SalaLayoutValue | null;
  tipo_piso?: AmbientePisoValue | null;
  diferenciais?: SalaDiferencialValue[];
};

export type VarandaAmbienteInput = {
  tipo_varanda?: VarandaTipoValue | null;
  churrasqueira_tipo?: VarandaChurrasqueiraValue | null;
  bancada?: boolean;
  persiana_tipo?: PersianaTipoValue | null;
  fechada_com_vidro?: boolean;
  ilha?: boolean;
  fogao?: boolean;
  frigobar?: boolean;
  chopeira?: boolean;
  tem_tv?: boolean;
  tipo_piso?: AmbientePisoValue | null;
};

export type ImovelAmbienteInput = {
  tipo_ambiente: TipoAmbienteImovel;
  principal?: boolean;
  area_m2?: number | null;
  dados?:
    | DormitorioAmbienteInput
    | CozinhaAmbienteInput
    | SalaAmbienteInput
    | VarandaAmbienteInput
    | Record<string, unknown>;
};

export type ImovelAmbienteItem = {
  id: string;
  tipo_ambiente: TipoAmbienteImovel;
  ordem: number;
  principal: boolean;
  area_m2: number | null;
  dados: Record<string, unknown>;
};

export type EmpreendimentoParaAssociacao = {
  id: string;
  nome: string;
  status: string;
  descricao: string | null;
  tipo_uso: "RESIDENCIAL" | "COMERCIAL" | null;
  categoria_residencial: string | null;
  tipologias_residenciais: string[];
  categoria_comercial: string | null;
  tipologias_comerciais: string[];
  bairro_comercial: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  geolocacao_id: string | null;
  lat: number | null;
  lng: number | null;
  address_json: Record<string, unknown> | null;
  localizacao_contexto: Record<string, unknown> | null;
  capa_url: string | null;
  tipos: Array<{
    id: string;
    nome: string | null;
    torre_nome: string | null;
    tipologia: string | null;
    area_privativa: number | null;
    dormitorios: number | null;
    suites: number | null;
    banheiros: number | null;
    vagas: number | null;
    qtd_unidades: number | null;
  }>;
};

type OwnedImovelUniqueValues = {
  id: string;
  codigo: string | null;
  slug_publico: string | null;
};

type ImovelRowForUpdate = {
  status: string | null;
  codigo: string | null;
  slug_publico: string | null;
  finalidade: string | null;
  tipo: string | null;
  subtipo: string | null;
  tipo_negociacao: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  bairro_comercial: string | null;
  address_json: Record<string, unknown> | null;
  dormitorios: number | null;
  suites: number | null;
  salas: number | null;
  vagas: number | null;
  area_util: number | null;
  area_total: number | null;
  area_terreno: number | null;
  empreendimento_id: string | null;
  exclusividade: boolean | null;
  disponibilizar_no_bolsao_parceria: boolean | null;
  exclusividade_data_vencimento: string | null;
  aceita_parceria_status: "SIM" | "NAO" | "SOB_ANALISE" | null;
  exclusividade_comissao_minha_percentual: number | null;
  exclusividade_comissao_parceiro_percentual: number | null;
  step_rascunho: number | null;
};

type EmpreendimentoAssociacaoRow = {
  id: string;
  nome: string | null;
  status: string | null;
  descricao: string | null;
  tipo_uso: "RESIDENCIAL" | "COMERCIAL" | null;
  categoria_residencial: string | null;
  tipologias_residenciais: string[] | null;
  categoria_comercial: string | null;
  tipologias_comerciais: string[] | null;
  bairro_comercial: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  geolocacao_id: string | null;
  lat: number | null;
  lng: number | null;
  address_json: Record<string, unknown> | null;
  localizacao_contexto: Record<string, unknown> | null;
};

type EmpreendimentoTipoRow = {
  id: string;
  empreendimento_id: string;
  ordem: number;
  nome: string | null;
  torre_nome: string | null;
  tipologia: string | null;
  area_privativa: number | null;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  qtd_unidades: number | null;
};

type MidiaRelacaoEmpreendimentoRow = {
  ref_id: string;
  midia_id: string;
  ordem: number;
};

type MidiaUrlRow = {
  id: string;
  url: string | null;
};

type BolsaoExclusividadeValidationRow = {
  status: string | null;
  codigo: string | null;
  exclusividade: boolean | null;
  disponibilizar_no_bolsao_parceria: boolean | null;
  exclusividade_data_vencimento: string | null;
  aceita_parceria_status: string | null;
  exclusividade_comissao_minha_percentual: number | null;
  exclusividade_comissao_parceiro_percentual: number | null;
  step_rascunho: number | null;
};

type ImovelAmbienteRow = {
  id: string;
  tipo_ambiente: TipoAmbienteImovel;
  ordem: number;
  principal: boolean;
  area_m2: number | null;
  dados: Record<string, unknown> | null;
};

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeTextOrNull(value: unknown): string | null {
  const normalized = sanitizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeSearchToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeAddressJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceBoolean(value: unknown): boolean {
  return value === true;
}

function coerceAreaM2(value: unknown): ApiResult<number | null> {
  if (value == null || value === "") return ok(null);
  if (typeof value === "number") {
    if (Number.isFinite(value) && value >= 0) return ok(value);
    return fail("VALIDATION_ERROR", "Área do ambiente inválida.");
  }
  if (typeof value !== "string") return fail("VALIDATION_ERROR", "Área do ambiente inválida.");
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return ok(null);
  if (!/^\d+(\.\d+)?$/.test(normalized)) return fail("VALIDATION_ERROR", "Área do ambiente inválida.");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return fail("VALIDATION_ERROR", "Área do ambiente inválida.");
  return ok(parsed);
}

function coerceEnumOrNull<T extends string>(value: unknown, allowed: Set<string>): T | null {
  if (typeof value !== "string") return null;
  return (allowed.has(value) ? value : null) as T | null;
}

function coerceEnumArray<T extends string>(value: unknown, allowed: Set<string>): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && allowed.has(item))
    .filter((item, index, items) => items.indexOf(item) === index) as T[];
}

function normalizeDormitorioDados(raw: unknown) {
  const source = isObjectRecord(raw) ? raw : {};
  const ehSuite = coerceBoolean(source.eh_suite);
  const suitePrincipal = ehSuite ? coerceBoolean(source.suite_principal) : false;

  return {
    eh_suite: ehSuite,
    suite_principal: suitePrincipal,
    banheiro_armarios: ehSuite ? coerceBoolean(source.banheiro_armarios) : false,
    banheiro_pia_dupla: ehSuite ? coerceBoolean(source.banheiro_pia_dupla) : false,
    banheiro_box: ehSuite ? coerceBoolean(source.banheiro_box) : false,
    ar_condicionado: coerceBoolean(source.ar_condicionado),
    closet: coerceBoolean(source.closet),
    armarios_planejados: coerceBoolean(source.armarios_planejados),
    tem_cama: coerceBoolean(source.tem_cama),
    tem_tv: coerceBoolean(source.tem_tv),
    tem_varanda: coerceBoolean(source.tem_varanda),
    persiana_tipo: coerceEnumOrNull<PersianaTipoValue>(source.persiana_tipo, PERSIANA_TIPO_VALUES),
    tipo_piso: coerceEnumOrNull<AmbientePisoValue>(source.tipo_piso, AMBIENTE_PISO_VALUES),
  };
}

function normalizeCozinhaDados(raw: unknown) {
  const source = isObjectRecord(raw) ? raw : {};
  const temBancada = coerceBoolean(source.bancada);

  return {
    tipo_cozinha: coerceEnumOrNull<CozinhaTipoValue>(source.tipo_cozinha, COZINHA_TIPO_VALUES),
    armarios_planejados: coerceBoolean(source.armarios_planejados),
    fogao: coerceBoolean(source.fogao),
    forno: coerceBoolean(source.forno),
    geladeira: coerceBoolean(source.geladeira),
    microondas: coerceBoolean(source.microondas),
    bancada: temBancada,
    tipo_bancada: temBancada
      ? coerceEnumOrNull<CozinhaBancadaValue>(source.tipo_bancada, COZINHA_BANCADA_VALUES)
      : null,
    tipo_piso: coerceEnumOrNull<AmbientePisoValue>(source.tipo_piso, AMBIENTE_PISO_VALUES),
  };
}

function normalizeSalaDados(raw: unknown) {
  const source = isObjectRecord(raw) ? raw : {};
  const diferenciaisRaw = Array.isArray(source.diferenciais)
    ? source.diferenciais.filter((item): item is string => typeof item === "string")
    : [];

  const tipoPisoLegacy =
    diferenciaisRaw.includes("PISO_MADEIRA")
      ? "MADEIRA"
      : diferenciaisRaw.includes("PISO_PORCELANATO")
        ? "PORCELANATO"
        : null;

  return {
    tipo_sala: coerceEnumOrNull<SalaTipoValue>(source.tipo_sala, SALA_TIPO_VALUES),
    layout: coerceEnumOrNull<SalaLayoutValue>(source.layout, SALA_LAYOUT_VALUES),
    tipo_piso:
      coerceEnumOrNull<AmbientePisoValue>(source.tipo_piso, AMBIENTE_PISO_VALUES) ?? tipoPisoLegacy,
    diferenciais: coerceEnumArray<SalaDiferencialValue>(source.diferenciais, SALA_DIFERENCIAL_VALUES),
  };
}

function normalizeVarandaDados(raw: unknown) {
  const source = isObjectRecord(raw) ? raw : {};
  return {
    tipo_varanda: coerceEnumOrNull<VarandaTipoValue>(source.tipo_varanda, VARANDA_TIPO_VALUES),
    churrasqueira_tipo: coerceEnumOrNull<VarandaChurrasqueiraValue>(
      source.churrasqueira_tipo,
      VARANDA_CHURRASQUEIRA_VALUES,
    ),
    bancada: coerceBoolean(source.bancada),
    persiana_tipo: coerceEnumOrNull<PersianaTipoValue>(source.persiana_tipo, PERSIANA_TIPO_VALUES),
    fechada_com_vidro: coerceBoolean(source.fechada_com_vidro),
    ilha: coerceBoolean(source.ilha),
    fogao: coerceBoolean(source.fogao),
    frigobar: coerceBoolean(source.frigobar),
    chopeira: coerceBoolean(source.chopeira),
    tem_tv: coerceBoolean(source.tem_tv),
    tipo_piso: coerceEnumOrNull<AmbientePisoValue>(source.tipo_piso, AMBIENTE_PISO_VALUES),
  };
}

function toIsoDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  return normalized;
}

function computeBolsaoMinDateIso(referenceDate = new Date()): string {
  const baseDate = new Date(referenceDate);
  baseDate.setUTCHours(0, 0, 0, 0);
  baseDate.setUTCDate(baseDate.getUTCDate() + BOLSAO_EXCLUSIVIDADE_MIN_DIAS);
  return baseDate.toISOString().slice(0, 10);
}

function ensureUniqueValue(base: string, usedValues: Set<string>): string {
  if (!usedValues.has(base)) return base;
  for (let index = 2; index < 10000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!usedValues.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function coerceFinalidade(value: unknown): string {
  if (typeof value === "string" && FINALIDADE_VALUES.has(value)) return value;
  return "COMPRAR";
}

function coerceTipoImovel(value: unknown): string {
  if (typeof value === "string" && TIPO_IMOVEL_VALUES.has(value)) return value;
  return "APARTAMENTO";
}

function coerceStatus(value: unknown): string {
  if (typeof value === "string" && STATUS_VALUES.has(value)) return value;
  return "RASCUNHO";
}

function coerceUf(value: unknown): string {
  if (typeof value !== "string") return "SP";
  const normalized = value.trim().toUpperCase();
  return UF_VALUES.has(normalized) ? normalized : "SP";
}

async function listOwnerUniqueValues(
  db: DynamicClient,
  ownerId: string,
  excludeImovelId?: string,
): Promise<ApiResult<{ codigos: Set<string>; slugs: Set<string> }>> {
  const result = await db
    .from("imoveis")
    .select("id,codigo,slug_publico")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);

  const codigos = new Set<string>();
  const slugs = new Set<string>();

  for (const row of (result.data ?? []) as OwnedImovelUniqueValues[]) {
    if (excludeImovelId && row.id === excludeImovelId) continue;
    if (typeof row.codigo === "string" && row.codigo.trim().length > 0) codigos.add(row.codigo.trim());
    if (typeof row.slug_publico === "string" && row.slug_publico.trim().length > 0) {
      slugs.add(row.slug_publico.trim());
    }
  }

  return ok({ codigos, slugs });
}

async function getOwnerCorretorOneRegistro(
  db: DynamicClient,
  ownerId: string,
): Promise<ApiResult<number>> {
  const result = await db
    .from("profiles")
    .select("corretor_one_registro")
    .eq("id", ownerId)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);

  const registroRaw = (result.data as { corretor_one_registro?: unknown } | null)?.corretor_one_registro;
  if (typeof registroRaw !== "number" || !Number.isInteger(registroRaw) || registroRaw < 1001) {
    return fail("VALIDATION_ERROR", "Registro Corretor.one do usuário não está configurado.");
  }

  return ok(registroRaw);
}

function extractImovelSequenceFromCodigo(codigo: string, corretorRegistro: number): number | null {
  const match = /^ONE-(\d{4,5})-(\d+)$/.exec(codigo.trim());
  if (!match) return null;
  const [, registroPart, seqPart] = match;
  if (Number(registroPart) !== corretorRegistro) return null;
  const seq = Number(seqPart);
  if (!Number.isInteger(seq) || seq < 1) return null;
  return seq;
}

function buildNextImovelCodigo(codigos: Set<string>, corretorRegistro: number): string {
  let maxSeq = 0;
  for (const codigo of codigos) {
    const seq = extractImovelSequenceFromCodigo(codigo, corretorRegistro);
    if (seq != null && seq > maxSeq) maxSeq = seq;
  }

  let nextSeq = maxSeq + 1;
  while (true) {
    const candidate = `ONE-${corretorRegistro}-${String(nextSeq).padStart(4, "0")}`;
    if (!codigos.has(candidate)) return candidate;
    nextSeq += 1;
  }
}

async function ensureDraftGeolocacaoId(
  db: DynamicClient,
  ownerId: string,
): Promise<ApiResult<string>> {
  const placeId = `DRAFT_IMOVEL_${ownerId}`;
  const existing = await db
    .from("geolocacoes")
    .select("id")
    .eq("place_id", placeId)
    .maybeSingle();

  if (existing.error) return mapDbError(existing.error);
  if (existing.data?.id) return ok(String(existing.data.id));

  const insert = await db
    .from("geolocacoes")
    .insert({
      place_id: placeId,
      address_json: { source: "IMOVEL_DRAFT_PLACEHOLDER", owner_id: ownerId },
      logradouro: "Endereço em definição",
      numero: "s/n",
      bairro: "A definir",
      cidade: "A definir",
      uf: "SP",
      cep: null,
      lat: null,
      lng: null,
      endereco_formatado: "Endereço em definição",
    })
    .select("id")
    .single();

  if (insert.error) return mapDbError(insert.error);
  if (!insert.data?.id) return fail("DATABASE_ERROR", "Falha ao criar geolocalização de rascunho");
  return ok(String(insert.data.id));
}

function buildDraftDefaults(input: CreateImovelInput | undefined) {
  const draftTitle = sanitizeText(input?.titulo) || "Novo imóvel";
  const draftDescricao = sanitizeText(input?.descricao) || "Descrição pendente.";
  const draftLogradouro = sanitizeText(input?.logradouro) || "Endereço em definição";
  const draftNumero = sanitizeText(input?.numero) || "s/n";
  const draftBairro = sanitizeText(input?.bairro) || "A definir";
  const draftCidade = sanitizeText(input?.cidade) || "A definir";
  const draftEstado = coerceUf(input?.estado);
  const draftCep = sanitizeTextOrNull(input?.cep);
  const draftAddressJson = sanitizeAddressJson(input?.address_json);

  return {
    titulo: draftTitle,
    descricao: draftDescricao,
    logradouro: draftLogradouro,
    numero: draftNumero,
    bairro: draftBairro,
    cidade: draftCidade,
    estado: draftEstado,
    cep: draftCep,
    address_json:
      Object.keys(draftAddressJson).length > 0
        ? draftAddressJson
        : {
            source: "IMOVEL_DRAFT",
            logradouro: draftLogradouro,
            numero: draftNumero,
            bairro: draftBairro,
            cidade: draftCidade,
            uf: draftEstado,
            cep: draftCep,
          },
  };
}

function cleanPatchPayload(patch: UpdateImovelInput): Record<string, unknown> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  const clean = Object.fromEntries(entries);
  delete clean.codigo;
  delete clean.slug_publico;
  delete clean.varandas;

  if ("step_rascunho" in clean) {
    const rawValue = clean.step_rascunho;
    const parsed =
      typeof rawValue === "number" && Number.isInteger(rawValue)
        ? rawValue
        : typeof rawValue === "string" && /^\d+$/.test(rawValue.trim())
          ? Number(rawValue.trim())
          : null;

    if (parsed == null || parsed < 1 || parsed > 11) {
      delete clean.step_rascunho;
    } else {
      clean.step_rascunho = parsed;
    }
  }

  return clean;
}

const PUBLIC_URL_SLUG_AFFECTING_KEYS = new Set([
  "finalidade",
  "tipo_negociacao",
  "estado",
  "cidade",
  "bairro",
  "bairro_comercial",
  "tipo",
  "subtipo",
  "dormitorios",
  "suites",
  "salas",
  "vagas",
  "area_util",
  "area_total",
  "area_terreno",
  "empreendimento_id",
  "address_json",
]);

function hasSlugAffectingPatchField(patch: Record<string, unknown>): boolean {
  return Object.keys(patch).some((key) => PUBLIC_URL_SLUG_AFFECTING_KEYS.has(key));
}

function extractBairroComercialForSlug(
  rowBairroComercial: unknown,
  rowAddressJson: unknown,
  patchAddressJson: unknown,
): string | null {
  const fromPatchAddress =
    patchAddressJson &&
    typeof patchAddressJson === "object" &&
    !Array.isArray(patchAddressJson) &&
    typeof (patchAddressJson as Record<string, unknown>).bairro_comercial === "string"
      ? ((patchAddressJson as Record<string, unknown>).bairro_comercial as string).trim()
      : "";
  if (fromPatchAddress) return fromPatchAddress;

  const fromRowAddress =
    rowAddressJson &&
    typeof rowAddressJson === "object" &&
    !Array.isArray(rowAddressJson) &&
    typeof (rowAddressJson as Record<string, unknown>).bairro_comercial === "string"
      ? ((rowAddressJson as Record<string, unknown>).bairro_comercial as string).trim()
      : "";
  if (fromRowAddress) return fromRowAddress;

  if (typeof rowBairroComercial === "string" && rowBairroComercial.trim().length > 0) {
    return rowBairroComercial.trim();
  }
  return null;
}

export async function listImoveis(accessToken: string): Promise<ApiResult<Imovel[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("imoveis")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as Imovel[]);
}

export async function getImovelById(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<Imovel>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("imoveis")
    .select("*")
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Imovel not found");

  const imovel = result.data as Imovel & { empreendimento_id?: string | null };
  const empreendimentoId = typeof imovel.empreendimento_id === "string"
    ? imovel.empreendimento_id.trim()
    : "";

  let empreendimentoNome: string | null = null;
  if (empreendimentoId) {
    const empreendimentoResult = await db
      .from("empreendimentos")
      .select("nome")
      .eq("id", empreendimentoId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (empreendimentoResult.error) return mapDbError(empreendimentoResult.error);
    if (
      empreendimentoResult.data &&
      typeof empreendimentoResult.data.nome === "string" &&
      empreendimentoResult.data.nome.trim().length > 0
    ) {
      empreendimentoNome = empreendimentoResult.data.nome.trim();
    }
  }

  return ok({
    ...imovel,
    empreendimento_nome: empreendimentoNome,
  } as Imovel);
}

export async function createImovel(
  accessToken: string,
  input: CreateImovelInput = {},
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;
  const baseDefaults = buildDraftDefaults(input);

  const geolocacaoInput = sanitizeTextOrNull(input.geolocacao_id);
  let geolocacaoId = geolocacaoInput;
  if (!geolocacaoId) {
    const geolocacaoResult = await ensureDraftGeolocacaoId(db, user.id);
    if (!geolocacaoResult.ok) return geolocacaoResult;
    geolocacaoId = geolocacaoResult.data;
  }

  const status = coerceStatus(input.status);
  const finalidade = coerceFinalidade(input.finalidade);
  const tipo = coerceTipoImovel(input.tipo);

  const result = await db
    .from("imoveis")
    .insert({
      owner_id: user.id,
      codigo: null,
      slug_publico: null,
      titulo: baseDefaults.titulo,
      descricao: baseDefaults.descricao,
      finalidade,
      tipo,
      status,
      geolocacao_id: geolocacaoId,
      logradouro: baseDefaults.logradouro,
      numero: baseDefaults.numero,
      bairro: baseDefaults.bairro,
      cidade: baseDefaults.cidade,
      estado: baseDefaults.estado,
      cep: baseDefaults.cep,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      address_json: baseDefaults.address_json,
      empreendimento_id: input.empreendimento_id ?? null,
      empreendimento_tipo_id: input.empreendimento_tipo_id ?? null,
      empreendimento_tipologia_label: sanitizeTextOrNull(input.empreendimento_tipologia_label),
      step_rascunho:
        typeof input.step_rascunho === "number" && Number.isInteger(input.step_rascunho)
          ? Math.max(1, Math.min(11, input.step_rascunho))
          : 1,
    })
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("DATABASE_ERROR", "Imovel insert returned no data");
  return ok({ id: result.data.id as string });
}

export async function updateImovel(
  accessToken: string,
  imovelId: string,
  patch: UpdateImovelInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const cleanPatch = cleanPatchPayload(patch);
  if (Object.keys(cleanPatch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const currentImovelResult = await db
    .from("imoveis")
    .select(
      "status,codigo,slug_publico,finalidade,tipo,subtipo,tipo_negociacao,estado,cidade,bairro,bairro_comercial,address_json,dormitorios,suites,salas,vagas,area_util,area_total,area_terreno,empreendimento_id,exclusividade,disponibilizar_no_bolsao_parceria,exclusividade_data_vencimento,aceita_parceria_status,exclusividade_comissao_minha_percentual,exclusividade_comissao_parceiro_percentual,step_rascunho",
    )
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (currentImovelResult.error) return mapDbError(currentImovelResult.error);
  if (!currentImovelResult.data) return fail("NOT_FOUND", "Imovel not found");
  const currentImovel = currentImovelResult.data as ImovelRowForUpdate;

  const mergedRules = {
    ...(currentImovel as BolsaoExclusividadeValidationRow),
    ...(cleanPatch as Partial<BolsaoExclusividadeValidationRow>),
  } as BolsaoExclusividadeValidationRow;

  if (typeof cleanPatch.step_rascunho === "number") {
    const currentStep =
      typeof currentImovel.step_rascunho === "number"
        ? currentImovel.step_rascunho
        : 1;
    if (cleanPatch.step_rascunho > currentStep + 1) {
      return fail(
        "VALIDATION_ERROR",
        "Não é permitido avançar etapas sem concluir as validações anteriores.",
      );
    }
  }

  if (mergedRules.disponibilizar_no_bolsao_parceria) {
    if (!mergedRules.exclusividade) {
      return fail(
        "VALIDATION_ERROR",
        "Para oferecer no bolsão, o imóvel precisa estar no modelo Minha captação com exclusividade.",
      );
    }

    if (
      !mergedRules.aceita_parceria_status ||
      !ACEITA_PARCERIA_STATUS_VALUES.has(mergedRules.aceita_parceria_status) ||
      (mergedRules.aceita_parceria_status !== "SIM" &&
        mergedRules.aceita_parceria_status !== "SOB_ANALISE")
    ) {
      return fail(
        "VALIDATION_ERROR",
        "Para oferecer no bolsão, marque que aceita parceria com outros corretores.",
      );
    }

    const vencimentoIso = toIsoDateOnly(mergedRules.exclusividade_data_vencimento);
    if (!vencimentoIso) {
      return fail(
        "VALIDATION_ERROR",
        "Para oferecer no bolsão, informe a data de vencimento da exclusividade.",
      );
    }

    const minVencimentoIso = computeBolsaoMinDateIso();
    if (vencimentoIso < minVencimentoIso) {
      return fail(
        "VALIDATION_ERROR",
        `Para oferecer no bolsão, o vencimento da exclusividade precisa ter no mínimo ${BOLSAO_EXCLUSIVIDADE_MIN_DIAS} dias a partir de hoje.`,
      );
    }

    if (
      mergedRules.exclusividade_comissao_minha_percentual == null ||
      mergedRules.exclusividade_comissao_parceiro_percentual == null
    ) {
      return fail(
        "VALIDATION_ERROR",
        "Preencha as comissões de exclusividade para disponibilizar no bolsão.",
      );
    }
  }

  const currentStatus = sanitizeText(currentImovel.status);
  const currentCodigo = sanitizeTextOrNull(currentImovel.codigo);
  const currentSlug = sanitizeTextOrNull(currentImovel.slug_publico);
  const requestedStatus = sanitizeText(cleanPatch.status);
  const isPublishingNow = requestedStatus === "PUBLICADO" && currentStatus !== "PUBLICADO";

  const patchToSave: Record<string, unknown> = { ...cleanPatch };
  let ownerUniqueValues: { codigos: Set<string>; slugs: Set<string> } | null = null;
  async function getOwnerUniqueValuesForUpdate(): Promise<ApiResult<{ codigos: Set<string>; slugs: Set<string> }>> {
    if (ownerUniqueValues) return ok(ownerUniqueValues);
    const uniqueValuesResult = await listOwnerUniqueValues(db, user.id, imovelId);
    if (!uniqueValuesResult.ok) return uniqueValuesResult;
    ownerUniqueValues = uniqueValuesResult.data;
    return ok(ownerUniqueValues);
  }

  if (isPublishingNow) {
    const ownerRegistroResult = await getOwnerCorretorOneRegistro(db, user.id);
    if (!ownerRegistroResult.ok) return ownerRegistroResult;

    const hasValidOwnerCode =
      currentCodigo != null &&
      extractImovelSequenceFromCodigo(currentCodigo, ownerRegistroResult.data) != null;

    if (!hasValidOwnerCode) {
      const uniqueValuesResult = await getOwnerUniqueValuesForUpdate();
      if (!uniqueValuesResult.ok) return uniqueValuesResult;
      patchToSave.codigo = buildNextImovelCodigo(
        uniqueValuesResult.data.codigos,
        ownerRegistroResult.data,
      );
    }
  }

  const shouldRegenerateSlugOnPublish = isPublishingNow;
  const shouldRegenerateSlugOnPublishedEdit =
    currentStatus === "PUBLICADO" && hasSlugAffectingPatchField(cleanPatch);
  const shouldRegenerateSlug = shouldRegenerateSlugOnPublish || shouldRegenerateSlugOnPublishedEdit;

  if (shouldRegenerateSlug) {
    const uniqueValuesResult = await getOwnerUniqueValuesForUpdate();
    if (!uniqueValuesResult.ok) return uniqueValuesResult;

    const mergedEmpreendimentoId = sanitizeTextOrNull(
      Object.prototype.hasOwnProperty.call(patchToSave, "empreendimento_id")
        ? patchToSave.empreendimento_id
        : currentImovel.empreendimento_id,
    );

    let empreendimentoNome: string | null = null;
    if (mergedEmpreendimentoId) {
      const empreendimentoResult = await db
        .from("empreendimentos")
        .select("nome")
        .eq("id", mergedEmpreendimentoId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (empreendimentoResult.error) return mapDbError(empreendimentoResult.error);
      empreendimentoNome = sanitizeTextOrNull(
        (empreendimentoResult.data as { nome?: string | null } | null)?.nome,
      );
    }

    const mergedAddressJson = Object.prototype.hasOwnProperty.call(patchToSave, "address_json")
      ? patchToSave.address_json
      : null;

    const mergedBairroComercial = extractBairroComercialForSlug(
      Object.prototype.hasOwnProperty.call(patchToSave, "bairro_comercial")
        ? patchToSave.bairro_comercial
        : currentImovel.bairro_comercial,
      currentImovel.address_json,
      mergedAddressJson,
    );

    const mergedCodigo = sanitizeTextOrNull(
      Object.prototype.hasOwnProperty.call(patchToSave, "codigo")
        ? patchToSave.codigo
        : currentImovel.codigo,
    );

    const slugBase = buildImovelPublicSlug({
      finalidade: Object.prototype.hasOwnProperty.call(patchToSave, "finalidade")
        ? patchToSave.finalidade
        : currentImovel.finalidade,
      tipo_negociacao: Object.prototype.hasOwnProperty.call(patchToSave, "tipo_negociacao")
        ? patchToSave.tipo_negociacao
        : currentImovel.tipo_negociacao,
      estado: Object.prototype.hasOwnProperty.call(patchToSave, "estado")
        ? patchToSave.estado
        : currentImovel.estado,
      cidade: Object.prototype.hasOwnProperty.call(patchToSave, "cidade")
        ? patchToSave.cidade
        : currentImovel.cidade,
      bairro: Object.prototype.hasOwnProperty.call(patchToSave, "bairro")
        ? patchToSave.bairro
        : currentImovel.bairro,
      bairro_comercial: mergedBairroComercial,
      tipo: Object.prototype.hasOwnProperty.call(patchToSave, "tipo")
        ? patchToSave.tipo
        : currentImovel.tipo,
      subtipo: Object.prototype.hasOwnProperty.call(patchToSave, "subtipo")
        ? patchToSave.subtipo
        : currentImovel.subtipo,
      dormitorios: Object.prototype.hasOwnProperty.call(patchToSave, "dormitorios")
        ? patchToSave.dormitorios
        : currentImovel.dormitorios,
      suites: Object.prototype.hasOwnProperty.call(patchToSave, "suites")
        ? patchToSave.suites
        : currentImovel.suites,
      salas: Object.prototype.hasOwnProperty.call(patchToSave, "salas")
        ? patchToSave.salas
        : currentImovel.salas,
      area_util: Object.prototype.hasOwnProperty.call(patchToSave, "area_util")
        ? patchToSave.area_util
        : currentImovel.area_util,
      area_total: Object.prototype.hasOwnProperty.call(patchToSave, "area_total")
        ? patchToSave.area_total
        : currentImovel.area_total,
      area_terreno: Object.prototype.hasOwnProperty.call(patchToSave, "area_terreno")
        ? patchToSave.area_terreno
        : currentImovel.area_terreno,
      vagas: Object.prototype.hasOwnProperty.call(patchToSave, "vagas")
        ? patchToSave.vagas
        : currentImovel.vagas,
      empreendimento_nome: empreendimentoNome,
      codigo: mergedCodigo,
    });

    patchToSave.slug_publico = ensureUniqueValue(slugBase, uniqueValuesResult.data.slugs);
  } else if (!currentSlug && currentStatus === "PUBLICADO") {
    const uniqueValuesResult = await getOwnerUniqueValuesForUpdate();
    if (!uniqueValuesResult.ok) return uniqueValuesResult;
    const fallbackSlug = buildImovelPublicSlug({
      finalidade: currentImovel.finalidade,
      tipo_negociacao: currentImovel.tipo_negociacao,
      estado: currentImovel.estado,
      cidade: currentImovel.cidade,
      bairro: currentImovel.bairro,
      bairro_comercial: extractBairroComercialForSlug(
        currentImovel.bairro_comercial,
        currentImovel.address_json,
        null,
      ),
      tipo: currentImovel.tipo,
      subtipo: currentImovel.subtipo,
      dormitorios: currentImovel.dormitorios,
      suites: currentImovel.suites,
      salas: currentImovel.salas,
      area_util: currentImovel.area_util,
      area_total: currentImovel.area_total,
      area_terreno: currentImovel.area_terreno,
      vagas: currentImovel.vagas,
      codigo: currentCodigo,
    });
    patchToSave.slug_publico = ensureUniqueValue(fallbackSlug, uniqueValuesResult.data.slugs);
  }

  const result = await db
    .from("imoveis")
    .update(patchToSave)
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Imovel not found");

  const nextStatus = sanitizeText(
    Object.prototype.hasOwnProperty.call(patchToSave, "status")
      ? patchToSave.status
      : currentImovel.status,
  );

  const shouldSyncPublishedMedia =
    nextStatus === "PUBLICADO" &&
    (isPublishingNow ||
      shouldRegenerateSlugOnPublishedEdit ||
      Object.prototype.hasOwnProperty.call(patchToSave, "slug_publico"));

  const shouldClearPublishedMedia = currentStatus === "PUBLICADO" && nextStatus !== "PUBLICADO";

  if (shouldSyncPublishedMedia || shouldClearPublishedMedia) {
    const syncResult = await syncImovelPublicMidia(accessToken, imovelId);
    if (!syncResult.ok) return syncResult;
  }

  return ok({ id: result.data.id as string });
}

export async function getImovelAmbientes(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<ImovelAmbienteItem[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const imovelResult = await db
    .from("imoveis")
    .select("id")
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (imovelResult.error) return mapDbError(imovelResult.error);
  if (!imovelResult.data) return fail("NOT_FOUND", "Imovel not found");

  const ambientesResult = await (
    db as unknown as {
      from: (table: "imovel_ambientes") => {
        select: (columns: "id,tipo_ambiente,ordem,principal,area_m2,dados") => {
          eq: (column: "owner_id", value: string) => {
            eq: (column2: "imovel_id", value2: string) => {
              order: (
                column3: "tipo_ambiente" | "ordem",
                options?: { ascending?: boolean },
              ) => Promise<{ data: ImovelAmbienteRow[] | null; error: { message: string; code?: string } | null }>;
            };
          };
        };
      };
    }
  )
    .from("imovel_ambientes")
    .select("id,tipo_ambiente,ordem,principal,area_m2,dados")
    .eq("owner_id", user.id)
    .eq("imovel_id", imovelId)
    .order("tipo_ambiente", { ascending: true });

  if (ambientesResult.error) return mapDbError(ambientesResult.error);

  const sorted = [...(ambientesResult.data ?? [])].sort((a, b) => {
    if (a.tipo_ambiente === b.tipo_ambiente) return a.ordem - b.ordem;
    return a.tipo_ambiente.localeCompare(b.tipo_ambiente);
  });

  return ok(
    sorted.map((row) => ({
      id: row.id,
      tipo_ambiente: row.tipo_ambiente,
      ordem: row.ordem,
      principal: row.principal,
      area_m2: row.area_m2,
      dados: isObjectRecord(row.dados) ? row.dados : {},
    })),
  );
}

export async function replaceImovelAmbientes(
  accessToken: string,
  imovelId: string,
  ambientesInput: ImovelAmbienteInput[],
): Promise<ApiResult<{ id: string; ambientes: ImovelAmbienteItem[] }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const imovelResult = await db
    .from("imoveis")
    .select("id")
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (imovelResult.error) return mapDbError(imovelResult.error);
  if (!imovelResult.data) return fail("NOT_FOUND", "Imovel not found");

  const grouped: Record<
    TipoAmbienteImovel,
    Array<{ principal: boolean; area_m2: number | null; dados: Record<string, unknown> }>
  > = {
    DORMITORIO: [],
    COZINHA: [],
    SALA: [],
    VARANDA: [],
  };

  for (const item of ambientesInput) {
    if (!item || typeof item !== "object") {
      return fail("VALIDATION_ERROR", "Ambiente inválido.");
    }

    const tipo = item.tipo_ambiente;
    if (typeof tipo !== "string" || !TIPO_AMBIENTE_IMOVEL_VALUES.has(tipo)) {
      return fail("VALIDATION_ERROR", "Tipo de ambiente inválido.");
    }

    const parsedArea = coerceAreaM2(item.area_m2);
    if (!parsedArea.ok) return parsedArea;

    if (tipo === "DORMITORIO") {
      const dados = normalizeDormitorioDados(item.dados);
      grouped.DORMITORIO.push({
        principal: dados.suite_principal,
        area_m2: parsedArea.data,
        dados,
      });
      continue;
    }

    if (tipo === "COZINHA") {
      const dados = normalizeCozinhaDados(item.dados);
      grouped.COZINHA.push({
        principal: false,
        area_m2: parsedArea.data,
        dados,
      });
      continue;
    }

    if (tipo === "SALA") {
      const dados = normalizeSalaDados(item.dados);
      grouped.SALA.push({
        principal: coerceBoolean(item.principal),
        area_m2: parsedArea.data,
        dados,
      });
      continue;
    }

    const dados = normalizeVarandaDados(item.dados);
    grouped.VARANDA.push({
      principal: false,
      area_m2: parsedArea.data,
      dados,
    });
  }

  if (grouped.DORMITORIO.filter((item) => item.principal).length > 1) {
    return fail("VALIDATION_ERROR", "Defina apenas uma suíte principal.");
  }

  if (grouped.SALA.filter((item) => item.principal).length > 1) {
    return fail("VALIDATION_ERROR", "Defina apenas uma sala principal.");
  }

  const orderedTypes: TipoAmbienteImovel[] = ["DORMITORIO", "COZINHA", "SALA", "VARANDA"];
  for (const tipo of orderedTypes) {
    const rows = grouped[tipo].map((item, index) => ({
      owner_id: user.id,
      imovel_id: imovelId,
      tipo_ambiente: tipo,
      ordem: index,
      principal: item.principal,
      area_m2: item.area_m2,
      dados: item.dados,
    }));

    if (rows.length > 0) {
      const upsertResult = await (
        db as unknown as {
          from: (table: "imovel_ambientes") => {
            upsert: (
              values: Array<{
                owner_id: string;
                imovel_id: string;
                tipo_ambiente: TipoAmbienteImovel;
                ordem: number;
                principal: boolean;
                area_m2: number | null;
                dados: Record<string, unknown>;
              }>,
              options: { onConflict: string },
            ) => Promise<{ error: { message: string; code?: string } | null }>;
          };
        }
      )
        .from("imovel_ambientes")
        .upsert(rows, { onConflict: "imovel_id,tipo_ambiente,ordem" });

      if (upsertResult.error) return mapDbError(upsertResult.error);

      const trimExtraResult = await (
        db as unknown as {
          from: (table: "imovel_ambientes") => {
            delete: () => {
              eq: (column: "owner_id", value: string) => {
                eq: (column2: "imovel_id", value2: string) => {
                  eq: (column3: "tipo_ambiente", value3: TipoAmbienteImovel) => {
                    gte: (
                      column4: "ordem",
                      value4: number,
                    ) => Promise<{ error: { message: string; code?: string } | null }>;
                  };
                };
              };
            };
          };
        }
      )
        .from("imovel_ambientes")
        .delete()
        .eq("owner_id", user.id)
        .eq("imovel_id", imovelId)
        .eq("tipo_ambiente", tipo)
        .gte("ordem", rows.length);

      if (trimExtraResult.error) return mapDbError(trimExtraResult.error);
      continue;
    }

    const clearTypeResult = await (
      db as unknown as {
        from: (table: "imovel_ambientes") => {
          delete: () => {
            eq: (column: "owner_id", value: string) => {
              eq: (column2: "imovel_id", value2: string) => {
                eq: (
                  column3: "tipo_ambiente",
                  value3: TipoAmbienteImovel,
                ) => Promise<{ error: { message: string; code?: string } | null }>;
              };
            };
          };
        };
      }
    )
      .from("imovel_ambientes")
      .delete()
      .eq("owner_id", user.id)
      .eq("imovel_id", imovelId)
      .eq("tipo_ambiente", tipo);

    if (clearTypeResult.error) return mapDbError(clearTypeResult.error);
  }

  const suitesCount = grouped.DORMITORIO.filter((item) => item.dados.eh_suite === true).length;
  const syncImovelSummaryResult = await db
    .from("imoveis")
    .update({
      dormitorios: grouped.DORMITORIO.length,
      suites: suitesCount,
      cozinhas: grouped.COZINHA.length,
      salas: grouped.SALA.length,
    })
    .eq("id", imovelId)
    .eq("owner_id", user.id);

  if (syncImovelSummaryResult.error) return mapDbError(syncImovelSummaryResult.error);

  const ambientesAtualizados = await getImovelAmbientes(accessToken, imovelId);
  if (!ambientesAtualizados.ok) return ambientesAtualizados;

  return ok({
    id: imovelId,
    ambientes: ambientesAtualizados.data,
  });
}

export async function listEmpreendimentosParaAssociacao(
  accessToken: string,
  searchTerm: string,
  includeEmpreendimentoId?: string,
): Promise<ApiResult<EmpreendimentoParaAssociacao[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const empreendimentosResult = await db
    .from("empreendimentos")
    .select(
      "id,nome,status,descricao,tipo_uso,categoria_residencial,tipologias_residenciais,categoria_comercial,tipologias_comerciais,bairro_comercial,logradouro,numero,bairro,cidade,estado,cep,geolocacao_id,lat,lng,address_json,localizacao_contexto",
    )
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (empreendimentosResult.error) return mapDbError(empreendimentosResult.error);

  const allEmpreendimentos = (empreendimentosResult.data ?? []) as EmpreendimentoAssociacaoRow[];
  const normalizedSearch = normalizeSearchToken(searchTerm);
  const includeId = (includeEmpreendimentoId ?? "").trim();

  const filtered = allEmpreendimentos.filter((item) => {
    if (includeId && item.id === includeId) return true;

    if (item.status !== "PUBLICADO" && item.status !== "PAUSADO") return false;
    if (!normalizedSearch) return true;
    const haystack = normalizeSearchToken(
      [
        item.nome,
        item.bairro_comercial,
        item.logradouro,
        item.numero,
        item.bairro,
        item.cidade,
        item.estado,
        item.cep,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" "),
    );
    return haystack.includes(normalizedSearch);
  });

  const empreendimentos = filtered.slice(0, 50);
  if (includeId && !empreendimentos.some((item) => item.id === includeId)) {
    const includedItem = allEmpreendimentos.find((item) => item.id === includeId);
    if (includedItem) {
      if (empreendimentos.length >= 50) {
        empreendimentos.pop();
      }
      empreendimentos.unshift(includedItem);
    }
  }
  const empreendimentoIds = empreendimentos.map((item) => item.id);

  const tiposByEmpreendimentoId = new Map<string, EmpreendimentoParaAssociacao["tipos"]>();
  const capaMidiaIdByEmpreendimentoId = new Map<string, string>();

  if (empreendimentoIds.length > 0) {
    const tiposResult = await (
      db as unknown as {
        from: (table: "empreendimento_tipos") => {
          select: (
            columns: "id,empreendimento_id,ordem,nome,torre_nome,tipologia,area_privativa,dormitorios,suites,banheiros,vagas,qtd_unidades",
          ) => {
            eq: (column: "owner_id", value: string) => {
              in: (
                column2: "empreendimento_id",
                values: string[],
              ) => Promise<{ data: EmpreendimentoTipoRow[] | null; error: { message: string; code?: string } | null }>;
            };
          };
        };
      }
    )
      .from("empreendimento_tipos")
      .select("id,empreendimento_id,ordem,nome,torre_nome,tipologia,area_privativa,dormitorios,suites,banheiros,vagas,qtd_unidades")
      .eq("owner_id", user.id)
      .in("empreendimento_id", empreendimentoIds);

    if (tiposResult.error) return mapDbError(tiposResult.error);
    for (const tipo of (tiposResult.data ?? []).sort((a, b) => a.ordem - b.ordem)) {
      const current = tiposByEmpreendimentoId.get(tipo.empreendimento_id) ?? [];
      current.push({
        id: tipo.id,
        nome: tipo.nome,
        torre_nome: tipo.torre_nome,
        tipologia: tipo.tipologia,
        area_privativa: tipo.area_privativa,
        dormitorios: tipo.dormitorios,
        suites: tipo.suites,
        banheiros: tipo.banheiros,
        vagas: tipo.vagas,
        qtd_unidades: tipo.qtd_unidades,
      });
      tiposByEmpreendimentoId.set(tipo.empreendimento_id, current);
    }

    const relacoesResult = await (
      db as unknown as {
        from: (table: "midia_relacoes") => {
          select: (columns: "ref_id,midia_id,ordem") => {
            eq: (column: "owner_id", value: string) => {
              eq: (column2: "ref_tipo", value2: "EMPREENDIMENTO") => {
                in: (
                  column3: "ref_id",
                  values: string[],
                ) => Promise<{ data: MidiaRelacaoEmpreendimentoRow[] | null; error: { message: string; code?: string } | null }>;
              };
            };
          };
        };
      }
    )
      .from("midia_relacoes")
      .select("ref_id,midia_id,ordem")
      .eq("owner_id", user.id)
      .eq("ref_tipo", "EMPREENDIMENTO")
      .in("ref_id", empreendimentoIds);

    if (relacoesResult.error) return mapDbError(relacoesResult.error);

    for (const relacao of (relacoesResult.data ?? []).sort((a, b) => a.ordem - b.ordem)) {
      if (!capaMidiaIdByEmpreendimentoId.has(relacao.ref_id)) {
        capaMidiaIdByEmpreendimentoId.set(relacao.ref_id, relacao.midia_id);
      }
    }
  }

  const capaMidiaIds = Array.from(new Set(capaMidiaIdByEmpreendimentoId.values()));
  const capaUrlByMidiaId = new Map<string, string>();

  if (capaMidiaIds.length > 0) {
    const midiaResult = await (
      db as unknown as {
        from: (table: "midia") => {
          select: (columns: "id,url") => {
            eq: (column: "owner_id", value: string) => {
              in: (
                column2: "id",
                values: string[],
              ) => Promise<{ data: MidiaUrlRow[] | null; error: { message: string; code?: string } | null }>;
            };
          };
        };
      }
    )
      .from("midia")
      .select("id,url")
      .eq("owner_id", user.id)
      .in("id", capaMidiaIds);

    if (midiaResult.error) return mapDbError(midiaResult.error);

    for (const row of midiaResult.data ?? []) {
      if (row.id && typeof row.url === "string" && row.url.length > 0) {
        capaUrlByMidiaId.set(row.id, row.url);
      }
    }
  }

  return ok(
    empreendimentos.map((item) => {
      const capaMidiaId = capaMidiaIdByEmpreendimentoId.get(item.id) ?? null;
      return {
        id: item.id,
        nome: item.nome ?? "Empreendimento sem nome",
        status: item.status ?? "RASCUNHO",
        descricao: item.descricao,
        tipo_uso: item.tipo_uso,
        categoria_residencial: item.categoria_residencial,
        tipologias_residenciais: Array.isArray(item.tipologias_residenciais)
          ? item.tipologias_residenciais.filter((value): value is string => typeof value === "string")
          : [],
        categoria_comercial: item.categoria_comercial,
        tipologias_comerciais: Array.isArray(item.tipologias_comerciais)
          ? item.tipologias_comerciais.filter((value): value is string => typeof value === "string")
          : [],
        bairro_comercial: item.bairro_comercial,
        logradouro: item.logradouro,
        numero: item.numero,
        bairro: item.bairro,
        cidade: item.cidade,
        estado: item.estado,
        cep: item.cep,
        geolocacao_id: item.geolocacao_id,
        lat: item.lat,
        lng: item.lng,
        address_json: item.address_json,
        localizacao_contexto: item.localizacao_contexto,
        capa_url: capaMidiaId ? (capaUrlByMidiaId.get(capaMidiaId) ?? null) : null,
        tipos: tiposByEmpreendimentoId.get(item.id) ?? [],
      };
    }),
  );
}

export async function deleteImovel(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const publicAssetsResult = await (db as unknown as {
    from: (table: "imovel_midia_publica") => {
      select: (columns: "storage_provider,storage_bucket,storage_path") => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "imovel_id",
            value2: string,
          ) => Promise<{
            data: Array<{
              storage_provider: "SUPABASE" | "S3";
              storage_bucket: string;
              storage_path: string;
            }> | null;
            error: { message: string; code?: string } | null;
          }>;
        };
      };
    };
  })
    .from("imovel_midia_publica")
    .select("storage_provider,storage_bucket,storage_path")
    .eq("owner_id", user.id)
    .eq("imovel_id", imovelId);

  if (publicAssetsResult.error) return mapDbError(publicAssetsResult.error);

  const enqueueDeleteJobResult = await enqueueImovelDeleteJob(db, user.id, imovelId);
  if (!enqueueDeleteJobResult.ok) return enqueueDeleteJobResult;

  const result = await db
    .from("imoveis")
    .delete()
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) {
    await cancelImovelDeleteJob(db, user.id, enqueueDeleteJobResult.data.id);
    return mapDbError(result.error);
  }
  if (!result.data) {
    await cancelImovelDeleteJob(db, user.id, enqueueDeleteJobResult.data.id);
    return fail("NOT_FOUND", "Imovel not found");
  }

  for (const asset of publicAssetsResult.data ?? []) {
    const enqueuePublicAssetDeleteResult = await enqueueMidiaDeleteJob(db, user.id, {
      midiaId: null,
      storageProvider: asset.storage_provider,
      storageBucket: asset.storage_bucket,
      storagePath: asset.storage_path,
    });
    if (!enqueuePublicAssetDeleteResult.ok) {
      console.error("[deleteImovel] falha ao enfileirar remoção de mídia pública", {
        imovelId,
        storageBucket: asset.storage_bucket,
        storagePath: asset.storage_path,
        code: enqueuePublicAssetDeleteResult.error.code,
        message: enqueuePublicAssetDeleteResult.error.message,
      });
    }
  }

  return ok({ id: result.data.id as string });
}
