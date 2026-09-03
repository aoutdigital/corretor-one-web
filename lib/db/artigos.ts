import { fail, ok, type ApiResult } from "@/lib/api/result";
import {
  ARTIGOS_ORDENACOES,
  estimateReadingMinutes,
  hasLongUppercaseSequence,
  isArtigoCategoria,
  isArtigoStatus,
  normalizeArticleBlocks,
  normalizeInternalOrHttpUrl,
  normalizeOptionalText,
  sanitizePlainText,
  slugifyArticle,
  type ArtigoCategoria,
  type ArtigosOrdenacao,
  type ArtigoStatus,
} from "@/lib/artigos/content";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";

type AnyDb = {
  from: (table: string) => any;
};

export type ArtigoRow = {
  id: string;
  owner_id: string;
  status: ArtigoStatus;
  categoria: ArtigoCategoria;
  titulo: string;
  subtitulo: string | null;
  resumo: string | null;
  slug: string;
  capa_url: string | null;
  conteudo_blocos: unknown;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  indexar: boolean;
  leitura_minutos: number;
  ordem_manual: number;
  publicado_em: string | null;
  arquivado_em: string | null;
  local_nome: string | null;
  local_categoria: string | null;
  local_horario_funcionamento: string | null;
  local_website_url: string | null;
  local_whatsapp: string | null;
  local_telefone: string | null;
  localizacao_texto: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtigoConfig = {
  ordenacao_publica: ArtigosOrdenacao;
};

export type ArtigoInput = {
  status?: unknown;
  categoria?: unknown;
  titulo?: unknown;
  subtitulo?: unknown;
  resumo?: unknown;
  slug?: unknown;
  capa_url?: unknown;
  conteudo_blocos?: unknown;
  tags?: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
  canonical_url?: unknown;
  indexar?: unknown;
  ordem_manual?: unknown;
  publicado_em?: unknown;
  local_nome?: unknown;
  local_categoria?: unknown;
  local_horario_funcionamento?: unknown;
  local_website_url?: unknown;
  local_whatsapp?: unknown;
  local_telefone?: unknown;
  localizacao_texto?: unknown;
};

const ARTICLE_SELECT = [
  "id",
  "owner_id",
  "status",
  "categoria",
  "titulo",
  "subtitulo",
  "resumo",
  "slug",
  "capa_url",
  "conteudo_blocos",
  "tags",
  "meta_title",
  "meta_description",
  "canonical_url",
  "indexar",
  "leitura_minutos",
  "ordem_manual",
  "publicado_em",
  "arquivado_em",
  "local_nome",
  "local_categoria",
  "local_horario_funcionamento",
  "local_website_url",
  "local_whatsapp",
  "local_telefone",
  "localizacao_texto",
  "created_at",
  "updated_at",
].join(",");

export async function listArtigos(accessToken: string): Promise<ApiResult<{ items: ArtigoRow[]; config: ArtigoConfig }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const db = auth.data.client as unknown as AnyDb;
  const [itemsResult, configResult] = await Promise.all([
    db.from("artigos").select(ARTICLE_SELECT).order("updated_at", { ascending: false }),
    db.from("profile_artigos_config").select("ordenacao_publica").eq("owner_id", auth.data.user.id).maybeSingle(),
  ]);

  if (itemsResult.error) return mapDbError(itemsResult.error);
  if (configResult.error) return mapDbError(configResult.error);

  return ok({
    items: (itemsResult.data ?? []) as ArtigoRow[],
    config: { ordenacao_publica: (configResult.data?.ordenacao_publica ?? "PUBLICACAO_DESC") as ArtigosOrdenacao },
  });
}

export async function createArtigo(accessToken: string, input: ArtigoInput): Promise<ApiResult<ArtigoRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const normalized = normalizeArticleInput(input, { create: true });
  if (!normalized.ok) return normalized;

  const db = auth.data.client as unknown as AnyDb;
  const uniqueSlug = await ensureUniqueArticleSlug(db, auth.data.user.id, String(normalized.data.slug));
  if (!uniqueSlug.ok) return uniqueSlug;

  const insertResult = await db
    .from("artigos")
    .insert({
      ...normalized.data,
      slug: uniqueSlug.data,
      owner_id: auth.data.user.id,
    })
    .select(ARTICLE_SELECT)
    .single();

  if (insertResult.error) return mapDbError(insertResult.error);
  return ok(insertResult.data as ArtigoRow);
}

