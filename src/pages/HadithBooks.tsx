/**
 * «الأحاديث»: the library of books (with where you reached in each), today's
 * hadith and «أكمل القراءة», the curated selections, what you saved with
 * your notes, and one search across every book.
 * Route: /hadith (?tab=curated|saved|search)
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search, Library, BookOpen, Bookmark, BrainCircuit, Copy, Check, Heart, History, Share2, Sparkles, Sun, Bell, BellOff } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { HADITH_BOOKS_STATIC, type HadithBookMeta } from "@/data/hadithTypes";
import { libraryLinkFor, useLibraryHadithLinkMap } from "@/lib/libraryHadithLinks";
import { HadithPlanCard } from "@/components/hadith/HadithPlanCard";
import { useHadithIndex } from "@/data/useHadithBook";
import { hadithPlaceLabel, hadithRefLabel } from "@/data/hadithNumbers";
import { useHadithPrefs } from "@/lib/hadithPrefs";
import { useDailyHadith } from "@/lib/useDailyHadith";
import { useTodayKey } from "@/hooks/useTodayKey";
import { loadChapterCounts } from "@/data/hadithChapters";
import { BENEFIT, BOOK, BOOKMARK, CARD, HADITH, countAr } from "@/lib/arabicCount";
import { HadithSearchPanel } from "@/components/hadith/HadithSearchPanel";
import { HadithOfflineCard } from "@/components/hadith/HadithOfflineCard";
import { useIslamicLibraryDB } from "@/data/useIslamicLibraryDB";
import type { FlatLibraryEntry, LibraryCollection } from "@/data/libraryTypes";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { GradeChip } from "@/components/hadith/GradeChip";
import { CuratedIcon } from "@/components/hadith/CuratedIcon";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { cn } from "@/lib/utils";
import { stripDiacritics } from "@/lib/arabic";
import { arNum } from "@/lib/formatNumber";
import { shareOrCopy } from "@/lib/shareTargets";
import { writeClipboard } from "@/lib/nativeUI";
import { SavedHadithList } from "@/components/hadith/SavedHadithList";


/* ------------------------------------------------------------------ */
/* Book cards                                                            */
/* ------------------------------------------------------------------ */

/** Only the two Sahihs are sahih as whole books; the others hold every grade. */
const SAHIH_BOOKS = new Set(["bukhari", "muslim"]);

function useBookmarkCount(bookKey: string) {
  return useNoorStore((s) => {
    let c = 0;
    for (const [k, v] of Object.entries(s.hadithBookmarks)) if (v && k.startsWith(`${bookKey}:`)) c++;
    return c;
  });
}

/** Where you reached in a book, as words and a thin bar. */
function ReadingProgress({ book, lastN }: { book: HadithBookMeta; lastN: number | undefined }) {
  const reached = useHadithPrefs((s) => s.reached[book.key]);
  if (!lastN) return <span className="text-[10.5px] text-(--muted)">ابدأ القراءة</span>;
  const pct = Math.min(100, Math.max(2, (lastN / Math.max(1, book.count)) * 100));
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="text-[10.5px] text-(--muted) whitespace-nowrap">وصلت إلى {reached ? hadithRefLabel(reached) : arNum(lastN)}</span>
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-(--stroke)" aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: book.color }} />
      </span>
    </span>
  );
}

function ArbainiCard({ book }: { book: HadithBookMeta }) {
  const navigate = useNavigate();
  const lastN = useNoorStore((s) => s.hadithProgress[book.key]);

  return (
    <button type="button"
      dir="rtl"
      onClick={() => navigate(`/hadith/${book.key}`)}
      className="relative flex-1 min-w-[140px] overflow-hidden rounded-3xl text-right glass-strong glass-hover press-effect"
      style={{ borderColor: "color-mix(in srgb, var(--accent) 28%, transparent)" }}
    >
      <div className="absolute inset-y-0 right-0 w-1 opacity-80" style={{ background: book.color }} />
      <div className="relative p-4">
        <span className="mb-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: book.color + "33", color: book.color }}>
          {book.key === "nawawi" ? "جوامع الكلم" : "كلام الله عز وجل"}
        </span>
        <p className="text-sm font-bold font-arabic text-(--fg) leading-tight mb-1">{book.title}</p>
        <p className="text-[11px] mb-3" style={{ color: book.color }}>{countAr(book.count, HADITH)}</p>
        <div className="flex items-center">
          <ReadingProgress book={book} lastN={lastN} />
        </div>
      </div>
    </button>
  );
}

