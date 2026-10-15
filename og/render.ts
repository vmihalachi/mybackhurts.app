import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { Plugin } from "vite-plus";
import { pdfFromPixels, posterRenderWidth, posterSvg, textWidth } from "./poster";

type OgCopy = Record<string, string>;

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);

// Courier Prime is monospaced: 0.6em advance at 22px plus 3px letter-spacing, with 24px padding each side.
const tapeWidth = (text: string) => Math.round(48 + textWidth(text, 22, 3));

// The fallback font for each CJK language (patch-fonts.py writes them). Only the page's own one is
// loaded, so Japanese gets Japanese Han forms and Chinese gets Chinese ones.
const cjkFonts: Record<string, string> = {
  ja: "NotoSansJP-Bold.ttf",
  ko: "NotoSansKR-Bold.ttf",
  "zh-Hans": "NotoSansSC-Bold.ttf",
};

/** The code points a TrueType font maps, read from its cmap (formats 4 and 12). */
function coverage(file: string) {
  const font = readFileSync(file);
  const tables = font.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const record = 12 + i * 16;
    if (font.toString("latin1", record, record + 4) === "cmap")
      cmap = font.readUInt32BE(record + 8);
  }
  const points = new Set<number>();
  if (cmap < 0) return points;
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const subtable = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = font.readUInt16BE(subtable);
    if (format === 4) {
      const segments = font.readUInt16BE(subtable + 6) / 2;
      const ends = subtable + 14;
      const starts = ends + segments * 2 + 2;
      for (let s = 0; s < segments; s++) {
        const end = font.readUInt16BE(ends + s * 2);
        for (let c = font.readUInt16BE(starts + s * 2); c <= end && c < 0xffff; c++) points.add(c);
      }
    } else if (format === 12) {
      for (let g = 0; g < font.readUInt32BE(subtable + 12); g++) {
        const group = subtable + 16 + g * 12;
        const end = font.readUInt32BE(group + 4);
        for (let c = font.readUInt32BE(group); c <= end; c++) points.add(c);
      }
    }
  }
  return points;
}

/** Every string in `value` (an object of copy), with HTML tags removed. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value.replace(/<[^>]+>/g, "")];
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

export function createRenderer(ogDir: string) {
  const latinFonts = readdirSync(resolve(ogDir, "fonts"))
    .filter((file) => file.endsWith(".ttf"))
    .map((file) => resolve(ogDir, "fonts", file));
  const fontsFor = (lang = "en") =>
    cjkFonts[lang] ? [...latinFonts, resolve(ogDir, "fonts/cjk", cjkFonts[lang])] : latinFonts;
  const covered = new Map<string, Set<number>>();

  /** Fails the build when the copy uses a character none of the language's fonts can draw. */
  function assertDrawable(copy: unknown, lang: string, what: string) {
    const files = fontsFor(lang);
    const sets = files.map((file) => {
      if (!covered.has(file)) covered.set(file, coverage(file));
      return covered.get(file)!;
    });
    const missing = new Set<string>();
    for (const text of strings(copy)) {
      for (const char of text) {
        const point = char.codePointAt(0)!;
        if (point > 0x20 && !sets.some((set) => set.has(point))) missing.add(char);
      }
    }
    if (missing.size) {
      throw new Error(
        `${what} (${lang}) uses characters no font in og/fonts can draw: ${[...missing].join(" ")}. ` +
          "Rephrase the copy or add them to the fonts (apple/scripts/patch-fonts.py).",
      );
    }
  }

  function toPng(svg: string, width?: number, lang?: string) {
    return new Resvg(svg, {
      font: {
        fontFiles: fontsFor(lang),
        loadSystemFonts: false,
        defaultFontFamily: "Courier Prime",
      },
      fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    })
      .render()
      .asPng();
  }

  /** Rendered width of `text` in `family` at `size`, from the outline resvg draws. */
  function measure(text: string, family: string, size: number, lang: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400"><text x="0" y="200" font-family="${family}" font-size="${size}">${escapeXml(text)}</text></svg>`;
    return (
      new Resvg(svg, { font: { fontFiles: fontsFor(lang), loadSystemFonts: false } }).innerBBox()
        ?.width ?? 0
    );
  }

  /** The largest size up to `size` at which every line in `lines` fits in `maxWidth`. */
  function fit(lines: string[], family: string, size: number, maxWidth: number, lang: string) {
    const widest = Math.max(...lines.map((line) => measure(line, family, size, lang)));
    return widest > maxWidth ? Math.floor((size * maxWidth) / widest) : size;
  }

  /** Renders the 1200×630 social card, filling {{og.*}} placeholders from a locale's `og` object. */
  function renderOgImage(og: OgCopy, lang = "en") {
    assertDrawable(og, lang, "The social preview image");
    const template = readFileSync(resolve(ogDir, "og-image.svg"), "utf8");
    // The left column ends where the stick figure's halftone starts.
    const sizes: Record<string, number> = {
      headline: fit([og.headline1, og.headline2], "Zine Display", 64, 640, lang),
      tagline: fit([og.tagline1, og.tagline2], "Courier Prime", 29, 640, lang),
      footerNote: fit([og.footerNote], "Reenie Beanie", 42, 580, lang),
    };
    const svg = template
      .replace(/{{\s*fit\.(\w+)\s*}}/g, (_placeholder, key: string) => String(sizes[key]))
      .replace(/{{\s*tapeWidth\s*}}/g, String(tapeWidth(og.tape ?? "")))
      .replace(/{{\s*og\.(\w+)\s*}}/g, (_placeholder, key: string) => {
        if (typeof og[key] !== "string") {
          throw new Error(`Missing og.${key} for the social preview image`);
        }
        return escapeXml(og[key]);
      });
    return toPng(svg, undefined, lang);
  }

  /** Renders the square icon at `size`. `padded` insets it on a pink square for iOS/Android masks. */
  function renderIcon(iconSvg: string, size: number, { padded = false } = {}) {
    if (!padded) return toPng(iconSvg, size);
    const inner = iconSvg
      .replace(/<\?xml[^>]*>/, "")
      .replace(/<svg[^>]*>/, '<svg x="8" y="8" width="48" height="48" viewBox="0 0 64 64">');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ff4d9d"/>${inner}</svg>`;
    return toPng(svg, size);
  }

  /** Renders the printable cheat sheet for one locale as a one-page PDF. */
  function renderPoster(locale: Record<string, any>, lang: string) {
    const { moves, poster, stats, footer } = locale;
    assertDrawable(
      { moves, poster, days: stats.days, medical: footer.medical },
      lang,
      "The poster",
    );
    const image = new Resvg(posterSvg(locale, lang), {
      font: {
        fontFiles: fontsFor(lang),
        loadSystemFonts: false,
        defaultFontFamily: "Courier Prime",
      },
      fitTo: { mode: "width", value: posterRenderWidth },
      background: "#ffffff",
    }).render();
    const title = `mybackhurts: ${locale.poster.title}`;
    return pdfFromPixels(image.pixels, image.width, image.height, title);
  }

  return { renderOgImage, renderIcon, renderPoster };
}

