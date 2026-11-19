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
const LONG_QUOTE_WORDS = 12;
const LITURGICAL_OPENING = /^(?:اللهم|اللَّهم|اللّهم|ربنا|ربَّنا|ربِّ|رب\s|سبحان|بسم الله|باسمك|بسمك|أعوذ|استغفر|أستغفر|لا إله إلا|الحمد لله الذي)/;
/** A tip is practical advice. One that states a virtue, a ruling or a count is a religious claim and is dropped. */
const TIP_CLAIM = /حرز|فضل|اجر|ثواب|يكفر|يغفر|غفر|مستحب|واجب|يجوز|حرام|مكروه|بدعه|ايات|ايه |ايتين|ركعتين|ركعات|حديث|السنه|سنه |\d|[٠-٩]|ثلاث|اربع|خمس|سبع|عشر|مئه|الف/;
const MIN_REPEAT_SKELETON = 30;
/** A reply quotes one piece of evidence; a second is tolerated, no more. */
const MAX_BLOCKS_PER_KIND = 2;
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
  /** Citation blocks already shown, so the same text is never shown twice. */
  private readonly shownBlocks = new Set<string>();
  private hadithBlocksShown = 0;
  private verseBlocksShown = 0;
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
      // In running text the model's own wording stays on screen, so only an
      // exact quotation of a gathered narration is accepted here. A near
      // match is a misquotation and is removed.
      if (this.matchHadithExact(quoted) >= 0 || this.inTrustedTexts(quoted)) return match;
      if (this.resemblesHadith(inner)) return REMOVED_HADITH_NOTE;
      if (quoted.length >= MIN_HADITH_SKELETON && this.userSkeletons.some((text) => text.includes(quoted))) return match;
      const verse = this.context.quran?.findQuote(inner);
      if (verse) return `﴿${verse.text}﴾`;
      const at = offset;
      const around = contextBefore.slice(-160) + line.slice(Math.max(0, at - 160), at) +
        line.slice(at + match.length, at + match.length + 80);
      // A supplication or a long passage in quotation marks is being presented
      // as someone's exact words. Unverified, it is removed even when the
      // sentence around it names no source.
      const presentedAsText = LITURGICAL_OPENING.test(inner.trim()) || arabicWordCount(inner) >= LONG_QUOTE_WORDS;
      return PROPHETIC_ATTRIBUTION.test(around) || presentedAsText ? REMOVED_HADITH_NOTE : match;
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
    const out = block.kind === "verse" ? this.verseBlock(block) : this.hadithBlock(block);
    // A repeated or surplus citation is dropped without leaving a gap.
    return out ? `${out}\n` : "";
  }

  /** Allow a citation block once, and only a few of each kind in one reply. */
  private admit(kind: "verse" | "hadith", key: string, rendered: string): string {
    if (this.shownBlocks.has(key)) return "";
    if (kind === "hadith" ? this.hadithBlocksShown >= MAX_BLOCKS_PER_KIND : this.verseBlocksShown >= MAX_BLOCKS_PER_KIND) return "";
    this.shownBlocks.add(key);
    if (kind === "hadith") this.hadithBlocksShown += 1;
    else this.verseBlocksShown += 1;
    return rendered;
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
    if (!passage) return REMOVED_VERSE_NOTE;
    return this.admit("verse", `v${passage.surah}:${passage.from}-${passage.to}`, `:::verse\n${formatQuranPassage(passage)}\n:::`);
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
        return this.admit("hadith", `t${quoted.slice(0, 60)}`, `:::hadith\n${cleanMarkers(kept)}\n:::`);
      }
    }
    const item = this.context.hadith[index]!;
    return this.admit("hadith", `h${index}`, `:::hadith\n«${item.text}»\n${formatHadithAttribution(item)}\n:::`);
  }

  /** Index of the gathered narration that contains this quotation word for word, or -1. */
  private matchHadithExact(quoted: string): number {
    if (quoted.length < MIN_HADITH_SKELETON) return -1;
    return this.hadithSkeletons.findIndex((candidate) => candidate.includes(quoted));
  }

  /** Whether a quotation shares at least half its words with a gathered narration. */
  private resemblesHadith(original: string): boolean {
    const words = original.split(/\s+/).map((word) => skeleton(word)).filter((word) => word.length > 1);
    if (words.length < MIN_QUOTED_WORDS) return false;
    return this.context.hadith.some((item) => {
      const candidate = new Set(item.text.split(/\s+/).map((word) => skeleton(word)).filter((word) => word.length > 1));
      return words.filter((word) => candidate.has(word)).length / words.length >= 0.5;
    });
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
/** Stands in for a word the model wrote in another script. The clause that holds it is dropped later. */
export const GARBLED = "\uFFFC";

/** A token whose non-Arabic letters are structural and must be kept. */
function isStructuralToken(token: string): boolean {
  return /^:{2,}/.test(token) || token.includes("://") || /^[[(]?\/[a-z0-9/_-]*[\])]?[.,،؛:]?$/i.test(token);
}

/**
 * Drop evidence labels the model may echo, and mark stray words in other
 * scripts, which this model sometimes emits mid-sentence. Block markers,
 * in-app routes and source links are left intact.
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
      return isStructuralToken(part) ? part : part.replace(FOREIGN_LETTERS, GARBLED);
    })
    .join("");
}

/** Signs that the model's output broke down: stray punctuation runs, or punctuation from another script. */
const BREAKDOWN = /(?:(?:^|\s)[^\p{L}\s:]{1,8}(?=\s|$)){3,}|\[\]|[\u3000-\u303F\uFF00-\uFFEF]|^[^\p{L}:]{3,}$/u;
const MIN_ATTEMPT_SKELETON = 20;

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

const SENTENCE_END = /(?<=[.!؟])(?=\s|$)/;
const CLAUSE_END = /(?<=[،؛:])/;
const COLLECTION_ATTRIBUTION =
  /رواه|اخرجه|متفق عليه|في الصحيحين|صحيح البخاري|صحيح مسلم|عند البخاري|عند مسلم|البخاري ومسلم|الترمذي|ابو داود|ابي داود|النسائي|ابن ماجه|مسند احمد|في الموطا|في السنن/;
const PROPHET = /النبي|رسول الله|الرسول|المصطفي|نبينا|ﷺ|صلي الله عليه وسلم/;
/** Ordinary devotional wording that names the Prophet without reporting anything from him. */
const DEVOTIONAL =
  /(?:الصلاه|الصلوات|صل|صلوا|فصل|وصل|تصلي|نصلي|صلاتك|الصلاه والسلام)\s+علي\s+(?:النبي|رسول الله|الرسول|نبينا|المصطفي)|(?:اتباع|باتباع|اقتداء|بالاقتداء|اقتد|سنه|بسنه|هدي|بهدي|محبه|حب|طاعه|نصره|شفاعه|مولد|هجره|سيره)\s+(?:النبي|رسول الله|الرسول|نبينا|المصطفي)/;
const REPORT_VERB = /(?:^|\s)و?(?:قد\s+)?(?:ثبت|ورد|صح|روي|جاء|ذكر)\s+(?:عن|ان|في|عنه|انه)/;
const REPORT_SUBJECT = /حديث|السنه|الصحاب/;
export const REMOVAL_FOOTNOTE = "ملاحظة: حُذف من هذا الجواب نصٌّ لم يمكن توثيقه من مصدر معتمد.";

/** Plain letters for matching wording: no vowel marks, one spelling of alif, ya and ta marbuta. */
function plain(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

/**
 * A clause that reports what the Prophet said or did, or cites a hadith
 * collection. Any mention of the Prophet counts unless it is plainly
 * devotional (sending blessings on him, following his way): a clause such as
 * "he used to order ..." is a hadith told in other words, in whatever order
 * the words come.
 */
function isNarrationClause(clause: string): boolean {
  const text = plain(clause);
  if (COLLECTION_ATTRIBUTION.test(text) || /في الحديث/.test(text)) return true;
  if (PROPHET.test(text) && !DEVOTIONAL.test(text)) return true;
  return REPORT_VERB.test(text) && REPORT_SUBJECT.test(text);
}

export type FinalReply = {
  text: string;
  /** Clauses and sentences dropped because the model's wording was unusable or unverifiable. */
  damage: number;
};

/**
 * Tidy the model's own sentences after citations have been verified.
 *
 * A reply is prose plus citation blocks. The blocks are already exact. In the
 * prose, three things are removed rather than shown:
 *   - a clause holding a word in another script: the model's wording broke
 *     there, and a sentence with a hole in it reads as nonsense;
 *   - a statement that reports the Prophet's words or deeds, or names a hadith
 *     collection, in the model's own words. Such a report is a hadith in all
 *     but form, and only verified text may be presented as one;
 *   - a sentence whose quotation failed verification.
 */
/** A line of the model's plan rather than its answer ("فقرة ١: …", "ختام بدعاء + نصيحة"). */
const PLAN_LINE = /^[ \t*]*(?:ال)?فقرة[ \t]*(?:[٠-٩0-9]+|الأولى|الثانية|الثالثة|الرابعة|الأخيرة|عن)(?=[ \t:：.]|$)|^[^\n]{0,40}\+[^\n]{0,40}$/;
/** A tip written out in prose, when the reply also has the tip in its own block. */
const PROSE_TIP = /^[ \t*]*(?:نصيحة(?:\s+عملية)?|النصيحة)[ \t*]*:/;
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

function tidyProse(checked: string): { text: string; damage: number; removed: number } {
  let damage = 0;
  let removed = 0;
  const out: string[] = [];
  const hasTipBlock = /^[ \t]*:{2,}[ \t]*tip\b/im.test(checked);
  const lines = checked.split("\n").map((line) => (/^[ \t]*:{2,}/.test(line) ? line : line.replace(EMOJI, "").replace(/[ \t]+$/, "")));
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (/^[ \t]*:{2,}[ \t]*[a-z]+/i.test(line)) {
      // A block: copy it through its closing marker.
      const kind = /^[ \t]*:{2,}[ \t]*([a-z]+)/i.exec(line)![1]!.toLowerCase();
      const block = [line];
      while (index + 1 < lines.length) {
        index += 1;
        block.push(lines[index]!);
        if (BLOCK_CLOSE.test(lines[index]!)) break;
      }
      const body = block.slice(1, -1).join("\n");
      const verified = kind === "verse" || kind === "hadith";
      // A tip or dua the model garbled, or filled with a report, is dropped whole.
      if (!verified && (body.includes(GARBLED) || body.includes(REMOVED_HADITH_NOTE) || body.includes(REMOVED_VERSE_NOTE) || !body.trim()
        || (kind === "tip" && (isNarrationClause(body) || TIP_CLAIM.test(plain(body)))))) {
        damage += 1;
        continue;
      }
      out.push(...block);
      continue;
    }
    if (line.trim() === REMOVED_HADITH_NOTE || line.trim() === REMOVED_VERSE_NOTE) {
      removed += 1;
      continue;
    }
    // The model's outline, or a tip it also wrote in its block, is not part of the answer.
    if (PLAN_LINE.test(line) && !line.includes("](http")) {
      damage += 1;
      continue;
    }
    if (hasTipBlock && PROSE_TIP.test(line)) continue;
    // Blank lines, the sources line, and a line made only of links pass through.
    if (!line.trim() || /^[ \t*]*المصادر[ \t*]*:/.test(line)
      || (line.includes("](http") && !/[\u0621-\u064A]/.test(line.replace(/\[[^\]]*\]\([^)]*\)/g, "")))) {
      out.push(line);
      continue;
    }
    const sentences: string[] = [];
    for (const sentence of line.split(SENTENCE_END)) {
      if (!sentence.trim()) continue;
      if (sentence.includes(REMOVED_HADITH_NOTE) || sentence.includes(REMOVED_VERSE_NOTE)) {
        removed += 1;
        continue;
      }
      const quoted = /[«﴿]/.test(sentence);
      const leadIn = /[:：][ \t]*$/.test(sentence);
      const kept: string[] = [];
      let cut = false;
      for (const clause of sentence.split(CLAUSE_END)) {
        if (clause.includes(GARBLED)) {
          damage += 1;
          continue;
        }
        // A report in the model's own words: drop it and what depends on it.
        if (!quoted && !leadIn && isNarrationClause(clause)) {
          damage += 1;
          cut = true;
          break;
        }
        kept.push(clause);
      }
      let rebuilt = kept.join("").replace(/[ \t]{2,}/g, " ").trimEnd();
      if (kept.length === 0 || plain(rebuilt).replace(/[^\u0621-\u064A]/g, "").length < 8) continue;
      if (cut || /[،؛]$/.test(rebuilt)) rebuilt = rebuilt.replace(/[،؛:]+$/, "") + ".";
      sentences.push(rebuilt);
    }
    if (sentences.length > 0) out.push(sentences.join(" ").replace(/^\s+/, ""));
  }

  // An introduction ("as in the hadith:") with nothing after it says nothing.
  const cleaned: string[] = [];
  for (let index = 0; index < out.length; index += 1) {
    const line = out[index]!;
    if (/[:：][ \t]*$/.test(line) && !/^[ \t]*:{2,}/.test(line) && !/^[ \t*]*المصادر/.test(line)) {
      const next = out.slice(index + 1).find((candidate) => candidate.trim());
      if (!next || !/^[ \t]*:{2,}[ \t]*(verse|hadith|dua)/i.test(next)) {
        const trimmed = line.replace(/[^.!؟]*[:：][ \t]*$/, "").trimEnd();
        if (trimmed) cleaned.push(trimmed);
        continue;
      }
    }
    cleaned.push(line);
  }
  return { text: cleaned.join("\n"), damage, removed };
}

