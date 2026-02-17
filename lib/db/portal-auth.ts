import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import type { DynamicClient } from "@/lib/db/_dynamic-client";

export async function authenticatePortalUser(accessToken: string): Promise<
  ApiResult<{
    userId: string;
    client: ReturnType<typeof authenticateByAccessToken> extends Promise<infer R>
      ? R extends { ok: true; data: infer D }
        ? D extends { client: infer C }
          ? C
          : never
        : never
      : never;
  }>
> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth as ApiResult<never>;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;
  const profile = await db
    .from("portal_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.error) {
    return fail("DATABASE_ERROR", profile.error.message);
  }
  if (!profile.data) {
    return fail("UNAUTHORIZED", "Portal user scope required");
  }

  return ok({
    userId: user.id,
    client: auth.data.client,
  });
}

