import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

export const ATTRIBUTION_WINDOW_DAYS = 180;

export type PublicResourceType = "PROFILE" | "PROPERTY" | "DEVELOPMENT" | "ARTICLE" | "LANDING_PAGE";
export type PublicEventType = "VIEW" | "FORM_START" | "FORM_SUBMIT" | "CTA_CLICK";
export type MarketingChannel = "DIRECT" | "ORGANIC_SEARCH" | "PAID_SEARCH" | "ORGANIC_SOCIAL" | "PAID_SOCIAL" | "EMAIL" | "REFERRAL" | "OTHER";

export type AttributionContext = {
  visitorId: string;
  sessionId: string;
  pageUrl?: string | null;
  referrer?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  clickIds?: Record<string, string>;
};

type AdminClient = SupabaseClient<Database>;

function clean(value: string | null | undefined, max = 500) {
  const normalized = value?.trim().slice(0, max);
  return normalized || null;
}

function host(value: string | null | undefined) {
  try { return value ? new URL(value).hostname.toLowerCase().replace(/^www\./, "") : ""; } catch { return ""; }
}

export function classifyChannel(context: AttributionContext): MarketingChannel {
  const source = clean(context.source)?.toLowerCase() ?? "";
  const medium = clean(context.medium)?.toLowerCase() ?? "";
  const pageHost = host(context.pageUrl);
  const detectedReferrerHost = host(context.referrer);
  const referrerHost = detectedReferrerHost && detectedReferrerHost !== pageHost ? detectedReferrerHost : "";
  const clickIds = context.clickIds ?? {};
  if (clickIds.gclid || clickIds.msclkid || /cpc|ppc|paidsearch/.test(medium)) return "PAID_SEARCH";
  if (clickIds.fbclid || /paid[_-]?social|social[_-]?paid/.test(medium)) return "PAID_SOCIAL";
  if (/email|newsletter/.test(medium)) return "EMAIL";
  if (/organic/.test(medium) || /google|bing|yahoo|duckduckgo/.test(source || referrerHost)) return "ORGANIC_SEARCH";
  if (/social/.test(medium) || /instagram|facebook|linkedin|tiktok|pinterest|twitter|x\.com/.test(source || referrerHost)) return "ORGANIC_SOCIAL";
  if (source || medium || referrerHost) return "REFERRAL";
  return "DIRECT";
}

function sameAcquisition(left: Record<string, unknown>, context: AttributionContext, channel: MarketingChannel) {
  return left.channel === channel && (left.source ?? null) === clean(context.source, 200) &&
    (left.medium ?? null) === clean(context.medium, 200) && (left.campaign ?? null) === clean(context.campaign, 300);
}

export async function recordPublicEvent(admin: AdminClient, input: {
  ownerId: string;
  resourceType: PublicResourceType;
  resourceId?: string | null;
  eventType: PublicEventType;
  context: AttributionContext;
  metadata?: Record<string, unknown>;
}) {
  const { context } = input;
  const channel = classifyChannel(context);
  const existing = await admin.from("marketing_touchpoints").select("*").eq("owner_id", input.ownerId)
    .eq("session_id", context.sessionId).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
  if (existing.error) throw existing.error;

  let touchpoint = existing.data as Record<string, unknown> | null;
  const newExternalAcquisition = channel !== "DIRECT" && touchpoint && !sameAcquisition(touchpoint, context, channel);
  if (!touchpoint || newExternalAcquisition) {
    const created = await admin.from("marketing_touchpoints").insert({
      owner_id: input.ownerId, visitor_id: context.visitorId, session_id: context.sessionId,
      resource_type: input.resourceType, resource_id: input.resourceId ?? null, channel,
      source: clean(context.source, 200), medium: clean(context.medium, 200), campaign: clean(context.campaign, 300),
      content: clean(context.content, 300), term: clean(context.term, 300), click_ids: (context.clickIds ?? {}) as Json,
      landing_url: clean(context.pageUrl, 1500), referrer: clean(context.referrer, 1500), is_direct: channel === "DIRECT",
    }).select("*").single();
    if (created.error) throw created.error;
    touchpoint = created.data as Record<string, unknown>;
  }

  const createdEvent = await admin.from("public_events").insert({
    owner_id: input.ownerId, visitor_id: context.visitorId, session_id: context.sessionId,
    touchpoint_id: String(touchpoint.id), resource_type: input.resourceType, resource_id: input.resourceId ?? null,
    event_type: input.eventType, page_url: clean(context.pageUrl, 1500), metadata: (input.metadata ?? {}) as Json,
  }).select("id").single();
  if (createdEvent.error) throw createdEvent.error;
  return { eventId: createdEvent.data.id, touchpointId: String(touchpoint.id) };
}

export async function snapshotLeadAttribution(admin: AdminClient, input: {
  ownerId: string; leadId: string; conversionEventId: string; visitorId: string; convertedAt?: Date;
}) {
  const convertedAt = input.convertedAt ?? new Date();
  const since = new Date(convertedAt.getTime() - ATTRIBUTION_WINDOW_DAYS * 86400000).toISOString();
  const [touchpointsResult, eventsResult] = await Promise.all([
    admin.from("marketing_touchpoints").select("*").eq("owner_id", input.ownerId).eq("visitor_id", input.visitorId)
      .gte("occurred_at", since).lte("occurred_at", convertedAt.toISOString()).order("occurred_at", { ascending: true }),
    admin.from("public_events").select("id,session_id,resource_type,resource_id,event_type,page_url,occurred_at")
      .eq("owner_id", input.ownerId).eq("visitor_id", input.visitorId).gte("occurred_at", since)
      .lte("occurred_at", convertedAt.toISOString()).order("occurred_at", { ascending: true }),
  ]);
  if (touchpointsResult.error) throw touchpointsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  const touchpoints = touchpointsResult.data ?? [];
  const events = eventsResult.data ?? [];
  const first = touchpoints[0] ?? null;
  const last = touchpoints.at(-1) ?? null;
  const lastNonDirect = [...touchpoints].reverse().find((item) => !item.is_direct) ?? null;
  const assisted = touchpoints.filter((item) => item.id !== lastNonDirect?.id && item.id !== last?.id).map((item) => item.id);
  const sessions = new Set(events.map((item) => item.session_id));
  const days = first ? Math.max(0, Math.floor((convertedAt.getTime() - new Date(first.occurred_at).getTime()) / 86400000)) : 0;
  const snapshot = { version: 1, first_touch: first, last_touch: last, last_non_direct_touch: lastNonDirect, assisted_touchpoints: touchpoints.filter((item) => assisted.includes(item.id)), content_path: events };

  const saved = await admin.from("lead_attributions").upsert({
    owner_id: input.ownerId, lead_id: input.leadId, conversion_event_id: input.conversionEventId,
    first_touch_id: first?.id ?? null, last_touch_id: last?.id ?? null, last_non_direct_touch_id: lastNonDirect?.id ?? null,
    assisted_touch_ids: assisted, sessions_count: sessions.size, touchpoints_count: touchpoints.length,
    days_to_convert: days, attribution_window_days: ATTRIBUTION_WINDOW_DAYS, snapshot: snapshot as Json,
    converted_at: convertedAt.toISOString(),
  }, { onConflict: "lead_id" });
  if (saved.error) throw saved.error;
}
