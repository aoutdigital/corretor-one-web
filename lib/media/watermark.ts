import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

type WatermarkLogoInput = {
  nickname?: string | null;
  logoPngBuffer?: Buffer | null;
};

export type CorretorOneLogoTheme = "default" | "white";

type LogoGlyphMap = {
  unitsPerEm?: number;
  coordinateSystem?: string;
  baseHeight?: number;
  baselineY?: number;
  glyphs?: Record<
    string,
    {
      d?: string;
      advance?: number;
      originX?: number;
    }
  >;
  kerning?: Record<string, number>;
};

const LOGO_NICKNAME_X = 364;
const LOGO_NICKNAME_Y = 196;
const LOGO_NICKNAME_SIZE = 22;
const LOGO_NICKNAME_TRACKING = 1;
const LOGO_COLOR_DEFAULT = "#908b76";
const LOGO_COLOR_WHITE = "#ffffff";
const LOGO_RATIO = 634.93 / 178.4;
const WATERMARK_SCALE_FACTOR = 0.5;
const WATERMARK_MIN_WIDTH = 220;
const WATERMARK_MAX_WIDTH = 620;
const WATERMARK_OPACITY = 0.6;
const ARTICLE_WATERMARK_HEIGHT = 60;
const ARTICLE_WATERMARK_MARGIN = 24;
const ARTICLE_WATERMARK_OPACITY = 0.72;

let logoSvgTemplateCache: string | null = null;
let logoGlyphMapCache: LogoGlyphMap | null = null;
const logoWhiteWithNicknameCache = new Map<string, Buffer>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function loadLogoSvgTemplate(): Promise<string | null> {
  if (logoSvgTemplateCache) return logoSvgTemplateCache;
  const svgPath = path.join(process.cwd(), "public", "logo.svg");
  try {
    const file = await readFile(svgPath, "utf8");
    logoSvgTemplateCache = file;
    return file;
  } catch {
    return null;
  }
}

