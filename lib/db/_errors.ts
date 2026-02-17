import { fail, type ApiResult } from "@/lib/api/result";

type DbErrorLike = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

export function mapDbError<T>(error: DbErrorLike): ApiResult<T> {
  if (error.code === "23505") {
    return fail("CONFLICT", error.message, { details: error.details, hint: error.hint });
  }

  if (error.code === "23514" || error.code === "P0001") {
    return fail("VALIDATION_ERROR", error.message, {
      details: error.details,
      hint: error.hint,
    });
  }

  return fail("DATABASE_ERROR", error.message, { details: error.details, hint: error.hint });
}

export type { DbErrorLike };

