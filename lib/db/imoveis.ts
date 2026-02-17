import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";

export type Imovel = {
  id: string;
  owner_id: string;
  codigo: string;
  slug_publico: string;
  titulo: string;
  finalidade: string;
  tipo: string;
  status: string;
  cidade: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

export type CreateImovelInput = {
  codigo: string;
  slug_publico: string;
  titulo: string;
  descricao: string;
  finalidade: string;
  tipo: string;
  geolocacao_id: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  address_json: Record<string, unknown>;
  empreendimento_id?: string | null;
  status?: string;
};

export type UpdateImovelInput = Partial<CreateImovelInput> & {
  publicado_em?: string | null;
};

export async function listImoveis(accessToken: string): Promise<ApiResult<Imovel[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("imoveis")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as Imovel[]);
}

export async function getImovelById(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<Imovel>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("imoveis")
    .select("*")
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Imovel not found");
  return ok(result.data as Imovel);
}

export async function createImovel(
  accessToken: string,
  input: CreateImovelInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (
    !input.codigo ||
    !input.slug_publico ||
    !input.titulo ||
    !input.descricao ||
    !input.geolocacao_id ||
    !input.address_json
  ) {
    return fail(
      "VALIDATION_ERROR",
      "codigo, slug_publico, titulo, descricao, geolocacao_id and address_json are required",
    );
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("imoveis")
    .insert({
      owner_id: user.id,
      ...input,
      status: input.status ?? "RASCUNHO",
    })
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}

export async function updateImovel(
  accessToken: string,
  imovelId: string,
  patch: UpdateImovelInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No fields provided to update");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("imoveis")
    .update(patch)
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Imovel not found");
  return ok({ id: result.data.id as string });
}

export async function deleteImovel(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("imoveis")
    .delete()
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Imovel not found");
  return ok({ id: result.data.id as string });
}
