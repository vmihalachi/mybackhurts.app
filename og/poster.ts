import { deflateSync } from "node:zlib";

/**
 * The printable desk cheat sheet: one A4 page per language with every free move, drawn in the zine
 * style on white paper (ink-friendly), plus a Monday–Friday tick row per move. It is rendered from SVG
 * to a 300 dpi image and wrapped in a minimal PDF, so the build needs no PDF library.
 */

type Copy = Record<string, any>;

const ink = "#26336b";
const inkSoft = "#5b6390";
const pink = "#ff4d9d";
const pinkText = "#c8105f";
const pinkSoft = "#ffc3dd";

// Page in 150 dpi units (A4 = 1240 × 1754), rendered at 2× for print.
const width = 1240;
const height = 1754;
const margin = 96;

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);

// Characters drawn a full em wide (CJK, Hangul, full-width forms); everything else is Courier Prime's 0.6em.
const wideChar =
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
// Kana and Han: a line may break before any of them. Hangul breaks at spaces, like Latin text.
const breakBefore = /[\u3041-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
// Closing punctuation never starts a line, so it stays with the character before it.
const noLineStart = /[、。，．！？：；」』）〕】〉》ー…・,.!?:;)]/;

/** Width of `text` at `fontSize`, in Courier Prime's advances with CJK at a full em. */
export function textWidth(text: string, fontSize: number, letterSpacing = 0) {
  let total = 0;
  for (const char of text) total += (wideChar.test(char) ? 1 : 0.6) * fontSize + letterSpacing;
  return total;
}

/** Splits a word into the pieces a line may break between: each kana or Han character, with any
 * closing punctuation after it. */
function breakablePieces(word: string) {
  const pieces: string[] = [];
  for (const char of word) {
    const last = pieces.length - 1;
    if (
      last >= 0 &&
      !noLineStart.test(char) &&
      !breakBefore.test(char) &&
      !breakBefore.test(pieces[last].at(-1)!)
    ) {
      pieces[last] += char;
    } else if (last >= 0 && noLineStart.test(char)) {
      pieces[last] += char;
    } else {
      pieces.push(char);
    }
  }
  return pieces;
}

/** Greedy wrap for monospaced text (Courier Prime advances 0.6em), breaking CJK between characters. */
function wrap(text: string, fontSize: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    breakablePieces(word).forEach((piece, index) => {
      const joined = line ? `${line}${index === 0 ? " " : ""}${piece}` : piece;
      if (line && textWidth(joined, fontSize) > maxWidth) {
        lines.push(line);
        line = piece;
      } else {
        line = joined;
      }
    });
  }
  if (line) lines.push(line);
  return lines;
}

/** The largest monospaced font size (up to `size`) that fits `text` in `maxWidth`. */
function fitMono(text: string, size: number, maxWidth: number, letterSpacing = 0) {
  const fits = (candidate: number) => textWidth(text, candidate, letterSpacing) <= maxWidth;
  let candidate = size;
  while (candidate > 12 && !fits(candidate)) candidate -= 1;
  return candidate;
}

