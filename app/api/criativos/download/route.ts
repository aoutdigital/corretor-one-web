import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const token = getBearerTokenFromRequest(request);
  if (!token)
    return NextResponse.json(
      { ok: false, error: { message: "Sessão inválida." } },
      { status: 401 },
    );

  const admin = createSupabaseAdminClient();
  const auth = await admin.auth.getUser(token);
  const ownerId = auth.data.user?.id;
  if (!ownerId)
    return NextResponse.json(
      { ok: false, error: { message: "Sessão inválida." } },
      { status: 401 },
    );

  const params = new URL(request.url).searchParams;
  const postId = params.get("post") ?? "";
  const requestedIndex = Number(params.get("slide") ?? "0");
  const slideIndex = Number.isInteger(requestedIndex)
    ? Math.max(0, requestedIndex)
    : 0;
  if (!postId)
    return NextResponse.json(
      { ok: false, error: { message: "Criativo não informado." } },
      { status: 400 },
    );

  const result = await admin
    .from("posts")
    .select("id,resultado_url,resultado_urls,status")
    .eq("id", postId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (result.error || !result.data || result.data.status !== "PRONTO")
    return NextResponse.json(
      { ok: false, error: { message: "Criativo indisponível." } },
      { status: 404 },
    );

  const urls = result.data.resultado_urls?.length
    ? result.data.resultado_urls
    : result.data.resultado_url
      ? [result.data.resultado_url]
      : [];
  const url = urls[slideIndex];
  if (!url)
    return NextResponse.json(
      { ok: false, error: { message: "Arquivo indisponível." } },
      { status: 404 },
    );

  const source = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!source.ok)
    return NextResponse.json(
      { ok: false, error: { message: "Não foi possível baixar o arquivo." } },
      { status: 502 },
    );

  const filename = urls.length > 1
    ? `criativo-${postId}-slide-${slideIndex + 1}.png`
    : `criativo-${postId}.png`;
  return new Response(await source.arrayBuffer(), {
    headers: {
      "Content-Type": source.headers.get("content-type") ?? "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
