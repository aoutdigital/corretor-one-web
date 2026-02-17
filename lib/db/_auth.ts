import type { User } from "@supabase/supabase-js";

import { fail, ok, type ApiResult } from "@/lib/api/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function authenticateByAccessToken(accessToken: string): Promise<
  ApiResult<{
    user: User;
    client: ReturnType<typeof createSupabaseServerClient>;
  }>
> {
  const client = createSupabaseServerClient(accessToken);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return fail("UNAUTHORIZED", "Invalid or missing access token");
  }

  return ok({ user: data.user, client });
}

