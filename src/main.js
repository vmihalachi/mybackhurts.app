const runtimeI18n = JSON.parse(document.querySelector("#i18n")?.textContent ?? "{}");

document.documentElement.classList.add("js");
document.querySelector("#year").textContent = String(new Date().getFullYear());

// Theme: cycles system → light → dark. "System" means no saved choice.
const themes = ["system", "light", "dark"];
const themeToggle = document.querySelector(".theme-toggle");
const themeColors = { light: "#f3ede1", dark: "#20263f" };
const themeNames = runtimeI18n.themeNames ?? { system: "system", light: "light", dark: "dark" };
const themeAriaTemplate = runtimeI18n.themeAriaTemplate ?? "Theme: {current}. Switch to {next}";
const themeTitleTemplate = runtimeI18n.themeTitleTemplate ?? "Theme: {current}";

function formatThemeLabel(template, current, next) {
  return template
    .replace("{current}", themeNames[current] ?? current)
    .replace("{next}", themeNames[next] ?? next);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const scheme = meta.media.includes("dark") ? "dark" : "light";
    meta.content = themeColors[theme === "system" ? scheme : theme];
  });

  const next = themes[(themes.indexOf(theme) + 1) % themes.length];
  themeToggle.setAttribute("aria-label", formatThemeLabel(themeAriaTemplate, theme, next));
  themeToggle.title = formatThemeLabel(themeTitleTemplate, theme, next);
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme ?? "system";
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  try {
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
  } catch {}
  applyTheme(next);
});
applyTheme(document.documentElement.dataset.theme ?? "system");

// The receipt's Supporter line previews the app's teal Supporter theme. It lasts for the visit, nothing is stored.
const receiptTheme = document.querySelector(".receipt-theme");
document.querySelector(".receipt")?.addEventListener("click", () => {
  const on = document.documentElement.dataset.accent !== "teal";
  if (on) document.documentElement.dataset.accent = "teal";
  else delete document.documentElement.dataset.accent;
  receiptTheme?.setAttribute("aria-pressed", String(on));
});

const languageSwitcher = document.querySelector(".language-switcher");
document.addEventListener("click", (event) => {
  if (languageSwitcher?.open && !languageSwitcher.contains(event.target)) {
    languageSwitcher.open = false;
  }
});
languageSwitcher?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !languageSwitcher.open) return;
  languageSwitcher.open = false;
  languageSwitcher.querySelector("summary").focus();
});

document.querySelectorAll("[data-lang]").forEach((link) => {
  link.addEventListener("click", () => {
    try {
      localStorage.setItem("lang", link.dataset.lang);
    } catch {}
  });
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Hero headline: in some languages one word is wider than the column at full size. Shrink the
// font just enough for it to fit; the CSS clamp stays the ceiling.
const heroTitle = document.querySelector("#hero-title");
let heroTitleWidth = 0;
function fitHeroTitle() {
  heroTitle.style.fontSize = "";
  const overflow = heroTitle.scrollWidth / heroTitle.clientWidth;
  if (overflow > 1) {
    const size = parseFloat(getComputedStyle(heroTitle).fontSize) / overflow;
    heroTitle.style.fontSize = `${Math.floor(size * 10) / 10}px`;
  }
}
if (heroTitle) {
  void document.fonts.ready.then(fitHeroTitle);
  document.fonts.addEventListener("loadingdone", fitHeroTitle);
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === heroTitleWidth) return;
    heroTitleWidth = entry.contentRect.width;
    fitHeroTitle();
  }).observe(heroTitle.parentElement);
}

// Rep and hold counters, driven by each card's own CSS animation clock.
const counters = [...document.querySelectorAll(".move")]
  .map((card) => ({
    clock: card.querySelector("[data-clock]"),
    counter: card.querySelector(".counter"),
  }))
  .filter(({ clock, counter }) => clock && counter);

function render({ clock, counter }) {
  const goal = Number(counter.dataset.goal);
  const value = counter.querySelector("b");
  const side = counter.querySelector("span");

  if (reducedMotion.matches) {
    value.textContent = String(goal);
    counter.classList.add("done");
    return;
  }

  const animation = clock.getAnimations()[0];
  const time = Number(animation?.currentTime ?? 0);
  const duration = Number(animation?.effect?.getTiming().duration ?? 0);
  if (!duration) return;

  if (counter.dataset.kind === "hold") {
    // data-holds lists where each hold starts, as a fraction of the cycle (neck: "0.02 0.51").
    const phase = (time % duration) / duration;
    const starts = (counter.dataset.holds ?? "0").split(/\s+/).map(Number);
    const index = Math.max(
      0,
      starts.findLastIndex((start) => start <= phase),
    );
    const held = Math.max(
      0,
      Math.min(goal, Math.floor((phase - starts[index]) * (duration / 1000))),
    );
    value.textContent = String(held);
    if (side) {
      side.textContent =
        index % 2 === 0
          ? (runtimeI18n.holdSides?.left ?? "left")
          : (runtimeI18n.holdSides?.right ?? "right");
    }
    counter.classList.toggle("done", held >= goal);
    return;
  }

  if (counter.dataset.kind === "timer") {
    // Timer-only moves count seconds, then rest a moment before starting over.
    const seconds = Math.floor(time / 1000) % (goal + 3);
    value.textContent = String(Math.min(seconds, goal));
    counter.classList.toggle("done", seconds >= goal);
    return;
  }

  // data-step: reps per animation cycle (the march lifts both knees in one).
  const step = Number(counter.dataset.step ?? 1);
  const reps = (Math.floor(time / duration) * step) % (goal + 2 * step);
  value.textContent = String(Math.min(reps, goal));
  counter.classList.toggle("done", reps >= goal);
}