/**
 * Renders link-preview images, PNG icons and the printable poster PDFs (`poster/<lang>.pdf`) from SVG
 * sources. They are emitted into the build output and served from memory by the dev server, so nothing
 * generated is committed.
 */
export function socialAssetsPlugin(options: {
  ogDir: string;
  iconPath: string;
  locales: Record<string, { og: OgCopy } & Record<string, any>>;
}): Plugin {
  const { renderOgImage, renderIcon, renderPoster } = createRenderer(options.ogDir);
  let assets: Map<string, Buffer> | undefined;
  const posters = new Map<string, Buffer>();
  const posterName = (lang: string) => `poster/${lang}.pdf`;
  const poster = (lang: string) => {
    const name = posterName(lang);
    if (!posters.has(name)) posters.set(name, renderPoster(options.locales[lang], lang));
    return posters.get(name)!;
  };

  const render = () => {
    const icon = readFileSync(options.iconPath, "utf8");
    const files = new Map<string, Buffer>([
      ["favicon-32.png", renderIcon(icon, 32)],
      ["apple-touch-icon.png", renderIcon(icon, 180, { padded: true })],
      ["icon-192.png", renderIcon(icon, 192, { padded: true })],
      ["icon-512.png", renderIcon(icon, 512, { padded: true })],
    ]);
    for (const [lang, locale] of Object.entries(options.locales)) {
      files.set(`og-${lang}.png`, renderOgImage(locale.og, lang));
    }
    return files;
  };

  return {
    name: "mybackhurts-social-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0]?.replace(/^\//, "");
        const lang = name?.match(/^poster\/([\w-]+)\.pdf$/)?.[1];
        if (lang && options.locales[lang]) {
          res.setHeader("Content-Type", "application/pdf");
          res.end(poster(lang));
          return;
        }
        if (!name?.endsWith(".png")) return next();
        assets ??= render();
        const file = assets.get(name);
        if (!file) return next();
        res.setHeader("Content-Type", "image/png");
        res.end(file);
      });
    },
    generateBundle() {
      for (const [fileName, source] of render()) {
        this.emitFile({ type: "asset", fileName, source });
      }
      for (const lang of Object.keys(options.locales)) {
        this.emitFile({ type: "asset", fileName: posterName(lang), source: poster(lang) });
      }
    },
  };
}
