/**
 * How an answer from «أثر» is shown, on the Companion page and in the
 * Mushaf's "ask about this verse" window alike.
 *
 *  - A verified verse or hadith is a card: the text large in the Quran /
 *    reading font, the attribution (surah and verse, or narrator, collection,
 *    number and grade) small underneath, with the grade as a chip.
 *  - A supplication, a tip or a note is a lighter card in the body size.
 *  - The trusted sources are named chips that open the page.
 *  - A button to a page of the app opens it.
 *
 * Colours come from the theme's own variables, so every card reads in the
 * light theme as well as the dark ones.
 */
import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { BookOpen, BookText, ExternalLink, Info, Lightbulb, Link2, MessageCircleHeart, Sparkles, TriangleAlert } from "lucide-react";

import { ROUTE_LABELS } from "@/lib/companionAI";
import { splitIntoSegments } from "@/lib/companionBlocks";
import { isTrustedSourceUrl } from "@/lib/companionSources";
import { extractSources, hadithAppLink, isAcceptedGrade, parseHadithBlock, parseVerseBlock, type SourceLink } from "@/lib/companionEvidence";
import { CARD_GAP, CARD_TEXT_LEAD, VERSE_PACE, countWords, planReveal } from "@/lib/companionReveal";
import { getInternalAppRoute } from "@/lib/internalAppRoute";
import type { CalloutKind } from "@/lib/companionMarkdown";

type Size = "page" | "compact";

/** One hue per kind of card; text colours are mixed from the theme's own foreground. */
const KIND: Record<CalloutKind, { hue: string; label: string; icon: React.ElementType }> = {
  verse: { hue: "#38bdf8", label: "آية كريمة", icon: BookOpen },
  hadith: { hue: "#34d399", label: "حديث نبوي", icon: BookText },
  dua: { hue: "#fb7185", label: "دعاء", icon: MessageCircleHeart },
  tip: { hue: "var(--fg)", label: "نصيحة", icon: Lightbulb },
  warn: { hue: "#f87171", label: "تنبيه", icon: TriangleAlert },
  info: { hue: "#a78bfa", label: "معلومة", icon: Info },
  cite: { hue: "#22d3ee", label: "مرجع", icon: Link2 },
};

function cardStyle(hue: string): React.CSSProperties {
  return {
    borderColor: `color-mix(in srgb, ${hue} 28%, transparent)`,
    background: `linear-gradient(145deg, color-mix(in srgb, ${hue} 9%, var(--bg)), color-mix(in srgb, ${hue} 3%, var(--bg)))`,
    boxShadow: "0 8px 24px color-mix(in srgb, var(--bg-deep, var(--bg)) 18%, transparent)",
    ["--card-hue" as string]: hue,
  };
}
const labelStyle: React.CSSProperties = { color: "color-mix(in srgb, var(--card-hue) 62%, var(--fg))" };

function CardLabel({ kind, end }: { kind: CalloutKind; end?: React.ReactNode }) {
  const k = KIND[kind] ?? KIND.info;
  const Icon = k.icon;
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3 text-xs font-bold" style={labelStyle}>
      <span className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: "color-mix(in srgb, var(--card-hue) 12%, transparent)" }}><Icon size={15} aria-hidden="true" /></span>
        <span>{k.label}</span>
      </span>
      {end}
    </div>
  );
}

function GradeChip({ grade, grader }: { grade: string; grader?: string }) {
  const accepted = isAcceptedGrade(grade);
  const hue = accepted ? "#34d399" : "var(--fg)";
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10.5px] font-bold"
      style={{ borderColor: `color-mix(in srgb, ${hue} 50%, transparent)`, background: `color-mix(in srgb, ${hue} 16%, transparent)`, color: `color-mix(in srgb, ${hue} 62%, var(--fg))` }}
    >
      {grade}{grader ? <span className="font-medium opacity-80"> · {grader}</span> : null}
    </span>
  );
}

/* ─── Writing the answer («حبر من نور») ─────────────────────────────────── */

/** Where one part of the answer starts in the writing, and its pace. */
type Reveal = { base: number; step: number; pace?: number };

const at = (reveal: Reveal, offset: number) => Math.round((reveal.base + offset) * reveal.step);
const delayStyle = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as React.CSSProperties;

