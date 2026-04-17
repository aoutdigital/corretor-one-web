import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";

const MAX_RASCUNHOS = 5;

export type EmpreendimentoRascunho = {
  id: string;
  owner_id: string;
  etapa_atual: number;
  titulo: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateEmpreendimentoRascunhoInput = {
  etapa_atual?: number;
  titulo?: string | null;
  payload?: Record<string, unknown>;
};

export type UpdateEmpreendimentoRascunhoInput = {
  etapa_atual?: number;
  titulo?: string | null;
  payload?: Record<string, unknown>;
};

export async function listEmpreendimentoRascunhos(
  accessToken: string,
): Promise<ApiResult<EmpreendimentoRascunho[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimento_rascunhos")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as EmpreendimentoRascunho[]);
}

export async function getEmpreendimentoRascunhoById(
  accessToken: string,
  rascunhoId: string,
): Promise<ApiResult<EmpreendimentoRascunho>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimento_rascunhos")
    .select("*")
    .eq("id", rascunhoId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Rascunho não encontrado");
  return ok(result.data as EmpreendimentoRascunho);
}

export async function createEmpreendimentoRascunho(
  accessToken: string,
  input: CreateEmpreendimentoRascunhoInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;
  const countDb = client as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => Promise<{
          data: { id: string }[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const countResult = await countDb
    .from("empreendimento_rascunhos")
    .select("id")
    .eq("owner_id", user.id);

  if (countResult.error) return mapDbError(countResult.error);

  if ((countResult.data ?? []).length >= MAX_RASCUNHOS) {
    return fail(
      "VALIDATION_ERROR",
      `Limite de ${MAX_RASCUNHOS} rascunhos atingido. Exclua um rascunho para criar outro.`,
    );
  }

  const result = await db
    .from("empreendimento_rascunhos")
    .insert({
      owner_id: user.id,
      etapa_atual: input.etapa_atual ?? 1,
      titulo: input.titulo ?? null,
      payload: input.payload ?? {},
    })
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("DATABASE_ERROR", "Rascunho criado sem retorno de id");
  return ok({ id: result.data.id as string });
}

export async function updateEmpreendimentoRascunho(
  accessToken: string,
  rascunhoId: string,
  patch: UpdateEmpreendimentoRascunhoInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "Nenhum campo informado para atualização");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimento_rascunhos")
    .update(patch)
    .eq("id", rascunhoId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Rascunho não encontrado");
  return ok({ id: result.data.id as string });
}

export async function deleteEmpreendimentoRascunho(
  accessToken: string,
  rascunhoId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimento_rascunhos")
    .delete()
    .eq("id", rascunhoId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Rascunho não encontrado");
  return ok({ id: result.data.id as string });
}
