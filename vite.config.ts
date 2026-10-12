import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig } from "vite-plus";
import { assertLandingMatchesApp } from "./app-sync";
import { socialAssetsPlugin } from "./og/render";
import {
  defaultLanguageCode,
  languages,
  type Language,
  type LanguageCode,
} from "./src/i18n/languages";

const root = __dirname;
const defaultLanguage: Language = languages.find(({ code }) => code === defaultLanguageCode)!;
const locales = Object.fromEntries(
  languages.map(({ code }) => [
    code,
    JSON.parse(readFileSync(resolve(root, `src/i18n/${code}.json`), "utf8")),
  ]),
) as Record<LanguageCode, any>;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function flattenKeys(value: JsonValue, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function readPath(source: JsonValue, key: string): JsonValue | undefined {
  return key.split(".").reduce<JsonValue | undefined>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[part];
  }, source);
}

function assertSameLocaleKeys() {
  const baseKeys = new Set(flattenKeys(locales[defaultLanguage.code]));
  const problems = languages
    .filter((language) => language !== defaultLanguage)
    .flatMap(({ code }) => {
      const keys = new Set(flattenKeys(locales[code]));
      const missing = [...baseKeys].filter((key) => !keys.has(key));
      const extra = [...keys].filter((key) => !baseKeys.has(key));
      return [
        missing.length ? `Missing in ${code}.json: ${missing.join(", ")}` : "",
        extra.length ? `Missing in ${defaultLanguage.code}.json: ${extra.join(", ")}` : "",
      ].filter(Boolean);
    });
  if (problems.length) {
    throw new Error(["Locale files must share the same keys.", ...problems].join("\n"));
  }
}

function languageForPath(pathname: string): Language {
  return (
    languages.find(
      ({ path }) => path !== "/" && (pathname === path || pathname.endsWith(`${path}index.html`)),
    ) ?? defaultLanguage
  );
}

const siteUrl = "https://mybackhurts.app";
/** The Mac App Store listing. */
const appStoreUrl = "https://apps.apple.com/app/id6817265333";
/** The Microsoft Store listing (Partner Center product 9NT3SV8SQ3KD). */
const microsoftStoreUrl = "https://apps.microsoft.com/detail/9NT3SV8SQ3KD";

/** The privacy policy and terms, hand-translated at `<language path><page>/index.html`. */
const legalPages = ["privacy", "terms"] as const;
type LegalPage = (typeof legalPages)[number];

function legalPath(language: Language, page: LegalPage) {
  return `${language.path}${page}/`;
}

/** The legal page a built HTML file is (`/de/privacy/index.html` → German privacy), if any. */
function legalPageForPath(pathname: string) {
  for (const language of languages) {
    for (const page of legalPages) {
      const path = legalPath(language, page);
      if (pathname === path || pathname === `${path}index.html`) return { language, page };
    }
  }
  return undefined;
}

