import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { deleteMidiaOwned, syncEmpreendimentoPublicMidia } from "@/lib/db/midia";

export type Empreendimento = {
  id: string;
  owner_id: string;
  slug_publico: string | null;
  nome: string;
  status: string;
  cidade: string;
  estado: string;
  caracteristica_ids?: string[];
  categoria_residencial?: string | null;
  tipologias_residenciais?: string[] | null;
  categoria_comercial?: string | null;
  tipologias_comerciais?: string[] | null;
  resumo_curto?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
  localizacao_contexto?: Record<string, unknown> | null;
  qtd_elevadores?: number | null;
  unidades_por_andar?: number | null;
  unidades_terreo?: number | null;
  unidades_cobertura?: number | null;
  tipos_cadastro?: Array<Record<string, unknown>> | null;
  created_at: string;
  updated_at: string;
};

export type CreateEmpreendimentoInput = {
  slug_publico?: string | null;
  nome: string;
  descricao?: string | null;
  geolocacao_id: string;
  tipo_uso?: "RESIDENCIAL" | "COMERCIAL" | null;
  categoria_imovel?: string | null;
  categoria_residencial?: string | null;
  tipologias_residenciais?: string[] | null;
  categoria_comercial?: string | null;
  tipologias_comerciais?: string[] | null;
  logradouro: string;
  numero: string;
  bairro: string;
  bairro_comercial?: string | null;
  cidade: string;
  estado: string;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_json?: Record<string, unknown> | null;
  localizacao_contexto?: Record<string, unknown> | null;
  fase?: string;
  previsao_entrega_em?: string | null;
  estagio_obra?: string | null;
  obra_percentuais?: Record<string, unknown> | null;
  construtora?: string | null;
  incorporadora?: string | null;
  administradora?: string | null;
  ano_construcao?: number | null;
  resumo_curto?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
  n_torres?: number | null;
  n_andares?: number | null;
  n_unidades?: number | null;
  qtd_elevadores?: number | null;
  unidades_por_andar?: number | null;
  unidades_terreo?: number | null;
  unidades_cobertura?: number | null;
  tipos_cadastro?: Array<Record<string, unknown>> | null;
  caracteristicas?: string[] | null;
  caracteristica_ids?: string[] | null;
  status?: string;
};

export type UpdateEmpreendimentoInput = Partial<CreateEmpreendimentoInput> & {
  publicado_em?: string | null;
};

type FaseEmpreendimento = "NA_PLANTA" | "EM_CONSTRUCAO" | "ENTREGUE";
type TipoUsoEmpreendimento = "RESIDENCIAL" | "COMERCIAL";
type CategoriaResidencialEmpreendimento = "APARTAMENTOS" | "CASAS" | "TERRENOS";
type CategoriaComercialEmpreendimento =
  | "ESCRITORIO_CONJUNTO"
  | "CASAS"
  | "TERRENOS"
  | "SHOPPING"
  | "LOGISTICO";

type CorretorPerfilSeo = {
  primeiro_nome: string | null;
  sobrenome: string | null;
  nickname: string | null;
  genero: string | null;
};

function normalizeFaseEmpreendimento(value: unknown): FaseEmpreendimento | null {
  if (typeof value !== "string") return null;
  if (value === "NA_PLANTA") return "NA_PLANTA";
  if (value === "EM_CONSTRUCAO" || value === "EM_OBRAS") return "EM_CONSTRUCAO";
  if (value === "ENTREGUE") return "ENTREGUE";
  return null;
}

function normalizeTipoUsoEmpreendimento(value: unknown): TipoUsoEmpreendimento | null {
  if (value === "RESIDENCIAL") return "RESIDENCIAL";
  if (value === "COMERCIAL") return "COMERCIAL";
  return null;
}

function normalizeCategoriaResidencialEmpreendimento(
  value: unknown,
): CategoriaResidencialEmpreendimento | null {
  if (value === "APARTAMENTOS") return "APARTAMENTOS";
  if (value === "CASAS") return "CASAS";
  if (value === "TERRENOS") return "TERRENOS";
  return null;
}

function normalizeCategoriaComercialEmpreendimento(
  value: unknown,
): CategoriaComercialEmpreendimento | null {
  if (value === "ESCRITORIO_CONJUNTO") return "ESCRITORIO_CONJUNTO";
  if (value === "CASAS") return "CASAS";
  if (value === "TERRENOS") return "TERRENOS";
  if (value === "SHOPPING") return "SHOPPING";
  if (value === "LOGISTICO") return "LOGISTICO";
  return null;
}

function normalizeLocalidadeToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyPublico(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function isSlugPublicoNotNullViolation(error: {
  code?: string;
  message?: string;
  details?: string | null;
}) {
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    (error.code === "23502" || message.includes("not-null constraint")) &&
    message.includes("slug_publico")
  );
}

