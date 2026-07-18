/**
 * Companion blocks — pre-splits the AI's response into render-ready segments.
 *
 * This is more reliable than leaning on react-markdown to detect :::verse ::: and
 * action blocks. We:
 *   1. Strip AI artefacts (e.g. `[//-]`, `[//~]`, `[//]`).
 *   2. Find each callout block (`:::verse … :::` …) in order — actions are a
 *      callout kind too (`:::action(/route)\nlabel\n:::`), reusing the same
 *      newline-delimited parser proven reliable for verse/hadith/dua/tip.
 *   3. Fall back to the legacy single-line `[action:label →/route]` bracket
 *      form (and its drifted variants — no "action:" prefix, "←" instead of
 *      "→", extra spacing) for older conversations / a model that still
 *      writes it that way.
 *   4. Recover a garbled or missing route by matching the label text against
 *      the known route labels, so a malformed action still becomes a working
 *      button instead of dead/unclickable text.
 *   5. Smart-detect imperative phrases like "افتح أذكار الصباح [/c/morning]" or
 *      "اقرأ وردي [/quran]" → emit as action segments even when the model
 *      didn't use either action form.
 *   6. Convert the legacy `[/route label]` (and bare `[/route]`) shorthand
 *      into real markdown links for in-flow references.
 *   7. Emit segments: `text` | `callout` | `action` for the renderer to render.
 *
 * Markdown styling (bold, lists, links) is still applied to `text` segments via
 * react-markdown. Callouts and actions get their own purpose-built components
 * so they render reliably regardless of how the model phrased the block.
 */
import { ROUTE_LABELS } from "@/lib/companionAI";

export type CalloutKind = "verse" | "hadith" | "dua" | "tip" | "warn" | "info" | "cite";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "callout"; calloutKind: CalloutKind; text: string }
  | { kind: "action"; label: string; route: string };

/** Every keyword the block parser recognises inside "::: … :::". "action" is
 *  a valid callout keyword too — see resolveActionBlock() below. */
const CALLOUT_KEYWORDS = "verse|hadith|dua|tip|warn|info|cite|action";

