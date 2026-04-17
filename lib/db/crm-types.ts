import type { Json, Database } from "@/lib/supabase/database.types";

export type NegocioEtapa = Database["public"]["Enums"]["etapa_negocio"];
export type NegocioModalidade = Database["public"]["Enums"]["modalidade_negocio"];
export type NegocioFase = Database["public"]["Enums"]["fase_negocio"];
export type NegocioSubfaseJuridica = Database["public"]["Enums"]["subfase_juridica_negocio"];
export type NegocioPapelParte = Database["public"]["Enums"]["papel_parte_negocio"];
export type NegocioTipoPessoa = Database["public"]["Enums"]["tipo_pessoa_negocio"];
export type Finalidade = Database["public"]["Enums"]["finalidade"];
export type PropostaTipo = Database["public"]["Enums"]["tipo_proposta"];
export type PropostaStatus = Database["public"]["Enums"]["status_proposta"];
export type AtividadeCategoria = Database["public"]["Enums"]["categoria_atividade"];
export type AtividadeModelo = Database["public"]["Enums"]["modelo_atividade"];
export type AtividadeTipo = Database["public"]["Enums"]["tipo_atividade"];
export type AtividadeStatus = Database["public"]["Enums"]["status_atividade"];
export type TimelineTipo = Database["public"]["Enums"]["tipo_timeline"];

export type Negocio = Database["public"]["Tables"]["negocios"]["Row"];
export type Atividade = Database["public"]["Tables"]["atividades"]["Row"];

type PropostaRow = Database["public"]["Tables"]["propostas"]["Row"];
export type Proposta = Omit<PropostaRow, "conteudo"> & {
  conteudo: Json | null;
};

type TimelineEventoRow = Database["public"]["Tables"]["timeline_eventos"]["Row"];
export type TimelineEvento = Omit<TimelineEventoRow, "detalhes"> & {
  detalhes: Json | null;
};
