import {
  extractYouTubeVideoId,
  normalizeArticleBlocks,
  normalizeInternalOrHttpUrl,
  normalizeOptionalText,
  sanitizeArticleRichText,
  sanitizePlainText,
  slugifyArticle,
  type ArtigoBlock,
} from "@/lib/artigos/content";

export const LANDING_PAGE_STATUS = ["RASCUNHO", "PUBLICADO", "ARQUIVADO"] as const;
export const LANDING_PAGE_TYPES = [
  "PRE_LANCAMENTO", "LANCAMENTO", "LISTA_ESPERA", "IMOVEL_DESTAQUE", "EMPREENDIMENTO",
  "CAPTACAO_IMOVEL", "CURADORIA", "EVENTO", "CAMPANHA_GENERICA",
] as const;

export const LANDING_PAGE_TYPE_OPTIONS = [
  { value: "PRE_LANCAMENTO", label: "Pré-lançamento" },
  { value: "LANCAMENTO", label: "Lançamento" },
  { value: "LISTA_ESPERA", label: "Lista de espera" },
  { value: "IMOVEL_DESTAQUE", label: "Imóvel em destaque" },
  { value: "EMPREENDIMENTO", label: "Empreendimento" },
  { value: "CAPTACAO_IMOVEL", label: "Captação de imóvel" },
  { value: "CURADORIA", label: "Curadoria" },
  { value: "EVENTO", label: "Evento" },
  { value: "CAMPANHA_GENERICA", label: "Campanha genérica" },
] as const;

export const RESERVED_PUBLIC_SLUGS = new Set([
  "artigos", "imoveis", "empreendimentos", "venda", "aluguel", "anuncie", "logo", "logo-white",
]);

export type LandingPageStatus = (typeof LANDING_PAGE_STATUS)[number];
export type LandingPageType = (typeof LANDING_PAGE_TYPES)[number];
export type LandingPageFormField =
  | "nome" | "sobrenome" | "telefone" | "email" | "mensagem" | "objetivo"
  | "tipo_uso" | "tipo_imovel" | "faixa_valor" | "dormitorios" | "localizacao";

export type LandingPageBlock = ArtigoBlock | {
  id: string;
  type: "hero";
  data: {
    title: string; subtitle?: string | null; buttonLabel: string; imageUrl: string;
    overlay: number; height: "normal" | "large" | "screen"; parallax: boolean;
  };
} | {
  id: string;
  type: "split_media";
  data: { title: string; subtitle?: string | null; content: string; mediaType: "image" | "youtube"; mediaUrl: string; mediaSide: "left" | "right"; buttonLabel?: string | null };
} | {
  id: string;
  type: "lead_form";
  data: { title: string; subtitle?: string | null; buttonLabel: string; fields: LandingPageFormField[]; requiredFields: LandingPageFormField[]; successMessage: string };
} | {
  id: string;
  type: "benefits";
  data: { title: string; subtitle?: string | null; items: Array<{ title: string; description: string }> };
} | {
  id: string;
  type: "faq";
  data: { title: string; items: Array<{ question: string; answer: string }> };
} | {
  id: string;
  type: "development_feature" | "development_carousel" | "social_proof" | "location" | "countdown" | "broker_profile";
  data: Record<string, unknown>;
};

export type LandingPageContent = { version: 1; blocks: LandingPageBlock[] };
export type LandingPageTheme = { preset: "ELEGANTE" | "CLARO" | "ESCURO"; primaryColor?: string };

const ALLOWED_FIELDS = new Set<LandingPageFormField>([
  "nome", "sobrenome", "telefone", "email", "mensagem", "objetivo", "tipo_uso", "tipo_imovel",
  "faixa_valor", "dormitorios", "localizacao",
]);
const ARTICLE_TYPES = new Set(["paragraph", "heading", "quote", "list", "image", "gallery", "youtube", "cta", "button", "property_feature", "property_carousel"]);

export function slugifyLandingPage(value: string) {
  return slugifyArticle(value);
}

export function isLandingPageStatus(value: unknown): value is LandingPageStatus {
  return typeof value === "string" && LANDING_PAGE_STATUS.includes(value as LandingPageStatus);
}

export function isLandingPageType(value: unknown): value is LandingPageType {
  return typeof value === "string" && LANDING_PAGE_TYPES.includes(value as LandingPageType);
}

