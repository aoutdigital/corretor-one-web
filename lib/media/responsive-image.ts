export type PublicImageVariantKey = "W480" | "W768" | "W1024" | "FULL_1920";

export type PublicImageVariant = {
  url: string;
  storage_path?: string;
  largura: number;
  altura: number;
  formato?: "webp";
};

export type PublicImageVariants = Partial<Record<PublicImageVariantKey, PublicImageVariant>>;

export type ResponsivePublicImage = {
  url: string;
  variantes?: PublicImageVariants | null;
};

export function parsePublicImageVariants(value: unknown): PublicImageVariants {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: PublicImageVariants = {};
  for (const key of ["W480", "W768", "W1024", "FULL_1920"] as const) {
    const raw = source[key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.url !== "string" || !item.url.trim()) continue;
    const largura = Number(item.largura);
    const altura = Number(item.altura);
    if (!Number.isFinite(largura) || !Number.isFinite(altura)) continue;
    result[key] = {
      url: item.url,
      storage_path: typeof item.storage_path === "string" ? item.storage_path : undefined,
      largura,
      altura,
      formato: item.formato === "webp" ? "webp" : undefined,
    };
  }
  return result;
}

export function buildPublicImageSrcSet(image: ResponsivePublicImage): string | undefined {
  const variants = parsePublicImageVariants(image.variantes);
  const entries = [variants.W480, variants.W768, variants.W1024, variants.FULL_1920]
    .filter((item): item is PublicImageVariant => Boolean(item?.url && item.largura))
    .map((item) => `${item.url} ${item.largura}w`);
  return entries.length > 0 ? entries.join(", ") : undefined;
}

export function getPublicImageUrl(
  image: ResponsivePublicImage,
  preferred: PublicImageVariantKey,
): string {
  const variants = parsePublicImageVariants(image.variantes);
  return variants[preferred]?.url ?? variants.W1024?.url ?? variants.FULL_1920?.url ?? image.url;
}
