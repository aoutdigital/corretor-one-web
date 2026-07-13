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

export type ConfirmVisitAtividadeInput = {
  modelo: Extract<Atividade["modelo"], "EM_ATENDIMENTO_VISITA_PRESENCIAL" | "EM_ATENDIMENTO_VISITA_VIRTUAL">;
  quando_em: string;
  descricao?: string | null;
};

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

export async function confirmVisitAtividade(
  accessToken: string,
  atividadeId: string,
  input: ConfirmVisitAtividadeInput,
): Promise<ApiResult<{ id: string; atividade_confirmacao_id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.quando_em || Number.isNaN(new Date(input.quando_em).getTime())) {
    return fail("VALIDATION_ERROR", "quando_em is required");
  }

  if (input.modelo !== "EM_ATENDIMENTO_VISITA_PRESENCIAL" && input.modelo !== "EM_ATENDIMENTO_VISITA_VIRTUAL") {
    return fail("VALIDATION_ERROR", "modelo must be a visit activity model");
  }

  const { user, client } = auth.data;
  const originalResult = await client
    .from("atividades")
    .select("*")
    .eq("id", atividadeId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (originalResult.error) return mapDbError(originalResult.error);
  if (!originalResult.data) return fail("NOT_FOUND", "Atividade not found");

  const original = originalResult.data as Atividade;
  if (original.modelo !== "EM_ATENDIMENTO_CONFIRMAR_VISITA") {
    return fail("VALIDATION_ERROR", "Only visit confirmation activities can be converted");
  }
  if (original.status !== "PENDENTE") {
    return fail("VALIDATION_ERROR", "Only pending activities can be converted");
  }

  const note = input.descricao?.trim() ?? "";
  const createdDescription = [
    "Visita criada a partir de uma solicitação recebida pelo portal.",
    original.descricao?.trim() ? `Contexto da solicitação:\n${original.descricao.trim()}` : null,
    note ? `Observação da confirmação:\n${note}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const existingVisitResult = await client
    .from("atividades")
    .select("id")
    .eq("owner_id", user.id)
    .eq("lead_id", original.lead_id)
    .eq("modelo", input.modelo)
    .eq("status", "PENDENTE")
    .eq("quando_em", input.quando_em)
    .maybeSingle();

  if (existingVisitResult.error) return mapDbError(existingVisitResult.error);

  let newActivityId = existingVisitResult.data?.id as string | undefined;

  if (!newActivityId) {
    const newActivityResult = await client
      .from("atividades")
      .insert({
        owner_id: user.id,
        lead_id: original.lead_id,
        negocio_id: original.negocio_id,
        categoria: "EM_ATENDIMENTO",
        modelo: input.modelo,
        tipo: "VISITA",
        titulo:
          input.modelo === "EM_ATENDIMENTO_VISITA_VIRTUAL"
            ? "Visita virtual agendada"
            : "Visita presencial agendada",
        descricao: createdDescription,
        quando_em: input.quando_em,
        status: "PENDENTE",
      })
      .select("id")
      .single();

    if (newActivityResult.error) return mapDbError(newActivityResult.error);
    newActivityId = newActivityResult.data.id as string;
  }

  const completionDescription = [
    original.descricao?.trim(),
    `Solicitação confirmada e convertida em visita agendada.`,
    note ? `Confirmação: ${note}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const completeOriginalResult = await client
    .from("atividades")
    .update({
      descricao: completionDescription || null,
      status: "CONCLUIDA",
      concluida_em: new Date().toISOString(),
    })
    .eq("id", original.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (completeOriginalResult.error) return mapDbError(completeOriginalResult.error);
  if (!completeOriginalResult.data) return fail("NOT_FOUND", "Atividade not found");

  return ok({
    id: newActivityId,
    atividade_confirmacao_id: original.id,
  });
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