function truncateForSeo(value: string, max: number) {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparableText(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type DuplicateCheckCandidate = {
  nome?: unknown;
  logradouro?: unknown;
  numero?: unknown;
  bairro?: unknown;
  cidade?: unknown;
  estado?: unknown;
  cep?: unknown;
};

type TipoCadastroInputItem = Record<string, unknown> & {
  id?: unknown;
  nome?: unknown;
  torre_nome?: unknown;
  tipologia?: unknown;
  area_privativa?: unknown;
  dormitorios?: unknown;
  suites?: unknown;
  banheiros?: unknown;
  vagas?: unknown;
  qtd_unidades?: unknown;
  plantas?: unknown;
};

type TipoCadastroDbRow = {
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

type TipoCadastroPlantaDbRow = {
  empreendimento_tipo_id: string;
  midia_id: string;
  ordem: number;
  alt: string | null;
  legenda: string | null;
};

type MidiaUrlDbRow = {
  id: string;
  url: string | null;
};

async function findDuplicateEmpreendimentoByNomeOuEndereco(
  db: DynamicClient,
  ownerId: string,
  candidate: DuplicateCheckCandidate,
  excludeId?: string,
): Promise<{ kind: "nome" | "endereco"; id: string } | null> {
  const result = await db
    .from("empreendimentos")
    .select("id,nome,logradouro,numero,bairro,cidade,estado,cep,status")
    .eq("owner_id", ownerId)
    .or("status.is.null,status.neq.RASCUNHO")
    .order("created_at", { ascending: false });

  if (result.error) return null;
  const rows = (result.data ?? []) as Array<{
    id?: string | null;
    nome?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
  }>;

  const candidateNome = normalizeComparableText(candidate.nome);
  const candidateAddress = {
    logradouro: normalizeComparableText(candidate.logradouro),
    numero: normalizeComparableText(candidate.numero),
    bairro: normalizeComparableText(candidate.bairro),
    cidade: normalizeComparableText(candidate.cidade),
    estado: normalizeComparableText(candidate.estado),
    cep: normalizeComparableText(candidate.cep),
  };
  const hasFullAddressCandidate = Boolean(
    candidateAddress.logradouro &&
      candidateAddress.numero &&
      candidateAddress.bairro &&
      candidateAddress.cidade &&
      candidateAddress.estado,
  );

  for (const row of rows) {
    const rowId = row.id ?? "";
    if (!rowId) continue;
    if (excludeId && rowId === excludeId) continue;

    const rowNome = normalizeComparableText(row.nome);
    if (candidateNome && rowNome && candidateNome === rowNome) {
      return { kind: "nome", id: rowId };
    }

    if (!hasFullAddressCandidate) continue;
    const rowAddress = {
      logradouro: normalizeComparableText(row.logradouro),
      numero: normalizeComparableText(row.numero),
      bairro: normalizeComparableText(row.bairro),
      cidade: normalizeComparableText(row.cidade),
      estado: normalizeComparableText(row.estado),
      cep: normalizeComparableText(row.cep),
    };

    if (
      candidateAddress.logradouro === rowAddress.logradouro &&
      candidateAddress.numero === rowAddress.numero &&
      candidateAddress.bairro === rowAddress.bairro &&
      candidateAddress.cidade === rowAddress.cidade &&
      candidateAddress.estado === rowAddress.estado &&
      candidateAddress.cep === rowAddress.cep
    ) {
      return { kind: "endereco", id: rowId };
    }
  }

  return null;
}

async function resolveUniqueEmpreendimentoSlug(
  db: DynamicClient,
  ownerId: string,
  baseInput: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyPublico(baseInput) || "empreendimento";
  const result = await db
    .from("empreendimentos")
    .select("id,slug_publico")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (result.error) {
    return `${base}-${Date.now().toString(36)}`;
  }

  const used = new Set(
    (result.data ?? [])
      .filter((row) => !excludeId || row.id !== excludeId)
      .map((row) => (typeof row.slug_publico === "string" ? row.slug_publico.trim() : ""))
      .filter((value) => value.length > 0),
  );

  if (!used.has(base)) return base;
  for (let index = 2; index <= 9999; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function buildCorretorDisplayName(profile: CorretorPerfilSeo | null) {
  if (!profile) return "";
  const fullName = [profile.primeiro_nome, profile.sobrenome]
    .map((item) => cleanText(item))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) return fullName;
  return cleanText(profile.nickname);
}

function buildCorretorRole(profile: CorretorPerfilSeo | null) {
  if (profile?.genero === "FEMININO") {
    return {
      roleLabel: "corretora",
      byLabel: "pela corretora",
    };
  }
  return {
    roleLabel: "corretor",
    byLabel: "pelo corretor",
  };
}

async function resolvePreposicaoCidade(
  db: DynamicClient,
  cidade: string,
  uf: string,
): Promise<"em" | "no" | "na"> {
  const normalizedCidade = cidade.trim();
  const normalizedUf = uf.trim().toUpperCase();
  if (!normalizedCidade || !normalizedUf) return "em";

  const result = await (db as unknown as {
    from: (table: "referencia_localidades") => {
      select: (columns: "preposicao_em") => {
        eq: (column: "tipo", value: string) => {
          eq: (column2: "uf", value2: string) => {
            ilike: (
              column3: "nome",
              value3: string,
            ) => {
              maybeSingle: () => Promise<{ data: { preposicao_em: string } | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
  })
    .from("referencia_localidades")
    .select("preposicao_em")
    .eq("tipo", "CIDADE")
    .eq("uf", normalizedUf)
    .ilike("nome", normalizedCidade)
    .maybeSingle();

  if (result.error || !result.data) return "em";
  const preposicao = result.data.preposicao_em;
  if (preposicao === "no" || preposicao === "na") return preposicao;
  return "em";
}

async function resolvePreposicaoBairro(
  db: DynamicClient,
  bairro: string,
): Promise<"em" | "no" | "na"> {
  const normalized = normalizeLocalidadeToken(bairro);
  if (!normalized) return "em";

  const result = await (db as unknown as {
    from: (table: "referencia_bairros") => {
      select: (columns: "preposicao_em") => {
        eq: (column: "bairro_normalizado", value: string) => {
          maybeSingle: () => Promise<{ data: { preposicao_em: string } | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("referencia_bairros")
    .select("preposicao_em")
    .eq("bairro_normalizado", normalized)
    .maybeSingle();

  if (result.error || !result.data) return "em";
  const preposicao = result.data.preposicao_em;
  if (preposicao === "no" || preposicao === "na") return preposicao;
  return "em";
}

async function buildEmpreendimentoSeoFields(
  db: DynamicClient,
  ownerId: string,
  source: {
    nome?: unknown;
    bairro?: unknown;
    cidade?: unknown;
    estado?: unknown;
  },
) {
  const nome = cleanText(source.nome);
  const bairro = cleanText(source.bairro);
  const cidade = cleanText(source.cidade);
  const estado = cleanText(source.estado).toUpperCase();

  const profileResult = await (db as unknown as {
    from: (table: "profiles") => {
      select: (columns: "primeiro_nome,sobrenome,nickname,genero") => {
        eq: (column: "id", value: string) => {
          maybeSingle: () => Promise<{ data: CorretorPerfilSeo | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("profiles")
    .select("primeiro_nome,sobrenome,nickname,genero")
    .eq("id", ownerId)
    .maybeSingle();

  const profile = profileResult.error ? null : profileResult.data;
  const corretorNome = buildCorretorDisplayName(profile);
  const nickname = cleanText(profile?.nickname);
  const corretorRole = buildCorretorRole(profile);

  const bairroPrep = bairro ? await resolvePreposicaoBairro(db, bairro) : "em";
  const cidadePrep = cidade ? await resolvePreposicaoCidade(db, cidade, estado) : "em";

  const titleBase = [
    nome || "Empreendimento",
    [bairro, [cidade, estado].filter(Boolean).join(", ")].filter(Boolean).join(", "),
    `Por Corretor.one ${nickname || corretorNome || "Corretor"}`,
  ]
    .filter(Boolean)
    .join(" - ");

  const bairroSnippet = bairro ? `${bairroPrep} ${bairro}` : "";
  const cidadeSnippet = cidade ? `${cidadePrep} ${cidade}` : "";
  const locationSnippet = [bairroSnippet, cidadeSnippet].filter(Boolean).join(", ");
  const ownerSnippet = corretorNome
    ? `${corretorRole.byLabel} ${corretorNome}`
    : `por ${corretorRole.roleLabel} da Corretor.one`;

  const descriptionBase = [
    nome ? `Conheça tudo sobre o empreendimento ${nome}` : "Conheça tudo sobre este empreendimento",
    locationSnippet ? `localizado ${locationSnippet}.` : ".",
    `Cadastro realizado ${ownerSnippet}.`,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const keywordSet = new Set<string>();
  if (nome) keywordSet.add(nome);
  if (bairro) keywordSet.add(`imóvel em ${bairro}`);
  if (cidade) keywordSet.add(`imóvel em ${cidade}`);
  if (nickname) keywordSet.add(nickname);
  if (corretorNome) keywordSet.add(corretorNome);
  keywordSet.add("corretor.one");

  return {
    meta_title: truncateForSeo(titleBase, 60),
    meta_description: truncateForSeo(descriptionBase, 155),
    keywords: Array.from(keywordSet).slice(0, 6),
  };
}

async function upsertReferenciaBairro(
  db: DynamicClient,
  bairroValue: unknown,
) {
  if (typeof bairroValue !== "string") return;
  const bairro = bairroValue.trim();
  if (!bairro) return;

  const bairroNormalizado = normalizeLocalidadeToken(bairro);
  if (!bairroNormalizado) return;

  const bairroClient = db as unknown as {
    from: (table: "referencia_bairros") => {
      upsert: (
        values: {
          bairro: string;
          bairro_normalizado: string;
          ativo: boolean;
        },
        options: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>;
    };
  };

  await bairroClient.from("referencia_bairros").upsert(
    {
      bairro,
      bairro_normalizado: bairroNormalizado,
      ativo: true,
    },
    { onConflict: "bairro_normalizado" },
  );
}

function sanitizeEstruturaVerticalFields(
  payload: Record<string, unknown>,
  context: {
    tipoUso: TipoUsoEmpreendimento | null;
    categoriaResidencial: CategoriaResidencialEmpreendimento | null;
    categoriaComercial: CategoriaComercialEmpreendimento | null;
  },
) {
  const isVertical =
    (context.tipoUso === "RESIDENCIAL" && context.categoriaResidencial === "APARTAMENTOS") ||
    (context.tipoUso === "COMERCIAL" && context.categoriaComercial === "ESCRITORIO_CONJUNTO");

  if (isVertical) return payload;

  return {
    ...payload,
    qtd_elevadores: null,
    unidades_por_andar: null,
    unidades_terreo: null,
    unidades_cobertura: null,
  };
}

function normalizeFreeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function sanitizeTextArray(value: unknown, options?: { maxItems?: number; itemMaxLength?: number }) {
  if (!Array.isArray(value)) return [] as string[];
  const maxItems = options?.maxItems ?? 8;
  const itemMaxLength = options?.itemMaxLength ?? 80;
  const next: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const normalized = normalizeFreeText(item, itemMaxLength);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(normalized);
    if (next.length >= maxItems) break;
  }
  return next;
}

function sanitizeLocalizacaoContexto(value: unknown) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    perfil_regiao: sanitizeTextArray(source.perfil_regiao),
    mobilidade: sanitizeTextArray(source.mobilidade),
    comercio_servicos: sanitizeTextArray(source.comercio_servicos),
    lazer_estilo_vida: sanitizeTextArray(source.lazer_estilo_vida),
    resumo_local: normalizeFreeText(source.resumo_local, 300),
  } satisfies Record<string, unknown>;
}

function parseTextOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseIntegerOrNull(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

function parseNumericOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function normalizeTiposCadastroInput(
  value: unknown,
): Array<TipoCadastroInputItem> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TipoCadastroInputItem => Boolean(item && typeof item === "object"));
}

function validateTiposCadastroRequiredFields(
  tipos: Array<TipoCadastroInputItem>,
): ApiResult<null> {
  for (let index = 0; index < tipos.length; index += 1) {
    const item = tipos[index];
    const nome = parseTextOrNull(item.nome);
    const tipologia = parseTextOrNull(item.tipologia);
    const areaPrivativa = parseNumericOrNull(item.area_privativa);

    if (!nome) {
      return fail(
        "VALIDATION_ERROR",
        `Tipo ${index + 1}: nome é obrigatório.`,
      );
    }
    if (!tipologia) {
      return fail(
        "VALIDATION_ERROR",
        `Tipo ${index + 1}: tipologia é obrigatória.`,
      );
    }
    if (areaPrivativa == null || areaPrivativa <= 0) {
      return fail(
        "VALIDATION_ERROR",
        `Tipo ${index + 1}: área privativa é obrigatória e deve ser maior que zero.`,
      );
    }
  }
  return ok(null);
}

async function replaceEmpreendimentoTiposCadastro(
  db: DynamicClient,
  ownerId: string,
  empreendimentoId: string,
  tiposCadastroInput: unknown,
): Promise<ApiResult<{ total: number }>> {
  const tipos = normalizeTiposCadastroInput(tiposCadastroInput);
  const requiredValidation = validateTiposCadastroRequiredFields(tipos);
  if (!requiredValidation.ok) return requiredValidation;

  const deleteTiposResult = await (db as unknown as {
    from: (table: "empreendimento_tipos") => {
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "empreendimento_id",
            value2: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  })
    .from("empreendimento_tipos")
    .delete()
    .eq("owner_id", ownerId)
    .eq("empreendimento_id", empreendimentoId);

  if (deleteTiposResult.error) return mapDbError(deleteTiposResult.error);
  if (tipos.length === 0) return ok({ total: 0 });

  const tiposRows = tipos.map((item, index) => ({
    owner_id: ownerId,
    empreendimento_id: empreendimentoId,
    ordem: index,
    nome: parseTextOrNull(item.nome),
    torre_nome: parseTextOrNull(item.torre_nome),
    tipologia: parseTextOrNull(item.tipologia),
    area_privativa: parseNumericOrNull(item.area_privativa),
    dormitorios: parseIntegerOrNull(item.dormitorios),
    suites: parseIntegerOrNull(item.suites),
    banheiros: parseIntegerOrNull(item.banheiros),
    vagas: parseIntegerOrNull(item.vagas),
    qtd_unidades: parseIntegerOrNull(item.qtd_unidades),
  }));

  const insertTiposResult = await (db as unknown as {
    from: (table: "empreendimento_tipos") => {
      insert: (values: Array<Record<string, unknown>>) => {
        select: (
          columns: "id,ordem",
        ) => Promise<{ data: Array<{ id: string; ordem: number }> | null; error: { message: string } | null }>;
      };
    };
  })
    .from("empreendimento_tipos")
    .insert(tiposRows)
    .select("id,ordem");

  if (insertTiposResult.error) return mapDbError(insertTiposResult.error);
  const insertedTipos = insertTiposResult.data ?? [];
  if (insertedTipos.length === 0) return ok({ total: 0 });

  const tipoIdByOrder = new Map<number, string>();
  for (const row of insertedTipos) {
    if (!row?.id || typeof row.ordem !== "number") continue;
    tipoIdByOrder.set(row.ordem, row.id);
  }

  const plantasRows: Array<Record<string, unknown>> = [];
  tipos.forEach((item, index) => {
    const empreendimentoTipoId = tipoIdByOrder.get(index);
    if (!empreendimentoTipoId) return;

    const plantas = Array.isArray(item.plantas) ? item.plantas : [];
    const normalizedPlantas = plantas
      .map((planta, plantaIndex) => {
        if (!planta || typeof planta !== "object") return null;
        const source = planta as Record<string, unknown>;
        const midiaId = parseTextOrNull(source.midia_id);
        if (!midiaId) return null;
        const ordem = parseIntegerOrNull(source.ordem);
        return {
          midia_id: midiaId,
          ordem: ordem ?? plantaIndex,
          alt: parseTextOrNull(source.alt),
          legenda: parseTextOrNull(source.legenda),
        };
      })
      .filter((planta): planta is { midia_id: string; ordem: number; alt: string | null; legenda: string | null } => Boolean(planta))
      .sort((a, b) => a.ordem - b.ordem)
      .slice(0, 3);

    normalizedPlantas.forEach((planta, plantaIndex) => {
      plantasRows.push({
        owner_id: ownerId,
        empreendimento_id: empreendimentoId,
        empreendimento_tipo_id: empreendimentoTipoId,
        midia_id: planta.midia_id,
        ordem: plantaIndex,
        alt: planta.alt,
        legenda: planta.legenda,
      });
    });
  });

  if (plantasRows.length > 0) {
    const insertPlantasResult = await (db as unknown as {
      from: (table: "empreendimento_tipos_plantas") => {
        insert: (values: Array<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("empreendimento_tipos_plantas")
      .insert(plantasRows);

    if (insertPlantasResult.error) return mapDbError(insertPlantasResult.error);
  }

  return ok({ total: insertedTipos.length });
}

async function loadEmpreendimentoTiposCadastroMap(
  db: DynamicClient,
  ownerId: string,
  empreendimentoIds: string[],
): Promise<ApiResult<Map<string, Array<Record<string, unknown>>>>> {
  if (empreendimentoIds.length === 0) return ok(new Map());

  const tiposResult = await (db as unknown as {
    from: (table: "empreendimento_tipos") => {
      select: (
        columns: "id,empreendimento_id,ordem,nome,torre_nome,tipologia,area_privativa,dormitorios,suites,banheiros,vagas,qtd_unidades",
      ) => {
        eq: (column: "owner_id", value: string) => {
          in: (
            column2: "empreendimento_id",
            value2: string[],
          ) => Promise<{ data: TipoCadastroDbRow[] | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("empreendimento_tipos")
    .select(
      "id,empreendimento_id,ordem,nome,torre_nome,tipologia,area_privativa,dormitorios,suites,banheiros,vagas,qtd_unidades",
    )
    .eq("owner_id", ownerId)
    .in("empreendimento_id", empreendimentoIds);

  if (tiposResult.error) return mapDbError(tiposResult.error);
  const tiposRows = tiposResult.data ?? [];
  if (tiposRows.length === 0) return ok(new Map());

  const tipoIds = tiposRows.map((row) => row.id).filter((id): id is string => typeof id === "string" && id.length > 0);
  const plantasByTipoId = new Map<
    string,
    Array<{ midia_id: string; ordem: number; alt: string; legenda: string; url: string }>
  >();

  if (tipoIds.length > 0) {
    const plantasResult = await (db as unknown as {
      from: (table: "empreendimento_tipos_plantas") => {
        select: (columns: "empreendimento_tipo_id,midia_id,ordem,alt,legenda") => {
          eq: (column: "owner_id", value: string) => {
            in: (
              column2: "empreendimento_tipo_id",
              value2: string[],
            ) => Promise<{ data: TipoCadastroPlantaDbRow[] | null; error: { message: string } | null }>;
          };
        };
      };
    })
      .from("empreendimento_tipos_plantas")
      .select("empreendimento_tipo_id,midia_id,ordem,alt,legenda")
      .eq("owner_id", ownerId)
      .in("empreendimento_tipo_id", tipoIds);

    if (plantasResult.error) return mapDbError(plantasResult.error);

    const plantasRows = plantasResult.data ?? [];
    const plantaMidiaIds = Array.from(
      new Set(
        plantasRows
          .map((row) => (typeof row?.midia_id === "string" ? row.midia_id : ""))
          .filter((value) => value.length > 0),
      ),
    );
    const midiaUrlById = new Map<string, string>();

    if (plantaMidiaIds.length > 0) {
      const midiaResult = await (db as unknown as {
        from: (table: "midia") => {
          select: (columns: "id,url") => {
            eq: (column: "owner_id", value: string) => {
              in: (
                column2: "id",
                value2: string[],
              ) => Promise<{ data: MidiaUrlDbRow[] | null; error: { message: string } | null }>;
            };
          };
        };
      })
        .from("midia")
        .select("id,url")
        .eq("owner_id", ownerId)
        .in("id", plantaMidiaIds);

      if (midiaResult.error) return mapDbError(midiaResult.error);

      for (const row of midiaResult.data ?? []) {
        if (!row?.id) continue;
        midiaUrlById.set(row.id, row.url ?? "");
      }
    }

    for (const row of plantasRows) {
      if (!row?.empreendimento_tipo_id || !row.midia_id) continue;
      const current = plantasByTipoId.get(row.empreendimento_tipo_id) ?? [];
      current.push({
        midia_id: row.midia_id,
        ordem: row.ordem ?? 0,
        alt: row.alt ?? "",
        legenda: row.legenda ?? "",
        url: midiaUrlById.get(row.midia_id) ?? "",
      });
      plantasByTipoId.set(row.empreendimento_tipo_id, current);
    }
  }

  const mapByEmpreendimento = new Map<string, Array<Record<string, unknown>>>();
  for (const row of tiposRows.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))) {
    const empreendimentoId = row.empreendimento_id;
    if (!empreendimentoId) continue;
    const current = mapByEmpreendimento.get(empreendimentoId) ?? [];
    const plantas = (plantasByTipoId.get(row.id) ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .slice(0, 3);

    current.push({
      id: row.id,
      nome: row.nome ?? "",
      torre_nome: row.torre_nome ?? "",
      tipologia: row.tipologia ?? "",
      area_privativa: row.area_privativa == null ? "" : String(row.area_privativa),
      dormitorios: row.dormitorios == null ? "" : String(row.dormitorios),
      suites: row.suites == null ? "" : String(row.suites),
      banheiros: row.banheiros == null ? "" : String(row.banheiros),
      vagas: row.vagas == null ? "" : String(row.vagas),
      qtd_unidades: row.qtd_unidades == null ? "" : String(row.qtd_unidades),
      plantas,
    });

    mapByEmpreendimento.set(empreendimentoId, current);
  }

  return ok(mapByEmpreendimento);
}

export async function listEmpreendimentos(
  accessToken: string,
): Promise<ApiResult<Empreendimento[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimentos")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  const empreendimentos = (result.data ?? []) as Empreendimento[];
  if (empreendimentos.length === 0) return ok(empreendimentos);

  const empreendimentoIds = empreendimentos.map((item) => item.id);
  const empreendimentoIdSet = new Set(empreendimentoIds);
  const caracteristicasResult = await db
    .from("empreendimento_caracteristicas")
    .select("empreendimento_id, caracteristica_id")
    .order("empreendimento_id", { ascending: true });

  if (caracteristicasResult.error) return mapDbError(caracteristicasResult.error);

  const caracteristicasMap = new Map<string, string[]>();
  for (const row of caracteristicasResult.data ?? []) {
    const empreendimentoId = row.empreendimento_id;
    const caracteristicaId = row.caracteristica_id;
    if (typeof empreendimentoId !== "string" || typeof caracteristicaId !== "string") continue;
    if (!empreendimentoIdSet.has(empreendimentoId)) continue;
    const current = caracteristicasMap.get(empreendimentoId) ?? [];
    current.push(caracteristicaId);
    caracteristicasMap.set(empreendimentoId, current);
  }

  const tiposCadastroMapResult = await loadEmpreendimentoTiposCadastroMap(
    db,
    user.id,
    empreendimentoIds,
  );
  if (!tiposCadastroMapResult.ok) return tiposCadastroMapResult;
  const tiposCadastroMap = tiposCadastroMapResult.data;

  const enriched = empreendimentos.map((item) => ({
    ...item,
    caracteristica_ids: caracteristicasMap.get(item.id) ?? [],
    tipos_cadastro: tiposCadastroMap.get(item.id) ?? item.tipos_cadastro ?? [],
  }));
  return ok(enriched);
}

export async function getEmpreendimentoById(
  accessToken: string,
  empreendimentoId: string,
): Promise<ApiResult<Empreendimento>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimentos")
    .select("*")
    .eq("id", empreendimentoId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Empreendimento not found");

  const caracteristicasResult = await db
    .from("empreendimento_caracteristicas")
    .select("caracteristica_id")
    .eq("empreendimento_id", empreendimentoId)
    .order("caracteristica_id", { ascending: true });

  if (caracteristicasResult.error) return mapDbError(caracteristicasResult.error);

  const caracteristicaIds = (caracteristicasResult.data ?? [])
    .map((row) => row.caracteristica_id)
    .filter((value): value is string => typeof value === "string");

  const tiposCadastroMapResult = await loadEmpreendimentoTiposCadastroMap(
    db,
    user.id,
    [empreendimentoId],
  );
  if (!tiposCadastroMapResult.ok) return tiposCadastroMapResult;

  return ok({
    ...(result.data as Empreendimento),
    caracteristica_ids: caracteristicaIds,
    tipos_cadastro:
      tiposCadastroMapResult.data.get(empreendimentoId) ??
      ((result.data as Empreendimento).tipos_cadastro ?? []),
  } as Empreendimento);
}

export async function createEmpreendimento(
  accessToken: string,
  input: CreateEmpreendimentoInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.nome || !input.geolocacao_id) {
    return fail("VALIDATION_ERROR", "nome and geolocacao_id are required");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;
  const { caracteristica_ids, tipos_cadastro, ...empreendimentoPayload } = input;
  const nextStatus = (empreendimentoPayload.status ?? "RASCUNHO") as string;
  const slugSeed =
    (typeof empreendimentoPayload.slug_publico === "string" &&
    empreendimentoPayload.slug_publico.trim().length > 0
      ? empreendimentoPayload.slug_publico
      : empreendimentoPayload.nome) ?? "empreendimento";
  const nextSlugPublico =
    nextStatus === "PUBLICADO"
      ? await resolveUniqueEmpreendimentoSlug(
          db,
          user.id,
          slugSeed,
        )
      : null;
  const seoFields = await buildEmpreendimentoSeoFields(db, user.id, empreendimentoPayload);
  const duplicateOnCreate = await findDuplicateEmpreendimentoByNomeOuEndereco(
    db,
    user.id,
    empreendimentoPayload,
  );
  if (duplicateOnCreate) {
    if (duplicateOnCreate.kind === "nome") {
      return fail(
        "CONFLICT",
        "Já existe um empreendimento com este nome na sua base.",
        { duplicate_id: duplicateOnCreate.id, duplicate_kind: "nome" },
      );
    }
    return fail(
      "CONFLICT",
      "Já existe um empreendimento com este endereço na sua base.",
      { duplicate_id: duplicateOnCreate.id, duplicate_kind: "endereco" },
    );
  }
  const normalizedPayload = sanitizeEstruturaVerticalFields(
    empreendimentoPayload as Record<string, unknown>,
    {
      tipoUso: normalizeTipoUsoEmpreendimento(empreendimentoPayload.tipo_uso),
      categoriaResidencial: normalizeCategoriaResidencialEmpreendimento(
        empreendimentoPayload.categoria_residencial,
      ),
      categoriaComercial: normalizeCategoriaComercialEmpreendimento(
        empreendimentoPayload.categoria_comercial,
      ),
    },
  );
  const normalizedLocalizacaoContexto = sanitizeLocalizacaoContexto(
    empreendimentoPayload.localizacao_contexto,
  );

  const insertBasePayload = {
    owner_id: user.id,
    ...normalizedPayload,
    localizacao_contexto: normalizedLocalizacaoContexto,
    ...seoFields,
    fase: empreendimentoPayload.fase ?? "ENTREGUE",
    status: nextStatus,
  };

  const insertEmpreendimento = (slugPublico: string | null) =>
    db
      .from("empreendimentos")
      .insert({
        ...insertBasePayload,
        slug_publico: slugPublico,
      })
      .select("id")
      .single();

  let result = await insertEmpreendimento(nextSlugPublico);
  if (
    result.error &&
    nextSlugPublico === null &&
    isSlugPublicoNotNullViolation({
      code: result.error.code,
      message: result.error.message,
      details: result.error.details,
    })
  ) {
    const fallbackSlugPublico = await resolveUniqueEmpreendimentoSlug(db, user.id, slugSeed);
    result = await insertEmpreendimento(fallbackSlugPublico);
  }

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("DATABASE_ERROR", "Empreendimento insert returned no data");
  const empreendimentoId = result.data.id as string;

  void upsertReferenciaBairro(db, empreendimentoPayload.bairro);

  if (caracteristica_ids && caracteristica_ids.length > 0) {
    const relationRows = caracteristica_ids.map((caracteristicaId) => ({
      empreendimento_id: empreendimentoId,
      caracteristica_id: caracteristicaId,
    }));

    const relationInsert = await (db as unknown as {
      from: (table: "empreendimento_caracteristicas") => {
        insert: (
          value: { empreendimento_id: string; caracteristica_id: string }[],
        ) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("empreendimento_caracteristicas")
      .insert(relationRows);

      if (relationInsert.error) return mapDbError(relationInsert.error);
  }

  const tiposCadastroSyncResult = await replaceEmpreendimentoTiposCadastro(
    db,
    user.id,
    empreendimentoId,
    tipos_cadastro,
  );
  if (!tiposCadastroSyncResult.ok) return tiposCadastroSyncResult;

  return ok({ id: empreendimentoId });
}

export async function updateEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
  patch: UpdateEmpreendimentoInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;
  const patchEmpreendimento = { ...patch };
  const caracteristicaIds = patch.caracteristica_ids;
  const tiposCadastro = patch.tipos_cadastro;
  delete patchEmpreendimento.caracteristica_ids;
  delete patchEmpreendimento.tipos_cadastro;

  if (
    Object.keys(patchEmpreendimento).length === 0 &&
    caracteristicaIds === undefined &&
    tiposCadastro === undefined
  ) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const ownership = await db
    .from("empreendimentos")
    .select(
      "id, fase, status, slug_publico, tipo_uso, categoria_residencial, categoria_comercial, nome, logradouro, numero, bairro, cidade, estado, cep",
    )
    .eq("id", empreendimentoId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (ownership.error) return mapDbError(ownership.error);
  if (!ownership.data) return fail("NOT_FOUND", "Empreendimento not found");

  const linkedImoveisResult = await db
    .from("imoveis")
    .select("id")
    .eq("owner_id", user.id)
    .eq("empreendimento_id", empreendimentoId)
    .limit(1);

  if (linkedImoveisResult.error) return mapDbError(linkedImoveisResult.error);

  const hasLinkedImoveis = (linkedImoveisResult.data?.length ?? 0) > 0;
  const patchEmpreendimentoRecord = patchEmpreendimento as Record<string, unknown>;
  const ownershipRecord = ownership.data as Record<string, unknown>;

  const enderecoCamposBaseBloqueados = [
    "logradouro",
    "numero",
    "bairro",
    "cidade",
    "estado",
    "cep",
  ] as const;

  const camposSempreDescartarComImoveis = [
    "nome",
    ...enderecoCamposBaseBloqueados,
    "lat",
    "lng",
    "address_json",
  ] as const;

  if (hasLinkedImoveis) {
    const hasPatchField = (field: string) =>
      Object.prototype.hasOwnProperty.call(patchEmpreendimentoRecord, field);
    const textFieldChanged = (field: string) =>
      hasPatchField(field) &&
      normalizeComparableText(patchEmpreendimentoRecord[field]) !==
        normalizeComparableText(ownershipRecord[field]);

    const attemptedNomeChange = textFieldChanged("nome");
    const attemptedEnderecoBaseChange = enderecoCamposBaseBloqueados.some((field) =>
      textFieldChanged(field),
    );

    if (attemptedNomeChange) {
      return fail(
        "CONFLICT",
        "Não é possível alterar o nome deste empreendimento porque existem imóveis vinculados.",
      );
    }

    if (attemptedEnderecoBaseChange) {
      return fail(
        "CONFLICT",
        "Não é possível alterar o endereço deste empreendimento porque existem imóveis vinculados.",
      );
    }

    for (const field of camposSempreDescartarComImoveis) {
      delete patchEmpreendimentoRecord[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(patchEmpreendimento, "fase")) {
    const currentFase = normalizeFaseEmpreendimento(ownership.data.fase);
    const nextFase = normalizeFaseEmpreendimento(patchEmpreendimento.fase);
    if (!nextFase) {
      return fail("VALIDATION_ERROR", "Fase inválida para empreendimento.");
    }

    if (currentFase === "ENTREGUE" && nextFase !== "ENTREGUE") {
      return fail(
        "VALIDATION_ERROR",
        "Empreendimentos entregues não podem voltar para outra fase.",
      );
    }
    if (currentFase === "EM_CONSTRUCAO" && nextFase === "NA_PLANTA") {
      return fail(
        "VALIDATION_ERROR",
        "Empreendimentos em obras só podem permanecer em obras ou avançar para entregue.",
      );
    }

    patchEmpreendimento.fase = nextFase;
  }

  if (Object.keys(patchEmpreendimento).length > 0) {
    const mergedTipoUso = normalizeTipoUsoEmpreendimento(
      Object.prototype.hasOwnProperty.call(patchEmpreendimento, "tipo_uso")
        ? patchEmpreendimento.tipo_uso
        : ownership.data.tipo_uso,
    );
    const mergedCategoriaResidencial = normalizeCategoriaResidencialEmpreendimento(
      Object.prototype.hasOwnProperty.call(patchEmpreendimento, "categoria_residencial")
        ? patchEmpreendimento.categoria_residencial
        : ownership.data.categoria_residencial,
    );
    const mergedCategoriaComercial = normalizeCategoriaComercialEmpreendimento(
      Object.prototype.hasOwnProperty.call(patchEmpreendimento, "categoria_comercial")
        ? patchEmpreendimento.categoria_comercial
        : ownership.data.categoria_comercial,
    );
    const safePatchEmpreendimento = sanitizeEstruturaVerticalFields(
      patchEmpreendimento as Record<string, unknown>,
      {
        tipoUso: mergedTipoUso,
        categoriaResidencial: mergedCategoriaResidencial,
        categoriaComercial: mergedCategoriaComercial,
      },
    );
    if (Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "localizacao_contexto")) {
      safePatchEmpreendimento.localizacao_contexto = sanitizeLocalizacaoContexto(
        safePatchEmpreendimento.localizacao_contexto,
      );
    }
    const duplicateOnUpdate = await findDuplicateEmpreendimentoByNomeOuEndereco(
      db,
      user.id,
      {
        nome: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "nome")
          ? (safePatchEmpreendimento as Record<string, unknown>).nome
          : ownership.data.nome,
        logradouro: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "logradouro")
          ? (safePatchEmpreendimento as Record<string, unknown>).logradouro
          : ownership.data.logradouro,
        numero: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "numero")
          ? (safePatchEmpreendimento as Record<string, unknown>).numero
          : ownership.data.numero,
        bairro: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "bairro")
          ? (safePatchEmpreendimento as Record<string, unknown>).bairro
          : ownership.data.bairro,
        cidade: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "cidade")
          ? (safePatchEmpreendimento as Record<string, unknown>).cidade
          : ownership.data.cidade,
        estado: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "estado")
          ? (safePatchEmpreendimento as Record<string, unknown>).estado
          : ownership.data.estado,
        cep: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "cep")
          ? (safePatchEmpreendimento as Record<string, unknown>).cep
          : ownership.data.cep,
      },
      empreendimentoId,
    );
    if (duplicateOnUpdate) {
      if (duplicateOnUpdate.kind === "nome") {
        return fail(
          "CONFLICT",
          "Já existe um empreendimento com este nome na sua base.",
          { duplicate_id: duplicateOnUpdate.id, duplicate_kind: "nome" },
        );
      }
      return fail(
        "CONFLICT",
        "Já existe um empreendimento com este endereço na sua base.",
        { duplicate_id: duplicateOnUpdate.id, duplicate_kind: "endereco" },
      );
    }
    const seoSource = {
      nome: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "nome")
        ? (safePatchEmpreendimento as Record<string, unknown>).nome
        : ownership.data.nome,
      bairro: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "bairro")
        ? (safePatchEmpreendimento as Record<string, unknown>).bairro
        : ownership.data.bairro,
      cidade: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "cidade")
        ? (safePatchEmpreendimento as Record<string, unknown>).cidade
        : ownership.data.cidade,
      estado: Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "estado")
        ? (safePatchEmpreendimento as Record<string, unknown>).estado
        : ownership.data.estado,
    };
    const seoFields = await buildEmpreendimentoSeoFields(db, user.id, seoSource);
    const finalPatch = {
      ...safePatchEmpreendimento,
      ...seoFields,
    } as Record<string, unknown>;

    const statusForUpdate = String(
      Object.prototype.hasOwnProperty.call(safePatchEmpreendimento, "status")
        ? (safePatchEmpreendimento as Record<string, unknown>).status
        : ownership.data.status,
    );

    if (statusForUpdate === "PUBLICADO") {
      const requestedSlug =
        typeof (safePatchEmpreendimento as Record<string, unknown>).slug_publico === "string"
          ? ((safePatchEmpreendimento as Record<string, unknown>).slug_publico as string).trim()
          : "";
      const currentSlug =
        typeof ownership.data.slug_publico === "string" ? ownership.data.slug_publico.trim() : "";
      const slugSource =
        requestedSlug ||
        currentSlug ||
        (typeof finalPatch.nome === "string" ? (finalPatch.nome as string) : ownership.data.nome);
      finalPatch.slug_publico = await resolveUniqueEmpreendimentoSlug(
        db,
        user.id,
        slugSource,
        empreendimentoId,
      );
      if (!Object.prototype.hasOwnProperty.call(finalPatch, "publicado_em")) {
        finalPatch.publicado_em = new Date().toISOString();
      }
    } else if (!ownership.data.slug_publico) {
      finalPatch.slug_publico = null;
    }

    const updateResult = await db
      .from("empreendimentos")
      .update(finalPatch)
      .eq("id", empreendimentoId)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (updateResult.error) return mapDbError(updateResult.error);
    if (!updateResult.data) return fail("NOT_FOUND", "Empreendimento not found");

    const currentStatus = String(ownership.data.status ?? "").trim();
    const nextStatus = String(
      Object.prototype.hasOwnProperty.call(finalPatch, "status")
        ? finalPatch.status
        : ownership.data.status,
    ).trim();
    const currentSlug =
      typeof ownership.data.slug_publico === "string" ? ownership.data.slug_publico.trim() : "";
    const nextSlug =
      typeof finalPatch.slug_publico === "string" ? finalPatch.slug_publico.trim() : currentSlug;

    const shouldSyncPublishedMedia =
      nextStatus === "PUBLICADO" &&
      (currentStatus !== "PUBLICADO" || nextSlug !== currentSlug);
    const shouldClearPublishedMedia = currentStatus === "PUBLICADO" && nextStatus !== "PUBLICADO";

    if (shouldSyncPublishedMedia || shouldClearPublishedMedia) {
      const syncResult = await syncEmpreendimentoPublicMidia(accessToken, empreendimentoId);
      if (!syncResult.ok) return syncResult;
    }

    const bairroForCatalog = Object.prototype.hasOwnProperty.call(
      finalPatch,
      "bairro",
    )
      ? (finalPatch as Record<string, unknown>).bairro
      : undefined;
    void upsertReferenciaBairro(db, bairroForCatalog);
  }

  if (caracteristicaIds !== undefined) {
    const relationDelete = await (db as unknown as {
      from: (table: "empreendimento_caracteristicas") => {
        delete: () => {
          eq: (column: string, value: unknown) => Promise<{ error: { message: string } | null }>;
        };
      };
    })
      .from("empreendimento_caracteristicas")
      .delete()
      .eq("empreendimento_id", empreendimentoId);

    if (relationDelete.error) return mapDbError(relationDelete.error);

    if (Array.isArray(caracteristicaIds) && caracteristicaIds.length > 0) {
      const relationRows = caracteristicaIds.map((caracteristicaId) => ({
        empreendimento_id: empreendimentoId,
        caracteristica_id: caracteristicaId,
      }));

      const relationInsert = await (db as unknown as {
        from: (table: "empreendimento_caracteristicas") => {
          insert: (
            value: { empreendimento_id: string; caracteristica_id: string }[],
          ) => Promise<{ error: { message: string } | null }>;
        };
      })
        .from("empreendimento_caracteristicas")
        .insert(relationRows);

      if (relationInsert.error) return mapDbError(relationInsert.error);
    }
  }

  if (tiposCadastro !== undefined) {
    const tiposCadastroSyncResult = await replaceEmpreendimentoTiposCadastro(
      db,
      user.id,
      empreendimentoId,
      tiposCadastro,
    );
    if (!tiposCadastroSyncResult.ok) return tiposCadastroSyncResult;
  }

  return ok({ id: empreendimentoId });
}

export async function deleteEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const linkedImoveisResult = await db
    .from("imoveis")
    .select("id")
    .eq("owner_id", user.id)
    .eq("empreendimento_id", empreendimentoId)
    .order("id", { ascending: true });

  if (linkedImoveisResult.error) return mapDbError(linkedImoveisResult.error);

  const linkedImoveisCount = linkedImoveisResult.data?.length ?? 0;
  if (linkedImoveisCount > 0) {
    return fail(
      "CONFLICT",
      `Não é possível excluir esse empreendimento porque existem ${linkedImoveisCount} imóvel(is) associado(s).`,
      { associated_imoveis: linkedImoveisCount },
    );
  }

  const linkedMidiaResult = await (db as unknown as {
    from: (table: "midia_relacoes") => {
      select: (columns: "midia_id") => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "ref_tipo", value2: "EMPREENDIMENTO") => {
            eq: (column3: "ref_id", value3: string) => Promise<{
              data: Array<{ midia_id: string }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  })
    .from("midia_relacoes")
    .select("midia_id")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId);

  if (linkedMidiaResult.error) return mapDbError(linkedMidiaResult.error);

  const linkedMidiaIdsFromRelacoes = Array.from(
    new Set(
      (linkedMidiaResult.data ?? [])
        .map((row) => row.midia_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const linkedPlantasMidiaResult = await (db as unknown as {
    from: (table: "empreendimento_tipos_plantas") => {
      select: (columns: "midia_id") => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "empreendimento_id", value2: string) => Promise<{
            data: Array<{ midia_id: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .from("empreendimento_tipos_plantas")
    .select("midia_id")
    .eq("owner_id", user.id)
    .eq("empreendimento_id", empreendimentoId);

  if (linkedPlantasMidiaResult.error) return mapDbError(linkedPlantasMidiaResult.error);

  const linkedMidiaIdsFromPlantas = Array.from(
    new Set(
      (linkedPlantasMidiaResult.data ?? [])
        .map((row) => row.midia_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const candidateMidiaIds = Array.from(
    new Set([...linkedMidiaIdsFromRelacoes, ...linkedMidiaIdsFromPlantas]),
  );

  if (candidateMidiaIds.length > 0) {
    const allRefsResult = await (db as unknown as {
      from: (table: "midia_relacoes") => {
        select: (columns: "midia_id,ref_tipo,ref_id") => {
          eq: (column: "owner_id", value: string) => {
            in: (
              column2: "midia_id",
              values: string[],
            ) => Promise<{
              data: Array<{ midia_id: string; ref_tipo: string; ref_id: string | null }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from("midia_relacoes")
      .select("midia_id,ref_tipo,ref_id")
      .eq("owner_id", user.id)
      .in("midia_id", candidateMidiaIds);

    if (allRefsResult.error) return mapDbError(allRefsResult.error);

    const allPlantasRefsResult = await (db as unknown as {
      from: (table: "empreendimento_tipos_plantas") => {
        select: (columns: "midia_id,empreendimento_id") => {
          eq: (column: "owner_id", value: string) => {
            in: (
              column2: "midia_id",
              values: string[],
            ) => Promise<{
              data: Array<{ midia_id: string; empreendimento_id: string }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from("empreendimento_tipos_plantas")
      .select("midia_id,empreendimento_id")
      .eq("owner_id", user.id)
      .in("midia_id", candidateMidiaIds);

    if (allPlantasRefsResult.error) return mapDbError(allPlantasRefsResult.error);

    for (const midiaId of candidateMidiaIds) {
      const refs = (allRefsResult.data ?? []).filter((row) => row?.midia_id === midiaId);
      const externalMidiaRelacao = refs.some(
        (row) => row.ref_tipo !== "EMPREENDIMENTO" || row.ref_id !== empreendimentoId,
      );
      if (externalMidiaRelacao) continue;

      const plantaRefs = (allPlantasRefsResult.data ?? []).filter((row) => row?.midia_id === midiaId);
      const externalPlantaRef = plantaRefs.some((row) => row.empreendimento_id !== empreendimentoId);
      if (externalPlantaRef) continue;

      const deleteMidiaResult = await deleteMidiaOwned(accessToken, midiaId);
      if (!deleteMidiaResult.ok) return deleteMidiaResult;
    }
  }

  const result = await db
    .from("empreendimentos")
    .delete()
    .eq("id", empreendimentoId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Empreendimento not found");
  return ok({ id: result.data.id as string });
}
