export type CreativeFormat = "SQUARE" | "PORTRAIT" | "VERTICAL";

export type CreativeTextElement =
  | "title"
  | "broker"
  | "creci"
  | "location"
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
