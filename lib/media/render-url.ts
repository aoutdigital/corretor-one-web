export type SupabaseImageFormat = "webp" | "origin";
export type SupabaseImageResize = "cover" | "contain" | "fill";

export type SupabaseRenderImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: SupabaseImageFormat;
  resize?: SupabaseImageResize;
};

const OBJECT_PUBLIC_SEGMENT = "/storage/v1/object/public/";
const RENDER_PUBLIC_SEGMENT = "/storage/v1/render/image/public/";

function normalizePositiveInteger(value: number | undefined): string | null {
  if (!Number.isFinite(value)) return null;
  const parsed = Math.round(value ?? 0);
  if (parsed <= 0) return null;
  return String(parsed);
}

export function buildSupabaseRenderImageUrl(
  url: string | null | undefined,
  options: SupabaseRenderImageOptions,
): string | null {
  const normalized = (url ?? "").trim();
  if (!normalized) return null;

  const base = normalized.includes(OBJECT_PUBLIC_SEGMENT)
    ? normalized.replace(OBJECT_PUBLIC_SEGMENT, RENDER_PUBLIC_SEGMENT)
    : normalized;

  if (!base.includes(RENDER_PUBLIC_SEGMENT)) return normalized;

  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return base;
  }

  const width = normalizePositiveInteger(options.width);
  const height = normalizePositiveInteger(options.height);
  const quality = normalizePositiveInteger(options.quality);

  if (width) parsed.searchParams.set("width", width);
  if (height) parsed.searchParams.set("height", height);
  if (quality) parsed.searchParams.set("quality", quality);
  if (options.resize) parsed.searchParams.set("resize", options.resize);
  if (options.format) parsed.searchParams.set("format", options.format);

  return parsed.toString();
}
