#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const CHARSET = '/abcdefghijklmnopqrstuvwxyz1234567890';

function parseArgs(argv) {
  const args = {
    input: 'public/letras.svg',
    output: 'branding/dunbar-tall-book-map.json',
    baseline: 45.85,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];

    switch (key) {
      case '--input':
        args.input = value;
        i += 1;
        break;
      case '--output':
        args.output = value;
        i += 1;
        break;
      case '--baseline':
        args.baseline = Number(value);
        i += 1;
        break;
      default:
        break;
    }
  }

  return args;
}

function extractFirstMoveX(d) {
  const m = d.match(/[Mm]\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)[,\s]+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/i);
  if (!m) {
    throw new Error(`Nao foi possivel ler moveto inicial do path: ${d.slice(0, 40)}...`);
  }
  return Number(m[1]);
}

function median(values) {
  const arr = [...values].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

function main() {
  const args = parseArgs(process.argv);
  const root = process.cwd();
  const inputPath = path.resolve(root, args.input);
  const outputPath = path.resolve(root, args.output);

  const svg = fs.readFileSync(inputPath, 'utf8');

  const vb = svg.match(/viewBox="([^"]+)"/i);
  if (!vb) {
    throw new Error('SVG sem viewBox.');
  }
  const [, vbStr] = vb;
  const vbParts = vbStr.trim().split(/\s+/).map(Number);
  if (vbParts.length !== 4 || vbParts.some(Number.isNaN)) {
    throw new Error(`viewBox invalido: ${vbStr}`);
  }
  const viewBoxHeight = vbParts[3];

  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  if (paths.length !== CHARSET.length) {
    throw new Error(`Quantidade de paths (${paths.length}) diferente do charset esperado (${CHARSET.length}).`);
  }

  const origins = paths.map(extractFirstMoveX);
  const diffs = origins.slice(1).map((x, i) => x - origins[i]);
  const fallbackAdvance = median(diffs);

  const glyphs = {};
  for (let i = 0; i < CHARSET.length; i += 1) {
    const ch = CHARSET[i];
    const advance = i < CHARSET.length - 1 ? origins[i + 1] - origins[i] : fallbackAdvance;
    glyphs[ch] = {
      d: paths[i],
      originX: Number(origins[i].toFixed(4)),
      advance: Number(advance.toFixed(4)),
    };
  }

  const out = {
    coordinateSystem: 'svg-artboard',
    baseHeight: Number(viewBoxHeight.toFixed(4)),
    baselineY: Number(args.baseline.toFixed(4)),
    glyphs,
    kerning: {},
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`);

  process.stdout.write(`Gerado mapa: ${path.relative(root, outputPath)}\n`);
}

main();
