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

// Longest connector first so e.g. "حدثنا" isn't shadowed by a shorter partial.
const LEAD_RE = new RegExp(
  `^(?:${[...CONNECTORS].sort((a, b) => b.length - a.length).map(connectorPattern).join("|")})\\s*[:：]?\\s*`,
  "u",
);

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
  const segments = isnad.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
  const links: IsnadLink[] = [];
  for (const raw of segments) {
    const { connector, name } = stripConnectors(raw);
    if (!name) continue; // trailing "يقول:" with nothing after it — not a link
    links.push({ connector, name, raw });
  }
  return links;
}
