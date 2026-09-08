import { CREATIVE_DIMENSIONS, buildPropertyEssentialHtml, type PropertyCreativePayload } from "@/lib/creatives/static-template";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadCreativeFonts() {
  const fontDirectory = path.join(process.cwd(), "public", "fonts");
  const dataUrl = async (file: string) => `data:font/woff2;base64,${(await readFile(path.join(fontDirectory, file))).toString("base64")}`;
  const [light, book, bold] = await Promise.all([dataUrl("DunbarTall-Light.woff2"), dataUrl("DunbarTall-Book.woff2"), dataUrl("DunbarTall-Bold.woff2")]);
  return { light, book, bold };
}

export async function renderPropertyCreative(payload: PropertyCreativePayload): Promise<Buffer> {
  const puppeteer = await import("puppeteer");
  const attempts = [
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? [{ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }] : []),
    { channel: "chrome" as const }, {},
  ];
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  for (const attempt of attempts) { try { browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"], ...attempt }); break; } catch { /* tenta o próximo launcher */ } }
  if (!browser) throw new Error("Não foi possível iniciar o renderizador de imagens.");
  const page = await browser.newPage();
  try {
    const dimensions = CREATIVE_DIMENSIONS[payload.format];
    await page.setViewport({ width: dimensions.width, height: dimensions.height, deviceScaleFactor: 1 });
    await page.setContent(buildPropertyEssentialHtml(payload, await loadCreativeFonts()), { waitUntil: "networkidle0" });
    await page.evaluate(async () => { await document.fonts?.ready; await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve(); }))); });
    const canvas = await page.$(".canvas");
    if (!canvas) throw new Error("Canvas do template não encontrado.");
    return Buffer.from(await canvas.screenshot({ type: "png", omitBackground: false }));
  } finally { await page.close(); await browser.close(); }
}
