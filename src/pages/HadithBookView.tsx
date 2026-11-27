/**
 * A hadith book: its chapters («كتاب الإيمان»، «كتاب الصلاة»…) as headers in
 * one long list that scrolls with the page, a bar that always names the
 * chapter you are in, and a book index to jump to any chapter or number.
 * Route: /hadith/:bookKey
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ArrowRight, Bookmark, Hash, ListTree, Loader2, StickyNote } from "lucide-react";
import { useHadithChapter, useHadithToc } from "@/data/useHadithBook";
import type { HadithBookToc } from "@/data/hadithSchemas";
import { HADITH_BOOKS_STATIC, hadithPreview } from "@/data/hadithTypes";
import { stripDiacritics } from "@/lib/arabic";
import { splitHadithText } from "@/lib/hadithText";
import { hadithNumberLabel, hadithPlaceLabel, hadithRefNumber } from "@/data/hadithNumbers";
import { useNoorStore } from "@/store/noorStore";
import { Modal } from "@/components/ui/Modal";
import { shortChapterTitle } from "@/data/hadithChapters";
import { BOOK, HADITH, countAr } from "@/lib/arabicCount";
import { Card } from "@/components/ui/Card";
import { GradeChip } from "@/components/hadith/GradeChip";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { arNum } from "@/lib/formatNumber";


/* ------------------------------------------------------------------ */

