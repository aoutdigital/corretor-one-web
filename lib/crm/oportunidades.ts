import type { Database } from "@/lib/supabase/database.types";

export type NegocioEtapaLegada = Database["public"]["Enums"]["etapa_negocio"];
export type ModalidadeNegocio = Database["public"]["Enums"]["modalidade_negocio"];
export type FaseNegocio = Database["public"]["Enums"]["fase_negocio"];
export type SubfaseJuridicaNegocio = Database["public"]["Enums"]["subfase_juridica_negocio"];
export type FinalidadeLegada = Database["public"]["Enums"]["finalidade"];

export const NEGOCIO_MODALIDADE_LABEL: Record<ModalidadeNegocio, string> = {
  VENDA: "Venda",
  LOCACAO: "Locação",
  CAPTACAO: "Captação",
};

export const NEGOCIO_FASE_LABEL: Record<FaseNegocio, string> = {
  NEGOCIACAO: "Negociação",
  JURIDICO: "Jurídico",
  PERDIDO: "Perdido",
  GANHO: "Ganho",
};

export const SUBFASE_JURIDICA_LABEL: Record<SubfaseJuridicaNegocio, string> = {
  DOCUMENTOS_RECEBIDOS: "Documentos recebidos",
  ANALISE_DOCUMENTAL: "Análise documental",
  PENDENCIA_DOCUMENTAL: "Pendência documental",
  DOCUMENTACAO_APROVADA: "Documentação aprovada",
  MINUTA_DE_CONTRATO_ENVIADA: "Minuta de contrato enviada",
  MINUTA_DE_CONTRATO_APROVADA: "Minuta de contrato aprovada",
  ASSINATURA_AGENDADA: "Assinatura agendada",
  CONTRATO_ASSINADO: "Contrato assinado",
  REGISTRO_EM_CARTORIO: "Registro em cartório",
  REGISTRO_CONCLUIDO: "Registro concluído",
};

export function mapLegacyFinalidadeToModalidade(
  finalidade: FinalidadeLegada | null | undefined,
): ModalidadeNegocio | null {
  if (finalidade === "ALUGAR") return "LOCACAO";
  if (finalidade === "COMPRAR") return "VENDA";
  return null;
}

export function mapModalidadeToLegacyFinalidade(
  modalidade: ModalidadeNegocio | null | undefined,
): FinalidadeLegada | null {
  if (modalidade === "LOCACAO") return "ALUGAR";
  if (modalidade === "VENDA") return "COMPRAR";
  return null;
}

export function mapLegacyEtapaToFase(etapa: NegocioEtapaLegada | null | undefined): FaseNegocio {
  if (etapa === "CLIENTE") return "GANHO";
  if (etapa === "DESQUALIFICADO") return "PERDIDO";
  return "NEGOCIACAO";
}

export function mapFaseToLegacyEtapa(fase: FaseNegocio | null | undefined): NegocioEtapaLegada {
  if (fase === "GANHO") return "CLIENTE";
  if (fase === "PERDIDO") return "DESQUALIFICADO";
  return "OPORTUNIDADE";
}

export function isVendaNegocio(modalidade: ModalidadeNegocio | null | undefined) {
  return modalidade === "VENDA";
}
