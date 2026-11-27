/**
 * The one hadith search, shown on the hadith page («البحث») and in the app's
 * search («بحث ← الأحاديث»). It reads every word of all nine books
 * (fullHadithSearch.ts), offline after the first use, with filters by book,
 * grade, narrator and exact phrase, the true number of results, and voice
 * search («قل كلمات من الحديث»).
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Search, SlidersHorizontal, Square } from "lucide-react";
import toast from "react-hot-toast";
import type { HadithBookMeta } from "@/data/hadithTypes";
import { hadithPlaceLabel } from "@/data/hadithNumbers";
import {
  SEARCH_BOOKS,
  isFullHadithSearchReady,
  prewarmFullHadithSearch,
  searchHadithText,
  type GradeGroup,
  type HadithSearchOutcome,
} from "@/lib/fullHadithSearch";
import { highlightWindow } from "@/lib/arabicHighlight";
import { speechAvailable, startSpeechStream } from "@/lib/voiceTasbeeh";
import { BOOK, RESULT, countAr } from "@/lib/arabicCount";
import { arNum } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { GradeChip } from "@/components/hadith/GradeChip";

/** Results shown at a time. */
const PAGE = 40;
/** Stop listening after this long without a new word. */
const QUIET_MS = 3000;

const GRADES: [GradeGroup | null, string][] = [[null, "كل الدرجات"], ["sahih", "صحيح"], ["hasan", "حسن"], ["daif", "ضعيف وما دونه"]];

type Filters = { book: string | null; grade: GradeGroup | null; exactOnly: boolean; narrator: string };
const NO_FILTERS: Filters = { book: null, grade: null, exactOnly: false, narrator: "" };

