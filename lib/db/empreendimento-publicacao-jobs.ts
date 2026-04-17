import { fail, ok, type ApiResult } from "@/lib/api/result";
import { authenticateByAccessToken } from "@/lib/db/_auth";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { updateEmpreendimento } from "@/lib/db/empreendimentos";
import {
  attachExistingMidiaEmpreendimento,
  createYoutubeMidiaEmpreendimento,
  optimizeMidiaOwnedTo1920,
  reorderMidiaEmpreendimento,
  syncEmpreendimentoPublicMidia,
} from "@/lib/db/midia";

type PublishImageItem = {
  midiaId: string;
  ordem: number;
  alt?: string;
  legenda?: string;
  caracteristica?: string;
};

type PublishYoutubeItem = {
  url: string;
};

type PublishJobPayload = {
  imagens: PublishImageItem[];
  videos: PublishYoutubeItem[];
};

type JobStatus = "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";

type JobRow = {
  id: string;
  owner_id: string;
  empreendimento_id: string;
  status: JobStatus;
  tentativas: number;
  payload: unknown;
};

function parsePayload(payload: unknown): PublishJobPayload {
  if (!payload || typeof payload !== "object") {
    return { imagens: [], videos: [] };
  }
  const raw = payload as { imagens?: unknown; videos?: unknown };
  const imagens = Array.isArray(raw.imagens)
    ? raw.imagens
        .filter(
          (item): item is { midiaId?: unknown; ordem?: unknown; alt?: unknown; legenda?: unknown; caracteristica?: unknown } =>
            typeof item === "object" && item !== null,
        )
        .map((item) => ({
          midiaId: typeof item.midiaId === "string" ? item.midiaId : "",
          ordem: typeof item.ordem === "number" && Number.isFinite(item.ordem) ? item.ordem : 0,
          alt: typeof item.alt === "string" ? item.alt : "",
          legenda: typeof item.legenda === "string" ? item.legenda : "",
          caracteristica: typeof item.caracteristica === "string" ? item.caracteristica : "",
        }))
        .filter((item) => item.midiaId.length > 0)
    : [];

  const videos = Array.isArray(raw.videos)
    ? raw.videos
        .filter((item): item is { url?: unknown } => typeof item === "object" && item !== null)
        .map((item) => ({ url: typeof item.url === "string" ? item.url : "" }))
        .filter((item) => item.url.length > 0)
    : [];

  return { imagens, videos };
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

export async function enqueueEmpreendimentoPublicationJob(
  accessToken: string,
  empreendimentoId: string,
  payload: PublishJobPayload,
): Promise<ApiResult<{ id: string }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;
  const own = await assertOwnEmpreendimento(db, user.id, empreendimentoId);
  if (!own.ok) return own;

  const pendingExists = await (db as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => {
          in: (column: string, values: unknown[]) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
        };
      };
    };
  })
    .from("empreendimento_publicacao_jobs")
    .select("id")
    .eq("owner_id", user.id)
    .in("status", ["PENDENTE", "PROCESSANDO"])
    .maybeSingle();

  if (pendingExists.error) return mapDbError(pendingExists.error);
  if (pendingExists.data) {
    return ok({ id: pendingExists.data.id });
  }

  const insert = await (db as unknown as {
    from: (table: string) => {
      insert: (value: Record<string, unknown>) => {
        select: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
      };
    };
  })
    .from("empreendimento_publicacao_jobs")
    .insert({
      owner_id: user.id,
      empreendimento_id: empreendimentoId,
      status: "PENDENTE",
      payload,
    })
    .select("id")
    .single();

  if (insert.error) return mapDbError(insert.error);
  if (!insert.data) return fail("DATABASE_ERROR", "Job insert returned no data");
  return ok({ id: insert.data.id });
}

