import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { Negocio } from "@/lib/db/crm-types";
import type { Database } from "@/lib/supabase/database.types";

type NegocioInsert = Database["public"]["Tables"]["negocios"]["Insert"];
type NegocioUpdate = Database["public"]["Tables"]["negocios"]["Update"];

export type CreateNegocioInput = {
  lead_id: string;
  titulo?: string | null;
  etapa?: Negocio["etapa"];
  valor_estimado?: number | null;
  finalidade?: Negocio["finalidade"];
  imovel_id?: string | null;
  empreendimento_id?: string | null;
  lista_id?: string | null;
  notas?: string | null;
  proxima_acao_em?: string | null;
};

export type UpdateNegocioInput = Partial<
  Omit<CreateNegocioInput, "lead_id"> & {
    fechado_em: string | null;
  }
>;

export async function listNegocios(accessToken: string): Promise<ApiResult<Negocio[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("negocios")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as Negocio[]);
}

export async function createNegocio(
  accessToken: string,
  input: CreateNegocioInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id) return fail("VALIDATION_ERROR", "lead_id is required");

  const { user, client } = auth.data;
  const payload: NegocioInsert = {
    owner_id: user.id,
    ...input,
    etapa: input.etapa ?? "NOVO",
  };

  const result = await client
    .from("negocios")
    .insert(payload)
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}

export async function updateNegocio(
  accessToken: string,
  negocioId: string,
  patch: UpdateNegocioInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const payload: NegocioUpdate = patch;

  const result = await client
    .from("negocios")
    .update(payload)
    .eq("id", negocioId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio not found");
  return ok({ id: result.data.id as string });
}

export async function deleteNegocio(
  accessToken: string,
  negocioId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const result = await client
    .from("negocios")
    .delete()
    .eq("id", negocioId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Negocio not found");
  return ok({ id: result.data.id as string });
}