const ARTEFACTS: Array<[RegExp, string]> = [
  // "[//]", "[ // ]", "[//-]", "→[ // ]" … the model sometimes leaves these
  // dangling when it abandons an action block mid-thought. Tolerate internal
  // whitespace and a leading arrow so the leftover bracket doesn't leak
  // through as raw text.
  [/[→←]?\s*\[\s*\/\/\s*[-~?]?\s*\]/g, ""],
  [/\[\s*\/\*\s*\]/g, ""],
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
    `(${Object.keys(ARABIC_TO_LATIN_VERB).join("|")})[\\s\\S]{0,80}?\\[(\\/[a-z0-9\\/_-]+)(?:\\s+([^\\]]+))?\\]`,
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

/** A well-formed, keyword'd callout block: ":::dua\n…\n:::" or
 *  ":::action(/route)\nlabel\n:::". */
const VALID_CALLOUT_RE = new RegExp(
  `^[ \\t]*:{2,}(${CALLOUT_KEYWORDS})(?:\\(([^)\\n]*)\\))?[ \\t]*:?\\s*\\n([\\s\\S]*?)\\n[ \\t]*:{2,}[ \\t]*$`,
  "gim",
);

/** Guess a callout kind from content when the model dropped the keyword —
 *  duas reliably open with «اللهم»/«ربّ», hadith with an attribution phrase,
 *  verses with a سورة/آية reference or Quranic brackets. Anything else falls
 *  back to a neutral "tip" so it still renders as a highlighted box instead
 *  of raw ::: markers. */
function guessCalloutKind(text: string): CalloutKind {
  const t = text.trim();
  if (/^(اللهم|ربِّ|ربّ|رب\s|ربنا)/.test(t)) return "dua";
  if (/(رواه|أخرجه|أخرّجه|صحيح|حسن|ضعيف|متفق عليه)/.test(t)) return "hadith";
  if (/(سورة\s+\S+|آية\s*[:\d])/.test(t) || /[﴿﴾]/.test(t)) return "verse";
  return "tip";
}

/** Resolve an action's route: trust an already-valid one, otherwise recover
 *  it from the label text (the model reliably gets the *label* right even
 *  when the route slug comes out garbled, truncated, or missing entirely —
 *  e.g. "افتح السبحة" with a broken/empty route still clearly means
 *  "/sebha"). Returns null only when nothing can be recovered, in which case
 *  the caller renders plain text instead of a dead, non-navigating button. */
function resolveActionRoute(routeCandidate: string, label: string): string | null {
  const r = routeCandidate.trim().toLowerCase();
  if (r && r !== "/" && Object.prototype.hasOwnProperty.call(ROUTE_LABELS, r)) return r;

  const cleanLabel = label.trim();
  if (cleanLabel) {
    for (const [route, routeLabel] of Object.entries(ROUTE_LABELS)) {
      if (routeLabel && cleanLabel.includes(routeLabel)) return route;
    }
  }
  return null;
}

/** The model sometimes embeds a route reference "(/route)" as the *first*
 *  token of a callout's body instead of using the documented
 *  ":::action(/route)" meta syntax — e.g. it writes ":::tip\n(/sebha) افتح
 *  السبحة\n:::" (or picks the wrong kind entirely, or the route comes out
 *  as a garbled "(/ )"). Detected on ANY callout body regardless of its
 *  labelled kind; only reinterprets the block as an action when a route can
 *  actually be resolved, so ordinary tip/info text starting with an
 *  unrelated parenthetical is never misread. */
function extractEmbeddedAction(body: string): { route: string; label: string } | null {
  const m = /^\(\s*(\/[a-z0-9/_-]*)\s*\)[ \t]*\n?[ \t]*([\s\S]+)$/i.exec(body.trim());
  if (!m) return null;
  const label = m[2].trim();
  if (!label) return null;
  const route = resolveActionRoute(m[1], label);
  return route ? { route, label } : null;
}

// Private-use-area codepoints — the model can never legitimately emit these,
// so they're a collision-safe sentinel pair for shielding already-valid
// callout blocks below (a bare digit or word could collide with real
// content, e.g. a hadith/ayah number).
// Built via fromCharCode (rather than an inline escape) so the sentinel is
// guaranteed to be the real codepoint on disk, not an empty string.
const PLACEHOLDER_OPEN = String.fromCharCode(0xe000);
const PLACEHOLDER_CLOSE = String.fromCharCode(0xe001);

/** The model sometimes emits a bare "::: … :::" highlight (often on one line,
 *  no keyword) instead of the documented ":::dua\n…\n:::". Left alone this
 *  shows the raw ::: markers in the bubble instead of a highlighted box — the
 *  bug this fixes. We first shield out any already-valid keyword'd blocks
 *  (so their own closing "::: " can't be mistaken for a new bare quote's
 *  opening marker), normalise the remaining bare "::: … :::" into canonical
 *  keyword'd form, then restore the shielded blocks untouched. */
function normalizeBareQuotes(text: string): string {
  const placeholders: string[] = [];
  const shielded = text.replace(VALID_CALLOUT_RE, (m) => {
    placeholders.push(m);
    return `${PLACEHOLDER_OPEN}${placeholders.length - 1}${PLACEHOLDER_CLOSE}`;
  });

  const bareQuoteRe = new RegExp(
    `:{2,}[ \\t]*(?!(?:${CALLOUT_KEYWORDS})\\b)([^\\n:][\\s\\S]*?)[ \\t]*:{2,}`,
    "gi",
  );
  const withQuotes = shielded.replace(bareQuoteRe, (m, body: string) => {
    const clean = body.trim();
    if (!clean) return m;
    return `\n:::${guessCalloutKind(clean)}\n${clean}\n:::\n`;
  });

  const placeholderRe = new RegExp(`${PLACEHOLDER_OPEN}(\\d+)${PLACEHOLDER_CLOSE}`, "g");
  return withQuotes.replace(placeholderRe, (_m, idx) => placeholders[Number(idx)] ?? "");
}

function stripArtefacts(text: string): string {
  let out = normalizeBareQuotes(text);
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
  // Re-use a fresh regex so lastIndex is reset. We allow trailing text on the
  // closing line so a model that writes "::: بعد" still parses the callout.
  const re = new RegExp(
    `^[ \\t]*:{2,}(${CALLOUT_KEYWORDS})(?:\\(([^)\\n]*)\\))?[ \\t]*:?\\s*\\n([\\s\\S]*?)\\n[ \\t]*:{2,}[ \\t]*`,
    "gim",
  );
  const m = re.exec(text);
  return m ? { index: m.index, match: m } : { index: -1, match: null };
}

function nextAction(text: string): { index: number; match: RegExpExecArray | null } {
  // Legacy single-line form: accept the canonical "[action:label →/route]"
  // as well as looser variants the model sometimes drifts into — no
  // "action:" prefix, "←" instead of "→", extra internal whitespace, e.g.
  // "[ افتح أذكار المساء ←/c/evening ]". The route may also come out
  // truncated to a bare "/" (route capture allows zero chars after the
  // slash) — resolveActionRoute() below recovers the real route from the
  // label text in that case instead of failing to match at all.
  const re = /\[\s*(?:action:\s*)?([^\]\n→←]+?)\s*[→←]\s*(\/[a-z0-9/_-]*)\s*\]/gi;
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
      const kind = String(pickMatch[1]).toLowerCase();
      const meta = String(pickMatch[2] ?? "").trim();
      const body = String(pickMatch[3] ?? "").trim();
      if (kind === "action") {
        // ":::action(/route)\nlabel\n:::" — the reliable multi-line form.
        if (body.length > 0) {
          const route = resolveActionRoute(meta, body);
          if (route) segments.push({ kind: "action", label: body, route });
          else segments.push({ kind: "text", text: body });
        }
      } else if (body.length > 0) {
        const embedded = extractEmbeddedAction(body);
        if (embedded) {
          segments.push({ kind: "action", label: embedded.label, route: embedded.route });
        } else {
          // Skip empty callout bodies so we don't render a visible empty box.
          const text = meta ? `${body} — ${meta}` : body;
          segments.push({ kind: "callout", calloutKind: kind as CalloutKind, text });
        }
      }
    } else {
      const label = String(pickMatch[1]).trim();
      const routeCandidate = String(pickMatch[2] ?? "").toLowerCase();
      const route = resolveActionRoute(routeCandidate, label);
      if (route) segments.push({ kind: "action", label, route });
      else if (label) segments.push({ kind: "text", text: label });
    }
    cursor += pickIndex + pickMatch[0].length;
  }
  return segments;
}