/** The height of whichever design's top bar is showing, so a sticky bar sits just below it. */
function useTopBarHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-app-topbar]");
    if (!el) return;
    const update = () => setH(Math.round(el.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return h;
}

function ChapterHeader({ title, index, count }: { title: string; index: number; count: number }) {
  return (
    <div dir="rtl" className="mx-3 mt-5 mb-2 flex items-center gap-3 px-1">
      <span className="grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>
        {arNum(index)}
      </span>
      <h2 className="min-w-0 flex-1 text-[15px] font-bold font-arabic text-(--fg) leading-snug">{title}</h2>
      <span className="text-[11px] text-(--muted) shrink-0">{countAr(count, HADITH)}</span>
    </div>
  );
}

/** The matn when it can be told apart from the chain, so the list shows what was said. */
function rowPreview(t: string): string {
  const { isnad, matn } = splitHadithText(t);
  const text = isnad && matn.length > 24 ? matn : hadithPreview(t, 190);
  return text.length > 190 ? `${text.slice(0, 190)}…` : text;
}

/** One hadith in the list. Its chapter loads when the row first shows. */
function HadithRow({ bookKey, n, chapter, printed }: { bookKey: string; n: number; chapter: number; printed?: string }) {
  const navigate = useNavigate();
  const key = `${bookKey}:${n}`;
  const isBookmarked = useNoorStore((s) => !!s.hadithBookmarks[key]);
  const hasNote = useNoorStore((s) => !!s.hadithNotes[key]);
  const { data: items } = useHadithChapter(bookKey, chapter);
  const item = useMemo(() => items?.find((h) => h.n === n), [items, n]);
  const place = hadithPlaceLabel({ a: n, r: printed ?? String(n) });
  const open = () => navigate(`/hadith/${bookKey}/${n}`);

  return (
    <div className="mx-3 my-2">
      <div
        dir="rtl"
        role="button"
        tabIndex={0}
        aria-label={item?.ti ? `${place}: ${item.ti}` : place}
        onClick={open}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()}
        className="relative w-full overflow-hidden rounded-3xl border border-(--stroke) bg-(--card) p-4 text-right cursor-pointer press-effect"
      >
        <div className="absolute inset-y-0 right-0 w-1 opacity-80" style={{ background: "var(--accent)" }} />
        <div className="pr-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums whitespace-nowrap" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>
              {hadithNumberLabel({ a: n, r: printed ?? String(n) })}
            </span>
            {item?.g[0] && <GradeChip grade={item.g[0]} size="sm" />}
            {(hasNote || isBookmarked) && (
              <span className="mr-auto flex items-center gap-1.5">
                {hasNote && <StickyNote size={14} aria-label="عليه ملاحظتك" className="text-(--accent)" />}
                {isBookmarked && <Bookmark size={14} aria-label="عليه علامة" className="fill-current text-(--accent)" />}
              </span>
            )}
          </div>
          {item?.ti && <p className="mb-1 text-[15px] font-bold font-arabic text-(--accent) leading-snug">{item.ti}</p>}
          {item ? (
            <p className="arabic-text text-base leading-8 font-semibold text-(--fg) line-clamp-3">{rowPreview(item.t)}</p>
          ) : (
            <div className="stack-y-2 py-1" aria-hidden="true">
              <div className="skeleton h-4 w-full rounded-lg" />
              <div className="skeleton h-4 w-4/5 rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ListRow =
  | { type: "header"; sectionId: number; title: string; index: number; count: number }
  | { type: "hadith"; n: number; chapter: number; ref?: string };

/** The first hadith printed under number «n», from the table of contents. */
function rowByPrintedNumber(rows: HadithBookToc["rows"], n: number): HadithBookToc["rows"][number] | undefined {
  return rows.find(([rowN, , ref]) => hadithRefNumber(ref ?? String(rowN)) === n);
}

/** The book index: every chapter with its count, and a jump to any hadith number. */
function BookIndex({
  open,
  onClose,
  chapters,
  activeId,
  onPick,
  onJump,
}: {
  open: boolean;
  onClose: () => void;
  chapters: { id: number; title: string; index: number; count: number; first: string }[];
  activeId: number | null;
  onPick: (id: number) => void;
  onJump: (n: number) => boolean;
}) {
  const [q, setQ] = useState("");
  const [num, setNum] = useState("");
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (open) requestAnimationFrame(() => activeRef.current?.scrollIntoView({ block: "center" }));
  }, [open]);
  const close = () => {
    setQ("");
    setNum("");
    onClose();
  };
  const nq = stripDiacritics(q.trim());
  const shown = nq ? chapters.filter((c) => stripDiacritics(c.title).includes(nq)) : chapters;
  return (
    <Modal open={open} onClose={close} ariaLabel="فهرس الكتاب">
      <div dir="rtl" className="p-4 stack-y-3">
        <div className="flex items-center gap-2">
          <ListTree size={18} aria-hidden="true" className="text-(--accent)" />
          <h2 className="text-base font-bold">فهرس الكتاب</h2>
          <span className="text-xs text-(--muted)">{countAr(chapters.length, BOOK)}</span>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(num.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
            if (Number.isFinite(n) && n > 0 && onJump(n)) close();
            else toast.error("لا يوجد حديث بهذا الرقم في هذا الكتاب");
          }}
        >
          <div className="relative flex-1">
            <Hash size={15} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted)" />
            <input value={num} onChange={(e) => setNum(e.target.value)} inputMode="numeric" placeholder="اذهب إلى حديث برقمه" aria-label="رقم الحديث"
              className="w-full rounded-2xl border border-(--stroke) bg-(--card) py-2.5 pr-9 pl-3 text-sm outline-hidden focus:border-accent-45" />
          </div>
          <button type="submit" className="rounded-2xl px-4 py-2.5 text-sm font-bold" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>اذهب</button>
        </form>
        {chapters.length > 8 && (
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="ابحث في أسماء الكتب…" aria-label="بحث في الفهرس"
            className="w-full rounded-2xl border border-(--stroke) bg-(--card) px-3 py-2.5 text-sm outline-hidden focus:border-accent-45" />
        )}
        <div className="stack-y-1 max-h-[55vh] overflow-y-auto overscroll-contain -mx-1 px-1">
          {shown.map((c) => (
            <button
              key={c.id}
              ref={c.id === activeId ? activeRef : undefined}
              type="button"
              onClick={() => {
                onPick(c.id);
                close();
              }}
              aria-current={c.id === activeId ? "true" : undefined}
              className={cn("w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-right transition", c.id === activeId ? "bg-accent-15" : "hover:bg-(--card-2)")}
            >
              <span className="grid h-7 min-w-7 place-items-center rounded-full text-[11px] font-bold tabular-nums" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
                {arNum(c.index)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-(--fg) leading-snug">{shortChapterTitle(c.title)}</span>
                <span className="block text-[11px] text-(--muted)">{countAr(c.count, HADITH)}، من {c.first}</span>
              </span>
            </button>
          ))}
          {!shown.length && <p className="py-6 text-center text-xs text-(--muted)">لا يوجد كتاب بهذا الاسم.</p>}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

export function HadithBookViewPage() {
  const { bookKey } = useParams<{ bookKey: string }>();
  const navigate = useNavigate();
  // Only the table of contents (20–140 KB); each chapter loads as its rows show.
  const { data: toc, isLoading, isError, refetch } = useHadithToc(bookKey);
  const lastN = useNoorStore((s) => s.hadithProgress[bookKey ?? ""]);
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const topBar = useTopBarHeight();

  const meta = toc ?? HADITH_BOOKS_STATIC.find((b) => b.key === bookKey);

  // One list: a header before the first hadith of each chapter.
  const { rows, chapters, headerIndex, chapterOfRow } = useMemo(() => {
    const rows: ListRow[] = [];
    const chapterOfRow: (number | null)[] = [];
    const headerIndex = new Map<number, number>();
    const chapters: { id: number; title: string; index: number; count: number; first: string }[] = [];
    if (!toc) return { rows, chapters, headerIndex, chapterOfRow };
    const byId = new Map(toc.sections.map((s) => [s.id, s]));
    const counts = new Map<number, number>();
    for (const [, s] of toc.rows) counts.set(s, (counts.get(s) ?? 0) + 1);
    const showHeaders = toc.sections.length > 1;
    let lastId = -1;
    for (const [n, s, ref] of toc.rows) {
      if (showHeaders && s !== lastId) {
        lastId = s;
        const section = byId.get(s);
        if (section?.title) {
          const index = chapters.length + 1;
          chapters.push({ id: s, title: section.title, index, count: counts.get(s) ?? 0, first: hadithPlaceLabel({ a: n, r: ref ?? String(n) }) });
          headerIndex.set(s, rows.length);
          rows.push({ type: "header", sectionId: s, title: section.title, index, count: counts.get(s) ?? 0 });
          chapterOfRow.push(s);
        }
      }
      rows.push({ type: "hadith", n, chapter: s, ...(ref ? { ref } : {}) });
      chapterOfRow.push(showHeaders ? s : null);
    }
    return { rows, chapters, headerIndex, chapterOfRow };
  }, [toc]);

  const chapterTitle = (id: number | null) => (id == null ? null : chapters.find((c) => c.id === id) ?? null);
  const current = chapterTitle(currentId) ?? chapters[0] ?? null;

  const lastIndex = useMemo(() => {
    if (!lastN) return null;
    const idx = rows.findIndex((r) => r.type === "hadith" && r.n === lastN);
    return idx >= 0 ? idx : null;
  }, [lastN, rows]);
  const lastRow = lastIndex === null ? null : rows[lastIndex];
  const lastItem = lastRow?.type === "hadith" ? { a: lastRow.n, r: lastRow.ref ?? String(lastRow.n) } : null;

  // «/hadith/muslim?ref=1144» (links from «اسأل أثر» and elsewhere) opens the
  // hadith printed under that number.
  const [params] = useSearchParams();
  const refParam = params.get("ref");
  useEffect(() => {
    if (!toc || !refParam) return;
    const n = Number(refParam.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
    const hit = Number.isFinite(n) && n > 0 ? rowByPrintedNumber(toc.rows, n) : undefined;
    if (hit) navigate(`/hadith/${bookKey}/${hit[0]}`, { replace: true });
    else toast.error("لا يوجد حديث بهذا الرقم في هذا الكتاب");
  }, [toc, refParam, bookKey, navigate]);

  const scrollToRow = useCallback((index: number) => {
    virtuoso.current?.scrollToIndex({ index, align: "start", offset: -(topBar + 64) });
  }, [topBar]);

  const renderItem = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return null;
      if (row.type === "header") return <ChapterHeader title={row.title} index={row.index} count={row.count} />;
      return <HadithRow bookKey={bookKey!} n={row.n} chapter={row.chapter} printed={row.ref} />;
    },
    [rows, bookKey],
  );

  return (
    <div className="relative flex min-h-screen-safe flex-col page-enter pb-floating-nav">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" data-hadith-stars="" aria-hidden />
      <div dir="rtl" className="relative z-10 px-3 pt-2 pb-2">
        <Card className="relative overflow-hidden p-4">
          <div className="absolute inset-y-0 right-0 w-1.5" style={{ background: meta?.color ?? "var(--accent)" }} />
          <div className="relative flex items-center gap-3 pr-2">
            <button type="button"
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-2xl border border-(--stroke) bg-(--card) grid place-items-center transition hover:bg-(--card-2) shrink-0"
              aria-label="رجوع"
              data-page-back=""
            >
              <ArrowRight size={19} aria-hidden="true" className="text-(--fg)" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-lg text-(--fg) font-arabic leading-tight truncate" dir="rtl">
                {meta?.title ?? bookKey}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs opacity-65 flex-wrap">
                <span>{countAr(toc?.rows.length ?? meta?.count ?? 0, HADITH)}{chapters.length > 1 ? `، ${countAr(chapters.length, BOOK)}` : ""}</span>
              </div>
            </div>
            {isLoading && <Loader2 size={18} aria-hidden="true" className="animate-spin text-(--muted) shrink-0" />}
          </div>
          {meta?.description ? <p className="relative mt-3 pr-2 text-[12px] leading-6 text-(--muted)">{meta.description}</p> : null}
          {lastIndex !== null && (
            <button type="button"
              onClick={() => scrollToRow(lastIndex)}
              className="relative mt-3 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold font-arabic press-effect"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)" }}
            >
              أكمل من {lastItem ? hadithPlaceLabel(lastItem) : `الحديث ${arNum(lastN!)}`}
            </button>
          )}
        </Card>
      </div>

      {/* Always names the chapter you are in; opens the index. */}
      {toc && (
        <div dir="rtl" className="sticky z-20 px-3 pt-1 pb-2" style={{ top: topBar }}>
          <button
            type="button"
            onClick={() => setIndexOpen(true)}
            className="w-full flex items-center gap-2 rounded-2xl border border-(--stroke) px-3.5 py-2.5 text-right press-effect shadow-lg"
            style={{ background: "color-mix(in srgb, var(--bg) 86%, var(--accent) 6%)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
            aria-label="فهرس الكتاب"
          >
            <ListTree size={16} aria-hidden="true" className="text-(--accent) shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-(--fg)">
              {current ? shortChapterTitle(current.title) : "فهرس الكتاب"}
            </span>
            <span className="text-[11px] text-(--muted) shrink-0">{chapters.length > 1 ? "الفهرس" : "اذهب إلى رقم"}</span>
          </button>
        </div>
      )}

      {isLoading && (
        <div dir="rtl" role="status" aria-live="polite" aria-label="جارٍ فتح الكتاب" className="flex-1 flex items-center justify-center gap-2 px-6 py-10 text-(--muted)">
          <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          <span className="text-sm font-arabic">جارٍ فتح الكتاب…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div dir="rtl" className="flex-1 flex flex-col items-center justify-center gap-2 px-8 py-10 text-center">
          <p className="text-(--muted) font-arabic">تعذّر تحميل الكتاب</p>
          <p className="text-xs text-(--muted)">تأكد من اتصالك بالإنترنت ثم أعد المحاولة.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 rounded-xl border border-(--stroke) px-4 py-2 text-sm font-arabic text-(--accent) transition hover:bg-(--card)"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {toc && rows.length > 0 && (
        <div id="hbv-list-panel" className="relative z-10">
          <Virtuoso
            ref={virtuoso}
            useWindowScroll
            totalCount={rows.length}
            itemContent={renderItem}
            increaseViewportBy={{ top: 0, bottom: 800 }}
            rangeChanged={({ startIndex }) => {
              const id = chapterOfRow[Math.min(chapterOfRow.length - 1, startIndex + 1)] ?? null;
              setCurrentId((prev) => (prev === id ? prev : id));
            }}
          />
        </div>
      )}

      <BookIndex
        open={indexOpen}
        onClose={() => setIndexOpen(false)}
        chapters={chapters}
        activeId={current?.id ?? null}
        onPick={(id) => {
          const i = headerIndex.get(id);
          if (i != null) setTimeout(() => scrollToRow(i), 60);
        }}
        onJump={(n) => {
          const hit = toc ? rowByPrintedNumber(toc.rows, n) : undefined;
          if (!hit) return false;
          navigate(`/hadith/${bookKey}/${hit[0]}`);
          return true;
        }}
      />
    </div>
  );
}

export default HadithBookViewPage;
