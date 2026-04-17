import { ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";

export type CaracteristicaCatalogo = {
  id: string;
  chave: string;
  label_pt: string;
  escopos: string[];
  tipos_uso: string[];
  tipos_imovel: string[];
  subtipos_imovel: string[];
  categoria_empreendimento: string | null;
  subcategoria_imovel: string | null;
  ativo: boolean;
};

export async function listCaracteristicasCatalogo(
  accessToken: string,
): Promise<ApiResult<CaracteristicaCatalogo[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const db = auth.data.client as unknown as DynamicClient;
  const result = await db
    .from("caracteristicas_catalogo")
    .select("*")
    .eq("ativo", true)
    .order("label_pt", { ascending: true });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as CaracteristicaCatalogo[]);
}
