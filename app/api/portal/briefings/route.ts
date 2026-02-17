import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { authenticatePortalUser } from "@/lib/db/portal-auth";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const auth = await authenticatePortalUser(accessToken);
  if (!auth.ok) {
    return NextResponse.json(auth, { status: statusFromErrorCode(auth.error.code) });
  }

  const db = auth.data.client as unknown as DynamicClient;
  const result = await db
    .from("user_briefings")
    .select("*")
    .eq("user_id", auth.data.userId)
    .order("updated_at", { ascending: false });

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: result.error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: result.data ?? [] });
}

export async function POST(request: Request) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) return unauthorizedResponse();

  const auth = await authenticatePortalUser(accessToken);
  if (!auth.ok) {
    return NextResponse.json(auth, { status: statusFromErrorCode(auth.error.code) });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Body must be an object" } },
      { status: 400 },
    );
  }

  const payload = { ...(body as Record<string, unknown>), user_id: auth.data.userId };

  const db = auth.data.client as unknown as DynamicClient;
  const result = await db.from("user_briefings").insert(payload).select("id").single();

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: result.error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
}
