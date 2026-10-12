/**
 * Every language the landing page is published in, sorted alphabetically by native name, Latin scripts
 * first (keep it that way: this order drives the language dropdown). `defaultLanguageCode` is served at
 * `/` and used as x-default. To add a language: add an entry here, create `src/i18n/<code>.json` with the
 * same keys as `en.json`, and add `<path>/index.html` (a stub), `<path>/privacy/index.html` and
 * `<path>/terms/index.html`. On a first visit, browsers whose preferred language matches `code` (or its
 * base language, so `pt-PT` gets `pt-BR`) or one of `aliases` are sent to `path`, unless it starts with
 * one of `notFor`.
 */
export const languages = [
  { code: "cs", path: "/cs/", label: "CS", nativeName: "Čeština", ogLocale: "cs_CZ" },
  { code: "da", path: "/da/", label: "DA", nativeName: "Dansk", ogLocale: "da_DK" },
  { code: "de", path: "/de/", label: "DE", nativeName: "Deutsch", ogLocale: "de_DE" },
  { code: "en", path: "/", label: "EN", nativeName: "English", ogLocale: "en_US" },
  { code: "es", path: "/es/", label: "ES", nativeName: "Español", ogLocale: "es_ES" },
  { code: "fr", path: "/fr/", label: "FR", nativeName: "Français", ogLocale: "fr_FR" },
  { code: "it", path: "/it/", label: "IT", nativeName: "Italiano", ogLocale: "it_IT" },
  { code: "nl", path: "/nl/", label: "NL", nativeName: "Nederlands", ogLocale: "nl_NL" },
  {
    code: "nb",
    path: "/nb/",
    label: "NO",
    nativeName: "Norsk bokmål",
    ogLocale: "nb_NO",
    aliases: ["no", "nn"],
  },
  { code: "pl", path: "/pl/", label: "PL", nativeName: "Polski", ogLocale: "pl_PL" },
  {
    code: "pt-BR",
    path: "/pt-br/",
    label: "PT",
    nativeName: "Português (Brasil)",
    ogLocale: "pt_BR",
  },
  { code: "ro", path: "/ro/", label: "RO", nativeName: "Română", ogLocale: "ro_RO" },
  { code: "sv", path: "/sv/", label: "SV", nativeName: "Svenska", ogLocale: "sv_SE" },
  { code: "tr", path: "/tr/", label: "TR", nativeName: "Türkçe", ogLocale: "tr_TR" },
  { code: "ja", path: "/ja/", label: "JA", nativeName: "日本語", ogLocale: "ja_JP" },
  { code: "ko", path: "/ko/", label: "KO", nativeName: "한국어", ogLocale: "ko_KR" },
  {
    code: "zh-Hans",
    path: "/zh-hans/",
    label: "ZH",
    nativeName: "简体中文",
    ogLocale: "zh_CN",
    // Traditional Chinese readers stay on English rather than landing on Simplified.
    notFor: ["zh-hant", "zh-tw", "zh-hk", "zh-mo"],
  },
] as const;

export type Language = (typeof languages)[number];
export type LanguageCode = Language["code"];

export const defaultLanguageCode: LanguageCode = "en";
