export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NOT_FOUND"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T>(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiResult<T> {
  return { ok: false, error: { code, message, details } };
}

export function statusFromErrorCode(code: ApiErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "VALIDATION_ERROR":
      return 400;
    case "CONFLICT":
      return 409;
    case "NOT_FOUND":
      return 404;
    case "DATABASE_ERROR":
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

