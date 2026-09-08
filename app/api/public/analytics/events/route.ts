import { NextResponse } from "next/server";

import { recordPublicEvent, type AttributionContext, type PublicEventType, type PublicResourceType } from "@/lib/marketing/attribution";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const RESOURCE_TYPES = new Set<PublicResourceType>(["PROFILE", "PROPERTY", "DEVELOPMENT", "ARTICLE", "LANDING_PAGE"]);
const EVENT_TYPES = new Set<PublicEventType>(["VIEW", "FORM_START", "FORM_SUBMIT", "CTA_CLICK"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(input: unknown, max = 1500) { return typeof input === "string" ? input.trim().slice(0, max) || null : null; }
function object(input: unknown) { return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {}; }

async function resolveOwner(admin: ReturnType<typeof createSupabaseAdminClient>, type: PublicResourceType, id: string) {
  if (type === "PROFILE") {
    const result = await admin.from("profiles").select("id").eq("id", id).eq("status", "ATIVO").maybeSingle();
    return result.data?.id ?? null;
  }
  const table = type === "PROPERTY" ? "imoveis" : type === "DEVELOPMENT" ? "empreendimentos" : type === "ARTICLE" ? "artigos" : "landing_pages";
  type OwnerQuery = { select: (columns: string) => OwnerQuery; eq: (column: string, value: unknown) => OwnerQuery; not: (column: string, operator: string, value: unknown) => OwnerQuery; maybeSingle: () => PromiseLike<{ data: { owner_id: string } | null }> };
  const dynamicAdmin = admin as unknown as { from: (name: string) => OwnerQuery };
  let query = dynamicAdmin.from(table).select("owner_id").eq("id", id);
  if (type === "ARTICLE" || type === "LANDING_PAGE") query = query.eq("status", "PUBLICADO");
  else query = query.not("publicado_em", "is", null);
  const result = await query.maybeSingle();
  return result.data?.owner_id ?? null;
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const data = object(body);
  const resourceType = value(data.resource_type, 30) as PublicResourceType | null;
  const eventType = value(data.event_type, 30) as PublicEventType | null;
  const resourceId = value(data.resource_id, 40);
  const visitorId = value(data.visitor_id, 40);
  const sessionId = value(data.session_id, 40);
  if (!resourceType || !RESOURCE_TYPES.has(resourceType) || !eventType || !EVENT_TYPES.has(eventType) || !resourceId || !UUID.test(resourceId) || !visitorId || !UUID.test(visitorId) || !sessionId || !UUID.test(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const ownerId = await resolveOwner(admin, resourceType, resourceId);
  if (!ownerId) return NextResponse.json({ ok: false }, { status: 404 });

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const authenticated = await admin.auth.getUser(authorization.slice(7));
    if (authenticated.data.user?.id === ownerId) return NextResponse.json({ ok: true, data: { ignored: "owner" } });
  }

  const clickIdsRaw = object(data.click_ids);
  const clickIds = Object.fromEntries(Object.entries(clickIdsRaw).filter((entry): entry is [string, string] => typeof entry[1] === "string").map(([key, item]) => [key.slice(0, 30), item.slice(0, 300)]));
  const context: AttributionContext = { visitorId, sessionId, pageUrl: value(data.page_url), referrer: value(data.referrer), source: value(data.source, 200), medium: value(data.medium, 200), campaign: value(data.campaign, 300), content: value(data.content, 300), term: value(data.term, 300), clickIds };
  try {
    const result = await recordPublicEvent(admin, { ownerId, resourceType, resourceId, eventType, context, metadata: object(data.metadata) });
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
