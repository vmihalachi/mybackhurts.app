import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Fails the landing build when the page's facts drift from the Mac app: exercise names (in every
 * language), rep and hold targets, the Supporter pack, and the default reminder interval. The app is
 * the truth: `conformance/catalog.json` (generated from `ExerciseCatalog`), `conformance/settings.json`
 * (generated from `AppSettings`) and `Localizable.xcstrings`.
 *
 * This repository is mounted at `landing/` in the (private) app repository. A build there reads the app's
 * files and rewrites `app-data/app.json` with what the check needs; a build on its own (CI here) checks
 * against that snapshot instead.
 */

type Locale = Record<string, any>;

/** Landing move cards (`moves.<key>` in the locale files) and the catalog exercise each one shows. */
const cards = {
  squat: "chair-squat",
  calf: "calf-raise",
  seatedCalf: "seated-calf-raise",
  march: "standing-march",
  seatedMarch: "seated-march",
  arms: "arm-circles",
  chest: "chest-opener",
  shrugs: "shoulder-shrugs",
  neck: "neck-stretch",
  wrist: "wrist-forearm-stretch",
  eye: "eye-break",
} as const;

type CatalogEntry = {
  id: string;
  name: string;
  goal: number;
  /** Timer-only moves (`cameraTracked: false`) with a rep goal show their duration in seconds. */
  timerSeconds?: number;
  cameraTracked: boolean;
  supporter: boolean;
};

type CatalogJSON = {
  exercises: {
    id: string;
    pack: string;
    cameraTracked: boolean;
    durationSeconds: number;
    goal: { type: "reps" | "holdPerSide"; reps?: number; seconds?: number };
    l10n: { name: string };
  }[];
};

/** `conformance/catalog.json`, generated from `ExerciseCatalog` by the Mac app's tests. */
function readCatalog(repoRoot: string): CatalogEntry[] {
  const file = JSON.parse(
    readFileSync(resolve(repoRoot, "conformance/catalog.json"), "utf8"),
  ) as CatalogJSON;
  return file.exercises.map((e) => {
    const goal = e.goal.type === "reps" ? e.goal.reps : e.goal.seconds;
    if (goal === undefined) throw new Error(`conformance/catalog.json: "${e.id}" has no goal.`);
    return {
      id: e.id,
      name: e.l10n.name,
      goal,
      timerSeconds: !e.cameraTracked && e.goal.type === "reps" ? e.durationSeconds : undefined,
      cameraTracked: e.cameraTracked,
      supporter: e.pack === "supporter",
    };
  });
}

/** What the check needs from the app, as `app-data/app.json` keeps it. */
type AppData = {
  catalog: CatalogEntry[];
  defaultIntervalMinutes: number;
  /** Each exercise's name in every language but English, as `Localizable.xcstrings` has it. */
  names: Record<string, Record<string, string>>;
};

/** The app's files when this build runs inside the app repository, else the committed snapshot. */
function readAppData(landingRoot: string): AppData {
  const snapshot = resolve(landingRoot, "app-data/app.json");
  const repoRoot = resolve(landingRoot, "..");
  if (!existsSync(resolve(repoRoot, "conformance/catalog.json"))) {
    if (!existsSync(snapshot)) {
      throw new Error(`No ${snapshot}: build once inside the app repository to write it.`);
    }
    return JSON.parse(readFileSync(snapshot, "utf8")) as AppData;
  }

  const catalog = readCatalog(repoRoot);
  const strings = JSON.parse(
    readFileSync(resolve(repoRoot, "apple/Shared/Resources/Localizable.xcstrings"), "utf8"),
  ).strings as Record<
    string,
    { localizations?: Record<string, { stringUnit?: { value?: string } }> }
  >;
  const settings = JSON.parse(
    readFileSync(resolve(repoRoot, "conformance/settings.json"), "utf8"),
  ) as { defaults: { intervalMinutes: number } };
  const names: AppData["names"] = {};
  for (const { name } of catalog) {
    for (const [lang, value] of Object.entries(strings[name]?.localizations ?? {})) {
      const text = value.stringUnit?.value;
      if (text && lang !== "en") (names[lang] ??= {})[name] = text;
    }
  }
  const sortedNames = Object.fromEntries(
    Object.keys(names)
      .sort()
      .map((lang) => [lang, names[lang]]),
  );
  const data: AppData = {
    catalog,
    defaultIntervalMinutes: settings.defaults.intervalMinutes,
    names: sortedNames,
  };
  const json = JSON.stringify(data, null, 2) + "\n";
  if (!existsSync(snapshot) || readFileSync(snapshot, "utf8") !== json) {
    writeFileSync(snapshot, json);
  }
  return data;
}

