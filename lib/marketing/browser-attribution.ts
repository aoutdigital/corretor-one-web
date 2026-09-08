import { getAccessToken } from "@/lib/client/auth-api";
import type { PublicEventType, PublicResourceType } from "@/lib/marketing/attribution";

const VISITOR_KEY = "co_marketing_visitor";
const SESSION_KEY = "co_marketing_session";
const SESSION_TTL = 30 * 60 * 1000;

type SessionState = { id: string; lastActivityAt: number };

function uuid() { return crypto.randomUUID(); }
function visitorId() { let id = localStorage.getItem(VISITOR_KEY); if (!id) { id = uuid(); localStorage.setItem(VISITOR_KEY, id); } return id; }
function sessionId() {
  const now = Date.now();
  let state: SessionState | null = null;
  try { state = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as SessionState | null; } catch { state = null; }
  if (!state || !state.id || now - state.lastActivityAt > SESSION_TTL) state = { id: uuid(), lastActivityAt: now };
  else state.lastActivityAt = now;
  localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  return state.id;
}

export function getBrowserAttributionContext() {
  const params = new URLSearchParams(window.location.search);
  const clickIds = Object.fromEntries(["gclid", "fbclid", "msclkid", "ttclid"].map((key) => [key, params.get(key)]).filter((entry): entry is [string, string] => Boolean(entry[1])));
  return {
    visitor_id: visitorId(), session_id: sessionId(), page_url: window.location.href, referrer: document.referrer || null,
    source: params.get("utm_source"), medium: params.get("utm_medium"), campaign: params.get("utm_campaign"),
    content: params.get("utm_content"), term: params.get("utm_term"), click_ids: clickIds,
  };
}

export async function trackPublicEvent(resourceType: PublicResourceType, resourceId: string, eventType: PublicEventType, metadata: Record<string, unknown> = {}) {
  if (new URLSearchParams(window.location.search).has("preview")) return;
  const token = await getAccessToken();
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  await fetch("/api/public/analytics/events", { method: "POST", headers, keepalive: true, body: JSON.stringify({ resource_type: resourceType, resource_id: resourceId, event_type: eventType, ...getBrowserAttributionContext(), metadata }) });
}
