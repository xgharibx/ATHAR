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
import { ExternalLink, Sparkles } from "lucide-react";

import { ROUTE_LABELS } from "@/lib/companionAI";
import { splitIntoSegments } from "@/lib/companionBlocks";
import { isTrustedSourceUrl } from "@/lib/companionSources";
import { extractSources, isAcceptedGrade, parseHadithBlock, parseVerseBlock, type SourceLink } from "@/lib/companionEvidence";
import { getInternalAppRoute } from "@/lib/internalAppRoute";
import type { CalloutKind } from "@/lib/companionMarkdown";

type Size = "page" | "compact";

/** One hue per kind of card; text colours are mixed from the theme's own foreground. */
const KIND: Record<CalloutKind, { hue: string; label: string; icon: string }> = {
  verse: { hue: "#38bdf8", label: "آية كريمة", icon: "📖" },
  hadith: { hue: "#34d399", label: "حديث نبوي", icon: "📜" },
  dua: { hue: "#fb7185", label: "دعاء", icon: "🤲" },
  tip: { hue: "#fbbf24", label: "نصيحة", icon: "💡" },
  warn: { hue: "#f87171", label: "تنبيه", icon: "⚠️" },
  info: { hue: "#a78bfa", label: "معلومة", icon: "ℹ️" },
  cite: { hue: "#22d3ee", label: "مرجع", icon: "🔗" },
} as Record<CalloutKind, { hue: string; label: string; icon: string }>;

function cardStyle(hue: string): React.CSSProperties {
  return {
    borderColor: `color-mix(in srgb, ${hue} 42%, transparent)`,
    background: `color-mix(in srgb, ${hue} 9%, transparent)`,
    ["--card-hue" as string]: hue,
  };
}
const labelStyle: React.CSSProperties = { color: "color-mix(in srgb, var(--card-hue) 62%, var(--fg))" };

function CardLabel({ kind, end }: { kind: CalloutKind; end?: React.ReactNode }) {
  const k = KIND[kind] ?? KIND.info;
  return (
    <div className="flex items-center justify-between gap-2 px-3 pt-2 text-[11px] font-bold" style={labelStyle}>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true">{k.icon}</span>
        <span>{k.label}</span>
      </span>
      {end}
    </div>
  );
}

function GradeChip({ grade, grader }: { grade: string; grader?: string }) {
  const accepted = isAcceptedGrade(grade);
  const hue = accepted ? "#34d399" : "#f59e0b";
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10.5px] font-bold"
      style={{ borderColor: `color-mix(in srgb, ${hue} 50%, transparent)`, background: `color-mix(in srgb, ${hue} 16%, transparent)`, color: `color-mix(in srgb, ${hue} 62%, var(--fg))` }}
    >
      {grade}{grader ? <span className="font-medium opacity-80"> · {grader}</span> : null}
    </span>
  );
}

function HadithCard({ body, size }: { body: string; size: Size }) {
  const parts = parseHadithBlock(body);
  const footer = [parts.narrator ?? "", parts.source ? `${parts.source}${parts.number ? ` ${parts.number}` : ""}` : ""].filter(Boolean);
  // The grader is named when it is someone other than the collection's author
  // (a grade by al-Albani on a hadith in the Sunan, say).
  const grader = parts.grader && !(parts.source ?? "").includes(parts.grader) ? parts.grader : undefined;
  return (
    <figure className="my-2.5 overflow-hidden rounded-2xl border" style={cardStyle(KIND.hadith.hue)}>
      <CardLabel kind="hadith" end={parts.grade ? <GradeChip grade={parts.grade} grader={grader} /> : null} />
      <blockquote className={["arabic-text px-3.5 pt-1.5 text-(--fg) whitespace-pre-wrap", size === "page" ? "text-[17px] leading-9" : "text-[15px] leading-8"].join(" ")}>
        {parts.text}
      </blockquote>
      {footer.length > 0 ? (
        <figcaption className="mx-3.5 mb-2.5 mt-1.5 border-t pt-1.5 text-[11.5px] leading-5 text-(--muted)" style={{ borderColor: "color-mix(in srgb, var(--card-hue) 25%, transparent)" }}>
          {footer.join(" · ")}
        </figcaption>
      ) : <div className="h-2.5" />}
    </figure>
  );
}

