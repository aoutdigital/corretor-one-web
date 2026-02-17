import { NextResponse } from "next/server";

import { statusFromErrorCode } from "@/lib/api/result";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { authenticatePortalUser } from "@/lib/db/portal-auth";
import { getBearerTokenFromRequest } from "@/lib/http/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  const accessToken = getBearerTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
      { status: 401 },
    );
  }

  const auth = await authenticatePortalUser(accessToken);
  if (!auth.ok) {
    return NextResponse.json(auth, { status: statusFromErrorCode(auth.error.code) });
  }

  const { id } = await params;
  const db = auth.data.client as unknown as DynamicClient;
  const result = await db
    .from("user_favoritos")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.data.userId)
    .select("id")
    .maybeSingle();

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { code: "DATABASE_ERROR", message: result.error.message } },
      { status: 500 },
    );
  }
  if (!result.data) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Favorito not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}

