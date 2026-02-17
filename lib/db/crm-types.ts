import type { Json, Database } from "@/lib/supabase/database.types";

export type NegocioEtapa = Database["public"]["Enums"]["etapa_negocio"];
export type Finalidade = Database["public"]["Enums"]["finalidade"];
export type PropostaTipo = Database["public"]["Enums"]["tipo_proposta"];
export type PropostaStatus = Database["public"]["Enums"]["status_proposta"];
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
