/**
 * HadithBooks — Phase 7
 * Gallery of 9 hadith books with الأربعينيات hero (7E), full-corpus search (7B).
 * Route: /hadith
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search, Library, BookOpen, Bookmark, BrainCircuit, Copy, Check, Heart, Share2, Sparkles } from "lucide-react";
import { HADITH_BOOKS_STATIC, type HadithBookMeta } from "@/data/hadithTypes";
import { useHadithIndex } from "@/data/useHadithBook";
import { searchFullHadithCorpus, prewarmFullHadithSearch, type FullHadithSearchResult } from "@/lib/fullHadithSearch";
import { useIslamicLibraryDB } from "@/data/useIslamicLibraryDB";
import type { FlatLibraryEntry, LibraryCollection } from "@/data/libraryTypes";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { GradeChip } from "@/components/hadith/GradeChip";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { cn } from "@/lib/utils";
import { stripDiacritics } from "@/lib/arabic";
import { arNum } from "@/lib/formatNumber";


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
              {arNum(book.count)}
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
/* Curated tab — the 69 hand-picked, editorially-annotated hadiths      */
/* (benefits, tags, collections). Used to live on its own page at        */
/* /library/hadith with a different header and different stats than      */
/* this page — confusing (is it 69 hadiths or 36,000?) since both were    */
/* reachable as "أحاديث". Merged in here as one more facet of the same   */
/* hadith experience instead of a second page.                          */
/* ------------------------------------------------------------------ */

const CURATED_GRADE_LABELS: Record<string, string> = {
  agreed: "متفق عليه",
  sahih: "صحيح",
  hasan: "حسن",
  curated: "تحريري",
};

function curatedEntryPreview(entry: FlatLibraryEntry) {
  return entry.arabic.length > 230 ? `${entry.arabic.slice(0, 230)}…` : entry.arabic;
}

async function copyCuratedEntry(entry: FlatLibraryEntry) {
  await navigator.clipboard.writeText(`${entry.arabic}\n\n${entry.source.title}${entry.narrator ? ` — ${entry.narrator}` : ""}`);
}

