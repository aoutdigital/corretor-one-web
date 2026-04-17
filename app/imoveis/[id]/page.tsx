"use client";

import {
  ArrowsOutCardinal,
  CaretLeft,
  CaretRight,
  CaretDown,
  CaretUp,
  Check,
  CircleNotch,
  Crown,
  DotsThreeVertical,
  Eye,
  House,
  ImageSquare,
  Images,
  Info,
  MapPin,
  Sparkle,
  Tag,
  TextB,
  Trash,
  UploadSimple,
  VideoCamera,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Card } from "flowbite-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { FloatingToastViewport, type FloatingToastItem } from "@/app/_components/floating-toast";
import { LongTextAykaEditor, type AykaConfig } from "@/app/_components/long-text-ayka-editor";
import { apiFetchWithAuth, getAccessToken } from "@/lib/client/auth-api";
import { buildImovelHeaderTitle as buildSharedImovelHeaderTitle } from "@/lib/imoveis/display-title";
import {
  buildImovelPublicSlug,
  resolveImovelPublicRouteSegment,
  type ImovelPublicUrlInput,
  willImovelPublicUrlChange,
} from "@/lib/imoveis/public-url";
import { formatAddressFromFields, replaceOrAppendAddressNumber } from "@/lib/location/address";

type Imovel = {
  id: string;
  codigo: string | null;
  slug_publico: string | null;
  titulo: string;
  descricao?: string | null;
  status: string;
  step_rascunho?: number | null;
  tipo: string;
  subtipo?: string | null;
  finalidade: string;
  empreendimento_id?: string | null;
  empreendimento_tipologia_label?: string | null;
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
  varandas?: number | null;
  vagas?: number | null;
  vaga_tipos?: string[] | null;
  vaga_tamanhos?: string[] | null;
  vaga_coberturas?: string[] | null;
  tipo_negociacao?: "VENDA" | "ALUGUEL" | "VENDA_E_ALUGUEL" | null;
  preco_venda?: number | null;
  preco_locacao?: number | null;
  condominio?: number | null;
  iptu?: number | null;
  iptu_periodicidade?: "MENSAL" | "ANUAL" | null;
  comissao_locacao?: string | null;
  comissao_venda_percentual?: number | null;
  minimo_aceito_em_maos?: number | null;
  aceita_permuta?: boolean | null;
  descricao_permuta?: string | null;
  veio_do_bolsao?: boolean | null;
  captacao_corretor_parceiro?: boolean | null;
  corretor_parceiro_nome?: string | null;
  corretor_parceiro_telefone?: string | null;
  corretor_parceiro_email?: string | null;
  comissao_captador_percentual?: number | null;
  comissao_vendedor_percentual?: number | null;
  exclusividade?: boolean | null;
  exclusividade_comissao_minha_percentual?: number | null;
  exclusividade_comissao_parceiro_percentual?: number | null;
  exclusividade_data_vencimento?: string | null;
  exclusividade_observacoes?: string | null;
  disponibilizar_no_bolsao_parceria?: boolean | null;
  bolsao_permitir_mudanca_preco?: boolean | null;
  bolsao_permitir_download_midia_kit?: boolean | null;
  bolsao_somente_visitas_agendadas?: boolean | null;
  bolsao_somente_visitas_com_minha_presenca?: boolean | null;
  aceite_corretor_exclusivo?: boolean | null;
  regra_geral_exclusividade?: string | null;
  aceita_parceria_status?: "SIM" | "NAO" | "SOB_ANALISE" | null;
  divisao_comissao_parceria?: string | null;
  caracteristicas?: string[] | null;
  logradouro?: string | null;
  numero?: string | null;
  endereco_complemento?: string | null;
  bairro_comercial?: string | null;
  enderecovisualizacao?: "END_SEM_COMPLEMENTO" | "END_COMPLETO" | "END_BAIRRO" | "END_SEM_NUMERO" | null;
  bairro?: string | null;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_json?: Record<string, unknown> | null;
  localizacao_contexto?: Record<string, unknown> | null;
  cidade: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

type ProfileResponse = {
  nickname?: string | null;
};

type PlacePrediction = {
  place_id: string;
  description: string;
};

type CaracteristicaCatalogoItem = {
  id: string;
  chave: string;
  label_pt: string;
  ativo?: boolean;
};

type ImovelMidiaItem = {
  midia_id: string;
  ordem?: number | null;
  url: string;
  storage_bucket: string;
  storage_path: string;
  tipo: "IMAGEM" | "VIDEO" | "PDF";
  titulo?: string | null;
  tamanho_bytes?: number | null;
  alt?: string | null;
  legenda?: string | null;
  caracteristica?: string | null;
};

type ImovelMidiaPublicaItem = {
  midia_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
  slug_publico: string;
  storage_bucket: string;
  storage_path: string;
};

type EmpreendimentoMidiaPublicaItem = {
  midia_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
  slug_publico: string;
  storage_bucket: string;
  storage_path: string;
};

const SUPABASE_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

type AykaDisponibilidadeResponse = {
  acao: string;
  detalhe: string;
  pode_executar: boolean;
};

type AykaDescricaoGeradaResponse = {
  raw_text: string;
  parsed: {
    descricao_html?: string;
  };
};

type EmpreendimentoCaracteristicasResponse = {
  id: string;
  nome?: string | null;
  tipo_uso?: string | null;
  descricao?: string | null;
  bairro_comercial?: string | null;
  localizacao_contexto?: Record<string, unknown> | null;
  caracteristica_ids?: string[] | null;
};

type DormitorioAmbienteForm = {
  local_id: string;
  area_m2: string;
  eh_suite: boolean;
  suite_principal: boolean;
  banheiro_armarios: boolean;
  banheiro_pia_dupla: boolean;
  banheiro_box: boolean;
  ar_condicionado: boolean;
  closet: boolean;
  armarios_planejados: boolean;
  tem_cama: boolean;
  tem_tv: boolean;
  tem_varanda: boolean;
  persiana_tipo: PersianaTipoValue | "";
  tipo_piso: AmbientePisoValue | "";
};

type CozinhaAmbienteForm = {
  local_id: string;
  area_m2: string;
  tipo_cozinha: CozinhaTipoValue | "";
  armarios_planejados: boolean;
  fogao: boolean;
  forno: boolean;
  geladeira: boolean;
  microondas: boolean;
  bancada: boolean;
  tipo_bancada: CozinhaBancadaValue | "";
  tipo_piso: AmbientePisoValue | "";
};

type SalaAmbienteForm = {
  local_id: string;
  area_m2: string;
  principal: boolean;
  tipo_sala: SalaTipoValue | "";
  layout: SalaLayoutValue | "";
  tipo_piso: AmbientePisoValue | "";
  diferenciais: SalaDiferencialValue[];
};

type VarandaAmbienteForm = {
  local_id: string;
  area_m2: string;
  tipo_varanda: VarandaTipoValue | "";
  churrasqueira_tipo: VarandaChurrasqueiraValue | "";
  bancada: boolean;
  persiana_tipo: PersianaTipoValue | "";
  fechada_com_vidro: boolean;
  ilha: boolean;
  fogao: boolean;
  frigobar: boolean;
  chopeira: boolean;
  tem_tv: boolean;
  tipo_piso: AmbientePisoValue | "";
};

type ImovelAmbienteApiItem = {
  id: string;
  tipo_ambiente: TipoAmbienteImovelValue;
  ordem: number;
  principal: boolean;
  area_m2: number | null;
  dados: Record<string, unknown>;
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

type YoutubeVideoDraftItem = {
  id: string;
  url: string;
  videoId: string;
  title: string | null;
};

type RejectedImageReason = "TAMANHO_PEQUENO" | "ACIMA_15MB" | "FORMATO_INVALIDO";

type RejectedImageDraftItem = {
  id: string;
  fileName: string;
  previewUrl: string | null;
  reasons: RejectedImageReason[];
};

type BlockItem = {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const EDIT_BLOCKS: BlockItem[] = [
  { step: 2, title: "Localização", description: "Endereço e contexto local", icon: MapPin },
  { step: 3, title: "Dados do imóvel", description: "Metragens e composição", icon: House },
  { step: 4, title: "Negociação", description: "Preços e regras comerciais", icon: Tag },
  { step: 5, title: "Detalhes dos ambientes", description: "Dormitórios, salas e cozinha", icon: Info },
  { step: 6, title: "Características", description: "Diferenciais do anúncio", icon: Sparkle },
  { step: 7, title: "Descrição", description: "Texto comercial com Ayka", icon: TextB },
  { step: 8, title: "Imagens", description: "Galeria e ordenação", icon: Images },
  { step: 9, title: "Vídeos", description: "Links de vídeo do anúncio", icon: VideoCamera },
];

type EditFormState = {
  titulo: string;
  finalidade: string;
  tipo: string;
  subtipo: string;
  logradouro: string;
  numero: string;
  endereco_complemento: string;
  bairro_comercial: string;
  enderecovisualizacao: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  localizacao_perfil_regiao: string[];
  localizacao_mobilidade: string[];
  localizacao_comercio_servicos: string[];
  localizacao_lazer_estilo_vida: string[];
  localizacao_resumo_local: string;
  area_total: string;
  area_util: string;
  area_terreno: string;
  frente_metros: string;
  fundos_metros: string;
  lateral_1_metros: string;
  lateral_2_metros: string;
  dormitorios: string;
  suites: string;
  banheiros: string;
  lavabos: string;
  salas: string;
  cozinhas: string;
  varandas: string;
  vagas: string;
  vaga_tipos: string[];
  vaga_tamanho: string;
  vaga_cobertura: string;
  tipo_negociacao: string;
  preco_venda: string;
  preco_locacao: string;
  condominio: string;
  iptu: string;
  iptu_periodicidade: string;
  comissao_locacao: string;
  comissao_venda_percentual: string;
  minimo_aceito_em_maos: string;
  aceita_permuta: boolean;
  descricao_permuta: string;
  modelo_captacao: ModeloCaptacaoValue;
  corretor_parceiro_nome: string;
  corretor_parceiro_telefone: string;
  corretor_parceiro_email: string;
  proprietario_nome: string;
  proprietario_telefone: string;
  proprietario_email: string;
  comissao_captador_percentual: string;
  comissao_vendedor_percentual: string;
  exclusividade_comissao_minha_percentual: string;
  exclusividade_comissao_parceiro_percentual: string;
  exclusividade_data_vencimento: string;
  exclusividade_observacoes: string;
  disponibilizar_no_bolsao_parceria: boolean;
  bolsao_permitir_mudanca_preco: boolean;
  bolsao_permitir_download_midia_kit: boolean;
  bolsao_somente_visitas_agendadas: boolean;
  bolsao_somente_visitas_com_minha_presenca: boolean;
  aceite_corretor_exclusivo: boolean;
  aceita_parceria_status: AceitaParceriaStatusValue | "";
  descricao: string;
};

const VAGA_TIPO_OPTIONS = [
  { value: "PRIVATIVA", label: "Privativa" },
  { value: "LIVRE", label: "Livre" },
  { value: "DEMARCADA", label: "Demarcada" },
] as const;

const VAGA_TAMANHO_OPTIONS = [
  { value: "PEQUENA", label: "Pequena" },
  { value: "MEDIA", label: "Média" },
  { value: "GRANDE", label: "Grande" },
] as const;

const VAGA_COBERTURA_OPTIONS = [
  { value: "COBERTA", label: "Coberta" },
  { value: "DESCOBERTA", label: "Descoberta" },
] as const;

const AMBIENTE_PISO_OPTIONS = [
  { value: "PORCELANATO", label: "Porcelanato" },
  { value: "CERAMICA", label: "Cerâmica" },
  { value: "LAMINADO", label: "Laminado" },
  { value: "VINILICO", label: "Vinílico" },
  { value: "MADEIRA", label: "Madeira" },
  { value: "CIMENTO_QUEIMADO", label: "Cimento queimado" },
  { value: "PEDRA_NATURAL", label: "Pedra natural" },
  { value: "OUTRO", label: "Outro" },
] as const;

const PERSIANA_TIPO_OPTIONS = [
  { value: "PADRAO", label: "Padrão" },
  { value: "AUTOMATIZADA", label: "Automatizada" },
] as const;

const COZINHA_TIPO_OPTIONS = [
  { value: "AMERICANA", label: "Americana" },
  { value: "INTEGRADA", label: "Integrada" },
  { value: "FECHADA", label: "Fechada" },
  { value: "GOURMET", label: "Gourmet" },
  { value: "ILHA", label: "Ilha" },
  { value: "CORREDOR", label: "Corredor" },
  { value: "OUTRO", label: "Outro" },
] as const;

const VARANDA_TIPO_OPTIONS = [
  { value: "VARANDA", label: "Varanda" },
  { value: "VARANDA_GOURMET", label: "Varanda gourmet" },
  { value: "TERRACO_GOURMET", label: "Terraço gourmet" },
] as const;

const VARANDA_CHURRASQUEIRA_OPTIONS = [
  { value: "ELETRICA", label: "Churrasqueira elétrica" },
  { value: "GAS", label: "Churrasqueira a gás" },
  { value: "CARVAO", label: "Churrasqueira a carvão" },
] as const;

const COZINHA_BANCADA_OPTIONS = [
  { value: "GRANITO", label: "Granito" },
  { value: "QUARTZO", label: "Quartzo" },
  { value: "MARMORE", label: "Mármore" },
  { value: "PORCELANATO", label: "Porcelanato" },
  { value: "SUPERFICIE_SOLIDA", label: "Superfície sólida" },
  { value: "ACO_INOX", label: "Aço inox" },
  { value: "MADEIRA", label: "Madeira" },
  { value: "CONCRETO", label: "Concreto" },
  { value: "OUTRO", label: "Outro" },
] as const;

const SALA_TIPO_OPTIONS = [
  { value: "ESTAR", label: "Estar" },
  { value: "JANTAR", label: "Jantar" },
  { value: "TV", label: "TV" },
  { value: "HOME_THEATER", label: "Home theater" },
  { value: "LIVING_AMPLIADO", label: "Living ampliado" },
  { value: "INTEGRADA_COM_VARANDA", label: "Integrada com varanda" },
  { value: "INTEGRADA_COM_COZINHA", label: "Integrada com cozinha" },
  { value: "ESCRITORIO", label: "Escritório" },
  { value: "OUTRO", label: "Outro" },
] as const;

const SALA_LAYOUT_OPTIONS = [
  { value: "INTEGRADA", label: "Integrada" },
  { value: "SEPARADA", label: "Separada" },
  { value: "CONCEITO_ABERTO", label: "Conceito aberto" },
  { value: "DOIS_AMBIENTES", label: "Dois ambientes" },
  { value: "TRES_AMBIENTES", label: "Três ambientes" },
  { value: "OUTRO", label: "Outro" },
] as const;

const SALA_DIFERENCIAL_OPTIONS = [
  { value: "PE_DIREITO_DUPLO", label: "Pé-direito duplo" },
  { value: "VARANDA_INTEGRADA", label: "Varanda integrada" },
  { value: "LAREIRA", label: "Lareira" },
  { value: "AR_CONDICIONADO", label: "Ar-condicionado" },
  { value: "ILUMINACAO_PLANEJADA", label: "Iluminação planejada" },
  { value: "PAINEL_PLANEJADO", label: "Painel planejado" },
  { value: "OUTRO", label: "Outro" },
] as const;

const TERRAIN_APPLICABLE_TYPES = new Set([
  "CASA",
  "CASA_DE_CONDOMINIO",
  "CASA_DE_VILA",
  "CASA_COMERCIAL",
  "FAZENDA_SITIO_CHACARA",
  "GALPAO_DEPOSITO_ARMAZEM",
  "HOTEL_MOTEL_POUSADA",
  "LOTE_TERRENO",
  "PONTO_COMERCIAL_LOJA_BOX",
  "SHOPPING",
  "PREDIO_EDIFICIO_INTEIRO",
  "SELF_STORAGE",
]);

const COMMERCIAL_TIPO_IMOVEL = new Set([
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "GALPAO_DEPOSITO_ARMAZEM",
  "HOTEL_MOTEL_POUSADA",
  "PONTO_COMERCIAL_LOJA_BOX",
  "PREDIO_EDIFICIO_INTEIRO",
  "SHOPPING",
  "SELF_STORAGE",
]);

const ENDERECO_VISUALIZACAO_OPTIONS = [
  { value: "END_SEM_COMPLEMENTO", label: "Endereço sem o complemento" },
  { value: "END_COMPLETO", label: "Endereço completo" },
  { value: "END_BAIRRO", label: "Endereço até o bairro" },
  { value: "END_SEM_NUMERO", label: "Endereço sem número" },
] as const;

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

const TIPO_NEGOCIACAO_OPTIONS = [
  { value: "VENDA", label: "Venda" },
  { value: "VENDA_E_ALUGUEL", label: "Venda e aluguel" },
  { value: "ALUGUEL", label: "Aluguel" },
] as const;

const ACEITA_PARCERIA_STATUS_OPTIONS = [
  { value: "SIM", label: "Sim" },
  { value: "NAO", label: "Não" },
  { value: "SOB_ANALISE", label: "Sob análise" },
] as const;

const EXCLUSIVIDADE_TOOLTIP = {
  vencimento:
    "Data limite da exclusividade. Use uma data futura para definir até quando o imóvel fica sob sua captação exclusiva.",
  aceiteCorretor:
    "Confirma que você tem autorização para anunciar este imóvel como captação exclusiva e que assume as regras desse modelo.",
  aceitaParceria:
    "Define se sua exclusividade permite atuação conjunta com outro corretor. Com 'Não', os campos de parceria e bolsão ficam bloqueados.",
  aceitaParceriaSemExclusividade:
    "Define se esta captação sem exclusividade permite atuação conjunta com outro corretor. Com 'Não', os campos de parceria ficam bloqueados.",
  minhaComissao:
    "Percentual do ganho da comissão de venda que ficará com você. Exemplo: em uma divisão 50/50, informe 50,00.",
  parceiroComissaoAutomatica:
    "Calculado automaticamente como complemento para 100% da divisão da parceria. Não precisa editar manualmente.",
  bolsao:
    "Ao ativar, o imóvel pode ser ofertado para parceiros no bolsão de exclusividade com as regras definidas abaixo. O vencimento da exclusividade deve ter no mínimo 75 dias a partir de hoje.",
  regraMudancaPreco:
    "Permite que parceiros proponham ajustes de preço na negociação. Sem esta permissão, alterações dependem só do captador.",
  regraDownloadMidiaKit:
    "Autoriza parceiros a baixar fotos e materiais do imóvel para divulgação. Mantenha desligado se quiser controle total da mídia.",
  regraSomenteAgendada:
    "Exige agendamento prévio para qualquer visita. Evita visitas sem alinhamento e melhora segurança operacional.",
  regraComPresenca:
    "Determina que visitas presenciais ocorram apenas com sua participação direta, mesmo quando o lead vier por parceiro.",
} as const;

const BOLSAO_EXCLUSIVIDADE_MIN_DIAS = 75;
const MAX_DESCRICAO_IMOVEL_CHARS = 2500;
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_YOUTUBE_VIDEOS = 3;
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
type AceitaParceriaStatusValue = (typeof ACEITA_PARCERIA_STATUS_OPTIONS)[number]["value"];
type ModeloCaptacaoValue = "" | "PARCERIA" | "CAPTACAO_SEM_EXCLUSIVIDADE" | "EXCLUSIVIDADE";
type AmbientePisoValue = (typeof AMBIENTE_PISO_OPTIONS)[number]["value"];
type PersianaTipoValue = (typeof PERSIANA_TIPO_OPTIONS)[number]["value"];
type CozinhaTipoValue = (typeof COZINHA_TIPO_OPTIONS)[number]["value"];
type CozinhaBancadaValue = (typeof COZINHA_BANCADA_OPTIONS)[number]["value"];
type VarandaTipoValue = (typeof VARANDA_TIPO_OPTIONS)[number]["value"];
type VarandaChurrasqueiraValue =
  | "NAO_TEM"
  | (typeof VARANDA_CHURRASQUEIRA_OPTIONS)[number]["value"];
type SalaTipoValue = (typeof SALA_TIPO_OPTIONS)[number]["value"];
type SalaLayoutValue = (typeof SALA_LAYOUT_OPTIONS)[number]["value"];
type SalaDiferencialValue = (typeof SALA_DIFERENCIAL_OPTIONS)[number]["value"];
type TipoAmbienteImovelValue = "DORMITORIO" | "COZINHA" | "SALA" | "VARANDA";

function numberToInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function numberToPercentInput(value: number | null | undefined) {
  if (value == null) return "";
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatIsoDateToPtBr(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function parseOptionalInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) return { ok: true as const, value: null };
  if (!/^\d+$/.test(normalized)) return { ok: false as const, error: "Use apenas números inteiros." };
  return { ok: true as const, value: Number(normalized) };
}

function parseOptionalDecimal(value: string) {
  let normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return { ok: true as const, value: null };
  normalized = normalized.replace(/[^0-9.,]/g, "");
  if (!normalized) return { ok: true as const, value: null };

  if (/[,.]$/.test(normalized)) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized) return { ok: true as const, value: null };

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false as const, error: "Use um número válido." };
  return { ok: true as const, value: Number(normalized) };
}

function formatThousandGroupsPtBr(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function sanitizeDecimalPtBrInput(value: string) {
  const cleaned = value.replace(/[^0-9.,]/g, "");
  if (!cleaned) return "";

  if (cleaned.includes(",")) {
    const commaIndex = cleaned.indexOf(",");
    const intPart = formatThousandGroupsPtBr(cleaned.slice(0, commaIndex));
    const decPart = cleaned.slice(commaIndex + 1).replace(/\D/g, "").slice(0, 2);
    return decPart.length > 0 ? `${intPart},${decPart}` : `${intPart},`;
  }

  return formatThousandGroupsPtBr(cleaned);
}

function normalizeDecimalPtBrInput(value: string, fractionDigits = 2) {
  if (!value.trim()) return "";
  const parsed = parseOptionalDecimal(value);
  if (!parsed.ok || parsed.value == null) return value;
  return parsed.value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}

function parseOptionalCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { ok: true as const, value: null };
  return { ok: true as const, value: Number(digits) };
}

function sanitizePercentInput(value: string) {
  const raw = value.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  const hasComma = raw.includes(",");
  const [rawInt = "", rawDec = ""] = raw.split(",");
  const intPart = rawInt.slice(0, 3);
  const decPart = rawDec.slice(0, 2);
  return hasComma ? `${intPart},${decPart}` : intPart;
}

function parseOptionalPercent(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return { ok: true as const, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { ok: false as const, error: "Use percentual válido (0 a 100)." };
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return { ok: false as const, error: "Use percentual entre 0 e 100." };
  }
  return { ok: true as const, value: parsed };
}

function normalizePercentInput(value: string) {
  if (!value.trim()) return "";
  const parsed = parseOptionalPercent(value);
  if (!parsed.ok || parsed.value == null) return value;
  return numberToPercentInput(parsed.value);
}

function formatCurrencyValue(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPhoneDisplay(input: string) {
  const digitsRaw = input.replace(/\D/g, "");
  const localDigits =
    digitsRaw.startsWith("55") && digitsRaw.length >= 12 ? digitsRaw.slice(2) : digitsRaw;
  const digits = localDigits.slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isTipoNegociacao(value: string): value is (typeof TIPO_NEGOCIACAO_OPTIONS)[number]["value"] {
  return TIPO_NEGOCIACAO_OPTIONS.some((option) => option.value === value);
}

function isAceitaParceriaStatus(value: string): value is AceitaParceriaStatusValue {
  return ACEITA_PARCERIA_STATUS_OPTIONS.some((option) => option.value === value);
}

function isAmbientePiso(value: string): value is AmbientePisoValue {
  return AMBIENTE_PISO_OPTIONS.some((option) => option.value === value);
}

function isPersianaTipo(value: string): value is PersianaTipoValue {
  return PERSIANA_TIPO_OPTIONS.some((option) => option.value === value);
}

function isCozinhaTipo(value: string): value is CozinhaTipoValue {
  return COZINHA_TIPO_OPTIONS.some((option) => option.value === value);
}

function isCozinhaBancada(value: string): value is CozinhaBancadaValue {
  return COZINHA_BANCADA_OPTIONS.some((option) => option.value === value);
}

function isVarandaTipo(value: string): value is VarandaTipoValue {
  return VARANDA_TIPO_OPTIONS.some((option) => option.value === value);
}

function isVarandaChurrasqueira(value: string): value is VarandaChurrasqueiraValue {
  return VARANDA_CHURRASQUEIRA_OPTIONS.some((option) => option.value === value);
}

function isSalaTipo(value: string): value is SalaTipoValue {
  return SALA_TIPO_OPTIONS.some((option) => option.value === value);
}

function isSalaLayout(value: string): value is SalaLayoutValue {
  return SALA_LAYOUT_OPTIONS.some((option) => option.value === value);
}

function isSalaDiferencial(value: string): value is SalaDiferencialValue {
  return SALA_DIFERENCIAL_OPTIONS.some((option) => option.value === value);
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDormitorioAmbiente(): DormitorioAmbienteForm {
  return {
    local_id: createLocalId("dorm"),
    area_m2: "",
    eh_suite: false,
    suite_principal: false,
    banheiro_armarios: false,
    banheiro_pia_dupla: false,
    banheiro_box: false,
    ar_condicionado: false,
    closet: false,
    armarios_planejados: false,
    tem_cama: false,
    tem_tv: false,
    tem_varanda: false,
    persiana_tipo: "",
    tipo_piso: "",
  };
}

function createCozinhaAmbiente(): CozinhaAmbienteForm {
  return {
    local_id: createLocalId("coz"),
    area_m2: "",
    tipo_cozinha: "",
    armarios_planejados: false,
    fogao: false,
    forno: false,
    geladeira: false,
    microondas: false,
    bancada: false,
    tipo_bancada: "",
    tipo_piso: "",
  };
}

function createSalaAmbiente(): SalaAmbienteForm {
  return {
    local_id: createLocalId("sala"),
    area_m2: "",
    principal: false,
    tipo_sala: "",
    layout: "",
    tipo_piso: "",
    diferenciais: [],
  };
}

function createVarandaAmbiente(): VarandaAmbienteForm {
  return {
    local_id: createLocalId("var"),
    area_m2: "",
    tipo_varanda: "",
    churrasqueira_tipo: "",
    bancada: false,
    persiana_tipo: "",
    fechada_com_vidro: false,
    ilha: false,
    fogao: false,
    frigobar: false,
    chopeira: false,
    tem_tv: false,
    tipo_piso: "",
  };
}

function resizeAmbientes<T>(current: T[], targetSize: number, factory: () => T): T[] {
  const nextTarget = Math.max(0, targetSize);
  if (current.length === nextTarget) return current;
  if (current.length > nextTarget) return current.slice(0, nextTarget);

  const next = [...current];
  while (next.length < nextTarget) {
    next.push(factory());
  }
  return next;
}

function formatMetersValue(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} m`;
}

function computeTerrenoAreaFromMedidas(params: {
  frente: number | null;
  fundo: number | null;
  lateral1: number | null;
  lateral2: number | null;
}) {
  const largura = [params.frente, params.fundo].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  const profundidade = [params.lateral1, params.lateral2].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );

  if (largura.length === 0 || profundidade.length === 0) return null;

  const larguraMedia = largura.reduce((acc, value) => acc + value, 0) / largura.length;
  const profundidadeMedia = profundidade.reduce((acc, value) => acc + value, 0) / profundidade.length;
  const area = larguraMedia * profundidadeMedia;
  if (!Number.isFinite(area) || area <= 0) return null;
  return area;
}

function toNonNegativeIntegerOrZero(value: string) {
  const parsed = parseOptionalInteger(value);
  if (!parsed.ok || parsed.value == null) return 0;
  return Math.max(0, parsed.value);
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase() === "false" || trimmed.toLowerCase() === "true") return "";
  return trimmed;
}

function normalizeBairroComercial(value: unknown, fallbackBairro: unknown) {
  if (typeof value === "boolean") {
    if (value && typeof fallbackBairro === "string") return fallbackBairro.trim();
    return "";
  }
  return normalizeOptionalText(value);
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

function toEditForm(item: Imovel): EditFormState {
  const localizacaoContexto =
    item.localizacao_contexto && typeof item.localizacao_contexto === "object" && !Array.isArray(item.localizacao_contexto)
      ? (item.localizacao_contexto as Record<string, unknown>)
      : {};
  const parceriaStatus = item.aceita_parceria_status ?? "";
  const contatoNome = item.corretor_parceiro_nome ?? "";
  const contatoTelefone = formatPhoneDisplay(item.corretor_parceiro_telefone ?? "");
  const contatoEmail = item.corretor_parceiro_email ?? "";
  const hasContatoPreenchido =
    contatoNome.trim().length > 0 || contatoTelefone.trim().length > 0 || contatoEmail.trim().length > 0;
  const modeloCaptacaoLoaded: ModeloCaptacaoValue = item.captacao_corretor_parceiro
    ? "PARCERIA"
    : item.exclusividade
      ? "EXCLUSIVIDADE"
      : hasContatoPreenchido
        ? "CAPTACAO_SEM_EXCLUSIVIDADE"
        : "";

  return {
    titulo: item.titulo ?? "",
    finalidade: item.finalidade ?? "COMPRAR",
    tipo: item.tipo ?? "APARTAMENTO",
    subtipo: item.subtipo ?? "",
    logradouro: item.logradouro ?? "",
    numero: item.numero ?? "",
    endereco_complemento: normalizeOptionalText(item.endereco_complemento),
    bairro_comercial: normalizeBairroComercial(
      item.bairro_comercial ?? (item.address_json as Record<string, unknown> | null)?.bairro_comercial,
      item.bairro,
    ),
    enderecovisualizacao: item.enderecovisualizacao ?? "END_SEM_COMPLEMENTO",
    bairro: item.bairro ?? "",
    cidade: item.cidade ?? "",
    estado: item.estado ?? "SP",
    cep: item.cep ?? "",
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
    area_total: normalizeDecimalPtBrInput(numberToInput(item.area_total)),
    area_util: normalizeDecimalPtBrInput(numberToInput(item.area_util)),
    area_terreno: normalizeDecimalPtBrInput(numberToInput(item.area_terreno)),
    frente_metros: normalizeDecimalPtBrInput(numberToInput(item.frente_metros)),
    fundos_metros: normalizeDecimalPtBrInput(numberToInput(item.fundos_metros)),
    lateral_1_metros: normalizeDecimalPtBrInput(numberToInput(item.lateral_1_metros)),
    lateral_2_metros: normalizeDecimalPtBrInput(numberToInput(item.lateral_2_metros)),
    dormitorios: numberToInput(item.dormitorios),
    suites: numberToInput(item.suites),
    banheiros: numberToInput(item.banheiros),
    lavabos: numberToInput(item.lavabos),
    salas: numberToInput(item.salas),
    cozinhas: numberToInput(item.cozinhas),
    varandas: numberToInput(item.varandas),
    vagas: numberToInput(item.vagas),
    vaga_tipos: Array.isArray(item.vaga_tipos)
      ? item.vaga_tipos.filter((value): value is string =>
          VAGA_TIPO_OPTIONS.some((option) => option.value === value),
        )
      : [],
    vaga_tamanho:
      Array.isArray(item.vaga_tamanhos) && item.vaga_tamanhos.length > 0
        ? VAGA_TAMANHO_OPTIONS.some((option) => option.value === item.vaga_tamanhos?.[0])
          ? (item.vaga_tamanhos?.[0] ?? "")
          : ""
        : "",
    vaga_cobertura:
      Array.isArray(item.vaga_coberturas) && item.vaga_coberturas.length > 0
        ? VAGA_COBERTURA_OPTIONS.some((option) => option.value === item.vaga_coberturas?.[0])
          ? (item.vaga_coberturas?.[0] ?? "")
          : ""
        : "",
    tipo_negociacao: item.tipo_negociacao ?? "VENDA",
    preco_venda: formatCurrencyInput(numberToInput(item.preco_venda)),
    preco_locacao: formatCurrencyInput(numberToInput(item.preco_locacao)),
    condominio: formatCurrencyInput(numberToInput(item.condominio)),
    iptu: formatCurrencyInput(numberToInput(item.iptu)),
    iptu_periodicidade: item.iptu_periodicidade ?? "ANUAL",
    comissao_locacao: item.comissao_locacao ?? "",
    comissao_venda_percentual: numberToPercentInput(item.comissao_venda_percentual),
    minimo_aceito_em_maos: formatCurrencyInput(numberToInput(item.minimo_aceito_em_maos)),
    aceita_permuta: Boolean(item.aceita_permuta),
    descricao_permuta: item.descricao_permuta ?? "",
    modelo_captacao: modeloCaptacaoLoaded,
    corretor_parceiro_nome: modeloCaptacaoLoaded === "PARCERIA" ? contatoNome : "",
    corretor_parceiro_telefone: modeloCaptacaoLoaded === "PARCERIA" ? contatoTelefone : "",
    corretor_parceiro_email: modeloCaptacaoLoaded === "PARCERIA" ? contatoEmail : "",
    proprietario_nome: modeloCaptacaoLoaded === "PARCERIA" ? "" : contatoNome,
    proprietario_telefone: modeloCaptacaoLoaded === "PARCERIA" ? "" : contatoTelefone,
    proprietario_email: modeloCaptacaoLoaded === "PARCERIA" ? "" : contatoEmail,
    comissao_captador_percentual: numberToPercentInput(item.comissao_captador_percentual),
    comissao_vendedor_percentual: numberToPercentInput(item.comissao_vendedor_percentual),
    exclusividade_comissao_minha_percentual: numberToPercentInput(item.exclusividade_comissao_minha_percentual),
    exclusividade_comissao_parceiro_percentual: numberToPercentInput(item.exclusividade_comissao_parceiro_percentual),
    exclusividade_data_vencimento: item.exclusividade_data_vencimento ?? "",
    exclusividade_observacoes: item.exclusividade_observacoes ?? "",
    disponibilizar_no_bolsao_parceria: Boolean(item.disponibilizar_no_bolsao_parceria),
    bolsao_permitir_mudanca_preco: Boolean(item.bolsao_permitir_mudanca_preco),
    bolsao_permitir_download_midia_kit: Boolean(item.bolsao_permitir_download_midia_kit),
    bolsao_somente_visitas_agendadas: Boolean(item.bolsao_somente_visitas_agendadas),
    bolsao_somente_visitas_com_minha_presenca: Boolean(item.bolsao_somente_visitas_com_minha_presenca),
    aceite_corretor_exclusivo: Boolean(item.aceite_corretor_exclusivo),
    aceita_parceria_status: isAceitaParceriaStatus(parceriaStatus) ? parceriaStatus : "",
    descricao: item.descricao ?? "",
  };
}

function buildGoogleMapsEmbedUrl(query: string) {
  const normalized = query.trim();
  if (!normalized) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(normalized)}&output=embed`;
}

function formatStatusLabel(status: string) {
  if (status === "RASCUNHO") return "Rascunho";
  if (status === "PUBLICADO") return "Publicado";
  if (status === "PAUSADO") return "Pausado";
  if (status === "VENDIDO") return "Vendido";
  if (status === "ALUGADO") return "Alugado";
  if (status === "INATIVO") return "Inativo";
  return status;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatTipo(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAddress(item: Imovel) {
  const rua = [item.logradouro?.trim(), item.numero?.trim()].filter(Boolean).join(", ");
  const local = [item.bairro?.trim(), [item.cidade?.trim(), item.estado?.trim()].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(" • ");
  return [rua, local].filter(Boolean).join(" • ") || `${item.cidade}/${item.estado}`;
}

function buildImovelHeaderTitle(item: Imovel) {
  return buildSharedImovelHeaderTitle(item);
}

function extractBairroComercialFromAddressJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const bairroComercial = (value as Record<string, unknown>).bairro_comercial;
  return typeof bairroComercial === "string" ? bairroComercial.trim() : "";
}

function buildImovelPublicUrlInput(
  base: Imovel,
  payload?: Record<string, unknown>,
): ImovelPublicUrlInput {
  const getValue = (key: keyof ImovelPublicUrlInput): unknown => {
    if (payload && Object.prototype.hasOwnProperty.call(payload, key)) return payload[key];
    return (base as unknown as Record<string, unknown>)[key];
  };

  const addressJson = payload && Object.prototype.hasOwnProperty.call(payload, "address_json")
    ? payload.address_json
    : base.address_json;

  const bairroComercialFromPayload = payload && Object.prototype.hasOwnProperty.call(payload, "bairro_comercial")
    ? normalizeOptionalText(payload.bairro_comercial)
    : "";
  const bairroComercialFromAddress = extractBairroComercialFromAddressJson(addressJson);
  const bairroComercial = bairroComercialFromPayload || bairroComercialFromAddress || normalizeOptionalText(base.bairro_comercial);

  const empreendimentoNomeFromPayload =
    payload && Object.prototype.hasOwnProperty.call(payload, "empreendimento_nome")
      ? normalizeOptionalText(payload.empreendimento_nome)
      : "";
  const empreendimentoNomeFromBase = normalizeOptionalText(
    (base as unknown as { empreendimento_nome?: string | null }).empreendimento_nome,
  );

  return {
    finalidade: getValue("finalidade"),
    tipo_negociacao: getValue("tipo_negociacao"),
    estado: getValue("estado"),
    cidade: getValue("cidade"),
    bairro: getValue("bairro"),
    bairro_comercial: bairroComercial || null,
    tipo: getValue("tipo"),
    subtipo: getValue("subtipo"),
    dormitorios: getValue("dormitorios"),
    suites: getValue("suites"),
    salas: getValue("salas"),
    area_util: getValue("area_util"),
    area_total: getValue("area_total"),
    area_terreno: getValue("area_terreno"),
    vagas: getValue("vagas"),
    empreendimento_nome: empreendimentoNomeFromPayload || empreendimentoNomeFromBase || null,
    codigo: getValue("codigo"),
  };
}

function buildThumbUrl(url: string | null) {
  if (!url) return null;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const separator = transformed.includes("?") ? "&" : "?";
  return `${transformed}${separator}width=560&height=360&quality=70&resize=cover`;
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

async function getImageDimensionsClient(
  file: File,
): Promise<{ width: number; height: number } | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new window.Image();
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
      const img = new window.Image();
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
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.split("/")[2] ?? null;
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
    const payload = (await response.json()) as { title?: string };
    return payload.title?.trim() || null;
  } catch {
    return null;
  }
}

function serializeMidiasSnapshot(midias: ImageDraftItem[]) {
  return JSON.stringify(
    midias.map((item) => ({
      midiaId: item.midiaId,
      alt: item.alt,
      legenda: item.legenda,
      caracteristica: item.caracteristica,
      fileName: item.fileName,
      sizeBytes: item.sizeBytes,
    })),
  );
}

function serializeYoutubeVideosSnapshot(videos: YoutubeVideoDraftItem[]) {
  return JSON.stringify(videos.map((item) => item.url));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function htmlToPlainText(value: string) {
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function serializeCaracteristicasSnapshot(caracteristicas: string[]) {
  const normalized = [...new Set(caracteristicas.map((item) => item.trim()).filter((item) => item.length > 0))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );
  return JSON.stringify(normalized);
}

function serializeAmbientesSnapshot(params: {
  qtdDormitorios: string;
  qtdCozinhas: string;
  qtdSalas: string;
  qtdVarandas: string;
  dormitorios: DormitorioAmbienteForm[];
  cozinhas: CozinhaAmbienteForm[];
  salas: SalaAmbienteForm[];
  varandas: VarandaAmbienteForm[];
}) {
  return JSON.stringify({
    qtdDormitorios: params.qtdDormitorios,
    qtdCozinhas: params.qtdCozinhas,
    qtdSalas: params.qtdSalas,
    qtdVarandas: params.qtdVarandas,
    dormitorios: params.dormitorios.map(({ local_id, ...rest }) => rest),
    cozinhas: params.cozinhas.map(({ local_id, ...rest }) => rest),
    salas: params.salas.map(({ local_id, ...rest }) => rest),
    varandas: params.varandas.map(({ local_id, ...rest }) => rest),
  });
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      aria-label={text}
      className="group relative inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-scarlet)]"
    >
      <Info size={11} weight="bold" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-2 text-[11px] leading-snug text-white shadow-lg group-hover:block group-focus:block">
        {text}
      </span>
    </span>
  );
}

export default function ImovelDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const headerActionsRef = useRef<HTMLDivElement | null>(null);
  const bypassUnsavedGuardRef = useRef(false);

  const [item, setItem] = useState<Imovel | null>(null);
  const [profileNickname, setProfileNickname] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showHeaderActionsMenu, setShowHeaderActionsMenu] = useState(false);
  const [showDeleteImovelModal, setShowDeleteImovelModal] = useState(false);
  const [deleteImovelConfirmText, setDeleteImovelConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBlock, setSavingBlock] = useState<number | null>(null);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const [showUnsavedLeaveModal, setShowUnsavedLeaveModal] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [saveNudgeActive, setSaveNudgeActive] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placeOptions, setPlaceOptions] = useState<PlacePrediction[]>([]);
  const [caracteristicasCatalogo, setCaracteristicasCatalogo] = useState<CaracteristicaCatalogoItem[]>([]);
  const [loadingCaracteristicasCatalogo, setLoadingCaracteristicasCatalogo] = useState(false);
  const [caracteristicaQuery, setCaracteristicaQuery] = useState("");
  const [caracteristicasSelecionadas, setCaracteristicasSelecionadas] = useState<string[]>([]);
  const [caracteristicasSnapshot, setCaracteristicasSnapshot] = useState("[]");
  const [empreendimentoCaracteristicasAssociadas, setEmpreendimentoCaracteristicasAssociadas] = useState<
    CaracteristicaCatalogoItem[]
  >([]);
  const [loadingEmpreendimentoCaracteristicasAssociadas, setLoadingEmpreendimentoCaracteristicasAssociadas] =
    useState(false);
  const [showEmpreendimentoCaracteristicasModal, setShowEmpreendimentoCaracteristicasModal] = useState(false);
  const [empreendimentoAssociadoAyka, setEmpreendimentoAssociadoAyka] =
    useState<EmpreendimentoCaracteristicasResponse | null>(null);
  const [checkingAykaCreditos, setCheckingAykaCreditos] = useState(false);
  const [gerandoDescricaoAyka, setGerandoDescricaoAyka] = useState(false);
  const [aykaActionCodigo, setAykaActionCodigo] = useState("CRIAR_DESCRICAO_IMOVEL");
  const [midiasImovel, setMidiasImovel] = useState<ImageDraftItem[]>([]);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideoDraftItem[]>([]);
  const [addingYoutube, setAddingYoutube] = useState(false);
  const [midiasPublicasImovelHeader, setMidiasPublicasImovelHeader] = useState<ImovelMidiaPublicaItem[]>([]);
  const [showPublicImageLightbox, setShowPublicImageLightbox] = useState(false);
  const [publicLightboxImageIndex, setPublicLightboxImageIndex] = useState(0);
  const [midiasEmpreendimentoRelacionadas, setMidiasEmpreendimentoRelacionadas] = useState<
    EmpreendimentoMidiaPublicaItem[]
  >([]);
  const [rejectedMidiasImovel, setRejectedMidiasImovel] = useState<RejectedImageDraftItem[]>([]);
  const [loadingMidiasImovel, setLoadingMidiasImovel] = useState(false);
  const [loadingMidiasPublicasImovelHeader, setLoadingMidiasPublicasImovelHeader] = useState(false);
  const [loadingMidiasEmpreendimentoRelacionadas, setLoadingMidiasEmpreendimentoRelacionadas] =
    useState(false);
  const [loadingStep5, setLoadingStep5] = useState(false);
  const [qtdDormitoriosDetalhe, setQtdDormitoriosDetalhe] = useState("");
  const [qtdCozinhasDetalhe, setQtdCozinhasDetalhe] = useState("");
  const [qtdSalasDetalhe, setQtdSalasDetalhe] = useState("");
  const [qtdVarandasDetalhe, setQtdVarandasDetalhe] = useState("");
  const [dormitoriosDetalhe, setDormitoriosDetalhe] = useState<DormitorioAmbienteForm[]>([]);
  const [cozinhasDetalhe, setCozinhasDetalhe] = useState<CozinhaAmbienteForm[]>([]);
  const [salasDetalhe, setSalasDetalhe] = useState<SalaAmbienteForm[]>([]);
  const [varandasDetalhe, setVarandasDetalhe] = useState<VarandaAmbienteForm[]>([]);
  const [step5Snapshot, setStep5Snapshot] = useState(() =>
    serializeAmbientesSnapshot({
      qtdDormitorios: "",
      qtdCozinhas: "",
      qtdSalas: "",
      qtdVarandas: "",
      dormitorios: [],
      cozinhas: [],
      salas: [],
      varandas: [],
    }),
  );
  const [uploadingMidiaImovel, setUploadingMidiaImovel] = useState(false);
  const [uploadingMidiaImovelPercent, setUploadingMidiaImovelPercent] = useState<number | null>(null);
  const [deletingMidiaImovelIds, setDeletingMidiaImovelIds] = useState<string[]>([]);
  const [isMidiaImovelDragActive, setIsMidiaImovelDragActive] = useState(false);
  const [dropTargetMidiaImovelId, setDropTargetMidiaImovelId] = useState<string | null>(null);
  const [editingMidiaImovelId, setEditingMidiaImovelId] = useState<string | null>(null);
  const [mediaSnapshot, setMediaSnapshot] = useState("[]");
  const [videosSnapshot, setVideosSnapshot] = useState("[]");
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const rejectedPreviewUrlsRef = useRef<Set<string>>(new Set());
  const thumbPreviewUrlsRef = useRef<Set<string>>(new Set());
  const [placeId, setPlaceId] = useState("");
  const [selectedPlaceName, setSelectedPlaceName] = useState("");
  const [enderecoFormatado, setEnderecoFormatado] = useState("");
  const [addressComponents, setAddressComponents] = useState<unknown[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationEditingEnabled, setLocationEditingEnabled] = useState(false);
  const [showLocationEditConfirmModal, setShowLocationEditConfirmModal] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [switchingBlock, setSwitchingBlock] = useState(false);
  const [blockTransitionPhase, setBlockTransitionPhase] = useState<"idle" | "leaving" | "pre-enter" | "entering">(
    "idle",
  );
  const blockTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockTransitionRafRef = useRef<number | null>(null);
  const step5HydratedRef = useRef<string | null>(null);
  const empreendimentoCaracteristicasHydratedRef = useRef<string | null>(null);
  const empreendimentoAykaHydratedRef = useRef<string | null>(null);
  const publicMidiaAutoHealRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await apiFetchWithAuth<Imovel>(`/api/imoveis/${id}`);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if (result.data.status === "RASCUNHO") {
        router.replace(`/imoveis/novo?imovel=${result.data.id}`);
        return;
      }

      const profileResult = await apiFetchWithAuth<ProfileResponse>("/api/profile");
      if (profileResult.ok && profileResult.data.nickname) {
        setProfileNickname(profileResult.data.nickname);
      }

      setItem(result.data);
      const nextForm = toEditForm(result.data);
      const nextCaracteristicasSelecionadas = Array.isArray(result.data.caracteristicas)
        ? result.data.caracteristicas.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          )
        : [];
      setForm(nextForm);
      const formattedAddress = formatAddressFromFields({
        logradouro: result.data.logradouro ?? "",
        numero: result.data.numero ?? "",
        bairro: result.data.bairro ?? "",
        cidade: result.data.cidade ?? "",
        estado: result.data.estado ?? "",
      });
      setSearchAddress(String(result.data.address_json?.formatted_address ?? formattedAddress));
      setPlaceId(String(result.data.address_json?.place_id ?? ""));
      setSelectedPlaceName(String(result.data.address_json?.place_name ?? ""));
      setEnderecoFormatado(String(result.data.address_json?.formatted_address ?? ""));
      setAddressComponents(
        Array.isArray(result.data.address_json?.address_components)
          ? (result.data.address_json?.address_components as unknown[])
          : [],
      );
      setLat(typeof result.data.lat === "number" ? result.data.lat : null);
      setLng(typeof result.data.lng === "number" ? result.data.lng : null);
      setInitialSnapshot(
        JSON.stringify({
          form: nextForm,
          placeId: String(result.data.address_json?.place_id ?? ""),
          selectedPlaceName: String(result.data.address_json?.place_name ?? ""),
          enderecoFormatado: String(result.data.address_json?.formatted_address ?? ""),
          lat: typeof result.data.lat === "number" ? result.data.lat : null,
          lng: typeof result.data.lng === "number" ? result.data.lng : null,
        }),
      );
      setMidiasImovel([]);
      setYoutubeUrlInput("");
      setYoutubeVideos([]);
      setAddingYoutube(false);
      setMidiasPublicasImovelHeader([]);
      setMidiasEmpreendimentoRelacionadas([]);
      setEmpreendimentoCaracteristicasAssociadas([]);
      setEmpreendimentoAssociadoAyka(null);
      setRejectedMidiasImovel([]);
      setMediaSnapshot("[]");
      setVideosSnapshot("[]");
      setCaracteristicaQuery("");
      setCaracteristicasSelecionadas(nextCaracteristicasSelecionadas);
      setCaracteristicasSnapshot(serializeCaracteristicasSnapshot(nextCaracteristicasSelecionadas));
      setShowEmpreendimentoCaracteristicasModal(false);
      step5HydratedRef.current = null;
      empreendimentoCaracteristicasHydratedRef.current = null;
      empreendimentoAykaHydratedRef.current = null;
      publicMidiaAutoHealRef.current = null;
      setLoadingStep5(false);
      setQtdDormitoriosDetalhe("");
      setQtdCozinhasDetalhe("");
      setQtdSalasDetalhe("");
      setQtdVarandasDetalhe("");
      setDormitoriosDetalhe([]);
      setCozinhasDetalhe([]);
      setSalasDetalhe([]);
      setVarandasDetalhe([]);
      setStep5Snapshot(
        serializeAmbientesSnapshot({
          qtdDormitorios: "",
          qtdCozinhas: "",
          qtdSalas: "",
          qtdVarandas: "",
          dormitorios: [],
          cozinhas: [],
          salas: [],
          varandas: [],
        }),
      );
      setLoading(false);
    }

    if (id) load();
  }, [id, router]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!headerActionsRef.current) return;
      if (headerActionsRef.current.contains(event.target as Node)) return;
      setShowHeaderActionsMenu(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const currentSnapshot = useMemo(
    () =>
      form
        ? JSON.stringify({
            form,
            placeId,
            selectedPlaceName,
            enderecoFormatado,
            lat,
            lng,
          })
        : "",
    [form, placeId, selectedPlaceName, enderecoFormatado, lat, lng],
  );
  const currentMidiasSnapshot = useMemo(() => serializeMidiasSnapshot(midiasImovel), [midiasImovel]);
  const currentVideosSnapshot = useMemo(
    () => serializeYoutubeVideosSnapshot(youtubeVideos),
    [youtubeVideos],
  );
  const currentCaracteristicasSnapshot = useMemo(
    () => serializeCaracteristicasSnapshot(caracteristicasSelecionadas),
    [caracteristicasSelecionadas],
  );
  const currentStep5Snapshot = useMemo(
    () =>
      serializeAmbientesSnapshot({
        qtdDormitorios: qtdDormitoriosDetalhe,
        qtdCozinhas: qtdCozinhasDetalhe,
        qtdSalas: qtdSalasDetalhe,
        qtdVarandas: qtdVarandasDetalhe,
        dormitorios: dormitoriosDetalhe,
        cozinhas: cozinhasDetalhe,
        salas: salasDetalhe,
        varandas: varandasDetalhe,
      }),
    [
      qtdDormitoriosDetalhe,
      qtdCozinhasDetalhe,
      qtdSalasDetalhe,
      qtdVarandasDetalhe,
      dormitoriosDetalhe,
      cozinhasDetalhe,
      salasDetalhe,
      varandasDetalhe,
    ],
  );
  const hasPendingFormChanges = Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot;
  const hasPendingMediaChanges = currentMidiasSnapshot !== mediaSnapshot;
  const hasPendingVideosChanges = currentVideosSnapshot !== videosSnapshot;
  const hasPendingCaracteristicasChanges = currentCaracteristicasSnapshot !== caracteristicasSnapshot;
  const hasPendingAmbientesChanges = currentStep5Snapshot !== step5Snapshot;
  const hasPendingChanges =
    hasPendingFormChanges ||
    hasPendingMediaChanges ||
    hasPendingVideosChanges ||
    hasPendingCaracteristicasChanges ||
    hasPendingAmbientesChanges;

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
    if (!hasPendingChanges) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (bypassUnsavedGuardRef.current) return;
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
    return () => {
      if (blockTransitionTimeoutRef.current) clearTimeout(blockTransitionTimeoutRef.current);
      if (blockTransitionRafRef.current !== null) cancelAnimationFrame(blockTransitionRafRef.current);
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      for (const previewUrl of rejectedPreviewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
      rejectedPreviewUrlsRef.current.clear();
      for (const thumbUrl of thumbPreviewUrlsRef.current) {
        URL.revokeObjectURL(thumbUrl);
      }
      thumbPreviewUrlsRef.current.clear();
    };
  }, []);

  const publicUrl = useMemo(() => {
    if (!item || item.status !== "PUBLICADO" || !profileNickname || !item.slug_publico) return null;
    const routeSegment = resolveImovelPublicRouteSegment({
      finalidade: item.finalidade,
      tipo_negociacao: item.tipo_negociacao,
    });
    return `/${profileNickname}/${routeSegment}/${item.slug_publico}`;
  }, [item, profileNickname]);
  const headerImovelPublicPhotoItems = useMemo(() => {
    if (item?.status !== "PUBLICADO") return [];
    return midiasPublicasImovelHeader
      .map((mediaItem) => {
        const canonicalStorageUrl = buildStoragePublicObjectUrl(
          mediaItem.storage_bucket,
          mediaItem.storage_path,
        );
        const rawUrl = typeof mediaItem.url === "string" ? mediaItem.url.trim() : "";
        const primaryUrl = canonicalStorageUrl || rawUrl;
        const fallbackUrl =
          canonicalStorageUrl && rawUrl && canonicalStorageUrl !== rawUrl ? rawUrl : null;
        return {
          primaryUrl,
          fallbackUrl,
          source: "IMOVEL_PUBLICA" as const,
        };
      })
      .filter((itemPublica) => itemPublica.primaryUrl.length > 0);
  }, [midiasPublicasImovelHeader, item?.status]);
  const headerEmpreendimentoPhotoItems = useMemo(() => {
    if (item?.status !== "PUBLICADO") return [];
    return midiasEmpreendimentoRelacionadas
      .map((mediaItem) => {
        const canonicalStorageUrl = buildStoragePublicObjectUrl(
          mediaItem.storage_bucket,
          mediaItem.storage_path,
        );
        const rawUrl = typeof mediaItem.url === "string" ? mediaItem.url.trim() : "";
        const primaryUrl = canonicalStorageUrl || rawUrl;
        const fallbackUrl =
          canonicalStorageUrl && rawUrl && canonicalStorageUrl !== rawUrl ? rawUrl : null;
        return {
          primaryUrl,
          fallbackUrl,
          source: "EMPREENDIMENTO" as const,
        };
      })
      .filter((itemPublica) => itemPublica.primaryUrl.length > 0);
  }, [item?.status, midiasEmpreendimentoRelacionadas]);
  const headerPublicPhotoItems = useMemo(
    () => [...headerImovelPublicPhotoItems, ...headerEmpreendimentoPhotoItems],
    [headerEmpreendimentoPhotoItems, headerImovelPublicPhotoItems],
  );
  const headerPublicPhotoUrls = useMemo(
    () => headerPublicPhotoItems.map((itemPublica) => itemPublica.primaryUrl),
    [headerPublicPhotoItems],
  );
  const headerPublicGridImages = useMemo(
    () => headerPublicPhotoItems.slice(0, 6),
    [headerPublicPhotoItems],
  );
  const headerPublicImagesTotal = headerPublicPhotoUrls.length;
  const headerImovelPublicImagesTotal = headerImovelPublicPhotoItems.length;
  const headerEmpreendimentoImagesTotal = headerEmpreendimentoPhotoItems.length;
  const headerPublicExtraImages = Math.max(0, headerPublicPhotoUrls.length - 6);
  const headerPublicGalleryResumo = useMemo(() => {
    const imagensImovelLabel = `${headerImovelPublicImagesTotal} ${
      headerImovelPublicImagesTotal === 1 ? "imagem" : "imagens"
    } imóvel`;
    const deveMostrarEmpreendimento =
      Boolean(item?.empreendimento_id) || headerEmpreendimentoImagesTotal > 0;
    if (!deveMostrarEmpreendimento) return imagensImovelLabel;
    const imagensEmpreendimentoLabel = `${headerEmpreendimentoImagesTotal} ${
      headerEmpreendimentoImagesTotal === 1 ? "imagem" : "imagens"
    } do empreendimento`;
    return `${imagensImovelLabel} + ${imagensEmpreendimentoLabel}`;
  }, [headerEmpreendimentoImagesTotal, headerImovelPublicImagesTotal, item?.empreendimento_id]);
  const loadingHeaderPublicGallery =
    loadingMidiasPublicasImovelHeader ||
    ((Boolean(item?.empreendimento_id) || headerEmpreendimentoImagesTotal > 0) &&
      loadingMidiasEmpreendimentoRelacionadas);
  const currentPublicLightboxImageIndex =
    headerPublicPhotoUrls.length > 0
      ? Math.max(0, Math.min(publicLightboxImageIndex, headerPublicPhotoUrls.length - 1))
      : 0;
  const currentPublicLightboxImageUrl = headerPublicPhotoUrls[currentPublicLightboxImageIndex] ?? null;

  function openPublicImageLightbox(index: number) {
    if (headerPublicPhotoUrls.length === 0) return;
    const normalizedIndex = Math.max(0, Math.min(index, headerPublicPhotoUrls.length - 1));
    setPublicLightboxImageIndex(normalizedIndex);
    setShowPublicImageLightbox(true);
  }

  function closePublicImageLightbox() {
    setShowPublicImageLightbox(false);
  }

  function goToPreviousPublicLightboxImage() {
    if (headerPublicPhotoUrls.length === 0) return;
    setPublicLightboxImageIndex(
      (current) => (current - 1 + headerPublicPhotoUrls.length) % headerPublicPhotoUrls.length,
    );
  }

  function goToNextPublicLightboxImage() {
    if (headerPublicPhotoUrls.length === 0) return;
    setPublicLightboxImageIndex((current) => (current + 1) % headerPublicPhotoUrls.length);
  }

  function handleHeaderPublicImageLoadError(
    imgElement: HTMLImageElement,
    fallbackUrl: string | null,
  ) {
    if (fallbackUrl && imgElement.dataset.fallbackApplied !== "1") {
      imgElement.dataset.fallbackApplied = "1";
      imgElement.src = buildThumbUrl(fallbackUrl) ?? fallbackUrl;
      return;
    }

    if (!item?.id || item.status !== "PUBLICADO") return;
    if (publicMidiaAutoHealRef.current === item.id) return;
    publicMidiaAutoHealRef.current = item.id;

    void loadMidiasPublicasImovelHeader(item.id, { sync: true });
  }

  useEffect(() => {
    if (!showPublicImageLightbox) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowPublicImageLightbox(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (headerPublicPhotoUrls.length > 0) {
          setPublicLightboxImageIndex(
            (current) => (current - 1 + headerPublicPhotoUrls.length) % headerPublicPhotoUrls.length,
          );
        }
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (headerPublicPhotoUrls.length > 0) {
          setPublicLightboxImageIndex((current) => (current + 1) % headerPublicPhotoUrls.length);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showPublicImageLightbox, headerPublicPhotoUrls.length]);

  const hasEmpreendimentoAssociado = useMemo(() => {
    if (!item) return false;
    const maybeItem = item as unknown as {
      empreendimento_tipo_id?: string | null;
      empreendimento_nome?: string | null;
    };
    const empreendimentoId = typeof item.empreendimento_id === "string" ? item.empreendimento_id.trim() : "";
    const empreendimentoTipoId =
      typeof maybeItem.empreendimento_tipo_id === "string"
        ? maybeItem.empreendimento_tipo_id.trim()
        : "";
    const empreendimentoNome =
      typeof maybeItem.empreendimento_nome === "string"
        ? maybeItem.empreendimento_nome.trim()
        : "";

    return Boolean(empreendimentoId || empreendimentoTipoId || empreendimentoNome);
  }, [item]);
  const readOnlyLocation = hasEmpreendimentoAssociado || !locationEditingEnabled;
  const readOnlyLocationContext = false;
  const readOnlyLocationExtra = false;
  const isUsoComercial = useMemo(() => {
    const tipoAtual = (form?.tipo || item?.tipo || "").toUpperCase();
    return COMMERCIAL_TIPO_IMOVEL.has(tipoAtual);
  }, [form?.tipo, item?.tipo]);
  const canShowTerrainFields = useMemo(() => {
    const tipoAtual = (form?.tipo || item?.tipo || "").toUpperCase();
    if (TERRAIN_APPLICABLE_TYPES.has(tipoAtual)) return true;
    const normalizedLabel = (item?.empreendimento_tipologia_label ?? form?.subtipo ?? "").toUpperCase();
    return normalizedLabel.includes("TERRENO") || normalizedLabel.includes("LOTE");
  }, [form?.subtipo, form?.tipo, item?.empreendimento_tipologia_label, item?.tipo]);
  const vagasCount = useMemo(() => toNonNegativeIntegerOrZero(form?.vagas ?? ""), [form?.vagas]);
  const terrenoPreview = useMemo(() => {
    if (!form) return null;
    const parsePositive = (raw: string) => {
      const parsed = parseOptionalDecimal(raw);
      if (!parsed.ok || parsed.value == null || parsed.value <= 0) return null;
      return parsed.value;
    };

    const frente = parsePositive(form.frente_metros);
    const fundo = parsePositive(form.fundos_metros);
    const lateral1 = parsePositive(form.lateral_1_metros);
    const lateral2 = parsePositive(form.lateral_2_metros);
    const areaInformada = parsePositive(form.area_terreno);
    const areaCalculada = computeTerrenoAreaFromMedidas({ frente, fundo, lateral1, lateral2 });

    if (!frente && !fundo && !lateral1 && !lateral2) return null;

    const widthTop = fundo ?? frente ?? 10;
    const widthBottom = frente ?? fundo ?? widthTop;
    const heightLeft = lateral1 ?? lateral2 ?? 10;
    const heightRight = lateral2 ?? lateral1 ?? heightLeft;

    const maxWidth = Math.max(widthTop, widthBottom);
    const topStart = (maxWidth - widthTop) / 2;
    const bottomStart = (maxWidth - widthBottom) / 2;

    const pA = { x: topStart, y: 0 };
    const pB = { x: topStart + widthTop, y: 0 };
    const pC = { x: bottomStart + widthBottom, y: heightRight };
    const pD = { x: bottomStart, y: heightLeft };

    const rawPoints = [pA, pB, pC, pD];
    const minX = Math.min(...rawPoints.map((point) => point.x));
    const maxX = Math.max(...rawPoints.map((point) => point.x));
    const minY = Math.min(...rawPoints.map((point) => point.y));
    const maxY = Math.max(...rawPoints.map((point) => point.y));

    const viewWidth = 360;
    const viewHeight = 240;
    const paddingX = 48;
    const paddingY = 36;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((viewWidth - paddingX * 2) / spanX, (viewHeight - paddingY * 2) / spanY);

    const toCanvas = (point: { x: number; y: number }) => ({
      x: paddingX + (point.x - minX) * scale,
      y: paddingY + (point.y - minY) * scale,
    });

    const A = toCanvas(pA);
    const B = toCanvas(pB);
    const C = toCanvas(pC);
    const D = toCanvas(pD);

    const points = `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`;
    const midTop = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const midBottom = { x: (C.x + D.x) / 2, y: (C.y + D.y) / 2 };
    const midLeft = { x: (A.x + D.x) / 2, y: (A.y + D.y) / 2 };
    const midRight = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };

    return {
      areaInformada,
      areaCalculada,
      frente,
      fundo,
      lateral1,
      lateral2,
      points,
      corners: { A, B, C, D },
      labels: {
        top: { x: midTop.x, y: Math.max(14, midTop.y - 12) },
        bottom: { x: midBottom.x, y: Math.min(viewHeight - 8, midBottom.y + 18) },
        left: { x: Math.max(8, midLeft.x - 34), y: midLeft.y },
        right: { x: Math.min(viewWidth - 8, midRight.x + 34), y: midRight.y },
      },
      viewBox: `0 0 ${viewWidth} ${viewHeight}`,
    };
  }, [form]);
  const reviewMapQuery = useMemo(() => {
    if (!form) return "";
    return (
      enderecoFormatado ||
      formatAddressFromFields({
        logradouro: form.logradouro,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
      })
    );
  }, [enderecoFormatado, form]);
  const reviewMapEmbedUrl = useMemo(() => buildGoogleMapsEmbedUrl(reviewMapQuery), [reviewMapQuery]);
  const hasVendaNegociacao =
    form?.tipo_negociacao === "VENDA" || form?.tipo_negociacao === "VENDA_E_ALUGUEL";
  const hasAluguelNegociacao =
    form?.tipo_negociacao === "ALUGUEL" || form?.tipo_negociacao === "VENDA_E_ALUGUEL";
  const isCaptacaoParceria = form?.modelo_captacao === "PARCERIA";
  const isMinhaCaptacaoSemExclusividade = form?.modelo_captacao === "CAPTACAO_SEM_EXCLUSIVIDADE";
  const isMinhaExclusividade = form?.modelo_captacao === "EXCLUSIVIDADE";
  const isParceriaSemExclusividadeAtiva =
    isMinhaCaptacaoSemExclusividade &&
    (form?.aceita_parceria_status === "SIM" || form?.aceita_parceria_status === "SOB_ANALISE");
  const shouldShowComissaoParceria = isCaptacaoParceria || isParceriaSemExclusividadeAtiva;
  const isParceriaExclusividadeAtiva =
    form?.aceita_parceria_status === "SIM" || form?.aceita_parceria_status === "SOB_ANALISE";
  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const minBolsaoExclusividadeIsoDate = useMemo(() => {
    const baseDate = new Date();
    baseDate.setUTCHours(0, 0, 0, 0);
    baseDate.setUTCDate(baseDate.getUTCDate() + BOLSAO_EXCLUSIVIDADE_MIN_DIAS);
    return baseDate.toISOString().slice(0, 10);
  }, []);
  const hasVencimentoMinimoParaBolsao = useMemo(() => {
    if (!form?.exclusividade_data_vencimento) return false;
    return form.exclusividade_data_vencimento >= minBolsaoExclusividadeIsoDate;
  }, [form, minBolsaoExclusividadeIsoDate]);
  const comissaoVendedorPercentualAuto = useMemo(() => {
    const parsedMinha = parseOptionalPercent(form?.comissao_captador_percentual ?? "");
    if (!parsedMinha.ok || parsedMinha.value == null) return "";
    return numberToPercentInput(Math.max(0, 100 - parsedMinha.value));
  }, [form?.comissao_captador_percentual]);
  const exclusividadeComissaoParceiroAuto = useMemo(() => {
    const parsedMinha = parseOptionalPercent(form?.exclusividade_comissao_minha_percentual ?? "");
    if (!parsedMinha.ok || parsedMinha.value == null) return "";
    return numberToPercentInput(Math.max(0, 100 - parsedMinha.value));
  }, [form?.exclusividade_comissao_minha_percentual]);

  const ganhoEstimadoComissaoVenda = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const preco = parseOptionalCurrency(form?.preco_venda ?? "");
    const percentual = parseOptionalPercent(form?.comissao_venda_percentual ?? "");
    if (!preco.ok || !percentual.ok) return null;
    if (preco.value == null || percentual.value == null) return null;
    return (preco.value * percentual.value) / 100;
  }, [form?.comissao_venda_percentual, form?.preco_venda, hasVendaNegociacao]);

  const ganhoPotencialCaptador = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(form?.comissao_captador_percentual ?? "");
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [form?.comissao_captador_percentual, ganhoEstimadoComissaoVenda, hasVendaNegociacao]);

  const ganhoPotencialVendedor = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(comissaoVendedorPercentualAuto);
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [comissaoVendedorPercentualAuto, ganhoEstimadoComissaoVenda, hasVendaNegociacao]);

  const ganhoEstimadoExclusividadeMinha = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(form?.exclusividade_comissao_minha_percentual ?? "");
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [form?.exclusividade_comissao_minha_percentual, ganhoEstimadoComissaoVenda, hasVendaNegociacao]);

  const ganhoEstimadoExclusividadeParceiro = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(exclusividadeComissaoParceiroAuto);
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [
    exclusividadeComissaoParceiroAuto,
    ganhoEstimadoComissaoVenda,
    hasVendaNegociacao,
  ]);
  const tipoUsoApi = isUsoComercial ? "COMERCIAL" : "RESIDENCIAL";
  const subtipoImovelApi = (form?.subtipo ?? "").trim().toUpperCase() || null;
  const tipoUsoLabel = isUsoComercial ? "Comercial" : "Residencial";
  const descricaoImovelPlain = useMemo(() => htmlToPlainText(form?.descricao ?? ""), [form?.descricao]);
  const tipologiaAtualLabel = item?.empreendimento_tipologia_label?.trim() || form?.subtipo?.trim() || "";
  const caracteristicasSelecionadasOptions = useMemo(() => {
    const selectedKeys = [...new Set(caracteristicasSelecionadas)]
      .map((value) => value.trim())
      .filter((value): value is string => value.length > 0);
    const labelByKey = new Map(
      caracteristicasCatalogo.map((catalogItem) => [catalogItem.chave, catalogItem.label_pt]),
    );

    return selectedKeys
      .map((chave) => ({
        id: chave,
        chave,
        label_pt: labelByKey.get(chave) ?? formatTipo(chave),
      }))
      .sort((a, b) => a.label_pt.localeCompare(b.label_pt, "pt-BR"));
  }, [caracteristicasCatalogo, caracteristicasSelecionadas]);
  const caracteristicasFiltradas = useMemo(() => {
    const query = normalizeText(caracteristicaQuery);
    const base = caracteristicasCatalogo.filter((catalogItem) => catalogItem.ativo !== false);
    const filtered = !query
      ? base
      : base.filter((catalogItem) => {
          const label = normalizeText(catalogItem.label_pt ?? "");
          const chave = normalizeText(catalogItem.chave ?? "");
          return label.includes(query) || chave.includes(query);
        });
    return [...filtered].sort((a, b) => (a.label_pt ?? "").localeCompare(b.label_pt ?? "", "pt-BR"));
  }, [caracteristicaQuery, caracteristicasCatalogo]);
  const caracteristicaLabelByChave = useMemo(
    () => new Map(caracteristicasSelecionadasOptions.map((catalogItem) => [catalogItem.chave, catalogItem.label_pt])),
    [caracteristicasSelecionadasOptions],
  );
  const empreendimentoCaracteristicasAssociadasPreview = useMemo(
    () => empreendimentoCaracteristicasAssociadas.slice(0, 6),
    [empreendimentoCaracteristicasAssociadas],
  );
  const empreendimentoCaracteristicasAssociadasExtras = Math.max(
    0,
    empreendimentoCaracteristicasAssociadas.length - empreendimentoCaracteristicasAssociadasPreview.length,
  );
  const imagensEmpreendimentoRelacionadas = useMemo(
    () =>
      [...midiasEmpreendimentoRelacionadas].sort((a, b) => {
        if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
        return a.ordem - b.ordem;
      }),
    [midiasEmpreendimentoRelacionadas],
  );
  const empreendimentoAssociadoNome = useMemo(() => {
    const maybeNamedItem = item as unknown as { empreendimento_nome?: string | null } | null;
    const nome = maybeNamedItem?.empreendimento_nome;
    if (typeof nome === "string" && nome.trim().length > 0) return nome.trim();
    return "Empreendimento associado";
  }, [item]);
  const headerEmpreendimentoNome = useMemo(() => {
    const maybeNamedItem = item as unknown as { empreendimento_nome?: string | null } | null;
    const nome = maybeNamedItem?.empreendimento_nome;
    if (typeof nome === "string" && nome.trim().length > 0) return nome.trim();

    const nomeFromEmpreendimento = empreendimentoAssociadoAyka?.nome;
    if (typeof nomeFromEmpreendimento === "string" && nomeFromEmpreendimento.trim().length > 0) {
      return nomeFromEmpreendimento.trim();
    }

    return null;
  }, [empreendimentoAssociadoAyka?.nome, item]);
  const headerTitle = useMemo(() => (item ? buildImovelHeaderTitle(item) : "Imóvel"), [item]);
  const headerValoresResumo = useMemo(() => {
    if (!item) return "Valores não informados";
    const partes: string[] = [];
    if (item.preco_venda != null && Number.isFinite(item.preco_venda)) {
      partes.push(`Venda ${formatCurrency(item.preco_venda)}`);
    }
    if (item.preco_locacao != null && Number.isFinite(item.preco_locacao)) {
      partes.push(`Locação ${formatCurrency(item.preco_locacao)}`);
    }
    if (item.condominio != null && Number.isFinite(item.condominio)) {
      partes.push(`Condomínio ${formatCurrency(item.condominio)}`);
    }
    if (item.iptu != null && Number.isFinite(item.iptu)) {
      const periodicidade = item.iptu_periodicidade === "MENSAL" ? "/mês" : "/ano";
      partes.push(`IPTU ${formatCurrency(item.iptu)} ${periodicidade}`);
    }
    return partes.length > 0 ? partes.join(" • ") : "Valores não informados";
  }, [item]);
  const imagensEmpreendimentoPreview = useMemo(
    () => imagensEmpreendimentoRelacionadas.slice(0, 3),
    [imagensEmpreendimentoRelacionadas],
  );
  const imagensEmpreendimentoExtras = Math.max(0, imagensEmpreendimentoRelacionadas.length - 3);
  const totalMidiasCombinadas = midiasImovel.length + imagensEmpreendimentoRelacionadas.length;

  async function loadStep5Ambientes(imovelId: string, fallback?: Partial<EditFormState>) {
    setLoadingStep5(true);
    setBlockError(null);
    const result = await apiFetchWithAuth<ImovelAmbienteApiItem[]>(`/api/imoveis/${imovelId}/ambientes`);
    setLoadingStep5(false);

    if (!result.ok) {
      setBlockError(result.error);
      return;
    }

    step5HydratedRef.current = imovelId;
    const ambientes = result.data ?? [];
    const dormitoriosRows = ambientes
      .filter((ambienteItem) => ambienteItem.tipo_ambiente === "DORMITORIO")
      .sort((a, b) => a.ordem - b.ordem);
    const cozinhasRows = ambientes
      .filter((ambienteItem) => ambienteItem.tipo_ambiente === "COZINHA")
      .sort((a, b) => a.ordem - b.ordem);
    const salasRows = ambientes
      .filter((ambienteItem) => ambienteItem.tipo_ambiente === "SALA")
      .sort((a, b) => a.ordem - b.ordem);
    const varandasRows = ambientes
      .filter((ambienteItem) => ambienteItem.tipo_ambiente === "VARANDA")
      .sort((a, b) => a.ordem - b.ordem);

    const dormitoriosMapped = dormitoriosRows.map((ambienteItem) => {
      const dados =
        ambienteItem.dados && typeof ambienteItem.dados === "object" && !Array.isArray(ambienteItem.dados)
          ? ambienteItem.dados
          : {};
      const ehSuite = dados.eh_suite === true;
      return {
        local_id: ambienteItem.id || createLocalId("dorm"),
        area_m2: numberToInput(ambienteItem.area_m2),
        eh_suite: ehSuite,
        suite_principal: ehSuite && (ambienteItem.principal || dados.suite_principal === true),
        banheiro_armarios: ehSuite && dados.banheiro_armarios === true,
        banheiro_pia_dupla: ehSuite && dados.banheiro_pia_dupla === true,
        banheiro_box: ehSuite && dados.banheiro_box === true,
        ar_condicionado: dados.ar_condicionado === true,
        closet: dados.closet === true,
        armarios_planejados: dados.armarios_planejados === true,
        tem_cama: dados.tem_cama === true,
        tem_tv: dados.tem_tv === true,
        tem_varanda: dados.tem_varanda === true,
        persiana_tipo:
          typeof dados.persiana_tipo === "string" && isPersianaTipo(dados.persiana_tipo)
            ? dados.persiana_tipo
            : "",
        tipo_piso:
          typeof dados.tipo_piso === "string" && isAmbientePiso(dados.tipo_piso) ? dados.tipo_piso : "",
      } satisfies DormitorioAmbienteForm;
    });

    const cozinhasMapped = cozinhasRows.map((ambienteItem) => {
      const dados =
        ambienteItem.dados && typeof ambienteItem.dados === "object" && !Array.isArray(ambienteItem.dados)
          ? ambienteItem.dados
          : {};
      const tipoBancadaValido =
        typeof dados.tipo_bancada === "string" && isCozinhaBancada(dados.tipo_bancada)
          ? dados.tipo_bancada
          : "";
      const bancada = dados.bancada === true || Boolean(tipoBancadaValido);
      return {
        local_id: ambienteItem.id || createLocalId("coz"),
        area_m2: numberToInput(ambienteItem.area_m2),
        tipo_cozinha:
          typeof dados.tipo_cozinha === "string" && isCozinhaTipo(dados.tipo_cozinha)
            ? dados.tipo_cozinha
            : "",
        armarios_planejados: dados.armarios_planejados === true,
        fogao: dados.fogao === true,
        forno: dados.forno === true,
        geladeira: dados.geladeira === true,
        microondas: dados.microondas === true,
        bancada,
        tipo_bancada: tipoBancadaValido,
        tipo_piso:
          typeof dados.tipo_piso === "string" && isAmbientePiso(dados.tipo_piso) ? dados.tipo_piso : "",
      } satisfies CozinhaAmbienteForm;
    });

    const salasMapped = salasRows.map((ambienteItem) => {
      const dados =
        ambienteItem.dados && typeof ambienteItem.dados === "object" && !Array.isArray(ambienteItem.dados)
          ? ambienteItem.dados
          : {};
      const diferenciaisLegado = Array.isArray(dados.diferenciais)
        ? dados.diferenciais.filter((value): value is string => typeof value === "string")
        : [];
      const tipoPisoLegado = diferenciaisLegado.includes("PISO_MADEIRA")
        ? "MADEIRA"
        : diferenciaisLegado.includes("PISO_PORCELANATO")
          ? "PORCELANATO"
          : "";
      return {
        local_id: ambienteItem.id || createLocalId("sala"),
        area_m2: numberToInput(ambienteItem.area_m2),
        principal: ambienteItem.principal === true,
        tipo_sala:
          typeof dados.tipo_sala === "string" && isSalaTipo(dados.tipo_sala) ? dados.tipo_sala : "",
        layout: typeof dados.layout === "string" && isSalaLayout(dados.layout) ? dados.layout : "",
        tipo_piso:
          typeof dados.tipo_piso === "string" && isAmbientePiso(dados.tipo_piso)
            ? dados.tipo_piso
            : tipoPisoLegado,
        diferenciais: Array.isArray(dados.diferenciais)
          ? dados.diferenciais.filter(
              (value): value is SalaDiferencialValue =>
                typeof value === "string" && isSalaDiferencial(value),
            )
          : [],
      } satisfies SalaAmbienteForm;
    });

    const varandasMapped = varandasRows.map((ambienteItem) => {
      const dados =
        ambienteItem.dados && typeof ambienteItem.dados === "object" && !Array.isArray(ambienteItem.dados)
          ? ambienteItem.dados
          : {};
      return {
        local_id: ambienteItem.id || createLocalId("var"),
        area_m2: numberToInput(ambienteItem.area_m2),
        tipo_varanda:
          typeof dados.tipo_varanda === "string" && isVarandaTipo(dados.tipo_varanda)
            ? dados.tipo_varanda
            : "",
        churrasqueira_tipo:
          typeof dados.churrasqueira_tipo === "string" && isVarandaChurrasqueira(dados.churrasqueira_tipo)
            ? dados.churrasqueira_tipo
            : "",
        bancada: dados.bancada === true,
        persiana_tipo:
          typeof dados.persiana_tipo === "string" && isPersianaTipo(dados.persiana_tipo)
            ? dados.persiana_tipo
            : "",
        fechada_com_vidro: dados.fechada_com_vidro === true,
        ilha: dados.ilha === true,
        fogao: dados.fogao === true,
        frigobar: dados.frigobar === true,
        chopeira: dados.chopeira === true,
        tem_tv: dados.tem_tv === true,
        tipo_piso:
          typeof dados.tipo_piso === "string" && isAmbientePiso(dados.tipo_piso) ? dados.tipo_piso : "",
      } satisfies VarandaAmbienteForm;
    });

    const fallbackDormitorios = toNonNegativeIntegerOrZero(fallback?.dormitorios ?? "");
    const fallbackCozinhas = toNonNegativeIntegerOrZero(fallback?.cozinhas ?? "");
    const fallbackSalas = toNonNegativeIntegerOrZero(fallback?.salas ?? "");
    const fallbackVarandas = toNonNegativeIntegerOrZero(fallback?.varandas ?? "");

    const nextDormitoriosCount =
      dormitoriosMapped.length > 0 ? dormitoriosMapped.length : fallbackDormitorios;
    const nextCozinhasCount = cozinhasMapped.length > 0 ? cozinhasMapped.length : fallbackCozinhas;
    const nextSalasCount = salasMapped.length > 0 ? salasMapped.length : fallbackSalas;
    const nextVarandasCount = varandasMapped.length > 0 ? varandasMapped.length : fallbackVarandas;

    const nextQtdDormitorios = nextDormitoriosCount > 0 ? String(nextDormitoriosCount) : "";
    const nextQtdCozinhas = nextCozinhasCount > 0 ? String(nextCozinhasCount) : "";
    const nextQtdSalas = nextSalasCount > 0 ? String(nextSalasCount) : "";
    const nextQtdVarandas = nextVarandasCount > 0 ? String(nextVarandasCount) : "";
    const nextDormitorios = resizeAmbientes(
      dormitoriosMapped,
      nextDormitoriosCount,
      createDormitorioAmbiente,
    );
    const nextCozinhas = resizeAmbientes(cozinhasMapped, nextCozinhasCount, createCozinhaAmbiente);
    const nextSalas = resizeAmbientes(salasMapped, nextSalasCount, createSalaAmbiente);
    const nextVarandas = resizeAmbientes(varandasMapped, nextVarandasCount, createVarandaAmbiente);
    const nextSnapshot = serializeAmbientesSnapshot({
      qtdDormitorios: nextQtdDormitorios,
      qtdCozinhas: nextQtdCozinhas,
      qtdSalas: nextQtdSalas,
      qtdVarandas: nextQtdVarandas,
      dormitorios: nextDormitorios,
      cozinhas: nextCozinhas,
      salas: nextSalas,
      varandas: nextVarandas,
    });

    setQtdDormitoriosDetalhe(nextQtdDormitorios);
    setQtdCozinhasDetalhe(nextQtdCozinhas);
    setQtdSalasDetalhe(nextQtdSalas);
    setQtdVarandasDetalhe(nextQtdVarandas);
    setDormitoriosDetalhe(nextDormitorios);
    setCozinhasDetalhe(nextCozinhas);
    setSalasDetalhe(nextSalas);
    setVarandasDetalhe(nextVarandas);
    setStep5Snapshot(nextSnapshot);
  }

  async function loadEmpreendimentoCaracteristicasAssociadas(empreendimentoId: string) {
    setLoadingEmpreendimentoCaracteristicasAssociadas(true);
    const empreendimentoResult = await apiFetchWithAuth<EmpreendimentoCaracteristicasResponse>(
      `/api/empreendimentos/${empreendimentoId}`,
    );

    if (!empreendimentoResult.ok) {
      setLoadingEmpreendimentoCaracteristicasAssociadas(false);
      setEmpreendimentoCaracteristicasAssociadas([]);
      return;
    }

    setEmpreendimentoAssociadoAyka(empreendimentoResult.data);
    empreendimentoAykaHydratedRef.current = empreendimentoId;

    const caracteristicaIds = Array.isArray(empreendimentoResult.data.caracteristica_ids)
      ? empreendimentoResult.data.caracteristica_ids.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];

    if (caracteristicaIds.length === 0) {
      empreendimentoCaracteristicasHydratedRef.current = empreendimentoId;
      setLoadingEmpreendimentoCaracteristicasAssociadas(false);
      setEmpreendimentoCaracteristicasAssociadas([]);
      return;
    }

    const query = new URLSearchParams({
      escopo: "EMPREENDIMENTO",
    });
    const tipoUso = (empreendimentoResult.data.tipo_uso ?? "").toUpperCase();
    if (tipoUso === "RESIDENCIAL" || tipoUso === "COMERCIAL") {
      query.set("tipo_uso", tipoUso);
    }

    const catalogoResult = await apiFetchWithAuth<CaracteristicaCatalogoItem[]>(
      `/api/caracteristicas/catalogo?${query.toString()}`,
    );

    setLoadingEmpreendimentoCaracteristicasAssociadas(false);
    empreendimentoCaracteristicasHydratedRef.current = empreendimentoId;

    if (!catalogoResult.ok) {
      setEmpreendimentoCaracteristicasAssociadas([]);
      return;
    }

    const labelById = new Map(catalogoResult.data.map((catalogItem) => [catalogItem.id, catalogItem]));
    const mapped = caracteristicaIds
      .map((caracteristicaId) => labelById.get(caracteristicaId) ?? null)
      .filter((catalogItem): catalogItem is CaracteristicaCatalogoItem => catalogItem !== null)
      .sort((a, b) => a.label_pt.localeCompare(b.label_pt, "pt-BR"));

    setEmpreendimentoCaracteristicasAssociadas(mapped);
  }

  async function loadEmpreendimentoAssociadoAykaContext(empreendimentoId: string) {
    const empreendimentoResult = await apiFetchWithAuth<EmpreendimentoCaracteristicasResponse>(
      `/api/empreendimentos/${empreendimentoId}`,
    );

    if (!empreendimentoResult.ok) {
      setEmpreendimentoAssociadoAyka(null);
      return;
    }

    setEmpreendimentoAssociadoAyka(empreendimentoResult.data);
    empreendimentoAykaHydratedRef.current = empreendimentoId;
  }

  useEffect(() => {
    setDormitoriosDetalhe((current) =>
      resizeAmbientes(current, toNonNegativeIntegerOrZero(qtdDormitoriosDetalhe), createDormitorioAmbiente),
    );
  }, [qtdDormitoriosDetalhe]);

  useEffect(() => {
    setCozinhasDetalhe((current) =>
      resizeAmbientes(current, toNonNegativeIntegerOrZero(qtdCozinhasDetalhe), createCozinhaAmbiente),
    );
  }, [qtdCozinhasDetalhe]);

  useEffect(() => {
    setSalasDetalhe((current) =>
      resizeAmbientes(current, toNonNegativeIntegerOrZero(qtdSalasDetalhe), createSalaAmbiente),
    );
  }, [qtdSalasDetalhe]);

  useEffect(() => {
    setVarandasDetalhe((current) =>
      resizeAmbientes(current, toNonNegativeIntegerOrZero(qtdVarandasDetalhe), createVarandaAmbiente),
    );
  }, [qtdVarandasDetalhe]);

  useEffect(() => {
    if (!isUsoComercial) return;
    setForm((current) => {
      if (!current) return current;
      if (!current.dormitorios && !current.suites) return current;
      return {
        ...current,
        dormitorios: "",
        suites: "",
      };
    });
    if (qtdDormitoriosDetalhe !== "") setQtdDormitoriosDetalhe("");
    if (dormitoriosDetalhe.length > 0) setDormitoriosDetalhe([]);
  }, [isUsoComercial, qtdDormitoriosDetalhe, dormitoriosDetalhe.length]);

  useEffect(() => {
    if (activeBlock !== 5) return;
    if (!item?.id || !form) return;
    if (step5HydratedRef.current === item.id) return;
    void loadStep5Ambientes(item.id, form);
  }, [activeBlock, form, item?.id]);

  useEffect(() => {
    if (activeBlock !== 7) return;
    if (!item?.id || !form) return;
    if (step5HydratedRef.current === item.id) return;
    void loadStep5Ambientes(item.id, form);
  }, [activeBlock, form, item?.id]);

  useEffect(() => {
    if (activeBlock !== 2 || readOnlyLocation) return;
    const query = searchAddress.trim();
    if (query.length < 3 || !isSearchFocused) {
      setPlaceOptions([]);
      setSearchingPlaces(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSearchingPlaces(true);
      const result = await apiFetchWithAuth<PlacePrediction[]>(
        `/api/google/places/autocomplete?input=${encodeURIComponent(query)}`,
      );
      if (!active) return;
      setSearchingPlaces(false);
      if (!result.ok) {
        setPlaceOptions([]);
        return;
      }
      setPlaceOptions(result.data);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [activeBlock, isSearchFocused, readOnlyLocation, searchAddress]);

  useEffect(() => {
    if (activeBlock !== 2 || readOnlyLocation) return;
    if (!form) return;
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
      const result = await apiFetchWithAuth<{
        place_id: string | null;
        formatted_address: string;
        lat: number | null;
        lng: number | null;
      }>(`/api/google/geocode?address=${encodeURIComponent(address)}`);

      if (!result.ok) return;
      setPlaceId(result.data.place_id ?? "");
      setEnderecoFormatado(result.data.formatted_address ?? address);
      setLat(result.data.lat ?? null);
      setLng(result.data.lng ?? null);
    }, 500);
  }, [
    activeBlock,
    readOnlyLocation,
    form,
    placeId,
    searchAddress,
    enderecoFormatado,
  ]);

  useEffect(() => {
    if (activeBlock !== 6 && activeBlock !== 8) return;

    const tipoImovel = (form?.tipo || item?.tipo || "").trim().toUpperCase();
    if (!tipoImovel) return;

    setLoadingCaracteristicasCatalogo(true);
    const query = new URLSearchParams({
      escopo: "IMOVEL",
      tipo_uso: tipoUsoApi,
      tipo_imovel: tipoImovel,
    });
    if (subtipoImovelApi) query.set("subtipo_imovel", subtipoImovelApi);

    void apiFetchWithAuth<CaracteristicaCatalogoItem[]>(
      `/api/caracteristicas/catalogo?${query.toString()}`,
    ).then((result) => {
      setLoadingCaracteristicasCatalogo(false);
      if (!result.ok) {
        setCaracteristicasCatalogo([]);
        return;
      }
      setCaracteristicasCatalogo(result.data.filter((catalogItem) => catalogItem.ativo !== false));
    });
  }, [activeBlock, form?.tipo, item?.tipo, subtipoImovelApi, tipoUsoApi]);

  useEffect(() => {
    if (activeBlock !== 6) return;
    if (!hasEmpreendimentoAssociado || !item?.empreendimento_id) {
      empreendimentoCaracteristicasHydratedRef.current = null;
      setEmpreendimentoCaracteristicasAssociadas([]);
      setShowEmpreendimentoCaracteristicasModal(false);
      return;
    }
    if (empreendimentoCaracteristicasHydratedRef.current === item.empreendimento_id) return;
    void loadEmpreendimentoCaracteristicasAssociadas(item.empreendimento_id);
  }, [activeBlock, hasEmpreendimentoAssociado, item?.empreendimento_id]);

  useEffect(() => {
    if (activeBlock !== 7) return;
    if (!hasEmpreendimentoAssociado || !item?.empreendimento_id) {
      empreendimentoAykaHydratedRef.current = null;
      setEmpreendimentoAssociadoAyka(null);
      return;
    }
    if (empreendimentoAykaHydratedRef.current === item.empreendimento_id) return;
    void loadEmpreendimentoAssociadoAykaContext(item.empreendimento_id);
  }, [activeBlock, hasEmpreendimentoAssociado, item?.empreendimento_id]);

  async function loadMidiasPublicasImovelHeader(
    imovelId: string,
    options?: { sync?: boolean },
  ) {
    setLoadingMidiasPublicasImovelHeader(true);
    const result = await apiFetchWithAuth<ImovelMidiaPublicaItem[]>(
      `/api/imoveis/${imovelId}/midia-publica`,
      options?.sync ? { method: "POST" } : undefined,
    );
    setLoadingMidiasPublicasImovelHeader(false);

    if (!result.ok) {
      setMidiasPublicasImovelHeader([]);
      return;
    }

    const ordered = [...result.data].sort((a, b) => {
      if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
      return a.ordem - b.ordem;
    });
    setMidiasPublicasImovelHeader(ordered);
  }

  async function loadMidiasImovel(imovelId: string) {
    setLoadingMidiasImovel(true);
    setBlockError(null);

    const result = await apiFetchWithAuth<ImovelMidiaItem[]>(`/api/imoveis/${imovelId}/midia`);
    setLoadingMidiasImovel(false);

    if (!result.ok) {
      setBlockError(result.error);
      return;
    }

    const nextMidias = result.data
      .filter((mediaItem) => mediaItem.tipo === "IMAGEM")
      .map((mediaItem) => {
        const storageParts = mediaItem.storage_path.split("/").filter(Boolean);
        const storageFileName =
          storageParts[storageParts.length - 1] ?? mediaItem.titulo ?? "imagem";
        const fileName = storageFileName.trim() || "imagem";
        const lowerFile = fileName.toLowerCase();
        const isHeic = lowerFile.endsWith(".heic") || lowerFile.endsWith(".heif");

        return {
          id: crypto.randomUUID(),
          midiaId: mediaItem.midia_id,
          fileName,
          sizeBytes: mediaItem.tamanho_bytes ?? 0,
          previewUrl: mediaItem.url,
          thumbUrl: null,
          isHeic,
          alt: mediaItem.alt ?? "",
          legenda: mediaItem.legenda ?? "",
          caracteristica: mediaItem.caracteristica ?? "",
        } satisfies ImageDraftItem;
      });

    const nextYoutubeVideos = result.data
      .filter((mediaItem) => mediaItem.tipo === "VIDEO")
      .map((mediaItem) => {
        const normalized = normalizeYouTubeUrl(mediaItem.url);
        const videoId = normalized ? getYouTubeVideoId(normalized) : null;
        if (!normalized || !videoId) return null;
        return {
          id: mediaItem.midia_id,
          url: normalized,
          videoId,
          title: mediaItem.titulo ?? null,
        } satisfies YoutubeVideoDraftItem;
      })
      .filter((mediaItem): mediaItem is YoutubeVideoDraftItem => mediaItem !== null);

    setMidiasImovel(nextMidias);
    setMediaSnapshot(serializeMidiasSnapshot(nextMidias));
    setYoutubeVideos(nextYoutubeVideos);
    setVideosSnapshot(serializeYoutubeVideosSnapshot(nextYoutubeVideos));
    setEditingMidiaImovelId(null);
  }

  useEffect(() => {
    if (!item?.id) return;
    if (item.status !== "PUBLICADO") return;
    void loadMidiasPublicasImovelHeader(item.id);
  }, [item?.id, item?.status]);

  useEffect(() => {
    if (activeBlock !== 8 && activeBlock !== 9) return;
    if (!item?.id) return;
    void loadMidiasImovel(item.id);
  }, [activeBlock, item?.id]);

  useEffect(() => {
    if (!hasEmpreendimentoAssociado || !item?.empreendimento_id) {
      setMidiasEmpreendimentoRelacionadas([]);
      return;
    }

    setLoadingMidiasEmpreendimentoRelacionadas(true);
    if (item.status === "PUBLICADO") {
      void apiFetchWithAuth<EmpreendimentoMidiaPublicaItem[]>(
        `/api/empreendimentos/${item.empreendimento_id}/midia-publica`,
      ).then(async (result) => {
        if (result.ok && result.data.length > 0) {
          const ordered = [...result.data].sort((a, b) => {
            if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
            return a.ordem - b.ordem;
          });
          setMidiasEmpreendimentoRelacionadas(ordered);
          setLoadingMidiasEmpreendimentoRelacionadas(false);
          return;
        }

        const syncResult = await apiFetchWithAuth<EmpreendimentoMidiaPublicaItem[]>(
          `/api/empreendimentos/${item.empreendimento_id}/midia-publica`,
          { method: "POST" },
        );
        setLoadingMidiasEmpreendimentoRelacionadas(false);
        if (!syncResult.ok) {
          setMidiasEmpreendimentoRelacionadas([]);
          return;
        }
        const ordered = [...syncResult.data].sort((a, b) => {
          if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
          return a.ordem - b.ordem;
        });
        setMidiasEmpreendimentoRelacionadas(ordered);
      });
      return;
    }

    void apiFetchWithAuth<ImovelMidiaItem[]>(
      `/api/empreendimentos/${item.empreendimento_id}/midia`,
    ).then((result) => {
      setLoadingMidiasEmpreendimentoRelacionadas(false);
      if (!result.ok) {
        setMidiasEmpreendimentoRelacionadas([]);
        return;
      }
      const mapped = result.data
        .filter((mediaItem) => mediaItem.tipo === "IMAGEM")
        .map((mediaItem, index) => ({
          midia_id: mediaItem.midia_id,
          indice_publico: index + 1,
          ordem: typeof mediaItem.ordem === "number" ? mediaItem.ordem : index,
          url: mediaItem.url,
          slug_publico: "",
          storage_bucket: mediaItem.storage_bucket,
          storage_path: mediaItem.storage_path,
        }));
      setMidiasEmpreendimentoRelacionadas(mapped);
    });
  }, [hasEmpreendimentoAssociado, item?.empreendimento_id, item?.status]);

  async function appendMidiaImovelFiles(files: File[]) {
    if (files.length === 0 || !item?.id) return;

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

    setRejectedMidiasImovel((current) => {
      for (const rejectedItem of current) {
        if (rejectedItem.previewUrl) {
          URL.revokeObjectURL(rejectedItem.previewUrl);
          rejectedPreviewUrlsRef.current.delete(rejectedItem.previewUrl);
        }
      }
      return rejected;
    });

    setBlockError(null);
    setBlockMessage(null);

    if (approved.length === 0) return;

    setUploadingMidiaImovel(true);
    setUploadingMidiaImovelPercent(0);

    const failedFiles: string[] = [];
    const totalBytesToUpload = approved.reduce((sum, file) => sum + file.size, 0);
    let uploadedBytesDone = 0;

    for (const file of approved) {
      const alreadyExists = midiasImovel.some(
        (mediaItem) => mediaItem.fileName === file.name && mediaItem.sizeBytes === file.size,
      );
      if (alreadyExists) continue;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("ordem", String(midiasImovel.length + approved.indexOf(file)));

      const token = await getAccessToken();
      if (!token) {
        failedFiles.push(file.name);
        uploadedBytesDone += file.size;
        if (totalBytesToUpload > 0) {
          setUploadingMidiaImovelPercent(
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
        xhr.open("POST", `/api/imoveis/${item.id}/midia`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable || totalBytesToUpload <= 0) return;
          const currentUploaded = uploadedBytesDone + event.loaded;
          const percent = Math.min(
            100,
            Math.max(0, Math.round((currentUploaded / totalBytesToUpload) * 100)),
          );
          setUploadingMidiaImovelPercent(percent);
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
        xhr.send(formData);
      });

      uploadedBytesDone += file.size;
      if (totalBytesToUpload > 0) {
        setUploadingMidiaImovelPercent(
          Math.min(100, Math.max(0, Math.round((uploadedBytesDone / totalBytesToUpload) * 100))),
        );
      }

      if (!uploadResult.ok) {
        failedFiles.push(file.name);
        continue;
      }

      setMidiasImovel((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          midiaId: uploadResult.data.id,
          fileName: file.name,
          sizeBytes: file.size,
          previewUrl: uploadResult.data.url,
          thumbUrl: null,
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
          setMidiasImovel((current) =>
            current.map((mediaItem) =>
              mediaItem.midiaId === uploadResult.data.id
                ? { ...mediaItem, thumbUrl: localThumb }
                : mediaItem,
            ),
          );
        }
      }
    }

    setUploadingMidiaImovel(false);
    setUploadingMidiaImovelPercent(null);

    if (failedFiles.length > 0) {
      setBlockError(`Falha no upload das imagens: ${failedFiles.join(", ")}`);
      return;
    }

    if (item.status === "PUBLICADO") {
      await loadMidiasPublicasImovelHeader(item.id);
    }
    setBlockMessage("Imagens enviadas.");
  }

  async function removeMidiaImovelById(id: string) {
    const target = midiasImovel.find((mediaItem) => mediaItem.id === id);
    if (!target || !item?.id) return;
    if (deletingMidiaImovelIds.includes(id)) return;

    setDeletingMidiaImovelIds((current) => [...current, id]);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${item.id}/midia/${target.midiaId}`, {
      method: "DELETE",
    });

    setDeletingMidiaImovelIds((current) => current.filter((itemId) => itemId !== id));

    if (!result.ok) {
      setBlockError(result.error);
      return;
    }

    if (target.thumbUrl) {
      URL.revokeObjectURL(target.thumbUrl);
      thumbPreviewUrlsRef.current.delete(target.thumbUrl);
    }
    setMidiasImovel((current) => current.filter((mediaItem) => mediaItem.id !== id));
    if (editingMidiaImovelId === id) setEditingMidiaImovelId(null);
    if (item.status === "PUBLICADO") {
      await loadMidiasPublicasImovelHeader(item.id);
    }
  }

  function applyMidiaImovelOrder(imageId: string, desiredOrderInput: string) {
    const desiredIndex = Number(desiredOrderInput) - 1;
    if (!Number.isInteger(desiredIndex)) return;

    setMidiasImovel((current) => {
      const fromIndex = current.findIndex((mediaItem) => mediaItem.id === imageId);
      if (fromIndex < 0) return current;
      const boundedTarget = Math.max(0, Math.min(current.length - 1, desiredIndex));
      if (boundedTarget === fromIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(boundedTarget, 0, moved);
      return next;
    });
  }

  function moveMidiaImovelToTarget(dragImageId: string, targetImageId: string) {
    if (dragImageId === targetImageId) return;
    setMidiasImovel((current) => {
      const fromIndex = current.findIndex((mediaItem) => mediaItem.id === dragImageId);
      const toIndex = current.findIndex((mediaItem) => mediaItem.id === targetImageId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleSelectPlace(option: PlacePrediction) {
    const result = await apiFetchWithAuth<{
      place_id: string;
      name: string;
      formatted_address: string;
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      estado: string;
      cep: string;
      lat: number | null;
      lng: number | null;
      address_components: unknown[];
    }>(`/api/google/places/details?placeId=${encodeURIComponent(option.place_id)}`);

    if (!result.ok) {
      setBlockError(result.error);
      return;
    }

    const details = result.data;
    setSearchAddress(details.formatted_address || option.description);
    setPlaceId(details.place_id ?? option.place_id);
    setSelectedPlaceName(details.name ?? "");
    setEnderecoFormatado(details.formatted_address ?? option.description);
    setAddressComponents(details.address_components ?? []);
    setLat(typeof details.lat === "number" ? details.lat : null);
    setLng(typeof details.lng === "number" ? details.lng : null);
    setPlaceOptions([]);
    setIsSearchFocused(false);

    setForm((current) =>
      current
        ? {
            ...current,
            logradouro: details.logradouro || current.logradouro,
            numero: details.numero || current.numero,
            bairro: details.bairro || current.bairro,
            cidade: details.cidade || current.cidade,
            estado: (details.estado || current.estado || "SP").toUpperCase(),
            cep: details.cep || current.cep,
          }
        : current,
    );
  }

  function handleSelectEditBlock(step: number) {
    if (switchingBlock || activeBlock === step) return;
    setBlockError(null);
    setBlockMessage(null);
    setEditingMidiaImovelId(null);
    setShowEmpreendimentoCaracteristicasModal(false);

    const startEnterTransition = () => {
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

  async function handleChangeStatus(nextStatus: Imovel["status"]) {
    if (!item) return;
    if (nextStatus === item.status) {
      setShowHeaderActionsMenu(false);
      return;
    }
    if (hasPendingChanges) {
      setShowHeaderActionsMenu(false);
      setBlockMessage("Salve ou descarte as alterações pendentes antes de alterar o status.");
      setTimeout(() => setBlockMessage(null), 2500);
      return;
    }
    setSavingStatus(true);
    setShowHeaderActionsMenu(false);
    setError(null);
    setMessage(null);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });

    setSavingStatus(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const refreshed = await apiFetchWithAuth<Imovel>(`/api/imoveis/${item.id}`);
    if (refreshed.ok) {
      setItem(refreshed.data);
    } else {
      setItem((current) => (current ? { ...current, status: nextStatus } : current));
    }
    setMessage("Status atualizado.");
  }

  async function handleDeleteImovel() {
    if (!item) return;
    if (savingStatus) return;
    if (hasPendingChanges) {
      setError("Salve ou descarte as alterações pendentes antes de excluir o imóvel.");
      return;
    }

    setSavingStatus(true);
    setError(null);
    setMessage(null);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${item.id}`, {
      method: "DELETE",
    });

    setSavingStatus(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/imoveis?exclusao_agendada=1");
  }

  function updateForm<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function buildAykaImovelPrompt(config: AykaConfig) {
    if (!form) return "";

    const endereco = [form.logradouro, form.numero, form.bairro, form.cidade, form.estado]
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item))
      .join(", ");
    const enderecoPublicacao =
      ENDERECO_VISUALIZACAO_OPTIONS.find((item) => item.value === form.enderecovisualizacao)?.label ??
      form.enderecovisualizacao;
    const empreendimentoNome = empreendimentoAssociadoAyka?.nome?.trim() || empreendimentoAssociadoNome;
    const empreendimentoBairroComercial = empreendimentoAssociadoAyka?.bairro_comercial?.trim() || null;
    const bairroComercialReferencia = hasEmpreendimentoAssociado
      ? empreendimentoBairroComercial
      : form.bairro_comercial.trim() || null;
    const empreendimentoDescricao = htmlToPlainText(empreendimentoAssociadoAyka?.descricao ?? "");
    const localizacaoContextoFonte = hasEmpreendimentoAssociado
      ? empreendimentoAssociadoAyka?.localizacao_contexto &&
        typeof empreendimentoAssociadoAyka.localizacao_contexto === "object" &&
        !Array.isArray(empreendimentoAssociadoAyka.localizacao_contexto)
        ? (empreendimentoAssociadoAyka.localizacao_contexto as Record<string, unknown>)
        : {}
      : {
          perfil_regiao: form.localizacao_perfil_regiao,
          mobilidade: form.localizacao_mobilidade,
          comercio_servicos: form.localizacao_comercio_servicos,
          lazer_estilo_vida: form.localizacao_lazer_estilo_vida,
          resumo_local: form.localizacao_resumo_local,
        };
    const localizacaoPerfilRegiao = Array.isArray(localizacaoContextoFonte.perfil_regiao)
      ? localizacaoContextoFonte.perfil_regiao
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .join(", ")
      : "";
    const localizacaoMobilidade = Array.isArray(localizacaoContextoFonte.mobilidade)
      ? localizacaoContextoFonte.mobilidade
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .join(", ")
      : "";
    const localizacaoComercioServicos = Array.isArray(localizacaoContextoFonte.comercio_servicos)
      ? localizacaoContextoFonte.comercio_servicos
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .join(", ")
      : "";
    const localizacaoLazerEstilo = Array.isArray(localizacaoContextoFonte.lazer_estilo_vida)
      ? localizacaoContextoFonte.lazer_estilo_vida
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .join(", ")
      : "";
    const localizacaoResumo =
      typeof localizacaoContextoFonte.resumo_local === "string"
        ? localizacaoContextoFonte.resumo_local.trim()
        : "";
    const formatoDescricaoSolicitado =
      config.formatoDescricao === "SECOES" ? "Dividir a descrição em partes" : "Texto fluído";
    const regraEstruturaDescricao = hasEmpreendimentoAssociado
      ? config.formatoDescricao === "SECOES"
        ? "6. Como há empreendimento associado e o formato é 'dividir em partes', organize o texto em 3 blocos/parágrafos nesta ordem: (a) introdução e público-alvo, (b) detalhes do imóvel, (c) detalhes do empreendimento e localização. Não crie títulos, subtítulos, listas ou cabeçalhos visíveis."
        : "6. Como há empreendimento associado, escreva em texto fluído, sem títulos de seção, integrando imóvel, empreendimento e localização de forma natural."
      : "6. Sem empreendimento associado, priorize detalhes do imóvel e da localização imediata.";
    const caracteristicas = caracteristicasCatalogo
      .filter((catalogItem) => caracteristicasSelecionadas.includes(catalogItem.chave))
      .map((catalogItem) => catalogItem.label_pt);
    const dormitoriosResumo = dormitoriosDetalhe
      .map((ambienteItem, index) => {
        const flags = [
          ambienteItem.eh_suite ? "suíte" : null,
          ambienteItem.suite_principal ? "suíte principal" : null,
          ambienteItem.tem_varanda ? "com varanda" : null,
          ambienteItem.ar_condicionado ? "ar-condicionado" : null,
          ambienteItem.closet ? "closet" : null,
          ambienteItem.armarios_planejados ? "armários planejados" : null,
        ]
          .filter((flag): flag is string => Boolean(flag))
          .join(", ");
        return `Dormitório ${index + 1}: área ${ambienteItem.area_m2 || "n/i"}m², piso ${
          ambienteItem.tipo_piso || "n/i"
        }, persiana ${ambienteItem.persiana_tipo || "n/i"}${flags ? `, ${flags}` : ""}`;
      })
      .join(" | ");
    const cozinhasResumo = cozinhasDetalhe
      .map((ambienteItem, index) => {
        const flags = [
          ambienteItem.armarios_planejados ? "armários planejados" : null,
          ambienteItem.fogao ? "fogão" : null,
          ambienteItem.forno ? "forno" : null,
          ambienteItem.geladeira ? "geladeira" : null,
          ambienteItem.microondas ? "micro-ondas" : null,
          ambienteItem.tipo_bancada ? `bancada ${ambienteItem.tipo_bancada.toLowerCase()}` : null,
        ]
          .filter((flag): flag is string => Boolean(flag))
          .join(", ");
        return `Cozinha ${index + 1}: área ${ambienteItem.area_m2 || "n/i"}m², tipo ${
          ambienteItem.tipo_cozinha || "n/i"
        }, piso ${ambienteItem.tipo_piso || "n/i"}${flags ? `, ${flags}` : ""}`;
      })
      .join(" | ");
    const salasResumo = salasDetalhe
      .map((ambienteItem, index) => {
        const flags =
          ambienteItem.diferenciais.length > 0
            ? `diferenciais ${ambienteItem.diferenciais.join(", ")}`
            : "";
        return `Sala ${index + 1}: área ${ambienteItem.area_m2 || "n/i"}m², tipo ${
          ambienteItem.tipo_sala || "n/i"
        }, layout ${ambienteItem.layout || "n/i"}, piso ${ambienteItem.tipo_piso || "n/i"}${
          flags ? `, ${flags}` : ""
        }`;
      })
      .join(" | ");
    const varandasResumo = varandasDetalhe
      .map((ambienteItem, index) => {
        const flags = [
          ambienteItem.churrasqueira_tipo ? `churrasqueira ${ambienteItem.churrasqueira_tipo.toLowerCase()}` : null,
          ambienteItem.fechada_com_vidro ? "fechada com vidro" : null,
          ambienteItem.bancada ? "bancada" : null,
          ambienteItem.ilha ? "ilha" : null,
          ambienteItem.fogao ? "fogão" : null,
          ambienteItem.frigobar ? "frigobar" : null,
          ambienteItem.chopeira ? "chopeira" : null,
          ambienteItem.tem_tv ? "tv" : null,
        ]
          .filter((flag): flag is string => Boolean(flag))
          .join(", ");
        return `Varanda ${index + 1}: área ${ambienteItem.area_m2 || "n/i"}m², tipo ${
          ambienteItem.tipo_varanda || "n/i"
        }, piso ${ambienteItem.tipo_piso || "n/i"}, persiana ${ambienteItem.persiana_tipo || "n/i"}${
          flags ? `, ${flags}` : ""
        }`;
      })
      .join(" | ");

    const maybeItemExtra = item as unknown as {
      andar?: number | null;
      mostrar_andar_no_anuncio?: boolean | null;
      ocupacao_imovel?: string | null;
      observacoes_gerais?: string | null;
    };
    const ocupacaoLabel = maybeItemExtra.ocupacao_imovel
      ? formatTipo(maybeItemExtra.ocupacao_imovel)
      : "Não informado";
    const observacoesGerais =
      typeof maybeItemExtra.observacoes_gerais === "string"
        ? maybeItemExtra.observacoes_gerais.trim()
        : "";
    const andarLabel =
      typeof maybeItemExtra.andar === "number" && Number.isFinite(maybeItemExtra.andar)
        ? String(maybeItemExtra.andar)
        : "Não informado";
    const mostrarAndarNoAnuncio = maybeItemExtra.mostrar_andar_no_anuncio === true;

    return `### CONTEXTO
Você é um redator imobiliário especialista em anúncios de imóveis no mercado brasileiro.

### OBJETIVO
Gerar descrição de anúncio de imóvel com linguagem comercial, clara, objetiva e persuasiva.

### REGRAS
1. Não inventar dados.
2. Usar apenas informações abaixo.
3. Entregar texto em HTML simples (2 a 4 parágrafos), com palavras-chave destacadas em <b>.
4. Evitar clichês e exageros.
5. Máximo ${MAX_DESCRICAO_IMOVEL_CHARS} caracteres sem contar tags HTML.
${regraEstruturaDescricao}

### DADOS DO IMÓVEL
- Tipo de uso: ${tipoUsoLabel}
- Tipo de imóvel: ${formatTipo(form.tipo)}
- Tipologia (quando houver): ${tipologiaAtualLabel || "Não informada"}
- Empreendimento associado: ${hasEmpreendimentoAssociado ? empreendimentoNome : "Não associado"}
- Bairro comercial de referência: ${bairroComercialReferencia || "Não informado"}
- Descrição do empreendimento: ${empreendimentoDescricao || "Não informada"}
- Contexto localização (perfil da região): ${localizacaoPerfilRegiao || "Não informado"}
- Contexto localização (mobilidade): ${localizacaoMobilidade || "Não informado"}
- Contexto localização (comércio e serviços): ${localizacaoComercioServicos || "Não informado"}
- Contexto localização (lazer e estilo de vida): ${localizacaoLazerEstilo || "Não informado"}
- Contexto localização (resumo local): ${localizacaoResumo || "Não informado"}
- Endereço base: ${endereco || "Não informado"}
- Visualização pública do endereço: ${enderecoPublicacao}
- Andar: ${andarLabel} (${mostrarAndarNoAnuncio ? "mostrar no anúncio" : "não mostrar no anúncio"})
- Área útil: ${form.area_util || "Não informado"} m²
- Área total: ${form.area_total || "Não informado"} m²
- Dormitórios: ${form.dormitorios || "Não informado"}
- Suítes: ${form.suites || "Não informado"}
- Banheiros: ${form.banheiros || "Não informado"}
- Lavabos: ${form.lavabos || "Não informado"}
- Salas: ${form.salas || "Não informado"}
- Cozinhas: ${form.cozinhas || "Não informado"}
- Varandas: ${qtdVarandasDetalhe || form.varandas || "Não informado"}
- Vagas: ${form.vagas || "Não informado"}
- Tipo negociação: ${
      TIPO_NEGOCIACAO_OPTIONS.find((option) => option.value === form.tipo_negociacao)?.label ||
      form.tipo_negociacao
    }
- Valor venda: ${form.preco_venda ? `R$ ${form.preco_venda}` : "Não informado"}
- Valor aluguel: ${form.preco_locacao ? `R$ ${form.preco_locacao}` : "Não informado"}
- Ocupação do imóvel: ${ocupacaoLabel}
- Observações gerais do corretor: ${observacoesGerais || "Nenhuma"}
- Detalhes dormitórios: ${dormitoriosResumo || "Não informado"}
- Detalhes cozinhas: ${cozinhasResumo || "Não informado"}
- Detalhes salas: ${salasResumo || "Não informado"}
- Detalhes varandas: ${varandasResumo || "Não informado"}
- Características: ${caracteristicas.length > 0 ? caracteristicas.join(", ") : "Nenhuma"}
- Quantidade de mídias: ${midiasImovel.length}
- Tom: ${config.tom}
- Voz: ${config.voz}
- Estilo: ${config.estilo}
- Formato da descrição: ${hasEmpreendimentoAssociado ? formatoDescricaoSolicitado : "Texto fluído (padrão)"}
- Incluir CTA: ${config.incluirCta ? "Sim" : "Não"}
- Público-alvo: ${
      config.publicosSelecionados.length > 0
        ? config.publicosSelecionados.map((item) => `${item.categoria} > ${item.subcategoria}`).join(", ")
        : "Não informado"
    }
- Observação geral final para a Ayka: ${config.observacaoGeral || "Nenhuma"}

### SAÍDA
Retorne SOMENTE JSON válido:
{
  "descricao_html": "<p>...</p><p>...</p>"
}`;
  }

  async function handleRequestOpenAykaImovel(): Promise<string | null> {
    setBlockError(null);
    setBlockMessage(null);
    setCheckingAykaCreditos(true);

    let actionToUse = "CRIAR_DESCRICAO_IMOVEL";
    let disponibilidade = await apiFetchWithAuth<AykaDisponibilidadeResponse>(
      "/api/ayka/creditos/disponibilidade?acao=CRIAR_DESCRICAO_IMOVEL",
    );

    if (!disponibilidade.ok) {
      disponibilidade = await apiFetchWithAuth<AykaDisponibilidadeResponse>(
        "/api/ayka/creditos/disponibilidade?acao=CRIAR_DESCRICAO_EMPREENDIMENTO",
      );
      actionToUse = "CRIAR_DESCRICAO_EMPREENDIMENTO";
    }

    setCheckingAykaCreditos(false);

    if (!disponibilidade.ok) {
      setBlockError(disponibilidade.error);
      return disponibilidade.error;
    }

    if (!disponibilidade.data.pode_executar) {
      setBlockError(disponibilidade.data.detalhe);
      return disponibilidade.data.detalhe;
    }

    setAykaActionCodigo(actionToUse);
    return null;
  }

  async function handleGenerateAykaDescricaoImovel(config: AykaConfig): Promise<string | null> {
    setGerandoDescricaoAyka(true);
    const result = await apiFetchWithAuth<AykaDescricaoGeradaResponse>("/api/ayka/descricao/gerar", {
      method: "POST",
      body: JSON.stringify({
        acao: aykaActionCodigo,
        prompt: buildAykaImovelPrompt(config),
      }),
    });
    setGerandoDescricaoAyka(false);

    if (!result.ok) {
      setBlockError(result.error);
      return result.error;
    }

    const nextDescricao = result.data.parsed?.descricao_html?.trim();
    if (!nextDescricao) {
      setBlockError("A Ayka não retornou descrição válida.");
      return "A Ayka não retornou descrição válida.";
    }

    setForm((current) => (current ? { ...current, descricao: nextDescricao } : current));
    setBlockMessage("Descrição gerada pela Ayka.");
    return null;
  }

  async function handleSaveBlock(step: number): Promise<boolean> {
    if (!item || !form) return false;
    setSavingBlock(step);
    setBlockError(null);
    setBlockMessage(null);

    let payload: Record<string, unknown> = {};

    if (step === 2) {
      payload = {
        logradouro: form.logradouro.trim(),
        numero: form.numero.trim(),
        endereco_complemento: form.endereco_complemento.trim() || null,
        enderecovisualizacao: form.enderecovisualizacao || "END_SEM_COMPLEMENTO",
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        estado: form.estado.trim().toUpperCase(),
        cep: form.cep.trim() || null,
        lat,
        lng,
        address_json: {
          place_id: placeId || null,
          place_name: selectedPlaceName || null,
          formatted_address: enderecoFormatado || null,
          bairro_comercial: form.bairro_comercial.trim() || null,
          address_components: addressComponents,
        },
        localizacao_contexto: {
          perfil_regiao: form.localizacao_perfil_regiao,
          mobilidade: form.localizacao_mobilidade,
          comercio_servicos: form.localizacao_comercio_servicos,
          lazer_estilo_vida: form.localizacao_lazer_estilo_vida,
          resumo_local: form.localizacao_resumo_local.trim() || null,
        },
      };
      if (!payload.logradouro || !payload.bairro || !payload.cidade || !payload.estado) {
        setBlockError("Preencha os campos principais de endereço (logradouro, bairro, cidade e UF).");
        setSavingBlock(null);
        return false;
      }
    }

    if (step === 3) {
      const parsedAreaTotal = parseOptionalDecimal(form.area_total);
      const parsedAreaUtil = parseOptionalDecimal(form.area_util);
      const parsedDormitorios = parseOptionalInteger(form.dormitorios);
      const parsedSuites = parseOptionalInteger(form.suites);
      const parsedBanheiros = parseOptionalInteger(form.banheiros);
      const parsedLavabos = parseOptionalInteger(form.lavabos);
      const parsedSalas = parseOptionalInteger(form.salas);
      const parsedCozinhas = parseOptionalInteger(form.cozinhas);
      const parsedVarandas = parseOptionalInteger(form.varandas);
      const parsedVagas = parseOptionalInteger(form.vagas);

      if (
        !parsedAreaTotal.ok ||
        !parsedAreaUtil.ok ||
        !parsedDormitorios.ok ||
        !parsedSuites.ok ||
        !parsedBanheiros.ok ||
        !parsedLavabos.ok ||
        !parsedSalas.ok ||
        !parsedCozinhas.ok ||
        !parsedVarandas.ok ||
        !parsedVagas.ok
      ) {
        setBlockError("Revise os campos numéricos com valor inválido.");
        setSavingBlock(null);
        return false;
      }

      if (parsedAreaUtil.value == null || parsedAreaUtil.value <= 0) {
        setBlockError("Área útil é obrigatória e deve ser maior que zero.");
        setSavingBlock(null);
        return false;
      }

      let parsedAreaTerreno: ReturnType<typeof parseOptionalDecimal> = { ok: true, value: null };
      let parsedFrenteMetros: ReturnType<typeof parseOptionalDecimal> = { ok: true, value: null };
      let parsedFundosMetros: ReturnType<typeof parseOptionalDecimal> = { ok: true, value: null };
      let parsedLateral1Metros: ReturnType<typeof parseOptionalDecimal> = { ok: true, value: null };
      let parsedLateral2Metros: ReturnType<typeof parseOptionalDecimal> = { ok: true, value: null };

      if (canShowTerrainFields) {
        parsedAreaTerreno = parseOptionalDecimal(form.area_terreno);
        parsedFrenteMetros = parseOptionalDecimal(form.frente_metros);
        parsedFundosMetros = parseOptionalDecimal(form.fundos_metros);
        parsedLateral1Metros = parseOptionalDecimal(form.lateral_1_metros);
        parsedLateral2Metros = parseOptionalDecimal(form.lateral_2_metros);

        if (
          !parsedAreaTerreno.ok ||
          !parsedFrenteMetros.ok ||
          !parsedFundosMetros.ok ||
          !parsedLateral1Metros.ok ||
          !parsedLateral2Metros.ok
        ) {
          setBlockError("Revise as medidas do terreno. Use somente números válidos.");
          setSavingBlock(null);
          return false;
        }
      }

      const dormitoriosPersist = isUsoComercial ? null : parsedDormitorios.value;
      const suitesPersist = isUsoComercial ? null : parsedSuites.value;

      payload = {
        area_total: parsedAreaTotal.value,
        area_util: parsedAreaUtil.value,
        dormitorios: dormitoriosPersist,
        suites: suitesPersist,
        banheiros: parsedBanheiros.value,
        lavabos: parsedLavabos.value,
        salas: parsedSalas.value,
        cozinhas: parsedCozinhas.value,
        vagas: parsedVagas.value,
        vaga_tipos: parsedVagas.value && parsedVagas.value > 0 ? form.vaga_tipos : [],
        vaga_tamanhos:
          parsedVagas.value && parsedVagas.value > 0 && form.vaga_tamanho ? [form.vaga_tamanho] : [],
        vaga_coberturas:
          parsedVagas.value && parsedVagas.value > 0 && form.vaga_cobertura ? [form.vaga_cobertura] : [],
        area_terreno: canShowTerrainFields ? parsedAreaTerreno.value : null,
        frente_metros: canShowTerrainFields ? parsedFrenteMetros.value : null,
        fundos_metros: canShowTerrainFields ? parsedFundosMetros.value : null,
        lateral_1_metros: canShowTerrainFields ? parsedLateral1Metros.value : null,
        lateral_2_metros: canShowTerrainFields ? parsedLateral2Metros.value : null,
      };
      step5HydratedRef.current = null;
    }

    if (step === 4) {
      if (!isTipoNegociacao(form.tipo_negociacao)) {
        setBlockError("Selecione o tipo de negociação.");
        setSavingBlock(null);
        return false;
      }

      const parsedPrecoVenda = parseOptionalCurrency(form.preco_venda);
      const parsedPrecoLocacao = parseOptionalCurrency(form.preco_locacao);
      const parsedValorCondominio = parseOptionalCurrency(form.condominio);
      const parsedValorIptu = parseOptionalCurrency(form.iptu);
      const parsedComissaoVenda = parseOptionalPercent(form.comissao_venda_percentual);
      const parsedMinimoMaos = parseOptionalCurrency(form.minimo_aceito_em_maos);
      const parsedComissaoCaptador = parseOptionalPercent(form.comissao_captador_percentual);
      const parsedExclusividadeComissaoMinha = parseOptionalPercent(
        form.exclusividade_comissao_minha_percentual,
      );
      const parsedComissaoVendedor = parseOptionalPercent(comissaoVendedorPercentualAuto);
      const parsedExclusividadeComissaoParceiro = parseOptionalPercent(
        exclusividadeComissaoParceiroAuto,
      );

      if (
        !parsedPrecoVenda.ok ||
        !parsedPrecoLocacao.ok ||
        !parsedValorCondominio.ok ||
        !parsedValorIptu.ok ||
        !parsedComissaoVenda.ok ||
        !parsedMinimoMaos.ok ||
        !parsedComissaoCaptador.ok ||
        !parsedComissaoVendedor.ok ||
        !parsedExclusividadeComissaoMinha.ok ||
        !parsedExclusividadeComissaoParceiro.ok
      ) {
        setBlockError("Revise os campos de negociação com valor inválido.");
        setSavingBlock(null);
        return false;
      }

      if (hasVendaNegociacao && parsedPrecoVenda.value == null) {
        setBlockError("Informe o valor de venda.");
        setSavingBlock(null);
        return false;
      }

      if (hasAluguelNegociacao && parsedPrecoLocacao.value == null) {
        setBlockError("Informe o valor de aluguel.");
        setSavingBlock(null);
        return false;
      }

      if (form.aceita_permuta && form.descricao_permuta.trim().length === 0) {
        setBlockError("Descreva a permuta quando a opção estiver marcada.");
        setSavingBlock(null);
        return false;
      }

      if (isCaptacaoParceria) {
        if (
          form.corretor_parceiro_nome.trim().length === 0 ||
          form.corretor_parceiro_telefone.trim().length === 0
        ) {
          setBlockError("Informe nome e telefone do corretor parceiro.");
          setSavingBlock(null);
          return false;
        }

        if (parsedComissaoCaptador.value == null || parsedComissaoVendedor.value == null) {
          setBlockError("Informe minha comissão para calcular a comissão do parceiro.");
          setSavingBlock(null);
          return false;
        }
      }

      if (isMinhaCaptacaoSemExclusividade) {
        if (
          form.proprietario_nome.trim().length === 0 ||
          form.proprietario_telefone.trim().length === 0
        ) {
          setBlockError("Informe nome e telefone do proprietário.");
          setSavingBlock(null);
          return false;
        }

        if (
          isParceriaSemExclusividadeAtiva &&
          (parsedComissaoCaptador.value == null || parsedComissaoVendedor.value == null)
        ) {
          setBlockError("Informe minha comissão para calcular a comissão do parceiro.");
          setSavingBlock(null);
          return false;
        }
      }

      if (isMinhaExclusividade) {
        if (
          form.proprietario_nome.trim().length === 0 ||
          form.proprietario_telefone.trim().length === 0
        ) {
          setBlockError("Informe nome e telefone do proprietário.");
          setSavingBlock(null);
          return false;
        }

        if (!form.exclusividade_data_vencimento) {
          setBlockError("Informe a data de vencimento da exclusividade.");
          setSavingBlock(null);
          return false;
        }

        if (form.exclusividade_data_vencimento < todayIsoDate) {
          setBlockError("A data de vencimento da exclusividade não pode estar no passado.");
          setSavingBlock(null);
          return false;
        }

        if (isParceriaExclusividadeAtiva) {
          if (
            parsedExclusividadeComissaoMinha.value == null ||
            parsedExclusividadeComissaoParceiro.value == null
          ) {
            setBlockError("Informe as comissões da parceria para a exclusividade.");
            setSavingBlock(null);
            return false;
          }
        }

        if (form.disponibilizar_no_bolsao_parceria) {
          if (!isParceriaExclusividadeAtiva) {
            setBlockError("Para ofertar no bolsão, marque que aceita parceria com outros corretores.");
            setSavingBlock(null);
            return false;
          }

          if (form.exclusividade_data_vencimento < minBolsaoExclusividadeIsoDate) {
            setBlockError(
              `Para oferecer no bolsão, o vencimento da exclusividade precisa ter no mínimo ${BOLSAO_EXCLUSIVIDADE_MIN_DIAS} dias a partir de hoje (mínimo: ${formatIsoDateToPtBr(minBolsaoExclusividadeIsoDate)}).`,
            );
            setSavingBlock(null);
            return false;
          }

          if (
            parsedExclusividadeComissaoMinha.value == null ||
            parsedExclusividadeComissaoParceiro.value == null
          ) {
            setBlockError("Preencha as comissões de exclusividade para disponibilizar no bolsão.");
            setSavingBlock(null);
            return false;
          }
        }

        if (!form.aceite_corretor_exclusivo) {
          setBlockError("Confirme o aceite de corretor exclusivo.");
          setSavingBlock(null);
          return false;
        }
      }

      const divisaoComissaoParceriaResumo =
        isMinhaExclusividade && isParceriaExclusividadeAtiva
          ? [
              parsedExclusividadeComissaoMinha.value != null
                ? `Minha ${numberToPercentInput(parsedExclusividadeComissaoMinha.value)}%`
                : null,
              parsedExclusividadeComissaoParceiro.value != null
                ? `Parceiro ${numberToPercentInput(parsedExclusividadeComissaoParceiro.value)}%`
                : null,
            ]
              .filter((value): value is string => Boolean(value))
              .join(" | ")
          : isMinhaCaptacaoSemExclusividade && isParceriaSemExclusividadeAtiva
            ? [
                parsedComissaoCaptador.value != null
                  ? `Minha ${numberToPercentInput(parsedComissaoCaptador.value)}%`
                  : null,
                parsedComissaoVendedor.value != null
                  ? `Parceiro ${numberToPercentInput(parsedComissaoVendedor.value)}%`
                  : null,
              ]
                .filter((value): value is string => Boolean(value))
                .join(" | ")
          : null;

      const hasContatoProprietario = isMinhaCaptacaoSemExclusividade || isMinhaExclusividade;
      const contatoNomePayload = isCaptacaoParceria
        ? form.corretor_parceiro_nome.trim() || null
        : hasContatoProprietario
          ? form.proprietario_nome.trim() || null
          : null;
      const contatoTelefonePayload = isCaptacaoParceria
        ? form.corretor_parceiro_telefone.trim() || null
        : hasContatoProprietario
          ? form.proprietario_telefone.trim() || null
          : null;
      const contatoEmailPayload = isCaptacaoParceria
        ? form.corretor_parceiro_email.trim() || null
        : hasContatoProprietario
          ? form.proprietario_email.trim() || null
          : null;

      payload = {
        tipo_negociacao: form.tipo_negociacao,
        preco_venda: hasVendaNegociacao ? parsedPrecoVenda.value : null,
        preco_locacao: hasAluguelNegociacao ? parsedPrecoLocacao.value : null,
        condominio: hasEmpreendimentoAssociado ? parsedValorCondominio.value : null,
        iptu: parsedValorIptu.value,
        iptu_periodicidade: parsedValorIptu.value == null ? null : form.iptu_periodicidade === "MENSAL" ? "MENSAL" : "ANUAL",
        comissao_locacao: hasAluguelNegociacao ? form.comissao_locacao.trim() || null : null,
        comissao_venda_percentual: hasVendaNegociacao ? parsedComissaoVenda.value : null,
        minimo_aceito_em_maos: hasVendaNegociacao ? parsedMinimoMaos.value : null,
        aceita_permuta: hasVendaNegociacao ? form.aceita_permuta : false,
        descricao_permuta:
          hasVendaNegociacao && form.aceita_permuta ? form.descricao_permuta.trim() : null,
        veio_do_bolsao: false,
        captacao_corretor_parceiro: isCaptacaoParceria,
        corretor_parceiro_nome: contatoNomePayload,
        corretor_parceiro_telefone: contatoTelefonePayload,
        corretor_parceiro_email: contatoEmailPayload,
        comissao_captador_percentual: shouldShowComissaoParceria ? parsedComissaoCaptador.value : null,
        comissao_vendedor_percentual: shouldShowComissaoParceria ? parsedComissaoVendedor.value : null,
        outras_comissoes_percentual: null,
        exclusividade: isMinhaExclusividade,
        exclusividade_comissao_minha_percentual: isMinhaExclusividade
          ? parsedExclusividadeComissaoMinha.value
          : null,
        exclusividade_comissao_parceiro_percentual: isMinhaExclusividade
          ? parsedExclusividadeComissaoParceiro.value
          : null,
        exclusividade_outras_comissoes_percentual: null,
        exclusividade_data_vencimento: isMinhaExclusividade ? form.exclusividade_data_vencimento : null,
        exclusividade_observacoes: isMinhaExclusividade ? form.exclusividade_observacoes.trim() || null : null,
        disponibilizar_no_bolsao_parceria: isMinhaExclusividade ? form.disponibilizar_no_bolsao_parceria : false,
        bolsao_permitir_mudanca_preco:
          isMinhaExclusividade && form.disponibilizar_no_bolsao_parceria
            ? form.bolsao_permitir_mudanca_preco
            : false,
        bolsao_permitir_download_midia_kit:
          isMinhaExclusividade && form.disponibilizar_no_bolsao_parceria
            ? form.bolsao_permitir_download_midia_kit
            : false,
        bolsao_somente_visitas_agendadas:
          isMinhaExclusividade && form.disponibilizar_no_bolsao_parceria
            ? form.bolsao_somente_visitas_agendadas
            : false,
        bolsao_somente_visitas_com_minha_presenca:
          isMinhaExclusividade && form.disponibilizar_no_bolsao_parceria
            ? form.bolsao_somente_visitas_com_minha_presenca
            : false,
        aceite_corretor_exclusivo: isMinhaExclusividade ? form.aceite_corretor_exclusivo : false,
        regra_geral_exclusividade: null,
        aceita_parceria_status:
          isMinhaExclusividade || isMinhaCaptacaoSemExclusividade
            ? form.aceita_parceria_status || null
            : null,
        divisao_comissao_parceria: divisaoComissaoParceriaResumo || null,
      };
    }

    if (step === 5) {
      const parsedQtdDormitorios = parseOptionalInteger(qtdDormitoriosDetalhe);
      const parsedQtdCozinhas = parseOptionalInteger(qtdCozinhasDetalhe);
      const parsedQtdSalas = parseOptionalInteger(qtdSalasDetalhe);
      const parsedQtdVarandas = parseOptionalInteger(qtdVarandasDetalhe);

      if (!parsedQtdDormitorios.ok || !parsedQtdCozinhas.ok || !parsedQtdSalas.ok || !parsedQtdVarandas.ok) {
        setSavingBlock(null);
        setBlockError("Revise as quantidades dos ambientes. Use apenas números inteiros.");
        return false;
      }

      const qtdDormitorios = parsedQtdDormitorios.value ?? 0;
      const qtdCozinhas = parsedQtdCozinhas.value ?? 0;
      const qtdSalas = parsedQtdSalas.value ?? 0;
      const qtdVarandas = parsedQtdVarandas.value ?? 0;

      const dormitoriosRows = resizeAmbientes(dormitoriosDetalhe, qtdDormitorios, createDormitorioAmbiente);
      const cozinhasRows = resizeAmbientes(cozinhasDetalhe, qtdCozinhas, createCozinhaAmbiente);
      const salasRows = resizeAmbientes(salasDetalhe, qtdSalas, createSalaAmbiente);
      const varandasRows = resizeAmbientes(varandasDetalhe, qtdVarandas, createVarandaAmbiente);

      if (dormitoriosRows.filter((ambienteItem) => ambienteItem.suite_principal).length > 1) {
        setSavingBlock(null);
        setBlockError("Defina apenas uma suíte principal.");
        return false;
      }

      if (salasRows.filter((ambienteItem) => ambienteItem.principal).length > 1) {
        setSavingBlock(null);
        setBlockError("Defina apenas uma sala principal.");
        return false;
      }

      const payloadAmbientes: Array<{
        tipo_ambiente: TipoAmbienteImovelValue;
        principal: boolean;
        area_m2: number | null;
        dados: Record<string, unknown>;
      }> = [];

      for (let index = 0; index < dormitoriosRows.length; index += 1) {
        const ambienteItem = dormitoriosRows[index];
        const parsedArea = parseOptionalDecimal(ambienteItem.area_m2);
        if (!parsedArea.ok) {
          setSavingBlock(null);
          setBlockError(`Dormitório ${index + 1}: informe uma área válida.`);
          return false;
        }
        if (ambienteItem.suite_principal && !ambienteItem.eh_suite) {
          setSavingBlock(null);
          setBlockError(
            `Dormitório ${index + 1}: suíte principal só pode ser marcada quando for suíte.`,
          );
          return false;
        }

        payloadAmbientes.push({
          tipo_ambiente: "DORMITORIO",
          principal: ambienteItem.eh_suite && ambienteItem.suite_principal,
          area_m2: parsedArea.value,
          dados: {
            eh_suite: ambienteItem.eh_suite,
            suite_principal: ambienteItem.eh_suite && ambienteItem.suite_principal,
            banheiro_armarios: ambienteItem.eh_suite && ambienteItem.banheiro_armarios,
            banheiro_pia_dupla: ambienteItem.eh_suite && ambienteItem.banheiro_pia_dupla,
            banheiro_box: ambienteItem.eh_suite && ambienteItem.banheiro_box,
            ar_condicionado: ambienteItem.ar_condicionado,
            closet: ambienteItem.closet,
            armarios_planejados: ambienteItem.armarios_planejados,
            tem_cama: ambienteItem.tem_cama,
            tem_tv: ambienteItem.tem_tv,
            tem_varanda: ambienteItem.tem_varanda,
            persiana_tipo: ambienteItem.persiana_tipo || null,
            tipo_piso: ambienteItem.tipo_piso || null,
          },
        });
      }

      for (let index = 0; index < cozinhasRows.length; index += 1) {
        const ambienteItem = cozinhasRows[index];
        const parsedArea = parseOptionalDecimal(ambienteItem.area_m2);
        if (!parsedArea.ok) {
          setSavingBlock(null);
          setBlockError(`Cozinha ${index + 1}: informe uma área válida.`);
          return false;
        }
        payloadAmbientes.push({
          tipo_ambiente: "COZINHA",
          principal: false,
          area_m2: parsedArea.value,
          dados: {
            tipo_cozinha: ambienteItem.tipo_cozinha || null,
            armarios_planejados: ambienteItem.armarios_planejados,
            fogao: ambienteItem.fogao,
            forno: ambienteItem.forno,
            geladeira: ambienteItem.geladeira,
            microondas: ambienteItem.microondas,
            bancada: Boolean(ambienteItem.tipo_bancada),
            tipo_bancada: ambienteItem.tipo_bancada || null,
            tipo_piso: ambienteItem.tipo_piso || null,
          },
        });
      }

      for (let index = 0; index < salasRows.length; index += 1) {
        const ambienteItem = salasRows[index];
        const parsedArea = parseOptionalDecimal(ambienteItem.area_m2);
        if (!parsedArea.ok) {
          setSavingBlock(null);
          setBlockError(`Sala ${index + 1}: informe uma área válida.`);
          return false;
        }
        payloadAmbientes.push({
          tipo_ambiente: "SALA",
          principal: ambienteItem.principal,
          area_m2: parsedArea.value,
          dados: {
            tipo_sala: ambienteItem.tipo_sala || null,
            layout: ambienteItem.layout || null,
            tipo_piso: ambienteItem.tipo_piso || null,
            diferenciais: ambienteItem.diferenciais,
          },
        });
      }

      for (let index = 0; index < varandasRows.length; index += 1) {
        const ambienteItem = varandasRows[index];
        const parsedArea = parseOptionalDecimal(ambienteItem.area_m2);
        if (!parsedArea.ok) {
          setSavingBlock(null);
          setBlockError(`Varanda ${index + 1}: informe uma área válida.`);
          return false;
        }
        payloadAmbientes.push({
          tipo_ambiente: "VARANDA",
          principal: false,
          area_m2: parsedArea.value,
          dados: {
            tipo_varanda: ambienteItem.tipo_varanda || null,
            churrasqueira_tipo: ambienteItem.churrasqueira_tipo || null,
            bancada: ambienteItem.bancada,
            persiana_tipo: ambienteItem.persiana_tipo || null,
            fechada_com_vidro: ambienteItem.fechada_com_vidro,
            ilha: ambienteItem.ilha,
            fogao: ambienteItem.fogao,
            frigobar: ambienteItem.frigobar,
            chopeira: ambienteItem.chopeira,
            tem_tv: ambienteItem.tem_tv,
            tipo_piso: ambienteItem.tipo_piso || null,
          },
        });
      }

      const resultAmbientes = await apiFetchWithAuth<{ id: string; ambientes: ImovelAmbienteApiItem[] }>(
        `/api/imoveis/${item.id}/ambientes`,
        {
          method: "PUT",
          body: JSON.stringify({ ambientes: payloadAmbientes }),
        },
      );

      if (!resultAmbientes.ok) {
        setSavingBlock(null);
        setBlockError(resultAmbientes.error);
        return false;
      }

      const nextQtdDormitorios = qtdDormitorios > 0 ? String(qtdDormitorios) : "";
      const nextQtdCozinhas = qtdCozinhas > 0 ? String(qtdCozinhas) : "";
      const nextQtdSalas = qtdSalas > 0 ? String(qtdSalas) : "";
      const nextQtdVarandas = qtdVarandas > 0 ? String(qtdVarandas) : "";
      const suitesDerivadas = dormitoriosRows.filter((ambienteItem) => ambienteItem.eh_suite).length;
      const nextSuites = suitesDerivadas > 0 ? String(suitesDerivadas) : "";
      const nextStep5Snapshot = serializeAmbientesSnapshot({
        qtdDormitorios: nextQtdDormitorios,
        qtdCozinhas: nextQtdCozinhas,
        qtdSalas: nextQtdSalas,
        qtdVarandas: nextQtdVarandas,
        dormitorios: dormitoriosRows,
        cozinhas: cozinhasRows,
        salas: salasRows,
        varandas: varandasRows,
      });

      setQtdDormitoriosDetalhe(nextQtdDormitorios);
      setQtdCozinhasDetalhe(nextQtdCozinhas);
      setQtdSalasDetalhe(nextQtdSalas);
      setQtdVarandasDetalhe(nextQtdVarandas);
      setDormitoriosDetalhe(dormitoriosRows);
      setCozinhasDetalhe(cozinhasRows);
      setSalasDetalhe(salasRows);
      setVarandasDetalhe(varandasRows);
      setStep5Snapshot(nextStep5Snapshot);
      step5HydratedRef.current = item.id;

      setForm((current) => {
        if (!current) return current;
        const nextForm = {
          ...current,
          dormitorios: nextQtdDormitorios,
          cozinhas: nextQtdCozinhas,
          salas: nextQtdSalas,
          varandas: nextQtdVarandas,
          suites: nextSuites,
        };
        setInitialSnapshot(
          JSON.stringify({
            form: nextForm,
            placeId,
            selectedPlaceName,
            enderecoFormatado,
            lat,
            lng,
          }),
        );
        return nextForm;
      });

      setItem((current) =>
        current
          ? {
              ...current,
              dormitorios: qtdDormitorios > 0 ? qtdDormitorios : null,
              cozinhas: qtdCozinhas > 0 ? qtdCozinhas : null,
              salas: qtdSalas > 0 ? qtdSalas : null,
              varandas: qtdVarandas > 0 ? qtdVarandas : null,
              suites: suitesDerivadas > 0 ? suitesDerivadas : null,
            }
          : current,
      );

      setSavingBlock(null);
      setBlockMessage("Bloco salvo com sucesso.");
      return true;
    }

    if (step === 6) {
      const caracteristicasOrdenadas = [...new Set(caracteristicasSelecionadas)]
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));

      payload = {
        caracteristicas: caracteristicasOrdenadas,
      };
    }

    if (step === 7) {
      if (descricaoImovelPlain.length > MAX_DESCRICAO_IMOVEL_CHARS) {
        setBlockError(`Descrição acima do limite de ${MAX_DESCRICAO_IMOVEL_CHARS} caracteres.`);
        setSavingBlock(null);
        return false;
      }

      payload = {
        descricao: descricaoImovelPlain.length > 0 ? form.descricao : null,
      };
    }

    if (step === 8) {
      if (uploadingMidiaImovel) {
        setBlockError("Aguarde o término do envio das imagens antes de salvar.");
        setSavingBlock(null);
        return false;
      }

      for (const mediaItem of midiasImovel) {
        if (!mediaItem.midiaId) continue;
        const result = await apiFetchWithAuth<{ id: string }>(
          `/api/imoveis/${item.id}/midia/${mediaItem.midiaId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              alt: mediaItem.alt.trim() || null,
              legenda: mediaItem.legenda.trim() || null,
              caracteristica: mediaItem.caracteristica.trim() || null,
            }),
          },
        );
        if (!result.ok) {
          setBlockError(result.error);
          setSavingBlock(null);
          return false;
        }
      }

      const persistedMidiaResult = await apiFetchWithAuth<ImovelMidiaItem[]>(
        `/api/imoveis/${item.id}/midia`,
      );
      if (!persistedMidiaResult.ok) {
        setBlockError(persistedMidiaResult.error);
        setSavingBlock(null);
        return false;
      }

      const orderedMidiaIds: string[] = [];
      const orderedSet = new Set<string>();

      for (const mediaItem of midiasImovel) {
        if (!mediaItem.midiaId || orderedSet.has(mediaItem.midiaId)) continue;
        orderedMidiaIds.push(mediaItem.midiaId);
        orderedSet.add(mediaItem.midiaId);
      }

      for (const mediaItem of persistedMidiaResult.data) {
        if (!mediaItem.midia_id || orderedSet.has(mediaItem.midia_id)) continue;
        orderedMidiaIds.push(mediaItem.midia_id);
        orderedSet.add(mediaItem.midia_id);
      }

      if (orderedMidiaIds.length > 0) {
        const reorderResult = await apiFetchWithAuth<{ total: number }>(`/api/imoveis/${item.id}/midia`, {
          method: "PATCH",
          body: JSON.stringify({ orderedMidiaIds }),
        });
        if (!reorderResult.ok) {
          setBlockError(reorderResult.error);
          setSavingBlock(null);
          return false;
        }
      }

      setMediaSnapshot(serializeMidiasSnapshot(midiasImovel));
      if (item.status === "PUBLICADO") {
        void loadMidiasPublicasImovelHeader(item.id);
      }
      setSavingBlock(null);
      setBlockMessage("Bloco salvo com sucesso.");
      return true;
    }

    if (step === 9) {
      if (youtubeVideos.length > MAX_YOUTUBE_VIDEOS) {
        setBlockError(`Você pode adicionar no máximo ${MAX_YOUTUBE_VIDEOS} vídeos.`);
        setSavingBlock(null);
        return false;
      }

      for (const videoItem of youtubeVideos) {
        if (!normalizeYouTubeUrl(videoItem.url) || !videoItem.videoId) {
          setBlockError("Há um link de vídeo do YouTube inválido. Revise antes de salvar.");
          setSavingBlock(null);
          return false;
        }
      }

      const persistedMidiaResult = await apiFetchWithAuth<ImovelMidiaItem[]>(
        `/api/imoveis/${item.id}/midia`,
      );
      if (!persistedMidiaResult.ok) {
        setBlockError(persistedMidiaResult.error);
        setSavingBlock(null);
        return false;
      }

      const currentVideoUrlSet = new Set(youtubeVideos.map((videoItem) => videoItem.url));
      const staleVideos = persistedMidiaResult.data.filter(
        (mediaItem) =>
          mediaItem.tipo === "VIDEO" &&
          !currentVideoUrlSet.has(normalizeYouTubeUrl(mediaItem.url) ?? ""),
      );
      for (const staleVideo of staleVideos) {
        const removeResult = await apiFetchWithAuth<{ id: string }>(
          `/api/imoveis/${item.id}/midia/${staleVideo.midia_id}`,
          {
            method: "DELETE",
          },
        );
        if (!removeResult.ok) {
          setBlockError(removeResult.error);
          setSavingBlock(null);
          return false;
        }
      }

      const persistedYoutubeUrls = new Set(
        persistedMidiaResult.data
          .filter((mediaItem) => mediaItem.tipo === "VIDEO")
          .map((mediaItem) => normalizeYouTubeUrl(mediaItem.url))
          .filter((videoUrl): videoUrl is string => Boolean(videoUrl)),
      );

      const missingYoutube = youtubeVideos.filter((videoItem) => !persistedYoutubeUrls.has(videoItem.url));
      for (let index = 0; index < missingYoutube.length; index += 1) {
        const videoItem = missingYoutube[index];
        const formData = new FormData();
        formData.append("youtube_url", videoItem.url);
        formData.append("ordem", String(midiasImovel.length + index));
        if (videoItem.title?.trim()) {
          formData.append("titulo", videoItem.title.trim());
        }
        const createResult = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${item.id}/midia`, {
          method: "POST",
          body: formData,
        });
        if (!createResult.ok) {
          setBlockError(createResult.error);
          setSavingBlock(null);
          return false;
        }
      }

      const refreshedMidiaResult = await apiFetchWithAuth<ImovelMidiaItem[]>(
        `/api/imoveis/${item.id}/midia`,
      );
      if (!refreshedMidiaResult.ok) {
        setBlockError(refreshedMidiaResult.error);
        setSavingBlock(null);
        return false;
      }

      const videoMidiaIdByUrl = new Map<string, string>();
      for (const mediaItem of refreshedMidiaResult.data) {
        if (mediaItem.tipo !== "VIDEO") continue;
        const normalizedUrl = normalizeYouTubeUrl(mediaItem.url);
        if (!normalizedUrl || videoMidiaIdByUrl.has(normalizedUrl)) continue;
        videoMidiaIdByUrl.set(normalizedUrl, mediaItem.midia_id);
      }

      const orderedVideoMidiaIds = youtubeVideos
        .map((videoItem) => videoMidiaIdByUrl.get(videoItem.url))
        .filter((midiaId): midiaId is string => Boolean(midiaId));

      const orderedMidiaIds = [
        ...midiasImovel.map((mediaItem) => mediaItem.midiaId).filter(Boolean),
        ...orderedVideoMidiaIds,
      ];

      if (orderedMidiaIds.length > 0) {
        const reorderResult = await apiFetchWithAuth<{ total: number }>(`/api/imoveis/${item.id}/midia`, {
          method: "PATCH",
          body: JSON.stringify({ orderedMidiaIds }),
        });
        if (!reorderResult.ok) {
          setBlockError(reorderResult.error);
          setSavingBlock(null);
          return false;
        }
      }

      setVideosSnapshot(serializeYoutubeVideosSnapshot(youtubeVideos));
      setSavingBlock(null);
      setBlockMessage("Bloco salvo com sucesso.");
      return true;
    }

    if (Object.keys(payload).length === 0) {
      setBlockError("Bloco sem edição disponível nesta versão.");
      setSavingBlock(null);
      return false;
    }

    const currentPublicUrlInput = buildImovelPublicUrlInput(item);
    const nextPublicUrlInput = buildImovelPublicUrlInput(item, payload);
    const shouldWarnUrlChange =
      item.status === "PUBLICADO" &&
      willImovelPublicUrlChange(currentPublicUrlInput, nextPublicUrlInput);

    if (shouldWarnUrlChange) {
      const currentSegment = resolveImovelPublicRouteSegment(currentPublicUrlInput);
      const nextSegment = resolveImovelPublicRouteSegment(nextPublicUrlInput);
      const nickname = profileNickname?.trim() || ":nickname";
      const currentSlug = item.slug_publico?.trim() || buildImovelPublicSlug(currentPublicUrlInput);
      const nextSlug = buildImovelPublicSlug(nextPublicUrlInput);
      const currentPath = `/${nickname}/${currentSegment}/${currentSlug}`;
      const nextPath = `/${nickname}/${nextSegment}/${nextSlug}`;
      const confirmed = window.confirm(
        [
          "Você alterou campos que impactam a URL pública deste imóvel.",
          "Ao salvar, a URL antiga deixará de funcionar.",
          "",
          `URL atual: ${currentPath}`,
          `Nova URL: ${nextPath}`,
          "",
          "Deseja continuar?",
        ].join("\n"),
      );
      if (!confirmed) {
        setSavingBlock(null);
        return false;
      }
    }

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    setSavingBlock(null);

    if (!result.ok) {
      setBlockError(result.error);
      return false;
    }

    const refreshed = await apiFetchWithAuth<Imovel>(`/api/imoveis/${item.id}`);
    if (refreshed.ok) {
      setItem(refreshed.data);
    } else {
      setItem((current) => (current ? { ...current, ...payload } : current));
    }
    if (step === 6) {
      setCaracteristicasSelecionadas(
        Array.isArray(payload.caracteristicas)
          ? payload.caracteristicas.filter(
              (item): item is string => typeof item === "string" && item.trim().length > 0,
            )
          : [],
      );
      setCaracteristicasSnapshot(
        serializeCaracteristicasSnapshot(
          Array.isArray(payload.caracteristicas)
            ? payload.caracteristicas.filter(
                (item): item is string => typeof item === "string" && item.trim().length > 0,
              )
            : [],
        ),
      );
    }
    if (step === 2 && !hasEmpreendimentoAssociado) {
      setLocationEditingEnabled(false);
    }
    setInitialSnapshot(currentSnapshot);
    setBlockMessage("Bloco salvo com sucesso.");
    return true;
  }

  function handleDiscardChanges() {
    if (!item) return;
    const nextForm = toEditForm(item);
    const nextCaracteristicasSelecionadas = Array.isArray(item.caracteristicas)
      ? item.caracteristicas.filter((caracteristica): caracteristica is string =>
          typeof caracteristica === "string" && caracteristica.trim().length > 0,
        )
      : [];
    setForm(nextForm);
    setCaracteristicaQuery("");
    setCaracteristicasSelecionadas(nextCaracteristicasSelecionadas);
    setCaracteristicasSnapshot(serializeCaracteristicasSnapshot(nextCaracteristicasSelecionadas));
    setShowEmpreendimentoCaracteristicasModal(false);
    setSearchAddress(
      String(
        item.address_json?.formatted_address ??
          formatAddressFromFields({
            logradouro: item.logradouro ?? "",
            numero: item.numero ?? "",
            bairro: item.bairro ?? "",
            cidade: item.cidade ?? "",
            estado: item.estado ?? "",
          }),
      ),
    );
    setPlaceId(String(item.address_json?.place_id ?? ""));
    setSelectedPlaceName(String(item.address_json?.place_name ?? ""));
    setEnderecoFormatado(String(item.address_json?.formatted_address ?? ""));
    setAddressComponents(
      Array.isArray(item.address_json?.address_components)
        ? (item.address_json?.address_components as unknown[])
        : [],
    );
    setLat(typeof item.lat === "number" ? item.lat : null);
    setLng(typeof item.lng === "number" ? item.lng : null);
    setInitialSnapshot(
      JSON.stringify({
        form: nextForm,
        placeId: String(item.address_json?.place_id ?? ""),
        selectedPlaceName: String(item.address_json?.place_name ?? ""),
        enderecoFormatado: String(item.address_json?.formatted_address ?? ""),
        lat: typeof item.lat === "number" ? item.lat : null,
        lng: typeof item.lng === "number" ? item.lng : null,
      }),
    );
    if (activeBlock === 8 || hasPendingMediaChanges) {
      setEditingMidiaImovelId(null);
      setRejectedMidiasImovel((current) => {
        for (const rejectedItem of current) {
          if (!rejectedItem.previewUrl) continue;
          URL.revokeObjectURL(rejectedItem.previewUrl);
          rejectedPreviewUrlsRef.current.delete(rejectedItem.previewUrl);
        }
        return [];
      });
      void loadMidiasImovel(item.id);
    }
    if (activeBlock === 9 || hasPendingVideosChanges) {
      setYoutubeUrlInput("");
      void loadMidiasImovel(item.id);
    }
    if (activeBlock === 6 || hasPendingCaracteristicasChanges) {
      empreendimentoCaracteristicasHydratedRef.current = null;
      if (hasEmpreendimentoAssociado && item.empreendimento_id) {
        void loadEmpreendimentoCaracteristicasAssociadas(item.empreendimento_id);
      } else {
        setEmpreendimentoCaracteristicasAssociadas([]);
      }
    }
    if (activeBlock === 7) {
      empreendimentoAykaHydratedRef.current = null;
      if (hasEmpreendimentoAssociado && item.empreendimento_id) {
        void loadEmpreendimentoAssociadoAykaContext(item.empreendimento_id);
      } else {
        setEmpreendimentoAssociadoAyka(null);
      }
    }
    if (activeBlock === 5 || hasPendingAmbientesChanges) {
      step5HydratedRef.current = null;
      void loadStep5Ambientes(item.id, nextForm);
    }
    setBlockError(null);
    setBlockMessage("Alterações descartadas.");
  }

  async function handleSaveFromFooter(closeAfterSave: boolean) {
    if (!activeBlock) {
      setBlockError("Selecione um bloco para salvar.");
      return;
    }
    const saved = await handleSaveBlock(activeBlock);
    if (saved && closeAfterSave) {
      router.push("/imoveis");
    }
  }

  async function handleSaveAndLeaveFromModal() {
    const destination = pendingNavigationHref;
    if (!destination) return;
    if (!activeBlock) {
      setBlockError("Selecione um bloco para salvar antes de sair.");
      return;
    }

    const saved = await handleSaveBlock(activeBlock);
    if (!saved) return;

    setShowUnsavedLeaveModal(false);
    setPendingNavigationHref(null);
    bypassUnsavedGuardRef.current = true;
    window.location.href = destination;
  }

  function handleDiscardAndLeaveFromModal() {
    if (!pendingNavigationHref) return;
    const destination = pendingNavigationHref;
    setShowUnsavedLeaveModal(false);
    setPendingNavigationHref(null);
    bypassUnsavedGuardRef.current = true;
    window.location.href = destination;
  }

  if (loading || !item) {
    return (
      <AppShell title="Editar imóvel" subtitle="Carregando dados...">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Carregando imóvel...
        </div>
      </AppShell>
    );
  }

  const toastItems: FloatingToastItem[] = [];
  if (error) {
    toastItems.push({
      id: "imovel-page-error",
      kind: "error",
      message: error,
      onClose: () => setError(null),
    });
  }
  if (message) {
    toastItems.push({
      id: "imovel-page-message",
      kind: "success",
      message,
      onClose: () => setMessage(null),
    });
  }
  if (blockError) {
    toastItems.push({
      id: "imovel-block-error",
      kind: "error",
      message: blockError,
      onClose: () => setBlockError(null),
    });
  }
  if (blockMessage) {
    toastItems.push({
      id: "imovel-block-message",
      kind: "success",
      message: blockMessage,
      onClose: () => setBlockMessage(null),
    });
  }

  return (
    <AppShell title="Editar imóvel" subtitle="Gestão dos blocos do cadastro">
      <FloatingToastViewport items={toastItems} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/imoveis"
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
          <div className="relative" ref={headerActionsRef}>
            <button
              type="button"
              onClick={() => setShowHeaderActionsMenu((current) => !current)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Status: {formatStatusLabel(item.status)}
              <CaretDown size={14} />
            </button>
            {showHeaderActionsMenu ? (
              <div className="absolute right-0 top-10 z-20 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
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
                {item.status !== "INATIVO" ? (
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void handleChangeStatus("INATIVO")}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Inativar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void handleChangeStatus("PAUSADO")}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reativar (pausado)
                  </button>
                )}
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => {
                    setShowHeaderActionsMenu(false);
                    setDeleteImovelConfirmText("");
                    setShowDeleteImovelModal(true);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Excluir imóvel
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
              <h1 className="text-2xl font-semibold text-slate-900">{headerTitle}</h1>
            </div>
            <p className="text-sm text-slate-600">{formatAddress(item)}</p>
            {hasEmpreendimentoAssociado && headerEmpreendimentoNome ? (
              <p className="text-sm text-slate-600">
                Empreendimento: <strong>{headerEmpreendimentoNome}</strong>
              </p>
            ) : null}
            <p className="text-sm text-slate-600">
              Código: <strong>{item.codigo?.trim() ? item.codigo : "Será gerado ao publicar"}</strong>
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Valores</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{headerValoresResumo}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              {loadingHeaderPublicGallery ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <CircleNotch size={13} className="animate-spin" />
                  Carregando
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  {headerPublicGalleryResumo}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, index) => {
                const imageItem = headerPublicGridImages[index];
                const imageUrl = imageItem?.primaryUrl ?? null;
                const fallbackImageUrl = imageItem?.fallbackUrl ?? null;
                const hasImage = typeof imageUrl === "string" && imageUrl.length > 0;
                const shouldOverlayTotal = index === 5 && headerPublicExtraImages > 0;
                return (
                  <button
                    key={`public-thumb-${index}`}
                    type="button"
                    onClick={() => {
                      if (hasImage) openPublicImageLightbox(index);
                    }}
                    disabled={!hasImage}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 disabled:cursor-default enabled:cursor-zoom-in"
                  >
                    {hasImage ? (
                      <img
                        src={buildThumbUrl(imageUrl) ?? imageUrl}
                        onError={(event) => {
                          if (imageItem?.source === "IMOVEL_PUBLICA") {
                            handleHeaderPublicImageLoadError(event.currentTarget, fallbackImageUrl);
                          }
                        }}
                        alt={`${item.titulo} - imagem ${index + 1}`}
                        className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          shouldOverlayTotal ? "scale-105 blur-[1.7px]" : ""
                        }`}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-1 text-center text-[11px] text-slate-500">
                        Sem imagem
                      </div>
                    )}
                    {shouldOverlayTotal ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/55 px-2 text-center text-xs font-semibold text-white">
                        +{headerPublicExtraImages}{" "}
                        {headerPublicExtraImages === 1 ? "imagem" : "imagens"}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {item.status !== "PUBLICADO" ? (
              <p className="mt-2 text-xs text-slate-500">
                As imagens públicas com marca d&apos;água são geradas após a publicação.
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {showPublicImageLightbox && currentPublicLightboxImageUrl ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/95 p-4"
          onClick={closePublicImageLightbox}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closePublicImageLightbox();
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
              goToPreviousPublicLightboxImage();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Imagem anterior"
          >
            <CaretLeft size={22} weight="bold" />
          </button>

          <div className="w-full max-w-[1600px]" onClick={(event) => event.stopPropagation()}>
            <p className="mb-3 text-center text-sm text-white/80">
              {currentPublicLightboxImageIndex + 1} de {headerPublicPhotoUrls.length}
            </p>
            <div className="flex max-h-[86vh] items-center justify-center overflow-hidden rounded-xl">
              <img
                src={currentPublicLightboxImageUrl}
                alt={`${item.titulo} - imagem ${currentPublicLightboxImageIndex + 1}`}
                className="max-h-[86vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToNextPublicLightboxImage();
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
          <p className="text-sm text-slate-500">Edite por etapa, no mesmo fluxo do cadastro guiado.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {EDIT_BLOCKS.map((block) => {
            const Icon = block.icon;
            const isActive = activeBlock === block.step;
            return (
              <button
                key={block.step}
                type="button"
                onClick={() => handleSelectEditBlock(block.step)}
                className={`cursor-pointer rounded-lg border px-3 py-3 text-left transition ${
                  isActive
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

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Selecione um bloco para abrir a edição abaixo, com o mesmo conteúdo da etapa do multistep.
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
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-lg font-semibold text-slate-900">
              {EDIT_BLOCKS.find((block) => block.step === activeBlock)?.title ?? "Edição"}
            </h4>
          </div>

          {form ? (
            <>
              {activeBlock === 2 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block flex-1">
                      <span className="mb-1 block text-sm text-slate-600">Busca por endereço ou place</span>
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
                            if (placeId && next !== enderecoFormatado) {
                              setPlaceId("");
                              setSelectedPlaceName("");
                            }
                          }}
                          placeholder="Ex: Av. Paulista, 200"
                          disabled={readOnlyLocation}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                        />
                        {searchingPlaces ? (
                          <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">
                            <CircleNotch size={14} className="animate-spin" />
                          </span>
                        ) : null}
                      </div>
                    </label>
                    {!hasEmpreendimentoAssociado ? (
                      <button
                        type="button"
                        onClick={() => setShowLocationEditConfirmModal(true)}
                        disabled={locationEditingEnabled}
                        className="self-end rounded-lg border border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 px-3 py-2 text-sm text-[var(--grey-olive)] hover:bg-[var(--grey-olive)]/15 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {locationEditingEnabled ? "Localização desbloqueada" : "Editar localização"}
                      </button>
                    ) : null}
                  </div>

                  {hasEmpreendimentoAssociado ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Endereço bloqueado: imóvel associado a empreendimento não pode alterar localização.
                    </p>
                  ) : null}

                  {isSearchFocused && !readOnlyLocation && placeOptions.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      {placeOptions.map((option) => (
                        <button
                          key={option.place_id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => void handleSelectPlace(option)}
                          className="flex w-full cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <MapPin size={14} />
                          <span>{option.description}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="mb-1 block text-sm text-slate-600">Logradouro</span>
                      <input
                        value={form.logradouro}
                        onChange={(event) =>
                          setForm((current) => (current ? { ...current, logradouro: event.target.value } : current))
                        }
                        disabled={readOnlyLocation}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Número</span>
                      <input
                        value={form.numero}
                        onChange={(event) => {
                          const nextNumero = event.target.value;

                          setForm((current) => (current ? { ...current, numero: nextNumero } : current));

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
                        disabled={readOnlyLocation}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Complemento</span>
                      <input
                        value={form.endereco_complemento ?? ""}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, endereco_complemento: event.target.value } : current,
                          )
                        }
                        disabled={readOnlyLocationExtra}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Bairro comercial</span>
                      <input
                        value={form.bairro_comercial ?? ""}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, bairro_comercial: event.target.value } : current,
                          )
                        }
                        disabled={readOnlyLocationExtra}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">CEP</span>
                      <input
                        value={form.cep}
                        onChange={(event) => setForm((current) => (current ? { ...current, cep: event.target.value } : current))}
                        disabled={readOnlyLocation}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Bairro</span>
                      <input
                        value={form.bairro}
                        onChange={(event) =>
                          setForm((current) => (current ? { ...current, bairro: event.target.value } : current))
                        }
                        disabled={readOnlyLocation}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Cidade</span>
                      <input
                        value={form.cidade}
                        onChange={(event) =>
                          setForm((current) => (current ? { ...current, cidade: event.target.value } : current))
                        }
                        disabled={readOnlyLocation}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block md:max-w-[180px]">
                      <span className="mb-1 block text-sm text-slate-600">UF</span>
                      <input
                        value={form.estado}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, estado: event.target.value.toUpperCase() } : current,
                          )
                        }
                        maxLength={2}
                        disabled={readOnlyLocation}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-1 block text-sm text-slate-600">Visualização do endereço</span>
                      <select
                        value={form.enderecovisualizacao ?? "END_SEM_COMPLEMENTO"}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, enderecovisualizacao: event.target.value } : current,
                          )
                        }
                        disabled={readOnlyLocationExtra}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      >
                        {ENDERECO_VISUALIZACAO_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-600">
                      Endereço formatado:{" "}
                      <strong>{enderecoFormatado || "Selecione um endereço para preencher automaticamente."}</strong>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Latitude: {lat ?? "-"} • Longitude: {lng ?? "-"}
                    </p>
                    {reviewMapEmbedUrl ? (
                      <iframe
                        title="Mapa do endereço"
                        src={reviewMapEmbedUrl}
                        loading="lazy"
                        className="mt-3 h-56 w-full rounded-lg border border-slate-200"
                      />
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contexto da localização</p>

                    <div>
                      <p className="mb-2 text-sm text-slate-700">Perfil da região</p>
                      <div className="flex flex-wrap gap-2">
                        {LOCALIZACAO_PERFIL_REGIAO_OPTIONS.map((option) => {
                          const active = form.localizacao_perfil_regiao.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={readOnlyLocationContext}
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        localizacao_perfil_regiao: active
                                          ? current.localizacao_perfil_regiao.filter((item) => item !== option)
                                          : [...current.localizacao_perfil_regiao, option],
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                active
                                  ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-slate-700">Mobilidade</p>
                      <div className="flex flex-wrap gap-2">
                        {LOCALIZACAO_MOBILIDADE_OPTIONS.map((option) => {
                          const active = form.localizacao_mobilidade.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={readOnlyLocationContext}
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        localizacao_mobilidade: active
                                          ? current.localizacao_mobilidade.filter((item) => item !== option)
                                          : [...current.localizacao_mobilidade, option],
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                active
                                  ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-slate-700">Comércio e serviços</p>
                      <div className="flex flex-wrap gap-2">
                        {LOCALIZACAO_COMERCIO_SERVICOS_OPTIONS.map((option) => {
                          const active = form.localizacao_comercio_servicos.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={readOnlyLocationContext}
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        localizacao_comercio_servicos: active
                                          ? current.localizacao_comercio_servicos.filter((item) => item !== option)
                                          : [...current.localizacao_comercio_servicos, option],
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                active
                                  ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-slate-700">Lazer e estilo de vida</p>
                      <div className="flex flex-wrap gap-2">
                        {LOCALIZACAO_LAZER_ESTILO_OPTIONS.map((option) => {
                          const active = form.localizacao_lazer_estilo_vida.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={readOnlyLocationContext}
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        localizacao_lazer_estilo_vida: active
                                          ? current.localizacao_lazer_estilo_vida.filter((item) => item !== option)
                                          : [...current.localizacao_lazer_estilo_vida, option],
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                active
                                  ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-600">Resumo local para descrição</span>
                      <textarea
                        value={form.localizacao_resumo_local}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? { ...current, localizacao_resumo_local: event.target.value.slice(0, 300) }
                              : current,
                          )
                        }
                        disabled={readOnlyLocationContext}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {form.localizacao_resumo_local.length}/300 caracteres
                      </p>
                    </label>
                  </div>
                </div>
              ) : null}

              {activeBlock === 3 ? (
                <div className="space-y-4">
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        {hasEmpreendimentoAssociado
                          ? "Contexto associado ao empreendimento"
                          : "Contexto definido na etapa 1.1"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                          {isUsoComercial ? "Comercial" : "Residencial"}
                        </span>
                        <span className="text-slate-400">›</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                          {formatTipo(form.tipo)}
                        </span>
                        {(item.empreendimento_tipologia_label || form.subtipo) ? (
                          <>
                            <span className="text-slate-400">›</span>
                            <span className="rounded-full border border-[var(--primary-scarlet)] bg-rose-50 px-3 py-1 text-[var(--primary-scarlet)]">
                              {item.empreendimento_tipologia_label || formatTipo(form.subtipo)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Área total (m²)</label>
                        <input
                          value={form.area_total}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, area_total: sanitizeDecimalPtBrInput(event.target.value) } : current,
                            )
                          }
                          onBlur={(event) =>
                            setForm((current) =>
                              current ? { ...current, area_total: normalizeDecimalPtBrInput(event.target.value) } : current,
                            )
                          }
                          inputMode="decimal"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                        <input
                          value={form.area_util}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, area_util: sanitizeDecimalPtBrInput(event.target.value) } : current,
                            )
                          }
                          onBlur={(event) =>
                            setForm((current) =>
                              current ? { ...current, area_util: normalizeDecimalPtBrInput(event.target.value) } : current,
                            )
                          }
                          inputMode="decimal"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Informe a área útil"
                        />
                      </div>
                      {!isUsoComercial ? (
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Dormitórios</label>
                          <input
                            value={form.dormitorios}
                            onChange={(event) =>
                              setForm((current) =>
                                current ? { ...current, dormitorios: event.target.value.replace(/\D/g, "") } : current,
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="Opcional"
                          />
                        </div>
                      ) : null}
                      {!isUsoComercial ? (
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Suítes</label>
                          <input
                            value={form.suites}
                            onChange={(event) =>
                              setForm((current) =>
                                current ? { ...current, suites: event.target.value.replace(/\D/g, "") } : current,
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="Opcional"
                          />
                        </div>
                      ) : null}
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Banheiros</label>
                        <input
                          value={form.banheiros}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, banheiros: event.target.value.replace(/\D/g, "") } : current,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Lavabos</label>
                        <input
                          value={form.lavabos}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, lavabos: event.target.value.replace(/\D/g, "") } : current,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Salas</label>
                        <input
                          value={form.salas}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, salas: event.target.value.replace(/\D/g, "") } : current,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Varandas</label>
                        <input
                          value={form.varandas}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, varandas: event.target.value.replace(/\D/g, "").slice(0, 2) } : current,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Cozinhas</label>
                        <input
                          value={form.cozinhas}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, cozinhas: event.target.value.replace(/\D/g, "") } : current,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Vagas</label>
                        <input
                          value={form.vagas}
                          onChange={(event) =>
                            setForm((current) =>
                              current ? { ...current, vagas: event.target.value.replace(/\D/g, "") } : current,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-700">Tipos de vaga</label>
                      <div className="flex flex-wrap gap-2">
                        {VAGA_TIPO_OPTIONS.map((option) => {
                          const selected = form.vaga_tipos.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={vagasCount <= 0}
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        vaga_tipos: current.vaga_tipos.includes(option.value)
                                          ? current.vaga_tipos.filter((item) => item !== option.value)
                                          : [...current.vaga_tipos, option.value],
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                selected
                                  ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-700">Tamanho da vaga (opção única)</label>
                      <div className="flex flex-wrap gap-2">
                        {VAGA_TAMANHO_OPTIONS.map((option) => {
                          const selected = form.vaga_tamanho === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={vagasCount <= 0}
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        vaga_tamanho: current.vaga_tamanho === option.value ? "" : option.value,
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                selected
                                  ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-700">Cobertura da vaga (opção única)</label>
                      <div className="flex flex-wrap gap-2">
                        {VAGA_COBERTURA_OPTIONS.map((option) => {
                          const selected = form.vaga_cobertura === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={vagasCount <= 0}
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        vaga_cobertura: current.vaga_cobertura === option.value ? "" : option.value,
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                selected
                                  ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {canShowTerrainFields ? (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-base font-medium text-slate-900">Terreno e medidas</h4>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-900">Área e medidas do terreno</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-sm text-slate-700">Área terreno (m²)</label>
                              <input
                                value={form.area_terreno}
                                onChange={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          area_terreno: sanitizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          area_terreno: normalizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                inputMode="decimal"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                placeholder="Opcional"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm text-slate-700">Frente (m)</label>
                              <input
                                value={form.frente_metros}
                                onChange={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          frente_metros: sanitizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          frente_metros: normalizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                inputMode="decimal"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                placeholder="Opcional"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm text-slate-700">Fundo (m)</label>
                              <input
                                value={form.fundos_metros}
                                onChange={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          fundos_metros: sanitizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          fundos_metros: normalizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                inputMode="decimal"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                placeholder="Opcional"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm text-slate-700">Lateral 1 (m)</label>
                              <input
                                value={form.lateral_1_metros}
                                onChange={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          lateral_1_metros: sanitizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          lateral_1_metros: normalizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                inputMode="decimal"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                placeholder="Opcional"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm text-slate-700">Lateral 2 (m)</label>
                              <input
                                value={form.lateral_2_metros}
                                onChange={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          lateral_2_metros: sanitizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                onBlur={(event) =>
                                  setForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          lateral_2_metros: normalizeDecimalPtBrInput(event.target.value),
                                        }
                                      : current,
                                  )
                                }
                                inputMode="decimal"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">Desenho aproximado do terreno</p>
                            {terrenoPreview ? (
                              <div className="text-right">
                                {terrenoPreview.areaInformada ? (
                                  <div className="text-xs text-slate-600">
                                    Área informada:{" "}
                                    {terrenoPreview.areaInformada.toLocaleString("pt-BR", {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    m²
                                  </div>
                                ) : null}
                                {terrenoPreview.areaCalculada ? (
                                  <div className="text-xs text-rose-600">
                                    Cálculo informativo:{" "}
                                    {terrenoPreview.areaCalculada.toLocaleString("pt-BR", {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    m²
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          {terrenoPreview ? (
                            <>
                              <svg
                                viewBox={terrenoPreview.viewBox}
                                className="h-56 w-full rounded-lg border border-slate-100 bg-white"
                                role="img"
                                aria-label="Pré-visualização de terreno"
                              >
                                <polygon
                                  points={terrenoPreview.points}
                                  fill="rgba(239, 68, 68, 0.12)"
                                  stroke="rgb(220, 38, 38)"
                                  strokeWidth={2}
                                />
                                {[terrenoPreview.corners.A, terrenoPreview.corners.B, terrenoPreview.corners.C, terrenoPreview.corners.D].map(
                                  (corner, index) => (
                                    <circle key={index} cx={corner.x} cy={corner.y} r={3} fill="rgb(220, 38, 38)" />
                                  ),
                                )}
                                {terrenoPreview.fundo ? (
                                  <text
                                    x={terrenoPreview.labels.top.x}
                                    y={terrenoPreview.labels.top.y}
                                    textAnchor="middle"
                                    className="fill-slate-700 text-[11px] font-medium"
                                  >
                                    Fundo: {formatMetersValue(terrenoPreview.fundo)}
                                  </text>
                                ) : null}
                                {terrenoPreview.frente ? (
                                  <text
                                    x={terrenoPreview.labels.bottom.x}
                                    y={terrenoPreview.labels.bottom.y}
                                    textAnchor="middle"
                                    className="fill-slate-700 text-[11px] font-medium"
                                  >
                                    Frente: {formatMetersValue(terrenoPreview.frente)}
                                  </text>
                                ) : null}
                                {terrenoPreview.lateral1 ? (
                                  <text
                                    x={terrenoPreview.labels.left.x}
                                    y={terrenoPreview.labels.left.y}
                                    textAnchor="middle"
                                    className="fill-slate-700 text-[11px] font-medium"
                                  >
                                    L1: {formatMetersValue(terrenoPreview.lateral1)}
                                  </text>
                                ) : null}
                                {terrenoPreview.lateral2 ? (
                                  <text
                                    x={terrenoPreview.labels.right.x}
                                    y={terrenoPreview.labels.right.y}
                                    textAnchor="middle"
                                    className="fill-slate-700 text-[11px] font-medium"
                                  >
                                    L2: {formatMetersValue(terrenoPreview.lateral2)}
                                  </text>
                                ) : null}
                              </svg>
                              <p className="mt-2 text-xs text-slate-500">
                                Ilustração proporcional com base nas medidas preenchidas.
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Preencha ao menos frente/fundo e uma lateral para calcular área e visualizar o desenho.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeBlock === 4 ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-700">Tipo de negociação</label>
                    <div className="flex flex-wrap gap-2">
                      {TIPO_NEGOCIACAO_OPTIONS.map((option) => {
                        const selected = form.tipo_negociacao === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateForm("tipo_negociacao", option.value)}
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                              selected
                                ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {hasVendaNegociacao ? (
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Valor de venda</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            R$
                          </span>
                          <input
                            value={form.preco_venda}
                            onChange={(event) => updateForm("preco_venda", formatCurrencyInput(event.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="850.000"
                          />
                        </div>
                      </div>
                    ) : null}

                    {hasAluguelNegociacao ? (
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Valor de aluguel</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            R$
                          </span>
                          <input
                            value={form.preco_locacao}
                            onChange={(event) => updateForm("preco_locacao", formatCurrencyInput(event.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="4.500"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className={`grid gap-3 ${hasEmpreendimentoAssociado ? "md:grid-cols-2" : ""}`}>
                    {hasEmpreendimentoAssociado ? (
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Valor do condomínio</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            R$
                          </span>
                          <input
                            value={form.condominio}
                            onChange={(event) => updateForm("condominio", formatCurrencyInput(event.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="850"
                          />
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Valor do IPTU</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                          R$
                        </span>
                        <input
                          value={form.iptu}
                          onChange={(event) => updateForm("iptu", formatCurrencyInput(event.target.value))}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="1.200"
                        />
                      </div>
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.iptu_periodicidade === "MENSAL"}
                          onChange={(event) =>
                            updateForm("iptu_periodicidade", event.target.checked ? "MENSAL" : "ANUAL")
                          }
                          className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                        />
                        IPTU mensal (desmarcado = anual)
                      </label>
                    </div>
                  </div>

                  {hasAluguelNegociacao ? (
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Comissão aluguel</label>
                      <input
                        value={form.comissao_locacao}
                        onChange={(event) => updateForm("comissao_locacao", event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        placeholder="Ex: Primeiro aluguel"
                      />
                    </div>
                  ) : null}

                  {hasVendaNegociacao ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Comissão de venda (%)</label>
                        <div className="relative">
                          <input
                            value={form.comissao_venda_percentual}
                            onChange={(event) =>
                              updateForm("comissao_venda_percentual", sanitizePercentInput(event.target.value))
                            }
                            onBlur={(event) =>
                              updateForm("comissao_venda_percentual", normalizePercentInput(event.target.value))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="6,00"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            %
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Ganho estimado:{" "}
                          <span className="font-medium text-slate-700">
                            {ganhoEstimadoComissaoVenda != null
                              ? formatCurrencyValue(ganhoEstimadoComissaoVenda)
                              : "informe valor e comissão"}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Mínimo aceito em mãos</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            R$
                          </span>
                          <input
                            value={form.minimo_aceito_em_maos}
                            onChange={(event) =>
                              updateForm("minimo_aceito_em_maos", formatCurrencyInput(event.target.value))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="780.000"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {hasVendaNegociacao ? (
                    <div className="space-y-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.aceita_permuta}
                          onChange={(event) =>
                            setForm((current) => {
                              if (!current) return current;
                              const nextChecked = event.target.checked;
                              return {
                                ...current,
                                aceita_permuta: nextChecked,
                                descricao_permuta: nextChecked ? current.descricao_permuta : "",
                              };
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                        />
                        Aceita permuta
                      </label>
                      {form.aceita_permuta ? (
                        <textarea
                          value={form.descricao_permuta}
                          onChange={(event) => updateForm("descricao_permuta", event.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Descreva o tipo de permuta aceita."
                        />
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <label className="mb-2 block text-sm text-slate-700">Modelo comercial</label>
                      <div className="grid gap-2 md:grid-cols-3">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => {
                              if (!current) return current;
                              const nextMode = current.modelo_captacao === "PARCERIA" ? "" : "PARCERIA";
                              if (nextMode !== "PARCERIA") return { ...current, modelo_captacao: nextMode };
                              return {
                                ...current,
                                modelo_captacao: nextMode,
                                exclusividade_data_vencimento: "",
                                exclusividade_observacoes: "",
                                disponibilizar_no_bolsao_parceria: false,
                                exclusividade_comissao_minha_percentual: "",
                                exclusividade_comissao_parceiro_percentual: "",
                                bolsao_permitir_mudanca_preco: false,
                                bolsao_permitir_download_midia_kit: false,
                                bolsao_somente_visitas_agendadas: false,
                                bolsao_somente_visitas_com_minha_presenca: false,
                                aceite_corretor_exclusivo: false,
                                aceita_parceria_status: "",
                                proprietario_nome: "",
                                proprietario_telefone: "",
                                proprietario_email: "",
                              };
                            })
                          }
                          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                            isCaptacaoParceria
                              ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {isCaptacaoParceria ? <Check size={16} weight="bold" /> : null}
                            <span>Captação parceria</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => {
                              if (!current) return current;
                              const nextMode =
                                current.modelo_captacao === "CAPTACAO_SEM_EXCLUSIVIDADE"
                                  ? ""
                                  : "CAPTACAO_SEM_EXCLUSIVIDADE";
                              if (nextMode !== "CAPTACAO_SEM_EXCLUSIVIDADE") {
                                return { ...current, modelo_captacao: nextMode };
                              }
                              return {
                                ...current,
                                modelo_captacao: nextMode,
                                exclusividade_data_vencimento: "",
                                exclusividade_observacoes: "",
                                disponibilizar_no_bolsao_parceria: false,
                                exclusividade_comissao_minha_percentual: "",
                                exclusividade_comissao_parceiro_percentual: "",
                                bolsao_permitir_mudanca_preco: false,
                                bolsao_permitir_download_midia_kit: false,
                                bolsao_somente_visitas_agendadas: false,
                                bolsao_somente_visitas_com_minha_presenca: false,
                                aceite_corretor_exclusivo: false,
                                corretor_parceiro_nome: "",
                                corretor_parceiro_telefone: "",
                                corretor_parceiro_email: "",
                              };
                            })
                          }
                          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                            isMinhaCaptacaoSemExclusividade
                              ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {isMinhaCaptacaoSemExclusividade ? <Check size={16} weight="bold" /> : null}
                            <span>Minha captação sem exclusividade</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => {
                              if (!current) return current;
                              const nextMode = current.modelo_captacao === "EXCLUSIVIDADE" ? "" : "EXCLUSIVIDADE";
                              if (nextMode !== "EXCLUSIVIDADE") return { ...current, modelo_captacao: nextMode };
                              return {
                                ...current,
                                modelo_captacao: nextMode,
                                corretor_parceiro_nome: "",
                                corretor_parceiro_telefone: "",
                                corretor_parceiro_email: "",
                                comissao_captador_percentual: "",
                                comissao_vendedor_percentual: "",
                              };
                            })
                          }
                          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                            isMinhaExclusividade
                              ? "border-[var(--grey-olive)] bg-[var(--grey-olive)]/10 text-[var(--grey-olive)]"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Crown size={16} weight={isMinhaExclusividade ? "fill" : "regular"} />
                            <span>Minha captação com exclusividade</span>
                          </span>
                        </button>
                      </div>
                    </div>

                    {isCaptacaoParceria ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Nome do corretor</label>
                          <input
                            value={form.corretor_parceiro_nome}
                            onChange={(event) => updateForm("corretor_parceiro_nome", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Telefone</label>
                          <input
                            value={form.corretor_parceiro_telefone}
                            onChange={(event) =>
                              updateForm("corretor_parceiro_telefone", formatPhoneDisplay(event.target.value))
                            }
                            placeholder="(11) 99999-0000"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Email</label>
                          <input
                            value={form.corretor_parceiro_email}
                            onChange={(event) => updateForm("corretor_parceiro_email", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          />
                        </div>
                      </div>
                    ) : null}

                    {isMinhaCaptacaoSemExclusividade || isMinhaExclusividade ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600">Dados do proprietário do imóvel.</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">Nome do proprietário</label>
                            <input
                              value={form.proprietario_nome}
                              onChange={(event) => updateForm("proprietario_nome", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">Telefone</label>
                            <input
                              value={form.proprietario_telefone}
                              onChange={(event) =>
                                updateForm("proprietario_telefone", formatPhoneDisplay(event.target.value))
                              }
                              placeholder="(11) 99999-0000"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">Email</label>
                            <input
                              value={form.proprietario_email}
                              onChange={(event) => updateForm("proprietario_email", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isMinhaCaptacaoSemExclusividade ? (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                          Parceria na captação
                        </p>
                        <div>
                          <div className="mb-1 flex items-center gap-1">
                            <label className="block text-sm text-slate-700">
                              Aceita parceria com outros corretores
                            </label>
                            <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.aceitaParceriaSemExclusividade} />
                          </div>
                          <select
                            value={form.aceita_parceria_status}
                            onChange={(event) =>
                              setForm((current) => {
                                if (!current) return current;
                                const nextStatus = isAceitaParceriaStatus(event.target.value)
                                  ? event.target.value
                                  : "";
                                const isAtiva = nextStatus === "SIM" || nextStatus === "SOB_ANALISE";
                                if (isAtiva) {
                                  return { ...current, aceita_parceria_status: nextStatus };
                                }
                                return {
                                  ...current,
                                  aceita_parceria_status: nextStatus,
                                  comissao_captador_percentual: "",
                                  comissao_vendedor_percentual: "",
                                };
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          >
                            <option value="">Selecione</option>
                            {ACEITA_PARCERIA_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {isParceriaSemExclusividadeAtiva ? (
                          <p className="text-xs text-slate-600">
                            Defina a divisão da comissão para substituir a regra textual.
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Selecione Sim ou Sob analise para configurar parceria.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {isMinhaExclusividade ? (
                      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div>
                          <p className="text-xs text-slate-600">Dados da exclusividade do imóvel.</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-1">
                          <div>
                            <div className="mb-1 flex items-center gap-1">
                              <label className="block text-sm text-slate-700">Vencimento da exclusividade</label>
                              <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.vencimento} />
                            </div>
                            <input
                              type="date"
                              value={form.exclusividade_data_vencimento}
                              onChange={(event) =>
                                setForm((current) => {
                                  if (!current) return current;
                                  const nextDate = event.target.value;
                                  const hasMin = nextDate >= minBolsaoExclusividadeIsoDate;
                                  if (!current.disponibilizar_no_bolsao_parceria || hasMin) {
                                    return { ...current, exclusividade_data_vencimento: nextDate };
                                  }
                                  return {
                                    ...current,
                                    exclusividade_data_vencimento: nextDate,
                                    disponibilizar_no_bolsao_parceria: false,
                                    bolsao_permitir_mudanca_preco: false,
                                    bolsao_permitir_download_midia_kit: false,
                                    bolsao_somente_visitas_agendadas: false,
                                    bolsao_somente_visitas_com_minha_presenca: false,
                                  };
                                })
                              }
                              min={form.disponibilizar_no_bolsao_parceria ? minBolsaoExclusividadeIsoDate : todayIsoDate}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              Se disponibilizar no bolsão, o vencimento deve ter no mínimo{" "}
                              {BOLSAO_EXCLUSIVIDADE_MIN_DIAS} dias a partir de hoje (mínimo:{" "}
                              {formatIsoDateToPtBr(minBolsaoExclusividadeIsoDate)}).
                            </p>
                          </div>
                        </div>

                        <textarea
                          value={form.exclusividade_observacoes}
                          onChange={(event) => updateForm("exclusividade_observacoes", event.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Observações da exclusividade"
                        />

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={form.aceite_corretor_exclusivo}
                            onChange={(event) => updateForm("aceite_corretor_exclusivo", event.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                          />
                          <span className="inline-flex items-center gap-1">
                            Eu assumo que sou o corretor exclusivo desse imóvel
                            <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.aceiteCorretor} />
                          </span>
                        </label>

                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                            Parceria na exclusividade
                          </p>
                          <div>
                            <div className="mb-1 flex items-center gap-1">
                              <label className="block text-sm text-slate-700">
                                Aceita parceria com outros corretores
                              </label>
                              <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.aceitaParceria} />
                            </div>
                            <select
                              value={form.aceita_parceria_status}
                              onChange={(event) =>
                                setForm((current) => {
                                  if (!current) return current;
                                  const nextStatus = isAceitaParceriaStatus(event.target.value)
                                    ? event.target.value
                                    : "";
                                  const isAtiva = nextStatus === "SIM" || nextStatus === "SOB_ANALISE";
                                  if (isAtiva) {
                                    return { ...current, aceita_parceria_status: nextStatus };
                                  }
                                  return {
                                    ...current,
                                    aceita_parceria_status: nextStatus,
                                    disponibilizar_no_bolsao_parceria: false,
                                    exclusividade_comissao_minha_percentual: "",
                                    exclusividade_comissao_parceiro_percentual: "",
                                    bolsao_permitir_mudanca_preco: false,
                                    bolsao_permitir_download_midia_kit: false,
                                    bolsao_somente_visitas_agendadas: false,
                                    bolsao_somente_visitas_com_minha_presenca: false,
                                  };
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            >
                              <option value="">Selecione</option>
                              {ACEITA_PARCERIA_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {isParceriaExclusividadeAtiva ? (
                            <>
                              <p className="text-xs text-slate-600">
                                Defina a divisão da comissão para substituir a regra textual.
                              </p>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <div className="mb-1 flex items-center gap-1">
                                    <label className="block text-sm text-slate-700">Minha comissão (%)</label>
                                    <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.minhaComissao} />
                                  </div>
                                  <div className="relative">
                                    <input
                                      value={form.exclusividade_comissao_minha_percentual}
                                      onChange={(event) =>
                                        setForm((current) => {
                                          if (!current) return current;
                                          const nextMinha = sanitizePercentInput(event.target.value);
                                          const parsed = parseOptionalPercent(nextMinha);
                                          const nextParceiro =
                                            parsed.ok && parsed.value != null
                                              ? numberToPercentInput(Math.max(0, 100 - parsed.value))
                                              : "";
                                          return {
                                            ...current,
                                            exclusividade_comissao_minha_percentual: nextMinha,
                                            exclusividade_comissao_parceiro_percentual: nextParceiro,
                                          };
                                        })
                                      }
                                      onBlur={(event) =>
                                        setForm((current) => {
                                          if (!current) return current;
                                          const normalized = normalizePercentInput(event.target.value);
                                          const parsed = parseOptionalPercent(normalized);
                                          const nextParceiro =
                                            parsed.ok && parsed.value != null
                                              ? numberToPercentInput(Math.max(0, 100 - parsed.value))
                                              : "";
                                          return {
                                            ...current,
                                            exclusividade_comissao_minha_percentual: normalized,
                                            exclusividade_comissao_parceiro_percentual: nextParceiro,
                                          };
                                        })
                                      }
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                      placeholder="50,00"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                      %
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Ganho estimado:{" "}
                                    <span className="font-medium text-slate-700">
                                      {ganhoEstimadoExclusividadeMinha != null
                                        ? formatCurrencyValue(ganhoEstimadoExclusividadeMinha)
                                        : hasVendaNegociacao
                                          ? "informe valor/comissão de venda e percentual"
                                          : "disponível quando houver venda"}
                                    </span>
                                  </p>
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center gap-1">
                                    <label className="block text-sm text-slate-700">Comissão parceiro (%)</label>
                                    <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.parceiroComissaoAutomatica} />
                                  </div>
                                  <div className="relative">
                                    <input
                                      value={exclusividadeComissaoParceiroAuto}
                                      readOnly
                                      disabled
                                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none"
                                      placeholder="50,00"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                      %
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Ganho estimado parceiro:{" "}
                                    <span className="font-medium text-slate-700">
                                      {ganhoEstimadoExclusividadeParceiro != null
                                        ? formatCurrencyValue(ganhoEstimadoExclusividadeParceiro)
                                        : hasVendaNegociacao
                                          ? "informe valor/comissão de venda e percentual"
                                          : "disponível quando houver venda"}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                    Bolsão de Exclusividade
                                  </p>
                                  <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.bolsao} />
                                </div>
                                <p className="mt-1 text-xs text-rose-700/90">
                                  Ative para liberar este imóvel no bolsão com regras para parceiros.
                                </p>
                                <p className="mt-1 text-xs font-medium text-rose-700/90">
                                  Exigência: vencimento da exclusividade com no mínimo{" "}
                                  {BOLSAO_EXCLUSIVIDADE_MIN_DIAS} dias a partir de hoje.
                                </p>
                                {!hasVencimentoMinimoParaBolsao ? (
                                  <p className="mt-1 text-xs text-rose-700">
                                    Defina o vencimento a partir de{" "}
                                    {formatIsoDateToPtBr(minBolsaoExclusividadeIsoDate)} para habilitar.
                                  </p>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={!hasVencimentoMinimoParaBolsao}
                                  onClick={() =>
                                    setForm((current) => {
                                      if (!current) return current;
                                      if (!hasVencimentoMinimoParaBolsao) {
                                        return { ...current, disponibilizar_no_bolsao_parceria: false };
                                      }
                                      const nextEnabled = !current.disponibilizar_no_bolsao_parceria;
                                      return {
                                        ...current,
                                        disponibilizar_no_bolsao_parceria: nextEnabled,
                                        bolsao_permitir_mudanca_preco: nextEnabled
                                          ? current.bolsao_permitir_mudanca_preco
                                          : false,
                                        bolsao_permitir_download_midia_kit: nextEnabled
                                          ? current.bolsao_permitir_download_midia_kit
                                          : false,
                                        bolsao_somente_visitas_agendadas: nextEnabled
                                          ? current.bolsao_somente_visitas_agendadas
                                          : false,
                                        bolsao_somente_visitas_com_minha_presenca: nextEnabled
                                          ? current.bolsao_somente_visitas_com_minha_presenca
                                          : false,
                                      };
                                    })
                                  }
                                  className={`mt-3 inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
                                    form.disponibilizar_no_bolsao_parceria
                                      ? "border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)] text-white hover:brightness-95"
                                      : "border-[var(--primary-scarlet)] bg-white text-[var(--primary-scarlet)] hover:bg-rose-100"
                                  } disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100`}
                                >
                                  {form.disponibilizar_no_bolsao_parceria
                                    ? "Bolsão ativado"
                                    : "Disponibilizar no Bolsão de Exclusividade"}
                                </button>
                              </div>

                              {form.disponibilizar_no_bolsao_parceria ? (
                                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                                    Regras para parceiros no bolsão
                                  </p>
                                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={form.bolsao_permitir_mudanca_preco}
                                      onChange={(event) =>
                                        updateForm("bolsao_permitir_mudanca_preco", event.target.checked)
                                      }
                                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                                    />
                                    <span className="inline-flex items-center gap-1">
                                      Permitir mudança de preço
                                      <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.regraMudancaPreco} />
                                    </span>
                                  </label>
                                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={form.bolsao_permitir_download_midia_kit}
                                      onChange={(event) =>
                                        updateForm("bolsao_permitir_download_midia_kit", event.target.checked)
                                      }
                                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                                    />
                                    <span className="inline-flex items-center gap-1">
                                      Permitir download do Midia Kit
                                      <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.regraDownloadMidiaKit} />
                                    </span>
                                  </label>
                                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={form.bolsao_somente_visitas_agendadas}
                                      onChange={(event) =>
                                        updateForm("bolsao_somente_visitas_agendadas", event.target.checked)
                                      }
                                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                                    />
                                    <span className="inline-flex items-center gap-1">
                                      Somente visitas agendadas
                                      <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.regraSomenteAgendada} />
                                    </span>
                                  </label>
                                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={form.bolsao_somente_visitas_com_minha_presenca}
                                      onChange={(event) =>
                                        updateForm(
                                          "bolsao_somente_visitas_com_minha_presenca",
                                          event.target.checked,
                                        )
                                      }
                                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                                    />
                                    <span className="inline-flex items-center gap-1">
                                      Somente visitas com minha presença
                                      <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.regraComPresenca} />
                                    </span>
                                  </label>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-xs text-slate-500">
                              Selecione Sim ou Sob analise para configurar parceria e bolsao.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {shouldShowComissaoParceria ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600">
                          Percentuais sobre o ganho da comissão de venda. Exemplo de mercado: 50/50.
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">
                              Minha comissão sobre o ganho (%)
                            </label>
                            <div className="relative">
                              <input
                                value={form.comissao_captador_percentual}
                                onChange={(event) =>
                                  setForm((current) => {
                                    if (!current) return current;
                                    const nextMinha = sanitizePercentInput(event.target.value);
                                    const parsed = parseOptionalPercent(nextMinha);
                                    const nextParceiro =
                                      parsed.ok && parsed.value != null
                                        ? numberToPercentInput(Math.max(0, 100 - parsed.value))
                                        : "";
                                    return {
                                      ...current,
                                      comissao_captador_percentual: nextMinha,
                                      comissao_vendedor_percentual: nextParceiro,
                                    };
                                  })
                                }
                                onBlur={(event) =>
                                  setForm((current) => {
                                    if (!current) return current;
                                    const normalized = normalizePercentInput(event.target.value);
                                    const parsed = parseOptionalPercent(normalized);
                                    const nextParceiro =
                                      parsed.ok && parsed.value != null
                                        ? numberToPercentInput(Math.max(0, 100 - parsed.value))
                                        : "";
                                    return {
                                      ...current,
                                      comissao_captador_percentual: normalized,
                                      comissao_vendedor_percentual: nextParceiro,
                                    };
                                  })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                placeholder="50,00"
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                %
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Ganho estimado:{" "}
                              <span className="font-medium text-slate-700">
                                {ganhoPotencialCaptador != null
                                  ? formatCurrencyValue(ganhoPotencialCaptador)
                                  : hasVendaNegociacao
                                    ? "informe valor/comissão de venda e percentual"
                                    : "disponível quando houver venda"}
                              </span>
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">
                              Comissão parceiro sobre o ganho (%)
                            </label>
                            <div className="relative">
                              <input
                                value={comissaoVendedorPercentualAuto}
                                readOnly
                                disabled
                                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none"
                                placeholder="50,00"
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                %
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Ganho estimado parceiro:{" "}
                              <span className="font-medium text-slate-700">
                                {ganhoPotencialVendedor != null
                                  ? formatCurrencyValue(ganhoPotencialVendedor)
                                  : hasVendaNegociacao
                                    ? "informe valor/comissão de venda e percentual"
                                    : "disponível quando houver venda"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeBlock === 5 ? (
                <div className="space-y-6">
                  <header>
                    <h3 className="text-2xl font-semibold text-slate-900">Etapa 5: Detalhes dos Ambientes</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Enriqueça seu anúncio: quanto mais detalhes informados, melhor seu anúncio é percebido
                      pelo mercado.
                    </p>
                  </header>

                  {loadingStep5 ? (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <CircleNotch size={16} className="animate-spin" />
                      Carregando dados dos ambientes...
                    </div>
                  ) : null}

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-base font-medium text-slate-900">Dormitórios</h4>
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Quantidade de dormitórios</label>
                      <input
                        value={qtdDormitoriosDetalhe}
                        onChange={(event) =>
                          setQtdDormitoriosDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-44"
                        placeholder="0"
                      />
                    </div>

                    {dormitoriosDetalhe.length > 0 ? (
                      <div className="space-y-3">
                        {dormitoriosDetalhe.map((ambienteItem, index) => (
                          <div
                            key={ambienteItem.local_id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <p className="mb-3 text-sm font-medium text-slate-900">Dormitório {index + 1}</p>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                                <input
                                  value={ambienteItem.area_m2}
                                  onChange={(event) =>
                                    setDormitoriosDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, area_m2: event.target.value } : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                  placeholder="Opcional"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Tipo de piso</label>
                                <select
                                  value={ambienteItem.tipo_piso}
                                  onChange={(event) =>
                                    setDormitoriosDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_piso: isAmbientePiso(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {AMBIENTE_PISO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                aria-pressed={ambienteItem.eh_suite}
                                onClick={() =>
                                  setDormitoriosDetalhe((current) =>
                                    current.map((row, rowIndex) => {
                                      if (rowIndex !== index) return row;
                                      if (!row.eh_suite) return { ...row, eh_suite: true };
                                      return {
                                        ...row,
                                        eh_suite: false,
                                        suite_principal: false,
                                        banheiro_armarios: false,
                                        banheiro_pia_dupla: false,
                                        banheiro_box: false,
                                      };
                                    }),
                                  )
                                }
                                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                  ambienteItem.eh_suite
                                    ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                }`}
                              >
                                É suíte
                              </button>
                              <button
                                type="button"
                                aria-pressed={ambienteItem.suite_principal}
                                disabled={!ambienteItem.eh_suite}
                                onClick={() =>
                                  setDormitoriosDetalhe((current) =>
                                    current.map((row, rowIndex) => {
                                      if (rowIndex === index) {
                                        return { ...row, suite_principal: !row.suite_principal };
                                      }
                                      return { ...row, suite_principal: false };
                                    }),
                                  )
                                }
                                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                  ambienteItem.suite_principal
                                    ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                Suíte principal
                              </button>
                            </div>

                            {ambienteItem.eh_suite ? (
                              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="flex flex-wrap gap-2">
                                  {([
                                    { key: "banheiro_armarios", label: "Banheiro com armários" },
                                    { key: "banheiro_pia_dupla", label: "Pia dupla" },
                                    { key: "banheiro_box", label: "Box" },
                                  ] as const).map((option) => {
                                    const selected = ambienteItem[option.key];
                                    return (
                                      <button
                                        key={option.key}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() =>
                                          setDormitoriosDetalhe((current) =>
                                            current.map((row, rowIndex) =>
                                              rowIndex === index
                                                ? { ...row, [option.key]: !row[option.key] }
                                                : row,
                                            ),
                                          )
                                        }
                                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                          selected
                                            ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {([
                                { key: "ar_condicionado", label: "Ar-condicionado" },
                                { key: "closet", label: "Closet" },
                                { key: "armarios_planejados", label: "Armários planejados" },
                                { key: "tem_cama", label: "Tem cama" },
                                { key: "tem_tv", label: "Tem TV" },
                                { key: "tem_varanda", label: "Varanda" },
                              ] as const).map((option) => {
                                const selected = ambienteItem[option.key];
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() =>
                                      setDormitoriosDetalhe((current) =>
                                        current.map((row, rowIndex) =>
                                          rowIndex === index ? { ...row, [option.key]: !row[option.key] } : row,
                                        ),
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                      selected
                                        ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3">
                              <label className="mb-2 block text-sm text-slate-700">Persiana</label>
                              <div className="flex flex-wrap gap-2">
                                {PERSIANA_TIPO_OPTIONS.map((option) => {
                                  const selected = ambienteItem.persiana_tipo === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() =>
                                        setDormitoriosDetalhe((current) =>
                                          current.map((row, rowIndex) =>
                                            rowIndex === index
                                              ? {
                                                  ...row,
                                                  persiana_tipo:
                                                    row.persiana_tipo === option.value ? "" : option.value,
                                                }
                                              : row,
                                          ),
                                        )
                                      }
                                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                        selected
                                          ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-base font-medium text-slate-900">Cozinhas</h4>
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Quantidade de cozinhas</label>
                      <input
                        value={qtdCozinhasDetalhe}
                        onChange={(event) =>
                          setQtdCozinhasDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-44"
                        placeholder="0"
                      />
                    </div>

                    {cozinhasDetalhe.length > 0 ? (
                      <div className="space-y-3">
                        {cozinhasDetalhe.map((ambienteItem, index) => (
                          <div
                            key={ambienteItem.local_id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <p className="mb-3 text-sm font-medium text-slate-900">Cozinha {index + 1}</p>
                            <div className="grid gap-3 md:grid-cols-4">
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                                <input
                                  value={ambienteItem.area_m2}
                                  onChange={(event) =>
                                    setCozinhasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, area_m2: event.target.value } : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                  placeholder="Opcional"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Tipo de cozinha</label>
                                <select
                                  value={ambienteItem.tipo_cozinha}
                                  onChange={(event) =>
                                    setCozinhasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_cozinha: isCozinhaTipo(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {COZINHA_TIPO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Tipo de piso</label>
                                <select
                                  value={ambienteItem.tipo_piso}
                                  onChange={(event) =>
                                    setCozinhasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_piso: isAmbientePiso(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {AMBIENTE_PISO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {([
                                { key: "armarios_planejados", label: "Armários planejados" },
                                { key: "fogao", label: "Fogão" },
                                { key: "forno", label: "Forno" },
                                { key: "geladeira", label: "Geladeira" },
                                { key: "microondas", label: "Micro-ondas" },
                              ] as const).map((option) => {
                                const selected = ambienteItem[option.key];
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() =>
                                      setCozinhasDetalhe((current) =>
                                        current.map((row, rowIndex) =>
                                          rowIndex === index ? { ...row, [option.key]: !row[option.key] } : row,
                                        ),
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                      selected
                                        ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3">
                              <div className="md:max-w-md">
                                <label className="mb-1 block text-sm text-slate-700">Tipo de bancada</label>
                                <select
                                  value={ambienteItem.tipo_bancada}
                                  onChange={(event) =>
                                    setCozinhasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_bancada: isCozinhaBancada(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {COZINHA_BANCADA_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-base font-medium text-slate-900">Salas</h4>
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Quantidade de salas</label>
                      <input
                        value={qtdSalasDetalhe}
                        onChange={(event) => setQtdSalasDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-44"
                        placeholder="0"
                      />
                    </div>

                    {salasDetalhe.length > 0 ? (
                      <div className="space-y-3">
                        {salasDetalhe.map((ambienteItem, index) => (
                          <div
                            key={ambienteItem.local_id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <p className="mb-3 text-sm font-medium text-slate-900">Sala {index + 1}</p>
                            <div className="grid gap-3 md:grid-cols-4">
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Área da sala (m²)</label>
                                <input
                                  value={ambienteItem.area_m2}
                                  onChange={(event) =>
                                    setSalasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, area_m2: event.target.value } : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                  placeholder="Opcional"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Tipo de sala</label>
                                <select
                                  value={ambienteItem.tipo_sala}
                                  onChange={(event) =>
                                    setSalasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_sala: isSalaTipo(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {SALA_TIPO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Layout</label>
                                <select
                                  value={ambienteItem.layout}
                                  onChange={(event) =>
                                    setSalasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              layout: isSalaLayout(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {SALA_LAYOUT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Tipo de piso</label>
                                <select
                                  value={ambienteItem.tipo_piso}
                                  onChange={(event) =>
                                    setSalasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_piso: isAmbientePiso(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {AMBIENTE_PISO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={ambienteItem.principal}
                                  onChange={(event) =>
                                    setSalasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        event.target.checked
                                          ? rowIndex === index
                                            ? { ...row, principal: true }
                                            : { ...row, principal: false }
                                          : rowIndex === index
                                            ? { ...row, principal: false }
                                            : row,
                                      ),
                                    )
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                                />
                                Sala principal
                              </label>
                            </div>

                            <div className="mt-3">
                              <label className="mb-2 block text-sm text-slate-700">Diferenciais</label>
                              <div className="flex flex-wrap gap-2">
                                {SALA_DIFERENCIAL_OPTIONS.map((option) => {
                                  const selected = ambienteItem.diferenciais.includes(option.value);
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() =>
                                        setSalasDetalhe((current) =>
                                          current.map((row, rowIndex) => {
                                            if (rowIndex !== index) return row;
                                            if (row.diferenciais.includes(option.value)) {
                                              return {
                                                ...row,
                                                diferenciais: row.diferenciais.filter(
                                                  (value) => value !== option.value,
                                                ),
                                              };
                                            }
                                            return {
                                              ...row,
                                              diferenciais: [...row.diferenciais, option.value],
                                            };
                                          }),
                                        )
                                      }
                                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                        selected
                                          ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {varandasDetalhe.length > 0 ? (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-base font-medium text-slate-900">Varandas</h4>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Quantidade de varandas</label>
                        <input
                          value={qtdVarandasDetalhe}
                          onChange={(event) =>
                            setQtdVarandasDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-44"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-3">
                        {varandasDetalhe.map((ambienteItem, index) => (
                          <div
                            key={ambienteItem.local_id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <p className="mb-3 text-sm font-medium text-slate-900">Varanda {index + 1}</p>
                            <div className="grid gap-3 md:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                                <input
                                  value={ambienteItem.area_m2}
                                  onChange={(event) =>
                                    setVarandasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, area_m2: event.target.value } : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                  placeholder="Opcional"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Tipo de varanda</label>
                                <select
                                  value={ambienteItem.tipo_varanda}
                                  onChange={(event) =>
                                    setVarandasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_varanda: isVarandaTipo(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {VARANDA_TIPO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Tipo de piso</label>
                                <select
                                  value={ambienteItem.tipo_piso}
                                  onChange={(event) =>
                                    setVarandasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              tipo_piso: isAmbientePiso(event.target.value)
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {AMBIENTE_PISO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm text-slate-700">Churrasqueira</label>
                                <select
                                  value={ambienteItem.churrasqueira_tipo}
                                  onChange={(event) =>
                                    setVarandasDetalhe((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? {
                                              ...row,
                                              churrasqueira_tipo: isVarandaChurrasqueira(
                                                event.target.value,
                                              )
                                                ? event.target.value
                                                : "",
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                                >
                                  <option value="">Selecione</option>
                                  {VARANDA_CHURRASQUEIRA_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {([
                                { key: "bancada", label: "Bancada" },
                                { key: "fechada_com_vidro", label: "Fechada com vidro" },
                                { key: "ilha", label: "Ilha" },
                                { key: "fogao", label: "Fogão" },
                                { key: "frigobar", label: "Frigobar" },
                                { key: "chopeira", label: "Chopeira" },
                                { key: "tem_tv", label: "TV" },
                              ] as const).map((option) => {
                                const selected = ambienteItem[option.key];
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() =>
                                      setVarandasDetalhe((current) =>
                                        current.map((row, rowIndex) =>
                                          rowIndex === index ? { ...row, [option.key]: !row[option.key] } : row,
                                        ),
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                      selected
                                        ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3">
                              <label className="mb-2 block text-sm text-slate-700">Persiana</label>
                              <div className="flex flex-wrap gap-2">
                                {PERSIANA_TIPO_OPTIONS.map((option) => {
                                  const selected = ambienteItem.persiana_tipo === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() =>
                                        setVarandasDetalhe((current) =>
                                          current.map((row, rowIndex) =>
                                            rowIndex === index
                                              ? {
                                                  ...row,
                                                  persiana_tipo:
                                                    row.persiana_tipo === option.value
                                                      ? ""
                                                      : option.value,
                                                }
                                              : row,
                                          ),
                                        )
                                      }
                                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                        selected
                                          ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeBlock === 6 ? (
                <div className="space-y-6">
                  <header>
                    <h3 className="text-2xl font-semibold text-slate-900">Etapa 6: características do imóvel</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Selecione os diferenciais da unidade. Isso melhora filtros, descrição e percepção do anúncio.
                    </p>
                  </header>

                  {hasEmpreendimentoAssociado ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-medium text-slate-900">
                            Características do empreendimento associado
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            {empreendimentoAssociadoNome} • {empreendimentoCaracteristicasAssociadas.length}{" "}
                            {empreendimentoCaracteristicasAssociadas.length === 1
                              ? "característica"
                              : "características"}
                          </p>
                        </div>
                        {empreendimentoCaracteristicasAssociadas.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setShowEmpreendimentoCaracteristicasModal(true)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                          >
                            Ver todas
                          </button>
                        ) : null}
                      </div>

                      {loadingEmpreendimentoCaracteristicasAssociadas ? (
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                          <CircleNotch size={16} className="animate-spin" />
                          Carregando características do empreendimento...
                        </div>
                      ) : empreendimentoCaracteristicasAssociadas.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {empreendimentoCaracteristicasAssociadasPreview.map((catalogItem) => (
                            <span
                              key={catalogItem.id}
                              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                            >
                              {catalogItem.label_pt}
                            </span>
                          ))}
                          {empreendimentoCaracteristicasAssociadasExtras > 0 ? (
                            <span className="rounded-full border border-slate-300 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                              + {empreendimentoCaracteristicasAssociadasExtras}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">
                          Este empreendimento não possui características cadastradas.
                        </p>
                      )}
                    </div>
                  ) : null}

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-slate-600">
                        Tipo de uso atual: <strong>{tipoUsoLabel}</strong> • {caracteristicasSelecionadas.length}{" "}
                        selecionada(s)
                      </p>
                      <input
                        value={caracteristicaQuery}
                        onChange={(event) => setCaracteristicaQuery(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-80"
                        placeholder="Buscar característica..."
                      />
                    </div>

                    {loadingCaracteristicasCatalogo ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CircleNotch size={16} className="animate-spin" />
                        Carregando características...
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-5">
                        {caracteristicasFiltradas.map((catalogItem) => {
                          const active = caracteristicasSelecionadas.includes(catalogItem.chave);
                          return (
                            <button
                              key={catalogItem.id}
                              type="button"
                              onClick={() =>
                                setCaracteristicasSelecionadas((current) => {
                                  if (current.includes(catalogItem.chave)) {
                                    return current.filter((value) => value !== catalogItem.chave);
                                  }
                                  return [...current, catalogItem.chave];
                                })
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                active
                                  ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                              }`}
                            >
                              {catalogItem.label_pt}
                            </button>
                          );
                        })}
                        {caracteristicasFiltradas.length === 0 ? (
                          <p className="text-sm text-slate-500">Nenhuma característica encontrada.</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {activeBlock === 7 ? (
                <div className="space-y-6">
                  <header>
                    <h3 className="text-2xl font-semibold text-slate-900">Etapa 7: descrição do anúncio</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Escreva uma descrição clara dos destaques do imóvel para elevar a conversão do anúncio.
                    </p>
                  </header>
                  <LongTextAykaEditor
                    label="Descrição"
                    value={form.descricao}
                    onChange={(value) =>
                      setForm((current) => (current ? { ...current, descricao: value } : current))
                    }
                    maxChars={MAX_DESCRICAO_IMOVEL_CHARS}
                    plainTextLength={descricaoImovelPlain.length}
                    prompt={buildAykaImovelPrompt({
                      tom: "Objetivo",
                      voz: "Consultiva",
                      estilo: "Foco em benefícios",
                      formatoDescricao: "FLUIDO",
                      incluirCta: true,
                      publicosSelecionados: [],
                      observacaoGeral: "",
                    })}
                    showPrompt={false}
                    onTogglePrompt={() => {}}
                    showPromptControls={false}
                    actionCodeLabel={aykaActionCodigo}
                    checkingAyka={checkingAykaCreditos}
                    generatingAyka={gerandoDescricaoAyka}
                    enableFormatoDescricao={hasEmpreendimentoAssociado}
                    onRequestOpenAyka={handleRequestOpenAykaImovel}
                    onGenerateAyka={handleGenerateAykaDescricaoImovel}
                  />
                </div>
              ) : null}

              {activeBlock === 8 ? (
                <div className="space-y-6">
                  <header>
                    <h3 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                      <ImageSquare size={24} />
                      Etapa 8: imagens do imóvel
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Organize suas imagens e preencha metadados em cada card.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Regras: máximo 15MB por imagem e resolução mínima de 800x600 px. A otimização para
                      1920px é feita no envio.
                    </p>
                  </header>

                  {hasEmpreendimentoAssociado ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Imagens já cadastradas no empreendimento
                          </h4>
                          <p className="mt-1 text-xs text-slate-600">
                            {empreendimentoAssociadoNome} • {imagensEmpreendimentoRelacionadas.length}{" "}
                            {imagensEmpreendimentoRelacionadas.length === 1 ? "imagem" : "imagens"}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-slate-700">
                          Total combinado atual: {totalMidiasCombinadas}
                        </p>
                      </div>

                      {loadingMidiasEmpreendimentoRelacionadas ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                          <CircleNotch size={14} className="animate-spin" />
                          Carregando miniaturas do empreendimento...
                        </div>
                      ) : imagensEmpreendimentoRelacionadas.length > 0 ? (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {imagensEmpreendimentoPreview.map((mediaItem) => (
                            <div
                              key={mediaItem.midia_id}
                              className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                            >
                              <img
                                src={buildThumbUrl(mediaItem.url) ?? mediaItem.url}
                                alt={mediaItem.alt ?? "Imagem do empreendimento"}
                                draggable={false}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                          {imagensEmpreendimentoExtras > 0 ? (
                            <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-800 text-sm font-semibold text-white">
                              + {imagensEmpreendimentoExtras}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">
                          Este empreendimento ainda não possui imagens na galeria.
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-600">
                        Alguns portais limitam o número total de imagens por anúncio. Nesse total, somamos
                        as imagens do imóvel e do empreendimento.
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        Ordem preferencial de exibição: imagens do imóvel primeiro, depois as do
                        empreendimento.
                      </p>
                    </div>
                  ) : null}

                  <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept="image/*,.heic,.heif"
                    onChange={(event) => {
                      void appendMidiaImovelFiles(Array.from(event.target.files ?? []));
                      event.currentTarget.value = "";
                    }}
                    className="sr-only"
                  />

                  <div
                    onDragEnter={(event) => {
                      const isFileDrag = event.dataTransfer.types?.includes("Files");
                      if (!isFileDrag) return;
                      event.preventDefault();
                      setIsMidiaImovelDragActive(true);
                    }}
                    onDragOver={(event) => {
                      const isFileDrag = event.dataTransfer.types?.includes("Files");
                      if (!isFileDrag) return;
                      event.preventDefault();
                      setIsMidiaImovelDragActive(true);
                    }}
                    onDragLeave={(event) => {
                      const isFileDrag = event.dataTransfer.types?.includes("Files");
                      if (!isFileDrag) return;
                      event.preventDefault();
                      setIsMidiaImovelDragActive(false);
                    }}
                    onDrop={(event) => {
                      const isFileDrag = event.dataTransfer.types?.includes("Files");
                      if (!isFileDrag) return;
                      event.preventDefault();
                      setIsMidiaImovelDragActive(false);
                      void appendMidiaImovelFiles(Array.from(event.dataTransfer.files ?? []));
                    }}
                    className={`rounded-xl border border-dashed p-5 text-center transition ${
                      isMidiaImovelDragActive
                        ? "border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)]/5"
                        : "border-slate-300 bg-slate-50"
                    }`}
                  >
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600">
                      <UploadSimple size={20} />
                    </div>
                    <p className="text-sm text-slate-700">Arraste imagens para cá</p>
                    <p className="mt-1 text-xs text-slate-500">JPG, JPEG, PNG, WEBP estático, HEIC e HEIF</p>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingMidiaImovel}
                      className="mt-3 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingMidiaImovel
                        ? `Enviando... ${uploadingMidiaImovelPercent ?? 0}%`
                        : "Escolher imagens"}
                    </button>
                  </div>

                  {uploadingMidiaImovel ? (
                    <div className="rounded-xl border border-[var(--primary-scarlet)]/30 bg-[var(--primary-scarlet)]/5 p-4">
                      <div className="flex items-center gap-3">
                        <CircleNotch size={28} className="animate-spin text-[var(--primary-scarlet)]" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--primary-scarlet)]">
                            Enviando imagens...
                          </p>
                          <p className="text-xs text-slate-600">
                            Progresso do envio: {uploadingMidiaImovelPercent ?? 0}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/80">
                        <div
                          className="h-full rounded-full bg-[var(--primary-scarlet)] transition-all"
                          style={{ width: `${uploadingMidiaImovelPercent ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {loadingMidiasImovel ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CircleNotch size={16} className="animate-spin" />
                      Carregando imagens...
                    </div>
                  ) : null}

                  {!loadingMidiasImovel && midiasImovel.length > 0 ? (
                    <div
                      className={`grid gap-3 md:grid-cols-2 xl:grid-cols-4 ${
                        isMidiaImovelDragActive
                          ? "rounded-xl border border-dashed border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)]/5 p-2"
                          : ""
                      }`}
                      onDragEnter={(event) => {
                        const isFileDrag = event.dataTransfer.types?.includes("Files");
                        if (!isFileDrag) return;
                        event.preventDefault();
                        setIsMidiaImovelDragActive(true);
                      }}
                      onDragOver={(event) => {
                        const isFileDrag = event.dataTransfer.types?.includes("Files");
                        if (!isFileDrag) return;
                        event.preventDefault();
                        setIsMidiaImovelDragActive(true);
                      }}
                      onDragLeave={(event) => {
                        const isFileDrag = event.dataTransfer.types?.includes("Files");
                        if (!isFileDrag) return;
                        event.preventDefault();
                        setIsMidiaImovelDragActive(false);
                      }}
                      onDrop={(event) => {
                        const isFileDrag = event.dataTransfer.types?.includes("Files");
                        if (!isFileDrag) return;
                        event.preventDefault();
                        setIsMidiaImovelDragActive(false);
                        void appendMidiaImovelFiles(Array.from(event.dataTransfer.files ?? []));
                        setDropTargetMidiaImovelId(null);
                      }}
                    >
                      {midiasImovel.map((mediaItem, index) => (
                        <article
                          key={mediaItem.id}
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
                            if (dropTargetMidiaImovelId !== mediaItem.id) {
                              setDropTargetMidiaImovelId(mediaItem.id);
                            }
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
                            if (dropTargetMidiaImovelId !== mediaItem.id) {
                              setDropTargetMidiaImovelId(mediaItem.id);
                            }
                          }}
                          onDrop={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            const isFileDrag = event.dataTransfer.types?.includes("Files");
                            if (isFileDrag) {
                              void appendMidiaImovelFiles(Array.from(event.dataTransfer.files ?? []));
                              return;
                            }
                            const dragId =
                              event.dataTransfer.getData("application/x-corretor-image-id") ||
                              event.dataTransfer.getData("text/plain");
                            if (!dragId) return;
                            moveMidiaImovelToTarget(dragId, mediaItem.id);
                            setDropTargetMidiaImovelId(null);
                          }}
                          className={`overflow-hidden rounded-xl border bg-slate-50 transition ${
                            dropTargetMidiaImovelId === mediaItem.id
                              ? "border-[var(--primary-scarlet)] ring-2 ring-[var(--primary-scarlet)]/20"
                              : "border-slate-200"
                          }`}
                        >
                          <div
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("application/x-corretor-image-id", mediaItem.id);
                              event.dataTransfer.setData("text/plain", mediaItem.id);
                            }}
                            onDragEnd={() => {
                              setDropTargetMidiaImovelId(null);
                            }}
                            className="group relative aspect-[4/3] cursor-grab bg-slate-200 active:cursor-grabbing"
                          >
                            {mediaItem.isHeic ? (
                              <div className="flex h-full w-full items-center justify-center bg-slate-200 px-4 text-center">
                                <div>
                                  <p className="text-sm font-medium text-slate-700">Preview indisponível</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    HEIC/HEIF será convertido no processamento.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={mediaItem.thumbUrl || buildThumbUrl(mediaItem.previewUrl) || mediaItem.previewUrl}
                                alt={mediaItem.alt || mediaItem.fileName}
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
                              <p className="truncate text-sm font-medium text-slate-800">{mediaItem.fileName}</p>
                              <p className="text-xs text-slate-500">{formatBytes(mediaItem.sizeBytes)}</p>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                disabled={deletingMidiaImovelIds.includes(mediaItem.id)}
                                onClick={() => {
                                  void removeMidiaImovelById(mediaItem.id);
                                }}
                                className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Remover imagem"
                              >
                                {deletingMidiaImovelIds.includes(mediaItem.id) ? (
                                  <CircleNotch size={16} className="animate-spin" />
                                ) : (
                                  <Trash size={16} />
                                )}
                              </button>
                              <label className="flex items-center gap-2 text-xs text-slate-600">
                                Ordem
                                <input
                                  key={`${mediaItem.id}-${index}`}
                                  type="number"
                                  min={1}
                                  max={midiasImovel.length}
                                  defaultValue={index + 1}
                                  onBlur={(event) => applyMidiaImovelOrder(mediaItem.id, event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      applyMidiaImovelOrder(mediaItem.id, event.currentTarget.value);
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm text-slate-700"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingMidiaImovelId(mediaItem.id)}
                                className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                aria-label="Editar imagem"
                              >
                                <DotsThreeVertical size={16} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingMidiaImovelId(mediaItem.id)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100"
                            >
                              {mediaItem.caracteristica
                                ? `Característica: ${caracteristicaLabelByChave.get(mediaItem.caracteristica) ?? mediaItem.caracteristica}`
                                : "Sem característica - clique para definir"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {!loadingMidiasImovel && midiasImovel.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma imagem adicionada.</p>
                  ) : null}

                  {rejectedMidiasImovel.length > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <h4 className="text-sm font-semibold text-rose-700">
                        Imagens que não atendem pré-requisitos
                      </h4>
                      <p className="mt-1 text-xs text-rose-600">
                        Corrija os arquivos abaixo para conseguir enviar.
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {rejectedMidiasImovel.map((mediaItem) => (
                          <article
                            key={mediaItem.id}
                            className="flex items-center gap-3 rounded-lg border border-rose-200 bg-white p-3"
                          >
                            <div className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                              {mediaItem.previewUrl ? (
                                <img
                                  src={mediaItem.previewUrl}
                                  alt={mediaItem.fileName}
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
                              <p className="truncate text-sm text-slate-800">{mediaItem.fileName}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {mediaItem.reasons.includes("TAMANHO_PEQUENO") ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                    Tamanho Pequeno
                                  </span>
                                ) : null}
                                {mediaItem.reasons.includes("ACIMA_15MB") ? (
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                                    Acima de 15MB
                                  </span>
                                ) : null}
                                {mediaItem.reasons.includes("FORMATO_INVALIDO") ? (
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
                </div>
              ) : null}

              {activeBlock === 9 ? (
                <div className="space-y-6">
                  <header>
                    <h3 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                      <VideoCamera size={24} />
                      Etapa 9: vídeos (YouTube)
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Cole os links de vídeos e organize a ordem de exibição.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Máximo de {MAX_YOUTUBE_VIDEOS} vídeos por imóvel.
                    </p>
                  </header>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    O primeiro vídeo da lista será priorizado para apresentação nos portais de anúncios. A
                    exibição final depende das regras e limitações de cada portal.
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
                          setBlockError(`Você pode adicionar no máximo ${MAX_YOUTUBE_VIDEOS} vídeos.`);
                          return;
                        }
                        const normalized = normalizeYouTubeUrl(youtubeUrlInput);
                        if (!normalized) {
                          setBlockError("Informe uma URL válida do YouTube.");
                          return;
                        }
                        const videoId = getYouTubeVideoId(normalized);
                        if (!videoId) {
                          setBlockError("Não foi possível identificar o vídeo do YouTube.");
                          return;
                        }
                        setBlockError(null);
                        setAddingYoutube(true);
                        const title = await fetchYouTubeTitle(normalized);
                        setYoutubeVideos((current) => {
                          if (current.some((videoItem) => videoItem.url === normalized)) return current;
                          if (current.length >= MAX_YOUTUBE_VIDEOS) return current;
                          return [...current, { id: crypto.randomUUID(), url: normalized, videoId, title }];
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
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {youtubeVideos.map((videoItem, index) => (
                        <div key={videoItem.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <div className="relative aspect-video bg-slate-200">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${videoItem.videoId}?rel=0&modestbranding=1`}
                              title={videoItem.title ?? `Vídeo ${index + 1}`}
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              className="h-full w-full"
                            />
                          </div>
                          <div className="space-y-2 p-3">
                            <p className="line-clamp-2 text-sm font-medium text-slate-800">
                              {videoItem.title ?? "Título não disponível"}
                            </p>
                            <p className="truncate text-xs text-slate-500">{videoItem.url}</p>
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
                                      const previousVideo = next[index - 1];
                                      next[index - 1] = next[index];
                                      next[index] = previousVideo;
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
                                      const nextVideo = next[index + 1];
                                      next[index + 1] = next[index];
                                      next[index] = nextVideo;
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
                                      current.filter((currentVideo) => currentVideo.id !== videoItem.id),
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
                    <p className="text-sm text-slate-500">Nenhum vídeo adicionado.</p>
                  )}
                </div>
              ) : null}

              {![2, 3, 4, 5, 6, 7, 8, 9].includes(activeBlock) ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Este bloco será migrado para CRUD independente na próxima entrega. Nesta versão, foi priorizada a base
                  dos blocos principais.
                </div>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {showEmpreendimentoCaracteristicasModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg text-slate-900">Características do empreendimento</h4>
                <p className="text-sm text-slate-600">
                  {empreendimentoAssociadoNome} • {empreendimentoCaracteristicasAssociadas.length}{" "}
                  {empreendimentoCaracteristicasAssociadas.length === 1
                    ? "característica"
                    : "características"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmpreendimentoCaracteristicasModal(false)}
                className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {loadingEmpreendimentoCaracteristicasAssociadas ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CircleNotch size={16} className="animate-spin" />
                Carregando características...
              </div>
            ) : empreendimentoCaracteristicasAssociadas.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-3">
                {empreendimentoCaracteristicasAssociadas.map((catalogItem) => (
                  <span
                    key={catalogItem.id}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                  >
                    {catalogItem.label_pt}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma característica cadastrada no empreendimento.</p>
            )}
          </div>
        </div>
      ) : null}

      {editingMidiaImovelId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg text-slate-900">Editar imagem</h4>
              <button
                type="button"
                onClick={() => setEditingMidiaImovelId(null)}
                className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            {(() => {
              const current = midiasImovel.find((mediaItem) => mediaItem.id === editingMidiaImovelId);
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
                        setMidiasImovel((mediaItems) =>
                          mediaItems.map((mediaItem) =>
                            mediaItem.id === current.id ? { ...mediaItem, legenda: event.target.value } : mediaItem,
                          ),
                        )
                      }
                      placeholder="Ex.: Vista da sala principal"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                      Característica
                      <InfoTooltip text="Classifica a imagem para filtros e organização na galeria do imóvel." />
                    </span>
                    <select
                      value={current.caracteristica}
                      onChange={(event) =>
                        setMidiasImovel((mediaItems) =>
                          mediaItems.map((mediaItem) =>
                            mediaItem.id === current.id
                              ? { ...mediaItem, caracteristica: event.target.value }
                              : mediaItem,
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
                    {loadingCaracteristicasCatalogo ? (
                      <p className="mt-1 text-xs text-slate-500">Atualizando características...</p>
                    ) : null}
                  </label>
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                      Texto alternativo (alt)
                      <InfoTooltip text="Texto alternativo (alt) é uma descrição curta para leitores de tela e SEO. Escreva de forma objetiva o que aparece na imagem." />
                    </span>
                    <textarea
                      value={current.alt}
                      onChange={(event) =>
                        setMidiasImovel((mediaItems) =>
                          mediaItems.map((mediaItem) =>
                            mediaItem.id === current.id ? { ...mediaItem, alt: event.target.value } : mediaItem,
                          ),
                        )
                      }
                      placeholder="Ex.: Sala de estar integrada com varanda e vista livre"
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

      {showLocationEditConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">Editar localização do imóvel</h3>
            <p className="mt-2 text-sm text-slate-600">
              Ao alterar o endereço, a URL pública do imóvel poderá ser atualizada para refletir a nova localização.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Confirma o desbloqueio da edição de endereço?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLocationEditConfirmModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationEditingEnabled(true);
                  setShowLocationEditConfirmModal(false);
                }}
                className="rounded-lg bg-[var(--primary-scarlet)] px-3 py-1.5 text-sm font-medium text-white hover:brightness-95"
              >
                Confirmar edição
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteImovelModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Excluir imóvel</h3>
                <p className="mt-1 text-sm text-slate-600">
                  O imóvel será removido imediatamente da sua base e dos registros públicos. A limpeza de mídias,
                  vínculos e arquivos restantes será processada em segundo plano. Esta ação não pode ser desfeita.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteImovelConfirmText("");
                  setShowDeleteImovelModal(false);
                }}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-sm text-slate-700">
                Digite <strong>excluir</strong> para confirmar:
              </span>
              <input
                value={deleteImovelConfirmText}
                onChange={(event) => setDeleteImovelConfirmText(event.target.value)}
                placeholder="excluir"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteImovelConfirmText("");
                  setShowDeleteImovelModal(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingStatus || deleteImovelConfirmText.trim().toLowerCase() !== "excluir"}
                onClick={() => {
                  setDeleteImovelConfirmText("");
                  setShowDeleteImovelModal(false);
                  void handleDeleteImovel();
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
                disabled={Boolean(savingBlock)}
                onClick={handleDiscardAndLeaveFromModal}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Descartar e sair
              </button>
              <button
                type="button"
                disabled={Boolean(savingBlock)}
                onClick={() => void handleSaveAndLeaveFromModal()}
                className="rounded-lg bg-[var(--primary-scarlet)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingBlock ? "Salvando..." : "Salvar e sair"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`sticky bottom-4 z-40 mt-8 ${hasPendingChanges && saveNudgeActive ? "wobble-hor-bottom" : ""}`}>
        <div className="flex items-center justify-between gap-3 rounded-full border border-slate-200 bg-white/95 px-5 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
          <p
            className={`text-sm font-medium ${
              hasPendingChanges ? "text-amber-700" : "text-slate-500"
            }`}
          >
            {hasPendingChanges ? "Alterações pendentes para salvar." : "Sem alterações pendentes."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={Boolean(savingBlock) || savingStatus || !hasPendingChanges}
              onClick={handleDiscardChanges}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Descartar alterações
            </button>
            <button
              type="button"
              disabled={Boolean(savingBlock) || savingStatus || !hasPendingChanges}
              onClick={() => void handleSaveFromFooter(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {savingBlock ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              disabled={Boolean(savingBlock) || savingStatus || !hasPendingChanges}
              onClick={() => void handleSaveFromFooter(true)}
              className="rounded-full bg-[var(--primary-scarlet)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingBlock ? "Salvando..." : "Salvar e fechar"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
