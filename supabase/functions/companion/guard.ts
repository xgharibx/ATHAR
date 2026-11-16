import { type HadithEvidence, formatHadithAttribution } from "./hadith.ts";
import { type QuranCorpus, formatQuranPassage } from "./quran.ts";
import { normalizeSourceLinks } from "./sources.ts";
import { arabicWordCount, skeleton, toLatinDigits } from "./text.ts";

/**
 * The reply guard: nothing is shown as Quran or as a hadith unless it was
 * checked.
 *
 * The model's text passes through here on its way to the reader.
 *   - A verse, whether named by reference or typed out, is replaced with the
 *     exact text from the Quran corpus. A "verse" that is not in the corpus
 *     is removed.
 *   - A hadith is shown only if it is one of the authentic narrations gathered
 *     for this question (its wording is then taken from that source, not from
 *     the model), or appears word for word in the trusted material supplied
 *     with the request. Any other hadith quotation is removed.
 *
 * Text arrives in fragments. Ordinary prose is released word by word; anything
 * that might be a quotation or a citation block is held until it is complete
 * and has been checked.
 */

export type GuardContext = {
  quran: QuranCorpus | null;
  hadith: HadithEvidence[];
  /** Other trusted passages: the app's own library excerpts and web excerpts. */
  trustedTexts: string[];
  /** Addresses returned by the trusted-source search; the only links a reply may carry. */
  sourceUrls?: string[];
  /**
   * The user's own recent messages. A narration the user quoted may be
   * repeated back in a sentence (to say, for instance, that it is not
   * authentic), but is never presented as a verified hadith block.
   */
  userTexts?: string[];
};

export const REMOVED_HADITH_NOTE = "(حُذف نصٌّ منسوب إلى السنة لم يُوثَّق)";
export const REMOVED_VERSE_NOTE = "(حُذف نصٌّ لم يطابق المصحف)";

const BLOCK_OPEN = /^[ \t]*:{2,}[ \t]*(verse|hadith)[ \t]*(?:\(([^)\n]*)\))?[ \t]*:?[ \t]*$/i;
const BLOCK_CLOSE = /^[ \t]*:{2,}[ \t]*$/;
const ANY_BLOCK_OPEN = /^[ \t]*:{2,}[ \t]*[a-z]+/i;
const MAX_BLOCK_LINES = 40;
const MIN_HADITH_SKELETON = 12;
const MIN_QUOTED_WORDS = 4;
const MIN_REPEAT_SKELETON = 30;
/** Three or more consecutive tokens that contain no letters at all. */
const JUNK_RUN = /(?:(?:^|\s)[^\p{L}\s]{1,8}(?=\s|$)){3,}|\[\]/u;
// The last alternative is a quotation that was opened and never closed.
const QUOTE_PAIRS = /«([^»\n]{1,2000})»|“([^”\n]{1,2000})”|"([^"\n]{1,2000})"|«([^»\n]{1,2000})$/g;
const VERSE_PAIRS = /﴿([^﴾\n]{1,4000})﴾/g;
const PROPHETIC_ATTRIBUTION =
  /ﷺ|صلى الله عليه وسلم|عليه الصلاة والسلام|النبي|رسول الله|الرسول|المصطفى|حديث|رواه|أخرجه|متفق عليه|البخاري|مسلم|الترمذي|أبو داود|أبي داود|النسائي|ابن ماجه|مسند أحمد|الإمام أحمد|الموطأ|في الصحيحين|في الصحيح|في السنن/;
const EVIDENCE_ID = /(^|[ \t]+|[([،:])[[(]?[Hh]\d{1,2}[\])]?(?=$|[\s.,،؛:)\]])/g;

type OpenBlock = { kind: "verse" | "hadith"; reference: string; lines: string[] };

export class ReplyGuard {
  private pending = "";
  private block: OpenBlock | null = null;
  /** Text of the current prose line already released, for attribution context. */
  private lineContext = "";
  /** Set when the model's output broke down mid-line; the rest of that line is dropped. */
  private droppingLine = false;
  private readonly seenSentences = new Set<string>();
  private readonly hadithSkeletons: string[];
  private readonly trustedSkeletons: string[];
  private readonly userSkeletons: string[];

  readonly allowedSourceUrls: ReadonlySet<string>;

  constructor(private readonly context: GuardContext) {
    this.allowedSourceUrls = new Set(context.sourceUrls ?? []);
    this.userSkeletons = (context.userTexts ?? []).map((text) => skeleton(text)).filter((text) => text.length > 0);
    this.hadithSkeletons = context.hadith.map((item) => skeleton(item.text));
    this.trustedSkeletons = context.trustedTexts.map((text) => skeleton(text)).filter((text) => text.length > 0);
  }

