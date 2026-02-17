import { supabase } from "@/lib/supabaseClient";

export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export async function apiFetchWithAuth<T>(
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: HeadersInit },
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, error: "Sessao expirada. Faca login novamente.", status: 401 };
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; data?: T; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      error: payload?.error?.message ?? "Falha na requisicao",
      status: response.status,
    };
  }

  return { ok: true, data: payload.data as T };
}
