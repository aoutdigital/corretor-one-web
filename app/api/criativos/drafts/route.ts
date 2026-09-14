import { NextResponse } from "next/server";
import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

async function auth(request: Request) {
  const token = getBearerTokenFromRequest(request);
  if (!token) return null;
  const admin = createSupabaseAdminClient();
  const result = await admin.auth.getUser(token);
  return result.data.user ? { admin, ownerId: result.data.user.id } : null;
}

export async function GET(request: Request) {
  const session = await auth(request);
  if (!session) return NextResponse.json({ ok: false, error: { message: "Sessão inválida" } }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  let query = session.admin.from("creative_drafts").select("*").eq("owner_id", session.ownerId);
  query = id ? query.eq("id", id) : query.order("updated_at", { ascending: false }).limit(20);
  const result = id ? await query.maybeSingle() : await query;
  if (result.error) return NextResponse.json({ ok: false, error: { message: result.error.message } }, { status: 500 });
  return NextResponse.json({ ok: true, data: result.data });
}

export async function POST(request: Request) {
  const session = await auth(request);
  if (!session) return NextResponse.json({ ok: false, error: { message: "Sessão inválida" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const templateId = typeof body?.template_id === "string" ? body.template_id : "";
  const propertyId = typeof body?.property_id === "string" ? body.property_id : "";
  const format = typeof body?.format === "string" ? body.format : "";
  const objective: "PROMOVER_IMOVEL" | "PROMOVER_EMPREENDIMENTO" = body?.objective === "PROMOVER_EMPREENDIMENTO" ? "PROMOVER_EMPREENDIMENTO" : "PROMOVER_IMOVEL";
  const payload = (body?.payload && typeof body.payload === "object" ? body.payload : {}) as Json;
  if (!templateId || !propertyId || !["SQUARE", "PORTRAIT", "VERTICAL"].includes(format)) return NextResponse.json({ ok: false, error: { message: "Selecione modelo, imóvel e formato." } }, { status: 400 });
  const draftId = typeof body?.id === "string" ? body.id : "";
  const values = { owner_id: session.ownerId, objetivo: objective, template_id: templateId, subject_type: objective === "PROMOVER_EMPREENDIMENTO" ? "DEVELOPMENT" as const : "PROPERTY" as const, subject_id: propertyId, formato: format as "SQUARE" | "PORTRAIT" | "VERTICAL", payload };
  const result = draftId
    ? await session.admin.from("creative_drafts").update(values).eq("id", draftId).eq("owner_id", session.ownerId).select("id,updated_at").single()
    : await session.admin.from("creative_drafts").insert(values).select("id,updated_at").single();
  if (result.error) return NextResponse.json({ ok: false, error: { message: result.error.message } }, { status: 500 });
  return NextResponse.json({ ok: true, data: result.data }, { status: draftId ? 200 : 201 });
}
