/**
 * Companion blocks — pre-splits the AI's response into render-ready segments.
 *
 * This is more reliable than leaning on react-markdown to detect :::verse ::: and
 * [action:label →/route] blocks. We:
 *   1. Strip AI artefacts (e.g. `[//-]`, `[//~]`, `[//]`).
 *   2. Find each callout block (`:::verse … :::` …) and each action block
 *      (`[action:label →/route]`) in order.
 *   3. Emit segments: `text` | `callout` | `action` for the renderer to render.
 *
 * Markdown styling (bold, lists, links) is still applied to `text` segments via
 * react-markdown. Callouts and actions get their own purpose-built components
 * so they render reliably regardless of how the model phrased the block.
 */

export type CalloutKind = "verse" | "hadith" | "dua" | "tip" | "warn" | "info";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "callout"; calloutKind: CalloutKind; text: string }
  | { kind: "action"; label: string; route: string };

const ARTEFACTS: Array<[RegExp, string]> = [
  [/\[\/\/-?\]/g, ""],
  [/\[\/\/~?\]/g, ""],
  [/\[\/\/\??\]/g, ""],
  [/\[\/\*\]/g, ""],
  [/^\s*---+\s*$/gm, ""],
];

/** Match either a callout block (multiline) or an action block (single line). */
const CALLOUT_BLOCK = /^[ \t]*:{2,}(verse|hadith|dua|tip|warn|info)[ \t]*:?\s*\n([\s\S]*?)\n[ \t]*:{2,}[ \t]*$/im;
const ACTION_BLOCK = /\[action:\s*([^\]\n→]+?)\s*→\s*(\/[a-z0-9/_-]+)\s*\]/gi;

function stripArtefacts(text: string): string {
  let out = text;
  for (const [re, replacement] of ARTEFACTS) out = out.replace(re, replacement);
  // Collapse runs of 3+ blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

/** Escape backslash-escaped markdown punctuation so the markdown pipeline sees
 *  **bold** etc. inline. Called on `text` segments. */
export function unescapeMarkdown(text: string): string {
  return text.replace(/\\([*_`#>~+\-.!(){}\[\]])/g, "$1");
}

/** Convert the legacy `[/route label]` shorthand into a real markdown link. */
function legacyRouteLinks(text: string): string {
  return text.replace(/\[(\/[A-Z0-9\/_\-]+)\s+([^\]]+)\]/gi, (_m, route, label) => `[${label}](${route.toLowerCase()})`);
}

function nextCallout(text: string): { index: number; match: RegExpExecArray | null } {
  // Find a callout block that starts at or after current position
  // Re-use a fresh regex so lastIndex is reset
  const re = /^[ \t]*:{2,}(verse|hadith|dua|tip|warn|info)[ \t]*:?\s*\n([\s\S]*?)\n[ \t]*:{2,}[ \t]*$/gim;
  const m = re.exec(text);
  return m ? { index: m.index, match: m } : { index: -1, match: null };
}

function nextAction(text: string): { index: number; match: RegExpExecArray | null } {
  const re = /\[action:\s*([^\]\n→]+?)\s*→\s*(\/[a-z0-9/_-]+)\s*\]/gi;
  const m = re.exec(text);
  return m ? { index: m.index, match: m } : { index: -1, match: null };
}

export function splitIntoSegments(rawText: string): Segment[] {
  const cleaned = stripArtefacts(rawText);
  const segments: Segment[] = [];
  let cursor = 0;
  while (cursor < cleaned.length) {
    const remaining = cleaned.slice(cursor);
    const c = nextCallout(remaining);
    const a = nextAction(remaining);

    // Pick the earliest occurrence
    let pick: "callout" | "action" | null = null;
    let pickIndex = -1;
    let pickMatch: RegExpExecArray | null = null;
    if (c.match && c.index >= 0 && (a.match === null || c.index <= a.index)) {
      pick = "callout"; pickIndex = c.index; pickMatch = c.match;
    } else if (a.match && a.index >= 0) {
      pick = "action"; pickIndex = a.index; pickMatch = a.match;
    }
    if (!pick || !pickMatch || pickIndex < 0) {
      const tail = unescapeMarkdown(legacyRouteLinks(cleaned.slice(cursor))).trim();
      if (tail.length > 0) segments.push({ kind: "text", text: tail });
      break;
    }
    if (pickIndex > 0) {
      const before = cleaned.slice(cursor, cursor + pickIndex);
      const beforeCleaned = unescapeMarkdown(legacyRouteLinks(before)).trim();
      if (beforeCleaned.length > 0) segments.push({ kind: "text", text: beforeCleaned });
    }
    if (pick === "callout") {
      const kind = String(pickMatch[1]).toLowerCase() as CalloutKind;
      const body = String(pickMatch[2]).trim();
      segments.push({ kind: "callout", calloutKind: kind, text: body });
    } else {
      const label = String(pickMatch[1]).trim();
      const route = String(pickMatch[2]).toLowerCase();
      segments.push({ kind: "action", label, route });
    }
    cursor += pickIndex + pickMatch[0].length;
  }
  return segments;
}