async function loadGlyphMap(): Promise<LogoGlyphMap | null> {
  if (logoGlyphMapCache) return logoGlyphMapCache;
  const mapPath = path.join(process.cwd(), "branding", "dunbar-tall-book-map.json");
  try {
    const file = await readFile(mapPath, "utf8");
    const parsed = JSON.parse(file) as LogoGlyphMap;
    logoGlyphMapCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeNickname(raw: string | null | undefined): string {
  const clean = (raw ?? "").trim().toLowerCase();
  if (!clean) return "";
  const normalized = clean.startsWith("/") ? clean : `/${clean}`;
  return /^\/[a-z0-9]{1,35}$/.test(normalized) ? normalized : "";
}

function removeNicknameText(svg: string): string {
  return svg.replace(/\s*<text class="nickname"[\s\S]*?<\/text>\s*/g, "\n");
}

function ensureViewBoxHeight(svg: string, minHeight: number): string {
  const re = /viewBox="([^"]+)"/i;
  const m = svg.match(re);
  if (!m) return svg;
  const parts = m[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return svg;
  if (parts[3] >= minHeight) return svg;
  parts[3] = Number(minHeight.toFixed(4));
  return svg.replace(re, `viewBox="${parts.join(" ")}"`);
}

function injectBeforeClosingGroup(svg: string, snippet: string): string {
  const idx = svg.lastIndexOf("</g>");
  if (idx === -1) return svg;
  return `${svg.slice(0, idx)}  ${snippet}\n${svg.slice(idx)}`;
}

function buildNicknamePathGroup(
  nickname: string,
  mapData: LogoGlyphMap,
  color: string,
): string | null {
  const glyphs = mapData.glyphs ?? {};
  const pairs = mapData.kerning ?? {};
  const coordinateSystem = mapData.coordinateSystem ?? "";
  const baseHeight = Number(mapData.baseHeight ?? 58.88);
  const unitsPerEm = Number(mapData.unitsPerEm ?? 1000);
  const baseline = Number(mapData.baselineY ?? 45.85);
  const isSvgArtboard = coordinateSystem === "svg-artboard";
  const scale = isSvgArtboard ? LOGO_NICKNAME_SIZE / baseHeight : LOGO_NICKNAME_SIZE / unitsPerEm;

  let cursor = 0;
  let prev = "";
  const pieces: string[] = [];

  for (const ch of nickname) {
    const glyph = glyphs[ch];
    if (!glyph?.d || typeof glyph.advance !== "number") return null;

    const pairKey = `${prev}${ch}`;
    const kern = Number(pairs[pairKey] ?? 0);
    cursor += kern;

    if (isSvgArtboard) {
      const originX = Number(glyph.originX ?? 0);
      const tx = LOGO_NICKNAME_X + (cursor - originX) * scale;
      const ty = LOGO_NICKNAME_Y - baseline * scale;
      pieces.push(
        `<path fill="${color}" d="${glyph.d}" transform="translate(${tx} ${ty}) scale(${scale} ${scale})" />`,
      );
    } else {
      const tx = LOGO_NICKNAME_X + cursor * scale;
      const ty = LOGO_NICKNAME_Y;
      pieces.push(
        `<path fill="${color}" d="${glyph.d}" transform="translate(${tx} ${ty}) scale(${scale} ${-scale})" />`,
      );
    }

    cursor += Number(glyph.advance) * LOGO_NICKNAME_TRACKING;
    prev = ch;
  }

  return `<g id="nickname-path">\n    ${pieces.join("\n    ")}\n  </g>`;
}

function paintLogoAsWhite(svg: string): string {
  return svg
    .replace(/\.cls-1\s*\{[^}]*\}/g, ".cls-1{fill:#ffffff;}")
    .replace(/\.cls-2\s*\{[^}]*\}/g, ".cls-2{fill:#ffffff;}")
    .replace(/\.cls-3\s*\{[^}]*\}/g, ".cls-3{stroke:#ffffff;stroke-miterlimit:10;stroke-width:2px;fill:none;}");
}

export async function renderCorretorOneLogoPng(input: {
  nickname?: string | null;
  theme?: CorretorOneLogoTheme;
}): Promise<Buffer | null> {
  const template = await loadLogoSvgTemplate();
  if (!template) return null;

  const theme = input.theme ?? "default";
  const normalizedNickname = normalizeNickname(input.nickname);
  const cacheKey = `${theme}:${normalizedNickname || "__no_nickname__"}`;
  const cached = logoWhiteWithNicknameCache.get(cacheKey);
  if (cached) return cached;

  let svg = removeNicknameText(theme === "white" ? paintLogoAsWhite(template) : template);
  const nicknameColor = theme === "white" ? LOGO_COLOR_WHITE : LOGO_COLOR_DEFAULT;

  if (normalizedNickname) {
    const mapData = await loadGlyphMap();
    if (mapData) {
      const nicknamePathGroup = buildNicknamePathGroup(normalizedNickname, mapData, nicknameColor);
      if (nicknamePathGroup) {
        svg = injectBeforeClosingGroup(svg, nicknamePathGroup);
        const minHeight = LOGO_NICKNAME_Y + LOGO_NICKNAME_SIZE * 0.55;
        svg = ensureViewBoxHeight(svg, minHeight);
      }
    }
  }

  try {
    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    logoWhiteWithNicknameCache.set(cacheKey, buffer);
    return buffer;
  } catch {
    return null;
  }
}

