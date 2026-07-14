export const ARTIGO_CATEGORIAS = [
  { value: "LOCAL", label: "Local" },
  { value: "GUIA_COMPRA", label: "Guia de compra" },
  { value: "GUIA_VENDA", label: "Guia de venda" },
  { value: "LOCACAO", label: "Locação" },
  { value: "INVESTIMENTO", label: "Investimento" },
  { value: "FINANCIAMENTO_DOCUMENTACAO", label: "Financiamento e documentação" },
  { value: "MERCADO_IMOBILIARIO", label: "Mercado imobiliário" },
  { value: "EMPREENDIMENTO", label: "Empreendimento" },
  { value: "DECORACAO_REFORMA", label: "Decoração e reforma" },
  { value: "INSTITUCIONAL", label: "Institucional" },
] as const;

export const ARTIGO_STATUS = ["RASCUNHO", "PUBLICADO", "ARQUIVADO"] as const;
export const ARTIGOS_ORDENACOES = ["PUBLICACAO_DESC", "ATUALIZACAO_DESC", "MANUAL"] as const;
export const ARTIGO_CTA_CONFIGS = {
  curadoria: {
    id: "curadoria",
    title: "Quer encontrar o imóvel certo para você?",
    subtitle: "Conte o que está procurando e eu preparo uma seleção personalizada de imóveis de acordo com o seu perfil.",
    buttonLabel: "Pedir minha curadoria",
  },
  whatsapp: {
    id: "whatsapp",
    title: "Quer conversar sobre este assunto?",
    subtitle: "Me chame no WhatsApp para tirar suas dúvidas e entender melhor as opções disponíveis.",
    buttonLabel: "Chamar no WhatsApp",
  },
  inventory: {
    id: "inventory",
    title: "Continue procurando o imóvel ideal",
    subtitle: "Conheça os imóveis que tenho disponíveis e encontre outras oportunidades que podem combinar com você.",
    buttonLabel: "Ver imóveis disponíveis",
  },
  phone: {
    id: "phone",
    title: "Prefere conversar por telefone?",
    subtitle: "Toque no botão abaixo para me ligar e falar diretamente comigo sobre imóveis, regiões ou oportunidades.",
    buttonLabel: "Ligar agora",
  },
  advertise: {
    id: "advertise",
    title: "Quer anunciar seu imóvel?",
    subtitle: "Conte comigo para avaliar, divulgar e apresentar seu imóvel aos compradores certos.",
    buttonLabel: "Quero anunciar meu imóvel",
  },
} as const;
export const ARTIGO_CTA_TYPES = Object.keys(ARTIGO_CTA_CONFIGS) as ArtigoCtaType[];

export type ArtigoCategoria = (typeof ARTIGO_CATEGORIAS)[number]["value"];
export type ArtigoStatus = (typeof ARTIGO_STATUS)[number];
export type ArtigosOrdenacao = (typeof ARTIGOS_ORDENACOES)[number];
export type ArtigoCtaType = keyof typeof ARTIGO_CTA_CONFIGS;

export type ArtigoPropertyCarouselFilters = {
  bairro?: string | null;
  cidade?: string | null;
  empreendimentoId?: string | null;
  dormitoriosMin?: number | null;
  suitesMin?: number | null;
  vagasMin?: number | null;
  valorMin?: number | null;
  valorMax?: number | null;
  caracteristicasImovel?: string[];
  caracteristicasEmpreendimento?: string[];
};

export type ArtigoBlock =
  | {
      id: string;
      type: "paragraph";
      data: { content: string };
    }
  | {
      id: string;
      type: "heading";
      data: { level: 2 | 3; content: string };
    }
  | {
      id: string;
      type: "quote";
      data: { content: string; author?: string | null };
    }
  | {
      id: string;
      type: "list";
      data: { style: "bullet" | "ordered"; items: string[] };
    }
  | {
      id: string;
      type: "image";
      data: { url: string; alt: string; caption?: string | null };
    }
  | {
      id: string;
      type: "gallery";
      data: { images: Array<{ url: string; alt: string; caption?: string | null }> };
    }
  | {
      id: string;
      type: "youtube";
      data: { url: string; videoId: string; caption?: string | null };
    }
  | {
      id: string;
      type: "cta";
      data: { ctaType: ArtigoCtaType };
    }
  | {
      id: string;
      type: "button";
      data: { label: string; url: string; kind: "internal" | "external" };
    }
  | {
      id: string;
      type: "property_feature";
      data: { propertyId: string | null };
    }
  | {
      id: string;
      type: "property_carousel";
      data: { title: string; subtitle?: string | null; filters: ArtigoPropertyCarouselFilters };
    };

export type ArtigoConteudo = {
  version: 1;
  blocks: ArtigoBlock[];
};

