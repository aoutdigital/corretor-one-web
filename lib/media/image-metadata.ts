export type ImageDimensions = {
  width: number;
  height: number;
};

export type ImageFormat = "JPEG" | "PNG" | "WEBP" | "GIF" | "HEIC" | "HEIF" | "UNKNOWN";

export type ImageInspection = {
  format: ImageFormat;
  dimensions: ImageDimensions | null;
  isAnimated: boolean;
};

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  );
}

function parsePng(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  const isPngSignature =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isIhdr =
    bytes[12] === 0x49 &&
    bytes[13] === 0x48 &&
    bytes[14] === 0x44 &&
    bytes[15] === 0x52;

  if (!isPngSignature || !isIhdr) return null;

  const width =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function isAnimatedPng(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const isPngSignature =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (!isPngSignature) return false;

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const chunkLength =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    if (chunkType === "acTL") return true;
    offset += 12 + chunkLength;
    if (chunkType === "IEND") break;
  }
  return false;
}

function parseJpeg(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 1 >= bytes.length) return null;

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isSof) {
      if (offset + 7 >= bytes.length) return null;
      const height = readUint16BE(bytes, offset + 3);
      const width = readUint16BE(bytes, offset + 5);
      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    offset += segmentLength;
  }

  return null;
}

function parseWebp(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30) return null;
  const isRiff =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const isWebp =
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (!isRiff || !isWebp) return null;

  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  const chunkSize = readUint32LE(bytes, 16);
  const dataOffset = 20;
  if (dataOffset + chunkSize > bytes.length) return null;

  if (chunk === "VP8X") {
    const width = readUint24LE(bytes, 24) + 1;
    const height = readUint24LE(bytes, 27) + 1;
    if (width <= 0 || height <= 0) return null;
    return { width, height };
  }

  if (chunk === "VP8 ") {
    if (bytes[dataOffset + 3] !== 0x9d || bytes[dataOffset + 4] !== 0x01 || bytes[dataOffset + 5] !== 0x2a) {
      return null;
    }
    const width = readUint16BE(new Uint8Array([bytes[dataOffset + 7], bytes[dataOffset + 6]]), 0) & 0x3fff;
    const height = readUint16BE(new Uint8Array([bytes[dataOffset + 9], bytes[dataOffset + 8]]), 0) & 0x3fff;
    if (width <= 0 || height <= 0) return null;
    return { width, height };
  }

  if (chunk === "VP8L") {
    if (bytes[dataOffset] !== 0x2f) return null;
    const b1 = bytes[dataOffset + 1];
    const b2 = bytes[dataOffset + 2];
    const b3 = bytes[dataOffset + 3];
    const b4 = bytes[dataOffset + 4];
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    if (width <= 0 || height <= 0) return null;
    return { width, height };
  }

  return null;
}

function isAnimatedWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 21) return false;
  const isRiff =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const isWebp =
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (!isRiff || !isWebp) return false;

  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunk !== "VP8X") return false;
  const flags = bytes[20];
  return (flags & 0x02) !== 0;
}

function parseGif(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 10) return null;
  const isGif87a =
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    bytes[4] === 0x37 &&
    bytes[5] === 0x61;
  const isGif89a =
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    bytes[4] === 0x39 &&
    bytes[5] === 0x61;
  if (!isGif87a && !isGif89a) return null;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function isAnimatedGif(bytes: Uint8Array): boolean {
  if (!parseGif(bytes)) return false;
  let frames = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x2c) {
      frames += 1;
      if (frames > 1) return true;
    }
  }
  return false;
}

function detectImageFormat(
  bytes: Uint8Array,
  fileName?: string,
  mimeType?: string,
): ImageFormat {
  const mime = (mimeType ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();

  if (parseJpeg(bytes)) return "JPEG";
  if (parsePng(bytes)) return "PNG";
  if (parseWebp(bytes)) return "WEBP";
  if (parseGif(bytes)) return "GIF";

  if (
    mime.includes("heic") ||
    mime.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return name.endsWith(".heif") || mime.includes("heif") ? "HEIF" : "HEIC";
  }

  return "UNKNOWN";
}

export function inspectImage(
  bytes: Uint8Array,
  options?: { fileName?: string; mimeType?: string },
): ImageInspection {
  const format = detectImageFormat(bytes, options?.fileName, options?.mimeType);
  const dimensions =
    format === "JPEG"
      ? parseJpeg(bytes)
      : format === "PNG"
        ? parsePng(bytes)
        : format === "WEBP"
          ? parseWebp(bytes)
          : format === "GIF"
            ? parseGif(bytes)
            : null;

  const isAnimated =
    format === "PNG"
      ? isAnimatedPng(bytes)
      : format === "WEBP"
        ? isAnimatedWebp(bytes)
        : format === "GIF"
          ? isAnimatedGif(bytes)
          : false;

  return { format, dimensions, isAnimated };
}

export function extractImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  return parsePng(bytes) ?? parseJpeg(bytes) ?? parseWebp(bytes);
}
