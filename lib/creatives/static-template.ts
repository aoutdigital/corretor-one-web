export type CreativeFormat = "SQUARE" | "PORTRAIT" | "VERTICAL";
export type CreativeColorTheme =
  | "MIDNIGHT"
  | "PETROL"
  | "FOREST"
  | "BURGUNDY"
  | "NAVY"
  | "AUBERGINE";
export const CREATIVE_DARK_THEMES: Record<
  CreativeColorTheme,
  { label: string; color: string; mask: string; accent: string }
> = {
  MIDNIGHT: {
    label: "Meia-noite",
    color: "#101827",
    mask: "rgba(16,24,39,.96)",
    accent: "#d5ad67",
  },
  PETROL: {
    label: "Petróleo",
    color: "#123f42",
    mask: "rgba(18,63,66,.96)",
    accent: "#d9aa59",
  },
  FOREST: {
    label: "Floresta",
    color: "#173c2c",
    mask: "rgba(23,60,44,.96)",
    accent: "#d6b56f",
  },
  BURGUNDY: {
    label: "Bordô",
    color: "#551f2d",
    mask: "rgba(85,31,45,.96)",
    accent: "#e1b870",
  },
  NAVY: {
    label: "Azul-marinho",
    color: "#18375c",
    mask: "rgba(24,55,92,.96)",
    accent: "#d6ad62",
  },
  AUBERGINE: {
    label: "Berinjela",
    color: "#41263f",
    mask: "rgba(65,38,63,.96)",
    accent: "#dab16c",
  },
};

export type CreativeTextElement =
  | "title"
  | "broker"
  | "creci"
  | "location"
  | "highlight"
  | "code"
  | "factValue"
  | "factLabel"
  | "price"
  | "cta";
export type CreativeTypography = {
  fontSize: number;
  lineHeight: number;
  color: string;
  fontWeight: 300 | 400 | 700;
};
export type CreativeFormatConfig = {
  titleFullSize: number;
  titleShortSize: number;
  avatarSize: number;
  avatarTop: number;
  logoWidth: number;
  logoTop: number;
  factIconSize: number;
  factValueSize: number;
  priceSize: number;
  ctaFontSize: number;
  ctaBackground: string;
  contentBackground: string;
  accentColor: string;
  typography: Record<CreativeTextElement, CreativeTypography>;
};
export type CreativeTemplateConfig = {
  formats?: Partial<Record<CreativeFormat, Partial<CreativeFormatConfig>>>;
};
const typography = (
  fontSize: number,
  lineHeight: number,
  color: string,
  fontWeight: 300 | 400 | 700,
): CreativeTypography => ({ fontSize, lineHeight, color, fontWeight });
export const DEFAULT_CREATIVE_CONFIG: Record<
  CreativeFormat,
  CreativeFormatConfig
> = {
  SQUARE: {
    titleFullSize: 34,
    titleShortSize: 38,
    avatarSize: 72,
    avatarTop: 24,
    logoWidth: 270,
    logoTop: 24,
    factIconSize: 31,
    factValueSize: 24,
    priceSize: 38,
    ctaFontSize: 18,
    ctaBackground: "#101827",
    contentBackground: "#f7f5ef",
    accentColor: "#918b76",
    typography: {
      title: typography(34, 1.04, "#101827", 400),
      broker: typography(24, 1.1, "#ffffff", 700),
      creci: typography(17, 1.2, "#ffffff", 400),
      location: typography(23, 1.2, "#ffffff", 700),
      highlight: typography(18, 1, "#101827", 700),
      code: typography(17, 1.2, "#ffffff", 400),
      factValue: typography(24, 1, "#101827", 700),
      factLabel: typography(15, 1.1, "#737b86", 400),
      price: typography(38, 1, "#101827", 700),
      cta: typography(18, 1, "#ffffff", 700),
    },
  },
  PORTRAIT: {
    titleFullSize: 48,
    titleShortSize: 52,
    avatarSize: 72,
    avatarTop: 24,
    logoWidth: 270,
    logoTop: 24,
    factIconSize: 31,
    factValueSize: 24,
    priceSize: 44,
    ctaFontSize: 21,
    ctaBackground: "#101827",
    contentBackground: "#f7f5ef",
    accentColor: "#918b76",
    typography: {
      title: typography(48, 1.04, "#101827", 400),
      broker: typography(24, 1.1, "#ffffff", 700),
      creci: typography(17, 1.2, "#ffffff", 400),
      location: typography(23, 1.2, "#ffffff", 700),
      highlight: typography(18, 1, "#101827", 700),
      code: typography(17, 1.2, "#ffffff", 400),
      factValue: typography(24, 1, "#101827", 700),
      factLabel: typography(15, 1.1, "#737b86", 400),
      price: typography(44, 1, "#101827", 700),
      cta: typography(21, 1, "#ffffff", 700),
    },
  },
  VERTICAL: {
    titleFullSize: 44,
    titleShortSize: 44,
    avatarSize: 82,
    avatarTop: 130,
    logoWidth: 300,
    logoTop: 135,
    factIconSize: 31,
    factValueSize: 24,
    priceSize: 42,
    ctaFontSize: 21,
    ctaBackground: "#101827",
    contentBackground: "#f7f5ef",
    accentColor: "#918b76",
    typography: {
      title: typography(44, 1.06, "#101827", 400),
      broker: typography(26, 1.1, "#ffffff", 700),
      creci: typography(18, 1.2, "#ffffff", 400),
      location: typography(27, 1.2, "#ffffff", 700),
      highlight: typography(22, 1, "#101827", 700),
      code: typography(18, 1.2, "#ffffff", 400),
      factValue: typography(24, 1, "#101827", 700),
      factLabel: typography(15, 1.1, "#737b86", 400),
      price: typography(42, 1, "#101827", 700),
      cta: typography(21, 1, "#ffffff", 700),
    },
  },
};

