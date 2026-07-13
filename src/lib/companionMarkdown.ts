/**
 * CompanionMarkdown — utilities shared between the Companion page and the
 * CompanionModal so the routing logic and citation patterns can be unit-tested.
 */
import { ROUTE_LABELS } from "@/lib/companionAI";

/** Pre-existing route pattern used by the system prompt: [/route label]. */
const APP_LINK = /\[(\/[A-Z0-9\/_\-]+)\s+([^\]]+)\]/gi;

/** Malformed bare-bracket pattern (e.g. "/quran" without label) some model
 *  outputs actually emit. Tolerated so chat doesn't render raw bracket syntax. */
const BARE_BRACKET = /\[\/?(quran\/plans|quran|c\/morning|c\/evening|sebha|prayer-times|duas|asma|prayer-guide|library)\/?\]/gi;

/** Quran citation: "سورة X : N" or "سورة X:N" with optional spaces and Arabic
 *  numerals. Captured for highlighting inside the rendered markdown. */
const QURAN_CITE = /(?:سورة|سورت)\s+([\u0621-\u063A\u0648\u064A]+(?:\s+[\u0621-\u063A\u0648\u064A]+)?)\s*[:\s]\s*([٠-٩0-9]+)/g;

export function appLinksToMarkdown(text: string): string {
  let out = text.replace(APP_LINK, (_m, route, label) => `[${label}](${route.toLowerCase()})`);
  out = out.replace(BARE_BRACKET, (_m, path) => {
    const route = `/${path}`;
    return `[${ROUTE_LABELS[route] ?? path}](${route})`;
  });
  return out;
}

export { QURAN_CITE };