export function HadithSearchPanel({ books, query: outerQuery }: { books: HadithBookMeta[]; query?: string }) {
  const navigate = useNavigate();
  const controlled = outerQuery !== undefined;
  const [ownQuery, setOwnQuery] = React.useState("");
  const query = controlled ? outerQuery : ownQuery;
  const [filters, setFilters] = React.useState<Filters>(NO_FILTERS);
  const [showFilters, setShowFilters] = React.useState(false);
  const [outcome, setOutcome] = React.useState<HadithSearchOutcome | null>(null);
  const [allCounts, setAllCounts] = React.useState<Record<string, number>>({});
  const [limit, setLimit] = React.useState(PAGE);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const runRef = React.useRef(0);
  const bookMeta = React.useCallback((key: string) => books.find((b) => b.key === key), [books]);

  React.useEffect(() => {
    prewarmFullHadithSearch();
  }, []);

  const runSearch = React.useCallback(async (q: string, f: Filters, max: number) => {
    const run = ++runRef.current;
    if (q.trim().length < 2 && f.narrator.trim().length < 2) {
      setOutcome(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ready = isFullHadithSearchReady();
    const found = await searchHadithText(q, {
      limit: max,
      books: f.book ? [f.book] : undefined,
      grade: f.grade,
      exactOnly: f.exactOnly,
      narrator: f.narrator,
      onProgress: ready ? undefined : (done, total) => run === runRef.current && setProgress({ done, total }),
    });
    if (run !== runRef.current) return;
    setProgress(null);
    setOutcome(found);
    if (!f.book) setAllCounts(found.byBook);
    setLoading(false);
  }, []);

  // Search as the words change (a moment after typing stops).
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLimit(PAGE);
      void runSearch(query, filters, PAGE);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, filters, runSearch]);

  const setFilter = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const showMore = () => {
    const next = limit + PAGE;
    setLimit(next);
    void runSearch(query, filters, next);
  };

  // ── Voice search: say some words of the hadith ──
  const [canListen, setCanListen] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const stopRef = React.useRef<(() => void) | null>(null);
  const quietRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => {
    let alive = true;
    void speechAvailable().then((ok) => alive && setCanListen(ok)).catch(() => undefined);
    return () => {
      alive = false;
      clearTimeout(quietRef.current);
      stopRef.current?.();
    };
  }, []);
  const stopListening = React.useCallback(() => {
    clearTimeout(quietRef.current);
    stopRef.current?.();
    stopRef.current = null;
    setListening(false);
  }, []);
  const listen = async () => {
    if (listening) {
      stopListening();
      return;
    }
    const segments = new Map<string, string>();
    try {
      stopRef.current = await startSpeechStream({
        hints: [],
        onTranscript: (e) => {
          segments.set(e.segment, e.text);
          const heard = [...segments.values()].join(" ").trim();
          setOwnQuery(heard);
          clearTimeout(quietRef.current);
          quietRef.current = setTimeout(stopListening, QUIET_MS);
        },
        onState: (state) => {
          if (state === "denied") toast.error("اسمح باستخدام الميكروفون لتبحث بصوتك");
          if (state === "denied" || state === "error" || state === "unavailable" || state === "stopped") setListening(false);
        },
      });
      setListening(true);
      quietRef.current = setTimeout(stopListening, QUIET_MS * 3);
    } catch {
      setListening(false);
      toast.error("لا يمكن الاستماع على هذا الجهاز");
    }
  };

  const countedBooks = Object.entries(allCounts).sort((x, y) => SEARCH_BOOKS.indexOf(x[0] as never) - SEARCH_BOOKS.indexOf(y[0] as never));
  const allTotal = countedBooks.reduce((sum, [, n]) => sum + n, 0);
  const results = outcome?.results ?? [];
  const searched = outcome !== null;
  const activeFilters = (filters.grade ? 1 : 0) + (filters.exactOnly ? 1 : 0) + (filters.narrator.trim() ? 1 : 0);

  return (
    <div dir="rtl">
      <div className="mb-3 flex items-center gap-2" role="search" aria-label="بحث في الأحاديث">
        {!controlled && (
          <div className="relative flex-1">
            <Search size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) pointer-events-none" />
            <input
              type="search"
              value={ownQuery}
              onChange={(e) => setOwnQuery(e.target.value)}
              placeholder="ابحث في نص الأحاديث…"
              dir="rtl"
              aria-label="البحث في كتب الحديث"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              className="w-full rounded-2xl border border-(--stroke) bg-(--card) py-3 pr-9 pl-4 text-sm font-arabic text-(--fg) outline-hidden focus:border-accent-45"
            />
          </div>
        )}
        {canListen && !controlled && (
          <button type="button" onClick={() => void listen()} aria-pressed={listening} aria-label={listening ? "أوقف الاستماع" : "ابحث بصوتك"}
            className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl border press-effect", listening ? "border-transparent bg-(--accent) text-(--on-accent)" : "border-(--stroke) bg-(--card) text-(--muted)")}
          >
            {listening ? <Square size={16} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
          </button>
        )}
        <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-label="خيارات البحث"
          className={cn("relative grid h-12 shrink-0 place-items-center rounded-2xl border px-3 press-effect", controlled ? "mr-auto" : "w-12", showFilters || activeFilters ? "border-accent-45 text-(--accent)" : "border-(--stroke) text-(--muted)", "bg-(--card)")}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          {activeFilters > 0 && <span className="absolute -top-1 -left-1 grid h-5 min-w-5 place-items-center rounded-full bg-(--accent) px-1 text-[10px] font-bold text-(--on-accent)">{arNum(activeFilters)}</span>}
        </button>
      </div>
      {listening && <p className="mb-3 text-xs text-(--accent) font-arabic" role="status">أصغي… قل كلمات من الحديث</p>}

      {showFilters && (
        <div className="mb-4 stack-y-3 rounded-2xl border border-(--stroke) bg-(--card) p-3.5">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-(--muted)">الدرجة</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="الدرجة">
              {GRADES.map(([g, label]) => (
                <button key={label} type="button" role="radio" aria-checked={filters.grade === g} onClick={() => setFilter({ grade: g })}
                  className={cn("rounded-full border px-3 py-1.5 text-xs", filters.grade === g ? "bg-(--accent) text-(--on-accent) border-transparent font-bold" : "bg-(--bg) border-(--stroke)")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-(--muted)">الراوي في الإسناد</span>
            <input value={filters.narrator} onChange={(e) => setFilter({ narrator: e.target.value })} placeholder="مثل: أبو هريرة، عائشة، ابن عمر" dir="rtl"
              className="w-full rounded-xl border border-(--stroke) bg-(--bg) px-3 py-2 text-sm font-arabic outline-hidden focus:border-accent-45" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>العبارة كما هي فقط</span>
            <input type="checkbox" checked={filters.exactOnly} onChange={(e) => setFilter({ exactOnly: e.target.checked })} className="h-5 w-5 accent-(--accent)" />
          </label>
          {activeFilters > 0 && (
            <button type="button" onClick={() => setFilters({ ...NO_FILTERS, book: filters.book })} className="text-xs font-semibold text-(--accent)">مسح الخيارات</button>
          )}
        </div>
      )}

      {/* The first search loads each book's text once; after that it is offline. */}
      {loading && progress && (
        <div className="mb-4 rounded-2xl border border-(--stroke) bg-(--card) p-3.5" role="status" aria-live="polite">
          <p className="text-[12px] font-arabic text-(--fg)">نجهّز البحث في نص كل الأحاديث، مرة واحدة فقط…</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-(--stroke)" aria-hidden="true">
            <div className="h-full rounded-full bg-(--accent) transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-(--muted)">{arNum(progress.done)} من {countAr(progress.total, BOOK)}</p>
        </div>
      )}
      {loading && !progress && (
        <div className="flex flex-col items-center py-10 gap-3 text-(--muted)" role="status">
          <div className="w-6 h-6 border-2 border-(--accent) border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-arabic">جارٍ البحث…</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Search size={36} aria-hidden="true" className="text-(--muted) opacity-30" />
          <p className="text-sm text-(--muted) font-arabic">لا توجد نتائج</p>
          {activeFilters > 0 ? <p className="text-xs text-(--muted)">جرّب بلا خيارات البحث.</p> : null}
          {outcome?.missing.length ? <p className="text-xs text-(--muted) text-center">بعض الكتب لم تُحمَّل بعد، اتصل بالإنترنت مرة ليكتمل البحث.</p> : null}
        </div>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Search size={36} aria-hidden="true" className="text-(--muted) opacity-20" />
          <p className="text-sm text-(--muted) font-arabic text-center">ابحث بكلمة أو جملة من أي موضع في الحديث، في الكتب كلها</p>
          <p className="text-xs text-(--muted) font-arabic opacity-70 text-center">لا يهم التشكيل ولا الهمزات</p>
        </div>
      )}

      {!loading && results.length > 0 && outcome && (
        <div className="stack-y-3 pb-6">
          <p className="text-xs text-(--muted) font-arabic" aria-live="polite" aria-atomic="true">
            {countAr(outcome.total, RESULT)}
            {!filters.book && countedBooks.length > 1 ? ` في ${countAr(countedBooks.length, BOOK)}` : ""}
          </p>
          {countedBooks.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1" role="radiogroup" aria-label="تصفية بالكتاب">
              {([[null, "الكل", allTotal], ...countedBooks.map(([key, n]) => [key, bookMeta(key)?.title ?? key, n])] as [string | null, string, number][]).map(([key, label, n]) => (
                <button key={key ?? "all"} type="button" role="radio" aria-checked={filters.book === key} onClick={() => setFilter({ book: key })}
                  className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", filters.book === key ? "bg-(--accent) text-(--on-accent) border-transparent font-bold" : "bg-(--card) border-(--stroke)")}
                >
                  {label} <span className="opacity-60 tabular-nums">{arNum(n)}</span>
                </button>
              ))}
            </div>
          )}
          {results.map((r) => {
            const meta = bookMeta(r.bookKey);
            return (
              <button
                key={`${r.bookKey}:${r.n}`}
                type="button"
                dir="rtl"
                onClick={() => navigate(`/hadith/${r.bookKey}/${r.n}`)}
                className="relative w-full overflow-hidden rounded-3xl border border-(--stroke) bg-(--card) text-right press-effect"
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: (meta?.color ?? "#888") + "22", color: meta?.color ?? "#888" }}>
                      {meta?.title ?? r.bookKey}
                    </span>
                    <span className="text-[10px] text-(--muted)">{hadithPlaceLabel({ a: r.n, r: r.ref ?? String(r.n) })}</span>
                    {r.grade && <GradeChip grade={r.grade} size="sm" />}
                  </div>
                  {/* The words that matched, in their place in the text. */}
                  <p className="text-[13px] font-arabic text-(--fg) leading-relaxed line-clamp-3">
                    {highlightWindow(r.snippet, query.trim().length >= 2 ? query : filters.narrator).map((part, i) =>
                      part.hit ? (
                        <mark key={i} className="rounded px-0.5 font-bold text-(--fg)" style={{ background: "color-mix(in srgb, var(--accent) 28%, transparent)" }}>{part.text}</mark>
                      ) : (
                        <React.Fragment key={i}>{part.text}</React.Fragment>
                      ),
                    )}
                  </p>
                </div>
              </button>
            );
          })}
          {results.length < (filters.book ? outcome.byBook[filters.book] ?? 0 : outcome.total) && (
            <button type="button" onClick={showMore} className="w-full rounded-2xl border border-(--stroke) bg-(--card) py-3 text-sm font-semibold press-effect">
              عرض المزيد
            </button>
          )}
        </div>
      )}
    </div>
  );
}
