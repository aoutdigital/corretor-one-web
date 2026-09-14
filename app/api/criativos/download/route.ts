import { NextResponse } from "next/server";

import { getBearerTokenFromRequest } from "@/lib/http/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files: Array<{ name: string; bytes: Uint8Array }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const u16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);
  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length + file.bytes.length);
    const localView = new DataView(local.buffer);
    u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u16(localView, 6, 0x0800);
    u16(localView, 8, 0); u32(localView, 14, checksum); u32(localView, 18, file.bytes.length);
    u32(localView, 22, file.bytes.length); u16(localView, 26, name.length);
    local.set(name, 30); local.set(file.bytes, 30 + name.length); localParts.push(local);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    u32(centralView, 0, 0x02014b50); u16(centralView, 4, 20); u16(centralView, 6, 20);
    u16(centralView, 8, 0x0800); u16(centralView, 10, 0); u32(centralView, 16, checksum);
    u32(centralView, 20, file.bytes.length); u32(centralView, 24, file.bytes.length);
    u16(centralView, 28, name.length); u32(centralView, 42, offset); central.set(name, 46);
    centralParts.push(central); offset += local.length;
  }
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22); const endView = new DataView(end.buffer);
  u32(endView, 0, 0x06054b50); u16(endView, 8, files.length); u16(endView, 10, files.length);
  u32(endView, 12, centralSize); u32(endView, 16, offset);
  const output = new Uint8Array(offset + centralSize + end.length); let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) { output.set(part, cursor); cursor += part.length; }
  return output;
}

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
  const downloadAll = params.get("all") === "1";
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

  if (downloadAll && urls.length > 1) {
    const sources = await Promise.all(
      urls.map((item) => fetch(item, { signal: AbortSignal.timeout(20_000) })),
    );
    if (sources.some((source) => !source.ok))
      return NextResponse.json(
        { ok: false, error: { message: "Não foi possível baixar todos os slides." } },
        { status: 502 },
      );
    const archive = zipFiles(
      await Promise.all(
        sources.map(async (source, index) => ({
          name: `slide-${String(index + 1).padStart(2, "0")}.png`,
          bytes: new Uint8Array(await source.arrayBuffer()),
        })),
      ),
    );
    return new Response(archive, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="criativo-${postId}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

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
