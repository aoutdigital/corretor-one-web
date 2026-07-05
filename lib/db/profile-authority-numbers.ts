import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { Database } from "@/lib/supabase/database.types";
import type { AuthorityNumberPayload } from "@/lib/validation/profile-authority-number";

type AuthorityNumberRow = Database["public"]["Tables"]["profile_authority_numbers"]["Row"];
type AuthorityNumberInsert = Database["public"]["Tables"]["profile_authority_numbers"]["Insert"];

const AUTHORITY_NUMBER_SELECT = "id,owner_id,tipo,valor,rotulo,descricao,ordem,visivel,created_at,updated_at";

function buildInsert(ownerId: string, input: AuthorityNumberPayload): AuthorityNumberInsert {
  return {
    owner_id: ownerId,
    tipo: input.tipo as AuthorityNumberInsert["tipo"],
    valor: input.valor,
    rotulo: input.rotulo,
    descricao: input.descricao,
    ordem: input.ordem,
    visivel: input.visivel,
  };
}

export async function listOwnAuthorityNumbers(accessToken: string): Promise<ApiResult<AuthorityNumberRow[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("profile_authority_numbers")
    .select(AUTHORITY_NUMBER_SELECT)
    .eq("owner_id", user.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as AuthorityNumberRow[]);
}

export async function replaceOwnAuthorityNumbers(
  accessToken: string,
  items: AuthorityNumberPayload[],
): Promise<ApiResult<AuthorityNumberRow[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;

  const deleteResult = await client.from("profile_authority_numbers").delete().eq("owner_id", user.id);
  if (deleteResult.error) return mapDbError(deleteResult.error);

  if (items.length === 0) return ok([]);

  const insertResult = await client
    .from("profile_authority_numbers")
    .insert(items.map((item) => buildInsert(user.id, item)))
    .select(AUTHORITY_NUMBER_SELECT)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (insertResult.error) return mapDbError(insertResult.error);
  if (!insertResult.data) return fail("DATABASE_ERROR", "Authority numbers insert returned no data");

  return ok(insertResult.data as AuthorityNumberRow[]);
}
