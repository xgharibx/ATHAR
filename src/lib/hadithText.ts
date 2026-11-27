import { findArabicMatches } from "@/lib/arabicHighlight";

/**
 * The single hadith isnad/matn splitter, shared by every hadith surface
 * (reader, memo cards, poster share) so they all split the same way.
 */
// Split full hadith text into isnad (narrator chain) and matn (content).
//
// Multi-narrator chains repeat "قال: حدثنا فلان، قال: حدثنا فلان..." once per
// link, so splitting at the FIRST such marker (the old behavior) only peeled
// off the first narrator and left the rest of the chain sitting inside
// "matn". The real isnad/matn boundary is the LAST marker occurring before
// the quoted saying — the one immediately introducing it — not the first.
//
// This dataset doesn't punctuate "قال" with a colon consistently (checked
// against the bundled bukhari.json: most hadiths have none at all), but it
// does reliably wrap the actual quoted matn in a literal `"`. So markers are
// the primary signal when present; a bare quote mark is the fallback when
// they aren't — covers the large share of hadiths with no colon anywhere.
/**
 * Display cleanup: drops orphan footnote marks «(1)» (the footnotes are not
 * in this edition) and writes any remaining number, like «[رقم:1907]», in
 * Arabic digits.
 */
export function cleanHadithText(text: string): string {
  return tidyHadithMarkup(text)
    .replace(/\s?\(\d{1,2}\)/g, "")
    .replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);
}

const LINE_BREAK = /<br\s*\/?>/i;
const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670]/g;
/** A text that opens with the companion («عن أبي هريرة…»), not a chain («حدثنا…»). */
const COMPANION_FIRST = /^[\s\u200f"]*عن\s/;

/**
 * The two forties came with web markup: a raw «<br>» before the
 * attribution, and in the Nawawi forty the attribution again in brackets
 * («[رَوَاهُ الْبُخَارِيُّ]، [وَمُسْلِمٌ]») even when the text already says it.
 * Each «<br>» becomes a line break, the bracketed repeat is dropped when the
 * text already names who narrated it and unbracketed otherwise. The bundled
 * files are already clean; this also cleans copies cached by older versions.
 */
export function tidyHadithMarkup(text: string): string {
  if (!text.includes("<")) return text;
  const [head = "", ...tails] = text.split(LINE_BREAK);
  const lines = [head.trim()];
  for (const tail of tails) {
    let line = tail.trim().replace(/^[.:،]\s*/, "");
    if (!line) continue;
    if (line.startsWith("[")) {
      if (lines.join(" ").replace(HARAKAT, "").includes("رواه")) continue;
      line = line.replace(/\]\s*،?\s*\[/g, " ").replace(/[[\]]/g, "").trim();
    }
    lines.push(line);
  }
  return lines.join("\n").replace(/<[^>]*>/g, "");
}

export function splitHadithText(raw: string): { isnad: string; matn: string } {
  const text = cleanHadithText(raw);
  const QUOTE = "\"";
  const firstQuote = text.indexOf(QUOTE);
  // Only look for markers before the quote, so a "قال" inside the quoted
  // matn itself (reported speech within reported speech) can't be picked.
  const searchSpace = firstQuote > 0 ? text.slice(0, firstQuote) : text;

  const markers = [
    " قَالَ:", " قَالَ :", "قال:",
    " يَقُولُ:", " يَقُولُ :", "يقول:",
    "أَنَّ رَسُولَ", "أن رسول الله",
    "عَنِ النَّبِيِّ", "عَنِ النَّبِيِّ صَلَّى",
  ];
  let latest = -1;
  let latestMarkerLen = 0;
  // A text that opens with the companion rather than a chain (only the two
  // forties do: «عن أبي هريرة رضي الله عنه قال: …») names just the companion
  // before the hadith, so the cut is the FIRST «قال:»; a later one falls
  // inside the hadith (a question and its answer) and would fold most of it
  // away as «الإسناد».
  const companionOnly = COMPANION_FIRST.test(text.replace(HARAKAT, ""));
  // «قال:» / «فقال:» / «يقول:» with or without harakat, the first one.
  const firstSaid = companionOnly
    ? ["قال:", "قال :", "يقول:", "يقول :"].flatMap((term) => findArabicMatches(text, term)).sort((x, y) => x[0] - y[0])[0]
    : undefined;
  for (const m of firstSaid ? [] : markers) {
    const idx = searchSpace.lastIndexOf(m);
    if (idx !== -1 && idx > latest) { latest = idx; latestMarkerLen = m.length; }
  }

  // Or the end of a short first line («… عن النبي ﷺ قال⏎قال الله …»).
  const firstBreak = companionOnly ? text.indexOf("\n") : -1;

  let cut: number;
  if (firstBreak > 0 && firstBreak < 200 && (!firstSaid || firstBreak < firstSaid[0])) {
    cut = firstBreak;
  } else if (firstSaid) {
    cut = firstSaid[1];
  } else if (latest > 0) {
    // Keep the marker itself ("...يقول:") attached to isnad — it's the
    // narrator's own words introducing the quote, not part of it.
    cut = latest + latestMarkerLen;
  } else if (firstQuote > 8) {
    cut = firstQuote;
  } else {
    return { isnad: "", matn: text };
  }

  const isnad = text.slice(0, cut).trim();
  // Strip a leading/trailing literal quote mark (with its RLM wrapper and
  // any trailing full stop) — it's source punctuation, not content.
  const QUOTE_EDGE = /^[‏\s]*"[‏\s]*|[‏\s]*"[‏\s]*\.?[‏\s]*$/g;
  const matn = text.slice(cut).trim().replace(QUOTE_EDGE, "").trim();
  return { isnad, matn };
}

