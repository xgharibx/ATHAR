import { skeleton } from "./text.ts";

/**
 * Authentic hadith evidence from the Dorar hadith encyclopedia.
 *
 * The assistant may quote a hadith only when its wording was returned by this
 * search with a grading of authentic or sound. Everything else the search
 * returns (weak, fabricated, disputed, or ungraded narrations) is discarded.
 */

export type HadithEvidence = {
  text: string;
  narrator: string;
  grader: string;
  source: string;
  number: string;
  grade: string;
};

// A grading is accepted only when it opens with a clear verdict of authentic or
// sound. A remark that merely mentions the word (for example "it has a
// supporting narration in Sahih Muslim") is not a verdict on this narration.
const ACCEPTED_GRADE = /^[[(«"\s]*(?:(?:إسناده|اسناده|سنده|حديث|هذا حديث|هو)\s+)?(?:صحيح|حسن|ثابت|جيد|متفق عليه)(?=$|[\s\])»".،,:])/;
const REJECTED_GRADE =
  /ضعيف|موضوع|منكر|باطل|لا يصح|لم يصح|لا يثبت|لم يثبت|لا أصل|غير صحيح|ليس بصحيح|مرسل|منقطع|معضل|شاذ|معلول|مضطرب|غريب|فيه نظر|كذب|واه|متروك|مجهول|لا يحتج|اختلف|مختلف|فيه مقال|فيه ضعف|لين|تفرد|أعل|علة|لا نعلم|لا يعرف|مدلس|منحول|مكذوب|لا يتابع|ليس بالقوي|ليس بثابت|شاهد|لغيره|قارب| أو |إن شاء الله|لولا|إلا أن|لكن|غير أن/;

// Long narrations that cover many topics are skipped: a chat reply needs the
// short narration that states the point.
const MAX_TEXT_CHARS = 600;
/** Limit when the user asked for the wording itself, such as a complete supplication. */
const MAX_COMPLETE_TEXT_CHARS = 1_500;
const MIN_TEXT_SKELETON = 12;
/** Two narrations sharing this share of their words are the same hadith. */
const SAME_NARRATION_OVERLAP = 0.6;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function field(block: string, label: string): string {
  const match = new RegExp(`${label}:</span>\\s*(?:<span[^>]*>)?([\\s\\S]*?)(?:</span>|<span|</div|\\n)`).exec(block);
  return match ? stripTags(match[1] ?? "") : "";
}

/** Parse the HTML fragment returned by the encyclopedia's search. */
export function parseDorarResults(html: unknown): HadithEvidence[] {
  if (typeof html !== "string") return [];
  const out: HadithEvidence[] = [];
  const blocks = html.split('<div class="hadith"');
  for (let index = 1; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    const body = /^[^>]*>([\s\S]*?)<\/div>/.exec(block);
    if (!body) continue;
    const text = stripTags(body[1] ?? "").replace(/^\d+\s*-\s*/, "").replace(/\s*\.\s*$/, "").trim();
    out.push({
      text,
      narrator: field(block, "الراوي").replace(/^-$/, ""),
      grader: field(block, "المحدث"),
      source: field(block, "المصدر"),
      number: field(block, "الصفحة أو الرقم"),
      grade: field(block, "خلاصة حكم المحدث"),
    });
  }
  return out;
}

export function isAuthenticGrade(grade: string): boolean {
  return ACCEPTED_GRADE.test(grade) && !REJECTED_GRADE.test(grade);
}

/** The two sahih collections first, then other sources, in search order. */
function rank(item: HadithEvidence): number {
  if (/صحيح البخاري|صحيح مسلم/.test(item.source)) return 0;
  if (/البخاري|مسلم/.test(item.grade)) return 1;
  return 2;
}

/** Words that carry meaning, as skeletons, for comparing two texts. */
export function contentWords(text: string): Set<string> {
  return new Set(text.split(/\s+/).map((word) => skeleton(word)).filter((word) => word.length > 2));
}

/** Share of the smaller text's words that also appear in the other. */
function overlap(a: Set<string>, b: Set<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size === 0) return 0;
  let shared = 0;
  small.forEach((word) => { if (large.has(word)) shared += 1; });
  return shared / small.size;
}

/**
 * The encyclopedia also lists entries that describe a narration instead of
 * quoting it ("the hadith about ...", bracketed editorial notes, elided text).
 * Only a plain quotation of the wording can be shown as a hadith.
 */
function isPlainNarration(text: string): boolean {
  return !/[[\]…]|\.\.\.|يعني حديث|^حديث\s|^قصة\s|^أثر\s|الحديث\s*$/.test(text);
}

function cleanNarration(text: string): string {
  return text.replace(/^[\s«"“”'‘’(]+|[\s»"“”'‘’).]+$/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Keep authentic, complete narrations, best sources first, and only one of
 * each: the encyclopedia returns the same hadith many times, once per book
 * that reports it, and showing several of those reads as repetition.
 */
export function selectAuthentic(results: HadithEvidence[], limit: number, preferComplete = false): HadithEvidence[] {
  const kept: Array<{ item: HadithEvidence; words: Set<string> }> = [];
  const ordered = results
    .map((item, index) => ({ item: { ...item, text: cleanNarration(item.text) }, index }))
    // Normally the shortest sound narration reads best. When the wording
    // itself was asked for, the fullest one is wanted.
    .sort((a, b) => rank(a.item) - rank(b.item)
      || (preferComplete ? b.item.text.length - a.item.text.length : a.item.text.length - b.item.text.length)
      || a.index - b.index);
  const maxChars = preferComplete ? MAX_COMPLETE_TEXT_CHARS : MAX_TEXT_CHARS;
  for (const { item } of ordered) {
    if (!item.source || !isAuthenticGrade(item.grade)) continue;
    if (item.text.length > maxChars || !isPlainNarration(item.text)) continue;
    if (skeleton(item.text).length < MIN_TEXT_SKELETON) continue;
    const words = contentWords(item.text);
    if (kept.some((other) => overlap(words, other.words) >= SAME_NARRATION_OVERLAP)) continue;
    kept.push({ item, words });
    if (kept.length >= limit) break;
  }
  return kept.map((entry) => entry.item);
}

/** Drop narrations that repeat one another across several searches. */
export function distinctNarrations(items: HadithEvidence[], limit: number): HadithEvidence[] {
  const kept: Array<{ item: HadithEvidence; words: Set<string> }> = [];
  for (const item of items) {
    const words = contentWords(item.text);
    if (kept.some((other) => overlap(words, other.words) >= SAME_NARRATION_OVERLAP)) continue;
    kept.push({ item, words });
    if (kept.length >= limit) break;
  }
  return kept.map((entry) => entry.item);
}

export function formatHadithAttribution(item: HadithEvidence): string {
  const parts = [
    item.narrator ? `الراوي: ${item.narrator}` : "",
    `المصدر: ${item.source}${item.number ? ` (${item.number})` : ""}`,
    `الدرجة: ${item.grade}${item.grader ? ` — ${item.grader}` : ""}`,
  ].filter(Boolean);
  return `— ${parts.join(" | ")}`;
}

/** Turn a model-written query into safe search keywords. */
export function cleanHadithQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ")
    .slice(0, 120);
}