function BookCard({ book, chapters }: { book: HadithBookMeta; chapters?: number }) {
  const navigate = useNavigate();
  const lastN = useNoorStore((s) => s.hadithProgress[book.key]);
  const bookmarkCount = useBookmarkCount(book.key);

  return (
    <button type="button"
      dir="rtl"
      onClick={() => navigate(`/hadith/${book.key}`)}
      className="relative w-full overflow-hidden rounded-3xl text-right glass glass-hover press-effect cv-auto"
    >
      <div className="absolute top-0 right-0 h-full w-1 opacity-75" style={{ background: book.color }} />

      <div className="relative px-4 py-3.5 pr-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: book.color + "22", color: book.color }}>
            <BookOpen size={17} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[15px] font-bold font-arabic text-(--fg) leading-tight line-clamp-2">{book.title}</p>
              {SAHIH_BOOKS.has(book.key) && <GradeChip grade="sahih" size="sm" />}
            </div>
            <p className="text-[11.5px] text-(--fg) opacity-70 leading-snug line-clamp-2 font-arabic">{book.description}</p>
            <p className="mt-1.5 text-[11px] text-(--muted)">
              {countAr(book.count, HADITH)}
              {chapters ? `، ${countAr(chapters, BOOK)}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-3 border-t border-(--stroke) pt-2.5">
          <ReadingProgress book={book} lastN={lastN} />
          {bookmarkCount > 0 && (
            <span className="flex items-center gap-1 text-[10.5px] shrink-0" style={{ color: book.color }} aria-label={`${countAr(bookmarkCount, BOOKMARK)}`}>
              <Bookmark size={11} aria-hidden="true" />
              {arNum(bookmarkCount)}
            </span>
          )}
          <ArrowRight size={13} aria-hidden="true" className="text-(--muted) rotate-180 shrink-0 mr-auto" />
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

/** The grades the curated cards state; a card with no stated grade shows none. */
const CURATED_GRADE_LABELS: Record<string, string> = {
  agreed: "متفق عليه",
  sahih: "صحيح",
  hasan: "حسن",
};

function curatedEntryPreview(entry: FlatLibraryEntry) {
  return entry.arabic.length > 230 ? `${entry.arabic.slice(0, 230)}…` : entry.arabic;
}

async function copyCuratedEntry(entry: FlatLibraryEntry) {
  await writeClipboard(`${entry.arabic}\n\n${entry.source.title}${entry.narrator ? ` — ${entry.narrator}` : ""}`);
}

function CuratedEntryCard({ entry }: { entry: FlatLibraryEntry }) {
  const navigate = useNavigate();
  const { data: linkMap } = useLibraryHadithLinkMap();
  const link = libraryLinkFor(linkMap, entry.id);
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
      await shareOrCopy(text, { title: entry.title });
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
            <CuratedIcon id={entry.collectionId} size={15} color={entry.collectionAccent} />
            <span className="text-xs font-semibold" style={{ color: entry.collectionAccent }}>{entry.collectionTitle}</span>
            <Badge className="px-2 py-0.5 text-[10px]">{entry.chapterTitle}</Badge>
            {link ? (
              <Badge className="px-2 py-0.5 text-[10px]">{HADITH_BOOKS_STATIC.find((b) => b.key === link.bookKey)?.title ?? link.bookKey}</Badge>
            ) : CURATED_GRADE_LABELS[entry.grade] && <Badge className="px-2 py-0.5 text-[10px]">{CURATED_GRADE_LABELS[entry.grade]}</Badge>}
          </div>
          <div className="text-sm font-semibold opacity-75 mb-2 arabic-text">{entry.title}</div>
          <div className="arabic-text text-base md:text-lg leading-9 font-medium text-right">{curatedEntryPreview(entry)}</div>
        </button>
        <ArrowUpRight size={17} className="opacity-45 shrink-0 mt-1" aria-hidden="true" />
      </div>

      <div className="mt-3 border-t border-(--stroke) pt-3 stack-y-2">
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
        active ? "bg-(--card) border-(--stroke)" : "glass border-(--stroke) hover:bg-(--card-2)"
      )}
      style={active ? { borderColor: collection.accent } : undefined}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${collection.accent} 16%, transparent)` }}>
          <CuratedIcon id={collection.id} size={18} color={collection.accent} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: collection.accent }}>{collection.title}</div>
          <div className="text-[11px] opacity-50 truncate">{collection.subtitle}</div>
        </div>
      </div>
      <div className="text-xs opacity-60 leading-5 line-clamp-2">{collection.description}</div>
      <div className="mt-3 text-[11px] opacity-45 tabular-nums">
        {countAr(collection.entries.length, collection.id === "reader_guides" ? BENEFIT : HADITH)}
      </div>
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
    return <div className="px-4 pt-4 stack-y-3" role="status" aria-label="جارٍ التحميل…"><span className="sr-only">جارٍ التحميل…</span><div className="skeleton h-8 w-44 rounded-xl" /><div className="skeleton h-20 w-full rounded-2xl mt-4" /></div>;
  }
  if (error || !data) {
    return <div className="px-4 pt-4"><Card className="p-5"><div className="font-semibold">تعذر تحميل المختارات</div><div className="text-sm opacity-60 mt-2">أعد فتح الصفحة بعد قليل.</div></Card></div>;
  }

  return (
    <div dir="rtl" className="px-4 pt-2 stack-y-4">
      {featured && (
        <button type="button"
          onClick={() => navigate(`/library/${featured.collectionId}/${featured.id}`)}
          className="w-full text-right rounded-3xl border border-(--stroke) bg-(--card) p-4 hover:bg-(--card-2) transition"
        >
          <div className="flex items-center gap-2 mb-2"><Sparkles size={15} className="text-(--accent)" aria-hidden="true" /><span className="text-xs font-semibold opacity-60">بداية مقترحة</span></div>
          {featured.title && <div className="text-xs font-semibold mb-1 font-arabic" style={{ color: featured.collectionAccent }}>{featured.collectionTitle}، {featured.title}</div>}
          <div className="arabic-text leading-8 text-sm md:text-base line-clamp-3">{featured.arabic}</div>
          <div className="text-xs opacity-50 mt-2">{featured.source.title}</div>
        </button>
      )}

      <div className="relative" role="search" aria-label="بحث في المختارات">
        <Search size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) pointer-events-none" />
        <Input value={q} onChange={(event) => setQ(event.target.value)} type="search" placeholder="ابحث في المختارات، الراوي، أو الموضوع…" aria-label="بحث في المختارات" spellCheck={false} autoComplete="off" autoCapitalize="none" className="pr-9" />
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
        <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
          <CuratedCollectionCard
            collection={{ ...data.db.collections[0]!, id: "all", title: "الكل", subtitle: "كل المختارات", description: "كل الأحاديث المختارة وفوائد دليل القارئ.", icon: "", accent: "var(--accent)", entries: data.flat }}
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
          className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", !tagFilter ? "bg-(--accent) text-(--on-accent) border-transparent" : "bg-(--card) border-(--stroke)")}
        >
          كل الموضوعات
        </button>
        {tags.map(([tag, count]) => (
          <button type="button"
            key={tag}
            aria-pressed={tagFilter === tag}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", tagFilter === tag ? "bg-(--accent) text-(--on-accent) border-transparent" : "bg-(--card) border-(--stroke)")}
          >
            {tag} <span className="opacity-60 tabular-nums">{arNum(count)}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-sm font-semibold">المختارات</div>
        <div className="text-xs opacity-50 tabular-nums" aria-live="polite" aria-atomic="true">{arNum(entries.length)}</div>
      </div>

      <div className="stack-y-3 pb-4" role="list" aria-label="المختارات">
        {entries.map((entry) => <div key={entry.key} role="listitem"><CuratedEntryCard entry={entry} /></div>)}
        {entries.length === 0 && (
          <div dir="rtl" className="flex flex-col items-center py-12 gap-4">
            <Search size={40} aria-hidden="true" className="text-(--muted) opacity-20" />
            <p className="text-sm text-(--muted) font-arabic text-center">لا توجد نتائج للفلاتر الحالية</p>
            <button
              type="button"
              onClick={() => { setTagFilter(null); setCollectionFilter("all"); setQ(""); }}
              className="text-xs px-4 py-2 rounded-full border border-(--stroke) bg-(--card) hover:bg-(--card-2) transition font-arabic"
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
  return (
    <div className="px-4 pt-4">
      <HadithSearchPanel books={books} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Today: continue reading + hadith of the day                           */
/* ------------------------------------------------------------------ */

function ContinueCard({ books }: { books: HadithBookMeta[] }) {
  const navigate = useNavigate();
  const last = useHadithPrefs((s) => s.last);
  const book = last ? books.find((b) => b.key === last.bookKey) : undefined;
  if (!last || !book) return null;
  return (
    <button type="button"
      onClick={() => navigate(`/hadith/${last.bookKey}/${last.n}`)}
      className="relative w-full overflow-hidden rounded-3xl text-right glass-strong glass-hover press-effect p-4 flex items-center gap-3"
    >
      <div className="relative w-10 h-10 rounded-2xl grid place-items-center shrink-0" style={{ background: book.color + "26", color: book.color }}>
        <History size={18} aria-hidden="true" />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-[11px] text-(--muted)">أكمل من حيث توقفت</p>
        <p className="text-sm font-bold text-(--fg) truncate">{book.title}، {hadithPlaceLabel({ a: last.n, r: last.r })}</p>
      </div>
      <ArrowRight size={16} aria-hidden="true" className="relative text-(--muted) rotate-180 shrink-0" />
    </button>
  );
}

/**
 * «حديث اليوم»: the same hadith as the home, «أفق» and the widget, opening
 * its explanation; with the optional Fajr reminder of it on phones.
 */
function HadithOfTheDay() {
  const navigate = useNavigate();
  const today = useTodayKey();
  const { hadith, done } = useDailyHadith(today, { syncWidget: true });
  const reminderOn = useNoorStore((s) => !!s.reminders.dailyHadithNotif);
  const setReminders = useNoorStore((s) => s.setReminders);
  const native = Capacitor.isNativePlatform();

  const toggleReminder = async () => {
    if (!reminderOn) {
      const { requestNotificationPermission } = await import("@/lib/reminders");
      const permission = await requestNotificationPermission().catch(() => "denied" as const);
      if (permission !== "granted") {
        toast.error("اسمح لأثر بالإشعارات من إعدادات الهاتف أولًا");
        return;
      }
    }
    setReminders({ dailyHadithNotif: !reminderOn });
    toast.success(reminderOn ? "أُوقف تذكير حديث اليوم" : "يصلك حديث اليوم عند أذان الفجر");
  };

  if (!done) return <div className="skeleton h-36 w-full rounded-3xl" aria-hidden="true" />;
  if (!hadith) return null;
  const meta = [hadith.attribution, hadith.grade].filter(Boolean).join("، ");
  return (
    <div className="relative w-full overflow-hidden rounded-3xl glass-strong" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>
      <button type="button"
        onClick={() => navigate(`/library/sharh?h=${hadith.id}`)}
        className="relative w-full text-right glass-hover press-effect p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <Sun size={15} aria-hidden="true" className="text-(--accent)" />
          <span className="text-xs font-bold text-(--accent)">حديث اليوم</span>
        </div>
        <p className="arabic-text text-[15px] leading-8 text-(--fg) line-clamp-4">{hadith.hadeeth}</p>
        {meta && <p className="mt-2 pl-24 text-[11px] text-(--muted)">{meta}</p>}
      </button>
      {native && (
        <button type="button"
          onClick={() => void toggleReminder()}
          aria-pressed={reminderOn}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold press-effect"
          style={reminderOn
            ? { borderColor: "transparent", background: "var(--accent)", color: "var(--on-accent)" }
            : { borderColor: "var(--stroke)", background: "var(--card)", color: "var(--muted)" }}
        >
          {reminderOn ? <Bell size={12} aria-hidden="true" /> : <BellOff size={12} aria-hidden="true" />}
          {reminderOn ? "يصلك عند الفجر" : "ذكّرني عند الفجر"}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* «العلامات»: marks, notes and curated favourites, with their text      */
/* ------------------------------------------------------------------ */

function SavedTab() {
  return (
    <div className="px-4 pt-2 pb-6">
      <SavedHadithList />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */

type BooksTab = "library" | "curated" | "search" | "saved";
const TABS: { id: BooksTab; label: string; icon: typeof BookOpen }[] = [
  { id: "library", label: "الكتب", icon: BookOpen },
  { id: "curated", label: "المختارات", icon: Sparkles },
  { id: "saved", label: "العلامات", icon: Bookmark },
  { id: "search", label: "البحث", icon: Search },
];

export function HadithBooksPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const [params, setParams] = useSearchParams();
  const { data: indexBooks } = useHadithIndex();
  const books = indexBooks ?? HADITH_BOOKS_STATIC;
  const tabParam = params.get("tab") as BooksTab | null;
  const tab: BooksTab = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "library";
  const setTab = (t: BooksTab) => setParams(t === "library" ? {} : { tab: t }, { replace: true });
  const dueCount = useNoorStore((s) => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return Object.values(s.hadithMemoCards).filter((c) => c.due <= key).length;
  });
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    void loadChapterCounts().then((c) => alive && setChapterCounts(c));
    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(() => [...books].sort((a, b) => a.order - b.order), [books]);
  const arbaini = useMemo(() => sorted.filter((b) => b.key === "nawawi" || b.key === "qudsi"), [sorted]);
  const mainBooks = useMemo(() => sorted.filter((b) => b.key !== "nawawi" && b.key !== "qudsi"), [sorted]);
  const totalHadiths = useMemo(() => sorted.reduce((s, b) => s + b.count, 0), [sorted]);

  return (
    <div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24 page-enter">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" data-hadith-stars="" aria-hidden />
      <div className="relative z-10 px-4 pt-4">
        <Card className="relative overflow-hidden p-5">
          <div className="flex items-center gap-3">
            <IconButton data-page-back="" aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Library size={19} aria-hidden="true" className="text-(--accent)" />
                <h1 className="text-lg font-bold">الأحاديث</h1>
              </div>
              <div className="text-xs opacity-60 mt-1 leading-5">الصحيحان والسنن والموطأ والأربعون، {countAr(totalHadiths, HADITH)}</div>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <button type="button"
              onClick={() => navigate("/hadith/memo")}
              className="flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-right press-effect"
              style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 9%, transparent)" }}
            >
              <BrainCircuit size={18} aria-hidden="true" className="text-(--accent) shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-(--fg)">حفظ الحديث</span>
                <span className="block truncate text-[11px] text-(--muted)">
                  {dueCount ? `${countAr(dueCount, CARD)} للمراجعة اليوم` : "بطاقات بالتكرار المتباعد"}
                </span>
              </span>
            </button>
            <button type="button"
              onClick={() => navigate("/library/sharh")}
              className="flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-right press-effect"
              style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 9%, transparent)" }}
            >
              <BookOpen size={18} aria-hidden="true" className="text-(--accent) shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-(--fg)">الشروح</span>
                <span className="block truncate text-[11px] text-(--muted)">شرح ميسّر مُراجَع</span>
              </span>
            </button>
          </div>
        </Card>
      </div>

      <div className="relative z-10 mx-4 mt-4 mb-5 grid grid-cols-4 overflow-hidden rounded-2xl glass" role="tablist" aria-orientation="horizontal" aria-label="أقسام الحديث"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button type="button"
            key={id}
            id={`hadith-books-tab-${id}`}
            role="tab"
            aria-controls={`hadith-books-panel-${id}`}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="flex flex-col items-center justify-center gap-1 py-2 text-[12px] font-arabic transition-colors"
            style={tab === id ? { background: "var(--accent)", color: "var(--on-accent)", fontWeight: 700 } : { color: "var(--muted)" }}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <div className="relative z-10" role="tabpanel" id="hadith-books-panel-library" aria-labelledby="hadith-books-tab-library" tabIndex={0}>
          <div className="px-4 mb-6 stack-y-3">
            <ContinueCard books={sorted} />
            <HadithPlanCard />
            <HadithOfTheDay />
          </div>

          {arbaini.length > 0 && (
            <div className="px-4 mb-6">
              <div className="mb-3 flex items-center gap-2 px-1">
                <Sparkles size={16} aria-hidden="true" className="text-(--accent)" />
                <h2 className="text-[15px] font-bold font-arabic text-(--fg)">الأربعون</h2>
                <span className="text-[11px] text-(--muted)">أحاديث يحفظها كل مسلم</span>
              </div>
              <div className="flex gap-3">
                {arbaini.map((b) => <ArbainiCard key={b.key} book={b} />)}
              </div>
            </div>
          )}

          <div className="px-4 stack-y-3 mb-4">
            <div className="flex items-center gap-2 px-1">
              <Library size={16} aria-hidden="true" className="text-(--accent)" />
              <h2 className="text-[15px] font-bold font-arabic text-(--fg)">أمهات كتب السنة</h2>
            </div>
            <div role="list" aria-label="أمهات كتب السنة" className="stack-y-3">
              {mainBooks.map((book) => (
                <div key={book.key} role="listitem">
                  <BookCard book={book} chapters={chapterCounts[book.key]} />
                </div>
              ))}
            </div>
          </div>

          <HadithOfflineCard books={sorted} />

        </div>
      )}

      {tab === "curated" && <div role="tabpanel" id="hadith-books-panel-curated" aria-labelledby="hadith-books-tab-curated" tabIndex={0}><CuratedTab /></div>}
      {tab === "saved" && <div role="tabpanel" id="hadith-books-panel-saved" aria-labelledby="hadith-books-tab-saved" tabIndex={0}><SavedTab /></div>}
      {tab === "search" && <div role="tabpanel" id="hadith-books-panel-search" aria-labelledby="hadith-books-tab-search" tabIndex={0}><SearchTab books={sorted} /></div>}
    </div>
  );
}