/** hreflang → absolute URL of one page in every language, plus x-default. */
function alternates(pathFor: (language: Language) => string): [string, string][] {
  return [
    ...languages.map((language): [string, string] => [
      language.code,
      `${siteUrl}${pathFor(language)}`,
    ]),
    ["x-default", `${siteUrl}${pathFor(defaultLanguage)}`],
  ];
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const globeIcon =
  '<svg class="globe" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>';

function renderLanguageSwitcher(current: Language, label: string) {
  const items = languages
    .map(
      (language) =>
        `<li><a href="${language.path}" lang="${language.code}" hreflang="${language.code}" data-lang="${language.code}"${
          language.code === current.code ? ' aria-current="page"' : ""
        }><span>${language.nativeName}</span><span class="language-code">${language.label}</span></a></li>`,
    )
    .join("");
  return `<details class="language-switcher"><summary aria-label="${escapeAttr(
    `${label}: ${current.nativeName}`,
  )}" title="${escapeAttr(label)}">${globeIcon}<span>${
    current.label
  }</span><svg class="caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></summary><ul class="language-menu">${items}</ul></details>`;
}

/** On the default page only: sends a first-time visitor to their browser's preferred language, once. */
function renderLangRedirectScript(language: Language) {
  if (language !== defaultLanguage) return "";
  const others = languages.filter((candidate) => candidate !== defaultLanguage);
  const paths = Object.fromEntries(
    others.flatMap((language) =>
      [language.code, ...("aliases" in language ? language.aliases : [])].map((tag) => [
        tag.toLowerCase(),
        language.path,
      ]),
    ),
  );
  const skip = others.flatMap((language) => ("notFor" in language ? language.notFor : []));
  return `<script>try { if (!localStorage.getItem("lang")) { const paths = ${JSON.stringify(
    paths,
  )}; const skip = ${JSON.stringify(
    skip,
  )}; const wanted = (navigator.languages?.[0] || navigator.language || "").toLowerCase(); const base = wanted.split("-")[0]; const path = skip.some((tag) => wanted.startsWith(tag)) ? undefined : paths[wanted] || paths[base] || Object.entries(paths).find(([code]) => code.split("-")[0] === base)?.[1]; if (path) location.replace(path + location.hash); } } catch {}</script>`;
}

function generatedPlaceholder(key: string, language: Language): string | undefined {
  const locale = locales[language.code];
  switch (key) {
    case "langRedirectScript":
      return renderLangRedirectScript(language);
    case "appStoreUrl":
      return appStoreUrl;
    case "microsoftStoreUrl":
      return microsoftStoreUrl;
    case "posterUrl":
      return `/poster/${language.code}.pdf`;
    // Made by macos/scripts/app-preview-web.sh; Vite hashes them into /assets.
    case "previewVideo":
      return `/src/preview/${language.code}.mp4`;
    case "previewPoster":
      return `/src/preview/${language.code}.jpg`;
    case "legalPrivacyUrl":
      return legalPath(language, "privacy");
    case "legalTermsUrl":
      return legalPath(language, "terms");
    case "runtimeJson":
      return JSON.stringify(locale.runtime).replace(/</g, "\\u003c");
    case "notFoundJson":
      return JSON.stringify(
        Object.fromEntries(
          languages.map(({ code, path }) => [code, { ...locales[code].notFound, path }]),
        ),
      ).replace(/</g, "\\u003c");
    case "jsonLd":
      return `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "mybackhurts",
        description: locale.meta.description,
        applicationCategory: "HealthApplication",
        operatingSystem: "macOS, Windows",
        inLanguage: language.code,
        url: `${siteUrl}${language.path}`,
        image: `${siteUrl}/og-${language.code}.png`,
        installUrl: appStoreUrl,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@type": "Person", name: "Vlad Mihalachi", url: "https://vmihalachi.com" },
      }).replace(/</g, "\\u003c")}</script>`;
    case "languageSwitcher":
      return renderLanguageSwitcher(language, String(locale.nav.languageLabel));
    case "hreflangLinks":
      return alternates(({ path }) => path)
        .map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
        .join("\n    ");
    case "ogLocale":
      return language.ogLocale;
    case "ogLocaleAlternates":
      return languages
        .filter(({ code }) => code !== language.code)
        .map(({ ogLocale }) => `<meta property="og:locale:alternate" content="${ogLocale}" />`)
        .join("\n    ");
    default:
      return undefined;
  }
}

function renderTemplate(html: string, language: Language) {
  const localeKey = language.code;
  const locale = locales[localeKey];
  const rendered = html.replace(/{{\s*([\w.]+)\s*}}/g, (placeholder, key: string) => {
    const generated = generatedPlaceholder(key, language);
    if (generated !== undefined) return generated;

    const value = readPath(locale, key);
    if (value === undefined) {
      throw new Error(`Missing i18n key "${key}" for locale "${localeKey}"`);
    }
    if (typeof value === "object") {
      throw new Error(`i18n key "${key}" for locale "${localeKey}" must be a scalar`);
    }
    return String(value);
  });

  const unresolved = rendered.match(/{{[^}]+}}/g);
  if (unresolved) {
    throw new Error(`Unresolved i18n placeholders for ${localeKey}: ${unresolved.join(", ")}`);
  }

  return rendered;
}

