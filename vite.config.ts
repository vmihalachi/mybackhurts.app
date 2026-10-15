import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { companionLanding, scriptJson } from "@deskling/landing";
import { defineConfig } from "vite-plus";
import { assertLandingMatchesApp } from "./app-sync";
import { socialAssetsPlugin } from "./og/render";
import { defaultLanguageCode, languages, type LanguageCode } from "./src/i18n/languages";

const root = __dirname;
const locales = Object.fromEntries(
  languages.map(({ code }) => [
    code,
    JSON.parse(readFileSync(resolve(root, `src/i18n/${code}.json`), "utf8")),
  ]),
) as Record<LanguageCode, any>;

const siteUrl = "https://mybackhurts.app";
/** The Mac App Store listing. */
const appStoreUrl = "https://apps.apple.com/app/id6817265333";
/** The Microsoft Store listing (Partner Center product 9NT3SV8SQ3KD). */
const microsoftStoreUrl = "https://apps.microsoft.com/detail/9NT3SV8SQ3KD";

/**
 * The page's plumbing (every language's home page from `index.html`, the legal pages' links, the sitemap, the
 * `_headers` with its CSP) is Deskling's (`@deskling/landing`); what's here is mybackhurts' data: its languages and
 * URLs, the store buttons' links, the preview video and poster, and its own social cards (`og/render.ts`, which
 * also renders the printable posters).
 */
const landing = companionLanding({
  root,
  siteUrl,
  appStoreUrl,
  languages,
  defaultLanguageCode,
  locales,
  placeholders: (key, language) => {
    switch (key) {
      case "appStoreUrl":
        return appStoreUrl;
      case "microsoftStoreUrl":
        return microsoftStoreUrl;
      case "posterUrl":
        return `/poster/${language.code}.pdf`;
      // Made by apple/scripts/app-preview-web.sh; Vite hashes them into /assets.
      case "previewVideo":
        return `/src/preview/${language.code}.mp4`;
      case "previewPoster":
        return `/src/preview/${language.code}.jpg`;
      case "runtimeJson":
        return scriptJson(locales[language.code as LanguageCode].runtime);
      case "notFoundJson":
        return scriptJson(
          Object.fromEntries(
            languages.map(({ code, path }) => [code, { ...locales[code].notFound, path }]),
          ),
        );
      default:
        return undefined;
    }
  },
  jsonLd: (language, locale) => ({
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
  }),
  // The preview videos, same origin.
  csp: { mediaSrc: "'self'" },
  // Browsers' built-in PDF viewers are blocked by the page CSP, so the posters get their own.
  headers: [
    ["/poster/*", ["! Content-Security-Policy", "Content-Security-Policy: frame-ancestors 'none'"]],
  ],
  extraPlugins: [
    socialAssetsPlugin({
      ogDir: resolve(root, "og"),
      iconPath: resolve(root, "public/favicon.svg"),
      locales,
    }),
  ],
});

// After companionLanding's own check that every locale has the default's keys.
assertLandingMatchesApp({ landingRoot: root, locales, sourceLanguage: defaultLanguageCode });

export default defineConfig({
  ...landing,
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
