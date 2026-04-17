import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { Atividade } from "@/lib/db/crm-types";
import type { Database } from "@/lib/supabase/database.types";

type AtividadeInsert = Database["public"]["Tables"]["atividades"]["Insert"];
type AtividadeUpdate = Database["public"]["Tables"]["atividades"]["Update"];

export type CreateAtividadeInput = {
  lead_id: string;
  negocio_id?: string | null;
  categoria: Atividade["categoria"];
  modelo: Atividade["modelo"];
  tipo: Atividade["tipo"];
  titulo: string;
  descricao?: string | null;
  quando_em?: string | null;
  status?: Atividade["status"];
};

export type UpdateAtividadeInput = Partial<
  Omit<CreateAtividadeInput, "lead_id" | "tipo" | "titulo"> & {
    tipo: Atividade["tipo"];
    titulo: string;
    concluida_em: string | null;
  }
>;

export async function listAtividades(
  accessToken: string,
  leadId?: string,
): Promise<ApiResult<Atividade[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  let query = client.from("atividades").select("*").eq("owner_id", user.id);
  if (leadId) query = query.eq("lead_id", leadId);
  const result = await query.order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as Atividade[]);
}

export async function createAtividade(
  accessToken: string,
  input: CreateAtividadeInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id || !input.titulo) {
    return fail("VALIDATION_ERROR", "lead_id and titulo are required");
  }

  const { user, client } = auth.data;
  const payload: AtividadeInsert = {
    owner_id: user.id,
    ...input,
    status: input.status ?? "PENDENTE",
  };

  const result = await client
    .from("atividades")
    .insert(payload)
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}

export async function updateAtividade(
  accessToken: string,
  atividadeId: string,
  patch: UpdateAtividadeInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const payload: AtividadeUpdate = patch;

  const result = await client
    .from("atividades")
    .update(payload)
    .eq("id", atividadeId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Atividade not found");
  return ok({ id: result.data.id as string });
}

export async function deleteAtividade(
  accessToken: string,
  atividadeId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const result = await client
    .from("atividades")
    .delete()
    .eq("id", atividadeId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Atividade not found");
  return ok({ id: result.data.id as string });
}