/**
 * The model sometimes starts a longer answer over, several times, before it
 * finishes ("الحمد لله الذي وفّقك…" four times in a row, each a little
 * longer). A prose paragraph that mostly repeats a later one is an abandoned
 * draft: only the later, fuller version is kept.
 */
const MIN_DRAFT_WORDS = 6;
const DRAFT_OVERLAP = 0.6;
function paragraphWords(paragraph: string): Set<string> {
  return new Set(plain(paragraph).replace(/\[[^\]]*\]\([^)]*\)/g, " ").split(/[^\u0621-\u064A]+/).filter((word) => word.length > 2));
}
export function dropRestartedParagraphs(text: string): { text: string; dropped: number } {
  const paragraphs = text.split(/\n{2,}/);
  const words = paragraphs.map((paragraph) => (/^[ \t]*:{2,}|^[ \t*]*المصادر[ \t*]*:/.test(paragraph) ? null : paragraphWords(paragraph)));
  let dropped = 0;
  const kept = paragraphs.filter((_paragraph, index) => {
    const mine = words[index];
    if (!mine || mine.size < MIN_DRAFT_WORDS) return true;
    for (let later = index + 1; later < paragraphs.length; later += 1) {
      const theirs = words[later];
      if (!theirs || theirs.size < MIN_DRAFT_WORDS) continue;
      let shared = 0;
      for (const word of mine) if (theirs.has(word)) shared += 1;
      if (shared / Math.min(mine.size, theirs.size) >= DRAFT_OVERLAP) {
        dropped += 1;
        return false;
      }
    }
    return true;
  });
  return { text: kept.join("\n\n"), dropped };
}

