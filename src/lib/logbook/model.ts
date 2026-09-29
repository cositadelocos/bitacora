import type { CSSProperties } from "react";

/** A5 portrait: height / width. Coordinates are percentages of page width. */
export const RATIO = Math.SQRT2;

export const INKS = ["ink", "olive", "brick", "mustard", "slate", "brown", "wine", "pine", "indigo", "sand", "cream", "chalk"] as const;
export type InkName = (typeof INKS)[number];

export const CLOTHS = ["olive", "ink", "brick", "kraft", "navy", "wine", "forest", "sand", "night", "clay"] as const;
export type Cloth = (typeof CLOTHS)[number];
export const CLOTH_LABEL: Record<Cloth, string> = {
  olive: "Oliva",
  ink: "Tinta",
  brick: "Ladrillo",
  kraft: "Kraft",
  navy: "Marino",
  wine: "Vino",
  forest: "Bosque",
  sand: "Arena",
  night: "Noche",
  clay: "Arcilla",
};

export const DESKS = [
  { id: "yeso", label: "Yeso" },
  { id: "arena", label: "Arena" },
  { id: "papel", label: "Papel" },
  { id: "oliva", label: "Oliva" },
  { id: "ladrillo", label: "Ladrillo" },
  { id: "noche", label: "Noche" },
  { id: "tinta", label: "Tinta" },
  { id: "crema", label: "Crema" },
  { id: "musgo", label: "Musgo" },
  { id: "vino", label: "Vino" },
  { id: "carbon", label: "Carbón" },
  { id: "cielo", label: "Cielo" },
] as const;
export type DeskId = (typeof DESKS)[number]["id"];
const DESK_SET = new Set<string>(DESKS.map((desk) => desk.id));