async function buildWatermarkOverlay(
  baseWidth: number,
  baseHeight: number,
  logoPngBase64: string | null,
): Promise<Buffer> {
  const watermarkWidth = clamp(
    Math.round(Math.min(baseWidth, baseHeight) * WATERMARK_SCALE_FACTOR),
    WATERMARK_MIN_WIDTH,
    WATERMARK_MAX_WIDTH,
  );
  const watermarkHeight = Math.round(watermarkWidth / LOGO_RATIO);
  const x = Math.round((baseWidth - watermarkWidth) / 2);
  const y = Math.round((baseHeight - watermarkHeight) / 2);
  const logoSvg = logoPngBase64
    ? `<image x="${x}" y="${y}" width="${watermarkWidth}" height="${watermarkHeight}" href="data:image/png;base64,${logoPngBase64}" opacity="${WATERMARK_OPACITY}" preserveAspectRatio="xMidYMid meet" />`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${baseWidth}" height="${baseHeight}" viewBox="0 0 ${baseWidth} ${baseHeight}">
    ${logoSvg}
  </svg>`;

  return Buffer.from(svg);
}

async function buildCornerWatermarkOverlay(
  baseWidth: number,
  baseHeight: number,
  logoPngBase64: string | null,
): Promise<Buffer> {
  const watermarkHeight = Math.min(ARTICLE_WATERMARK_HEIGHT, Math.max(32, Math.round(baseHeight * 0.13)));
  const watermarkWidth = Math.round(watermarkHeight * LOGO_RATIO);
  const margin = Math.min(ARTICLE_WATERMARK_MARGIN, Math.max(12, Math.round(Math.min(baseWidth, baseHeight) * 0.035)));
  const x = Math.max(margin, baseWidth - watermarkWidth - margin);
  const y = Math.max(margin, baseHeight - watermarkHeight - margin);
  const logoSvg = logoPngBase64
    ? `<image x="${x}" y="${y}" width="${watermarkWidth}" height="${watermarkHeight}" href="data:image/png;base64,${logoPngBase64}" opacity="${ARTICLE_WATERMARK_OPACITY}" preserveAspectRatio="xMidYMid meet" />`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${baseWidth}" height="${baseHeight}" viewBox="0 0 ${baseWidth} ${baseHeight}">
    ${logoSvg}
  </svg>`;

  return Buffer.from(svg);
}

export async function renderWatermarkedPublicImage(
  sourceImageBuffer: Buffer,
  input: WatermarkLogoInput,
): Promise<Buffer> {
  const base = sharp(sourceImageBuffer, { failOn: "none" }).rotate();
  const metadata = await base.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Não foi possível ler dimensões da imagem para marca d'água.");
  }

  const logoBuffer =
    input.logoPngBuffer ??
    (await renderCorretorOneLogoPng({
      nickname: input.nickname,
      theme: "white",
    }));
  let logoPngBase64: string | null = null;

  if (logoBuffer) {
    try {
      const logoPng = await sharp(logoBuffer, { failOn: "none" })
        .png()
        .toBuffer();
      logoPngBase64 = logoPng.toString("base64");
    } catch {
      logoPngBase64 = null;
    }
  }

  const overlay = await buildWatermarkOverlay(
    metadata.width,
    metadata.height,
    logoPngBase64,
  );

  return base
    .composite([{ input: overlay, gravity: "center" }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

export async function renderCornerWatermarkedImage(
  sourceImageBuffer: Buffer,
  input: WatermarkLogoInput,
): Promise<Buffer> {
  const base = sharp(sourceImageBuffer, { failOn: "none" }).rotate();
  const metadata = await base.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Não foi possível ler dimensões da imagem para marca d'água.");
  }

  const logoBuffer =
    input.logoPngBuffer ??
    (await renderCorretorOneLogoPng({
      nickname: input.nickname,
      theme: "white",
    }));
  let logoPngBase64: string | null = null;

  if (logoBuffer) {
    try {
      const logoPng = await sharp(logoBuffer, { failOn: "none" })
        .png()
        .toBuffer();
      logoPngBase64 = logoPng.toString("base64");
    } catch {
      logoPngBase64 = null;
    }
  }

  const overlay = await buildCornerWatermarkOverlay(
    metadata.width,
    metadata.height,
    logoPngBase64,
  );

  return base
    .composite([{ input: overlay, gravity: "northwest" }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}
