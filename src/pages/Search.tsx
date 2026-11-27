import * as React from "react";
import Fuse from "fuse.js";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowUpRight, X, BookOpen, LibraryBig, ScrollText, Loader2, Copy } from "lucide-react";
import toast from "react-hot-toast";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useQuranDB } from "@/data/useQuranDB";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdhkarLoadStatus } from "@/components/home/AdhkarLoadStatus";
import type { FlatDhikr } from "@/data/types";
import type { QuranSurah } from "@/data/quranTypes";
import { useIslamicLibraryDB } from "@/data/useIslamicLibraryDB";
import type { FlatLibraryEntry } from "@/data/libraryTypes";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { dhikrStateKey } from "@/lib/dhikrItemIdentity";
import { useNoorStore } from "@/store/noorStore";
import { cn, contrastText } from "@/lib/utils";
import { stripDiacritics, normalizeArabicSearch } from "@/lib/arabic";
import { HADITH_BOOKS_STATIC, hadithPreview } from "@/data/hadithTypes";
import { GradeChip } from "@/components/hadith/GradeChip";
import { hadithNumberLabel } from "@/data/hadithNumbers";
import { useHadithPack } from "@/data/useHadithBook";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { accountScopedLocalStorage } from "@/lib/accountStorageScope";
import { arNum } from "@/lib/formatNumber";

/** «نتيجة واحدة»، «نتيجتان»، «٣ نتائج»، «١١ نتيجة» — Arabic number agreement. */
function resultsLabel(n: number): string {
  if (n === 1) return "نتيجة واحدة";
  if (n === 2) return "نتيجتان";
  if (n >= 3 && n <= 10) return `${arNum(n)} نتائج`;
  return `${arNum(n)} نتيجة`;
}
import { writeClipboard } from "@/lib/nativeUI";

// --- Recent searches helpers ---
const RECENT_KEY = "noor_recent_searches";
const MAX_RECENT = 6;
type SearchableDhikr = FlatDhikr & { searchKey: string };

function loadRecent(): string[] {
  try {
    const v = accountScopedLocalStorage.getItem(RECENT_KEY);
    return v ? (JSON.parse(v) as unknown[]).filter((s): s is string => typeof s === "string") : [];
  } catch { return []; }
}
function saveRecent(list: string[]) {
  accountScopedLocalStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}
function pushRecent(term: string, prev: string[]): string[] {
  const t = term.trim();
  if (!t || t.length < 2) return prev;
  const next = [t, ...prev.filter((s) => s !== t)].slice(0, MAX_RECENT);
  saveRecent(next);
  return next;
}