  push(fragment: string): string {
    this.pending += fragment;
    let out = "";
    for (;;) {
      const newline = this.pending.indexOf("\n");
      if (newline < 0) break;
      const line = this.pending.slice(0, newline).replace(/\r$/, "");
      this.pending = this.pending.slice(newline + 1);
      out += this.completeLine(line);
    }
    if (!this.block) out += this.releasePartialProse();
    return out;
  }

  flush(): string {
    let out = "";
    if (this.pending) {
      const line = this.pending;
      this.pending = "";
      out += this.completeLine(line, false);
    }
    if (this.block) out += this.closeBlock();
    return out;
  }

  private completeLine(line: string, withNewline = true): string {
    const end = withNewline ? "\n" : "";
    if (this.block) {
      if (BLOCK_CLOSE.test(line)) return this.closeBlock();
      if (ANY_BLOCK_OPEN.test(line)) return this.closeBlock() + this.completeLine(line, withNewline);
      this.block.lines.push(line);
      return this.block.lines.length >= MAX_BLOCK_LINES ? this.closeBlock() : "";
    }
    const context = this.lineContext;
    this.lineContext = "";
    const open = context ? null : BLOCK_OPEN.exec(line);
    if (open) {
      this.block = { kind: open[1]!.toLowerCase() as "verse" | "hadith", reference: (open[2] ?? "").trim(), lines: [] };
      return "";
    }
    const out = this.filterSentences(this.checkProse(line, context));
    this.droppingLine = false;
    return out + end;
  }