function renderSitemap() {
  const pages: ((language: Language) => string)[] = [
    ({ path }) => path,
    ...legalPages.map((page) => (language: Language) => legalPath(language, page)),
  ];
  const urls = pages
    .flatMap((pathFor) => {
      const links = alternates(pathFor)
        .map(
          ([hreflang, href]) =>
            `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
        )
        .join("");
      return languages.map(
        (language) => `<url><loc>${siteUrl}${pathFor(language)}</loc>${links}</url>`,
      );
    })
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urls}
</urlset>
`;
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

/** CSP hashes for every inline script that runs (JSON and JSON-LD data blocks don't need one). */
function inlineScriptHashes(outDir: string) {
  const hashes = new Set<string>();
  for (const file of htmlFiles(outDir)) {
    const html = readFileSync(file, "utf8");
    for (const [, tag, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=/.test(tag) || /type="application\/(ld\+)?json"/.test(tag)) continue;
      hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
    }
  }
  return [...hashes].sort();
}

/**
 * Writes the Cloudflare `_headers` file after the build, so the CSP can hash the final inline
 * scripts. `connect-src 'none'` backs up the page's own claim: it makes no network requests.
 * Trailing slashes and the 404 page are set in `wrangler.json` (`html_handling`, `not_found_handling`).
 */
function hostingConfigPlugin() {
  let outDir = "dist";
  return {
    name: "mybackhurts-hosting-config",
    apply: "build" as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      const csp = [
        "default-src 'none'",
        `script-src 'self' ${inlineScriptHashes(outDir).join(" ")}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "media-src 'self'",
        "font-src 'self'",
        "manifest-src 'self'",
        "connect-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join("; ");
      // Cloudflare merges every matching rule and joins repeated headers with commas, so a path
      // rule first detaches (`! Name`) the global header it replaces.
      const rules: [path: string, headers: string[]][] = [
        [
          "/*",
          [
            `Content-Security-Policy: ${csp}`,
            // Azure sent this by default; Cloudflare doesn't.
            "Strict-Transport-Security: max-age=10886400; includeSubDomains; preload",
            "X-Content-Type-Options: nosniff",
            "Referrer-Policy: no-referrer",
            "Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()",
            // Deploys replace every hashed asset, so HTML must always be revalidated.
            "Cache-Control: no-cache",
          ],
        ],
        ["/assets/*", ["! Cache-Control", "Cache-Control: public, max-age=31536000, immutable"]],
        // Browsers' built-in PDF viewers are blocked by the page CSP, so the posters get their own.
        [
          "/poster/*",
          ["! Content-Security-Policy", "Content-Security-Policy: frame-ancestors 'none'"],
        ],
      ];
      writeFileSync(
        join(outDir, "_headers"),
        rules
          .map(([path, headers]) => [path, ...headers.map((h) => `  ${h}`)].join("\n"))
          .join("\n\n") + "\n",
      );
    },
  };
}

function localizedHtmlPlugin() {
  assertSameLocaleKeys();
  assertLandingMatchesApp({ landingRoot: root, locales, sourceLanguage: defaultLanguage.code });
  const templatePath = resolve(root, "index.html");

  return {
    name: "mybackhurts-localized-html",
    transformIndexHtml: {
      order: "pre" as const,
      handler(html: string, ctx: { path: string }) {
        // Legal pages are hand-written per language; give them the canonical and hreflang links
        // the home page template has, so search engines treat them as translations, not duplicates.
        const legal = legalPageForPath(ctx.path);
        if (legal) {
          const links: Record<string, string>[] = [
            { rel: "canonical", href: `${siteUrl}${legalPath(legal.language, legal.page)}` },
            ...alternates((language) => legalPath(language, legal.page)).map(
              ([hreflang, href]) => ({ rel: "alternate", hreflang, href }),
            ),
          ];
          return {
            html,
            tags: links.map((attrs) => ({ tag: "link", attrs, injectTo: "head" as const })),
          };
        }

        const language = languageForPath(ctx.path);
        const template = language === defaultLanguage ? html : readFileSync(templatePath, "utf8");
        return renderTemplate(template, language);
      },
    },
    generateBundle(this: { emitFile: (file: object) => void }) {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: renderSitemap() });
    },
  };
}

export default defineConfig({
  plugins: [
    localizedHtmlPlugin(),
    hostingConfigPlugin(),
    socialAssetsPlugin({
      ogDir: resolve(root, "og"),
      iconPath: resolve(root, "public/favicon.svg"),
      locales,
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        ...Object.fromEntries(
          languages.map(({ code, path }) => [
            code === defaultLanguage.code ? "main" : code,
            resolve(root, `.${path}index.html`),
          ]),
        ),
        privacy: resolve(root, "privacy/index.html"),
        terms: resolve(root, "terms/index.html"),
        ...Object.fromEntries(
          languages
            .filter(({ code }) => code !== defaultLanguage.code)
            .flatMap(({ code, path }) => [
              [`${code}-privacy`, resolve(root, `.${path}privacy/index.html`)],
              [`${code}-terms`, resolve(root, `.${path}terms/index.html`)],
            ]),
        ),
        notFound: resolve(root, "404.html"),
      },
    },
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
