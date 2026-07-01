import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { Database } from "@/lib/supabase/database.types";
import type { SocialProofPayload } from "@/lib/validation/social-proof";

type SocialProofRow = Database["public"]["Tables"]["provas_sociais"]["Row"];
type SocialProofInsert = Database["public"]["Tables"]["provas_sociais"]["Insert"];
type SocialProofUpdate = Database["public"]["Tables"]["provas_sociais"]["Update"];

const SOCIAL_PROOF_SELECT =
  "id,owner_id,midia_id,tipo,titulo,descricao,depoimento,cliente_nome_publico,localidade,data_momento,tags,imagem_url,imagem_alt,consentimento_imagem_confirmado,status,ordem,destaque,publicado_em,created_at,updated_at";

function buildInsert(ownerId: string, input: SocialProofPayload): SocialProofInsert {
  const status = input.status ?? "RASCUNHO";
  return {
    owner_id: ownerId,
    tipo: input.tipo as SocialProofInsert["tipo"],
    titulo: input.titulo ?? "",
    descricao: input.descricao ?? null,
    depoimento: input.depoimento ?? null,
    cliente_nome_publico: input.cliente_nome_publico ?? null,
    localidade: input.localidade ?? null,
    data_momento: input.data_momento ?? null,
    tags: input.tags ?? [],
    imagem_url: input.imagem_url ?? null,
    imagem_alt: input.imagem_alt ?? null,
    midia_id: input.midia_id ?? null,
    consentimento_imagem_confirmado: input.consentimento_imagem_confirmado ?? false,
    status: status as SocialProofInsert["status"],
    ordem: input.ordem ?? 0,
    destaque: input.destaque ?? false,
    publicado_em: status === "PUBLICADO" ? new Date().toISOString() : null,
  };
}

function buildUpdate(input: SocialProofPayload): SocialProofUpdate {
  const update: SocialProofUpdate = {};

  if (input.tipo !== undefined) update.tipo = input.tipo as SocialProofUpdate["tipo"];
  if (input.titulo !== undefined) update.titulo = input.titulo;
  if (input.descricao !== undefined) update.descricao = input.descricao;
  if (input.depoimento !== undefined) update.depoimento = input.depoimento;
  if (input.cliente_nome_publico !== undefined) update.cliente_nome_publico = input.cliente_nome_publico;
  if (input.localidade !== undefined) update.localidade = input.localidade;
  if (input.data_momento !== undefined) update.data_momento = input.data_momento;
  if (input.tags !== undefined) update.tags = input.tags;
  if (input.imagem_url !== undefined) update.imagem_url = input.imagem_url;
  if (input.imagem_alt !== undefined) update.imagem_alt = input.imagem_alt;
  if (input.midia_id !== undefined) update.midia_id = input.midia_id;
  if (input.consentimento_imagem_confirmado !== undefined) {
    update.consentimento_imagem_confirmado = input.consentimento_imagem_confirmado;
  }
  if (input.status !== undefined) {
    update.status = input.status as SocialProofUpdate["status"];
    update.publicado_em = input.status === "PUBLICADO" ? new Date().toISOString() : null;
  }
  if (input.ordem !== undefined) update.ordem = input.ordem;
  if (input.destaque !== undefined) update.destaque = input.destaque;

  return update;
}

export async function listOwnSocialProofs(accessToken: string): Promise<ApiResult<SocialProofRow[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("provas_sociais")
    .select(SOCIAL_PROOF_SELECT)
    .eq("owner_id", user.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as SocialProofRow[]);
}

export async function createSocialProof(
  accessToken: string,
  input: SocialProofPayload,
): Promise<ApiResult<SocialProofRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("provas_sociais")
    .insert(buildInsert(user.id, input))
    .select(SOCIAL_PROOF_SELECT)
    .single();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("DATABASE_ERROR", "Social proof insert returned no data");
  return ok(result.data as SocialProofRow);
}

export async function updateSocialProof(
  accessToken: string,
  id: string,
  input: SocialProofPayload,
): Promise<ApiResult<SocialProofRow>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("provas_sociais")
    .update(buildUpdate(input))
    .eq("id", id)
    .eq("owner_id", user.id)
    .select(SOCIAL_PROOF_SELECT)
    .single();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Prova social não encontrada");
  return ok(result.data as SocialProofRow);
}

export async function deleteSocialProof(accessToken: string, id: string): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("provas_sociais")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (result.error) return mapDbError(result.error);
  return ok({ id });
}
