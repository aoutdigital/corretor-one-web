"use client";

import {
  ArrowsOutCardinal,
  Buildings,
  CaretDown,
  CaretUp,
  Check,
  CheckCircle,
  CircleNotch,
  Crown,
  DotsThreeVertical,
  HouseLine,
  ImageSquare,
  Info,
  MagnifyingGlass,
  MapPin,
  Megaphone,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { LongTextAykaEditor, type AykaConfig } from "@/app/_components/long-text-ayka-editor";
import { apiFetchWithAuth, getAccessToken } from "@/lib/client/auth-api";
import { formatAddressFromFields, replaceOrAppendAddressNumber } from "@/lib/location/address";
import { isUfCode, UF_OPTIONS } from "@/lib/location/constants";
import { loadGoogleMapsScript } from "@/lib/location/google-maps-loader";
import type { PlaceDetails, PlacePrediction } from "@/lib/location/types";

const TOTAL_STEPS = 11;
const IMPLEMENTED_STEPS = TOTAL_STEPS;
const BOLSAO_EXCLUSIVIDADE_MIN_DIAS = 75;
const DRAFT_ADDRESS_LOGRADOURO = "Endereço em definição";
const DRAFT_ADDRESS_CIDADE = "A definir";
const IMOVEL_DRAFT_STEP_STORAGE_KEY_PREFIX = "imovel-draft-step:";
const MAX_DESCRICAO_IMOVEL_CHARS = 2500;
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const MAX_YOUTUBE_VIDEOS = 3;
const GOOGLE_MAPS_PUBLIC_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "";

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

const OCUPACAO_IMOVEL_OPTIONS = [
  { value: "PROPRIETARIO_RESIDE_NO_IMOVEL", label: "Proprietário reside no imóvel" },
  { value: "IMOVEL_DESOCUPADO", label: "Imóvel desocupado" },
  { value: "IMOVEL_COM_INQUILINO", label: "Imóvel com inquilino" },
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

const TIPO_IMOVEL_OPTIONS = [
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "CASA", label: "Casa" },
  { value: "CASA_DE_CONDOMINIO", label: "Casa de condomínio" },
  { value: "CASA_DE_VILA", label: "Casa de vila" },
  { value: "COBERTURA", label: "Cobertura" },
  { value: "CASA_COMERCIAL", label: "Casa comercial" },
  { value: "ESCRITORIO", label: "Escritório" },
  { value: "FAZENDA_SITIO_CHACARA", label: "Fazenda / Sítio / Chácara" },
  { value: "FLAT", label: "Flat" },
  { value: "GALPAO_DEPOSITO_ARMAZEM", label: "Galpão / Depósito / Armazém" },
  { value: "GARAGEM", label: "Garagem" },
  { value: "KITNET_CONJUGADO", label: "Kitnet / Conjugado" },
  { value: "HOTEL_MOTEL_POUSADA", label: "Hotel / Motel / Pousada" },
  { value: "LOFT", label: "Loft" },
  { value: "LOTE_TERRENO", label: "Lote / Terreno" },
  { value: "PONTO_COMERCIAL_LOJA_BOX", label: "Ponto comercial / Loja / Box" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "PREDIO_EDIFICIO_INTEIRO", label: "Prédio / Edifício inteiro" },
  { value: "SELF_STORAGE", label: "Self storage" },
  { value: "STUDIO", label: "Studio" },
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

const VERTICAL_ANDAR_APPLICABLE_TYPES = new Set<TipoImovelValue>([
  "APARTAMENTO",
  "COBERTURA",
  "FLAT",
  "KITNET_CONJUGADO",
  "LOFT",
  "STUDIO",
  "ESCRITORIO",
  "PONTO_COMERCIAL_LOJA_BOX",
  "SHOPPING",
]);

const COMMERCIAL_TIPO_IMOVEL = new Set<TipoImovelValue>([
  "CASA_COMERCIAL",
  "ESCRITORIO",
  "GALPAO_DEPOSITO_ARMAZEM",
  "HOTEL_MOTEL_POUSADA",
  "PONTO_COMERCIAL_LOJA_BOX",
  "PREDIO_EDIFICIO_INTEIRO",
]);

const SOLO_CATEGORIA_OPTIONS_BY_USO = {
  RESIDENCIAL: [
    { value: "APARTAMENTO", label: "Apartamento" },
    { value: "CASA", label: "Casa" },
    { value: "LOTE_TERRENO", label: "Terreno" },
    { value: "FAZENDA_SITIO_CHACARA", label: "Fazenda / Sítio / Chácara" },
    { value: "GARAGEM", label: "Garagem" },
  ],
  COMERCIAL: [
    { value: "ESCRITORIO", label: "Escritório" },
    { value: "CASA_COMERCIAL", label: "Casa comercial" },
    { value: "PONTO_COMERCIAL_LOJA_BOX", label: "Loja / Box" },
    { value: "GALPAO_DEPOSITO_ARMAZEM", label: "Galpão / Armazém" },
    { value: "PREDIO_EDIFICIO_INTEIRO", label: "Prédio / Edifício inteiro" },
    { value: "LOTE_TERRENO", label: "Terreno" },
    { value: "SHOPPING", label: "Shopping" },
    { value: "SELF_STORAGE", label: "Self storage" },
    { value: "HOTEL_MOTEL_POUSADA", label: "Hotel / Motel / Pousada" },
  ],
} as const;

const SOLO_SUBCATEGORIA_LABELS = {
  PADRAO: "Padrão",
  GARDEN: "Garden",
  DUPLEX: "Duplex",
  TRIPLEX: "Triplex",
  COBERTURA_PADRAO: "Cobertura padrão",
  COBERTURA_DUPLEX: "Cobertura duplex",
  COBERTURA_TRIPLEX: "Cobertura triplex",
  FLAT: "Flat",
  LOFT: "Loft",
  KITNET_CONJUGADO: "Kitnet / Conjugado",
  STUDIO: "Studio",
  SOBRADO: "Sobrado",
  GEMINADA: "Geminada",
  CASA_DE_CONDOMINIO: "Casa de condomínio",
  CASA_DE_VILA: "Casa de vila",
  CONJUNTO_COMERCIAL: "Conjunto comercial",
  ANDAR_INTEIRO: "Andar inteiro",
  MEIO_ANDAR: "Meio andar",
  LOJA_BOX: "Loja / Box",
  GALPAO: "Galpão",
  SELF_STORAGE: "Self storage",
  LOTE_TERRENO: "Lote / Terreno",
  TERREO: "Térreo",
} as const;

const SOLO_SUBCATEGORIA_OPTIONS_BY_USO_E_CATEGORIA = {
  RESIDENCIAL: {
    APARTAMENTO: [
      { value: "PADRAO", label: SOLO_SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "APARTAMENTO" },
      { value: "GARDEN", label: SOLO_SUBCATEGORIA_LABELS.GARDEN, tipo_imovel: "APARTAMENTO" },
      { value: "DUPLEX", label: SOLO_SUBCATEGORIA_LABELS.DUPLEX, tipo_imovel: "APARTAMENTO" },
      { value: "TRIPLEX", label: SOLO_SUBCATEGORIA_LABELS.TRIPLEX, tipo_imovel: "APARTAMENTO" },
      {
        value: "COBERTURA_PADRAO",
        label: SOLO_SUBCATEGORIA_LABELS.COBERTURA_PADRAO,
        tipo_imovel: "COBERTURA",
      },
      {
        value: "COBERTURA_DUPLEX",
        label: SOLO_SUBCATEGORIA_LABELS.COBERTURA_DUPLEX,
        tipo_imovel: "COBERTURA",
      },
      {
        value: "COBERTURA_TRIPLEX",
        label: SOLO_SUBCATEGORIA_LABELS.COBERTURA_TRIPLEX,
        tipo_imovel: "COBERTURA",
      },
      { value: "FLAT", label: SOLO_SUBCATEGORIA_LABELS.FLAT, tipo_imovel: "FLAT" },
      { value: "LOFT", label: SOLO_SUBCATEGORIA_LABELS.LOFT, tipo_imovel: "LOFT" },
      {
        value: "KITNET_CONJUGADO",
        label: SOLO_SUBCATEGORIA_LABELS.KITNET_CONJUGADO,
        tipo_imovel: "KITNET_CONJUGADO",
      },
      { value: "STUDIO", label: SOLO_SUBCATEGORIA_LABELS.STUDIO, tipo_imovel: "STUDIO" },
    ],
    CASA: [
      { value: "PADRAO", label: SOLO_SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "CASA" },
      { value: "SOBRADO", label: SOLO_SUBCATEGORIA_LABELS.SOBRADO, tipo_imovel: "CASA" },
      { value: "GEMINADA", label: SOLO_SUBCATEGORIA_LABELS.GEMINADA, tipo_imovel: "CASA" },
      {
        value: "CASA_DE_CONDOMINIO",
        label: SOLO_SUBCATEGORIA_LABELS.CASA_DE_CONDOMINIO,
        tipo_imovel: "CASA_DE_CONDOMINIO",
      },
      { value: "CASA_DE_VILA", label: SOLO_SUBCATEGORIA_LABELS.CASA_DE_VILA, tipo_imovel: "CASA_DE_VILA" },
    ],
    LOTE_TERRENO: [
      { value: "LOTE_TERRENO", label: SOLO_SUBCATEGORIA_LABELS.LOTE_TERRENO, tipo_imovel: "LOTE_TERRENO" },
    ],
    FAZENDA_SITIO_CHACARA: [
      {
        value: "PADRAO",
        label: SOLO_SUBCATEGORIA_LABELS.PADRAO,
        tipo_imovel: "FAZENDA_SITIO_CHACARA",
      },
    ],
    GARAGEM: [{ value: "PADRAO", label: SOLO_SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "GARAGEM" }],
  },
  COMERCIAL: {
    ESCRITORIO: [
      { value: "PADRAO", label: SOLO_SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "ESCRITORIO" },
      {
        value: "CONJUNTO_COMERCIAL",
        label: SOLO_SUBCATEGORIA_LABELS.CONJUNTO_COMERCIAL,
        tipo_imovel: "ESCRITORIO",
      },
      { value: "ANDAR_INTEIRO", label: SOLO_SUBCATEGORIA_LABELS.ANDAR_INTEIRO, tipo_imovel: "ESCRITORIO" },
      { value: "MEIO_ANDAR", label: SOLO_SUBCATEGORIA_LABELS.MEIO_ANDAR, tipo_imovel: "ESCRITORIO" },
    ],
    CASA_COMERCIAL: [
      { value: "PADRAO", label: SOLO_SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "CASA_COMERCIAL" },
      { value: "SOBRADO", label: SOLO_SUBCATEGORIA_LABELS.SOBRADO, tipo_imovel: "CASA_COMERCIAL" },
      { value: "TERREO", label: SOLO_SUBCATEGORIA_LABELS.TERREO, tipo_imovel: "CASA_COMERCIAL" },
    ],
    PONTO_COMERCIAL_LOJA_BOX: [
      {
        value: "LOJA_BOX",
        label: SOLO_SUBCATEGORIA_LABELS.LOJA_BOX,
        tipo_imovel: "PONTO_COMERCIAL_LOJA_BOX",
      },
      {
        value: "TERREO",
        label: SOLO_SUBCATEGORIA_LABELS.TERREO,
        tipo_imovel: "PONTO_COMERCIAL_LOJA_BOX",
      },
    ],
    GALPAO_DEPOSITO_ARMAZEM: [
      {
        value: "GALPAO",
        label: SOLO_SUBCATEGORIA_LABELS.GALPAO,
        tipo_imovel: "GALPAO_DEPOSITO_ARMAZEM",
      },
    ],
    PREDIO_EDIFICIO_INTEIRO: [
      {
        value: "PADRAO",
        label: SOLO_SUBCATEGORIA_LABELS.PADRAO,
        tipo_imovel: "PREDIO_EDIFICIO_INTEIRO",
      },
      {
        value: "ANDAR_INTEIRO",
        label: SOLO_SUBCATEGORIA_LABELS.ANDAR_INTEIRO,
        tipo_imovel: "PREDIO_EDIFICIO_INTEIRO",
      },
      {
        value: "MEIO_ANDAR",
        label: SOLO_SUBCATEGORIA_LABELS.MEIO_ANDAR,
        tipo_imovel: "PREDIO_EDIFICIO_INTEIRO",
      },
    ],
    LOTE_TERRENO: [
      { value: "LOTE_TERRENO", label: SOLO_SUBCATEGORIA_LABELS.LOTE_TERRENO, tipo_imovel: "LOTE_TERRENO" },
    ],
    SHOPPING: [{ value: "LOJA_BOX", label: SOLO_SUBCATEGORIA_LABELS.LOJA_BOX, tipo_imovel: "SHOPPING" }],
    SELF_STORAGE: [
      { value: "SELF_STORAGE", label: SOLO_SUBCATEGORIA_LABELS.SELF_STORAGE, tipo_imovel: "SELF_STORAGE" },
    ],
    HOTEL_MOTEL_POUSADA: [
      { value: "PADRAO", label: SOLO_SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "HOTEL_MOTEL_POUSADA" },
    ],
  },
} as const;

type VagaTipo = (typeof VAGA_TIPO_OPTIONS)[number]["value"];
type VagaTamanho = (typeof VAGA_TAMANHO_OPTIONS)[number]["value"];
type VagaCobertura = (typeof VAGA_COBERTURA_OPTIONS)[number]["value"];
type TipoImovelValue = (typeof TIPO_IMOVEL_OPTIONS)[number]["value"];
type EnderecoVisualizacaoValue = (typeof ENDERECO_VISUALIZACAO_OPTIONS)[number]["value"];
type PeriodicidadeValue = "MENSAL" | "ANUAL";
type TipoNegociacaoValue = (typeof TIPO_NEGOCIACAO_OPTIONS)[number]["value"];
type AceitaParceriaStatusValue = (typeof ACEITA_PARCERIA_STATUS_OPTIONS)[number]["value"];
type OcupacaoImovelValue = (typeof OCUPACAO_IMOVEL_OPTIONS)[number]["value"];
type ModeloCaptacaoValue = "" | "PARCERIA" | "CAPTACAO_SEM_EXCLUSIVIDADE" | "EXCLUSIVIDADE";
type AmbientePisoValue = (typeof AMBIENTE_PISO_OPTIONS)[number]["value"];
type PersianaTipoValue = (typeof PERSIANA_TIPO_OPTIONS)[number]["value"];
type CozinhaTipoValue = (typeof COZINHA_TIPO_OPTIONS)[number]["value"];
type CozinhaBancadaValue = (typeof COZINHA_BANCADA_OPTIONS)[number]["value"];
type VarandaTipoValue = (typeof VARANDA_TIPO_OPTIONS)[number]["value"];
type VarandaChurrasqueiraValue = "NAO_TEM" | (typeof VARANDA_CHURRASQUEIRA_OPTIONS)[number]["value"];
type SalaTipoValue = (typeof SALA_TIPO_OPTIONS)[number]["value"];
type SalaLayoutValue = (typeof SALA_LAYOUT_OPTIONS)[number]["value"];
type SalaDiferencialValue = (typeof SALA_DIFERENCIAL_OPTIONS)[number]["value"];
type TipoAmbienteImovelValue = "DORMITORIO" | "COZINHA" | "SALA" | "VARANDA";
type SoloTipoUsoContexto = "" | "RESIDENCIAL" | "COMERCIAL";
type SoloCategoriaOption = { value: string; label: string };
type SoloSubcategoriaOption = { value: string; label: string; tipo_imovel: TipoImovelValue };

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

type CaracteristicaCatalogoItem = {
  id: string;
  chave: string;
  label_pt: string;
  escopos: string[];
  tipos_uso: string[];
  ativo: boolean;
};

type ImovelMidiaItem = {
  relacao_id: string;
  ordem: number;
  grupo: string | null;
  midia_id: string;
  tipo: string;
  url: string;
  storage_bucket: string;
  storage_path: string;
  tamanho_bytes: number | null;
  titulo: string | null;
  alt: string | null;
  legenda: string | null;
  caracteristica: string | null;
  created_at: string;
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
  caracteristica_ids?: string[] | null;
};

type ImovelApi = {
  id: string;
  status: string;
  step_rascunho?: number | null;
  descricao: string | null;
  tipo: string;
  empreendimento_id: string | null;
  empreendimento_tipo_id?: string | null;
  empreendimento_tipologia_label?: string | null;
  geolocacao_id: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string | null;
  lat: number | null;
  lng: number | null;
  address_json: Record<string, unknown> | null;
  localizacao_contexto: Record<string, unknown> | null;
  endereco_complemento: string | null;
  andar: number | null;
  mostrar_andar_no_anuncio: boolean;
  enderecovisualizacao: EnderecoVisualizacaoValue;
  ultimo_andar: boolean;
  area_total: number | null;
  area_util: number | null;
  area_terreno: number | null;
  frente_metros: number | null;
  fundos_metros: number | null;
  lateral_1_metros: number | null;
  lateral_2_metros: number | null;
  tipo_negociacao: TipoNegociacaoValue | null;
  preco_venda: number | null;
  preco_locacao: number | null;
  condominio: number | null;
  iptu: number | null;
  iptu_periodicidade: PeriodicidadeValue | null;
  comissao_locacao: string | null;
  comissao_venda_percentual: number | null;
  minimo_aceito_em_maos: number | null;
  aceita_permuta: boolean;
  descricao_permuta: string | null;
  veio_do_bolsao: boolean;
  captacao_corretor_parceiro: boolean;
  corretor_parceiro_nome: string | null;
  corretor_parceiro_telefone: string | null;
  corretor_parceiro_email: string | null;
  comissao_captador_percentual: number | null;
  comissao_vendedor_percentual: number | null;
  exclusividade: boolean;
  exclusividade_comissao_minha_percentual: number | null;
  exclusividade_comissao_parceiro_percentual: number | null;
  exclusividade_data_vencimento: string | null;
  exclusividade_observacoes: string | null;
  disponibilizar_no_bolsao_parceria: boolean;
  bolsao_permitir_mudanca_preco: boolean;
  bolsao_permitir_download_midia_kit: boolean;
  bolsao_somente_visitas_agendadas: boolean;
  bolsao_somente_visitas_com_minha_presenca: boolean;
  aceite_corretor_exclusivo: boolean;
  regra_geral_exclusividade: string | null;
  aceita_parceria_status: AceitaParceriaStatusValue | null;
  divisao_comissao_parceria: string | null;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  lavabos: number | null;
  salas: number | null;
  cozinhas: number | null;
  vagas: number | null;
  vaga_tamanhos: string[] | null;
  vaga_coberturas: string[] | null;
  vaga_tipos: string[] | null;
  caracteristicas: string[] | null;
  ocupacao_imovel: OcupacaoImovelValue | null;
  observacoes_gerais: string | null;
};

type EmpreendimentoLookupItem = {
  id: string;
  nome: string;
  status: string;
  descricao: string | null;
  tipo_uso: "RESIDENCIAL" | "COMERCIAL" | null;
  categoria_residencial: string | null;
  tipologias_residenciais: string[];
  categoria_comercial: string | null;
  tipologias_comerciais: string[];
  bairro_comercial: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  geolocacao_id: string | null;
  lat: number | null;
  lng: number | null;
  address_json: Record<string, unknown> | null;
  localizacao_contexto: Record<string, unknown> | null;
  capa_url: string | null;
  tipos: Array<{
    id: string;
    nome: string | null;
    torre_nome: string | null;
    tipologia: string | null;
    area_privativa: number | null;
    dormitorios: number | null;
    suites: number | null;
    banheiros: number | null;
    vagas: number | null;
    qtd_unidades: number | null;
  }>;
};

type EmpreendimentoTipologiaContexto = {
  tipo_id: string;
  tipologia_raw: string;
  tipo_imovel: TipoImovelValue;
  categoria_label: string;
  subcategoria_label: string;
  tipologia_label: string;
};

type PertenceEmpreendimento = "" | "SIM" | "NAO";

type LocalizacaoContextoState = {
  perfil_regiao: string[];
  mobilidade: string[];
  comercio_servicos: string[];
  lazer_estilo_vida: string[];
  resumo_local: string;
};

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
    perfil_regiao: normalizeLocalizacaoArray(source.perfil_regiao, LOCALIZACAO_PERFIL_REGIAO_OPTIONS),
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

function isAddressAlreadyDefined(item: ImovelApi) {
  return (
    item.logradouro.trim() !== "" &&
    item.logradouro !== DRAFT_ADDRESS_LOGRADOURO &&
    item.cidade.trim() !== "" &&
    item.cidade !== DRAFT_ADDRESS_CIDADE
  );
}

function isDraftPlaceholderAddress(params: {
  logradouro: string | null | undefined;
  numero: string | null | undefined;
  bairro: string | null | undefined;
  cidade: string | null | undefined;
  addressSource: string | null | undefined;
}) {
  const logradouro = (params.logradouro ?? "").trim();
  const numero = (params.numero ?? "").trim();
  const bairro = (params.bairro ?? "").trim();
  const cidade = (params.cidade ?? "").trim();
  const source = (params.addressSource ?? "").trim().toUpperCase();

  if (source === "IMOVEL_DRAFT" || source === "IMOVEL_DRAFT_PLACEHOLDER") return true;

  return (
    logradouro === DRAFT_ADDRESS_LOGRADOURO &&
    numero.toLowerCase() === "s/n" &&
    bairro === DRAFT_ADDRESS_CIDADE &&
    cidade === DRAFT_ADDRESS_CIDADE
  );
}

function formatEnderecoCurto(item: {
  bairro_comercial?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}) {
  const line1 = [item.logradouro, item.numero].filter(Boolean).join(", ");
  const bairroExibicao = item.bairro_comercial || item.bairro;
  const line2 = [bairroExibicao, item.cidade, item.estado].filter(Boolean).join(" - ");
  return [line1, line2].filter((value) => value.length > 0).join(" • ");
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildThumbUrl(url: string | null) {
  if (!url) return null;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const separator = transformed.includes("?") ? "&" : "?";
  return `${transformed}${separator}width=560&height=360&quality=70&resize=cover`;
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

function formatEmpreendimentoStatus(status: string) {
  if (status === "PUBLICADO") return "Publicado";
  if (status === "PAUSADO") return "Pausado";
  return status;
}

function htmlToPlainText(value: string) {
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTipologiaHierarquia(value: string | null) {
  if (!value) return "Tipo não informado";
  const [grupo, ...subgrupo] = value.split("_");
  if (subgrupo.length === 0) return formatEnumLabel(value);
  return `${formatEnumLabel(grupo)} > ${formatEnumLabel(subgrupo.join("_"))}`;
}

function tipologiaLabel(item: EmpreendimentoLookupItem["tipos"][number]) {
  const parts = [formatTipologiaHierarquia(item.tipologia)];

  if (item.nome?.trim()) parts.push(item.nome.trim());
  if (item.torre_nome?.trim()) parts.push(`Torre ${item.torre_nome.trim()}`);
  if (item.area_privativa != null) parts.push(`${item.area_privativa} m²`);
  if (item.dormitorios != null) parts.push(`${item.dormitorios} dorm.`);
  if (item.suites != null) parts.push(`${item.suites} suíte${item.suites === 1 ? "" : "s"}`);

  return parts.join(" • ");
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

function toStepNumber(raw: string | null) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(IMPLEMENTED_STEPS, Math.floor(parsed)));
}

function getImovelDraftStepStorageKey(imovelId: string) {
  return `${IMOVEL_DRAFT_STEP_STORAGE_KEY_PREFIX}${imovelId}`;
}

function loadSavedDraftStep(imovelId: string) {
  if (!imovelId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getImovelDraftStepStorageKey(imovelId));
    if (!raw) return null;
    return toStepNumber(raw);
  } catch {
    return null;
  }
}

function saveDraftStep(imovelId: string, step: number) {
  if (!imovelId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getImovelDraftStepStorageKey(imovelId), String(toStepNumber(String(step))));
  } catch {
    // noop
  }
}

function numberToInput(value: number | null | undefined) {
  if (value == null) return "";
  return String(value);
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

function toNonNegativeIntegerOrZero(value: string) {
  const parsed = parseOptionalInteger(value);
  if (!parsed.ok || parsed.value == null) return 0;
  return Math.max(0, parsed.value);
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
      // pt-BR: 1.000,35
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      // en-US fallback: 1,000.35
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    // pt-BR thousand separator without decimals: 1.000
    normalized = normalized.replace(/\./g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false as const, error: "Use um número válido." };
  return { ok: true as const, value: Number(normalized) };
}

function numberToPercentInput(value: number | null | undefined) {
  if (value == null) return "";
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function formatCurrencyValue(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildGoogleMapsEmbedUrl(query: string) {
  const normalized = query.trim();
  if (!normalized) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(normalized)}&z=16&output=embed`;
}

function sanitizePercentInput(value: string) {
  const raw = value.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  const hasComma = raw.includes(",");
  const [rawInt = "", rawDec = ""] = raw.split(",");
  const intPart = rawInt.slice(0, 3);
  const decPart = rawDec.slice(0, 2);
  return hasComma ? `${intPart},${decPart}` : intPart;
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

function normalizePercentInput(value: string) {
  if (!value.trim()) return "";
  const parsed = parseOptionalPercent(value);
  if (!parsed.ok || parsed.value == null) return value;
  return numberToPercentInput(parsed.value);
}

function isVagaTipo(value: string): value is VagaTipo {
  return VAGA_TIPO_OPTIONS.some((option) => option.value === value);
}

function isVagaTamanho(value: string): value is VagaTamanho {
  return VAGA_TAMANHO_OPTIONS.some((option) => option.value === value);
}

function isVagaCobertura(value: string): value is VagaCobertura {
  return VAGA_COBERTURA_OPTIONS.some((option) => option.value === value);
}

function isTipoImovel(value: string): value is TipoImovelValue {
  return TIPO_IMOVEL_OPTIONS.some((option) => option.value === value);
}

function isTipoNegociacao(value: string): value is TipoNegociacaoValue {
  return TIPO_NEGOCIACAO_OPTIONS.some((option) => option.value === value);
}

function isAceitaParceriaStatus(value: string): value is AceitaParceriaStatusValue {
  return ACEITA_PARCERIA_STATUS_OPTIONS.some((option) => option.value === value);
}

function isOcupacaoImovel(value: string): value is OcupacaoImovelValue {
  return OCUPACAO_IMOVEL_OPTIONS.some((option) => option.value === value);
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

function inferTipoImovelFromTipologia(tipologia: string | null | undefined): TipoImovelValue | null {
  const normalized = (tipologia ?? "").toUpperCase();
  if (!normalized) return null;
  if (normalized.includes("APARTAMENTO")) return "APARTAMENTO";
  if (normalized.includes("COBERTURA")) return "COBERTURA";
  if (normalized.includes("LOFT")) return "LOFT";
  if (normalized.includes("STUDIO")) return "STUDIO";
  if (normalized.includes("CASA")) return "CASA";
  if (normalized.includes("TERRENO") || normalized.includes("LOTE")) return "LOTE_TERRENO";
  if (normalized.includes("ESCRITORIO") || normalized.includes("CONJUNTO")) return "ESCRITORIO";
  if (normalized.includes("SHOPPING") || normalized.includes("LOJA") || normalized.includes("BOX")) {
    return "PONTO_COMERCIAL_LOJA_BOX";
  }
  if (normalized.includes("LOGISTICO") || normalized.includes("GALPAO")) return "GALPAO_DEPOSITO_ARMAZEM";
  return null;
}

function inferSubtipoImovelFromTipologiaLabel(
  tipologiaLabel: string | null | undefined,
): string | null {
  const normalized = (tipologiaLabel ?? "").toUpperCase();
  if (!normalized) return null;
  if (normalized.includes("COBERTURA TRIPLEX")) return "COBERTURA_TRIPLEX";
  if (normalized.includes("COBERTURA DUPLEX")) return "COBERTURA_DUPLEX";
  if (normalized.includes("COBERTURA")) return "COBERTURA_PADRAO";
  if (normalized.includes("GARDEN")) return "GARDEN";
  if (normalized.includes("TRIPLEX")) return "TRIPLEX";
  if (normalized.includes("DUPLEX")) return "DUPLEX";
  if (normalized.includes("SOBRADO")) return "SOBRADO";
  if (normalized.includes("GEMINADA")) return "GEMINADA";
  if (normalized.includes("ANDAR INTEIRO") || normalized.includes("LAJE INTEIRA")) return "ANDAR_INTEIRO";
  if (normalized.includes("MEIO ANDAR") || normalized.includes("MEIA LAJE")) return "MEIO_ANDAR";
  if (normalized.includes("LOJA") || normalized.includes("BOX")) return "LOJA_BOX";
  if (normalized.includes("CONJUNTO")) return "CONJUNTO_COMERCIAL";
  return null;
}

function normalizeTipologiaToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/__+/g, "_");
}

function inferSoloTipoUsoFromTipoImovel(tipo: TipoImovelValue): SoloTipoUsoContexto {
  const residencialCategorias = new Set<string>(
    SOLO_CATEGORIA_OPTIONS_BY_USO.RESIDENCIAL.map((item) => item.value),
  );
  const comercialCategorias = new Set<string>(
    SOLO_CATEGORIA_OPTIONS_BY_USO.COMERCIAL.map((item) => item.value),
  );
  if (comercialCategorias.has(tipo) && !residencialCategorias.has(tipo)) {
    return "COMERCIAL";
  }
  return "RESIDENCIAL";
}

function inferSoloCategoriaFromTipoImovel(tipo: TipoImovelValue): string {
  if (["APARTAMENTO", "COBERTURA", "FLAT", "LOFT", "KITNET_CONJUGADO", "STUDIO"].includes(tipo)) {
    return "APARTAMENTO";
  }
  if (["CASA", "CASA_DE_CONDOMINIO", "CASA_DE_VILA"].includes(tipo)) {
    return "CASA";
  }
  return tipo;
}

function getSoloCategoriaOptions(uso: SoloTipoUsoContexto): SoloCategoriaOption[] {
  if (!uso) return [];
  return [...SOLO_CATEGORIA_OPTIONS_BY_USO[uso]];
}

function getSoloSubcategoriaOptions(
  uso: SoloTipoUsoContexto,
  categoria: string,
): SoloSubcategoriaOption[] {
  if (!uso || !categoria) return [];
  const categoriaKey =
    categoria as keyof (typeof SOLO_SUBCATEGORIA_OPTIONS_BY_USO_E_CATEGORIA)[Exclude<SoloTipoUsoContexto, "">];
  const mapped = SOLO_SUBCATEGORIA_OPTIONS_BY_USO_E_CATEGORIA[uso][categoriaKey] ?? [];
  return [...mapped];
}

function resolveSoloTipologiaSelection(params: {
  uso: SoloTipoUsoContexto;
  categoria: string;
  subcategoriaToken: string;
}): { tipo_imovel: TipoImovelValue; tipologia_label: string } | null {
  const categoria = getSoloCategoriaOptions(params.uso).find((item) => item.value === params.categoria);
  if (!categoria) return null;
  const subcategoria = getSoloSubcategoriaOptions(params.uso, params.categoria).find(
    (item) => item.value === params.subcategoriaToken,
  );
  if (!subcategoria) return null;
  return {
    tipo_imovel: subcategoria.tipo_imovel,
    tipologia_label: `${categoria.label} > ${subcategoria.label}`,
  };
}

function inferSoloSubcategoriaTokenFromLabel(
  tipologiaLabel: string | null | undefined,
  uso: SoloTipoUsoContexto,
  categoria: string,
): string {
  const fallbackOptions = getSoloSubcategoriaOptions(uso, categoria);
  const normalized = normalizeTipologiaToken(tipologiaLabel);
  if (!normalized) {
    return fallbackOptions[0]?.value ?? "PADRAO";
  }

  if (normalized.includes("COBERTURA_TRIPLEX")) return "COBERTURA_TRIPLEX";
  if (normalized.includes("COBERTURA_DUPLEX")) return "COBERTURA_DUPLEX";
  if (normalized.includes("COBERTURA_PADRAO") || normalized.includes("COBERTURA") || normalized.includes("COBERTURA>PADRAO")) {
    return "COBERTURA_PADRAO";
  }
  if (normalized.includes("GARDEN")) return "GARDEN";
  if (normalized.includes("TRIPLEX")) return "TRIPLEX";
  if (normalized.includes("DUPLEX")) return "DUPLEX";
  if (normalized.includes("SOBRADO")) return "SOBRADO";
  if (normalized.includes("GEMINADA")) return "GEMINADA";
  if (normalized.includes("ANDAR_INTEIRO") || normalized.includes("LAJE_INTEIRA")) {
    return "ANDAR_INTEIRO";
  }
  if (normalized.includes("MEIO_ANDAR") || normalized.includes("MEIA_LAJE")) return "MEIO_ANDAR";
  if (normalized.includes("CONJUNTO")) return "CONJUNTO_COMERCIAL";
  if (normalized.includes("LOJA_BOX") || normalized.includes("LOJA/BOX")) return "LOJA_BOX";
  if (normalized.includes("SELF_STORAGE")) return "SELF_STORAGE";
  if (normalized.includes("LOTE_TERRENO")) return "LOTE_TERRENO";
  if (normalized.includes("GALPAO")) return "GALPAO";
  if (normalized.includes("TERREO")) return "TERREO";
  if (normalized.includes("STUDIO") || normalized.includes("STUDIOS")) return "STUDIO";
  if (normalized.includes("KITNET") || normalized.includes("CONJUGADO")) return "KITNET_CONJUGADO";
  if (normalized.includes("FLAT")) return "FLAT";
  if (normalized.includes("LOFT")) return "LOFT";
  if (normalized.includes("PADRAO")) return "PADRAO";

  const optionByValue = fallbackOptions.find((item) => item.value === normalized);
  if (optionByValue) return optionByValue.value;
  return fallbackOptions[0]?.value ?? "PADRAO";
}

const EMPREENDIMENTO_TIPOLOGIA_RESIDENCIAL_LABEL: Record<string, string> = {
  APARTAMENTO_PADRAO: "Padrão",
  LOFT: "Loft",
  DUPLEX: "Duplex",
  TRIPLEX: "Triplex",
  COBERTURA: "Cobertura",
  GARDEN: "Garden",
  STUDIO: "Studios",
  CASA_PADRAO: "Padrão",
  SOBRADO: "Sobrado",
  LOTE_TERRENO: "Lote / Terreno",
};

const EMPREENDIMENTO_TIPOLOGIA_COMERCIAL_LABEL: Record<string, string> = {
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
};

function inferTipoImovelFromCategoriaEmpreendimento(
  empreendimento: Pick<
    EmpreendimentoLookupItem,
    "tipo_uso" | "categoria_residencial" | "categoria_comercial"
  >,
): TipoImovelValue | null {
  if (empreendimento.tipo_uso === "RESIDENCIAL") {
    if (empreendimento.categoria_residencial === "CASAS") return "CASA";
    if (empreendimento.categoria_residencial === "TERRENOS") return "LOTE_TERRENO";
    return "APARTAMENTO";
  }

  if (empreendimento.tipo_uso === "COMERCIAL") {
    if (empreendimento.categoria_comercial === "CASAS") return "CASA_COMERCIAL";
    if (empreendimento.categoria_comercial === "TERRENOS") return "LOTE_TERRENO";
    if (empreendimento.categoria_comercial === "SHOPPING") return "PONTO_COMERCIAL_LOJA_BOX";
    if (empreendimento.categoria_comercial === "LOGISTICO") return "GALPAO_DEPOSITO_ARMAZEM";
    return "ESCRITORIO";
  }

  return null;
}

function inferTipoImovelFromTipologiaToken(
  tipologiaToken: string,
  defaultUso: "Residencial" | "Comercial" | null,
): TipoImovelValue | null {
  const inferred = inferTipoImovelFromTipologia(tipologiaToken);
  if (inferred) return inferred;

  if (tipologiaToken === "APARTAMENTO_PADRAO" || tipologiaToken === "GARDEN") return "APARTAMENTO";
  if (tipologiaToken === "STUDIO") return "STUDIO";
  if (tipologiaToken === "LOFT") return "LOFT";
  if (tipologiaToken === "CASA_PADRAO" || tipologiaToken === "SOBRADO" || tipologiaToken === "GEMINADA") {
    return "CASA";
  }
  if (tipologiaToken === "LOTE_TERRENO") return "LOTE_TERRENO";
  if (tipologiaToken === "LAJE_INTEIRA" || tipologiaToken === "MEIA_LAJE") return "ESCRITORIO";
  if (tipologiaToken === "ANDAR_INTEIRO" || tipologiaToken === "MEIO_ANDAR") return "ESCRITORIO";
  if (tipologiaToken === "LOJA_BOX") return "PONTO_COMERCIAL_LOJA_BOX";
  if (tipologiaToken === "GALPAO") return "GALPAO_DEPOSITO_ARMAZEM";
  if (tipologiaToken === "SELF_STORAGE") return "SELF_STORAGE";

  if (tipologiaToken === "PADRAO" || tipologiaToken === "DUPLEX" || tipologiaToken === "TRIPLEX") {
    return defaultUso === "Comercial" ? "ESCRITORIO" : "APARTAMENTO";
  }

  if (tipologiaToken === "TERREO") return defaultUso === "Comercial" ? "ESCRITORIO" : "APARTAMENTO";
  if (tipologiaToken === "COBERTURA") return defaultUso === "Comercial" ? "ESCRITORIO" : "COBERTURA";
  return null;
}

function inferSubcategoriaLabelFromTipologiaToken(tipologiaToken: string): string {
  const [head, ...tail] = tipologiaToken.split("_");
  if (head === "APARTAMENTO" || head === "CASA") {
    if (tail.length > 0) return formatEnumLabel(tail.join("_"));
    return formatEnumLabel(head);
  }
  return formatEnumLabel(tipologiaToken);
}

function tipoUsoFromTipoImovel(tipo: TipoImovelValue): "Residencial" | "Comercial" {
  return COMMERCIAL_TIPO_IMOVEL.has(tipo) ? "Comercial" : "Residencial";
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
    __coMapsPromise?: Promise<void>;
  }
}

export default function NovoImovelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const imovelFromUrl = (searchParams.get("imovel") ?? "").trim();
  const stepParamFromUrl = searchParams.get("step");
  const hasStepInUrl = stepParamFromUrl != null && stepParamFromUrl.trim().length > 0;
  const stepFromUrl = toStepNumber(stepParamFromUrl);

  const hasBootstrappedRef = useRef(false);
  const currentLoadRef = useRef("");
  const prefillTipologiaRef = useRef("");
  const step5HydratedRef = useRef(false);

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [loadingImovel, setLoadingImovel] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [imovelId, setImovelId] = useState("");
  const [currentStep, setCurrentStep] = useState(stepFromUrl);
  const [savingStep, setSavingStep] = useState(false);

  const [pertenceEmpreendimento, setPertenceEmpreendimento] = useState<PertenceEmpreendimento>("");
  const [empreendimentoQuery, setEmpreendimentoQuery] = useState("");
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoLookupItem[]>([]);
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [empreendimentoTipoId, setEmpreendimentoTipoId] = useState("");
  const [empreendimentoTipologiaLabel, setEmpreendimentoTipologiaLabel] = useState("");

  const [enderecoComplemento, setEnderecoComplemento] = useState("");
  const [enderecoVisualizacao, setEnderecoVisualizacao] =
    useState<EnderecoVisualizacaoValue>("END_SEM_COMPLEMENTO");
  const [andar, setAndar] = useState("");
  const [mostrarAndarNoAnuncio, setMostrarAndarNoAnuncio] = useState(false);
  const [ultimoAndar, setUltimoAndar] = useState(false);

  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [bairroComercial, setBairroComercial] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("SP");
  const [cep, setCep] = useState("");
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
  const [localizacaoContextoForm, setLocalizacaoContextoForm] = useState<LocalizacaoContextoState>({
    perfil_regiao: [],
    mobilidade: [],
    comercio_servicos: [],
    lazer_estilo_vida: [],
    resumo_local: "",
  });

  const [tipoImovel, setTipoImovel] = useState<TipoImovelValue>("APARTAMENTO");
  const [soloTipoUsoContexto, setSoloTipoUsoContexto] = useState<SoloTipoUsoContexto>("");
  const [soloCategoriaContexto, setSoloCategoriaContexto] = useState("");
  const [soloSubcategoriaToken, setSoloSubcategoriaToken] = useState("");
  const [areaTotal, setAreaTotal] = useState("");
  const [areaUtil, setAreaUtil] = useState("");
  const [dormitorios, setDormitorios] = useState("");
  const [suites, setSuites] = useState("");
  const [banheiros, setBanheiros] = useState("");
  const [lavabos, setLavabos] = useState("");
  const [salas, setSalas] = useState("");
  const [cozinhas, setCozinhas] = useState("");
  const [vagas, setVagas] = useState("");
  const [vagaTamanho, setVagaTamanho] = useState<VagaTamanho | "">("");
  const [vagaCobertura, setVagaCobertura] = useState<VagaCobertura | "">("");
  const [vagaTipos, setVagaTipos] = useState<VagaTipo[]>([]);

  const [areaTerreno, setAreaTerreno] = useState("");
  const [frenteMetros, setFrenteMetros] = useState("");
  const [fundosMetros, setFundosMetros] = useState("");
  const [lateral1Metros, setLateral1Metros] = useState("");
  const [lateral2Metros, setLateral2Metros] = useState("");

  const [tipoNegociacao, setTipoNegociacao] = useState<TipoNegociacaoValue>("VENDA");
  const [precoVenda, setPrecoVenda] = useState("");
  const [precoLocacao, setPrecoLocacao] = useState("");
  const [valorCondominio, setValorCondominio] = useState("");
  const [valorIptu, setValorIptu] = useState("");
  const [iptuMensal, setIptuMensal] = useState(false);
  const [comissaoLocacao, setComissaoLocacao] = useState("");
  const [comissaoVendaPercentual, setComissaoVendaPercentual] = useState("");
  const [minimoAceitoEmMaos, setMinimoAceitoEmMaos] = useState("");
  const [aceitaPermuta, setAceitaPermuta] = useState(false);
  const [descricaoPermuta, setDescricaoPermuta] = useState("");
  const [modeloCaptacao, setModeloCaptacao] = useState<ModeloCaptacaoValue>("");
  const [corretorParceiroNome, setCorretorParceiroNome] = useState("");
  const [corretorParceiroTelefone, setCorretorParceiroTelefone] = useState("");
  const [corretorParceiroEmail, setCorretorParceiroEmail] = useState("");
  const [proprietarioNome, setProprietarioNome] = useState("");
  const [proprietarioTelefone, setProprietarioTelefone] = useState("");
  const [proprietarioEmail, setProprietarioEmail] = useState("");
  const [comissaoCaptadorPercentual, setComissaoCaptadorPercentual] = useState("");
  const [comissaoVendedorPercentual, setComissaoVendedorPercentual] = useState("");
  const [exclusividadeComissaoMinhaPercentual, setExclusividadeComissaoMinhaPercentual] = useState("");
  const [exclusividadeComissaoParceiroPercentual, setExclusividadeComissaoParceiroPercentual] = useState("");
  const [exclusividadeDataVencimento, setExclusividadeDataVencimento] = useState("");
  const [exclusividadeObservacoes, setExclusividadeObservacoes] = useState("");
  const [disponibilizarNoBolsaoParceria, setDisponibilizarNoBolsaoParceria] = useState(false);
  const [bolsaoPermitirMudancaPreco, setBolsaoPermitirMudancaPreco] = useState(false);
  const [bolsaoPermitirDownloadMidiaKit, setBolsaoPermitirDownloadMidiaKit] = useState(false);
  const [bolsaoSomenteVisitasAgendadas, setBolsaoSomenteVisitasAgendadas] = useState(false);
  const [bolsaoSomenteVisitasComMinhaPresenca, setBolsaoSomenteVisitasComMinhaPresenca] = useState(false);
  const [aceiteCorretorExclusivo, setAceiteCorretorExclusivo] = useState(false);
  const [aceitaParceriaStatus, setAceitaParceriaStatus] = useState<AceitaParceriaStatusValue | "">("");

  const [qtdDormitoriosDetalhe, setQtdDormitoriosDetalhe] = useState("");
  const [qtdCozinhasDetalhe, setQtdCozinhasDetalhe] = useState("");
  const [qtdSalasDetalhe, setQtdSalasDetalhe] = useState("");
  const [qtdVarandasDetalhe, setQtdVarandasDetalhe] = useState("");
  const [dormitoriosDetalhe, setDormitoriosDetalhe] = useState<DormitorioAmbienteForm[]>([]);
  const [cozinhasDetalhe, setCozinhasDetalhe] = useState<CozinhaAmbienteForm[]>([]);
  const [salasDetalhe, setSalasDetalhe] = useState<SalaAmbienteForm[]>([]);
  const [varandasDetalhe, setVarandasDetalhe] = useState<VarandaAmbienteForm[]>([]);
  const [caracteristicasCatalogo, setCaracteristicasCatalogo] = useState<CaracteristicaCatalogoItem[]>([]);
  const [loadingCaracteristicasCatalogo, setLoadingCaracteristicasCatalogo] = useState(false);
  const [caracteristicaQuery, setCaracteristicaQuery] = useState("");
  const [caracteristicasSelecionadas, setCaracteristicasSelecionadas] = useState<string[]>([]);
  const [empreendimentoCaracteristicasAssociadas, setEmpreendimentoCaracteristicasAssociadas] = useState<
    CaracteristicaCatalogoItem[]
  >([]);
  const [loadingEmpreendimentoCaracteristicasAssociadas, setLoadingEmpreendimentoCaracteristicasAssociadas] =
    useState(false);
  const [showEmpreendimentoCaracteristicasModal, setShowEmpreendimentoCaracteristicasModal] = useState(false);
  const [loadingStep5, setLoadingStep5] = useState(false);
  const [descricaoImovel, setDescricaoImovel] = useState("");
  const [midiasImovel, setMidiasImovel] = useState<ImageDraftItem[]>([]);
  const [midiasEmpreendimentoRelacionadas, setMidiasEmpreendimentoRelacionadas] = useState<ImovelMidiaItem[]>([]);
  const [rejectedMidiasImovel, setRejectedMidiasImovel] = useState<RejectedImageDraftItem[]>([]);
  const [loadingMidiasImovel, setLoadingMidiasImovel] = useState(false);
  const [loadingMidiasEmpreendimentoRelacionadas, setLoadingMidiasEmpreendimentoRelacionadas] = useState(false);
  const [uploadingMidiaImovel, setUploadingMidiaImovel] = useState(false);
  const [uploadingMidiaImovelPercent, setUploadingMidiaImovelPercent] = useState<number | null>(null);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideoDraftItem[]>([]);
  const [addingYoutube, setAddingYoutube] = useState(false);
  const [deletingMidiaImovelIds, setDeletingMidiaImovelIds] = useState<string[]>([]);
  const [isMidiaImovelDragActive, setIsMidiaImovelDragActive] = useState(false);
  const [dropTargetMidiaImovelId, setDropTargetMidiaImovelId] = useState<string | null>(null);
  const [editingMidiaImovelId, setEditingMidiaImovelId] = useState<string | null>(null);
  const [ocupacaoImovel, setOcupacaoImovel] = useState<OcupacaoImovelValue | "">("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [checkingAykaCreditos, setCheckingAykaCreditos] = useState(false);
  const [gerandoDescricaoAyka, setGerandoDescricaoAyka] = useState(false);
  const [aykaActionCodigo, setAykaActionCodigo] = useState("CRIAR_DESCRICAO_IMOVEL");

  const [stepError, setStepError] = useState<string | null>(null);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const lastSyncedStepRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapHostElementRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
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
  const empreendimentoCaracteristicasHydratedRef = useRef<string | null>(null);

  const selectedEmpreendimento = useMemo(
    () => empreendimentos.find((item) => item.id === empreendimentoId) ?? null,
    [empreendimentos, empreendimentoId],
  );
  const hasEmpreendimentoAssociado = pertenceEmpreendimento === "SIM" && empreendimentoId.trim().length > 0;
  const empreendimentoAssociadoNome =
    selectedEmpreendimento?.nome && selectedEmpreendimento.nome.trim().length > 0
      ? selectedEmpreendimento.nome.trim()
      : "Empreendimento associado";

  const selectedTipo = useMemo(
    () => selectedEmpreendimento?.tipos.find((item) => item.id === empreendimentoTipoId) ?? null,
    [selectedEmpreendimento, empreendimentoTipoId],
  );
  const isStep2Solo = currentStep === 2 && pertenceEmpreendimento !== "SIM";
  const readOnlyAddressByPlace = Boolean(placeId);

  const caracteristicasSelecionadasOptions = useMemo(
    () =>
      caracteristicasCatalogo
        .filter((item) => caracteristicasSelecionadas.includes(item.chave))
        .sort((a, b) => a.label_pt.localeCompare(b.label_pt, "pt-BR")),
    [caracteristicasCatalogo, caracteristicasSelecionadas],
  );

  const caracteristicaLabelByChave = useMemo(
    () => new Map(caracteristicasSelecionadasOptions.map((item) => [item.chave, item.label_pt])),
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

  const tipoImovelFromCategoriaEmpreendimento = useMemo<TipoImovelValue | null>(() => {
    if (!selectedEmpreendimento) return null;
    return inferTipoImovelFromCategoriaEmpreendimento(selectedEmpreendimento);
  }, [selectedEmpreendimento]);

  const empreendimentoTipologiaContextos = useMemo<EmpreendimentoTipologiaContexto[]>(() => {
    if (!selectedEmpreendimento) return [];

    const tokensFromTiposRelacionais = selectedEmpreendimento.tipos
      .map((item) => ({
        id: item.id,
        token: normalizeTipologiaToken(item.tipologia),
        forcedTipoImovel: null as TipoImovelValue | null,
        forcedSubcategoriaLabel: null as string | null,
      }))
      .filter((item) => item.token.length > 0);

    const tokensFromCadastroEmpreendimento = (
      selectedEmpreendimento.tipo_uso === "COMERCIAL"
        ? selectedEmpreendimento.tipologias_comerciais
        : selectedEmpreendimento.tipologias_residenciais
    )
      .map((tipologia, index) => {
        const token = normalizeTipologiaToken(tipologia);
        if (!token || !tipoImovelFromCategoriaEmpreendimento) return null;
        const labelMap =
          selectedEmpreendimento.tipo_uso === "COMERCIAL"
            ? EMPREENDIMENTO_TIPOLOGIA_COMERCIAL_LABEL
            : EMPREENDIMENTO_TIPOLOGIA_RESIDENCIAL_LABEL;
        return {
          id: `cfg-${token}-${index}`,
          token,
          forcedTipoImovel: tipoImovelFromCategoriaEmpreendimento,
          forcedSubcategoriaLabel: labelMap[token] ?? inferSubcategoriaLabelFromTipologiaToken(token),
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          token: string;
          forcedTipoImovel: TipoImovelValue;
          forcedSubcategoriaLabel: string;
        } => Boolean(item),
      );

    // Fonte de verdade para categoria/subcategoria no cadastro sem tipologia selecionada:
    // usa primeiro as tipologias configuradas no empreendimento; só faz fallback para tipos relacionais.
    const tokens =
      tokensFromCadastroEmpreendimento.length > 0 ? tokensFromCadastroEmpreendimento : tokensFromTiposRelacionais;

    if (tokens.length === 0) return [];

    const usosDiretos = tokens
      .map((item) => item.forcedTipoImovel ?? inferTipoImovelFromTipologia(item.token))
      .filter((item): item is TipoImovelValue => Boolean(item))
      .map((item) => tipoUsoFromTipoImovel(item));

    const hasResidencialDireto = usosDiretos.includes("Residencial");
    const hasComercialDireto = usosDiretos.includes("Comercial");
    const defaultUsoByEmpreendimento =
      selectedEmpreendimento.tipo_uso === "COMERCIAL"
        ? "Comercial"
        : selectedEmpreendimento.tipo_uso === "RESIDENCIAL"
          ? "Residencial"
          : null;
    const defaultUso =
      defaultUsoByEmpreendimento ??
      (hasResidencialDireto === hasComercialDireto
        ? null
        : hasComercialDireto
          ? "Comercial"
          : "Residencial");

    const mapped = tokens
      .map((item) => {
        const tipoImovelFromToken =
          item.forcedTipoImovel ?? inferTipoImovelFromTipologiaToken(item.token, defaultUso);
        if (!tipoImovelFromToken) return null;

        const categoriaLabel =
          TIPO_IMOVEL_OPTIONS.find((option) => option.value === tipoImovelFromToken)?.label ??
          formatEnumLabel(item.token);
        const subcategoriaLabel =
          item.forcedSubcategoriaLabel ?? inferSubcategoriaLabelFromTipologiaToken(item.token);

        return {
          tipo_id: item.id,
          tipologia_raw: item.token,
          tipo_imovel: tipoImovelFromToken,
          categoria_label: categoriaLabel,
          subcategoria_label: subcategoriaLabel,
          tipologia_label: `${categoriaLabel} > ${subcategoriaLabel}`,
        } satisfies EmpreendimentoTipologiaContexto;
      })
      .filter((item): item is EmpreendimentoTipologiaContexto => Boolean(item));

    const unique = new Map<string, EmpreendimentoTipologiaContexto>();
    for (const item of mapped) {
      const key = `${item.tipo_imovel}:${item.subcategoria_label.toUpperCase()}`;
      if (!unique.has(key)) unique.set(key, item);
    }
    return Array.from(unique.values());
  }, [selectedEmpreendimento, tipoImovelFromCategoriaEmpreendimento]);

  const deveRestringirCategoriaSubcategoriaPorEmpreendimento = useMemo(
    () =>
      pertenceEmpreendimento === "SIM" &&
      !selectedTipo &&
      empreendimentoTipologiaContextos.length > 0,
    [pertenceEmpreendimento, selectedTipo, empreendimentoTipologiaContextos],
  );
  const deveExibirCategoriaSubcategoriaPorEmpreendimento = useMemo(
    () => pertenceEmpreendimento === "SIM" && Boolean(empreendimentoId) && !selectedTipo,
    [pertenceEmpreendimento, empreendimentoId, selectedTipo],
  );
  const empreendimentoSemTipologiasDisponiveis = useMemo(
    () =>
      deveExibirCategoriaSubcategoriaPorEmpreendimento &&
      empreendimentoTipologiaContextos.length === 0,
    [deveExibirCategoriaSubcategoriaPorEmpreendimento, empreendimentoTipologiaContextos],
  );

  const tipoImovelDisponiveisEmpreendimento = useMemo(() => {
    if (!deveRestringirCategoriaSubcategoriaPorEmpreendimento) return [];

    const unique = new Set<TipoImovelValue>();
    empreendimentoTipologiaContextos.forEach((item) => {
      unique.add(item.tipo_imovel);
    });
    return Array.from(unique);
  }, [deveRestringirCategoriaSubcategoriaPorEmpreendimento, empreendimentoTipologiaContextos]);

  const tipologiasContextoParaTipoImovelAtual = useMemo(() => {
    if (!deveRestringirCategoriaSubcategoriaPorEmpreendimento) return [];
    return empreendimentoTipologiaContextos.filter((item) => item.tipo_imovel === tipoImovel);
  }, [deveRestringirCategoriaSubcategoriaPorEmpreendimento, empreendimentoTipologiaContextos, tipoImovel]);

  const tipologiaContextoSelecionada = useMemo(() => {
    if (!deveRestringirCategoriaSubcategoriaPorEmpreendimento) return null;
    const normalizedLabel = empreendimentoTipologiaLabel.trim().toUpperCase();

    return (
      tipologiasContextoParaTipoImovelAtual.find(
        (item) =>
          item.tipologia_label.toUpperCase() === normalizedLabel ||
          item.tipologia_raw === normalizedLabel,
      ) ??
      tipologiasContextoParaTipoImovelAtual[0] ??
      null
    );
  }, [
    deveRestringirCategoriaSubcategoriaPorEmpreendimento,
    empreendimentoTipologiaLabel,
    tipologiasContextoParaTipoImovelAtual,
  ]);

  const categoriaTravadaPorEmpreendimento = useMemo(
    () =>
      deveExibirCategoriaSubcategoriaPorEmpreendimento &&
      (Boolean(tipoImovelFromCategoriaEmpreendimento) || tipoImovelDisponiveisEmpreendimento.length <= 1),
    [
      deveExibirCategoriaSubcategoriaPorEmpreendimento,
      tipoImovelFromCategoriaEmpreendimento,
      tipoImovelDisponiveisEmpreendimento.length,
    ],
  );

  const tipologiaAtualLabel = useMemo(() => {
    if (selectedTipo) return tipologiaLabel(selectedTipo);
    return empreendimentoTipologiaLabel || null;
  }, [selectedTipo, empreendimentoTipologiaLabel]);
  const tipologiaSoloContexto = useMemo(() => {
    if (pertenceEmpreendimento !== "NAO") return null;
    const resolved = resolveSoloTipologiaSelection({
      uso: soloTipoUsoContexto,
      categoria: soloCategoriaContexto,
      subcategoriaToken: soloSubcategoriaToken,
    });
    const tipologiaRaw = (resolved?.tipologia_label ?? empreendimentoTipologiaLabel ?? "").trim();
    if (!tipologiaRaw) return null;

    const [categoria, subcategoria] = tipologiaRaw
      .split(">")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return {
      uso:
        soloTipoUsoContexto === "COMERCIAL"
          ? "Comercial"
          : soloTipoUsoContexto === "RESIDENCIAL"
            ? "Residencial"
            : tipoUsoFromTipoImovel(resolved?.tipo_imovel ?? tipoImovel),
      categoria:
        categoria || TIPO_IMOVEL_OPTIONS.find((item) => item.value === (resolved?.tipo_imovel ?? tipoImovel))?.label,
      subcategoria: subcategoria || null,
    };
  }, [
    pertenceEmpreendimento,
    soloTipoUsoContexto,
    soloCategoriaContexto,
    soloSubcategoriaToken,
    empreendimentoTipologiaLabel,
    tipoImovel,
  ]);

  const isTipoContextLockedByEmpreendimento = useMemo(
    () => pertenceEmpreendimento === "SIM" && Boolean(empreendimentoTipoId),
    [pertenceEmpreendimento, empreendimentoTipoId],
  );

  const tipoUsoLabel = useMemo(() => tipoUsoFromTipoImovel(tipoImovel), [tipoImovel]);
  const tipoUsoApi = useMemo(() => (tipoUsoLabel === "Comercial" ? "COMERCIAL" : "RESIDENCIAL"), [tipoUsoLabel]);
  const subtipoImovelApi = useMemo(
    () => inferSubtipoImovelFromTipologiaLabel(tipologiaAtualLabel),
    [tipologiaAtualLabel],
  );
  const soloCategoriasDisponiveis = useMemo(() => {
    return getSoloCategoriaOptions(soloTipoUsoContexto);
  }, [soloTipoUsoContexto]);
  const soloSubcategoriasDisponiveis = useMemo(
    () => getSoloSubcategoriaOptions(soloTipoUsoContexto, soloCategoriaContexto),
    [soloTipoUsoContexto, soloCategoriaContexto],
  );
  const caracteristicasFiltradas = useMemo(() => {
    const query = normalizeText(caracteristicaQuery);
    const base = caracteristicasCatalogo.filter((item) => item.ativo !== false);
    const filtered = !query
      ? base
      : base.filter((item) => {
      const label = normalizeText(item.label_pt ?? "");
      const chave = normalizeText(item.chave ?? "");
      return label.includes(query) || chave.includes(query);
    });
    return [...filtered].sort((a, b) => (a.label_pt ?? "").localeCompare(b.label_pt ?? "", "pt-BR"));
  }, [caracteristicasCatalogo, caracteristicaQuery]);

  const canShowTerrainFields = useMemo(() => {
    if (TERRAIN_APPLICABLE_TYPES.has(tipoImovel)) return true;
    const normalized = (tipologiaAtualLabel ?? "").toUpperCase();
    return normalized.includes("TERRENO") || normalized.includes("LOTE");
  }, [tipoImovel, tipologiaAtualLabel]);
  const terrenoPreview = useMemo(() => {
    const parsePositive = (raw: string) => {
      const parsed = parseOptionalDecimal(raw);
      if (!parsed.ok || parsed.value == null || parsed.value <= 0) return null;
      return parsed.value;
    };

    const frente = parsePositive(frenteMetros);
    const fundo = parsePositive(fundosMetros);
    const lateral1 = parsePositive(lateral1Metros);
    const lateral2 = parsePositive(lateral2Metros);
    const areaInformada = parsePositive(areaTerreno);
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
  }, [areaTerreno, frenteMetros, fundosMetros, lateral1Metros, lateral2Metros]);
  const canShowAndarFields = useMemo(
    () => VERTICAL_ANDAR_APPLICABLE_TYPES.has(tipoImovel),
    [tipoImovel],
  );

  const hasVendaNegociacao = tipoNegociacao === "VENDA" || tipoNegociacao === "VENDA_E_ALUGUEL";
  const hasAluguelNegociacao = tipoNegociacao === "ALUGUEL" || tipoNegociacao === "VENDA_E_ALUGUEL";
  const isUsoComercial = tipoUsoApi === "COMERCIAL";
  const isCaptacaoParceria = modeloCaptacao === "PARCERIA";
  const isMinhaCaptacaoSemExclusividade = modeloCaptacao === "CAPTACAO_SEM_EXCLUSIVIDADE";
  const isMinhaExclusividade = modeloCaptacao === "EXCLUSIVIDADE";
  const isParceriaSemExclusividadeAtiva =
    isMinhaCaptacaoSemExclusividade &&
    (aceitaParceriaStatus === "SIM" || aceitaParceriaStatus === "SOB_ANALISE");
  const shouldShowComissaoParceria = isCaptacaoParceria || isParceriaSemExclusividadeAtiva;
  const isParceriaExclusividadeAtiva =
    aceitaParceriaStatus === "SIM" || aceitaParceriaStatus === "SOB_ANALISE";
  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const minBolsaoExclusividadeIsoDate = useMemo(() => {
    const baseDate = new Date();
    baseDate.setUTCHours(0, 0, 0, 0);
    baseDate.setUTCDate(baseDate.getUTCDate() + BOLSAO_EXCLUSIVIDADE_MIN_DIAS);
    return baseDate.toISOString().slice(0, 10);
  }, []);
  const hasVencimentoMinimoParaBolsao = useMemo(() => {
    if (!exclusividadeDataVencimento) return false;
    return exclusividadeDataVencimento >= minBolsaoExclusividadeIsoDate;
  }, [exclusividadeDataVencimento, minBolsaoExclusividadeIsoDate]);

  const ganhoEstimadoComissaoVenda = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const preco = parseOptionalCurrency(precoVenda);
    const percentual = parseOptionalPercent(comissaoVendaPercentual);
    if (!preco.ok || !percentual.ok) return null;
    if (preco.value == null || percentual.value == null) return null;
    return (preco.value * percentual.value) / 100;
  }, [hasVendaNegociacao, precoVenda, comissaoVendaPercentual]);

  const ganhoPotencialCaptador = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(comissaoCaptadorPercentual);
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [hasVendaNegociacao, ganhoEstimadoComissaoVenda, comissaoCaptadorPercentual]);

  const ganhoPotencialVendedor = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(comissaoVendedorPercentual);
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [hasVendaNegociacao, ganhoEstimadoComissaoVenda, comissaoVendedorPercentual]);

  const ganhoEstimadoExclusividadeMinha = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(exclusividadeComissaoMinhaPercentual);
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [hasVendaNegociacao, ganhoEstimadoComissaoVenda, exclusividadeComissaoMinhaPercentual]);

  const ganhoEstimadoExclusividadeParceiro = useMemo(() => {
    if (!hasVendaNegociacao) return null;
    const percentual = parseOptionalPercent(exclusividadeComissaoParceiroPercentual);
    if (!percentual.ok) return null;
    if (ganhoEstimadoComissaoVenda == null || percentual.value == null) return null;
    return (ganhoEstimadoComissaoVenda * percentual.value) / 100;
  }, [hasVendaNegociacao, ganhoEstimadoComissaoVenda, exclusividadeComissaoParceiroPercentual]);

  const imagensEmpreendimentoRelacionadas = useMemo(
    () => midiasEmpreendimentoRelacionadas.filter((item) => item.tipo === "IMAGEM"),
    [midiasEmpreendimentoRelacionadas],
  );
  const imagensEmpreendimentoPreview = useMemo(
    () => imagensEmpreendimentoRelacionadas.slice(0, 3),
    [imagensEmpreendimentoRelacionadas],
  );
  const imagensEmpreendimentoExtras = Math.max(0, imagensEmpreendimentoRelacionadas.length - 3);
  const totalMidiasCombinadas = midiasImovel.length + imagensEmpreendimentoRelacionadas.length;
  const descricaoImovelPlain = useMemo(() => htmlToPlainText(descricaoImovel), [descricaoImovel]);
  const tipoNegociacaoLabel = useMemo(
    () => TIPO_NEGOCIACAO_OPTIONS.find((item) => item.value === tipoNegociacao)?.label ?? tipoNegociacao,
    [tipoNegociacao],
  );
  const precoVendaFormatado = useMemo(() => {
    const parsed = parseOptionalCurrency(precoVenda);
    if (!parsed.ok || parsed.value == null) return null;
    return formatCurrencyValue(parsed.value);
  }, [precoVenda]);
  const precoLocacaoFormatado = useMemo(() => {
    const parsed = parseOptionalCurrency(precoLocacao);
    if (!parsed.ok || parsed.value == null) return null;
    return formatCurrencyValue(parsed.value);
  }, [precoLocacao]);
  const valorCondominioFormatado = useMemo(() => {
    const parsed = parseOptionalCurrency(valorCondominio);
    if (!parsed.ok || parsed.value == null) return null;
    return formatCurrencyValue(parsed.value);
  }, [valorCondominio]);
  const valorIptuFormatado = useMemo(() => {
    const parsed = parseOptionalCurrency(valorIptu);
    if (!parsed.ok || parsed.value == null) return null;
    return formatCurrencyValue(parsed.value);
  }, [valorIptu]);
  const reviewAddress = useMemo(() => {
    if (pertenceEmpreendimento === "SIM" && selectedEmpreendimento) {
      return formatEnderecoCurto(selectedEmpreendimento);
    }
    return formatEnderecoCurto({ logradouro, numero, bairro, cidade, estado });
  }, [pertenceEmpreendimento, selectedEmpreendimento, logradouro, numero, bairro, cidade, estado]);
  const reviewMapQuery = useMemo(() => {
    if (pertenceEmpreendimento === "SIM" && selectedEmpreendimento) {
      return [
        selectedEmpreendimento.logradouro,
        selectedEmpreendimento.numero,
        selectedEmpreendimento.bairro_comercial ?? selectedEmpreendimento.bairro,
        selectedEmpreendimento.cidade,
        selectedEmpreendimento.estado,
      ]
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join(", ");
    }
    return [logradouro, numero, bairro, cidade, estado]
      .filter((item) => item.trim().length > 0)
      .join(", ");
  }, [pertenceEmpreendimento, selectedEmpreendimento, logradouro, numero, bairro, cidade, estado]);
  const reviewMapEmbedUrl = useMemo(() => buildGoogleMapsEmbedUrl(reviewMapQuery), [reviewMapQuery]);
  const reviewMidiasImovel = useMemo(
    () =>
      midiasImovel.map((item) => ({
        id: `imovel-${item.midiaId}`,
        url: item.previewUrl,
        alt: item.alt || item.fileName,
      })),
    [midiasImovel],
  );
  const reviewMidiasEmpreendimento = useMemo(
    () =>
      imagensEmpreendimentoRelacionadas.map((item) => ({
        id: `empreendimento-${item.midia_id}`,
        url: item.url,
        alt: item.alt ?? "Imagem do empreendimento",
      })),
    [imagensEmpreendimentoRelacionadas],
  );
  const reviewPendencias = useMemo(() => {
    const pendencias: string[] = [];
    if (!descricaoImovelPlain) {
      pendencias.push("Descrição ainda não preenchida.");
    }
    if (totalMidiasCombinadas === 0) {
      pendencias.push("Adicione ao menos uma imagem (imóvel ou empreendimento).");
    }
    if ((tipoNegociacao === "VENDA" || tipoNegociacao === "VENDA_E_ALUGUEL") && !precoVendaFormatado) {
      pendencias.push("Valor de venda não informado.");
    }
    if ((tipoNegociacao === "ALUGUEL" || tipoNegociacao === "VENDA_E_ALUGUEL") && !precoLocacaoFormatado) {
      pendencias.push("Valor de aluguel não informado.");
    }
    if (!reviewAddress) {
      pendencias.push("Endereço/localização incompleto.");
    }
    return pendencias;
  }, [
    descricaoImovelPlain,
    totalMidiasCombinadas,
    tipoNegociacao,
    precoVendaFormatado,
    precoLocacaoFormatado,
    reviewAddress,
  ]);

  useEffect(() => {
    if (!shouldShowComissaoParceria) return;
    const parsedMinha = parseOptionalPercent(comissaoCaptadorPercentual);
    if (!parsedMinha.ok || parsedMinha.value == null) {
      if (comissaoVendedorPercentual !== "") setComissaoVendedorPercentual("");
      return;
    }
    const parceiro = Math.max(0, 100 - parsedMinha.value);
    const parceiroInput = numberToPercentInput(parceiro);
    if (comissaoVendedorPercentual !== parceiroInput) {
      setComissaoVendedorPercentual(parceiroInput);
    }
  }, [shouldShowComissaoParceria, comissaoCaptadorPercentual, comissaoVendedorPercentual]);

  useEffect(() => {
    if (!isMinhaExclusividade || !isParceriaExclusividadeAtiva) return;
    const parsedMinha = parseOptionalPercent(exclusividadeComissaoMinhaPercentual);
    if (!parsedMinha.ok || parsedMinha.value == null) {
      if (exclusividadeComissaoParceiroPercentual !== "") setExclusividadeComissaoParceiroPercentual("");
      return;
    }
    const parceiro = Math.max(0, 100 - parsedMinha.value);
    const parceiroInput = numberToPercentInput(parceiro);
    if (exclusividadeComissaoParceiroPercentual !== parceiroInput) {
      setExclusividadeComissaoParceiroPercentual(parceiroInput);
    }
  }, [
    isMinhaExclusividade,
    isParceriaExclusividadeAtiva,
    exclusividadeComissaoMinhaPercentual,
    exclusividadeComissaoParceiroPercentual,
  ]);

  useEffect(() => {
    if (!hasStepInUrl) return;
    setCurrentStep(stepFromUrl);
  }, [hasStepInUrl, stepFromUrl]);

  useEffect(() => {
    if (!imovelId) return;
    saveDraftStep(imovelId, currentStep);
  }, [imovelId, currentStep]);

  useEffect(() => {
    if (!imovelId) return;
    if (lastSyncedStepRef.current === currentStep) return;
    lastSyncedStepRef.current = currentStep;

    void apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({ step_rascunho: currentStep }),
    });
  }, [imovelId, currentStep]);

  useEffect(() => {
    if (!imovelFromUrl) {
      if (hasBootstrappedRef.current) return;
      hasBootstrappedRef.current = true;
      setBootstrapLoading(true);
      setBootstrapError(null);

      void apiFetchWithAuth<{ id: string }>("/api/imoveis", {
        method: "POST",
        body: JSON.stringify({}),
      }).then((result) => {
        if (!result.ok) {
          setBootstrapLoading(false);
          setBootstrapError(result.error);
          hasBootstrappedRef.current = false;
          return;
        }
        router.replace(`/imoveis/novo?imovel=${result.data.id}&step=1`);
      });
      return;
    }

    if (currentLoadRef.current === imovelFromUrl) return;
    currentLoadRef.current = imovelFromUrl;
    setLoadingImovel(true);
    setBootstrapError(null);

    void apiFetchWithAuth<ImovelApi>(`/api/imoveis/${imovelFromUrl}`).then((result) => {
      setLoadingImovel(false);
      setBootstrapLoading(false);

      if (!result.ok) {
        currentLoadRef.current = "";
        setBootstrapError(result.error);
        return;
      }

      if (result.data.status !== "RASCUNHO") {
        router.replace(`/imoveis/${result.data.id}`);
        return;
      }

      const savedStepFromDb =
        typeof result.data.step_rascunho === "number"
          ? toStepNumber(String(result.data.step_rascunho))
          : 1;
      const savedStepFromBrowser = hasStepInUrl ? null : loadSavedDraftStep(result.data.id);
      const effectiveSavedStep = savedStepFromDb ?? savedStepFromBrowser ?? 1;
      const requestedStep = hasStepInUrl ? stepFromUrl : null;
      const resolvedStep =
        requestedStep == null ? effectiveSavedStep : Math.min(requestedStep, effectiveSavedStep);

      const shouldMarkAsRua = !result.data.empreendimento_id && isAddressAlreadyDefined(result.data);
      const addressJson =
        result.data.address_json && typeof result.data.address_json === "object"
          ? (result.data.address_json as Record<string, unknown>)
          : {};
      const addressJsonPlaceId =
        typeof addressJson.place_id === "string" ? addressJson.place_id : "";
      const addressJsonPlaceName =
        typeof addressJson.place_name === "string" ? addressJson.place_name : "";
      const addressJsonFormattedAddress =
        typeof addressJson.formatted_address === "string" ? addressJson.formatted_address : "";
      const addressJsonBairroComercial =
        typeof addressJson.bairro_comercial === "string" ? addressJson.bairro_comercial : "";
      const addressJsonSource = typeof addressJson.source === "string" ? addressJson.source : "";
      const addressJsonComponents = Array.isArray(addressJson.address_components)
        ? addressJson.address_components
        : [];
      const shouldResetDraftAddress =
        !result.data.empreendimento_id &&
        isDraftPlaceholderAddress({
          logradouro: result.data.logradouro,
          numero: result.data.numero,
          bairro: result.data.bairro,
          cidade: result.data.cidade,
          addressSource: addressJsonSource,
        });
      const fallbackSearchAddress = formatAddressFromFields({
        logradouro: result.data.logradouro ?? "",
        numero: result.data.numero ?? "",
        bairro: result.data.bairro ?? "",
        cidade: result.data.cidade ?? "",
        estado: isUfCode(result.data.estado) ? result.data.estado : "SP",
      });

      setImovelId(result.data.id);
      setDescricaoImovel(result.data.descricao ?? "");
      setPertenceEmpreendimento(result.data.empreendimento_id ? "SIM" : shouldMarkAsRua ? "NAO" : "");
      setEmpreendimentoId(result.data.empreendimento_id ?? "");
      setEmpreendimentoTipoId(result.data.empreendimento_tipo_id ?? "");
      setEmpreendimentoTipologiaLabel(result.data.empreendimento_tipologia_label ?? "");
      setEnderecoComplemento(result.data.endereco_complemento ?? "");
      setEnderecoVisualizacao(result.data.enderecovisualizacao ?? "END_SEM_COMPLEMENTO");
      setAndar(result.data.andar == null ? "" : String(result.data.andar));
      setMostrarAndarNoAnuncio(Boolean(result.data.mostrar_andar_no_anuncio));
      setUltimoAndar(Boolean(result.data.ultimo_andar));
      setLogradouro(shouldResetDraftAddress ? "" : result.data.logradouro ?? "");
      setNumero(shouldResetDraftAddress ? "" : result.data.numero ?? "");
      setBairro(shouldResetDraftAddress ? "" : result.data.bairro ?? "");
      setBairroComercial(shouldResetDraftAddress ? "" : addressJsonBairroComercial);
      setCidade(shouldResetDraftAddress ? "" : result.data.cidade ?? "");
      setEstado(shouldResetDraftAddress ? "SP" : isUfCode(result.data.estado) ? result.data.estado : "SP");
      setCep(shouldResetDraftAddress ? "" : result.data.cep ?? "");
      setSelectedPlaceName(shouldResetDraftAddress ? "" : addressJsonPlaceName);
      setPlaceId(shouldResetDraftAddress ? "" : addressJsonPlaceId);
      setEnderecoFormatado(shouldResetDraftAddress ? "" : addressJsonFormattedAddress);
      setAddressComponents(shouldResetDraftAddress ? [] : addressJsonComponents);
      setLocalizacaoContextoForm(
        shouldResetDraftAddress
          ? normalizeLocalizacaoContextoState({})
          : normalizeLocalizacaoContextoState(result.data.localizacao_contexto),
      );
      setLat(shouldResetDraftAddress ? null : typeof result.data.lat === "number" ? result.data.lat : null);
      setLng(shouldResetDraftAddress ? null : typeof result.data.lng === "number" ? result.data.lng : null);
      setSearchAddress(shouldResetDraftAddress ? "" : addressJsonFormattedAddress || fallbackSearchAddress);

      const hydratedTipoImovel = isTipoImovel(result.data.tipo) ? result.data.tipo : "APARTAMENTO";
      setTipoImovel(hydratedTipoImovel);
      const hasSoloTipologiaPersistida =
        !result.data.empreendimento_id &&
        typeof result.data.empreendimento_tipologia_label === "string" &&
        result.data.empreendimento_tipologia_label.trim().length > 0;
      if (hasSoloTipologiaPersistida) {
        const hydratedSoloTipoUso = inferSoloTipoUsoFromTipoImovel(hydratedTipoImovel);
        const hydratedSoloCategoria = inferSoloCategoriaFromTipoImovel(hydratedTipoImovel);
        const hydratedSoloSubcategoriaToken = inferSoloSubcategoriaTokenFromLabel(
          result.data.empreendimento_tipologia_label,
          hydratedSoloTipoUso,
          hydratedSoloCategoria,
        );
        setSoloTipoUsoContexto(hydratedSoloTipoUso);
        setSoloCategoriaContexto(hydratedSoloCategoria);
        setSoloSubcategoriaToken(hydratedSoloSubcategoriaToken);
      } else {
        setSoloTipoUsoContexto("");
        setSoloCategoriaContexto("");
        setSoloSubcategoriaToken("");
      }
      setAreaTotal(normalizeDecimalPtBrInput(numberToInput(result.data.area_total)));
      setAreaUtil(normalizeDecimalPtBrInput(numberToInput(result.data.area_util)));
      setDormitorios(numberToInput(result.data.dormitorios));
      setSuites(numberToInput(result.data.suites));
      setBanheiros(numberToInput(result.data.banheiros));
      setLavabos(numberToInput(result.data.lavabos));
      setSalas(numberToInput(result.data.salas));
      setCozinhas(numberToInput(result.data.cozinhas));
      setQtdDormitoriosDetalhe(numberToInput(result.data.dormitorios));
      setQtdCozinhasDetalhe(numberToInput(result.data.cozinhas));
      setQtdSalasDetalhe(numberToInput(result.data.salas));
      setDormitoriosDetalhe([]);
      setCozinhasDetalhe([]);
      setSalasDetalhe([]);
      step5HydratedRef.current = false;
      setVagas(numberToInput(result.data.vagas));
      setVagaTamanho((result.data.vaga_tamanhos ?? []).find(isVagaTamanho) ?? "");
      setVagaCobertura((result.data.vaga_coberturas ?? []).find(isVagaCobertura) ?? "");
      setVagaTipos((result.data.vaga_tipos ?? []).filter(isVagaTipo));
      setCaracteristicasSelecionadas(
        Array.isArray(result.data.caracteristicas)
          ? result.data.caracteristicas.filter((item): item is string => typeof item === "string")
          : [],
      );
      setOcupacaoImovel(
        typeof result.data.ocupacao_imovel === "string" && isOcupacaoImovel(result.data.ocupacao_imovel)
          ? result.data.ocupacao_imovel
          : "",
      );
      setObservacoesGerais(result.data.observacoes_gerais ?? "");
      setAreaTerreno(normalizeDecimalPtBrInput(numberToInput(result.data.area_terreno)));
      setFrenteMetros(normalizeDecimalPtBrInput(numberToInput(result.data.frente_metros)));
      setFundosMetros(normalizeDecimalPtBrInput(numberToInput(result.data.fundos_metros)));
      setLateral1Metros(normalizeDecimalPtBrInput(numberToInput(result.data.lateral_1_metros)));
      setLateral2Metros(normalizeDecimalPtBrInput(numberToInput(result.data.lateral_2_metros)));

      setTipoNegociacao(result.data.tipo_negociacao ?? "VENDA");
      setPrecoVenda(formatCurrencyInput(numberToInput(result.data.preco_venda)));
      setPrecoLocacao(formatCurrencyInput(numberToInput(result.data.preco_locacao)));
      setValorCondominio(formatCurrencyInput(numberToInput(result.data.condominio)));
      setValorIptu(formatCurrencyInput(numberToInput(result.data.iptu)));
      setIptuMensal(result.data.iptu_periodicidade === "MENSAL");
      setComissaoLocacao(result.data.comissao_locacao ?? "");
      setComissaoVendaPercentual(numberToPercentInput(result.data.comissao_venda_percentual));
      setMinimoAceitoEmMaos(formatCurrencyInput(numberToInput(result.data.minimo_aceito_em_maos)));
      setAceitaPermuta(Boolean(result.data.aceita_permuta));
      setDescricaoPermuta(result.data.descricao_permuta ?? "");
      const contatoNome = result.data.corretor_parceiro_nome ?? "";
      const contatoTelefone = formatPhoneDisplay(result.data.corretor_parceiro_telefone ?? "");
      const contatoEmail = result.data.corretor_parceiro_email ?? "";
      const hasContatoPreenchido =
        contatoNome.trim().length > 0 || contatoTelefone.trim().length > 0 || contatoEmail.trim().length > 0;
      const modeloCaptacaoLoaded: ModeloCaptacaoValue = result.data.captacao_corretor_parceiro
        ? "PARCERIA"
        : result.data.exclusividade
          ? "EXCLUSIVIDADE"
          : hasContatoPreenchido
            ? "CAPTACAO_SEM_EXCLUSIVIDADE"
            : "";

      setModeloCaptacao(modeloCaptacaoLoaded);
      if (modeloCaptacaoLoaded === "PARCERIA") {
        setCorretorParceiroNome(contatoNome);
        setCorretorParceiroTelefone(contatoTelefone);
        setCorretorParceiroEmail(contatoEmail);
        setProprietarioNome("");
        setProprietarioTelefone("");
        setProprietarioEmail("");
      } else {
        setCorretorParceiroNome("");
        setCorretorParceiroTelefone("");
        setCorretorParceiroEmail("");
        setProprietarioNome(contatoNome);
        setProprietarioTelefone(contatoTelefone);
        setProprietarioEmail(contatoEmail);
      }
      setComissaoCaptadorPercentual(numberToPercentInput(result.data.comissao_captador_percentual));
      setComissaoVendedorPercentual(numberToPercentInput(result.data.comissao_vendedor_percentual));
      setExclusividadeComissaoMinhaPercentual(
        numberToPercentInput(result.data.exclusividade_comissao_minha_percentual),
      );
      setExclusividadeComissaoParceiroPercentual(
        numberToPercentInput(result.data.exclusividade_comissao_parceiro_percentual),
      );
      setExclusividadeDataVencimento(result.data.exclusividade_data_vencimento ?? "");
      setExclusividadeObservacoes(result.data.exclusividade_observacoes ?? "");
      setDisponibilizarNoBolsaoParceria(Boolean(result.data.disponibilizar_no_bolsao_parceria));
      setBolsaoPermitirMudancaPreco(Boolean(result.data.bolsao_permitir_mudanca_preco));
      setBolsaoPermitirDownloadMidiaKit(Boolean(result.data.bolsao_permitir_download_midia_kit));
      setBolsaoSomenteVisitasAgendadas(Boolean(result.data.bolsao_somente_visitas_agendadas));
      setBolsaoSomenteVisitasComMinhaPresenca(
        Boolean(result.data.bolsao_somente_visitas_com_minha_presenca),
      );
      setAceiteCorretorExclusivo(Boolean(result.data.aceite_corretor_exclusivo));
      setAceitaParceriaStatus(result.data.aceita_parceria_status ?? "");
      lastSyncedStepRef.current = savedStepFromDb;

      if (resolvedStep !== currentStep) {
        setCurrentStep(resolvedStep);
      }
      if (requestedStep == null || requestedStep !== resolvedStep) {
        router.replace(`/imoveis/novo?imovel=${result.data.id}&step=${resolvedStep}`);
      }
    });
  }, [hasStepInUrl, imovelFromUrl, router, stepFromUrl]);

  useEffect(() => {
    if (currentStep !== 6 && currentStep !== 8) return;
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
        setStepError(result.error);
        return;
      }
      setCaracteristicasCatalogo(result.data);
    });
  }, [currentStep, tipoUsoApi, tipoImovel, subtipoImovelApi]);

  async function loadEmpreendimentoCaracteristicasAssociadas(nextEmpreendimentoId: string) {
    setLoadingEmpreendimentoCaracteristicasAssociadas(true);
    const empreendimentoResult = await apiFetchWithAuth<EmpreendimentoCaracteristicasResponse>(
      `/api/empreendimentos/${nextEmpreendimentoId}`,
    );

    if (!empreendimentoResult.ok) {
      setLoadingEmpreendimentoCaracteristicasAssociadas(false);
      setEmpreendimentoCaracteristicasAssociadas([]);
      return;
    }

    const caracteristicaIds = Array.isArray(empreendimentoResult.data.caracteristica_ids)
      ? empreendimentoResult.data.caracteristica_ids.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];

    if (caracteristicaIds.length === 0) {
      empreendimentoCaracteristicasHydratedRef.current = nextEmpreendimentoId;
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
    empreendimentoCaracteristicasHydratedRef.current = nextEmpreendimentoId;

    if (!catalogoResult.ok) {
      setEmpreendimentoCaracteristicasAssociadas([]);
      return;
    }

    const catalogoById = new Map(catalogoResult.data.map((item) => [item.id, item]));
    const mapped = caracteristicaIds
      .map((caracteristicaId) => catalogoById.get(caracteristicaId) ?? null)
      .filter((item): item is CaracteristicaCatalogoItem => item !== null)
      .sort((a, b) => a.label_pt.localeCompare(b.label_pt, "pt-BR"));

    setEmpreendimentoCaracteristicasAssociadas(mapped);
  }

  useEffect(() => {
    if (currentStep !== 6) {
      setShowEmpreendimentoCaracteristicasModal(false);
      return;
    }
    if (!hasEmpreendimentoAssociado) {
      empreendimentoCaracteristicasHydratedRef.current = null;
      setLoadingEmpreendimentoCaracteristicasAssociadas(false);
      setEmpreendimentoCaracteristicasAssociadas([]);
      setShowEmpreendimentoCaracteristicasModal(false);
      return;
    }
    if (empreendimentoCaracteristicasHydratedRef.current === empreendimentoId) return;
    void loadEmpreendimentoCaracteristicasAssociadas(empreendimentoId);
  }, [currentStep, empreendimentoId, hasEmpreendimentoAssociado]);

  useEffect(() => {
    if (!imovelId) return;
    if (currentStep !== 8 && currentStep !== 9 && currentStep !== 11) return;

    setLoadingMidiasImovel(true);
    setStepError(null);
    void apiFetchWithAuth<ImovelMidiaItem[]>(`/api/imoveis/${imovelId}/midia`).then((result) => {
      setLoadingMidiasImovel(false);
      if (!result.ok) {
        setStepError(result.error);
        return;
      }

      setMidiasImovel(
        result.data
          .filter((item) => item.tipo === "IMAGEM")
          .map((item) => {
            const storageParts = item.storage_path.split("/").filter(Boolean);
            const storageFileName =
              storageParts[storageParts.length - 1] ?? item.titulo ?? "imagem";
            const fileName = storageFileName.trim() || "imagem";
            const lowerFile = fileName.toLowerCase();
            const isHeic = lowerFile.endsWith(".heic") || lowerFile.endsWith(".heif");

            return {
              id: crypto.randomUUID(),
              midiaId: item.midia_id,
              fileName,
              sizeBytes: item.tamanho_bytes ?? 0,
              previewUrl: item.url,
              thumbUrl: null,
              isHeic,
              alt: item.alt ?? "",
              legenda: item.legenda ?? "",
              caracteristica: item.caracteristica ?? "",
            } satisfies ImageDraftItem;
          }),
      );

      setYoutubeVideos(
        result.data
          .filter((item) => item.tipo === "VIDEO")
          .map((item) => {
            const normalized = normalizeYouTubeUrl(item.url);
            const videoId = normalized ? getYouTubeVideoId(normalized) : null;
            if (!normalized || !videoId) return null;
            return {
              id: item.midia_id,
              url: normalized,
              videoId,
              title: item.titulo ?? null,
            } satisfies YoutubeVideoDraftItem;
          })
          .filter((item): item is YoutubeVideoDraftItem => item !== null),
      );
    });
  }, [currentStep, imovelId]);

  useEffect(() => {
    if (currentStep !== 8 && currentStep !== 11) return;
    if (pertenceEmpreendimento !== "SIM" || !empreendimentoId) {
      setMidiasEmpreendimentoRelacionadas([]);
      return;
    }

    setLoadingMidiasEmpreendimentoRelacionadas(true);
    void apiFetchWithAuth<ImovelMidiaItem[]>(`/api/empreendimentos/${empreendimentoId}/midia`).then((result) => {
      setLoadingMidiasEmpreendimentoRelacionadas(false);
      if (!result.ok) {
        setMidiasEmpreendimentoRelacionadas([]);
        return;
      }
      setMidiasEmpreendimentoRelacionadas(
        result.data.filter((item) => item.tipo === "IMAGEM"),
      );
    });
  }, [currentStep, pertenceEmpreendimento, empreendimentoId]);

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

  const empreendimentoLookupQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("q", empreendimentoQuery.trim());
    if (empreendimentoId) {
      params.set("include_id", empreendimentoId);
    }
    return params.toString();
  }, [empreendimentoQuery, empreendimentoId]);

  useEffect(() => {
    if (pertenceEmpreendimento !== "SIM") return;

    const timeout = window.setTimeout(() => {
      setLoadingEmpreendimentos(true);
      void apiFetchWithAuth<EmpreendimentoLookupItem[]>(
        `/api/imoveis/empreendimentos?${empreendimentoLookupQueryString}`,
      ).then((result) => {
        setLoadingEmpreendimentos(false);
        if (!result.ok) {
          setStepError(result.error);
          return;
        }
        setEmpreendimentos(result.data);
      });
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [empreendimentoLookupQueryString, pertenceEmpreendimento]);

  const applyTipologiaSuggestions = useCallback(
    (forceOverride: boolean) => {
      if (!selectedTipo) return;

      const key = `${imovelId}:${selectedTipo.id}`;
      if (!forceOverride && prefillTipologiaRef.current === key) return;

      if (selectedTipo.area_privativa != null && (forceOverride || areaUtil.trim() === "")) {
        setAreaUtil(normalizeDecimalPtBrInput(String(selectedTipo.area_privativa)));
      }
      if (selectedTipo.dormitorios != null && (forceOverride || dormitorios.trim() === "")) {
        setDormitorios(String(selectedTipo.dormitorios));
      }
      if (selectedTipo.suites != null && (forceOverride || suites.trim() === "")) {
        setSuites(String(selectedTipo.suites));
      }
      if (selectedTipo.banheiros != null && (forceOverride || banheiros.trim() === "")) {
        setBanheiros(String(selectedTipo.banheiros));
      }
      if (selectedTipo.vagas != null && (forceOverride || vagas.trim() === "")) {
        setVagas(String(selectedTipo.vagas));
      }

      prefillTipologiaRef.current = key;
    },
    [selectedTipo, imovelId, areaUtil, dormitorios, suites, banheiros, vagas],
  );

  useEffect(() => {
    if (currentStep !== 3) return;
    if (!selectedTipo) return;
    applyTipologiaSuggestions(false);
  }, [currentStep, selectedTipo, imovelId, applyTipologiaSuggestions]);

  useEffect(() => {
    if (!selectedTipo) return;
    const inferred = inferTipoImovelFromTipologia(selectedTipo.tipologia);
    if (!inferred) return;
    if (tipoImovel === inferred) return;
    setTipoImovel(inferred);
  }, [selectedTipo, tipoImovel]);

  useEffect(() => {
    if (!deveExibirCategoriaSubcategoriaPorEmpreendimento) return;
    if (!tipoImovelFromCategoriaEmpreendimento) return;
    if (tipoImovel === tipoImovelFromCategoriaEmpreendimento) return;
    setTipoImovel(tipoImovelFromCategoriaEmpreendimento);
  }, [
    deveExibirCategoriaSubcategoriaPorEmpreendimento,
    tipoImovelFromCategoriaEmpreendimento,
    tipoImovel,
  ]);

  useEffect(() => {
    if (!deveRestringirCategoriaSubcategoriaPorEmpreendimento) return;
    if (tipoImovelDisponiveisEmpreendimento.length === 0) return;

    if (!tipoImovelDisponiveisEmpreendimento.includes(tipoImovel)) {
      setTipoImovel(tipoImovelDisponiveisEmpreendimento[0]);
      return;
    }

    if (tipologiasContextoParaTipoImovelAtual.length === 0) return;

    const normalizedLabel = empreendimentoTipologiaLabel.trim().toUpperCase();
    const isCurrentLabelAvailable = tipologiasContextoParaTipoImovelAtual.some(
      (item) =>
        item.tipologia_label.toUpperCase() === normalizedLabel || item.tipologia_raw === normalizedLabel,
    );

    if (!isCurrentLabelAvailable) {
      setEmpreendimentoTipologiaLabel(tipologiasContextoParaTipoImovelAtual[0].tipologia_label);
    }
  }, [
    deveRestringirCategoriaSubcategoriaPorEmpreendimento,
    tipoImovelDisponiveisEmpreendimento,
    tipoImovel,
    tipologiasContextoParaTipoImovelAtual,
    empreendimentoTipologiaLabel,
  ]);

  useEffect(() => {
    if (pertenceEmpreendimento !== "NAO") return;
    if (!soloTipoUsoContexto) {
      if (soloCategoriaContexto) setSoloCategoriaContexto("");
      if (soloSubcategoriaToken) setSoloSubcategoriaToken("");
      return;
    }

    const categorias = getSoloCategoriaOptions(soloTipoUsoContexto);
    const categoriaValida = categorias.some((item) => item.value === soloCategoriaContexto);
    if (!categoriaValida) {
      if (soloCategoriaContexto) setSoloCategoriaContexto("");
      if (soloSubcategoriaToken) setSoloSubcategoriaToken("");
      return;
    }

    const subcategorias = getSoloSubcategoriaOptions(soloTipoUsoContexto, soloCategoriaContexto);
    const subcategoriaValida = subcategorias.some((item) => item.value === soloSubcategoriaToken);
    if (!subcategoriaValida && soloSubcategoriaToken) {
      setSoloSubcategoriaToken("");
    }
  }, [pertenceEmpreendimento, soloTipoUsoContexto, soloCategoriaContexto, soloSubcategoriaToken]);

  useEffect(() => {
    if (pertenceEmpreendimento !== "NAO") return;
    const resolved = resolveSoloTipologiaSelection({
      uso: soloTipoUsoContexto,
      categoria: soloCategoriaContexto,
      subcategoriaToken: soloSubcategoriaToken,
    });

    if (!resolved) {
      if (empreendimentoTipologiaLabel) setEmpreendimentoTipologiaLabel("");
      return;
    }

    if (tipoImovel !== resolved.tipo_imovel) {
      setTipoImovel(resolved.tipo_imovel);
    }
    if (empreendimentoTipologiaLabel !== resolved.tipologia_label) {
      setEmpreendimentoTipologiaLabel(resolved.tipologia_label);
    }
  }, [
    pertenceEmpreendimento,
    tipoImovel,
    soloTipoUsoContexto,
    soloCategoriaContexto,
    soloSubcategoriaToken,
    empreendimentoTipologiaLabel,
  ]);

  useEffect(() => {
    if (hasVendaNegociacao) return;
    if (!aceitaPermuta && !descricaoPermuta) return;
    setAceitaPermuta(false);
    setDescricaoPermuta("");
  }, [hasVendaNegociacao, aceitaPermuta, descricaoPermuta]);

  useEffect(() => {
    if (canShowAndarFields) return;
    if (andar) setAndar("");
    if (mostrarAndarNoAnuncio) setMostrarAndarNoAnuncio(false);
    if (ultimoAndar) setUltimoAndar(false);
  }, [canShowAndarFields, andar, mostrarAndarNoAnuncio, ultimoAndar]);

  useEffect(() => {
    if (!isUsoComercial) return;
    if (dormitorios !== "") setDormitorios("");
    if (suites !== "") setSuites("");
    if (qtdDormitoriosDetalhe !== "") setQtdDormitoriosDetalhe("");
    if (dormitoriosDetalhe.length > 0) setDormitoriosDetalhe([]);
  }, [isUsoComercial, dormitorios, suites, qtdDormitoriosDetalhe, dormitoriosDetalhe.length]);

  useEffect(() => {
    if (andar.trim().length > 0) return;
    if (!mostrarAndarNoAnuncio) return;
    setMostrarAndarNoAnuncio(false);
  }, [andar, mostrarAndarNoAnuncio]);

  useEffect(() => {
    if (Number(vagas || "0") > 0) return;
    if (vagaTipos.length === 0 && !vagaTamanho && !vagaCobertura) return;
    setVagaTipos([]);
    setVagaTamanho("");
    setVagaCobertura("");
  }, [vagas, vagaTipos.length, vagaTamanho, vagaCobertura]);

  useEffect(() => {
    if (aceitaPermuta) return;
    if (!descricaoPermuta) return;
    setDescricaoPermuta("");
  }, [aceitaPermuta, descricaoPermuta]);

  useEffect(() => {
    if (modeloCaptacao === "PARCERIA") {
      if (exclusividadeDataVencimento) setExclusividadeDataVencimento("");
      if (exclusividadeObservacoes) setExclusividadeObservacoes("");
      if (disponibilizarNoBolsaoParceria) setDisponibilizarNoBolsaoParceria(false);
      if (exclusividadeComissaoMinhaPercentual) setExclusividadeComissaoMinhaPercentual("");
      if (exclusividadeComissaoParceiroPercentual) setExclusividadeComissaoParceiroPercentual("");
      if (bolsaoPermitirMudancaPreco) setBolsaoPermitirMudancaPreco(false);
      if (bolsaoPermitirDownloadMidiaKit) setBolsaoPermitirDownloadMidiaKit(false);
      if (bolsaoSomenteVisitasAgendadas) setBolsaoSomenteVisitasAgendadas(false);
      if (bolsaoSomenteVisitasComMinhaPresenca) setBolsaoSomenteVisitasComMinhaPresenca(false);
      if (aceiteCorretorExclusivo) setAceiteCorretorExclusivo(false);
      if (aceitaParceriaStatus) setAceitaParceriaStatus("");
      if (proprietarioNome) setProprietarioNome("");
      if (proprietarioTelefone) setProprietarioTelefone("");
      if (proprietarioEmail) setProprietarioEmail("");
      return;
    }

    if (modeloCaptacao === "CAPTACAO_SEM_EXCLUSIVIDADE") {
      if (exclusividadeDataVencimento) setExclusividadeDataVencimento("");
      if (exclusividadeObservacoes) setExclusividadeObservacoes("");
      if (disponibilizarNoBolsaoParceria) setDisponibilizarNoBolsaoParceria(false);
      if (exclusividadeComissaoMinhaPercentual) setExclusividadeComissaoMinhaPercentual("");
      if (exclusividadeComissaoParceiroPercentual) setExclusividadeComissaoParceiroPercentual("");
      if (bolsaoPermitirMudancaPreco) setBolsaoPermitirMudancaPreco(false);
      if (bolsaoPermitirDownloadMidiaKit) setBolsaoPermitirDownloadMidiaKit(false);
      if (bolsaoSomenteVisitasAgendadas) setBolsaoSomenteVisitasAgendadas(false);
      if (bolsaoSomenteVisitasComMinhaPresenca) setBolsaoSomenteVisitasComMinhaPresenca(false);
      if (aceiteCorretorExclusivo) setAceiteCorretorExclusivo(false);
      if (corretorParceiroNome) setCorretorParceiroNome("");
      if (corretorParceiroTelefone) setCorretorParceiroTelefone("");
      if (corretorParceiroEmail) setCorretorParceiroEmail("");
      return;
    }

    if (modeloCaptacao === "EXCLUSIVIDADE") {
      if (corretorParceiroNome) setCorretorParceiroNome("");
      if (corretorParceiroTelefone) setCorretorParceiroTelefone("");
      if (corretorParceiroEmail) setCorretorParceiroEmail("");
      if (comissaoCaptadorPercentual) setComissaoCaptadorPercentual("");
      if (comissaoVendedorPercentual) setComissaoVendedorPercentual("");
    }
  }, [
    modeloCaptacao,
    exclusividadeDataVencimento,
    exclusividadeObservacoes,
    disponibilizarNoBolsaoParceria,
    exclusividadeComissaoMinhaPercentual,
    exclusividadeComissaoParceiroPercentual,
    bolsaoPermitirMudancaPreco,
    bolsaoPermitirDownloadMidiaKit,
    bolsaoSomenteVisitasAgendadas,
    bolsaoSomenteVisitasComMinhaPresenca,
    aceiteCorretorExclusivo,
    aceitaParceriaStatus,
    corretorParceiroNome,
    corretorParceiroTelefone,
    corretorParceiroEmail,
    proprietarioNome,
    proprietarioTelefone,
    proprietarioEmail,
    comissaoCaptadorPercentual,
    comissaoVendedorPercentual,
  ]);

  useEffect(() => {
    if (!isMinhaExclusividade) return;
    if (isParceriaExclusividadeAtiva) return;
    if (disponibilizarNoBolsaoParceria) setDisponibilizarNoBolsaoParceria(false);
    if (exclusividadeComissaoMinhaPercentual) setExclusividadeComissaoMinhaPercentual("");
    if (exclusividadeComissaoParceiroPercentual) setExclusividadeComissaoParceiroPercentual("");
  }, [
    isMinhaExclusividade,
    isParceriaExclusividadeAtiva,
    disponibilizarNoBolsaoParceria,
    exclusividadeComissaoMinhaPercentual,
    exclusividadeComissaoParceiroPercentual,
  ]);

  useEffect(() => {
    if (disponibilizarNoBolsaoParceria) return;
    if (bolsaoPermitirMudancaPreco) setBolsaoPermitirMudancaPreco(false);
    if (bolsaoPermitirDownloadMidiaKit) setBolsaoPermitirDownloadMidiaKit(false);
    if (bolsaoSomenteVisitasAgendadas) setBolsaoSomenteVisitasAgendadas(false);
    if (bolsaoSomenteVisitasComMinhaPresenca) setBolsaoSomenteVisitasComMinhaPresenca(false);
  }, [
    disponibilizarNoBolsaoParceria,
    bolsaoPermitirMudancaPreco,
    bolsaoPermitirDownloadMidiaKit,
    bolsaoSomenteVisitasAgendadas,
    bolsaoSomenteVisitasComMinhaPresenca,
  ]);

  useEffect(() => {
    if (!disponibilizarNoBolsaoParceria) return;
    if (hasVencimentoMinimoParaBolsao) return;
    setDisponibilizarNoBolsaoParceria(false);
  }, [disponibilizarNoBolsaoParceria, hasVencimentoMinimoParaBolsao]);

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
    if (step5HydratedRef.current) return;
    setQtdDormitoriosDetalhe((current) => (current.trim().length > 0 ? current : dormitorios));
    setQtdCozinhasDetalhe((current) => (current.trim().length > 0 ? current : cozinhas));
    setQtdSalasDetalhe((current) => (current.trim().length > 0 ? current : salas));
  }, [dormitorios, cozinhas, salas]);

  useEffect(() => {
    if (!imovelId) return;
    if (currentStep !== 5) return;
    setLoadingStep5(true);
    setStepError(null);

    void apiFetchWithAuth<ImovelAmbienteApiItem[]>(`/api/imoveis/${imovelId}/ambientes`).then((result) => {
      setLoadingStep5(false);
      if (!result.ok) {
        setStepError(result.error);
        return;
      }
      step5HydratedRef.current = true;

      const ambientes = result.data ?? [];
      const dormitoriosRows = ambientes
        .filter((item) => item.tipo_ambiente === "DORMITORIO")
        .sort((a, b) => a.ordem - b.ordem);
      const cozinhasRows = ambientes
        .filter((item) => item.tipo_ambiente === "COZINHA")
        .sort((a, b) => a.ordem - b.ordem);
      const salasRows = ambientes
        .filter((item) => item.tipo_ambiente === "SALA")
        .sort((a, b) => a.ordem - b.ordem);
      const varandasRows = ambientes
        .filter((item) => item.tipo_ambiente === "VARANDA")
        .sort((a, b) => a.ordem - b.ordem);

      const dormitoriosMapped = dormitoriosRows.map((item) => {
        const dados = item.dados ?? {};
        const ehSuite = dados.eh_suite === true;
        return {
          local_id: item.id || createLocalId("dorm"),
          area_m2: numberToInput(item.area_m2),
          eh_suite: ehSuite,
          suite_principal: ehSuite && (item.principal || dados.suite_principal === true),
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
            typeof dados.tipo_piso === "string" && isAmbientePiso(dados.tipo_piso)
              ? dados.tipo_piso
              : "",
        } satisfies DormitorioAmbienteForm;
      });

      const cozinhasMapped = cozinhasRows.map((item) => {
        const dados = item.dados ?? {};
        const tipoBancadaValido =
          typeof dados.tipo_bancada === "string" && isCozinhaBancada(dados.tipo_bancada)
            ? dados.tipo_bancada
            : "";
        const bancada = dados.bancada === true || Boolean(tipoBancadaValido);
        return {
          local_id: item.id || createLocalId("coz"),
          area_m2: numberToInput(item.area_m2),
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
            typeof dados.tipo_piso === "string" && isAmbientePiso(dados.tipo_piso)
              ? dados.tipo_piso
              : "",
        } satisfies CozinhaAmbienteForm;
      });

      const salasMapped = salasRows.map((item) => {
        const dados = item.dados ?? {};
        const diferenciaisLegado = Array.isArray(dados.diferenciais)
          ? dados.diferenciais.filter((value): value is string => typeof value === "string")
          : [];
        const tipoPisoLegado =
          diferenciaisLegado.includes("PISO_MADEIRA")
            ? "MADEIRA"
            : diferenciaisLegado.includes("PISO_PORCELANATO")
              ? "PORCELANATO"
              : "";
        return {
          local_id: item.id || createLocalId("sala"),
          area_m2: numberToInput(item.area_m2),
          principal: item.principal === true,
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

      const varandasMapped = varandasRows.map((item) => {
        const dados = item.dados ?? {};
        return {
          local_id: item.id || createLocalId("var"),
          area_m2: numberToInput(item.area_m2),
          tipo_varanda:
            typeof dados.tipo_varanda === "string" && isVarandaTipo(dados.tipo_varanda)
              ? dados.tipo_varanda
              : "",
          churrasqueira_tipo:
            typeof dados.churrasqueira_tipo === "string" &&
            isVarandaChurrasqueira(dados.churrasqueira_tipo)
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
            typeof dados.tipo_piso === "string" && isAmbientePiso(dados.tipo_piso)
              ? dados.tipo_piso
              : "",
        } satisfies VarandaAmbienteForm;
      });

      const fallbackDormitorios = toNonNegativeIntegerOrZero(qtdDormitoriosDetalhe || dormitorios);
      const fallbackCozinhas = toNonNegativeIntegerOrZero(qtdCozinhasDetalhe || cozinhas);
      const fallbackSalas = toNonNegativeIntegerOrZero(qtdSalasDetalhe || salas);
      const fallbackVarandas = toNonNegativeIntegerOrZero(qtdVarandasDetalhe);

      const nextDormitoriosCount =
        dormitoriosMapped.length > 0 ? dormitoriosMapped.length : fallbackDormitorios;
      const nextCozinhasCount = cozinhasMapped.length > 0 ? cozinhasMapped.length : fallbackCozinhas;
      const nextSalasCount = salasMapped.length > 0 ? salasMapped.length : fallbackSalas;
      const nextVarandasCount = varandasMapped.length > 0 ? varandasMapped.length : fallbackVarandas;

      setQtdDormitoriosDetalhe(nextDormitoriosCount > 0 ? String(nextDormitoriosCount) : "");
      setQtdCozinhasDetalhe(nextCozinhasCount > 0 ? String(nextCozinhasCount) : "");
      setQtdSalasDetalhe(nextSalasCount > 0 ? String(nextSalasCount) : "");
      setQtdVarandasDetalhe(nextVarandasCount > 0 ? String(nextVarandasCount) : "");
      setDormitoriosDetalhe(resizeAmbientes(dormitoriosMapped, nextDormitoriosCount, createDormitorioAmbiente));
      setCozinhasDetalhe(resizeAmbientes(cozinhasMapped, nextCozinhasCount, createCozinhaAmbiente));
      setSalasDetalhe(resizeAmbientes(salasMapped, nextSalasCount, createSalaAmbiente));
      setVarandasDetalhe(resizeAmbientes(varandasMapped, nextVarandasCount, createVarandaAmbiente));
    });
  }, [
    imovelId,
    currentStep,
  ]);

  useEffect(() => {
    if (pertenceEmpreendimento !== "SIM") return;
    if (enderecoVisualizacao === "END_BAIRRO" || enderecoVisualizacao === "END_SEM_NUMERO") {
      setEnderecoVisualizacao("END_SEM_COMPLEMENTO");
    }
  }, [pertenceEmpreendimento, enderecoVisualizacao]);

  function clearAddressFields() {
    setSearchAddress("");
    setPlaceId("");
    setSelectedPlaceName("");
    setEnderecoFormatado("");
    setLogradouro("");
    setNumero("");
    setBairro("");
    setBairroComercial("");
    setCidade("");
    setEstado("SP");
    setCep("");
    setLat(null);
    setLng(null);
    setAddressComponents([]);
    setPlaceOptions([]);
  }

  const toggleLocalizacaoContextoOption = useCallback(
    (
      field: "perfil_regiao" | "mobilidade" | "comercio_servicos" | "lazer_estilo_vida",
      option: string,
    ) => {
      setLocalizacaoContextoForm((current) => {
        const currentValues = current[field];
        const nextValues = currentValues.includes(option)
          ? currentValues.filter((item) => item !== option)
          : [...currentValues, option];
        return { ...current, [field]: nextValues };
      });
    },
    [],
  );

  async function resolveGeolocacaoIdForCurrentForm(params: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string | null;
  }) {
    const geolocResult = await apiFetchWithAuth<{ id: string }>("/api/geolocacoes/resolve", {
      method: "POST",
      body: JSON.stringify({
        place_id: placeId || null,
        address_json: {
          place_id: placeId || null,
          place_name: selectedPlaceName || null,
          formatted_address:
            enderecoFormatado ||
            formatAddressFromFields({
              logradouro: params.logradouro,
              numero: params.numero,
              bairro: params.bairro,
              cidade: params.cidade,
              estado: params.estado,
            }),
          bairro_comercial: bairroComercial.trim() || null,
          address_components: addressComponents,
        },
        logradouro: params.logradouro,
        numero: params.numero,
        bairro: params.bairro,
        cidade: params.cidade,
        uf: params.estado,
        cep: params.cep,
        lat,
        lng,
        endereco_formatado:
          enderecoFormatado ||
          formatAddressFromFields({
            logradouro: params.logradouro,
            numero: params.numero,
            bairro: params.bairro,
            cidade: params.cidade,
            estado: params.estado,
          }),
      }),
    });

    if (!geolocResult.ok) {
      setStepError(geolocResult.error);
      return null;
    }

    return geolocResult.data.id;
  }

  async function handleSelectPlace(option: PlacePrediction) {
    setSearchAddress(option.description);
    setPlaceOptions([]);
    const result = await apiFetchWithAuth<PlaceDetails>(
      `/api/google/places/details?placeId=${encodeURIComponent(option.place_id)}`,
    );

    if (!result.ok) {
      setStepError(result.error);
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
    setStepError(null);
  }

  useEffect(() => {
    if (!isStep2Solo) return;
    if (!GOOGLE_MAPS_PUBLIC_KEY) {
      setMapsReady(false);
      setMapsError("Configure NEXT_PUBLIC_GOOGLE_MAPS_KEY para habilitar o mapa interativo.");
      return;
    }

    setMapsReady(false);
    void loadGoogleMapsScript(GOOGLE_MAPS_PUBLIC_KEY)
      .then(() => {
        setMapsError(null);
        setMapsReady(true);
      })
      .catch((err) => {
        setMapsReady(false);
        setMapsError(err instanceof Error ? err.message : "Falha ao carregar Google Maps");
      });
  }, [isStep2Solo]);

  useEffect(() => {
    if (isStep2Solo) return;
    mapRef.current = null;
    markerRef.current = null;
    markerBoundRef.current = false;
    mapHostElementRef.current = null;
  }, [isStep2Solo]);

  useEffect(() => {
    if (!isStep2Solo) return;
    if (lat !== null && lng !== null) return;
    mapRef.current = null;
    markerRef.current = null;
    markerBoundRef.current = false;
    mapHostElementRef.current = null;
  }, [isStep2Solo, lat, lng]);

  useEffect(() => {
    if (!isStep2Solo) return;
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
  }, [isStep2Solo, lat, lng, mapsError, mapsReady]);

  useEffect(() => {
    if (!isStep2Solo) return;
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
        setStepError(result.error);
        return;
      }
      setPlaceOptions(result.data);
    }, 300);
  }, [isStep2Solo, searchAddress, isSearchFocused]);

  useEffect(() => {
    if (!isStep2Solo) return;
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
  }, [isStep2Solo, logradouro, numero, bairro, cidade, estado, placeId, searchAddress, enderecoFormatado]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
  }, []);

  async function persistStep1() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    if (pertenceEmpreendimento === "") {
      setSavingStep(false);
      setStepError("Selecione se o imóvel pertence a um empreendimento.");
      return;
    }

    if (pertenceEmpreendimento === "SIM") {
      if (!selectedEmpreendimento) {
        setSavingStep(false);
        setStepError("Selecione um empreendimento para continuar.");
        return;
      }

      const selectedTipologiaLabel = selectedTipo ? tipologiaLabel(selectedTipo) : null;
      const visualizacaoNormalizada =
        enderecoVisualizacao === "END_BAIRRO" || enderecoVisualizacao === "END_SEM_NUMERO"
          ? "END_SEM_COMPLEMENTO"
          : enderecoVisualizacao;
      const tipologiaPrefillPatch: Record<string, number> = {};
      if (selectedTipo) {
        if (selectedTipo.area_privativa != null && areaUtil.trim() === "") {
          tipologiaPrefillPatch.area_util = selectedTipo.area_privativa;
        }
        if (selectedTipo.dormitorios != null && dormitorios.trim() === "") {
          tipologiaPrefillPatch.dormitorios = selectedTipo.dormitorios;
        }
        if (selectedTipo.suites != null && suites.trim() === "") {
          tipologiaPrefillPatch.suites = selectedTipo.suites;
        }
        if (selectedTipo.banheiros != null && banheiros.trim() === "") {
          tipologiaPrefillPatch.banheiros = selectedTipo.banheiros;
        }
        if (selectedTipo.vagas != null && vagas.trim() === "") {
          tipologiaPrefillPatch.vagas = selectedTipo.vagas;
        }
      }
      const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
        method: "PATCH",
        body: JSON.stringify({
          empreendimento_id: selectedEmpreendimento.id,
          empreendimento_tipo_id: empreendimentoTipoId || null,
          empreendimento_tipologia_label: selectedTipologiaLabel,
          geolocacao_id: selectedEmpreendimento.geolocacao_id ?? undefined,
          logradouro: selectedEmpreendimento.logradouro ?? DRAFT_ADDRESS_LOGRADOURO,
          numero: selectedEmpreendimento.numero ?? "s/n",
          bairro:
            selectedEmpreendimento.bairro_comercial ??
            selectedEmpreendimento.bairro ??
            "A definir",
          cidade: selectedEmpreendimento.cidade ?? "A definir",
          estado: selectedEmpreendimento.estado ?? "SP",
          cep: selectedEmpreendimento.cep,
          lat: selectedEmpreendimento.lat,
          lng: selectedEmpreendimento.lng,
          address_json: selectedEmpreendimento.address_json ?? {},
          enderecovisualizacao: visualizacaoNormalizada,
          ...tipologiaPrefillPatch,
        }),
      });

      setSavingStep(false);
      if (!result.ok) {
        setStepError(result.error);
        return;
      }

      setEmpreendimentoTipologiaLabel(selectedTipologiaLabel ?? "");
      if (selectedTipo) {
        if (selectedTipo.area_privativa != null && areaUtil.trim() === "") {
          setAreaUtil(normalizeDecimalPtBrInput(String(selectedTipo.area_privativa)));
        }
        if (selectedTipo.dormitorios != null && dormitorios.trim() === "") {
          setDormitorios(String(selectedTipo.dormitorios));
        }
        if (selectedTipo.suites != null && suites.trim() === "") {
          setSuites(String(selectedTipo.suites));
        }
        if (selectedTipo.banheiros != null && banheiros.trim() === "") {
          setBanheiros(String(selectedTipo.banheiros));
        }
        if (selectedTipo.vagas != null && vagas.trim() === "") {
          setVagas(String(selectedTipo.vagas));
        }
      }
      setEnderecoVisualizacao(visualizacaoNormalizada);
      router.replace(`/imoveis/novo?imovel=${imovelId}&step=2`);
      setCurrentStep(2);
      setStepMessage("Etapa 1 salva.");
      return;
    }

    if (!soloTipoUsoContexto) {
      setSavingStep(false);
      setStepError("Selecione o tipo de uso do imóvel solo antes de continuar.");
      return;
    }

    if (!soloCategoriaContexto) {
      setSavingStep(false);
      setStepError("Selecione a categoria do imóvel solo antes de continuar.");
      return;
    }

    if (!soloSubcategoriaToken) {
      setSavingStep(false);
      setStepError("Selecione a subcategoria do imóvel solo antes de continuar.");
      return;
    }

    const soloSelection = resolveSoloTipologiaSelection({
      uso: soloTipoUsoContexto,
      categoria: soloCategoriaContexto,
      subcategoriaToken: soloSubcategoriaToken,
    });
    if (!soloSelection) {
      setSavingStep(false);
      setStepError("A combinação de uso, categoria e subcategoria é inválida.");
      return;
    }

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        empreendimento_id: null,
        empreendimento_tipo_id: null,
        empreendimento_tipologia_label: soloSelection.tipologia_label,
        tipo: soloSelection.tipo_imovel,
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    setTipoImovel(soloSelection.tipo_imovel);
    setEmpreendimentoTipologiaLabel(soloSelection.tipologia_label);
    router.replace(`/imoveis/novo?imovel=${imovelId}&step=2`);
    setCurrentStep(2);
    setStepMessage("Etapa 1 salva.");
  }

  async function persistStep2() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    if (pertenceEmpreendimento === "SIM") {
      if (
        !selectedEmpreendimento?.geolocacao_id ||
        !selectedEmpreendimento?.logradouro ||
        !selectedEmpreendimento?.bairro ||
        !selectedEmpreendimento?.cidade ||
        !selectedEmpreendimento?.estado
      ) {
        setSavingStep(false);
        setStepError(
          "O empreendimento selecionado não possui endereço captado completo. Atualize o endereço no empreendimento para continuar.",
        );
        return;
      }

      const parsedAndar = canShowAndarFields
        ? parseOptionalInteger(andar)
        : ({ ok: true, value: null } as ReturnType<typeof parseOptionalInteger>);
      if (!parsedAndar.ok) {
        setSavingStep(false);
        setStepError("Informe um valor válido para o andar.");
        return;
      }

      const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
        method: "PATCH",
        body: JSON.stringify({
          endereco_complemento: enderecoComplemento.trim() || null,
          andar: canShowAndarFields ? parsedAndar.value : null,
          enderecovisualizacao: enderecoVisualizacao,
          mostrar_complemento_no_anuncio:
            enderecoVisualizacao === "END_COMPLETO" && enderecoComplemento.trim().length > 0,
          ocultar_numero_publico: enderecoVisualizacao === "END_SEM_NUMERO",
          ultimo_andar: canShowAndarFields ? ultimoAndar : false,
          mostrar_andar_no_anuncio:
            canShowAndarFields && parsedAndar.value != null ? mostrarAndarNoAnuncio : false,
          localizacao_contexto:
            selectedEmpreendimento?.localizacao_contexto &&
            typeof selectedEmpreendimento.localizacao_contexto === "object" &&
            !Array.isArray(selectedEmpreendimento.localizacao_contexto)
              ? selectedEmpreendimento.localizacao_contexto
              : {},
        }),
      });

      setSavingStep(false);
      if (!result.ok) {
        setStepError(result.error);
        return;
      }

      router.replace(`/imoveis/novo?imovel=${imovelId}&step=3`);
      setCurrentStep(3);
      setStepMessage("Etapa 2 salva.");
      return;
    }

    const logradouroNormalized = logradouro.trim();
    const numeroNormalized = numero.trim();
    const bairroNormalized = bairro.trim();
    const cidadeNormalized = cidade.trim();
    const estadoNormalized = estado.trim().toUpperCase();
    const cepNormalized = cep.trim() || null;
    const parsedAndar = canShowAndarFields
      ? parseOptionalInteger(andar)
      : ({ ok: true, value: null } as ReturnType<typeof parseOptionalInteger>);

    if (!parsedAndar.ok) {
      setSavingStep(false);
      setStepError("Informe um valor válido para o andar.");
      return;
    }

    if (!placeId || !enderecoFormatado.trim() || lat == null || lng == null) {
      setSavingStep(false);
      setStepError(
        "Selecione um endereço na busca para capturar localização no Google Maps antes de avançar.",
      );
      return;
    }

    if (
      isDraftPlaceholderAddress({
        logradouro: logradouroNormalized,
        numero: numeroNormalized,
        bairro: bairroNormalized,
        cidade: cidadeNormalized,
        addressSource: null,
      })
    ) {
      setSavingStep(false);
      setStepError("Preencha o endereço real do imóvel. Os dados de rascunho não podem ser usados.");
      return;
    }

    if (
      !logradouroNormalized ||
      !numeroNormalized ||
      !bairroNormalized ||
      !cidadeNormalized ||
      !isUfCode(estadoNormalized)
    ) {
      setSavingStep(false);
      setStepError("Preencha logradouro, número, bairro, cidade e UF.");
      return;
    }

    const geolocacaoId = await resolveGeolocacaoIdForCurrentForm({
      logradouro: logradouroNormalized,
      numero: numeroNormalized,
      bairro: bairroNormalized,
      cidade: cidadeNormalized,
      estado: estadoNormalized,
      cep: cepNormalized,
    });
    if (!geolocacaoId) {
      setSavingStep(false);
      return;
    }

    const enderecoFormatadoPayload =
      enderecoFormatado.trim() ||
      formatAddressFromFields({
        logradouro: logradouroNormalized,
        numero: numeroNormalized,
        bairro: bairroNormalized,
        cidade: cidadeNormalized,
        estado: estadoNormalized,
      });

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        geolocacao_id: geolocacaoId,
        logradouro: logradouroNormalized,
        numero: numeroNormalized,
        bairro: bairroNormalized,
        cidade: cidadeNormalized,
        estado: estadoNormalized,
        cep: cepNormalized,
        lat,
        lng,
        endereco_complemento: enderecoComplemento.trim() || null,
        andar: canShowAndarFields ? parsedAndar.value : null,
        enderecovisualizacao: enderecoVisualizacao,
        mostrar_complemento_no_anuncio:
          enderecoVisualizacao === "END_COMPLETO" && enderecoComplemento.trim().length > 0,
        ocultar_numero_publico: enderecoVisualizacao === "END_SEM_NUMERO",
        ultimo_andar: canShowAndarFields ? ultimoAndar : false,
        mostrar_andar_no_anuncio:
          canShowAndarFields && parsedAndar.value != null ? mostrarAndarNoAnuncio : false,
        localizacao_contexto: {
          perfil_regiao: localizacaoContextoForm.perfil_regiao,
          mobilidade: localizacaoContextoForm.mobilidade,
          comercio_servicos: localizacaoContextoForm.comercio_servicos,
          lazer_estilo_vida: localizacaoContextoForm.lazer_estilo_vida,
          resumo_local: localizacaoContextoForm.resumo_local.trim() || null,
        },
        address_json: {
          place_id: placeId || null,
          place_name: selectedPlaceName || null,
          formatted_address: enderecoFormatadoPayload,
          bairro_comercial: bairroComercial.trim() || null,
          address_components: addressComponents,
        },
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    router.replace(`/imoveis/novo?imovel=${imovelId}&step=3`);
    setCurrentStep(3);
    setStepMessage("Etapa 2 salva.");
  }

  async function persistStep3() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    const parsedAreaTotal = parseOptionalDecimal(areaTotal);
    const parsedAreaUtil = parseOptionalDecimal(areaUtil);
    const parsedDormitorios = parseOptionalInteger(dormitorios);
    const parsedSuites = parseOptionalInteger(suites);
    const parsedBanheiros = parseOptionalInteger(banheiros);
    const parsedLavabos = parseOptionalInteger(lavabos);
    const parsedSalas = parseOptionalInteger(salas);
    const parsedCozinhas = parseOptionalInteger(cozinhas);
    const parsedVagas = parseOptionalInteger(vagas);

    if (
      !parsedAreaTotal.ok ||
      !parsedAreaUtil.ok ||
      !parsedDormitorios.ok ||
      !parsedSuites.ok ||
      !parsedBanheiros.ok ||
      !parsedLavabos.ok ||
      !parsedSalas.ok ||
      !parsedCozinhas.ok ||
      !parsedVagas.ok
    ) {
      setSavingStep(false);
      setStepError("Revise os campos numéricos com valor inválido.");
      return;
    }

    if (parsedAreaUtil.value == null || parsedAreaUtil.value <= 0) {
      setSavingStep(false);
      setStepError("Informe a área útil do imóvel para continuar.");
      return;
    }

    let parsedAreaTerreno: ReturnType<typeof parseOptionalDecimal> = {
      ok: true,
      value: null,
    };
    let parsedFrenteMetros: ReturnType<typeof parseOptionalDecimal> = {
      ok: true,
      value: null,
    };
    let parsedFundosMetros: ReturnType<typeof parseOptionalDecimal> = {
      ok: true,
      value: null,
    };
    let parsedLateral1Metros: ReturnType<typeof parseOptionalDecimal> = {
      ok: true,
      value: null,
    };
    let parsedLateral2Metros: ReturnType<typeof parseOptionalDecimal> = {
      ok: true,
      value: null,
    };

    if (canShowTerrainFields) {
      parsedAreaTerreno = parseOptionalDecimal(areaTerreno);
      parsedFrenteMetros = parseOptionalDecimal(frenteMetros);
      parsedFundosMetros = parseOptionalDecimal(fundosMetros);
      parsedLateral1Metros = parseOptionalDecimal(lateral1Metros);
      parsedLateral2Metros = parseOptionalDecimal(lateral2Metros);

      if (
        !parsedAreaTerreno.ok ||
        !parsedFrenteMetros.ok ||
        !parsedFundosMetros.ok ||
        !parsedLateral1Metros.ok ||
        !parsedLateral2Metros.ok
      ) {
        setSavingStep(false);
        setStepError("Revise as medidas de terreno. Use somente números válidos.");
        return;
      }
    }

    const tipologiaContextoParaPersistencia =
      pertenceEmpreendimento === "SIM" && !empreendimentoTipoId
        ? (tipologiaContextoSelecionada?.tipologia_label ?? empreendimentoTipologiaLabel.trim()) || null
        : undefined;

    const dormitoriosPersist = isUsoComercial ? null : parsedDormitorios.value;
    const suitesPersist = isUsoComercial ? null : parsedSuites.value;

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        tipo: tipoImovel,
        ...(tipologiaContextoParaPersistencia !== undefined
          ? { empreendimento_tipologia_label: tipologiaContextoParaPersistencia }
          : {}),
        area_total: parsedAreaTotal.value,
        area_util: parsedAreaUtil.value,
        dormitorios: dormitoriosPersist,
        suites: suitesPersist,
        banheiros: parsedBanheiros.value,
        lavabos: parsedLavabos.value,
        salas: parsedSalas.value,
        cozinhas: parsedCozinhas.value,
        vagas: parsedVagas.value,
        vaga_tamanhos: parsedVagas.value && parsedVagas.value > 0 && vagaTamanho ? [vagaTamanho] : [],
        vaga_coberturas:
          parsedVagas.value && parsedVagas.value > 0 && vagaCobertura ? [vagaCobertura] : [],
        vaga_tipos: parsedVagas.value && parsedVagas.value > 0 ? vagaTipos : [],
        area_terreno: canShowTerrainFields ? parsedAreaTerreno.value : null,
        frente_metros: canShowTerrainFields ? parsedFrenteMetros.value : null,
        fundos_metros: canShowTerrainFields ? parsedFundosMetros.value : null,
        lateral_1_metros: canShowTerrainFields ? parsedLateral1Metros.value : null,
        lateral_2_metros: canShowTerrainFields ? parsedLateral2Metros.value : null,
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    router.replace(`/imoveis/novo?imovel=${imovelId}&step=4`);
    setCurrentStep(4);
    setStepMessage("Etapa 3 salva.");
  }

  async function persistStep4() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    if (!isTipoNegociacao(tipoNegociacao)) {
      setSavingStep(false);
      setStepError("Selecione o tipo de negociação.");
      return;
    }

    const parsedPrecoVenda = parseOptionalCurrency(precoVenda);
    const parsedPrecoLocacao = parseOptionalCurrency(precoLocacao);
    const parsedValorCondominio = parseOptionalCurrency(valorCondominio);
    const parsedValorIptu = parseOptionalCurrency(valorIptu);
    const parsedComissaoVenda = parseOptionalPercent(comissaoVendaPercentual);
    const parsedMinimoMaos = parseOptionalCurrency(minimoAceitoEmMaos);
    const parsedComissaoCaptador = parseOptionalPercent(comissaoCaptadorPercentual);
    const parsedExclusividadeComissaoMinha = parseOptionalPercent(exclusividadeComissaoMinhaPercentual);
    const parsedComissaoVendedor = parseOptionalPercent(comissaoVendedorPercentual);
    const parsedExclusividadeComissaoParceiro = parseOptionalPercent(exclusividadeComissaoParceiroPercentual);

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
      setSavingStep(false);
      setStepError("Revise os campos de negociação com valor inválido.");
      return;
    }

    if (hasVendaNegociacao && parsedPrecoVenda.value == null) {
      setSavingStep(false);
      setStepError("Informe o valor de venda.");
      return;
    }

    if (hasAluguelNegociacao && parsedPrecoLocacao.value == null) {
      setSavingStep(false);
      setStepError("Informe o valor de aluguel.");
      return;
    }

    if (aceitaPermuta && descricaoPermuta.trim().length === 0) {
      setSavingStep(false);
      setStepError("Descreva a permuta quando a opção estiver marcada.");
      return;
    }

    if (isCaptacaoParceria) {
      if (corretorParceiroNome.trim().length === 0 || corretorParceiroTelefone.trim().length === 0) {
        setSavingStep(false);
        setStepError("Informe nome e telefone do corretor parceiro.");
        return;
      }

      if (parsedComissaoCaptador.value == null || parsedComissaoVendedor.value == null) {
        setSavingStep(false);
        setStepError("Informe minha comissão para calcular a comissão do parceiro.");
        return;
      }
    }

    if (isMinhaCaptacaoSemExclusividade) {
      if (proprietarioNome.trim().length === 0 || proprietarioTelefone.trim().length === 0) {
        setSavingStep(false);
        setStepError("Informe nome e telefone do proprietário.");
        return;
      }

      if (
        isParceriaSemExclusividadeAtiva &&
        (parsedComissaoCaptador.value == null || parsedComissaoVendedor.value == null)
      ) {
        setSavingStep(false);
        setStepError("Informe minha comissão para calcular a comissão do parceiro.");
        return;
      }
    }

    if (isMinhaExclusividade) {
      if (proprietarioNome.trim().length === 0 || proprietarioTelefone.trim().length === 0) {
        setSavingStep(false);
        setStepError("Informe nome e telefone do proprietário.");
        return;
      }

      if (!exclusividadeDataVencimento) {
        setSavingStep(false);
        setStepError("Informe a data de vencimento da exclusividade.");
        return;
      }

      if (exclusividadeDataVencimento < todayIsoDate) {
        setSavingStep(false);
        setStepError("A data de vencimento da exclusividade não pode estar no passado.");
        return;
      }

      if (isParceriaExclusividadeAtiva) {
        if (parsedExclusividadeComissaoMinha.value == null || parsedExclusividadeComissaoParceiro.value == null) {
          setSavingStep(false);
          setStepError("Informe as comissões da parceria para a exclusividade.");
          return;
        }
      }

      if (disponibilizarNoBolsaoParceria) {
        if (!isParceriaExclusividadeAtiva) {
          setSavingStep(false);
          setStepError("Para ofertar no bolsão, marque que aceita parceria com outros corretores.");
          return;
        }

        if (exclusividadeDataVencimento < minBolsaoExclusividadeIsoDate) {
          setSavingStep(false);
          setStepError(
            `Para oferecer no bolsão, o vencimento da exclusividade precisa ter no mínimo ${BOLSAO_EXCLUSIVIDADE_MIN_DIAS} dias a partir de hoje (mínimo: ${formatIsoDateToPtBr(minBolsaoExclusividadeIsoDate)}).`,
          );
          return;
        }

        if (parsedExclusividadeComissaoMinha.value == null || parsedExclusividadeComissaoParceiro.value == null) {
          setSavingStep(false);
          setStepError("Preencha as comissões de exclusividade para disponibilizar no bolsão.");
          return;
        }
      }

      if (!aceiteCorretorExclusivo) {
        setSavingStep(false);
        setStepError("Confirme o aceite de corretor exclusivo.");
        return;
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
            .filter((item): item is string => Boolean(item))
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
              .filter((item): item is string => Boolean(item))
              .join(" | ")
        : null;

    const hasContatoProprietario = isMinhaCaptacaoSemExclusividade || isMinhaExclusividade;
    const contatoNomePayload = isCaptacaoParceria
      ? corretorParceiroNome.trim() || null
      : hasContatoProprietario
        ? proprietarioNome.trim() || null
        : null;
    const contatoTelefonePayload = isCaptacaoParceria
      ? corretorParceiroTelefone.trim() || null
      : hasContatoProprietario
        ? proprietarioTelefone.trim() || null
        : null;
    const contatoEmailPayload = isCaptacaoParceria
      ? corretorParceiroEmail.trim() || null
      : hasContatoProprietario
        ? proprietarioEmail.trim() || null
        : null;

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        tipo_negociacao: tipoNegociacao,
        preco_venda: hasVendaNegociacao ? parsedPrecoVenda.value : null,
        preco_locacao: hasAluguelNegociacao ? parsedPrecoLocacao.value : null,
        condominio: pertenceEmpreendimento === "SIM" ? parsedValorCondominio.value : null,
        iptu: parsedValorIptu.value,
        iptu_periodicidade: parsedValorIptu.value == null ? null : iptuMensal ? "MENSAL" : "ANUAL",
        comissao_locacao: hasAluguelNegociacao ? comissaoLocacao.trim() || null : null,
        comissao_venda_percentual: hasVendaNegociacao ? parsedComissaoVenda.value : null,
        minimo_aceito_em_maos: hasVendaNegociacao ? parsedMinimoMaos.value : null,
        aceita_permuta: hasVendaNegociacao ? aceitaPermuta : false,
        descricao_permuta: hasVendaNegociacao && aceitaPermuta ? descricaoPermuta.trim() : null,
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
        exclusividade_data_vencimento:
          isMinhaExclusividade ? exclusividadeDataVencimento : null,
        exclusividade_observacoes:
          isMinhaExclusividade ? exclusividadeObservacoes.trim() || null : null,
        disponibilizar_no_bolsao_parceria: isMinhaExclusividade ? disponibilizarNoBolsaoParceria : false,
        bolsao_permitir_mudanca_preco:
          isMinhaExclusividade && disponibilizarNoBolsaoParceria ? bolsaoPermitirMudancaPreco : false,
        bolsao_permitir_download_midia_kit:
          isMinhaExclusividade && disponibilizarNoBolsaoParceria
            ? bolsaoPermitirDownloadMidiaKit
            : false,
        bolsao_somente_visitas_agendadas:
          isMinhaExclusividade && disponibilizarNoBolsaoParceria
            ? bolsaoSomenteVisitasAgendadas
            : false,
        bolsao_somente_visitas_com_minha_presenca:
          isMinhaExclusividade && disponibilizarNoBolsaoParceria
            ? bolsaoSomenteVisitasComMinhaPresenca
            : false,
        aceite_corretor_exclusivo: isMinhaExclusividade ? aceiteCorretorExclusivo : false,
        regra_geral_exclusividade: null,
        aceita_parceria_status:
          isMinhaExclusividade || isMinhaCaptacaoSemExclusividade
            ? aceitaParceriaStatus || null
            : null,
        divisao_comissao_parceria: divisaoComissaoParceriaResumo || null,
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    router.replace(`/imoveis/novo?imovel=${imovelId}&step=5`);
    setCurrentStep(5);
    setStepMessage("Etapa 4 salva.");
  }

  async function persistStep5() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    const parsedQtdDormitorios = parseOptionalInteger(qtdDormitoriosDetalhe);
    const parsedQtdCozinhas = parseOptionalInteger(qtdCozinhasDetalhe);
    const parsedQtdSalas = parseOptionalInteger(qtdSalasDetalhe);
    const parsedQtdVarandas = parseOptionalInteger(qtdVarandasDetalhe);

    if (!parsedQtdDormitorios.ok || !parsedQtdCozinhas.ok || !parsedQtdSalas.ok || !parsedQtdVarandas.ok) {
      setSavingStep(false);
      setStepError("Revise as quantidades dos ambientes. Use apenas números inteiros.");
      return;
    }

    const qtdDormitorios = parsedQtdDormitorios.value ?? 0;
    const qtdCozinhas = parsedQtdCozinhas.value ?? 0;
    const qtdSalas = parsedQtdSalas.value ?? 0;
    const qtdVarandas = parsedQtdVarandas.value ?? 0;

    const dormitoriosRows = resizeAmbientes(dormitoriosDetalhe, qtdDormitorios, createDormitorioAmbiente);
    const cozinhasRows = resizeAmbientes(cozinhasDetalhe, qtdCozinhas, createCozinhaAmbiente);
    const salasRows = resizeAmbientes(salasDetalhe, qtdSalas, createSalaAmbiente);
    const varandasRows = resizeAmbientes(varandasDetalhe, qtdVarandas, createVarandaAmbiente);

    if (dormitoriosRows.filter((item) => item.suite_principal).length > 1) {
      setSavingStep(false);
      setStepError("Defina apenas uma suíte principal.");
      return;
    }

    const payloadAmbientes: Array<{
      tipo_ambiente: TipoAmbienteImovelValue;
      principal: boolean;
      area_m2: number | null;
      dados: Record<string, unknown>;
    }> = [];

    for (let index = 0; index < dormitoriosRows.length; index += 1) {
      const item = dormitoriosRows[index];
      const parsedArea = parseOptionalDecimal(item.area_m2);
      if (!parsedArea.ok) {
        setSavingStep(false);
        setStepError(`Dormitório ${index + 1}: informe uma área válida.`);
        return;
      }
      if (item.suite_principal && !item.eh_suite) {
        setSavingStep(false);
        setStepError(`Dormitório ${index + 1}: suíte principal só pode ser marcada quando for suíte.`);
        return;
      }
      payloadAmbientes.push({
        tipo_ambiente: "DORMITORIO",
        principal: item.eh_suite && item.suite_principal,
        area_m2: parsedArea.value,
        dados: {
          eh_suite: item.eh_suite,
          suite_principal: item.eh_suite && item.suite_principal,
          banheiro_armarios: item.eh_suite && item.banheiro_armarios,
          banheiro_pia_dupla: item.eh_suite && item.banheiro_pia_dupla,
          banheiro_box: item.eh_suite && item.banheiro_box,
          ar_condicionado: item.ar_condicionado,
          closet: item.closet,
          armarios_planejados: item.armarios_planejados,
          tem_cama: item.tem_cama,
          tem_tv: item.tem_tv,
          tem_varanda: item.tem_varanda,
          persiana_tipo: item.persiana_tipo || null,
          tipo_piso: item.tipo_piso || null,
        },
      });
    }

    for (let index = 0; index < cozinhasRows.length; index += 1) {
      const item = cozinhasRows[index];
      const parsedArea = parseOptionalDecimal(item.area_m2);
      if (!parsedArea.ok) {
        setSavingStep(false);
        setStepError(`Cozinha ${index + 1}: informe uma área válida.`);
        return;
      }
      payloadAmbientes.push({
        tipo_ambiente: "COZINHA",
        principal: false,
        area_m2: parsedArea.value,
        dados: {
          tipo_cozinha: item.tipo_cozinha || null,
          armarios_planejados: item.armarios_planejados,
          fogao: item.fogao,
          forno: item.forno,
          geladeira: item.geladeira,
          microondas: item.microondas,
          bancada: Boolean(item.tipo_bancada),
          tipo_bancada: item.tipo_bancada || null,
          tipo_piso: item.tipo_piso || null,
        },
      });
    }

    if (salasRows.filter((item) => item.principal).length > 1) {
      setSavingStep(false);
      setStepError("Defina apenas uma sala principal.");
      return;
    }

    for (let index = 0; index < salasRows.length; index += 1) {
      const item = salasRows[index];
      const parsedArea = parseOptionalDecimal(item.area_m2);
      if (!parsedArea.ok) {
        setSavingStep(false);
        setStepError(`Sala ${index + 1}: informe uma área válida.`);
        return;
      }
      payloadAmbientes.push({
        tipo_ambiente: "SALA",
        principal: item.principal,
        area_m2: parsedArea.value,
        dados: {
          tipo_sala: item.tipo_sala || null,
          layout: item.layout || null,
          tipo_piso: item.tipo_piso || null,
          diferenciais: item.diferenciais,
        },
      });
    }

    for (let index = 0; index < varandasRows.length; index += 1) {
      const item = varandasRows[index];
      const parsedArea = parseOptionalDecimal(item.area_m2);
      if (!parsedArea.ok) {
        setSavingStep(false);
        setStepError(`Varanda ${index + 1}: informe uma área válida.`);
        return;
      }
      payloadAmbientes.push({
        tipo_ambiente: "VARANDA",
        principal: false,
        area_m2: parsedArea.value,
        dados: {
          tipo_varanda: item.tipo_varanda || null,
          churrasqueira_tipo: item.churrasqueira_tipo || null,
          bancada: item.bancada,
          persiana_tipo: item.persiana_tipo || null,
          fechada_com_vidro: item.fechada_com_vidro,
          ilha: item.ilha,
          fogao: item.fogao,
          frigobar: item.frigobar,
          chopeira: item.chopeira,
          tem_tv: item.tem_tv,
          tipo_piso: item.tipo_piso || null,
        },
      });
    }

    const result = await apiFetchWithAuth<{ id: string; ambientes: ImovelAmbienteApiItem[] }>(
      `/api/imoveis/${imovelId}/ambientes`,
      {
        method: "PUT",
        body: JSON.stringify({ ambientes: payloadAmbientes }),
      },
    );

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    setDormitoriosDetalhe(dormitoriosRows);
    setCozinhasDetalhe(cozinhasRows);
    setSalasDetalhe(salasRows);
    setVarandasDetalhe(varandasRows);
    setQtdVarandasDetalhe(qtdVarandas > 0 ? String(qtdVarandas) : "");
    setDormitorios(qtdDormitorios > 0 ? String(qtdDormitorios) : "");
    setCozinhas(qtdCozinhas > 0 ? String(qtdCozinhas) : "");
    setSalas(qtdSalas > 0 ? String(qtdSalas) : "");
    const suitesDerivadas = dormitoriosRows.filter((item) => item.eh_suite).length;
    setSuites(suitesDerivadas > 0 ? String(suitesDerivadas) : "");
    router.replace(`/imoveis/novo?imovel=${imovelId}&step=6`);
    setCurrentStep(6);
    setStepMessage("Etapa 5 salva.");
  }

  async function persistStep6() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    const caracteristicasOrdenadas = [...new Set(caracteristicasSelecionadas)].sort();
    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        caracteristicas: caracteristicasOrdenadas,
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    router.replace(`/imoveis/novo?imovel=${imovelId}&step=7`);
    setCurrentStep(7);
    setStepMessage("Etapa 6 salva.");
  }

  function buildAykaImovelPrompt(config: AykaConfig) {
    const endereco = [logradouro, numero, bairro, cidade, estado].filter((item) => !!item).join(", ");
    const enderecoPublicacao =
      ENDERECO_VISUALIZACAO_OPTIONS.find((item) => item.value === enderecoVisualizacao)?.label ??
      enderecoVisualizacao;
    const hasEmpreendimentoAssociado = pertenceEmpreendimento === "SIM" && Boolean(empreendimentoId);
    const empreendimentoNome = selectedEmpreendimento?.nome ?? "Não associado";
    const empreendimentoBairroComercial = selectedEmpreendimento?.bairro_comercial ?? null;
    const bairroComercialReferencia = hasEmpreendimentoAssociado
      ? empreendimentoBairroComercial
      : bairroComercial.trim() || null;
    const empreendimentoDescricao = htmlToPlainText(selectedEmpreendimento?.descricao ?? "");
    const localizacaoContextoFonte = hasEmpreendimentoAssociado
      ? selectedEmpreendimento?.localizacao_contexto &&
        typeof selectedEmpreendimento.localizacao_contexto === "object" &&
        !Array.isArray(selectedEmpreendimento.localizacao_contexto)
        ? (selectedEmpreendimento.localizacao_contexto as Record<string, unknown>)
        : {}
      : {
          perfil_regiao: localizacaoContextoForm.perfil_regiao,
          mobilidade: localizacaoContextoForm.mobilidade,
          comercio_servicos: localizacaoContextoForm.comercio_servicos,
          lazer_estilo_vida: localizacaoContextoForm.lazer_estilo_vida,
          resumo_local: localizacaoContextoForm.resumo_local,
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
    const ocupacaoLabel =
      OCUPACAO_IMOVEL_OPTIONS.find((item) => item.value === ocupacaoImovel)?.label ?? "Não informado";
    const caracteristicas = caracteristicasCatalogo
      .filter((item) => caracteristicasSelecionadas.includes(item.chave))
      .map((item) => item.label_pt);
    const dormitoriosResumo = dormitoriosDetalhe
      .map((item, index) => {
        const flags = [
          item.eh_suite ? "suíte" : null,
          item.suite_principal ? "suíte principal" : null,
          item.tem_varanda ? "com varanda" : null,
          item.ar_condicionado ? "ar-condicionado" : null,
          item.closet ? "closet" : null,
          item.armarios_planejados ? "armários planejados" : null,
        ]
          .filter((flag): flag is string => Boolean(flag))
          .join(", ");
        return `Dormitório ${index + 1}: área ${item.area_m2 || "n/i"}m², piso ${
          item.tipo_piso || "n/i"
        }, persiana ${item.persiana_tipo || "n/i"}${flags ? `, ${flags}` : ""}`;
      })
      .join(" | ");
    const cozinhasResumo = cozinhasDetalhe
      .map((item, index) => {
        const flags = [
          item.armarios_planejados ? "armários planejados" : null,
          item.fogao ? "fogão" : null,
          item.forno ? "forno" : null,
          item.geladeira ? "geladeira" : null,
          item.microondas ? "micro-ondas" : null,
          item.tipo_bancada ? `bancada ${item.tipo_bancada.toLowerCase()}` : null,
        ]
          .filter((flag): flag is string => Boolean(flag))
          .join(", ");
        return `Cozinha ${index + 1}: área ${item.area_m2 || "n/i"}m², tipo ${
          item.tipo_cozinha || "n/i"
        }, piso ${item.tipo_piso || "n/i"}${flags ? `, ${flags}` : ""}`;
      })
      .join(" | ");
    const salasResumo = salasDetalhe
      .map((item, index) => {
        const flags = item.diferenciais.length > 0 ? `diferenciais ${item.diferenciais.join(", ")}` : "";
        return `Sala ${index + 1}: área ${item.area_m2 || "n/i"}m², tipo ${
          item.tipo_sala || "n/i"
        }, layout ${item.layout || "n/i"}, piso ${item.tipo_piso || "n/i"}${
          flags ? `, ${flags}` : ""
        }`;
      })
      .join(" | ");
    const varandasResumo = varandasDetalhe
      .map((item, index) => {
        const flags = [
          item.churrasqueira_tipo ? `churrasqueira ${item.churrasqueira_tipo.toLowerCase()}` : null,
          item.fechada_com_vidro ? "fechada com vidro" : null,
          item.bancada ? "bancada" : null,
          item.ilha ? "ilha" : null,
          item.fogao ? "fogão" : null,
          item.frigobar ? "frigobar" : null,
          item.chopeira ? "chopeira" : null,
          item.tem_tv ? "tv" : null,
        ]
          .filter((flag): flag is string => Boolean(flag))
          .join(", ");
        return `Varanda ${index + 1}: área ${item.area_m2 || "n/i"}m², tipo ${
          item.tipo_varanda || "n/i"
        }, piso ${item.tipo_piso || "n/i"}, persiana ${item.persiana_tipo || "n/i"}${
          flags ? `, ${flags}` : ""
        }`;
      })
      .join(" | ");

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
- Tipo de imóvel: ${TIPO_IMOVEL_OPTIONS.find((item) => item.value === tipoImovel)?.label ?? tipoImovel}
- Tipologia (quando houver): ${tipologiaAtualLabel ?? "Não informada"}
- Empreendimento associado: ${empreendimentoNome}
- Bairro comercial de referência: ${bairroComercialReferencia || "Não informado"}
- Descrição do empreendimento: ${empreendimentoDescricao || "Não informada"}
- Contexto localização (perfil da região): ${localizacaoPerfilRegiao || "Não informado"}
- Contexto localização (mobilidade): ${localizacaoMobilidade || "Não informado"}
- Contexto localização (comércio e serviços): ${localizacaoComercioServicos || "Não informado"}
- Contexto localização (lazer e estilo de vida): ${localizacaoLazerEstilo || "Não informado"}
- Contexto localização (resumo local): ${localizacaoResumo || "Não informado"}
- Endereço base: ${endereco || "Não informado"}
- Visualização pública do endereço: ${enderecoPublicacao}
- Andar: ${andar || "Não informado"} (${mostrarAndarNoAnuncio ? "mostrar no anúncio" : "não mostrar no anúncio"})
- Área útil: ${areaUtil || "Não informado"} m²
- Área total: ${areaTotal || "Não informado"} m²
- Dormitórios: ${dormitorios || "Não informado"}
- Suítes: ${suites || "Não informado"}
- Banheiros: ${banheiros || "Não informado"}
- Lavabos: ${lavabos || "Não informado"}
- Salas: ${salas || "Não informado"}
- Cozinhas: ${cozinhas || "Não informado"}
- Varandas: ${qtdVarandasDetalhe || "Não informado"}
- Vagas: ${vagas || "Não informado"}
- Tipo negociação: ${TIPO_NEGOCIACAO_OPTIONS.find((item) => item.value === tipoNegociacao)?.label ?? tipoNegociacao}
- Valor venda: ${precoVenda ? `R$ ${precoVenda}` : "Não informado"}
- Valor aluguel: ${precoLocacao ? `R$ ${precoLocacao}` : "Não informado"}
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
    setStepError(null);
    setStepMessage(null);
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
      setCheckingAykaCreditos(false);
      setStepError(disponibilidade.error);
      return disponibilidade.error;
    }

    if (!disponibilidade.data.pode_executar) {
      setCheckingAykaCreditos(false);
      setStepError(disponibilidade.data.detalhe);
      return disponibilidade.data.detalhe;
    }

    setAykaActionCodigo(actionToUse);
    setCheckingAykaCreditos(false);
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
      setStepError(result.error);
      return result.error;
    }

    const nextDescricao = result.data.parsed?.descricao_html?.trim();
    if (!nextDescricao) {
      setStepError("A Ayka não retornou descrição válida.");
      return "A Ayka não retornou descrição válida.";
    }

    setDescricaoImovel(nextDescricao);
    setStepMessage("Descrição gerada pela Ayka.");
    return null;
  }

  async function persistStep7() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    if (htmlToPlainText(descricaoImovel).length > MAX_DESCRICAO_IMOVEL_CHARS) {
      setSavingStep(false);
      setStepError(`Descrição acima do limite de ${MAX_DESCRICAO_IMOVEL_CHARS} caracteres.`);
      return;
    }

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        descricao: htmlToPlainText(descricaoImovel).length > 0 ? descricaoImovel : null,
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    router.replace(`/imoveis/novo?imovel=${imovelId}&step=8`);
    setCurrentStep(8);
    setStepMessage("Etapa 7 salva.");
  }

  async function appendMidiaImovelFiles(files: File[]) {
    if (files.length === 0) return;
    if (!imovelId) return;

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
      // Permitimos upload e validamos no backend.
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
      for (const item of current) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
          rejectedPreviewUrlsRef.current.delete(item.previewUrl);
        }
      }
      return rejected;
    });

    setStepError(null);
    setStepMessage(null);

    if (approved.length === 0) return;

    setUploadingMidiaImovel(true);
    setUploadingMidiaImovelPercent(0);

    const failedFiles: string[] = [];
    const totalBytesToUpload = approved.reduce((acc, file) => acc + file.size, 0);
    let uploadedBytesDone = 0;

    for (const file of approved) {
      const alreadyExists = midiasImovel.some(
        (item) => item.fileName === file.name && item.sizeBytes === file.size,
      );
      if (alreadyExists) continue;

      const form = new FormData();
      form.append("file", file);
      form.append("ordem", String(midiasImovel.length + approved.indexOf(file)));

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
        xhr.open("POST", `/api/imoveis/${imovelId}/midia`);
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
        xhr.send(form);
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
            current.map((item) =>
              item.midiaId === uploadResult.data.id ? { ...item, thumbUrl: localThumb } : item,
            ),
          );
        }
      }
    }

    setUploadingMidiaImovel(false);
    setUploadingMidiaImovelPercent(null);

    if (failedFiles.length > 0) {
      setStepError(`Falha no upload das imagens: ${failedFiles.join(", ")}`);
      return;
    }

    setStepMessage("Imagens enviadas.");
  }

  async function removeMidiaImovelById(id: string) {
    const target = midiasImovel.find((item) => item.id === id);
    if (!target || !imovelId) return;
    if (deletingMidiaImovelIds.includes(id)) return;

    setDeletingMidiaImovelIds((current) => [...current, id]);

    const result = await apiFetchWithAuth<{ id: string }>(
      `/api/imoveis/${imovelId}/midia/${target.midiaId}`,
      {
        method: "DELETE",
      },
    );

    setDeletingMidiaImovelIds((current) => current.filter((itemId) => itemId !== id));

    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    if (target.thumbUrl) {
      URL.revokeObjectURL(target.thumbUrl);
      thumbPreviewUrlsRef.current.delete(target.thumbUrl);
    }
    setMidiasImovel((current) => current.filter((item) => item.id !== id));
    if (editingMidiaImovelId === id) setEditingMidiaImovelId(null);
  }

  function applyMidiaImovelOrder(imageId: string, desiredOrderInput: string) {
    const desiredIndex = Number(desiredOrderInput) - 1;
    if (!Number.isInteger(desiredIndex)) return;

    setMidiasImovel((current) => {
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

  function moveMidiaImovelToTarget(dragImageId: string, targetImageId: string) {
    if (dragImageId === targetImageId) return;
    setMidiasImovel((current) => {
      const fromIndex = current.findIndex((item) => item.id === dragImageId);
      const toIndex = current.findIndex((item) => item.id === targetImageId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function persistStep8() {
    if (!imovelId) return;
    if (uploadingMidiaImovel) {
      setStepError("Aguarde o término do envio das imagens antes de continuar.");
      return;
    }

    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    for (const item of midiasImovel) {
      if (!item.midiaId) continue;
      const result = await apiFetchWithAuth<{ id: string }>(
        `/api/imoveis/${imovelId}/midia/${item.midiaId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            alt: item.alt.trim() || null,
            legenda: item.legenda.trim() || null,
            caracteristica: item.caracteristica.trim() || null,
          }),
        },
      );
      if (!result.ok) {
        setSavingStep(false);
        setStepError(result.error);
        return;
      }
    }

    const persistedMidiaResult = await apiFetchWithAuth<ImovelMidiaItem[]>(`/api/imoveis/${imovelId}/midia`);
    if (!persistedMidiaResult.ok) {
      setSavingStep(false);
      setStepError(persistedMidiaResult.error);
      return;
    }

    const videoMidiaIds = persistedMidiaResult.data
      .filter((item) => item.tipo === "VIDEO")
      .map((item) => item.midia_id);

    const orderedMidiaIds = [
      ...midiasImovel.map((item) => item.midiaId).filter(Boolean),
      ...videoMidiaIds,
    ];

    if (orderedMidiaIds.length > 0) {
      const result = await apiFetchWithAuth<{ total: number }>(`/api/imoveis/${imovelId}/midia`, {
        method: "PATCH",
        body: JSON.stringify({
          orderedMidiaIds,
        }),
      });
      if (!result.ok) {
        setSavingStep(false);
        setStepError(result.error);
        return;
      }
    }

    setSavingStep(false);
    router.replace(`/imoveis/novo?imovel=${imovelId}&step=9`);
    setCurrentStep(9);
    setStepMessage("Etapa 8 salva.");
  }

  async function persistStep9() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    if (youtubeVideos.length > MAX_YOUTUBE_VIDEOS) {
      setSavingStep(false);
      setStepError(`Você pode adicionar no máximo ${MAX_YOUTUBE_VIDEOS} vídeos.`);
      return;
    }

    for (const item of youtubeVideos) {
      if (!normalizeYouTubeUrl(item.url) || !item.videoId) {
        setSavingStep(false);
        setStepError("Há um link de vídeo do YouTube inválido. Revise antes de continuar.");
        return;
      }
    }

    const persistedMidiaResult = await apiFetchWithAuth<ImovelMidiaItem[]>(`/api/imoveis/${imovelId}/midia`);
    if (!persistedMidiaResult.ok) {
      setSavingStep(false);
      setStepError(persistedMidiaResult.error);
      return;
    }

    const persistedYoutubeUrls = new Set(
      persistedMidiaResult.data
        .filter((item) => item.tipo === "VIDEO")
        .map((item) => normalizeYouTubeUrl(item.url))
        .filter((item): item is string => Boolean(item)),
    );
    const persistedVideoIds = persistedMidiaResult.data
      .filter((item) => item.tipo === "VIDEO")
      .map((item) => item.midia_id);

    const missingYoutube = youtubeVideos.filter((item) => !persistedYoutubeUrls.has(item.url));
    for (let index = 0; index < missingYoutube.length; index += 1) {
      const item = missingYoutube[index];
      const form = new FormData();
      form.append("youtube_url", item.url);
      form.append("ordem", String(midiasImovel.length + persistedVideoIds.length + index));
      if (item.title?.trim()) {
        form.append("titulo", item.title.trim());
      }
      const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}/midia`, {
        method: "POST",
        body: form,
      });
      if (!result.ok) {
        setSavingStep(false);
        setStepError(result.error);
        return;
      }
      persistedVideoIds.push(result.data.id);
    }

    const currentVideoUrlSet = new Set(youtubeVideos.map((item) => item.url));
    const staleVideos = persistedMidiaResult.data.filter(
      (item) => item.tipo === "VIDEO" && !currentVideoUrlSet.has(normalizeYouTubeUrl(item.url) ?? ""),
    );
    for (const stale of staleVideos) {
      const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}/midia/${stale.midia_id}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        setSavingStep(false);
        setStepError(result.error);
        return;
      }
    }

    const orderedMidiaIds = [
      ...midiasImovel.map((item) => item.midiaId).filter(Boolean),
      ...persistedVideoIds,
    ];
    if (orderedMidiaIds.length > 0) {
      const reorderResult = await apiFetchWithAuth<{ total: number }>(`/api/imoveis/${imovelId}/midia`, {
        method: "PATCH",
        body: JSON.stringify({ orderedMidiaIds }),
      });
      if (!reorderResult.ok) {
        setSavingStep(false);
        setStepError(reorderResult.error);
        return;
      }
    }

    setSavingStep(false);
    router.replace(`/imoveis/novo?imovel=${imovelId}&step=10`);
    setCurrentStep(10);
    setStepMessage("Etapa 9 salva.");
  }

  async function persistStep10() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ocupacao_imovel: ocupacaoImovel || null,
        observacoes_gerais: observacoesGerais.trim() || null,
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    router.replace(`/imoveis/novo?imovel=${imovelId}&step=11`);
    setCurrentStep(11);
    setStepMessage("Etapa 10 salva.");
  }

  async function publishImovel() {
    if (!imovelId) return;
    setSavingStep(true);
    setStepError(null);
    setStepMessage(null);

    const result = await apiFetchWithAuth<{ id: string }>(`/api/imoveis/${imovelId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "PUBLICADO",
      }),
    });

    setSavingStep(false);
    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    router.replace(`/imoveis/${imovelId}`);
  }

  const progressPercent = useMemo(() => (currentStep / TOTAL_STEPS) * 100, [currentStep]);

  return (
    <AppShell title="Novo imóvel" subtitle="Cadastro guiado em etapas">
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cadastro do imóvel</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h2 className="text-4xl font-light text-slate-900">
              Etapa {currentStep} de {TOTAL_STEPS}
            </h2>
            <p className="text-sm text-slate-500">
              {imovelId ? "Rascunho em andamento" : "Preparando rascunho..."}
            </p>
          </div>
          <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full border border-slate-200 bg-transparent">
            <div
              className="h-full rounded-full bg-[var(--primary-scarlet)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-500">Fluxo completo com 10 etapas ativas.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {bootstrapLoading || loadingImovel ? (
            <div className="flex items-center gap-3 text-slate-600">
              <CircleNotch size={20} className="animate-spin" />
              <span>Preparando cadastro...</span>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && bootstrapError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              <p className="font-medium">Não foi possível iniciar o cadastro.</p>
              <p className="mt-1 text-sm">{bootstrapError}</p>
              <Link href="/imoveis" className="mt-3 inline-flex text-sm font-medium text-rose-700 underline">
                Voltar para listagem
              </Link>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 1 ? (
            <div className="space-y-6">
              <header>
                <h3 className="text-2xl font-semibold text-slate-900">Etapa 1: contexto do imóvel</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Defina se o imóvel pertence a um empreendimento e, em caso positivo, associe a tipologia.
                </p>
              </header>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setPertenceEmpreendimento("SIM");
                    setSoloTipoUsoContexto("");
                    setSoloCategoriaContexto("");
                    setSoloSubcategoriaToken("");
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-lg transition ${
                    pertenceEmpreendimento === "SIM"
                      ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Buildings size={20} />
                  Pertence a empreendimento
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const wasNao = pertenceEmpreendimento === "NAO";
                    setPertenceEmpreendimento("NAO");
                    setEmpreendimentoId("");
                    setEmpreendimentoTipoId("");
                    if (!wasNao) {
                      setSoloTipoUsoContexto("");
                      setSoloCategoriaContexto("");
                      setSoloSubcategoriaToken("");
                      setEmpreendimentoTipologiaLabel("");
                    }
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-lg transition ${
                    pertenceEmpreendimento === "NAO"
                      ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <HouseLine size={20} />
                  Imóvel de rua / avulso
                </button>
              </div>

              {pertenceEmpreendimento === "SIM" ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-md">
                      <MagnifyingGlass
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={empreendimentoQuery}
                        onChange={(event) => setEmpreendimentoQuery(event.target.value)}
                        placeholder="Buscar por nome, endereço, bairro ou cidade"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      />
                    </div>

                    <Link
                      href="/empreendimentos/novo"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-slate-400"
                    >
                      Criar novo empreendimento
                    </Link>
                  </div>

                  {loadingEmpreendimentos ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CircleNotch size={16} className="animate-spin" />
                      Carregando empreendimentos...
                    </div>
                  ) : null}

                  {!loadingEmpreendimentos && empreendimentos.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum empreendimento publicado/pausado encontrado para associação.
                    </p>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    {empreendimentos.map((item) => {
                      const selected = item.id === empreendimentoId;
                      const thumbUrl = buildThumbUrl(item.capa_url);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setEmpreendimentoId(item.id);
                            if (item.tipos.length === 1) {
                              setEmpreendimentoTipoId(item.tipos[0]?.id ?? "");
                              setEmpreendimentoTipologiaLabel(
                                item.tipos[0] ? tipologiaLabel(item.tipos[0]) : "",
                              );
                            } else {
                              setEmpreendimentoTipoId("");
                              setEmpreendimentoTipologiaLabel("");
                            }
                            setStepError(null);
                            setStepMessage(null);
                          }}
                          className={`overflow-hidden rounded-xl border text-left transition ${
                            selected
                              ? "border-[var(--primary-scarlet)] bg-rose-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="relative flex h-24 items-center justify-center overflow-hidden border-b border-slate-100 bg-slate-100">
                            {thumbUrl ? (
                              <Image
                                src={thumbUrl}
                                alt={item.nome}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <MapPin size={14} />
                                Sem capa
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.nome}</p>
                              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                                {formatEmpreendimentoStatus(item.status)}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-xs text-slate-600">{formatEnderecoCurto(item)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedEmpreendimento ? (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                      <label className="text-sm font-medium text-slate-700">
                        Tipologia do imóvel dentro do empreendimento
                      </label>
                      {selectedEmpreendimento.tipos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedEmpreendimento.tipos.map((tipo) => {
                            const selected = empreendimentoTipoId === tipo.id;
                            return (
                              <button
                                key={tipo.id}
                                type="button"
                                onClick={() => {
                                  setEmpreendimentoTipoId(tipo.id);
                                  setEmpreendimentoTipologiaLabel(tipologiaLabel(tipo));
                                  if (tipo.area_privativa != null && areaUtil.trim() === "") {
                                    setAreaUtil(normalizeDecimalPtBrInput(String(tipo.area_privativa)));
                                  }
                                  if (tipo.dormitorios != null && dormitorios.trim() === "") {
                                    setDormitorios(String(tipo.dormitorios));
                                  }
                                  if (tipo.suites != null && suites.trim() === "") {
                                    setSuites(String(tipo.suites));
                                  }
                                  if (tipo.banheiros != null && banheiros.trim() === "") {
                                    setBanheiros(String(tipo.banheiros));
                                  }
                                  if (tipo.vagas != null && vagas.trim() === "") {
                                    setVagas(String(tipo.vagas));
                                  }
                                  setStepError(null);
                                  setStepMessage(null);
                                }}
                                className={`cursor-pointer rounded-full border px-3 py-1.5 text-left text-xs transition ${
                                  selected
                                    ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                              >
                                {tipologiaLabel(tipo)}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {empreendimentoTipoId ? (
                        <p className="text-xs text-slate-500">
                          Tipologia selecionada:{" "}
                          <span className="font-medium text-slate-700">{empreendimentoTipologiaLabel}</span>
                        </p>
                      ) : null}

                      {selectedEmpreendimento.tipos.length === 0 ? (
                        <p className="text-xs text-amber-700">
                          Esse empreendimento ainda não possui tipos cadastrados. Você poderá seguir e completar depois.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {pertenceEmpreendimento === "NAO" ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <header>
                    <h4 className="text-base font-semibold text-slate-900">Etapa 1.1: tipologia do imóvel solo</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Antes da localização, defina o contexto comercial do imóvel: uso, categoria e subcategoria.
                    </p>
                  </header>

                  <div className="grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm text-slate-700">Tipo de uso</label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: "RESIDENCIAL", label: "Residencial", icon: HouseLine },
                          { value: "COMERCIAL", label: "Comercial", icon: Buildings },
                        ] as const).map((item) => {
                          const Icon = item.icon;
                          const selected = soloTipoUsoContexto === item.value;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                const nextUso = selected ? "" : item.value;
                                setSoloTipoUsoContexto(nextUso);
                                setSoloCategoriaContexto("");
                                setSoloSubcategoriaToken("");
                              }}
                              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                                selected
                                  ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <Icon size={16} />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                      <label className="mb-1 block text-sm text-slate-700">Categoria</label>
                      <select
                        value={soloCategoriaContexto}
                        onChange={(event) => {
                          const nextCategoria = event.target.value;
                          setSoloCategoriaContexto(nextCategoria);
                          setSoloSubcategoriaToken("");
                        }}
                        disabled={!soloTipoUsoContexto}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="">Selecione</option>
                        {soloCategoriasDisponiveis.map((categoriaOption) => {
                          return (
                            <option key={categoriaOption.value} value={categoriaOption.value}>
                              {categoriaOption.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Subcategoria</label>
                      <select
                        value={soloSubcategoriaToken}
                        onChange={(event) => setSoloSubcategoriaToken(event.target.value)}
                        disabled={!soloCategoriaContexto}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="">Selecione</option>
                        {soloSubcategoriasDisponiveis.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <footer className="flex items-center justify-between gap-3">
                <Link
                  href="/imoveis"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar para lista
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep1();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar e continuar"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 2 ? (
            <div className="space-y-6">
              <header>
                <h3 className="text-2xl font-semibold text-slate-900">Etapa 2: localidade</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {pertenceEmpreendimento === "SIM"
                    ? "Endereço base vem do empreendimento. Complete apenas os dados da unidade."
                    : "Preencha o endereço completo do imóvel avulso."}
                </p>
              </header>

              {pertenceEmpreendimento === "SIM" && selectedEmpreendimento ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">
                    Endereço do empreendimento:
                    <span className="ml-1 font-semibold text-slate-900">{formatEnderecoCurto(selectedEmpreendimento)}</span>
                  </p>
                </div>
              ) : null}

              {pertenceEmpreendimento !== "SIM" ? (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-600">Busca por endereço ou place</label>
                    <div className="relative">
                      <input
                        value={searchAddress}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => {
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
                        placeholder="Ex: Av. Paulista, 200"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--primary-scarlet)]"
                      />
                      {searchingPlaces ? (
                        <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-400">
                          Buscando...
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isSearchFocused && placeOptions.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      {placeOptions.map((option) => (
                        <button
                          key={option.place_id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            void handleSelectPlace(option);
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <MapPin size={14} className="text-slate-400" />
                          {option.description}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
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

                              if (logradouro.trim() && bairro.trim() && cidade.trim() && estado.trim()) {
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
                        <label className="mb-1 block text-xs text-slate-500">Bairro comercial (texto livre)</label>
                        <input
                          value={bairroComercial}
                          onChange={(event) => setBairroComercial(event.target.value)}
                          placeholder="Ex: Jardins, Centro expandido, Faria Lima"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                        <p className="mt-2 text-xs text-slate-500">
                          Atualizando coordenadas pelo número informado...
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        Latitude: {lat ?? "-"} • Longitude: {lng ?? "-"}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {pertenceEmpreendimento !== "SIM" ? (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-base font-medium text-slate-900">Contexto da localização</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Opcional. Ajuda a Ayka a escrever melhor sobre a região do imóvel solo.
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Perfil da região</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {LOCALIZACAO_PERFIL_REGIAO_OPTIONS.map((option) => {
                          const active = localizacaoContextoForm.perfil_regiao.includes(option);
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
                          const active = localizacaoContextoForm.mobilidade.includes(option);
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
                          const active = localizacaoContextoForm.comercio_servicos.includes(option);
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
                          const active = localizacaoContextoForm.lazer_estilo_vida.includes(option);
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
                        value={localizacaoContextoForm.resumo_local}
                        onChange={(event) =>
                          setLocalizacaoContextoForm((current) => ({
                            ...current,
                            resumo_local: event.target.value.slice(0, 300),
                          }))
                        }
                        rows={3}
                        placeholder="Ex: região procurada por famílias, com comércio completo e boa mobilidade para os principais eixos."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-right text-[11px] text-slate-500">
                        {localizacaoContextoForm.resumo_local.length}/300
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Complemento</label>
                    <input
                      value={enderecoComplemento}
                      onChange={(event) => setEnderecoComplemento(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Ex.: Bloco B, apto 71"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Visualização do endereço</label>
                    <select
                      value={enderecoVisualizacao}
                      onChange={(event) =>
                        setEnderecoVisualizacao(event.target.value as EnderecoVisualizacaoValue)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                    >
                      {(pertenceEmpreendimento === "SIM"
                        ? ENDERECO_VISUALIZACAO_OPTIONS.filter(
                            (item) =>
                              item.value === "END_SEM_COMPLEMENTO" || item.value === "END_COMPLETO",
                          )
                        : ENDERECO_VISUALIZACAO_OPTIONS
                      ).map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {canShowAndarFields ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Andar</label>
                      <input
                        value={andar}
                        onChange={(event) => setAndar(event.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-wrap items-center gap-5 pt-1 md:pt-7">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={mostrarAndarNoAnuncio}
                        onChange={(event) => setMostrarAndarNoAnuncio(event.target.checked)}
                        disabled={andar.trim().length === 0}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                      />
                      Mostrar o andar no anúncio
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={ultimoAndar}
                        onChange={(event) => setUltimoAndar(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                      />
                      Marcar unidade como último andar
                    </label>
                    </div>
                  </div>
                ) : null}
              </div>

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=1`);
                    setCurrentStep(1);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep2();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar e continuar"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 3 ? (
            <div className="space-y-6">
              <header>
                <h3 className="text-2xl font-semibold text-slate-900">Etapa 3: dados do imóvel</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Informe áreas e composição da unidade. Campos de terreno só aparecem quando aplicáveis.
                </p>
              </header>

              {selectedTipo ? (
                <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">Dados sugeridos pela tipologia selecionada</p>
                    <p className="text-xs opacity-90">{tipologiaLabel(selectedTipo)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyTipologiaSuggestions(true)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-300 bg-white px-3 text-xs font-medium text-blue-800 hover:border-blue-400"
                  >
                    Reaplicar dados da tipologia
                  </button>
                </div>
              ) : null}

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {pertenceEmpreendimento === "NAO" ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                      Contexto definido na etapa 1.1
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                        {tipologiaSoloContexto?.uso ?? tipoUsoLabel}
                      </span>
                      {tipologiaSoloContexto?.categoria ? (
                        <>
                          <span className="text-slate-400">›</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                            {tipologiaSoloContexto.categoria}
                          </span>
                        </>
                      ) : null}
                      {tipologiaSoloContexto?.subcategoria ? (
                        <>
                          <span className="text-slate-400">›</span>
                          <span className="rounded-full border border-[var(--primary-scarlet)] bg-rose-50 px-3 py-1 text-[var(--primary-scarlet)]">
                            {tipologiaSoloContexto.subcategoria}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : isTipoContextLockedByEmpreendimento ||
                  deveExibirCategoriaSubcategoriaPorEmpreendimento ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                      {isTipoContextLockedByEmpreendimento
                        ? "Contexto definido pela tipologia do empreendimento"
                        : deveRestringirCategoriaSubcategoriaPorEmpreendimento
                          ? "Contexto definido pelas tipologias do empreendimento"
                          : "Contexto associado ao empreendimento"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                        {deveExibirCategoriaSubcategoriaPorEmpreendimento
                          ? tipoUsoFromTipoImovel(tipoImovel)
                          : tipoUsoLabel}
                      </span>
                      <span className="text-slate-400">›</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                        {TIPO_IMOVEL_OPTIONS.find((item) => item.value === tipoImovel)?.label ?? tipoImovel}
                      </span>
                      {(deveRestringirCategoriaSubcategoriaPorEmpreendimento
                        ? tipologiaContextoSelecionada?.tipologia_label
                        : tipologiaAtualLabel) ? (
                        <>
                          <span className="text-slate-400">›</span>
                          <span className="rounded-full border border-[var(--primary-scarlet)] bg-rose-50 px-3 py-1 text-[var(--primary-scarlet)]">
                            {deveRestringirCategoriaSubcategoriaPorEmpreendimento
                              ? tipologiaContextoSelecionada?.tipologia_label
                              : tipologiaAtualLabel}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {empreendimentoSemTipologiasDisponiveis ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Este empreendimento ainda não possui tipologias. Cadastre tipologias para habilitar a
                        subcategoria.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-3">
                  {deveExibirCategoriaSubcategoriaPorEmpreendimento ? (
                    <>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Uso do imóvel</label>
                        <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                          {tipoUsoFromTipoImovel(tipoImovel)}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Categoria</label>
                        {categoriaTravadaPorEmpreendimento ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                            {TIPO_IMOVEL_OPTIONS.find((item) => item.value === tipoImovel)?.label ?? tipoImovel}
                          </div>
                        ) : (
                          <select
                            value={tipoImovel}
                            onChange={(event) => {
                              if (!isTipoImovel(event.target.value)) return;
                              setTipoImovel(event.target.value);

                              if (deveRestringirCategoriaSubcategoriaPorEmpreendimento) {
                                const primeiraTipologiaDaCategoria = empreendimentoTipologiaContextos.find(
                                  (item) => item.tipo_imovel === event.target.value,
                                );
                                if (primeiraTipologiaDaCategoria) {
                                  setEmpreendimentoTipologiaLabel(primeiraTipologiaDaCategoria.tipologia_label);
                                }
                              } else {
                                setEmpreendimentoTipologiaLabel("");
                              }
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          >
                            {(deveRestringirCategoriaSubcategoriaPorEmpreendimento
                              ? tipoImovelDisponiveisEmpreendimento
                              : TIPO_IMOVEL_OPTIONS.map((option) => option.value)
                            ).map((tipoOption) => {
                              const optionLabel =
                                TIPO_IMOVEL_OPTIONS.find((item) => item.value === tipoOption)?.label ?? tipoOption;
                              return (
                                <option key={tipoOption} value={tipoOption}>
                                  {optionLabel}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Subcategoria</label>
                        {deveRestringirCategoriaSubcategoriaPorEmpreendimento ? (
                          <select
                            value={tipologiaContextoSelecionada?.tipologia_label ?? ""}
                            onChange={(event) => {
                              const nextTipologia = tipologiasContextoParaTipoImovelAtual.find(
                                (item) => item.tipologia_label === event.target.value,
                              );
                              if (!nextTipologia) return;
                              setEmpreendimentoTipologiaLabel(nextTipologia.tipologia_label);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          >
                            {tipologiasContextoParaTipoImovelAtual.map((item) => (
                              <option key={item.tipo_id} value={item.tipologia_label}>
                                {item.subcategoria_label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500">
                            Cadastre tipologias no empreendimento para definir a subcategoria
                          </div>
                        )}
                      </div>
                    </>
                  ) : pertenceEmpreendimento === "NAO" ? null : (
                    <div className="md:col-span-3">
                      <label className="mb-1 block text-sm text-slate-700">Tipo do imóvel</label>
                      {isTipoContextLockedByEmpreendimento ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                          {TIPO_IMOVEL_OPTIONS.find((item) => item.value === tipoImovel)?.label ?? tipoImovel}
                        </div>
                      ) : (
                        <select
                          value={tipoImovel}
                          onChange={(event) => {
                            if (isTipoImovel(event.target.value)) setTipoImovel(event.target.value);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        >
                          {TIPO_IMOVEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Área total (m²)</label>
                    <input
                      value={areaTotal}
                      onChange={(event) => setAreaTotal(sanitizeDecimalPtBrInput(event.target.value))}
                      onBlur={(event) => setAreaTotal(normalizeDecimalPtBrInput(event.target.value))}
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                    <input
                      value={areaUtil}
                      onChange={(event) => setAreaUtil(sanitizeDecimalPtBrInput(event.target.value))}
                      onBlur={(event) => setAreaUtil(normalizeDecimalPtBrInput(event.target.value))}
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Informe a área útil"
                    />
                  </div>
                  {!isUsoComercial ? (
                    <>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Dormitórios</label>
                        <input
                          value={dormitorios}
                          onChange={(event) => setDormitorios(event.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Suítes</label>
                        <input
                          value={suites}
                          onChange={(event) => setSuites(event.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="Opcional"
                        />
                      </div>
                    </>
                  ) : null}
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Banheiros</label>
                    <input
                      value={banheiros}
                      onChange={(event) => setBanheiros(event.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Lavabos</label>
                    <input
                      value={lavabos}
                      onChange={(event) => setLavabos(event.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Salas</label>
                    <input
                      value={salas}
                      onChange={(event) => setSalas(event.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Varandas</label>
                    <input
                      value={qtdVarandasDetalhe}
                      onChange={(event) => setQtdVarandasDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Cozinhas</label>
                    <input
                      value={cozinhas}
                      onChange={(event) => setCozinhas(event.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Vagas</label>
                    <input
                      value={vagas}
                      onChange={(event) => setVagas(event.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-700">Tipos de vaga</label>
                  <div className="flex flex-wrap gap-2">
                    {VAGA_TIPO_OPTIONS.map((option) => {
                      const selected = vagaTipos.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={Number(vagas || "0") <= 0}
                          onClick={() => {
                            setVagaTipos((current) => {
                              if (current.includes(option.value)) {
                                return current.filter((item) => item !== option.value);
                              }
                              return [...current, option.value];
                            });
                          }}
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
                      const selected = vagaTamanho === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={Number(vagas || "0") <= 0}
                          onClick={() => {
                            setVagaTamanho((current) => (current === option.value ? "" : option.value));
                          }}
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
                      const selected = vagaCobertura === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={Number(vagas || "0") <= 0}
                          onClick={() => {
                            setVagaCobertura((current) => (current === option.value ? "" : option.value));
                          }}
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
                            value={areaTerreno}
                            onChange={(event) => setAreaTerreno(sanitizeDecimalPtBrInput(event.target.value))}
                            onBlur={(event) => setAreaTerreno(normalizeDecimalPtBrInput(event.target.value))}
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Frente (m)</label>
                          <input
                            value={frenteMetros}
                            onChange={(event) => setFrenteMetros(sanitizeDecimalPtBrInput(event.target.value))}
                            onBlur={(event) => setFrenteMetros(normalizeDecimalPtBrInput(event.target.value))}
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Fundo (m)</label>
                          <input
                            value={fundosMetros}
                            onChange={(event) => setFundosMetros(sanitizeDecimalPtBrInput(event.target.value))}
                            onBlur={(event) => setFundosMetros(normalizeDecimalPtBrInput(event.target.value))}
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Lateral 1 (m)</label>
                          <input
                            value={lateral1Metros}
                            onChange={(event) => setLateral1Metros(sanitizeDecimalPtBrInput(event.target.value))}
                            onBlur={(event) => setLateral1Metros(normalizeDecimalPtBrInput(event.target.value))}
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-700">Lateral 2 (m)</label>
                          <input
                            value={lateral2Metros}
                            onChange={(event) => setLateral2Metros(sanitizeDecimalPtBrInput(event.target.value))}
                            onBlur={(event) => setLateral2Metros(normalizeDecimalPtBrInput(event.target.value))}
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
                            className="h-56 w-full rounded-lg border border-slate-100 bg-slate-50"
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
                                <circle
                                  key={index}
                                  cx={corner.x}
                                  cy={corner.y}
                                  r={3}
                                  fill="rgb(220, 38, 38)"
                                />
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

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=2`);
                    setCurrentStep(2);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep3();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar e continuar"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 4 ? (
            <div className="space-y-6">
              <header>
                <h3 className="text-2xl font-semibold text-slate-900">Etapa 4: negociação</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Defina valores, condições comerciais, parceria e regras de exclusividade.
                </p>
              </header>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-700">Tipo de negociação</label>
                  <div className="flex flex-wrap gap-2">
                    {TIPO_NEGOCIACAO_OPTIONS.map((option) => {
                      const selected = tipoNegociacao === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTipoNegociacao(option.value)}
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
                          value={precoVenda}
                          onChange={(event) => setPrecoVenda(formatCurrencyInput(event.target.value))}
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
                          value={precoLocacao}
                          onChange={(event) => setPrecoLocacao(formatCurrencyInput(event.target.value))}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                          placeholder="4.500"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={`grid gap-3 ${pertenceEmpreendimento === "SIM" ? "md:grid-cols-2" : ""}`}>
                  {pertenceEmpreendimento === "SIM" ? (
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Valor do condomínio</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                          R$
                        </span>
                        <input
                          value={valorCondominio}
                          onChange={(event) => setValorCondominio(formatCurrencyInput(event.target.value))}
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
                        value={valorIptu}
                        onChange={(event) => setValorIptu(formatCurrencyInput(event.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        placeholder="1.200"
                      />
                    </div>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={iptuMensal}
                        onChange={(event) => setIptuMensal(event.target.checked)}
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
                      value={comissaoLocacao}
                      onChange={(event) => setComissaoLocacao(event.target.value)}
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
                          value={comissaoVendaPercentual}
                          onChange={(event) =>
                            setComissaoVendaPercentual(sanitizePercentInput(event.target.value))
                          }
                          onBlur={(event) =>
                            setComissaoVendaPercentual(normalizePercentInput(event.target.value))
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
                          value={minimoAceitoEmMaos}
                          onChange={(event) => setMinimoAceitoEmMaos(formatCurrencyInput(event.target.value))}
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
                        checked={aceitaPermuta}
                        onChange={(event) => setAceitaPermuta(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--primary-scarlet)] focus:ring-[var(--primary-scarlet)]"
                      />
                      Aceita permuta
                    </label>
                    {aceitaPermuta ? (
                      <textarea
                        value={descricaoPermuta}
                        onChange={(event) => setDescricaoPermuta(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        placeholder="Descreva o tipo de permuta aceita."
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-700">Modelo comercial</label>
                  <div className="grid gap-2 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        setModeloCaptacao((current) =>
                          current === "PARCERIA" ? "" : "PARCERIA",
                        )
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
                        setModeloCaptacao((current) =>
                          current === "CAPTACAO_SEM_EXCLUSIVIDADE" ? "" : "CAPTACAO_SEM_EXCLUSIVIDADE",
                        )
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
                        setModeloCaptacao((current) =>
                          current === "EXCLUSIVIDADE" ? "" : "EXCLUSIVIDADE",
                        )
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
                        value={corretorParceiroNome}
                        onChange={(event) => setCorretorParceiroNome(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Telefone</label>
                      <input
                        value={corretorParceiroTelefone}
                        onChange={(event) =>
                          setCorretorParceiroTelefone(formatPhoneDisplay(event.target.value))
                        }
                        placeholder="(11) 99999-0000"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Email</label>
                      <input
                        value={corretorParceiroEmail}
                        onChange={(event) => setCorretorParceiroEmail(event.target.value)}
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
                          value={proprietarioNome}
                          onChange={(event) => setProprietarioNome(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Telefone</label>
                        <input
                          value={proprietarioTelefone}
                          onChange={(event) =>
                            setProprietarioTelefone(formatPhoneDisplay(event.target.value))
                          }
                          placeholder="(11) 99999-0000"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-700">Email</label>
                        <input
                          value={proprietarioEmail}
                          onChange={(event) => setProprietarioEmail(event.target.value)}
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
                        value={aceitaParceriaStatus}
                        onChange={(event) =>
                          setAceitaParceriaStatus(
                            isAceitaParceriaStatus(event.target.value) ? event.target.value : "",
                          )
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
                      <p className="text-xs text-slate-600">
                        Dados da exclusividade do imóvel.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-1">
                      <div>
                        <div className="mb-1 flex items-center gap-1">
                          <label className="block text-sm text-slate-700">Vencimento da exclusividade</label>
                          <InfoTooltip text={EXCLUSIVIDADE_TOOLTIP.vencimento} />
                        </div>
                        <input
                          type="date"
                          value={exclusividadeDataVencimento}
                          onChange={(event) => setExclusividadeDataVencimento(event.target.value)}
                          min={disponibilizarNoBolsaoParceria ? minBolsaoExclusividadeIsoDate : todayIsoDate}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                        />
                        {isMinhaExclusividade ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Se disponibilizar no bolsão, o vencimento deve ter no mínimo{" "}
                            {BOLSAO_EXCLUSIVIDADE_MIN_DIAS} dias a partir de hoje (mínimo:{" "}
                            {formatIsoDateToPtBr(minBolsaoExclusividadeIsoDate)}).
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <textarea
                      value={exclusividadeObservacoes}
                      onChange={(event) => setExclusividadeObservacoes(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                      placeholder="Observações da exclusividade"
                    />

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={aceiteCorretorExclusivo}
                        onChange={(event) => setAceiteCorretorExclusivo(event.target.checked)}
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
                          value={aceitaParceriaStatus}
                          onChange={(event) =>
                            setAceitaParceriaStatus(
                              isAceitaParceriaStatus(event.target.value) ? event.target.value : "",
                            )
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
                                  value={exclusividadeComissaoMinhaPercentual}
                                  onChange={(event) =>
                                    setExclusividadeComissaoMinhaPercentual(
                                      sanitizePercentInput(event.target.value),
                                    )
                                  }
                                  onBlur={(event) =>
                                    setExclusividadeComissaoMinhaPercentual(
                                      normalizePercentInput(event.target.value),
                                    )
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
                                  value={exclusividadeComissaoParceiroPercentual}
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
                              onClick={() => setDisponibilizarNoBolsaoParceria((current) => !current)}
                              className={`mt-3 inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
                                disponibilizarNoBolsaoParceria
                                  ? "border-[var(--primary-scarlet)] bg-[var(--primary-scarlet)] text-white hover:brightness-95"
                                  : "border-[var(--primary-scarlet)] bg-white text-[var(--primary-scarlet)] hover:bg-rose-100"
                              } disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100`}
                            >
                              {disponibilizarNoBolsaoParceria
                                ? "Bolsão ativado"
                                : "Disponibilizar no Bolsão de Exclusividade"}
                            </button>
                          </div>

                          {disponibilizarNoBolsaoParceria ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                                Regras para parceiros no bolsão
                              </p>
                              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={bolsaoPermitirMudancaPreco}
                                  onChange={(event) => setBolsaoPermitirMudancaPreco(event.target.checked)}
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
                                  checked={bolsaoPermitirDownloadMidiaKit}
                                  onChange={(event) =>
                                    setBolsaoPermitirDownloadMidiaKit(event.target.checked)
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
                                  checked={bolsaoSomenteVisitasAgendadas}
                                  onChange={(event) =>
                                    setBolsaoSomenteVisitasAgendadas(event.target.checked)
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
                                  checked={bolsaoSomenteVisitasComMinhaPresenca}
                                  onChange={(event) =>
                                    setBolsaoSomenteVisitasComMinhaPresenca(event.target.checked)
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
                      <label className="mb-1 block text-sm text-slate-700">Minha comissão sobre o ganho (%)</label>
                      <div className="relative">
                        <input
                          value={comissaoCaptadorPercentual}
                          onChange={(event) =>
                            setComissaoCaptadorPercentual(sanitizePercentInput(event.target.value))
                          }
                          onBlur={(event) =>
                            setComissaoCaptadorPercentual(normalizePercentInput(event.target.value))
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
                      <label className="mb-1 block text-sm text-slate-700">Comissão parceiro sobre o ganho (%)</label>
                      <div className="relative">
                        <input
                          value={comissaoVendedorPercentual}
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

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=3`);
                    setCurrentStep(3);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep4();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar etapa"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 5 ? (
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
                    onChange={(event) => setQtdDormitoriosDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-44"
                    placeholder="0"
                  />
                </div>

                {dormitoriosDetalhe.length > 0 ? (
                  <div className="space-y-3">
                    {dormitoriosDetalhe.map((item, index) => (
                      <div key={item.local_id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-sm font-medium text-slate-900">Dormitório {index + 1}</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                            <input
                              value={item.area_m2}
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
                              value={item.tipo_piso}
                              onChange={(event) =>
                                setDormitoriosDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, tipo_piso: isAmbientePiso(event.target.value) ? event.target.value : "" }
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
                            aria-pressed={item.eh_suite}
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
                              item.eh_suite
                                ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                            }`}
                          >
                            É suíte
                          </button>
                          <button
                            type="button"
                            aria-pressed={item.suite_principal}
                            disabled={!item.eh_suite}
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
                              item.suite_principal
                                ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            Suíte principal
                          </button>
                        </div>

                        {item.eh_suite ? (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex flex-wrap gap-2">
                              {([
                                { key: "banheiro_armarios", label: "Banheiro com armários" },
                                { key: "banheiro_pia_dupla", label: "Pia dupla" },
                                { key: "banheiro_box", label: "Box" },
                              ] as const).map((option) => {
                                const selected = item[option.key];
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
                            const selected = item[option.key];
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
                              const selected = item.persiana_tipo === option.value;
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
                    onChange={(event) => setQtdCozinhasDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-44"
                    placeholder="0"
                  />
                </div>

                {cozinhasDetalhe.length > 0 ? (
                  <div className="space-y-3">
                    {cozinhasDetalhe.map((item, index) => (
                      <div key={item.local_id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-sm font-medium text-slate-900">Cozinha {index + 1}</p>
                        <div className="grid gap-3 md:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                            <input
                              value={item.area_m2}
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
                              value={item.tipo_cozinha}
                              onChange={(event) =>
                                setCozinhasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, tipo_cozinha: isCozinhaTipo(event.target.value) ? event.target.value : "" }
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
                              value={item.tipo_piso}
                              onChange={(event) =>
                                setCozinhasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, tipo_piso: isAmbientePiso(event.target.value) ? event.target.value : "" }
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
                            const selected = item[option.key];
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
                              value={item.tipo_bancada}
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
                    {salasDetalhe.map((item, index) => (
                      <div key={item.local_id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-sm font-medium text-slate-900">Sala {index + 1}</p>
                        <div className="grid gap-3 md:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">Área da sala (m²)</label>
                            <input
                              value={item.area_m2}
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
                              value={item.tipo_sala}
                              onChange={(event) =>
                                setSalasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, tipo_sala: isSalaTipo(event.target.value) ? event.target.value : "" }
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
                              value={item.layout}
                              onChange={(event) =>
                                setSalasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, layout: isSalaLayout(event.target.value) ? event.target.value : "" }
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
                              value={item.tipo_piso}
                              onChange={(event) =>
                                setSalasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, tipo_piso: isAmbientePiso(event.target.value) ? event.target.value : "" }
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
                              checked={item.principal}
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
                              const selected = item.diferenciais.includes(option.value);
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
                                            diferenciais: row.diferenciais.filter((value) => value !== option.value),
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
                      onChange={(event) => setQtdVarandasDetalhe(event.target.value.replace(/\D/g, "").slice(0, 2))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2 md:w-44"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-3">
                    {varandasDetalhe.map((item, index) => (
                      <div key={item.local_id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-sm font-medium text-slate-900">Varanda {index + 1}</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm text-slate-700">Área útil (m²)</label>
                            <input
                              value={item.area_m2}
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
                              value={item.tipo_varanda}
                              onChange={(event) =>
                                setVarandasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? {
                                          ...row,
                                          tipo_varanda: isVarandaTipo(event.target.value) ? event.target.value : "",
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
                              value={item.tipo_piso}
                              onChange={(event) =>
                                setVarandasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, tipo_piso: isAmbientePiso(event.target.value) ? event.target.value : "" }
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
                              value={item.churrasqueira_tipo}
                              onChange={(event) =>
                                setVarandasDetalhe((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? {
                                          ...row,
                                          churrasqueira_tipo: isVarandaChurrasqueira(event.target.value)
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
                            const selected = item[option.key];
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
                              const selected = item.persiana_tipo === option.value;
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
                </div>
              ) : null}

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=4`);
                    setCurrentStep(4);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep5();
                  }}
                  disabled={savingStep || loadingStep5}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar etapa"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 6 ? (
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
                      {empreendimentoCaracteristicasAssociadasPreview.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                        >
                          {item.label_pt}
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
                    {caracteristicasFiltradas.map((item) => {
                      const active = caracteristicasSelecionadas.includes(item.chave);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setCaracteristicasSelecionadas((current) => {
                              if (current.includes(item.chave)) {
                                return current.filter((value) => value !== item.chave);
                              }
                              return [...current, item.chave];
                            })
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs transition ${
                            active
                              ? "border-[var(--primary-scarlet)] bg-rose-50 text-[var(--primary-scarlet)]"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          {item.label_pt}
                        </button>
                      );
                    })}
                    {caracteristicasFiltradas.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhuma característica encontrada.</p>
                    ) : null}
                  </div>
                )}
              </div>

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=5`);
                    setCurrentStep(5);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep6();
                  }}
                  disabled={savingStep || loadingCaracteristicasCatalogo}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar etapa"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 7 ? (
            <div className="space-y-6">
              <header>
                <h3 className="text-2xl font-semibold text-slate-900">Etapa 7: descrição do anúncio</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Escreva uma descrição clara dos destaques do imóvel para elevar a conversão do anúncio.
                </p>
              </header>
              <LongTextAykaEditor
                label="Descrição"
                value={descricaoImovel}
                onChange={setDescricaoImovel}
                maxChars={MAX_DESCRICAO_IMOVEL_CHARS}
                plainTextLength={htmlToPlainText(descricaoImovel).length}
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
                enableFormatoDescricao={pertenceEmpreendimento === "SIM" && Boolean(empreendimentoId)}
                onRequestOpenAyka={handleRequestOpenAykaImovel}
                onGenerateAyka={handleGenerateAykaDescricaoImovel}
              />

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=6`);
                    setCurrentStep(6);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep7();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar etapa"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 8 ? (
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

              {pertenceEmpreendimento === "SIM" && empreendimentoId ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Imagens já cadastradas no empreendimento
                      </h4>
                      <p className="mt-1 text-xs text-slate-600">
                        {selectedEmpreendimento?.nome ?? "Empreendimento associado"} •{" "}
                        {imagensEmpreendimentoRelacionadas.length}{" "}
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
                      {imagensEmpreendimentoPreview.map((item) => (
                        <div
                          key={item.midia_id}
                          className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          <img
                            src={buildThumbUrl(item.url) ?? item.url}
                            alt={item.alt ?? "Imagem do empreendimento"}
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
                <p className="mt-1 text-xs text-slate-500">
                  JPG, JPEG, PNG, WEBP estático, HEIC e HEIF
                </p>
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
                  {midiasImovel.map((item, index) => (
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
                        if (dropTargetMidiaImovelId !== item.id) setDropTargetMidiaImovelId(item.id);
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
                        if (dropTargetMidiaImovelId !== item.id) setDropTargetMidiaImovelId(item.id);
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
                        moveMidiaImovelToTarget(dragId, item.id);
                        setDropTargetMidiaImovelId(null);
                      }}
                      className={`overflow-hidden rounded-xl border bg-slate-50 transition ${
                        dropTargetMidiaImovelId === item.id
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
                          setDropTargetMidiaImovelId(null);
                        }}
                        className="group relative aspect-[4/3] cursor-grab bg-slate-200 active:cursor-grabbing"
                      >
                        {item.isHeic ? (
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
                            src={item.thumbUrl || buildThumbUrl(item.previewUrl) || item.previewUrl}
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
                            disabled={deletingMidiaImovelIds.includes(item.id)}
                            onClick={() => {
                              void removeMidiaImovelById(item.id);
                            }}
                            className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Remover imagem"
                          >
                            {deletingMidiaImovelIds.includes(item.id) ? (
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
                              max={midiasImovel.length}
                              defaultValue={index + 1}
                              onBlur={(event) => applyMidiaImovelOrder(item.id, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  applyMidiaImovelOrder(item.id, event.currentTarget.value);
                                  event.currentTarget.blur();
                                }
                              }}
                              className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm text-slate-700"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setEditingMidiaImovelId(item.id)}
                            className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            aria-label="Editar imagem"
                          >
                            <DotsThreeVertical size={16} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingMidiaImovelId(item.id)}
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
                    {rejectedMidiasImovel.map((item) => (
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

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=7`);
                    setCurrentStep(7);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep8();
                  }}
                  disabled={savingStep || uploadingMidiaImovel}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar etapa"}
                </button>
              </footer>
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
                  const current = midiasImovel.find((item) => item.id === editingMidiaImovelId);
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
                            setMidiasImovel((items) =>
                              items.map((item) =>
                                item.id === current.id ? { ...item, legenda: event.target.value } : item,
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
                            setMidiasImovel((items) =>
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
                          <InfoTooltip text="Texto alternativo (alt) é uma descrição curta para leitores de tela e SEO. Escreva de forma objetiva o que aparece na imagem." />
                        </span>
                        <textarea
                          value={current.alt}
                          onChange={(event) =>
                            setMidiasImovel((items) =>
                              items.map((item) =>
                                item.id === current.id ? { ...item, alt: event.target.value } : item,
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

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 9 ? (
            <div className="space-y-6">
              <header>
                <h3 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                  <Megaphone size={24} />
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
                      setStepError(`Você pode adicionar no máximo ${MAX_YOUTUBE_VIDEOS} vídeos.`);
                      return;
                    }
                    const normalized = normalizeYouTubeUrl(youtubeUrlInput);
                    if (!normalized) {
                      setStepError("Informe uma URL válida do YouTube.");
                      return;
                    }
                    const videoId = getYouTubeVideoId(normalized);
                    if (!videoId) {
                      setStepError("Não foi possível identificar o vídeo do YouTube.");
                      return;
                    }
                    setStepError(null);
                    setAddingYoutube(true);
                    const title = await fetchYouTubeTitle(normalized);
                    setYoutubeVideos((current) => {
                      if (current.some((video) => video.url === normalized)) return current;
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
                  {youtubeVideos.map((item, index) => (
                    <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
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
                                setYoutubeVideos((current) => current.filter((video) => video.id !== item.id))
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

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=8`);
                    setCurrentStep(8);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep9();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar etapa"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 10 ? (
            <div className="space-y-6">
              <header>
                <h3 className="text-2xl font-semibold text-slate-900">Etapa 10: contatos e operação</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Registre a ocupação atual e observações operacionais para visitas e captação.
                </p>
              </header>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Ocupação do imóvel</label>
                  <select
                    value={ocupacaoImovel}
                    onChange={(event) =>
                      setOcupacaoImovel(isOcupacaoImovel(event.target.value) ? event.target.value : "")
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                  >
                    <option value="">Selecione</option>
                    {OCUPACAO_IMOVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Observações gerais</label>
                  <textarea
                    value={observacoesGerais}
                    onChange={(event) => setObservacoesGerais(event.target.value)}
                    rows={7}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-[var(--primary-scarlet)] transition focus:ring-2"
                    placeholder="Ex.: chave na portaria, horários de visita, necessidade de agendamento, regras do condomínio."
                  />
                </div>
              </div>

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=9`);
                    setCurrentStep(9);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistStep10();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Salvando..." : "Salvar etapa"}
                </button>
              </footer>
            </div>
          ) : null}

          {!bootstrapLoading && !loadingImovel && !bootstrapError && currentStep === 11 ? (
            <div className="space-y-6">
              <header>
                <h3 className="text-2xl font-semibold text-slate-900">Etapa 11: revisão e publicação</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Revise os dados principais e publique o imóvel quando estiver pronto.
                </p>
              </header>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Contexto do imóvel</p>
                  <p className="mt-1 font-medium">
                    {TIPO_IMOVEL_OPTIONS.find((item) => item.value === tipoImovel)?.label}
                  </p>
                  {tipologiaAtualLabel ? <p className="mt-1 text-xs text-slate-600">{tipologiaAtualLabel}</p> : null}
                  <p className="mt-2 text-xs text-slate-600">
                    {pluralize(Number(dormitorios || "0"), "dormitório", "dormitórios")} •{" "}
                    {pluralize(Number(suites || "0"), "suíte", "suítes")} •{" "}
                    {pluralize(Number(vagas || "0"), "vaga", "vagas")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Conteúdo e entrega</p>
                  <p className="mt-1 font-medium">{pluralize(totalMidiasCombinadas, "mídia", "mídias")}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {pluralize(midiasImovel.length, "imagem", "imagens")} do imóvel +{" "}
                    {pluralize(imagensEmpreendimentoRelacionadas.length, "imagem", "imagens")} do
                    empreendimento
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {pluralize(youtubeVideos.length, "vídeo", "vídeos")} do YouTube
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {pluralize(caracteristicasSelecionadas.length, "característica", "características")} selecionadas
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Valores</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Tipo de negociação</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{tipoNegociacaoLabel}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Venda</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {precoVendaFormatado ?? "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Aluguel</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {precoLocacaoFormatado ?? "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Condomínio</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {valorCondominioFormatado ?? "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">IPTU</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {valorIptuFormatado ? `${valorIptuFormatado} (${iptuMensal ? "mensal" : "anual"})` : "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Comissão venda (%)</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {comissaoVendaPercentual || "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Comissão aluguel</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {comissaoLocacao || "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Mínimo em mãos</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {(() => {
                        const parsed = parseOptionalCurrency(minimoAceitoEmMaos);
                        if (!parsed.ok || parsed.value == null) return "Não informado";
                        return formatCurrencyValue(parsed.value);
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Mídias do anúncio</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Ordem de exibição: <strong>imóvel primeiro</strong>, depois empreendimento.
                  </p>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-700">
                        Imóvel • {pluralize(reviewMidiasImovel.length, "imagem", "imagens")}
                      </p>
                      {reviewMidiasImovel.length > 0 ? (
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {reviewMidiasImovel.slice(0, Math.min(4, reviewMidiasImovel.length)).map((item, index) => {
                            const isOverlayThumb = index === 3 && reviewMidiasImovel.length > 3;
                            return (
                              <div
                                key={item.id}
                                className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                              >
                                <img
                                  src={buildThumbUrl(item.url) ?? item.url}
                                  alt={item.alt}
                                  draggable={false}
                                  loading="lazy"
                                  decoding="async"
                                  className={`h-[88px] w-full object-cover ${
                                    isOverlayThumb ? "scale-105 blur-[2px]" : ""
                                  }`}
                                />
                                {isOverlayThumb ? (
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 px-2 text-center">
                                    <span className="text-[11px] font-semibold leading-tight text-white">
                                      {reviewMidiasImovel.length} imagens no total
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Nenhuma imagem do imóvel.</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-700">
                        Empreendimento •{" "}
                        {pluralize(reviewMidiasEmpreendimento.length, "imagem", "imagens")}
                      </p>
                      {reviewMidiasEmpreendimento.length > 0 ? (
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {reviewMidiasEmpreendimento
                            .slice(0, Math.min(4, reviewMidiasEmpreendimento.length))
                            .map((item, index) => {
                              const isOverlayThumb = index === 3 && reviewMidiasEmpreendimento.length > 3;
                              return (
                                <div
                                  key={item.id}
                                  className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                                >
                                  <img
                                    src={buildThumbUrl(item.url) ?? item.url}
                                    alt={item.alt}
                                    draggable={false}
                                    loading="lazy"
                                    decoding="async"
                                    className={`h-[88px] w-full object-cover ${
                                      isOverlayThumb ? "scale-105 blur-[2px]" : ""
                                    }`}
                                  />
                                  {isOverlayThumb ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 px-2 text-center">
                                      <span className="text-[11px] font-semibold leading-tight text-white">
                                        {reviewMidiasEmpreendimento.length} imagens no total
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Nenhuma imagem do empreendimento.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Localização</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{reviewAddress || "Não informado"}</p>
                  {reviewMapEmbedUrl ? (
                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                      <iframe
                        src={reviewMapEmbedUrl}
                        title="Mapa da localização do imóvel"
                        className="h-[220px] w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Sem dados suficientes para exibir o mapa.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Descrição</p>
                {descricaoImovelPlain ? (
                  <div
                    className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 [&_p]:mb-4 [&_p]:leading-7 [&_p:last-child]:mb-0 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: descricaoImovel }}
                  />
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Descrição não informada.</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {descricaoImovelPlain.length} / {MAX_DESCRICAO_IMOVEL_CHARS} caracteres (sem tags)
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  reviewPendencias.length > 0
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.08em] text-slate-600">Checklist antes de publicar</p>
                {reviewPendencias.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                    {reviewPendencias.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm font-medium text-emerald-800">
                    Tudo certo. Anúncio pronto para publicação.
                  </p>
                )}
              </div>

              <footer className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.replace(`/imoveis/novo?imovel=${imovelId}&step=10`);
                    setCurrentStep(10);
                    setStepError(null);
                    setStepMessage(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Voltar etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void publishImovel();
                  }}
                  disabled={savingStep}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-scarlet)] px-5 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingStep ? "Publicando..." : "Publicar imóvel"}
                </button>
              </footer>
            </div>
          ) : null}
        </section>

        {stepError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-center gap-2">
              <WarningCircle size={16} />
              <span>{stepError}</span>
            </div>
          </div>
        ) : null}

        {stepMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} />
              <span>{stepMessage}</span>
            </div>
          </div>
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
                  {empreendimentoCaracteristicasAssociadas.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                    >
                      {item.label_pt}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhuma característica cadastrada no empreendimento.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