export function normalizeLandingPageContent(value: unknown): LandingPageContent {
  const rawBlocks = value && typeof value === "object" && Array.isArray((value as { blocks?: unknown }).blocks)
    ? (value as { blocks: unknown[] }).blocks.slice(0, 60)
    : [];
  const blocks: LandingPageBlock[] = [];

  for (const raw of rawBlocks) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as { id?: unknown; type?: unknown; data?: unknown };
    const type = typeof block.type === "string" ? block.type : "";
    const id = typeof block.id === "string" && block.id.trim() ? block.id.slice(0, 80) : crypto.randomUUID();
    const data = block.data && typeof block.data === "object" ? block.data as Record<string, unknown> : {};

    if (ARTICLE_TYPES.has(type)) {
      const normalized = normalizeArticleBlocks({ version: 1, blocks: [{ id, type, data }] });
      if (normalized.blocks[0]) blocks.push(normalized.blocks[0]);
      continue;
    }
    if (type === "hero") {
      const legacyImage = data.backgroundType === "image" ? data.backgroundValue : null;
      blocks.push({ id, type, data: {
        title: sanitizePlainText(data.title, 140).trim(), subtitle: normalizeOptionalText(data.subtitle, 240),
        buttonLabel: sanitizePlainText(data.buttonLabel, 48).trim() || "Quero saber mais",
        imageUrl: normalizeInternalOrHttpUrl(data.imageUrl ?? legacyImage) ?? "",
        overlay: clampNumber(data.overlay, 0, 90, 45),
        height: data.height === "normal" || data.height === "screen" ? data.height : "large", parallax: data.parallax === true,
      }});
      continue;
    }
    if (type === "split_media") {
      const mediaType = data.mediaType === "youtube" ? "youtube" : "image";
      const normalizedMediaUrl = normalizeInternalOrHttpUrl(data.mediaUrl) ?? "";
      blocks.push({ id, type, data: {
        title: sanitizePlainText(data.title, 120).trim(), subtitle: normalizeOptionalText(data.subtitle, 180),
        content: sanitizeArticleRichText(data.content, 1600), mediaType,
        mediaUrl: mediaType === "youtube" && !extractYouTubeVideoId(normalizedMediaUrl) ? "" : normalizedMediaUrl,
        mediaSide: data.mediaSide === "right" ? "right" : "left",
        buttonLabel: normalizeOptionalText(data.buttonLabel, 48),
      }});
      continue;
    }
    if (type === "lead_form") {
      const fields = normalizeFields(data.fields, ["nome", "telefone", "email", "mensagem"]);
      const requiredFields = normalizeFields(data.requiredFields, ["nome"]).filter((field) => fields.includes(field));
      blocks.push({ id, type, data: {
        title: sanitizePlainText(data.title, 100).trim() || "Receba mais informações",
        subtitle: normalizeOptionalText(data.subtitle, 180), buttonLabel: sanitizePlainText(data.buttonLabel, 48).trim() || "Enviar",
        fields, requiredFields, successMessage: sanitizePlainText(data.successMessage, 180).trim() || "Obrigado! Em breve entrarei em contato.",
      }});
      continue;
    }
    if (type === "benefits") {
      blocks.push({ id, type, data: { title: sanitizePlainText(data.title, 100).trim() || "Diferenciais", subtitle: normalizeOptionalText(data.subtitle, 180), items: normalizeItems(data.items, "description") } });
      continue;
    }
    if (type === "faq") {
      blocks.push({ id, type, data: { title: sanitizePlainText(data.title, 100).trim() || "Perguntas frequentes", items: normalizeFaq(data.items) } });
      continue;
    }
    if (["development_feature", "development_carousel", "social_proof", "location", "countdown", "broker_profile"].includes(type)) {
      blocks.push({ id, type: type as "development_feature", data: sanitizeRecord(data) });
    }
  }
  return { version: 1, blocks };
}

export function createLandingPagePreset(type: LandingPageType, title: string): LandingPageContent {
  const safeTitle = sanitizePlainText(title, 140).trim() || "Nova oportunidade";
  const formTitle = type === "CAPTACAO_IMOVEL" ? "Quer vender ou alugar seu imóvel?" : "Cadastre-se para receber informações";
  return normalizeLandingPageContent({ version: 1, blocks: [
    { id: crypto.randomUUID(), type: "hero", data: { title: safeTitle, subtitle: "Descubra todos os detalhes e fale diretamente com um corretor especialista.", buttonLabel: "Quero saber mais", imageUrl: "", overlay: 45, height: "large", parallax: false } },
    { id: crypto.randomUUID(), type: "benefits", data: { title: "Uma oportunidade para conhecer", items: [{ title: "Atendimento especializado", description: "Receba informações e orientação para tomar a melhor decisão." }, { title: "Contato direto", description: "Fale com um corretor de imóveis com CRECI." }] } },
    { id: crypto.randomUUID(), type: "lead_form", data: { title: formTitle, subtitle: "Preencha seus dados e entrarei em contato.", buttonLabel: "Quero receber informações", fields: ["nome", "telefone", "email", "mensagem", ...(type === "CURADORIA" ? ["objetivo", "tipo_imovel", "faixa_valor", "localizacao"] : [])], requiredFields: ["nome"], successMessage: "Obrigado! Seus dados foram enviados com sucesso." } },
    { id: crypto.randomUUID(), type: "broker_profile", data: {} },
  ] });
}

function normalizeFields(value: unknown, fallback: LandingPageFormField[]) {
  if (!Array.isArray(value)) return fallback;
  return Array.from(new Set(value.filter((item): item is LandingPageFormField => typeof item === "string" && ALLOWED_FIELDS.has(item as LandingPageFormField))));
}

function normalizeItems(value: unknown, textKey: string) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const title = sanitizePlainText(source.title, 80).trim();
    const description = sanitizePlainText(source[textKey], 240).trim();
    return title && description ? [{ title, description }] : [];
  });
}

function normalizeFaq(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const question = sanitizePlainText(source.question, 160).trim();
    const answer = sanitizePlainText(source.answer, 600).trim();
    return question && answer ? [{ question, answer }] : [];
  });
}

function sanitizeRecord(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).slice(0, 30).map(([key, item]) => [sanitizePlainText(key, 60), typeof item === "string" ? sanitizePlainText(item, 500) : item]));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
