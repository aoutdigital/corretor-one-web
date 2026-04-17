"use client";

import { useState } from "react";

const AVATAR_GRADIENTS = [
  "from-[var(--primary-scarlet)] to-[#7f1535]",
  "from-[var(--blue-slate)] to-[#143a65]",
  "from-[#df6f3f] to-[#b23b1b]",
  "from-[#1b7a6b] to-[#0f4f45]",
] as const;

const MD5_SHIFT = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10,
  15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
] as const;

const MD5_K = Array.from(
  { length: 64 },
  (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0,
);

function normalizeLeadAvatarEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function leftRotate(value: number, amount: number) {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function wordToHex(word: number) {
  return [0, 8, 16, 24]
    .map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, "0"))
    .join("");
}

function md5Hex(value: string) {
  const input = new TextEncoder().encode(value);
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const buffer = new Uint8Array(paddedLength);
  buffer.set(input);
  buffer[input.length] = 0x80;

  const dataView = new DataView(buffer.buffer);
  dataView.setUint32(paddedLength - 8, bitLength >>> 0, true);
  dataView.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const chunk = Array.from({ length: 16 }, (_, index) => dataView.getUint32(offset + index * 4, true));

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f = 0;
      let g = 0;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const nextD = d;
      const sum = (a + f + MD5_K[index] + chunk[g]) >>> 0;
      d = c;
      c = b;
      b = (b + leftRotate(sum, MD5_SHIFT[index])) >>> 0;
      a = nextD;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return `${wordToHex(a0)}${wordToHex(b0)}${wordToHex(c0)}${wordToHex(d0)}`;
}

function getInitials(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getAvatarGradient(fullName: string) {
  const value = fullName
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[value % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
}

type LeadAvatarProps = {
  name: string;
  email?: string | null;
  size?: "sm" | "md" | "lg";
};

export function LeadAvatar({ name, email, size = "md" }: LeadAvatarProps) {
  const frameClass =
    size === "sm"
      ? "h-12 w-12 rounded-xl shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
      : size === "lg"
        ? "h-20 w-20 rounded-[22px] shadow-[0_18px_40px_rgba(15,23,42,0.20)]"
        : "h-16 w-16 rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.18)]";
  const textClass = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  const normalizedEmail = normalizeLeadAvatarEmail(email);
  const gravatarUrl = normalizedEmail
    ? `https://www.gravatar.com/avatar/${md5Hex(normalizedEmail)}?d=404&s=${size === "sm" ? 96 : size === "lg" ? 160 : 128}`
    : null;
  const [failedGravatarUrl, setFailedGravatarUrl] = useState<string | null>(null);
  const showGravatar = Boolean(gravatarUrl && failedGravatarUrl !== gravatarUrl);

  if (gravatarUrl && showGravatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={gravatarUrl}
        alt={name}
        width={size === "sm" ? 48 : size === "lg" ? 80 : 64}
        height={size === "sm" ? 48 : size === "lg" ? 80 : 64}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedGravatarUrl(gravatarUrl)}
        className={`shrink-0 object-cover bg-slate-200 ${frameClass}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br ${getAvatarGradient(
        name,
      )} ${frameClass} ${textClass} font-semibold text-white`}
    >
      {getInitials(name)}
    </div>
  );
}
