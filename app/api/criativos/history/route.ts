import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZES = new Set([10, 20, 50]);

export async function GET(request: Request) {
  const token = getBearerTokenFromRequest(request);
  if (!token)
    return NextResponse.json({ ok: false, error: { message: "Sessão inválida" } }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const auth = await admin.auth.getUser(token);
  const ownerId = auth.data.user?.id;
  if (!ownerId)
    return NextResponse.json({ ok: false, error: { message: "Sessão inválida" } }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const requestedSize = Number.parseInt(params.get("page_size") ?? "10", 10);
  const pageSize = PAGE_SIZES.has(requestedSize) ? requestedSize : 10;
  const objective = params.get("objective");
  const ascending = params.get("order") === "oldest";
  const search = (params.get("search") ?? "")
    .replace(/[%_,().]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  let query = admin
    .from("posts")
    .select(
      "id,subject_type,subject_id,template_id,formato,status,resultado_url,resultado_urls,payload,erro,created_at",
      { count: "exact" },
    )
    .eq("owner_id", ownerId)
    .eq("status", "PRONTO");

  if (objective === "PROPERTY" || objective === "DEVELOPMENT" || objective === "PROFILE")
    query = query.eq("subject_type", objective);
  if (search) {
    const value = `%${search}%`;
    query = query.or(
      [
        `payload->property->>title.ilike.${value}`,
        `payload->property->>code.ilike.${value}`,
        `payload->property->>location.ilike.${value}`,
        `payload->development->>name.ilike.${value}`,
      ].join(","),
    );
  }

  const from = (page - 1) * pageSize;
  const result = await query
    .order("created_at", { ascending })
    .range(from, from + pageSize - 1);

  if (result.error)
    return NextResponse.json({ ok: false, error: { message: result.error.message } }, { status: 500 });

  const total = result.count ?? 0;
  return NextResponse.json({
    ok: true,
    data: {
      items: result.data ?? [],
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}