/** Plain text written word by word. Spaces and line breaks stay where they are. */
function Written({ text, reveal }: { text: string; reveal?: Reveal }) {
  if (!reveal) return <>{text}</>;
  // Each word's place in the writing, worked out before rendering.
  const pieces = text.split(/(\s+)/);
  const order: number[] = [];
  let words = 0;
  for (const piece of pieces) {
    order.push(piece && !/^\s+$/.test(piece) ? words++ : -1);
  }
  return (
    <>
      {pieces.map((piece, key) => {
        if (order[key]! < 0) return piece;
        const ms = at(reveal, order[key]! * (reveal.pace ?? 1));
        return <span key={key} className="rw" data-at={ms} style={delayStyle(ms)}>{piece}</span>;
      })}
    </>
  );
}

type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] };

/** The same for rendered markdown: every word of its text becomes a written span. */
function rehypeWriteWords(reveal: Reveal) {
  return () => (tree: HastNode) => {
    let index = 0;
    const walk = (node: HastNode) => {
      if (!node.children || node.tagName === "code" || node.tagName === "pre") return;
      const next: HastNode[] = [];
      for (const child of node.children) {
        if (child.type !== "text" || !child.value) {
          walk(child);
          next.push(child);
          continue;
        }
        for (const piece of child.value.split(/(\s+)/)) {
          if (!piece) continue;
          if (/^\s+$/.test(piece)) {
            next.push({ type: "text", value: piece });
            continue;
          }
          const ms = at(reveal, index);
          index += 1;
          next.push({ type: "element", tagName: "span", properties: { className: ["rw"], dataAt: ms, style: `--d:${ms}ms` }, children: [{ type: "text", value: piece }] });
        }
      }
      node.children = next;
    };
    walk(tree);
  };
}

/** A card unfolds when the writing reaches it, then its text is written. */
type Animated = { className?: string; style?: React.CSSProperties };
function cardReveal(reveal: Reveal | undefined): { card: Animated; text: Reveal | undefined; after: (words: number) => Animated } {
  if (!reveal) return { card: {}, text: undefined, after: () => ({}) };
  const cardMs = at(reveal, CARD_GAP - 2);
  return {
    card: { className: "rc", style: delayStyle(cardMs) },
    text: { base: reveal.base + CARD_GAP + CARD_TEXT_LEAD, step: reveal.step, pace: reveal.pace },
    after: (words: number) => ({ className: "rf", style: delayStyle(at(reveal, CARD_GAP + CARD_TEXT_LEAD + words)) }),
  };
}

function HadithCard({ body, size, reveal }: { body: string; size: Size; reveal?: Reveal }) {
  const parts = parseHadithBlock(body);
  const footer = [parts.narrator ?? "", parts.source ? `${parts.source}${parts.number ? ` ${parts.number}` : ""}` : ""].filter(Boolean);
  // The grader is named when it is someone other than the collection's author
  // (a grade by al-Albani on a hadith in the Sunan, say).
  const grader = parts.grader && !(parts.source ?? "").includes(parts.grader) ? parts.grader : undefined;
  const r = cardReveal(reveal);
  const words = countWords(parts.text);
  const link = hadithAppLink(parts);
  return (
    <figure className={["relative my-2.5 overflow-hidden rounded-2xl border", r.card.className ?? ""].join(" ")} style={{ ...cardStyle(KIND.hadith.hue), ...r.card.style }}>
      <CardLabel kind="hadith" end={parts.grade ? <span {...r.after(words)}><GradeChip grade={parts.grade} grader={grader} /></span> : null} />
      <blockquote className={["arabic-text px-4 pt-2 text-(--fg) whitespace-pre-wrap", size === "page" ? "text-[17px] leading-9" : "text-[15px] leading-8"].join(" ")}>
        <Written text={parts.text} reveal={r.text} />
      </blockquote>
      {footer.length > 0 ? (
        <figcaption className={["mx-3.5 mb-2.5 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-1.5 text-[11.5px] leading-5 text-(--muted)", r.after(words).className ?? ""].join(" ")} style={{ borderColor: "color-mix(in srgb, var(--card-hue) 25%, transparent)", ...r.after(words).style }}>
          <span>{footer.join(" · ")}</span>
          {/* The same hadith in the app's own book, at its printed number. */}
          {link ? (
            <Link to={link} className="mr-auto inline-flex items-center gap-1 font-semibold" style={labelStyle}>
              <BookOpen size={12} aria-hidden="true" />
              افتحه في الكتاب
            </Link>
          ) : null}
        </figcaption>
      ) : <div className="h-2.5" />}
    </figure>
  );
}

