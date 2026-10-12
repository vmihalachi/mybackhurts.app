// The host serves this one page for every missing URL, so pick the visitor's language here.
const locales = JSON.parse(document.querySelector("#not-found-i18n")?.textContent ?? "{}");

function pickLanguage() {
  const codes = Object.keys(locales);
  const find = (wanted) => {
    const lower = wanted.toLowerCase();
    const base = lower.split("-")[0];
    return (
      codes.find((code) => code.toLowerCase() === lower) ??
      codes.find((code) => code.toLowerCase().split("-")[0] === base)
    );
  };
  const path = location.pathname.toLowerCase();
  const fromPath = codes.find(
    (code) => locales[code].path !== "/" && path.startsWith(locales[code].path),
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

const code = pickLanguage();
const locale = locales[code];
if (locale) {
  document.documentElement.lang = code;
  document.title = locale.metaTitle;
  document.querySelector('[data-not-found="title"]').innerHTML = locale.title;
  document.querySelector('[data-not-found="body"]').textContent = locale.body;
  const home = document.querySelector('[data-not-found="home"]');
  home.textContent = locale.home;
  home.href = locale.path;
  document.querySelector(".wordmark")?.setAttribute("href", locale.path);
}
