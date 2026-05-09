/**
 * HadithBooks — Phase 7
 * Gallery of 9 hadith books with الأربعينيات hero (7E), Fuse.js global search (7B).
 * Route: /hadith
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Library, BookOpen, Bookmark, BrainCircuit, Copy } from "lucide-react";
import Fuse from "fuse.js";
import { HADITH_BOOKS_STATIC, HADITH_GRADE_LABELS, type HadithBookMeta, type HadithItem } from "@/data/hadithTypes";
import { useHadithIndex, loadHadithPack } from "@/data/useHadithBook";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

/* ------------------------------------------------------------------ */
/* Grade chip                                                            */
/* ------------------------------------------------------------------ */

const GRADE_COLORS: Record<string, string> = {
  sahih: "#10b981",
  hasan: "#f59e0b",
  daif: "#ef4444",
  maudu: "#6b7280",
};

function GradeChip({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade] ?? "#6b7280";
  const label = HADITH_GRADE_LABELS[grade] ?? grade;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* الأربعينيات hero card (7E)                                           */
/* ------------------------------------------------------------------ */

function ArbainiCard({ book }: { book: HadithBookMeta }) {
  const navigate = useNavigate();
  const hadithProgress = useNoorStore((s) => s.hadithProgress);
  const lastN = hadithProgress[book.key];
  const isNawawi = book.key === "nawawi";

  return (
    <button type="button"
      dir="rtl"
      onClick={() => navigate(`/hadith/${book.key}`)}
      className="relative flex-1 min-w-[140px] overflow-hidden rounded-3xl text-right glass-strong glass-hover press-effect"
      style={{ borderColor: "color-mix(in srgb, var(--accent) 28%, transparent)" }}
    >
      <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
      <div className="absolute inset-y-0 right-0 w-1 opacity-80" style={{ background: "var(--accent)" }} />
      <div className="relative p-4">
        {/* Badge row */}
        <div className="flex items-center justify-between mb-2">
          {isNawawi ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: book.color + "44", color: book.color }}>
              الأربعون النووية
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: book.color + "44", color: book.color }}>
              الأحاديث القدسية
            </span>
          )}
          <GradeChip grade="sahih" />
        </div>
        {/* Title */}
        <p className="text-sm font-bold font-arabic text-[var(--fg)] leading-tight mb-1">
          {book.title}
        </p>
        <p className="text-[10px] text-[var(--muted)] mb-3" lang="en">{book.titleEn}</p>
        {/* Count + progress */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-arabic" style={{ color: book.color }}>
            {book.count} حديث
          </span>
          {lastN ? (
            <span className="text-[9px] text-[var(--muted)]">ح{lastN}</span>
          ) : (
            <span className="text-[9px] text-[var(--muted)] opacity-60">لم يُقرأ</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Regular book card                                                     */
/* ------------------------------------------------------------------ */

function BookCard({ book }: { book: HadithBookMeta }) {
  const navigate = useNavigate();
  const hadithProgress = useNoorStore((s) => s.hadithProgress);
  const lastN = hadithProgress[book.key];
  const hadithBookmarks = useNoorStore((s) => s.hadithBookmarks);
  const bookmarkCount = Object.keys(hadithBookmarks).filter((k) => k.startsWith(book.key + ":")).length;

  return (
    <button type="button"
      dir="rtl"
      onClick={() => navigate(`/hadith/${book.key}`)}
      className="relative w-full overflow-hidden rounded-3xl text-right glass glass-hover press-effect cv-auto"
    >
      <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
      {/* Left accent bar */}
      <div className="absolute top-0 right-0 h-full w-1 opacity-75" style={{ background: book.color }} />

      <div className="relative px-4 py-3.5 pr-5">
        <div className="flex items-start gap-3">
          {/* Color dot */}
          <div className="mt-1 w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: book.color + "22" }}>
            <span className="text-sm font-bold font-arabic" style={{ color: book.color }}>
              {book.order}
            </span>
          </div>
          {/* Text block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold font-arabic text-[var(--fg)] leading-tight line-clamp-2">
                {book.title}
              </p>
              <GradeChip grade={book.grade === "mixed" ? "hasan" : book.grade} />
            </div>
            <p className="text-[10px] text-[var(--muted)] mb-2" lang="en">{book.titleEn}</p>
            <p className="text-[11px] text-[var(--fg)] opacity-70 leading-snug line-clamp-2 font-arabic">
              {book.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2.5 flex items-center justify-between border-t border-[var(--stroke)] pt-2.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <BookOpen size={10} aria-hidden="true" />
              {book.count.toLocaleString("ar-EG")}
            </span>
            {bookmarkCount > 0 && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: book.color }}>
                <Bookmark size={10} aria-hidden="true" />
                {bookmarkCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastN ? (
              <span className="text-[9px] text-[var(--muted)]">آخر: ح{lastN}</span>
            ) : null}
            <ArrowRight size={12} aria-hidden="true" className="text-[var(--muted)] rotate-180" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Search tab (7B) — Fuse.js across loaded packs                        */
/* ------------------------------------------------------------------ */

type SearchResult = {
  bookKey: string;
  bookTitle: string;
  bookColor: string;
  item: HadithItem;
};

function SearchTab({ books }: { books: HadithBookMeta[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    // Load packs lazily; smaller books first for UX
    const priorityOrder = ["nawawi", "qudsi", "bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"];
    const allResults: SearchResult[] = [];

    for (const key of priorityOrder) {
      try {
        const pack = await loadHadithPack(key);
        if (!pack) continue;
        const fuse = new Fuse(pack.hadiths, {
          keys: ["t"],
          threshold: 0.35,
          minMatchCharLength: 2,
        });
        const hits = fuse.search(q, { limit: 5 });
        const meta = books.find((b) => b.key === key);
        for (const h of hits) {
          allResults.push({
            bookKey: key,
            bookTitle: meta?.title ?? key,
            bookColor: meta?.color ?? "#888",
            item: h.item,
          });
        }
        if (allResults.length >= 50) break;
      } catch {
        // skip failed pack
      }
    }

    setResults(allResults.slice(0, 50));
    setLoading(false);
  }, [books]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 500);
  };

  const previewText = (t: string) => {
    const markers = [" قَالَ:", " قَالَ :", "قال:", "أَنَّ رَسُولَ", "أن رسول الله", "عَنِ النَّبِيِّ"];
    let matnStart = -1;
    for (const m of markers) {
      const idx = t.indexOf(m);
      if (idx !== -1 && (matnStart === -1 || idx < matnStart)) matnStart = idx;
    }
    const text = matnStart > 0 ? t.slice(matnStart + 1) : t;
    return text.slice(0, 120) + (text.length > 120 ? "…" : "");
  };

  return (
    <div dir="rtl" className="px-4 pt-4">
      {/* Search input */}
      <div className="relative mb-5" role="search" aria-label="بحث في الأحاديث">
        <Search size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="ابحث في الأحاديث…"
          dir="rtl"
          aria-label="البحث في كتب الحديث"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          className="w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] py-3 pr-9 pl-4 text-sm font-arabic text-[var(--fg)] outline-none focus:border-accent-45"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--muted)]" role="status">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-arabic">جارٍ البحث…</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Search size={36} aria-hidden="true" className="text-[var(--muted)] opacity-30" />
          <p className="text-sm text-[var(--muted)] font-arabic">لا توجد نتائج</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Search size={36} aria-hidden="true" className="text-[var(--muted)] opacity-20" />
          <p className="text-sm text-[var(--muted)] font-arabic">ابحث في جميع الكتب التسعة</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3 pb-6">
          <p className="text-xs text-[var(--muted)] font-arabic" aria-live="polite" aria-atomic="true">
            {results.length >= 50 ? "أكثر من 50" : results.length} نتيجة
          </p>
          {results.map((r) => (
            <button type="button"
              key={`${r.bookKey}:${r.item.n}`}
              dir="rtl"
              onClick={() => navigate(`/hadith/${r.bookKey}/${r.item.n}`)}
              className="group relative w-full overflow-hidden rounded-3xl text-right glass glass-hover press-effect"
            >
              <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
              <div className="relative px-4 py-3">
                {/* Book tag */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: r.bookColor + "22", color: r.bookColor }}>
                    {r.bookTitle}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">ح{r.item.n}</span>
                  {r.item.g?.length > 0 && <GradeChip grade={r.item.g[0]!} />}
                  <button type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try { await navigator.clipboard.writeText(r.item.t); toast.success("تم النسخ"); }
                      catch { toast.error("تعذر النسخ"); }
                    }}
                    className="mr-auto p-1 rounded-lg opacity-40 hover:opacity-80 transition-opacity"
                    aria-label="نسخ الحديث"
                  >
                    <Copy size={12} aria-hidden="true" />
                  </button>
                </div>
                {/* Preview */}
                <p className="text-[12px] font-arabic text-[var(--fg)] leading-relaxed line-clamp-3">
                  {previewText(r.item.t)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */

export function HadithBooksPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const { data: indexBooks } = useHadithIndex();
  const books = indexBooks ?? HADITH_BOOKS_STATIC;
  const [tab, setTab] = useState<"library" | "search">("library");

  // Sort by order
  const sorted = useMemo(() => [...books].sort((a, b) => a.order - b.order), [books]);

  // Separate arba'iniyat from rest
  const arbaini = useMemo(() => sorted.filter((b) => b.key === "nawawi" || b.key === "qudsi"), [sorted]);
  const mainBooks = useMemo(() => sorted.filter((b) => b.key !== "nawawi" && b.key !== "qudsi"), [sorted]);

  const totalHadiths = useMemo(() => sorted.reduce((s, b) => s + b.count, 0), [sorted]);

  return (
    <div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24 page-enter">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" aria-hidden />
      {/* Header Card */}
      <div className="relative z-10 px-4 pt-4">
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
          <div className="flex items-center gap-3">
            <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Library size={19} aria-hidden="true" className="text-[var(--accent)]" />
                <h1 className="text-lg font-bold">الكتب الحديثية</h1>
              </div>
              <div className="text-xs opacity-55 mt-1">الكتب الستة وما يلحق بها</div>
            </div>
            <IconButton aria-label="بطاقات الحفظ" onClick={() => navigate("/hadith/memo")}>
              <BrainCircuit size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
            </IconButton>
          </div>
        </Card>
      </div>

      {/* Stats banner */}
      <div className="relative z-10 mx-4 mt-4 mb-4 flex items-center gap-4 overflow-hidden rounded-3xl px-5 py-3.5 glass-strong">
        <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
        <div className="relative flex-1 border-l border-[var(--stroke)] text-center">
          <p className="text-xl font-bold text-[var(--fg)] font-arabic">{sorted.length}</p>
          <p className="text-[10px] text-[var(--muted)]">كتاب</p>
        </div>
        <div className="relative flex-1 text-center">
          <p className="text-xl font-bold text-[var(--fg)] font-arabic">
            {totalHadiths >= 1000 ? `${Math.round(totalHadiths / 1000)}k` : totalHadiths.toLocaleString("ar-EG")}
          </p>
          <p className="text-[10px] text-[var(--muted)]">حديث نبوي</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="relative z-10 mx-4 mb-5 flex overflow-hidden rounded-2xl glass" role="tablist" aria-label="أقسام الحديث"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
        {(["library", "search"] as const).map((t) => (
          <button type="button"
            key={t}
            id={`hadith-books-tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-arabic transition-colors"
            style={tab === t
              ? { background: "var(--accent)", color: "var(--on-accent)", fontWeight: 700 }
              : { color: "var(--muted)" }
            }
          >
            {t === "library" ? <BookOpen size={14} aria-hidden="true" /> : <Search size={14} aria-hidden="true" />}
            {t === "library" ? "المكتبة" : "البحث"}
          </button>
        ))}
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <div className="relative z-10" role="tabpanel" id="hadith-books-panel-library" aria-labelledby="hadith-books-tab-library" tabIndex={0}>
          {/* 7E: الأربعينيات hero */}
          {arbaini.length > 0 && (
            <div className="px-4 mb-6">
              {/* Section heading */}
              <div className="relative mb-3 overflow-hidden rounded-3xl p-4 glass-strong">
                <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg" aria-hidden="true">✨</span>
                    <p className="text-base font-bold font-arabic text-[var(--fg)]">الأربعينيات المباركة</p>
                  </div>
                  <p className="text-xs text-[var(--muted)] font-arabic leading-relaxed">
                    الأحاديث المختارة التي يحفظها كل مسلم
                  </p>
                </div>
              </div>
              {/* Two arba'iniyat cards */}
              <div className="flex gap-3">
                {arbaini.map((b) => (
                  <ArbainiCard key={b.key} book={b} />
                ))}
              </div>
            </div>
          )}

          {/* Main books */}
          <div className="px-4 space-y-3 mb-4">
            <p className="text-xs text-[var(--muted)] font-arabic px-1">الكتب الكبرى</p>
            <div role="list" aria-label="الكتب الكبرى">
              {mainBooks.map((book) => (
                <div key={book.key} role="listitem">
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          </div>

          {/* Attribution */}
          <p className="text-center text-[10px] text-[var(--muted)] mt-2 px-4 pb-4 leading-relaxed font-arabic">
            المصدر: مشروع hadith-api (Unlicense) • fawazahmed0/hadith-api
          </p>
        </div>
      )}

      {/* Search tab */}
      {tab === "search" && <div role="tabpanel" id="hadith-books-panel-search" aria-labelledby="hadith-books-tab-search" tabIndex={0}><SearchTab books={sorted} /></div>}
    </div>
  );
}

export default HadithBooksPage;