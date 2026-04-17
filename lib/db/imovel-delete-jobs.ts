import { fail, ok, type ApiResult } from "@/lib/api/result";
import { mapDbError } from "@/lib/db/_errors";
import type { DynamicClient } from "@/lib/db/_dynamic-client";
import { enqueueMidiaDeleteJob } from "@/lib/db/midia";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ImovelDeleteJobStatus = "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";

type ImovelDeleteJobRow = {
  id: string;
  owner_id: string;
  imovel_id: string;
  status: ImovelDeleteJobStatus;
  tentativas: number;
  next_retry_at: string | null;
};

type MidiaRelacaoRefRow = {
  midia_id: string;
  ref_tipo: string;
  ref_id: string | null;
};

type MidiaStorageRow = {
  id: string;
  storage_provider: "SUPABASE" | "S3";
  storage_bucket: string;
  storage_path: string;
};

type DynamicAdminClient = ReturnType<typeof createSupabaseAdminClient>;

function computeRetryDelayMinutes(currentTentativas: number) {
  const exp = Math.min(8, Math.max(0, currentTentativas));
  return Math.min(12 * 60, 5 * (2 ** exp));
}

export async function enqueueImovelDeleteJob(
  db: DynamicClient,
  ownerId: string,
  imovelId: string,
): Promise<ApiResult<{ id: string }>> {
  const upsertResult = await (db as unknown as {
    from: (table: "imovel_delete_jobs") => {
      upsert: (
        values: Record<string, unknown>,
        options: { onConflict: string },
      ) => {
        select: (columns: "id") => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string; code?: string } | null }>;
        };
      };
    };
  })
    .from("imovel_delete_jobs")
    .upsert(
      {
        owner_id: ownerId,
        imovel_id: imovelId,
        status: "PENDENTE",
        tentativas: 0,
        erro: null,
        next_retry_at: null,
        started_at: null,
        finished_at: null,
      },
      { onConflict: "owner_id,imovel_id" },
    )
    .select("id")
    .single();

  if (upsertResult.error) return mapDbError(upsertResult.error);
  if (!upsertResult.data) return fail("DATABASE_ERROR", "Delete job insert returned no data");
  return ok({ id: upsertResult.data.id });
}

export async function cancelImovelDeleteJob(
  db: DynamicClient,
  ownerId: string,
  jobId: string,
): Promise<ApiResult<{ id: string }>> {
  const result = await (db as unknown as {
    from: (table: "imovel_delete_jobs") => {
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "id", value2: string) => {
            select: (columns: "id") => {
              maybeSingle: () => Promise<{
                data: { id: string } | null;
                error: { message: string; code?: string } | null;
              }>;
            };
          };
        };
      };
    };
  })
    .from("imovel_delete_jobs")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", jobId)
    .select("id")
    .maybeSingle();

  if (result.error) return mapDbError(result.error);
  if (!result.data) return ok({ id: jobId });
  return ok({ id: result.data.id });
}

async function claimNextJobs(db: DynamicAdminClient, limit: number) {
  const result = await (db as unknown as {
    from: (table: "imovel_delete_jobs") => {
      select: (columns: string) => {
        in: (column: "status", values: ImovelDeleteJobStatus[]) => {
          order: (column2: "created_at", options: { ascending: boolean }) => {
            limit: (value: number) => Promise<{
              data: ImovelDeleteJobRow[] | null;
              error: { message: string; code?: string } | null;
            }>;
          };
        };
      };
    };
  })
    .from("imovel_delete_jobs")
    .select("id,owner_id,imovel_id,status,tentativas,next_retry_at")
    .in("status", ["PENDENTE", "ERRO"])
    .order("created_at", { ascending: true })
    .limit(limit * 3);

  if (result.error) return fail<ImovelDeleteJobRow[]>("DATABASE_ERROR", result.error.message);

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
    from: (table: "imovel_delete_jobs") => {
      update: (value: Record<string, unknown>) => {
        eq: (column: "id", value: string) => {
          select: (columns: "id") => {
            maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
          };
        };
      };
    };
  })
    .from("imovel_delete_jobs")
    .update(patch)
    .eq("id", jobId)
    .select("id")
    .maybeSingle();

  if (result.error) return fail("DATABASE_ERROR", result.error.message);
  if (!result.data) return fail("NOT_FOUND", "Delete job not found");
  return ok({ id: result.data.id });
}

async function listCurrentMidiaRefs(db: DynamicAdminClient, ownerId: string, imovelId: string) {
  const result = await (db as unknown as {
    from: (table: "midia_relacoes") => {
      select: (columns: "midia_id,ref_tipo,ref_id") => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "ref_tipo", value2: "IMOVEL") => {
            eq: (column3: "ref_id", value3: string) => Promise<{
              data: MidiaRelacaoRefRow[] | null;
              error: { message: string; code?: string } | null;
            }>;
          };
        };
      };
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "ref_tipo", value2: "IMOVEL") => {
            eq: (column3: "ref_id", value3: string) => Promise<{
              error: { message: string; code?: string } | null;
            }>;
          };
        };
      };
    };
  })
    .from("midia_relacoes")
    .select("midia_id,ref_tipo,ref_id")
    .eq("owner_id", ownerId)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId);

  if (result.error) return fail<MidiaRelacaoRefRow[]>("DATABASE_ERROR", result.error.message);
  return ok(result.data ?? []);
}