export const ARTICLE_LIMITS = {
  title: 120,
  subtitle: 180,
  summary: 260,
  paragraph: 1200,
  h2: 90,
  h3: 80,
  quote: 320,
  quoteAuthor: 80,
  listItem: 180,
  listItems: 12,
  buttonLabel: 48,
  ctaTitle: 90,
  ctaDescription: 180,
  alt: 140,
  caption: 160,
  propertyCarouselTitle: 90,
  propertyCarouselSubtitle: 180,
  propertyCarouselCharacteristic: 80,
} as const;

const ALLOWED_RICH_TEXT_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a"]);

const ALLOWED_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "quote",
  "list",
  "image",
  "gallery",
  "youtube",
  "cta",
  "button",
  "property_feature",
  "property_carousel",
]);

export function getArticleCategoryLabel(value: string | null | undefined) {
  return ARTIGO_CATEGORIAS.find((item) => item.value === value)?.label ?? "Artigo";
}

export function slugifyArticle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function sanitizePlainText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+$/g, "")
    .slice(0, maxLength);
}

export function getReadableTextFromHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(div|p|li|ul|ol|h2|h3|blockquote)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeArticleRichText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const readable = getReadableTextFromHtml(value);
  if (!readable) return "";
  const clippedReadable = readable.slice(0, maxLength);
  if (readable.length > maxLength) return escapeHtml(clippedReadable);

  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<([^>\s/]+)([^>]*)>/gi, (match, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase();
      if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) return "";
      if (tag !== "a") return `<${tag}>`;
      const hrefMatch = attrs.match(/\shref\s*=\s*(['"])(.*?)\1/i);
      const href = normalizeInternalOrHttpUrl(hrefMatch?.[2] ?? "");
      if (!href) return "<a>";
      const external = !href.startsWith("/");
      const rel = external ? ' rel="nofollow noopener noreferrer" target="_blank"' : "";
      return `<a href="${escapeHtml(href)}"${rel}>`;
    })
    .replace(/<\/([^>\s]+)>/gi, (_match, tagName: string) => {
      const tag = tagName.toLowerCase();
      return ALLOWED_RICH_TEXT_TAGS.has(tag) ? `</${tag}>` : "";
    })
    .trim();
}

export function hasLongUppercaseSequence(value: string, maxSequence = 4) {
  return new RegExp(`[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]{${maxSequence + 1},}`).test(value);
}

export function normalizeOptionalText(value: unknown, maxLength: number) {
  const text = sanitizePlainText(value, maxLength).trim();
  return text.length ? text : null;
}

export function isArtigoCategoria(value: unknown): value is ArtigoCategoria {
  return typeof value === "string" && ARTIGO_CATEGORIAS.some((item) => item.value === value);
}

export function isArtigoStatus(value: unknown): value is ArtigoStatus {
  return typeof value === "string" && ARTIGO_STATUS.includes(value as ArtigoStatus);
}

export function isArtigoCtaType(value: unknown): value is ArtigoCtaType {
  return typeof value === "string" && value in ARTIGO_CTA_CONFIGS;
}

export function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeInternalOrHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 500);
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}

