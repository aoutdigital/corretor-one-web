import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { mapDbError } from "@/lib/db/_errors";
import { createMediaStorageProvider } from "@/lib/media";

type MidiaTipo = "IMAGEM" | "VIDEO" | "PDF";
type RefTipo = "IMOVEL" | "EMPREENDIMENTO" | "ARTIGO" | "CAMPANHA" | "TEMPLATE" | "OUTRO";

export type UploadMidiaInput = {
  file: File;
  ref_tipo?: RefTipo;
  ref_id?: string;
  grupo?: string | null;
  ordem?: number;
  titulo?: string | null;
  alt?: string | null;
  legenda?: string | null;
};

export type UploadMidiaResult = {
  id: string;
  owner_id: string;
  url: string;
  storage_bucket: string;
  storage_path: string;
  tipo: MidiaTipo;
};

function getBucketName(): string {
  return process.env.MEDIA_BUCKET_NAME ?? "midia";
}

function detectMidiaTipo(mimeType: string): MidiaTipo {
  if (mimeType.startsWith("image/")) return "IMAGEM";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "PDF";
}

function buildStoragePath(ownerId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${ownerId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

export async function uploadMidia(
  accessToken: string,
  input: UploadMidiaInput,
): Promise<ApiResult<UploadMidiaResult>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const bucket = getBucketName();
  const storagePath = buildStoragePath(user.id, input.file.name || "arquivo");
  const tipo = detectMidiaTipo(input.file.type || "application/pdf");

  let uploaded: { publicUrl: string; path: string; bucket: string; size: number | null };
  try {
    const storage = createMediaStorageProvider();
    uploaded = await storage.upload({
      bucket,
      path: storagePath,
      file: input.file,
      contentType: input.file.type,
    });
  } catch (error) {
    return fail("DATABASE_ERROR", "Upload failed", { message: (error as Error).message });
  }

  const midiaInsert = await db
    .from("midia")
    .insert({
      owner_id: user.id,
      tipo,
      storage_provider: "SUPABASE",
      storage_bucket: uploaded.bucket,
      storage_path: uploaded.path,
      url: uploaded.publicUrl,
      tamanho_bytes: uploaded.size,
      titulo: input.titulo ?? null,
      alt: input.alt ?? null,
      legenda: input.legenda ?? null,
    })
    .select("id, owner_id, url, storage_bucket, storage_path, tipo")
    .single();

  if (midiaInsert.error) return mapDbError(midiaInsert.error);
  if (!midiaInsert.data) return fail("DATABASE_ERROR", "Media insert returned no data");

  if (input.ref_tipo && input.ref_id) {
    const relInsert = await db
      .from("midia_relacoes")
      .insert({
        owner_id: user.id,
        ref_tipo: input.ref_tipo,
        ref_id: input.ref_id,
        midia_id: midiaInsert.data.id,
        grupo: input.grupo ?? null,
        ordem: input.ordem ?? 0,
      })
      .select("id")
      .single();
    if (relInsert.error) return mapDbError(relInsert.error);
  }

  return ok(midiaInsert.data as UploadMidiaResult);
}
