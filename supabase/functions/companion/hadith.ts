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
const MAX_TEXT_CHARS = 450;
const MIN_TEXT_SKELETON = 12;

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

/** Keep authentic, complete, distinct narrations; best sources first. */
export function selectAuthentic(results: HadithEvidence[], limit: number): HadithEvidence[] {
  const seen = new Set<string>();
  const kept: HadithEvidence[] = [];
  const ordered = results
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index);
  for (const { item } of ordered) {
    if (!item.source || !isAuthenticGrade(item.grade)) continue;
    if (item.text.length > MAX_TEXT_CHARS) continue;
    const key = skeleton(item.text);
    if (key.length < MIN_TEXT_SKELETON) continue;
    const fingerprint = key.slice(0, 60);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    kept.push(item);
    if (kept.length >= limit) break;
  }
  return kept;
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
