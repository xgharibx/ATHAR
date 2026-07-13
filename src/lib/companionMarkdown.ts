/**
 * CompanionMarkdown — utilities shared between the Companion page and the
 * CompanionModal so the routing logic, action blocks, and callout blocks can
 * be unit-tested.
 *
 * Pre-processes the AI's raw output into a stable markdown form before it
 * reaches React-Markdown. Three layers:
 *
 *  1. Unescape defensive backslash-escapes (\\*\\*, \\_, \\# …).
 *  2. Convert this app's special syntaxes to standard markdown:
 *       [action:افتح أذكار الصباح →/c/morning]
 *         →  [افتح أذكار الصباح](action:/c/morning)
 *       :::verse … :::  → blockquote with class marker
 *       :::hadith … ::: → blockquote with class marker
 *       :::dua … :::    → blockquote with class marker
 *       :::tip … :::    → blockquote with class marker
 *  3. Convert the system's [/route label] shorthand to a real markdown link.
 *  4. Tolerate malformed bare-bracket routes.
 *
 * Why pre-process instead of a remark plugin: it's pure-string, easy to test,
 * and keeps the bundle small (no extra runtime).
 */
import { ROUTE_LABELS } from "@/lib/companionAI";

/** Pre-existing route pattern used by the system prompt: [/route label]. */
const APP_LINK = /\[(\/[A-Z0-9\/_\-]+)\s+([^\]]+)\]/gi;

/** Malformed bare-bracket pattern (e.g. "/quran" without label) some model
 *  outputs actually emit. Tolerated so chat doesn't render raw bracket syntax. */
const BARE_BRACKET = /\[\/?(quran\/plans|quran|c\/morning|c\/evening|sebha|prayer-times|duas|asma|prayer-guide|library)\/?\]/gi;

/** Escape patterns some models insert defensively. Removing the backslash
 *  restores the markdown meaning — ** becomes bold, _ becomes emphasis, etc. */
const ESCAPED_PUNCTUATION = /\\([*_`#>~+\-.!(){}\[\]])/g;

const ESCAPED_HASH_AT_LINE_START = /(?:^|\n)(\\#+\s)/g;

/** Action block: [action:label →/route]. We capture label and route so we can
 *  round-trip them into a markdown link with `action:` scheme that React-Markdown
 *  picks up via the components.a override (renders as a button). */
const ACTION_BLOCK = /\[action:\s*([^\]\n→]+?)\s*→\s*(\/[a-z0-9/_-]+)\s*\]/gi;
const ACTION_BLOCK_NO_ARROW = /\[action:\s*([^\]\n]+?)\s*→\s*(\/[a-z0-9/_-]+)\s*\]/gi;

/** Fenced callout syntax: :::verse ... :::  etc. We accept ASCII and Arabic
 *  punctuation as opening delimiter. The closing is `:::` on its own line. */
const CALLOUT_RE = /^[ \t]*:{3,}(verse|hadith|dua|tip|warn|info)[ \t]*$([\s\S]*?)^[ \t]*:{3,}[ \t]*$/gim;

const CALLOUT_KIND_LABEL: Record<string, string> = {
  verse: "آية",
  hadith: "حديث",
  dua: "دعاء",
  tip: "نصيحة",
  warn: "تنبيه",
  info: "معلومة",
};

export type CalloutKind = keyof typeof CALLOUT_KIND_LABEL;

export function calloutLabel(kind: CalloutKind): string {
  return CALLOUT_KIND_LABEL[kind];
}

export function appLinksToMarkdown(text: string): string {
  // Order matters: unescape first so the markdown parser can see **bold**.
  let out = text.replace(ESCAPED_PUNCTUATION, "$1");
  out = out.replace(ESCAPED_HASH_AT_LINE_START, (_m, group) => group.replace("\\#", "#"));

  // Inline action blocks: [action:label →/route] → [label](action:/route)
  out = out.replace(ACTION_BLOCK, (_m, label, route) => `[${label.trim()}](action:${route.toLowerCase()})`);
  // Tolerate variants where the arrow is missing or label is multi-line
  out = out.replace(ACTION_BLOCK_NO_ARROW, (_m, label, route) => `[${label.trim()}](action:${route.toLowerCase()})`);

  // Fenced callouts: :::verse ... ::: → markdown blockquote carrying a class hint
  out = out.replace(CALLOUT_RE, (_m, kind, body) => {
    const inner = String(body).trim().replace(/\n/g, "\n> ");
    return `\n> [callout:${String(kind).toLowerCase()}] ${inner}\n`;
  });

  out = out.replace(APP_LINK, (_m, route, label) => `[${label}](${route.toLowerCase()})`);
  out = out.replace(BARE_BRACKET, (_m, path) => {
    const route = `/${path}`;
    return `[${ROUTE_LABELS[route] ?? path}](${route})`;
  });
  return out;
}

/** Detect whether a markdown <a> href is an action block and should render as
 *  a button instead of a navigation link. */
export function isActionHref(href: string | undefined): href is `action:${string}` {
  return !!href && href.startsWith("action:");
}

export function actionRouteFromHref(href: string): string {
  return href.replace(/^action:/, "");
}