import { NextResponse } from "next/server";
import sharp from "sharp";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; tipoId: string; midiaId: string }> };
type PlantResult = { data: { midia_id: string } | null; error: { message: string } | null };
type PlantQuery = PromiseLike<PlantResult> & { select(columns: string): PlantQuery; eq(column: string, value: string): PlantQuery; maybeSingle(): PromiseLike<PlantResult> };

export async function GET(_request: Request, { params }: Params) {
  const { id, tipoId, midiaId } = await params;
  const admin = createSupabaseAdminClient();
  const plantDb = admin as unknown as { from(table: string): PlantQuery };

  const [development, plant] = await Promise.all([
    admin.from("empreendimentos").select("id,owner_id").eq("id", id).eq("status", "PUBLICADO").maybeSingle(),
    plantDb.from("empreendimento_tipos_plantas").select("midia_id").eq("empreendimento_id", id)
      .eq("empreendimento_tipo_id", tipoId).eq("midia_id", midiaId).maybeSingle(),
  ]);
  if (development.error || plant.error) return NextResponse.json({ ok: false }, { status: 500 });
  if (!development.data || !plant.data) return NextResponse.json({ ok: false }, { status: 404 });

  const profile = await admin.from("profiles").select("id").eq("id", development.data.owner_id).eq("status", "ATIVO").maybeSingle();
  if (!profile.data) return NextResponse.json({ ok: false }, { status: 404 });

  const [variant, media] = await Promise.all([
    admin.from("midia_variantes").select("storage_path").eq("midia_id", midiaId).eq("tipo", "W1024").maybeSingle(),
    admin.from("midia").select("storage_bucket,storage_path").eq("id", midiaId).eq("owner_id", development.data.owner_id).maybeSingle(),
  ]);
  const bucket = media.data?.storage_bucket;
  const path = variant.data?.storage_path ?? media.data?.storage_path;
  if (!bucket || !path) return NextResponse.json({ ok: false }, { status: 404 });

  const downloaded = await admin.storage.from(bucket).download(path);
  if (downloaded.error) return NextResponse.json({ ok: false }, { status: 404 });
  const source = Buffer.from(await downloaded.data.arrayBuffer());
  const bytes = variant.data
    ? source
    : await sharp(source, { failOn: "none" }).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
