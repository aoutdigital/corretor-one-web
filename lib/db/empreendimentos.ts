import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";

export type Empreendimento = {
  id: string;
  owner_id: string;
  slug_publico: string;
  nome: string;
  status: string;
  cidade: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

export type CreateEmpreendimentoInput = {
  slug_publico: string;
  nome: string;
  descricao?: string | null;
  geolocacao_id: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_json?: Record<string, unknown> | null;
  fase?: string;
  status?: string;
};

export type UpdateEmpreendimentoInput = Partial<CreateEmpreendimentoInput> & {
  publicado_em?: string | null;
};

export async function listEmpreendimentos(
  accessToken: string,
): Promise<ApiResult<Empreendimento[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimentos")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as Empreendimento[]);
}

export async function getEmpreendimentoById(
  accessToken: string,
  empreendimentoId: string,
): Promise<ApiResult<Empreendimento>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimentos")
    .select("*")
    .eq("id", empreendimentoId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Empreendimento not found");
  return ok(result.data as Empreendimento);
}

export async function createEmpreendimento(
  accessToken: string,
  input: CreateEmpreendimentoInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.slug_publico || !input.nome || !input.geolocacao_id) {
    return fail("VALIDATION_ERROR", "slug_publico, nome and geolocacao_id are required");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimentos")
    .insert({
      owner_id: user.id,
      ...input,
      fase: input.fase ?? "ENTREGUE",
      status: input.status ?? "RASCUNHO",
    })
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}

export async function updateEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
  patch: UpdateEmpreendimentoInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimentos")
    .update(patch)
    .eq("id", empreendimentoId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Empreendimento not found");
  return ok({ id: result.data.id as string });
}

export async function deleteEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("empreendimentos")
    .delete()
    .eq("id", empreendimentoId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Empreendimento not found");
  return ok({ id: result.data.id as string });
}