/** Collect every source link into one sources line at the end of the reply. */
function gatherSources(text: string): string {
  const links: string[] = [];
  const body = text.split("\n").filter((line) => {
    if (!/^[ \t*]*(?:ومن )?المصادر[ \t*]*:/.test(line)) return true;
    for (const link of line.match(/\[[^\]]+\]\([^)]+\)/g) ?? []) {
      if (!links.includes(link)) links.push(link);
    }
    return false;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return links.length > 0 && body ? `${body}\n\nالمصادر: ${links.join("، ")}` : body;
}

/** Clean and verify a complete reply, and report how much of it had to be dropped. */
export function finalizeReplyDetailed(text: string, guard: ReplyGuard): FinalReply {
  // A closing marker glued to the next paragraph is a marker followed by a paragraph.
  const separated = text.replace(/^([ \t]*:{3,})(?=[^\s:a-zA-Z(])/gm, "$1\n");
  const checked = guard.push(selectCleanAttempt(separated)) + guard.flush();
  const tidy = tidyProse(checked);
  let result = normalizeSourceLinks(tidy.text, guard.allowedSourceUrls)
    // A "sources" line whose links were all removed has nothing left to say.
    .replace(/^[ \t*]*المصادر[ \t*]*:[ \t*،,]*$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([،.؛؟!])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  result = gatherSources(dropRestartedParagraphs(result).text);
  if (tidy.removed > 0 && result) result += `\n\n${REMOVAL_FOOTNOTE}`;
  return { text: result, damage: tidy.damage + tidy.removed };
}

/** Clean and verify a complete reply. */
export function finalizeReply(text: string, guard: ReplyGuard): string {
  return finalizeReplyDetailed(text, guard).text;
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
