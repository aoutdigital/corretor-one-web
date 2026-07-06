"use client";

import {
  ArrowsOutCardinal,
  CaretDown,
  CaretUp,
  Buildings,
  CheckCircle,
  CircleNotch,
  DotsThreeVertical,
  HardHat,
  HouseLine,
  ImageSquare,
  Info,
  Key,
  ListBullets,
  MapPin,
  Megaphone,
  PencilSimpleLine,
  Robot,
  StackSimple,
  TextB,
  TextItalic,
  TextUnderline,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AykaNeuralLoading } from "@/app/_components/ayka-neural-loading";
import { AppShell } from "@/app/_components/app-shell";
import { apiFetchWithAuth, getAccessToken } from "@/lib/client/auth-api";
import {
  formatAddressFromFields,
  replaceOrAppendAddressNumber,
} from "@/lib/location/address";
import { isUfCode, UF_OPTIONS } from "@/lib/location/constants";
import { loadGoogleMapsScript } from "@/lib/location/google-maps-loader";
import type { PlaceDetails, PlacePrediction } from "@/lib/location/types";

type FaseEmpreendimento = "NA_PLANTA" | "EM_CONSTRUCAO" | "ENTREGUE";
type TipoUso = "RESIDENCIAL" | "COMERCIAL";
type CategoriaResidencial = "APARTAMENTOS" | "CASAS" | "TERRENOS";
type TipologiaResidencial =
  | "APARTAMENTO_PADRAO"
  | "DUPLEX"
  | "TRIPLEX"
  | "COBERTURA"
  | "GARDEN"
  | "STUDIO"
  | "CASA_PADRAO"
  | "SOBRADO"
  | "LOTE_TERRENO";
type CategoriaComercial = "ESCRITORIO_CONJUNTO" | "CASAS";
type TipologiaComercial =
  | "PADRAO"
  | "DUPLEX"
  | "TRIPLEX"
  | "COBERTURA"
  | "LAJE_INTEIRA"
  | "MEIA_LAJE"
  | "TERREO"
  | "CASA_PADRAO"
  | "SOBRADO";
type EstagioObra =
  | ""
  | "FUNDACAO"
  | "ESTRUTURA"
  | "ALVENARIA"
  | "INSTALACOES"
  | "ACABAMENTO"
  | "FINALIZACAO";
type ObraProgressKey =
  | "fundacao"
  | "estrutura"
  | "alvenaria"
  | "instalacoes"
  | "revInterno"
  | "revExterno"
  | "piso"
  | "pintura"
  | "paisagismo";

type CaracteristicaCatalogoItem = {
  id: string;
  chave: string;
  label_pt: string;
  escopos: string[];
  tipos_uso: string[];
  categoria_empreendimento: string | null;
  subcategoria_imovel: string | null;
};

type EmpreendimentoDuplicateCheckLite = {
  id: string;
  status?: string | null;
  nome?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
};

type DuplicateConflictModalState = {
  id: string;
  kind: "nome" | "endereco";
};

type EmpreendimentoDetailApi = {
  id: string;
  status: string;
  fase?: FaseEmpreendimento | null;
  tipo_uso?: TipoUso | null;
  categoria_imovel?: string | null;
  categoria_residencial?: CategoriaResidencial | null;
  tipologias_residenciais?: TipologiaResidencial[] | null;
  categoria_comercial?: CategoriaComercial | null;
  tipologias_comerciais?: TipologiaComercial[] | null;
  nome?: string | null;
  construtora?: string | null;
  incorporadora?: string | null;
  previsao_entrega_em?: string | null;
  ano_construcao?: number | null;
  n_torres?: number | null;
  n_andares?: number | null;
  n_unidades?: number | null;
  qtd_elevadores?: number | null;
  unidades_por_andar?: number | null;
  unidades_terreo?: number | null;
  unidades_cobertura?: number | null;
  descricao?: string | null;
  resumo_curto?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  bairro_comercial?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_json?: {
    place_id?: string | null;
    place_name?: string | null;
    formatted_address?: string | null;
    address_components?: unknown[];
  } | null;
  localizacao_contexto?: {
    perfil_regiao?: string[] | null;
    mobilidade?: string[] | null;
    comercio_servicos?: string[] | null;
    lazer_estilo_vida?: string[] | null;
    resumo_local?: string | null;
  } | null;
  caracteristica_ids?: string[] | null;
};

type LocalizacaoContextoState = {
  perfil_regiao: string[];
  mobilidade: string[];
  comercio_servicos: string[];
  lazer_estilo_vida: string[];
  resumo_local: string;
};

type MidiaRelacaoApi = {
  midia_id: string;
  tipo: "IMAGEM" | "VIDEO" | "PDF";
  url: string;
  storage_path?: string | null;
  tamanho_bytes?: number | null;
  titulo?: string | null;
  alt?: string | null;
  legenda?: string | null;
  caracteristica?: string | null;
};

type AykaDisponibilidadeResponse = {
  acao: string;
  modelo: string;
  assinatura_ativa: boolean;
  custo_creditos: number;
  creditos_disponiveis: number;
  pode_executar: boolean;
  detalhe: string;
};
type AykaDescricaoGeradaResponse = {
  model: string;
  raw_text: string;
  parsed: {
    headline?: string;
    descricao_html?: string;
    resumo_curto?: string;
    seo_title?: string;
    seo_description?: string;
    keywords?: string[];
  };
};

const TOTAL_STEPS = 10;
const MAX_YOUTUBE_VIDEOS = 3;
const MAX_DESCRICAO_EMPREENDIMENTO_CHARS = 1500;
const GOOGLE_MAPS_PUBLIC_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
const HISTORY_NAVIGATION_SENTINEL = "__HISTORY_NAVIGATION__";
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const MONTH_OPTIONS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
] as const;
const OBRA_PROGRESS_FIELDS: ReadonlyArray<{ key: ObraProgressKey; label: string }> = [
  { key: "fundacao", label: "Fundação" },
  { key: "instalacoes", label: "Instalações" },
  { key: "piso", label: "Piso" },
  { key: "estrutura", label: "Estrutura" },
  { key: "revInterno", label: "Rev. Interno" },
  { key: "pintura", label: "Pintura" },
  { key: "alvenaria", label: "Alvenaria" },
  { key: "revExterno", label: "Rev. Externo" },
  { key: "paisagismo", label: "Paisagismo" },
] as const;
const OBRA_PROGRESS_DEFAULT: Record<ObraProgressKey, number> = {
  fundacao: 0,
  estrutura: 0,
  alvenaria: 0,
  instalacoes: 0,
  revInterno: 0,
  revExterno: 0,
  piso: 0,
  pintura: 0,
  paisagismo: 0,
};
const ESTAGIO_ORDER: Record<Exclude<EstagioObra, "">, number> = {
  FUNDACAO: 1,
  ESTRUTURA: 2,
  ALVENARIA: 3,
  INSTALACOES: 4,
  ACABAMENTO: 5,
  FINALIZACAO: 6,
};
const OBRA_KEY_TO_ESTAGIO: Record<ObraProgressKey, Exclude<EstagioObra, "">> = {
  fundacao: "FUNDACAO",
  estrutura: "ESTRUTURA",
  alvenaria: "ALVENARIA",
  instalacoes: "INSTALACOES",
  revInterno: "ACABAMENTO",
  revExterno: "ACABAMENTO",
  piso: "ACABAMENTO",
  pintura: "FINALIZACAO",
  paisagismo: "FINALIZACAO",
};

const CATEGORIAS_RESIDENCIAIS = [
  { value: "APARTAMENTOS", label: "Apartamentos" },
  { value: "CASAS", label: "Casas" },
  { value: "TERRENOS", label: "Terrenos" },
] as const;

const TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA: Record<
  CategoriaResidencial,
  ReadonlyArray<{ value: TipologiaResidencial; label: string }>
> = {
  APARTAMENTOS: [
    { value: "APARTAMENTO_PADRAO", label: "Padrão" },
    { value: "DUPLEX", label: "Duplex" },
    { value: "TRIPLEX", label: "Triplex" },
    { value: "COBERTURA", label: "Cobertura" },
    { value: "GARDEN", label: "Garden" },
    { value: "STUDIO", label: "Studios" },
  ],
  CASAS: [
    { value: "CASA_PADRAO", label: "Padrão" },
    { value: "SOBRADO", label: "Sobrado" },
  ],
  TERRENOS: [{ value: "LOTE_TERRENO", label: "Lote / Terreno" }],
};

const CATEGORIAS_COMERCIAIS = [
  { value: "ESCRITORIO_CONJUNTO", label: "Escritório / Conjunto" },
  { value: "CASAS", label: "Casas" },
] as const;

const TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA: Record<
  CategoriaComercial,
  ReadonlyArray<{ value: TipologiaComercial; label: string }>
> = {
  ESCRITORIO_CONJUNTO: [
    { value: "PADRAO", label: "Padrão" },
    { value: "DUPLEX", label: "Duplex" },
    { value: "TRIPLEX", label: "Triplex" },
    { value: "COBERTURA", label: "Cobertura" },
    { value: "LAJE_INTEIRA", label: "Laje inteira" },
    { value: "MEIA_LAJE", label: "Meia laje" },
    { value: "TERREO", label: "Térreo" },
  ],
  CASAS: [
    { value: "CASA_PADRAO", label: "Padrão" },
    { value: "SOBRADO", label: "Sobrado" },
  ],
};

const TIPOLOGIA_RESIDENCIAL_LABEL: Record<TipologiaResidencial, string> = {
  APARTAMENTO_PADRAO: "Apartamento padrão",
  DUPLEX: "Duplex",
  TRIPLEX: "Triplex",
  COBERTURA: "Cobertura",
  GARDEN: "Garden",
  STUDIO: "Studio",
  CASA_PADRAO: "Casa padrão",
  SOBRADO: "Sobrado",
  LOTE_TERRENO: "Lote / Terreno",
};

const TIPOLOGIA_COMERCIAL_LABEL: Record<TipologiaComercial, string> = {
  PADRAO: "Padrão",
  DUPLEX: "Duplex",
  TRIPLEX: "Triplex",
  COBERTURA: "Cobertura",
  LAJE_INTEIRA: "Laje inteira",
  MEIA_LAJE: "Meia laje",
  TERREO: "Térreo",
  CASA_PADRAO: "Padrão",
  SOBRADO: "Sobrado",
};

const AYKA_TOM_OPTIONS = [
  "Sofisticado",
  "Acolhedor",
  "Objetivo",
  "Inspiracional",
] as const;
const AYKA_TOM_DESCRICOES: Record<(typeof AYKA_TOM_OPTIONS)[number], string> = {
  Sofisticado: "Linguagem premium, elegante e voltada a público exigente.",
  Acolhedor: "Tom próximo, humano e convidativo, com foco em bem-estar.",
  Objetivo: "Texto direto ao ponto, claro e sem excessos.",
  Inspiracional: "Narrativa emocional, com foco em estilo de vida e aspiração.",
};

const AYKA_VOZ_OPTIONS = [
  "Consultiva",
  "Especialista local",
  "Institucional",
  "Comercial leve",
] as const;
const AYKA_VOZ_DESCRICOES: Record<(typeof AYKA_VOZ_OPTIONS)[number], string> = {
  Consultiva: "Atua como assessor, explicando benefícios com orientação prática.",
  "Especialista local": "Valoriza contexto de bairro, mobilidade e conveniência regional.",
  Institucional: "Comunicação mais formal, neutra e corporativa.",
  "Comercial leve": "Tom de venda suave, persuasivo sem pressão.",
};

const AYKA_ESTILO_OPTIONS = [
  "Foco em benefícios",
  "Foco em diferenciais técnicos",
  "Foco em estilo de vida",
  "Foco em investimento",
] as const;
const AYKA_ESTILO_DESCRICOES: Record<(typeof AYKA_ESTILO_OPTIONS)[number], string> = {
  "Foco em benefícios": "Destaca ganhos práticos e valor percebido pelo comprador.",
  "Foco em diferenciais técnicos": "Prioriza dados de produto, estrutura e especificações.",
  "Foco em estilo de vida": "Enfatiza rotina, conforto e experiências no empreendimento.",
  "Foco em investimento": "Ressalta potencial de valorização, liquidez e renda.",
};

const AYKA_PUBLICOS: ReadonlyArray<{ categoria: string; subcategorias: string[] }> = [
  {
    categoria: "Famílias",
    subcategorias: [
      "Famílias com crianças pequenas",
      "Famílias com adolescentes",
      "Famílias grandes ou multigeracionais",
      "Famílias em busca de lazer e convivência",
      "Famílias em transição",
      "Famílias com pets",
      "Famílias que valorizam educação",
      "Famílias amantes de natureza",
      "Famílias de alto padrão",
      "Imóveis para famílias em viagem",
    ],
  },
  {
    categoria: "Casais",
    subcategorias: [
      "Jovens casais",
      "Casais aposentados",
      "Casais sem filhos",
      "Casais com pets",
      "Casais em home office",
      "Casais de meia-idade",
      "Casais em busca de luxo",
      "Casais aventureiros ou minimalistas",
    ],
  },
  {
    categoria: "Solteiros",
    subcategorias: [
      "Profissionais que trabalham na região",
      "Estudantes",
      "Solteiros que valorizam vida urbana",
      "Solteiros que priorizam conforto e tranquilidade",
      "Solteiros minimalistas",
      "Solteiros com foco em investimentos",
      "Solteiros que viajam frequentemente",
      "Solteiros amantes de pets",
      "Solteiros fitness",
      "Solteiros que desejam exclusividade",
    ],
  },
  {
    categoria: "Investidores",
    subcategorias: [
      "Investidores em busca de imóveis para locação",
      "Investidores em busca de imóveis de alto padrão",
      "Investidores em imóveis comerciais",
      "Investidores em imóveis de temporada",
      "Investidores em imóveis para revenda",
      "Investidores em regiões em expansão",
    ],
  },
  {
    categoria: "Empresas e Negócios",
    subcategorias: [
      "Imóveis para lojas e comércios",
      "Imóveis para armazenagem e logística",
      "Imóveis para clínicas e consultórios",
      "Imóveis para franquias",
    ],
  },
  {
    categoria: "Pessoas com estilo de vida específico",
    subcategorias: [
      "Pessoas que valorizam sustentabilidade",
      "Pessoas que buscam imóveis próximos à natureza",
      "Pessoas que valorizam experiências urbanas",
      "Pessoas que buscam imóveis com estrutura para home office",
      "Pessoas que buscam imóveis com espaços para hobbies",
    ],
  },
  {
    categoria: "Público de luxo",
    subcategorias: [
      "Imóveis de alto padrão em áreas nobres",
      "Imóveis com vistas panorâmicas",
      "Imóveis com arquitetura e design exclusivos",
      "Imóveis com áreas de lazer privativas",
      "Imóveis próximos a clubes e campos de golfe",
    ],
  },
  {
    categoria: "Turistas e Temporadas",
    subcategorias: [
      "Imóveis para temporada em destinos turísticos",
      "Imóveis para trabalho remoto e nômades digitais",
      "Imóveis para turismo de luxo",
      "Imóveis para estadias longas",
    ],
  },
];

const LOCALIZACAO_PERFIL_REGIAO_OPTIONS = [
  "Residencial e familiar",
  "Misto (residencial + comercial)",
  "Corporativo e negócios",
  "Alto padrão",
  "Tradicional e consolidada",
  "Em transformação",
] as const;

const LOCALIZACAO_MOBILIDADE_OPTIONS = [
  "Acesso rápido a vias principais",
  "Transporte público próximo",
  "Região caminhável",
  "Boa conexão com outras zonas",
  "Facilidade de apps de mobilidade",
] as const;

const LOCALIZACAO_COMERCIO_SERVICOS_OPTIONS = [
  "Supermercados e conveniências",
  "Escolas e educação",
  "Hospitais e saúde",
  "Gastronomia e cafés",
  "Serviços do dia a dia",
  "Comércio de rua ativo",
] as const;

const LOCALIZACAO_LAZER_ESTILO_OPTIONS = [
  "Parques e áreas verdes",
  "Vida noturna e entretenimento",
  "Esporte e bem-estar",
  "Perfil tranquilo e silencioso",
  "Ambiente urbano dinâmico",
  "Vocação para trabalho remoto",
] as const;

function sanitizeOptional(input: string) {
  const value = input.trim();
  return value.length ? value : null;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function parseKeywordsInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 20);
}

function normalizeLocalizacaoArray(value: unknown, allowed: readonly string[]) {
  if (!Array.isArray(value)) return [] as string[];
  const allowedSet = new Set<string>(allowed);
  const next: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!allowedSet.has(normalized)) continue;
    if (next.includes(normalized)) continue;
    next.push(normalized);
  }
  return next;
}

function normalizeLocalizacaoResumo(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 300);
}

