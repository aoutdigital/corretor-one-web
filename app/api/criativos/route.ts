import { NextResponse } from "next/server";

import { renderPropertyCreative } from "@/lib/creatives/render-static";
import type { CreativeFormat, PropertyCreativePayload } from "@/lib/creatives/static-template";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { buildImovelHeaderTitle, buildImovelShortTitle } from "@/lib/imoveis/display-title";
import { createMediaStorageProvider } from "@/lib/media";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const FORMATS = new Set<CreativeFormat>(["SQUARE", "PORTRAIT", "VERTICAL"]);
type Row = Record<string, unknown>;
type Result = PromiseLike<{ data: Row[] | Row | null; error: { message: string } | null }>;
type Query = { select: (columns: string) => Query; eq: (column: string, value: unknown) => Query; in: (column: string, values: unknown[]) => Query; order: (column: string, options?: { ascending?: boolean }) => Query; limit: (value: number) => Query; maybeSingle: () => Result; single: () => Result; insert: (value: unknown) => Query; update: (value: unknown) => Query } & Result;
type Db = { from: (table: string) => Query };

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function money(value: unknown) { const amount = Number(value); return Number.isFinite(amount) && amount > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(amount) : "Consulte o valor"; }
function bufferArray(buffer: Buffer) { return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer; }
function creci(profile: Row) { return [profile.creci_uf, profile.creci_numero ? `${profile.creci_numero}-F` : null].filter(Boolean).join(" "); }
function empreendimentoNome(property: Row) { const value = property.empreendimento; return value && typeof value === "object" && !Array.isArray(value) && typeof (value as Row).nome === "string" ? (value as Row).nome as string : ""; }
function localizacao(property: Row) { return [property.bairro_comercial || property.bairro, [property.cidade, property.estado].filter(Boolean).join(" / ")].filter(Boolean).join(" | "); }

async function authenticate(request: Request) {
  const token = getBearerTokenFromRequest(request); if (!token) return null;
  const admin = createSupabaseAdminClient(); const auth = await admin.auth.getUser(token);
  return auth.data.user ? { admin, ownerId: auth.data.user.id } : null;
}

