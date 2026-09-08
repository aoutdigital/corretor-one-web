"use client";

import { useEffect } from "react";

import { trackPublicEvent } from "@/lib/marketing/browser-attribution";
import type { PublicResourceType } from "@/lib/marketing/attribution";

export function PublicAnalytics({ resourceType, resourceId }: { resourceType: PublicResourceType; resourceId: string }) {
  useEffect(() => { void trackPublicEvent(resourceType, resourceId, "VIEW").catch(() => undefined); }, [resourceId, resourceType]);
  return null;
}
