import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { Proposta } from "@/lib/db/crm-types";
import type { Database, Json } from "@/lib/supabase/database.types";

type PropostaInsert = Database["public"]["Tables"]["propostas"]["Insert"];
type PropostaUpdate = Database["public"]["Tables"]["propostas"]["Update"];

export type CreatePropostaInput = {
  lead_id: string;
  negocio_id?: string | null;
  titulo: string;
  tipo: Proposta["tipo"];
  status?: Proposta["status"];
  valor?: number | null;
  conteudo?: Json | null;
  arquivo_midia_id?: string | null;
  enviada_em?: string | null;
};

export type UpdatePropostaInput = Partial<Omit<CreatePropostaInput, "lead_id" | "tipo">>;

export async function listPropostas(
  accessToken: string,
  leadId?: string,
): Promise<ApiResult<Proposta[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  let query = client.from("propostas").select("*").eq("owner_id", user.id);
  if (leadId) query = query.eq("lead_id", leadId);
  const result = await query.order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as Proposta[]);
}

export async function createProposta(
  accessToken: string,
  input: CreatePropostaInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id || !input.titulo || !input.tipo) {
    return fail("VALIDATION_ERROR", "lead_id, titulo and tipo are required");
  }

  const { user, client } = auth.data;
  const payload: PropostaInsert = {
    owner_id: user.id,
    ...input,
    status: input.status ?? "RASCUNHO",
  };

  const result = await client
    .from("propostas")
    .insert(payload)
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}

export async function updateProposta(
  accessToken: string,
  propostaId: string,
  patch: UpdatePropostaInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const payload: PropostaUpdate = patch;

  const result = await client
    .from("propostas")
    .update(payload)
    .eq("id", propostaId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Proposta not found");
  return ok({ id: result.data.id as string });
}

export async function deleteProposta(
  accessToken: string,
  propostaId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const result = await client
    .from("propostas")
    .delete()
    .eq("id", propostaId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Proposta not found");
  return ok({ id: result.data.id as string });
}
