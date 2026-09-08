import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyRow = Record<string, unknown>;
type DynamicQuery = {
  select: (columns: string) => DynamicQuery;
  eq: (column: string, value: unknown) => DynamicQuery;
  gte: (column: string, value: unknown) => DynamicQuery;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQuery;
  range: (from: number, to: number) => PromiseLike<{ data: AnyRow[] | null; error: { message: string } | null }>;
};
type DynamicDb = { from: (table: string) => DynamicQuery };

const PAGE_SIZE = 1000;
const VALID_DAYS = new Set([7, 30, 90, 180]);

async function allRows(db: DynamicDb, table: string, ownerId: string, dateColumn: string, since: string) {
  const rows: AnyRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await db.from(table).select("*").eq("owner_id", ownerId).gte(dateColumn, since)
      .order(dateColumn, { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function string(row: AnyRow, key: string, fallback = "") { return typeof row[key] === "string" ? row[key] as string : fallback; }
function labelChannel(channel: string) {
  return ({ DIRECT: "Direto", ORGANIC_SEARCH: "Busca orgânica", PAID_SEARCH: "Busca paga", ORGANIC_SOCIAL: "Social orgânico", PAID_SOCIAL: "Social pago", EMAIL: "E-mail", REFERRAL: "Referência", OTHER: "Outros" } as Record<string, string>)[channel] ?? channel;
}

export async function GET(request: Request) {
  const token = getBearerTokenFromRequest(request);
  if (!token) return NextResponse.json({ ok: false, error: { message: "Sessão ausente" } }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const auth = await admin.auth.getUser(token);
  if (!auth.data.user) return NextResponse.json({ ok: false, error: { message: "Sessão inválida" } }, { status: 401 });
  const ownerId = auth.data.user.id;
  const requestedDays = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const days = VALID_DAYS.has(requestedDays) ? requestedDays : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    const db = admin as unknown as DynamicDb;
    const [events, touchpoints, attributions] = await Promise.all([
      allRows(db, "public_events", ownerId, "occurred_at", since),
      allRows(db, "marketing_touchpoints", ownerId, "occurred_at", since),
      allRows(db, "lead_attributions", ownerId, "converted_at", since),
    ]);
    const views = events.filter((item) => item.event_type === "VIEW");
    const visitors = new Set(views.map((item) => string(item, "visitor_id")).filter(Boolean));
    const sessions = new Set(events.map((item) => string(item, "session_id")).filter(Boolean));
    const conversions = attributions.length;
    const assistedIds = new Set(attributions.flatMap((item) => Array.isArray(item.assisted_touch_ids) ? item.assisted_touch_ids.filter((id): id is string => typeof id === "string") : []));
    const firstIds = new Set(attributions.map((item) => string(item, "first_touch_id")).filter(Boolean));
    const lastIds = new Set(attributions.map((item) => string(item, "last_non_direct_touch_id") || string(item, "last_touch_id")).filter(Boolean));

    const group = new Map<string, { key: string; label: string; visitors: Set<string>; sessions: Set<string>; touches: number; first: number; last: number; assisted: number }>();
    function add(key: string, label: string, item: AnyRow) {
      const current = group.get(key) ?? { key, label, visitors: new Set<string>(), sessions: new Set<string>(), touches: 0, first: 0, last: 0, assisted: 0 };
      current.visitors.add(string(item, "visitor_id")); current.sessions.add(string(item, "session_id")); current.touches += 1;
      const id = string(item, "id"); if (firstIds.has(id)) current.first += 1; if (lastIds.has(id)) current.last += 1; if (assistedIds.has(id)) current.assisted += 1;
      group.set(key, current);
    }
    touchpoints.forEach((item) => add(`channel:${string(item, "channel", "OTHER")}`, labelChannel(string(item, "channel", "OTHER")), item));
    const channels = [...group.values()].map((item) => ({ key: item.key, label: item.label, visitors: item.visitors.size, sessions: item.sessions.size, touchpoints: item.touches, first_touch_leads: item.first, attributed_leads: item.last, assisted_leads: item.assisted })).sort((a, b) => b.attributed_leads - a.attributed_leads || b.sessions - a.sessions);

    group.clear();
    touchpoints.forEach((item) => { const source = string(item, "source") || labelChannel(string(item, "channel", "OTHER")); const campaign = string(item, "campaign") || "Sem campanha"; add(`campaign:${source}:${campaign}`, `${source} · ${campaign}`, item); });
    const campaigns = [...group.values()].map((item) => ({ key: item.key, label: item.label, visitors: item.visitors.size, sessions: item.sessions.size, first_touch_leads: item.first, attributed_leads: item.last, assisted_leads: item.assisted })).sort((a, b) => b.attributed_leads - a.attributed_leads || b.sessions - a.sessions).slice(0, 20);

    const resourceMap = new Map<string, { type: string; views: number; visitors: Set<string>; conversions: number }>();
    events.forEach((item) => { const type = string(item, "resource_type", "OTHER"); const current = resourceMap.get(type) ?? { type, views: 0, visitors: new Set<string>(), conversions: 0 }; if (item.event_type === "VIEW") { current.views += 1; current.visitors.add(string(item, "visitor_id")); } if (item.event_type === "FORM_SUBMIT") current.conversions += 1; resourceMap.set(type, current); });
    const resourceLabels: Record<string, string> = { PROFILE: "Perfil", PROPERTY: "Imóveis", DEVELOPMENT: "Empreendimentos", ARTICLE: "Artigos", LANDING_PAGE: "Páginas de captura" };
    const resources = [...resourceMap.values()].map((item) => ({ type: item.type, label: resourceLabels[item.type] ?? item.type, views: item.views, visitors: item.visitors.size, conversions: item.conversions })).sort((a, b) => b.views - a.views);
    const avgDays = conversions ? Math.round(attributions.reduce((sum, item) => sum + Number(item.days_to_convert ?? 0), 0) / conversions) : 0;

    return NextResponse.json({ ok: true, data: { period_days: days, summary: { visitors: visitors.size, sessions: sessions.size, views: views.length, conversions, conversion_rate: visitors.size ? Math.round((conversions / visitors.size) * 1000) / 10 : 0, assisted_conversions: attributions.filter((item) => Array.isArray(item.assisted_touch_ids) && item.assisted_touch_ids.length > 0).length, average_days_to_convert: avgDays }, channels, campaigns, resources } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : "Falha ao gerar relatório" } }, { status: 500 });
  }
}