  /** Release the part of an unfinished prose line that cannot change meaning. */
  private releasePartialProse(): string {
    const text = this.pending;
    if (!text) return "";
    // A line that starts with a colon may still become a block marker.
    if (!this.lineContext && /^[ \t]*:/.test(text)) return "";
    if (!this.lineContext && /^[ \t]*$/.test(text)) return "";
    const quoteStart = text.search(/[«“"﴿]/);
    const limit = quoteStart >= 0 ? quoteStart : text.length;
    // Release whole sentences only, so each can be checked before it is shown.
    const head = text.slice(0, limit);
    let cut = -1;
    for (const match of head.matchAll(/[.!؟؛](?=\s)/g)) cut = match.index + 1;
    if (cut <= 0) return "";
    const ready = text.slice(0, cut);
    this.pending = text.slice(cut);
    this.lineContext = (this.lineContext + ready).slice(-200);
    return this.filterSentences(cleanMarkers(ready));
  }

  /**
   * Drop what the model sometimes produces when its output breaks down: a run
   * of stray punctuation followed by a restart of the answer, and sentences it
   * has already written.
   */
  private filterSentences(text: string): string {
    if (this.droppingLine) return "";
    const junk = JUNK_RUN.exec(text);
    let usable = text;
    if (junk) {
      usable = text.slice(0, junk.index);
      // Keep only complete sentences that came before the breakdown.
      const lastEnd = Math.max(usable.lastIndexOf("."), usable.lastIndexOf("؟"), usable.lastIndexOf("!"), usable.lastIndexOf("؛"));
      usable = lastEnd >= 0 ? usable.slice(0, lastEnd + 1) : "";
      this.droppingLine = true;
    }
    return usable
      .split(/(?<=[.!؟؛])(?=\s)/)
      .filter((sentence) => {
        const key = skeleton(sentence);
        if (key.length < MIN_REPEAT_SKELETON) return true;
        if (this.seenSentences.has(key)) return false;
        this.seenSentences.add(key);
        return true;
      })
      .join("");
  }

  private checkProse(line: string, contextBefore: string): string {
    let text = line.replace(VERSE_PAIRS, (_match, inner: string) => this.checkedVerseQuote(inner));
    text = text.replace(QUOTE_PAIRS, (match: string, a: string | undefined, b: string | undefined, c: string | undefined, d: string | undefined, offset: number) => {
      const inner = a ?? b ?? c ?? d ?? "";
      if (arabicWordCount(inner) < MIN_QUOTED_WORDS) return match;
      const quoted = skeleton(inner);
      if (this.matchHadith(quoted, inner) >= 0 || this.inTrustedTexts(quoted)) return match;
      if (quoted.length >= MIN_HADITH_SKELETON && this.userSkeletons.some((text) => text.includes(quoted))) return match;
      const verse = this.context.quran?.findQuote(inner);
      if (verse) return `﴿${verse.text}﴾`;
      const at = offset;
      const around = contextBefore.slice(-160) + line.slice(Math.max(0, at - 160), at) +
        line.slice(at + match.length, at + match.length + 80);
      return PROPHETIC_ATTRIBUTION.test(around) ? REMOVED_HADITH_NOTE : match;
    });
    return cleanMarkers(text);
  }

  private checkedVerseQuote(inner: string): string {
    const passage = this.context.quran?.findQuote(inner);
    return passage ? `﴿${passage.text}﴾` : REMOVED_VERSE_NOTE;
  }

  private closeBlock(): string {
    const block = this.block!;
    this.block = null;
    return (block.kind === "verse" ? this.verseBlock(block) : this.hadithBlock(block)) + "\n";
  }

  private verseBlock(block: OpenBlock): string {
    const quran = this.context.quran;
    if (!quran) return REMOVED_VERSE_NOTE;
    const body = block.lines.join(" ");
    const inline = /(\d{1,3}\s*[:：]\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)/.exec(toLatinDigits(block.reference));
    let passage = inline ? quran.byReference(inline[1]!) : null;
    if (!passage) {
      const marked = /﴿([^﴾]+)﴾/.exec(body);
      const typed = (marked ? marked[1]! : body.replace(/[—–-]\s*سورة[\s\S]*$/, "")).trim();
      passage = typed ? quran.findQuote(typed) : null;
    }
    return passage ? `:::verse\n${formatQuranPassage(passage)}\n:::` : REMOVED_VERSE_NOTE;
  }

  private hadithBlock(block: OpenBlock): string {
    const body = block.lines.join("\n");
    const id = /(?:[Hh]|ح)\s*(\d{1,2})/.exec(toLatinDigits(block.reference));
    let index = id ? Number(id[1]) - 1 : -1;
    if (index < 0 || index >= this.context.hadith.length) {
      const marked = /[«“"]([^»”"]+)[»”"]/.exec(body);
      const typed = (marked ? marked[1]! : body.replace(/\n?[ \t]*[—–-][\s\S]*$/, "")).trim();
      const quoted = skeleton(typed);
      index = this.matchHadith(quoted, typed);
      if (index < 0) {
        if (!this.inTrustedTexts(quoted)) return REMOVED_HADITH_NOTE;
        // Word for word from the app's own library: keep the wording, and drop
        // any grading line the model may have attached to it.
        const kept = block.lines.filter((line) => !/الدرجة\s*:/.test(line)).join("\n").trim();
        return `:::hadith\n${cleanMarkers(kept)}\n:::`;
      }
    }
    const item = this.context.hadith[index]!;
    return `:::hadith\n«${item.text}»\n${formatHadithAttribution(item)}\n:::`;
  }

  /** Index of the gathered narration this quotation is, or -1. */
  private matchHadith(quoted: string, original: string): number {
    if (quoted.length < MIN_HADITH_SKELETON) return -1;
    for (let index = 0; index < this.hadithSkeletons.length; index += 1) {
      const candidate = this.hadithSkeletons[index]!;
      if (candidate.includes(quoted) || (candidate.length >= MIN_HADITH_SKELETON && quoted.includes(candidate))) return index;
    }
    // Near match: almost every word of the quotation is in one narration, in
    // a text of similar length. The reader is shown the narration itself, so
    // accepting a paraphrase here can never put the model's wording on screen.
    const words = original.split(/\s+/).map((word) => skeleton(word)).filter((word) => word.length > 1);
    if (words.length < MIN_QUOTED_WORDS) return -1;
    for (let index = 0; index < this.context.hadith.length; index += 1) {
      const candidateWords = new Set(
        this.context.hadith[index]!.text.split(/\s+/).map((word) => skeleton(word)).filter((word) => word.length > 1),
      );
      const shared = words.filter((word) => candidateWords.has(word)).length;
      const ratio = quoted.length / Math.max(1, this.hadithSkeletons[index]!.length);
      if (shared / words.length >= 0.8 && ratio >= 0.4 && ratio <= 1.8) return index;
    }
    return -1;
  }

  private inTrustedTexts(quoted: string): boolean {
    return quoted.length >= MIN_HADITH_SKELETON && this.trustedSkeletons.some((text) => text.includes(quoted));
  }
}

const FOREIGN_LETTERS = /[A-Za-z\u00C0-\u024F\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]+/g;

/** A token whose non-Arabic letters are structural and must be kept. */
function isStructuralToken(token: string): boolean {
  return /^:{2,}/.test(token) || token.includes("://") || /^[[(]?\/[a-z0-9/_-]*[\])]?[.,،؛:]?$/i.test(token);
}

/**
 * Tidy released prose: drop evidence labels the model may echo, and drop
 * stray words in other scripts, which this model sometimes emits mid-sentence.
 * Block markers, in-app routes and source links are left intact.
 */
function cleanMarkers(text: string): string {
  const withoutLabels = text.replace(EVIDENCE_ID, (_match, before: string) => (/^[ \t]*$/.test(before) ? "" : before));
  return withoutLabels
    .split(/(\s+)/)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      // In a markdown link, clean the visible label but never the address.
      const link = part.indexOf("](");
      if (link >= 0 && part.includes("://")) return part.slice(0, link).replace(FOREIGN_LETTERS, "") + part.slice(link);
      return isStructuralToken(part) ? part : part.replace(FOREIGN_LETTERS, "");
    })
    .join("");
}