function CuratedEntryCard({ entry }: { entry: FlatLibraryEntry }) {
  const navigate = useNavigate();
  const favorite = useNoorStore((s) => !!s.libraryFavorites[entry.key]);
  const toggleLibraryFavorite = useNoorStore((s) => s.toggleLibraryFavorite);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const onCopy = async () => {
    try {
      await copyCuratedEntry(entry);
      setCopied(true);
      toast.success("تم النسخ");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const onShare = async () => {
    const text = `${entry.arabic}\n\n${entry.source.title}`;
    try {
      if (navigator.share) await navigator.share({ title: entry.title, text });
      else await navigator.clipboard.writeText(text);
      toast.success("جاهز للمشاركة");
    } catch {
      toast.error("تعذرت المشاركة");
    }
  };

  return (
    <Card className="p-4 overflow-hidden relative">
      <div className="absolute inset-y-0 right-0 w-1.5 opacity-80" style={{ background: entry.collectionAccent }} />
      <div className="flex items-start justify-between gap-3">
        <button type="button"
          onClick={() => navigate(`/library/${entry.collectionId}/${entry.id}`)}
          className="min-w-0 flex-1 text-right"
        >
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-base">{entry.collectionIcon}</span>
            <span className="text-xs font-semibold" style={{ color: entry.collectionAccent }}>{entry.collectionTitle}</span>
            <Badge className="px-2 py-0.5 text-[10px]">{entry.chapterTitle}</Badge>
            <Badge className="px-2 py-0.5 text-[10px]">{CURATED_GRADE_LABELS[entry.grade] ?? entry.grade}</Badge>
          </div>
          <div className="text-sm font-semibold opacity-75 mb-2 arabic-text">{entry.title}</div>
          <div className="arabic-text text-base md:text-lg leading-9 font-medium text-right">{curatedEntryPreview(entry)}</div>
        </button>
        <ArrowUpRight size={17} className="opacity-45 shrink-0 mt-1" aria-hidden="true" />
      </div>

      <div className="mt-3 border-t border-[var(--stroke)] pt-3 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs opacity-65">
          <span>{entry.narrator || "فائدة محررة"}</span>
          <span className="font-semibold">{entry.source.title}</span>
        </div>
        {entry.benefits[0] && <div className="text-xs opacity-60 leading-6 line-clamp-2">{entry.benefits[0]}</div>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {entry.tags.slice(0, 3).map((tag) => <Badge key={tag} className="px-2 py-0.5 text-[10px]">{tag}</Badge>)}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <IconButton aria-label="نسخ" onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}</IconButton>
            <IconButton aria-label="مفضلة" aria-pressed={favorite} onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>
              <Heart size={15} aria-hidden="true" className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />
            </IconButton>
            <IconButton aria-label="مشاركة" onClick={onShare}><Share2 size={15} /></IconButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CuratedCollectionCard({ collection, active, onClick }: { collection: LibraryCollection; active: boolean; onClick: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-w-[220px] text-right rounded-3xl border p-4 transition press-effect",
        active ? "bg-[var(--card)] border-[var(--stroke)]" : "glass border-[var(--stroke)] hover:bg-[var(--card-2)]"
      )}
      style={active ? { borderColor: collection.accent } : undefined}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{collection.icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: collection.accent }}>{collection.title}</div>
          <div className="text-[11px] opacity-50 truncate">{collection.subtitle}</div>
        </div>
      </div>
      <div className="text-xs opacity-60 leading-5 line-clamp-2">{collection.description}</div>
      <div className="mt-3 text-[11px] opacity-45 tabular-nums">{arNum(collection.entries.length)} مادة</div>
    </button>
  );
}

function CuratedTab() {
  const { data, isLoading, error } = useIslamicLibraryDB();
  const [q, setQ] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const fuse = useMemo(() => {
    if (!data) return null;
    return new Fuse(data.flat, {
      includeScore: true,
      threshold: 0.25,
      keys: [
        { name: "searchText", weight: 3 },
        { name: "arabic", weight: 3 },
        { name: "title", weight: 2 },
        { name: "narrator", weight: 1.5 },
        { name: "tags", weight: 1.2 },
        { name: "source.title", weight: 1 },
      ],
    });
  }, [data]);

  const tags = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    for (const entry of data.flat) {
      for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  }, [data]);

  const entries = useMemo(() => {
    if (!data) return [] as FlatLibraryEntry[];
    const base = q.trim() && fuse
      ? fuse.search(stripDiacritics(q.trim())).map((result) => result.item)
      : data.flat;
    return base
      .filter((entry) => collectionFilter === "all" || entry.collectionId === collectionFilter)
      .filter((entry) => !tagFilter || entry.tags.includes(tagFilter))
      .slice(0, q.trim() ? 80 : 200);
  }, [collectionFilter, data, fuse, q, tagFilter]);

  const featuredIndex = Math.floor(Date.now() / 86400000) % (data?.flat.length ?? 1);
  const featured = data?.flat[featuredIndex] ?? null;
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="px-4 pt-4 space-y-3" role="status" aria-label="جارٍ التحميل…"><span className="sr-only">جارٍ التحميل…</span><div className="skeleton h-8 w-44 rounded-xl" /><div className="skeleton h-20 w-full rounded-2xl mt-4" /></div>;
  }
  if (error || !data) {
    return <div className="px-4 pt-4"><Card className="p-5"><div className="font-semibold">تعذر تحميل المختارات</div><div className="text-sm opacity-60 mt-2">أعد فتح الصفحة بعد قليل.</div></Card></div>;
  }

  return (
    <div dir="rtl" className="px-4 pt-2 space-y-4">
      {featured && (
        <button type="button"
          onClick={() => navigate(`/library/${featured.collectionId}/${featured.id}`)}
          className="w-full text-right rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4 hover:bg-[var(--card-2)] transition"
        >
          <div className="flex items-center gap-2 mb-2"><Sparkles size={15} className="text-[var(--accent)]" aria-hidden="true" /><span className="text-xs font-semibold opacity-60">بداية مقترحة</span></div>
          {featured.title && <div className="text-xs font-semibold mb-1 font-arabic" style={{ color: featured.collectionAccent }}>{featured.collectionTitle} · {featured.title}</div>}
          <div className="arabic-text leading-8 text-sm md:text-base line-clamp-3">{featured.arabic}</div>
          <div className="text-xs opacity-50 mt-2">{featured.source.title}</div>
        </button>
      )}

      <div className="relative" role="search" aria-label="بحث في المختارات">
        <Search size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
        <Input value={q} onChange={(event) => setQ(event.target.value)} type="search" placeholder="ابحث في المختارات، الراوي، أو الموضوع…" aria-label="بحث في المختارات" spellCheck={false} autoComplete="off" autoCapitalize="none" className="pr-9" />
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
        <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
          <CuratedCollectionCard
            collection={{ ...data.db.collections[0]!, id: "all", title: "الكل", subtitle: "كل المختارات", description: "اعرض كل المواد المتاحة داخل التطبيق.", icon: "🌟", accent: "var(--accent)", entries: data.flat }}
            active={collectionFilter === "all"}
            onClick={() => setCollectionFilter("all")}
          />
          {data.db.collections.map((collection) => (
            <CuratedCollectionCard key={collection.id} collection={collection} active={collectionFilter === collection.id} onClick={() => setCollectionFilter(collection.id)} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="تصفية بالموضوع">
        <button type="button"
          onClick={() => setTagFilter(null)}
          aria-pressed={!tagFilter}
          className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", !tagFilter ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}
        >
          كل الموضوعات
        </button>
        {tags.map(([tag, count]) => (
          <button type="button"
            key={tag}
            aria-pressed={tagFilter === tag}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", tagFilter === tag ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}
          >
            {tag} <span className="opacity-60 tabular-nums">{arNum(count)}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-sm font-semibold">المواد المختارة</div>
        <div className="text-xs opacity-50 tabular-nums" aria-live="polite" aria-atomic="true">{arNum(entries.length)}</div>
      </div>

      <div className="space-y-3 pb-4" role="list" aria-label="المواد المختارة">
        {entries.map((entry) => <div key={entry.key} role="listitem"><CuratedEntryCard entry={entry} /></div>)}
        {entries.length === 0 && (
          <div dir="rtl" className="flex flex-col items-center py-12 gap-4">
            <Search size={40} aria-hidden="true" className="text-[var(--muted)] opacity-20" />
            <p className="text-sm text-[var(--muted)] font-arabic text-center">لا توجد نتائج للفلاتر الحالية</p>
            <button
              type="button"
              onClick={() => { setTagFilter(null); setCollectionFilter("all"); setQ(""); }}
              className="text-xs px-4 py-2 rounded-full border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition font-arabic"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Search tab — same full-corpus index/matching as every other hadith   */
/* search surface in the app (src/lib/fullHadithSearch.ts), so a query   */
/* returns the same results here as it does from the Library.           */
/* ------------------------------------------------------------------ */

function SearchTab({ books }: { books: HadithBookMeta[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FullHadithSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookMeta = useCallback((key: string) => books.find((b) => b.key === key), [books]);

  useEffect(() => {
    prewarmFullHadithSearch();
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
    const hits = await searchFullHadithCorpus(q, 50);
    setResults(hits);
    setLoading(false);
  }, []);

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
          {results.map((r) => {
            const meta = bookMeta(r.bookKey);
            return (
              <div
                key={`${r.bookKey}:${r.n}`}
                role="button"
                tabIndex={0}
                dir="rtl"
                onClick={() => navigate(`/hadith/${r.bookKey}/${r.n}`)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/hadith/${r.bookKey}/${r.n}`)}
                className="group relative w-full overflow-hidden rounded-3xl text-right glass glass-hover press-effect cursor-pointer"
              >
                <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
                <div className="relative px-4 py-3">
                  {/* Book tag */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: (meta?.color ?? "#888") + "22", color: meta?.color ?? "#888" }}>
                      {meta?.title ?? r.bookKey}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">ح{r.n}</span>
                    {r.grade && <GradeChip grade={r.grade} size="sm" />}
                    <button type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try { await navigator.clipboard.writeText(r.snippet); toast.success("تم النسخ"); }
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
                    {previewText(r.snippet)}
                  </p>
                </div>
              </div>
            );
          })}
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
  const [tab, setTab] = useState<"library" | "curated" | "search">("library");

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
                <h1 className="text-lg font-bold">الأحاديث</h1>
              </div>
              <div className="text-xs opacity-55 mt-1">الكتب التسعة، مختارات نبوية، وبحث شامل — في مكان واحد</div>
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
            {totalHadiths >= 1000 ? `${Math.round(totalHadiths / 1000)}k` : arNum(totalHadiths)}
          </p>
          <p className="text-[10px] text-[var(--muted)]">حديث نبوي</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="relative z-10 mx-4 mb-5 flex overflow-hidden rounded-2xl glass" role="tablist" aria-orientation="horizontal" aria-label="أقسام الحديث"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
        {(["library", "curated", "search"] as const).map((t) => (
          <button type="button"
            key={t}
            id={`hadith-books-tab-${t}`}
            role="tab"
            aria-controls={`hadith-books-panel-${t}`}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-arabic transition-colors"
            style={tab === t
              ? { background: "var(--accent)", color: "var(--on-accent)", fontWeight: 700 }
              : { color: "var(--muted)" }
            }
          >
            {t === "library" ? <BookOpen size={14} aria-hidden="true" /> : t === "curated" ? <Sparkles size={14} aria-hidden="true" /> : <Search size={14} aria-hidden="true" />}
            {t === "library" ? "المكتبة" : t === "curated" ? "المختارات" : "البحث"}
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

      {/* Curated tab */}
      {tab === "curated" && <div role="tabpanel" id="hadith-books-panel-curated" aria-labelledby="hadith-books-tab-curated" tabIndex={0}><CuratedTab /></div>}

      {/* Search tab */}
      {tab === "search" && <div role="tabpanel" id="hadith-books-panel-search" aria-labelledby="hadith-books-tab-search" tabIndex={0}><SearchTab books={sorted} /></div>}
    </div>
  );
}

export default HadithBooksPage;