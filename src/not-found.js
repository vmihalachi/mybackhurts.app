import { languages } from "./i18n/languages";

// The host serves this one page for every missing URL, so pick the visitor's language here.
const locales = JSON.parse(document.querySelector("#not-found-i18n")?.textContent ?? "{}");

function pickLanguage() {
  const find = (wanted) => {
    const lower = wanted.toLowerCase();
    const base = lower.split("-")[0];
    return (
      languages.find(({ code }) => code.toLowerCase() === lower) ??
      languages.find(({ code }) => code.toLowerCase().split("-")[0] === base)
    );
  };
  const path = location.pathname.toLowerCase();
  const fromPath = languages.find(
    (language) => language.path !== "/" && path.startsWith(language.path),
  );
  let saved = null;
  try {
    saved = localStorage.getItem("lang");
  } catch {}
  return (
    fromPath ||
    (saved && find(saved)) ||
    [...(navigator.languages ?? [navigator.language])].map(find).find(Boolean)
  );
}

const language = pickLanguage();
const locale = language && locales[language.code];
if (locale) {
  document.documentElement.lang = language.code;
  document.title = locale.metaTitle;
  // The title's one tag is a line break: built as text and <br>, never parsed as HTML.
  document
    .querySelector('[data-not-found="title"]')
    .replaceChildren(
      ...locale.title
        .split(/<br\s*\/?>/)
        .flatMap((line, i) => (i ? [document.createElement("br"), line] : [line])),
    );
  document.querySelector('[data-not-found="body"]').textContent = locale.body;
  const home = document.querySelector('[data-not-found="home"]');
  home.textContent = locale.home;
  // The links come from the build's own list, not from text on the page.
  home.href = language.path;
  document.querySelector(".wordmark")?.setAttribute("href", language.path);
  // The footer's other apps: the build wrote them in English; each tagline is found by its app's link.
  const more = locale.moreFrom;
  if (more) {
    const label = document.querySelector(".more-from-label");
    if (label) label.textContent = more.label;
    for (const link of document.querySelectorAll(".more-from-apps a")) {
      const tagline = link.parentElement.querySelector(".more-from-tagline");
      const text = more.taglines[link.getAttribute("href")];
      if (tagline && text) tagline.textContent = text;
    }
    const builtOn = document.querySelector(".built-on a");
    if (builtOn) builtOn.textContent = more.builtOn;
  }
}
