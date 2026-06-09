import path from "node:path";
import { pathToFileURL } from "node:url";

const LOGO_CANVAS_WIDTH = 3000;
const LOGO_CANVAS_HEIGHT = 1194;
const NICKNAME_REGEX = /^[a-z0-9]{1,35}$/;
const LOGO_TEMPLATE_PATH = path.join(process.cwd(), "public", "logo-creative-3000.html");

type LogoTheme = "default" | "white";

function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase();
}

function buildTemplateUrl(nickname: string, theme: LogoTheme): string {
  const url = pathToFileURL(LOGO_TEMPLATE_PATH);
  url.searchParams.set("nickname", nickname);
  if (theme === "white") {
    url.searchParams.set("theme", "white");
  }
  return url.href;
}

async function renderSingleTheme(
  browser: {
    newPage: () => Promise<{
      setViewport: (input: {
        width: number;
        height: number;
        deviceScaleFactor: number;
      }) => Promise<unknown>;
      goto: (url: string, input: { waitUntil: "networkidle0" }) => Promise<unknown>;
      addStyleTag: (input: { content: string }) => Promise<unknown>;
      evaluate: (fn: () => Promise<void>) => Promise<unknown>;
      $: (selector: string) => Promise<{
        screenshot: (input: { type: "png"; omitBackground: boolean }) => Promise<Uint8Array>;
      } | null>;
      close: () => Promise<unknown>;
    }>;
  },
  input: { nickname: string; theme: LogoTheme },
): Promise<Buffer | null> {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: LOGO_CANVAS_WIDTH,
      height: LOGO_CANVAS_HEIGHT,
      deviceScaleFactor: 1,
    });
    await page.goto(buildTemplateUrl(input.nickname, input.theme), {
      waitUntil: "networkidle0",
    });

    await page.addStyleTag({
      content: "html, body, .canvas { background: transparent !important; }",
    });

    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    });

    const root = await page.$(".canvas");
    if (!root) return null;
    const screenshot = await root.screenshot({
      type: "png",
      omitBackground: true,
    });
    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

async function launchPuppeteerBrowser(puppeteerModule: {
  launch: (options: {
    headless: boolean;
    args: string[];
    channel?: "chrome";
    executablePath?: string;
  }) => Promise<{
    newPage: () => Promise<{
      setViewport: (input: {
        width: number;
        height: number;
        deviceScaleFactor: number;
      }) => Promise<unknown>;
      goto: (url: string, input: { waitUntil: "networkidle0" }) => Promise<unknown>;
      addStyleTag: (input: { content: string }) => Promise<unknown>;
      evaluate: (fn: () => Promise<void>) => Promise<unknown>;
      $: (selector: string) => Promise<{
        screenshot: (input: { type: "png"; omitBackground: boolean }) => Promise<Uint8Array>;
      } | null>;
      close: () => Promise<unknown>;
    }>;
    close: () => Promise<unknown>;
  }>;
}): Promise<{
  newPage: () => Promise<{
    setViewport: (input: {
      width: number;
      height: number;
      deviceScaleFactor: number;
    }) => Promise<unknown>;
    goto: (url: string, input: { waitUntil: "networkidle0" }) => Promise<unknown>;
    addStyleTag: (input: { content: string }) => Promise<unknown>;
    evaluate: (fn: () => Promise<void>) => Promise<unknown>;
    $: (selector: string) => Promise<{
      screenshot: (input: { type: "png"; omitBackground: boolean }) => Promise<Uint8Array>;
    } | null>;
    close: () => Promise<unknown>;
  }>;
  close: () => Promise<unknown>;
} | null> {
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
  const attempts: Array<{
    headless: boolean;
    args: string[];
    channel?: "chrome";
    executablePath?: string;
  }> = [];

  const explicitExecutablePath = (process.env.PUPPETEER_EXECUTABLE_PATH ?? "").trim();
  if (explicitExecutablePath) {
    attempts.push({
      headless: true,
      args: defaultArgs,
      executablePath: explicitExecutablePath,
    });
  }

  attempts.push(
    { headless: true, args: defaultArgs, channel: "chrome" },
    { headless: true, args: defaultArgs },
  );

  for (const options of attempts) {
    try {
      return await puppeteerModule.launch(options);
    } catch {
      // tenta próximo launcher
    }
  }

  return null;
}

export async function renderProfileLogoVariantsFromHtml(
  nicknameRaw: string,
): Promise<{ default: Buffer; white: Buffer } | null> {
  const nickname = normalizeNickname(nicknameRaw);
  if (!NICKNAME_REGEX.test(nickname)) return null;

  const puppeteer = await import("puppeteer");
  const browser = await launchPuppeteerBrowser(puppeteer);
  if (!browser) return null;

  try {
    const [defaultBuffer, whiteBuffer] = await Promise.all([
      renderSingleTheme(browser, { nickname, theme: "default" }),
      renderSingleTheme(browser, { nickname, theme: "white" }),
    ]);

    if (!defaultBuffer || !whiteBuffer) {
      return null;
    }

    return {
      default: defaultBuffer,
      white: whiteBuffer,
    };
  } finally {
    await browser.close();
  }
}