export async function GET(request: Request) {
  const authenticated = await authenticate(request); if (!authenticated) return NextResponse.json({ ok: false, error: { message: "Sessão inválida" } }, { status: 401 });
  const { admin, ownerId } = authenticated; const db = admin as unknown as Db;
  const [templates, properties, media, profile, posts] = await Promise.all([
    db.from("templates").select("*").eq("ativo", true).eq("objetivo", "PROMOVER_IMOVEL").order("nome"),
    db.from("imoveis").select("id,titulo,codigo,finalidade,tipo_negociacao,tipo,subtipo,bairro_comercial,bairro,cidade,estado,preco_venda,preco_locacao,area_util,area_terreno,dormitorios,suites,salas,vagas,status,empreendimento:empreendimento_id(nome)").eq("owner_id", ownerId).eq("status", "PUBLICADO").order("updated_at", { ascending: false }),
    db.from("midia_relacoes").select("ref_id,ordem,midia:midia_id(tipo,url)").eq("owner_id", ownerId).eq("ref_tipo", "IMOVEL").order("ordem"),
    db.from("profiles").select("id,nickname,primeiro_nome,sobrenome,avatar_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero").eq("id", ownerId).maybeSingle(),
    db.from("posts").select("id,subject_id,template_id,formato,status,resultado_url,payload,erro,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(30),
  ]);
  const failed = [templates, properties, media, profile, posts].find((item) => item.error); if (failed?.error) return NextResponse.json({ ok: false, error: { message: failed.error.message } }, { status: 500 });
  const mediaRows = Array.isArray(media.data) ? media.data : [];
  const propertyRows = Array.isArray(properties.data) ? properties.data : [];
  const items = propertyRows.map((property) => ({ ...property, display_title: buildImovelHeaderTitle(property), short_title: buildImovelShortTitle(property), images: mediaRows.filter((item) => item.ref_id === property.id && item.midia && typeof item.midia === "object" && !Array.isArray(item.midia) && (item.midia as Row).tipo === "IMAGEM").map((item) => item.midia && typeof item.midia === "object" && !Array.isArray(item.midia) ? (item.midia as Row).url : null).filter((url): url is string => typeof url === "string") })).filter((property) => property.images.length > 0);
  return NextResponse.json({ ok: true, data: { templates: templates.data ?? [], properties: items, profile: profile.data, posts: posts.data ?? [] } });
}

export async function POST(request: Request) {
  const authenticated = await authenticate(request); if (!authenticated) return NextResponse.json({ ok: false, error: { message: "Sessão inválida" } }, { status: 401 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: { message: "Dados inválidos" } }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false }, { status: 400 });
  const input = body as Record<string, unknown>; const propertyId = text(input.property_id, 40); const templateId = text(input.template_id, 40); const imageUrl = text(input.image_url, 1500); const format = text(input.format, 20) as CreativeFormat;
  const cta = text(input.cta, 28); const imageLabelMode = input.image_label_mode === "LOCATION" ? "LOCATION" : "DEVELOPMENT";
  if (!propertyId || !templateId || !imageUrl || !FORMATS.has(format) || !cta) return NextResponse.json({ ok: false, error: { message: "Preencha todos os campos obrigatórios do criativo." } }, { status: 400 });
  const { admin, ownerId } = authenticated; const db = admin as unknown as Db;
  const [template, property, images, profile] = await Promise.all([
    db.from("templates").select("id,renderer_key,version,formatos,ativo,config").eq("id", templateId).eq("ativo", true).maybeSingle(),
    db.from("imoveis").select("id,titulo,codigo,finalidade,tipo_negociacao,tipo,subtipo,bairro_comercial,bairro,cidade,estado,preco_venda,preco_locacao,area_util,area_terreno,dormitorios,suites,salas,vagas,status,empreendimento:empreendimento_id(nome)").eq("id", propertyId).eq("owner_id", ownerId).eq("status", "PUBLICADO").maybeSingle(),
    db.from("midia_relacoes").select("midia:midia_id(tipo,url)").eq("ref_id", propertyId).eq("owner_id", ownerId).eq("ref_tipo", "IMOVEL"),
    db.from("profiles").select("nickname,primeiro_nome,sobrenome,avatar_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero").eq("id", ownerId).maybeSingle(),
  ]);
  const templateRow = template.data && !Array.isArray(template.data) ? template.data : null;
  const propertyRow = property.data && !Array.isArray(property.data) ? property.data : null;
  const profileRow = profile.data && !Array.isArray(profile.data) ? profile.data : null;
  if (!templateRow || !propertyRow || !profileRow || templateRow.renderer_key !== "property-essential-01" || !Array.isArray(templateRow.formatos) || !templateRow.formatos.includes(format)) return NextResponse.json({ ok: false, error: { message: "Template ou imóvel indisponível." } }, { status: 404 });
  const allowedImages = (Array.isArray(images.data) ? images.data : []).flatMap((item) => item.midia && typeof item.midia === "object" && !Array.isArray(item.midia) && (item.midia as Row).tipo === "IMAGEM" && typeof (item.midia as Row).url === "string" ? [(item.midia as Row).url as string] : []); if (!allowedImages.includes(imageUrl)) return NextResponse.json({ ok: false, error: { message: "Imagem não pertence ao imóvel." } }, { status: 400 });
  const p = propertyRow; const price = p.finalidade === "ALUGAR" ? money(p.preco_locacao) : money(p.preco_venda);
  const stats = [
    { kind: "AREA", value: Number(p.area_util) > 0 ? String(p.area_util) : "—", label: "m² úteis" },
    { kind: "BED", value: Number(p.dormitorios) > 0 ? String(p.dormitorios) : "—", label: "Dormitórios" },
    { kind: "SUITE", value: Number(p.suites) > 0 ? String(p.suites) : "—", label: "Suítes" },
    { kind: "CAR", value: Number(p.vagas) > 0 ? String(p.vagas) : "—", label: "Vagas" },
  ] as PropertyCreativePayload["property"]["stats"];
  const generatedTitle = buildImovelHeaderTitle(p); const developmentName = empreendimentoNome(p);
  const payload: PropertyCreativePayload = { property: { id: propertyId, title: generatedTitle, location: imageLabelMode === "DEVELOPMENT" && developmentName ? developmentName : localizacao(p), price, code: text(p.codigo, 40), imageUrl, stats }, broker: { name: [profileRow.primeiro_nome, profileRow.sobrenome].filter(Boolean).join(" "), nickname: text(profileRow.nickname, 35), creci: creci(profileRow), avatarUrl: text(profileRow.avatar_url, 1500) || null, logoUrl: text(profileRow.logo_nickname_url, 1500) || null, logoWhiteUrl: text(profileRow.logo_nickname_white_url, 1500) || null }, copy: { headline: "", supportingText: "", cta, titleMode: "FULL" }, format, templateConfig: templateRow.config as PropertyCreativePayload["templateConfig"] };
  const post = await db.from("posts").insert({ owner_id: ownerId, subject_type: "PROPERTY", subject_id: propertyId, template_id: templateId, tipo: "STATIC", formato: format, status: "GERANDO", payload }).select("id").single();
  const postRow = post.data && !Array.isArray(post.data) ? post.data : null;
  if (post.error || !postRow) return NextResponse.json({ ok: false, error: { message: post.error?.message ?? "Falha ao iniciar geração." } }, { status: 500 });
  const postId = String(postRow.id);
  try {
    const rendered = await renderPropertyCreative(payload); const bucket = process.env.MEDIA_BUCKET_NAME ?? "midia"; const path = `${ownerId}/creatives/${postId}/${format.toLowerCase()}.png`;
    const uploaded = await createMediaStorageProvider().upload({ bucket, path, file: new File([bufferArray(rendered)], `${postId}.png`, { type: "image/png" }), contentType: "image/png", upsert: true });
    await db.from("posts").update({ status: "PRONTO", resultado_url: uploaded.publicUrl, storage_bucket: uploaded.bucket, storage_path: uploaded.path, erro: null }).eq("id", postId).eq("owner_id", ownerId);
    return NextResponse.json({ ok: true, data: { id: postId, url: uploaded.publicUrl } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Falha ao renderizar"; await db.from("posts").update({ status: "ERRO", erro: message }).eq("id", postId).eq("owner_id", ownerId);
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
  }
}