export function extractYouTubeVideoId(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.replace(/^\/+/, "").split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeArticleBlocks(value: unknown): ArtigoConteudo {
  const source =
    value && typeof value === "object" && Array.isArray((value as { blocks?: unknown }).blocks)
      ? (value as { blocks: unknown[] }).blocks
      : [];

  const blocks: ArtigoBlock[] = [];

  for (const rawBlock of source) {
    if (!rawBlock || typeof rawBlock !== "object") continue;
    const block = rawBlock as { id?: unknown; type?: unknown; data?: unknown };
    if (typeof block.type !== "string" || !ALLOWED_BLOCK_TYPES.has(block.type)) continue;
    const id = typeof block.id === "string" && block.id.trim() ? block.id.slice(0, 80) : crypto.randomUUID();
    const data = block.data && typeof block.data === "object" ? (block.data as Record<string, unknown>) : {};

    if (block.type === "paragraph") {
      const content = sanitizeArticleRichText(data.content, ARTICLE_LIMITS.paragraph).trim();
      if (content) blocks.push({ id, type: "paragraph", data: { content } });
    }

    if (block.type === "heading") {
      const level = data.level === 3 ? 3 : 2;
      const content = sanitizePlainText(data.content, level === 2 ? ARTICLE_LIMITS.h2 : ARTICLE_LIMITS.h3).trim();
      if (content) blocks.push({ id, type: "heading", data: { level, content } });
    }

    if (block.type === "quote") {
      const content = sanitizePlainText(data.content, ARTICLE_LIMITS.quote).trim();
      const author = normalizeOptionalText(data.author, ARTICLE_LIMITS.quoteAuthor);
      if (content) blocks.push({ id, type: "quote", data: { content, author } });
    }

    if (block.type === "list") {
      const style = data.style === "ordered" ? "ordered" : "bullet";
      const items = Array.isArray(data.items)
        ? data.items
            .map((item) => sanitizePlainText(item, ARTICLE_LIMITS.listItem).trim())
            .filter(Boolean)
            .slice(0, ARTICLE_LIMITS.listItems)
        : [];
      if (items.length) blocks.push({ id, type: "list", data: { style, items } });
    }

    if (block.type === "image") {
      const url = normalizeInternalOrHttpUrl(data.url);
      const alt = sanitizePlainText(data.alt, ARTICLE_LIMITS.alt).trim();
      const caption = normalizeOptionalText(data.caption, ARTICLE_LIMITS.caption);
      if (url && alt) blocks.push({ id, type: "image", data: { url, alt, caption } });
    }

    if (block.type === "gallery") {
      const images = Array.isArray(data.images)
        ? data.images
            .map((image) => {
              if (!image || typeof image !== "object") return null;
              const sourceImage = image as Record<string, unknown>;
              const url = normalizeInternalOrHttpUrl(sourceImage.url);
              const alt = sanitizePlainText(sourceImage.alt, ARTICLE_LIMITS.alt).trim();
              const caption = normalizeOptionalText(sourceImage.caption, ARTICLE_LIMITS.caption);
              return url && alt ? { url, alt, caption } : null;
            })
            .filter((image): image is { url: string; alt: string; caption: string | null } => Boolean(image))
            .slice(0, 12)
        : [];
      if (images.length) blocks.push({ id, type: "gallery", data: { images } });
    }

    if (block.type === "youtube") {
      const url = typeof data.url === "string" ? data.url.trim() : "";
      const videoId = extractYouTubeVideoId(url);
      const caption = normalizeOptionalText(data.caption, ARTICLE_LIMITS.caption);
      if (videoId) blocks.push({ id, type: "youtube", data: { url, videoId, caption } });
    }

    if (block.type === "cta") {
      const ctaType = isArtigoCtaType(data.ctaType) ? data.ctaType : "curadoria";
      blocks.push({
        id,
        type: "cta",
        data: { ctaType },
      });
    }

    if (block.type === "button") {
      const url = normalizeInternalOrHttpUrl(data.url);
      const label = sanitizePlainText(data.label, ARTICLE_LIMITS.buttonLabel).trim();
      const kind = typeof url === "string" && url.startsWith("/") ? "internal" : "external";
      if (url && label) blocks.push({ id, type: "button", data: { label, url, kind } });
    }

    if (block.type === "property_feature") {
      const propertyId = normalizeOptionalText(data.propertyId, 80);
      blocks.push({ id, type: "property_feature", data: { propertyId } });
    }

    if (block.type === "property_carousel") {
      const title =
        sanitizePlainText(data.title, ARTICLE_LIMITS.propertyCarouselTitle).trim() ||
        "Imóveis selecionados";
      const subtitle = normalizeOptionalText(data.subtitle, ARTICLE_LIMITS.propertyCarouselSubtitle);
      const rawFilters = data.filters && typeof data.filters === "object" ? (data.filters as Record<string, unknown>) : {};
      blocks.push({
        id,
        type: "property_carousel",
        data: {
          title,
          subtitle,
          filters: normalizePropertyCarouselFilters(rawFilters),
        },
      });
    }
  }

  return { version: 1, blocks };
}

function normalizePropertyCarouselFilters(value: Record<string, unknown>): ArtigoPropertyCarouselFilters {
  return {
    bairro: normalizeOptionalText(value.bairro, 80),
    cidade: normalizeOptionalText(value.cidade, 80),
    empreendimentoId: normalizeOptionalText(value.empreendimentoId, 80),
    dormitoriosMin: normalizePositiveInteger(value.dormitoriosMin),
    suitesMin: normalizePositiveInteger(value.suitesMin),
    vagasMin: normalizePositiveInteger(value.vagasMin),
    valorMin: normalizePositiveNumber(value.valorMin),
    valorMax: normalizePositiveNumber(value.valorMax),
    caracteristicasImovel: normalizeTextArray(value.caracteristicasImovel, ARTICLE_LIMITS.propertyCarouselCharacteristic, 24),
    caracteristicasEmpreendimento: normalizeTextArray(value.caracteristicasEmpreendimento, ARTICLE_LIMITS.propertyCarouselCharacteristic, 24),
  };
}

function normalizePositiveInteger(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.floor(numberValue);
}

function normalizePositiveNumber(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.round(numberValue);
}

function normalizeTextArray(value: unknown, maxLength: number, maxItems: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizePlainText(item, maxLength).trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function estimateReadingMinutes(content: ArtigoConteudo) {
  const text = content.blocks
    .map((block) => {
      if (block.type === "paragraph") return getReadableTextFromHtml(block.data.content);
      if (block.type === "heading" || block.type === "quote") return block.data.content;
      if (block.type === "list") return block.data.items.join(" ");
      return "";
    })
    .join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