export type PropertyCreativePayload = {
  property: {
    id: string;
    title: string;
    location: string;
    price: string;
    code: string;
    imageUrl: string;
    secondaryImageUrl?: string;
    highlight?: string;
    carouselImages?: string[];
    carouselSlides?: Array<{
      kind: "COVER" | "NUMBERS" | "ENVIRONMENT" | "FEATURES" | "LOCATION" | "CONTACT";
      environmentId?: string;
      imageUrl: string;
      eyebrow: string;
      title: string;
      text: string;
    }>;
    features?: string[];
    environments?: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      area?: string | null;
      tags: string[];
    }>;
    stats: Array<{
      kind: "BED" | "SUITE" | "CAR" | "AREA";
      value: string;
      label: string;
    }>;
  };
  broker: {
    name: string;
    nickname: string;
    creci: string;
    avatarUrl: string | null;
    logoUrl: string | null;
    logoWhiteUrl: string | null;
  };
  copy: {
    headline: string;
    supportingText: string;
    cta: string;
    titleMode: "FULL" | "SHORT";
  };
  format: CreativeFormat;
  colorTheme?: CreativeColorTheme;
  carouselSlide?: number;
  templateConfig?: CreativeTemplateConfig;
};

export const CREATIVE_DIMENSIONS: Record<
  CreativeFormat,
  { width: number; height: number; label: string }
> = {
  SQUARE: { width: 1080, height: 1080, label: "Square · 1080 × 1080" },
  PORTRAIT: { width: 1080, height: 1350, label: "Feed 4:5 · 1080 × 1350" },
  VERTICAL: {
    width: 1080,
    height: 1920,
    label: "Stories/Status · 1080 × 1920",
  },
};

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char] ?? char,
  );
}
function safeUrl(value: string | null) {
  if (
    value &&
    /^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,[a-z0-9+/=]+$/i.test(
      value,
    )
  )
    return value;
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) ? escape(url.href) : "";
  } catch {
    return "";
  }
}
const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)
    ? value
    : fallback;
export function resolveCreativeFormatConfig(
  config: CreativeTemplateConfig | undefined,
  format: CreativeFormat,
): CreativeFormatConfig {
  const base = DEFAULT_CREATIVE_CONFIG[format];
  const custom = config?.formats?.[format] ?? {};
  const customTypography =
    custom.typography ??
    ({} as Partial<Record<CreativeTextElement, Partial<CreativeTypography>>>);
  const resolvedTypography = Object.fromEntries(
    (Object.keys(base.typography) as CreativeTextElement[]).map((key) => {
      const fallback = base.typography[key];
      const value = customTypography[key] ?? {};
      const weight =
        value.fontWeight === 300 ||
        value.fontWeight === 400 ||
        value.fontWeight === 700
          ? value.fontWeight
          : fallback.fontWeight;
      return [
        key,
        {
          fontSize: clamp(value.fontSize, 8, 96, fallback.fontSize),
          lineHeight: clamp(value.lineHeight, 0.8, 2, fallback.lineHeight),
          color: color(value.color, fallback.color),
          fontWeight: weight,
        },
      ];
    }),
  ) as Record<CreativeTextElement, CreativeTypography>;
  return {
    titleFullSize: resolvedTypography.title.fontSize,
    titleShortSize: clamp(custom.titleShortSize, 20, 80, base.titleShortSize),
    avatarSize: clamp(custom.avatarSize, 40, 120, base.avatarSize),
    avatarTop: clamp(custom.avatarTop, 0, 500, base.avatarTop),
    logoWidth: clamp(custom.logoWidth, 120, 400, base.logoWidth),
    logoTop: clamp(custom.logoTop, 0, 500, base.logoTop),
    factIconSize: clamp(custom.factIconSize, 16, 48, base.factIconSize),
    factValueSize: resolvedTypography.factValue.fontSize,
    priceSize: resolvedTypography.price.fontSize,
    ctaFontSize: resolvedTypography.cta.fontSize,
    ctaBackground: color(custom.ctaBackground, base.ctaBackground),
    contentBackground: color(custom.contentBackground, base.contentBackground),
    accentColor: color(custom.accentColor, base.accentColor),
    typography: resolvedTypography,
  };
}
function statIcon(
  kind: PropertyCreativePayload["property"]["stats"][number]["kind"],
) {
  if (kind === "BED")
    return `<svg viewBox="0 0 24 24"><path d="M3 18v-7m18 7v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5m-4-2h18M7 11V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3"/></svg>`;
  if (kind === "SUITE")
    return `<svg viewBox="0 0 24 24"><path d="M4 20V5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v15M4 20h16M14 12h.01"/></svg>`;
  if (kind === "CAR")
    return `<svg viewBox="0 0 24 24"><path d="m5 11 2-5h10l2 5M4 11h16v7H4zM7 15h.01M17 15h.01M6 18v2m12-2v2"/></svg>`;
  return `<svg viewBox="0 0 24 24"><path d="M4 20 20 4M8 4H4v4M16 20h4v-4M14 4h6v6M10 20H4v-6"/></svg>`;
}

type CreativeFonts = { light: string; book: string; bold: string };
function fontFaces(fonts?: CreativeFonts) {
  const sources = fonts ?? {
    light: "/fonts/DunbarTall-Light.woff2",
    book: "/fonts/DunbarTall-Book.woff2",
    bold: "/fonts/DunbarTall-Bold.woff2",
  };
  return `@font-face{font-family:"dunbar-tall";src:url("${sources.light}") format("woff2");font-weight:300}@font-face{font-family:"dunbar-tall";src:url("${sources.book}") format("woff2");font-weight:400}@font-face{font-family:"dunbar-tall";src:url("${sources.bold}") format("woff2");font-weight:700}`;
}