// Each move's most telling pose, in the landing figures' 140 × 170 space.
const poses: Record<string, string> = {
  squat: `
    <path d="M4 161 L136 160" />
    <path d="M22 128 L48 128 M22 128 L20 86 M23 128 L23 160 M46 128 L46 160" />
    <path d="M62 160 L80 160 M70 160 L84 130 L56 118" />
    <path d="M56 118 Q58 96 74 82" />
    <circle class="head" cx="82" cy="68" r="11" />
    <path d="M74 86 L108 94" />
    <path class="thin pink" d="M30 104 L30 116 M26 112 L30 117 L34 112" />`,
  calf: `
    <path d="M4 161 L136 160" />
    <circle class="head" cx="70" cy="24" r="11" />
    <path d="M70 36 L70 92 L70 146" />
    <path d="M70 44 L73 88" />
    <path d="M64 147 L78 158" />
    <path class="thin pink" d="M96 150 L96 118 M90 125 L96 117 L102 125 M44 150 L44 124 M38 131 L44 123 L50 131" />`,
  arms: `
    <path d="M4 161 L136 160" />
    <circle class="head" cx="70" cy="30" r="11" />
    <path d="M70 42 L70 100 M52 52 L88 52 M70 100 L58 158 M70 100 L82 158" />
    <path d="M52 52 L14 48 M88 52 L126 48" />
    <circle class="thin pink dashed" cx="14" cy="48" r="9" />
    <circle class="thin pink dashed" cx="126" cy="48" r="9" />`,
  shrugs: `
    <path d="M4 161 L136 160" />
    <circle class="head" cx="70" cy="30" r="11" />
    <path d="M70 42 L70 100 M70 100 L58 158 M70 100 L82 158" />
    <path d="M52 44 L88 44 M52 44 L46 90 M88 44 L94 90" />
    <path class="thin pink" d="M36 50 L36 30 M31 36 L36 29 L41 36 M104 50 L104 30 M99 36 L104 29 L109 36" />`,
  neck: `
    <path d="M4 161 L136 160" />
    <path d="M70 42 L70 100 M52 52 L88 52 M52 52 L46 96 M88 52 L94 96 M70 100 L58 158 M70 100 L82 158" />
    <circle class="head" cx="58" cy="33" r="11" />
    <path class="thin pink" d="M88 18 Q98 32 90 44 M84 40 L90 45 L95 38" />`,
  march: `
    <path d="M4 161 L136 160" />
    <path d="M66 54 L86 89" />
    <path d="M66 100 L66 158 L76 158" />
    <path d="M66 42 L66 100" />
    <circle class="head" cx="66" cy="30" r="11" />
    <path d="M66 100 L95 105 L95 134 L105 134" />
    <path d="M66 54 L46 89" />
    <path class="thin pink" d="M114 128 L114 102 M108 109 L114 101 L120 109" />`,
  seatedCalf: `
    <path d="M4 161 L136 160" />
    <path class="thin" d="M30 112 L62 112 M34 112 L32 160 M58 112 L60 160" />
    <path d="M46 56 L46 108" />
    <circle class="head" cx="46" cy="44" r="11" />
    <path d="M46 108 L82 103 L82 147" />
    <path d="M73 147 L96 155" />
    <path d="M46 64 L50 90 L58 110" />
    <path class="thin pink" d="M64 156 L64 134 M58 141 L64 133 L70 141" />`,
  seatedMarch: `
    <path d="M4 161 L136 160" />
    <path class="thin" d="M30 112 L62 112 M34 112 L32 160 M58 112 L60 160" />
    <path d="M46 108 L82 108 L82 157 L92 157" />
    <path d="M46 56 L46 108" />
    <circle class="head" cx="46" cy="44" r="11" />
    <path d="M46 108 L81 98 L81 147 L91 147" />
    <path d="M46 64 L50 90 L58 110" />
    <path class="thin pink" d="M104 124 L104 98 M98 105 L104 97 L110 105" />`,
  chest: `
    <path d="M4 161 L136 160" />
    <circle class="head" cx="70" cy="30" r="11" />
    <path d="M70 42 L70 100 M52 54 L88 54 M70 100 L58 158 M70 100 L82 158" />
    <path d="M52 54 L28 54 L28 28 M88 54 L112 54 L112 28" />
    <path class="thin pink" d="M62 62 Q58 70 62 78 M78 62 Q82 70 78 78" />`,
  wrist: `
    <path d="M4 161 L136 160" />
    <circle class="head" cx="44" cy="30" r="11" />
    <path d="M44 42 L44 100 M44 100 L38 158 M44 100 L50 158 M38 158 L46 158 M50 158 L58 158" />
    <path d="M44 54 L88 56 L92 42" />
    <path d="M44 58 L72 68 L90 49" />
    <path class="thin pink dashed" d="M54 48 Q68 43 82 48" />`,
  eye: `
    <path d="M4 161 L136 160" />
    <path class="thin" d="M20 112 L52 112 M24 112 L22 160 M48 112 L50 160" />
    <path class="thin" d="M92 16 L130 16 L130 58 L92 58 Z M111 16 L111 58 M92 37 L130 37" />
    <circle class="thin pink" cx="121" cy="27" r="4" />
    <path d="M36 56 L36 108 M36 108 L72 108 M72 108 L72 157 L82 157 M36 64 L48 92 L64 104" />
    <circle class="head" cx="34" cy="44" r="11" />
    <path class="thin" d="M39 39 L39.6 42.7" />
    <path class="thin pink dashed" d="M50 38 L96 28" />`,
};