function normalizeLocalizacaoContextoState(value: unknown): LocalizacaoContextoState {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    perfil_regiao: normalizeLocalizacaoArray(
      source.perfil_regiao,
      LOCALIZACAO_PERFIL_REGIAO_OPTIONS,
    ),
    mobilidade: normalizeLocalizacaoArray(source.mobilidade, LOCALIZACAO_MOBILIDADE_OPTIONS),
    comercio_servicos: normalizeLocalizacaoArray(
      source.comercio_servicos,
      LOCALIZACAO_COMERCIO_SERVICOS_OPTIONS,
    ),
    lazer_estilo_vida: normalizeLocalizacaoArray(
      source.lazer_estilo_vida,
      LOCALIZACAO_LAZER_ESTILO_OPTIONS,
    ),
    resumo_local: normalizeLocalizacaoResumo(source.resumo_local),
  };
}

function deriveLegacyCategoriaImovel(
  tipoUso: TipoUso,
  categoriaComercial: CategoriaComercial,
  categoriaResidencial: CategoriaResidencial,
  tipologiasResidenciais: TipologiaResidencial[],
) {
  if (tipoUso === "COMERCIAL") {
    if (categoriaComercial === "CASAS") return "CASA_COMERCIAL";
    return "ESCRITORIO";
  }
  if (categoriaResidencial === "TERRENOS") return "LOTE_TERRENO";
  if (categoriaResidencial === "CASAS") return "CASA";
  if (tipologiasResidenciais.includes("COBERTURA")) return "COBERTURA";
  if (tipologiasResidenciais.includes("STUDIO")) return "STUDIO";
  return "APARTAMENTO";
}

function buildCategoriaResumo(
  tipoUso: TipoUso,
  categoriaComercial: CategoriaComercial,
  categoriaResidencial: CategoriaResidencial,
  tipologiasResidenciais: TipologiaResidencial[],
  tipologiasComerciais: TipologiaComercial[],
) {
  if (tipoUso === "COMERCIAL") {
    const grupo =
      CATEGORIAS_COMERCIAIS.find((item) => item.value === categoriaComercial)?.label ?? "Comercial";
    const tipologias = tipologiasComerciais
      .map((tipologia) => TIPOLOGIA_COMERCIAL_LABEL[tipologia] ?? tipologia)
      .join(", ");
    return `${grupo}${tipologias ? ` > ${tipologias}` : ""}`;
  }

  const grupo = CATEGORIAS_RESIDENCIAIS.find((item) => item.value === categoriaResidencial)?.label ?? "Residencial";
  const tipologias = tipologiasResidenciais
    .map((tipologia) => TIPOLOGIA_RESIDENCIAL_LABEL[tipologia] ?? tipologia)
    .join(", ");
  return `${grupo}${tipologias ? ` > ${tipologias}` : ""}`;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

async function getImageDimensionsClient(
  file: File,
): Promise<{ width: number; height: number } | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function createLocalImageThumbObjectUrl(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<string | null> {
  const maxWidth = options?.maxWidth ?? 640;
  const maxHeight = options?.maxHeight ?? 480;
  const quality = options?.quality ?? 0.72;
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
    if (!image) return null;

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function normalizeYouTubeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0] || null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.split("/")[2] || null;
    }
  }

  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function getYouTubeVideoId(url: string): string | null {
  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const payload = (await response.json()) as { title?: unknown };
    return typeof payload.title === "string" && payload.title.trim().length > 0
      ? payload.title.trim()
      : null;
  } catch {
    return null;
  }
}

type YoutubeVideoDraftItem = {
  id: string;
  url: string;
  videoId: string;
  title: string | null;
};

type ImageDraftItem = {
  id: string;
  midiaId: string;
  fileName: string;
  sizeBytes: number;
  previewUrl: string;
  thumbUrl: string | null;
  isHeic: boolean;
  alt: string;
  legenda: string;
  caracteristica: string;
};

type RejectedImageReason = "TAMANHO_PEQUENO" | "ACIMA_15MB" | "FORMATO_INVALIDO";

type RejectedImageDraftItem = {
  id: string;
  fileName: string;
  previewUrl: string | null;
  reasons: RejectedImageReason[];
};

function getMidiaFileName(item: MidiaRelacaoApi) {
  const title = item.titulo?.trim();
  if (title) return title;

  const path = item.storage_path?.trim();
  if (path) {
    const fileName = path.split("/").filter(Boolean).at(-1);
    if (fileName) {
      try {
        return decodeURIComponent(fileName);
      } catch {
        return fileName;
      }
    }
  }

  const urlPath = item.url.split("?")[0] ?? "";
  const fileName = urlPath.split("/").filter(Boolean).at(-1);
  if (fileName) {
    try {
      return decodeURIComponent(fileName);
    } catch {
      return fileName;
    }
  }

  return "imagem";
}

function mapMidiaRelacaoToImageDraftItem(item: MidiaRelacaoApi): ImageDraftItem {
  return {
    id: crypto.randomUUID(),
    midiaId: item.midia_id,
    fileName: getMidiaFileName(item),
    sizeBytes: item.tamanho_bytes ?? 0,
    previewUrl: item.url,
    thumbUrl: null,
    isHeic: false,
    alt: item.alt ?? "",
    legenda: item.legenda ?? "",
    caracteristica: item.caracteristica ?? "",
  };
}

function mapMidiaRelacaoToYoutubeDraftItem(item: MidiaRelacaoApi): YoutubeVideoDraftItem | null {
  const normalized = normalizeYouTubeUrl(item.url);
  const videoId = normalized ? getYouTubeVideoId(normalized) : null;
  if (!normalized || !videoId) return null;
  return {
    id: crypto.randomUUID(),
    url: normalized,
    videoId,
    title: item.titulo ?? null,
  };
}

function buildMidiaSignature(items: Array<{ midia_id: string; tipo: string; url: string }>) {
  return items
    .map((item) => `${item.tipo}:${item.midia_id}:${item.url}`)
    .sort()
    .join("|");
}

type AykaPublicoSelecao = {
  categoria: string;
  subcategoria: string;
};

type FinalizeMode = "RASCUNHO" | "PUBLICADO";

function isHeicLikeFile(file: File) {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function getFileExtension(file: File) {
  const name = (file.name || "").toLowerCase();
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

function buildThumbUrl(url: string) {
  return url;
}

function isSupportedImageUpload(file: File) {
  const mime = (file.type || "").toLowerCase();
  const ext = getFileExtension(file);
  const allowedExt = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
  const allowedMime = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
  ]);

  if (allowedMime.has(mime)) return true;
  if (allowedExt.has(ext)) return true;
  return isHeicLikeFile(file);
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        tabIndex={0}
        className="inline-flex cursor-help items-center text-slate-500"
        aria-label={text}
      >
        <Info size={12} />
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] leading-tight text-white shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function InlineOptionTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-2 inline-flex items-center text-slate-500">
      <Info size={12} />
      <span className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-56 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] leading-tight text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampPercent(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function sanitizeYearInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function normalizeComparableText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPastYearMonth(year: string, month: string) {
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return false;
  const y = Number(year);
  const m = Number(month);
  if (y < CURRENT_YEAR) return true;
  if (y === CURRENT_YEAR && m < CURRENT_MONTH) return true;
  return false;
}

function toDbDateFromYearMonth(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d{4})-(\d{2})$/);
  if (!match) return normalized;
  return `${match[1]}-${match[2]}-01`;
}

function NovoEmpreendimentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empreendimentoFromUrl = searchParams.get("empreendimento") ?? "";
  const stepFromUrlParam = searchParams.get("step") ?? "";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [empreendimentoId, setEmpreendimentoId] = useState<string | null>(null);

  const [fase, setFase] = useState<FaseEmpreendimento>("NA_PLANTA");
  const [tipoUso, setTipoUso] = useState<TipoUso>("RESIDENCIAL");
  const [categoriaImovel, setCategoriaImovel] = useState<string>("ESCRITORIO");
  const [categoriaResidencial, setCategoriaResidencial] = useState<CategoriaResidencial>("APARTAMENTOS");
  const [tipologiasResidenciais, setTipologiasResidenciais] = useState<TipologiaResidencial[]>([
    "APARTAMENTO_PADRAO",
  ]);
  const [categoriaComercial, setCategoriaComercial] = useState<CategoriaComercial>("ESCRITORIO_CONJUNTO");
  const [tipologiasComerciais, setTipologiasComerciais] = useState<TipologiaComercial[]>(["PADRAO"]);

  const [searchAddress, setSearchAddress] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [placeOptions, setPlaceOptions] = useState<PlacePrediction[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [regeocoding, setRegeocoding] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [selectedPlaceName, setSelectedPlaceName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [enderecoFormatado, setEnderecoFormatado] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [bairroComercial, setBairroComercial] = useState("");
  const [localizacaoContexto, setLocalizacaoContexto] = useState<LocalizacaoContextoState>(
    () => normalizeLocalizacaoContextoState(null),
  );
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressComponents, setAddressComponents] = useState<unknown[]>([]);

  const [nome, setNome] = useState("");
  const [construtora, setConstrutora] = useState("");
  const [incorporadora, setIncorporadora] = useState("");
  const [obraPercentuais, setObraPercentuais] = useState<Record<ObraProgressKey, number>>(
    OBRA_PROGRESS_DEFAULT,
  );
  const [previsaoEntregaEm, setPrevisaoEntregaEm] = useState("");
  const [previsaoAnoDraft, setPrevisaoAnoDraft] = useState("");
  const [previsaoMesDraft, setPrevisaoMesDraft] = useState("");
  const [anoConstrucao, setAnoConstrucao] = useState("");
  const [nTorres, setNTorres] = useState("");
  const [nAndares, setNAndares] = useState("");
  const [nUnidades, setNUnidades] = useState("");
  const [qtdElevadores, setQtdElevadores] = useState("");
  const [unidadesPorAndar, setUnidadesPorAndar] = useState("");
  const [unidadesTerreo, setUnidadesTerreo] = useState("");
  const [unidadesCobertura, setUnidadesCobertura] = useState("");
  const [imagemItems, setImagemItems] = useState<ImageDraftItem[]>([]);
  const [rejectedImagemItems, setRejectedImagemItems] = useState<RejectedImageDraftItem[]>([]);
  const [uploadingTempImages, setUploadingTempImages] = useState(false);
  const [uploadingTempImagesPercent, setUploadingTempImagesPercent] = useState<number | null>(null);
  const [deletingImageIds, setDeletingImageIds] = useState<string[]>([]);
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [dropTargetImageId, setDropTargetImageId] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideoDraftItem[]>([]);
  const [addingYoutube, setAddingYoutube] = useState(false);
  const [caracteristicaIds, setCaracteristicaIds] = useState<string[]>([]);
  const [caracteristicasCatalogo, setCaracteristicasCatalogo] = useState<CaracteristicaCatalogoItem[]>([]);
  const [loadingCaracteristicas, setLoadingCaracteristicas] = useState(false);
  const [caracteristicasCatalogoTipoUsoLoaded, setCaracteristicasCatalogoTipoUsoLoaded] =
    useState<TipoUso | null>(null);
  const [descricaoEmpreendimento, setDescricaoEmpreendimento] = useState("");
  const [showAykaModal, setShowAykaModal] = useState(false);
  const [checkingAykaCreditos, setCheckingAykaCreditos] = useState(false);
  const [showPublicationChecklistModal, setShowPublicationChecklistModal] = useState(false);
  const [publicationChecklistIssues, setPublicationChecklistIssues] = useState<string[]>([]);
  const [duplicateConflictModal, setDuplicateConflictModal] = useState<DuplicateConflictModalState | null>(null);
  const [showUnsavedLeaveModal, setShowUnsavedLeaveModal] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [aykaModalStep, setAykaModalStep] = useState(1);
  const [aykaTom, setAykaTom] =
    useState<((typeof AYKA_TOM_OPTIONS)[number] | "")>("");
  const [aykaVoz, setAykaVoz] =
    useState<((typeof AYKA_VOZ_OPTIONS)[number] | "")>("");
  const [aykaEstilo, setAykaEstilo] =
    useState<((typeof AYKA_ESTILO_OPTIONS)[number] | "")>("");
  const [aykaIncluirCta, setAykaIncluirCta] = useState(true);
  const [aykaKeywords, setAykaKeywords] = useState("");
  const [aykaPublicoCategoria, setAykaPublicoCategoria] = useState(
    AYKA_PUBLICOS[0]?.categoria ?? "",
  );
  const [aykaPublicosSelecionados, setAykaPublicosSelecionados] = useState<AykaPublicoSelecao[]>(
    [],
  );
  const [gerandoDescricaoAyka, setGerandoDescricaoAyka] = useState(false);
  const [aykaResumoCurto, setAykaResumoCurto] = useState("");
  const [aykaSeoTitle, setAykaSeoTitle] = useState("");
  const [aykaSeoDescription, setAykaSeoDescription] = useState("");

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapHostElementRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const descricaoEditorRef = useRef<HTMLDivElement | null>(null);
  const rejectedPreviewUrlsRef = useRef<Set<string>>(new Set());
  const thumbPreviewUrlsRef = useRef<Set<string>>(new Set());
  const mapRef = useRef<{
    setCenter: (latLng: { lat: number; lng: number }) => void;
    setZoom: (zoom: number) => void;
  } | null>(null);
  const markerRef = useRef<{
    setPosition: (position: { lat: number; lng: number }) => void;
    addDragEndListener: (handler: () => void) => void;
    getPosition: () => { lat: number; lng: number } | null;
  } | null>(null);
  const markerBoundRef = useRef(false);
  const lastPayloadHashRef = useRef("");
  const hydratingEmpreendimentoIdRef = useRef<string | null>(null);
  const syncingMidiaEmpreendimentoIdRef = useRef<string | null>(null);
  const lastPersistedMidiaSignatureRef = useRef("");
  const bypassUnsavedGuardRef = useRef(false);
  const unsavedHistoryLockRef = useRef(false);

  const progress = useMemo(
    () => Math.round((step / TOTAL_STEPS) * 100),
    [step],
  );
  const readOnlyAddressByPlace = Boolean(placeId);
  const caracteristicasDisponiveis = useMemo(() => {
    return caracteristicasCatalogo
      .filter(
        (item) =>
          item.escopos.includes("EMPREENDIMENTO") &&
          item.tipos_uso.includes(tipoUso),
      )
      .sort((a, b) => a.label_pt.localeCompare(b.label_pt, "pt-BR"));
  }, [caracteristicasCatalogo, tipoUso]);
  const caracteristicasSelecionadasOptions = useMemo(
    () =>
      caracteristicasDisponiveis.filter((item) =>
        caracteristicaIds.includes(item.id),
      ),
    [caracteristicasDisponiveis, caracteristicaIds],
  );
  const tipologiasResidenciaisByCategoria = useMemo(
    () => TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[categoriaResidencial] ?? [],
    [categoriaResidencial],
  );
  const tipologiasComerciaisByCategoria = useMemo(
    () => TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[categoriaComercial] ?? [],
    [categoriaComercial],
  );
  const categoriaResumo = useMemo(
    () =>
      buildCategoriaResumo(
        tipoUso,
        categoriaComercial,
        categoriaResidencial,
        tipologiasResidenciais,
        tipologiasComerciais,
      ),
    [tipoUso, categoriaComercial, categoriaResidencial, tipologiasResidenciais, tipologiasComerciais],
  );
  const isEstruturaVerticalEnabled = useMemo(
    () =>
      (tipoUso === "RESIDENCIAL" && categoriaResidencial === "APARTAMENTOS") ||
      (tipoUso === "COMERCIAL" && categoriaComercial === "ESCRITORIO_CONJUNTO"),
    [tipoUso, categoriaResidencial, categoriaComercial],
  );
  const sugestaoUnidadesBase = useMemo(() => {
    const torres = Number(nTorres);
    const andares = Number(nAndares);
    const porAndar = Number(unidadesPorAndar);
    const terreo = Number(unidadesTerreo);
    if (
      !Number.isFinite(torres) ||
      !Number.isFinite(andares) ||
      !Number.isFinite(porAndar) ||
      !Number.isFinite(terreo)
    ) {
      return null;
    }
    if (
      nTorres.trim() === "" ||
      nAndares.trim() === "" ||
      unidadesPorAndar.trim() === "" ||
      unidadesTerreo.trim() === ""
    ) {
      return null;
    }
    return torres * andares * porAndar + terreo;
  }, [nTorres, nAndares, unidadesPorAndar, unidadesTerreo]);
  const sugestaoUnidadesComCobertura = useMemo(() => {
    if (sugestaoUnidadesBase == null) return null;
    if (unidadesCobertura.trim() === "") return null;
    const cobertura = Number(unidadesCobertura);
    if (!Number.isFinite(cobertura)) return null;
    return sugestaoUnidadesBase + cobertura;
  }, [sugestaoUnidadesBase, unidadesCobertura]);
  const caracteristicaLabelByChave = useMemo(
    () => new Map(caracteristicasSelecionadasOptions.map((item) => [item.chave, item.label_pt])),
    [caracteristicasSelecionadasOptions],
  );
  const aykaSubcategoriasDaCategoria = useMemo(
    () =>
      AYKA_PUBLICOS.find((item) => item.categoria === aykaPublicoCategoria)?.subcategorias ?? [],
    [aykaPublicoCategoria],
  );

  useEffect(() => {
    if (!gerandoDescricaoAyka) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [gerandoDescricaoAyka]);

  const payload = useMemo(
    () => ({
      fase,
      tipoUso,
      categoriaImovel,
      categoriaResidencial,
      tipologiasResidenciais,
      categoriaComercial,
      tipologiasComerciais,
      searchAddress,
      selectedPlaceName,
      placeId,
      enderecoFormatado,
      logradouro,
      numero,
      bairro,
      bairroComercial,
      localizacaoContexto,
      cidade,
      estado,
      cep,
      lat,
      lng,
      addressComponents,
      nome,
      construtora,
      incorporadora,
      obraPercentuais,
      previsaoEntregaEm,
      anoConstrucao,
      nTorres,
      nAndares,
      nUnidades,
      qtdElevadores,
      unidadesPorAndar,
      unidadesTerreo,
      unidadesCobertura,
      imagemItems: imagemItems.map((item) => ({
        id: item.id,
        midiaId: item.midiaId,
        fileName: item.fileName,
        sizeBytes: item.sizeBytes,
        previewUrl: item.previewUrl,
        isHeic: item.isHeic,
        alt: item.alt,
        legenda: item.legenda,
        caracteristica: item.caracteristica,
      })),
      youtubeVideos,
      caracteristicaIds,
      descricaoEmpreendimento,
      aykaResumoCurto,
      aykaSeoTitle,
      aykaSeoDescription,
    }),
    [
      fase,
      tipoUso,
      categoriaImovel,
      categoriaResidencial,
      tipologiasResidenciais,
      categoriaComercial,
      tipologiasComerciais,
      searchAddress,
      selectedPlaceName,
      placeId,
      enderecoFormatado,
      logradouro,
      numero,
      bairro,
      bairroComercial,
      localizacaoContexto,
      cidade,
      estado,
      cep,
      lat,
      lng,
      addressComponents,
      nome,
      construtora,
      incorporadora,
      obraPercentuais,
      previsaoEntregaEm,
      anoConstrucao,
      nTorres,
      nAndares,
      nUnidades,
      qtdElevadores,
      unidadesPorAndar,
      unidadesTerreo,
      unidadesCobertura,
      imagemItems,
      youtubeVideos,
      caracteristicaIds,
      descricaoEmpreendimento,
      aykaResumoCurto,
      aykaSeoTitle,
      aykaSeoDescription,
    ],
  );
  useEffect(() => {
    if (loading || !empreendimentoId) {
      setHasPendingChanges(false);
      return;
    }
    const currentHash = JSON.stringify(payload);
    setHasPendingChanges(currentHash !== lastPayloadHashRef.current);
  }, [loading, empreendimentoId, payload]);

  const hasUnsavedGuard = hasPendingChanges || saving || uploadingTempImages || finalizing;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasUnsavedGuard || bypassUnsavedGuardRef.current) {
      unsavedHistoryLockRef.current = false;
      return;
    }
    if (unsavedHistoryLockRef.current) return;
    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        __unsaved_guard__: true,
      },
      "",
      window.location.href,
    );
    unsavedHistoryLockRef.current = true;
  }, [hasUnsavedGuard]);

  useEffect(() => {
    if (!hasUnsavedGuard) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onDocumentClick(event: MouseEvent) {
      if (!hasUnsavedGuard || bypassUnsavedGuardRef.current) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;

      const nextUrl = new URL(hrefAttr, window.location.origin);
      const currentUrl = new URL(window.location.href);
      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigationHref(nextUrl.toString());
      setShowUnsavedLeaveModal(true);
    }

    function onPopState() {
      if (!hasUnsavedGuard || bypassUnsavedGuardRef.current) return;
      unsavedHistoryLockRef.current = false;
      window.history.pushState(
        {
          ...(window.history.state ?? {}),
          __unsaved_guard__: true,
        },
        "",
        window.location.href,
      );
      unsavedHistoryLockRef.current = true;
      setPendingNavigationHref(HISTORY_NAVIGATION_SENTINEL);
      setShowUnsavedLeaveModal(true);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [hasUnsavedGuard]);

  const estagioObra = useMemo<EstagioObra>(() => {
    let current: EstagioObra = "";
    for (const key of Object.keys(obraPercentuais) as ObraProgressKey[]) {
      if ((obraPercentuais[key] ?? 0) <= 0) continue;
      const stage = OBRA_KEY_TO_ESTAGIO[key];
      if (!current) {
        current = stage;
        continue;
      }
      if (ESTAGIO_ORDER[stage] > ESTAGIO_ORDER[current as Exclude<EstagioObra, "">]) {
        current = stage;
      }
    }
    return current;
  }, [obraPercentuais]);
  const previsaoAnos = useMemo(
    () => Array.from({ length: 7 }, (_, index) => String(CURRENT_YEAR + index)),
    [],
  );

  function showToast(message: string) {
    setToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }

  function toggleLocalizacaoContextoOption(
    key: Exclude<keyof LocalizacaoContextoState, "resumo_local">,
    value: string,
  ) {
    setLocalizacaoContexto((current) => {
      const items = current[key];
      const nextItems = items.includes(value)
        ? items.filter((item) => item !== value)
        : [...items, value];
      return {
        ...current,
        [key]: nextItems,
      };
    });
  }

  async function resolveGeolocacaoIdForCurrentForm() {
    const geolocResult = await apiFetchWithAuth<{ id: string }>("/api/geolocacoes/resolve", {
      method: "POST",
      body: JSON.stringify({
        place_id: placeId || null,
        address_json: {
          place_id: placeId || null,
          place_name: selectedPlaceName || null,
          formatted_address: enderecoFormatado || null,
          address_components: addressComponents,
        },
        logradouro,
        numero,
        bairro,
        cidade,
        uf: estado,
        cep: sanitizeOptional(cep),
        lat,
        lng,
        endereco_formatado:
          enderecoFormatado ||
          formatAddressFromFields({
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
          }),
      }),
    });

    if (!geolocResult.ok) {
      setError(geolocResult.error);
      return null;
    }

    return geolocResult.data.id;
  }

  const buildEmpreendimentoMutationBody = useCallback((options?: {
    geolocacaoId?: string;
    status?: "RASCUNHO" | "PUBLICADO";
  }) => {
    return {
      ...(options?.geolocacaoId ? { geolocacao_id: options.geolocacaoId } : {}),
      ...(options?.status ? { status: options.status } : {}),
      nome: nome.trim(),
      descricao: sanitizeOptional(descricaoEmpreendimento),
      resumo_curto: sanitizeOptional(aykaResumoCurto),
      meta_title: sanitizeOptional(aykaSeoTitle),
      meta_description: sanitizeOptional(aykaSeoDescription),
      keywords: parseKeywordsInput(aykaKeywords),
      tipo_uso: tipoUso,
      categoria_imovel: deriveLegacyCategoriaImovel(
        tipoUso,
        categoriaComercial,
        categoriaResidencial,
        tipologiasResidenciais,
      ),
      categoria_residencial: tipoUso === "RESIDENCIAL" ? categoriaResidencial : null,
      tipologias_residenciais: tipoUso === "RESIDENCIAL" ? tipologiasResidenciais : [],
      categoria_comercial: tipoUso === "COMERCIAL" ? categoriaComercial : null,
      tipologias_comerciais: tipoUso === "COMERCIAL" ? tipologiasComerciais : [],
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      bairro: bairro.trim(),
      bairro_comercial: sanitizeOptional(bairroComercial),
      localizacao_contexto: {
        perfil_regiao: localizacaoContexto.perfil_regiao,
        mobilidade: localizacaoContexto.mobilidade,
        comercio_servicos: localizacaoContexto.comercio_servicos,
        lazer_estilo_vida: localizacaoContexto.lazer_estilo_vida,
        resumo_local: sanitizeOptional(localizacaoContexto.resumo_local),
      },
      cidade: cidade.trim(),
      estado,
      cep: sanitizeOptional(cep),
      lat,
      lng,
      address_json: {
        place_id: placeId || null,
        place_name: selectedPlaceName || null,
        formatted_address: enderecoFormatado || null,
        address_components: addressComponents,
      },
      fase,
      previsao_entrega_em:
        fase === "ENTREGUE" ? null : toDbDateFromYearMonth(previsaoEntregaEm),
      estagio_obra: sanitizeOptional(estagioObra),
      obra_percentuais: obraPercentuais,
      construtora: sanitizeOptional(construtora),
      incorporadora: sanitizeOptional(incorporadora),
      n_torres: nTorres.trim() ? Number(nTorres) : null,
      n_andares: nAndares.trim() ? Number(nAndares) : null,
      n_unidades: nUnidades.trim() ? Number(nUnidades) : null,
      qtd_elevadores: isEstruturaVerticalEnabled && qtdElevadores.trim() ? Number(qtdElevadores) : null,
      unidades_por_andar:
        isEstruturaVerticalEnabled && unidadesPorAndar.trim() ? Number(unidadesPorAndar) : null,
      unidades_terreo: isEstruturaVerticalEnabled && unidadesTerreo.trim() ? Number(unidadesTerreo) : null,
      unidades_cobertura:
        isEstruturaVerticalEnabled && unidadesCobertura.trim() ? Number(unidadesCobertura) : null,
      caracteristica_ids: caracteristicaIds,
      caracteristicas: caracteristicasDisponiveis
        .filter((item) => caracteristicaIds.includes(item.id))
        .map((item) => item.chave),
      ano_construcao: fase === "ENTREGUE" && anoConstrucao.trim() ? Number(anoConstrucao) : null,
    };
  }, [
    addressComponents,
    anoConstrucao,
    aykaKeywords,
    aykaResumoCurto,
    aykaSeoDescription,
    aykaSeoTitle,
    bairro,
    bairroComercial,
    localizacaoContexto,
    caracteristicaIds,
    caracteristicasDisponiveis,
    categoriaComercial,
    categoriaResidencial,
    cep,
    cidade,
    construtora,
    descricaoEmpreendimento,
    enderecoFormatado,
    estado,
    estagioObra,
    fase,
    incorporadora,
    isEstruturaVerticalEnabled,
    lat,
    lng,
    logradouro,
    nAndares,
    nome,
    nTorres,
    nUnidades,
    numero,
    obraPercentuais,
    placeId,
    previsaoEntregaEm,
    qtdElevadores,
    selectedPlaceName,
    tipoUso,
    tipologiasComerciais,
    tipologiasResidenciais,
    unidadesCobertura,
    unidadesPorAndar,
    unidadesTerreo,
  ]);

  async function ensureEmpreendimentoCreatedAsRascunho() {
    if (empreendimentoId) return empreendimentoId;
    const geolocacaoId = await resolveGeolocacaoIdForCurrentForm();
    if (!geolocacaoId) return null;

    const createResult = await apiFetchWithAuth<{ id: string }>("/api/empreendimentos", {
      method: "POST",
      body: JSON.stringify(
        buildEmpreendimentoMutationBody({
          geolocacaoId,
          status: "RASCUNHO",
        }),
      ),
    });
    if (!createResult.ok) {
      setError(createResult.error);
      return null;
    }
    setEmpreendimentoId(createResult.data.id);
    setLastSavedAt(new Date());
    return createResult.data.id;
  }

  async function appendImagemFiles(files: File[]) {
    if (files.length === 0) return;
    if (!empreendimentoId) {
      setError("Avance até salvar os dados do empreendimento antes de subir imagens.");
      return;
    }
    const approved: File[] = [];
    const rejected: RejectedImageDraftItem[] = [];

    for (const file of files) {
      const reasons: RejectedImageReason[] = [];
      const isHeic = isHeicLikeFile(file);

      if (!isSupportedImageUpload(file)) {
        reasons.push("FORMATO_INVALIDO");
        rejected.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          previewUrl: null,
          reasons,
        });
        continue;
      }

      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        reasons.push("ACIMA_15MB");
      }

      // HEIC/HEIF pode não ter decode no browser para validação de resolução.
      // Permitimos upload e validamos/convertemos na etapa de processamento posterior.
      if (!isHeic) {
        const dimensions = await getImageDimensionsClient(file);
        if (!dimensions) {
          reasons.push("FORMATO_INVALIDO");
        } else if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
          reasons.push("TAMANHO_PEQUENO");
        }
      }

      if (reasons.length > 0) {
        const previewUrl = isHeic ? null : await createLocalImageThumbObjectUrl(file);
        if (previewUrl) {
          rejectedPreviewUrlsRef.current.add(previewUrl);
        }
        rejected.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          previewUrl,
          reasons,
        });
      } else {
        approved.push(file);
      }
    }

    setRejectedImagemItems((current) => {
      for (const item of current) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
          rejectedPreviewUrlsRef.current.delete(item.previewUrl);
        }
      }
      return rejected;
    });
    setError(null);

    if (approved.length === 0) return;

    setUploadingTempImages(true);
    setUploadingTempImagesPercent(0);
    const uploadFailures: string[] = [];
    const totalBytesToUpload = approved.reduce((acc, file) => acc + file.size, 0);
    let uploadedBytesDone = 0;

    for (const file of approved) {
      const alreadyExists = imagemItems.some(
        (item) => item.fileName === file.name && item.sizeBytes === file.size,
      );
      if (alreadyExists) continue;

      const form = new FormData();
      form.append("file", file);
      form.append("ordem", String(imagemItems.length + approved.indexOf(file)));

      const token = await getAccessToken();
      if (!token) {
        uploadFailures.push(`${file.name}: sessão expirada. Faça login novamente.`);
        uploadedBytesDone += file.size;
        if (totalBytesToUpload > 0) {
          setUploadingTempImagesPercent(
            Math.min(100, Math.max(0, Math.round((uploadedBytesDone / totalBytesToUpload) * 100))),
          );
        }
        continue;
      }

      const uploadResult = await new Promise<
        | {
            ok: true;
            data: {
              id: string;
              owner_id: string;
              url: string;
              storage_bucket: string;
              storage_path: string;
              tipo: "IMAGEM" | "VIDEO" | "PDF";
            };
          }
        | { ok: false; error: string; status: number }
      >((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/empreendimentos/${empreendimentoId}/midia`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable || totalBytesToUpload <= 0) return;
          const currentUploaded = uploadedBytesDone + event.loaded;
          const percent = Math.min(
            100,
            Math.max(0, Math.round((currentUploaded / totalBytesToUpload) * 100)),
          );
          setUploadingTempImagesPercent(percent);
        };
        xhr.onerror = () => {
          resolve({ ok: false, error: "Falha de rede no upload da imagem.", status: 0 });
        };
        xhr.onload = () => {
          let payload:
            | { ok?: boolean; data?: unknown; error?: { message?: string } }
            | null = null;
          try {
            payload = JSON.parse(xhr.responseText || "null") as
              | { ok?: boolean; data?: unknown; error?: { message?: string } }
              | null;
          } catch {
            payload = null;
          }
          if (xhr.status >= 200 && xhr.status < 300 && payload?.ok) {
            resolve({
              ok: true,
              data: payload.data as {
                id: string;
                owner_id: string;
                url: string;
                storage_bucket: string;
                storage_path: string;
                tipo: "IMAGEM" | "VIDEO" | "PDF";
              },
            });
            return;
          }
          resolve({
            ok: false,
            error: payload?.error?.message ?? "Falha no upload da imagem.",
            status: xhr.status,
          });
        };
        xhr.send(form);
      });

      uploadedBytesDone += file.size;
      if (totalBytesToUpload > 0) {
        setUploadingTempImagesPercent(
          Math.min(100, Math.max(0, Math.round((uploadedBytesDone / totalBytesToUpload) * 100))),
        );
      }

      if (!uploadResult.ok) {
        uploadFailures.push(`${file.name}: ${uploadResult.error}`);
        continue;
      }

      setImagemItems((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          midiaId: uploadResult.data.id,
          fileName: file.name,
          sizeBytes: file.size,
          previewUrl: uploadResult.data.url,
          thumbUrl: null,
          // Upload de imagem passa por otimização (render 1920), então o preview final
          // já vem em formato renderizável para thumbnail.
          isHeic: false,
          alt: "",
          legenda: "",
          caracteristica: "",
        },
      ]);
      if (!isHeicLikeFile(file)) {
        const localThumb = await createLocalImageThumbObjectUrl(file);
        if (localThumb) {
          thumbPreviewUrlsRef.current.add(localThumb);
          setImagemItems((current) =>
            current.map((item) =>
              item.midiaId === uploadResult.data.id ? { ...item, thumbUrl: localThumb } : item,
            ),
          );
        }
      }
    }

    setUploadingTempImages(false);
    setUploadingTempImagesPercent(null);

    if (uploadFailures.length > 0) {
      setError(`Falha no upload das imagens: ${uploadFailures.join(" | ")}`);
    }
  }

  async function removeImageById(id: string) {
    const target = imagemItems.find((item) => item.id === id);
    if (!target) return;
    if (!empreendimentoId) return;

    if (deletingImageIds.includes(id)) return;
    setDeletingImageIds((current) => [...current, id]);

    const result = await apiFetchWithAuth<{ id: string }>(
      `/api/empreendimentos/${empreendimentoId}/midia/${target.midiaId}`,
      {
      method: "DELETE",
      },
    );

    setDeletingImageIds((current) => current.filter((itemId) => itemId !== id));

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (target.thumbUrl) {
      URL.revokeObjectURL(target.thumbUrl);
      thumbPreviewUrlsRef.current.delete(target.thumbUrl);
    }
    setImagemItems((current) => current.filter((item) => item.id !== id));
    if (editingImageId === id) setEditingImageId(null);
  }

  function applyImageOrder(imageId: string, desiredOrderInput: string) {
    const desiredIndex = Number(desiredOrderInput) - 1;
    if (!Number.isInteger(desiredIndex)) return;

    setImagemItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === imageId);
      if (fromIndex < 0) return current;
      const boundedTarget = Math.max(0, Math.min(current.length - 1, desiredIndex));
      if (boundedTarget === fromIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(boundedTarget, 0, moved);
      return next;
    });
  }

  function moveImageToTarget(dragImageId: string, targetImageId: string) {
    if (dragImageId === targetImageId) return;
    setImagemItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === dragImageId);
      const toIndex = current.findIndex((item) => item.id === targetImageId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  useEffect(() => {
    const previews = rejectedPreviewUrlsRef.current;
    const thumbs = thumbPreviewUrlsRef.current;
    return () => {
      for (const url of previews) {
        URL.revokeObjectURL(url);
      }
      previews.clear();
      for (const url of thumbs) {
        URL.revokeObjectURL(url);
      }
      thumbs.clear();
    };
  }, []);

  function updatePrevisaoEntrega(nextAno: string, nextMes: string) {
    setPrevisaoAnoDraft(nextAno);
    setPrevisaoMesDraft(nextMes);
    if (!nextAno || !nextMes) {
      setPrevisaoEntregaEm("");
      return;
    }
    if (isPastYearMonth(nextAno, nextMes)) {
      setPrevisaoEntregaEm("");
      return;
    }
    setPrevisaoEntregaEm(`${nextAno}-${nextMes}`);
  }

  function clearAddressFields() {
    setPlaceId("");
    setSelectedPlaceName("");
    setEnderecoFormatado("");
    setLogradouro("");
    setNumero("");
    setBairro("");
    setBairroComercial("");
    setLocalizacaoContexto(normalizeLocalizacaoContextoState(null));
    setCidade("");
    setEstado("");
    setCep("");
    setLat(null);
    setLng(null);
    setAddressComponents([]);
    setPlaceOptions([]);
  }

  useEffect(() => {
    if (!empreendimentoFromUrl) {
      setLoading(false);
      return;
    }
    if (empreendimentoId && empreendimentoId === empreendimentoFromUrl) {
      setLoading(false);
      return;
    }
    if (hydratingEmpreendimentoIdRef.current === empreendimentoFromUrl) return;

    let cancelled = false;
    hydratingEmpreendimentoIdRef.current = empreendimentoFromUrl;
    setLoading(true);
    setError(null);

    void (async () => {
      const empreendimentoResult = await apiFetchWithAuth<EmpreendimentoDetailApi>(
        `/api/empreendimentos/${empreendimentoFromUrl}`,
      );
      if (cancelled) return;
      if (!empreendimentoResult.ok) {
        setError(empreendimentoResult.error);
        setLoading(false);
        hydratingEmpreendimentoIdRef.current = null;
        return;
      }

      const empreendimento = empreendimentoResult.data;
      if (empreendimento.status !== "RASCUNHO") {
        router.replace(`/empreendimentos/${empreendimentoFromUrl}`);
        setLoading(false);
        hydratingEmpreendimentoIdRef.current = null;
        return;
      }

      const stepFromUrl = Number(stepFromUrlParam ?? "1");
      setStep(
        Number.isInteger(stepFromUrl) && stepFromUrl >= 1 && stepFromUrl <= TOTAL_STEPS
          ? stepFromUrl
          : 1,
      );

      setEmpreendimentoId(empreendimento.id);
      setFase((empreendimento.fase as FaseEmpreendimento) ?? "NA_PLANTA");
      setTipoUso((empreendimento.tipo_uso as TipoUso) ?? "RESIDENCIAL");
      setCategoriaImovel(empreendimento.categoria_imovel ?? "ESCRITORIO");
      setCategoriaResidencial(
        (empreendimento.categoria_residencial as CategoriaResidencial) ?? "APARTAMENTOS",
      );
      setTipologiasResidenciais(
        Array.isArray(empreendimento.tipologias_residenciais) &&
          empreendimento.tipologias_residenciais.length > 0
          ? empreendimento.tipologias_residenciais
          : ["APARTAMENTO_PADRAO"],
      );
      setCategoriaComercial(
        (empreendimento.categoria_comercial as CategoriaComercial) ?? "ESCRITORIO_CONJUNTO",
      );
      setTipologiasComerciais(
        Array.isArray(empreendimento.tipologias_comerciais) &&
          empreendimento.tipologias_comerciais.length > 0
          ? empreendimento.tipologias_comerciais
          : ["PADRAO"],
      );

      setSelectedPlaceName(empreendimento.address_json?.place_name ?? "");
      setPlaceId(empreendimento.address_json?.place_id ?? "");
      setEnderecoFormatado(empreendimento.address_json?.formatted_address ?? "");
      setAddressComponents(empreendimento.address_json?.address_components ?? []);
      setLogradouro(empreendimento.logradouro ?? "");
      setNumero(empreendimento.numero ?? "");
      setBairro(empreendimento.bairro ?? "");
      setBairroComercial(empreendimento.bairro_comercial ?? "");
      setLocalizacaoContexto(normalizeLocalizacaoContextoState(empreendimento.localizacao_contexto));
      setCidade(empreendimento.cidade ?? "");
      setEstado((empreendimento.estado ?? "").toUpperCase());
      setCep(empreendimento.cep ?? "");
      setLat(typeof empreendimento.lat === "number" ? empreendimento.lat : null);
      setLng(typeof empreendimento.lng === "number" ? empreendimento.lng : null);
      setSearchAddress(
        empreendimento.address_json?.formatted_address ??
          formatAddressFromFields({
            logradouro: empreendimento.logradouro ?? "",
            numero: empreendimento.numero ?? "",
            bairro: empreendimento.bairro ?? "",
            cidade: empreendimento.cidade ?? "",
            estado: (empreendimento.estado ?? "").toUpperCase(),
          }),
      );

      setNome(empreendimento.nome ?? "");
      setConstrutora(empreendimento.construtora ?? "");
      setIncorporadora(empreendimento.incorporadora ?? "");
      setDescricaoEmpreendimento(empreendimento.descricao ?? "");
      setAykaResumoCurto(empreendimento.resumo_curto ?? "");
      setAykaSeoTitle(empreendimento.meta_title ?? "");
      setAykaSeoDescription(empreendimento.meta_description ?? "");
      setAykaKeywords(Array.isArray(empreendimento.keywords) ? empreendimento.keywords.join(", ") : "");

      const previsaoYm = String(empreendimento.previsao_entrega_em ?? "").slice(0, 7);
      const [ano, mes] = previsaoYm.split("-");
      setPrevisaoEntregaEm(previsaoYm);
      setPrevisaoAnoDraft(ano && /^\d{4}$/.test(ano) ? ano : "");
      setPrevisaoMesDraft(mes && /^\d{2}$/.test(mes) ? mes : "");
      setAnoConstrucao(sanitizeYearInput(String(empreendimento.ano_construcao ?? "")));
      setNTorres(sanitizeIntegerInput(String(empreendimento.n_torres ?? "")));
      setNAndares(sanitizeIntegerInput(String(empreendimento.n_andares ?? "")));
      setNUnidades(sanitizeIntegerInput(String(empreendimento.n_unidades ?? "")));
      setQtdElevadores(sanitizeIntegerInput(String(empreendimento.qtd_elevadores ?? "")));
      setUnidadesPorAndar(sanitizeIntegerInput(String(empreendimento.unidades_por_andar ?? "")));
      setUnidadesTerreo(sanitizeIntegerInput(String(empreendimento.unidades_terreo ?? "")));
      setUnidadesCobertura(sanitizeIntegerInput(String(empreendimento.unidades_cobertura ?? "")));
      setCaracteristicaIds(
        Array.isArray(empreendimento.caracteristica_ids) ? empreendimento.caracteristica_ids : [],
      );

      const midiaResult = await apiFetchWithAuth<MidiaRelacaoApi[]>(
        `/api/empreendimentos/${empreendimentoFromUrl}/midia`,
      );
      if (!cancelled && midiaResult.ok) {
        const imageItems = midiaResult.data
          .filter((item) => item.tipo === "IMAGEM")
          .map(mapMidiaRelacaoToImageDraftItem);
        const videoItems = midiaResult.data
          .filter((item) => item.tipo === "VIDEO")
          .map(mapMidiaRelacaoToYoutubeDraftItem)
          .filter((item): item is YoutubeVideoDraftItem => item !== null)
          .slice(0, MAX_YOUTUBE_VIDEOS);

        setImagemItems(imageItems);
        setYoutubeVideos(videoItems);
      }

      if (!cancelled) {
        lastPayloadHashRef.current = "";
        setHasPendingChanges(false);
        setLoading(false);
        hydratingEmpreendimentoIdRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      if (hydratingEmpreendimentoIdRef.current === empreendimentoFromUrl) {
        hydratingEmpreendimentoIdRef.current = null;
      }
    };
  }, [empreendimentoFromUrl, empreendimentoId, router, stepFromUrlParam]);

  useEffect(() => {
    if (step !== 7 || !empreendimentoId || uploadingTempImages) return;
    if (syncingMidiaEmpreendimentoIdRef.current === empreendimentoId) return;

    let cancelled = false;
    syncingMidiaEmpreendimentoIdRef.current = empreendimentoId;

    void (async () => {
      const result = await apiFetchWithAuth<MidiaRelacaoApi[]>(
        `/api/empreendimentos/${empreendimentoId}/midia`,
      );

      if (cancelled) return;
      syncingMidiaEmpreendimentoIdRef.current = null;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const signature = buildMidiaSignature(result.data);
      if (signature === lastPersistedMidiaSignatureRef.current) return;
      lastPersistedMidiaSignatureRef.current = signature;

      const imageItems = result.data
        .filter((item) => item.tipo === "IMAGEM")
        .map(mapMidiaRelacaoToImageDraftItem);
      const videoItems = result.data
        .filter((item) => item.tipo === "VIDEO")
        .map(mapMidiaRelacaoToYoutubeDraftItem)
        .filter((item): item is YoutubeVideoDraftItem => item !== null)
        .slice(0, MAX_YOUTUBE_VIDEOS);

      setImagemItems(imageItems);
      setYoutubeVideos(videoItems);
    })();

    return () => {
      cancelled = true;
      if (syncingMidiaEmpreendimentoIdRef.current === empreendimentoId) {
        syncingMidiaEmpreendimentoIdRef.current = null;
      }
    };
  }, [empreendimentoId, step, uploadingTempImages]);

  useEffect(() => {
    if (!descricaoEditorRef.current) return;
    if (descricaoEditorRef.current.innerHTML !== (descricaoEmpreendimento || "")) {
      descricaoEditorRef.current.innerHTML = descricaoEmpreendimento || "";
    }
  }, [descricaoEmpreendimento]);

  function applyDescricaoCommand(command: "bold" | "italic" | "underline" | "insertUnorderedList") {
    if (!descricaoEditorRef.current) return;
    descricaoEditorRef.current.focus();
    document.execCommand(command);
    if (command === "insertUnorderedList") {
      descricaoEditorRef.current.querySelectorAll("ul").forEach((element) => {
        const ul = element as HTMLUListElement;
        ul.style.listStyleType = "disc";
        ul.style.paddingLeft = "1.25rem";
        ul.style.margin = "0.25rem 0";
      });
      descricaoEditorRef.current.querySelectorAll("li").forEach((element) => {
        const li = element as HTMLLIElement;
        li.style.margin = "0.125rem 0";
      });
    }
    setDescricaoEmpreendimento(descricaoEditorRef.current.innerHTML);
  }

  function toggleAykaPublico(categoria: string, subcategoria: string) {
    setAykaPublicosSelecionados((current) => {
      const exists = current.some(
        (item) => item.categoria === categoria && item.subcategoria === subcategoria,
      );
      if (exists) {
        return current.filter(
          (item) => !(item.categoria === categoria && item.subcategoria === subcategoria),
        );
      }
      if (current.length >= 3) return current;
      return [...current, { categoria, subcategoria }];
    });
  }

  async function handleOpenAykaModal() {
    setCheckingAykaCreditos(true);
    setError(null);

    try {
      const result = await apiFetchWithAuth<AykaDisponibilidadeResponse>(
        "/api/ayka/creditos/disponibilidade?acao=CRIAR_DESCRICAO_EMPREENDIMENTO",
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (!result.data.pode_executar) {
        setError(result.data.detalhe);
        return;
      }

      setAykaModalStep(1);
      setShowAykaModal(true);
    } finally {
      setCheckingAykaCreditos(false);
    }
  }

  async function handleApplyAykaConfiguration() {
    setError(null);
    setShowAykaModal(false);
    setAykaModalStep(1);
    setGerandoDescricaoAyka(true);

    try {
      const result = await apiFetchWithAuth<AykaDescricaoGeradaResponse>(
        "/api/ayka/descricao/gerar",
        {
          method: "POST",
          body: JSON.stringify({
            prompt: buildAykaDescricaoPrompt(),
          }),
        },
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const parsed = result.data.parsed;
      const nextDescricaoEmpreendimento =
        parsed.descricao_html && parsed.descricao_html.trim().length > 0
          ? parsed.descricao_html.trim()
          : descricaoEmpreendimento;
      const nextResumoCurto =
        parsed.resumo_curto && parsed.resumo_curto.trim().length > 0
          ? parsed.resumo_curto.trim()
          : aykaResumoCurto;
      const nextSeoTitle =
        parsed.seo_title && parsed.seo_title.trim().length > 0
          ? parsed.seo_title.trim()
          : aykaSeoTitle;
      const nextSeoDescription =
        parsed.seo_description && parsed.seo_description.trim().length > 0
          ? parsed.seo_description.trim()
          : aykaSeoDescription;
      const nextAykaKeywords =
        Array.isArray(parsed.keywords) && parsed.keywords.length > 0
          ? [...new Set(parsed.keywords.map((item) => item.trim()).filter(Boolean))].join(", ")
          : aykaKeywords;

      setDescricaoEmpreendimento(nextDescricaoEmpreendimento);
      setAykaResumoCurto(nextResumoCurto);
      setAykaSeoTitle(nextSeoTitle);
      setAykaSeoDescription(nextSeoDescription);
      setAykaKeywords(nextAykaKeywords);

      if (empreendimentoId) {
        const nextHash = JSON.stringify({
          ...payload,
          descricaoEmpreendimento: nextDescricaoEmpreendimento,
          aykaResumoCurto: nextResumoCurto,
          aykaSeoTitle: nextSeoTitle,
          aykaSeoDescription: nextSeoDescription,
          aykaKeywords: nextAykaKeywords,
        });
        if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
        setSaving(true);
        const saveResult = await apiFetchWithAuth<{ id: string }>(
          `/api/empreendimentos/${empreendimentoId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              descricao: sanitizeOptional(nextDescricaoEmpreendimento),
              resumo_curto: sanitizeOptional(nextResumoCurto),
              meta_title: sanitizeOptional(nextSeoTitle),
              meta_description: sanitizeOptional(nextSeoDescription),
              keywords: parseKeywordsInput(nextAykaKeywords),
            }),
          },
        );
        setSaving(false);
        if (!saveResult.ok) {
          setError(saveResult.error);
          return;
        }
        lastPayloadHashRef.current = nextHash;
        setHasPendingChanges(false);
        setLastSavedAt(new Date());
      }

      showToast("Descrição gerada pela Ayka com sucesso.");
    } finally {
      setGerandoDescricaoAyka(false);
    }
  }

  function buildAykaDescricaoPrompt() {
    const caracteristicasSelecionadas = caracteristicasDisponiveis
      .filter((item) => caracteristicaIds.includes(item.id))
      .map((item) => item.label_pt);

    const endereco = formatAddressFromFields({
      logradouro,
      numero,
      bairro,
      cidade,
      estado,
    });

    const descricaoBase = htmlToPlainText(descricaoEmpreendimento || "");
    const localizacaoPerfil = localizacaoContexto.perfil_regiao.length
      ? localizacaoContexto.perfil_regiao.join(", ")
      : "Não informado";
    const localizacaoMobilidade = localizacaoContexto.mobilidade.length
      ? localizacaoContexto.mobilidade.join(", ")
      : "Não informado";
    const localizacaoComercioServicos = localizacaoContexto.comercio_servicos.length
      ? localizacaoContexto.comercio_servicos.join(", ")
      : "Não informado";
    const localizacaoLazerEstilo = localizacaoContexto.lazer_estilo_vida.length
      ? localizacaoContexto.lazer_estilo_vida.join(", ")
      : "Não informado";
    const localizacaoResumo = localizacaoContexto.resumo_local.trim() || "Não informado";

    return `### CONTEXTO
Você é um redator imobiliário especialista em SEO local e acessibilidade, escrevendo em português-BR.

### OBJETIVO
Criar uma descrição persuasiva e confiável para um empreendimento imobiliário, pronta para uso em portais e página pública.

### CONFIGURAÇÃO CRIATIVA (DEFINIDA PELO CORRETOR)
- Tom: ${aykaTom || "Não definido"}
- Voz: ${aykaVoz || "Não definido"}
- Estilo principal: ${aykaEstilo || "Não definido"}
- Incluir CTA no último parágrafo: ${aykaIncluirCta ? "Sim" : "Não"}
- Públicos-alvo selecionados (até 3): ${
      aykaPublicosSelecionados.length > 0
        ? aykaPublicosSelecionados
            .map((item) => `${item.categoria} > ${item.subcategoria}`)
            .join(", ")
        : "Nenhum"
    }

### REGRAS OBRIGATÓRIAS
1. Não invente informações.
2. Use apenas os dados fornecidos.
3. Evite clichês e exageros.
4. Texto claro, escaneável e natural.
5. Priorize benefícios reais para comprador/investidor.
6. Quando faltar dado, ignore o ponto.
7. Sem emojis.
8. Saída em HTML simples com 2 a 4 parágrafos.
9. O texto final (sem tags HTML) deve ter no máximo 1024 caracteres.
10. Destaque palavras-chave relevantes com <b>...</b> (sem exagero).
11. Adapte o texto ao público-alvo selecionado; se não houver público selecionado, use linguagem ampla.
12. Pode enriquecer a narrativa de localização com inferência de estilo de vida baseada no contexto informado, sem citar números, distâncias ou estabelecimentos específicos não fornecidos.

### DADOS DO EMPREENDIMENTO
- Nome: ${nome || "Não informado"}
- Tipo de uso: ${tipoUso}
- Categoria: ${categoriaResumo || "Não informado"}
- Fase: ${fase}
- Estágio da obra: ${estagioObra || "Não informado"}
- Previsão de entrega: ${previsaoEntregaEm || "Não informado"}
- Endereço base: ${endereco || "Não informado"}
- Bairro comercial: ${bairroComercial || "Não informado"}
- Perfil da região: ${localizacaoPerfil}
- Mobilidade: ${localizacaoMobilidade}
- Comércio e serviços: ${localizacaoComercioServicos}
- Lazer e estilo de vida: ${localizacaoLazerEstilo}
- Resumo local fornecido pelo corretor: ${localizacaoResumo}
- Construtora: ${construtora || "Não informado"}
- Incorporadora: ${incorporadora || "Não informado"}
- Torres: ${nTorres || "Não informado"}
- Andares: ${nAndares || "Não informado"}
- Unidades: ${nUnidades || "Não informado"}
- Qtd. elevadores: ${qtdElevadores || "Não informado"}
- Unidades por andar: ${unidadesPorAndar || "Não informado"}
- Unidades no térreo: ${unidadesTerreo || "Não informado"}
- Unidades cobertura: ${unidadesCobertura || "Não informado"}
- Características selecionadas: ${caracteristicasSelecionadas.length > 0 ? caracteristicasSelecionadas.join(", ") : "Nenhuma"}
- Quantidade de imagens: ${imagemItems.length}
- Quantidade de vídeos: ${youtubeVideos.length}
- Texto base do corretor (se existir): ${descricaoBase || "Nenhum"}

### SAÍDA ESPERADA
Retorne somente um JSON válido com este formato:
{
  "headline": "até 90 caracteres",
  "descricao_html": "<p>...</p><p>...</p> (2 a 4 parágrafos, até 1024 caracteres sem tags, com palavras-chave em <b>)",
  "resumo_curto": "até 180 caracteres",
  "seo_title": "até 60 caracteres",
  "seo_description": "até 155 caracteres",
  "keywords": ["6 palavras-chave objetivas e distintas"]
}`;
  }

  useEffect(() => {
    if (tipoUso !== "COMERCIAL") return;
    const legacy = deriveLegacyCategoriaImovel(
      "COMERCIAL",
      categoriaComercial,
      categoriaResidencial,
      tipologiasResidenciais,
    );
    if (categoriaImovel !== legacy) {
      setCategoriaImovel(legacy);
    }
  }, [tipoUso, categoriaComercial, categoriaResidencial, tipologiasResidenciais, categoriaImovel]);

  useEffect(() => {
    if (tipoUso !== "RESIDENCIAL") return;
    const allowed = new Set(
      (TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[categoriaResidencial] ?? []).map((item) => item.value),
    );
    const filtered = tipologiasResidenciais.filter((item) => allowed.has(item));
    if (filtered.length === tipologiasResidenciais.length && filtered.length > 0) return;
    setTipologiasResidenciais(
      filtered.length > 0
        ? filtered
        : [(TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[categoriaResidencial]?.[0]?.value ?? "APARTAMENTO_PADRAO")],
    );
  }, [tipoUso, categoriaResidencial, tipologiasResidenciais]);

  useEffect(() => {
    if (tipoUso !== "COMERCIAL") return;
    const allowed = new Set(
      (TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[categoriaComercial] ?? []).map((item) => item.value),
    );
    const filtered = tipologiasComerciais.filter((item) => allowed.has(item));
    if (filtered.length === tipologiasComerciais.length && filtered.length > 0) return;
    setTipologiasComerciais(
      filtered.length > 0
        ? filtered
        : [(TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[categoriaComercial]?.[0]?.value ?? "PADRAO")],
    );
  }, [tipoUso, categoriaComercial, tipologiasComerciais]);

  useEffect(() => {
    if (isEstruturaVerticalEnabled) return;
    setQtdElevadores("");
    setUnidadesPorAndar("");
    setUnidadesTerreo("");
    setUnidadesCobertura("");
  }, [isEstruturaVerticalEnabled]);

  useEffect(() => {
    if (fase !== "ENTREGUE") {
      setAnoConstrucao("");
    }
  }, [fase]);

  useEffect(() => {
    if (step !== 6 || loadingCaracteristicas) return;
    if (caracteristicasCatalogoTipoUsoLoaded !== tipoUso) return;
    const allowedIds = new Set(caracteristicasDisponiveis.map((item) => item.id));
    setCaracteristicaIds((current) =>
      current.filter((item) => allowedIds.has(item)),
    );
  }, [
    caracteristicasCatalogoTipoUsoLoaded,
    caracteristicasDisponiveis,
    loadingCaracteristicas,
    step,
    tipoUso,
  ]);

  useEffect(() => {
    if (step !== 6) return;

    let cancelled = false;
    setLoadingCaracteristicas(true);
    setCaracteristicasCatalogoTipoUsoLoaded(null);

    void apiFetchWithAuth<CaracteristicaCatalogoItem[]>(
      `/api/caracteristicas/catalogo?escopo=EMPREENDIMENTO&tipo_uso=${encodeURIComponent(tipoUso)}`,
    ).then((result) => {
      if (cancelled) return;
      setLoadingCaracteristicas(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCaracteristicasCatalogo(result.data);
      setCaracteristicasCatalogoTipoUsoLoaded(tipoUso);
    });

    return () => {
      cancelled = true;
    };
  }, [step, tipoUso]);

  useEffect(() => {
    if (loading || !empreendimentoId) return;
    const currentHash = JSON.stringify(payload);
    if (currentHash === lastPayloadHashRef.current) return;

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      const result = await apiFetchWithAuth<{ id: string }>(
        `/api/empreendimentos/${empreendimentoId}`,
        {
          method: "PATCH",
          body: JSON.stringify(buildEmpreendimentoMutationBody({ status: "RASCUNHO" })),
        },
      );
      setSaving(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      lastPayloadHashRef.current = currentHash;
      setHasPendingChanges(false);
      setLastSavedAt(new Date());
    }, 900);
  }, [buildEmpreendimentoMutationBody, loading, empreendimentoId, payload, step, nome, selectedPlaceName]);

  useEffect(() => {
    if (step !== 2) return;
    if (!GOOGLE_MAPS_PUBLIC_KEY) {
      setMapsReady(false);
      setMapsError(
        "Configure NEXT_PUBLIC_GOOGLE_MAPS_KEY para habilitar o mapa interativo.",
      );
      return;
    }

    setMapsReady(false);
    loadGoogleMapsScript(GOOGLE_MAPS_PUBLIC_KEY)
      .then(() => {
        setMapsError(null);
        setMapsReady(true);
      })
      .catch((err) => {
        setMapsReady(false);
        setMapsError(err instanceof Error ? err.message : "Falha ao carregar Google Maps");
      });
  }, [step]);

  useEffect(() => {
    if (step === 2) return;
    mapRef.current = null;
    markerRef.current = null;
    markerBoundRef.current = false;
    mapHostElementRef.current = null;
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    if (lat !== null && lng !== null) return;
    mapRef.current = null;
    markerRef.current = null;
    markerBoundRef.current = false;
    mapHostElementRef.current = null;
  }, [step, lat, lng]);

  useEffect(() => {
    if (step !== 2) return;
    if (mapsError) return;
    if (!mapsReady) return;
    if (!window.google?.maps) return;
    if (!mapContainerRef.current) return;
    if (lat === null || lng === null) return;
    if (typeof window.google.maps.Map !== "function") {
      void loadGoogleMapsScript(GOOGLE_MAPS_PUBLIC_KEY)
        .then(() => {
          setMapsError(null);
          setMapsReady(true);
        })
        .catch((err) => {
          setMapsReady(false);
          setMapsError(err instanceof Error ? err.message : "Falha ao carregar Google Maps");
        });
      return;
    }

    const center = { lat, lng };
    const currentContainer = mapContainerRef.current;
    const mustRecreateMap =
      !mapRef.current || mapHostElementRef.current !== currentContainer;

    if (mustRecreateMap) {
      const map = new window.google.maps.Map(currentContainer, {
        center,
        zoom: 16,
        mapTypeId: "roadmap",
        ...(GOOGLE_MAPS_MAP_ID ? { mapId: GOOGLE_MAPS_MAP_ID } : {}),
        gestureHandling: "greedy",
        disableDefaultUI: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: 2,
          position: 3,
          mapTypeIds: ["roadmap", "satellite"],
        },
        zoomControl: true,
      });
      const markerApi = window.google.maps.marker?.AdvancedMarkerElement;
      const canUseAdvancedMarker = Boolean(markerApi && GOOGLE_MAPS_MAP_ID);
      let markerController: {
        setPosition: (position: { lat: number; lng: number }) => void;
        addDragEndListener: (handler: () => void) => void;
        getPosition: () => { lat: number; lng: number } | null;
      };

      if (canUseAdvancedMarker && markerApi) {
        const advancedMarker = new markerApi({
          map,
          position: center,
          gmpDraggable: true,
        });

        markerController = {
          setPosition: (position: { lat: number; lng: number }) => {
            advancedMarker.position = position;
          },
          addDragEndListener: (handler: () => void) => {
            window.google?.maps?.event.addListener(advancedMarker, "dragend", handler);
          },
          getPosition: () => {
            const position = advancedMarker.position;
            if (!position) return null;
            const positionWithFn = position as { lat?: () => number; lng?: () => number };
            if (typeof positionWithFn.lat === "function" && typeof positionWithFn.lng === "function") {
              return { lat: positionWithFn.lat(), lng: positionWithFn.lng() };
            }
            const positionLiteral = position as { lat?: number; lng?: number };
            if (typeof positionLiteral.lat === "number" && typeof positionLiteral.lng === "number") {
              return { lat: positionLiteral.lat, lng: positionLiteral.lng };
            }
            return null;
          },
        };
      } else {
        const legacyMarker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });

        markerController = {
          setPosition: (position: { lat: number; lng: number }) => {
            legacyMarker.setPosition(position);
          },
          addDragEndListener: (handler: () => void) => {
            legacyMarker.addListener("dragend", handler);
          },
          getPosition: () => {
            const position = legacyMarker.getPosition();
            if (!position) return null;
            return { lat: position.lat(), lng: position.lng() };
          },
        };
      }

      mapRef.current = map;
      markerRef.current = markerController;
      mapHostElementRef.current = currentContainer;
      markerBoundRef.current = false;
    } else {
      const mapInstance = mapRef.current;
      if (!mapInstance) return;
      mapInstance.setCenter(center);
      markerRef.current?.setPosition(center);
    }

    if (markerRef.current && !markerBoundRef.current) {
      markerRef.current.addDragEndListener(() => {
        const position = markerRef.current?.getPosition();
        if (!position) return;
        setLat(position.lat);
        setLng(position.lng);
      });
      markerBoundRef.current = true;
    }
  }, [step, lat, lng, mapsError, mapsReady]);

  useEffect(() => {
    if (step !== 2) return;
    if (!isSearchFocused) {
      setPlaceOptions([]);
      setSearchingPlaces(false);
      return;
    }
    const query = searchAddress.trim();
    if (query.length < 3) {
      setPlaceOptions([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingPlaces(true);
      const result = await apiFetchWithAuth<PlacePrediction[]>(
        `/api/google/places/autocomplete?input=${encodeURIComponent(query)}`,
      );
      setSearchingPlaces(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPlaceOptions(result.data);
    }, 300);
  }, [step, searchAddress, isSearchFocused]);

  useEffect(() => {
    if (step !== 2) return;
    if (!numero.trim()) return;
    if (placeId) return;

    const hasStructuredAddress =
      !!logradouro.trim() && !!bairro.trim() && !!cidade.trim() && !!estado.trim();
    const typedSearch = searchAddress.trim();
    const userTypedCustomAddress =
      typedSearch.length > 0 &&
      !!enderecoFormatado.trim() &&
      typedSearch !== enderecoFormatado.trim();

    let address = "";
    if (userTypedCustomAddress) {
      address = replaceOrAppendAddressNumber(typedSearch, numero);
    } else if (hasStructuredAddress) {
      address = formatAddressFromFields({
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
      });
    } else {
      return;
    }

    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    geocodeTimeoutRef.current = setTimeout(async () => {
      setRegeocoding(true);
      const result = await apiFetchWithAuth<{
        place_id: string | null;
        formatted_address: string;
        lat: number | null;
        lng: number | null;
      }>(`/api/google/geocode?address=${encodeURIComponent(address)}`);
      setRegeocoding(false);

      if (!result.ok) return;
      setPlaceId(result.data.place_id ?? "");
      setEnderecoFormatado(result.data.formatted_address ?? address);
      setLat(result.data.lat ?? null);
      setLng(result.data.lng ?? null);
    }, 500);
  }, [step, logradouro, numero, bairro, cidade, estado, placeId, searchAddress, enderecoFormatado]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
  }, []);

  async function handleSelectPlace(option: PlacePrediction) {
    setSearchAddress(option.description);
    setPlaceOptions([]);
    const result = await apiFetchWithAuth<PlaceDetails>(
      `/api/google/places/details?placeId=${encodeURIComponent(option.place_id)}`,
    );

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const details = result.data;
    setSelectedPlaceName(details.name ?? "");
    setPlaceId(details.place_id ?? "");
    setEnderecoFormatado(details.formatted_address ?? option.description);
    setLogradouro(details.logradouro ?? "");
    setNumero(details.numero ?? "");
    setBairro(details.bairro ?? "");
    setCidade(details.cidade ?? "");
    if (details.estado && isUfCode(details.estado)) {
      setEstado(details.estado);
    }
    setCep(details.cep ?? "");
    setLat(details.lat);
    setLng(details.lng);
    setAddressComponents(details.address_components ?? []);
    showToast("Endereço preenchido automaticamente.");
  }

  async function validateDuplicateEmpreendimentoInBase(options: {
    checkNome: boolean;
    checkEndereco: boolean;
  }) {
    if (!options.checkNome && !options.checkEndereco) return true;

    const listResult = await apiFetchWithAuth<EmpreendimentoDuplicateCheckLite[]>("/api/empreendimentos");
    if (!listResult.ok) {
      setError(listResult.error);
      return false;
    }

    const nomeNorm = normalizeComparableText(nome);
    const enderecoNorm = {
      logradouro: normalizeComparableText(logradouro),
      numero: normalizeComparableText(numero),
      bairro: normalizeComparableText(bairro),
      cidade: normalizeComparableText(cidade),
      estado: normalizeComparableText(estado),
      cep: normalizeComparableText(cep),
    };
    const hasAddressCandidate = Boolean(
      enderecoNorm.logradouro &&
        enderecoNorm.numero &&
        enderecoNorm.bairro &&
        enderecoNorm.cidade &&
        enderecoNorm.estado,
    );

    for (const item of listResult.data) {
      if (item.status === "RASCUNHO") continue;

      if (options.checkNome && nomeNorm && normalizeComparableText(item.nome) === nomeNorm) {
        setError("Já existe um empreendimento com este nome na sua base.");
        setDuplicateConflictModal({ id: item.id, kind: "nome" });
        return false;
      }

      if (!options.checkEndereco || !hasAddressCandidate) continue;
      const rowAddress = {
        logradouro: normalizeComparableText(item.logradouro),
        numero: normalizeComparableText(item.numero),
        bairro: normalizeComparableText(item.bairro),
        cidade: normalizeComparableText(item.cidade),
        estado: normalizeComparableText(item.estado),
        cep: normalizeComparableText(item.cep),
      };

      if (
        enderecoNorm.logradouro === rowAddress.logradouro &&
        enderecoNorm.numero === rowAddress.numero &&
        enderecoNorm.bairro === rowAddress.bairro &&
        enderecoNorm.cidade === rowAddress.cidade &&
        enderecoNorm.estado === rowAddress.estado &&
        enderecoNorm.cep === rowAddress.cep
      ) {
        setError("Já existe um empreendimento com este endereço na sua base.");
        setDuplicateConflictModal({ id: item.id, kind: "endereco" });
        return false;
      }
    }

    return true;
  }

  async function validateCurrentStep() {
    if (step === 1) {
      if (!fase || !tipoUso) {
        setError("Selecione fase e tipo de uso.");
        return false;
      }
      if (tipoUso === "COMERCIAL" && !categoriaImovel) {
        setError("Selecione a categoria comercial.");
        return false;
      }
      if (tipoUso === "COMERCIAL" && tipologiasComerciais.length === 0) {
        setError("Selecione ao menos uma tipologia comercial.");
        return false;
      }
      if (tipoUso === "RESIDENCIAL" && tipologiasResidenciais.length === 0) {
        setError("Selecione ao menos uma tipologia residencial.");
        return false;
      }
    }

    if (step === 2) {
      if (!logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
        setError("Preencha os campos obrigatórios de localização (logradouro/endereço, número, bairro, cidade e UF).");
        return false;
      }
      const duplicateAddressOk = await validateDuplicateEmpreendimentoInBase({
        checkNome: false,
        checkEndereco: true,
      });
      if (!duplicateAddressOk) return false;
    }

    if (step === 4) {
      if (!nome.trim()) {
        setError("Informe o nome do empreendimento.");
        return false;
      }
      if (fase === "NA_PLANTA" && !previsaoEntregaEm.trim()) {
        setError("Informe a previsão de entrega (mês/ano).");
        return false;
      }
      if (previsaoEntregaEm.trim()) {
        const [year, month] = previsaoEntregaEm.split("-");
        if (isPastYearMonth(year ?? "", month ?? "")) {
          setError("Previsão de entrega não pode ser no passado.");
          return false;
        }
      }
      if (fase === "ENTREGUE" && anoConstrucao.trim()) {
        const parsedYear = Number(anoConstrucao);
        if (!Number.isInteger(parsedYear) || anoConstrucao.length !== 4) {
          setError("Ano de construção deve conter 4 dígitos.");
          return false;
        }
        if (parsedYear > CURRENT_YEAR) {
          setError(`Ano de construção não pode ser maior que ${CURRENT_YEAR}.`);
          return false;
        }
        if (parsedYear < 1800) {
          setError("Ano de construção inválido.");
          return false;
        }
      }
      const duplicateNomeOk = await validateDuplicateEmpreendimentoInBase({
        checkNome: true,
        checkEndereco: true,
      });
      if (!duplicateNomeOk) return false;
    }

    if (step === 5) {
      const values = [
        { label: "Torres", value: nTorres },
        { label: "Andares", value: nAndares },
        { label: "Unidades", value: nUnidades },
        { label: "Qtd elevadores", value: qtdElevadores },
        { label: "Unidades por andar", value: unidadesPorAndar },
        { label: "Unidades no térreo", value: unidadesTerreo },
        { label: "Unidades cobertura", value: unidadesCobertura },
      ];
      for (const item of values) {
        if (
          !isEstruturaVerticalEnabled &&
          ["Qtd elevadores", "Unidades por andar", "Unidades no térreo", "Unidades cobertura"].includes(
            item.label,
          )
        ) {
          continue;
        }
        if (!item.value.trim()) continue;
        const parsed = Number(item.value);
        if (!Number.isInteger(parsed) || parsed < 0) {
          setError(`${item.label}: informe um número inteiro válido.`);
          return false;
        }
      }
    }

    if (step === 8) {
      if (youtubeVideos.length > MAX_YOUTUBE_VIDEOS) {
        setError(`Você pode adicionar no máximo ${MAX_YOUTUBE_VIDEOS} vídeos do YouTube.`);
        return false;
      }
      for (const item of youtubeVideos) {
        if (!normalizeYouTubeUrl(item.url)) {
          setError("Há um link de vídeo do YouTube inválido. Revise antes de continuar.");
          return false;
        }
      }
    }

    if (step === 9) {
      const descricaoLength = htmlToPlainText(descricaoEmpreendimento).length;
      if (descricaoLength > MAX_DESCRICAO_EMPREENDIMENTO_CHARS) {
        setError(
          `A descrição deve ter no máximo ${MAX_DESCRICAO_EMPREENDIMENTO_CHARS} caracteres (sem contar tags HTML).`,
        );
        return false;
      }
    }

    return true;
  }

  async function goNext() {
    setError(null);
    if (!(await validateCurrentStep())) return;
    if (step === 4 && !empreendimentoId) {
      const createdId = await ensureEmpreendimentoCreatedAsRascunho();
      if (!createdId) return;
    }
    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      showToast("Etapa salva.");
    }
  }

  function goBack() {
    setError(null);
    if (step > 1) setStep((current) => current - 1);
  }

  async function handleSaveAndLeaveFromModal() {
    const destination = pendingNavigationHref;
    if (!destination) return;

    setError(null);
    const ensuredId = empreendimentoId ?? (await ensureEmpreendimentoCreatedAsRascunho());
    if (!ensuredId) return;

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    setSaving(true);
    const result = await apiFetchWithAuth<{ id: string }>(
      `/api/empreendimentos/${ensuredId}`,
      {
        method: "PATCH",
        body: JSON.stringify(buildEmpreendimentoMutationBody({ status: "RASCUNHO" })),
      },
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    lastPayloadHashRef.current = JSON.stringify(payload);
    setHasPendingChanges(false);
    setLastSavedAt(new Date());
    setShowUnsavedLeaveModal(false);
    setPendingNavigationHref(null);
    bypassUnsavedGuardRef.current = true;
    if (destination === HISTORY_NAVIGATION_SENTINEL) {
      unsavedHistoryLockRef.current = false;
      window.history.go(-2);
      return;
    }
    window.location.href = destination;
  }

  function handleDiscardAndLeaveFromModal() {
    if (!pendingNavigationHref) return;
    const destination = pendingNavigationHref;
    setShowUnsavedLeaveModal(false);
    setPendingNavigationHref(null);
    bypassUnsavedGuardRef.current = true;
    if (destination === HISTORY_NAVIGATION_SENTINEL) {
      unsavedHistoryLockRef.current = false;
      window.history.go(-2);
      return;
    }
    window.location.href = destination;
  }

  function getPublicationChecklistIssues() {
    const issues: string[] = [];

    if (!fase || !tipoUso) {
      issues.push("Defina fase e tipo de uso do empreendimento.");
    }
    if (tipoUso === "COMERCIAL" && !categoriaImovel) {
      issues.push("Defina a categoria comercial do empreendimento.");
    }
    if (tipoUso === "COMERCIAL" && tipologiasComerciais.length === 0) {
      issues.push("Selecione ao menos uma tipologia comercial.");
    }
    if (tipoUso === "RESIDENCIAL" && tipologiasResidenciais.length === 0) {
      issues.push("Selecione ao menos uma tipologia residencial.");
    }
    if (!logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
      issues.push("Preencha os campos obrigatórios de localização (logradouro/endereço, número, bairro, cidade e UF).");
    }
    if (!nome.trim()) {
      issues.push("Informe o nome do empreendimento.");
    }
    if (fase === "NA_PLANTA" && !previsaoEntregaEm.trim()) {
      issues.push("Empreendimento na planta exige previsão de entrega.");
    }
    if (imagemItems.length < 3) {
      issues.push("Adicione no mínimo 3 imagens para publicar.");
    }

    return issues;
  }

  async function handleFinalize(mode: FinalizeMode) {
    setError(null);
    if (!(await validateCurrentStep())) return;
    if (uploadingTempImages) {
      setError("Aguarde o término do envio das imagens antes de continuar.");
      return;
    }

    if (mode === "PUBLICADO") {
      const issues = getPublicationChecklistIssues();
      if (issues.length > 0) {
        setPublicationChecklistIssues(issues);
        setShowPublicationChecklistModal(true);
        return;
      }
    }

    setFinalizing(true);

    const ensuredId = empreendimentoId ?? (await ensureEmpreendimentoCreatedAsRascunho());
    if (!ensuredId) {
      setFinalizing(false);
      return;
    }

    const geolocacaoId = await resolveGeolocacaoIdForCurrentForm();
    if (!geolocacaoId) {
      setFinalizing(false);
      return;
    }

    const saveResult = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${ensuredId}`, {
      method: "PATCH",
      body: JSON.stringify(
        buildEmpreendimentoMutationBody({
          geolocacaoId,
          status: "RASCUNHO",
        }),
      ),
    });
    if (!saveResult.ok) {
      setFinalizing(false);
      setError(saveResult.error);
      return;
    }

    for (const item of imagemItems) {
      if (!item.midiaId) continue;
      await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${ensuredId}/midia/${item.midiaId}`, {
        method: "PATCH",
        body: JSON.stringify({
          alt: item.alt.trim() || null,
          legenda: item.legenda.trim() || null,
          caracteristica: item.caracteristica.trim() || null,
        }),
      });
    }

    const persistedMidiaResult = await apiFetchWithAuth<
      Array<{
        midia_id: string;
        tipo: "IMAGEM" | "VIDEO" | "PDF";
        url: string;
      }>
    >(`/api/empreendimentos/${ensuredId}/midia`);
    if (!persistedMidiaResult.ok) {
      setFinalizing(false);
      setError(persistedMidiaResult.error);
      return;
    }
    const persistedYoutubeUrls = new Set(
      persistedMidiaResult.data
        .filter((item) => item.tipo === "VIDEO")
        .map((item) => normalizeYouTubeUrl(item.url))
        .filter((item): item is string => Boolean(item)),
    );
    const missingYoutube = youtubeVideos.filter((item) => !persistedYoutubeUrls.has(item.url));
    const persistedVideoIds = persistedMidiaResult.data
      .filter((item) => item.tipo === "VIDEO")
      .map((item) => item.midia_id);

    for (let index = 0; index < missingYoutube.length; index += 1) {
      const item = missingYoutube[index];
      const form = new FormData();
      form.append("youtube_url", item.url);
      form.append("ordem", String(imagemItems.length + persistedVideoIds.length + index));
      if (item.title?.trim()) {
        form.append("titulo", item.title.trim());
      }
      const result = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${ensuredId}/midia`, {
        method: "POST",
        body: form,
      });
      if (result.ok) {
        persistedVideoIds.push(result.data.id);
      }
    }

    const orderedMidiaIds = [
      ...imagemItems.map((item) => item.midiaId).filter(Boolean),
      ...persistedVideoIds,
    ];
    if (orderedMidiaIds.length > 0) {
      await apiFetchWithAuth<{ total: number }>(`/api/empreendimentos/${ensuredId}/midia`, {
        method: "PATCH",
        body: JSON.stringify({
          orderedMidiaIds,
        }),
      });
    }

    if (mode === "PUBLICADO") {
      const enqueueResult = await apiFetchWithAuth<{ id: string }>(
        `/api/empreendimentos/${ensuredId}/publicacao-jobs`,
        {
          method: "POST",
          body: JSON.stringify({
            imagens: imagemItems.map((item, index) => ({
              midiaId: item.midiaId,
              ordem: index,
              alt: item.alt,
              legenda: item.legenda,
              caracteristica: item.caracteristica,
            })),
            videos: youtubeVideos.map((item) => ({ url: item.url })),
          }),
        },
      );

      if (!enqueueResult.ok) {
        setFinalizing(false);
        setError(enqueueResult.error);
        return;
      }

      bypassUnsavedGuardRef.current = true;
      setHasPendingChanges(false);
      router.push("/empreendimentos?publicacao_enfileirada=1");
      return;
    }

    bypassUnsavedGuardRef.current = true;
    setHasPendingChanges(false);
    router.push(`/empreendimentos/${ensuredId}`);
  }

  if (loading) {
    return (
      <AppShell title="Novo empreendimento" subtitle="Preparando cadastro...">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CircleNotch className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Novo empreendimento"
      subtitle="Cadastro guiado em etapas"
    >
      {toast ? (
        <div className="fixed right-6 top-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--grey-olive)]">
                Cadastro do empreendimento
              </p>
              <h2 className="text-3xl leading-tight text-slate-900">Etapa {step} de {TOTAL_STEPS}</h2>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{saving ? "Salvando..." : empreendimentoId ? "Empreendimento em rascunho" : "Dados locais"}</p>
              <p>
                {lastSavedAt
                  ? `Último salvamento às ${lastSavedAt.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Ainda sem alterações salvas"}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--primary-scarlet)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {step === 1 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-2xl text-slate-900">Fase e categoria</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setFase("NA_PLANTA")}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-4 text-sm ${
                  fase === "NA_PLANTA"
                    ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <Megaphone size={18} />
                Na planta / Lançamento
              </button>
              <button
                type="button"
                onClick={() => setFase("EM_CONSTRUCAO")}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-4 text-sm ${
                  fase === "EM_CONSTRUCAO"
                    ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <HardHat size={18} />
                Em construção
              </button>
              <button
                type="button"
                onClick={() => setFase("ENTREGUE")}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-4 text-sm ${
                  fase === "ENTREGUE"
                    ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <Key size={18} />
                Entregue
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-600">Tipo de uso</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoUso("RESIDENCIAL");
                      if (tipologiasResidenciais.length === 0) {
                        setTipologiasResidenciais([
                          TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[categoriaResidencial]?.[0]?.value ??
                            "APARTAMENTO_PADRAO",
                        ]);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-sm ${
                      tipoUso === "RESIDENCIAL"
                        ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <HouseLine size={16} className="mr-2 inline" />
                    Residencial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipoUso("COMERCIAL");
                      if (!categoriaImovel) {
                        setCategoriaImovel("ESCRITORIO");
                      }
                    }}
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-sm ${
                      tipoUso === "COMERCIAL"
                        ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <Buildings size={16} className="mr-2 inline" />
                    Comercial
                  </button>
                </div>
              </div>
              <div>
                {tipoUso === "COMERCIAL" ? (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="categoria-comercial" className="mb-2 block text-sm text-slate-600">
                        Categoria comercial
                      </label>
                      <select
                        id="categoria-comercial"
                        value={categoriaComercial}
                        onChange={(event) => setCategoriaComercial(event.target.value as CategoriaComercial)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary-scarlet)]"
                      >
                        {CATEGORIAS_COMERCIAIS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-600">
                        Tipologias comerciais (selecione uma ou mais)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {tipologiasComerciaisByCategoria.map((tipologia) => {
                          const selected = tipologiasComerciais.includes(tipologia.value);
                          return (
                            <button
                              key={tipologia.value}
                              type="button"
                              onClick={() => {
                                setTipologiasComerciais((current) => {
                                  const has = current.includes(tipologia.value);
                                  if (has) {
                                    const next = current.filter((item) => item !== tipologia.value);
                                    return next.length > 0 ? next : current;
                                  }
                                  return [...current, tipologia.value];
                                });
                              }}
                              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                                selected
                                  ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                  : "border-slate-200 text-slate-600"
                              }`}
                            >
                              {tipologia.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-sm text-slate-600">Categoria residencial</label>
                      <select
                        value={categoriaResidencial}
                        onChange={(event) => setCategoriaResidencial(event.target.value as CategoriaResidencial)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary-scarlet)]"
                      >
                        {CATEGORIAS_RESIDENCIAIS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-600">
                        Tipologias residenciais (selecione uma ou mais)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {tipologiasResidenciaisByCategoria.map((tipologia) => {
                          const selected = tipologiasResidenciais.includes(tipologia.value);
                          return (
                            <button
                              key={tipologia.value}
                              type="button"
                              onClick={() => {
                                setTipologiasResidenciais((current) => {
                                  const has = current.includes(tipologia.value);
                                  if (has) {
                                    const next = current.filter((item) => item !== tipologia.value);
                                    return next.length > 0 ? next : current;
                                  }
                                  return [...current, tipologia.value];
                                });
                              }}
                              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                                selected
                                  ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                  : "border-slate-200 text-slate-600"
                              }`}
                            >
                              {tipologia.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-2xl text-slate-900">Localização</h3>

            <label className="mb-2 block text-sm text-slate-600">Busca por endereço ou place</label>
            <div className="relative">
              <input
                value={searchAddress}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  // Delay para permitir clique na lista antes de ocultar.
                  setTimeout(() => setIsSearchFocused(false), 120);
                }}
                onChange={(event) => {
                  const next = event.target.value;
                  setSearchAddress(next);
                  if (!next.trim()) {
                    clearAddressFields();
                    return;
                  }
                  if (placeId && next !== enderecoFormatado) {
                    setPlaceId("");
                    setSelectedPlaceName("");
                  }
                }}
                placeholder="Ex: Av. Paulista, 200 ou Condomínio New York Club Vila Romana"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--primary-scarlet)]"
              />
              {searchingPlaces ? (
                <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-400">
                  Buscando...
                </span>
              ) : null}
            </div>

            {isSearchFocused && placeOptions.length > 0 ? (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {placeOptions.map((option) => (
                  <button
                    key={option.place_id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handleSelectPlace(option)}
                    className="flex w-full cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <MapPin size={14} className="text-slate-400" />
                    {option.description}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-base text-slate-900">Endereço formatado</h4>
                <p className="mb-3 text-sm text-slate-600">
                  {enderecoFormatado || "Selecione um endereço para preencher automaticamente."}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Logradouro / Endereço</label>
                    <input
                      value={logradouro}
                      onChange={(event) => setLogradouro(event.target.value)}
                      disabled={readOnlyAddressByPlace && Boolean(logradouro)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Número</label>
                    <input
                      value={numero}
                      onChange={(event) => {
                        const nextNumero = event.target.value;
                        setNumero(nextNumero);
                        if (placeId) {
                          setPlaceId("");
                          setSelectedPlaceName("");
                        }

                        if (
                          logradouro.trim() &&
                          bairro.trim() &&
                          cidade.trim() &&
                          estado.trim()
                        ) {
                          const withoutNumber = formatAddressFromFields({
                            logradouro,
                            numero: "",
                            bairro,
                            cidade,
                            estado,
                          });
                          setSearchAddress(
                            nextNumero.trim()
                              ? replaceOrAppendAddressNumber(withoutNumber, nextNumero)
                              : withoutNumber,
                          );
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Bairro</label>
                    <input
                      value={bairro}
                      onChange={(event) => setBairro(event.target.value)}
                      disabled={readOnlyAddressByPlace && Boolean(bairro)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Cidade</label>
                    <input
                      value={cidade}
                      onChange={(event) => setCidade(event.target.value)}
                      disabled={readOnlyAddressByPlace && Boolean(cidade)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">UF</label>
                    <select
                      value={estado}
                      onChange={(event) => setEstado(event.target.value.toUpperCase())}
                      disabled={readOnlyAddressByPlace && Boolean(estado)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      <option value="">Selecione</option>
                      {UF_OPTIONS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">CEP</label>
                    <input
                      value={cep}
                      onChange={(event) => setCep(event.target.value)}
                      disabled={readOnlyAddressByPlace && Boolean(cep)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-slate-500">
                    Bairro comercial (texto livre)
                  </label>
                  <input
                    value={bairroComercial}
                    onChange={(event) => setBairroComercial(event.target.value)}
                    placeholder="Ex: Jardins, Centro expandido, Faria Lima"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-base text-slate-900">Visualização do mapa</h4>
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {lat !== null && lng !== null && !mapsError ? (
                    <div ref={mapContainerRef} className="h-64 w-full" />
                  ) : mapsError ? (
                    <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-rose-600">
                      {mapsError}
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                      Sem coordenadas ainda
                    </div>
                  )}
                </div>
                {regeocoding ? (
                  <p className="mt-2 text-xs text-slate-500">Atualizando coordenadas pelo número informado...</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Latitude: {lat ?? "-"} • Longitude: {lng ?? "-"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-2 text-2xl text-slate-900">Contexto da localização</h3>
            <p className="mb-4 text-sm text-slate-500">
              Etapa opcional para enriquecer a localização no texto comercial e no prompt da Ayka.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Perfil da região</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LOCALIZACAO_PERFIL_REGIAO_OPTIONS.map((option) => {
                      const active = localizacaoContexto.perfil_regiao.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleLocalizacaoContextoOption("perfil_regiao", option)}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${
                            active
                              ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Mobilidade</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LOCALIZACAO_MOBILIDADE_OPTIONS.map((option) => {
                      const active = localizacaoContexto.mobilidade.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleLocalizacaoContextoOption("mobilidade", option)}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${
                            active
                              ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Comércio e serviços</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LOCALIZACAO_COMERCIO_SERVICOS_OPTIONS.map((option) => {
                      const active = localizacaoContexto.comercio_servicos.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleLocalizacaoContextoOption("comercio_servicos", option)}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${
                            active
                              ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Lazer e estilo de vida</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LOCALIZACAO_LAZER_ESTILO_OPTIONS.map((option) => {
                      const active = localizacaoContexto.lazer_estilo_vida.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleLocalizacaoContextoOption("lazer_estilo_vida", option)}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${
                            active
                              ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Resumo local estratégico (opcional)
                  </label>
                  <textarea
                    value={localizacaoContexto.resumo_local}
                    onChange={(event) =>
                      setLocalizacaoContexto((current) => ({
                        ...current,
                        resumo_local: event.target.value.slice(0, 300),
                      }))
                    }
                    rows={3}
                    placeholder="Ex: região procurada por famílias, com comércio completo e boa mobilidade para os principais eixos."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-right text-[11px] text-slate-500">
                    {localizacaoContexto.resumo_local.length}/300
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-2xl text-slate-900">Dados do empreendimento</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Nome</label>
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Ex: Condomínio New York Club"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Construtora</label>
                <input
                  value={construtora}
                  onChange={(event) => setConstrutora(event.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Incorporadora</label>
                <input
                  value={incorporadora}
                  onChange={(event) => setIncorporadora(event.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              {fase !== "ENTREGUE" ? (
                <div>
                  <label className="mb-1 block text-sm text-slate-600">
                    Previsão de entrega (mês/ano)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={previsaoAnoDraft}
                      onChange={(event) => {
                        const nextAno = event.target.value;
                        const minMonthForYear =
                          nextAno && Number(nextAno) === CURRENT_YEAR
                            ? String(CURRENT_MONTH).padStart(2, "0")
                            : "01";
                        const nextMes =
                          previsaoMesDraft && Number(previsaoMesDraft) >= Number(minMonthForYear)
                            ? previsaoMesDraft
                            : "";
                        updatePrevisaoEntrega(nextAno, nextMes);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    >
                      <option value="">Ano</option>
                      {previsaoAnos.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <select
                      value={previsaoMesDraft}
                      onChange={(event) =>
                        updatePrevisaoEntrega(previsaoAnoDraft, event.target.value)
                      }
                      disabled={!previsaoAnoDraft}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">Mês</option>
                      {MONTH_OPTIONS.map((month) => (
                        <option
                          key={month.value}
                          value={month.value}
                          disabled={
                            !!previsaoAnoDraft &&
                            Number(previsaoAnoDraft) === CURRENT_YEAR &&
                            Number(month.value) < CURRENT_MONTH
                          }
                        >
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
              {fase === "ENTREGUE" ? (
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Ano de construção</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={anoConstrucao}
                    onChange={(event) => setAnoConstrucao(sanitizeYearInput(event.target.value))}
                    placeholder={`${CURRENT_YEAR}`}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">Máximo permitido: {CURRENT_YEAR}</p>
                </div>
              ) : null}
            </div>

            {fase === "EM_CONSTRUCAO" ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-1 text-base text-slate-900">Acompanhe sua obra</h4>
                <p className="mb-3 text-sm text-slate-500">
                  Defina o percentual de cada frente para refletir o estágio real da construção.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {OBRA_PROGRESS_FIELDS.map((item) => (
                    <div key={item.key}>
                      <label className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>{item.label}</span>
                        <span className="font-medium text-[var(--grey-olive)]">
                          {obraPercentuais[item.key]}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={obraPercentuais[item.key]}
                        onChange={(event) => {
                          const next = clampPercent(event.target.value);
                          setObraPercentuais((current) => ({
                            ...current,
                            [item.key]: next,
                          }));
                        }}
                        className="w-full accent-[var(--grey-olive)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 5 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-2xl text-slate-900">
              <StackSimple size={24} />
              Estrutura
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Esses dados ajudam a acelerar o cadastro de unidades na edição do empreendimento.
            </p>
            {isEstruturaVerticalEnabled ? (
              <>
                <div className="grid gap-4 md:grid-cols-6">
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Torres</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={nTorres}
                      onChange={(event) => setNTorres(sanitizeIntegerInput(event.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Andares</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={nAndares}
                      onChange={(event) => setNAndares(sanitizeIntegerInput(event.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Unid./andar</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={unidadesPorAndar}
                      onChange={(event) => setUnidadesPorAndar(sanitizeIntegerInput(event.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Unid. térreo</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={unidadesTerreo}
                      onChange={(event) => setUnidadesTerreo(sanitizeIntegerInput(event.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Unid. cobertura</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={unidadesCobertura}
                      onChange={(event) => setUnidadesCobertura(sanitizeIntegerInput(event.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Unidades totais</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={nUnidades}
                      onChange={(event) => setNUnidades(sanitizeIntegerInput(event.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p>
                    Fórmula: torres x andares x unid./andar + térreo ={" "}
                    <strong>
                      {sugestaoUnidadesBase != null
                        ? sugestaoUnidadesBase
                        : "preencha torres, andares, unid./andar e térreo"}
                    </strong>
                    {" · "}
                    Com cobertura:{" "}
                    <strong>
                      {sugestaoUnidadesComCobertura != null
                        ? sugestaoUnidadesComCobertura
                        : "preencha unid. cobertura"}
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (sugestaoUnidadesBase != null) setNUnidades(String(sugestaoUnidadesBase));
                    }}
                    disabled={sugestaoUnidadesBase == null}
                    className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Calcular e preencher
                  </button>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Elevadores</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={qtdElevadores}
                      onChange={(event) => setQtdElevadores(sanitizeIntegerInput(event.target.value))}
                      placeholder="Opcional"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Número de torres</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={nTorres}
                    onChange={(event) => setNTorres(sanitizeIntegerInput(event.target.value))}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Número de andares</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={nAndares}
                    onChange={(event) => setNAndares(sanitizeIntegerInput(event.target.value))}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Número total de unidades</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={nUnidades}
                    onChange={(event) => setNUnidades(sanitizeIntegerInput(event.target.value))}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>
            )}
          </section>
        ) : null}

        {step === 6 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-2xl text-slate-900">Características do empreendimento</h3>
            <p className="mb-4 text-sm text-slate-500">
              Selecione os diferenciais em ordem alfabética. Essas características serão reutilizadas na categorização de mídias das páginas públicas.
            </p>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Tipo de uso atual: <strong>{tipoUso === "RESIDENCIAL" ? "Residencial" : "Comercial"}</strong> • {caracteristicaIds.length} selecionada(s)
            </div>
            {loadingCaracteristicas ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Carregando características...
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {caracteristicasDisponiveis.map((item) => {
                  const active = caracteristicaIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setCaracteristicaIds((current) =>
                          current.includes(item.id)
                            ? current.filter((value) => value !== item.id)
                            : [...current, item.id],
                        )
                      }
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.label_pt}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {step === 7 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-2xl text-slate-900">
              <ImageSquare size={24} />
              Imagens
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Organize suas imagens e preencha metadados de SEO em cada card.
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Regras: máximo 15MB por imagem e resolução mínima de 800x600 px. A otimização para
              1920px é feita no envio.
            </p>

              <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*,.heic,.heif"
              onChange={(event) => {
                void appendImagemFiles(Array.from(event.target.files ?? []));
                event.currentTarget.value = "";
              }}
              className="sr-only"
            />
            <div
              onDragEnter={(event) => {
                const isFileDrag = event.dataTransfer.types?.includes("Files");
                if (!isFileDrag) return;
                event.preventDefault();
                setIsImageDragActive(true);
              }}
              onDragOver={(event) => {
                const isFileDrag = event.dataTransfer.types?.includes("Files");
                if (!isFileDrag) return;
                event.preventDefault();
                setIsImageDragActive(true);
              }}
              onDragLeave={(event) => {
                const isFileDrag = event.dataTransfer.types?.includes("Files");
                if (!isFileDrag) return;
                event.preventDefault();
                setIsImageDragActive(false);
              }}
              onDrop={(event) => {
                const isFileDrag = event.dataTransfer.types?.includes("Files");
                if (!isFileDrag) return;
                event.preventDefault();
                setIsImageDragActive(false);
                void appendImagemFiles(Array.from(event.dataTransfer.files ?? []));
              }}
              className={`rounded-xl border border-dashed p-5 text-center transition ${
                isImageDragActive
                  ? "border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)]/5"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600">
                <UploadSimple size={20} />
              </div>
              <p className="text-sm text-slate-700">Arraste imagens para cá</p>
              <p className="mt-1 text-xs text-slate-500">
                JPG, JPEG, PNG, WEBP estatico, HEIC e HEIF
              </p>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingTempImages}
                className="mt-3 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingTempImages
                  ? `Enviando... ${uploadingTempImagesPercent ?? 0}%`
                  : "Escolher imagens"}
              </button>
            </div>

            {uploadingTempImages ? (
              <div className="mt-4 rounded-xl border border-[var(--primary-scarlet)]/30 bg-[var(--primary-scarlet)]/5 p-4">
                <div className="flex items-center gap-3">
                  <CircleNotch size={28} className="animate-spin text-[var(--primary-scarlet)]" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--primary-scarlet)]">
                        Enviando imagens...
                      </p>
                      <p className="text-xs text-slate-600">
                        Progresso do envio: {uploadingTempImagesPercent ?? 0}%
                      </p>
                    </div>
                  </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-[var(--primary-scarlet)] transition-all"
                    style={{ width: `${uploadingTempImagesPercent ?? 0}%` }}
                  />
                </div>
              </div>
            ) : null}

            {imagemItems.length > 0 ? (
              <div
                className={`mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 ${
                  isImageDragActive ? "rounded-xl border border-dashed border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)]/5 p-2" : ""
                }`}
                onDragEnter={(event) => {
                  const isFileDrag = event.dataTransfer.types?.includes("Files");
                  if (!isFileDrag) return;
                  event.preventDefault();
                  setIsImageDragActive(true);
                }}
                onDragOver={(event) => {
                  const isFileDrag = event.dataTransfer.types?.includes("Files");
                  if (!isFileDrag) return;
                  event.preventDefault();
                  setIsImageDragActive(true);
                }}
                onDragLeave={(event) => {
                  const isFileDrag = event.dataTransfer.types?.includes("Files");
                  if (!isFileDrag) return;
                  event.preventDefault();
                  setIsImageDragActive(false);
                }}
                onDrop={(event) => {
                  const isFileDrag = event.dataTransfer.types?.includes("Files");
                  if (!isFileDrag) return;
                  event.preventDefault();
                  setIsImageDragActive(false);
                  void appendImagemFiles(Array.from(event.dataTransfer.files ?? []));
                  setDropTargetImageId(null);
                }}
              >
                {imagemItems.map((item, index) => (
                  <article
                    key={item.id}
                    onDragEnter={(event) => {
                      const isFileDrag = event.dataTransfer.types?.includes("Files");
                      if (isFileDrag) {
                        event.preventDefault();
                        return;
                      }
                      const hasInternalDrag = event.dataTransfer.types?.includes(
                        "application/x-corretor-image-id",
                      );
                      if (!hasInternalDrag) return;
                      event.preventDefault();
                      if (dropTargetImageId !== item.id) setDropTargetImageId(item.id);
                    }}
                    onDragOver={(event) => {
                      const isFileDrag = event.dataTransfer.types?.includes("Files");
                      if (isFileDrag) {
                        event.preventDefault();
                        return;
                      }
                      const hasInternalDrag = event.dataTransfer.types?.includes(
                        "application/x-corretor-image-id",
                      );
                      if (!hasInternalDrag) return;
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "move";
                      if (dropTargetImageId !== item.id) setDropTargetImageId(item.id);
                    }}
                    onDrop={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      const isFileDrag = event.dataTransfer.types?.includes("Files");
                      if (isFileDrag) {
                        void appendImagemFiles(Array.from(event.dataTransfer.files ?? []));
                        return;
                      }
                      const dragId =
                        event.dataTransfer.getData("application/x-corretor-image-id") ||
                        event.dataTransfer.getData("text/plain");
                      if (!dragId) return;
                      moveImageToTarget(dragId, item.id);
                      setDropTargetImageId(null);
                    }}
                    className={`overflow-hidden rounded-xl border bg-slate-50 transition ${
                      dropTargetImageId === item.id
                        ? "border-[var(--primary-scarlet)] ring-2 ring-[var(--primary-scarlet)]/20"
                        : "border-slate-200"
                    }`}
                  >
                    <div
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("application/x-corretor-image-id", item.id);
                        event.dataTransfer.setData("text/plain", item.id);
                      }}
                      onDragEnd={() => {
                        setDropTargetImageId(null);
                      }}
                      className="group relative aspect-[4/3] cursor-grab bg-slate-200 active:cursor-grabbing"
                    >
                      {item.isHeic ? (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 px-4 text-center">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Preview indisponível</p>
                            <p className="mt-1 text-xs text-slate-500">HEIC/HEIF será convertido no processamento.</p>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.thumbUrl || buildThumbUrl(item.previewUrl)}
                          alt={item.alt || item.fileName}
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/20 group-hover:opacity-100">
                        <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                          <ArrowsOutCardinal size={13} />
                          Arrastar
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{item.fileName}</p>
                        <p className="text-xs text-slate-500">{formatBytes(item.sizeBytes)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={deletingImageIds.includes(item.id)}
                          onClick={() => {
                            void removeImageById(item.id);
                          }}
                          className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Remover imagem"
                        >
                          {deletingImageIds.includes(item.id) ? (
                            <CircleNotch size={16} className="animate-spin" />
                          ) : (
                            <Trash size={16} />
                          )}
                        </button>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          Ordem
                          <input
                            key={`${item.id}-${index}`}
                            type="number"
                            min={1}
                            max={imagemItems.length}
                            defaultValue={index + 1}
                            onBlur={(event) => applyImageOrder(item.id, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                applyImageOrder(item.id, event.currentTarget.value);
                                event.currentTarget.blur();
                              }
                            }}
                            className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm text-slate-700"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingImageId(item.id)}
                          className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                          aria-label="Editar imagem"
                        >
                          <DotsThreeVertical size={16} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingImageId(item.id)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100"
                      >
                        {item.caracteristica
                          ? `Característica: ${caracteristicaLabelByChave.get(item.caracteristica) ?? item.caracteristica}`
                          : "Sem característica - clique para definir"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Nenhuma imagem adicionada.</p>
            )}

            {rejectedImagemItems.length > 0 ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <h4 className="text-sm font-semibold text-rose-700">
                  Imagens que não atendem pré-requisitos
                </h4>
                <p className="mt-1 text-xs text-rose-600">
                  Corrija os arquivos abaixo para conseguir enviar.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {rejectedImagemItems.map((item) => (
                    <article
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-rose-200 bg-white p-3"
                    >
                      <div className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.fileName}
                            draggable={false}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                            Sem preview
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-800">{item.fileName}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                        {item.reasons.includes("TAMANHO_PEQUENO") ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Tamanho Pequeno
                          </span>
                        ) : null}
                        {item.reasons.includes("ACIMA_15MB") ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                            Acima de 15MB
                          </span>
                        ) : null}
                        {item.reasons.includes("FORMATO_INVALIDO") ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            Formato inválido
                          </span>
                        ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {editingImageId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg text-slate-900">Editar imagem</h4>
                <button
                  type="button"
                  onClick={() => setEditingImageId(null)}
                  className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
              {(() => {
                const current = imagemItems.find((item) => item.id === editingImageId);
                if (!current) return <p className="text-sm text-slate-500">Imagem não encontrada.</p>;
                return (
                  <div className="space-y-3">
                    <p className="truncate text-sm text-slate-700">{current.fileName}</p>
                    <label className="block">
                      <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                        Legenda
                        <InfoTooltip text="Legenda aparece junto da imagem em contextos de listagem e materiais." />
                      </span>
                      <input
                        value={current.legenda}
                        onChange={(event) =>
                          setImagemItems((items) =>
                            items.map((item) =>
                              item.id === current.id
                                ? { ...item, legenda: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Ex.: Fachada principal do empreendimento"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                        Característica
                        <InfoTooltip text="Classifica a imagem para filtros e organização na galeria do empreendimento." />
                      </span>
                      <select
                        value={current.caracteristica}
                        onChange={(event) =>
                          setImagemItems((items) =>
                            items.map((item) =>
                              item.id === current.id
                                ? { ...item, caracteristica: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Selecionar característica</option>
                        {caracteristicasSelecionadasOptions.map((caracteristica) => (
                          <option key={caracteristica.id} value={caracteristica.chave}>
                            {caracteristica.label_pt}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                        Texto alternativo (alt)
                        <InfoTooltip text="Texto alternativo (alt) e uma descricao curta da imagem para leitores de tela, ajudando pessoas com deficiencia visual a entender o conteudo. Tambem ajuda buscadores a indexar melhor a imagem no SEO. Escreva de forma objetiva: o que aparece, qual ambiente e, quando fizer sentido, o contexto do imovel." />
                      </span>
                      <textarea
                        value={current.alt}
                        onChange={(event) =>
                          setImagemItems((items) =>
                            items.map((item) =>
                              item.id === current.id ? { ...item, alt: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Ex.: Varanda gourmet com vista para piscina"
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}

        {step === 8 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-2xl text-slate-900">
              <Megaphone size={24} />
              Vídeos (YouTube)
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Cole os links de vídeos e ajuste a ordem de exibição.
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Máximo de {MAX_YOUTUBE_VIDEOS} vídeos por empreendimento.
            </p>
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              O primeiro vídeo da lista será priorizado para apresentação nos portais de anúncios.
              A exibição final depende das regras e limitações de cada portal.
            </div>

            <div className="flex gap-2">
              <input
                value={youtubeUrlInput}
                onChange={(event) => setYoutubeUrlInput(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
              <button
                type="button"
                disabled={addingYoutube || youtubeVideos.length >= MAX_YOUTUBE_VIDEOS}
                onClick={async () => {
                  if (youtubeVideos.length >= MAX_YOUTUBE_VIDEOS) {
                    setError(`Você pode adicionar no máximo ${MAX_YOUTUBE_VIDEOS} vídeos.`);
                    return;
                  }
                  const normalized = normalizeYouTubeUrl(youtubeUrlInput);
                  if (!normalized) {
                    setError("Informe uma URL válida do YouTube.");
                    return;
                  }
                  const videoId = getYouTubeVideoId(normalized);
                  if (!videoId) {
                    setError("Não foi possível identificar o vídeo do YouTube.");
                    return;
                  }
                  setError(null);
                  setAddingYoutube(true);
                  const title = await fetchYouTubeTitle(normalized);
                  setYoutubeVideos((current) => {
                    if (current.some((video) => video.url === normalized)) return current;
                    if (current.length >= MAX_YOUTUBE_VIDEOS) return current;
                    return [
                      ...current,
                      { id: crypto.randomUUID(), url: normalized, videoId, title },
                    ];
                  });
                  setYoutubeUrlInput("");
                  setAddingYoutube(false);
                }}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingYoutube ? "Adicionando..." : "Adicionar"}
              </button>
            </div>

            {youtubeVideos.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {youtubeVideos.map((item, index) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <div className="relative aspect-video bg-slate-200">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${item.videoId}?rel=0&modestbranding=1`}
                        title={item.title ?? `Vídeo ${index + 1}`}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                    <div className="space-y-2 p-3">
                      <p className="line-clamp-2 text-sm font-medium text-slate-800">
                        {item.title ?? "Título não disponível"}
                      </p>
                      <p className="truncate text-xs text-slate-500">{item.url}</p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          Ordem {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() =>
                              setYoutubeVideos((current) => {
                                const next = [...current];
                                const prev = next[index - 1];
                                next[index - 1] = next[index];
                                next[index] = prev;
                                return next;
                              })
                            }
                            className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Subir vídeo"
                          >
                            <CaretUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === youtubeVideos.length - 1}
                            onClick={() =>
                              setYoutubeVideos((current) => {
                                const next = [...current];
                                const after = next[index + 1];
                                next[index + 1] = next[index];
                                next[index] = after;
                                return next;
                              })
                            }
                            className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Descer vídeo"
                          >
                            <CaretDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setYoutubeVideos((current) =>
                                current.filter((video) => video.id !== item.id),
                              )
                            }
                            className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            aria-label="Remover vídeo"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Nenhum vídeo adicionado.</p>
            )}
          </section>
        ) : null}

        {step === 9 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl text-slate-900">Descrição do empreendimento (Ayka)</h3>
              <button
                type="button"
                onClick={() => {
                  void handleOpenAykaModal();
                }}
                disabled={checkingAykaCreditos}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingAykaCreditos ? (
                  <CircleNotch size={16} className="animate-spin" />
                ) : (
                  <Robot size={16} />
                )}
                {checkingAykaCreditos ? "Verificando créditos..." : "Gerar descrição com a Ayka"}
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">Estruture a descrição com rich text.</p>
            <div className="block text-sm">
              <span className="mb-1 block text-slate-500">Descrição base (rich text)</span>
              <div className="rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-2">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyDescricaoCommand("bold")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Negrito"
                  >
                    <TextB size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDescricaoCommand("italic")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Itálico"
                  >
                    <TextItalic size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDescricaoCommand("underline")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Sublinhado"
                  >
                    <TextUnderline size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDescricaoCommand("insertUnorderedList")}
                    className="inline-flex cursor-pointer rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                    title="Lista"
                  >
                    <ListBullets size={15} />
                  </button>
                </div>
              </div>
              <div
                ref={descricaoEditorRef}
                contentEditable
                onInput={(event) =>
                  setDescricaoEmpreendimento((event.target as HTMLDivElement).innerHTML)
                }
                className="min-h-[340px] rounded-b-lg border border-slate-300 px-3 py-3 text-sm leading-7 outline-none focus:border-[var(--blue-slate)] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1.5"
                style={{ whiteSpace: "pre-wrap" }}
              />
            </div>
            <p
              className={`mt-3 text-xs ${
                htmlToPlainText(descricaoEmpreendimento).length > MAX_DESCRICAO_EMPREENDIMENTO_CHARS
                  ? "text-rose-600"
                  : "text-slate-500"
              }`}
            >
              Caracteres: {htmlToPlainText(descricaoEmpreendimento).length}/{MAX_DESCRICAO_EMPREENDIMENTO_CHARS} (sem contar tags HTML)
            </p>
          </section>
        ) : null}

        {step === 10 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-2xl text-slate-900">Resumo e finalização</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Fase</p>
                <p className="text-base text-slate-900">{fase.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Uso</p>
                <p className="text-base text-slate-900">{tipoUso}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Nome</p>
                <p className="text-base text-slate-900">{nome || "Não informado"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Endereço</p>
                <p className="text-base text-slate-900">
                  {logradouro && numero && bairro && cidade
                    ? formatAddressFromFields({
                        logradouro,
                        numero,
                        bairro,
                        cidade,
                        estado,
                      })
                    : "Não informado"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Estrutura</p>
                <p className="text-base text-slate-900">
                  Torres: {nTorres || "—"} • Andares: {nAndares || "—"} • Unidades: {nUnidades || "—"}
                  {isEstruturaVerticalEnabled
                    ? ` • Elevadores: ${qtdElevadores || "—"} • Unid/andar: ${unidadesPorAndar || "—"} • Térreo: ${unidadesTerreo || "—"} • Cobertura: ${unidadesCobertura || "—"}`
                    : ""}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Imagens</p>
                <p className="text-base text-slate-900">{imagemItems.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Vídeos (YouTube)</p>
                <p className="text-base text-slate-900">{youtubeVideos.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Descrição</p>
                <p className="text-base text-slate-900">
                  {htmlToPlainText(descricaoEmpreendimento) || "Não informada"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-widest text-slate-400">Características</p>
                <p className="text-base text-slate-900">
                  {caracteristicaIds.length > 0
                    ? caracteristicasDisponiveis
                        .filter((item) => caracteristicaIds.includes(item.id))
                        .map((item) => item.label_pt)
                        .join(" • ")
                    : "Nenhuma selecionada"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              O cadastro é salvo como <strong>RASCUNHO</strong> e pode ser concluído/publicado quando estiver pronto.
            </p>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {showAykaModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg text-slate-900">Configuração neural da Ayka</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowAykaModal(false);
                    setAykaModalStep(1);
                  }}
                  className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Etapa {aykaModalStep} de 4
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--primary-scarlet)] transition-all"
                    style={{ width: `${(aykaModalStep / 4) * 100}%` }}
                  />
                </div>
              </div>

              {aykaModalStep === 1 ? (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-900">Escolha o tom</p>
                  <p className="mb-3 text-xs text-slate-500">
                    Define a sensação do texto. Ao clicar em uma opção, avançamos automaticamente.
                  </p>
                  <div className="space-y-2">
                    {AYKA_TOM_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setAykaTom(option);
                          setAykaModalStep(2);
                        }}
                        className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                          aykaTom === option
                            ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{option}</span>
                          <InlineOptionTooltip text={AYKA_TOM_DESCRICOES[option]} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {aykaModalStep === 2 ? (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-900">Escolha a voz</p>
                  <p className="mb-3 text-xs text-slate-500">
                    Define quem está “falando” no texto: especialista, consultor, institucional.
                  </p>
                  <div className="space-y-2">
                    {AYKA_VOZ_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setAykaVoz(option);
                          setAykaModalStep(3);
                        }}
                        className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                          aykaVoz === option
                            ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{option}</span>
                          <InlineOptionTooltip text={AYKA_VOZ_DESCRICOES[option]} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {aykaModalStep === 3 ? (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-900">Escolha o estilo principal</p>
                  <p className="mb-3 text-xs text-slate-500">
                    Define o foco narrativo da descrição.
                  </p>
                  <div className="space-y-2">
                    {AYKA_ESTILO_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setAykaEstilo(option);
                          setAykaModalStep(4);
                        }}
                        className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                          aykaEstilo === option
                            ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{option}</span>
                          <InlineOptionTooltip text={AYKA_ESTILO_DESCRICOES[option]} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {aykaModalStep === 4 ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      As keywords serão geradas automaticamente pela Ayka e ficam bloqueadas para edição.
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={aykaIncluirCta}
                        onChange={(event) => setAykaIncluirCta(event.target.checked)}
                      />
                      Incluir CTA final
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Público-alvo (até 3)
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {AYKA_PUBLICOS.map((item) => (
                        <button
                          key={item.categoria}
                          type="button"
                          onClick={() => setAykaPublicoCategoria(item.categoria)}
                          className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${
                            aykaPublicoCategoria === item.categoria
                              ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {item.categoria}
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {aykaSubcategoriasDaCategoria.map((subcategoria) => {
                        const active = aykaPublicosSelecionados.some(
                          (item) =>
                            item.categoria === aykaPublicoCategoria &&
                            item.subcategoria === subcategoria,
                        );
                        const disabled = !active && aykaPublicosSelecionados.length >= 3;
                        return (
                          <button
                            key={subcategoria}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleAykaPublico(aykaPublicoCategoria, subcategoria)}
                            className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-xs ${
                              active
                                ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {subcategoria}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Selecionados: {aykaPublicosSelecionados.length}/3
                    </p>
                    {aykaPublicosSelecionados.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aykaPublicosSelecionados.map((item) => (
                          <button
                            key={`${item.categoria}:${item.subcategoria}`}
                            type="button"
                            onClick={() => toggleAykaPublico(item.categoria, item.subcategoria)}
                            className="cursor-pointer rounded-full border border-[var(--primary-scarlet)] bg-white px-2 py-0.5 text-xs text-[var(--primary-scarlet)]"
                            title="Clique para remover"
                          >
                            {item.categoria} &gt; {item.subcategoria}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={aykaModalStep === 1}
                  onClick={() => setAykaModalStep((current) => Math.max(1, current - 1))}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Voltar
                </button>
                {aykaModalStep === 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleApplyAykaConfiguration();
                    }}
                    disabled={gerandoDescricaoAyka}
                    className="cursor-pointer rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {gerandoDescricaoAyka ? "Gerando descrição..." : "Gerar descrição com a Ayka"}
                  </button>
                ) : <span />}
              </div>
            </div>
          </div>
        ) : null}

        <section className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || finalizing}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Voltar
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={finalizing}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary-scarlet)] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PencilSimpleLine size={16} />
              Salvar e continuar
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleFinalize("RASCUNHO")}
                disabled={finalizing}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finalizing ? <CircleNotch className="h-4 w-4 animate-spin" /> : <PencilSimpleLine size={16} />}
                {finalizing ? "Finalizando..." : "Salvar rascunho"}
              </button>
              <button
                type="button"
                onClick={() => void handleFinalize("PUBLICADO")}
                disabled={finalizing}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finalizing ? <CircleNotch className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
                {finalizing ? "Finalizando..." : "Publicar"}
              </button>
            </div>
          )}
        </section>

        {showPublicationChecklistModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg text-slate-900">Empreendimento não apto para publicação</h4>
                <button
                  type="button"
                  onClick={() => setShowPublicationChecklistModal(false)}
                  className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mb-3 text-sm text-slate-600">
                Revise os itens pendentes abaixo para publicar.
              </p>
              <ul className="space-y-2">
                {publicationChecklistIssues.map((issue) => (
                  <li key={issue} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {issue}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPublicationChecklistModal(false)}
                  className="cursor-pointer rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {duplicateConflictModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg text-slate-900">Conflito de cadastro</h4>
                <button
                  type="button"
                  onClick={() => setDuplicateConflictModal(null)}
                  className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mb-3 text-sm text-slate-600">
                {duplicateConflictModal.kind === "nome"
                  ? "Já existe um empreendimento com este nome na sua base."
                  : "Já existe um empreendimento com este endereço na sua base."}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Para evitar duplicidade, você pode abrir o cadastro existente e atualizar por lá.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDuplicateConflictModal(null)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                >
                  Continuar aqui
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/empreendimentos/${duplicateConflictModal.id}`)}
                  className="cursor-pointer rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white"
                >
                  Ir para edição
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {showUnsavedLeaveModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-lg text-slate-900">
                  <WarningCircle size={20} className="text-amber-600" />
                  Alterações pendentes
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedLeaveModal(false);
                    setPendingNavigationHref(null);
                  }}
                  className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mb-3 text-sm text-slate-600">
                Existem mudanças ainda não salvas. Deseja salvar antes de sair?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedLeaveModal(false);
                    setPendingNavigationHref(null);
                  }}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                >
                  Continuar editando
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndLeaveFromModal}
                  className="cursor-pointer rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-700"
                >
                  Descartar e sair
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveAndLeaveFromModal();
                  }}
                  disabled={saving}
                  className="cursor-pointer rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar e sair"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {gerandoDescricaoAyka ? <AykaNeuralLoading /> : null}
      </div>
    </AppShell>
  );
}

export default function NovoEmpreendimentoPage() {
  return (
    <Suspense fallback={<main className="min-h-screen px-6 py-12">Carregando empreendimento...</main>}>
      <NovoEmpreendimentoContent />
    </Suspense>
  );
}