function buildPropertyEssentialHtmlBase(
  payload: PropertyCreativePayload,
  fonts?: CreativeFonts,
) {
  const { width, height } = CREATIVE_DIMENSIONS[payload.format];
  const vertical = payload.format === "VERTICAL";
  const portrait = payload.format === "PORTRAIT";
  const visual = resolveCreativeFormatConfig(
    payload.templateConfig,
    payload.format,
  );
  const headerHeight = vertical ? 154 : 116;
  const imageHeight = vertical ? 990 : portrait ? 670 : 545;
  const avatar = safeUrl(payload.broker.avatarUrl);
  const logo = safeUrl(payload.broker.logoUrl);
  const whiteLogo = safeUrl(payload.broker.logoWhiteUrl);
  if (vertical)
    return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces(fonts)}html,body{font-family:"dunbar-tall",Arial,sans-serif!important;font-weight:300}.title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;font-size:${payload.copy.titleMode === "FULL" ? visual.titleFullSize : visual.titleShortSize}px!important;font-weight:400!important}.headline,.support{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.canvas,.body{background:${visual.contentBackground}!important}.fact svg{width:${visual.factIconSize}px!important;height:${visual.factIconSize}px!important;stroke:${visual.accentColor}!important}.factValue{font-size:${visual.factValueSize}px!important}.price{font-size:${visual.priceSize}px!important}.cta{font-size:${visual.ctaFontSize}px!important;background:${visual.ctaBackground}!important}.avatar{width:${visual.avatarSize}px!important;height:${visual.avatarSize}px!important}.brandLogo{max-width:${visual.logoWidth}px!important}.broker,.brandText,.location,.factValue,.price,.cta{font-weight:700!important}
  *{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#f7f5ef;color:#101827}.canvas{position:relative;width:1080px;height:1920px;overflow:hidden;background:#f7f5ef}.hero{position:relative;height:1152px}.photo{width:100%;height:100%;object-fit:cover}.topShade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.82) 0,rgba(0,0,0,.4) 15%,transparent 42%,transparent 68%,rgba(8,15,28,.84) 100%)}.header{position:absolute;z-index:2;left:64px;right:64px;top:130px;display:flex;align-items:center;justify-content:space-between;color:#fff}.identity{display:flex;align-items:center;gap:18px}.avatar{width:82px;height:82px;border:2px solid rgba(255,255,255,.86);border-radius:50%;object-fit:cover}.avatarFallback{display:flex;align-items:center;justify-content:center;background:#111827;color:#fff;font-size:28px}.broker{font-size:26px;font-weight:800;text-shadow:0 1px 12px rgba(0,0,0,.35)}.creci{margin-top:6px;font-size:18px;color:rgba(255,255,255,.82)}.brandLogo{max-width:300px;max-height:72px;object-fit:contain;filter:drop-shadow(0 1px 10px rgba(0,0,0,.28))}.brandText{font-size:27px;font-weight:800;letter-spacing:-.04em;color:#fff}.location{position:absolute;left:64px;right:220px;bottom:54px;color:#fff;font-size:27px;font-weight:700}.code{position:absolute;right:64px;bottom:58px;color:rgba(255,255,255,.82);font-size:18px}.body{height:768px;padding:42px 64px 150px;display:flex;flex-direction:column}.title{margin:0;font-size:48px;line-height:1.06;letter-spacing:-.035em;font-weight:650}.headline{margin:15px 0 0;color:#525b67;font-size:25px;line-height:1.25}.support{margin:7px 0 0;color:#737b86;font-size:19px;line-height:1.25}.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;margin-top:28px;padding:23px 0;border-top:1px solid #d9d6cb;border-bottom:1px solid #d9d6cb}.fact{display:flex;align-items:center;justify-content:center;gap:11px;min-width:0;border-right:1px solid #d9d6cb}.fact:last-child{border-right:0}.fact svg{width:31px;height:31px;flex:0 0 auto;fill:none;stroke:#918b76;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.factValue{font-size:24px;font-weight:800}.factLabel{font-size:15px;color:#737b86;white-space:nowrap}.conversion{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:30px;margin-top:28px}.price{font-size:42px;font-weight:800}.cta{min-width:305px;padding:20px 28px;border-radius:999px;background:#101827;color:#fff;text-align:center;font-size:21px;font-weight:800}
  </style></head><body><div class="canvas"><div class="hero"><img class="photo" src="${safeUrl(payload.property.imageUrl)}"><div class="topShade"></div><header class="header"><div class="identity">${avatar ? `<img class="avatar" src="${avatar}">` : `<div class="avatar avatarFallback">${escape(payload.broker.name.slice(0, 1))}</div>`}<div><div class="broker">${escape(payload.broker.name)}</div><div class="creci">${escape(payload.broker.creci)}</div></div></div>${whiteLogo ? `<img class="brandLogo" src="${whiteLogo}">` : `<div class="brandText">corretor.one/${escape(payload.broker.nickname)}</div>`}</header><div class="location">${escape(payload.property.location)}</div><div class="code">${escape(payload.property.code)}</div></div><div class="body"><h1 class="title">${escape(payload.property.title)}</h1>${payload.copy.headline ? `<p class="headline">${escape(payload.copy.headline)}</p>` : ""}${payload.copy.supportingText ? `<p class="support">${escape(payload.copy.supportingText)}</p>` : ""}<div class="facts">${payload.property.stats.map((item) => `<div class="fact">${statIcon(item.kind)}<div><div class="factValue">${escape(item.value)}</div><div class="factLabel">${escape(item.label)}</div></div></div>`).join("")}</div><div class="conversion"><div class="price">${escape(payload.property.price)}</div><div class="cta">${escape(payload.copy.cta)}</div></div></div></div></body></html>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces(fonts)}html,body{font-family:"dunbar-tall",Arial,sans-serif!important;font-weight:300}.title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${portrait ? 3 : 2};overflow:hidden;font-size:${payload.copy.titleMode === "FULL" ? (portrait ? 32 : 25) : portrait ? 39 : 30}px!important;font-weight:400!important}.headline,.support{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.broker,.brandText,.tag,.location,.factValue,.price,.cta{font-weight:700!important}.header{position:absolute!important;z-index:2;left:0;right:0;top:0;background:transparent!important;color:#fff}.creci{color:rgba(255,255,255,.82)!important}.photoWrap{height:${headerHeight + imageHeight}px!important}.shade{background:linear-gradient(180deg,rgba(0,0,0,.78) 0,transparent 38%,transparent 48%,rgba(8,15,28,.86) 100%)!important}.facts{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;gap:0!important;padding:18px 0;border-top:1px solid #d9d6cb;border-bottom:1px solid #d9d6cb}.fact{justify-content:center;border-right:1px solid #d9d6cb}.fact:last-child{border-right:0}.canvas,.body{background:${visual.contentBackground}!important}.fact svg{stroke:${visual.accentColor}!important}.body{padding:${portrait ? "44px 64px 48px" : "32px 56px 36px"}!important}.title{font-size:${payload.copy.titleMode === "FULL" ? visual.titleFullSize : visual.titleShortSize}px!important;line-height:1.04!important;letter-spacing:-.04em!important}.facts{margin-top:${payload.copy.titleMode === "FULL" ? 30 : 24}px!important;padding:22px 0!important}.fact svg{width:${visual.factIconSize}px!important;height:${visual.factIconSize}px!important}.factValue{font-size:${visual.factValueSize}px!important}.factLabel{font-size:15px!important}.bottom{margin-top:28px!important;align-items:center!important;padding-top:0!important}.price{font-size:${visual.priceSize}px!important}.cta{min-width:${portrait ? 330 : 285}px;padding:18px 25px;border-radius:999px;background:${visual.ctaBackground};color:#fff!important;text-align:center;font-size:${visual.ctaFontSize}px!important}.avatar{width:${visual.avatarSize}px!important;height:${visual.avatarSize}px!important;border:2px solid rgba(255,255,255,.86)}.broker{font-size:24px!important}.creci{font-size:17px!important}.brandLogo{max-width:${visual.logoWidth}px!important;max-height:64px!important}
  *{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#f7f5ef;color:#101827}.canvas{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:#f7f5ef}.header{height:${headerHeight}px;padding:24px 56px;display:flex;align-items:center;justify-content:space-between;background:#fff}.identity{display:flex;align-items:center;gap:16px}.avatar{width:${vertical ? 82 : 64}px;height:${vertical ? 82 : 64}px;border-radius:50%;object-fit:cover}.avatarFallback{display:flex;align-items:center;justify-content:center;background:#111827;color:#fff;font-size:24px}.broker{font-size:${vertical ? 25 : 20}px;font-weight:800}.creci{margin-top:5px;color:#737b86;font-size:${vertical ? 18 : 15}px}.brandLogo{max-width:${vertical ? 290 : 235}px;max-height:${vertical ? 68 : 52}px;object-fit:contain}.brandText{font-size:${vertical ? 27 : 22}px;font-weight:800;letter-spacing:-.04em}.photoWrap{position:relative;height:${imageHeight}px}.photo{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(8,15,28,.86))}.tag{position:absolute;top:38px;left:56px;padding:13px 20px;border-radius:999px;background:#fff;font-size:18px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.location{position:absolute;left:56px;right:180px;bottom:38px;color:#fff;font-size:${vertical ? 27 : 23}px;font-weight:700}.code{position:absolute;right:56px;bottom:41px;color:#fff;font-size:17px}.body{height:${height - headerHeight - imageHeight}px;padding:${vertical ? "58px 64px 60px" : "38px 56px 42px"};display:flex;flex-direction:column}.title{margin:0;font-size:${vertical ? 54 : portrait ? 39 : 34}px;line-height:1.08;letter-spacing:-.035em;font-weight:600}.headline{margin:${vertical ? 24 : 14}px 0 0;color:#5b6472;font-size:${vertical ? 28 : 20}px;line-height:1.3}.support{margin:8px 0 0;color:#737b86;font-size:${vertical ? 21 : 16}px;line-height:1.3}.facts{display:flex;gap:${vertical ? 28 : 20}px;margin-top:${vertical ? 38 : 23}px}.fact{display:flex;align-items:center;gap:10px;color:#3f4753}.fact svg{width:${vertical ? 34 : 27}px;height:${vertical ? 34 : 27}px;fill:none;stroke:#918b76;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.factValue{font-size:${vertical ? 25 : 20}px;font-weight:800}.factLabel{font-size:${vertical ? 17 : 13}px;color:#737b86}.bottom{margin-top:auto;display:flex;align-items:end;justify-content:space-between;padding-top:${vertical ? 28 : 18}px}.price{font-size:${vertical ? 43 : 32}px;font-weight:800}.cta{text-align:right;color:#918b76;font-size:${vertical ? 23 : 17}px;font-weight:800}
  </style></head><body><div class="canvas"><header class="header"><div class="identity">${avatar ? `<img class="avatar" src="${avatar}">` : `<div class="avatar avatarFallback">${escape(payload.broker.name.slice(0, 1))}</div>`}<div><div class="broker">${escape(payload.broker.name)}</div><div class="creci">${escape(payload.broker.creci)}</div></div></div>${whiteLogo ? `<img class="brandLogo" src="${whiteLogo}">` : `<div class="brandText">corretor.one/${escape(payload.broker.nickname)}</div>`}</header><div class="photoWrap"><img class="photo" src="${safeUrl(payload.property.imageUrl)}"><div class="shade"></div><div class="location">${escape(payload.property.location)}</div><div class="code">${escape(payload.property.code)}</div></div><div class="body"><h1 class="title">${escape(payload.property.title)}</h1>${payload.copy.headline ? `<p class="headline">${escape(payload.copy.headline)}</p>` : ""}${payload.copy.supportingText ? `<p class="support">${escape(payload.copy.supportingText)}</p>` : ""}<div class="facts">${payload.property.stats.map((item) => `<div class="fact">${statIcon(item.kind)}<div><div class="factValue">${escape(item.value)}</div><div class="factLabel">${escape(item.label)}</div></div></div>`).join("")}</div><div class="bottom"><div class="price">${escape(payload.property.price)}</div><div class="cta">${escape(payload.copy.cta)}</div></div></div></div></body></html>`;
}

export function buildPropertyEssentialHtml(
  payload: PropertyCreativePayload,
  fonts?: CreativeFonts,
) {
  const fullTitlePayload: PropertyCreativePayload = {
    ...payload,
    copy: {
      ...payload.copy,
      headline: "",
      supportingText: "",
      titleMode: "FULL",
    },
  };

  const visual = resolveCreativeFormatConfig(
    payload.templateConfig,
    payload.format,
  );
  const selectors: Record<CreativeTextElement, string> = {
    title: ".title",
    broker: ".broker",
    creci: ".creci",
    location: ".location",
    highlight: ".highlight",
    code: ".code",
    factValue: ".factValue",
    factLabel: ".factLabel",
    price: ".price",
    cta: ".cta",
  };
  const textCss = (Object.keys(selectors) as CreativeTextElement[])
    .map((key) => {
      const item = visual.typography[key];
      return `${selectors[key]}{font-size:${item.fontSize}px!important;line-height:${item.lineHeight}!important;color:${item.color}!important;font-weight:${item.fontWeight}!important}`;
    })
    .join("");
  const positionCss = `.header{position:absolute!important;inset:0!important;height:100%!important;padding:0!important;display:block!important}.identity{position:absolute!important;left:${payload.format === "VERTICAL" ? 64 : 56}px!important;top:${visual.avatarTop}px!important}.brandLogo,.brandText{position:absolute!important;right:${payload.format === "VERTICAL" ? 64 : 56}px!important;top:${visual.logoTop}px!important}`;
  return buildPropertyEssentialHtmlBase(fullTitlePayload, fonts)
    .replace(
      /display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:\d+;overflow:hidden;/g,
      "",
    )
    .replace("</style>", `${textCss}${positionCss}</style>`);
}

export function buildPropertyDualHtml(
  payload: PropertyCreativePayload,
  fonts?: CreativeFonts,
) {
  const { width, height } = CREATIVE_DIMENSIONS[payload.format];
  const visual = resolveCreativeFormatConfig(
    payload.templateConfig,
    payload.format,
  );
  const vertical = payload.format === "VERTICAL";
  const side = vertical ? 64 : 56;
  const avatar = safeUrl(payload.broker.avatarUrl);
  const logo = safeUrl(payload.broker.logoWhiteUrl);
  const second = safeUrl(
    payload.property.secondaryImageUrl || payload.property.imageUrl,
  );
  const t = visual.typography;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces(fonts)}*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:"dunbar-tall",Arial,sans-serif}.canvas{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:#101827;color:#fff}.photo{position:absolute;left:0;width:100%;height:50%;object-fit:cover}.photo.one{top:0}.photo.two{bottom:0}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.58) 0,transparent 24%,transparent 34%,rgba(0,0,0,.88) 49%,rgba(0,0,0,.88) 51%,transparent 68%,transparent 76%,rgba(0,0,0,.82) 100%)}.header{position:absolute;z-index:2;left:${side}px;right:${side}px;top:${visual.avatarTop}px;display:flex;justify-content:space-between;align-items:center}.identity{display:flex;align-items:center;gap:16px}.avatar{width:${visual.avatarSize}px;height:${visual.avatarSize}px;border-radius:50%;border:2px solid #fff;object-fit:cover}.avatarFallback{display:flex;align-items:center;justify-content:center;background:#101827}.brandLogo{width:${visual.logoWidth}px;max-height:76px;object-fit:contain}.brandText{font-weight:700}.broker{font-size:${t.broker.fontSize}px;line-height:${t.broker.lineHeight};font-weight:${t.broker.fontWeight};color:${t.broker.color}}.creci{font-size:${t.creci.fontSize}px;line-height:${t.creci.lineHeight};font-weight:${t.creci.fontWeight};color:${t.creci.color}}.title{position:absolute;z-index:2;left:${side}px;right:${side}px;top:50%;transform:translateY(-50%);margin:0;text-align:center;font-size:${t.title.fontSize}px;line-height:${t.title.lineHeight};font-weight:${t.title.fontWeight};color:${t.title.color};letter-spacing:-.035em;text-shadow:0 2px 16px rgba(0,0,0,.5)}.tag{position:absolute;z-index:2;padding:13px 21px;border-radius:999px;white-space:nowrap}.location{left:${side}px;top:calc(50% + ${vertical ? 112 : 90}px);background:rgba(16,24,39,.72);backdrop-filter:blur(8px);font-size:${t.location.fontSize}px;line-height:${t.location.lineHeight};font-weight:${t.location.fontWeight};color:${t.location.color}}.highlight{right:${side}px;top:calc(50% + ${vertical ? 112 : 90}px);background:${visual.contentBackground};font-size:${t.highlight.fontSize}px;line-height:${t.highlight.lineHeight};font-weight:${t.highlight.fontWeight};color:${t.highlight.color};text-transform:uppercase;letter-spacing:.08em}.conversion{position:absolute;z-index:2;left:${side}px;right:${side}px;bottom:${vertical ? 150 : 70}px;display:flex;align-items:center;justify-content:space-between;gap:30px}.price{font-size:${t.price.fontSize}px;line-height:${t.price.lineHeight};font-weight:${t.price.fontWeight};color:${t.price.color};text-shadow:0 2px 14px rgba(0,0,0,.5)}.cta{padding:18px 28px;border-radius:999px;background:${visual.ctaBackground};font-size:${t.cta.fontSize}px;line-height:${t.cta.lineHeight};font-weight:${t.cta.fontWeight};color:${t.cta.color}}</style></head><body><div class="canvas"><img class="photo one" src="${safeUrl(payload.property.imageUrl)}"><img class="photo two" src="${second}"><div class="shade"></div><header class="header"><div class="identity">${avatar ? `<img class="avatar" src="${avatar}">` : `<div class="avatar avatarFallback">${escape(payload.broker.name.slice(0, 1))}</div>`}<div><div class="broker">${escape(payload.broker.name)}</div><div class="creci">${escape(payload.broker.creci)}</div></div></div>${logo ? `<img class="brandLogo" src="${logo}">` : `<div class="brandText">corretor.one/${escape(payload.broker.nickname)}</div>`}</header><h1 class="title">${escape(payload.property.title)}</h1><div class="tag location">${escape(payload.property.location)}</div><div class="tag highlight">${escape(payload.property.highlight || "Oportunidade")}</div><div class="conversion"><div class="price">${escape(payload.property.price)}</div><div class="cta">${escape(payload.copy.cta)}</div></div></div></body></html>`;
}

export function buildPropertyEditorialHtml(
  payload: PropertyCreativePayload,
  fonts?: CreativeFonts,
) {
  const { width, height } = CREATIVE_DIMENSIONS[payload.format];
  const visual = resolveCreativeFormatConfig(
    payload.templateConfig,
    payload.format,
  );
  const theme = CREATIVE_DARK_THEMES[payload.colorTheme ?? "PETROL"];
  const vertical = payload.format === "VERTICAL";
  const portrait = payload.format === "PORTRAIT";
  const side = vertical ? 68 : 58;
  const avatar = safeUrl(payload.broker.avatarUrl);
  const logo = safeUrl(payload.broker.logoWhiteUrl);
  const t = visual.typography;
  const titleSize = vertical
    ? t.title.fontSize * 1.2
    : portrait
      ? t.title.fontSize
      : t.title.fontSize * 0.84;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces(fonts)}*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:"dunbar-tall",Arial,sans-serif}.canvas{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${theme.color};color:#fff}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.masks{position:absolute;inset:0;background:linear-gradient(180deg,${theme.mask} 0%,${theme.mask} 9%,rgba(0,0,0,.35) 32%,transparent 45%,transparent 60%,rgba(0,0,0,.38) 72%,${theme.mask} 91%,${theme.mask} 100%)}.header{position:absolute;z-index:2;left:${side}px;right:${side}px;top:${visual.avatarTop}px;display:flex;align-items:center;justify-content:space-between}.identity{display:flex;align-items:center;gap:16px}.avatar{width:${visual.avatarSize}px;height:${visual.avatarSize}px;border-radius:50%;border:2px solid #fff;object-fit:cover}.avatarFallback{display:flex;align-items:center;justify-content:center;background:${theme.color};font-size:28px}.broker{font-size:${t.broker.fontSize}px;line-height:${t.broker.lineHeight};font-weight:${t.broker.fontWeight};color:#fff}.creci{margin-top:4px;font-size:${t.creci.fontSize}px;line-height:${t.creci.lineHeight};font-weight:${t.creci.fontWeight};color:rgba(255,255,255,.78)}.brandLogo{width:${visual.logoWidth}px;max-height:78px;object-fit:contain}.brandText{font-size:${t.broker.fontSize}px;font-weight:700}.highlight{position:absolute;z-index:2;left:50%;top:${vertical ? 305 : portrait ? 205 : 170}px;transform:translateX(-50%);max-width:72%;padding:13px 30px;border:3px solid ${theme.accent};border-radius:999px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:${t.highlight.fontSize}px;line-height:1;font-weight:${t.highlight.fontWeight};color:#fff;text-transform:uppercase;letter-spacing:.08em}.title{position:absolute;z-index:2;left:${side}px;right:${side}px;top:${vertical ? 390 : portrait ? 275 : 225}px;margin:0;text-align:center;font-size:${titleSize}px;line-height:${t.title.lineHeight};font-weight:${t.title.fontWeight};color:#fff;letter-spacing:-.035em;text-shadow:0 2px 16px rgba(0,0,0,.35)}.facts{position:absolute;z-index:2;left:${side}px;right:${side}px;top:52%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:22px 18px;border-radius:999px;background:${theme.mask};backdrop-filter:blur(8px)}.fact{min-width:0;padding:0 10px;border-right:1px solid rgba(255,255,255,.32);text-align:center}.fact:last-child{border-right:0}.factValue{display:inline;font-size:${t.factValue.fontSize}px;line-height:${t.factValue.lineHeight};font-weight:${t.factValue.fontWeight};color:#fff}.factLabel{display:inline;margin-left:6px;font-size:${t.factLabel.fontSize}px;line-height:${t.factLabel.lineHeight};font-weight:${t.factLabel.fontWeight};color:rgba(255,255,255,.8)}.footer{position:absolute;z-index:2;left:${side}px;right:${side}px;bottom:${vertical ? 125 : 65}px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:35px}.location{font-size:${t.location.fontSize}px;line-height:${t.location.lineHeight};font-weight:${t.location.fontWeight};color:#fff}.price{font-size:${t.price.fontSize}px;line-height:${t.price.lineHeight};font-weight:${t.price.fontWeight};color:#fff;white-space:nowrap}</style></head><body><div class="canvas"><img class="photo" src="${safeUrl(payload.property.imageUrl)}"><div class="masks"></div><header class="header"><div class="identity">${avatar ? `<img class="avatar" src="${avatar}">` : `<div class="avatar avatarFallback">${escape(payload.broker.name.slice(0, 1))}</div>`}<div><div class="broker">${escape(payload.broker.name)}</div><div class="creci">${escape(payload.broker.creci)}</div></div></div>${logo ? `<img class="brandLogo" src="${logo}">` : `<div class="brandText">corretor.one/${escape(payload.broker.nickname)}</div>`}</header><div class="highlight">${escape(payload.property.highlight || "Oportunidade")}</div><h1 class="title">${escape(payload.property.title)}</h1><div class="facts">${payload.property.stats.map((item) => `<div class="fact"><span class="factValue">${escape(item.value)}</span><span class="factLabel">${escape(item.label)}</span></div>`).join("")}</div><div class="footer"><div class="location">${escape(payload.property.location)}</div><div class="price">${escape(payload.property.price)}</div></div></div></body></html>`;
}

export const PROPERTY_JOURNEY_SLIDES = 8;

export const PROPERTY_JOURNEY_DEFAULTS = [
  { kind: "COVER", eyebrow: "O convite", title: "", text: "" },
  { kind: "NUMBERS", eyebrow: "Essência em números", title: "", text: "" },
  { kind: "ENVIRONMENT", eyebrow: "Ambiente 01", title: "O espaço de receber", text: "Um ambiente que amplia encontros e transforma a rotina." },
  { kind: "ENVIRONMENT", eyebrow: "Ambiente 02", title: "Integração e movimento", text: "Fluxos leves, proporções generosas e liberdade para viver." },
  { kind: "ENVIRONMENT", eyebrow: "Ambiente 03", title: "Pausa e privacidade", text: "Privacidade e conforto para desacelerar." },
  { kind: "FEATURES", eyebrow: "Diferenciais", title: "O que torna este imóvel único", text: "" },
  { kind: "LOCATION", eyebrow: "Além da porta", title: "", text: "Um endereço conectado ao seu estilo de vida." },
  { kind: "CONTACT", eyebrow: "Contato", title: "Seu próximo capítulo pode começar aqui", text: "" },
] as const;

export function buildPropertyJourneyHtml(
  payload: PropertyCreativePayload,
  fonts?: CreativeFonts,
) {
  const slide = Math.max(0, Math.min(7, payload.carouselSlide ?? 0));
  const configuredSlide = payload.property.carouselSlides?.[slide];
  const kind = configuredSlide?.kind || PROPERTY_JOURNEY_DEFAULTS[slide].kind;
  const images = payload.property.carouselImages?.length
    ? payload.property.carouselImages
    : [payload.property.imageUrl];
  const image = safeUrl(configuredSlide?.imageUrl || images[Math.min(images.length - 1, Math.max(0, slide - 1))] || images[0]);
  const avatar = safeUrl(payload.broker.avatarUrl);
  const logo = safeUrl(
    kind === "CONTACT"
      ? payload.broker.logoUrl || payload.broker.logoWhiteUrl
      : payload.broker.logoWhiteUrl || payload.broker.logoUrl,
  );
  const defaults = PROPERTY_JOURNEY_DEFAULTS[slide];
  const eyebrow = configuredSlide?.eyebrow || defaults.eyebrow;
  const customTitle = configuredSlide?.title || defaults.title;
  const customText = configuredSlide?.text || defaults.text;
  const stats = payload.property.stats
    .map(
      (item) =>
        `<div><b>${escape(item.value)}</b><span>${escape(item.label)}</span></div>`,
    )
    .join("");
  const features = (
    payload.property.features?.length
      ? payload.property.features
      : [
          "Arquitetura contemporânea",
          "Ambientes integrados",
          "Conforto em cada detalhe",
          "Localização estratégica",
        ]
  )
    .slice(0, 6)
    .map((item) => `<li>${escape(item)}</li>`)
    .join("");
  const header = `<header><div class="identity">${avatar ? `<img src="${avatar}">` : `<i>${escape(payload.broker.name.slice(0, 1))}</i>`}<span><b>${escape(payload.broker.name)}</b><small>${escape(payload.broker.creci)}</small></span></div>${logo ? `<img class="logo" src="${logo}">` : `<b>corretor.one/${escape(payload.broker.nickname)}</b>`}</header>`;
  const content =
    kind === "COVER"
      ? `<main class="cover"><em>${escape(payload.property.highlight || "Seleção especial")}</em><h1>${escape(customTitle || payload.property.title)}</h1><p>${escape(customText || payload.property.location)}</p></main>`
      : kind === "NUMBERS"
        ? `<main class="numbers"><h1>${escape(customTitle || payload.property.title)}</h1><div class="stats">${stats}</div><strong>${escape(payload.property.price)}</strong>${customText ? `<p>${escape(customText)}</p>` : ""}</main>`
        : kind === "ENVIRONMENT"
          ? `<main class="chapter"><h1>${escape(customTitle)}</h1><p>${escape(customText)}</p></main>`
          : kind === "FEATURES"
            ? `<main class="features"><h1>${escape(customTitle)}</h1>${customText ? `<p>${escape(customText)}</p>` : ""}<ul>${features}</ul></main>`
            : kind === "LOCATION"
              ? `<main class="chapter"><em>${escape(eyebrow)}</em><h1>${escape(customTitle || payload.property.location)}</h1><p>${escape(customText)}</p></main>`
              : `<main class="contact">${avatar ? `<img src="${avatar}">` : ""}<p>${escape(customTitle)}</p><h1>${escape(payload.broker.name)}</h1><span>${escape(payload.broker.creci)}</span>${customText ? `<span>${escape(customText)}</span>` : ""}<b>corretor.one/${escape(payload.broker.nickname)}</b><strong>${escape(payload.copy.cta)}</strong></main>`;
  const continuity = `<div class="continuity"><svg viewBox="0 0 8640 1350" preserveAspectRatio="none"><path class="ribbon" d="M0 650 C360 500 720 800 1080 650 S1800 500 2160 650 S2880 800 3240 650 S3960 500 4320 650 S5040 800 5400 650 S6120 500 6480 650 S7200 800 7560 650 S8280 500 8640 650"/><path class="thread" d="M0 650 C360 500 720 800 1080 650 S1800 500 2160 650 S2880 800 3240 650 S3960 500 4320 650 S5040 800 5400 650 S6120 500 6480 650 S7200 800 7560 650 S8280 500 8640 650"/>${Array.from({ length: 7 }, (_, index) => `<circle cx="${(index + 1) * 1080}" cy="650" r="118"/>`).join("")}</svg><div class="panoramaWord">PERCURSO · UM IMÓVEL · OITO CAPÍTULOS</div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces(fonts)}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:"dunbar-tall",Arial,sans-serif}.canvas{position:relative;width:1080px;height:1350px;overflow:hidden;background:#d8d1c5;color:#fff}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,22,29,.78),rgba(16,22,29,.18) 72%),linear-gradient(0deg,rgba(16,22,29,.82),transparent 54%)}header{position:absolute;z-index:5;left:64px;right:64px;top:55px;display:flex;justify-content:space-between;align-items:center}.identity{display:flex;align-items:center;gap:14px}.identity img,.identity i{width:58px;height:58px;border:1px solid #fff;border-radius:50%;object-fit:cover}.identity i{display:grid;place-items:center;font-style:normal}.identity b,.identity small{display:block}.identity small{opacity:.72}.logo{width:235px;max-height:58px;object-fit:contain}.eyebrow{position:absolute;z-index:5;left:64px;top:175px;text-transform:uppercase;letter-spacing:.2em;font-weight:700}.continuity{position:absolute;z-index:3;left:${-slide * 1080}px;top:0;width:8640px;height:1350px;pointer-events:none}.continuity svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.continuity .ribbon{fill:none;stroke:rgba(200,160,91,.16);stroke-width:150}.continuity .thread{fill:none;stroke:#d8ae64;stroke-width:3}.continuity circle{fill:rgba(17,24,39,.28);stroke:#d8ae64;stroke-width:3}.panoramaWord{position:absolute;left:60px;top:558px;width:8520px;white-space:nowrap;font-size:126px;letter-spacing:.24em;color:rgba(255,255,255,.14)}.cover,.numbers,.chapter,.features,.contact{position:absolute;z-index:4;left:64px;right:64px}.cover,.chapter{bottom:90px}.cover em,.chapter em{font-style:normal;text-transform:uppercase;letter-spacing:.18em}.cover h1,.chapter h1{margin:18px 0;font-size:72px;line-height:1}.cover p,.chapter p{max-width:790px;font-size:27px}.numbers{top:720px}.numbers h1{font-size:44px;line-height:1.05}.numbers p{font-size:24px}.stats{display:grid;grid-template-columns:repeat(4,1fr);margin:35px 0;padding:25px 0;border-block:1px solid rgba(255,255,255,.35)}.stats div{padding:0 16px;border-right:1px solid rgba(255,255,255,.3)}.stats div:last-child{border:0}.stats b,.stats span{display:block}.stats b{font-size:34px}.numbers>strong{font-size:52px}.features{top:720px}.features h1{font-size:58px}.features p{font-size:24px}.features ul{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:35px;padding:0;list-style:none}.features li{padding:18px 0;border-bottom:1px solid rgba(255,255,255,.35);font-size:25px}.contact{inset:250px 64px auto;text-align:center;color:#171c27}.contact>img{width:230px;height:230px;border-radius:50%;object-fit:cover}.contact p{margin-top:45px;font-size:28px}.contact h1{margin:12px;font-size:68px}.contact span,.contact b{display:block;font-size:24px}.contact b{margin-top:55px}.contact strong{display:inline-block;margin-top:42px;padding:17px 34px;border:1px solid #171c27;border-radius:999px;font-size:22px}.light header,.light .eyebrow{color:#171c27}.light .panoramaWord{color:rgba(23,28,39,.08)}</style></head><body><div class="canvas ${kind === "CONTACT" ? "light" : ""}">${kind === "CONTACT" ? "" : `<img class="photo" src="${image}"><div class="veil"></div>`}${continuity}${header}<div class="eyebrow">0${slide + 1} · ${escape(eyebrow)}</div>${content}</div></body></html>`;
}