export async function getArtigo(accessToken: string, id: string): Promise<ApiResult<ArtigoRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const db = auth.data.client as unknown as AnyDb;
  const result = await db
    .from("artigos")
    .select(ARTICLE_SELECT)
    .eq("id", id)
    .eq("owner_id", auth.data.user.id)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Artigo não encontrado.");
  return ok(result.data as ArtigoRow);
}

export async function updateArtigo(accessToken: string, id: string, input: ArtigoInput): Promise<ApiResult<ArtigoRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const currentResult = await getArtigo(accessToken, id);
  if (!currentResult.ok) return currentResult;

  const normalized = normalizeArticleInput(input, { create: false, current: currentResult.data });
  if (!normalized.ok) return normalized;

  const db = auth.data.client as unknown as AnyDb;
  const uniqueSlug = await ensureUniqueArticleSlug(db, auth.data.user.id, String(normalized.data.slug), id);
  if (!uniqueSlug.ok) return uniqueSlug;

  const updateResult = await db
    .from("artigos")
    .update({ ...normalized.data, slug: uniqueSlug.data })
    .eq("id", id)
    .eq("owner_id", auth.data.user.id)
    .select(ARTICLE_SELECT)
    .single();

  if (updateResult.error) return mapDbError(updateResult.error);
  return ok(updateResult.data as ArtigoRow);
}

export async function deleteArtigo(accessToken: string, id: string): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const db = auth.data.client as unknown as AnyDb;
  const result = await db.from("artigos").delete().eq("id", id).eq("owner_id", auth.data.user.id);
  if (result.error) return mapDbError(result.error);
  return ok({ id });
}

export async function updateArtigosConfig(
  accessToken: string,
  input: { ordenacao_publica?: unknown },
): Promise<ApiResult<ArtigoConfig>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const value =
    typeof input.ordenacao_publica === "string" && ARTIGOS_ORDENACOES.includes(input.ordenacao_publica as ArtigosOrdenacao)
      ? (input.ordenacao_publica as ArtigosOrdenacao)
      : "PUBLICACAO_DESC";

  const db = auth.data.client as unknown as AnyDb;
  const result = await db
    .from("profile_artigos_config")
    .upsert({ owner_id: auth.data.user.id, ordenacao_publica: value }, { onConflict: "owner_id" })
    .select("ordenacao_publica")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ ordenacao_publica: result.data.ordenacao_publica as ArtigosOrdenacao });
}

export async function suggestArtigoCategoria(
  accessToken: string,
  input: { nome?: unknown; contexto?: unknown },
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const nome = sanitizePlainText(input.nome, 60).trim();
  if (nome.length < 3) return fail("VALIDATION_ERROR", "Informe uma sugestão com pelo menos 3 caracteres.");

  const db = auth.data.client as unknown as AnyDb;
  const result = await db
    .from("artigo_categoria_sugestoes")
    .insert({
      owner_id: auth.data.user.id,
      nome,
      contexto: normalizeOptionalText(input.contexto, 240),
    })
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}

