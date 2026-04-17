"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowsOutCardinal,
  Buildings,
  CaretLeft,
  CaretRight,
  CaretDown,
  CaretUp,
  CircleNotch,
  DotsThreeVertical,
  Eye,
  HardHat,
  House,
  Info,
  ImageSquare,
  ListBullets,
  ListChecks,
  MapPin,
  MapPinLine,
  Megaphone,
  Robot,
  Sparkle,
  TextB,
  TextItalic,
  TextUnderline,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Card } from "flowbite-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AykaNeuralLoading } from "@/app/_components/ayka-neural-loading";
import { AppShell } from "@/app/_components/app-shell";
import { FloatingToastViewport, type FloatingToastItem } from "@/app/_components/floating-toast";
import { apiFetchWithAuth } from "@/lib/client/auth-api";
import {
  formatAddressFromFields,
  replaceOrAppendAddressNumber,
} from "@/lib/location/address";
import { isUfCode, UF_OPTIONS } from "@/lib/location/constants";
import { loadGoogleMapsScript } from "@/lib/location/google-maps-loader";
import type { PlaceDetails, PlacePrediction } from "@/lib/location/types";

type Empreendimento = {
  id: string;
  slug_publico: string;
  nome: string;
  descricao?: string | null;
  resumo_curto?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
  status: string;
  cidade: string;
  estado: string;
  bairro?: string | null;
  bairro_comercial?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_json?: Record<string, unknown> | null;
  localizacao_contexto?: {
    perfil_regiao?: string[] | null;
    mobilidade?: string[] | null;
    comercio_servicos?: string[] | null;
    lazer_estilo_vida?: string[] | null;
    resumo_local?: string | null;
  } | null;
  construtora?: string | null;
  incorporadora?: string | null;
  administradora?: string | null;
  previsao_entrega_em?: string | null;
  ano_construcao?: number | null;
  n_torres?: number | null;
  n_andares?: number | null;
  n_unidades?: number | null;
  qtd_elevadores?: number | null;
  unidades_por_andar?: number | null;
  unidades_terreo?: number | null;
  unidades_cobertura?: number | null;
  estagio_obra?: string | null;
  obra_percentuais?: Record<string, unknown> | null;
  fase?: string | null;
  tipo_uso?: "RESIDENCIAL" | "COMERCIAL" | null;
  categoria_imovel?: string | null;
  categoria_residencial?: "APARTAMENTOS" | "CASAS" | "TERRENOS" | null;
  tipologias_residenciais?: string[] | null;
  categoria_comercial?: "ESCRITORIO_CONJUNTO" | "CASAS" | "TERRENOS" | "SHOPPING" | "LOGISTICO" | null;
  tipologias_comerciais?: string[] | null;
  tipos_cadastro?: Array<Record<string, unknown>> | null;
  caracteristicas?: string[] | null;
  caracteristica_ids?: string[] | null;
  created_at: string;
  updated_at: string;
};

type TipoCadastroItem = {
  id: string;
  nome: string;
  torre_nome: string;
  tipologia: string;
  area_privativa: string;
  dormitorios: string;
  suites: string;
  banheiros: string;
  vagas: string;
  qtd_unidades: string;
  plantas: TipoCadastroPlantaItem[];
};

type TipoCadastroPlantaItem = {
  id: string;
  midia_id: string;
  url: string;
  alt: string;
  legenda: string;
  ordem: number;
};

type ProfileData = {
  id: string;
  nickname: string | null;
};

type TipoCadastroCampoNumerico =
  | "area_privativa"
  | "dormitorios"
  | "suites"
  | "banheiros"
  | "vagas"
  | "qtd_unidades";

type MidiaItem = {
  relacao_id: string;
  midia_id: string;
  ordem?: number | null;
  tipo: "IMAGEM" | "VIDEO" | "PDF";
  url: string;
  storage_path?: string | null;
  tamanho_bytes?: number | null;
  titulo?: string | null;
  alt?: string | null;
  legenda?: string | null;
  caracteristica?: string | null;
};

type MidiaPublicaItem = {
  midia_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
  slug_publico: string;
  storage_bucket: string;
  storage_path: string;
};

type YoutubeVideoDraftItem = {
  id: string;
  midiaId: string;
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

type ImovelLite = {
  empreendimento_id?: string | null;
  status?: string;
};

type CaracteristicaCatalogoItem = {
  id: string;
  chave: string;
  label_pt: string;
  escopos: string[];
  tipos_uso: string[];
  categoria_empreendimento: string | null;
  subcategoria_imovel: string | null;
};

type EditBlock = {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
};

type EditFormState = {
  nome: string;
  descricao: string;
  resumo_curto: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  fase: "NA_PLANTA" | "EM_CONSTRUCAO" | "ENTREGUE";
  tipo_uso: "RESIDENCIAL" | "COMERCIAL";
  categoria_imovel: string;
  categoria_residencial: "APARTAMENTOS" | "CASAS" | "TERRENOS";
  tipologias_residenciais: string[];
  categoria_comercial: "ESCRITORIO_CONJUNTO" | "CASAS" | "TERRENOS" | "SHOPPING" | "LOGISTICO";
  tipologias_comerciais: string[];
  logradouro: string;
  numero: string;
  bairro: string;
  bairro_comercial: string;
  localizacao_perfil_regiao: string[];
  localizacao_mobilidade: string[];
  localizacao_comercio_servicos: string[];
  localizacao_lazer_estilo_vida: string[];
  localizacao_resumo_local: string;
  cidade: string;
  estado: string;
  cep: string;
  construtora: string;
  incorporadora: string;
  administradora: string;
  previsao_entrega_em: string;
  ano_construcao: string;
  n_torres: string;
  n_andares: string;
  n_unidades: string;
  qtd_elevadores: string;
  unidades_por_andar: string;
  unidades_terreo: string;
  unidades_cobertura: string;
};

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

const EDIT_BLOCKS: EditBlock[] = [
  { step: 1, title: "Dados do Empreendimento", description: "Status, classificação e estrutura", icon: Buildings },
  { step: 2, title: "Localização", description: "Mapa e endereço", icon: MapPinLine },
  { step: 5, title: "Características", description: "Diferenciais do condomínio", icon: ListChecks },
  { step: 6, title: "Imagens", description: "Galeria e SEO", icon: ImageSquare },
  { step: 7, title: "Vídeos", description: "YouTube e prioridade", icon: Megaphone },
  { step: 8, title: "Descrição e SEO", description: "Texto comercial, resumo e metadados", icon: Sparkle },
];
const GOOGLE_MAPS_PUBLIC_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
const MAX_DESCRICAO_EMPREENDIMENTO_CHARS = 1500;
const MAX_YOUTUBE_VIDEOS = 3;
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const SUPABASE_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
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
const AYKA_TOM_OPTIONS = ["Sofisticado", "Acolhedor", "Objetivo", "Inspiracional"] as const;
const AYKA_VOZ_OPTIONS = ["Consultiva", "Especialista local", "Institucional", "Comercial leve"] as const;
const AYKA_ESTILO_OPTIONS = [
  "Foco em benefícios",
  "Foco em diferenciais técnicos",
  "Foco em estilo de vida",
  "Foco em investimento",
] as const;
const AYKA_TOM_DESCRICOES: Record<(typeof AYKA_TOM_OPTIONS)[number], string> = {
  Sofisticado:
    "Linguagem elegante e refinada, com foco em exclusividade, acabamento e alto padrão.",
  Acolhedor:
    "Tom próximo e humano, valorizando conforto, convivência e bem-estar no dia a dia.",
  Objetivo:
    "Texto direto e claro, priorizando informação prática, atributos e decisão rápida.",
  Inspiracional:
    "Narrativa que desperta desejo e imaginação, conectando o imóvel ao estilo de vida.",
};
const AYKA_VOZ_DESCRICOES: Record<(typeof AYKA_VOZ_OPTIONS)[number], string> = {
  Consultiva:
    "Atua como um consultor de confiança, orientando o cliente com clareza e equilíbrio.",
  "Especialista local":
    "Reforça domínio da região, infraestrutura e contexto do bairro/cidade.",
  Institucional:
    "Comunicação formal e sólida, destacando credibilidade da marca e do empreendimento.",
  "Comercial leve":
    "Foco em conversão com naturalidade, sem pressão exagerada e com CTA sutil.",
};
const AYKA_ESTILO_DESCRICOES: Record<(typeof AYKA_ESTILO_OPTIONS)[number], string> = {
  "Foco em benefícios":
    "Prioriza vantagens práticas para o comprador: conforto, mobilidade, lazer e rotina.",
  "Foco em diferenciais técnicos":
    "Destaca especificações, estrutura, padrão construtivo e atributos objetivos do projeto.",
  "Foco em estilo de vida":
    "Mostra como é viver no empreendimento, com ênfase em experiência e contexto urbano.",
  "Foco em investimento":
    "Orienta a narrativa para valorização, liquidez, renda e potencial de retorno.",
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

type AykaPublicoSelecao = {
  categoria: string;
  subcategoria: string;
};

const CATEGORIAS_RESIDENCIAL = [
  { value: "APARTAMENTOS", label: "Apartamentos" },
  { value: "CASAS", label: "Casas" },
  { value: "TERRENOS", label: "Terrenos" },
] as const;

const TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA: Record<
  EditFormState["categoria_residencial"],
  ReadonlyArray<{ value: string; label: string }>
> = {
  APARTAMENTOS: [
    { value: "APARTAMENTO_PADRAO", label: "Padrão" },
    { value: "LOFT", label: "Loft" },
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
  { value: "TERRENOS", label: "Terrenos" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "LOGISTICO", label: "Logístico" },
] as const;

const TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA: Record<
  EditFormState["categoria_comercial"],
  ReadonlyArray<{ value: string; label: string }>
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
  TERRENOS: [{ value: "LOTE_TERRENO", label: "Lote / Terreno" }],
  SHOPPING: [{ value: "LOJA_BOX", label: "Loja / Box" }],
  LOGISTICO: [{ value: "GALPAO", label: "Galpão" }],
};

const TIPOLOGIA_RESIDENCIAL_LABEL = {
  APARTAMENTO_PADRAO: "Padrão",
  LOFT: "Loft",
  DUPLEX: "Duplex",
  TRIPLEX: "Triplex",
  COBERTURA: "Cobertura",
  GARDEN: "Garden",
  STUDIO: "Studio",
  CASA_PADRAO: "Padrão",
  SOBRADO: "Sobrado",
  LOTE_TERRENO: "Lote / Terreno",
  LOJA_BOX: "Loja / Box",
  GALPAO: "Galpão",
} as const;

const TIPOLOGIA_COMERCIAL_LABEL = {
  PADRAO: "Padrão",
  DUPLEX: "Duplex",
  TRIPLEX: "Triplex",
  COBERTURA: "Cobertura",
  LAJE_INTEIRA: "Laje inteira",
  MEIA_LAJE: "Meia laje",
  TERREO: "Térreo",
  CASA_PADRAO: "Padrão",
  SOBRADO: "Sobrado",
  LOTE_TERRENO: "Lote / Terreno",
  LOJA_BOX: "Loja / Box",
  GALPAO: "Galpão",
} as const;

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function sanitizeNumericTextInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

const TIPO_CADASTRO_CAMPOS_RESIDENCIAIS: readonly TipoCadastroCampoNumerico[] = [
  "area_privativa",
  "dormitorios",
  "suites",
  "banheiros",
  "vagas",
  "qtd_unidades",
];

const TIPO_CADASTRO_CAMPOS_COMERCIAIS: readonly TipoCadastroCampoNumerico[] = [
  "area_privativa",
  "banheiros",
  "vagas",
  "qtd_unidades",
];

const TIPO_CADASTRO_CAMPOS_TERRENO: readonly TipoCadastroCampoNumerico[] = [
  "area_privativa",
  "qtd_unidades",
];

const TIPO_CADASTRO_TODOS_CAMPOS: readonly TipoCadastroCampoNumerico[] = [
  "area_privativa",
  "dormitorios",
  "suites",
  "banheiros",
  "vagas",
  "qtd_unidades",
];

function getCamposPermitidosTipoCadastro(
  tipoUso: EditFormState["tipo_uso"],
  tipologia: string,
): ReadonlySet<TipoCadastroCampoNumerico> {
  if (tipologia === "LOTE_TERRENO") {
    return new Set(TIPO_CADASTRO_CAMPOS_TERRENO);
  }
  if (tipoUso === "COMERCIAL") {
    return new Set(TIPO_CADASTRO_CAMPOS_COMERCIAIS);
  }
  return new Set(TIPO_CADASTRO_CAMPOS_RESIDENCIAIS);
}

function normalizeTipoCadastroByCamposPermitidos(
  item: TipoCadastroItem,
  tipoUso: EditFormState["tipo_uso"],
): TipoCadastroItem {
  const allowedFields = getCamposPermitidosTipoCadastro(tipoUso, item.tipologia);
  let changed = false;
  const next = { ...item };
  for (const field of TIPO_CADASTRO_TODOS_CAMPOS) {
    if (!allowedFields.has(field) && next[field]) {
      next[field] = "";
      changed = true;
    }
  }
  return changed ? next : item;
}

function normalizeTiposCadastro(value: unknown): TipoCadastroItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
      nome: typeof item.nome === "string" ? item.nome : "",
      torre_nome: typeof item.torre_nome === "string" ? item.torre_nome : "",
      tipologia: typeof item.tipologia === "string" ? item.tipologia : "",
      area_privativa:
        item.area_privativa == null
          ? ""
          : typeof item.area_privativa === "number"
            ? String(item.area_privativa)
            : typeof item.area_privativa === "string"
              ? sanitizeNumericTextInput(item.area_privativa)
              : "",
      dormitorios:
        item.dormitorios == null
          ? ""
          : typeof item.dormitorios === "number"
            ? String(item.dormitorios)
            : typeof item.dormitorios === "string"
              ? sanitizeNumericTextInput(item.dormitorios)
              : "",
      suites:
        item.suites == null
          ? ""
          : typeof item.suites === "number"
            ? String(item.suites)
            : typeof item.suites === "string"
              ? sanitizeNumericTextInput(item.suites)
              : "",
      banheiros:
        item.banheiros == null
          ? ""
          : typeof item.banheiros === "number"
            ? String(item.banheiros)
            : typeof item.banheiros === "string"
              ? sanitizeNumericTextInput(item.banheiros)
              : "",
      vagas:
        item.vagas == null
          ? ""
          : typeof item.vagas === "number"
            ? String(item.vagas)
            : typeof item.vagas === "string"
              ? sanitizeNumericTextInput(item.vagas)
              : "",
      qtd_unidades:
        item.qtd_unidades == null
          ? ""
          : typeof item.qtd_unidades === "number"
            ? String(item.qtd_unidades)
            : typeof item.qtd_unidades === "string"
              ? sanitizeNumericTextInput(item.qtd_unidades)
              : "",
      plantas: Array.isArray(item.plantas)
        ? item.plantas
            .filter((planta): planta is Record<string, unknown> => Boolean(planta && typeof planta === "object"))
            .map((planta, index) => ({
              id:
                typeof planta.id === "string" && planta.id.trim().length > 0
                  ? planta.id.trim()
                  : crypto.randomUUID(),
              midia_id:
                typeof planta.midia_id === "string" && planta.midia_id.trim().length > 0
                  ? planta.midia_id.trim()
                  : "",
              url: typeof planta.url === "string" ? planta.url : "",
              alt: typeof planta.alt === "string" ? planta.alt : "",
              legenda: typeof planta.legenda === "string" ? planta.legenda : "",
              ordem:
                typeof planta.ordem === "number" && Number.isFinite(planta.ordem)
                  ? planta.ordem
                  : index,
            }))
            .filter((planta) => planta.midia_id.length > 0)
            .sort((a, b) => a.ordem - b.ordem)
            .slice(0, 3)
        : [],
    }))
    .filter((item) => item.nome.trim().length > 0 || item.tipologia.trim().length > 0);
}

function serializeTiposCadastro(items: TipoCadastroItem[]) {
  return items
    .map((item) => ({
      id: item.id,
      nome: item.nome.trim(),
      torre_nome: item.torre_nome.trim() || null,
      tipologia: item.tipologia.trim(),
      area_privativa: item.area_privativa ? Number(item.area_privativa) : null,
      dormitorios: item.dormitorios ? Number(item.dormitorios) : null,
      suites: item.suites ? Number(item.suites) : null,
      banheiros: item.banheiros ? Number(item.banheiros) : null,
      vagas: item.vagas ? Number(item.vagas) : null,
      qtd_unidades: item.qtd_unidades ? Number(item.qtd_unidades) : null,
      plantas: item.plantas
        .slice(0, 3)
        .map((planta, index) => ({
          midia_id: planta.midia_id,
          ordem: index,
          alt: planta.alt.trim() || null,
          legenda: planta.legenda.trim() || null,
        }))
        .filter((planta) => planta.midia_id.length > 0),
    }))
    .filter((item) => item.nome.length > 0 || item.tipologia.length > 0);
}

