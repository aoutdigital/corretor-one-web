import { fail, ok, type ApiResult } from "@/lib/api/result";
import sharp from "sharp";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { mapDbError } from "@/lib/db/_errors";
import { ensureProfileNicknameLogos } from "@/lib/branding/profile-logo";
import { createMediaStorageProvider } from "@/lib/media";
import { processMidiaDeleteJobs } from "@/lib/db/midia-delete-jobs";
import { renderCornerWatermarkedImage, renderWatermarkedPublicWebp } from "@/lib/media/watermark";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MidiaTipo = "IMAGEM" | "VIDEO" | "PDF";
type RefTipo = "IMOVEL" | "EMPREENDIMENTO" | "EMPREENDIMENTO_TIPO_PLANTA" | "PROVA_SOCIAL" | "ARTIGO" | "CAMPANHA" | "TEMPLATE" | "OUTRO";
type MidiaStorageProvider = "SUPABASE" | "S3";
const IMOVEL_PUBLIC_WATERMARK_VERSION = "v4-responsive";
const EMPREENDIMENTO_PUBLIC_WATERMARK_VERSION = "v4-responsive";
const PROPERTY_MEDIA_CONTRACT_REFS = new Set<RefTipo>([
  "IMOVEL",
  "EMPREENDIMENTO",
  "EMPREENDIMENTO_TIPO_PLANTA",
]);
const PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 60;

type ResponsiveImageVariantKey = "W480" | "W768" | "W1024" | "FULL_1920";
type ResponsiveImageVariant = {
  url: string;
  storage_path: string;
  largura: number;
  altura: number;
  formato: "webp";
};
type ResponsiveImageVariants = Partial<Record<ResponsiveImageVariantKey, ResponsiveImageVariant>>;

const RESPONSIVE_IMAGE_WIDTHS: ReadonlyArray<{ tipo: ResponsiveImageVariantKey; width: number }> = [
  { tipo: "W480", width: 480 },
  { tipo: "W768", width: 768 },
  { tipo: "W1024", width: 1024 },
  { tipo: "FULL_1920", width: 1920 },
];

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

export type UploadMidiaInput = {
  file: File;
  ref_tipo?: RefTipo;
  ref_id?: string;
  grupo?: string | null;
  ordem?: number;
  titulo?: string | null;
  alt?: string | null;
  legenda?: string | null;
  caracteristica?: string | null;
  skip_optimization?: boolean;
  apply_watermark?: boolean;
  filename_base?: string | null;
};

export type UploadMidiaResult = {
  id: string;
  owner_id: string;
  url: string;
  storage_bucket: string;
  storage_path: string;
  tipo: MidiaTipo;
};

export type MidiaRelacaoItem = {
  relacao_id: string;
  ordem: number;
  grupo: string | null;
  midia_id: string;
  tipo: MidiaTipo;
  url: string;
  storage_bucket: string;
  storage_path: string;
  tamanho_bytes: number | null;
  titulo: string | null;
  alt: string | null;
  legenda: string | null;
  caracteristica: string | null;
  created_at: string;
};

export type ImovelMidiaPublicaItem = {
  midia_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
  slug_publico: string;
  storage_bucket: string;
  storage_path: string;
  variantes: ResponsiveImageVariants;
};

export type EmpreendimentoMidiaPublicaItem = {
  midia_id: string;
  indice_publico: number;
  ordem: number;
  url: string;
  slug_publico: string;
  storage_bucket: string;
  storage_path: string;
  variantes: ResponsiveImageVariants;
};

type ImovelPublicMidiaAsset = {
  id: string;
  midia_relacao_id: string;
  midia_id: string;
  indice_publico: number;
  storage_bucket: string;
  storage_path: string;
  url: string;
  variantes?: ResponsiveImageVariants | null;
};

type EmpreendimentoPublicMidiaAsset = {
  id: string;
  midia_relacao_id: string;
  midia_id: string;
  indice_publico: number;
  storage_bucket: string;
  storage_path: string;
  url: string;
  variantes?: ResponsiveImageVariants | null;
};

export async function enqueueMidiaDeleteJob(
  db: unknown,
  ownerId: string,
  payload: {
    midiaId: string | null;
    storageProvider: MidiaStorageProvider;
    storageBucket: string;
    storagePath: string;
  },
): Promise<ApiResult<{ id: string }>> {
  const storageProvider = (payload.storageProvider ?? "SUPABASE").trim();
  const storageBucket = payload.storageBucket.trim();
  const storagePath = payload.storagePath.trim();
  if (!storageBucket || !storagePath) {
    return fail("VALIDATION_ERROR", "Storage bucket/path are required for delete job");
  }

  const upsertResult = await (db as unknown as {
    from: (table: "midia_delete_jobs") => {
      upsert: (
        values: Record<string, unknown>,
        options: { onConflict: string },
      ) => {
        select: (columns: "id") => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("midia_delete_jobs")
    .upsert(
      {
        owner_id: ownerId,
        midia_id: payload.midiaId,
        storage_provider: storageProvider,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        status: "PENDENTE",
        tentativas: 0,
        erro: null,
        next_retry_at: null,
        started_at: null,
        finished_at: null,
      },
      { onConflict: "storage_provider,storage_bucket,storage_path" },
    )
    .select("id")
    .single();

  if (upsertResult.error) return mapDbError(upsertResult.error);
  if (!upsertResult.data) return fail("DATABASE_ERROR", "Delete job insert returned no data");
  return ok({ id: upsertResult.data.id });
}

function getBucketName(): string {
  return process.env.MEDIA_BUCKET_NAME ?? "midia";
}

function getPrivateBucketName(): string {
  return process.env.MEDIA_PRIVATE_BUCKET_NAME ?? "midia-private";
}

function detectMidiaTipo(mimeType: string): MidiaTipo {
  if (mimeType.startsWith("image/")) return "IMAGEM";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "PDF";
}

function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\/+/, "").split("/")[0];
    return id ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? id : null;
    }
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2];
      return id ? id : null;
    }
  }

  return null;
}