function VerseCard({ body, size, reveal }: { body: string; size: Size; reveal?: Reveal }) {
  const parts = parseVerseBlock(body);
  const r = cardReveal(reveal ? { ...reveal, pace: VERSE_PACE } : undefined);
  const words = Math.ceil(countWords(parts.text) * VERSE_PACE);
  const after = r.after(words);
  return (
    <figure className={["relative my-2.5 overflow-hidden rounded-2xl border", r.card.className ?? ""].join(" ")} style={{ ...cardStyle(KIND.verse.hue), ...r.card.style }}>
      <CardLabel kind="verse" />
      <blockquote
        className={["quran-text px-4 pt-2 text-center text-(--fg)", size === "page" ? "text-[20px] leading-[2.15]" : "text-[18px] leading-[2]"].join(" ")}
        style={{ fontFamily: "var(--font-quran)" }}
      >
        <Written text={parts.text} reveal={r.text} />
      </blockquote>
      {parts.surah ? (
        <figcaption className={["mx-3.5 mb-2.5 mt-1 border-t pt-1.5 text-center text-[11.5px] text-(--muted)", after.className ?? ""].join(" ")} style={{ borderColor: "color-mix(in srgb, var(--card-hue) 25%, transparent)", ...after.style }}>
          سورة {parts.surah} · الآية {parts.ayah}
        </figcaption>
      ) : <div className="h-2.5" />}
    </figure>
  );
}

function NoteCard({ kind, body, size, reveal }: { kind: CalloutKind; body: string; size: Size; reveal?: Reveal }) {
  const k = KIND[kind] ?? KIND.info;
  const prayer = kind === "dua";
  const r = cardReveal(reveal);
  return (
    <div className={["relative my-2.5 overflow-hidden rounded-2xl border", r.card.className ?? ""].join(" ")} style={{ ...cardStyle(k.hue), ...r.card.style }}>
      <CardLabel kind={kind} />
      <div
        className={[
          "px-4 pb-4 pt-2 text-(--fg) whitespace-pre-wrap",
          prayer ? "arabic-text" : "",
          prayer ? (size === "page" ? "text-[16px] leading-8" : "text-[15px] leading-7") : (size === "page" ? "text-sm leading-7" : "text-[13.5px] leading-6"),
        ].join(" ")}
      >
        <Written text={body} reveal={r.text} />
      </div>
    </div>
  );
}

function SourceChips({ sources, reveal }: { sources: SourceLink[]; reveal?: Reveal }) {
  const shown = sources.filter((source) => isTrustedSourceUrl(source.url));
  if (shown.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <span className={["text-[11px] text-(--muted-2)", reveal ? "rf" : ""].join(" ")} style={reveal ? delayStyle(at(reveal, 0)) : undefined}>المصادر:</span>
      {shown.map((source, index) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={["inline-flex items-center gap-1 rounded-full border border-(--stroke) bg-(--card-2) px-2.5 py-0.5 text-[11.5px] font-semibold text-(--fg) transition hover:border-accent-35", reveal ? "rf" : ""].join(" ")}
          style={reveal ? delayStyle(at(reveal, index + 1)) : undefined}
        >
          {source.name}
          <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function ActionButton({ route, label, onNavigate, reveal }: { route: string; label: string; onNavigate: (route: string) => void; reveal?: Reveal }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(route)}
      className={["group my-2 flex w-full items-center justify-between gap-2 rounded-2xl border border-accent-35 bg-accent-15 px-3.5 py-2.5 text-start text-sm font-semibold text-(--fg) transition hover:bg-accent-15/80 active:scale-[0.99]", reveal ? "rc" : ""].join(" ")}
      style={reveal ? delayStyle(at(reveal, 2)) : undefined}
    >
      <span className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-accent-15 text-(--accent)">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span>{label}</span>
      </span>
      <span className="flex items-center gap-1 text-[11px] text-(--muted)">
        <span>{ROUTE_LABELS[route] ?? ""}</span>
        <span aria-hidden="true" className="transition group-hover:-translate-x-0.5">←</span>
      </span>
    </button>
  );
}

const markdownComponents: Components = {
  a: ({ href, children }) => {
    const to = href ?? "";
    const safeRoute = getInternalAppRoute(to);
    if (safeRoute) {
      return (
        <Link to={safeRoute} className="mx-0.5 inline-block rounded-lg bg-accent-15 px-2 py-0.5 text-xs font-semibold text-(--accent) underline-offset-2 hover:underline">
          {children}
        </Link>
      );
    }
    // Only links to the trusted source list are clickable; anything else the
    // model writes is shown as plain text.
    if (!isTrustedSourceUrl(to)) return <span>{children}</span>;
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className="text-(--accent) underline underline-offset-2">
        {children}
      </a>
    );
  },
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold text-(--fg) first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mb-2 mt-3 text-[15px] font-bold text-(--fg) first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1.5 mt-2 text-[14px] font-bold text-(--accent) first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-7">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-(--fg)">{children}</strong>,
  em: ({ children }) => <em className="italic text-(--accent)">{children}</em>,
  ul: ({ children }) => <ul className="mb-2.5 me-5 list-disc stack-y-1.5 last:mb-0 marker:text-(--accent)">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2.5 me-5 list-decimal stack-y-1.5 last:mb-0 marker:text-(--accent) marker:font-bold">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2.5 rounded-xl border-s-4 border-accent-35 bg-accent-8 ps-3 pe-2 py-2 text-(--muted)">{children}</blockquote>
  ),
  code: ({ children }) => <code className="rounded-sm bg-(--card-2) px-1 py-0.5 font-mono text-[12px]" dir="ltr">{children}</code>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-(--card-2) p-3 text-xs leading-6" dir="ltr">{children}</pre>,
  hr: () => <hr className="my-3 border-(--stroke)" />,
};

