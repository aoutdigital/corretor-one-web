# Logo nickname em path (sem font-family)

Objetivo: gerar `SVG` com nickname 100% vetorial (`<path>`), sem `<text>`.

## Arquivos
- `scripts/logo/build-glyph-map-from-letras-svg.mjs`
- `scripts/logo/build-nickname-logo.mjs`
- `branding/dunbar-tall-book-map.json`

## Gerar mapa automaticamente a partir do Illustrator
1. No Illustrator, escreva esta string na fonte `Dunbar Tall Book`:
`/abcdefghijklmnopqrstuvwxyz1234567890`
2. Converta para curvas (`Type > Create Outlines`) e exporte como `public/letras.svg`.
3. Gere o mapa:

```bash
npm run logo:glyph-map -- --input public/letras.svg --output branding/dunbar-tall-book-map.json
```

## Gerar um logo
Exemplo:

```bash
npm run logo:nickname:path -- \
  --nickname /aykafelix \
  --input public/logo.svg \
  --output public/logo-aykafelix.svg \
  --map branding/dunbar-tall-book-map.json \
  --x 364 --y 196 --size 22 --color '#908b76'
```

Se `--output` não for informado, o script gera `public/logo-<nickname>-path.svg`.
