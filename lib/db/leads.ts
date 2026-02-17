import type { SupabaseClient } from "@supabase/supabase-js";

import { fail, ok, type ApiResult } from "@/lib/api/result";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LeadCaptureInput } from "@/lib/validation/lead-capture";

type DbErrorLike = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

type CaptureOutcome = {
  lead_id: string;
  action: "created" | "updated";
};

function mapDbError<T>(error: DbErrorLike): ApiResult<T> {
  if (error.code === "23505") {
    return fail("CONFLICT", error.message, { details: error.details, hint: error.hint });
  }

  if (error.code === "23514" || error.code === "P0001") {
    return fail("VALIDATION_ERROR", error.message, {
      details: error.details,
      hint: error.hint,
    });
  }

  return fail("DATABASE_ERROR", error.message, { details: error.details, hint: error.hint });
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length === 0 ? null : normalized;
}

function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = phone.trim();
  return normalized.length === 0 ? null : normalized;
}

type SafeTimelineClient = {
  from: (table: string) => {
    insert: (value: unknown) => Promise<{ error: DbErrorLike | null }>;
  };
};

async function insertCaptureTimelineEvent(
  client: SupabaseClient<Database>,
  ownerId: string,
  leadId: string,
  action: "created" | "updated",
): Promise<void> {
  const timelineClient = client as unknown as SafeTimelineClient;
  const title =
    action === "created"
      ? "Lead criado por nova captura"
      : "Lead atualizado por nova captura";

  const result = await timelineClient.from("timeline_eventos").insert({
    owner_id: ownerId,
    lead_id: leadId,
    tipo: "SISTEMA",
    titulo: title,
    detalhes: { source: "public_capture", action },
  });

  if (result.error) {
    // If table is still absent in some env, do not break lead ingestion.
    if (result.error.code === "42P01") return;
    throw new Error(result.error.message);
  }
}

async function findExistingLeadByKeys(
  client: SupabaseClient<Database>,
  ownerId: string,
  emailLower: string | null,
  phoneE164: string | null,
): Promise<ApiResult<LeadRow | null>> {
  let byEmail: LeadRow | null = null;
  let byPhone: LeadRow | null = null;

  if (emailLower) {
    const query = await client
      .from("leads")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("email_lower", emailLower)
      .maybeSingle();
    if (query.error) return mapDbError(query.error);
    byEmail = query.data;
  }

  if (phoneE164) {
    const query = await client
      .from("leads")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("telefone_e164", phoneE164)
      .maybeSingle();
    if (query.error) return mapDbError(query.error);
    byPhone = query.data;
  }

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    return fail(
      "CONFLICT",
      "Capture keys match different leads for the same owner",
      {
        lead_id_email: byEmail.id,
        lead_id_phone: byPhone.id,
      },
    );
  }

  return ok(byEmail ?? byPhone ?? null);
}

export async function captureLeadByKeys(
  input: LeadCaptureInput,
): Promise<ApiResult<CaptureOutcome>> {
  const client = createSupabaseAdminClient();
  const emailLower = normalizeEmail(input.email);
  const phoneE164 = normalizePhoneE164(input.telefone_e164);

  const existing = await findExistingLeadByKeys(
    client,
    input.owner_id,
    emailLower,
    phoneE164,
  );
  if (!existing.ok) return existing;

  if (existing.data) {
    const current = existing.data;
    const patch: LeadUpdate = {
      nome: input.nome ?? current.nome,
      email: input.email ?? current.email,
      telefone: input.telefone ?? current.telefone,
      telefone_e164: phoneE164 ?? current.telefone_e164,
      origem: input.origem as LeadUpdate["origem"],
      mensagem: input.mensagem ?? current.mensagem,
      imovel_id: input.imovel_id ?? current.imovel_id,
      utm: (input.utm ?? current.utm) as LeadUpdate["utm"],
    };

    const updateResult = await client
      .from("leads")
      .update(patch)
      .eq("id", current.id)
      .select("id")
      .single();
    if (updateResult.error) return mapDbError(updateResult.error);

    await insertCaptureTimelineEvent(client, input.owner_id, current.id, "updated");
    return ok({ lead_id: current.id, action: "updated" });
  }

  if (!input.nome) {
    return fail("VALIDATION_ERROR", "nome is required when creating a new lead");
  }

  const insertPayload: LeadInsert = {
    owner_id: input.owner_id,
    nome: input.nome,
    email: input.email ?? null,
    telefone: input.telefone ?? null,
    telefone_e164: phoneE164,
    origem: input.origem as LeadInsert["origem"],
    mensagem: input.mensagem ?? null,
    imovel_id: input.imovel_id ?? null,
    utm: (input.utm ?? null) as LeadInsert["utm"],
  };

  const insertResult = await client
    .from("leads")
    .insert(insertPayload)
    .select("id")
    .single();
  if (insertResult.error) return mapDbError(insertResult.error);

  await insertCaptureTimelineEvent(client, input.owner_id, insertResult.data.id, "created");
  return ok({ lead_id: insertResult.data.id, action: "created" });
}