async function listAllMidiaRefs(db: DynamicAdminClient, ownerId: string, midiaIds: string[]) {
  if (midiaIds.length === 0) return ok<MidiaRelacaoRefRow[]>([]);

  const result = await (db as unknown as {
    from: (table: "midia_relacoes") => {
      select: (columns: "midia_id,ref_tipo,ref_id") => {
        eq: (column: "owner_id", value: string) => {
          in: (column2: "midia_id", values: string[]) => Promise<{
            data: MidiaRelacaoRefRow[] | null;
            error: { message: string; code?: string } | null;
          }>;
        };
      };
    };
  })
    .from("midia_relacoes")
    .select("midia_id,ref_tipo,ref_id")
    .eq("owner_id", ownerId)
    .in("midia_id", midiaIds);

  if (result.error) return fail<MidiaRelacaoRefRow[]>("DATABASE_ERROR", result.error.message);
  return ok(result.data ?? []);
}

async function listMidiaRows(db: DynamicAdminClient, ownerId: string, midiaIds: string[]) {
  if (midiaIds.length === 0) return ok<MidiaStorageRow[]>([]);

  const result = await (db as unknown as {
    from: (table: "midia") => {
      select: (columns: "id,storage_provider,storage_bucket,storage_path") => {
        eq: (column: "owner_id", value: string) => {
          in: (column2: "id", values: string[]) => Promise<{
            data: MidiaStorageRow[] | null;
            error: { message: string; code?: string } | null;
          }>;
        };
      };
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          in: (column2: "id", values: string[]) => Promise<{
            error: { message: string; code?: string } | null;
          }>;
        };
      };
    };
  })
    .from("midia")
    .select("id,storage_provider,storage_bucket,storage_path")
    .eq("owner_id", ownerId)
    .in("id", midiaIds);

  if (result.error) return fail<MidiaStorageRow[]>("DATABASE_ERROR", result.error.message);
  return ok(result.data ?? []);
}

async function deleteMidiaRows(db: DynamicAdminClient, ownerId: string, midiaIds: string[]) {
  if (midiaIds.length === 0) return ok(null);

  const result = await (db as unknown as {
    from: (table: "midia") => {
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          in: (column2: "id", values: string[]) => Promise<{
            error: { message: string; code?: string } | null;
          }>;
        };
      };
    };
  })
    .from("midia")
    .delete()
    .eq("owner_id", ownerId)
    .in("id", midiaIds);

  if (result.error) return fail("DATABASE_ERROR", result.error.message);
  return ok(null);
}

async function deleteRemainingImovelRefs(db: DynamicAdminClient, ownerId: string, imovelId: string) {
  const result = await (db as unknown as {
    from: (table: "midia_relacoes") => {
      delete: () => {
        eq: (column: "owner_id", value: string) => {
          eq: (column2: "ref_tipo", value2: "IMOVEL") => {
            eq: (column3: "ref_id", value3: string) => Promise<{
              error: { message: string; code?: string } | null;
            }>;
          };
        };
      };
    };
  })
    .from("midia_relacoes")
    .delete()
    .eq("owner_id", ownerId)
    .eq("ref_tipo", "IMOVEL")
    .eq("ref_id", imovelId);

  if (result.error) return fail("DATABASE_ERROR", result.error.message);
  return ok(null);
}

export async function processImovelDeleteJobs(
  limit = 10,
): Promise<
  ApiResult<{
    processed: number;
    succeeded: number;
    failed: number;
  }>
> {
  const db = createSupabaseAdminClient();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.trunc(limit))) : 10;

  const next = await claimNextJobs(db, safeLimit);
  if (!next.ok) return next;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

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

    try {
      const currentRefs = await listCurrentMidiaRefs(db, job.owner_id, job.imovel_id);
      if (!currentRefs.ok) throw new Error(currentRefs.error.message);

      const candidateMidiaIds = Array.from(
        new Set(
          currentRefs.data
            .map((row) => row.midia_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      );

      if (candidateMidiaIds.length > 0) {
        const allRefs = await listAllMidiaRefs(db, job.owner_id, candidateMidiaIds);
        if (!allRefs.ok) throw new Error(allRefs.error.message);

        const removableMidiaIds = candidateMidiaIds.filter((midiaId) => {
          const refs = allRefs.data.filter((row) => row.midia_id === midiaId);
          return refs.every((row) => row.ref_tipo === "IMOVEL" && row.ref_id === job.imovel_id);
        });

        if (removableMidiaIds.length > 0) {
          const removableMidia = await listMidiaRows(db, job.owner_id, removableMidiaIds);
          if (!removableMidia.ok) throw new Error(removableMidia.error.message);

          for (const midia of removableMidia.data) {
            const enqueueResult = await enqueueMidiaDeleteJob(db, job.owner_id, {
              midiaId: midia.id,
              storageProvider: midia.storage_provider,
              storageBucket: midia.storage_bucket,
              storagePath: midia.storage_path,
            });
            if (!enqueueResult.ok) throw new Error(enqueueResult.error.message);
          }

          const deleteMidiaResult = await deleteMidiaRows(db, job.owner_id, removableMidiaIds);
          if (!deleteMidiaResult.ok) throw new Error(deleteMidiaResult.error.message);
        }
      }

      const deleteRefsResult = await deleteRemainingImovelRefs(db, job.owner_id, job.imovel_id);
      if (!deleteRefsResult.ok) throw new Error(deleteRefsResult.error.message);

      const done = await updateJob(db, job.id, {
        status: "CONCLUIDO",
        erro: null,
        next_retry_at: null,
        finished_at: new Date().toISOString(),
      });
      if (!done.ok) throw new Error(done.error.message);

      succeeded += 1;
    } catch (error) {
      failed += 1;
      await updateJob(db, job.id, {
        status: "ERRO",
        tentativas: (job.tentativas ?? 0) + 1,
        erro: error instanceof Error ? error.message : "Falha ao processar exclusão do imóvel",
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
  });
}