async function getNextPendingJob(db: DynamicClient, ownerId: string): Promise<ApiResult<JobRow | null>> {
  const result = await (db as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => {
          in: (column: string, values: unknown[]) => {
            order: (column: string, options: { ascending: boolean }) => {
              limit: (value: number) => {
                maybeSingle: () => Promise<{ data: JobRow | null; error: { message: string } | null }>;
              };
            };
          };
        };
      };
    };
  })
    .from("empreendimento_publicacao_jobs")
    .select("id,owner_id,empreendimento_id,status,tentativas,payload")
    .eq("owner_id", ownerId)
    .in("status", ["PENDENTE", "ERRO"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  return ok(result.data ?? null);
}

async function updateJobState(
  db: DynamicClient,
  ownerId: string,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<ApiResult<{ id: string }>> {
  const result = await (db as unknown as {
    from: (table: string) => {
      update: (value: Record<string, unknown>) => {
        eq: (column: string, value: unknown) => {
          eq: (column2: string, value2: unknown) => {
            select: (columns: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
          };
        };
      };
    };
  })
    .from("empreendimento_publicacao_jobs")
    .update(patch)
    .eq("id", jobId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return fail("NOT_FOUND", "Job not found");
  return ok({ id: result.data.id });
}

export async function processNextEmpreendimentoPublicationJob(
  accessToken: string,
): Promise<ApiResult<{ processed: boolean; jobId: string | null; empreendimentoId: string | null }>> {
  const auth = await authenticateByAccessToken(accessToken);
  if (!auth.ok) return auth;

  const { user, client } = auth.data;
  const db = client as unknown as DynamicClient;

  const next = await getNextPendingJob(db, user.id);
  if (!next.ok) return next;
  if (!next.data) {
    return ok({ processed: false, jobId: null, empreendimentoId: null });
  }

  const job = next.data;
  const claim = await updateJobState(db, user.id, job.id, {
    status: "PROCESSANDO",
    tentativas: (job.tentativas ?? 0) + 1,
    started_at: new Date().toISOString(),
    erro: null,
  });
  if (!claim.ok) return claim;

  const payload = parsePayload(job.payload);
  const imagemMidiaIds: string[] = [];
  const videoMidiaIds: string[] = [];

  try {
    for (const image of payload.imagens) {
      const attach = await attachExistingMidiaEmpreendimento(accessToken, job.empreendimento_id, {
        midiaId: image.midiaId,
        ordem: image.ordem,
        alt: image.alt?.trim() || null,
        legenda: image.legenda?.trim() || null,
        caracteristica: image.caracteristica?.trim() || null,
      });
      if (!attach.ok) {
        throw new Error(attach.error.message);
      }
      const optimized = await optimizeMidiaOwnedTo1920(accessToken, image.midiaId);
      if (!optimized.ok) {
        throw new Error(optimized.error.message);
      }
      imagemMidiaIds.push(image.midiaId);
    }

    for (let index = 0; index < payload.videos.length; index += 1) {
      const video = payload.videos[index];
      const created = await createYoutubeMidiaEmpreendimento(
        accessToken,
        job.empreendimento_id,
        video.url,
        payload.imagens.length + index,
      );
      if (!created.ok) {
        throw new Error(created.error.message);
      }
      videoMidiaIds.push(created.data.id);
    }

    const orderedMidia = [...imagemMidiaIds, ...videoMidiaIds];
    if (orderedMidia.length > 0) {
      const reorder = await reorderMidiaEmpreendimento(accessToken, job.empreendimento_id, orderedMidia);
      if (!reorder.ok) {
        throw new Error(reorder.error.message);
      }
    }

    const publish = await updateEmpreendimento(accessToken, job.empreendimento_id, {
      status: "PUBLICADO",
      publicado_em: new Date().toISOString(),
    });
    if (!publish.ok) {
      throw new Error(publish.error.message);
    }

    const syncPublicMidia = await syncEmpreendimentoPublicMidia(accessToken, job.empreendimento_id);
    if (!syncPublicMidia.ok) {
      throw new Error(syncPublicMidia.error.message);
    }

    const done = await updateJobState(db, user.id, job.id, {
      status: "CONCLUIDO",
      finished_at: new Date().toISOString(),
      erro: null,
    });
    if (!done.ok) {
      throw new Error(done.error.message);
    }

    return ok({ processed: true, jobId: job.id, empreendimentoId: job.empreendimento_id });
  } catch (error) {
    await updateJobState(db, user.id, job.id, {
      status: "ERRO",
      finished_at: new Date().toISOString(),
      erro: (error as Error).message,
    });
    return fail("DATABASE_ERROR", "Falha ao processar publicacao", {
      message: (error as Error).message,
      jobId: job.id,
    });
  }
}
