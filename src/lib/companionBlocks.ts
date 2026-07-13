/**
 * Companion blocks — pre-splits the AI's response into render-ready segments.
 *
 * This is more reliable than leaning on react-markdown to detect :::verse ::: and
 * [action:label →/route] blocks. We:
 *   1. Strip AI artefacts (e.g. `[//-]`, `[//~]`, `[//]`).
 *   2. Find each callout block (`:::verse … :::` …) and each action block
 *      (`[action:label →/route]`) in order.
 *   3. Smart-detect imperative phrases like "افتح أذكار الصباح [/c/morning]" or
 *      "اقرأ وردي [/quran]" → emit as action segments so they become tappable
 *      CTA buttons even when the model didn't use the [action:label →/route]
 *      form.
 *   4. Convert the legacy `[/route label]` (and bare `[/route]`) shorthand
 *      into real markdown links for in-flow references.
 *   5. Emit segments: `text` | `callout` | `action` for the renderer to render.
 *
 * Markdown styling (bold, lists, links) is still applied to `text` segments via
 * react-markdown. Callouts and actions get their own purpose-built components
 * so they render reliably regardless of how the model phrased the block.
 */
import { ROUTE_LABELS } from "@/lib/companionAI";

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

/** Imperative verbs that signal the AI is asking the user to navigate somewhere.
 *  When followed by `[/route]` or `[/route label]`, we promote the phrase to a
 *  real action block. */
const IMPERATIVE = /^(افتح|افتحي|اقرأ|اقرأي|ارجع|ارجعي|اذهب|اذهبي|شغّل|شغلي|احفظ|احفظي|ابدأ|ابدئي|انتقل|انتقلي|جرّب|جرّبي|ادخل|ادخلي)\b/;

const ARABIC_TO_LATIN_VERB: Record<string, string> = {
  "افتح": "افتح", "افتحي": "افتح",
  "اقرأ": "اقرأ", "اقرأي": "اقرأ",
  "ارجع": "ارجع", "ارجعي": "ارجع",
  "اذهب": "اذهب", "اذهبي": "اذهب",
  "شغّل": "شغّل", "شغلي": "شغّل",
  "احفظ": "احفظ", "احفظي": "احفظ",
  "ابدأ": "ابدأ", "ابدئي": "ابدأ",
  "انتقل": "انتقل", "انتقلي": "انتقل",
  "جرّب": "جرّب", "جرّبي": "جرّب",
  "ادخل": "ادخل", "ادخلي": "ادخل",
};

/** Promote imperative phrases + bare-route links into proper action blocks.
 *  "افتح [/c/morning]" → "[action:افتح أذكار الصباح →/c/morning]"
 *  "اقرأ وردي [/quran]" → "[action:اقرأ وردي →/quran]" */
function promoteImperativeToActions(text: string): string {
  // Pattern: (verb) ... [/route]   → action block
  // First normalise bare routes to labelled ones for visibility
  const IMPERATIVE_ROUTE_RE = new RegExp(
    `(${Object.keys(ARABIC_TO_LATIN_VERB).join("|")})[\\s\\S]{0,40}?\\[(\\/[a-z0-9\\/_-]+)(?:\\s+([^\\]]+))?\\]`,
    "gi",
  );
  return text.replace(IMPERATIVE_ROUTE_RE, (_m, verb, route, explicitLabel) => {
    const r = route.toLowerCase();
    const label = (explicitLabel ?? ROUTE_LABELS[r] ?? "").trim();
    if (!label) return _m;
    const v = ARABIC_TO_LATIN_VERB[verb] ?? verb;
    return `[action:${v} ${label} →${r}]`;
  });
}

/** Match either a callout block (multiline) or an action block (single line). */
const CALLOUT_BLOCK = /^[ \t]*:{2,}(verse|hadith|dua|tip|warn|info)[ \t]*:?\s*\n([\s\S]*?)\n[ \t]*:{2,}[ \t]*$/im;
const ACTION_BLOCK = /\[action:\s*([^\]\n→]+?)\s*→\s*(\/[a-z0-9/_-]+)\s*\]/gi;

function stripArtefacts(text: string): string {
  let out = text;
  for (const [re, replacement] of ARTEFACTS) out = out.replace(re, replacement);
  // Promote imperative phrases with bare-route links to action blocks
  out = promoteImperativeToActions(out);
  // Collapse runs of 3+ blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

/** Escape backslash-escaped markdown punctuation so the markdown pipeline sees
 *  **bold** etc. inline. Called on `text` segments. */
export function unescapeMarkdown(text: string): string {
  return text.replace(/\\([*_`#>~+\-.!(){}\[\]])/g, "$1");
}

/** Convert the legacy `[/route label]` shorthand into a real markdown link.
 *  Also handles bare `[/route]` (no label) → uses the canonical label from
 *  ROUTE_LABELS so the link is at least readable. */
function legacyRouteLinks(text: string): string {
  let out = text;
  // [/route label] → [label](/route)
  out = out.replace(/\[(\/[A-Z0-9\/_\-]+)\s+([^\]]+)\]/gi, (_m, route, label) => `[${label}](${route.toLowerCase()})`);
  // Bare [/route] → [LABEL](/route)
  out = out.replace(/\[(\/[a-z0-9\/_\-]+)\]/gi, (_m, route) => {
    const r = route.toLowerCase();
    return `[${ROUTE_LABELS[r] ?? route}](${r})`;
  });
  return out;
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