// Two columns, read top to bottom: the standing moves, then the ones for the desk and chair.
const columns = [
  ["squat", "calf", "march", "arms", "chest", "shrugs"],
  ["neck", "wrist", "eye", "seatedCalf", "seatedMarch"],
] as const;
const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;

function doseFor(moves: Copy, poster: Copy, key: string) {
  if (key === "neck" || key === "wrist") return poster.neckDose as string;
  // The seated versions run on a timer in the app, but the sheet gives their reps.
  const source = { seatedCalf: "calf", seatedMarch: "march" }[key] ?? key;
  return String(moves[source].counter).replace(/^\/\s*/, "");
}

/** Builds the poster SVG for one locale. */
export function posterSvg(locale: Copy, lang: string) {
  const { moves, poster, stats, footer } = locale;
  const upper = (text: string) => text.toLocaleUpperCase(lang);
  const titleLines = String(poster.title)
    .split(/(?<=[.!?])\s+|(?<=[。！？])/)
    .filter(Boolean)
    .map(upper);

  const rowTop = 520;
  const rowHeight = 182;
  const gap = 44;
  const columnWidth = (width - 2 * margin - gap) / 2;
  const figureWidth = 138;
  const textWidth = columnWidth - figureWidth;
  const boxStep = 24;

  const rows = columns
    .flatMap((keys, column) =>
      keys.map((key, index) => {
        const x = margin + column * (columnWidth + gap);
        const y = rowTop + index * rowHeight;
        const textX = x + figureWidth;
        let bodySize = 20;
        let lines = wrap(moves[key].description, bodySize, textWidth);
        if (lines.length > 3) {
          bodySize = 17;
          lines = wrap(moves[key].description, bodySize, textWidth);
        }
        const description = lines
          .map(
            (line, i) =>
              `<tspan x="${textX}" dy="${i === 0 ? 0 : Math.round(bodySize * 1.3)}">${escapeXml(line)}</tspan>`,
          )
          .join("");
        const boxes = weekdays
          .map((day, i) => {
            const bx = x + 2 + i * boxStep;
            return `<rect x="${bx}" y="${y + 150}" width="19" height="19" rx="2" />
            <text class="day" x="${bx + 9.5}" y="${y + 145}">${escapeXml(stats.days[day])}</text>`;
          })
          .join("");
        const separator =
          index < keys.length - 1
            ? `<path class="dash" d="M${x} ${y + rowHeight - 3} L${x + columnWidth} ${y + rowHeight - 3}" />`
            : "";
        return `
        <g transform="translate(${x + 4} ${y + 2}) scale(0.76)">
          <circle cx="70" cy="92" r="70" fill="url(#halftone)" />
          <g class="fig">
            <g class="shadow" transform="translate(2 1.5)">${poses[key]}</g>
            <g>${poses[key]}</g>
          </g>
        </g>
        <text class="name" x="${textX}" y="${y + 36}" font-size="${fitMono(upper(moves[key].name), 27, textWidth, 1)}">${escapeXml(upper(moves[key].name))}</text>
        <text class="dose" x="${textX}" y="${y + 72}">${escapeXml(upper(doseFor(moves, poster, key)))}</text>
        <text class="body" x="${textX}" y="${y + 104}" font-size="${bodySize}">${description}</text>
        <g class="boxes">${boxes}</g>
        ${separator}`;
      }),
    )
    .join("");
  const columnRule = `<path class="dash" d="M${width / 2} ${rowTop} L${width / 2} ${rowTop + 6 * rowHeight - 12}" />`;

  const subtitle = wrap(poster.subtitle, 27, width - 2 * margin)
    .map((line, i) => `<tspan x="${margin}" dy="${i === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`)
    .join("");

  const title = (fill: string, dx = 0, dy = 0) =>
    titleLines
      .map(
        (line, i) =>
          `<text x="${margin + dx}" y="${250 + i * 96 + dy}" fill="${fill}">${escapeXml(line)}</text>`,
      )
      .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="halftone" width="9" height="9" patternUnits="userSpaceOnUse">
      <circle cx="4.5" cy="4.5" r="1.5" fill="${pinkSoft}" />
    </pattern>
    <filter id="wobble" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
      <feDisplacementMap in="SourceGraphic" scale="2.6" />
    </filter>
    <style>
      .fig { fill: none; stroke: ${ink}; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; filter: url(#wobble); }
      .fig .thin { stroke-width: 2.5; }
      .fig .pink { stroke: ${pink}; }
      .fig .dashed { stroke-dasharray: 3 5; }
      .fig .head { fill: #ffffff; }
      .fig .shadow, .fig .shadow .pink { stroke: ${pinkSoft}; }
      .fig .shadow .head { fill: none; }
      .name { font-family: "Courier Prime"; font-weight: 700; letter-spacing: 1px; fill: ${ink}; }
      .dose { font-family: "Zine Display"; font-size: 25px; fill: ${pinkText}; }
      .body { font-family: "Courier Prime"; fill: ${ink}; }
      .boxes rect { fill: none; stroke: ${ink}; stroke-width: 2.5; }
      .day { font-family: "Courier Prime"; font-weight: 700; font-size: 13px; fill: ${inkSoft}; text-anchor: middle; }
      .dash { stroke: ${ink}; stroke-width: 2; stroke-dasharray: 6 8; opacity: 0.45; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="#ffffff" />

  <g transform="rotate(-3 ${margin + 150} 100)">
    <rect x="${margin - 10}" y="72" width="330" height="52" fill="${pink}" opacity="0.85" />
    <text x="${margin + 12}" y="108" font-family="Courier Prime" font-weight="700" font-size="24" letter-spacing="4" fill="${ink}">MYBACKHURTS.APP</text>
  </g>

  <g font-family="Zine Display" font-size="84">
    ${title(pink, 6, 5)}
    ${title(ink)}
  </g>
  <text x="${width - margin}" y="118" text-anchor="end" font-family="Reenie Beanie" font-size="64" fill="${pinkText}" transform="rotate(-5 ${width - margin} 118)">${escapeXml(poster.handNote)}</text>

  <text font-family="Courier Prime" font-size="27" fill="${ink}" y="${250 + titleLines.length * 96}">${subtitle}</text>
  <path d="M${margin} ${rowTop - 30} L${width - margin} ${rowTop - 32}" stroke="${ink}" stroke-width="4" stroke-linecap="round" />

  ${rows}
  ${columnRule}

  <path d="M${margin} ${height - 120} L${width - margin} ${height - 122}" stroke="${ink}" stroke-width="3" stroke-linecap="round" />
  <text x="${margin}" y="${height - 76}" font-family="Courier Prime" font-size="${fitMono(footer.medical, 21, width - 2 * margin - 260)}" fill="${inkSoft}">${escapeXml(footer.medical)}</text>
  <text x="${width - margin}" y="${height - 76}" text-anchor="end" font-family="Courier Prime" font-weight="700" font-size="22" fill="${ink}">mybackhurts.app</text>
</svg>`;
}

/** Wraps raw RGBA pixels in a one-page A4 PDF with a single flate-compressed RGB image. */
export function pdfFromPixels(
  rgba: Uint8Array,
  pixelWidth: number,
  pixelHeight: number,
  title: string,
) {
  const rgb = Buffer.alloc(pixelWidth * pixelHeight * 3);
  for (let src = 0, dst = 0; src < rgba.length; src += 4, dst += 3) {
    rgb[dst] = rgba[src];
    rgb[dst + 1] = rgba[src + 1];
    rgb[dst + 2] = rgba[src + 2];
  }
  const image = deflateSync(rgb, { level: 9 });
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const content = Buffer.from(`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`);
  // PDF text strings: UTF-16BE with a BOM, so accented titles survive.
  const pdfTitle = `<FEFF${Buffer.from(title, "utf16le").swap16().toString("hex").toUpperCase()}>`;

  const objects: (string | Buffer)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    ],
    [
      `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`,
      image,
      "\nendstream",
    ],
    [`<< /Length ${content.length} >>\nstream\n`, content, "\nendstream"],
    [`<< /Title ${pdfTitle} /Creator (mybackhurts landing build) >>`],
  ];

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  let offset = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((parts, index) => {
    offsets.push(offset);
    const body = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      ...parts.map((part) => (typeof part === "string" ? Buffer.from(part, "latin1") : part)),
      Buffer.from("\nendobj\n"),
    ]);
    chunks.push(body);
    offset += body.length;
  });
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((value) => `${String(value).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>`,
    "startxref",
    String(offset),
    "%%EOF",
    "",
  ].join("\n");
  chunks.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(chunks);
}

export const posterRenderWidth = width * 2;
