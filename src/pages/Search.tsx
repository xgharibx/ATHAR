import * as React from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpRight, X, BookOpen, LibraryBig, ScrollText, Loader2, Copy } from "lucide-react";
import toast from "react-hot-toast";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useQuranDB } from "@/data/useQuranDB";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FlatDhikr } from "@/data/types";
import type { QuranSurah } from "@/data/quranTypes";
import { useIslamicLibraryDB } from "@/data/useIslamicLibraryDB";
import type { FlatLibraryEntry } from "@/data/libraryTypes";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { cn, contrastText } from "@/lib/utils";
import { stripDiacritics } from "@/lib/arabic";
import { HADITH_BOOKS_STATIC, hadithGradeLabel, hadithPreview } from "@/data/hadithTypes";
import { useHadithPack } from "@/data/useHadithBook";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

// --- Recent searches helpers ---
const RECENT_KEY = "noor_recent_searches";
const MAX_RECENT = 6;
function loadRecent(): string[] {
  try {
    const v = localStorage.getItem(RECENT_KEY);
    return v ? (JSON.parse(v) as unknown[]).filter((s): s is string => typeof s === "string") : [];
  } catch { return []; }
}
function saveRecent(list: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}
function pushRecent(term: string, prev: string[]): string[] {
  const t = term.trim();
  if (!t || t.length < 2) return prev;
  const next = [t, ...prev.filter((s) => s !== t)].slice(0, MAX_RECENT);
  saveRecent(next);
  return next;
}

