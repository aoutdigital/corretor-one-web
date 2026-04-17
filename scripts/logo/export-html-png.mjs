#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

function parseArgs(argv) {
  const args = {
    input: 'public/logo-creative-3000.html',
    output: 'public/logo-creative-3000-transparent.png',
    width: 3000,
    height: 1194,
    transparent: true,
    selector: '.canvas',
    deviceScaleFactor: 1,
    theme: '',
    nickname: '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--input':
        args.input = v;
        i += 1;
        break;
      case '--output':
        args.output = v;
        i += 1;
        break;
      case '--width':
        args.width = Number(v);
        i += 1;
        break;
      case '--height':
        args.height = Number(v);
        i += 1;
        break;
      case '--selector':
        args.selector = v;
        i += 1;
        break;
      case '--transparent':
        args.transparent = v !== 'false';
        i += 1;
        break;
      case '--dsf':
        args.deviceScaleFactor = Number(v);
        i += 1;
        break;
      case '--theme':
        args.theme = v;
        i += 1;
        break;
      case '--nickname':
        args.nickname = v;
        i += 1;
        break;
      default:
        break;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const root = process.cwd();
  const inputPath = path.resolve(root, args.input);
  const outputPath = path.resolve(root, args.output);

  let browser;
  const launchAttempts = [];
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchAttempts.push({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    });
  }
  launchAttempts.push({ channel: 'chrome' }, {});

  for (const extra of launchAttempts) {
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...extra,
        defaultViewport: {
          width: args.width,
          height: args.height,
          deviceScaleFactor: args.deviceScaleFactor,
        },
      });
      break;
    } catch {
      // tenta próxima configuração
    }
  }

  if (!browser) {
    throw new Error(
      'Não foi possível iniciar o Puppeteer. Configure PUPPETEER_EXECUTABLE_PATH ou instale Google Chrome.',
    );
  }

  try {
    const page = await browser.newPage();
    const inputUrl = pathToFileURL(inputPath);
    if (args.theme) {
      inputUrl.searchParams.set('theme', args.theme);
    }
    if (args.nickname) {
      inputUrl.searchParams.set('nickname', String(args.nickname).trim().toLowerCase());
    }
    await page.goto(inputUrl.href, { waitUntil: 'networkidle0' });

    // Keep the rendered logo but remove solid page backgrounds for transparent PNG.
    if (args.transparent) {
      await page.addStyleTag({
        content: `html, body, .canvas { background: transparent !important; }`,
      });
    }

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });

    const el = await page.$(args.selector);
    if (!el) {
      throw new Error(`Selector não encontrado: ${args.selector}`);
    }

    await el.screenshot({
      path: outputPath,
      omitBackground: args.transparent,
      type: 'png',
    });

    process.stdout.write(`Gerado: ${path.relative(root, outputPath)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