export function SearchPage() {
  const adhkarQuery = useAdhkarDB();
  const { data } = adhkarQuery;
  const customPacks = useNoorStore((state) => state.customPacks);
  const { data: quranData } = useQuranDB();
  const { data: libraryData } = useIslamicLibraryDB();
  const navigate = useNavigate();
  // «اكتشف» in the new design opens this page with ?q= already typed.
  const [q, setQ] = React.useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("q") ?? "";
    } catch {
      return "";
    }
  });
  useScrollRestoration();
  const [searchTab, setSearchTab] = React.useState<"adhkar" | "quran" | "library" | "hadith">("adhkar");
  const [recentSearches, setRecentSearches] = React.useState<string[]>(() => loadRecent());
  const [sectionFilter, setSectionFilter] = React.useState<string | null>(null);
  const [libraryFilter, setLibraryFilter] = React.useState<string | null>(null);
  const [hadithBookKey, setHadithBookKey] = React.useState<string>("nawawi");

  const searchCorpus = React.useMemo(() => {
    const customItems: FlatDhikr[] = customPacks.flatMap((pack) => pack.items.map((item, index) => ({
      key: dhikrStateKey(pack.id, index, item.id),
      sectionId: pack.id,
      sectionTitle: pack.title,
      index,
      itemId: item.id,
      text: item.text,
      count: item.count,
    })));
    const itemsByPosition = new Map<string, FlatDhikr>();
    for (const item of [...(data?.flat ?? []), ...customItems]) {
      // A bad/legacy pack can reuse an item ID at different positions. The
      // category route resolves by position, so keep those distinct search hits.
      // If bundled data and the live pack contain the same position, the pack
      // item wins and the result is not duplicated.
      itemsByPosition.set(`${item.sectionId}:${item.index}`, item);
    }
    return [...itemsByPosition].map(([position, item]) => ({ ...item, searchKey: position }));
  }, [customPacks, data]);

  const fuse = React.useMemo(() => {
    if (searchCorpus.length === 0) return null;
    return new Fuse(searchCorpus, {
      includeScore: true,
      threshold: 0.35,
      ignoreDiacritics: true,
      keys: ["text", "sectionTitle", "sectionId"]
    });
  }, [searchCorpus]);

  const { results, totalHits } = React.useMemo(() => {
    if (!fuse || !q.trim()) return { results: [] as SearchableDhikr[], totalHits: 0 };
    const all = fuse.search(q).map((r) => r.item);
    const filtered = sectionFilter ? all.filter((r) => r.sectionId === sectionFilter) : all;
    return { results: filtered.slice(0, 50), totalHits: filtered.length };
  }, [fuse, q, sectionFilter]);

  // Build section chip list from current results (before section filter)
  const sectionChips = React.useMemo(() => {
    if (!fuse || !q.trim()) return [] as Array<{ id: string; title: string; count: number }>;
    const all = fuse.search(q).map((r) => r.item);
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const r of all) {
      const existing = map.get(r.sectionId);
      if (existing) { existing.count++; }
      else { map.set(r.sectionId, { id: r.sectionId, title: r.sectionTitle, count: 1 }); }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [fuse, q]);

  // Reset section filter when query changes
  React.useEffect(() => { setSectionFilter(null); }, [q]);

  // ── Quran search ──────────────────────────────────────────────────────────
  const quranSurahFuse = React.useMemo(() => {
    if (!quranData) return null;
    return new Fuse(quranData, {
      includeScore: true,
      threshold: 0.4,
      ignoreDiacritics: true,
      keys: ["name", "englishName"],
    });
  }, [quranData]);

  type QuranResult = { type: "surah"; surah: QuranSurah } | { type: "ayah"; surah: QuranSurah; ayahIndex: number; text: string };

  const quranResults = React.useMemo((): QuranResult[] => {
    if (!q.trim() || !quranData) return [];
    const term = q.trim();
    const out: QuranResult[] = [];

    // Surah name matches (via fuse)
    if (quranSurahFuse) {
      const surahHits = quranSurahFuse.search(term).slice(0, 5);
      for (const hit of surahHits) {
        out.push({ type: "surah", surah: hit.item });
      }
    }

    // Ayah text matches — diacritic-stripped + alef/hamza normalized, up to 50 results
    const normalizeQuran = (s: string) =>
      stripDiacritics(s)
        .replace(/[أإآٱ]/g, "ا")
        .replace(/وة/g, "اة")   // Quranic ortho: صلوة/زكوة/حيوة → modern spelling
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي");
    const normalTerm = normalizeQuran(term);
    let ayahCount = 0;
    for (const surah of quranData) {
      if (ayahCount >= 50) break;
      for (let i = 0; i < surah.ayahs.length && ayahCount < 50; i++) {
        if (normalizeQuran(surah.ayahs[i]).includes(normalTerm)) {
          out.push({ type: "ayah", surah, ayahIndex: i + 1, text: surah.ayahs[i] });
          ayahCount++;
        }
      }
    }
    return out;
  }, [q, quranData, quranSurahFuse]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Library search ───────────────────────────────────────────────────────
  const libraryFuse = React.useMemo(() => {
    if (!libraryData) return null;
    return new Fuse(libraryData.flat, {
      includeScore: true,
      threshold: 0.32,
      ignoreDiacritics: true,
      keys: [
        { name: "searchText", weight: 3 },
        { name: "arabic", weight: 3 },
        { name: "title", weight: 2 },
        { name: "narrator", weight: 1.5 },
        { name: "tags", weight: 1.2 },
        { name: "collectionTitle", weight: 1 },
      ],
    });
  }, [libraryData]);

  const { libraryResults, libraryTotalHits } = React.useMemo(() => {
    if (!libraryData) return { libraryResults: [] as FlatLibraryEntry[], libraryTotalHits: 0 };
    const base = q.trim() && libraryFuse
      ? libraryFuse.search(stripDiacritics(q.trim())).map((result) => result.item)
      : [];
    const filtered = libraryFilter ? base.filter((entry) => entry.collectionId === libraryFilter) : base;
    return { libraryResults: filtered.slice(0, 50), libraryTotalHits: filtered.length };
  }, [libraryData, libraryFilter, libraryFuse, q]);

  const libraryChips = React.useMemo(() => {
    if (!libraryData || !libraryFuse || !q.trim()) return [] as Array<{ id: string; title: string; count: number; icon: string; accent: string }>;
    const map = new Map<string, { id: string; title: string; count: number; icon: string; accent: string }>();
    for (const entry of libraryFuse.search(stripDiacritics(q.trim())).map((result) => result.item)) {
      const existing = map.get(entry.collectionId);
      if (existing) existing.count++;
      else map.set(entry.collectionId, { id: entry.collectionId, title: entry.collectionTitle, count: 1, icon: entry.collectionIcon, accent: entry.collectionAccent });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [libraryData, libraryFuse, q]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Hadith search ─────────────────────────────────────────────────────────
  const { data: hadithPack, isLoading: hadithLoading } = useHadithPack(
    searchTab === "hadith" ? hadithBookKey : undefined,
  );

  const hadithResults = React.useMemo(() => {
    if (!hadithPack || !q.trim()) return [];
    const term = normalizeArabicSearch(q.trim());
    const hits: Array<{ n: number; a: number | string; t: string; g: string[] }> = [];
    for (const h of hadithPack.hadiths) {
      if (normalizeArabicSearch(h.t).includes(term)) {
        hits.push(h);
        if (hits.length >= 50) break;
      }
    }
    return hits;
  }, [hadithPack, q]);
  // ─────────────────────────────────────────────────────────────────────────

  const adhkarCatalogUnavailable = !data && (adhkarQuery.isLoading || Boolean(adhkarQuery.error));

  React.useEffect(() => {
    if (!q.trim() || q.trim().length < 2 || (results.length + quranResults.length + libraryResults.length) === 0) return;
    const timer = setTimeout(() => setRecentSearches((prev) => pushRecent(q, prev)), 800);
    return () => clearTimeout(timer);
  }, [libraryResults.length, q, quranResults.length, results.length]);

  React.useEffect(() => { setLibraryFilter(null); }, [q]);

  return (
    <div className="stack-y-4 page-enter">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Search size={18} aria-hidden="true" className="opacity-70" />
          <h1 className="font-semibold text-base leading-none">بحث</h1>
        </div>
        <div className="mt-4 relative flex items-center gap-2" role="search" aria-label="بحث في التطبيق">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="حقل البحث" placeholder="ابحث في الأذكار والقرآن والمكتبة…" spellCheck={false} autoComplete="off" autoCapitalize="none" dir="rtl" />
          {q ? (
            <IconButton aria-label="مسح" onClick={() => setQ("")}>
              <X size={16} aria-hidden="true" />
            </IconButton>
          ) : null}
        </div>
        <div className="mt-2 text-xs opacity-65 leading-5">
          نصائح: ابحث بكلمة عربية أو اسم قسم. أمثلة: <span className="opacity-80">الله</span> —{" "}
          <span className="opacity-80">المساء</span> — <span className="opacity-80">النية</span>
        </div>

        {/* Tab switcher */}
        <div className="mt-4 flex gap-2" role="tablist" aria-orientation="horizontal" aria-label="نوع البحث"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
          <button type="button"
            id="search-tab-adhkar"
            role="tab"
            aria-controls="search-panel-adhkar"
            aria-selected={searchTab === "adhkar"}
            onClick={() => setSearchTab("adhkar")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "adhkar"
                ? "bg-accent-15 border-accent-35 text-(--accent)"
                : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
            )}
          >
            🤲 الأذكار
          </button>
          <button type="button"
            id="search-tab-quran"
            role="tab"
            aria-controls="search-panel-quran"
            aria-selected={searchTab === "quran"}
            onClick={() => setSearchTab("quran")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "quran"
                ? "bg-accent-15 border-accent-35 text-(--accent)"
                : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
            )}
          >
            <BookOpen size={13} aria-hidden="true" /> القرآن
          </button>
          <button type="button"
            id="search-tab-library"
            role="tab"
            aria-controls="search-panel-library"
            aria-selected={searchTab === "library"}
            onClick={() => setSearchTab("library")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "library"
                ? "bg-accent-15 border-accent-35 text-(--accent)"
                : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
            )}
          >
            <LibraryBig size={13} aria-hidden="true" /> المكتبة
          </button>
          <button type="button"
            id="search-tab-hadith"
            role="tab"
            aria-controls="search-panel-hadith"
            aria-selected={searchTab === "hadith"}
            onClick={() => setSearchTab("hadith")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "hadith"
                ? "bg-accent-15 border-accent-35 text-(--accent)"
                : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
            )}
          >
            <ScrollText size={13} aria-hidden="true" /> الأحاديث
          </button>
        </div>

        {/* Recent searches */}
        {!q && recentSearches.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold opacity-45 tracking-wide">عمليات بحث سابقة</span>
              <button type="button"
                onClick={() => { setRecentSearches([]); saveRecent([]); }}
                className="text-[11px] opacity-50 hover:opacity-80 transition px-2 py-1 rounded-lg"
              >
                مسح الكل
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((s) => (
                <button type="button"
                  key={s}
                  onClick={() => setQ(s)}
                  className="px-3 py-1.5 rounded-full glass border border-(--stroke) text-xs hover:bg-(--card-2) transition arabic-text min-h-[36px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {searchTab === "adhkar" && (
        <AdhkarLoadStatus
          hasData={Boolean(data)}
          error={adhkarQuery.error}
          isFetching={adhkarQuery.isFetching}
          onRetry={() => { void adhkarQuery.refetch(); }}
        />
      )}

      {/* Section filter chips (adhkar only) */}
      {searchTab === "adhkar" && sectionChips.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
          <button type="button"
            onClick={() => setSectionFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
              sectionFilter === null
                ? "bg-(--accent) border-transparent text-(--on-accent)"
                : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
            )}
          >
            الكل ({arNum(sectionChips.reduce((a, c) => a + c.count, 0))})
          </button>
          {sectionChips.map((chip) => {
            const identity = getSectionIdentity(chip.id);
            const isActive = sectionFilter === chip.id;
            return (
              <button type="button"
                key={chip.id}
                onClick={() => setSectionFilter(isActive ? null : chip.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
                  isActive
                    ? "border-transparent"
                    : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
                )}
                style={isActive ? { background: identity.accent, color: contrastText(identity.accent) } : {}}
              >
                <span>{identity.icon}</span>
                <span>{chip.title}</span>
                <span className="opacity-70">({arNum(chip.count)})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Library collection chips */}
      {searchTab === "library" && libraryChips.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
          <button type="button"
            onClick={() => setLibraryFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
              libraryFilter === null
                ? "bg-(--accent) border-transparent text-(--on-accent)"
                : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
            )}
          >
            الكل ({arNum(libraryChips.reduce((a, c) => a + c.count, 0))})
          </button>
          {libraryChips.map((chip) => {
            const isActive = libraryFilter === chip.id;
            return (
              <button type="button"
                key={chip.id}
                onClick={() => setLibraryFilter(isActive ? null : chip.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
                  isActive
                    ? "border-transparent"
                    : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
                )}
                style={isActive ? { background: chip.accent, color: contrastText(chip.accent) } : {}}
              >
                <span>{chip.icon}</span>
                <span>{chip.title}</span>
                <span className="opacity-70">({arNum(chip.count)})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Adhkar results ────────────────────────────────────────────────── */}
      {searchTab === "adhkar" && (
      <Card className="p-5" role="tabpanel" id="search-panel-adhkar" aria-labelledby="search-tab-adhkar" tabIndex={0}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">النتائج</div>
          {q.trim() && (
            <div className="text-xs opacity-55 tabular-nums" aria-live="polite" aria-atomic="true">
              {totalHits > 50 ? `${arNum(results.length)} من ${arNum(totalHits)}` : arNum(results.length)}
            </div>
          )}
        </div>
        {!q.trim() ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <Search size={32} aria-hidden="true" className="opacity-20" />
            <div className="text-sm opacity-55">اكتب للبحث في الأذكار</div>
          </div>
        ) : results.length === 0 && adhkarCatalogUnavailable && adhkarQuery.isLoading ? (
          <div role="status" className="rounded-2xl border border-(--stroke) bg-(--card) px-4 py-5 text-center text-sm opacity-75">
            جارٍ تحميل الأذكار، وستظهر النتائج عند اكتمال التحميل.
          </div>
        ) : results.length === 0 && adhkarCatalogUnavailable ? null
        : results.length === 0 ? (
          <EmptyState
            variant="search"
            title={`لا توجد نتائج لـ «${q}»`}
            description="جرّب كلمات مختلفة أو أقصر"
          />
        ) : (
          <div className="stack-y-2" role="list" aria-label="نتائج الأذكار">
            {results.map((r) => {
              const identity = getSectionIdentity(r.sectionId);
              const sectionHref = `/c/${r.sectionId}?focus=${r.index}`;
              return (
                <div key={r.searchKey} role="listitem">
                  <div className="group glass rounded-3xl border border-(--stroke) p-4 transition hover:bg-(--card-2) glass-hover">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={sectionHref}
                        className="flex min-w-0 items-center gap-1.5 rounded-lg focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-(--accent)"
                      >
                        <span className="text-base shrink-0">{identity.icon}</span>
                        <span className="text-sm font-semibold truncate" style={{ color: identity.accent }}>
                          {r.sectionTitle}
                        </span>
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            try { const systemConfirmed = await writeClipboard(r.text); if (!systemConfirmed) toast.success("تم النسخ"); }
                            catch { toast.error("تعذر النسخ"); }
                          }}
                          className="rounded-lg p-1.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                          style={{ background: "var(--card)", color: "var(--fg)" }}
                          aria-label="نسخ"
                        >
                          <Copy size={13} aria-hidden="true" />
                        </button>
                        <Link
                          to={sectionHref}
                          aria-label={`فتح ذكر من ${r.sectionTitle}`}
                          className="rounded-lg p-1.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-(--accent)"
                        >
                          <ArrowUpRight size={18} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                    <Link
                      to={sectionHref}
                      className="mt-3 block rounded-lg text-right focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-(--accent)"
                    >
                      <div className="arabic-text text-sm opacity-80 leading-7">
                        {r.text.slice(0, 220)}
                        {r.text.length > 220 ? "…" : ""}
                      </div>
                    </Link>
                    {r.benefit && (
                      <div className="mt-2 border-t border-(--stroke) pt-2 text-[11px] opacity-55 leading-5">
                        الفضل: {r.benefit.slice(0, 120)}{r.benefit.length > 120 ? "…" : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      )}

      {/* ── Quran results ─────────────────────────────────────────────────── */}
      {searchTab === "quran" && (
      <Card className="p-5" role="tabpanel" id="search-panel-quran" aria-labelledby="search-tab-quran" tabIndex={0}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">نتائج القرآن</div>
          {q.trim() && quranResults.length > 0 && (
            <div className="text-xs opacity-55 tabular-nums">
              {arNum(quranResults.filter(r => r.type === "ayah").length)} آية
              {quranResults.filter(r => r.type === "surah").length > 0 && `، ${arNum(quranResults.filter(r => r.type === "surah").length)} سورة`}
            </div>
          )}
        </div>
        {!q.trim() ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <BookOpen size={32} aria-hidden="true" className="opacity-20" />
            <div className="text-sm opacity-55">ابحث باسم السورة أو بكلمة قرآنية (مع أو بدون تشكيل)</div>
          </div>
        ) : quranResults.length === 0 ? (
          <EmptyState
            variant="search"
            title={`لا توجد نتائج لـ «${q}»`}
            description="جرّب اسم سورة أو كلمة قرآنية"
          />
        ) : (
          <div className="stack-y-2" role="list" aria-label="نتائج القرآن">
            {quranResults.map((r) => {
              const qKey = r.type === "surah" ? `s-${r.surah.id}` : `a-${r.surah.id}-${r.ayahIndex}`;
              return (
                <div key={qKey} role="listitem">
              {r.type === "surah" ? (
                <button type="button"
                  onClick={() => navigate(`/quran/read/${r.surah.id}`)}
                  className="w-full text-right glass rounded-3xl p-4 hover:bg-(--card-2) transition border border-(--stroke) press-effect glass-hover"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} aria-hidden="true" className="text-(--accent) shrink-0 opacity-70" />
                      <span className="text-sm font-semibold arabic-text">{r.surah.name}</span>
                      <span className="text-xs opacity-45 tabular-nums">{arNum(r.surah.ayahs.length)} آية</span>
                    </div>
                    <ArrowUpRight size={16} className="opacity-55 shrink-0" aria-hidden="true" />
                  </div>
                </button>
              ) : (
                // Two buttons side by side, not one inside the other: nested
                // buttons are invalid, and a tap could open the verse instead of
                // copying it. The copy button is always shown (hover-only meant
                // a phone never saw it).
                <div className="relative">
                  <button type="button"
                    onClick={() => navigate(`/quran/read/${r.surah.id}?a=${r.ayahIndex}`)}
                    className="w-full text-right glass rounded-3xl p-4 hover:bg-(--card-2) transition border border-(--stroke) press-effect glass-hover"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs opacity-55 shrink-0 tabular-nums">﴿{arNum(r.ayahIndex)}﴾</span>
                        <span className="text-xs opacity-55 arabic-text shrink-0">{r.surah.name}</span>
                      </div>
                      <ArrowUpRight size={16} className="opacity-55 shrink-0" aria-hidden="true" />
                    </div>
                    <div className="mt-2 arabic-text text-sm leading-7 opacity-80">
                      {r.text.slice(0, 200)}{r.text.length > 200 ? "…" : ""}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try { const systemConfirmed = await writeClipboard(r.text); if (!systemConfirmed) toast.success("تم النسخ"); }
                      catch { toast.error("تعذر النسخ"); }
                    }}
                    className="absolute top-2.5 inset-e-10 grid h-8 w-8 place-items-center rounded-lg opacity-70 transition-opacity hover:opacity-100"
                    style={{ background: "var(--card)", color: "var(--fg)" }}
                    aria-label="نسخ الآية"
                  >
                    <Copy size={13} aria-hidden="true" />
                  </button>
                </div>
              )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      )}

      {/* ── Library results ───────────────────────────────────────────────── */}
      {searchTab === "library" && (
      <Card className="p-5" role="tabpanel" id="search-panel-library" aria-labelledby="search-tab-library" tabIndex={0}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">نتائج المكتبة</div>
          {q.trim() && libraryResults.length > 0 && (
            <div className="text-xs opacity-55 tabular-nums">
              {libraryTotalHits > 50 ? `${arNum(libraryResults.length)} من ${arNum(libraryTotalHits)}` : arNum(libraryResults.length)}
            </div>
          )}
        </div>
        {!q.trim() ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <LibraryBig size={32} aria-hidden="true" className="opacity-20" />
            <div className="text-sm opacity-55">ابحث في الحديث، الراوي، المصدر، أو الفوائد</div>
            <button type="button"
              onClick={() => navigate("/library")}
              className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-(--card) border border-(--stroke) px-4 py-2 text-xs hover:bg-(--card-2) transition"
            >
              فتح المكتبة
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : libraryResults.length === 0 ? (
          <EmptyState
            variant="search"
            title={`لا توجد نتائج لـ «${q}»`}
            description="جرّب كلمة من الحديث أو اسم راوٍ أو موضوعاً مثل النية أو الصبر"
          />
        ) : (
          <div className="stack-y-2" role="list" aria-label="نتائج المكتبة">
            {libraryResults.map((entry) => (
              <div key={entry.key} role="listitem">
              <button type="button"
                onClick={() => navigate(`/library/${entry.collectionId}/${entry.id}`)}
                className="w-full text-right glass rounded-3xl p-4 hover:bg-(--card-2) transition border border-(--stroke) press-effect glass-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base shrink-0">{entry.collectionIcon}</span>
                      <div className="text-sm font-semibold truncate" style={{ color: entry.collectionAccent }}>
                        {entry.collectionTitle}
                      </div>
                      <span className="text-[11px] opacity-45">{entry.chapterTitle}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-55">{entry.narrator || entry.source.title}</div>
                  </div>
                  <ArrowUpRight size={18} className="opacity-60 shrink-0" aria-hidden="true" />
                </div>
                <div className="mt-3 arabic-text text-sm opacity-80 leading-7">
                  {entry.arabic.slice(0, 220)}{entry.arabic.length > 220 ? "…" : ""}
                </div>
                {entry.benefits[0] && (
                  <div className="mt-2 text-[11px] opacity-55 leading-5 border-t border-(--stroke) pt-2">
                    فائدة: {entry.benefits[0].slice(0, 120)}{entry.benefits[0].length > 120 ? "…" : ""}
                  </div>
                )}
              </button>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}

      {/* ── Hadith results ────────────────────────────────────────────────── */}
      {searchTab === "hadith" && (
      <Card className="p-5" role="tabpanel" id="search-panel-hadith" aria-labelledby="search-tab-hadith" tabIndex={0}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">بحث في الأحاديث</div>
          {hadithResults.length > 0 && q.trim() && (
            <div className="text-xs opacity-55 tabular-nums">{resultsLabel(hadithResults.length)}</div>
          )}
        </div>

        {/* Book selector chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-3">
          {HADITH_BOOKS_STATIC.map((book) => (
            <button type="button"
              key={book.key}
              onClick={() => setHadithBookKey(book.key)}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-full border transition font-arabic whitespace-nowrap min-h-[32px]",
                hadithBookKey === book.key
                  ? "border-transparent"
                  : "bg-(--card) border-(--stroke) hover:bg-(--card-2)"
              )}
              style={hadithBookKey === book.key ? { background: book.color, color: contrastText(book.color) } : {}}
            >
              {book.title}
            </button>
          ))}
        </div>

        {!q.trim() ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <ScrollText size={32} aria-hidden="true" className="opacity-20" />
            <div className="text-sm opacity-55 font-arabic">اكتب كلمة للبحث في الكتاب المختار</div>
          </div>
        ) : hadithLoading ? (
          <div role="status" aria-live="polite" aria-atomic="true" className="flex items-center justify-center gap-2 py-8 text-(--muted)">
            <Loader2 size={18} aria-hidden="true" className="animate-spin" />
            <span className="text-sm font-arabic">جاري تحميل الكتاب…</span>
          </div>
        ) : hadithResults.length === 0 ? (
          <EmptyState
            variant="search"
            title={`لا توجد نتائج لـ «${q}»`}
            description="جرّب كلمة مختلفة أو اختر كتاباً آخر"
          />
        ) : (
          <div className="stack-y-2" role="list" aria-label="نتائج الحديث">
            {hadithResults.map((h) => {
              const book = HADITH_BOOKS_STATIC.find((b) => b.key === hadithBookKey);
              const g = h.g[0] ?? "";
              return (
                <div key={`${hadithBookKey}-${h.n}`} role="listitem">
                <button type="button"
                  dir="rtl"
                  onClick={() => navigate(`/hadith/${hadithBookKey}/${h.n}`)}
                  className="w-full text-right glass rounded-3xl p-4 hover:bg-(--card-2) transition border border-(--stroke) press-effect glass-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {g && <GradeChip grade={g} size="sm" />}
                      <span className="text-xs opacity-45 font-arabic shrink-0">{book?.title}</span>
                      <span className="text-xs opacity-45">ح{hadithNumberLabel(h)}</span>
                    </div>
                    <ArrowUpRight size={16} className="opacity-55 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="mt-2 arabic-text text-sm leading-7 opacity-80">
                    {hadithPreview(h.t, 200)}
                  </div>
                </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
