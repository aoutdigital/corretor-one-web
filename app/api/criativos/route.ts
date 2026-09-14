import { NextResponse } from "next/server";

import {
  renderPropertyCarousel,
  renderPropertyCreative,
} from "@/lib/creatives/render-static";
import type {
  CreativeColorTheme,
  CreativeFormat,
  PropertyCreativePayload,
} from "@/lib/creatives/static-template";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import {
  buildImovelHeaderTitle,
  buildImovelShortTitle,
} from "@/lib/imoveis/display-title";
import { createMediaStorageProvider } from "@/lib/media";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const FORMATS = new Set<CreativeFormat>(["SQUARE", "PORTRAIT", "VERTICAL"]);
type Row = Record<string, unknown>;
type Result = PromiseLike<{
  data: Row[] | Row | null;
  error: { message: string } | null;
}>;
type Query = {
  select: (columns: string) => Query;
  eq: (column: string, value: unknown) => Query;
  in: (column: string, values: unknown[]) => Query;
  order: (column: string, options?: { ascending?: boolean }) => Query;
  limit: (value: number) => Query;
  maybeSingle: () => Result;
  single: () => Result;
  insert: (value: unknown) => Query;
  update: (value: unknown) => Query;
} & Result;
type Db = { from: (table: string) => Query };

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(amount)
    : "Consulte o valor";
}
function bufferArray(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
function creci(profile: Row) {
  return [
    profile.creci_uf,
    profile.creci_numero ? `${profile.creci_numero}-F` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
function empreendimentoNome(property: Row) {
  const value = property.empreendimento;
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Row).nome === "string"
    ? ((value as Row).nome as string)
    : "";
}
function localizacao(property: Row) {
  return [
    property.bairro_comercial || property.bairro,
    [property.cidade, property.estado].filter(Boolean).join(" / "),
  ]
    .filter(Boolean)
    .join(" | ");
}
function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
function environmentTags(type: string, data: Row) {
  const tags: string[] = [];
  const add = (condition: boolean, value: string) => { if (condition) tags.push(value); };
  if (type === "DORMITORIO") {
    add(data.closet === true, "Closet"); add(data.armarios_planejados === true, "Armários planejados"); add(data.ar_condicionado === true, "Ar-condicionado"); add(data.tem_varanda === true, "Varanda"); add(data.banheiro_pia_dupla === true, "Pia dupla"); add(data.banheiro_box === true, "Box");
  } else if (type === "COZINHA") {
    add(data.armarios_planejados === true, "Armários planejados"); add(data.bancada === true || Boolean(data.tipo_bancada), "Bancada"); add(data.fogao === true, "Fogão"); add(data.forno === true, "Forno"); add(data.geladeira === true, "Geladeira");
  } else if (type === "SALA") {
    if (typeof data.layout === "string") tags.push(label(data.layout));
    if (Array.isArray(data.diferenciais)) tags.push(...data.diferenciais.filter((item): item is string => typeof item === "string").map(label));
  } else if (type === "VARANDA") {
    add(Boolean(data.churrasqueira_tipo), "Churrasqueira"); add(data.fechada_com_vidro === true, "Fechada com vidro"); add(data.bancada === true, "Bancada"); add(data.ilha === true, "Ilha"); add(data.fogao === true, "Fogão"); add(data.frigobar === true, "Frigobar"); add(data.chopeira === true, "Chopeira");
  }
  if (typeof data.tipo_piso === "string") tags.push(label(data.tipo_piso));
  return [...new Set(tags)].slice(0, 6);
}
function environmentSummaries(rows: Row[]) {
  const counters = new Map<string, number>();
  return rows.map((row) => {
    const type = text(row.tipo_ambiente, 30);
    const current = (counters.get(type) ?? 0) + 1;
    counters.set(type, current);
    const data = row.dados && typeof row.dados === "object" && !Array.isArray(row.dados) ? (row.dados as Row) : {};
    const title = type === "DORMITORIO" ? (data.suite_principal === true || row.principal === true ? "Suíte principal" : data.eh_suite === true ? `Suíte ${current}` : `Dormitório ${current}`) : type === "COZINHA" ? (current > 1 ? `Cozinha ${current}` : "Cozinha") : type === "SALA" ? (row.principal === true ? "Sala principal" : current > 1 ? `Sala ${current}` : "Sala") : type === "VARANDA" ? (current > 1 ? `Varanda ${current}` : "Varanda") : label(type);
    const subtitleValue = data.tipo_cozinha || data.tipo_sala || data.tipo_varanda || data.tipo_piso || data.layout;
    const tags = environmentTags(type, data);
    return { id: String(row.id), title, subtitle: typeof subtitleValue === "string" ? label(subtitleValue) : null, area: Number(row.area_m2) > 0 ? `${Number(row.area_m2).toLocaleString("pt-BR")} m²` : null, tags };
  });
}

async function authenticate(request: Request) {
  const token = getBearerTokenFromRequest(request);
  if (!token) return null;
  const admin = createSupabaseAdminClient();
  const auth = await admin.auth.getUser(token);
  return auth.data.user ? { admin, ownerId: auth.data.user.id } : null;
}

export async function GET(request: Request) {
  const authenticated = await authenticate(request);
  if (!authenticated)
    return NextResponse.json(
      { ok: false, error: { message: "Sessão inválida" } },
      { status: 401 },
    );
  const { admin, ownerId } = authenticated;
  const db = admin as unknown as Db;
  const [templates, properties, developments, developmentTypes, media, developmentMedia, environments, profile, authority, posts] =
    await Promise.all([
      db
        .from("templates")
        .select("*")
        .eq("ativo", true)
        .order("nome"),
      db
        .from("imoveis")
        .select(
          "id,titulo,codigo,finalidade,tipo_negociacao,tipo,subtipo,bairro_comercial,bairro,cidade,estado,preco_venda,preco_locacao,area_util,area_terreno,dormitorios,suites,salas,vagas,caracteristicas,status,empreendimento_id,empreendimento:empreendimento_id(nome)",
        )
        .eq("owner_id", ownerId)
        .eq("status", "PUBLICADO")
        .order("updated_at", { ascending: false }),
      db
        .from("empreendimentos")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("status", "PUBLICADO")
        .order("updated_at", { ascending: false }),
      db
        .from("empreendimento_tipos")
        .select("empreendimento_id,area_privativa,dormitorios,suites,vagas")
        .eq("owner_id", ownerId)
        .order("ordem"),
      db
        .from("midia_relacoes")
        .select("ref_id,ordem,midia:midia_id(tipo,url)")
        .eq("owner_id", ownerId)
        .eq("ref_tipo", "IMOVEL")
        .order("ordem"),
      db
        .from("midia_relacoes")
        .select("ref_id,ordem,midia:midia_id(tipo,url)")
        .eq("owner_id", ownerId)
        .eq("ref_tipo", "EMPREENDIMENTO")
        .order("ordem"),
      db
        .from("imovel_ambientes")
        .select("id,imovel_id,tipo_ambiente,ordem,principal,area_m2,dados")
        .eq("owner_id", ownerId)
        .order("ordem"),
      db
        .from("profiles")
        .select(
          "id,nickname,primeiro_nome,sobrenome,avatar_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero,frase_impacto",
        )
        .eq("id", ownerId)
        .maybeSingle(),
      db
        .from("profile_authority_numbers")
        .select("valor,rotulo,ordem")
        .eq("owner_id", ownerId)
        .eq("visivel", true)
        .order("ordem"),
      db
        .from("posts")
        .select(
          "id,subject_type,subject_id,template_id,formato,status,resultado_url,resultado_urls,payload,erro,created_at",
        )
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
  const failed = [
    templates,
    properties,
    developments,
    developmentTypes,
    media,
    developmentMedia,
    environments,
    profile,
    authority,
    posts,
  ].find((item) => item.error);
  if (failed?.error)
    return NextResponse.json(
      { ok: false, error: { message: failed.error.message } },
      { status: 500 },
    );
  const mediaRows = Array.isArray(media.data) ? media.data : [];
  const developmentMediaRows = Array.isArray(developmentMedia.data)
    ? developmentMedia.data
    : [];
  const propertyRows = Array.isArray(properties.data) ? properties.data : [];
  const developmentRows = Array.isArray(developments.data) ? developments.data : [];
  const developmentTypeRows = Array.isArray(developmentTypes.data) ? developmentTypes.data : [];
  const environmentRows = Array.isArray(environments.data) ? environments.data : [];
  const items = propertyRows
    .map((property) => ({
      ...property,
      display_title: buildImovelHeaderTitle(property),
      short_title: buildImovelShortTitle(property),
      images: mediaRows
        .filter(
          (item) =>
            item.ref_id === property.id &&
            item.midia &&
            typeof item.midia === "object" &&
            !Array.isArray(item.midia) &&
            (item.midia as Row).tipo === "IMAGEM",
        )
        .map((item) =>
          item.midia &&
          typeof item.midia === "object" &&
          !Array.isArray(item.midia)
            ? (item.midia as Row).url
            : null,
        )
        .filter((url): url is string => typeof url === "string"),
      development_images: developmentMediaRows
        .filter(
          (item) =>
            item.ref_id === property.empreendimento_id &&
            item.midia &&
            typeof item.midia === "object" &&
            !Array.isArray(item.midia) &&
            (item.midia as Row).tipo === "IMAGEM",
        )
        .map((item) =>
          item.midia &&
          typeof item.midia === "object" &&
          !Array.isArray(item.midia)
            ? (item.midia as Row).url
            : null,
        )
        .filter((url): url is string => typeof url === "string"),
      environments: environmentSummaries(
        environmentRows.filter((item) => item.imovel_id === property.id),
      ),
    }))
    .filter((property) => property.images.length > 0);
  const developmentItems = developmentRows
    .map((development) => {
      const typeRows = developmentTypeRows.filter((item) => item.empreendimento_id === development.id);
      const range = (key: string) => {
        const values = typeRows.map((item) => Number(item[key])).filter((value) => Number.isFinite(value) && value > 0);
        if (!values.length) return null;
        const min = Math.min(...values); const max = Math.max(...values);
        return min === max ? String(min) : `${min}–${max}`;
      };
      const images = developmentMediaRows
        .filter((item) => item.ref_id === development.id && item.midia && typeof item.midia === "object" && !Array.isArray(item.midia) && (item.midia as Row).tipo === "IMAGEM")
        .flatMap((item) => typeof (item.midia as Row).url === "string" ? [(item.midia as Row).url as string] : []);
      return {
        id: String(development.id), titulo: String(development.nome ?? "Empreendimento"), display_title: String(development.nome ?? "Empreendimento"), short_title: String(development.nome ?? "Empreendimento"),
        codigo: null, finalidade: "VENDER", tipo: String(development.categoria_imovel ?? development.tipo_uso ?? "Empreendimento"),
        bairro_comercial: typeof development.bairro_comercial === "string" ? development.bairro_comercial : null, bairro: String(development.bairro ?? ""), cidade: String(development.cidade ?? ""), estado: String(development.estado ?? ""),
        preco_venda: null, preco_locacao: null, area_util: range("area_privativa"), dormitorios: range("dormitorios"), suites: range("suites"), vagas: range("vagas"),
        caracteristicas: Array.isArray(development.caracteristicas) ? development.caracteristicas : [], images, development_images: images,
        empreendimento: { nome: String(development.nome ?? "") }, environments: [], fase: development.fase ?? null, previsao_entrega_em: development.previsao_entrega_em ?? null,
      };
    })
    .filter((development) => development.images.length > 0);
  return NextResponse.json({
    ok: true,
    data: {
      templates: templates.data ?? [],
      properties: items,
      developments: developmentItems,
      profile:
        profile.data && !Array.isArray(profile.data)
          ? { ...profile.data, authority_numbers: authority.data ?? [] }
          : profile.data,
      posts: posts.data ?? [],
    },
  });
}

export async function POST(request: Request) {
  const authenticated = await authenticate(request);
  if (!authenticated)
    return NextResponse.json(
      { ok: false, error: { message: "Sessão inválida" } },
      { status: 401 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Dados inválidos" } },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object")
    return NextResponse.json({ ok: false }, { status: 400 });
  const input = body as Record<string, unknown>;
  const developmentObjective = input.objective === "PROMOVER_EMPREENDIMENTO";
  const propertyId = text(input.property_id, 40);
  const templateId = text(input.template_id, 40);
  const imageUrl = text(input.image_url, 1500);
  const secondaryImageUrl = text(input.secondary_image_url, 1500);
  const carouselImageUrls = Array.isArray(input.carousel_image_urls)
    ? input.carousel_image_urls
        .map((value) => text(value, 1500))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const carouselSlides = Array.isArray(input.carousel_slides)
    ? input.carousel_slides.slice(0, 8).map((value, index) => {
        const slide = value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
        if (index === 1)
          return {
            kind: "NUMBERS" as const,
            imageUrl: "",
            eyebrow: "Visão geral",
            title: "",
            text: "",
            attributes: [],
          };
        const requestedKind = text(slide.kind, 20);
        const kind = (["COVER", "NUMBERS", "ENVIRONMENT", "FEATURES", "LOCATION", "CONTACT"] as const).find((item) => item === requestedKind) ?? "ENVIRONMENT";
        return {
          kind,
          environmentId: text(slide.environmentId, 40) || undefined,
          imageUrl: text(slide.imageUrl, 1500),
          eyebrow: text(slide.eyebrow, 40),
          title: text(slide.title, 120),
          text: text(slide.text, 180),
          attributes: Array.isArray(slide.attributes)
            ? slide.attributes
                .map((item) => text(item, 40))
                .filter(Boolean)
                .slice(0, 6)
            : [],
        };
      })
    : [];
  const format = text(input.format, 20) as CreativeFormat;
  const cta = text(input.cta, 28);
  const imageLabelMode =
    input.image_label_mode === "LOCATION" ? "LOCATION" : "DEVELOPMENT";
  const highlight = text(input.highlight, 28);
  const priceMode = input.price_mode === "CONSULT" ? "CONSULT" : "PRICE";
  const requestedTheme = text(input.color_theme, 20) as CreativeColorTheme;
  const colorTheme: CreativeColorTheme = [
    "MIDNIGHT",
    "PETROL",
    "FOREST",
    "BURGUNDY",
    "NAVY",
    "AUBERGINE",
  ].includes(requestedTheme)
    ? requestedTheme
    : "PETROL";
  if (!propertyId || !templateId || !imageUrl || !FORMATS.has(format) || !cta)
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "Preencha todos os campos obrigatórios do criativo.",
        },
      },
      { status: 400 },
    );
  const { admin, ownerId } = authenticated;
  const db = admin as unknown as Db;
  const [template, property, images, profile, authority] = await Promise.all([
    db
      .from("templates")
      .select("id,objetivo,renderer_key,version,formatos,ativo,config")
      .eq("id", templateId)
      .eq("ativo", true)
      .maybeSingle(),
    db
      .from(developmentObjective ? "empreendimentos" : "imoveis")
      .select(developmentObjective ? "*" : "id,titulo,codigo,finalidade,tipo_negociacao,tipo,subtipo,bairro_comercial,bairro,cidade,estado,preco_venda,preco_locacao,area_util,area_terreno,dormitorios,suites,salas,vagas,caracteristicas,status,empreendimento_id,empreendimento:empreendimento_id(nome)")
      .eq("id", propertyId)
      .eq("owner_id", ownerId)
      .eq("status", "PUBLICADO")
      .maybeSingle(),
    db
      .from("midia_relacoes")
      .select("midia:midia_id(tipo,url)")
      .eq("ref_id", propertyId)
      .eq("owner_id", ownerId)
      .eq("ref_tipo", developmentObjective ? "EMPREENDIMENTO" : "IMOVEL"),
    db
      .from("profiles")
      .select(
        "nickname,primeiro_nome,sobrenome,avatar_url,logo_nickname_url,logo_nickname_white_url,creci_uf,creci_numero,frase_impacto",
      )
      .eq("id", ownerId)
      .maybeSingle(),
    db
      .from("profile_authority_numbers")
      .select("valor,rotulo,ordem")
      .eq("owner_id", ownerId)
      .eq("visivel", true)
      .order("ordem"),
  ]);
  const templateRow =
    template.data && !Array.isArray(template.data) ? template.data : null;
  const rawSubjectRow =
    property.data && !Array.isArray(property.data) ? property.data : null;
  const developmentTypes = developmentObjective
    ? await db.from("empreendimento_tipos").select("area_privativa,dormitorios,suites,vagas").eq("owner_id", ownerId).eq("empreendimento_id", propertyId).order("ordem")
    : { data: [], error: null };
  const propertyRow: Row | null = rawSubjectRow && developmentObjective
    ? (() => {
        const typeRows = Array.isArray(developmentTypes.data) ? developmentTypes.data : [];
        const range = (key: string) => {
          const values = typeRows.map((item) => Number(item[key])).filter((value) => Number.isFinite(value) && value > 0);
          if (!values.length) return null;
          const min = Math.min(...values); const max = Math.max(...values);
          return min === max ? String(min) : `${min}–${max}`;
        };
        return { ...rawSubjectRow, titulo: rawSubjectRow.nome, codigo: "", finalidade: "VENDER", tipo: rawSubjectRow.categoria_imovel ?? rawSubjectRow.tipo_uso, preco_venda: null, preco_locacao: null, area_util: range("area_privativa"), dormitorios: range("dormitorios"), suites: range("suites"), vagas: range("vagas"), empreendimento_id: rawSubjectRow.id, empreendimento: { nome: rawSubjectRow.nome } };
      })()
    : rawSubjectRow;
  const profileRow =
    profile.data && !Array.isArray(profile.data) ? profile.data : null;
  if (
    !templateRow ||
    !propertyRow ||
    !profileRow ||
    templateRow.objetivo !== (developmentObjective ? "PROMOVER_EMPREENDIMENTO" : "PROMOVER_IMOVEL") ||
    ![
      "property-essential-01",
      "property-dual-02",
      "property-editorial-03",
      "property-journey-carousel-01",
      "development-essential-01",
      "development-dual-02",
      "development-editorial-03",
      "development-journey-carousel-01",
    ].includes(String(templateRow.renderer_key)) ||
    !Array.isArray(templateRow.formatos) ||
    !templateRow.formatos.includes(format)
  )
    return NextResponse.json(
      { ok: false, error: { message: "Template ou imóvel indisponível." } },
      { status: 404 },
    );
  const propertyImages = (
    Array.isArray(images.data) ? images.data : []
  ).flatMap((item) =>
    item.midia &&
    typeof item.midia === "object" &&
    !Array.isArray(item.midia) &&
    (item.midia as Row).tipo === "IMAGEM" &&
    typeof (item.midia as Row).url === "string"
      ? [(item.midia as Row).url as string]
      : [],
  );
  const developmentMedia = propertyRow.empreendimento_id
    ? await db
        .from("midia_relacoes")
        .select("midia:midia_id(tipo,url)")
        .eq("ref_id", propertyRow.empreendimento_id)
        .eq("owner_id", ownerId)
        .eq("ref_tipo", "EMPREENDIMENTO")
    : { data: [], error: null };
  const developmentImages = (
    Array.isArray(developmentMedia.data) ? developmentMedia.data : []
  ).flatMap((item) =>
    item.midia &&
    typeof item.midia === "object" &&
    !Array.isArray(item.midia) &&
    (item.midia as Row).tipo === "IMAGEM" &&
    typeof (item.midia as Row).url === "string"
      ? [(item.midia as Row).url as string]
      : [],
  );
  const allowedImages = [...new Set([...propertyImages, ...developmentImages])];
  const rendererKey = String(templateRow.renderer_key).replace(/^development-/, "property-");
  const dual = rendererKey === "property-dual-02";
  const editorial = rendererKey === "property-editorial-03";
  const carousel = rendererKey === "property-journey-carousel-01";
  if (
    !allowedImages.includes(imageUrl) ||
    (dual &&
      (!secondaryImageUrl || !allowedImages.includes(secondaryImageUrl))) ||
    (carousel &&
      (!carouselImageUrls.length ||
        carouselImageUrls.some((url) => !allowedImages.includes(url)) ||
        carouselSlides.length !== 8 ||
        carouselSlides.some((slide) => slide.imageUrl && !allowedImages.includes(slide.imageUrl))))
  )
    return NextResponse.json(
      {
        ok: false,
        error: {
          message:
            "Selecione imagens válidas do imóvel ou do empreendimento associado.",
        },
      },
      { status: 400 },
    );
  const p = propertyRow;
  const actualPrice =
    p.finalidade === "ALUGAR" ? money(p.preco_locacao) : money(p.preco_venda);
  const price = priceMode === "CONSULT" ? "Consulte o valor" : actualPrice;
  const stats = [
    {
      kind: "AREA",
      value: typeof p.area_util === "string" && p.area_util ? p.area_util : Number(p.area_util) > 0 ? String(p.area_util) : "—",
      label: "m² úteis",
    },
    {
      kind: "BED",
      value: typeof p.dormitorios === "string" && p.dormitorios ? p.dormitorios : Number(p.dormitorios) > 0 ? String(p.dormitorios) : "—",
      label: "Dormitórios",
    },
    {
      kind: "SUITE",
      value: typeof p.suites === "string" && p.suites ? p.suites : Number(p.suites) > 0 ? String(p.suites) : "—",
      label: "Suítes",
    },
    {
      kind: "CAR",
      value: typeof p.vagas === "string" && p.vagas ? p.vagas : Number(p.vagas) > 0 ? String(p.vagas) : "—",
      label: "Vagas",
    },
  ] as PropertyCreativePayload["property"]["stats"];
  const generatedTitle = developmentObjective ? text(p.nome ?? p.titulo, 120) : buildImovelHeaderTitle(p as Parameters<typeof buildImovelHeaderTitle>[0]);
  const developmentName = empreendimentoNome(p);
  const payload: PropertyCreativePayload = {
    property: {
      id: propertyId,
      title: generatedTitle,
      location:
        imageLabelMode === "DEVELOPMENT" && developmentName
          ? developmentName
          : localizacao(p),
      price,
      code: text(p.codigo, 40),
      imageUrl,
      secondaryImageUrl: dual ? secondaryImageUrl : undefined,
      carouselImages: carousel ? carouselImageUrls : undefined,
      carouselSlides: carousel ? carouselSlides : undefined,
      features: Array.isArray(p.caracteristicas)
        ? p.caracteristicas
            .filter((item: unknown): item is string => typeof item === "string")
            .slice(0, 6)
        : undefined,
      highlight:
        dual || editorial || carousel
          ? highlight || "Seleção especial"
          : undefined,
      stats,
    },
    broker: {
      name: [profileRow.primeiro_nome, profileRow.sobrenome]
        .filter(Boolean)
        .join(" "),
      nickname: text(profileRow.nickname, 35),
      creci: creci(profileRow),
      avatarUrl: text(profileRow.avatar_url, 1500) || null,
      logoUrl: text(profileRow.logo_nickname_url, 1500) || null,
      logoWhiteUrl: text(profileRow.logo_nickname_white_url, 1500) || null,
      tagline: text(profileRow.frase_impacto, 90) || null,
      authorityNumbers: (Array.isArray(authority.data) ? authority.data : [])
        .slice(0, 3)
        .map((item) => ({
          value: text(item.valor, 24),
          label: text(item.rotulo, 80),
        }))
        .filter((item) => item.value && item.label),
    },
    copy: { headline: "", supportingText: "", cta, titleMode: "FULL" },
    format,
    colorTheme: editorial || carousel ? colorTheme : undefined,
    templateConfig:
      templateRow.config as PropertyCreativePayload["templateConfig"],
  };
  if (developmentObjective)
    (payload as unknown as Row).development = { name: generatedTitle };
  const post = await db
    .from("posts")
    .insert({
      owner_id: ownerId,
      subject_type: developmentObjective ? "DEVELOPMENT" : "PROPERTY",
      subject_id: propertyId,
      template_id: templateId,
      tipo: carousel ? "CAROUSEL" : "STATIC",
      formato: format,
      status: "GERANDO",
      payload,
    })
    .select("id")
    .single();
  const postRow = post.data && !Array.isArray(post.data) ? post.data : null;
  if (post.error || !postRow)
    return NextResponse.json(
      {
        ok: false,
        error: { message: post.error?.message ?? "Falha ao iniciar geração." },
      },
      { status: 500 },
    );
  const postId = String(postRow.id);
  try {
    const bucket = process.env.MEDIA_BUCKET_NAME ?? "midia";
    if (carousel) {
      const renderedSlides = await renderPropertyCarousel(
        payload,
        rendererKey,
      );
      const urls: string[] = [];
      for (let index = 0; index < renderedSlides.length; index += 1) {
        const fileName = `slide-${String(index + 1).padStart(2, "0")}.png`;
        const uploaded = await createMediaStorageProvider().upload({
          bucket,
          path: `${ownerId}/creatives/${postId}/${fileName}`,
          file: new File([bufferArray(renderedSlides[index])], fileName, {
            type: "image/png",
          }),
          contentType: "image/png",
          upsert: true,
        });
        urls.push(uploaded.publicUrl);
      }
      await db
        .from("posts")
        .update({
          status: "PRONTO",
          resultado_url: urls[0],
          resultado_urls: urls,
          storage_bucket: bucket,
          storage_path: `${ownerId}/creatives/${postId}/`,
          erro: null,
        })
        .eq("id", postId)
        .eq("owner_id", ownerId);
      return NextResponse.json(
        { ok: true, data: { id: postId, url: urls[0], urls } },
        { status: 201 },
      );
    }
    const rendered = await renderPropertyCreative(
      payload,
      rendererKey,
    );
    const path = `${ownerId}/creatives/${postId}/${format.toLowerCase()}.png`;
    const uploaded = await createMediaStorageProvider().upload({
      bucket,
      path,
      file: new File([bufferArray(rendered)], `${postId}.png`, {
        type: "image/png",
      }),
      contentType: "image/png",
      upsert: true,
    });
    await db
      .from("posts")
      .update({
        status: "PRONTO",
        resultado_url: uploaded.publicUrl,
        storage_bucket: uploaded.bucket,
        storage_path: uploaded.path,
        erro: null,
      })
      .eq("id", postId)
      .eq("owner_id", ownerId);
    return NextResponse.json(
      { ok: true, data: { id: postId, url: uploaded.publicUrl } },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Falha ao renderizar";
    await db
      .from("posts")
      .update({ status: "ERRO", erro: message })
      .eq("id", postId)
      .eq("owner_id", ownerId);
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 },
    );
  }
}
