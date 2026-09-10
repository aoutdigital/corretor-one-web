import {
  CREATIVE_DIMENSIONS,
  buildPropertyDualHtml,
  buildPropertyEditorialHtml,
  buildPropertyJourneyHtml,
  buildPropertyEssentialHtml,
  type PropertyCreativePayload,
} from "@/lib/creatives/static-template";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadCreativeFonts() {
  const fontDirectory = path.join(process.cwd(), "public", "fonts");
  const dataUrl = async (file: string) =>
    `data:font/woff2;base64,${(await readFile(path.join(fontDirectory, file))).toString("base64")}`;
  const [light, book, bold] = await Promise.all([
    dataUrl("DunbarTall-Light.woff2"),
    dataUrl("DunbarTall-Book.woff2"),
    dataUrl("DunbarTall-Bold.woff2"),
  ]);
  return { light, book, bold };
}

async function inlineAsset(url: string | null, required = false) {
  if (!url || url.startsWith("data:")) return url;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType =
      response.headers.get("content-type")?.split(";")[0] || "image/png";
    if (!contentType.startsWith("image/"))
      throw new Error("arquivo não é uma imagem");
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    if (required)
      throw new Error(
        "Não foi possível carregar a imagem selecionada para gerar o criativo.",
      );
    return null;
  }
}

async function inlinePayloadAssets(
  payload: PropertyCreativePayload,
): Promise<PropertyCreativePayload> {
  const [
    imageUrl,
    secondaryImageUrl,
    carouselImages,
    avatarUrl,
    logoUrl,
    logoWhiteUrl,
  ] = await Promise.all([
    inlineAsset(payload.property.imageUrl, true),
    inlineAsset(
      payload.property.secondaryImageUrl ?? null,
      Boolean(payload.property.secondaryImageUrl),
    ),
    Promise.all(
      (payload.property.carouselImages ?? []).map(
        (url) => inlineAsset(url, true) as Promise<string>,
      ),
    ),
    inlineAsset(payload.broker.avatarUrl),
    inlineAsset(payload.broker.logoUrl),
    inlineAsset(payload.broker.logoWhiteUrl),
  ]);
  return {
    ...payload,
    property: {
      ...payload.property,
      imageUrl: imageUrl as string,
      secondaryImageUrl: secondaryImageUrl ?? undefined,
      carouselImages,
      carouselSlides: payload.property.carouselSlides?.map((slide) => ({
        ...slide,
        imageUrl:
          carouselImages[
            (payload.property.carouselImages ?? []).indexOf(slide.imageUrl)
          ] ?? slide.imageUrl,
      })),
    },
    broker: { ...payload.broker, avatarUrl, logoUrl, logoWhiteUrl },
  };
}

export async function renderPropertyCreative(
  payload: PropertyCreativePayload,
  rendererKey = "property-essential-01",
): Promise<Buffer> {
  const puppeteer = await import("puppeteer");
  const attempts = [
    ...(process.env.PUPPETEER_EXECUTABLE_PATH
      ? [{ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }]
      : []),
    { channel: "chrome" as const },
    {},
  ];
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  for (const attempt of attempts) {
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...attempt,
      });
      break;
    } catch {
      /* tenta o próximo launcher */
    }
  }
  if (!browser)
    throw new Error("Não foi possível iniciar o renderizador de imagens.");
  const page = await browser.newPage();
  try {
    const inlinedPayload = await inlinePayloadAssets(payload);
    const dimensions = CREATIVE_DIMENSIONS[payload.format];
    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor: 1,
    });
    await page.setContent(
      rendererKey === "property-dual-02"
        ? buildPropertyDualHtml(inlinedPayload, await loadCreativeFonts())
        : rendererKey === "property-editorial-03"
          ? buildPropertyEditorialHtml(
              inlinedPayload,
              await loadCreativeFonts(),
            )
          : rendererKey === "property-journey-carousel-01"
            ? buildPropertyJourneyHtml(
                inlinedPayload,
                await loadCreativeFonts(),
              )
            : buildPropertyEssentialHtml(
                inlinedPayload,
                await loadCreativeFonts(),
              ),
      { waitUntil: "domcontentloaded", timeout: 10_000 },
    );
    await page.evaluate(async () => {
      const assetsReady = Promise.all([
        document.fonts?.ready,
        Promise.all(
          [...document.images].map((image) =>
            image.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  image.onload = () => resolve();
                  image.onerror = () => resolve();
                }),
          ),
        ),
      ]);
      await Promise.race([
        assetsReady,
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);
    });
    const canvas = await page.$(".canvas");
    if (!canvas) throw new Error("Canvas do template não encontrado.");
    return Buffer.from(
      await canvas.screenshot({ type: "png", omitBackground: false }),
    );
  } finally {
    await page.close();
    await browser.close();
  }
}

export async function renderPropertyCarousel(
  payload: PropertyCreativePayload,
  rendererKey = "property-journey-carousel-01",
  slideCount = 8,
): Promise<Buffer[]> {
  const puppeteer = await import("puppeteer");
  const attempts = [
    ...(process.env.PUPPETEER_EXECUTABLE_PATH
      ? [{ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }]
      : []),
    { channel: "chrome" as const },
    {},
  ];
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  for (const attempt of attempts) {
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...attempt,
      });
      break;
    } catch {
      // Tenta o próximo launcher disponível.
    }
  }
  if (!browser)
    throw new Error("Não foi possível iniciar o renderizador de imagens.");

  const page = await browser.newPage();
  try {
    const inlinedPayload = await inlinePayloadAssets(payload);
    const fonts = await loadCreativeFonts();
    const dimensions = CREATIVE_DIMENSIONS.PORTRAIT;
    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor: 1,
    });
    const results: Buffer[] = [];
    for (let slide = 0; slide < slideCount; slide += 1) {
      const html = buildPropertyJourneyHtml(
        { ...inlinedPayload, format: "PORTRAIT", carouselSlide: slide },
        fonts,
      );
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 10_000,
      });
      await page.evaluate(async () => {
        await Promise.race([
          Promise.all([
            document.fonts?.ready,
            Promise.all(
              [...document.images].map((image) =>
                image.complete
                  ? Promise.resolve()
                  : new Promise<void>((resolve) => {
                      image.onload = () => resolve();
                      image.onerror = () => resolve();
                    }),
              ),
            ),
          ]),
          new Promise((resolve) => setTimeout(resolve, 5_000)),
        ]);
      });
      const canvas = await page.$(".canvas");
      if (!canvas)
        throw new Error(`Canvas do slide ${slide + 1} não encontrado.`);
      results.push(
        Buffer.from(
          await canvas.screenshot({ type: "png", omitBackground: false }),
        ),
      );
    }
    return results;
  } finally {
    await page.close();
    await browser.close();
  }
}
