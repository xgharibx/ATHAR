/**
 * Keeps assistant replies Arabic-only without damaging their structure.
 *
 * The model is instructed to answer in Arabic, and stray foreign words are
 * removed as a safety net. Three things must survive that net untouched,
 * because the interface depends on them:
 *   - block markers such as ":::verse" and ":::action(/c/morning)";
 *   - in-app routes such as "[/quran]";
 *   - source links such as "[الدرر السنية](https://dorar.net/...)".
 *
 * Text arrives in arbitrary fragments while streaming, so cleaning each
 * fragment on its own would split words and markers unpredictably. The
 * streaming cleaner therefore works on the accumulated text and releases only
 * whole, whitespace-delimited tokens; a token still being received is held
 * back until it is complete.
 */

const FOREIGN_LETTERS = /[A-Za-zÀ-ɏЀ-ӿ぀-ヿ㐀-䶿一-鿿가-힯]+/g;
const HAS_FOREIGN_LETTERS = /[A-Za-zÀ-ɏЀ-ӿ぀-ヿ㐀-䶿一-鿿가-힯]/;

/** A token whose foreign letters are structural and must be kept verbatim. */
function isStructuralToken(token: string): boolean {
  if (/^:{2,}/.test(token)) return true; // block marker, e.g. :::verse
  if (token.includes("://")) return true; // link target
  if (/^[[(]?\/[a-z0-9/_-]*[\])]?[.,،؛:]?$/i.test(token)) return true; // in-app route
  if (/→\/[a-z0-9/_-]+\]?$/i.test(token)) return true; // legacy action route
  return false;
}

function cleanToken(token: string): string {
  if (!HAS_FOREIGN_LETTERS.test(token) || isStructuralToken(token)) return token;
  return token.replace(FOREIGN_LETTERS, "");
}

/** Clean a complete piece of text. */
export function sanitizeCompanionText(text: string): string {
  const parts = text.split(/(\s+)/);
  const out: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    if (index % 2 === 1) {
      out.push(part);
      continue;
    }
    const cleaned = cleanToken(part);
    if (cleaned === "" && part !== "") {
      // The whole token was foreign: drop it together with the gap after it,
      // so its removal does not leave a double space behind. Line breaks are
      // structural and are always kept.
      const gap = parts[index + 1];
      if (gap !== undefined && /^[ \t]+$/.test(gap)) index += 1;
      continue;
    }
    out.push(cleaned);
  }
  return out.join("");
}

export type CompanionStreamSanitizer = {
  /** Feed a raw fragment; returns the cleaned text that is now safe to show. */
  push(fragment: string): string;
  /** Release whatever is still held back once the stream has ended. */
  flush(): string;
};

export function createCompanionStreamSanitizer(): CompanionStreamSanitizer {
  let raw = "";
  let emitted = "";

  const release = (final: boolean): string => {
    let ready = raw;
    if (!final) {
      // Hold back the trailing token: it may still be growing.
      const boundary = raw.search(/\S+$/);
      if (boundary >= 0) ready = raw.slice(0, boundary);
    }
    const cleaned = sanitizeCompanionText(ready);
    if (!cleaned.startsWith(emitted)) {
      // Cannot happen for append-only input; never rewrite what was shown.
      return "";
    }
    const delta = cleaned.slice(emitted.length);
    emitted = cleaned;
    return delta;
  };

  return {
    push(fragment: string): string {
      if (!fragment) return "";
      raw += fragment;
      return release(false);
    },
    flush(): string {
      return release(true);
    },
  };
}