async function assertOwnEmpreendimento(
  db: DynamicClient,
  ownerId: string,
  empreendimentoId: string,
): Promise<ApiResult<{ id: string }>> {
  const result = await db
    .from("empreendimentos")
    .select("id")
    .eq("id", empreendimentoId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Empreendimento not found");
  return ok({ id: result.data.id as string });
}

async function assertOwnImovel(
  db: DynamicClient,
  ownerId: string,
  imovelId: string,
): Promise<ApiResult<{ id: string }>> {
  const result = await db
    .from("imoveis")
    .select("id")
    .eq("id", imovelId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Imóvel not found");
  return ok({ id: result.data.id as string });
}

function buildStoragePath(ownerId: string, fileName: string, filenameBase?: string | null): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = safeName.includes(".") ? safeName.split(".").pop()?.toLowerCase() : "";
  const base = slugifyPathToken(filenameBase ?? "");
  const semanticName = base
    ? `${base}-${Date.now()}-${crypto.randomUUID()}${extension ? `.${extension}` : ""}`
    : `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  return `${ownerId}/${semanticName}`;
}

function buildDerivedImagePath(ownerId: string, folder: string, filenameBase: string | null | undefined, suffix: string): string {
  const base = slugifyPathToken(filenameBase ?? "");
  const semanticPrefix = base ? `${base}-` : "";
  return `${ownerId}/${folder}/${semanticPrefix}${Date.now()}-${crypto.randomUUID()}-${suffix}.jpg`;
}

function buildDerivedImageFileName(filenameBase: string | null | undefined, suffix: string): string {
  const base = slugifyPathToken(filenameBase ?? "");
  return `${base || "imagem"}-${suffix}.jpg`;
}

function buildPrivateVariantPath(ownerId: string, midiaId: string, tipo: ResponsiveImageVariantKey): string {
  return `${ownerId}/variants/${midiaId}/${tipo.toLowerCase()}.webp`;
}

function slugifyPathToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function buildImovelPublicImageStoragePath(
  ownerId: string,
  imovelId: string,
  midiaId: string,
  slugPublico: string,
  indicePublico: number,
  variant: ResponsiveImageVariantKey = "W1024",
): string {
  const normalizedSlug = slugifyPathToken(slugPublico.trim()) || "imovel";
  const normalizedIndex = String(indicePublico).padStart(4, "0");
  return `${ownerId}/public/imoveis/${imovelId}/${normalizedSlug}/${IMOVEL_PUBLIC_WATERMARK_VERSION}/${midiaId}/${normalizedSlug}-${normalizedIndex}-${variant.toLowerCase()}.webp`;
}

function buildEmpreendimentoPublicImageStoragePath(
  ownerId: string,
  empreendimentoId: string,
  midiaId: string,
  slugPublico: string,
  indicePublico: number,
  variant: ResponsiveImageVariantKey = "W1024",
): string {
  const normalizedSlug = slugifyPathToken(slugPublico.trim()) || "empreendimento";
  const normalizedIndex = String(indicePublico).padStart(4, "0");
  return `${ownerId}/public/empreendimentos/${empreendimentoId}/${normalizedSlug}/${EMPREENDIMENTO_PUBLIC_WATERMARK_VERSION}/${midiaId}/${normalizedSlug}-${normalizedIndex}-${variant.toLowerCase()}.webp`;
}

async function storageObjectExists(bucketRaw: string, pathRaw: string): Promise<boolean> {
  const bucket = bucketRaw.trim();
  const path = pathRaw.trim().replace(/^\/+/, "");
  if (!bucket || !path) return false;

  const parts = path.split("/").filter((segment) => segment.length > 0);
  const fileName = parts[parts.length - 1] ?? "";
  const folder = parts.slice(0, -1).join("/");
  if (!fileName) return false;

  try {
    const admin = createSupabaseAdminClient();
    const listResult = await admin.storage.from(bucket).list(folder, {
      limit: 100,
      search: fileName,
    });
    if (listResult.error) return false;
    return (listResult.data ?? []).some((item) => item.name === fileName);
  } catch {
    return false;
  }
}

async function createPrivateSignedUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    const result = await admin.storage
      .from(bucket)
      .createSignedUrl(path, PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS);
    return result.error ? null : result.data.signedUrl;
  } catch {
    return null;
  }
}

async function resolvePrivatePreviewUrls(db: DynamicClient, items: MidiaRelacaoItem[]): Promise<MidiaRelacaoItem[]> {
  const privateItems = items.filter(
    (item) => item.tipo === "IMAGEM" && item.storage_bucket === getPrivateBucketName(),
  );
  if (privateItems.length === 0) return items;

  const result = await (db as unknown as {
    from: (table: "midia_variantes") => {
      select: (columns: "midia_id,storage_path") => {
        in: (column: "midia_id", values: string[]) => {
          eq: (column2: "tipo", value: "W480") => Promise<{ data: Array<{ midia_id: string; storage_path: string }> | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("midia_variantes")
    .select("midia_id,storage_path")
    .in("midia_id", privateItems.map((item) => item.midia_id))
    .eq("tipo", "W480");

  const previewPathByMedia = new Map((result.data ?? []).map((row) => [row.midia_id, row.storage_path]));
  return Promise.all(items.map(async (item) => {
    if (item.tipo !== "IMAGEM" || item.storage_bucket !== getPrivateBucketName()) return item;
    const previewPath = previewPathByMedia.get(item.midia_id) ?? item.storage_path;
    return {
      ...item,
      url: (await createPrivateSignedUrl(item.storage_bucket, previewPath)) ?? item.url,
    };
  }));
}

async function removeStoragePaths(paths: Array<{ bucket: string; path: string }>): Promise<void> {
  if (paths.length === 0) return;
  const storage = createMediaStorageProvider();
  const uniquePaths = Array.from(
    new Map(
      paths.map((item) => {
        const bucket = item.bucket.trim();
        const path = item.path.trim().replace(/^\/+/, "");
        return [`${bucket}::${path}`, { bucket, path }];
      }),
    ).values(),
  );
  for (const item of uniquePaths) {
    const bucket = item.bucket.trim();
    const path = item.path.trim();
    if (!bucket || !path) continue;
    try {
      await storage.remove(bucket, path);
    } catch (error) {
      console.error("[imovel_midia_publica] falha ao remover asset antigo", {
        bucket,
        path,
        message: (error as Error).message,
      });
    }
  }
}

function getVariantStoragePaths(variants: ResponsiveImageVariants | null | undefined): string[] {
  if (!variants || typeof variants !== "object") return [];
  return Object.values(variants)
    .map((item) => item?.storage_path?.trim() ?? "")
    .filter(Boolean);
}

async function getPublicAssetPathsByRelation(
  db: DynamicClient,
  table: "imovel_midia_publica" | "empreendimento_midia_publica",
  relationId: string,
): Promise<ApiResult<Array<{ bucket: string; path: string }>>> {
  const result = await (db as unknown as {
    from: (tableName: "imovel_midia_publica" | "empreendimento_midia_publica") => {
      select: (columns: "storage_bucket,storage_path,variantes") => {
        eq: (column: "midia_relacao_id", value: string) => {
          maybeSingle: () => Promise<{
            data: { storage_bucket: string; storage_path: string; variantes: ResponsiveImageVariants | null } | null;
            error: { message: string; code?: string } | null;
          }>;
        };
      };
    };
  })
    .from(table)
    .select("storage_bucket,storage_path,variantes")
    .eq("midia_relacao_id", relationId)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return ok([]);

  const paths = [result.data.storage_path, ...getVariantStoragePaths(result.data.variantes)];
  return ok(paths.map((path) => ({ bucket: result.data!.storage_bucket, path })));
}

function hasAllPublicResponsiveVariants(variants: ResponsiveImageVariants | null | undefined): boolean {
  return RESPONSIVE_IMAGE_WIDTHS.every((variant) => {
    const item = variants?.[variant.tipo];
    return Boolean(item?.url?.trim() && item.storage_path?.trim());
  });
}

async function generatePublicResponsiveImages(input: {
  source: Buffer;
  nickname: string | null;
  logoPngBuffer: Buffer | null;
  bucket: string;
  fileBase: string;
  pathFor: (variant: ResponsiveImageVariantKey) => string;
}): Promise<ApiResult<{ url: string; storagePath: string; variantes: ResponsiveImageVariants }>> {
  const storage = createMediaStorageProvider();
  const variantes: ResponsiveImageVariants = {};

  for (const variant of RESPONSIVE_IMAGE_WIDTHS) {
    let rendered: Awaited<ReturnType<typeof renderWatermarkedPublicWebp>>;
    try {
      rendered = await renderWatermarkedPublicWebp(input.source, {
        nickname: input.nickname,
        logoPngBuffer: input.logoPngBuffer,
        width: variant.width,
      });
    } catch (error) {
      return fail("DATABASE_ERROR", `Falha ao gerar derivado público ${variant.tipo}.`, {
        message: (error as Error).message,
      });
    }

    const storagePath = input.pathFor(variant.tipo);
    try {
      const uploaded = await storage.upload({
        bucket: input.bucket,
        path: storagePath,
        file: new File([bufferToArrayBuffer(rendered.buffer)], `${input.fileBase}-${variant.tipo.toLowerCase()}.webp`, {
          type: "image/webp",
        }),
        contentType: "image/webp",
        upsert: true,
      });
      variantes[variant.tipo] = {
        url: uploaded.publicUrl,
        storage_path: uploaded.path,
        largura: rendered.width,
        altura: rendered.height,
        formato: "webp",
      };
    } catch (error) {
      return fail("DATABASE_ERROR", `Falha ao salvar derivado público ${variant.tipo}.`, {
        message: (error as Error).message,
      });
    }
  }

  const fallback = variantes.W480 ?? variantes.W1024 ?? variantes.FULL_1920;
  if (!fallback) return fail("DATABASE_ERROR", "Derivado público principal não foi gerado.");
  return ok({ url: fallback.url, storagePath: fallback.storage_path, variantes });
}

async function fetchSourceImageBuffer(input: {
  storageProvider: MidiaStorageProvider;
  storageBucket: string;
  storagePath: string;
  url: string;
}): Promise<ApiResult<Buffer>> {
  const bucket = input.storageBucket.trim();
  const path = input.storagePath.trim();
  const isSupabaseStored =
    input.storageProvider === "SUPABASE" && bucket.length > 0 && path.length > 0 && !path.startsWith("youtube:");

  if (isSupabaseStored) {
    try {
      const admin = createSupabaseAdminClient();
      const downloadResult = await admin.storage.from(bucket).download(path);
      if (!downloadResult.error && downloadResult.data) {
        const bytes = await downloadResult.data.arrayBuffer();
        if (bytes.byteLength > 0) return ok(Buffer.from(bytes));
      }
    } catch {
      // fallback para URL
    }
  }

  const sourceUrl = input.url.trim();
  if (!sourceUrl) {
    return fail("VALIDATION_ERROR", "Mídia sem URL de origem para gerar versão pública.");
  }

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return fail("DATABASE_ERROR", "Falha ao baixar imagem para marca d'água", {
        status: response.status,
      });
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) {
      return fail("DATABASE_ERROR", "Imagem de origem vazia para marca d'água.");
    }
    return ok(Buffer.from(bytes));
  } catch (error) {
    return fail("DATABASE_ERROR", "Falha ao baixar imagem para marca d'água", {
      message: (error as Error).message,
    });
  }
}

async function fetchPublicImageBuffer(urlRaw: string): Promise<ApiResult<Buffer>> {
  const url = urlRaw.trim();
  if (!url) {
    return fail("VALIDATION_ERROR", "URL pública da logo não informada.");
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return fail("DATABASE_ERROR", "Falha ao baixar logo pública para marca d'água.", {
        status: response.status,
      });
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) {
      return fail("DATABASE_ERROR", "Logo pública vazia para marca d'água.");
    }
    return ok(Buffer.from(bytes));
  } catch (error) {
    return fail("DATABASE_ERROR", "Falha ao baixar logo pública para marca d'água.", {
      message: (error as Error).message,
    });
  }
}

async function clearImovelPublicMidiaAssets(
  db: DynamicClient,
  ownerId: string,
  imovelId: string,
): Promise<ApiResult<{ total: number }>> {
  const existingResult = await (db as unknown as {
    from: (table: "imovel_midia_publica") => {
      select: (columns: "id,storage_bucket,storage_path,variantes") => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "imovel_id",
            value2: string,
          ) => Promise<{
            data: Array<{ id: string; storage_bucket: string; storage_path: string; variantes?: ResponsiveImageVariants | null }> | null;
            error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
          }>;
        };
      };
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "imovel_id", value2: string) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
        };
      };
    };
  })
    .from("imovel_midia_publica")
    .select("id,storage_bucket,storage_path,variantes")
    .eq("owner_id", ownerId)
    .eq("imovel_id", imovelId);

  if (existingResult.error) return mapDbError(existingResult.error);
  const existingRows = existingResult.data ?? [];

  const deleteResult = await (db as unknown as {
    from: (table: "imovel_midia_publica") => {
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "imovel_id", value2: string) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
        };
      };
    };
  })
    .from("imovel_midia_publica")
    .delete()
    .eq("owner_id", ownerId)
    .eq("imovel_id", imovelId);

  if (deleteResult.error) return mapDbError(deleteResult.error);

  await removeStoragePaths(
    existingRows.flatMap((row) => [row.storage_path, ...getVariantStoragePaths(row.variantes)].map((path) => ({
      bucket: row.storage_bucket,
      path,
    }))),
  );

  return ok({ total: existingRows.length });
}

async function clearEmpreendimentoPublicMidiaAssets(
  db: DynamicClient,
  ownerId: string,
  empreendimentoId: string,
): Promise<ApiResult<{ total: number }>> {
  const existingResult = await (db as unknown as {
    from: (table: "empreendimento_midia_publica") => {
      select: (columns: "id,storage_bucket,storage_path,variantes") => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "empreendimento_id",
            value2: string,
          ) => Promise<{
            data: Array<{ id: string; storage_bucket: string; storage_path: string; variantes?: ResponsiveImageVariants | null }> | null;
            error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
          }>;
        };
      };
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "empreendimento_id", value2: string) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
        };
      };
    };
  })
    .from("empreendimento_midia_publica")
    .select("id,storage_bucket,storage_path,variantes")
    .eq("owner_id", ownerId)
    .eq("empreendimento_id", empreendimentoId);

  if (existingResult.error) return mapDbError(existingResult.error);
  const existingRows = existingResult.data ?? [];

  const deleteResult = await (db as unknown as {
    from: (table: "empreendimento_midia_publica") => {
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "empreendimento_id", value2: string) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
        };
      };
    };
  })
    .from("empreendimento_midia_publica")
    .delete()
    .eq("owner_id", ownerId)
    .eq("empreendimento_id", empreendimentoId);

  if (deleteResult.error) return mapDbError(deleteResult.error);

  await removeStoragePaths(
    existingRows.flatMap((row) => [row.storage_path, ...getVariantStoragePaths(row.variantes)].map((path) => ({
      bucket: row.storage_bucket,
      path,
    }))),
  );

  return ok({ total: existingRows.length });
}

async function moveImovelPublicMidiaIndicesToTempRange(
  db: DynamicClient,
  ownerId: string,
  imovelId: string,
  existingAssets: ImovelPublicMidiaAsset[],
): Promise<ApiResult<null>> {
  if (existingAssets.length === 0) return ok(null);

  const maxIndiceAtual = existingAssets.reduce((acc, asset) => {
    const indice = Number(asset.indice_publico);
    if (!Number.isFinite(indice)) return acc;
    return Math.max(acc, Math.trunc(indice));
  }, 0);
  const tempBase = maxIndiceAtual + existingAssets.length + 1000;

  const ordered = [...existingAssets].sort((a, b) => a.indice_publico - b.indice_publico);

  for (let index = 0; index < ordered.length; index += 1) {
    const asset = ordered[index];
    const tempIndice = tempBase + index;

    const updateResult = await (db as unknown as {
      from: (table: "imovel_midia_publica") => {
        update: (values: { indice_publico: number }) => {
          eq: (column: "owner_id", value: string) => {
            eq: (column2: "imovel_id", value2: string) => {
              eq: (
                column3: "id",
                value3: string,
              ) => Promise<{
                error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from("imovel_midia_publica")
      .update({ indice_publico: tempIndice })
      .eq("owner_id", ownerId)
      .eq("imovel_id", imovelId)
      .eq("id", asset.id);

    if (updateResult.error) return mapDbError(updateResult.error);
  }

  return ok(null);
}

async function moveImovelPublicMidiaPathsToTempRange(
  db: DynamicClient,
  ownerId: string,
  imovelId: string,
  existingAssets: ImovelPublicMidiaAsset[],
): Promise<ApiResult<null>> {
  if (existingAssets.length === 0) return ok(null);

  const timestamp = Date.now();
  const ordered = [...existingAssets].sort((a, b) => a.indice_publico - b.indice_publico);

  for (let index = 0; index < ordered.length; index += 1) {
    const asset = ordered[index];
    const tempPath = `${asset.storage_path}.__tmp__${timestamp}-${index}-${crypto.randomUUID()}`;

    const updateResult = await (db as unknown as {
      from: (table: "imovel_midia_publica") => {
        update: (values: { storage_path: string }) => {
          eq: (column: "owner_id", value: string) => {
            eq: (column2: "imovel_id", value2: string) => {
              eq: (
                column3: "id",
                value3: string,
              ) => Promise<{
                error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from("imovel_midia_publica")
      .update({ storage_path: tempPath })
      .eq("owner_id", ownerId)
      .eq("imovel_id", imovelId)
      .eq("id", asset.id);

    if (updateResult.error) return mapDbError(updateResult.error);
  }

  return ok(null);
}

async function moveEmpreendimentoPublicMidiaIndicesToTempRange(
  db: DynamicClient,
  ownerId: string,
  empreendimentoId: string,
  existingAssets: EmpreendimentoPublicMidiaAsset[],
): Promise<ApiResult<null>> {
  if (existingAssets.length === 0) return ok(null);

  const maxIndiceAtual = existingAssets.reduce((acc, asset) => {
    const indice = Number(asset.indice_publico);
    if (!Number.isFinite(indice)) return acc;
    return Math.max(acc, Math.trunc(indice));
  }, 0);
  const tempBase = maxIndiceAtual + existingAssets.length + 1000;

  const ordered = [...existingAssets].sort((a, b) => a.indice_publico - b.indice_publico);

  for (let index = 0; index < ordered.length; index += 1) {
    const asset = ordered[index];
    const tempIndice = tempBase + index;

    const updateResult = await (db as unknown as {
      from: (table: "empreendimento_midia_publica") => {
        update: (values: { indice_publico: number }) => {
          eq: (column: "owner_id", value: string) => {
            eq: (column2: "empreendimento_id", value2: string) => {
              eq: (
                column3: "id",
                value3: string,
              ) => Promise<{
                error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from("empreendimento_midia_publica")
      .update({ indice_publico: tempIndice })
      .eq("owner_id", ownerId)
      .eq("empreendimento_id", empreendimentoId)
      .eq("id", asset.id);

    if (updateResult.error) return mapDbError(updateResult.error);
  }

  return ok(null);
}

async function moveEmpreendimentoPublicMidiaPathsToTempRange(
  db: DynamicClient,
  ownerId: string,
  empreendimentoId: string,
  existingAssets: EmpreendimentoPublicMidiaAsset[],
): Promise<ApiResult<null>> {
  if (existingAssets.length === 0) return ok(null);

  const timestamp = Date.now();
  const ordered = [...existingAssets].sort((a, b) => a.indice_publico - b.indice_publico);

  for (let index = 0; index < ordered.length; index += 1) {
    const asset = ordered[index];
    const tempPath = `${asset.storage_path}.__tmp__${timestamp}-${index}-${crypto.randomUUID()}`;

    const updateResult = await (db as unknown as {
      from: (table: "empreendimento_midia_publica") => {
        update: (values: { storage_path: string }) => {
          eq: (column: "owner_id", value: string) => {
            eq: (column2: "empreendimento_id", value2: string) => {
              eq: (
                column3: "id",
                value3: string,
              ) => Promise<{
                error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from("empreendimento_midia_publica")
      .update({ storage_path: tempPath })
      .eq("owner_id", ownerId)
      .eq("empreendimento_id", empreendimentoId)
      .eq("id", asset.id);

    if (updateResult.error) return mapDbError(updateResult.error);
  }

  return ok(null);
}

export async function syncImovelPublicMidia(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<{ total: number; slug_publico: string | null }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const imovelResult = await db
    .from("imoveis")
    .select("id,status,slug_publico")
    .eq("id", imovelId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (imovelResult.error) return mapDbError(imovelResult.error);
  if (!imovelResult.data) return fail("NOT_FOUND", "Imóvel não encontrado.");

  const status = String((imovelResult.data as { status?: string | null }).status ?? "").trim();
  const slugPublico = String((imovelResult.data as { slug_publico?: string | null }).slug_publico ?? "").trim();

  if (status !== "PUBLICADO" || !slugPublico) {
    const cleared = await clearImovelPublicMidiaAssets(db, user.id, imovelId);
    if (!cleared.ok) return cleared;
    return ok({ total: 0, slug_publico: null });
  }

  const profileResult = await db
    .from("profiles")
    .select("nickname,logo_nickname_white_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) return mapDbError(profileResult.error);

  const nickname =
    typeof (profileResult.data as { nickname?: string | null } | null)?.nickname === "string"
      ? ((profileResult.data as { nickname?: string | null }).nickname ?? "").trim()
      : "";
  let logoNicknameWhiteUrl =
    typeof (profileResult.data as { logo_nickname_white_url?: string | null } | null)
      ?.logo_nickname_white_url === "string"
      ? ((profileResult.data as { logo_nickname_white_url?: string | null }).logo_nickname_white_url ?? "").trim()
      : "";

  if (!logoNicknameWhiteUrl && nickname) {
    const logoResult = await ensureProfileNicknameLogos(user.id);
    if (logoResult.ok) {
      logoNicknameWhiteUrl = logoResult.data.logo_nickname_white_url;
    } else {
      console.error("[syncImovelPublicMidia] falha ao garantir logo white do corretor", {
        ownerId: user.id,
        code: logoResult.error.code,
        message: logoResult.error.message,
      });
    }
  }

  let logoWhiteBuffer: Buffer | null = null;
  if (logoNicknameWhiteUrl) {
    const logoBufferResult = await fetchPublicImageBuffer(logoNicknameWhiteUrl);
    if (logoBufferResult.ok) {
      logoWhiteBuffer = logoBufferResult.data;
    } else {
      console.error("[syncImovelPublicMidia] falha ao baixar logo white pública", {
        ownerId: user.id,
        code: logoBufferResult.error.code,
        message: logoBufferResult.error.message,
      });
    }
  }

  const relacoesResult = await db
    .from("midia_relacoes")
    .select(
      "id,ordem,midia:midia_id(id,tipo,url,storage_provider,storage_bucket,storage_path)",
    )
    .eq("owner_id", user.id)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (relacoesResult.error) return mapDbError(relacoesResult.error);

  const relacoes = (relacoesResult.data ?? []) as Array<{
    id: string;
    ordem: number | null;
    midia: {
      id: string;
      tipo: MidiaTipo;
      url: string;
      storage_provider: MidiaStorageProvider;
      storage_bucket: string;
      storage_path: string;
    } | null;
  }>;

  const imagens = relacoes.filter((row) => row.midia?.tipo === "IMAGEM" && row.midia != null);
  if (imagens.length === 0) {
    const cleared = await clearImovelPublicMidiaAssets(db, user.id, imovelId);
    if (!cleared.ok) return cleared;
    return ok({ total: 0, slug_publico: slugPublico });
  }

  const existingAssetsResult = await (db as unknown as {
    from: (table: "imovel_midia_publica") => {
      select: (
        columns: "id,midia_relacao_id,midia_id,indice_publico,storage_bucket,storage_path,url,variantes",
      ) => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "imovel_id",
            value2: string,
          ) => Promise<{
            data: ImovelPublicMidiaAsset[] | null;
            error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
          }>;
        };
      };
    };
  })
    .from("imovel_midia_publica")
    .select("id,midia_relacao_id,midia_id,indice_publico,storage_bucket,storage_path,url,variantes")
    .eq("owner_id", user.id)
    .eq("imovel_id", imovelId);

  if (existingAssetsResult.error) return mapDbError(existingAssetsResult.error);

  const existingAssets = existingAssetsResult.data ?? [];
  const moveIndicesResult = await moveImovelPublicMidiaIndicesToTempRange(
    db,
    user.id,
    imovelId,
    existingAssets,
  );
  if (!moveIndicesResult.ok) return moveIndicesResult;

  const movePathsResult = await moveImovelPublicMidiaPathsToTempRange(
    db,
    user.id,
    imovelId,
    existingAssets,
  );
  if (!movePathsResult.ok) return movePathsResult;

  const existingByRelacaoId = new Map<string, ImovelPublicMidiaAsset>();
  for (const asset of existingAssets) {
    existingByRelacaoId.set(asset.midia_relacao_id, asset);
  }

  const storageBucket = getBucketName();
  const storage = createMediaStorageProvider();
  const activeRelacaoIds = new Set<string>();
  const activePublicStorageKeys = new Set<string>();
  const oldPathsToDelete: Array<{ bucket: string; path: string }> = [];

  for (let index = 0; index < imagens.length; index += 1) {
    const row = imagens[index];
    const midia = row.midia!;
    const indicePublico = index + 1;
    const ordem = typeof row.ordem === "number" ? row.ordem : index;
    const storagePath = buildImovelPublicImageStoragePath(
      user.id,
      imovelId,
      midia.id,
      slugPublico,
      indicePublico,
      "W480",
    );
    const existing = existingByRelacaoId.get(row.id) ?? null;
    activeRelacaoIds.add(row.id);
    activePublicStorageKeys.add(`${storageBucket}::${storagePath}`);

    let uploadedUrl = existing?.url ?? "";
    let uploadedVariants = existing?.variantes ?? {};
    for (const path of getVariantStoragePaths(uploadedVariants)) {
      activePublicStorageKeys.add(`${storageBucket}::${path}`);
    }

    let mustRegenerate =
      !existing ||
      existing.storage_path !== storagePath ||
      existing.indice_publico !== indicePublico ||
      !hasAllPublicResponsiveVariants(existing.variantes);

    if (!mustRegenerate) {
      const existsInStorage = await storageObjectExists(storageBucket, storagePath);
      if (!existsInStorage) mustRegenerate = true;
    }

    if (mustRegenerate) {
      const sourceBufferResult = await fetchSourceImageBuffer({
        storageProvider: midia.storage_provider,
        storageBucket: midia.storage_bucket,
        storagePath: midia.storage_path,
        url: midia.url,
      });
      if (!sourceBufferResult.ok) return sourceBufferResult;

      const generated = await generatePublicResponsiveImages({
        source: sourceBufferResult.data,
        nickname: nickname || null,
        logoPngBuffer: logoWhiteBuffer,
        bucket: storageBucket,
        fileBase: `${slugPublico}-${String(indicePublico).padStart(4, "0")}`,
        pathFor: (variant) => buildImovelPublicImageStoragePath(
          user.id,
          imovelId,
          midia.id,
          slugPublico,
          indicePublico,
          variant,
        ),
      });
      if (!generated.ok) return generated;
      uploadedUrl = generated.data.url;
      uploadedVariants = generated.data.variantes;
      for (const path of getVariantStoragePaths(uploadedVariants)) {
        activePublicStorageKeys.add(`${storageBucket}::${path}`);
      }

      if (existing && existing.storage_path !== storagePath) {
        oldPathsToDelete.push({
          bucket: existing.storage_bucket,
          path: existing.storage_path,
        });
        for (const path of getVariantStoragePaths(existing.variantes)) {
          oldPathsToDelete.push({ bucket: existing.storage_bucket, path });
        }
      }
    }

    const upsertResult = await (db as unknown as {
      from: (table: "imovel_midia_publica") => {
        upsert: (
          values: Record<string, unknown>,
          options: { onConflict: string },
        ) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
      };
    })
      .from("imovel_midia_publica")
      .upsert(
        {
          owner_id: user.id,
          imovel_id: imovelId,
          midia_id: midia.id,
          midia_relacao_id: row.id,
          ordem,
          indice_publico: indicePublico,
          slug_publico: slugPublico,
          storage_provider: "SUPABASE",
          storage_bucket: storageBucket,
          storage_path: storagePath,
          url: uploadedUrl,
          variantes: uploadedVariants,
        },
        { onConflict: "midia_relacao_id" },
      );

    if (upsertResult.error) {
      if (
        upsertResult.error.code === "23505" &&
        upsertResult.error.message.includes("imovel_midia_publica_unique_storage")
      ) {
        return fail(
          "CONFLICT",
          "Conflito ao sincronizar imagens públicas. Tente salvar novamente.",
        );
      }
      return mapDbError(upsertResult.error);
    }
  }

  const staleAssets = existingAssets.filter((asset) => !activeRelacaoIds.has(asset.midia_relacao_id));
  if (staleAssets.length > 0) {
    const staleIds = staleAssets.map((asset) => asset.id);
    const deleteStaleResult = await (db as unknown as {
      from: (table: "imovel_midia_publica") => {
        delete: () => {
          eq: (column: "owner_id", value: string) => {
            in: (
              column2: "id",
              values: string[],
            ) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
          };
        };
      };
    })
      .from("imovel_midia_publica")
      .delete()
      .eq("owner_id", user.id)
      .in("id", staleIds);

    if (deleteStaleResult.error) return mapDbError(deleteStaleResult.error);

    for (const stale of staleAssets) {
      oldPathsToDelete.push({
        bucket: stale.storage_bucket,
        path: stale.storage_path,
      });
      for (const path of getVariantStoragePaths(stale.variantes)) {
        oldPathsToDelete.push({ bucket: stale.storage_bucket, path });
      }
    }
  }

  const oldPathsFiltered = oldPathsToDelete.filter((item) => {
    const bucket = item.bucket.trim();
    const path = item.path.trim().replace(/^\/+/, "");
    if (!bucket || !path) return false;
    return !activePublicStorageKeys.has(`${bucket}::${path}`);
  });

  const oldPathsDedup = Array.from(
    new Map(oldPathsFiltered.map((item) => [`${item.bucket.trim()}::${item.path.trim().replace(/^\/+/, "")}`, item]))
      .values(),
  );

  await removeStoragePaths(oldPathsDedup);

  return ok({ total: imagens.length, slug_publico: slugPublico });
}

export async function syncEmpreendimentoPublicMidia(
  accessToken: string,
  empreendimentoId: string,
): Promise<ApiResult<{ total: number; slug_publico: string | null }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const empreendimentoResult = await db
    .from("empreendimentos")
    .select("id,status,slug_publico")
    .eq("id", empreendimentoId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (empreendimentoResult.error) return mapDbError(empreendimentoResult.error);
  if (!empreendimentoResult.data) return fail("NOT_FOUND", "Empreendimento não encontrado.");

  const status = String(
    (empreendimentoResult.data as { status?: string | null }).status ?? "",
  ).trim();
  const slugPublico = String(
    (empreendimentoResult.data as { slug_publico?: string | null }).slug_publico ?? "",
  ).trim();

  if (status !== "PUBLICADO" || !slugPublico) {
    const cleared = await clearEmpreendimentoPublicMidiaAssets(db, user.id, empreendimentoId);
    if (!cleared.ok) return cleared;
    return ok({ total: 0, slug_publico: null });
  }

  const profileResult = await db
    .from("profiles")
    .select("nickname,logo_nickname_white_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) return mapDbError(profileResult.error);

  const nickname =
    typeof (profileResult.data as { nickname?: string | null } | null)?.nickname === "string"
      ? ((profileResult.data as { nickname?: string | null }).nickname ?? "").trim()
      : "";
  let logoNicknameWhiteUrl =
    typeof (profileResult.data as { logo_nickname_white_url?: string | null } | null)
      ?.logo_nickname_white_url === "string"
      ? ((profileResult.data as { logo_nickname_white_url?: string | null }).logo_nickname_white_url ?? "").trim()
      : "";

  if (!logoNicknameWhiteUrl && nickname) {
    const logoResult = await ensureProfileNicknameLogos(user.id);
    if (logoResult.ok) {
      logoNicknameWhiteUrl = logoResult.data.logo_nickname_white_url;
    } else {
      console.error("[syncEmpreendimentoPublicMidia] falha ao garantir logo white do corretor", {
        ownerId: user.id,
        code: logoResult.error.code,
        message: logoResult.error.message,
      });
    }
  }

  let logoWhiteBuffer: Buffer | null = null;
  if (logoNicknameWhiteUrl) {
    const logoBufferResult = await fetchPublicImageBuffer(logoNicknameWhiteUrl);
    if (logoBufferResult.ok) {
      logoWhiteBuffer = logoBufferResult.data;
    } else {
      console.error("[syncEmpreendimentoPublicMidia] falha ao baixar logo white pública", {
        ownerId: user.id,
        code: logoBufferResult.error.code,
        message: logoBufferResult.error.message,
      });
    }
  }

  const relacoesResult = await db
    .from("midia_relacoes")
    .select(
      "id,ordem,midia:midia_id(id,tipo,url,storage_provider,storage_bucket,storage_path)",
    )
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (relacoesResult.error) return mapDbError(relacoesResult.error);

  const relacoes = (relacoesResult.data ?? []) as Array<{
    id: string;
    ordem: number | null;
    midia: {
      id: string;
      tipo: MidiaTipo;
      url: string;
      storage_provider: MidiaStorageProvider;
      storage_bucket: string;
      storage_path: string;
    } | null;
  }>;

  const imagens = relacoes.filter((row) => row.midia?.tipo === "IMAGEM" && row.midia != null);
  if (imagens.length === 0) {
    const cleared = await clearEmpreendimentoPublicMidiaAssets(db, user.id, empreendimentoId);
    if (!cleared.ok) return cleared;
    return ok({ total: 0, slug_publico: slugPublico });
  }

  const existingAssetsResult = await (db as unknown as {
    from: (table: "empreendimento_midia_publica") => {
      select: (
        columns: "id,midia_relacao_id,midia_id,indice_publico,storage_bucket,storage_path,url,variantes",
      ) => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "empreendimento_id",
            value2: string,
          ) => Promise<{
            data: EmpreendimentoPublicMidiaAsset[] | null;
            error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
          }>;
        };
      };
    };
  })
    .from("empreendimento_midia_publica")
    .select("id,midia_relacao_id,midia_id,indice_publico,storage_bucket,storage_path,url,variantes")
    .eq("owner_id", user.id)
    .eq("empreendimento_id", empreendimentoId);

  if (existingAssetsResult.error) return mapDbError(existingAssetsResult.error);

  const existingAssets = existingAssetsResult.data ?? [];
  const moveIndicesResult = await moveEmpreendimentoPublicMidiaIndicesToTempRange(
    db,
    user.id,
    empreendimentoId,
    existingAssets,
  );
  if (!moveIndicesResult.ok) return moveIndicesResult;

  const movePathsResult = await moveEmpreendimentoPublicMidiaPathsToTempRange(
    db,
    user.id,
    empreendimentoId,
    existingAssets,
  );
  if (!movePathsResult.ok) return movePathsResult;

  const existingByRelacaoId = new Map<string, EmpreendimentoPublicMidiaAsset>();
  for (const asset of existingAssets) {
    existingByRelacaoId.set(asset.midia_relacao_id, asset);
  }

  const storageBucket = getBucketName();
  const storage = createMediaStorageProvider();
  const activeRelacaoIds = new Set<string>();
  const activePublicStorageKeys = new Set<string>();
  const oldPathsToDelete: Array<{ bucket: string; path: string }> = [];

  for (let index = 0; index < imagens.length; index += 1) {
    const row = imagens[index];
    const midia = row.midia!;
    const indicePublico = index + 1;
    const ordem = typeof row.ordem === "number" ? row.ordem : index;
    const storagePath = buildEmpreendimentoPublicImageStoragePath(
      user.id,
      empreendimentoId,
      midia.id,
      slugPublico,
      indicePublico,
      "W480",
    );
    const existing = existingByRelacaoId.get(row.id) ?? null;
    activeRelacaoIds.add(row.id);
    activePublicStorageKeys.add(`${storageBucket}::${storagePath}`);

    let uploadedUrl = existing?.url ?? "";
    let uploadedVariants = existing?.variantes ?? {};
    for (const path of getVariantStoragePaths(uploadedVariants)) {
      activePublicStorageKeys.add(`${storageBucket}::${path}`);
    }

    let mustRegenerate =
      !existing ||
      existing.storage_path !== storagePath ||
      existing.indice_publico !== indicePublico ||
      !hasAllPublicResponsiveVariants(existing.variantes);

    if (!mustRegenerate) {
      const existsInStorage = await storageObjectExists(storageBucket, storagePath);
      if (!existsInStorage) mustRegenerate = true;
    }

    if (mustRegenerate) {
      const sourceBufferResult = await fetchSourceImageBuffer({
        storageProvider: midia.storage_provider,
        storageBucket: midia.storage_bucket,
        storagePath: midia.storage_path,
        url: midia.url,
      });
      if (!sourceBufferResult.ok) return sourceBufferResult;

      const generated = await generatePublicResponsiveImages({
        source: sourceBufferResult.data,
        nickname: nickname || null,
        logoPngBuffer: logoWhiteBuffer,
        bucket: storageBucket,
        fileBase: `${slugPublico}-${String(indicePublico).padStart(4, "0")}`,
        pathFor: (variant) => buildEmpreendimentoPublicImageStoragePath(
          user.id,
          empreendimentoId,
          midia.id,
          slugPublico,
          indicePublico,
          variant,
        ),
      });
      if (!generated.ok) return generated;
      uploadedUrl = generated.data.url;
      uploadedVariants = generated.data.variantes;
      for (const path of getVariantStoragePaths(uploadedVariants)) {
        activePublicStorageKeys.add(`${storageBucket}::${path}`);
      }

      if (existing && existing.storage_path !== storagePath) {
        oldPathsToDelete.push({
          bucket: existing.storage_bucket,
          path: existing.storage_path,
        });
        for (const path of getVariantStoragePaths(existing.variantes)) {
          oldPathsToDelete.push({ bucket: existing.storage_bucket, path });
        }
      }
    }

    const upsertResult = await (db as unknown as {
      from: (table: "empreendimento_midia_publica") => {
        upsert: (
          values: Record<string, unknown>,
          options: { onConflict: string },
        ) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
      };
    })
      .from("empreendimento_midia_publica")
      .upsert(
        {
          owner_id: user.id,
          empreendimento_id: empreendimentoId,
          midia_id: midia.id,
          midia_relacao_id: row.id,
          ordem,
          indice_publico: indicePublico,
          slug_publico: slugPublico,
          storage_provider: "SUPABASE",
          storage_bucket: storageBucket,
          storage_path: storagePath,
          url: uploadedUrl,
          variantes: uploadedVariants,
        },
        { onConflict: "midia_relacao_id" },
      );

    if (upsertResult.error) {
      if (
        upsertResult.error.code === "23505" &&
        upsertResult.error.message.includes("empreendimento_midia_publica_unique_storage")
      ) {
        return fail(
          "CONFLICT",
          "Conflito ao sincronizar imagens públicas. Tente salvar novamente.",
        );
      }
      return mapDbError(upsertResult.error);
    }
  }

  const staleAssets = existingAssets.filter((asset) => !activeRelacaoIds.has(asset.midia_relacao_id));
  if (staleAssets.length > 0) {
    const staleIds = staleAssets.map((asset) => asset.id);
    const deleteStaleResult = await (db as unknown as {
      from: (table: "empreendimento_midia_publica") => {
        delete: () => {
          eq: (column: "owner_id", value: string) => {
            in: (
              column2: "id",
              values: string[],
            ) => Promise<{ error: { message: string; details?: string | null; hint?: string | null; code?: string } | null }>;
          };
        };
      };
    })
      .from("empreendimento_midia_publica")
      .delete()
      .eq("owner_id", user.id)
      .in("id", staleIds);

    if (deleteStaleResult.error) return mapDbError(deleteStaleResult.error);

    for (const stale of staleAssets) {
      oldPathsToDelete.push({
        bucket: stale.storage_bucket,
        path: stale.storage_path,
      });
      for (const path of getVariantStoragePaths(stale.variantes)) {
        oldPathsToDelete.push({ bucket: stale.storage_bucket, path });
      }
    }
  }

  const oldPathsFiltered = oldPathsToDelete.filter((item) => {
    const bucket = item.bucket.trim();
    const path = item.path.trim().replace(/^\/+/, "");
    if (!bucket || !path) return false;
    return !activePublicStorageKeys.has(`${bucket}::${path}`);
  });

  const oldPathsDedup = Array.from(
    new Map(oldPathsFiltered.map((item) => [`${item.bucket.trim()}::${item.path.trim().replace(/^\/+/, "")}`, item]))
      .values(),
  );

  await removeStoragePaths(oldPathsDedup);

  return ok({ total: imagens.length, slug_publico: slugPublico });
}

export async function uploadMidia(
  accessToken: string,
  input: UploadMidiaInput,
): Promise<ApiResult<UploadMidiaResult>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const usesPropertyMediaContract = Boolean(
    input.ref_tipo && PROPERTY_MEDIA_CONTRACT_REFS.has(input.ref_tipo) && input.file.type.startsWith("image/"),
  );
  const bucket = usesPropertyMediaContract ? getPrivateBucketName() : getBucketName();
  const storagePath = buildStoragePath(user.id, input.file.name || "arquivo", input.filename_base);
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
      caracteristica: input.caracteristica ?? null,
    })
    .select("id, owner_id, url, storage_bucket, storage_path, tipo")
    .single();

  if (midiaInsert.error) return mapDbError(midiaInsert.error);
  if (!midiaInsert.data) return fail("DATABASE_ERROR", "Media insert returned no data");
  const midiaId = typeof midiaInsert.data.id === "string" ? midiaInsert.data.id : "";
  if (!midiaId) return fail("DATABASE_ERROR", "Media insert returned invalid id");

  // Provas sociais preservam a imagem original: não precisam de render/watermark do fluxo público de imóveis.
  const shouldOptimizeImage = tipo === "IMAGEM" && !input.skip_optimization && input.ref_tipo !== "PROVA_SOCIAL";
  if (shouldOptimizeImage) {
    const optimized = await optimizeMidiaOwnedTo1920(accessToken, midiaId, input.filename_base);
    if (!optimized.ok) return optimized;
  }

  const shouldApplyArticleWatermark =
    tipo === "IMAGEM" &&
    input.apply_watermark === true &&
    input.ref_tipo === "ARTIGO";
  if (shouldApplyArticleWatermark) {
    const watermarked = await applyArticleCornerWatermarkToMidia(accessToken, midiaId, input.filename_base);
    if (!watermarked.ok) return watermarked;
  }

  if (input.ref_tipo && input.ref_id) {
    const relInsert = await db
      .from("midia_relacoes")
      .insert({
        owner_id: user.id,
        ref_tipo: input.ref_tipo,
        ref_id: input.ref_id,
        midia_id: midiaId,
        grupo: input.grupo ?? null,
        ordem: input.ordem ?? 0,
      })
      .select("id")
      .single();
    if (relInsert.error && input.ref_tipo !== "PROVA_SOCIAL") return mapDbError(relInsert.error);

    if (input.ref_tipo === "IMOVEL") {
      const syncResult = await syncImovelPublicMidia(accessToken, input.ref_id);
      if (!syncResult.ok) return syncResult;
    } else if (input.ref_tipo === "EMPREENDIMENTO") {
      const syncResult = await syncEmpreendimentoPublicMidia(accessToken, input.ref_id);
      if (!syncResult.ok) return syncResult;
    }
  }

  const currentMidia = await db
    .from("midia")
    .select("id,owner_id,url,storage_bucket,storage_path,tipo")
    .eq("id", midiaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (currentMidia.error) return mapDbError(currentMidia.error);
  if (!currentMidia.data) return fail("NOT_FOUND", "Midia not found");

  const result = currentMidia.data as UploadMidiaResult;
  if (usesPropertyMediaContract) {
    const previewResult = await (db as unknown as {
      from: (table: "midia_variantes") => {
        select: (columns: "storage_path") => {
          eq: (column: "midia_id", value: string) => {
            eq: (column2: "tipo", value: "W480") => {
              maybeSingle: () => Promise<{ data: { storage_path: string } | null; error: { message: string } | null }>;
            };
          };
        };
      };
    })
      .from("midia_variantes")
      .select("storage_path")
      .eq("midia_id", midiaId)
      .eq("tipo", "W480")
      .maybeSingle();
    const signedUrl = await createPrivateSignedUrl(
      result.storage_bucket,
      previewResult.data?.storage_path ?? result.storage_path,
    );
    if (signedUrl) result.url = signedUrl;
  }
  return ok(result);
}

export async function listMidiaEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
): Promise<ApiResult<MidiaRelacaoItem[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnEmpreendimento(db, user.id, empreendimentoId);
  if (!own.ok) return own;

  const result = await db
    .from("midia_relacoes")
    .select("id,ordem,grupo,created_at,midia:midia_id(id,tipo,url,storage_bucket,storage_path,tamanho_bytes,titulo,alt,legenda,caracteristica)")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .order("ordem", { ascending: true });

  if (result.error) return mapDbError(result.error);

  const rows = (result.data ?? []) as Array<{
    id: string;
    ordem: number | null;
    grupo: string | null;
    created_at: string;
    midia: {
      id: string;
      tipo: MidiaTipo;
      url: string;
      storage_bucket: string;
      storage_path: string;
      tamanho_bytes: number | null;
      titulo: string | null;
      alt: string | null;
      legenda: string | null;
      caracteristica: string | null;
    } | null;
  }>;

  const mapped = rows
    .filter((row) => row.midia)
    .map((row) => ({
      relacao_id: row.id,
      ordem: row.ordem ?? 0,
      grupo: row.grupo,
      midia_id: row.midia!.id,
      tipo: row.midia!.tipo,
      url: row.midia!.url,
      storage_bucket: row.midia!.storage_bucket,
      storage_path: row.midia!.storage_path,
      tamanho_bytes: row.midia!.tamanho_bytes,
      titulo: row.midia!.titulo,
      alt: row.midia!.alt,
      legenda: row.midia!.legenda,
      caracteristica: row.midia!.caracteristica,
      created_at: row.created_at,
    }))
    .sort((a, b) => {
      if (a.ordem !== b.ordem) return a.ordem - b.ordem;
      return a.created_at.localeCompare(b.created_at);
    });

  const signed = await resolvePrivatePreviewUrls(db, mapped);
  return ok(signed);
}

export async function listMidiaImovel(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<MidiaRelacaoItem[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnImovel(db, user.id, imovelId);
  if (!own.ok) return own;

  const result = await db
    .from("midia_relacoes")
    .select("id,ordem,grupo,created_at,midia:midia_id(id,tipo,url,storage_bucket,storage_path,tamanho_bytes,titulo,alt,legenda,caracteristica)")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId)
    .order("ordem", { ascending: true });

  if (result.error) return mapDbError(result.error);

  const rows = (result.data ?? []) as Array<{
    id: string;
    ordem: number | null;
    grupo: string | null;
    created_at: string;
    midia: {
      id: string;
      tipo: MidiaTipo;
      url: string;
      storage_bucket: string;
      storage_path: string;
      tamanho_bytes: number | null;
      titulo: string | null;
      alt: string | null;
      legenda: string | null;
      caracteristica: string | null;
    } | null;
  }>;

  const mapped = rows
    .filter((row) => row.midia)
    .map((row) => ({
      relacao_id: row.id,
      ordem: row.ordem ?? 0,
      grupo: row.grupo,
      midia_id: row.midia!.id,
      tipo: row.midia!.tipo,
      url: row.midia!.url,
      storage_bucket: row.midia!.storage_bucket,
      storage_path: row.midia!.storage_path,
      tamanho_bytes: row.midia!.tamanho_bytes,
      titulo: row.midia!.titulo,
      alt: row.midia!.alt,
      legenda: row.midia!.legenda,
      caracteristica: row.midia!.caracteristica,
      created_at: row.created_at,
    }))
    .sort((a, b) => {
      if (a.ordem !== b.ordem) return a.ordem - b.ordem;
      return a.created_at.localeCompare(b.created_at);
    });

  const signed = await resolvePrivatePreviewUrls(db, mapped);
  return ok(signed);
}

export async function listMidiaPublicaEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
): Promise<ApiResult<EmpreendimentoMidiaPublicaItem[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnEmpreendimento(db, user.id, empreendimentoId);
  if (!own.ok) return own;

  const result = await (db as unknown as {
    from: (table: "empreendimento_midia_publica") => {
      select: (
        columns: "midia_id,indice_publico,ordem,url,slug_publico,storage_bucket,storage_path,variantes",
      ) => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "empreendimento_id",
            value2: string,
          ) => {
            order: (
              column3: "indice_publico" | "ordem",
              options?: { ascending?: boolean },
            ) => Promise<{
              data: EmpreendimentoMidiaPublicaItem[] | null;
              error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
            }>;
          };
        };
      };
    };
  })
    .from("empreendimento_midia_publica")
    .select("midia_id,indice_publico,ordem,url,slug_publico,storage_bucket,storage_path,variantes")
    .eq("owner_id", user.id)
    .eq("empreendimento_id", empreendimentoId)
    .order("indice_publico", { ascending: true });

  if (result.error) return mapDbError(result.error);

  return ok(
    ((result.data ?? []) as EmpreendimentoMidiaPublicaItem[]).sort((a, b) => {
      if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
      return a.ordem - b.ordem;
    }),
  );
}

export async function listMidiaPublicaImovel(
  accessToken: string,
  imovelId: string,
): Promise<ApiResult<ImovelMidiaPublicaItem[]>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnImovel(db, user.id, imovelId);
  if (!own.ok) return own;

  const result = await (db as unknown as {
    from: (table: "imovel_midia_publica") => {
      select: (
        columns: "midia_id,indice_publico,ordem,url,slug_publico,storage_bucket,storage_path,variantes",
      ) => {
        eq: (column: "owner_id", value: string) => {
          eq: (
            column2: "imovel_id",
            value2: string,
          ) => {
            order: (
              column3: "indice_publico" | "ordem",
              options?: { ascending?: boolean },
            ) => Promise<{
              data: ImovelMidiaPublicaItem[] | null;
              error: { message: string; details?: string | null; hint?: string | null; code?: string } | null;
            }>;
          };
        };
      };
    };
  })
    .from("imovel_midia_publica")
    .select("midia_id,indice_publico,ordem,url,slug_publico,storage_bucket,storage_path,variantes")
    .eq("owner_id", user.id)
    .eq("imovel_id", imovelId)
    .order("indice_publico", { ascending: true });

  if (result.error) return mapDbError(result.error);

  return ok(
    ((result.data ?? []) as ImovelMidiaPublicaItem[]).sort((a, b) => {
      if (a.indice_publico !== b.indice_publico) return a.indice_publico - b.indice_publico;
      return a.ordem - b.ordem;
    }),
  );
}

export async function reorderMidiaEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
  orderedMidiaIds: string[],
): Promise<ApiResult<{ total: number }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!Array.isArray(orderedMidiaIds) || orderedMidiaIds.length === 0) {
    return fail("VALIDATION_ERROR", "orderedMidiaIds must be a non-empty array");
  }

  const dedup = new Set(orderedMidiaIds);
  if (dedup.size !== orderedMidiaIds.length) {
    return fail("VALIDATION_ERROR", "orderedMidiaIds must not contain duplicates");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnEmpreendimento(db, user.id, empreendimentoId);
  if (!own.ok) return own;

  const currentResult = await db
    .from("midia_relacoes")
    .select("id,midia_id")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .order("id", { ascending: true });

  if (currentResult.error) return mapDbError(currentResult.error);
  const currentRows = (currentResult.data ?? []) as Array<{ id: string; midia_id: string }>;
  const currentSet = new Set(currentRows.map((row) => row.midia_id));

  if (currentRows.length !== orderedMidiaIds.length) {
    return fail("VALIDATION_ERROR", "orderedMidiaIds must include all empreendimento media items");
  }

  for (const midiaId of orderedMidiaIds) {
    if (!currentSet.has(midiaId)) {
      return fail("VALIDATION_ERROR", "orderedMidiaIds contain items not linked to empreendimento");
    }
  }

  for (let index = 0; index < orderedMidiaIds.length; index += 1) {
    const midiaId = orderedMidiaIds[index];
    const update = await db
      .from("midia_relacoes")
      .update({ ordem: index })
      .eq("owner_id", user.id)
      .eq("ref_tipo", "EMPREENDIMENTO")
      .eq("ref_id", empreendimentoId)
      .eq("midia_id", midiaId)
      .select("id")
      .maybeSingle();
    if (update.error) return mapDbError(update.error);
  }

  const syncResult = await syncEmpreendimentoPublicMidia(accessToken, empreendimentoId);
  if (!syncResult.ok) return syncResult;

  return ok({ total: orderedMidiaIds.length });
}

export async function reorderMidiaImovel(
  accessToken: string,
  imovelId: string,
  orderedMidiaIds: string[],
): Promise<ApiResult<{ total: number }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  if (!Array.isArray(orderedMidiaIds) || orderedMidiaIds.length === 0) {
    return fail("VALIDATION_ERROR", "orderedMidiaIds must be a non-empty array");
  }

  const dedup = new Set(orderedMidiaIds);
  if (dedup.size !== orderedMidiaIds.length) {
    return fail("VALIDATION_ERROR", "orderedMidiaIds must not contain duplicates");
  }

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnImovel(db, user.id, imovelId);
  if (!own.ok) return own;

  const currentResult = await db
    .from("midia_relacoes")
    .select("id,midia_id")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId)
    .order("id", { ascending: true });

  if (currentResult.error) return mapDbError(currentResult.error);
  const currentRows = (currentResult.data ?? []) as Array<{ id: string; midia_id: string }>;
  const currentSet = new Set(currentRows.map((row) => row.midia_id));

  if (currentRows.length !== orderedMidiaIds.length) {
    return fail("VALIDATION_ERROR", "orderedMidiaIds must include all imóvel media items");
  }

  for (const midiaId of orderedMidiaIds) {
    if (!currentSet.has(midiaId)) {
      return fail("VALIDATION_ERROR", "orderedMidiaIds contain items not linked to imóvel");
    }
  }

  for (let index = 0; index < orderedMidiaIds.length; index += 1) {
    const midiaId = orderedMidiaIds[index];
    const update = await db
      .from("midia_relacoes")
      .update({ ordem: index })
      .eq("owner_id", user.id)
      .eq("ref_tipo", "IMOVEL")
      .eq("ref_id", imovelId)
      .eq("midia_id", midiaId)
      .select("id")
      .maybeSingle();
    if (update.error) return mapDbError(update.error);
  }

  const syncResult = await syncImovelPublicMidia(accessToken, imovelId);
  if (!syncResult.ok) return syncResult;

  return ok({ total: orderedMidiaIds.length });
}

export async function updateMidiaMetadata(
  accessToken: string,
  midiaId: string,
  patch: { titulo?: string | null; alt?: string | null; legenda?: string | null; caracteristica?: string | null },
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const result = await db
    .from("midia")
    .update({
      titulo: patch.titulo ?? null,
      alt: patch.alt ?? null,
      legenda: patch.legenda ?? null,
      caracteristica: patch.caracteristica ?? null,
    })
    .eq("id", midiaId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Midia not found");
  return ok({ id: result.data.id as string });
}

export async function removeMidiaEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
  midiaId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnEmpreendimento(db, user.id, empreendimentoId);
  if (!own.ok) return own;

  const relationResult = await db
    .from("midia_relacoes")
    .select("id")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .eq("midia_id", midiaId)
    .maybeSingle();
  if (relationResult.error) return mapDbError(relationResult.error);
  if (!relationResult.data) return fail("NOT_FOUND", "Media link not found");

  const publicPathsResult = await getPublicAssetPathsByRelation(
    db,
    "empreendimento_midia_publica",
    relationResult.data.id as string,
  );
  if (!publicPathsResult.ok) return publicPathsResult;

  const result = await db
    .from("midia_relacoes")
    .delete()
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .eq("midia_id", midiaId)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Media link not found");

  await removeStoragePaths(publicPathsResult.data);

  const refsRemainingResult = await (db as unknown as {
    from: (table: "midia_relacoes") => {
      select: (columns: "id") => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "midia_id", value2: string) => {
            limit: (value: number) => Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>;
          };
        };
      };
    };
  })
    .from("midia_relacoes")
    .select("id")
    .eq("owner_id", user.id)
    .eq("midia_id", midiaId)
    .limit(1);

  if (refsRemainingResult.error) return mapDbError(refsRemainingResult.error);
  const hasRemainingRefs = (refsRemainingResult.data ?? []).length > 0;

  if (!hasRemainingRefs) {
    const deleteOwnedResult = await deleteMidiaOwned(accessToken, midiaId);
    if (!deleteOwnedResult.ok && deleteOwnedResult.error.code !== "NOT_FOUND") {
      return deleteOwnedResult;
    }
  }

  const syncResult = await syncEmpreendimentoPublicMidia(accessToken, empreendimentoId);
  if (!syncResult.ok) return syncResult;

  return ok({ id: result.data.id as string });
}

export async function removeMidiaImovel(
  accessToken: string,
  imovelId: string,
  midiaId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnImovel(db, user.id, imovelId);
  if (!own.ok) return own;

  const relationResult = await db
    .from("midia_relacoes")
    .select("id")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId)
    .eq("midia_id", midiaId)
    .maybeSingle();
  if (relationResult.error) return mapDbError(relationResult.error);
  if (!relationResult.data) return fail("NOT_FOUND", "Media link not found");

  const publicPathsResult = await getPublicAssetPathsByRelation(
    db,
    "imovel_midia_publica",
    relationResult.data.id as string,
  );
  if (!publicPathsResult.ok) return publicPathsResult;

  const result = await db
    .from("midia_relacoes")
    .delete()
    .eq("owner_id", user.id)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId)
    .eq("midia_id", midiaId)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Media link not found");

  await removeStoragePaths(publicPathsResult.data);

  const refsRemainingResult = await (db as unknown as {
    from: (table: "midia_relacoes") => {
      select: (columns: "id") => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "midia_id", value2: string) => {
            limit: (value: number) => Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>;
          };
        };
      };
    };
  })
    .from("midia_relacoes")
    .select("id")
    .eq("owner_id", user.id)
    .eq("midia_id", midiaId)
    .limit(1);

  if (refsRemainingResult.error) return mapDbError(refsRemainingResult.error);
  const hasRemainingRefs = (refsRemainingResult.data ?? []).length > 0;

  if (!hasRemainingRefs) {
    const deleteOwnedResult = await deleteMidiaOwned(accessToken, midiaId);
    if (!deleteOwnedResult.ok && deleteOwnedResult.error.code !== "NOT_FOUND") {
      return deleteOwnedResult;
    }
  }

  const syncResult = await syncImovelPublicMidia(accessToken, imovelId);
  if (!syncResult.ok) return syncResult;

  return ok({ id: result.data.id as string });
}

export async function deleteMidiaOwned(
  accessToken: string,
  midiaId: string,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const midiaResult = await db
    .from("midia")
    .select("id,owner_id,storage_bucket,storage_path,storage_provider")
    .eq("id", midiaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (midiaResult.error) return mapDbError(midiaResult.error);
  if (!midiaResult.data) return fail("NOT_FOUND", "Midia not found");

  const midia = midiaResult.data as {
    id: string;
    owner_id: string;
    storage_bucket: string;
    storage_path: string;
    storage_provider: MidiaStorageProvider;
  };

  const storagePath = (midia.storage_path ?? "").trim();
  const storageBucket = (midia.storage_bucket ?? "").trim();
  const shouldDeleteFile =
    midia.storage_provider === "SUPABASE" &&
    storageBucket.length > 0 &&
    storagePath.length > 0 &&
    !storagePath.startsWith("youtube:");

  const variantsResult = await (db as unknown as {
    from: (table: "midia_variantes") => {
      select: (columns: "storage_path") => {
        eq: (column: "midia_id", value: string) => Promise<{ data: Array<{ storage_path: string }> | null; error: { message: string; code?: string } | null }>;
      };
    };
  })
    .from("midia_variantes")
    .select("storage_path")
    .eq("midia_id", midia.id);
  if (variantsResult.error) return mapDbError(variantsResult.error);

  const deleteJobIds: string[] = [];
  if (shouldDeleteFile) {
    const enqueueResult = await enqueueMidiaDeleteJob(db, user.id, {
      midiaId: midia.id,
      storageProvider: midia.storage_provider,
      storageBucket,
      storagePath,
    });
    if (!enqueueResult.ok) return enqueueResult;
    deleteJobIds.push(enqueueResult.data.id);

    const variantPaths = Array.from(new Set((variantsResult.data ?? []).map((item) => item.storage_path.trim())))
      .filter((path) => path && path !== storagePath);
    for (const variantPath of variantPaths) {
      const variantJob = await enqueueMidiaDeleteJob(db, user.id, {
        midiaId: midia.id,
        storageProvider: midia.storage_provider,
        storageBucket,
        storagePath: variantPath,
      });
      if (!variantJob.ok) return variantJob;
      deleteJobIds.push(variantJob.data.id);
    }
  }

  const deleteResult = await db
    .from("midia")
    .delete()
    .eq("id", midiaId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteResult.error) return mapDbError(deleteResult.error);
  if (!deleteResult.data) return fail("NOT_FOUND", "Midia not found");

  const immediateDeleteEnabled =
    process.env.MEDIA_DELETE_IMMEDIATE === "true" ||
    (process.env.NODE_ENV === "development" && process.env.MEDIA_DELETE_IMMEDIATE !== "false");
  if (immediateDeleteEnabled && deleteJobIds.length > 0) {
    const processed = await processMidiaDeleteJobs(deleteJobIds.length, deleteJobIds);
    if (!processed.ok || processed.data.failed > 0) {
      console.error("[deleteMidiaOwned] exclusão física imediata incompleta; jobs mantidos para retry", {
        midiaId,
        jobIds: deleteJobIds,
        error: processed.ok ? null : processed.error,
        result: processed.ok ? processed.data : null,
      });
    }
  }

  return ok({ id: deleteResult.data.id as string });
}

export async function optimizeMidiaOwnedTo1920(
  accessToken: string,
  midiaId: string,
  filenameBase?: string | null,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const midiaResult = await db
    .from("midia")
    .select("id,owner_id,tipo,storage_provider,storage_bucket,storage_path,url")
    .eq("id", midiaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (midiaResult.error) return mapDbError(midiaResult.error);
  if (!midiaResult.data) return fail("NOT_FOUND", "Midia not found");

  const midia = midiaResult.data as {
    id: string;
    owner_id: string;
    tipo: MidiaTipo;
    storage_provider: "SUPABASE" | "S3";
    storage_bucket: string;
    storage_path: string;
    url: string;
  };

  const oldPath = (midia.storage_path ?? "").trim();
  const oldBucket = (midia.storage_bucket ?? "").trim();
  const isOptimizable =
    midia.tipo === "IMAGEM" &&
    midia.storage_provider === "SUPABASE" &&
    oldBucket.length > 0 &&
    oldPath.length > 0 &&
    !oldPath.startsWith("youtube:");

  if (!isOptimizable) return ok({ id: midia.id });
  if (oldPath.includes("/optimized/")) return ok({ id: midia.id });

  const sourceBufferResult = await fetchSourceImageBuffer({
    storageProvider: midia.storage_provider,
    storageBucket: midia.storage_bucket,
    storagePath: midia.storage_path,
    url: midia.url,
  });
  if (!sourceBufferResult.ok) return sourceBufferResult;

  let renderedBuffer: Buffer;
  let renderedMetadata: sharp.Metadata;
  try {
    renderedBuffer = await sharp(sourceBufferResult.data, { failOn: "none" })
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    renderedMetadata = await sharp(renderedBuffer, { failOn: "none" }).metadata();
  } catch (error) {
    return fail("DATABASE_ERROR", "Falha ao otimizar imagem para 1920px", {
      message: (error as Error).message,
    });
  }

  if (!renderedBuffer.byteLength) {
    return fail("DATABASE_ERROR", "Imagem otimizada retornou vazia");
  }

  const mime = "image/jpeg";
  const newPath = buildDerivedImagePath(user.id, "optimized", filenameBase, "w1920");
  const uploadFile = new File([bufferToArrayBuffer(renderedBuffer)], buildDerivedImageFileName(filenameBase, "w1920"), { type: mime });

  let uploaded: { publicUrl: string; path: string; bucket: string; size: number | null };
  try {
    const storage = createMediaStorageProvider();
    uploaded = await storage.upload({
      bucket: oldBucket,
      path: newPath,
      file: uploadFile,
      contentType: mime,
    });
  } catch (error) {
    return fail("DATABASE_ERROR", "Falha ao salvar imagem otimizada", {
      message: (error as Error).message,
    });
  }

  const updateResult = await db
    .from("midia")
    .update({
      storage_bucket: uploaded.bucket,
      storage_path: uploaded.path,
      url: uploaded.publicUrl,
      tamanho_bytes: uploaded.size,
      largura: renderedMetadata.width ?? null,
      altura: renderedMetadata.height ?? null,
    })
    .eq("id", midia.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateResult.error) return mapDbError(updateResult.error);
  if (!updateResult.data) return fail("NOT_FOUND", "Midia not found");

  const isPropertyContract = oldBucket === getPrivateBucketName();
  if (isPropertyContract) {
    const variantsResult = await createPrivateResponsiveVariants({
      db,
      ownerId: user.id,
      midiaId: midia.id,
      bucket: uploaded.bucket,
      masterPath: uploaded.path,
      masterBuffer: renderedBuffer,
      masterWidth: renderedMetadata.width ?? 0,
      masterHeight: renderedMetadata.height ?? 0,
    });
    if (!variantsResult.ok) return variantsResult;
  }

  if (oldPath !== uploaded.path) {
    try {
      const storage = createMediaStorageProvider();
      await storage.remove(oldBucket, oldPath);
    } catch (error) {
      return fail("DATABASE_ERROR", "Imagem otimizada salva, mas falhou ao remover original", {
        message: (error as Error).message,
      });
    }
  }

  return ok({ id: midia.id });
}

async function createPrivateResponsiveVariants(input: {
  db: DynamicClient;
  ownerId: string;
  midiaId: string;
  bucket: string;
  masterPath: string;
  masterBuffer: Buffer;
  masterWidth: number;
  masterHeight: number;
}): Promise<ApiResult<null>> {
  const storage = createMediaStorageProvider();
  const rows: Array<Record<string, unknown>> = [
    {
      midia_id: input.midiaId,
      tipo: "FULL_1920",
      largura: input.masterWidth,
      altura: input.masterHeight,
      storage_path: input.masterPath,
      tamanho_bytes: input.masterBuffer.byteLength,
    },
  ];

  for (const variant of RESPONSIVE_IMAGE_WIDTHS.filter((item) => item.tipo !== "FULL_1920")) {
    let buffer: Buffer;
    let metadata: sharp.Metadata;
    try {
      buffer = await sharp(input.masterBuffer, { failOn: "none" })
        .resize({ width: variant.width, height: variant.width, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      metadata = await sharp(buffer, { failOn: "none" }).metadata();
    } catch (error) {
      return fail("DATABASE_ERROR", `Falha ao gerar variante ${variant.tipo}`, {
        message: (error as Error).message,
      });
    }

    const path = buildPrivateVariantPath(input.ownerId, input.midiaId, variant.tipo);
    try {
      await storage.upload({
        bucket: input.bucket,
        path,
        file: new File([bufferToArrayBuffer(buffer)], `${variant.tipo.toLowerCase()}.webp`, { type: "image/webp" }),
        contentType: "image/webp",
        upsert: true,
      });
    } catch (error) {
      return fail("DATABASE_ERROR", `Falha ao salvar variante ${variant.tipo}`, {
        message: (error as Error).message,
      });
    }

    rows.push({
      midia_id: input.midiaId,
      tipo: variant.tipo,
      largura: metadata.width ?? Math.min(input.masterWidth, variant.width),
      altura: metadata.height ?? Math.round((input.masterHeight / Math.max(1, input.masterWidth)) * Math.min(input.masterWidth, variant.width)),
      storage_path: path,
      tamanho_bytes: buffer.byteLength,
    });
  }

  const upsert = await (input.db as unknown as {
    from: (table: "midia_variantes") => {
      upsert: (values: Array<Record<string, unknown>>, options: { onConflict: string }) => Promise<{ error: { message: string; code?: string } | null }>;
    };
  })
    .from("midia_variantes")
    .upsert(rows, { onConflict: "midia_id,tipo" });

  if (upsert.error) return mapDbError(upsert.error);
  return ok(null);
}

async function applyArticleCornerWatermarkToMidia(
  accessToken: string,
  midiaId: string,
  filenameBase?: string | null,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const midiaResult = await db
    .from("midia")
    .select("id,owner_id,tipo,storage_provider,storage_bucket,storage_path,url")
    .eq("id", midiaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (midiaResult.error) return mapDbError(midiaResult.error);
  if (!midiaResult.data) return fail("NOT_FOUND", "Midia not found");

  const midia = midiaResult.data as {
    id: string;
    owner_id: string;
    tipo: MidiaTipo;
    storage_provider: "SUPABASE" | "S3";
    storage_bucket: string;
    storage_path: string;
    url: string;
  };

  const oldPath = (midia.storage_path ?? "").trim();
  const oldBucket = (midia.storage_bucket ?? "").trim();
  const canWatermark =
    midia.tipo === "IMAGEM" &&
    midia.storage_provider === "SUPABASE" &&
    oldBucket.length > 0 &&
    oldPath.length > 0 &&
    !oldPath.startsWith("youtube:");

  if (!canWatermark) return ok({ id: midia.id });
  if (oldPath.includes("/article-watermarked/")) return ok({ id: midia.id });

  const profileResult = await db
    .from("profiles")
    .select("nickname,logo_nickname_white_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) return mapDbError(profileResult.error);

  const nickname =
    typeof (profileResult.data as { nickname?: string | null } | null)?.nickname === "string"
      ? ((profileResult.data as { nickname?: string | null }).nickname ?? "").trim()
      : "";
  let logoNicknameWhiteUrl =
    typeof (profileResult.data as { logo_nickname_white_url?: string | null } | null)
      ?.logo_nickname_white_url === "string"
      ? ((profileResult.data as { logo_nickname_white_url?: string | null }).logo_nickname_white_url ?? "").trim()
      : "";

  if (!logoNicknameWhiteUrl && nickname) {
    const logoResult = await ensureProfileNicknameLogos(user.id);
    if (logoResult.ok) logoNicknameWhiteUrl = logoResult.data.logo_nickname_white_url;
  }

  let logoWhiteBuffer: Buffer | null = null;
  if (logoNicknameWhiteUrl) {
    const logoBufferResult = await fetchPublicImageBuffer(logoNicknameWhiteUrl);
    if (logoBufferResult.ok) logoWhiteBuffer = logoBufferResult.data;
  }

  const sourceBufferResult = await fetchSourceImageBuffer({
    storageProvider: midia.storage_provider,
    storageBucket: midia.storage_bucket,
    storagePath: midia.storage_path,
    url: midia.url,
  });
  if (!sourceBufferResult.ok) return sourceBufferResult;

  let watermarkedBuffer: Buffer;
  try {
    watermarkedBuffer = await renderCornerWatermarkedImage(sourceBufferResult.data, {
      nickname: nickname || null,
      logoPngBuffer: logoWhiteBuffer,
    });
  } catch (error) {
    return fail("DATABASE_ERROR", "Falha ao aplicar marca d'água na imagem do artigo.", {
      message: (error as Error).message,
    });
  }

  if (!watermarkedBuffer.byteLength) {
    return fail("DATABASE_ERROR", "Imagem com marca d'água retornou vazia");
  }

  const mime = "image/jpeg";
  const newPath = buildDerivedImagePath(user.id, "article-watermarked", filenameBase, "article-w1920");
  const uploadFile = new File([bufferToArrayBuffer(watermarkedBuffer)], buildDerivedImageFileName(filenameBase, "article-w1920"), { type: mime });

  let uploaded: { publicUrl: string; path: string; bucket: string; size: number | null };
  try {
    const storage = createMediaStorageProvider();
    uploaded = await storage.upload({
      bucket: oldBucket,
      path: newPath,
      file: uploadFile,
      contentType: mime,
    });
  } catch (error) {
    return fail("DATABASE_ERROR", "Falha ao salvar imagem do artigo com marca d'água", {
      message: (error as Error).message,
    });
  }

  const updateResult = await db
    .from("midia")
    .update({
      storage_bucket: uploaded.bucket,
      storage_path: uploaded.path,
      url: uploaded.publicUrl,
      tamanho_bytes: uploaded.size,
    })
    .eq("id", midia.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateResult.error) return mapDbError(updateResult.error);
  if (!updateResult.data) return fail("NOT_FOUND", "Midia not found");

  if (oldPath !== uploaded.path) {
    try {
      const storage = createMediaStorageProvider();
      await storage.remove(oldBucket, oldPath);
    } catch (error) {
      return fail("DATABASE_ERROR", "Imagem salva com marca d'água, mas falhou ao remover versão anterior", {
        message: (error as Error).message,
      });
    }
  }

  return ok({ id: midia.id });
}

export async function createYoutubeMidiaEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
  youtubeUrl: string,
  ordem = 0,
  titulo?: string | null,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnEmpreendimento(db, user.id, empreendimentoId);
  if (!own.ok) return own;

  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    return fail("VALIDATION_ERROR", "Invalid YouTube URL");
  }
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const normalizedTitulo = typeof titulo === "string" ? titulo.trim() : "";
  const tituloValue = normalizedTitulo.length > 0 ? normalizedTitulo : null;

  const existingRel = await db
    .from("midia_relacoes")
    .select("midia:midia_id(id,url)")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .eq("grupo", "YOUTUBE")
    .order("id", { ascending: true });

  if (existingRel.error) return mapDbError(existingRel.error);

  const existingMidia = ((existingRel.data ?? []) as Array<{
    midia: { id: string; url: string } | null;
  }>)
    .map((row) => row.midia)
    .find((midia) => midia?.url === canonicalUrl);

  if (existingMidia?.id) {
    if (tituloValue) {
      const updateTitle = await db
        .from("midia")
        .update({ titulo: tituloValue })
        .eq("owner_id", user.id)
        .eq("id", existingMidia.id)
        .select("id")
        .maybeSingle();
      if (updateTitle.error) return mapDbError(updateTitle.error);
    }

    const updateOrder = await db
      .from("midia_relacoes")
      .update({ ordem })
      .eq("owner_id", user.id)
      .eq("ref_tipo", "EMPREENDIMENTO")
      .eq("ref_id", empreendimentoId)
      .eq("midia_id", existingMidia.id)
      .select("id")
      .maybeSingle();

    if (updateOrder.error) return mapDbError(updateOrder.error);
    return ok({ id: existingMidia.id });
  }

  const midiaInsert = await db
    .from("midia")
    .insert({
      owner_id: user.id,
      tipo: "VIDEO",
      storage_provider: "SUPABASE",
      storage_bucket: "__external__",
      storage_path: `youtube:${videoId}`,
      url: canonicalUrl,
      titulo: tituloValue,
    })
    .select("id")
    .single();

  if (midiaInsert.error) return mapDbError(midiaInsert.error);
  if (!midiaInsert.data) return fail("DATABASE_ERROR", "Media insert returned no data");

  const relInsert = await db
    .from("midia_relacoes")
    .insert({
      owner_id: user.id,
      ref_tipo: "EMPREENDIMENTO",
      ref_id: empreendimentoId,
      midia_id: midiaInsert.data.id,
      ordem,
      grupo: "YOUTUBE",
    })
    .select("id")
    .single();

  if (relInsert.error) return mapDbError(relInsert.error);
  return ok({ id: midiaInsert.data.id as string });
}

export async function createYoutubeMidiaImovel(
  accessToken: string,
  imovelId: string,
  youtubeUrl: string,
  ordem = 0,
  titulo?: string | null,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnImovel(db, user.id, imovelId);
  if (!own.ok) return own;

  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    return fail("VALIDATION_ERROR", "Invalid YouTube URL");
  }
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const normalizedTitulo = typeof titulo === "string" ? titulo.trim() : "";
  const tituloValue = normalizedTitulo.length > 0 ? normalizedTitulo : null;

  const existingRel = await db
    .from("midia_relacoes")
    .select("midia:midia_id(id,url)")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId)
    .eq("grupo", "YOUTUBE")
    .order("id", { ascending: true });

  if (existingRel.error) return mapDbError(existingRel.error);

  const existingMidia = ((existingRel.data ?? []) as Array<{
    midia: { id: string; url: string } | null;
  }>)
    .map((row) => row.midia)
    .find((midia) => midia?.url === canonicalUrl);

  if (existingMidia?.id) {
    if (tituloValue) {
      const updateTitle = await db
        .from("midia")
        .update({ titulo: tituloValue })
        .eq("owner_id", user.id)
        .eq("id", existingMidia.id)
        .select("id")
        .maybeSingle();
      if (updateTitle.error) return mapDbError(updateTitle.error);
    }

    const updateOrder = await db
      .from("midia_relacoes")
      .update({ ordem })
      .eq("owner_id", user.id)
      .eq("ref_tipo", "IMOVEL")
      .eq("ref_id", imovelId)
      .eq("midia_id", existingMidia.id)
      .select("id")
      .maybeSingle();

    if (updateOrder.error) return mapDbError(updateOrder.error);
    return ok({ id: existingMidia.id });
  }

  const midiaInsert = await db
    .from("midia")
    .insert({
      owner_id: user.id,
      tipo: "VIDEO",
      storage_provider: "SUPABASE",
      storage_bucket: "__external__",
      storage_path: `youtube:${videoId}`,
      url: canonicalUrl,
      titulo: tituloValue,
    })
    .select("id")
    .single();

  if (midiaInsert.error) return mapDbError(midiaInsert.error);
  if (!midiaInsert.data) return fail("DATABASE_ERROR", "Media insert returned no data");

  const relInsert = await db
    .from("midia_relacoes")
    .insert({
      owner_id: user.id,
      ref_tipo: "IMOVEL",
      ref_id: imovelId,
      midia_id: midiaInsert.data.id,
      ordem,
      grupo: "YOUTUBE",
    })
    .select("id")
    .single();

  if (relInsert.error) return mapDbError(relInsert.error);
  return ok({ id: midiaInsert.data.id as string });
}

export async function attachExistingMidiaEmpreendimento(
  accessToken: string,
  empreendimentoId: string,
  input: {
    midiaId: string;
    ordem?: number;
    titulo?: string | null;
    alt?: string | null;
    legenda?: string | null;
    caracteristica?: string | null;
  },
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const own = await assertOwnEmpreendimento(db, user.id, empreendimentoId);
  if (!own.ok) return own;

  const midiaOwned = await db
    .from("midia")
    .select("id,owner_id")
    .eq("id", input.midiaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (midiaOwned.error) return mapDbError(midiaOwned.error);
  if (!midiaOwned.data) return fail("NOT_FOUND", "Midia not found");

  const relExists = await db
    .from("midia_relacoes")
    .select("id")
    .eq("owner_id", user.id)
    .eq("ref_tipo", "EMPREENDIMENTO")
    .eq("ref_id", empreendimentoId)
    .eq("midia_id", input.midiaId)
    .maybeSingle();

  if (relExists.error) return mapDbError(relExists.error);

  if (!relExists.data) {
    const relInsert = await db
      .from("midia_relacoes")
      .insert({
        owner_id: user.id,
        ref_tipo: "EMPREENDIMENTO",
        ref_id: empreendimentoId,
        midia_id: input.midiaId,
        ordem: input.ordem ?? 0,
        grupo: null,
      })
      .select("id")
      .single();

    if (relInsert.error) return mapDbError(relInsert.error);
  } else {
    const relUpdate = await db
      .from("midia_relacoes")
      .update({ ordem: input.ordem ?? 0 })
      .eq("id", relExists.data.id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();
    if (relUpdate.error) return mapDbError(relUpdate.error);
  }

  const metadataPatch = await db
    .from("midia")
    .update({
      titulo: input.titulo ?? null,
      alt: input.alt ?? null,
      legenda: input.legenda ?? null,
      caracteristica: input.caracteristica ?? null,
    })
    .eq("id", input.midiaId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (metadataPatch.error) return mapDbError(metadataPatch.error);

  const syncResult = await syncEmpreendimentoPublicMidia(accessToken, empreendimentoId);
  if (!syncResult.ok) return syncResult;

  return ok({ id: input.midiaId });
}
