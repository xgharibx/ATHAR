/**
 * Splits an isnad (narrator chain) string into individual links — one per
 * narrator — for the chain visual and for narrator-lookup taps.
 *
 * Isnad text is naturally comma-separated ("حدثنا فلان، قال: حدثنا فلان،
 * عن فلان…"), so each comma-delimited segment is one link; the leading
 * connector phrase(s) ("حدثنا", "قال", "عن", "سمعت"…) are stripped off to
 * isolate the narrator's name, matched diacritic-insensitively since the
 * source text is fully vocalized and connectors appear with varying
 * tashkeel across the 9 books. This is a text-shape heuristic, not a
 * grammatical parser — segments that don't fit the pattern are kept as-is
 * rather than mangled, and empty results are dropped.
 */

// Same technique as the ayah-search highlighter in Quran.tsx: allow any
// combining diacritic between (and after) each base letter of a connector.
const DIACRITICS = "[ؐ-ًؚ-ٰٟۖ-ۭ]*";

function connectorPattern(word: string): string {
  const escaped = [...word].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return DIACRITICS + escaped.join(DIACRITICS) + DIACRITICS;
}

const CONNECTORS = [
  "حدثنا", "حدثني", "أخبرنا", "أخبرني", "أنبأنا", "أنبأني",
  "سمعت", "سمع", "عن", "أنه", "قال", "يقول",
];

// Longest connector first so e.g. "حدثنا" isn't shadowed by a shorter partial;
// an optional «و» in front («وحدثنا»), and stray dashes or quote marks.
const LEAD_RE = new RegExp(
  `^[\\s\\-–"«»\u200f]*(?:${connectorPattern("و")})?(?:${[...CONNECTORS].sort((a, b) => b.length - a.length).map(connectorPattern).join("|")})(?:${connectorPattern("ه")}|${connectorPattern("ها")})?(?!${DIACRITICS}[\u0621-\u064A])\\s*[:：]?\\s*`,
  "u",
);

const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670]/g;
const plain = (text: string) => text.replace(HARAKAT, "");
/** A new link starts at each «حدثنا/أخبرنا…» even without a comma before it. */
const SPLIT_RE = new RegExp(
  `[،,]|\\s[-–]\\s?|\\s(?=(?:${connectorPattern("و")})?(?:${["حدثنا", "حدثني", "أخبرنا", "أخبرني", "أنبأنا"].map(connectorPattern).join("|")}))`,
  "u",
);
/** «ح» marks a switch to a second chain; «وهذا حديثه», «واللفظ له» are editor's notes. */
const SKIP_RE = /^(?:ح|وهذا حديثه|وهذا لفظه|واللفظ له|واللفظ لفلان|قال|قالا|قالوا)$/;
/** «بهذا الحديث»، «بمثله»، «نحوه»: the chain is over. */
const END_RE = /^(?:بهذا|بهذا الحديث|بمثله|بنحوه|مثله|نحوه|بمعناه)(?:\s|$)/;
/** «يعني السدوسي»، «هو ابن صهيب»: a note on the narrator before, not a narrator. */
const NOTE_RE = /^(?:يعني|يعنى|هو|وهو)\s/;
/** The Prophet ﷺ ends the chain: what follows is the hadith, not a narrator. */
const PROPHET_RE = /^(?:رسول الله|النبي|نبي الله)|صلى الله عليه و ?سلم/;
/** Praise after a companion's name, dropped from the chip. */
const PRAISE_RE = new RegExp(`\\s*${["رضي", "الله", "عنه"].map(connectorPattern).join("\\s*")}(?:${connectorPattern("ما")}|${connectorPattern("ا")})?`, "gu");

export type IsnadLink = {
  /** Connector phrase(s) stripped off the front, e.g. "قال: حدثنا" — for display, not authoritative grammar. */
  connector: string;
  /** The narrator's name, as best isolated from the connector. */
  name: string;
  /** The original, unmodified segment — always safe to fall back to. */
  raw: string;
};

function stripConnectors(segment: string): { connector: string; name: string } {
  let rest = segment.trim();
  const labels: string[] = [];
  // A single link can chain a couple of connectors ("قال: حدثنا فلان") —
  // cap the loop so a pathological input can't spin forever.
  for (let i = 0; i < 3; i++) {
    const m = LEAD_RE.exec(rest);
    if (!m || !m[0].trim()) break;
    labels.push(m[0].trim());
    rest = rest.slice(m[0].length).trim();
  }
  return { connector: labels.join(" "), name: rest };
}