/**
 * The body of an answer: prose, evidence cards, notes, page buttons and
 * sources. With `write`, the answer is written onto the screen (see
 * companionReveal.ts); the plan's own count of words decides where each part
 * starts, so parts never wait on one another to render.
 */
export function ReplyContent({ text, size = "page", onNavigate, write = false }: { text: string; size?: Size; onNavigate: (route: string) => void; write?: boolean }) {
  const segments = React.useMemo(() => splitIntoSegments(text), [text]);
  const step = React.useMemo(() => planReveal(text).step, [text]);
  // Where each part starts in the writing, and where the sources come.
  const starts: number[] = [];
  const sources: SourceLink[] = [];
  let units = 0;
  for (const segment of segments) {
    starts.push(units);
    if (segment.kind === "action") {
      units += CARD_GAP;
    } else if (segment.kind === "callout") {
      const cardText = segment.calloutKind === "hadith" ? parseHadithBlock(segment.text).text : segment.calloutKind === "verse" ? parseVerseBlock(segment.text).text : segment.text;
      units += CARD_GAP + CARD_TEXT_LEAD + Math.ceil(countWords(cardText) * (segment.calloutKind === "verse" ? VERSE_PACE : 1)) + 2;
    } else {
      const split = extractSources(segment.text);
      sources.push(...split.sources);
      units += countWords(split.text);
    }
  }
  const sourcesStart = units;
  const body = segments.map((segment, index) => {
    const reveal: Reveal | undefined = write ? { base: starts[index]!, step } : undefined;
    if (segment.kind === "action") {
      return <ActionButton key={`a-${index}`} route={segment.route} label={segment.label} onNavigate={onNavigate} reveal={reveal} />;
    }
    if (segment.kind === "callout") {
      if (segment.calloutKind === "hadith") return <HadithCard key={`h-${index}`} body={segment.text} size={size} reveal={reveal} />;
      if (segment.calloutKind === "verse") return <VerseCard key={`v-${index}`} body={segment.text} size={size} reveal={reveal} />;
      return <NoteCard key={`n-${index}`} kind={segment.calloutKind} body={segment.text} size={size} reveal={reveal} />;
    }
    const prose = extractSources(segment.text).text;
    if (!prose) return null;
    return (
      <div key={`t-${index}`} className={size === "compact" ? "text-[14px]" : undefined}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={reveal ? [rehypeWriteWords(reveal)] : undefined} components={markdownComponents}>
          {prose}
        </ReactMarkdown>
      </div>
    );
  });
  return (
    <div className={write ? "ai-reveal" : undefined}>
      {body}
      <SourceChips sources={sources} reveal={write ? { base: sourcesStart, step } : undefined} />
    </div>
  );
}