// Only tick while the moves are on screen and the tab is visible.
let movesOnScreen = false;
let ticker;
function updateTicker() {
  const shouldRun = movesOnScreen && !document.hidden;
  if (shouldRun && !ticker) {
    counters.forEach(render);
    ticker = setInterval(() => counters.forEach(render), 200);
  } else if (!shouldRun && ticker) {
    clearInterval(ticker);
    ticker = undefined;
  }
}
const moveGrid = document.querySelector(".move-grid");
if (moveGrid) {
  new IntersectionObserver(([entry]) => {
    movesOnScreen = entry.isIntersecting;
    updateTicker();
  }).observe(moveGrid);
}
document.addEventListener("visibilitychange", updateTicker);
counters.forEach(render);

// Animate only the figures on screen.
const figureObserver = new IntersectionObserver((entries) =>
  entries.forEach((entry) => entry.target.classList.toggle("in-view", entry.isIntersecting)),
);
document.querySelectorAll(".move").forEach((card) => figureObserver.observe(card));

// Standing / Seated: swaps the moves that have a seated version.
const postureToggle = document.querySelector(".posture-toggle");
if (postureToggle && moveGrid) {
  const chips = [...postureToggle.querySelectorAll(".chip")];
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      moveGrid.dataset.posture = chip.dataset.posture;
      chips.forEach((other) => other.setAttribute("aria-pressed", String(other === chip)));
    }),
  );
  postureToggle.hidden = false;
}

// Wide screens start with six moves; "Show all moves" brings back the rest and the Supporter pack.
const movesMore = document.querySelector(".moves-more");
if (movesMore && moveGrid) {
  moveGrid.classList.add("is-collapsed");
  movesMore.hidden = false;
  movesMore.addEventListener("click", () => {
    moveGrid.classList.remove("is-collapsed");
    movesMore.setAttribute("aria-expanded", "true");
    movesMore.hidden = true;
    // The button goes away, so hand focus to the first card it revealed.
    const first = [...moveGrid.querySelectorAll(".move-more")].find((card) => card.offsetParent);
    if (first) {
      first.tabIndex = -1;
      first.focus();
    }
  });
}

// Store buttons: the visitor's own platform leads, the other one steps back to an outline.
const platform = navigator.userAgentData?.platform ?? navigator.platform ?? "";
const ownStore = /^win/i.test(platform)
  ? "windows"
  : /^(mac|iphone|ipad|ipod)/i.test(platform)
    ? "apple"
    : null;
if (ownStore) {
  document.querySelectorAll(".store-buttons").forEach((group) => {
    const own = group.querySelector(`[data-store="${ownStore}"]`);
    if (!own) return;
    group.prepend(own);
    group
      .querySelectorAll(`[data-store]:not([data-store="${ownStore}"])`)
      .forEach((other) => other.classList.add("is-alt"));
  });
  // The iPhone note's arrow points at the first button, which on Windows is no longer the App Store.
  if (ownStore === "windows") document.querySelector(".platform-note")?.remove();
}

// Start quietly. Sound needs a visitor's click; playback stops offscreen or in a hidden tab.
// With Reduce Motion, wait for the play button. A visitor's own pause sticks.
const previewVideo = document.querySelector(".preview-frame video");
const previewToggle = document.querySelector(".preview-toggle");
const previewSound = document.querySelector(".preview-sound");
const previewControls = document.querySelector(".preview-controls");
if (previewVideo && previewToggle && previewSound && previewControls) {
  let pausedByVisitor = reducedMotion.matches;
  let previewOnScreen = false;
  previewVideo.muted = true;
  // The poster is a frame from mid-film: begin there so the first frame doesn't cut away from it. The loop then starts at 0.
  previewVideo.addEventListener(
    "loadedmetadata",
    () => {
      previewVideo.currentTime = Number(previewVideo.dataset.posterTime) || 0;
    },
    { once: true },
  );

  const syncToggle = () => {
    const playing = !previewVideo.paused;
    previewToggle.classList.toggle("playing", playing);
    previewToggle.setAttribute(
      "aria-label",
      playing ? previewToggle.dataset.pause : previewToggle.dataset.play,
    );
  };
  const syncSound = () => {
    previewSound.setAttribute("aria-pressed", String(!previewVideo.muted));
  };
  const updatePreview = () => {
    if (previewOnScreen && !document.hidden && !pausedByVisitor) {
      previewVideo.play().catch(() => {});
    } else {
      previewVideo.pause();
    }
  };

  previewToggle.addEventListener("click", () => {
    pausedByVisitor = !previewVideo.paused;
    if (pausedByVisitor) previewVideo.pause();
    else previewVideo.play().catch(() => {});
  });
  previewSound.addEventListener("click", () => {
    previewVideo.muted = !previewVideo.muted;
    syncSound();
  });
  previewVideo.addEventListener("play", syncToggle);
  previewVideo.addEventListener("pause", syncToggle);
  previewVideo.addEventListener("volumechange", syncSound);
  new IntersectionObserver(
    ([entry]) => {
      previewOnScreen = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      updatePreview();
    },
    { threshold: 0.35 },
  ).observe(previewVideo);
  document.addEventListener("visibilitychange", updatePreview);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      pausedByVisitor = true;
      updatePreview();
    }
  });
  previewControls.hidden = false;
  syncToggle();
  syncSound();
}

// Reveal sections as they scroll in.
const revealables = document.querySelectorAll(
  ".section-head, .preview-frame, .strip, .move, .coupon, .mode-grid, .chart, .stats-copy, .faq-list, .receipt-wrap",
);
revealables.forEach((element) => element.classList.add("reveal"));

const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }),
  { threshold: 0.12 },
);
revealables.forEach((element) => observer.observe(element));