function VerseCard({ body, size }: { body: string; size: Size }) {
  const parts = parseVerseBlock(body);
  return (
    <figure className="my-2.5 overflow-hidden rounded-2xl border" style={cardStyle(KIND.verse.hue)}>
      <CardLabel kind="verse" />
      <blockquote
        className={["quran-text px-3.5 pt-1.5 text-center text-(--fg)", size === "page" ? "text-[21px] leading-[2.1]" : "text-[18px] leading-[2]"].join(" ")}
        style={{ fontFamily: "var(--font-quran)" }}
      >
        {parts.text}
      </blockquote>
      {parts.surah ? (
        <figcaption className="mx-3.5 mb-2.5 mt-1 border-t pt-1.5 text-center text-[11.5px] text-(--muted)" style={{ borderColor: "color-mix(in srgb, var(--card-hue) 25%, transparent)" }}>
          سورة {parts.surah} · الآية {parts.ayah}
        </figcaption>
      ) : <div className="h-2.5" />}
    </figure>
  );
}

function NoteCard({ kind, body, size }: { kind: CalloutKind; body: string; size: Size }) {
  const k = KIND[kind] ?? KIND.info;
  const prayer = kind === "dua";
  return (
    <div className="my-2.5 overflow-hidden rounded-2xl border" style={cardStyle(k.hue)}>
      <CardLabel kind={kind} />
      <div
        className={[
          "px-3.5 pb-2.5 pt-1 text-(--fg) whitespace-pre-wrap",
          prayer ? "arabic-text" : "",
          prayer ? (size === "page" ? "text-[16px] leading-8" : "text-[15px] leading-7") : (size === "page" ? "text-sm leading-7" : "text-[13.5px] leading-6"),
        ].join(" ")}
      >
        {body}
      </div>
    </div>
  );
}

function SourceChips({ sources }: { sources: SourceLink[] }) {
  const shown = sources.filter((source) => isTrustedSourceUrl(source.url));
  if (shown.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-(--muted-2)">المصادر:</span>
      {shown.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-(--stroke) bg-(--card-2) px-2.5 py-0.5 text-[11.5px] font-semibold text-(--fg) transition hover:border-accent-35"
        >
          {source.name}
          <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function ActionButton({ route, label, onNavigate }: { route: string; label: string; onNavigate: (route: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(route)}
      className="group my-2 flex w-full items-center justify-between gap-2 rounded-2xl border border-accent-35 bg-accent-15 px-3.5 py-2.5 text-start text-sm font-semibold text-(--fg) transition hover:bg-accent-15/80 active:scale-[0.99]"
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

/** The body of an answer: prose, evidence cards, notes, page buttons and sources. */
export function ReplyContent({ text, size = "page", onNavigate }: { text: string; size?: Size; onNavigate: (route: string) => void }) {
  const segments = React.useMemo(() => splitIntoSegments(text), [text]);
  const sources: SourceLink[] = [];
  const body = segments.map((segment, index) => {
    if (segment.kind === "action") {
      return <ActionButton key={`a-${index}`} route={segment.route} label={segment.label} onNavigate={onNavigate} />;
    }
    if (segment.kind === "callout") {
      if (segment.calloutKind === "hadith") return <HadithCard key={`h-${index}`} body={segment.text} size={size} />;
      if (segment.calloutKind === "verse") return <VerseCard key={`v-${index}`} body={segment.text} size={size} />;
      return <NoteCard key={`n-${index}`} kind={segment.calloutKind} body={segment.text} size={size} />;
    }
    const split = extractSources(segment.text);
    sources.push(...split.sources);
    if (!split.text) return null;
    return (
      <div key={`t-${index}`} className={size === "compact" ? "text-[14px]" : undefined}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {split.text}
        </ReactMarkdown>
      </div>
    );
  });
  return (
    <>
      {body}
      <SourceChips sources={sources} />
    </>
  );
}
