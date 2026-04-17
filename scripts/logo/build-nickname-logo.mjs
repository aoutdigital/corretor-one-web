#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    nickname: '',
    input: 'public/logo.svg',
    output: '',
    map: 'branding/dunbar-tall-book-map.json',
    x: null,
    y: null,
    size: null,
    sizeRatio: 0.12,
    tracking: 1,
    alignRight: false,
    rightPadding: 24,
    belowLogo: false,
    marginTop: 8,
    color: '#908b76',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];

    switch (key) {
      case '--nickname':
        args.nickname = value;
        i += 1;
        break;
      case '--input':
        args.input = value;
        i += 1;
        break;
      case '--output':
        args.output = value;
        i += 1;
        break;
      case '--map':
        args.map = value;
        i += 1;
        break;
      case '--x':
        args.x = Number(value);
        i += 1;
        break;
      case '--y':
        args.y = Number(value);
        i += 1;
        break;
      case '--size':
        args.size = Number(value);
        i += 1;
        break;
      case '--size-ratio':
        args.sizeRatio = Number(value);
        i += 1;
        break;
      case '--tracking':
        args.tracking = Number(value);
        i += 1;
        break;
      case '--color':
        args.color = value;
        i += 1;
        break;
      case '--align-right':
        args.alignRight = value !== 'false';
        i += 1;
        break;
      case '--right-padding':
        args.rightPadding = Number(value);
        i += 1;
        break;
      case '--below-logo':
        args.belowLogo = value !== 'false';
        i += 1;
        break;
      case '--margin-top':
        args.marginTop = Number(value);
        i += 1;
        break;
      default:
        break;
    }
  }

  if (!args.nickname) {
    throw new Error('Use --nickname /seuapelido');
  }

  if (!/^\/[a-z0-9]{1,35}$/.test(args.nickname)) {
    throw new Error('Nickname inválido. Esperado: / + [a-z0-9], até 35 chars.');
  }

  if (!args.output) {
    const slug = args.nickname.slice(1);
    args.output = `public/logo-${slug}-path.svg`;
  }

  return args;
}

function buildPathGroup(nickname, mapData, opts) {
  const { unitsPerEm, glyphs, kerning, coordinateSystem, baseHeight, baselineY } = mapData;
  const pairs = kerning || {};
  const isSvgArtboard = coordinateSystem === 'svg-artboard';
  const scale = isSvgArtboard
    ? opts.size / Number(baseHeight || 58.88)
    : opts.size / Number(unitsPerEm || 1000);
  const baseline = Number(baselineY || 45.85);

  let cursor = 0;
  let prev = '';
  const pieces = [];

  for (const ch of nickname) {
    const glyph = glyphs[ch];
    if (!glyph || !glyph.d || typeof glyph.advance !== 'number') {
      throw new Error(`Glifo ausente no mapa para caractere: ${JSON.stringify(ch)}`);
    }

    const pairKey = `${prev}${ch}`;
    const kern = Number(pairs[pairKey] || 0);
    cursor += kern;
    if (isSvgArtboard) {
      const originX = Number(glyph.originX || 0);
      const tx = opts.x + (cursor - originX) * scale;
      const ty = opts.y - baseline * scale;
      pieces.push(
        `<path fill="${opts.color}" d="${glyph.d}" transform="translate(${tx} ${ty}) scale(${scale} ${scale})" />`
      );
    } else {
      // Glyph paths are expected in font units with baseline at y=0 (Y up).
      const tx = opts.x + cursor * scale;
      const ty = opts.y;
      pieces.push(
        `<path fill="${opts.color}" d="${glyph.d}" transform="translate(${tx} ${ty}) scale(${scale} ${-scale})" />`
      );
    }
    cursor += Number(glyph.advance) * Number(opts.tracking || 1);
    prev = ch;
  }

  return `<g id="nickname-path">\n    ${pieces.join('\n    ')}\n  </g>`;
}

function getNicknameWidthUnits(nickname, mapData, tracking) {
  const { glyphs, kerning } = mapData;
  const pairs = kerning || {};
  let width = 0;
  let prev = '';
  for (const ch of nickname) {
    const glyph = glyphs[ch];
    if (!glyph || typeof glyph.advance !== 'number') {
      throw new Error(`Glifo ausente no mapa para caractere: ${JSON.stringify(ch)}`);
    }
    const pairKey = `${prev}${ch}`;
    width += Number(pairs[pairKey] || 0);
    width += Number(glyph.advance) * Number(tracking || 1);
    prev = ch;
  }
  return width;
}

function removeNicknameText(svg) {
  return svg.replace(/\s*<text class="nickname"[\s\S]*?<\/text>\s*/g, '\n');
}

function injectBeforeClosingGroup(svg, snippet) {
  const idx = svg.lastIndexOf('</g>');
  if (idx === -1) {
    throw new Error('SVG base sem </g> final para injeção do nickname.');
  }
  return `${svg.slice(0, idx)}  ${snippet}\n${svg.slice(idx)}`;
}

function ensureViewBoxHeight(svg, minHeight) {
  const re = /viewBox=\"([^\"]+)\"/i;
  const m = svg.match(re);
  if (!m) {
    return svg;
  }
  const parts = m[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return svg;
  }
  if (parts[3] >= minHeight) {
    return svg;
  }
  parts[3] = Number(minHeight.toFixed(4));
  return svg.replace(re, `viewBox="${parts.join(' ')}"`);
}

function main() {
  const args = parseArgs(process.argv);
  const root = process.cwd();

  const mapPath = path.resolve(root, args.map);
  const inputPath = path.resolve(root, args.input);
  const outputPath = path.resolve(root, args.output);

  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const inputSvg = fs.readFileSync(inputPath, 'utf8');
  const vbMatch = inputSvg.match(/viewBox=\"([^\"]+)\"/i);
  const vbParts = vbMatch ? vbMatch[1].trim().split(/\s+/).map(Number) : [0, 0, 634.93, 210];
  const vbWidth = vbParts[2];
  const vbHeight = vbParts[3];
  if (!args.size) {
    args.size = Number((vbHeight * Number(args.sizeRatio || 0.12)).toFixed(4));
  }

  const isSvgArtboard = mapData.coordinateSystem === 'svg-artboard';
  const sourceHeight = isSvgArtboard ? Number(mapData.baseHeight || 58.88) : Number(mapData.unitsPerEm || 1000);
  const baseline = isSvgArtboard ? Number(mapData.baselineY || 45.85) : 0;
  const scale = args.size / sourceHeight;

  if (args.alignRight) {
    const widthUnits = getNicknameWidthUnits(args.nickname, mapData, args.tracking);
    const widthPx = widthUnits * scale;
    args.x = Number((vbWidth - args.rightPadding - widthPx).toFixed(4));
  }

  if (args.belowLogo) {
    const topY = vbHeight + Number(args.marginTop || 0);
    args.y = Number((topY + baseline * scale).toFixed(4));
  }

  if (args.x == null) {
    args.x = 364;
  }
  if (args.y == null) {
    args.y = 196;
  }

  const cleanSvg = removeNicknameText(inputSvg);
  const nicknamePath = buildPathGroup(args.nickname, mapData, args);
  let outSvg = injectBeforeClosingGroup(cleanSvg, nicknamePath);
  const neededHeight = args.y + args.size * 0.55;
  outSvg = ensureViewBoxHeight(outSvg, neededHeight);

  fs.writeFileSync(outputPath, outSvg);
  process.stdout.write(`Gerado: ${path.relative(root, outputPath)}\n`);
}

main();
