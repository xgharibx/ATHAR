/**
 * Reading the verified evidence blocks in an assistant reply, and turning a
 * reply into clean text.
 *
 * The server writes every verse and hadith it has checked in a fixed form
 * (supabase/functions/companion/quran.ts, hadith.ts):
 *
 *   :::verse
 *   ﴿…﴾ — سورة البقرة: ٢٥٥
 *   :::
 *
 *   :::hadith
 *   «…»
 *   — الراوي: أبو هريرة | المصدر: صحيح البخاري (1985) | الدرجة: صحيح — البخاري
 *   :::
 *
 * The chat shows the text large and the attribution as a small footer, so
 * the two are separated here. Anything that does not follow the form is
 * shown as it is.
 */
import { splitIntoSegments } from "@/lib/companionBlocks";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export function toArabicDigits(value: string): string {
  return value.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]!);
}

export type HadithParts = {
  text: string;
  narrator?: string;
  source?: string;
  number?: string;
  grade?: string;
  grader?: string;
};

export type VerseParts = { text: string; surah?: string; ayah?: string };

/** "صحيح" and "حسن" (and their forms) are accepted grades; anything weaker is not. */
export function isAcceptedGrade(grade: string | undefined): boolean {
  if (!grade) return false;
  if (/ضعيف|موضوع|منكر|باطل|لا يصح|لا أصل|شاذ|مكذوب/.test(grade)) return false;
  return /صحيح|حسن|ثابت/.test(grade);
}

export function parseHadithBlock(body: string): HadithParts {
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);
  const attributionIndex = lines.findIndex((line) => /^—\s*(الراوي|المصدر|الدرجة)\s*:/.test(line));
  if (attributionIndex < 0) return { text: body.trim() };
  const text = lines.slice(0, attributionIndex).join("\n");
  const parts: HadithParts = { text };
  for (const piece of lines[attributionIndex]!.replace(/^—\s*/, "").split("|")) {
    const match = /^\s*(الراوي|المصدر|الدرجة)\s*:\s*(.+?)\s*$/.exec(piece);
    if (!match) continue;
    const [, key, value] = match;
    if (key === "الراوي") parts.narrator = value;
    if (key === "المصدر") {
      const numbered = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(value!);
      parts.source = numbered ? numbered[1]!.trim() : value;
      if (numbered) parts.number = toArabicDigits(numbered[2]!.trim());
    }
    if (key === "الدرجة") {
      const [grade, grader] = value!.split(/\s+—\s+/);
      parts.grade = grade?.trim().replace(/^\[\s*|\s*\]$/g, "");
      if (grader?.trim()) parts.grader = grader.trim();
    }
  }
  return parts;
}

const BOOK_KEYS: [RegExp, string][] = [
  [/البخاري/, "bukhari"],
  [/مسلم/, "muslim"],
  [/أب(?:و|ي)\s*داود/, "abudawud"],
  [/الترمذي/, "tirmidhi"],
  [/النسائي/, "nasai"],
  [/ابن\s*ماجه?/, "ibnmajah"],
  [/موطأ|مالك/, "malik"],
  [/الأربعين?\s+النووية/, "nawawi"],
];

/**
 * Where a cited hadith opens in the app: «صحيح مسلم (١١٤٤)» →
 * «/hadith/muslim?ref=1144», the book opened at that printed number.
 * Null for books the app does not carry, or without a number.
 */
export function hadithAppLink(parts: Pick<HadithParts, "source" | "number">): string | null {
  if (!parts.source || !parts.number) return null;
  const key = BOOK_KEYS.find(([re]) => re.test(parts.source!))?.[1];
  const digits = parts.number.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const n = /^\d+/.exec(digits)?.[0];
  return key && n && Number(n) > 0 ? `/hadith/${key}?ref=${n}` : null;
}

export function parseVerseBlock(body: string): VerseParts {
  const match = /^([\s\S]*﴾)\s*—\s*سورة\s+([^:]+?)\s*:\s*([٠-٩0-9\-–]+)\s*$/.exec(body.trim());
  if (!match) return { text: body.trim() };
  return { text: match[1]!.trim(), surah: match[2]!.trim(), ayah: toArabicDigits(match[3]!.trim()) };
}

/** Trusted-source links on a line of their own: "المصادر: [اسم](رابط)، …". */
export type SourceLink = { name: string; url: string };
const SOURCES_LINE = /^[ \t*]*(?:ومن )?المصادر[ \t*]*:[ \t]*(.*)$/m;
const MARKDOWN_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Splits the sources line off a text segment, so it can be shown as chips. */
export function extractSources(text: string): { text: string; sources: SourceLink[] } {
  const match = SOURCES_LINE.exec(text);
  if (!match) return { text, sources: [] };
  const sources: SourceLink[] = [];
  for (const link of match[1]!.matchAll(MARKDOWN_LINK)) sources.push({ name: link[1]!.trim(), url: link[2]! });
  if (sources.length === 0) return { text, sources: [] };
  return { text: (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim(), sources };
}

function plainMarkdown(text: string): string {
  return text
    .replace(MARKDOWN_LINK, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/**
 * A reply as someone would want to copy, share or keep it: the words, the
 * verses and hadith with their attribution in brackets, the sources by name.
 * No block markers, no links, no buttons, no reminder data.
 */
export function replyToPlainText(raw: string): string {
  const out: string[] = [];
  for (const segment of splitIntoSegments(raw)) {
    if (segment.kind === "action") continue;
    if (segment.kind === "text") {
      const { text, sources } = extractSources(segment.text);
      const body = plainMarkdown(text);
      if (body) out.push(body);
      if (sources.length > 0) out.push(`المصادر: ${sources.map((source) => source.name).join("، ")}`);
      continue;
    }
    if (segment.calloutKind === "hadith") {
      const parts = parseHadithBlock(segment.text);
      const attribution = [parts.narrator ? `رواه ${parts.narrator}` : "", parts.source ? `${parts.source}${parts.number ? ` ${parts.number}` : ""}` : "", parts.grade ?? ""]
        .filter(Boolean)
        .join("، ");
      out.push(attribution ? `${parts.text}\n(${attribution})` : parts.text);
    } else if (segment.calloutKind === "verse") {
      const parts = parseVerseBlock(segment.text);
      out.push(parts.surah ? `${parts.text} [${parts.surah}: ${parts.ayah}]` : parts.text);
    } else if (segment.calloutKind === "cite") {
      continue;
    } else {
      out.push(plainMarkdown(segment.text));
    }
  }
  return out.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
