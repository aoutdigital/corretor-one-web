import { fail, ok, type ApiResult } from "@/lib/api/result";
import { createMediaStorageProvider } from "@/lib/media";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MidiaDeleteJobStatus = "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO" | "CANCELADO";

type MidiaDeleteJobRow = {
  id: string;
  owner_id: string;
  midia_id: string | null;
  storage_provider: string;
  storage_bucket: string;
  storage_path: string;
  status: MidiaDeleteJobStatus;
  tentativas: number;
  next_retry_at: string | null;
};

type DynamicAdminClient = ReturnType<typeof createSupabaseAdminClient>;

function computeRetryDelayMinutes(currentTentativas: number) {
  const exp = Math.min(8, Math.max(0, currentTentativas));
  return Math.min(12 * 60, 5 * (2 ** exp));
}

async function claimNextJobs(db: DynamicAdminClient, limit: number) {
  const result = await (db as unknown as {
    from: (table: "midia_delete_jobs") => {
      select: (columns: string) => {
        in: (column: "status", values: MidiaDeleteJobStatus[]) => {
          order: (column3: "created_at", options: { ascending: boolean }) => {
            limit: (value3: number) => Promise<{ data: MidiaDeleteJobRow[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  })
    .from("midia_delete_jobs")
    .select("id,owner_id,midia_id,storage_provider,storage_bucket,storage_path,status,tentativas,next_retry_at")
    .in("status", ["PENDENTE", "ERRO"])
    .order("created_at", { ascending: true })
    .limit(limit * 3);

  if (result.error) return fail<MidiaDeleteJobRow[]>("DATABASE_ERROR", result.error.message);
  const nowTs = Date.now();
  const eligible = (result.data ?? []).filter((job) => {
    if (job.status === "PENDENTE") return true;
    if (job.status !== "ERRO") return false;
    if (!job.next_retry_at) return true;
    const nextRetry = new Date(job.next_retry_at).getTime();
    if (!Number.isFinite(nextRetry)) return true;
    return nextRetry <= nowTs;
  });
  return ok(eligible.slice(0, limit));
}

async function updateJob(
  db: DynamicAdminClient,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<ApiResult<{ id: string }>> {
  const result = await (db as unknown as {
    from: (table: "midia_delete_jobs") => {
      update: (value: Record<string, unknown>) => {
        eq: (column: "id", value: string) => {
          select: (columns: "id") => {
            maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
          };
        };
      };
    };
  })
    .from("midia_delete_jobs")
    .update(patch)
    .eq("id", jobId)
    .select("id")
    .maybeSingle();

  if (result.error) return fail("DATABASE_ERROR", result.error.message);
  if (!result.data) return fail("NOT_FOUND", "Delete job not found");
  return ok({ id: result.data.id });
}

async function isStorageStillReferenced(
  db: DynamicAdminClient,
  storageBucket: string,
  storagePath: string,
) {
  const result = await (db as unknown as {
    from: (table: "midia") => {
      select: (columns: "id") => {
        eq: (column: "storage_bucket", value: string) => {
          eq: (column2: "storage_path", value2: string) => {
            limit: (value: number) => Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>;
          };
        };
      };
    };
  })
    .from("midia")
    .select("id")
    .eq("storage_bucket", storageBucket)
    .eq("storage_path", storagePath)
    .limit(1);

  if (result.error) return fail<boolean>("DATABASE_ERROR", result.error.message);
  return ok((result.data ?? []).length > 0);
}

export async function processMidiaDeleteJobs(
  limit = 20,
): Promise<
  ApiResult<{
    processed: number;
    succeeded: number;
    failed: number;
    canceled: number;
  }>
> {
  const db = createSupabaseAdminClient();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.trunc(limit))) : 20;

  const next = await claimNextJobs(db, safeLimit);
  if (!next.ok) return next;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let canceled = 0;

  for (const job of next.data) {
    const claim = await updateJob(db, job.id, {
      status: "PROCESSANDO",
      started_at: new Date().toISOString(),
      erro: null,
    });
    if (!claim.ok) {
      failed += 1;
      continue;
    }

    processed += 1;

    const storageBucket = (job.storage_bucket ?? "").trim();
    const storagePath = (job.storage_path ?? "").trim();
    const shouldDelete =
      job.storage_provider === "SUPABASE" &&
      storageBucket.length > 0 &&
      storagePath.length > 0 &&
      !storagePath.startsWith("youtube:");

    if (!shouldDelete) {
      await updateJob(db, job.id, {
        status: "CANCELADO",
        erro: "Storage provider/path não elegível para deleção física",
        finished_at: new Date().toISOString(),
      });
      canceled += 1;
      continue;
    }

    const referenced = await isStorageStillReferenced(db, storageBucket, storagePath);
    if (!referenced.ok) {
      failed += 1;
      await updateJob(db, job.id, {
        status: "ERRO",
        tentativas: (job.tentativas ?? 0) + 1,
        erro: referenced.error.message,
        next_retry_at: new Date(
          Date.now() + computeRetryDelayMinutes((job.tentativas ?? 0) + 1) * 60 * 1000,
        ).toISOString(),
      });
      continue;
    }

    if (referenced.data) {
      await updateJob(db, job.id, {
        status: "CANCELADO",
        erro: "Arquivo ainda referenciado na tabela midia",
        finished_at: new Date().toISOString(),
      });
      canceled += 1;
      continue;
    }

    try {
      const storage = createMediaStorageProvider();
      await storage.remove(storageBucket, storagePath);
      await updateJob(db, job.id, {
        status: "CONCLUIDO",
        erro: null,
        finished_at: new Date().toISOString(),
      });
      succeeded += 1;
    } catch (error) {
      failed += 1;
      await updateJob(db, job.id, {
        status: "ERRO",
        tentativas: (job.tentativas ?? 0) + 1,
        erro: error instanceof Error ? error.message : "Falha ao remover arquivo do storage",
        next_retry_at: new Date(
          Date.now() + computeRetryDelayMinutes((job.tentativas ?? 0) + 1) * 60 * 1000,
        ).toISOString(),
      });
    }
  }

  return ok({
    processed,
    succeeded,
    failed,
    canceled,
  });
}
