import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { TimelineEvento } from "@/lib/db/crm-types";
import type { Database, Json } from "@/lib/supabase/database.types";

type TimelineInsert = Database["public"]["Tables"]["timeline_eventos"]["Insert"];

export type CreateTimelineEventoInput = {
  lead_id: string;
  negocio_id?: string | null;
  tipo: TimelineEvento["tipo"];
  titulo: string;
  detalhes?: Json | null;
};

export async function listTimelineEventos(
  accessToken: string,
  leadId: string,
): Promise<ApiResult<TimelineEvento[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const result = await client
    .from("timeline_eventos")
    .select("*")
    .eq("owner_id", user.id)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (result.error) return mapDbError(result.error);
  return ok((result.data ?? []) as TimelineEvento[]);
}

export async function createTimelineEvento(
  accessToken: string,
  input: CreateTimelineEventoInput,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!input.lead_id || !input.tipo || !input.titulo) {
    return fail("VALIDATION_ERROR", "lead_id, tipo and titulo are required");
  }

  const { user, client } = auth.data;
  const payload: TimelineInsert = {
    owner_id: user.id,
    ...input,
  };

  const result = await client
    .from("timeline_eventos")
    .insert(payload)
    .select("id")
    .single();

  if (result.error) return mapDbError(result.error);
  return ok({ id: result.data.id as string });
}