export const FONT_GROUPS = [
  {
    id: "hand",
    label: "Manuscritas",
    fonts: [
      { id: "caveat", name: "Caveat", family: '"Caveat", cursive' },
      { id: "kalam", name: "Kalam", family: '"Kalam", cursive' },
      { id: "patrick", name: "Patrick Hand", family: '"Patrick Hand", cursive' },
      { id: "sacramento", name: "Sacramento", family: '"Sacramento", cursive' },
      { id: "gochi", name: "Gochi Hand", family: '"Gochi Hand", cursive' },
    ],
  },
  {
    id: "sketch",
    label: "Sketch",
    fonts: [
      { id: "architects", name: "Architects Daughter", family: '"Architects Daughter", cursive' },
      { id: "shadows", name: "Shadows Into Light", family: '"Shadows Into Light", cursive' },
      { id: "rocksalt", name: "Rock Salt", family: '"Rock Salt", cursive' },
      { id: "homemade", name: "Homemade Apple", family: '"Homemade Apple", cursive' },
      { id: "marker", name: "Permanent Marker", family: '"Permanent Marker", cursive' },
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    fonts: [
      { id: "fraunces", name: "Fraunces", family: '"Fraunces", "Iowan Old Style", Palatino, serif' },
      { id: "cormorant", name: "Cormorant", family: '"Cormorant Garamond", Palatino, serif' },
      { id: "libre", name: "Libre Baskerville", family: '"Libre Baskerville", Palatino, serif' },
      { id: "garamond", name: "EB Garamond", family: '"EB Garamond", Palatino, serif' },
      { id: "source-serif", name: "Source Serif", family: '"Source Serif 4", Palatino, serif' },
    ],
  },
  {
    id: "sans",
    label: "Sans",
    fonts: [
      { id: "outfit", name: "Outfit", family: '"Outfit", "Avenir Next", sans-serif' },
      { id: "dm", name: "DM Sans", family: '"DM Sans", "Avenir Next", sans-serif' },
      { id: "karla", name: "Karla", family: '"Karla", "Avenir Next", sans-serif' },
      { id: "work", name: "Work Sans", family: '"Work Sans", "Avenir Next", sans-serif' },
    ],
  },
  {
    id: "mono",
    label: "Mono",
    fonts: [
      { id: "ibm", name: "IBM Plex Mono", family: '"IBM Plex Mono", ui-monospace, monospace' },
      { id: "space", name: "Space Mono", family: '"Space Mono", ui-monospace, monospace' },
      { id: "courier", name: "Courier Prime", family: '"Courier Prime", ui-monospace, monospace' },
      { id: "jetbrains", name: "JetBrains Mono", family: '"JetBrains Mono", ui-monospace, monospace' },
    ],
  },
  {
    id: "display",
    label: "Display",
    fonts: [
      { id: "bebas", name: "Bebas Neue", family: '"Bebas Neue", Impact, sans-serif' },
      { id: "abril", name: "Abril Fatface", family: '"Abril Fatface", Palatino, serif' },
      { id: "unbounded", name: "Unbounded", family: '"Unbounded", "Avenir Next", sans-serif' },
      { id: "instrument", name: "Instrument Serif", family: '"Instrument Serif", Palatino, serif' },
    ],
  },
] as const;

export type FontGroupId = (typeof FONT_GROUPS)[number]["id"];
export type FontKind = (typeof FONT_GROUPS)[number]["fonts"][number]["id"];

const LEGACY_FONT: Record<string, FontKind> = {
  editorial: "fraunces",
  hand: "caveat",
  note: "architects",
};

const FONT_BY_ID = new Map<string, { id: FontKind; name: string; family: string }>(
  FONT_GROUPS.flatMap((group) => group.fonts.map((font) => [font.id, font])),
);

export function fontStack(id: string | undefined) {
  const key = id ? (LEGACY_FONT[id] ?? id) : "caveat";
  return FONT_BY_ID.get(key)?.family ?? '"Caveat", cursive';
}

export function resolveFont(id: unknown): FontKind {
  const raw = typeof id === "string" ? id : "";
  const key = LEGACY_FONT[raw] ?? raw;
  return FONT_BY_ID.has(key) ? (key as FontKind) : "caveat";
}

export const TAPES = [
  "masking",
  "washi",
  "beige",
  "clear",
  "yellow",
  "gray",
  "translucent",
] as const;
export type TapeKind = (typeof TAPES)[number];

export const DECOS = [
  "arrow",
  "arrow-curve",
  "circle",
  "underline",
  "scribble",
  "stain",
  "brush",
  "leaf",
  "sprig",
  "flower",
  "clip",
  "postit",
  "dots",
  "swatches",
  "loop",
] as const;
export type DecoKind = (typeof DECOS)[number];

export const TONES = ["ivory", "warm", "cool"] as const;
export type Tone = (typeof TONES)[number];

export type ImageLook = {
  shadow: boolean;
  frame: boolean;
  scan: boolean;
  torn: boolean;
  fade: number;
};

export type LogElement = {
  id: string;
  type: "image" | "text" | "tape" | "deco";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  z: number;
  assetId?: string;
  naturalW?: number;
  naturalH?: number;
  look?: ImageLook;
  text?: string;
  font?: FontKind;
  fontSize?: number;
  color?: InkName;
  bold?: boolean;
  align?: "left" | "center" | "right";
  tape?: TapeKind;
  deco?: DecoKind;
};

export type LogPage = {
  id: string;
  tone: Tone;
  elements: LogElement[];
};

export type Cover = {
  title: string;
  subtitle: string;
  author: string;
  date: string;
  note: string;
  assetId: string | null;
  cloth: Cloth;
  showText: boolean;
  imageFit: "plate" | "full";
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  imgRot: number;
  textX: number | null;
  textY: number | null;
  textInk: InkName | null;
};

export type BackCover = {
  note: string;
  cloth: Cloth | "same";
  assetId: string | null;
  imageFit: "plate" | "full";
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  imgRot: number;
};

export type LogbookDoc = {
  version: 1;
  cover: Cover;
  back: BackCover;
  desk: DeskId;
  pages: LogPage[];
};

export const TAPE_LABEL: Record<TapeKind, string> = {
  masking: "Masking",
  washi: "Washi",
  beige: "Beige",
  clear: "Transparente",
  yellow: "Amarilla",
  gray: "Gris",
  translucent: "Translúcida",
};

export const DECO_LABEL: Record<DecoKind, string> = {
  arrow: "Flecha",
  "arrow-curve": "Curva",
  circle: "Círculo",
  underline: "Subrayado",
  scribble: "Trazo",
  stain: "Mancha",
  brush: "Pincel",
  leaf: "Hoja",
  sprig: "Rama",
  flower: "Flor",
  clip: "Clip",
  postit: "Nota",
  dots: "Puntos",
  swatches: "Paleta",
  loop: "Ciclo",
};

export const INK_LABEL: Record<InkName, string> = {
  ink: "Tinta",
  olive: "Oliva",
  brick: "Ladrillo",
  mustard: "Mostaza",
  slate: "Pizarra",
  brown: "Sepia",
  wine: "Vino",
  pine: "Pino",
  indigo: "Índigo",
  sand: "Arena",
  cream: "Crema",
  chalk: "Blanco",
};

const INK_SET = new Set<string>(INKS);
const TAPE_SET = new Set<string>(TAPES);
const DECO_SET = new Set<string>(DECOS);
const CLOTH_SET = new Set<string>(CLOTHS);
const TONE_SET = new Set<string>(TONES);

function num(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function str(v: unknown, max: number) {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

function lookOf(v: unknown): ImageLook {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    shadow: Boolean(o.shadow),
    frame: Boolean(o.frame),
    scan: Boolean(o.scan),
    torn: Boolean(o.torn),
    fade: num(o.fade, 0, 0, 1),
  };
}

function parseElement(v: unknown): LogElement | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const type = o.type;
  if (type !== "image" && type !== "text" && type !== "tape" && type !== "deco") return null;
  const id = str(o.id, 80);
  if (!id) return null;
  const el: LogElement = {
    id,
    type,
    x: num(o.x, 50, -20, 120),
    y: num(o.y, 70, -20, 170),
    w: num(o.w, 30, 2, 140),
    h: num(o.h, 20, 2, 170),
    rotation: num(o.rotation, 0, -360, 360),
    opacity: num(o.opacity, 1, 0, 1),
    z: Math.round(num(o.z, 1, 0, 999)),
  };
  if (type === "image") {
    const assetId = str(o.assetId, 80);
    if (!assetId) return null;
    el.assetId = assetId;
    if (o.naturalW) el.naturalW = num(o.naturalW, 1, 1, 8000);
    if (o.naturalH) el.naturalH = num(o.naturalH, 1, 1, 8000);
    el.look = lookOf(o.look);
  } else if (type === "text") {
    el.text = str(o.text, 2000);
    el.font = resolveFont(o.font);
    el.fontSize = num(o.fontSize, 5, 1.2, 22);
    el.color = INK_SET.has(String(o.color)) ? (o.color as InkName) : "ink";
    el.bold = Boolean(o.bold);
    el.align = o.align === "center" || o.align === "right" ? o.align : "left";
  } else if (type === "tape") {
    el.tape = TAPE_SET.has(String(o.tape)) ? (o.tape as TapeKind) : "masking";
  } else {
    el.deco = DECO_SET.has(String(o.deco)) ? (o.deco as DecoKind) : "arrow";
    el.color = INK_SET.has(String(o.color)) ? (o.color as InkName) : "ink";
  }
  return el;
}

export function parseDoc(input: unknown): LogbookDoc {
  if (!input || typeof input !== "object") throw new Error("Cuaderno vacío");
  const raw = input as Record<string, unknown>;
  const coverRaw =
    raw.cover && typeof raw.cover === "object" ? (raw.cover as Record<string, unknown>) : {};
  const backRaw =
    raw.back && typeof raw.back === "object" ? (raw.back as Record<string, unknown>) : {};
  const pagesRaw = Array.isArray(raw.pages) ? raw.pages : [];
  const imageFit = coverRaw.imageFit === "full" ? "full" : "plate";
  const placed = coverPlacement(imageFit);
  const cover: Cover = {
    title: str(coverRaw.title, 80) || "Bitácora",
    subtitle: str(coverRaw.subtitle, 120),
    author: str(coverRaw.author, 80),
    date: str(coverRaw.date, 40),
    note: str(coverRaw.note, 160),
    assetId: coverRaw.assetId ? str(coverRaw.assetId, 80) || null : null,
    cloth: CLOTH_SET.has(String(coverRaw.cloth)) ? (coverRaw.cloth as Cloth) : "olive",
    showText: coverRaw.showText !== false,
    imageFit,
    imgX: coverRaw.imgX == null ? placed.imgX : num(coverRaw.imgX, placed.imgX, -30, 130),
    imgY: coverRaw.imgY == null ? placed.imgY : num(coverRaw.imgY, placed.imgY, -30, 200),
    imgW: coverRaw.imgW == null ? placed.imgW : num(coverRaw.imgW, placed.imgW, 8, 170),
    imgH: coverRaw.imgH == null ? placed.imgH : num(coverRaw.imgH, placed.imgH, 8, 220),
    imgRot: coverRaw.imgRot == null ? placed.imgRot : num(coverRaw.imgRot, placed.imgRot, -180, 180),
    textX: coverRaw.textX == null ? null : num(coverRaw.textX, 8, -20, 90),
    textY: coverRaw.textY == null ? null : num(coverRaw.textY, 80, -20, 180),
    textInk: INK_SET.has(String(coverRaw.textInk)) ? (coverRaw.textInk as InkName) : null,
  };
  const backCloth = String(backRaw.cloth ?? "same");
  const backFit = backRaw.imageFit === "full" ? "full" : "plate";
  const backPlaced = coverPlacement(backFit);
  const back: BackCover = {
    note: str(backRaw.note, 240),
    cloth: CLOTH_SET.has(backCloth) ? (backCloth as Cloth) : "same",
    assetId: backRaw.assetId ? str(backRaw.assetId, 80) || null : null,
    imageFit: backFit,
    imgX: backRaw.imgX == null ? backPlaced.imgX : num(backRaw.imgX, backPlaced.imgX, -30, 130),
    imgY: backRaw.imgY == null ? backPlaced.imgY : num(backRaw.imgY, backPlaced.imgY, -30, 200),
    imgW: backRaw.imgW == null ? backPlaced.imgW : num(backRaw.imgW, backPlaced.imgW, 8, 170),
    imgH: backRaw.imgH == null ? backPlaced.imgH : num(backRaw.imgH, backPlaced.imgH, 8, 220),
    imgRot: backRaw.imgRot == null ? backPlaced.imgRot : num(backRaw.imgRot, backPlaced.imgRot, -180, 180),
  };
  const pages: LogPage[] = [];
  for (const page of pagesRaw.slice(0, 240)) {
    if (!page || typeof page !== "object") continue;
    const p = page as Record<string, unknown>;
    const id = str(p.id, 80);
    if (!id) continue;
    const elements = (Array.isArray(p.elements) ? p.elements : [])
      .slice(0, 80)
      .map(parseElement)
      .filter((e): e is LogElement => Boolean(e));
    pages.push({
      id,
      tone: TONE_SET.has(String(p.tone)) ? (p.tone as Tone) : "ivory",
      elements,
    });
  }
  if (!pages.length) pages.push(blankPage("page-blank"));
  const deskRaw = String(raw.desk ?? "yeso");
  return {
    version: 1,
    cover,
    back,
    desk: DESK_SET.has(deskRaw) ? (deskRaw as DeskId) : "yeso",
    pages,
  };
}

export function blankPage(id = cryptoId()): LogPage {
  return { id, tone: "ivory", elements: [] };
}

export function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function assetIds(doc: LogbookDoc): string[] {
  const ids = new Set<string>();
  if (doc.cover.assetId) ids.add(doc.cover.assetId);
  if (doc.back?.assetId) ids.add(doc.back.assetId);
  for (const page of doc.pages) {
    for (const el of page.elements) if (el.assetId) ids.add(el.assetId);
  }
  return [...ids];
}

export function pageAssetIds(page: LogPage | undefined): string[] {
  if (!page) return [];
  return page.elements.flatMap((el) => (el.assetId ? [el.assetId] : []));
}

export function elementStyle(el: LogElement): CSSProperties {
  const style: CSSProperties = {
    left: `${el.x}%`,
    top: `${el.y / RATIO}%`,
    width: `${el.w}%`,
    height: `${el.h / RATIO}%`,
    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
    zIndex: el.z,
    opacity: el.opacity,
  };
  if (el.type === "image" && el.naturalW && el.naturalH) {
    style.aspectRatio = `${el.naturalW} / ${el.naturalH}`;
  }
  return style;
}

export function inkVar(name: InkName | undefined) {
  return `var(--color-${name ?? "ink"})`;
}

function textEl(
  partial: Pick<LogElement, "id" | "text" | "x" | "y" | "w" | "h"> &
    Partial<LogElement>,
): LogElement {
  return {
    type: "text",
    rotation: 0,
    opacity: 1,
    z: 1,
    font: "caveat",
    fontSize: 6,
    color: "ink",
    bold: false,
    align: "left",
    ...partial,
  };
}

function decoEl(
  partial: Pick<LogElement, "id" | "deco" | "x" | "y" | "w" | "h"> & Partial<LogElement>,
): LogElement {
  return {
    type: "deco",
    rotation: 0,
    opacity: 1,
    z: 1,
    color: "ink",
    ...partial,
  };
}

export function seedDoc(): LogbookDoc {
  return {
    version: 1,
    cover: {
      title: "Bitácora",
      subtitle: "Diseño industrial",
      author: "",
      date: "2026",
      note: "Cuaderno de proceso",
      assetId: null,
      cloth: "olive",
      showText: true,
      textX: null,
      textY: null,
      textInk: null,
      ...coverPlacement("plate"),
    },
    back: { note: "", cloth: "same", assetId: null, ...coverPlacement("plate") },
    desk: "yeso",
    pages: [
      {
        id: "page-proceso",
        tone: "ivory",
        elements: [
          textEl({
            id: "t-proceso",
            text: "proceso",
            x: 38,
            y: 36,
            w: 62,
            h: 22,
            font: "caveat",
            fontSize: 14,
            color: "ink",
          }),
          textEl({
            id: "t-forma",
            text: "forma, material, uso.\nEmpieza por el objeto.",
            x: 42,
            y: 68,
            w: 58,
            h: 28,
            font: "fraunces",
            fontSize: 4.2,
            color: "brown",
          }),
          decoEl({
            id: "d-line",
            deco: "underline",
            x: 36,
            y: 52,
            w: 42,
            h: 8,
            color: "olive",
            rotation: -2,
          }),
          decoEl({
            id: "d-stain-1",
            deco: "stain",
            x: 78,
            y: 28,
            w: 28,
            h: 22,
            color: "mustard",
            opacity: 0.85,
            z: 0,
          }),
        ],
      },
      {
        id: "page-margen",
        tone: "warm",
        elements: [
          decoEl({
            id: "d-leaf",
            deco: "leaf",
            x: 74,
            y: 32,
            w: 28,
            h: 36,
            color: "olive",
            rotation: 8,
          }),
          decoEl({
            id: "d-sprig",
            deco: "sprig",
            x: 28,
            y: 108,
            w: 24,
            h: 32,
            color: "olive",
            rotation: -12,
          }),
          textEl({
            id: "t-margen",
            text: "deja aire.\nel dibujo necesita\nmargen para respirar.",
            x: 40,
            y: 78,
            w: 52,
            h: 36,
            font: "architects",
            fontSize: 5.4,
            color: "slate",
            rotation: -1.5,
          }),
        ],
      },
      {
        id: "page-obs",
        tone: "ivory",
        elements: [
          textEl({
            id: "t-obs",
            text: "observaciones",
            x: 46,
            y: 28,
            w: 70,
            h: 16,
            font: "fraunces",
            fontSize: 5.5,
            color: "ink",
          }),
          textEl({
            id: "t-obs-body",
            text: "1  qué se toca\n2  qué se entiende de lejos\n3  qué sobra",
            x: 46,
            y: 62,
            w: 64,
            h: 40,
            font: "caveat",
            fontSize: 6.2,
            color: "brown",
          }),
          decoEl({
            id: "d-arrow",
            deco: "arrow-curve",
            x: 78,
            y: 100,
            w: 30,
            h: 24,
            color: "brick",
            rotation: -8,
          }),
        ],
      },
      {
        id: "page-vacia",
        tone: "cool",
        elements: [
          textEl({
            id: "t-vacia",
            text: "página en blanco a propósito",
            x: 50,
            y: 120,
            w: 70,
            h: 14,
            font: "architects",
            fontSize: 4.2,
            color: "slate",
            align: "center",
          }),
        ],
      },
      {
        id: "page-paleta",
        tone: "ivory",
        elements: [
          textEl({
            id: "t-paleta",
            text: "paleta del cuaderno",
            x: 48,
            y: 30,
            w: 72,
            h: 14,
            font: "fraunces",
            fontSize: 4.6,
          }),
          decoEl({
            id: "d-swatches",
            deco: "swatches",
            x: 50,
            y: 62,
            w: 62,
            h: 48,
            z: 1,
          }),
          textEl({
            id: "t-paleta-note",
            text: "marfil, oliva, ladrillo,\nmostaza, pizarra, carbón.",
            x: 46,
            y: 108,
            w: 60,
            h: 24,
            font: "caveat",
            fontSize: 5,
            color: "olive",
          }),
        ],
      },
      {
        id: "page-sigue",
        tone: "warm",
        elements: [
          decoEl({
            id: "d-loop",
            deco: "loop",
            x: 32,
            y: 48,
            w: 28,
            h: 28,
            color: "brick",
          }),
          textEl({
            id: "t-sigue",
            text: "sigue el proceso.\nborra estas páginas\ncuando llegue el proyecto.",
            x: 62,
            y: 78,
            w: 54,
            h: 36,
            font: "caveat",
            fontSize: 5.6,
            color: "ink",
            rotation: -1,
          }),
        ],
      },
    ],
  };
}

export function evenCursor(cursor: number, total: number) {
  if (total <= 1) return 0;
  const max = total % 2 === 0 ? total - 2 : total - 1;
  const c = Math.max(0, Math.min(max, cursor));
  return c - (c % 2);
}

/** Slots in the viewer, including the back cover (and a blank endpaper on spreads so it sits on the right). */
export function viewCount(pageCount: number, single: boolean) {
  if (single) return pageCount + 1;
  const withBack = pageCount + 1;
  return withBack % 2 === 0 ? withBack : withBack + 1;
}

export function backIndex(pageCount: number, single: boolean) {
  if (single) return pageCount;
  return pageCount % 2 === 0 ? pageCount + 1 : pageCount;
}

export function maxCursor(total: number, single: boolean) {
  if (total <= 1) return 0;
  if (single) return total - 1;
  return total % 2 === 0 ? total - 2 : total - 1;
}

export function coverPlacement(fit: "plate" | "full", aspect = 1) {
  const safe = Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1;
  if (fit === "full") {
    const imgW = 116;
    return { imageFit: fit, imgX: 50, imgY: RATIO * 50, imgW, imgH: imgW / safe, imgRot: 0 };
  }
  const imgW = 68;
  return { imageFit: fit, imgX: 50, imgY: 46, imgW, imgH: imgW / safe, imgRot: -1.2 };
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}