function buildAddress(item: Empreendimento) {
  const parts = [
    item.logradouro?.trim(),
    item.numero?.trim(),
    item.bairro?.trim(),
    item.cidade?.trim(),
    item.estado?.trim(),
  ].filter((part) => Boolean(part && part.length));

  if (parts.length === 0) return "Endereço não informado";
  const [logradouro, numero, bairro, cidade, estado] = parts;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const local = [bairro, [cidade, estado].filter(Boolean).join("/")].filter(Boolean).join(" - ");
  return [rua, local].filter(Boolean).join(" • ");
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getFileExtension(file: File) {
  const name = (file.name || "").toLowerCase();
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

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

function buildThumbUrl(url: string) {
  const normalized = (url ?? "").trim();
  if (!normalized) return "";
  if (!normalized.includes("/storage/v1/object/public/")) return normalized;
  const transformed = normalized.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  const separator = transformed.includes("?") ? "&" : "?";
  return `${transformed}${separator}width=480&height=360&quality=60&resize=cover`;
}

function buildStoragePublicObjectUrl(
  storageBucket: string | null | undefined,
  storagePath: string | null | undefined,
) {
  if (!SUPABASE_PUBLIC_BASE_URL) return null;

  const bucket = (storageBucket ?? "").trim();
  const path = (storagePath ?? "").trim().replace(/^\/+/, "");
  if (!bucket || !path) return null;

  const encodedPath = path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (!encodedPath) return null;
  return `${SUPABASE_PUBLIC_BASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
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
  return allowedExt.has(ext) || isHeicLikeFile(file);
}

function extractYouTubeVideoId(input: string) {
  const value = (input ?? "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
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

function sanitizeYearInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function clampPercent(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
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

function normalizeCategoriaResidencial(
  value: unknown,
): EditFormState["categoria_residencial"] {
  if (value === "CASAS") return "CASAS";
  if (value === "TERRENOS") return "TERRENOS";
  return "APARTAMENTOS";
}

function inferCategoriaResidencialFromLegacy(categoriaImovel: string | null | undefined) {
  if (categoriaImovel === "LOTE_TERRENO") return "TERRENOS" as const;
  if (categoriaImovel === "CASA" || categoriaImovel === "CASA_DE_CONDOMINIO" || categoriaImovel === "CASA_DE_VILA") {
    return "CASAS" as const;
  }
  return "APARTAMENTOS" as const;
}

function inferTipologiasResidenciaisFromLegacy(categoriaImovel: string | null | undefined) {
  if (categoriaImovel === "LOTE_TERRENO") return ["LOTE_TERRENO"];
  if (categoriaImovel === "LOFT") return ["LOFT"];
  if (categoriaImovel === "COBERTURA") return ["COBERTURA"];
  if (categoriaImovel === "STUDIO") return ["STUDIO"];
  if (categoriaImovel === "CASA" || categoriaImovel === "CASA_DE_CONDOMINIO" || categoriaImovel === "CASA_DE_VILA") {
    return ["CASA_PADRAO"];
  }
  return ["APARTAMENTO_PADRAO"];
}

function deriveLegacyCategoriaImovelFromForm(form: EditFormState) {
  if (form.tipo_uso === "COMERCIAL") {
    if (form.categoria_comercial === "SHOPPING") return "PONTO_COMERCIAL_LOJA_BOX";
    if (form.categoria_comercial === "LOGISTICO") return "GALPAO_DEPOSITO_ARMAZEM";
    if (form.categoria_comercial === "TERRENOS") return "LOTE_TERRENO";
    if (form.categoria_comercial === "CASAS") return "CASA_COMERCIAL";
    return "ESCRITORIO";
  }
  if (form.categoria_residencial === "TERRENOS") return "LOTE_TERRENO";
  if (form.categoria_residencial === "CASAS") return "CASA";
  if (form.tipologias_residenciais.includes("LOFT")) return "LOFT";
  if (form.tipologias_residenciais.includes("COBERTURA")) return "COBERTURA";
  if (form.tipologias_residenciais.includes("STUDIO")) return "STUDIO";
  return "APARTAMENTO";
}

function normalizeObraPercentuais(
  value: unknown,
): Record<ObraProgressKey, number> {
  if (!value || typeof value !== "object") return { ...OBRA_PROGRESS_DEFAULT };
  const source = value as Record<string, unknown>;
  const next = { ...OBRA_PROGRESS_DEFAULT };
  for (const key of Object.keys(OBRA_PROGRESS_DEFAULT) as ObraProgressKey[]) {
    next[key] = clampPercent(source[key]);
  }
  return next;
}

function buildCategoriaResumoFromForm(form: EditFormState) {
  if (form.tipo_uso === "COMERCIAL") {
    const categoria =
      CATEGORIAS_COMERCIAIS.find((item) => item.value === form.categoria_comercial)?.label ??
      "Comercial";
    const tipologias = form.tipologias_comerciais
      .map((tipologia) => TIPOLOGIA_COMERCIAL_LABEL[tipologia as keyof typeof TIPOLOGIA_COMERCIAL_LABEL] ?? tipologia)
      .join(", ");
    return `${categoria}${tipologias ? ` > ${tipologias}` : ""}`;
  }
  const categoria =
    CATEGORIAS_RESIDENCIAL.find((item) => item.value === form.categoria_residencial)?.label ??
    "Residencial";
  const tipologias = form.tipologias_residenciais
    .map((tipologia) => TIPOLOGIA_RESIDENCIAL_LABEL[tipologia as keyof typeof TIPOLOGIA_RESIDENCIAL_LABEL] ?? tipologia)
    .join(", ");
  return `${categoria}${tipologias ? ` > ${tipologias}` : ""}`;
}

function buildCategoriaResumoFromEmpreendimento(item: Empreendimento) {
  if (item.tipo_uso === "COMERCIAL") {
    const categoriaRaw = item.categoria_comercial ?? "ESCRITORIO_CONJUNTO";
    const categoria =
      CATEGORIAS_COMERCIAIS.find((entry) => entry.value === categoriaRaw)?.label ?? "Comercial";
    const tipologias = Array.isArray(item.tipologias_comerciais) ? item.tipologias_comerciais : [];
    const tipologiasLabel = tipologias
      .map((tipologia) => TIPOLOGIA_COMERCIAL_LABEL[tipologia as keyof typeof TIPOLOGIA_COMERCIAL_LABEL] ?? tipologia)
      .join(", ");
    return `${categoria}${tipologiasLabel ? ` > ${tipologiasLabel}` : ""}`;
  }
  const categoria = normalizeCategoriaResidencial(item.categoria_residencial);
  const categoriaLabel = CATEGORIAS_RESIDENCIAL.find((entry) => entry.value === categoria)?.label ?? "Residencial";
  const tipologias = Array.isArray(item.tipologias_residenciais) ? item.tipologias_residenciais : [];
  const tipologiasLabel = tipologias
    .map((tipologia) => TIPOLOGIA_RESIDENCIAL_LABEL[tipologia as keyof typeof TIPOLOGIA_RESIDENCIAL_LABEL] ?? tipologia)
    .join(", ");
  return `${categoriaLabel}${tipologiasLabel ? ` > ${tipologiasLabel}` : ""}`;
}

function normalizeFaseEmpreendimento(value: unknown): EditFormState["fase"] {
  if (value === "NA_PLANTA") return "NA_PLANTA";
  if (value === "EM_CONSTRUCAO" || value === "EM_OBRAS") return "EM_CONSTRUCAO";
  return "ENTREGUE";
}

function getFaseDisplayLabel(value: unknown) {
  const normalized = normalizeFaseEmpreendimento(value);
  if (normalized === "NA_PLANTA") return "Na planta";
  if (normalized === "EM_CONSTRUCAO") return "Em obras";
  return "Entregue";
}

function getTipoUsoDisplayLabel(value: unknown) {
  if (value === "RESIDENCIAL") return "Residencial";
  if (value === "COMERCIAL") return "Comercial";
  return "Não informado";
}

function getStatusEmpreendimentoDisplayLabel(value: unknown) {
  if (value === "RASCUNHO") return "Rascunho";
  if (value === "PAUSADO") return "Pausado";
  if (value === "INATIVO") return "Inativo";
  if (value === "PUBLICADO") return "Publicado";
  return "Não informado";
}

declare global {
  interface Window {
    google?: {
      maps?: {
        Map: new (
          element: HTMLElement,
          options: Record<string, unknown>,
        ) => {
          setCenter: (latLng: { lat: number; lng: number }) => void;
          setZoom: (zoom: number) => void;
        };
        Marker: new (options: Record<string, unknown>) => {
          setPosition: (position: { lat: number; lng: number }) => void;
          addListener: (eventName: string, handler: () => void) => void;
          getPosition: () => { lat: () => number; lng: () => number } | null;
        };
        event: {
          addListener: (
            instance: unknown,
            eventName: string,
            handler: () => void,
          ) => { remove: () => void };
        };
        marker?: {
          AdvancedMarkerElement: new (options: {
            map: unknown;
            position: { lat: number; lng: number };
            gmpDraggable?: boolean;
          }) => {
            position?:
              | { lat: number; lng: number }
              | { lat: () => number; lng: () => number }
              | null;
            setMap?: (map: unknown | null) => void;
          };
        };
      };
    };
  }
}

export default function EmpreendimentoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [item, setItem] = useState<Empreendimento | null>(null);
  const [media, setMedia] = useState<MidiaItem[]>([]);
  const [mediaPublica, setMediaPublica] = useState<MidiaPublicaItem[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imoveisDisponiveis, setImoveisDisponiveis] = useState(0);
  const [imoveisVinculadosCount, setImoveisVinculadosCount] = useState(0);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [profileNickname, setProfileNickname] = useState<string | null>(null);
  const [showHeaderActionsMenu, setShowHeaderActionsMenu] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showDeleteEmpreendimentoModal, setShowDeleteEmpreendimentoModal] = useState(false);
  const [deleteEmpreendimentoConfirmText, setDeleteEmpreendimentoConfirmText] = useState("");
  const [showPublicationChecklistModal, setShowPublicationChecklistModal] = useState(false);
  const [publicationChecklistIssues, setPublicationChecklistIssues] = useState<string[]>([]);
  const [saveNudgeActive, setSaveNudgeActive] = useState(false);
  const [checkingAykaCreditos, setCheckingAykaCreditos] = useState(false);
  const [gerandoDescricaoAyka, setGerandoDescricaoAyka] = useState(false);
  const [showAykaModal, setShowAykaModal] = useState(false);
  const [aykaModalStep, setAykaModalStep] = useState(1);
  const [aykaTom, setAykaTom] = useState<(typeof AYKA_TOM_OPTIONS)[number] | "">("");
  const [aykaVoz, setAykaVoz] = useState<(typeof AYKA_VOZ_OPTIONS)[number] | "">("");
  const [aykaEstilo, setAykaEstilo] = useState<(typeof AYKA_ESTILO_OPTIONS)[number] | "">("");
  const [aykaIncluirCta, setAykaIncluirCta] = useState(true);
  const [aykaPublicoCategoria, setAykaPublicoCategoria] = useState(
    AYKA_PUBLICOS[0]?.categoria ?? "",
  );
  const [aykaPublicosSelecionados, setAykaPublicosSelecionados] = useState<AykaPublicoSelecao[]>(
    [],
  );
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
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressComponents, setAddressComponents] = useState<unknown[]>([]);
  const [caracteristicaIds, setCaracteristicaIds] = useState<string[]>([]);
  const [tiposCadastro, setTiposCadastro] = useState<TipoCadastroItem[]>([]);
  const [uploadingTipoPlantasIds, setUploadingTipoPlantasIds] = useState<string[]>([]);
  const [collapsedTipoCadastroIds, setCollapsedTipoCadastroIds] = useState<string[]>([]);
  const [dropTargetTipoCadastroId, setDropTargetTipoCadastroId] = useState<string | null>(null);
  const [tipoPlantaDropTargetKey, setTipoPlantaDropTargetKey] = useState<string | null>(null);
  const [editingTipoPlanta, setEditingTipoPlanta] = useState<{ tipoId: string; plantaId: string } | null>(
    null,
  );
  const [pendingTipoDeleteId, setPendingTipoDeleteId] = useState<string | null>(null);
  const [obraPercentuais, setObraPercentuais] = useState<Record<ObraProgressKey, number>>(
    OBRA_PROGRESS_DEFAULT,
  );
  const [caracteristicasCatalogo, setCaracteristicasCatalogo] = useState<CaracteristicaCatalogoItem[]>([]);
  const [loadingCaracteristicas, setLoadingCaracteristicas] = useState(false);
  const [caracteristicaQuery, setCaracteristicaQuery] = useState("");
  const [blockTransitionPhase, setBlockTransitionPhase] = useState<
    "idle" | "leaving" | "pre-enter" | "entering"
  >("idle");
  const [switchingBlock, setSwitchingBlock] = useState(false);
  const blockTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockTransitionRafRef = useRef<number | null>(null);
  const [form, setForm] = useState<EditFormState>({
    nome: "",
    descricao: "",
    resumo_curto: "",
    meta_title: "",
    meta_description: "",
    keywords: "",
    fase: "ENTREGUE",
    tipo_uso: "RESIDENCIAL",
    categoria_imovel: "ESCRITORIO",
    categoria_residencial: "APARTAMENTOS",
    tipologias_residenciais: ["APARTAMENTO_PADRAO"],
    categoria_comercial: "ESCRITORIO_CONJUNTO",
    tipologias_comerciais: ["PADRAO"],
    logradouro: "",
    numero: "",
    bairro: "",
    bairro_comercial: "",
    localizacao_perfil_regiao: [],
    localizacao_mobilidade: [],
    localizacao_comercio_servicos: [],
    localizacao_lazer_estilo_vida: [],
    localizacao_resumo_local: "",
    cidade: "",
    estado: "",
    cep: "",
    construtora: "",
    incorporadora: "",
    administradora: "",
    previsao_entrega_em: "",
    ano_construcao: "",
    n_torres: "",
    n_andares: "",
    n_unidades: "",
    qtd_elevadores: "",
    unidades_por_andar: "",
    unidades_terreo: "",
    unidades_cobertura: "",
  });
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const rejectedPreviewUrlsRef = useRef<Set<string>>(new Set());
  const thumbPreviewUrlsRef = useRef<Set<string>>(new Set());
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapHostElementRef = useRef<HTMLDivElement | null>(null);
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
  const descricaoEditorRef = useRef<HTMLDivElement | null>(null);
  const bypassUnsavedGuardRef = useRef(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const [showUnsavedLeaveModal, setShowUnsavedLeaveModal] = useState(false);
  const [requiredFieldModalMessage, setRequiredFieldModalMessage] = useState<string | null>(null);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [empreendimentoResult, mediaResult, imoveisResult, profileResult] = await Promise.all([
        apiFetchWithAuth<Empreendimento>(`/api/empreendimentos/${id}`),
        apiFetchWithAuth<MidiaItem[]>(`/api/empreendimentos/${id}/midia`),
        apiFetchWithAuth<ImovelLite[]>("/api/imoveis"),
        apiFetchWithAuth<ProfileData>("/api/profile"),
      ]);

      if (!empreendimentoResult.ok) {
        setError(empreendimentoResult.error);
      } else {
        if (empreendimentoResult.data.status === "RASCUNHO") {
          window.location.href = `/empreendimentos/novo?empreendimento=${empreendimentoResult.data.id}`;
          return;
        }

        const loadedTipoUso =
          (empreendimentoResult.data.tipo_uso as EditFormState["tipo_uso"]) ?? "RESIDENCIAL";
        const loadedCategoriaRaw = empreendimentoResult.data.categoria_imovel ?? "";
        const loadedCategoriaComercial =
          empreendimentoResult.data.categoria_comercial != null
            ? (empreendimentoResult.data.categoria_comercial as EditFormState["categoria_comercial"])
            : loadedCategoriaRaw === "CASA_COMERCIAL"
              ? "CASAS"
              : loadedCategoriaRaw === "PONTO_COMERCIAL_LOJA_BOX"
                ? "SHOPPING"
                : loadedCategoriaRaw === "GALPAO_DEPOSITO_ARMAZEM"
                  ? "LOGISTICO"
              : loadedCategoriaRaw === "LOTE_TERRENO"
                ? "TERRENOS"
              : "ESCRITORIO_CONJUNTO";
        const allowedTipologiasComerciais = new Set(
          (TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[loadedCategoriaComercial] ?? []).map((item) => item.value),
        );
        const loadedTipologiasComerciaisRaw = Array.isArray(empreendimentoResult.data.tipologias_comerciais)
          ? empreendimentoResult.data.tipologias_comerciais
          : ["PADRAO"];
        const loadedTipologiasComerciais = loadedTipologiasComerciaisRaw.filter((tipologia) =>
          allowedTipologiasComerciais.has(tipologia),
        );
        const loadedCategoriaResidencial =
          empreendimentoResult.data.categoria_residencial != null
            ? normalizeCategoriaResidencial(empreendimentoResult.data.categoria_residencial)
            : inferCategoriaResidencialFromLegacy(loadedCategoriaRaw);
        const allowedTipologias = new Set(
          (TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[loadedCategoriaResidencial] ?? []).map((item) => item.value),
        );
        const loadedTipologiasRaw = Array.isArray(empreendimentoResult.data.tipologias_residenciais)
          ? empreendimentoResult.data.tipologias_residenciais
          : inferTipologiasResidenciaisFromLegacy(loadedCategoriaRaw);
        const loadedTipologias = loadedTipologiasRaw.filter((tipologia) =>
          allowedTipologias.has(tipologia),
        );
        const localizacaoContexto =
          empreendimentoResult.data.localizacao_contexto &&
          typeof empreendimentoResult.data.localizacao_contexto === "object" &&
          !Array.isArray(empreendimentoResult.data.localizacao_contexto)
            ? (empreendimentoResult.data.localizacao_contexto as Record<string, unknown>)
            : {};
        setItem(empreendimentoResult.data);
        const loadedForm = {
          nome: empreendimentoResult.data.nome ?? "",
          descricao: empreendimentoResult.data.descricao ?? "",
          resumo_curto: empreendimentoResult.data.resumo_curto ?? "",
          meta_title: empreendimentoResult.data.meta_title ?? "",
          meta_description: empreendimentoResult.data.meta_description ?? "",
          keywords: Array.isArray(empreendimentoResult.data.keywords)
            ? empreendimentoResult.data.keywords.join(", ")
            : "",
          fase: normalizeFaseEmpreendimento(empreendimentoResult.data.fase),
          tipo_uso: loadedTipoUso,
          categoria_imovel: loadedCategoriaComercial,
          categoria_residencial: loadedCategoriaResidencial,
          tipologias_residenciais:
            loadedTipologias.length > 0
              ? loadedTipologias
              : [TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[loadedCategoriaResidencial]?.[0]?.value ?? "APARTAMENTO_PADRAO"],
          categoria_comercial: loadedCategoriaComercial,
          tipologias_comerciais:
            loadedTipologiasComerciais.length > 0
              ? loadedTipologiasComerciais
              : [TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[loadedCategoriaComercial]?.[0]?.value ?? "PADRAO"],
          logradouro: empreendimentoResult.data.logradouro ?? "",
          numero: empreendimentoResult.data.numero ?? "",
          bairro: empreendimentoResult.data.bairro ?? "",
          bairro_comercial: empreendimentoResult.data.bairro_comercial ?? "",
          localizacao_perfil_regiao: normalizeLocalizacaoArray(
            localizacaoContexto.perfil_regiao,
            LOCALIZACAO_PERFIL_REGIAO_OPTIONS,
          ),
          localizacao_mobilidade: normalizeLocalizacaoArray(
            localizacaoContexto.mobilidade,
            LOCALIZACAO_MOBILIDADE_OPTIONS,
          ),
          localizacao_comercio_servicos: normalizeLocalizacaoArray(
            localizacaoContexto.comercio_servicos,
            LOCALIZACAO_COMERCIO_SERVICOS_OPTIONS,
          ),
          localizacao_lazer_estilo_vida: normalizeLocalizacaoArray(
            localizacaoContexto.lazer_estilo_vida,
            LOCALIZACAO_LAZER_ESTILO_OPTIONS,
          ),
          localizacao_resumo_local: normalizeLocalizacaoResumo(localizacaoContexto.resumo_local),
          cidade: empreendimentoResult.data.cidade ?? "",
          estado: empreendimentoResult.data.estado ?? "",
          cep: empreendimentoResult.data.cep ?? "",
          construtora: empreendimentoResult.data.construtora ?? "",
          incorporadora: empreendimentoResult.data.incorporadora ?? "",
          administradora: empreendimentoResult.data.administradora ?? "",
          previsao_entrega_em: empreendimentoResult.data.previsao_entrega_em
            ? String(empreendimentoResult.data.previsao_entrega_em).slice(0, 10)
            : "",
          ano_construcao:
            empreendimentoResult.data.ano_construcao != null
              ? String(empreendimentoResult.data.ano_construcao)
              : "",
          n_torres: empreendimentoResult.data.n_torres != null ? String(empreendimentoResult.data.n_torres) : "",
          n_andares:
            empreendimentoResult.data.n_andares != null ? String(empreendimentoResult.data.n_andares) : "",
          n_unidades:
            empreendimentoResult.data.n_unidades != null ? String(empreendimentoResult.data.n_unidades) : "",
          qtd_elevadores:
            empreendimentoResult.data.qtd_elevadores != null
              ? String(empreendimentoResult.data.qtd_elevadores)
              : "",
          unidades_por_andar:
            empreendimentoResult.data.unidades_por_andar != null
              ? String(empreendimentoResult.data.unidades_por_andar)
              : "",
          unidades_terreo:
            empreendimentoResult.data.unidades_terreo != null
              ? String(empreendimentoResult.data.unidades_terreo)
              : "",
          unidades_cobertura:
            empreendimentoResult.data.unidades_cobertura != null
              ? String(empreendimentoResult.data.unidades_cobertura)
              : "",
        };
        const loadedSearchAddress = formatAddressFromFields({
          logradouro: empreendimentoResult.data.logradouro ?? "",
          numero: empreendimentoResult.data.numero ?? "",
          bairro: empreendimentoResult.data.bairro ?? "",
          cidade: empreendimentoResult.data.cidade ?? "",
          estado: empreendimentoResult.data.estado ?? "",
        });
        const loadedPlaceId = String(empreendimentoResult.data.address_json?.place_id ?? "");
        const loadedPlaceName = String(empreendimentoResult.data.address_json?.place_name ?? "");
        const loadedEnderecoFormatado = String(
          empreendimentoResult.data.address_json?.formatted_address ?? loadedSearchAddress,
        );
        const loadedLat =
          typeof empreendimentoResult.data.lat === "number" ? empreendimentoResult.data.lat : null;
        const loadedLng =
          typeof empreendimentoResult.data.lng === "number" ? empreendimentoResult.data.lng : null;
        const loadedAddressComponents = Array.isArray(empreendimentoResult.data.address_json?.address_components)
          ? (empreendimentoResult.data.address_json?.address_components as unknown[])
          : [];
        const loadedCaracteristicaIds = Array.isArray(empreendimentoResult.data.caracteristica_ids)
          ? empreendimentoResult.data.caracteristica_ids
          : [];
        const loadedTiposCadastro = normalizeTiposCadastro(empreendimentoResult.data.tipos_cadastro);
        const loadedObraPercentuais = normalizeObraPercentuais(
          empreendimentoResult.data.obra_percentuais,
        );

        setForm(loadedForm);
        setSearchAddress(loadedSearchAddress);
        setPlaceId(loadedPlaceId);
        setSelectedPlaceName(loadedPlaceName);
        setEnderecoFormatado(loadedEnderecoFormatado);
        setLat(loadedLat);
        setLng(loadedLng);
        setAddressComponents(loadedAddressComponents);
        setCaracteristicaIds(loadedCaracteristicaIds);
        setTiposCadastro(loadedTiposCadastro);
        setObraPercentuais(loadedObraPercentuais);
        setInitialSnapshot(
          JSON.stringify({
            ...loadedForm,
            lat: loadedLat,
            lng: loadedLng,
            placeId: loadedPlaceId,
            selectedPlaceName: loadedPlaceName,
            enderecoFormatado: loadedEnderecoFormatado,
            addressComponents: loadedAddressComponents,
            caracteristicaIds: [...loadedCaracteristicaIds].sort(),
            tiposCadastro: serializeTiposCadastro(loadedTiposCadastro),
            obraPercentuais: loadedObraPercentuais,
          }),
        );
      }

      if (mediaResult.ok) {
        setMedia(mediaResult.data);
      }

      if (imoveisResult.ok) {
        const vinculados = imoveisResult.data.filter(
          (imovel) => normalizeText(imovel.empreendimento_id) === normalizeText(id),
        ).length;
        setImoveisVinculadosCount(vinculados);

        const total = imoveisResult.data.filter(
          (imovel) =>
            normalizeText(imovel.empreendimento_id) === normalizeText(id) &&
            imovel.status === "PUBLICADO",
        ).length;
        setImoveisDisponiveis(total);
      }

      if (profileResult.ok) {
        setProfileNickname(profileResult.data.nickname ?? null);
      }

      setLoading(false);
    }

    if (id) void load();
  }, [id, router]);

  useEffect(() => {
    async function loadMidiaPublicaHeader() {
      if (!id || item?.status !== "PUBLICADO") {
        setMediaPublica([]);
        return;
      }

      const listResult = await apiFetchWithAuth<MidiaPublicaItem[]>(
        `/api/empreendimentos/${id}/midia-publica`,
      );
      if (!listResult.ok) {
        setMediaPublica([]);
        return;
      }

      let nextData = listResult.data;
      if (nextData.length === 0) {
        const syncResult = await apiFetchWithAuth<MidiaPublicaItem[]>(
          `/api/empreendimentos/${id}/midia-publica`,
          { method: "POST" },
        );
        if (syncResult.ok) {
          nextData = syncResult.data;
        }
      }

      setMediaPublica(nextData);
    }

    void loadMidiaPublicaHeader();
  }, [id, item?.status, item?.slug_publico]);

  const readOnlyAddressByPlace = Boolean(placeId);
  const hasLinkedImoveis = imoveisVinculadosCount > 0;

  const photos = useMemo(() => media.filter((m) => m.tipo === "IMAGEM"), [media]);
  const videos = useMemo(() => media.filter((m) => m.tipo === "VIDEO"), [media]);
  const publicPhotoUrls = useMemo(() => {
    return mediaPublica
      .map((photo) => {
        const canonicalStorageUrl = buildStoragePublicObjectUrl(
          photo.storage_bucket,
          photo.storage_path,
        );
        const rawUrl = typeof photo.url === "string" ? photo.url.trim() : "";
        return canonicalStorageUrl || rawUrl;
      })
      .filter((url) => url.length > 0);
  }, [mediaPublica]);
  const headerPhotoUrls = useMemo(() => {
    if (item?.status === "PUBLICADO" && publicPhotoUrls.length > 0) {
      return publicPhotoUrls;
    }
    return photos
      .map((photo) => (typeof photo.url === "string" ? photo.url.trim() : ""))
      .filter((url) => url.length > 0);
  }, [item?.status, photos, publicPhotoUrls]);
  const gridImages = useMemo(() => headerPhotoUrls.slice(0, 6), [headerPhotoUrls]);
  const extraImages = Math.max(0, headerPhotoUrls.length - 6);

  function openImageLightbox(index: number) {
    if (headerPhotoUrls.length === 0) return;
    const normalized = Math.max(0, Math.min(index, headerPhotoUrls.length - 1));
    setLightboxImageIndex(normalized);
    setShowImageLightbox(true);
  }

  function closeImageLightbox() {
    setShowImageLightbox(false);
  }

  function goToPreviousLightboxImage() {
    if (headerPhotoUrls.length === 0) return;
    setLightboxImageIndex((current) => (current - 1 + headerPhotoUrls.length) % headerPhotoUrls.length);
  }

  function goToNextLightboxImage() {
    if (headerPhotoUrls.length === 0) return;
    setLightboxImageIndex((current) => (current + 1) % headerPhotoUrls.length);
  }

  useEffect(() => {
    setImagemItems(
      photos.map((item, index) => {
        const fileName =
          item.storage_path?.split("/").pop() ||
          item.titulo?.trim() ||
          `imagem-${index + 1}.jpg`;
        return {
          id: item.midia_id,
          midiaId: item.midia_id,
          fileName,
          sizeBytes: item.tamanho_bytes ?? 0,
          previewUrl: item.url,
          thumbUrl: null,
          isHeic: fileName.toLowerCase().endsWith(".heic") || fileName.toLowerCase().endsWith(".heif"),
          alt: item.alt?.trim() ?? "",
          legenda: item.legenda?.trim() ?? "",
          caracteristica: item.caracteristica?.trim() ?? "",
        };
      }),
    );
    setYoutubeVideos(
      videos
        .map((item) => {
          const videoId = extractYouTubeVideoId(item.url);
          if (!videoId) return null;
          return {
            id: item.midia_id,
            midiaId: item.midia_id,
            url: item.url,
            videoId,
            title: item.titulo?.trim() || null,
          };
        })
        .filter((item): item is YoutubeVideoDraftItem => item !== null),
    );
  }, [photos, videos]);

  useEffect(() => {
    if (!showImageLightbox) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowImageLightbox(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (headerPhotoUrls.length > 0) {
          setLightboxImageIndex((current) => (current - 1 + headerPhotoUrls.length) % headerPhotoUrls.length);
        }
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (headerPhotoUrls.length > 0) {
          setLightboxImageIndex((current) => (current + 1) % headerPhotoUrls.length);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showImageLightbox, headerPhotoUrls.length]);

  useEffect(() => {
    if (!showImageLightbox) return;
    if (headerPhotoUrls.length === 0) {
      setShowImageLightbox(false);
      return;
    }
    if (lightboxImageIndex > headerPhotoUrls.length - 1) {
      setLightboxImageIndex(headerPhotoUrls.length - 1);
    }
  }, [headerPhotoUrls.length, showImageLightbox, lightboxImageIndex]);
  const caracteristicasCount = useMemo(() => {
    if (Array.isArray(item?.caracteristica_ids)) return item.caracteristica_ids.length;
    if (Array.isArray(item?.caracteristicas)) return item.caracteristicas.length;
    return 0;
  }, [item]);
  const filteredCaracteristicas = useMemo(() => {
    const query = normalizeText(caracteristicaQuery);
    const base = !query
      ? caracteristicasCatalogo
      : caracteristicasCatalogo.filter(
          (entry) =>
            normalizeText(entry.label_pt).includes(query) || normalizeText(entry.chave).includes(query),
        );
    return [...base].sort((a, b) => a.label_pt.localeCompare(b.label_pt, "pt-BR"));
  }, [caracteristicasCatalogo, caracteristicaQuery]);
  const tipologiasResidenciaisByCategoria = useMemo(
    () => TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[form.categoria_residencial] ?? [],
    [form.categoria_residencial],
  );
  const tipologiasComerciaisByCategoria = useMemo(
    () => TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[form.categoria_comercial] ?? [],
    [form.categoria_comercial],
  );
  const tipologiasSelecionadasCadastro = useMemo(() => {
    if (form.tipo_uso === "COMERCIAL") {
      return form.tipologias_comerciais.map((value) => ({
        value,
        label: TIPOLOGIA_COMERCIAL_LABEL[value as keyof typeof TIPOLOGIA_COMERCIAL_LABEL] ?? value,
      }));
    }
    return form.tipologias_residenciais.map((value) => ({
      value,
      label: TIPOLOGIA_RESIDENCIAL_LABEL[value as keyof typeof TIPOLOGIA_RESIDENCIAL_LABEL] ?? value,
    }));
  }, [form.tipo_uso, form.tipologias_comerciais, form.tipologias_residenciais]);
  const hasMultipleTorres = useMemo(() => {
    const total = Number(form.n_torres);
    return Number.isFinite(total) && total > 1;
  }, [form.n_torres]);

  useEffect(() => {
    if (tipologiasSelecionadasCadastro.length === 0) return;
    const allowed = new Set(tipologiasSelecionadasCadastro.map((item) => item.value));
    const fallback = tipologiasSelecionadasCadastro[0]?.value ?? "";
    setTiposCadastro((current) =>
      current.map((item) =>
        normalizeTipoCadastroByCamposPermitidos(
          item.tipologia && allowed.has(item.tipologia)
            ? item
            : { ...item, tipologia: fallback },
          form.tipo_uso,
        ),
      ),
    );
  }, [tipologiasSelecionadasCadastro, form.tipo_uso]);

  useEffect(() => {
    setTiposCadastro((current) => {
      let changed = false;
      const next = current.map((item) => {
        const normalized = normalizeTipoCadastroByCamposPermitidos(item, form.tipo_uso);
        if (normalized !== item) changed = true;
        return normalized;
      });
      return changed ? next : current;
    });
  }, [form.tipo_uso]);

  useEffect(() => {
    if (hasMultipleTorres) return;
    setTiposCadastro((current) =>
      current.map((item) => (item.torre_nome ? { ...item, torre_nome: "" } : item)),
    );
  }, [hasMultipleTorres]);
  const isEstruturaVerticalEnabled = useMemo(
    () =>
      (form.tipo_uso === "RESIDENCIAL" && form.categoria_residencial === "APARTAMENTOS") ||
      (form.tipo_uso === "COMERCIAL" && form.categoria_comercial === "ESCRITORIO_CONJUNTO"),
    [form.tipo_uso, form.categoria_residencial, form.categoria_comercial],
  );
  const showOnlyUnidades = useMemo(
    () => {
      if (form.tipo_uso === "RESIDENCIAL") {
        return form.categoria_residencial === "CASAS" || form.categoria_residencial === "TERRENOS";
      }
      return (
        form.categoria_comercial === "CASAS" ||
        form.categoria_comercial === "TERRENOS" ||
        form.categoria_comercial === "SHOPPING" ||
        form.categoria_comercial === "LOGISTICO"
      );
    },
    [form.tipo_uso, form.categoria_residencial, form.categoria_comercial],
  );
  const sugestaoUnidadesBase = useMemo(() => {
    const torres = Number(form.n_torres);
    const andares = Number(form.n_andares);
    const porAndar = Number(form.unidades_por_andar);
    const terreo = Number(form.unidades_terreo);
    if (
      !Number.isFinite(torres) ||
      !Number.isFinite(andares) ||
      !Number.isFinite(porAndar) ||
      !Number.isFinite(terreo)
    ) return null;
    if (
      form.n_torres.trim() === "" ||
      form.n_andares.trim() === "" ||
      form.unidades_por_andar.trim() === "" ||
      form.unidades_terreo.trim() === ""
    ) {
      return null;
    }
    return torres * andares * porAndar + terreo;
  }, [form.n_torres, form.n_andares, form.unidades_por_andar, form.unidades_terreo]);
  const sugestaoUnidadesComCobertura = useMemo(() => {
    if (sugestaoUnidadesBase == null) return null;
    if (form.unidades_cobertura.trim() === "") return null;
    const cobertura = Number(form.unidades_cobertura);
    if (!Number.isFinite(cobertura)) return null;
    return sugestaoUnidadesBase + cobertura;
  }, [sugestaoUnidadesBase, form.unidades_cobertura]);
  const categoriaResumo = useMemo(() => buildCategoriaResumoFromForm(form), [form]);
  const previsaoAnos = useMemo(
    () => Array.from({ length: 7 }, (_, index) => String(CURRENT_YEAR + index)),
    [],
  );
  const previsaoAnoDraft = useMemo(() => {
    const value = (form.previsao_entrega_em ?? "").trim();
    if (!value) return "";
    const [year] = value.split("-");
    return year && /^\d{4}$/.test(year) ? year : "";
  }, [form.previsao_entrega_em]);
  const previsaoMesDraft = useMemo(() => {
    const value = (form.previsao_entrega_em ?? "").trim();
    if (!value) return "";
    const [, month] = value.split("-");
    return month && /^\d{2}$/.test(month) ? month : "";
  }, [form.previsao_entrega_em]);
  const estagioObra = useMemo<EstagioObra>(() => {
    let current: Exclude<EstagioObra, ""> | "" = "";
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
  const updatePrevisaoEntrega = useCallback((nextYear: string, nextMonth: string) => {
    const year = nextYear.trim();
    const month = nextMonth.trim();
    if (!year || !month) {
      setForm((current) => ({ ...current, previsao_entrega_em: "" }));
      return;
    }
    setForm((current) => ({
      ...current,
      previsao_entrega_em: `${year}-${month}-01`,
    }));
  }, []);
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        ...form,
        lat,
        lng,
        placeId,
        selectedPlaceName,
        enderecoFormatado,
        addressComponents,
        caracteristicaIds: [...caracteristicaIds].sort(),
        tiposCadastro: serializeTiposCadastro(tiposCadastro),
        obraPercentuais,
      }),
    [
      form,
      lat,
      lng,
      placeId,
      selectedPlaceName,
      enderecoFormatado,
      addressComponents,
      caracteristicaIds,
      tiposCadastro,
      obraPercentuais,
    ],
  );
  const hasPendingChanges = Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot;
  const faseInicial = useMemo(() => normalizeFaseEmpreendimento(item?.fase), [item?.fase]);
  const fasesPermitidas = useMemo<EditFormState["fase"][]>(() => {
    if (faseInicial === "ENTREGUE") return ["ENTREGUE"];
    if (faseInicial === "EM_CONSTRUCAO") return ["EM_CONSTRUCAO", "ENTREGUE"];
    return ["NA_PLANTA", "EM_CONSTRUCAO", "ENTREGUE"];
  }, [faseInicial]);
  const aykaSubcategoriasDaCategoria = useMemo(
    () => AYKA_PUBLICOS.find((item) => item.categoria === aykaPublicoCategoria)?.subcategorias ?? [],
    [aykaPublicoCategoria],
  );

  useEffect(() => {
    if (!hasPendingChanges) {
      setSaveNudgeActive(false);
      return;
    }
    const intervalId = window.setInterval(() => {
      setSaveNudgeActive(true);
      window.setTimeout(() => setSaveNudgeActive(false), 1800);
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [hasPendingChanges]);

  useEffect(() => {
    return () => {
      if (blockTransitionTimeoutRef.current) {
        clearTimeout(blockTransitionTimeoutRef.current);
        blockTransitionTimeoutRef.current = null;
      }
      if (blockTransitionRafRef.current !== null) {
        cancelAnimationFrame(blockTransitionRafRef.current);
        blockTransitionRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!gerandoDescricaoAyka) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [gerandoDescricaoAyka]);

  useEffect(() => {
    const previews = rejectedPreviewUrlsRef.current;
    const thumbs = thumbPreviewUrlsRef.current;
    return () => {
      for (const url of previews) URL.revokeObjectURL(url);
      previews.clear();
      for (const url of thumbs) URL.revokeObjectURL(url);
      thumbs.clear();
    };
  }, []);

  useEffect(() => {
    if (isEstruturaVerticalEnabled) return;
    setForm((current) => ({
      ...current,
      qtd_elevadores: "",
      unidades_por_andar: "",
      unidades_terreo: "",
      unidades_cobertura: "",
    }));
  }, [isEstruturaVerticalEnabled]);

  useEffect(() => {
    if (!showOnlyUnidades) return;
    setForm((current) => ({
      ...current,
      n_torres: "",
      n_andares: "",
    }));
  }, [showOnlyUnidades]);

  useEffect(() => {
    setCollapsedTipoCadastroIds((current) =>
      current.filter((tipoId) => tiposCadastro.some((item) => item.id === tipoId)),
    );
  }, [tiposCadastro]);

  useEffect(() => {
    if (!hasPendingChanges) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onDocumentClick(event: MouseEvent) {
      if (!hasPendingChanges || bypassUnsavedGuardRef.current) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr) return;
      if (hrefAttr.startsWith("#")) return;

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

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [hasPendingChanges]);

  useEffect(() => {
    function handleDocumentPointerDown(event: MouseEvent) {
      if (!showHeaderActionsMenu) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const menuContainer = target.closest("[data-empreendimento-header-actions]");
      if (!menuContainer) {
        setShowHeaderActionsMenu(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, [showHeaderActionsMenu]);

  useEffect(() => {
    if (activeBlock !== 5) return;
    let cancelled = false;
    void apiFetchWithAuth<CaracteristicaCatalogoItem[]>(
      `/api/caracteristicas/catalogo?escopo=EMPREENDIMENTO&tipo_uso=${encodeURIComponent(form.tipo_uso)}`,
    ).then((result) => {
      if (cancelled) return;
      setLoadingCaracteristicas(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCaracteristicasCatalogo(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [activeBlock, form.tipo_uso]);

  useEffect(() => {
    if (!descricaoEditorRef.current) return;
    if (descricaoEditorRef.current.innerHTML !== (form.descricao || "")) {
      descricaoEditorRef.current.innerHTML = form.descricao || "";
    }
  }, [form.descricao, activeBlock]);

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
    setForm((current) => ({ ...current, descricao: descricaoEditorRef.current?.innerHTML ?? "" }));
  }

  async function refreshMedia() {
    const result = await apiFetchWithAuth<MidiaItem[]>(`/api/empreendimentos/${id}/midia`);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setMedia(result.data);
    if (item?.status === "PUBLICADO") {
      const listResult = await apiFetchWithAuth<MidiaPublicaItem[]>(
        `/api/empreendimentos/${id}/midia-publica`,
      );
      if (listResult.ok) {
        setMediaPublica(listResult.data);
      }
    }
    return true;
  }

  async function persistMediaOrder(nextImages = imagemItems, nextVideos = youtubeVideos) {
    const orderedMidiaIds = [...nextImages, ...nextVideos].map((item) => item.midiaId);
    if (orderedMidiaIds.length === 0) return true;
    const result = await apiFetchWithAuth<{ total: number }>(`/api/empreendimentos/${id}/midia`, {
      method: "PATCH",
      body: JSON.stringify({ orderedMidiaIds }),
    });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }

  async function persistImageMetadata(image: ImageDraftItem) {
    const result = await apiFetchWithAuth<{ id: string }>(
      `/api/empreendimentos/${id}/midia/${image.midiaId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          alt: image.alt,
          legenda: image.legenda,
          caracteristica: image.caracteristica || null,
        }),
      },
    );
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }

  async function appendImagemFiles(files: File[]) {
    if (files.length === 0) return;
    const approved: File[] = [];
    const rejected: RejectedImageDraftItem[] = [];

    for (const file of files) {
      const reasons: RejectedImageReason[] = [];
      const isHeic = isHeicLikeFile(file);

      if (!isSupportedImageUpload(file)) reasons.push("FORMATO_INVALIDO");
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) reasons.push("ACIMA_15MB");

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
        if (previewUrl) rejectedPreviewUrlsRef.current.add(previewUrl);
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

    if (approved.length === 0) return;

    setUploadingTempImages(true);
    setUploadingTempImagesPercent(0);
    const total = approved.length;

    for (let index = 0; index < approved.length; index += 1) {
      const file = approved[index];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ordem", String(imagemItems.length + index));
      const result = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${id}/midia`, {
        method: "POST",
        body: formData,
      });
      setUploadingTempImagesPercent(Math.round(((index + 1) / total) * 100));
      if (!result.ok) {
        setError(result.error);
      }
    }

    setUploadingTempImages(false);
    setUploadingTempImagesPercent(null);
    await refreshMedia();
  }

  async function removeImageById(imageId: string) {
    const target = imagemItems.find((item) => item.id === imageId);
    if (!target || deletingImageIds.includes(imageId)) return;
    setImagemItems((current) => current.filter((item) => item.id !== imageId));
    setRejectedImagemItems((current) => current.filter((item) => item.id !== imageId));
    if (editingImageId === imageId) setEditingImageId(null);
    setDeletingImageIds((current) => [...current, imageId]);
    void apiFetchWithAuth<{ id: string }>(
      `/api/empreendimentos/${id}/midia/${target.midiaId}`,
      { method: "DELETE" },
    ).then((result) => {
      setDeletingImageIds((current) => current.filter((item) => item !== imageId));
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  function applyImageOrder(imageId: string, desiredOrderInput: string) {
    const desiredIndex = Number(desiredOrderInput) - 1;
    if (!Number.isInteger(desiredIndex)) return;

    const fromIndex = imagemItems.findIndex((item) => item.id === imageId);
    if (fromIndex < 0) return;
    const boundedTarget = Math.max(0, Math.min(imagemItems.length - 1, desiredIndex));
    if (boundedTarget === fromIndex) return;
    const next = [...imagemItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(boundedTarget, 0, moved);
    setImagemItems(next);
    void persistMediaOrder(next, youtubeVideos).then(() => void refreshMedia());
  }

  function moveImageToTarget(dragImageId: string, targetImageId: string) {
    if (dragImageId === targetImageId) return;
    const fromIndex = imagemItems.findIndex((item) => item.id === dragImageId);
    const toIndex = imagemItems.findIndex((item) => item.id === targetImageId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...imagemItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setImagemItems(next);
    void persistMediaOrder(next, youtubeVideos).then(() => void refreshMedia());
  }

  async function removeYoutubeById(videoId: string) {
    const target = youtubeVideos.find((item) => item.id === videoId);
    if (!target) return;
    setYoutubeVideos((current) => current.filter((item) => item.id !== videoId));
    void apiFetchWithAuth<{ id: string }>(
      `/api/empreendimentos/${id}/midia/${target.midiaId}`,
      { method: "DELETE" },
    ).then((result) => {
      if (!result.ok) {
        setError(result.error);
      }
    });
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

  function toggleLocalizacaoContextoOption(
    key:
      | "localizacao_perfil_regiao"
      | "localizacao_mobilidade"
      | "localizacao_comercio_servicos"
      | "localizacao_lazer_estilo_vida",
    value: string,
  ) {
    setForm((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return {
        ...current,
        [key]: nextValues,
      };
    });
  }

  function buildAykaDescricaoPrompt() {
    const endereco = formatAddressFromFields({
      logradouro: form.logradouro,
      numero: form.numero,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
    });
    const localizacaoPerfil = form.localizacao_perfil_regiao.length
      ? form.localizacao_perfil_regiao.join(", ")
      : "Não informado";
    const localizacaoMobilidade = form.localizacao_mobilidade.length
      ? form.localizacao_mobilidade.join(", ")
      : "Não informado";
    const localizacaoComercioServicos = form.localizacao_comercio_servicos.length
      ? form.localizacao_comercio_servicos.join(", ")
      : "Não informado";
    const localizacaoLazerEstilo = form.localizacao_lazer_estilo_vida.length
      ? form.localizacao_lazer_estilo_vida.join(", ")
      : "Não informado";
    const localizacaoResumo = form.localizacao_resumo_local.trim() || "Não informado";

    return `### CONTEXTO
Você é um redator imobiliário especialista em SEO local e acessibilidade, escrevendo em português-BR.

### OBJETIVO
Criar uma descrição persuasiva e confiável para um empreendimento imobiliário, pronta para uso em portais e página pública.

### CONFIGURAÇÃO CRIATIVA
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
- Nome: ${form.nome || "Não informado"}
- Tipo de uso: ${form.tipo_uso}
- Categoria: ${categoriaResumo || "Não informado"}
- Fase: ${form.fase}
- Endereço base: ${endereco || "Não informado"}
- Bairro comercial: ${form.bairro_comercial || "Não informado"}
- Perfil da região: ${localizacaoPerfil}
- Mobilidade: ${localizacaoMobilidade}
- Comércio e serviços: ${localizacaoComercioServicos}
- Lazer e estilo de vida: ${localizacaoLazerEstilo}
- Resumo local fornecido pelo corretor: ${localizacaoResumo}
- Construtora: ${form.construtora || "Não informado"}
- Incorporadora: ${form.incorporadora || "Não informado"}
- Torres: ${form.n_torres || "Não informado"}
- Andares: ${form.n_andares || "Não informado"}
- Unidades: ${form.n_unidades || "Não informado"}
- Qtd. elevadores: ${form.qtd_elevadores || "Não informado"}
- Unidades por andar: ${form.unidades_por_andar || "Não informado"}
- Unidades no térreo: ${form.unidades_terreo || "Não informado"}
- Unidades cobertura: ${form.unidades_cobertura || "Não informado"}
- Quantidade de imagens: ${photos.length}
- Quantidade de vídeos: ${videos.length}
- Texto base do corretor (se existir): ${htmlToPlainText(form.descricao) || "Nenhum"}

### SAÍDA ESPERADA
Retorne somente um JSON válido com este formato:
{
  "headline": "até 90 caracteres",
  "descricao_html": "<p>...</p><p>...</p>",
  "resumo_curto": "até 180 caracteres",
  "seo_title": "até 60 caracteres",
  "seo_description": "até 155 caracteres",
  "keywords": ["6 palavras-chave objetivas e distintas"]
}`;
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
    setShowAykaModal(false);
    setAykaModalStep(1);
    setError(null);
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
      const nextDescricao =
        parsed.descricao_html && parsed.descricao_html.trim().length > 0
          ? parsed.descricao_html.trim()
          : form.descricao;
      const nextResumo =
        parsed.resumo_curto && parsed.resumo_curto.trim().length > 0
          ? parsed.resumo_curto.trim()
          : form.resumo_curto;
      const nextMetaTitle =
        parsed.seo_title && parsed.seo_title.trim().length > 0
          ? parsed.seo_title.trim()
          : form.meta_title;
      const nextMetaDescription =
        parsed.seo_description && parsed.seo_description.trim().length > 0
          ? parsed.seo_description.trim()
          : form.meta_description;
      const nextKeywords =
        Array.isArray(parsed.keywords) && parsed.keywords.length > 0
          ? [...new Set(parsed.keywords.map((item) => item.trim()).filter(Boolean))].join(", ")
          : form.keywords;

      setForm((current) => ({
        ...current,
        descricao: nextDescricao,
        resumo_curto: nextResumo,
        meta_title: nextMetaTitle,
        meta_description: nextMetaDescription,
        keywords: nextKeywords,
      }));
      setBlockMessage("Descrição e SEO gerados com Ayka.");
      setTimeout(() => setBlockMessage(null), 3000);
    } finally {
      setGerandoDescricaoAyka(false);
    }
  }

  useEffect(() => {
    if (activeBlock !== 2) return;
    if (!GOOGLE_MAPS_PUBLIC_KEY) {
      setMapsReady(false);
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
  }, [activeBlock]);

  useEffect(() => {
    if (activeBlock !== 2) {
      mapRef.current = null;
      markerRef.current = null;
      markerBoundRef.current = false;
      mapHostElementRef.current = null;
    }
  }, [activeBlock]);

  useEffect(() => {
    if (activeBlock !== 2) return;
    if (lat === null || lng === null) return;
    if (mapsError) return;
    if (!mapsReady) return;
    if (!window.google?.maps) return;
    if (!mapContainerRef.current) return;

    const center = { lat, lng };
    const currentContainer = mapContainerRef.current;
    const mustRecreateMap = !mapRef.current || mapHostElementRef.current !== currentContainer;

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
      mapRef.current?.setCenter(center);
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
  }, [activeBlock, lat, lng, mapsError, mapsReady]);

  useEffect(() => {
    if (activeBlock !== 2) return;
    if (!isSearchFocused) return;
    const query = searchAddress.trim();
    if (query.length < 3) return;

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
  }, [activeBlock, searchAddress, isSearchFocused]);

  useEffect(() => {
    if (activeBlock !== 2) return;
    if (!form.numero.trim()) return;
    if (placeId) return;

    const hasStructuredAddress =
      !!form.logradouro.trim() && !!form.bairro.trim() && !!form.cidade.trim() && !!form.estado.trim();
    const typedSearch = searchAddress.trim();
    const userTypedCustomAddress =
      typedSearch.length > 0 &&
      !!enderecoFormatado.trim() &&
      typedSearch !== enderecoFormatado.trim();

    let address = "";
    if (userTypedCustomAddress) {
      address = replaceOrAppendAddressNumber(typedSearch, form.numero);
    } else if (hasStructuredAddress) {
      address = formatAddressFromFields({
        logradouro: form.logradouro,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
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
  }, [activeBlock, form.logradouro, form.numero, form.bairro, form.cidade, form.estado, placeId, searchAddress, enderecoFormatado]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
  }, []);

  async function handleSelectPlace(option: PlacePrediction) {
    if (hasLinkedImoveis) {
      setBlockMessage("Endereço bloqueado porque existem imóveis vinculados.");
      return;
    }
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
    setForm((current) => ({
      ...current,
      logradouro: details.logradouro ?? "",
      numero: details.numero ?? "",
      bairro: details.bairro ?? "",
      cidade: details.cidade ?? "",
      estado: details.estado && isUfCode(details.estado) ? details.estado : current.estado,
      cep: details.cep ?? "",
    }));
    setLat(details.lat);
    setLng(details.lng);
    setAddressComponents(details.address_components ?? []);
    setBlockMessage("Endereço preenchido automaticamente.");
    setTimeout(() => setBlockMessage(null), 2000);
  }

  function addTipoCadastroItem() {
    setTiposCadastro((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        nome: "",
        torre_nome: "",
        tipologia: tipologiasSelecionadasCadastro[0]?.value ?? "",
        area_privativa: "",
        dormitorios: "",
        suites: "",
        banheiros: "",
        vagas: "",
        qtd_unidades: "",
        plantas: [],
      },
    ]);
  }

  function updateTipoCadastroItem(
    tipoId: string,
    field: keyof Omit<TipoCadastroItem, "id">,
    value: string,
  ) {
    setTiposCadastro((current) =>
      current.map((item) => {
        if (item.id !== tipoId) return item;
        const normalizedValue =
          field === "nome" || field === "tipologia" || field === "torre_nome"
            ? value
            : sanitizeNumericTextInput(value);
        const nextItem = { ...item, [field]: normalizedValue };
        return normalizeTipoCadastroByCamposPermitidos(nextItem, form.tipo_uso);
      }),
    );
  }

  function removeTipoCadastroItem(tipoId: string) {
    const tipo = tiposCadastro.find((item) => item.id === tipoId);
    if (!tipo) return;
    const hasTipoData = Boolean(
      tipo.nome.trim() ||
        tipo.torre_nome.trim() ||
        tipo.tipologia.trim() ||
        tipo.area_privativa.trim() ||
        tipo.dormitorios.trim() ||
        tipo.suites.trim() ||
        tipo.banheiros.trim() ||
        tipo.vagas.trim() ||
        tipo.qtd_unidades.trim() ||
        tipo.plantas.length > 0,
    );
    if (hasTipoData) {
      setPendingTipoDeleteId(tipoId);
      return;
    }
    performRemoveTipoCadastroItem(tipoId);
  }

  function performRemoveTipoCadastroItem(tipoId: string) {
    setTiposCadastro((current) => current.filter((item) => item.id !== tipoId));
    setCollapsedTipoCadastroIds((current) => current.filter((id) => id !== tipoId));
    setEditingTipoPlanta((current) => (current?.tipoId === tipoId ? null : current));
    setPendingTipoDeleteId((current) => (current === tipoId ? null : current));
  }

  function toggleTipoCadastroCollapse(tipoId: string) {
    setCollapsedTipoCadastroIds((current) => {
      const isCollapsed = current.includes(tipoId);
      if (isCollapsed) {
        return tiposCadastro.filter((item) => item.id !== tipoId).map((item) => item.id);
      }
      return [...current, tipoId];
    });
  }

  function moveTipoCadastroToTarget(dragTipoId: string, targetTipoId: string) {
    if (!dragTipoId || !targetTipoId || dragTipoId === targetTipoId) return;
    setTiposCadastro((current) => {
      const sourceIndex = current.findIndex((item) => item.id === dragTipoId);
      const targetIndex = current.findIndex((item) => item.id === targetTipoId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function moveTipoCadastroByOffset(tipoId: string, offset: number) {
    setTiposCadastro((current) => {
      const sourceIndex = current.findIndex((item) => item.id === tipoId);
      if (sourceIndex < 0) return current;
      const targetIndex = sourceIndex + offset;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function moveTipoPlantaToTarget(tipoId: string, dragPlantaId: string, targetPlantaId: string) {
    if (dragPlantaId === targetPlantaId) return;
    setTiposCadastro((current) =>
      current.map((item) => {
        if (item.id !== tipoId) return item;
        const sourceIndex = item.plantas.findIndex((planta) => planta.id === dragPlantaId);
        const targetIndex = item.plantas.findIndex((planta) => planta.id === targetPlantaId);
        if (sourceIndex < 0 || targetIndex < 0) return item;
        const next = [...item.plantas];
        const [moved] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moved);
        return {
          ...item,
          plantas: next.map((planta, index) => ({ ...planta, ordem: index })),
        };
      }),
    );
  }

  function updateTipoCadastroPlantaField(
    tipoId: string,
    plantaId: string,
    field: "alt" | "legenda",
    value: string,
  ) {
    setTiposCadastro((current) =>
      current.map((item) => {
        if (item.id !== tipoId) return item;
        return {
          ...item,
          plantas: item.plantas.map((planta) =>
            planta.id === plantaId ? { ...planta, [field]: value } : planta,
          ),
        };
      }),
    );
  }

  async function removeTipoCadastroPlanta(tipoId: string, plantaId: string) {
    const targetTipo = tiposCadastro.find((item) => item.id === tipoId);
    const targetPlanta = targetTipo?.plantas.find((planta) => planta.id === plantaId);
    if (!targetPlanta) return;

    setTiposCadastro((current) =>
      current.map((item) => {
        if (item.id !== tipoId) return item;
        return {
          ...item,
          plantas: item.plantas
            .filter((planta) => planta.id !== plantaId)
            .map((planta, index) => ({ ...planta, ordem: index })),
        };
      }),
    );
    setEditingTipoPlanta((current) =>
      current && current.tipoId === tipoId && current.plantaId === plantaId ? null : current,
    );

    if (!targetPlanta.midia_id) return;
    void apiFetchWithAuth<{ id: string }>(`/api/midia/${targetPlanta.midia_id}`, {
      method: "DELETE",
    }).then((deleteResult) => {
      if (!deleteResult.ok && deleteResult.status !== 404) {
        setError(deleteResult.error);
      }
    });
  }

  async function appendTipoCadastroPlantaFiles(tipoId: string, files: File[]) {
    if (files.length === 0) return;
    const targetTipo = tiposCadastro.find((item) => item.id === tipoId);
    if (!targetTipo) return;

    if (targetTipo.plantas.length >= 3) {
      setError("Cada tipo permite no máximo 3 plantas.");
      return;
    }

    const slots = 3 - targetTipo.plantas.length;
    const queue = files.slice(0, slots);
    if (files.length > slots) {
      setError("Apenas as 3 primeiras plantas por tipo são permitidas.");
    } else {
      setError(null);
    }

    setUploadingTipoPlantasIds((current) =>
      current.includes(tipoId) ? current : [...current, tipoId],
    );

    for (const file of queue) {
      if (!isSupportedImageUpload(file)) {
        setError(`Formato não permitido para planta: ${file.name}`);
        continue;
      }
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        setError(`Arquivo acima de 15MB: ${file.name}`);
        continue;
      }

      if (!isHeicLikeFile(file)) {
        const dimensions = await getImageDimensionsClient(file);
        if (
          !dimensions ||
          dimensions.width < MIN_IMAGE_WIDTH ||
          dimensions.height < MIN_IMAGE_HEIGHT
        ) {
          setError(
            `A planta ${file.name} precisa ter no mínimo ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px.`,
          );
          continue;
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", "");
      formData.append("legenda", "");

      const uploadResult = await apiFetchWithAuth<{
        id: string;
        owner_id: string;
        url: string;
        storage_bucket: string;
        storage_path: string;
        tipo: "IMAGEM" | "VIDEO" | "PDF";
      }>("/api/midia/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResult.ok) {
        setError(uploadResult.error);
        continue;
      }

      setTiposCadastro((current) =>
        current.map((item) => {
          if (item.id !== tipoId) return item;
          const nextPlantas = [
            ...item.plantas,
            {
              id: crypto.randomUUID(),
              midia_id: uploadResult.data.id,
              url: uploadResult.data.url,
              alt: "",
              legenda: "",
              ordem: item.plantas.length,
            } satisfies TipoCadastroPlantaItem,
          ]
            .slice(0, 3)
            .map((planta, index) => ({ ...planta, ordem: index }));
          return { ...item, plantas: nextPlantas };
        }),
      );
    }

    setUploadingTipoPlantasIds((current) => current.filter((id) => id !== tipoId));
  }

  function buildTiposCadastroPayload() {
    const serialized = serializeTiposCadastro(tiposCadastro);
    if (hasMultipleTorres) return serialized;
    return serialized.map((item) => ({ ...item, torre_nome: null }));
  }

  function validateTiposCadastroRequiredFields(): string | null {
    const serialized = buildTiposCadastroPayload();
    for (let index = 0; index < serialized.length; index += 1) {
      const item = serialized[index] as Record<string, unknown>;
      const nome = typeof item.nome === "string" ? item.nome.trim() : "";
      const tipologia = typeof item.tipologia === "string" ? item.tipologia.trim() : "";
      const area = item.area_privativa;
      if (!nome) {
        return `Tipo ${index + 1}: nome é obrigatório.`;
      }
      if (!tipologia) {
        return `Tipo ${index + 1}: tipologia é obrigatória.`;
      }
      if (typeof area !== "number" || !Number.isFinite(area) || area <= 0) {
        return `Tipo ${index + 1}: área privativa é obrigatória e deve ser maior que zero.`;
      }
    }
    return null;
  }

  function showRequiredFieldModal(message: string) {
    setRequiredFieldModalMessage(message);
    setBlockMessage(null);
  }

  function buildSavePatch() {
    const patch: Record<string, unknown> = {
      nome: form.nome,
      descricao: form.descricao || null,
      resumo_curto: form.resumo_curto || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      keywords: parseKeywordsInput(form.keywords),
      fase: form.fase,
      tipo_uso: form.tipo_uso,
      categoria_imovel: deriveLegacyCategoriaImovelFromForm(form),
      categoria_residencial: form.tipo_uso === "RESIDENCIAL" ? form.categoria_residencial : null,
      tipologias_residenciais: form.tipo_uso === "RESIDENCIAL" ? form.tipologias_residenciais : [],
      categoria_comercial: form.tipo_uso === "COMERCIAL" ? form.categoria_comercial : null,
      tipologias_comerciais: form.tipo_uso === "COMERCIAL" ? form.tipologias_comerciais : [],
      logradouro: form.logradouro,
      numero: form.numero,
      bairro: form.bairro,
      bairro_comercial: form.bairro_comercial || null,
      localizacao_contexto: {
        perfil_regiao: form.localizacao_perfil_regiao,
        mobilidade: form.localizacao_mobilidade,
        comercio_servicos: form.localizacao_comercio_servicos,
        lazer_estilo_vida: form.localizacao_lazer_estilo_vida,
        resumo_local: form.localizacao_resumo_local.trim() || null,
      },
      cidade: form.cidade,
      estado: form.estado,
      cep: form.cep || null,
      lat,
      lng,
      address_json: {
        place_id: placeId || null,
        place_name: selectedPlaceName || null,
        formatted_address: enderecoFormatado || null,
        address_components: addressComponents,
      },
      construtora: form.construtora || null,
      incorporadora: form.incorporadora || null,
      administradora: form.administradora || null,
      previsao_entrega_em: form.fase === "ENTREGUE" ? null : form.previsao_entrega_em || null,
      ano_construcao:
        form.fase === "ENTREGUE" && form.ano_construcao ? Number(form.ano_construcao) : null,
      estagio_obra: form.fase === "EM_CONSTRUCAO" ? estagioObra || null : null,
      obra_percentuais: form.fase === "EM_CONSTRUCAO" ? obraPercentuais : null,
      n_torres: showOnlyUnidades ? null : form.n_torres ? Number(form.n_torres) : null,
      n_andares: showOnlyUnidades ? null : form.n_andares ? Number(form.n_andares) : null,
      n_unidades: form.n_unidades ? Number(form.n_unidades) : null,
      qtd_elevadores:
        isEstruturaVerticalEnabled && form.qtd_elevadores ? Number(form.qtd_elevadores) : null,
      unidades_por_andar:
        isEstruturaVerticalEnabled && form.unidades_por_andar ? Number(form.unidades_por_andar) : null,
      unidades_terreo:
        isEstruturaVerticalEnabled && form.unidades_terreo ? Number(form.unidades_terreo) : null,
      unidades_cobertura:
        isEstruturaVerticalEnabled && form.unidades_cobertura ? Number(form.unidades_cobertura) : null,
      tipos_cadastro: buildTiposCadastroPayload(),
      caracteristica_ids: caracteristicaIds,
    };

    if (hasLinkedImoveis) {
      delete patch.nome;
      delete patch.logradouro;
      delete patch.numero;
      delete patch.bairro;
      delete patch.cidade;
      delete patch.estado;
      delete patch.cep;
      delete patch.lat;
      delete patch.lng;
      delete patch.address_json;
    }

    return patch;
  }

  async function handleSave(closeAfter = false) {
    const tiposValidationError = validateTiposCadastroRequiredFields();
    if (tiposValidationError) {
      showRequiredFieldModal(tiposValidationError);
      return;
    }
    setSavingBlock(true);
    setError(null);
    setBlockMessage(null);
    const patch = buildSavePatch();
    const result = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch as Record<string, unknown>),
    });
    setSavingBlock(false);
    if (!result.ok) {
      if (result.error.toLowerCase().includes("obrigat")) {
        showRequiredFieldModal(result.error);
        return;
      }
      setError(result.error);
      return;
    }
    setItem((current) =>
      current
        ? {
            ...current,
            nome: form.nome,
            descricao: form.descricao || null,
            resumo_curto: form.resumo_curto || null,
            meta_title: form.meta_title || null,
            meta_description: form.meta_description || null,
            keywords: parseKeywordsInput(form.keywords),
            fase: form.fase,
            tipo_uso: form.tipo_uso,
            categoria_imovel: deriveLegacyCategoriaImovelFromForm(form),
            categoria_residencial: form.tipo_uso === "RESIDENCIAL" ? form.categoria_residencial : null,
            tipologias_residenciais: form.tipo_uso === "RESIDENCIAL" ? [...form.tipologias_residenciais] : [],
            categoria_comercial: form.tipo_uso === "COMERCIAL" ? form.categoria_comercial : null,
            tipologias_comerciais: form.tipo_uso === "COMERCIAL" ? [...form.tipologias_comerciais] : [],
            logradouro: form.logradouro,
            numero: form.numero,
            bairro: form.bairro,
            bairro_comercial: form.bairro_comercial || null,
            localizacao_contexto: {
              perfil_regiao: form.localizacao_perfil_regiao,
              mobilidade: form.localizacao_mobilidade,
              comercio_servicos: form.localizacao_comercio_servicos,
              lazer_estilo_vida: form.localizacao_lazer_estilo_vida,
              resumo_local: form.localizacao_resumo_local.trim() || null,
            },
            cidade: form.cidade,
            estado: form.estado,
            cep: form.cep || null,
            lat,
            lng,
            address_json: patch.address_json as Record<string, unknown> | null,
            construtora: form.construtora || null,
            incorporadora: form.incorporadora || null,
            administradora: form.administradora || null,
            previsao_entrega_em: form.fase === "ENTREGUE" ? null : form.previsao_entrega_em || null,
            ano_construcao:
              form.fase === "ENTREGUE" && form.ano_construcao ? Number(form.ano_construcao) : null,
            estagio_obra: form.fase === "EM_CONSTRUCAO" ? estagioObra || null : null,
            obra_percentuais: form.fase === "EM_CONSTRUCAO" ? obraPercentuais : null,
            n_torres: showOnlyUnidades ? null : form.n_torres ? Number(form.n_torres) : null,
            n_andares: showOnlyUnidades ? null : form.n_andares ? Number(form.n_andares) : null,
            n_unidades: form.n_unidades ? Number(form.n_unidades) : null,
            qtd_elevadores:
              isEstruturaVerticalEnabled && form.qtd_elevadores ? Number(form.qtd_elevadores) : null,
            unidades_por_andar:
              isEstruturaVerticalEnabled && form.unidades_por_andar ? Number(form.unidades_por_andar) : null,
            unidades_terreo:
              isEstruturaVerticalEnabled && form.unidades_terreo ? Number(form.unidades_terreo) : null,
            unidades_cobertura:
              isEstruturaVerticalEnabled && form.unidades_cobertura ? Number(form.unidades_cobertura) : null,
            tipos_cadastro: buildTiposCadastroPayload(),
            caracteristica_ids: [...caracteristicaIds],
          }
        : current,
    );
    setInitialSnapshot(currentSnapshot);
    setBlockMessage("Bloco atualizado com sucesso.");
    setTimeout(() => setBlockMessage(null), 3000);
    if (closeAfter) {
      bypassUnsavedGuardRef.current = true;
      window.location.href = "/empreendimentos";
    }
  }

  async function handleSaveAndLeaveFromModal() {
    const destination = pendingNavigationHref;
    if (!destination) return;
    const tiposValidationError = validateTiposCadastroRequiredFields();
    if (tiposValidationError) {
      showRequiredFieldModal(tiposValidationError);
      return;
    }
    const patch = buildSavePatch();
    setSavingBlock(true);
    setError(null);
    setBlockMessage(null);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch as Record<string, unknown>),
    });
    setSavingBlock(false);
    if (!result.ok) {
      if (result.error.toLowerCase().includes("obrigat")) {
        showRequiredFieldModal(result.error);
        return;
      }
      setError(result.error);
      return;
    }
    setInitialSnapshot(currentSnapshot);
    setShowUnsavedLeaveModal(false);
    setPendingNavigationHref(null);
    bypassUnsavedGuardRef.current = true;
    window.location.href = destination;
  }

  function handleDiscardAndLeaveFromModal() {
    if (!pendingNavigationHref) return;
    setShowUnsavedLeaveModal(false);
    const destination = pendingNavigationHref;
    setPendingNavigationHref(null);
    bypassUnsavedGuardRef.current = true;
    window.location.href = destination;
  }

  function getPublicationChecklistIssues() {
    const issues: string[] = [];

    if (!form.fase || !form.tipo_uso) {
      issues.push("Defina fase e tipo de uso do empreendimento.");
    }
    if (form.tipo_uso === "COMERCIAL" && !form.categoria_comercial) {
      issues.push("Defina a categoria comercial do empreendimento.");
    }
    if (form.tipo_uso === "COMERCIAL" && form.tipologias_comerciais.length === 0) {
      issues.push("Selecione ao menos uma tipologia comercial.");
    }
    if (form.tipo_uso === "RESIDENCIAL" && form.tipologias_residenciais.length === 0) {
      issues.push("Selecione ao menos uma tipologia residencial.");
    }
    if (!form.logradouro.trim() || !form.numero.trim() || !form.bairro.trim() || !form.cidade.trim() || !form.estado.trim()) {
      issues.push("Preencha os campos obrigatórios de localização (logradouro/endereço, número, bairro, cidade e UF).");
    }
    if (!form.nome.trim()) {
      issues.push("Informe o nome do empreendimento.");
    }
    if (form.fase === "NA_PLANTA" && !form.previsao_entrega_em.trim()) {
      issues.push("Empreendimento na planta exige previsão de entrega.");
    }
    if (imagemItems.length < 3) {
      issues.push("Adicione no mínimo 3 imagens para publicar.");
    }

    return issues;
  }

  async function refreshEmpreendimentoHeader() {
    const empreendimentoResult = await apiFetchWithAuth<Empreendimento>(`/api/empreendimentos/${id}`);
    if (!empreendimentoResult.ok) {
      setError(empreendimentoResult.error);
      return false;
    }
    setItem(empreendimentoResult.data);
    return true;
  }

  async function handleChangeStatus(nextStatus: "PUBLICADO" | "PAUSADO") {
    if (!item) return;
    if (savingBlock || savingStatus) return;
    if (item.status === nextStatus) {
      setShowHeaderActionsMenu(false);
      return;
    }
    if (hasPendingChanges) {
      setShowHeaderActionsMenu(false);
      setBlockMessage("Salve ou descarte as alterações pendentes antes de alterar o status.");
      setTimeout(() => setBlockMessage(null), 2500);
      return;
    }
    if (nextStatus === "PAUSADO" && hasLinkedImoveis) {
      setShowHeaderActionsMenu(false);
      setError(
        `Não é possível alterar para Pausado porque existem ${imoveisVinculadosCount} imóvel(is) vinculado(s).`,
      );
      return;
    }
    if (nextStatus === "PUBLICADO") {
      const issues = getPublicationChecklistIssues();
      if (issues.length > 0) {
        setShowHeaderActionsMenu(false);
        setPublicationChecklistIssues(issues);
        setShowPublicationChecklistModal(true);
        return;
      }
    }

    setSavingStatus(true);
    setError(null);
    const patchResult = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setSavingStatus(false);
    setShowHeaderActionsMenu(false);

    if (!patchResult.ok) {
      setError(patchResult.error);
      return;
    }

    const refreshed = await refreshEmpreendimentoHeader();
    if (!refreshed) return;
    setBlockMessage(`Status atualizado para ${getStatusEmpreendimentoDisplayLabel(nextStatus)}.`);
    setTimeout(() => setBlockMessage(null), 2500);
  }

  async function handleDeleteEmpreendimento() {
    if (!item) return;
    if (savingStatus) return;
    if (hasPendingChanges) {
      setBlockMessage("Salve ou descarte as alterações pendentes antes de excluir.");
      setTimeout(() => setBlockMessage(null), 2500);
      return;
    }
    if (hasLinkedImoveis) {
      setError(
        `Não é possível excluir porque existem ${imoveisVinculadosCount} imóvel(is) vinculado(s).`,
      );
      return;
    }

    setSavingStatus(true);
    setError(null);
    const result = await apiFetchWithAuth<{ id: string }>(`/api/empreendimentos/${id}`, {
      method: "DELETE",
    });
    setSavingStatus(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    bypassUnsavedGuardRef.current = true;
    window.location.href = "/empreendimentos";
  }

  function handleDiscardChanges() {
    if (!hasPendingChanges || savingBlock || savingStatus) return;
    const shouldDiscard = window.confirm("Descartar alterações não salvas e recarregar os dados?");
    if (!shouldDiscard) return;
    bypassUnsavedGuardRef.current = true;
    window.location.reload();
  }

  function handleSelectEditBlock(step: number) {
    if (switchingBlock || step === activeBlock) return;

    const startEnterTransition = () => {
      if (step === 5) setLoadingCaracteristicas(true);
      setActiveBlock(step);
      setBlockTransitionPhase("pre-enter");
      if (blockTransitionRafRef.current !== null) {
        cancelAnimationFrame(blockTransitionRafRef.current);
      }
      blockTransitionRafRef.current = requestAnimationFrame(() => {
        setBlockTransitionPhase("entering");
        blockTransitionRafRef.current = null;
      });
      if (blockTransitionTimeoutRef.current) {
        clearTimeout(blockTransitionTimeoutRef.current);
      }
      blockTransitionTimeoutRef.current = setTimeout(() => {
        setBlockTransitionPhase("idle");
        setSwitchingBlock(false);
        blockTransitionTimeoutRef.current = null;
      }, 340);
    };

    if (!activeBlock) {
      setSwitchingBlock(true);
      startEnterTransition();
      return;
    }

    setSwitchingBlock(true);
    setBlockTransitionPhase("leaving");
    if (blockTransitionTimeoutRef.current) {
      clearTimeout(blockTransitionTimeoutRef.current);
    }
    blockTransitionTimeoutRef.current = setTimeout(() => {
      startEnterTransition();
    }, 260);
  }

  if (loading || !item) {
    return (
      <AppShell title="Editar empreendimento" subtitle="Carregando dados...">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Carregando empreendimento...
        </div>
      </AppShell>
    );
  }

  const statusLabel = getStatusEmpreendimentoDisplayLabel(item.status);
  const canViewPublic = item.status === "PUBLICADO" && Boolean(profileNickname) && Boolean(item.slug_publico);
  const publicUrl = canViewPublic ? `/${profileNickname}/${item.slug_publico}` : null;
  const toastItems: FloatingToastItem[] = [];
  if (error) {
    toastItems.push({
      id: "empreendimento-error",
      kind: "error",
      message: error,
      onClose: () => setError(null),
    });
  }
  if (blockMessage) {
    toastItems.push({
      id: "empreendimento-block-message",
      kind: "success",
      message: blockMessage,
      onClose: () => setBlockMessage(null),
    });
  }

  return (
    <AppShell title="Editar empreendimento" subtitle="Gestão dos blocos do cadastro">
      <FloatingToastViewport items={toastItems} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/empreendimentos"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Voltar para lista
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={publicUrl ?? "#"}
            target="_blank"
            onClick={(event) => {
              if (!publicUrl) event.preventDefault();
            }}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
              publicUrl
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            <Eye size={16} />
            Visualizar no portal
          </Link>
          <div className="relative" data-empreendimento-header-actions>
            <button
              type="button"
              onClick={() => setShowHeaderActionsMenu((current) => !current)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Status: {statusLabel}
              <CaretDown size={14} />
            </button>
            {showHeaderActionsMenu ? (
              <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {item.status === "PAUSADO" ? (
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void handleChangeStatus("PUBLICADO")}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Publicar
                  </button>
                ) : null}
                {item.status === "PUBLICADO" ? (
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void handleChangeStatus("PAUSADO")}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Pausar
                  </button>
                ) : null}
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => {
                    setShowHeaderActionsMenu(false);
                    setDeleteEmpreendimentoConfirmText("");
                    setShowDeleteEmpreendimentoModal(true);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Excluir empreendimento
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="!border-slate-200 !bg-white !text-slate-900">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-900">{item.nome}</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-slate-600">{buildAddress(item)}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-sm text-slate-600">Fase: <strong>{getFaseDisplayLabel(item.fase)}</strong></p>
              <p className="text-sm text-slate-600">Tipo uso: <strong>{getTipoUsoDisplayLabel(item.tipo_uso)}</strong></p>
              <p className="text-sm text-slate-600">Categoria: <strong>{buildCategoriaResumoFromEmpreendimento(item)}</strong></p>
              <p className="text-sm text-slate-600">Características: <strong>{caracteristicasCount}</strong></p>
              <p className="text-sm text-slate-600">Mídias: <strong>{media.length}</strong> (Fotos {photos.length} / Vídeos {videos.length})</p>
              <p className="text-sm text-slate-600">Imóveis disponíveis: <strong>{imoveisDisponiveis}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => {
              const imageUrl = gridImages[index];
              const isLastWithOverlay = index === 5 && extraImages > 0;
              return (
                <button
                  key={`thumb-${index}`}
                  type="button"
                  onClick={() => {
                    if (imageUrl) openImageLightbox(index);
                  }}
                  disabled={!imageUrl}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 disabled:cursor-default enabled:cursor-zoom-in"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${item.nome} - imagem ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">Sem imagem</div>
                  )}
                  {isLastWithOverlay ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-sm font-semibold text-white">
                      +{extraImages} imagens
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {showImageLightbox && headerPhotoUrls.length > 0 ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/95 p-4"
          onClick={closeImageLightbox}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closeImageLightbox();
            }}
            className="absolute right-4 top-4 rounded-md border border-white/30 bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fechar visualizador"
          >
            <X size={18} />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToPreviousLightboxImage();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Imagem anterior"
          >
            <CaretLeft size={22} weight="bold" />
          </button>

          <div className="w-full max-w-[1600px]" onClick={(event) => event.stopPropagation()}>
            <p className="mb-3 text-center text-sm text-white/80">
              {lightboxImageIndex + 1} de {headerPhotoUrls.length}
            </p>
            <div className="flex max-h-[86vh] items-center justify-center overflow-hidden rounded-xl">
              <img
                src={headerPhotoUrls[lightboxImageIndex] ?? ""}
                alt={`${item.nome} - imagem ${lightboxImageIndex + 1}`}
                className="max-h-[86vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToNextLightboxImage();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Próxima imagem"
          >
            <CaretRight size={22} weight="bold" />
          </button>
        </div>
      ) : null}

      <Card className="mt-4 !border-slate-200 !bg-white !text-slate-900">
        <div className="mb-3">
          <h3 className="text-xl font-semibold text-slate-900">Blocos de edição</h3>
          <p className="text-sm text-slate-500">Acesso rápido aos mesmos passos do multistep de cadastro.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {EDIT_BLOCKS.map((block) => {
            const Icon = block.icon;
            const active = activeBlock === block.step;
            return (
              <button
                key={block.step}
                type="button"
                onClick={() => handleSelectEditBlock(block.step)}
                className={`cursor-pointer rounded-lg border px-3 py-3 text-left transition ${
                  active
                    ? "border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)]/5"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Icon size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{block.title}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{block.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {activeBlock ? (
        <Card
          className="mt-4 !border-slate-200 !bg-white !text-slate-900"
          style={{
            opacity: blockTransitionPhase === "leaving" || blockTransitionPhase === "pre-enter" ? 0 : 1,
            transform:
              blockTransitionPhase === "leaving"
                ? "translateY(22px) scale(0.985)"
                : blockTransitionPhase === "pre-enter"
                  ? "translateY(-22px) scale(0.985)"
                  : "translateY(0) scale(1)",
            filter: blockTransitionPhase === "leaving" || blockTransitionPhase === "pre-enter" ? "blur(1.5px)" : "none",
            transition:
              "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1), filter 240ms ease",
            willChange: "opacity, transform, filter",
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-lg font-semibold text-slate-900">
              {EDIT_BLOCKS.find((block) => block.step === activeBlock)?.title ?? "Edição"}
            </h4>
          </div>

          {activeBlock === 1 ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">Dados do empreendimento</p>
              </div>
              <label className="block md:col-span-3">
                <span className="mb-1 block text-sm text-slate-600">Nome</span>
                <input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  disabled={hasLinkedImoveis}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                />
                {hasLinkedImoveis ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    Nome bloqueado porque existem imóveis vinculados.
                  </span>
                ) : null}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-600">Construtora</span>
                <input
                  value={form.construtora}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, construtora: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-600">Incorporadora</span>
                <input
                  value={form.incorporadora}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, incorporadora: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-600">Administradora</span>
                <input
                  value={form.administradora}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, administradora: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">Fase e estrutura</p>
              </div>
              <div className="md:col-span-3">
                <span className="mb-2 block text-sm text-slate-600">Fase</span>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-6 h-1 rounded-full bg-slate-200" />
                    <div className="relative grid grid-cols-3 gap-3">
                      {[
                        {
                          value: "NA_PLANTA" as EditFormState["fase"],
                          label: "Na planta",
                          icon: <Buildings size={16} />,
                        },
                        {
                          value: "EM_CONSTRUCAO" as EditFormState["fase"],
                          label: "Em obras",
                          icon: <HardHat size={16} />,
                        },
                        {
                          value: "ENTREGUE" as EditFormState["fase"],
                          label:
                            form.fase === "ENTREGUE" && form.ano_construcao.trim()
                              ? `Entregue • ${form.ano_construcao.trim()}`
                              : "Entregue",
                          icon: <ListChecks size={16} />,
                        },
                      ].map((faseOption) => {
                        const active = form.fase === faseOption.value;
                        const disabled = !fasesPermitidas.includes(faseOption.value);
                        return (
                          <button
                            key={faseOption.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              const nextFase = faseOption.value;
                              setForm((current) => ({
                                ...current,
                                fase: nextFase,
                                previsao_entrega_em:
                                  nextFase === "ENTREGUE" ? "" : current.previsao_entrega_em,
                                ano_construcao:
                                  nextFase === "ENTREGUE" ? current.ano_construcao : "",
                              }));
                            }}
                            className={`relative z-10 flex flex-col items-center rounded-lg border px-3 py-2 text-center transition ${
                              active
                                ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <span
                              className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                active ? "bg-[var(--primary-scarlet)] text-white" : "bg-slate-100"
                              }`}
                            >
                              {faseOption.icon}
                            </span>
                            <span className="text-xs font-medium">{faseOption.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <span className="mt-1 block text-xs text-slate-500">
                  {faseInicial === "ENTREGUE"
                    ? "Este empreendimento já foi cadastrado como entregue e não pode mudar de fase."
                    : faseInicial === "EM_CONSTRUCAO"
                      ? "Empreendimentos em obras só podem avançar para entregue."
                      : "Empreendimentos na planta podem avançar para em obras ou entregue."}
                </span>
              </div>
              {form.fase === "EM_CONSTRUCAO" ? (
                <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
                          className="obra-progress-range w-full"
                          style={{
                            background: `linear-gradient(to right, var(--grey-olive) 0%, var(--grey-olive) ${obraPercentuais[item.key]}%, transparent ${obraPercentuais[item.key]}%, transparent 100%)`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="md:col-span-3">
                {form.fase === "ENTREGUE" ? (
                  !isEstruturaVerticalEnabled ? (
                    <label className="block md:max-w-sm">
                      <span className="mb-1 block text-sm text-slate-600">Ano de construção</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={form.ano_construcao}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            ano_construcao: sanitizeYearInput(event.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <span className="mt-1 block text-xs text-slate-500">
                        Máximo permitido: {CURRENT_YEAR}
                      </span>
                    </label>
                  ) : null
                ) : (
                  <label className="block md:max-w-lg">
                    <span className="mb-1 block text-sm text-slate-600">Previsão entrega</span>
                    <div className="grid grid-cols-2 gap-2">
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
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
                        onChange={(event) => updatePrevisaoEntrega(previsaoAnoDraft, event.target.value)}
                        disabled={!previsaoAnoDraft}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
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
                  </label>
                )}
              </div>
              <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="mb-2 block text-sm text-slate-600">Tipo de uso</span>
                <div className="grid gap-2 md:grid-cols-2">
                  {(
                    [
                      { value: "RESIDENCIAL", label: "Residencial", icon: <House size={16} /> },
                      { value: "COMERCIAL", label: "Comercial", icon: <Buildings size={16} /> },
                    ] as const
                  ).map((option) => {
                    const active = form.tipo_uso === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => {
                            const nextTipoUso = option.value as EditFormState["tipo_uso"];
                            return {
                              ...current,
                              tipo_uso: nextTipoUso,
                              categoria_imovel:
                                nextTipoUso === "COMERCIAL"
                                  ? current.categoria_imovel || "ESCRITORIO"
                                  : current.categoria_imovel,
                              categoria_residencial: current.categoria_residencial,
                              tipologias_residenciais:
                                nextTipoUso === "RESIDENCIAL"
                                  ? current.tipologias_residenciais.length > 0
                                    ? current.tipologias_residenciais
                                    : [
                                        TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[current.categoria_residencial]?.[0]
                                          ?.value ?? "APARTAMENTO_PADRAO",
                                      ]
                                  : [],
                              categoria_comercial: current.categoria_comercial,
                              tipologias_comerciais:
                                nextTipoUso === "COMERCIAL"
                                  ? current.tipologias_comerciais.length > 0
                                    ? current.tipologias_comerciais
                                    : [
                                        TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[current.categoria_comercial]?.[0]
                                          ?.value ?? "PADRAO",
                                      ]
                                  : [],
                            };
                          })
                        }
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          active
                            ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {form.tipo_uso === "COMERCIAL" ? "Categoria comercial" : "Categoria residencial"}
                  </span>
                  {(form.tipo_uso === "COMERCIAL" ? CATEGORIAS_COMERCIAIS : CATEGORIAS_RESIDENCIAL).map(
                    (categoria) => {
                      const selected =
                        form.tipo_uso === "COMERCIAL"
                          ? form.categoria_comercial === categoria.value
                          : form.categoria_residencial === categoria.value;
                      return (
                        <button
                          key={categoria.value}
                          type="button"
                          onClick={() => {
                            if (form.tipo_uso === "COMERCIAL") {
                              const nextCategoria = categoria.value as EditFormState["categoria_comercial"];
                              setForm((current) => ({
                                ...current,
                                categoria_comercial: nextCategoria,
                                tipologias_comerciais: [
                                  TIPOLOGIAS_COMERCIAIS_POR_CATEGORIA[nextCategoria]?.[0]?.value ?? "PADRAO",
                                ],
                              }));
                              return;
                            }
                            const nextCategoria = categoria.value as EditFormState["categoria_residencial"];
                            setForm((current) => ({
                              ...current,
                              categoria_residencial: nextCategoria,
                              tipologias_residenciais: [
                                TIPOLOGIAS_RESIDENCIAIS_POR_CATEGORIA[nextCategoria]?.[0]?.value ??
                                  "APARTAMENTO_PADRAO",
                              ],
                            }));
                          }}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                            selected
                              ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {categoria.label}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
              <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Subcategoria
                  </span>
                  {form.tipo_uso === "COMERCIAL"
                    ? tipologiasComerciaisByCategoria.map((tipologia) => {
                        const selected = form.tipologias_comerciais.includes(tipologia.value);
                        return (
                          <button
                            key={tipologia.value}
                            type="button"
                            onClick={() =>
                              setForm((current) => {
                                const has = current.tipologias_comerciais.includes(tipologia.value);
                                if (has) {
                                  const next = current.tipologias_comerciais.filter(
                                    (item) => item !== tipologia.value,
                                  );
                                  return {
                                    ...current,
                                    tipologias_comerciais:
                                      next.length > 0 ? next : current.tipologias_comerciais,
                                  };
                                }
                                return {
                                  ...current,
                                  tipologias_comerciais: [...current.tipologias_comerciais, tipologia.value],
                                };
                              })
                            }
                            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                              selected
                                ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {tipologia.label}
                          </button>
                        );
                      })
                    : tipologiasResidenciaisByCategoria.map((tipologia) => {
                        const selected = form.tipologias_residenciais.includes(tipologia.value);
                        return (
                          <button
                            key={tipologia.value}
                            type="button"
                            onClick={() =>
                              setForm((current) => {
                                const has = current.tipologias_residenciais.includes(tipologia.value);
                                if (has) {
                                  const next = current.tipologias_residenciais.filter(
                                    (item) => item !== tipologia.value,
                                  );
                                  return {
                                    ...current,
                                    tipologias_residenciais:
                                      next.length > 0 ? next : current.tipologias_residenciais,
                                  };
                                }
                                return {
                                  ...current,
                                  tipologias_residenciais: [...current.tipologias_residenciais, tipologia.value],
                                };
                              })
                            }
                            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                              selected
                                ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {tipologia.label}
                          </button>
                        );
                      })}
                </div>
              </div>
              {isEstruturaVerticalEnabled ? (
                <div className="md:col-span-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-6">
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Torres</span>
                      <input
                        type="number"
                        value={form.n_torres}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, n_torres: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Andares</span>
                      <input
                        type="number"
                        value={form.n_andares}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, n_andares: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Unid./andar</span>
                      <input
                        type="number"
                        value={form.unidades_por_andar}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, unidades_por_andar: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Unid. térreo</span>
                      <input
                        type="number"
                        value={form.unidades_terreo}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, unidades_terreo: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Unid. cobertura</span>
                      <input
                        type="number"
                        value={form.unidades_cobertura}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, unidades_cobertura: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Unidades totais</span>
                      <input
                        type="number"
                        value={form.n_unidades}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, n_unidades: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
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
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          n_unidades:
                            sugestaoUnidadesBase != null
                              ? String(sugestaoUnidadesBase)
                              : current.n_unidades,
                        }))
                      }
                      disabled={sugestaoUnidadesBase == null}
                      className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Calcular e preencher
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Elevadores</span>
                      <input
                        type="number"
                        value={form.qtd_elevadores}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, qtd_elevadores: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    {form.fase === "ENTREGUE" ? (
                      <label className="block">
                        <span className="mb-1 block text-sm text-slate-600">Ano de construção</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={form.ano_construcao}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ano_construcao: sanitizeYearInput(event.target.value),
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <span className="mt-1 block text-xs text-slate-500">
                          Máximo permitido: {CURRENT_YEAR}
                        </span>
                      </label>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  {!showOnlyUnidades ? (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-sm text-slate-600">Torres</span>
                        <input
                          type="number"
                          value={form.n_torres}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, n_torres: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm text-slate-600">Andares</span>
                        <input
                          type="number"
                          value={form.n_andares}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, n_andares: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  ) : null}
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-600">Unidades</span>
                    <input
                      type="number"
                      value={form.n_unidades}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, n_unidades: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                </>
              )}
              <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">Cadastro de tipos</p>
                  <button
                    type="button"
                    onClick={addTipoCadastroItem}
                    className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Adicionar tipo
                  </button>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  Cadastre os tipos de unidade deste empreendimento para reaproveitar no cadastro de imóveis.
                </p>

                {tiposCadastro.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-xs text-slate-500">
                    Nenhum tipo cadastrado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tiposCadastro.map((tipo, index) => (
                      (() => {
                        const allowedFields = getCamposPermitidosTipoCadastro(form.tipo_uso, tipo.tipologia);
                        const showAreaPrivativa = allowedFields.has("area_privativa");
                        const showDormitorios = allowedFields.has("dormitorios");
                        const showSuites = allowedFields.has("suites");
                        const showBanheiros = allowedFields.has("banheiros");
                        const showVagas = allowedFields.has("vagas");
                        const showQtdUnidades = allowedFields.has("qtd_unidades");
                        const isTipoPlantasUploading = uploadingTipoPlantasIds.includes(tipo.id);
                        const isCollapsed = collapsedTipoCadastroIds.includes(tipo.id);
                        return (
                          <div key={tipo.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div
                              onDragEnter={(event) => {
                                const hasInternalDrag = event.dataTransfer.types?.includes(
                                  "application/x-corretor-tipo-id",
                                );
                                if (!hasInternalDrag) return;
                                event.preventDefault();
                                if (dropTargetTipoCadastroId !== tipo.id) setDropTargetTipoCadastroId(tipo.id);
                              }}
                              onDragOver={(event) => {
                                const hasInternalDrag = event.dataTransfer.types?.includes(
                                  "application/x-corretor-tipo-id",
                                );
                                if (!hasInternalDrag) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                if (dropTargetTipoCadastroId !== tipo.id) setDropTargetTipoCadastroId(tipo.id);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                const dragTipoId =
                                  event.dataTransfer.getData("application/x-corretor-tipo-id") ||
                                  event.dataTransfer.getData("text/plain");
                                if (!dragTipoId) return;
                                moveTipoCadastroToTarget(dragTipoId, tipo.id);
                                setDropTargetTipoCadastroId(null);
                              }}
                              className={`mb-2 flex items-center justify-between gap-2 rounded-md p-1 transition ${
                                dropTargetTipoCadastroId === tipo.id
                                  ? "bg-[var(--primary-scarlet)]/5 ring-1 ring-[var(--primary-scarlet)]/30"
                                  : ""
                              }`}
                            >
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Tipo {index + 1}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("application/x-corretor-tipo-id", tipo.id);
                                    event.dataTransfer.setData("text/plain", tipo.id);
                                  }}
                                  onDragEnd={() => setDropTargetTipoCadastroId(null)}
                                  className="inline-flex cursor-grab items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 active:cursor-grabbing"
                                  title="Arrastar para reordenar"
                                >
                                  <ArrowsOutCardinal size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveTipoCadastroByOffset(tipo.id, -1)}
                                  className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Subir tipo"
                                >
                                  <CaretUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === tiposCadastro.length - 1}
                                  onClick={() => moveTipoCadastroByOffset(tipo.id, 1)}
                                  className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Descer tipo"
                                >
                                  <CaretDown size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleTipoCadastroCollapse(tipo.id)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                >
                                  {isCollapsed ? <CaretDown size={12} /> : <CaretUp size={12} />}
                                  {isCollapsed ? "Expandir" : "Recolher"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeTipoCadastroItem(tipo.id)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash size={12} />
                                  Remover
                                </button>
                              </div>
                            </div>
                            {!isCollapsed ? (
                              <>
                                <div className="grid gap-3 md:grid-cols-4">
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-xs text-slate-600">Nome do tipo</span>
                            <input
                              value={tipo.nome}
                              onChange={(event) => updateTipoCadastroItem(tipo.id, "nome", event.target.value)}
                              placeholder="Ex.: Final 03 - 72m²"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </label>
                          {hasMultipleTorres ? (
                            <label className="block md:col-span-2">
                              <span className="mb-1 block text-xs text-slate-600">
                                Torre (opcional)
                              </span>
                              <input
                                value={tipo.torre_nome}
                                onChange={(event) =>
                                  updateTipoCadastroItem(tipo.id, "torre_nome", event.target.value)
                                }
                                placeholder="Ex.: Torre Pôr do Sol"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              />
                            </label>
                          ) : null}
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-xs text-slate-600">Tipologia</span>
                            <select
                              value={tipo.tipologia}
                              onChange={(event) =>
                                updateTipoCadastroItem(tipo.id, "tipologia", event.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              {tipologiasSelecionadasCadastro.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                              {showAreaPrivativa ? (
                                <label className="block">
                                  <span className="mb-1 block text-xs text-slate-600">Área privativa (m²)</span>
                                  <input
                                    inputMode="numeric"
                                    value={tipo.area_privativa}
                                    onChange={(event) =>
                                      updateTipoCadastroItem(tipo.id, "area_privativa", event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  />
                                </label>
                              ) : null}
                              {showDormitorios ? (
                                <label className="block">
                                  <span className="mb-1 block text-xs text-slate-600">Dormitórios</span>
                                  <input
                                    inputMode="numeric"
                                    value={tipo.dormitorios}
                                    onChange={(event) =>
                                      updateTipoCadastroItem(tipo.id, "dormitorios", event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  />
                                </label>
                              ) : null}
                              {showSuites ? (
                                <label className="block">
                                  <span className="mb-1 block text-xs text-slate-600">Suítes</span>
                                  <input
                                    inputMode="numeric"
                                    value={tipo.suites}
                                    onChange={(event) =>
                                      updateTipoCadastroItem(tipo.id, "suites", event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  />
                                </label>
                              ) : null}
                              {showBanheiros ? (
                                <label className="block">
                                  <span className="mb-1 block text-xs text-slate-600">Banheiros</span>
                                  <input
                                    inputMode="numeric"
                                    value={tipo.banheiros}
                                    onChange={(event) =>
                                      updateTipoCadastroItem(tipo.id, "banheiros", event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  />
                                </label>
                              ) : null}
                              {showVagas ? (
                                <label className="block">
                                  <span className="mb-1 block text-xs text-slate-600">Vagas</span>
                                  <input
                                    inputMode="numeric"
                                    value={tipo.vagas}
                                    onChange={(event) =>
                                      updateTipoCadastroItem(tipo.id, "vagas", event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  />
                                </label>
                              ) : null}
                              {showQtdUnidades ? (
                                <label className="block">
                                  <span className="mb-1 block text-xs text-slate-600">Qtd. unidades</span>
                                  <input
                                    inputMode="numeric"
                                    value={tipo.qtd_unidades}
                                    onChange={(event) =>
                                      updateTipoCadastroItem(tipo.id, "qtd_unidades", event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  />
                                </label>
                              ) : null}
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Plantas do tipo
                                </p>
                                <span className="text-xs text-slate-500">
                                  {tipo.plantas.length}/3
                                </span>
                              </div>
                              <p className="mb-3 text-xs text-slate-500">
                                Até 3 imagens de planta por tipo (JPG, PNG, WEBP, HEIC/HEIF).
                              </p>
                              <input
                                id={`tipo-plantas-input-${tipo.id}`}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                                multiple
                                className="hidden"
                                onChange={(event) => {
                                  void appendTipoCadastroPlantaFiles(
                                    tipo.id,
                                    Array.from(event.currentTarget.files ?? []),
                                  );
                                  event.currentTarget.value = "";
                                }}
                                disabled={isTipoPlantasUploading || tipo.plantas.length >= 3}
                              />
                              <div className="mb-3">
                                <label
                                  htmlFor={`tipo-plantas-input-${tipo.id}`}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                                    isTipoPlantasUploading || tipo.plantas.length >= 3
                                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                      : "cursor-pointer border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  {isTipoPlantasUploading ? (
                                    <CircleNotch size={14} className="animate-spin" />
                                  ) : (
                                    <UploadSimple size={14} />
                                  )}
                                  {isTipoPlantasUploading ? "Enviando..." : "Adicionar plantas"}
                                </label>
                              </div>
                              {tipo.plantas.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-xs text-slate-500">
                                  Nenhuma planta adicionada.
                                </div>
                              ) : (
                                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                                  {tipo.plantas.map((planta) => {
                                    const plantaThumbUrl = buildThumbUrl(planta.url);
                                    return (
                                      <article
                                      key={planta.id}
                                      onDragEnter={(event) => {
                                        const hasInternalDrag = event.dataTransfer.types?.includes(
                                          "application/x-corretor-tipo-planta-id",
                                        );
                                        if (!hasInternalDrag) return;
                                        event.preventDefault();
                                        const nextTargetKey = `${tipo.id}:${planta.id}`;
                                        if (tipoPlantaDropTargetKey !== nextTargetKey) {
                                          setTipoPlantaDropTargetKey(nextTargetKey);
                                        }
                                      }}
                                      onDragOver={(event) => {
                                        const hasInternalDrag = event.dataTransfer.types?.includes(
                                          "application/x-corretor-tipo-planta-id",
                                        );
                                        if (!hasInternalDrag) return;
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = "move";
                                        const nextTargetKey = `${tipo.id}:${planta.id}`;
                                        if (tipoPlantaDropTargetKey !== nextTargetKey) {
                                          setTipoPlantaDropTargetKey(nextTargetKey);
                                        }
                                      }}
                                      onDrop={(event) => {
                                        event.preventDefault();
                                        const dragPlantaId =
                                          event.dataTransfer.getData("application/x-corretor-tipo-planta-id") ||
                                          event.dataTransfer.getData("text/plain");
                                        if (!dragPlantaId) return;
                                        moveTipoPlantaToTarget(tipo.id, dragPlantaId, planta.id);
                                        setTipoPlantaDropTargetKey(null);
                                      }}
                                      className={`overflow-hidden rounded-lg border bg-white transition ${
                                        tipoPlantaDropTargetKey === `${tipo.id}:${planta.id}`
                                          ? "border-[var(--primary-scarlet)] ring-2 ring-[var(--primary-scarlet)]/20"
                                          : "border-slate-200"
                                      }`}
                                    >
                                      <div
                                        draggable
                                        onDragStart={(event) => {
                                          event.dataTransfer.effectAllowed = "move";
                                          event.dataTransfer.setData(
                                            "application/x-corretor-tipo-planta-id",
                                            planta.id,
                                          );
                                          event.dataTransfer.setData("text/plain", planta.id);
                                        }}
                                        onDragEnd={() => setTipoPlantaDropTargetKey(null)}
                                        className="group relative aspect-[4/3] cursor-grab bg-slate-100 active:cursor-grabbing"
                                      >
                                        {plantaThumbUrl ? (
                                          <img
                                            src={plantaThumbUrl}
                                            alt={planta.alt || tipo.nome || "Planta do tipo"}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                            style={{ objectFit: "cover", objectPosition: "center" }}
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-slate-500">
                                            Preview indisponível
                                          </div>
                                        )}
                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/20 group-hover:opacity-100">
                                          <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700">
                                            <ArrowsOutCardinal size={12} />
                                            Arrastar
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-1 p-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-[11px] text-slate-500">
                                            Planta {planta.ordem + 1}
                                          </p>
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingTipoPlanta({ tipoId: tipo.id, plantaId: planta.id })
                                              }
                                              className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                              aria-label="Editar planta"
                                            >
                                              <DotsThreeVertical size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                void removeTipoCadastroPlanta(tipo.id, planta.id);
                                              }}
                                              className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                              aria-label="Remover planta"
                                            >
                                              <Trash size={14} />
                                            </button>
                                          </div>
                                        </div>
                                        <p className="truncate text-[11px] text-slate-600">
                                          {planta.legenda || planta.alt || "Sem legenda"}
                                        </p>
                                      </div>
                                      </article>
                                    );
                                  })}
                                </div>
                              )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeBlock === 2 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="mb-2 block text-sm text-slate-600">Busca por endereço ou place</label>
              {hasLinkedImoveis ? (
                <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Endereço bloqueado: este empreendimento possui {imoveisVinculadosCount} imóvel(is) vinculado(s).
                </p>
              ) : null}
              <div className="relative">
                <input
                  value={searchAddress}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setIsSearchFocused(false), 120);
                    setPlaceOptions([]);
                    setSearchingPlaces(false);
                  }}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSearchAddress(next);
                    if (next.trim().length < 3) {
                      setPlaceOptions([]);
                      setSearchingPlaces(false);
                    }
                    if (!next.trim()) {
                      setPlaceId("");
                      setSelectedPlaceName("");
                      setEnderecoFormatado("");
                      setLat(null);
                      setLng(null);
                      setAddressComponents([]);
                      setPlaceOptions([]);
                      return;
                    }
                    if (placeId && next !== enderecoFormatado) {
                      setPlaceId("");
                      setSelectedPlaceName("");
                    }
                  }}
                  placeholder="Ex: Av. Paulista, 200 ou Condomínio New York Club Vila Romana"
                  disabled={hasLinkedImoveis}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--primary-scarlet)] disabled:bg-slate-100"
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
                      disabled={hasLinkedImoveis}
                      className="flex w-full cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                        value={form.logradouro}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, logradouro: event.target.value }))
                        }
                        disabled={hasLinkedImoveis || (readOnlyAddressByPlace && Boolean(form.logradouro))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Número</label>
                      <input
                        value={form.numero}
                        onChange={(event) => {
                          const nextNumero = event.target.value;
                          setForm((current) => ({ ...current, numero: nextNumero }));
                          if (placeId) {
                            setPlaceId("");
                            setSelectedPlaceName("");
                          }
                          if (
                            form.logradouro.trim() &&
                            form.bairro.trim() &&
                            form.cidade.trim() &&
                            form.estado.trim()
                          ) {
                            const withoutNumber = formatAddressFromFields({
                              logradouro: form.logradouro,
                              numero: "",
                              bairro: form.bairro,
                              cidade: form.cidade,
                              estado: form.estado,
                            });
                            setSearchAddress(
                              nextNumero.trim()
                                ? replaceOrAppendAddressNumber(withoutNumber, nextNumero)
                                : withoutNumber,
                            );
                          }
                        }}
                        disabled={hasLinkedImoveis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Bairro</label>
                      <input
                        value={form.bairro}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, bairro: event.target.value }))
                        }
                        disabled={hasLinkedImoveis || (readOnlyAddressByPlace && Boolean(form.bairro))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Cidade</label>
                      <input
                        value={form.cidade}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, cidade: event.target.value }))
                        }
                        disabled={hasLinkedImoveis || (readOnlyAddressByPlace && Boolean(form.cidade))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">UF</label>
                      <select
                        value={form.estado}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, estado: event.target.value.toUpperCase() }))
                        }
                        disabled={hasLinkedImoveis || (readOnlyAddressByPlace && Boolean(form.estado))}
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
                        value={form.cep}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, cep: event.target.value }))
                        }
                        disabled={hasLinkedImoveis || (readOnlyAddressByPlace && Boolean(form.cep))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs text-slate-500">
                      Bairro comercial (texto livre)
                    </label>
                    <input
                      value={form.bairro_comercial}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, bairro_comercial: event.target.value }))
                      }
                      placeholder="Ex: Jardins, Centro expandido, Faria Lima"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-3 text-base text-slate-900">Visualização do mapa</h4>
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {lat !== null && lng !== null && !(mapsError || !GOOGLE_MAPS_PUBLIC_KEY) ? (
                      <div
                        ref={mapContainerRef}
                        className={`h-64 w-full ${hasLinkedImoveis ? "pointer-events-none opacity-90" : ""}`}
                      />
                    ) : (mapsError || !GOOGLE_MAPS_PUBLIC_KEY) ? (
                      <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-rose-600">
                        {mapsError || "Configure NEXT_PUBLIC_GOOGLE_MAPS_KEY para habilitar o mapa interativo."}
                      </div>
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                        Sem coordenadas ainda
                      </div>
                    )}
                    {hasLinkedImoveis ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 px-4 text-center text-xs font-medium text-slate-100">
                        Mapa bloqueado porque existem imóveis vinculados.
                      </div>
                    ) : null}
                  </div>
                  {regeocoding ? (
                    <p className="mt-2 text-xs text-slate-500">Atualizando coordenadas pelo número informado...</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Latitude: {lat ?? "-"} • Longitude: {lng ?? "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                  <h5 className="text-sm font-medium text-slate-900">Contexto da localização (opcional)</h5>
                  <p className="mt-1 text-xs text-slate-500">
                    Enriquecimento para a descrição com Ayka e para posicionamento comercial do empreendimento.
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Perfil da região</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {LOCALIZACAO_PERFIL_REGIAO_OPTIONS.map((option) => {
                          const active = form.localizacao_perfil_regiao.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                toggleLocalizacaoContextoOption("localizacao_perfil_regiao", option)
                              }
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
                          const active = form.localizacao_mobilidade.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                toggleLocalizacaoContextoOption("localizacao_mobilidade", option)
                              }
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
                          const active = form.localizacao_comercio_servicos.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                toggleLocalizacaoContextoOption("localizacao_comercio_servicos", option)
                              }
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
                          const active = form.localizacao_lazer_estilo_vida.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                toggleLocalizacaoContextoOption("localizacao_lazer_estilo_vida", option)
                              }
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
                        value={form.localizacao_resumo_local}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            localizacao_resumo_local: event.target.value.slice(0, 300),
                          }))
                        }
                        rows={3}
                        placeholder="Ex: região procurada por famílias, com comércio completo e boa mobilidade para os principais eixos."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-right text-[11px] text-slate-500">
                        {form.localizacao_resumo_local.length}/300
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeBlock === 5 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm text-slate-500">
                Selecione os diferenciais em ordem alfabética. Essas características serão usadas também na categorização de mídias.
              </p>
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Tipo de uso atual: <strong>{form.tipo_uso === "RESIDENCIAL" ? "Residencial" : "Comercial"}</strong> •{" "}
                {caracteristicaIds.length} selecionada(s)
              </div>
              <input
                value={caracteristicaQuery}
                onChange={(event) => setCaracteristicaQuery(event.target.value)}
                placeholder="Buscar característica"
                className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              {loadingCaracteristicas ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Carregando características...
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCaracteristicas.map((entry) => {
                    const active = caracteristicaIds.includes(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() =>
                          setCaracteristicaIds((current) =>
                            current.includes(entry.id)
                              ? current.filter((id) => id !== entry.id)
                              : [...current, entry.id],
                          )
                        }
                        className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition ${
                          active
                            ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {entry.label_pt}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {activeBlock === 6 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-4 flex items-center gap-2 text-2xl text-slate-900">
                <ImageSquare size={24} />
                Imagens
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                Use imagens com no mínimo 800x600 e até 15MB.
              </p>
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className="hidden"
                onChange={(event) => {
                  void appendImagemFiles(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />

              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsImageDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsImageDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsImageDragActive(false);
                }}
                onDrop={(event) => {
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
                    ? `Salvando... ${uploadingTempImagesPercent ?? 0}%`
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
                        Progresso total: {uploadingTempImagesPercent ?? 0}%
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
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {imagemItems.map((item, index) => {
                    const previewSrc = (item.thumbUrl || buildThumbUrl(item.previewUrl)).trim();
                    return (
                    <article
                      key={item.id}
                      onDragEnter={(event) => {
                        const hasInternalDrag = event.dataTransfer.types?.includes(
                          "application/x-corretor-image-id",
                        );
                        if (!hasInternalDrag) return;
                        event.preventDefault();
                        if (dropTargetImageId !== item.id) setDropTargetImageId(item.id);
                      }}
                      onDragOver={(event) => {
                        const hasInternalDrag = event.dataTransfer.types?.includes(
                          "application/x-corretor-image-id",
                        );
                        if (!hasInternalDrag) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        if (dropTargetImageId !== item.id) setDropTargetImageId(item.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
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
                        onDragEnd={() => setDropTargetImageId(null)}
                        className="group relative aspect-[4/3] cursor-grab bg-slate-200 active:cursor-grabbing"
                      >
                        {item.isHeic ? (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 px-4 text-center">
                            <div>
                              <p className="text-sm font-medium text-slate-700">Preview indisponível</p>
                              <p className="mt-1 text-xs text-slate-500">HEIC/HEIF será convertido no processamento.</p>
                            </div>
                          </div>
                        ) : previewSrc ? (
                          <img
                            src={previewSrc}
                            alt={item.alt || item.fileName}
                            draggable={false}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 px-4 text-center">
                            <p className="text-xs text-slate-500">Preview indisponível</p>
                          </div>
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
                            ? `Característica: ${filteredCaracteristicas.find((entry) => entry.chave === item.caracteristica)?.label_pt ?? item.caracteristica}`
                            : "Sem característica - clique para definir"}
                        </button>
                      </div>
                    </article>
                  );
                  })}
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

          {activeBlock === 7 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
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
                    const formData = new FormData();
                    formData.append("youtube_url", normalized);
                    formData.append("ordem", String(imagemItems.length + youtubeVideos.length));
                    if (title?.trim()) {
                      formData.append("titulo", title.trim());
                    }
                    const addResult = await apiFetchWithAuth<{ id: string }>(
                      `/api/empreendimentos/${id}/midia`,
                      {
                        method: "POST",
                        body: formData,
                      },
                    );
                    setAddingYoutube(false);
                    if (!addResult.ok) {
                      setError(addResult.error);
                      return;
                    }
                    setYoutubeUrlInput("");
                    setYoutubeVideos((current) => [
                      ...current,
                      { id: addResult.data.id, midiaId: addResult.data.id, url: normalized, videoId, title },
                    ]);
                    await refreshMedia();
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
                              onClick={async () => {
                                const next = [...youtubeVideos];
                                const prev = next[index - 1];
                                next[index - 1] = next[index];
                                next[index] = prev;
                                setYoutubeVideos(next);
                                await persistMediaOrder(imagemItems, next);
                                await refreshMedia();
                              }}
                              className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Subir vídeo"
                            >
                              <CaretUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={index === youtubeVideos.length - 1}
                              onClick={async () => {
                                const next = [...youtubeVideos];
                                const after = next[index + 1];
                                next[index + 1] = next[index];
                                next[index] = after;
                                setYoutubeVideos(next);
                                await persistMediaOrder(imagemItems, next);
                                await refreshMedia();
                              }}
                              className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Descer vídeo"
                            >
                              <CaretDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void removeYoutubeById(item.id);
                              }}
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
                          onBlur={() => {
                            const latest = imagemItems.find((item) => item.id === current.id);
                            if (latest) void persistImageMetadata(latest);
                          }}
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
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setImagemItems((items) =>
                              items.map((item) =>
                                item.id === current.id
                                  ? { ...item, caracteristica: nextValue }
                                  : item,
                              ),
                            );
                            const next = { ...current, caracteristica: nextValue };
                            void persistImageMetadata(next);
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="">Selecionar característica</option>
                          {filteredCaracteristicas.map((caracteristica) => (
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
                          onBlur={() => {
                            const latest = imagemItems.find((item) => item.id === current.id);
                            if (latest) void persistImageMetadata(latest);
                          }}
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

          {editingTipoPlanta ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-lg text-slate-900">Editar planta do tipo</h4>
                  <button
                    type="button"
                    onClick={() => setEditingTipoPlanta(null)}
                    className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>
                {(() => {
                  const tipo = tiposCadastro.find((item) => item.id === editingTipoPlanta.tipoId);
                  const planta = tipo?.plantas.find((item) => item.id === editingTipoPlanta.plantaId);
                  if (!tipo || !planta) {
                    return <p className="text-sm text-slate-500">Planta não encontrada.</p>;
                  }
                  const plantaThumbUrl = buildThumbUrl(planta.url);
                  return (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {plantaThumbUrl ? (
                          <img
                            src={plantaThumbUrl}
                            alt={planta.alt || tipo.nome || "Planta"}
                            className="h-52 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-52 w-full items-center justify-center px-3 text-center text-sm text-slate-500">
                            Preview indisponível
                          </div>
                        )}
                      </div>
                      <label className="block">
                        <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                          Legenda
                          <InfoTooltip text="Legenda aparece junto da planta em contextos de galeria e apresentação do tipo." />
                        </span>
                        <input
                          value={planta.legenda}
                          onChange={(event) =>
                            updateTipoCadastroPlantaField(
                              tipo.id,
                              planta.id,
                              "legenda",
                              event.target.value,
                            )
                          }
                          placeholder="Ex.: Planta tipo final 03"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                          Texto alternativo (alt)
                          <InfoTooltip text="Texto alternativo descritivo da planta para acessibilidade e SEO." />
                        </span>
                        <textarea
                          value={planta.alt}
                          onChange={(event) =>
                            updateTipoCadastroPlantaField(
                              tipo.id,
                              planta.id,
                              "alt",
                              event.target.value,
                            )
                          }
                          rows={3}
                          placeholder="Ex.: Planta humanizada com 2 dormitórios e varanda"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            void removeTipoCadastroPlanta(tipo.id, planta.id);
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          <Trash size={12} />
                          Remover planta
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : null}

          {pendingTipoDeleteId ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-lg text-slate-900">Remover tipo cadastrado</h4>
                  <button
                    type="button"
                    onClick={() => setPendingTipoDeleteId(null)}
                    className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mb-3 text-sm text-slate-600">
                  Este tipo possui dados salvos. Ao remover, as plantas vinculadas também serão removidas da tela.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingTipoDeleteId(null)}
                    className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => performRemoveTipoCadastroItem(pendingTipoDeleteId)}
                    className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Confirmar remoção
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {activeBlock === 8 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span />
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
                    setForm((current) => ({
                      ...current,
                      descricao: (event.target as HTMLDivElement).innerHTML,
                    }))
                  }
                  className="min-h-[340px] rounded-b-lg border border-slate-300 px-3 py-3 text-sm leading-7 outline-none focus:border-[var(--blue-slate)] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1.5"
                  style={{ whiteSpace: "pre-wrap" }}
                />
                <p
                  className={`mt-2 text-xs ${
                    htmlToPlainText(form.descricao).length > MAX_DESCRICAO_EMPREENDIMENTO_CHARS
                      ? "text-rose-600"
                      : "text-slate-500"
                  }`}
                >
                  Caracteres: {htmlToPlainText(form.descricao).length}/{MAX_DESCRICAO_EMPREENDIMENTO_CHARS} (sem contar tags HTML)
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1 inline-flex items-center gap-1 text-sm text-slate-600">
                    Short Description
                    <span title="Resumo curto do empreendimento. Usado em listagens e snippets.">
                      <Info size={14} className="text-slate-400" />
                    </span>
                  </span>
                  <textarea
                    rows={2}
                    value={form.resumo_curto}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, resumo_curto: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </section>
          ) : null}
        </Card>
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
                  {gerandoDescricaoAyka ? "Gerando descrição..." : "Gerar descrição com Ayka"}
                </button>
              ) : <span />}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`sticky bottom-4 z-40 mt-8 ${hasPendingChanges && saveNudgeActive ? "wobble-hor-bottom" : ""}`}>
        <div className="flex items-center justify-between gap-3 rounded-full border border-slate-200 bg-white/95 px-5 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
          <p
            className={`text-sm font-medium ${
              hasPendingChanges
                ? "text-amber-700"
                : "text-slate-500"
            }`}
          >
            {hasPendingChanges ? "Alterações pendentes para salvar." : "Sem alterações pendentes."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={savingBlock || savingStatus || !hasPendingChanges}
              onClick={handleDiscardChanges}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Descartar alterações
            </button>
            <button
              type="button"
              disabled={savingBlock || savingStatus || !hasPendingChanges}
              onClick={() => void handleSave(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {savingBlock ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              disabled={savingBlock || savingStatus || !hasPendingChanges}
              onClick={() => void handleSave(true)}
              className="rounded-full bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingBlock ? "Salvando..." : "Salvar e fechar"}
            </button>
          </div>
        </div>
      </div>

      {showPublicationChecklistModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Pendências para publicar</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Revise os itens abaixo antes de publicar o empreendimento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPublicationChecklistModal(false)}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {publicationChecklistIssues.map((issue) => (
                <li key={issue} className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPublicationChecklistModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteEmpreendimentoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Excluir empreendimento</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Esta ação remove o empreendimento e todos os dados associados (mídias, tipos, plantas e metadados) da sua base.
                  Não pode ser desfeita.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteEmpreendimentoConfirmText("");
                  setShowDeleteEmpreendimentoModal(false);
                }}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            {hasLinkedImoveis ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Não é possível excluir: existem {imoveisVinculadosCount} imóvel(is) vinculado(s).
              </p>
            ) : (
              <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-sm text-slate-700">
                  Digite <strong>excluir</strong> para confirmar:
                </span>
                <input
                  value={deleteEmpreendimentoConfirmText}
                  onChange={(event) => setDeleteEmpreendimentoConfirmText(event.target.value)}
                  placeholder="excluir"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                />
              </label>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteEmpreendimentoConfirmText("");
                  setShowDeleteEmpreendimentoModal(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  savingStatus ||
                  hasLinkedImoveis ||
                  deleteEmpreendimentoConfirmText.trim().toLowerCase() !== "excluir"
                }
                onClick={() => {
                  setDeleteEmpreendimentoConfirmText("");
                  setShowDeleteEmpreendimentoModal(false);
                  void handleDeleteEmpreendimento();
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingStatus ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUnsavedLeaveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <WarningCircle size={20} className="text-amber-600" />
                  Alterações pendentes
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Você tem alterações não salvas. Deseja salvar antes de sair?
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedLeaveModal(false);
                  setPendingNavigationHref(null);
                }}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedLeaveModal(false);
                  setPendingNavigationHref(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Continuar editando
              </button>
              <button
                type="button"
                disabled={savingBlock}
                onClick={handleDiscardAndLeaveFromModal}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Descartar e sair
              </button>
              <button
                type="button"
                disabled={savingBlock}
                onClick={() => void handleSaveAndLeaveFromModal()}
                className="rounded-lg bg-[var(--primary-scarlet)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingBlock ? "Salvando..." : "Salvar e sair"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {requiredFieldModalMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <WarningCircle size={20} className="text-amber-600" />
                  Campo obrigatório
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequiredFieldModalMessage(null)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-700">{requiredFieldModalMessage}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setRequiredFieldModalMessage(null)}
                className="rounded-xl bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {gerandoDescricaoAyka ? <AykaNeuralLoading /> : null}
      <style jsx>{`
        .obra-progress-range {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 9999px;
          border: 1px solid var(--grey-olive);
          background-color: transparent;
          cursor: pointer;
        }
        .obra-progress-range::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          height: 10px;
          background: transparent;
          border: 0;
          border-radius: 9999px;
        }
        .obra-progress-range::-moz-range-track {
          height: 10px;
          background: transparent;
          border: 0;
          border-radius: 9999px;
        }
        .obra-progress-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          margin-top: -6px;
          border-radius: 9999px;
          border: 2px solid white;
          background: var(--grey-olive);
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
        }
        .obra-progress-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          border: 2px solid white;
          background: var(--grey-olive);
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
        }
      `}</style>
    </AppShell>
  );
}