export function parseIsnadChain(isnad: string): IsnadLink[] {
  if (!isnad?.trim()) return [];
  const segments = isnad.split(SPLIT_RE).map((s) => (s ?? "").trim()).filter(Boolean);
  const links: IsnadLink[] = [];
  for (const raw of segments) {
    // «ح وحدثنا فلان»: «ح» switches to a second chain; read on from it.
    const { connector, name: rawName } = stripConnectors(raw.replace(/^ح\s+/u, ""));
    const name = rawName.replace(PRAISE_RE, "").replace(/[\s\-–"«»\u200f.:]+$/u, "").replace(/^[\s\-–"«»\u200f]+/u, "").trim();
    if (!name) continue; // trailing "يقول:" with nothing after it — not a link
    const bare = plain(name);
    if (SKIP_RE.test(bare)) continue;
    if (END_RE.test(bare)) break;
    if (PROPHET_RE.test(bare)) break;
    // A clarifying note joins the narrator it explains: «الحسن بن عمرو (السدوسي)».
    if (NOTE_RE.test(bare) || /^(?:يعني|يعنى|هو|وهو)$/.test(plain(connector))) {
      const prev = links[links.length - 1];
      const note = name.replace(/^\S+\s+/, "").trim();
      if (prev && NOTE_RE.test(bare) && note) {
        prev.name = `${prev.name} (${note})`;
        prev.raw = `${prev.raw}، ${raw}`;
        continue;
      }
    }
    // A long run of words is the start of the story, not a name.
    if (name.split(/\s+/).length > 8) break;
    links.push({ connector, name, raw });
  }
  return links;
}

/**
 * Where the chain of narrators ends in a full hadith text that has no «قال:»
 * or quotation mark to cut at: after the last «حدثنا/أخبرنا/عن فلان» link,
 * before the Prophet ﷺ or the first long run of words. 0 when fewer than two
 * links are found (then nothing is cut).
 */
export function chainEnd(text: string): number {
  const re = new RegExp(SPLIT_RE.source, "gu");
  const pieces: [number, number][] = [];
  let from = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    pieces.push([from, m.index]);
    from = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  pieces.push([from, text.length]);
  let end = 0;
  let links = 0;
  const TRANSMITS = /^[\s\-–"«»\u200f]*و?(?:حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|عن)(?:\s|$)/;
  // A chain that ends at «قال …»/«أنه …» is one even with a single narrator before it.
  let atSpeech = false;
  for (let p = 0; p < pieces.length; p++) {
    const [a, b] = pieces[p]!;
    const raw = text.slice(a, b).trim();
    if (!raw) continue;
    const { connector, name: rawName } = stripConnectors(raw.replace(/^ح\s+/u, ""));
    const name = rawName.replace(PRAISE_RE, "").replace(/[\s\-–"«»\u200f.:]+$/u, "").trim();
    // «… وأحمد بن عبدة قالوا»: a co-narrator, then the verb before the next «حدثنا».
    const bare = plain(name).replace(/\s+(?:قال|قالا|قالوا)$/, "");
    // «يعني الطيالسي»، «وهو ابن الأكوع»: a short note on the narrator. A long one
    // («وهو على المنبر يقول …») is where the hadith begins.
    if (NOTE_RE.test(bare) && bare.split(/\s+/).length > 4) break;
    if (!name || SKIP_RE.test(bare) || NOTE_RE.test(bare)) { end = b; continue; }
    const coNarrator = !connector && /^و\S/.test(bare) && bare.split(/\s+/).length <= 8;
    // «قال كنا …» or «أنه كان …» with no «حدثنا/أخبرنا/عن» after it: the words are the hadith, not a narrator
    // («قال ابن رمح أخبرنا …» goes on to the next link, so it stays one).
    if (/(?:^|\s)(?:قال|قالت|يقول|أنه)$/.test(plain(connector))) {
      const next = pieces.slice(p + 1).map(([x, y]) => plain(text.slice(x, y)).trim()).find(Boolean) ?? "";
      if (!TRANSMITS.test(next)) {
        atSpeech = true;
        break;
      }
    }
    if (END_RE.test(bare) || PROPHET_RE.test(bare) || (!connector && !coNarrator) || bare.split(/\s+/).length > 8) break;
    links++;
    end = b;
  }
  return links >= 2 || (atSpeech && links >= 1) ? end : 0;
}