export function assertLandingMatchesApp(options: {
  landingRoot: string;
  locales: Record<string, Locale>;
  sourceLanguage: string;
}) {
  const { landingRoot, locales, sourceLanguage } = options;
  const { catalog, defaultIntervalMinutes: interval, names } = readAppData(landingRoot);
  const html = readFileSync(resolve(landingRoot, "index.html"), "utf8");
  if (!Number.isInteger(interval)) {
    throw new Error("conformance/settings.json has no defaults.intervalMinutes.");
  }

  const problems: string[] = [];
  const translated = (name: string, lang: string) =>
    lang === sourceLanguage ? name : names[lang]?.[name];
  const byId = new Map(catalog.map((entry) => [entry.id, entry]));

  const shown = new Set<string>(Object.values(cards));
  for (const entry of catalog.filter(({ supporter }) => !supporter)) {
    if (!shown.has(entry.id)) {
      problems.push(
        `The free exercise "${entry.id}" has no card on the landing page (see \`cards\` in app-sync.ts).`,
      );
    }
  }

  const pack = catalog.filter(({ supporter }) => supporter);

  for (const [key, id] of Object.entries(cards)) {
    const entry = byId.get(id);
    if (!entry) {
      problems.push(`moves.${key} shows "${id}", which is no longer in conformance/catalog.json.`);
      continue;
    }
    const card = html.match(
      new RegExp(`<article[^>]*>(?:(?!</article>)[\\s\\S])*?move-${key}-title[\\s\\S]*?</article>`),
    )?.[0];
    const goal = card?.match(/data-goal="(\d+)"/)?.[1];
    const expected = entry.timerSeconds ?? entry.goal;
    if (Number(goal) !== expected) {
      problems.push(
        `index.html: the ${key} card's data-goal is ${goal}, the app's goal is ${expected}${entry.timerSeconds ? " s" : ""}.`,
      );
    }
    if (card && card.includes('class="cam"') !== entry.cameraTracked) {
      problems.push(
        `index.html: the ${key} card ${entry.cameraTracked ? "needs" : "shouldn't have"} the camera glyph.`,
      );
    }
  }

  for (const [lang, locale] of Object.entries(locales)) {
    const expectName = (where: string, actual: string, entry: CatalogEntry) => {
      const expected = translated(entry.name, lang);
      if (!expected)
        problems.push(`Localizable.xcstrings has no ${lang} name for "${entry.name}".`);
      else if (actual !== expected) {
        problems.push(`${lang}.json ${where} is "${actual}", the app calls it "${expected}".`);
      }
    };
    for (const [key, id] of Object.entries(cards)) {
      const entry = byId.get(id);
      if (entry) expectName(`moves.${key}.name`, locale.moves[key].name, entry);
    }
    pack.forEach((entry, index) => {
      const actual = locale.moves.pack[`move${index + 1}`];
      if (actual === undefined)
        problems.push(`${lang}.json has no moves.pack.move${index + 1} for "${entry.id}".`);
      else expectName(`moves.pack.move${index + 1}`, actual, entry);
    });
    if (locale.moves.pack[`move${pack.length + 1}`] !== undefined) {
      problems.push(`${lang}.json lists more Supporter moves than the app has (${pack.length}).`);
    }
    if (!String(locale.moves.pack.title).includes(`+${pack.length}`)) {
      problems.push(`${lang}.json moves.pack.title should say +${pack.length}.`);
    }
    if (!String(locale.how.panel1Title).includes(String(interval))) {
      problems.push(
        `${lang}.json how.panel1Title doesn't mention the default interval (${interval} min).`,
      );
    }
  }

  if (problems.length) {
    throw new Error(
      ["The landing page is out of sync with the Mac app:", ...problems.map((p) => `- ${p}`)].join(
        "\n",
      ),
    );
  }
}
