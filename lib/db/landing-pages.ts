import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { mapDbError } from "@/lib/db/_errors";
import {
  RESERVED_PUBLIC_SLUGS,
  createLandingPagePreset,
  isLandingPageStatus,
  isLandingPageType,
  normalizeLandingPageContent,
  slugifyLandingPage,
  type LandingPageContent,
  type LandingPageStatus,
  type LandingPageType,
} from "@/lib/landing-pages/content";
import { normalizeOptionalText, sanitizePlainText } from "@/lib/artigos/content";

export type LandingPageRow = {
  id: string; owner_id: string; status: LandingPageStatus; tipo: LandingPageType; nome_interno: string;
  titulo: string; subtitulo: string | null; slug: string; conteudo_blocos: LandingPageContent;
  tema_config: Record<string, unknown>; imovel_id: string | null; empreendimento_id: string | null;
  meta_title: string | null; meta_description: string | null; og_image_url: string | null; indexar: boolean;
  publicado_em: string | null; encerramento_em: string | null; created_at: string; updated_at: string;
};

export type LandingPageInput = Partial<Record<keyof LandingPageRow, unknown>>;
const SELECT = "id,owner_id,status,tipo,nome_interno,titulo,subtitulo,slug,conteudo_blocos,tema_config,imovel_id,empreendimento_id,meta_title,meta_description,og_image_url,indexar,publicado_em,encerramento_em,created_at,updated_at";

export async function listLandingPages(accessToken: string): Promise<ApiResult<{ items: Array<LandingPageRow & { metrics: { views: number; visitors: number; submissions: number; conversion_rate: number } }> }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;
  const db = auth.data.client as unknown as DynamicClient;
  const [result,eventsResult] = await Promise.all([
    db.from("landing_pages").select(SELECT).eq("owner_id", auth.data.user.id).order("updated_at", { ascending: false }),
    db.from("public_events").select("resource_id,event_type,visitor_id").eq("owner_id", auth.data.user.id).eq("resource_type", "LANDING_PAGE"),
  ]);
  if (result.error) return mapDbError(result.error); if(eventsResult.error)return mapDbError(eventsResult.error);
  const events=eventsResult.data??[];
  const items=((result.data??[]) as unknown as LandingPageRow[]).map((item)=>{const own=events.filter((event)=>event.resource_id===item.id);const views=own.filter((event)=>event.event_type==="VIEW").length;const visitors=new Set(own.filter((event)=>event.event_type==="VIEW"&&event.visitor_id).map((event)=>String(event.visitor_id))).size;const submissions=own.filter((event)=>event.event_type==="FORM_SUBMIT").length;return{...item,metrics:{views,visitors,submissions,conversion_rate:views?Math.round((submissions/views)*1000)/10:0}};});
  return ok({ items });
}

export async function createLandingPage(accessToken: string, input: LandingPageInput): Promise<ApiResult<LandingPageRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;
  const type = isLandingPageType(input.tipo) ? input.tipo : "CAMPANHA_GENERICA";
  const title = sanitizePlainText(input.titulo, 140).trim() || "Nova página de captura";
  const internalName = sanitizePlainText(input.nome_interno, 120).trim() || title;
  const slug = slugifyLandingPage(typeof input.slug === "string" ? input.slug : title);
  const slugError = validateSlug(slug);
  if (slugError) return slugError;
  const db = auth.data.client as unknown as DynamicClient;
  const limitResult = await validateLandingPagePlanLimit(db, auth.data.user.id);
  if (!limitResult.ok) return limitResult;
  const result = await db.from("landing_pages").insert({
    owner_id: auth.data.user.id, status: "RASCUNHO", tipo: type, nome_interno: internalName, titulo: title, slug,
    subtitulo: null, conteudo_blocos: createLandingPagePreset(type, title), tema_config: { preset: "ELEGANTE" }, indexar: false,
  }).select(SELECT).single();
  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("DATABASE_ERROR", "Não foi possível criar a página.");
  return ok(result.data as unknown as LandingPageRow);
}

export async function getLandingPage(accessToken: string, id: string): Promise<ApiResult<LandingPageRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;
  const db = auth.data.client as unknown as DynamicClient;
  const result = await db.from("landing_pages").select(SELECT).eq("id", id).eq("owner_id", auth.data.user.id).maybeSingle();
  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Página de captura não encontrada.");
  return ok(result.data as unknown as LandingPageRow);
}

export async function updateLandingPage(accessToken: string, id: string, input: LandingPageInput): Promise<ApiResult<LandingPageRow>> {
  const current = await getLandingPage(accessToken, id);
  if (!current.ok) return current;
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;
  const normalized = normalizeInput(input, current.data);
  if (!normalized.ok) return normalized;
  const db = auth.data.client as unknown as DynamicClient;
  const result = await db.from("landing_pages").update(normalized.data).eq("id", id).eq("owner_id", auth.data.user.id).select(SELECT).single();
  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("DATABASE_ERROR", "Não foi possível salvar a página.");
  return ok(result.data as unknown as LandingPageRow);
}