function normalizeArticleInput(
  input: ArtigoInput,
  options: { create: boolean; current?: ArtigoRow },
): ApiResult<Record<string, unknown>> {
  const current = options.current;
  const titulo = sanitizePlainText(input.titulo ?? current?.titulo, 120).trim();
  const tituloNormalizado = titulo.toLocaleLowerCase("pt-BR");
  const isPlaceholderTitle = ["sem título", "sem titulo", "novo artigo", "novo artigo do corretor"].includes(tituloNormalizado);
  if (titulo && hasLongUppercaseSequence(titulo)) {
    return fail("VALIDATION_ERROR", "Evite palavras em caixa alta no título.");
  }

  const subtitulo = normalizeOptionalText(input.subtitulo ?? current?.subtitulo, 180);
  if (subtitulo && hasLongUppercaseSequence(subtitulo)) {
    return fail("VALIDATION_ERROR", "Evite palavras em caixa alta no subtítulo.");
  }

  const categoria = isArtigoCategoria(input.categoria)
    ? input.categoria
    : current?.categoria ?? "MERCADO_IMOBILIARIO";
  const status = isArtigoStatus(input.status) ? input.status : current?.status ?? "RASCUNHO";
  const slugSource = titulo && !isPlaceholderTitle ? titulo : current?.slug ?? "artigo";
  const slug = slugifyArticle(slugSource);
  if (!slug) return fail("VALIDATION_ERROR", "Não foi possível gerar o slug do artigo.");

  const conteudo = normalizeArticleBlocks(input.conteudo_blocos ?? current?.conteudo_blocos);
  const capaUrl = normalizeInternalOrHttpUrl(input.capa_url) ?? current?.capa_url ?? null;
  if (status === "PUBLICADO") {
    if (!titulo || titulo.length < 8 || isPlaceholderTitle) return fail("VALIDATION_ERROR", "Informe um título real antes de publicar.");
    if (!subtitulo) return fail("VALIDATION_ERROR", "Informe um subtítulo antes de publicar.");
    if (!capaUrl) return fail("VALIDATION_ERROR", "Envie uma imagem de capa antes de publicar.");
    if (conteudo.blocks.length === 0) return fail("VALIDATION_ERROR", "Adicione pelo menos um bloco antes de publicar.");
    if (categoria === "LOCAL") {
      const localNome = sanitizePlainText(input.local_nome ?? current?.local_nome, 120).trim();
      const localCategoria = sanitizePlainText(input.local_categoria ?? current?.local_categoria, 80).trim();
      const localizacaoTexto = sanitizePlainText(input.localizacao_texto ?? current?.localizacao_texto, 180).trim();
      if (!localNome || !localCategoria || !localizacaoTexto) {
        return fail("VALIDATION_ERROR", "Artigos da categoria Local precisam de nome, categoria e localização do local.");
      }
    }
  }

  const canonicalUrl = normalizeInternalOrHttpUrl(input.canonical_url) ?? null;
  const requestedPublishedAt = normalizePastOrPresentDate(input.publicado_em ?? current?.publicado_em);
  if (input.publicado_em && !requestedPublishedAt) {
    return fail("VALIDATION_ERROR", "A data de publicação não pode ser futura.");
  }
  const nowPublished = requestedPublishedAt ?? current?.publicado_em ?? new Date().toISOString();

  return ok({
    status,
    categoria,
    titulo,
    subtitulo,
    resumo: normalizeOptionalText(input.resumo ?? current?.resumo, 260),
    slug,
    capa_url: capaUrl,
    conteudo_blocos: conteudo,
    tags: normalizeTags(input.tags ?? current?.tags),
    meta_title: normalizeOptionalText(input.meta_title ?? current?.meta_title, 70),
    meta_description: normalizeOptionalText(input.meta_description ?? current?.meta_description, 180),
    canonical_url: canonicalUrl,
    indexar: typeof input.indexar === "boolean" ? input.indexar : current?.indexar ?? true,
    leitura_minutos: estimateReadingMinutes(conteudo),
    ordem_manual: normalizeInteger(input.ordem_manual ?? current?.ordem_manual, 0),
    publicado_em: status === "PUBLICADO" ? nowPublished : current?.publicado_em ?? null,
    arquivado_em: status === "ARQUIVADO" ? new Date().toISOString() : null,
    local_nome: normalizeOptionalText(input.local_nome ?? current?.local_nome, 120),
    local_categoria: normalizeOptionalText(input.local_categoria ?? current?.local_categoria, 80),
    local_horario_funcionamento: normalizeOptionalText(input.local_horario_funcionamento ?? current?.local_horario_funcionamento, 160),
    local_website_url: normalizeInternalOrHttpUrl(input.local_website_url) ?? current?.local_website_url ?? null,
    local_whatsapp: normalizeOptionalText(input.local_whatsapp ?? current?.local_whatsapp, 32),
    local_telefone: normalizeOptionalText(input.local_telefone ?? current?.local_telefone, 32),
    localizacao_texto: normalizeOptionalText(input.localizacao_texto ?? current?.localizacao_texto, 180),
  });
}

function normalizePastOrPresentDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  if (date.getTime() > now.getTime()) return null;
  return date.toISOString();
}

function normalizeInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizePlainText(item, 32).trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function ensureUniqueArticleSlug(
  db: AnyDb,
  ownerId: string,
  baseSlug: string,
  ignoreId?: string,
): Promise<ApiResult<string>> {
  const base = baseSlug.slice(0, 86).replace(/-+$/g, "") || "artigo";
  const likeResult = await db
    .from("artigos")
    .select("id,slug")
    .eq("owner_id", ownerId)
    .like("slug", `${base}%`);

  if (likeResult.error) return mapDbError(likeResult.error);

  const used = new Set(
    ((likeResult.data ?? []) as Array<{ id: string; slug: string }>)
      .filter((row) => row.id !== ignoreId)
      .map((row) => row.slug),
  );

  if (!used.has(base)) return ok(base);

  for (let suffix = 2; suffix <= 999; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return ok(candidate);
  }

  return fail("VALIDATION_ERROR", "Não foi possível gerar uma URL única para este artigo.");
}