export function SearchPage() {
  const { data } = useAdhkarDB();
  const { data: quranData } = useQuranDB();
  const { data: libraryData } = useIslamicLibraryDB();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  useScrollRestoration();
  const [searchTab, setSearchTab] = React.useState<"adhkar" | "quran" | "library" | "hadith">("adhkar");
  const [recentSearches, setRecentSearches] = React.useState<string[]>(() => loadRecent());
  const [sectionFilter, setSectionFilter] = React.useState<string | null>(null);
  const [libraryFilter, setLibraryFilter] = React.useState<string | null>(null);
  const [hadithBookKey, setHadithBookKey] = React.useState<string>("nawawi");

  const fuse = React.useMemo(() => {
    if (!data) return null;
    return new Fuse(data.flat, {
      includeScore: true,
      threshold: 0.35,
      ignoreDiacritics: true,
      keys: ["text", "sectionTitle", "sectionId"]
    });
  }, [data]);

  const { results, totalHits } = React.useMemo(() => {
    if (!fuse || !q.trim()) return { results: [] as FlatDhikr[], totalHits: 0 };
    const all = fuse.search(q).map((r) => r.item);
    const filtered = sectionFilter ? all.filter((r) => r.sectionId === sectionFilter) : all;
    return { results: filtered.slice(0, 50), totalHits: filtered.length };
  }, [fuse, q, sectionFilter]);

  // Build section chip list from current results (before section filter)
  const sectionChips = React.useMemo(() => {
    if (!fuse || !q.trim() || !data) return [] as Array<{ id: string; title: string; count: number }>;
    const all = fuse.search(q).map((r) => r.item);
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const r of all) {
      const existing = map.get(r.sectionId);
      if (existing) { existing.count++; }
      else { map.set(r.sectionId, { id: r.sectionId, title: r.sectionTitle, count: 1 }); }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [fuse, q, data]);

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

    // Ayah text matches — diacritic-stripped, up to 50 results
    const normalTerm = stripDiacritics(term);
    let ayahCount = 0;
    for (const surah of quranData) {
      if (ayahCount >= 50) break;
      for (let i = 0; i < surah.ayahs.length && ayahCount < 50; i++) {
        if (stripDiacritics(surah.ayahs[i]).includes(normalTerm)) {
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
    const term = stripDiacritics(q.trim());
    const hits: Array<{ n: number; a: number; t: string; g: string[] }> = [];
    for (const h of hadithPack.hadiths) {
      if (stripDiacritics(h.t).includes(term)) {
        hits.push(h);
        if (hits.length >= 50) break;
      }
    }
    return hits;
  }, [hadithPack, q]);
  // ─────────────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!q.trim() || q.trim().length < 2 || (results.length + quranResults.length + libraryResults.length) === 0) return;
    const timer = setTimeout(() => setRecentSearches((prev) => pushRecent(q, prev)), 800);
    return () => clearTimeout(timer);
  }, [libraryResults.length, q, quranResults.length, results.length]);

  React.useEffect(() => { setLibraryFilter(null); }, [q]);

  return (
    <div className="space-y-4 page-enter">
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
        <div className="mt-4 flex gap-2" role="tablist" aria-label="نوع البحث"
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
            aria-selected={searchTab === "adhkar"}
            onClick={() => setSearchTab("adhkar")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "adhkar"
                ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
            )}
          >
            🤲 الأذكار
          </button>
          <button type="button"
            id="search-tab-quran"
            role="tab"
            aria-selected={searchTab === "quran"}
            onClick={() => setSearchTab("quran")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "quran"
                ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
            )}
          >
            <BookOpen size={13} aria-hidden="true" /> القرآن
          </button>
          <button type="button"
            id="search-tab-library"
            role="tab"
            aria-selected={searchTab === "library"}
            onClick={() => setSearchTab("library")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "library"
                ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
            )}
          >
            <LibraryBig size={13} aria-hidden="true" /> المكتبة
          </button>
          <button type="button"
            id="search-tab-hadith"
            role="tab"
            aria-selected={searchTab === "hadith"}
            onClick={() => setSearchTab("hadith")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition min-h-[36px]",
              searchTab === "hadith"
                ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
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
                  className="px-3 py-1.5 rounded-full glass border border-[var(--stroke)] text-xs hover:bg-[var(--card-2)] transition arabic-text min-h-[36px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Section filter chips (adhkar only) */}
      {searchTab === "adhkar" && sectionChips.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
          <button type="button"
            onClick={() => setSectionFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
              sectionFilter === null
                ? "bg-[var(--accent)] border-transparent text-[var(--on-accent)]"
                : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
            )}
          >
            الكل ({sectionChips.reduce((a, c) => a + c.count, 0)})
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
                    : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
                )}
                style={isActive ? { background: identity.accent, color: contrastText(identity.accent) } : {}}
              >
                <span>{identity.icon}</span>
                <span>{chip.title}</span>
                <span className="opacity-70">({chip.count})</span>
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
                ? "bg-[var(--accent)] border-transparent text-[var(--on-accent)]"
                : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
            )}
          >
            الكل ({libraryChips.reduce((a, c) => a + c.count, 0)})
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
                    : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
                )}
                style={isActive ? { background: chip.accent, color: contrastText(chip.accent) } : {}}
              >
                <span>{chip.icon}</span>
                <span>{chip.title}</span>
                <span className="opacity-70">({chip.count})</span>
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
              {totalHits > 50 ? `${results.length} من ${totalHits}` : results.length}
            </div>
          )}
        </div>
        {!q.trim() ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <Search size={32} aria-hidden="true" className="opacity-20" />
            <div className="text-sm opacity-55">اكتب للبحث في الأذكار</div>
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            variant="search"
            title={`لا توجد نتائج لـ «${q}»`}
            description="جرّب كلمات مختلفة أو أقصر"
          />
        ) : (
          <div className="space-y-2" role="list" aria-label="نتائج الأذكار">
            {results.map((r) => {
              const identity = getSectionIdentity(r.sectionId);
              return (
                <button type="button"
                  key={r.key}
                  onClick={() => navigate(`/c/${r.sectionId}?focus=${r.index}`)}
                  className="group w-full text-right glass rounded-3xl p-4 hover:bg-[var(--card-2)] transition border border-[var(--stroke)] press-effect glass-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{identity.icon}</span>
                      <div className="text-sm font-semibold truncate" style={{ color: identity.accent }}>
                        {r.sectionTitle}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try { await navigator.clipboard.writeText(r.text); toast.success("تم النسخ"); }
                          catch { toast.error("تعذر النسخ"); }
                        }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        style={{ background: "var(--card)", color: "var(--fg)" }}
                        aria-label="نسخ"
                      >
                        <Copy size={13} aria-hidden="true" />
                      </button>
                      <ArrowUpRight size={18} className="opacity-60" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3 arabic-text text-sm opacity-80 leading-7">
                    {r.text.slice(0, 220)}
                    {r.text.length > 220 ? "…" : ""}
                  </div>
                  {r.benefit && (
                    <div className="mt-2 text-[11px] opacity-55 leading-5 border-t border-[var(--stroke)] pt-2">
                      الفضل: {r.benefit.slice(0, 120)}{r.benefit.length > 120 ? "…" : ""}
                    </div>
                  )}
                </button>
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
              {quranResults.filter(r => r.type === "ayah").length} آية
              {quranResults.filter(r => r.type === "surah").length > 0 && ` · ${quranResults.filter(r => r.type === "surah").length} سورة`}
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
          <div className="space-y-2" role="list" aria-label="نتائج القرآن">
            {quranResults.map((r, idx) =>
              r.type === "surah" ? (
                <button type="button"
                  key={`s-${r.surah.id}`}
                  onClick={() => navigate(`/quran/${r.surah.id}`)}
                  className="w-full text-right glass rounded-3xl p-4 hover:bg-[var(--card-2)] transition border border-[var(--stroke)] press-effect glass-hover"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} aria-hidden="true" className="text-[var(--accent)] shrink-0 opacity-70" />
                      <span className="text-sm font-semibold arabic-text">{r.surah.name}</span>
                      <span className="text-xs opacity-45 tabular-nums">{r.surah.ayahs.length} آية</span>
                    </div>
                    <ArrowUpRight size={16} className="opacity-55 shrink-0" aria-hidden="true" />
                  </div>
                </button>
              ) : (
                <button type="button"
                  key={`a-${r.surah.id}-${r.ayahIndex}-${idx}`}
                  onClick={() => navigate(`/quran/${r.surah.id}?a=${r.ayahIndex}`)}
                  className="group w-full text-right glass rounded-3xl p-4 hover:bg-[var(--card-2)] transition border border-[var(--stroke)] press-effect glass-hover"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs opacity-55 shrink-0 tabular-nums">﴿{r.ayahIndex}﴾</span>
                      <span className="text-xs opacity-55 arabic-text shrink-0">{r.surah.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try { await navigator.clipboard.writeText(r.text); toast.success("تم النسخ"); }
                          catch { toast.error("تعذر النسخ"); }
                        }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        style={{ background: "var(--card)", color: "var(--fg)" }}
                        aria-label="نسخ الآية"
                      >
                        <Copy size={13} aria-hidden="true" />
                      </button>
                      <ArrowUpRight size={16} className="opacity-55" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-2 arabic-text text-sm leading-7 opacity-80">
                    {r.text.slice(0, 200)}{r.text.length > 200 ? "…" : ""}
                  </div>
                </button>
              )
            )}
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
              {libraryTotalHits > 50 ? `${libraryResults.length} من ${libraryTotalHits}` : libraryResults.length}
            </div>
          )}
        </div>
        {!q.trim() ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <LibraryBig size={32} aria-hidden="true" className="opacity-20" />
            <div className="text-sm opacity-55">ابحث في الحديث، الراوي، المصدر، أو الفوائد</div>
            <button type="button"
              onClick={() => navigate("/library")}
              className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-4 py-2 text-xs hover:bg-[var(--card-2)] transition"
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
          <div className="space-y-2" role="list" aria-label="نتائج المكتبة">
            {libraryResults.map((entry) => (
              <button type="button"
                key={entry.key}
                onClick={() => navigate(`/library/${entry.collectionId}/${entry.id}`)}
                className="w-full text-right glass rounded-3xl p-4 hover:bg-[var(--card-2)] transition border border-[var(--stroke)] press-effect glass-hover"
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
                  <div className="mt-2 text-[11px] opacity-55 leading-5 border-t border-[var(--stroke)] pt-2">
                    فائدة: {entry.benefits[0].slice(0, 120)}{entry.benefits[0].length > 120 ? "…" : ""}
                  </div>
                )}
              </button>
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
            <div className="text-xs opacity-55 tabular-nums">{hadithResults.length} نتيجة</div>
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
                  : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
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
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-8 text-[var(--muted)]">
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
          <div className="space-y-2" role="list" aria-label="نتائج الحديث">
            {hadithResults.map((h) => {
              const book = HADITH_BOOKS_STATIC.find((b) => b.key === hadithBookKey);
              const gradeColor: Record<string, string> = { sahih: "#10b981", hasan: "#3b82f6", daif: "#ef4444", maudu: "#6b7280" };
              const g = h.g[0] ?? "";
              const color = gradeColor[g] ?? "#6b7280";
              return (
                <button type="button"
                  key={h.n}
                  dir="rtl"
                  onClick={() => navigate(`/hadith/${hadithBookKey}/${h.n}`)}
                  className="w-full text-right glass rounded-3xl p-4 hover:bg-[var(--card-2)] transition border border-[var(--stroke)] press-effect glass-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: color + "22", color }}
                      >
                        {hadithGradeLabel(g)}
                      </span>
                      <span className="text-xs opacity-45 font-arabic shrink-0">{book?.title}</span>
                      <span className="text-xs opacity-45">ح{h.a}</span>
                    </div>
                    <ArrowUpRight size={16} className="opacity-55 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="mt-2 arabic-text text-sm leading-7 opacity-80">
                    {hadithPreview(h.t, 200)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
