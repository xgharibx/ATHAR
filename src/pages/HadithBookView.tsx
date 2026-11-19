/**
 * A hadith book: its chapters («كتاب الإيمان»، «كتاب الصلاة»…) as headers in
 * one long list that scrolls with the page, a bar that always names the
 * chapter you are in, and a book index to jump to any chapter or number.
 * Route: /hadith/:bookKey
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ArrowRight, Bookmark, BookOpenText, Copy, Hash, ListTree, Loader2, StickyNote, WifiOff } from "lucide-react";
import { useHadithPackProgress, HADITH_PACK_SIZES_MB } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC, hadithPreview, type HadithItem } from "@/data/hadithTypes";
import { stripDiacritics } from "@/lib/arabic";
import { cleanHadithText, splitHadithText } from "@/lib/hadithText";
import { useNoorStore } from "@/store/noorStore";
import { Modal } from "@/components/ui/Modal";
import { shortChapterTitle } from "@/data/hadithChapters";
import { BOOK, HADITH, countAr } from "@/lib/arabicCount";
import { Card } from "@/components/ui/Card";
import { GradeChip } from "@/components/hadith/GradeChip";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { arNum } from "@/lib/formatNumber";
import { writeClipboard } from "@/lib/nativeUI";


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

function HadithRow({ item, bookKey }: { item: HadithItem; bookKey: string }) {
  const navigate = useNavigate();
  const key = `${bookKey}:${item.n}`;
  const isBookmarked = useNoorStore((s) => !!s.hadithBookmarks[key]);
  const hasNote = useNoorStore((s) => !!s.hadithNotes[key]);
  const open = () => navigate(`/hadith/${bookKey}/${item.n}`);

  return (
    <div className="mx-3 my-2">
      <div
        dir="rtl"
        role="button"
        tabIndex={0}
        aria-label={`الحديث ${arNum(item.a)}`}
        onClick={open}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()}
        className="group relative w-full overflow-hidden rounded-3xl border border-(--stroke) p-4 text-right transition cursor-pointer glass-strong glass-hover press-effect"
      >
        <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
        <div className="absolute inset-y-0 right-0 w-1.5 opacity-90" style={{ background: "var(--accent)" }} />
        <div className="relative pr-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>
              {arNum(item.a)}
            </span>
            {item.g[0] && <GradeChip grade={item.g[0]} size="sm" />}
            <span className="mr-auto flex items-center gap-1.5">
              {hasNote && <StickyNote size={14} aria-label="عليه ملاحظتك" className="text-(--accent)" />}
              {isBookmarked && <Bookmark size={14} aria-label="محفوظ" className="fill-current text-(--accent)" />}
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const systemConfirmed = await writeClipboard(cleanHadithText(item.t));
                    if (!systemConfirmed) toast.success("تم النسخ");
                  } catch {
                    toast.error("تعذر النسخ");
                  }
                }}
                className="rounded-lg border border-(--stroke) bg-(--card) p-1.5 opacity-55 transition-opacity hover:opacity-90 press-effect"
                style={{ color: "var(--fg)" }}
                aria-label="نسخ الحديث"
              >
                <Copy size={13} aria-hidden="true" />
              </button>
            </span>
          </div>
          {item.t.trim() ? (
            <p className="arabic-text text-base leading-8 font-semibold text-(--fg) line-clamp-3">{rowPreview(item.t)}</p>
          ) : (
            <p className="text-sm text-(--muted)">نص هذا الحديث غير متوفر في هذه النسخة.</p>
          )}
        </div>
      </div>
    </div>
  );
}

type ListRow =
  | { type: "header"; sectionId: number; title: string; index: number; count: number }
  | { type: "hadith"; item: HadithItem };

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
  chapters: { id: number; title: string; index: number; count: number; first: number }[];
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
                <span className="block text-[11px] text-(--muted)">{countAr(c.count, HADITH)}، من الحديث {arNum(c.first)}</span>
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
  const { data: pack, isLoading, isError, progress, isFromCache, refetch } = useHadithPackProgress(bookKey);
  const lastN = useNoorStore((s) => s.hadithProgress[bookKey ?? ""]);
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const topBar = useTopBarHeight();

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  const meta = pack ?? HADITH_BOOKS_STATIC.find((b) => b.key === bookKey);

  // One list: a header before the first hadith of each chapter.
  const { rows, chapters, headerIndex, chapterOfRow } = useMemo(() => {
    const rows: ListRow[] = [];
    const chapterOfRow: (number | null)[] = [];
    const headerIndex = new Map<number, number>();
    const chapters: { id: number; title: string; index: number; count: number; first: number }[] = [];
    if (!pack) return { rows, chapters, headerIndex, chapterOfRow };
    const byId = new Map(pack.sections.map((s) => [s.id, s]));
    const counts = new Map<number, number>();
    for (const h of pack.hadiths) counts.set(h.s, (counts.get(h.s) ?? 0) + 1);
    const showHeaders = pack.sections.length > 1;
    let lastId = -1;
    for (const item of pack.hadiths) {
      if (showHeaders && item.s !== lastId) {
        lastId = item.s;
        const section = byId.get(item.s);
        if (section?.title) {
          const index = chapters.length + 1;
          chapters.push({ id: item.s, title: section.title, index, count: counts.get(item.s) ?? 0, first: item.a as number });
          headerIndex.set(item.s, rows.length);
          rows.push({ type: "header", sectionId: item.s, title: section.title, index, count: counts.get(item.s) ?? 0 });
          chapterOfRow.push(item.s);
        }
      }
      rows.push({ type: "hadith", item });
      chapterOfRow.push(showHeaders ? item.s : null);
    }
    return { rows, chapters, headerIndex, chapterOfRow };
  }, [pack]);

  const chapterTitle = (id: number | null) => (id == null ? null : chapters.find((c) => c.id === id) ?? null);
  const current = chapterTitle(currentId) ?? chapters[0] ?? null;

  const lastIndex = useMemo(() => {
    if (!lastN) return null;
    const idx = rows.findIndex((r) => r.type === "hadith" && r.item.n === lastN);
    return idx >= 0 ? idx : null;
  }, [lastN, rows]);

  const scrollToRow = useCallback((index: number) => {
    virtuoso.current?.scrollToIndex({ index, align: "start", offset: -(topBar + 64) });
  }, [topBar]);

  const renderItem = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return null;
      if (row.type === "header") return <ChapterHeader title={row.title} index={row.index} count={row.count} />;
      return <HadithRow item={row.item} bookKey={bookKey!} />;
    },
    [rows, bookKey],
  );

  return (
    <div className="relative flex min-h-screen-safe flex-col page-enter pb-floating-nav">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" aria-hidden />
      <div dir="rtl" className="relative z-10 px-3 pt-2 pb-2">
        <Card className="relative overflow-hidden p-4">
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
          <div className="absolute inset-y-0 right-0 w-1.5" style={{ background: meta?.color ?? "var(--accent)" }} />
          <div className="relative flex items-center gap-3 pr-2">
            <button type="button"
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-2xl border border-(--stroke) bg-(--card) grid place-items-center transition hover:bg-(--card-2) shrink-0"
              aria-label="رجوع"
            >
              <ArrowRight size={19} aria-hidden="true" className="text-(--fg)" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-lg text-(--fg) font-arabic leading-tight truncate" dir="rtl">
                {meta?.title ?? bookKey}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs opacity-65 flex-wrap">
                <span>{countAr(pack?.count ?? meta?.count ?? 0, HADITH)}{chapters.length > 1 ? `، ${countAr(chapters.length, BOOK)}` : ""}</span>
                {isFromCache && !isOnline && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#10b98122", color: "#10b981" }}>
                    <WifiOff size={10} aria-hidden="true" /> محفوظ للقراءة بلا إنترنت
                  </span>
                )}
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
              أكمل من الحديث {arNum(lastN!)}
            </button>
          )}
        </Card>
      </div>

      {/* Always names the chapter you are in; opens the index. */}
      {pack && (
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
        <div dir="rtl" role="status" aria-live="polite" aria-atomic="true" aria-label="جارٍ تحميل الكتاب" className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm rounded-3xl glass-strong border border-(--stroke) p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
                <BookOpenText size={20} aria-hidden="true" className="text-(--accent)" />
              </div>
              <div>
                <p className="font-bold text-sm font-arabic" style={{ color: "var(--fg)" }}>{meta?.title ?? "جارٍ التحميل"}</p>
                <p className="text-xs font-arabic" style={{ color: "var(--muted)" }}>
                  {bookKey && HADITH_PACK_SIZES_MB[bookKey]
                    ? `يُحفظ مرة واحدة لتقرأه بلا إنترنت (نحو ${arNum(HADITH_PACK_SIZES_MB[bookKey])} ميغابايت)`
                    : "جارٍ التحميل…"}
                </p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "var(--accent)" }} />
            </div>
            <p className="text-center text-xs font-arabic" style={{ color: "var(--muted)" }}>
              {progress < 5 ? "يبدأ التحميل…" : progress >= 100 ? "اكتمل التحميل" : `${arNum(progress)}٪`}
            </p>
          </div>
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

      {pack && rows.length > 0 && (
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
          const hit = pack?.hadiths.find((h) => h.n === n || Number(h.a) === n);
          if (!hit) return false;
          navigate(`/hadith/${bookKey}/${hit.n}`);
          return true;
        }}
      />
    </div>
  );
}

export default HadithBookViewPage;