export async function deleteLandingPage(accessToken: string, id: string): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;
  const db = auth.data.client as unknown as DynamicClient;
  const result = await db.from("landing_pages").delete().eq("id", id).eq("owner_id", auth.data.user.id);
  if (result.error) return mapDbError(result.error);
  return ok({ id });
}

function normalizeInput(input: LandingPageInput, current: LandingPageRow): ApiResult<Record<string, unknown>> {
  const status = isLandingPageStatus(input.status) ? input.status : current.status;
  const type = isLandingPageType(input.tipo) ? input.tipo : current.tipo;
  const internalName = sanitizePlainText(input.nome_interno ?? current.nome_interno, 120).trim();
  const title = sanitizePlainText(input.titulo ?? current.titulo, 140).trim();
  const slug = slugifyLandingPage(typeof input.slug === "string" ? input.slug : current.slug);
  if (internalName.length < 3 || title.length < 3) return fail("VALIDATION_ERROR", "Nome interno e título precisam ter ao menos 3 caracteres.");
  const slugError = validateSlug(slug);
  if (slugError) return slugError;
  const content = normalizeLandingPageContent(input.conteudo_blocos ?? current.conteudo_blocos);
  if (status === "PUBLICADO" && (!content.blocks.some((block) => block.type === "hero") || !content.blocks.some((block) => block.type === "lead_form"))) {
    return fail("VALIDATION_ERROR", "Para publicar, inclua uma seção principal e um formulário de captação.");
  }
  const requestedPublishedAt = normalizeDate(input.publicado_em ?? current.publicado_em);
  const publishedAt = status === "PUBLICADO" ? requestedPublishedAt ?? new Date().toISOString() : requestedPublishedAt;
  const endingAt = normalizeDate(input.encerramento_em ?? current.encerramento_em);
  if (publishedAt && endingAt && new Date(endingAt).getTime() <= new Date(publishedAt).getTime()) {
    return fail("VALIDATION_ERROR", "A data de encerramento precisa ser posterior à data de publicação.");
  }
  return ok({
    status, tipo: type, nome_interno: internalName, titulo: title,
    subtitulo: normalizeOptionalText(input.subtitulo ?? current.subtitulo, 240), slug, conteudo_blocos: content,
    tema_config: normalizeTheme(input.tema_config ?? current.tema_config),
    imovel_id: normalizeId(input.imovel_id ?? current.imovel_id), empreendimento_id: normalizeId(input.empreendimento_id ?? current.empreendimento_id),
    meta_title: normalizeOptionalText(input.meta_title ?? current.meta_title, 70),
    meta_description: normalizeOptionalText(input.meta_description ?? current.meta_description, 180),
    og_image_url: normalizeOptionalText(input.og_image_url ?? current.og_image_url, 500), indexar: input.indexar === true,
    encerramento_em: endingAt,
    publicado_em: publishedAt,
  });
}

function validateSlug(slug: string): ApiResult<never> | null {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail("VALIDATION_ERROR", "Informe um endereço válido para a página.");
  if (RESERVED_PUBLIC_SLUGS.has(slug)) return fail("CONFLICT", "Este endereço é reservado pelo perfil público.");
  return null;
}
function normalizeId(value: unknown) { return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null; }
function normalizeDate(value: unknown) { if (typeof value !== "string" || !value.trim()) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function normalizeTheme(value: unknown) { const source = value && typeof value === "object" ? value as Record<string, unknown> : {}; const preset = source.preset === "CLARO" || source.preset === "ESCURO" ? source.preset : "ELEGANTE"; return { preset }; }

async function validateLandingPagePlanLimit(db: DynamicClient, ownerId: string): Promise<ApiResult<true>> {
  const profile = await db.from("profiles").select("plano_id").eq("id", ownerId).maybeSingle();
  if (profile.error) return mapDbError(profile.error);
  const planId = typeof profile.data?.plano_id === "string" ? profile.data.plano_id : null;
  if (!planId) return ok(true);
  const [plan, count] = await Promise.all([
    db.from("planos").select("recursos").eq("id", planId).maybeSingle(),
    db.from("landing_pages").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
  ]);
  if (plan.error) return mapDbError(plan.error); if (count.error) return mapDbError(count.error);
  const resources = plan.data?.recursos && typeof plan.data.recursos === "object" ? plan.data.recursos as Record<string, unknown> : {};
  const limit = typeof resources.landing_pages_limite === "number" ? resources.landing_pages_limite : null;
  if (limit !== null && (count.count ?? 0) >= limit) return fail("CONFLICT", `Seu plano permite até ${limit} página(s) de captura.`);
  return ok(true);
}
