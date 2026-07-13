/**
 * CompanionMarkdown — utilities shared between the Companion page and the
 * CompanionModal so the routing logic and citation patterns can be unit-tested.
 *
 * Also normalises AI output:
 *  - Unescapes backslash-escaped markdown punctuation (`\*\*`, `\_`, `\#`, `\\`).
 *    Some models emit `\*\*word\*\*` defensively; that breaks inline bold.
 *  - Converts the system's documented `[/route label]` shorthand into real
 *    markdown links.
 *  - Tolerates malformed bare-bracket routes the model occasionally emits.
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

/** Unescape patterns the model emits at start-of-line — leading escaped # that
 *  the model uses to avoid producing "headings" (a literal `\#` shouldn't reach
 *  the user as-is). We only un-escape when the next char is a heading marker. */
const ESCAPED_HASH_AT_LINE_START = /(?:^|\n)(\\#+\s)/g;

export function appLinksToMarkdown(text: string): string {
  // Order matters: unescape first so the markdown parser can see **bold**.
  let out = text.replace(ESCAPED_PUNCTUATION, "$1");
  out = out.replace(ESCAPED_HASH_AT_LINE_START, (_m, group) => group.replace("\\#", "#"));
  out = out.replace(APP_LINK, (_m, route, label) => `[${label}](${route.toLowerCase()})`);
  out = out.replace(BARE_BRACKET, (_m, path) => {
    const route = `/${path}`;
    return `[${ROUTE_LABELS[route] ?? path}](${route})`;
  });
  return out;
}