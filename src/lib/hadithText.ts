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
export function splitHadithText(text: string): { isnad: string; matn: string } {
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
  for (const m of markers) {
    const idx = searchSpace.lastIndexOf(m);
    if (idx !== -1 && idx > latest) { latest = idx; latestMarkerLen = m.length; }
  }

  let cut: number;
  if (latest > 0) {
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