/** Signs that the model's output broke down: stray punctuation runs, or punctuation from another script. */
const BREAKDOWN = /(?:(?:^|\s)[^\p{L}\s:]{1,8}(?=\s|$)){3,}|\[\]|[\u3000-\u303F\uFF00-\uFFEF]|^[^\p{L}:]{3,}$/u;
const MIN_ATTEMPT_SKELETON = 40;

/**
 * When this model's output breaks down it usually starts the answer again, so
 * a raw reply can hold several attempts separated by noise. Split the reply at
 * each breakdown and keep one clean attempt: the last, unless it was cut short.
 */
export function selectCleanAttempt(text: string): string {
  const attempts: string[] = [];
  let current: string[] = [];
  const close = () => {
    // An attempt that follows noise often starts with a few stray characters.
    const attempt = current.join("\n").trim().replace(/^[^\p{L}:«﴿*#\-٠-٩]+/u, "");
    if (attempt) attempts.push(attempt);
    current = [];
  };
  for (const line of text.split(/\r?\n/)) {
    const broken = BREAKDOWN.exec(line);
    if (!broken) {
      current.push(line);
      continue;
    }
    const before = line.slice(0, broken.index);
    const lastEnd = Math.max(before.lastIndexOf("."), before.lastIndexOf("؟"), before.lastIndexOf("!"), before.lastIndexOf("؛"));
    if (lastEnd >= 0) current.push(before.slice(0, lastEnd + 1));
    close();
    // Whatever follows the noise on the same line opens the next attempt.
    let rest = line.slice(broken.index + broken[0].length);
    for (let next = BREAKDOWN.exec(rest); next; next = BREAKDOWN.exec(rest)) rest = rest.slice(next.index + next[0].length);
    rest = rest.replace(/^[^\p{L}:«﴿*]+/u, "");
    if (rest.trim()) current.push(rest);
  }
  close();
  const sized = attempts.map((attempt) => ({ attempt, size: skeleton(attempt).length }));
  const usable = sized.filter((entry) => entry.size >= MIN_ATTEMPT_SKELETON);
  if (usable.length === 0) return attempts.join("\n\n");
  const longest = usable.reduce((a, b) => (b.size > a.size ? b : a));
  const last = usable[usable.length - 1]!;
  return (last.size >= longest.size * 0.5 ? last : longest).attempt;
}

/** Clean and verify a complete reply. */
export function finalizeReply(text: string, guard: ReplyGuard): string {
  const checked = guard.push(selectCleanAttempt(text)) + guard.flush();
  return normalizeSourceLinks(checked, guard.allowedSourceUrls)
    .replace(/[ \t]{2,}/g, " ")
    // A "sources" line whose links were all removed has nothing left to say.
    .replace(/^[ \t*]*المصادر[ \t*]*:[ \t*،,]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const UNAVAILABLE_REPLY = "تعذَّر إعداد جوابٍ موثوقٍ لهذا السؤال الآن. أعد المحاولة بعد قليل، أو صُغ سؤالك بطريقة أخرى.";

/**
 * Whether a raw reply is worth cleaning: it must be written in Arabic. A reply
 * that drifted into another language would be reduced to fragments.
 */
export function isUsableReply(text: string): boolean {
  if (!text.trim()) return true; // nothing to show, for example a reply that is only a tool call
  const prose = text.replace(/https?:\/\/\S+/g, " ").replace(/^[ \t]*:{2,}.*$/gm, " ");
  const arabic = (prose.match(/[\u0621-\u064A]/g) ?? []).length;
  const foreign = (prose.match(/[A-Za-z\u00C0-\u024F\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/g) ?? []).length;
  return arabic >= 4 && arabic >= foreign * 3;
}
