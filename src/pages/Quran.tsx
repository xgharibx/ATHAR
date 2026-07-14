import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark, BookOpen, Search, Shuffle, Volume2, X, LayoutGrid, Info, Filter } from "lucide-react";
import { getSurahJuz, SURAH_REVELATION, toArabicNumeral } from "@/lib/quranMeta";

import { useQuranDB } from "@/data/useQuranDB";
import { Card } from "@/components/ui/Card";

import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useNoorStore } from "@/store/noorStore";
import { stripDiacritics, normalizeArabicSearch } from "@/lib/arabic";
import { QURAN_RECITERS } from "@/lib/quranReciters";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { FloatingAthar } from "@/components/companion/FloatingAthar";
import { SurahInfoModal } from "@/components/quran/SurahInfoModal";
import { sajdaInSurah } from "@/data/quranExtras";
import { parseDirectAyahQuery } from "@/data/quranDirectSearch";

function normalize(s: string) {
  return normalizeArabicSearch((s ?? "").toLowerCase()).replaceAll(/\s+/g, " ").trim();
}

/** Highlights search query matches in Arabic text (diacritic-insensitive). */
function highlightAyah(text: string, rawQuery: string): React.ReactNode {
  const q = normalize(rawQuery);
  if (!q || q.length < 2) return text;
  const DIACRITICS = "[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]*";
  try {
    const pattern = [...q]
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(DIACRITICS);
    const regex = new RegExp(`(${pattern})`, "g");
    const parts = text.split(regex);
    if (parts.length <= 1) return text;
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark
              key={i}
              style={{
                background: "color-mix(in srgb, var(--accent) 35%, transparent)",
                color: "inherit",
                borderRadius: "2px",
                padding: "0 1px",
              }}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return text;
  }
}

function parseJuzParam(raw: string | null) {
  const parsed = raw ? Number(raw) : Number.NaN;
  return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 30 ? parsed : null;
}

// Curated list of complete, uplifting Quran verses for daily display
const DAILY_VERSES: Array<{ surahId: number; ayahIndex: number }> = [
  { surahId: 2,   ayahIndex: 152 }, { surahId: 2,   ayahIndex: 186 },
  { surahId: 2,   ayahIndex: 255 }, { surahId: 2,   ayahIndex: 286 },
  { surahId: 3,   ayahIndex: 139 }, { surahId: 3,   ayahIndex: 160 },
  { surahId: 6,   ayahIndex: 54  }, { surahId: 7,   ayahIndex: 56  },
  { surahId: 10,  ayahIndex: 62  }, { surahId: 13,  ayahIndex: 28  },
  { surahId: 14,  ayahIndex: 7   }, { surahId: 16,  ayahIndex: 97  },
  { surahId: 21,  ayahIndex: 87  }, { surahId: 23,  ayahIndex: 1   },
  { surahId: 25,  ayahIndex: 63  }, { surahId: 39,  ayahIndex: 53  },
  { surahId: 40,  ayahIndex: 60  }, { surahId: 55,  ayahIndex: 13  },
  { surahId: 65,  ayahIndex: 3   }, { surahId: 67,  ayahIndex: 1   },
  { surahId: 93,  ayahIndex: 5   }, { surahId: 94,  ayahIndex: 5   },
  { surahId: 94,  ayahIndex: 6   }, { surahId: 112, ayahIndex: 1   },
];

function getDailyVerseIdx(): number {
  return Math.floor(Date.now() / 86400000) % DAILY_VERSES.length;
}

function parseISODate(dateISO: string) {
  const match = (dateISO ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const yyyy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  if (!yyyy || !mm || !dd) return null;
  const date = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / ms);
}

/** Phase 2 — Surah+ayah search parsing moved to src/data/quranDirectSearch.ts
 *  for unit testability and reuse. The page calls parseDirectAyahQuery(query, data)
 *  to detect direct references and jump straight into Mushaf. */

const LOADING_SURAH_KEYS = [
  "load-surah-1",
  "load-surah-2",
  "load-surah-3",
  "load-surah-4",
  "load-surah-5",
  "load-surah-6",
  "load-surah-7",
  "load-surah-8",
  "load-surah-9",
  "load-surah-10",
  "load-surah-11",
  "load-surah-12",
] as const;

export function QuranPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useQuranDB();

  const lastRead = useNoorStore((s) => s.quranLastRead);
  const bookmarks = useNoorStore((s) => s.quranBookmarks);
  const readingHistory = useNoorStore((s) => s.quranReadingHistory);
  const quranStreak = useNoorStore((s) => s.quranStreak);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const quranNotes = useNoorStore((s) => s.quranNotes);
  const quranHighlights = useNoorStore((s) => s.quranHighlights);
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);

  const recentSurahs = useNoorStore((s) => s.recentSurahs);
  const recordRecentSurah = useNoorStore((s) => s.recordRecentSurah);

  const todayISO = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }, []);

  const [query, setQuery] = React.useState("");
  // Defer ayah search so surah list stays responsive while user types
  const deferredQuery = React.useDeferredValue(query);
  const [mode, setMode] = React.useState<"surahs" | "ayahs">("surahs");
  const [showBookmarks, setShowBookmarks] = React.useState(false);
  const [showProgressGrid, setShowProgressGrid] = React.useState(false);
  const [infoSurahId, setInfoSurahId] = React.useState<number | null>(null);
  const [reciterOpen, setReciterOpen] = React.useState(false);
  const [reciterQuery, setReciterQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [sortMode, setSortMode] = React.useState<"mushaf" | "progress" | "recent" | "unread" | "nearly">("mushaf");
  const [filterJuz, setFilterJuz] = React.useState<number | null>(() => parseJuzParam(searchParams.get("juz")));
  const [filterRevelation, setFilterRevelation] = React.useState<"meccan" | "medinan" | null>(null);

  // Sync URL param changes (e.g. back-navigation)
  React.useEffect(() => {
    setFilterJuz(parseJuzParam(searchParams.get("juz")));
  }, [searchParams]);

  // Phase 2 — Keyboard shortcuts: "/" focuses search, "Esc" clears it
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping) return;
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && query) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [query]);

  // Auto-scroll to currently reading surah on first load (only when not filtered/queried)
  const currentSurahRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!lastRead || filterJuz || query) return;
    const timer = setTimeout(() => {
      currentSurahRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => clearTimeout(timer);
  // Only run on initial mount or when the reading position changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRead?.surahId]);

  const lastReadSurahName = React.useMemo(() => {
    if (!lastRead || !data) return null;
    return data.find((s) => s.id === lastRead.surahId)?.name ?? null;
  }, [data, lastRead]);

  const quranStats = React.useMemo(() => {
    if (!data) return { started: 0, completed: 0, totalAyahs: 0 };
    let started = 0;
    let completed = 0;
    let totalAyahs = 0;
    for (const surah of data) {
      const maxRead = readingHistory[String(surah.id)] ?? 0;
      if (maxRead > 0) {
        started++;
        totalAyahs += Math.min(maxRead, surah.ayahs.length);
        if (maxRead >= surah.ayahs.length) completed++;
      }
    }
    return { started, completed, totalAyahs };
  }, [data, readingHistory]);

  const bookmarkedCount = React.useMemo(() => Object.values(bookmarks).filter(Boolean).length, [bookmarks]);

  const khatma = React.useMemo(() => {
    if (!data) return null;
    if (!khatmaStartISO || !khatmaDays) return null;

    const start = parseISODate(khatmaStartISO);
    const today = parseISODate(todayISO);
    if (!start || !today) return null;

    const days = Math.max(1, Math.min(730, Math.floor(khatmaDays)));
    const flat: Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }> = [];

    for (const surah of data) {
      for (let index = 0; index < surah.ayahs.length; index++) {
        const text = (surah.ayahs[index] ?? "").trim();
        if (!text) continue;
        flat.push({ surahId: surah.id, surahName: surah.name, ayahIndex: index + 1, text });
      }
    }

    if (flat.length === 0) return null;

    const chunk = Math.ceil(flat.length / days);
    const dayIndexRaw = Math.max(0, daysBetween(start, today));
    const isFinished = dayIndexRaw >= days;
    const dayIndex = Math.min(dayIndexRaw, days - 1);
    const startAt = Math.min(flat.length - 1, dayIndex * chunk);
    const endAt = Math.min(flat.length, startAt + chunk) - 1;
    const first = flat[startAt];
    const last = flat[endAt];

    if (!first || !last) return null;

    const doneCount = Object.keys(khatmaDone ?? {}).filter((key) => khatmaDone[key]).length;
    const doneToday = !!khatmaDone?.[todayISO];
    const percent = days ? Math.round((doneCount / days) * 100) : 0;

    return {
      days,
      chunk,
      dayIndex,
      isFinished,
      today: { first, last },
      meta: { doneCount, doneToday, percent }
    };
  }, [data, khatmaDays, khatmaDone, khatmaStartISO, todayISO]);

  // Daily verse of the day
  const dailyVerse = React.useMemo(() => {
    if (!data) return null;
    const ref = DAILY_VERSES[getDailyVerseIdx()];
    if (!ref) return null;
    const surah = data.find((s) => s.id === ref.surahId);
    if (!surah) return null;
    const text = surah.ayahs[ref.ayahIndex - 1];
    if (!text) return null;
    return { text, surahName: surah.name, surahId: ref.surahId, ayahIndex: ref.ayahIndex };
  }, [data]);

  // Set of surah IDs that have at least one bookmark
  const bookmarkedSurahs = React.useMemo(() => {
    const s = new Set<number>();
    for (const k of Object.keys(bookmarks)) {
      if (bookmarks[k]) s.add(Number(k.split(":")[0]));
    }
    return s;
  }, [bookmarks]);

  const bookmarksList = React.useMemo(() => {
    if (!data) return [] as Array<{ surahId: number; surahName: string; ayahIndex: number; note?: string; highlight?: string }>;
    const surahMap = new Map(data.map((s) => [s.id, s.name]));
    const out: Array<{ surahId: number; surahName: string; ayahIndex: number; note?: string; highlight?: string }> = [];
    for (const [k, v] of Object.entries(bookmarks)) {
      if (!v) continue;
      const parts = k.split(":");
      if (parts.length !== 2) continue;
      const surahId = Number(parts[0]);
      const ayahIndex = Number(parts[1]);
      if (!Number.isFinite(surahId) || !Number.isFinite(ayahIndex)) continue;
      const surahName = surahMap.get(surahId) ?? `${surahId}`;
      const note = quranNotes[k] || undefined;
      const highlight = quranHighlights[k] || undefined;
      out.push({ surahId, surahName, ayahIndex, note, highlight });
    }
    return out.sort((a, b) => b.surahId - a.surahId || b.ayahIndex - a.ayahIndex);
  }, [bookmarks, data, quranNotes, quranHighlights]);

  // Phase 2 — Surah+ayah search parsing
  // Detect patterns like "2:255", "2/255", "البقرة ٢٥٥", "البقرة:٢٥٥"
  // and jump directly to that ayah (used to seed the surah list with a single
  // match or switch the mode to "ayahs" automatically).
  const directMatch = React.useMemo(() => {
    if (!data) return null;
    const q = query.trim();
    if (!q) return null;
    const direct = parseDirectAyahQuery(q, data);
    return direct;
  }, [query, data]);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = normalize(query);
    if (!q) return data;

    // If user typed a direct surah+ayah reference, narrow to that surah.
    if (directMatch) {
      const match = data.find((s) => s.id === directMatch.surahId);
      return match ? [match] : [];
    }

    return data.filter((s) => {
      const hay = `${s.id} ${s.name} ${s.englishName ?? ""}`;
      return normalize(hay).includes(q);
    });
  }, [data, query, directMatch]);

  // Auto-jump when a direct match is detected
  React.useEffect(() => {
    if (!directMatch) return;
    if (mode === "surahs") {
      const surah = data?.find((s) => s.id === directMatch.surahId);
      const ayahCount = surah?.ayahs.length ?? 0;
      if (
        directMatch.ayahIndex &&
        directMatch.ayahIndex >= 1 &&
        directMatch.ayahIndex <= ayahCount
      ) {
        navigate(`/mushaf?surah=${directMatch.surahId}&ayah=${directMatch.ayahIndex}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directMatch?.surahId, directMatch?.ayahIndex]);

  const sortedFiltered = React.useMemo(() => {
    let base: typeof filtered;
    if (sortMode === "mushaf") {
      base = filtered;
    } else if (sortMode === "recent") {
      const order = new Map<number, number>(recentSurahs.map((id, i) => [id, i]));
      base = [...filtered].sort((a, b) => {
        const ra = order.has(a.id) ? order.get(a.id)! : 9999;
        const rb = order.has(b.id) ? order.get(b.id)! : 9999;
        if (ra !== rb) return ra - rb;
        return a.id - b.id;
      });
    } else if (sortMode === "unread") {
      base = [...filtered]
        .filter((s) => (readingHistory[String(s.id)] ?? 0) === 0)
        .sort((a, b) => a.ayahs.length - b.ayahs.length);
    } else if (sortMode === "nearly") {
      // Surahs that are started but not completed (1% - 99%), sorted by highest % first
      base = [...filtered]
        .filter((s) => {
          const maxRead = readingHistory[String(s.id)] ?? 0;
          return maxRead > 0 && maxRead < s.ayahs.length;
        })
        .sort((a, b) => {
          const pA = (readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length);
          const pB = (readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length);
          return pB - pA;
        });
    } else {
      base = [...filtered].sort((a, b) => {
        const pA = Math.min(100, Math.round(((readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length)) * 100));
        const pB = Math.min(100, Math.round(((readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length)) * 100));
        return pB - pA;
      });
    }
    if (filterJuz !== null) base = base.filter((s) => getSurahJuz(s.id) === filterJuz);
    if (filterRevelation === "meccan") base = base.filter((s) => SURAH_REVELATION[s.id] !== "medinan");
    if (filterRevelation === "medinan") base = base.filter((s) => SURAH_REVELATION[s.id] === "medinan");
    return base;
  }, [filtered, sortMode, readingHistory, recentSurahs, filterJuz, filterRevelation]);

  // Per-juz reading progress: juzNum → pct (0-100)
  const juzProgress = React.useMemo(() => {
    if (!data) return {} as Record<number, number>;
    const acc: Record<number, { read: number; total: number }> = {};
    for (const surah of data) {
      const juz = getSurahJuz(surah.id);
      if (!acc[juz]) acc[juz] = { read: 0, total: 0 };
      acc[juz].total += surah.ayahs.length;
      acc[juz].read += Math.min(surah.ayahs.length, readingHistory[String(surah.id)] ?? 0);
    }
    const result: Record<number, number> = {};
    for (const [juzStr, { read, total }] of Object.entries(acc)) {
      result[Number(juzStr)] = total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0;
    }
    return result;
  }, [data, readingHistory]);

  const ayahSearch = React.useMemo(() => {
    if (!data) return { results: [] as Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }>, totalFound: 0 };
    const q = normalize(deferredQuery);
    if (!q || q.length < 2) return { results: [], totalFound: 0 };

    const out: Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }> = [];
    const limit = 60;
    let totalFound = 0;

    for (const s of data) {
      for (let i = 0; i < s.ayahs.length; i++) {
        const text = s.ayahs[i] ?? "";
        if (normalize(text).includes(q)) {
          totalFound++;
          if (out.length < limit) {
            out.push({ surahId: s.id, surahName: s.name, ayahIndex: i + 1, text });
          }
        }
      }
    }

    return { results: out, totalFound };
  }, [data, deferredQuery]);

  const ayahResults = ayahSearch.results;
  const ayahTotalFound = ayahSearch.totalFound;

  if (isLoading) {
    return (
      <div className="space-y-4 page-enter" role="status" aria-label="جارٍ التحميل…">
        <span className="sr-only">جارٍ التحميل…</span>
        <div className="glass rounded-3xl p-5 animate-pulse border border-[var(--stroke)]">
          <div className="h-5 w-28 bg-[var(--card)] rounded-xl mb-2" />
          <div className="h-3 w-20 bg-[var(--card)] rounded-xl" />
          <div className="mt-4 h-10 bg-[var(--card)] rounded-3xl" />
        </div>
        <div className="glass rounded-3xl p-5 border border-[var(--stroke)]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {LOADING_SURAH_KEYS.map((key, index) => (
              <div key={key} className="glass rounded-3xl p-4 animate-pulse border border-[var(--stroke)]" style={{ animationDelay: `${index * 45}ms` }}>
                <div className="h-3 w-14 bg-[var(--card)] rounded-lg mb-2" />
                <div className="h-4 w-20 bg-[var(--card)] rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold">حدث خطأ</div>
          <div className="opacity-70 mt-2 text-sm leading-6">
            تعذر تحميل بيانات القرآن. يمكنك إضافة الملف {" "}
            <code className="px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--stroke)]">public/data/quran.json</code>
            {" "}أو التأكد من الاتصال بالإنترنت.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter">

      {/* ══════════════════════════════════════════════════════
          HEADER CARD — Title + Search + Continue reading
          ══════════════════════════════════════════════════════ */}
      <Card className="p-0 quran-surface overflow-hidden">

        {/* Title + search */}
        <div className="px-5 pt-5 pb-4">
          <div className="quran-home-hero-ornament mb-4">
            <h1 className="quran-title text-2xl font-bold" style={{ color: "var(--accent)" }}>القرآن الكريم</h1>
          </div>

          {/* Search — always visible, large */}
          <div className="relative">
            <Search size={16} aria-hidden="true" className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-35 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder={mode === "ayahs" ? "ابحث داخل الآيات…" : "ابحث عن سورة… (مثال: الكهف، ٢:٢٥٥، ٢:١٨)"}
              aria-label={mode === "ayahs" ? "بحث داخل الآيات" : "بحث عن سورة"}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              className="pr-10 pl-9 h-11 text-sm"
              ref={searchInputRef}
            />
            {query && (
              <button type="button"
                onClick={() => setQuery("")}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-90 transition"
                aria-label="مسح البحث"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Mode toggle — search surahs vs ayahs */}
          <div className="mt-3 flex rounded-2xl bg-[var(--card)] border border-[var(--stroke)] overflow-hidden w-fit" role="tablist" aria-orientation="horizontal" aria-label="وضع البحث"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
            <button type="button" id="quran-tab-surahs" role="tab" aria-controls="quran-panel-surahs" aria-selected={mode === "surahs"} onClick={() => setMode("surahs")} className={`px-4 h-9 text-sm transition ${mode === "surahs" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}>السور</button>
            <button type="button" id="quran-tab-ayahs" role="tab" aria-controls="quran-panel-ayahs" aria-selected={mode === "ayahs"} onClick={() => setMode("ayahs")} className={`px-4 h-9 text-sm transition ${mode === "ayahs" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}>بحث بالآيات</button>
          </div>
        </div>

        {/* ── Continue reading strip ─────────────────────── */}
        {lastRead ? (
          <button type="button"
            onClick={() => navigate(`/mushaf?surah=${lastRead.surahId}&ayah=${lastRead.ayahIndex}`)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-right transition hover:brightness-110 active:scale-[0.99]"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--stroke) 50%, transparent)", background: "color-mix(in srgb, var(--accent) 7%, transparent)" }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
              <BookOpen size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: "var(--accent)" }}>متابعة القراءة</div>
              <div className="text-sm arabic-text opacity-70 truncate mt-0.5">
                {lastReadSurahName ?? `سورة ${lastRead.surahId}`}
                {lastRead.ayahIndex > 0 ? ` · الآية ${toArabicNumeral(lastRead.ayahIndex)}` : ""}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-30 shrink-0" aria-hidden="true"><path d="M10 8L6 4M10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        ) : null}

        {/* ── Stats row (compact, only when reading started) ── */}
        {quranStats.started > 0 && (
          <div
            className="px-5 py-2.5 flex items-center gap-4 text-xs opacity-50 flex-wrap"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--stroke) 35%, transparent)" }}
          >
            <span>📖 {quranStats.started.toLocaleString("ar-EG")} سورة</span>
            {(quranDailyAyahs[todayISO] ?? 0) > 0 && <span style={{ color: "var(--accent)", opacity: 1 }}>اليوم: {(quranDailyAyahs[todayISO] ?? 0).toLocaleString("ar-EG")} آية</span>}
            {prefs.quranDailyGoal > 0 && (() => {
              const todayAyahs = quranDailyAyahs[todayISO] ?? 0;
              const goal = prefs.quranDailyGoal;
              const met = todayAyahs >= goal;
              return (
                <span style={{ color: met ? "var(--ok)" : undefined, opacity: met ? 1 : 0.7 }}>
                  {met ? "هدف ✓" : `هدف: ${todayAyahs.toLocaleString("ar-EG")}/${goal.toLocaleString("ar-EG")}`}
                </span>
              );
            })()}
            {quranStreak > 0 && <span>🔥 {quranStreak.toLocaleString("ar-EG")} يوم</span>}
            {quranStats.completed > 0 && <span style={{ color: "var(--ok)", opacity: 1 }}>✓ {quranStats.completed.toLocaleString("ar-EG")} مكتملة</span>}
            {/* Progress grid toggle */}
            {quranStats.started > 0 && (
              <button type="button"
                onClick={() => setShowProgressGrid((v) => !v)}
                aria-pressed={showProgressGrid}
                aria-label="خريطة التقدم"
                className="flex items-center gap-1 text-xs transition"
                style={{ color: showProgressGrid ? "var(--accent)" : undefined, opacity: showProgressGrid ? 1 : 0.5 }}
              >
                <LayoutGrid size={11} aria-hidden="true" />
                <span>خريطة</span>
              </button>
            )}
            {/* Plans page link */}
            <button type="button"
              onClick={() => navigate("/quran/plans")}
              className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition mr-auto"
            >
              <span>📅 خطط التلاوة</span>
              {khatmaStartISO && khatmaDays && khatma && !khatma.isFinished && (
                <span style={{ color: "var(--accent)", opacity: 1 }}>{khatma.meta.percent.toLocaleString("ar-EG")}٪</span>
              )}
              {khatmaStartISO && khatmaDays && khatma?.isFinished && (
                <span style={{ color: "var(--ok)", opacity: 1 }}>✓</span>
              )}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-40" aria-hidden="true"><path d="M10 8L6 4M10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
        {/* Plan link row when no reading started yet */}
        {quranStats.started === 0 && (
          <div
            className="px-5 py-2 flex items-center"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--stroke) 25%, transparent)" }}
          >
            <button type="button"
              onClick={() => navigate("/quran/plans")}
              className="text-xs opacity-45 hover:opacity-80 transition flex items-center gap-1.5"
            >
              <span>📅 خطط التلاوة</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-50" aria-hidden="true"><path d="M10 8L6 4M10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
      {/* ── 114-surah progress grid ────────────────────────────── */}
      {showProgressGrid && data && mode === "surahs" && !query && (
        <div
          className="quran-surface rounded-3xl border px-4 py-4"
          style={{ borderColor: "color-mix(in srgb, var(--stroke) 35%, transparent)" }}
          aria-label="خريطة تقدم قراءة السور"
        >
          <div className="text-[10px] font-semibold opacity-40 mb-2.5 flex items-center justify-between">
            <span>خريطة السور — ١١٤ سورة</span>
            <div className="flex items-center gap-3 text-[9px]">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--ok)" }}></span>مكتملة</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--accent)" }}></span>جاري</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}></span>لم تبدأ</span>
            </div>
          </div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(19, 1fr)" }}
            role="list"
          >
            {data.map((s) => {
              const maxRead = readingHistory[String(s.id)] ?? 0;
              const pct = s.ayahs.length ? Math.min(100, Math.round((maxRead / s.ayahs.length) * 100)) : 0;
              const isComplete = pct >= 100;
              const isStarted = pct > 0 && pct < 100;
              const isCurrent = lastRead?.surahId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="listitem"
                  onClick={() => { recordRecentSurah(s.id); navigate(`/mushaf?surah=${s.id}`); }}
                  title={`${s.name} — ${pct > 0 ? `${pct}%` : "لم تقرأ"}`}
                  aria-label={`${s.name}${isComplete ? " – مكتملة" : isStarted ? ` – ${pct}%` : ""}`}
                  className="rounded-sm transition-all active:scale-90 hover:opacity-80"
                  style={{
                    aspectRatio: "1",
                    background: isComplete
                      ? "color-mix(in srgb, var(--ok) 70%, transparent)"
                      : isStarted
                      ? `color-mix(in srgb, var(--accent) ${Math.max(20, Math.round(pct * 0.7))}%, transparent)`
                      : "var(--card)",
                    border: isCurrent ? "1.5px solid var(--accent)" : isComplete ? "none" : "1px solid var(--stroke)",
                    opacity: isComplete ? 1 : isStarted ? 0.85 : 0.4,
                  }}
                />
              );
            })}
          </div>
          <div className="text-[10px] opacity-35 mt-2 text-center tabular-nums">
            {quranStats.completed.toLocaleString("ar-EG")} مكتملة · {(quranStats.started - quranStats.completed).toLocaleString("ar-EG")} جاري · {(114 - quranStats.started).toLocaleString("ar-EG")} لم تبدأ
          </div>
        </div>
      )}

      </Card>

      {/* ── Today's khatma reading target ─────────────────── */}
      {mode === "surahs" && !query && khatma && !khatma.isFinished && (
        <button
          type="button"
          onClick={() => navigate(`/mushaf?surah=${khatma.today.first.surahId}&ayah=${khatma.today.first.ayahIndex}`)}
          className="w-full text-right rounded-3xl border transition-all active:scale-[0.99] quran-surface overflow-hidden"
          style={{
            background: khatma.meta.doneToday
              ? "color-mix(in srgb, var(--ok, #3ddc97) 8%, var(--card))"
              : "color-mix(in srgb, var(--accent) 7%, var(--card))",
            borderColor: khatma.meta.doneToday
              ? "color-mix(in srgb, var(--ok, #3ddc97) 22%, transparent)"
              : "color-mix(in srgb, var(--accent) 22%, transparent)",
          }}
          aria-label={`ورد اليوم — من ${khatma.today.first.surahName} إلى ${khatma.today.last.surahName}`}
        >
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span aria-hidden="true" className="text-base">{khatma.meta.doneToday ? "✅" : "📅"}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: khatma.meta.doneToday ? "var(--ok, #3ddc97)" : "var(--accent)" }}
              >
                {khatma.meta.doneToday ? "أتممت ورد اليوم" : "ورد اليوم"}
              </span>
              <span className="text-[10px] opacity-50 mr-auto">
                {khatma.meta.percent.toLocaleString("ar-EG")}٪ مكتمل
              </span>
            </div>
            <div className="text-sm arabic-text opacity-80" dir="rtl">
              {khatma.today.first.surahName}
              {khatma.today.first.surahId !== khatma.today.last.surahId && (
                <span className="opacity-70"> ← {khatma.today.last.surahName}</span>
              )}
              <span className="text-[11px] opacity-55 mr-2">
                آية {toArabicNumeral(khatma.today.first.ayahIndex)} ← {toArabicNumeral(khatma.today.last.ayahIndex)}
              </span>
            </div>
          </div>
        </button>
      )}

      {/* ── Khatma finished celebration ───────────────── */}
      {mode === "surahs" && !query && khatma?.isFinished && (
        <div
          className="w-full text-center rounded-3xl border p-5 space-y-2"
          style={{
            background: "color-mix(in srgb, var(--ok, #3ddc97) 8%, var(--card))",
            borderColor: "color-mix(in srgb, var(--ok, #3ddc97) 25%, transparent)",
          }}
        >
          <div className="text-2xl" aria-hidden="true">🏆</div>
          <div className="text-sm font-bold" style={{ color: "var(--ok, #3ddc97)" }}>مبارك! أتممت الختمة</div>
          <div className="text-xs opacity-55">جعلها الله في ميزان حسناتك</div>
          <button type="button"
            onClick={() => navigate("/quran/plans")}
            className="mt-1 text-xs opacity-60 hover:opacity-100 transition underline underline-offset-2"
          >
            ابدأ ختمة جديدة
          </button>
        </div>
      )}

      {/* ── Verse of the Day ──────────────────────────────── */}      {mode === "surahs" && !query && dailyVerse && (
        <button
          type="button"
          onClick={() => navigate(`/mushaf?surah=${dailyVerse.surahId}&ayah=${dailyVerse.ayahIndex}`)}
          className="w-full text-right rounded-3xl border transition-all active:scale-[0.99] quran-surface overflow-hidden"
          style={{
            background: "color-mix(in srgb, var(--accent) 7%, var(--card))",
            borderColor: "color-mix(in srgb, var(--accent) 22%, transparent)",
          }}
          aria-label={`آية اليوم — ${dailyVerse.surahName} آية ${dailyVerse.ayahIndex}`}
        >
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3 text-[11px] opacity-60">
              <span aria-hidden="true">⭐</span>
              <span>آية اليوم</span>
              <span className="mr-auto opacity-70" style={{ color: "var(--accent)" }}>
                {dailyVerse.surahName} ﴿{toArabicNumeral(dailyVerse.ayahIndex)}﴾
              </span>
            </div>
            <p
              className="arabic-text text-lg leading-10 text-right"
              dir="rtl"
              lang="ar"
              style={{ color: "var(--fg)" }}
            >
              {dailyVerse.text}
            </p>
          </div>
        </button>
      )}

      {mode === "surahs" ? (
        <Card className="p-0 quran-surface overflow-hidden" role="tabpanel" id="quran-panel-surahs" aria-labelledby="quran-tab-surahs" tabIndex={0}>

          {/* ── Controls bar ─────────────────────────────────── */}
          <div
            className="px-4 pt-3 pb-3 flex items-center gap-2 flex-wrap"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 40%, transparent)" }}
          >
            {/* Sort toggle */}
            <div className="flex rounded-xl bg-[var(--card)] border border-[var(--stroke)] overflow-hidden text-sm" role="tablist" aria-orientation="horizontal" aria-label="ترتيب السور"
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
                role="tab"
                aria-controls="quran-surah-list"
                aria-selected={sortMode === "mushaf"}
                onClick={() => setSortMode("mushaf")}
                className={`px-3.5 h-9 transition ${sortMode === "mushaf" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}
              >
                المصحف
              </button>
              <button type="button"
                role="tab"
                aria-controls="quran-surah-list"
                aria-selected={sortMode === "progress"}
                onClick={() => setSortMode("progress")}
                className={`px-3.5 h-9 transition ${sortMode === "progress" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}
              >
                التقدم
              </button>
              {recentSurahs.length > 0 && (
              <button type="button"
                role="tab"
                aria-controls="quran-surah-list"
                aria-selected={sortMode === "recent"}
                onClick={() => setSortMode("recent")}
                className={`px-3.5 h-9 transition ${sortMode === "recent" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}
              >
                الأخيرة
              </button>
              )}
              <button type="button"
                role="tab"
                aria-controls="quran-surah-list"
                aria-selected={sortMode === "unread"}
                onClick={() => setSortMode("unread")}
                className={`px-3.5 h-9 transition ${sortMode === "unread" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}
              >
                غير مقروء
              </button>
              {sortedFiltered.length > 0 || sortMode === "nearly" ? (
              <button type="button"
                role="tab"
                aria-controls="quran-surah-list"
                aria-selected={sortMode === "nearly"}
                onClick={() => setSortMode("nearly")}
                className={`px-3.5 h-9 transition ${sortMode === "nearly" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}
              >
                تقريباً
              </button>
              ) : null}
            </div>

            {/* Revelation filter */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--stroke)] text-[10px] shrink-0">
              <button type="button"
                onClick={() => setFilterRevelation(filterRevelation === "meccan" ? null : "meccan")}
                aria-pressed={filterRevelation === "meccan"}
                className="px-2.5 py-1.5 transition"
                style={{ background: filterRevelation === "meccan" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--card)", color: filterRevelation === "meccan" ? "var(--accent)" : undefined, fontWeight: filterRevelation === "meccan" ? 600 : undefined }}
              >
                مكية
              </button>
              <div className="w-px bg-[var(--stroke)]" />
              <button type="button"
                onClick={() => setFilterRevelation(filterRevelation === "medinan" ? null : "medinan")}
                aria-pressed={filterRevelation === "medinan"}
                className="px-2.5 py-1.5 transition"
                style={{ background: filterRevelation === "medinan" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--card)", color: filterRevelation === "medinan" ? "var(--accent)" : undefined, fontWeight: filterRevelation === "medinan" ? 600 : undefined }}
              >
                مدنية
              </button>
            </div>

            {/* Random surah */}
            <button type="button"
              onClick={() => { if (!data || data.length === 0) return; navigate(`/mushaf?surah=${data[Math.floor(Math.random() * data.length)]!.id}`); }}
              className="w-9 h-9 rounded-xl border bg-[var(--card)] border-[var(--stroke)] opacity-55 hover:opacity-100 flex items-center justify-center transition shrink-0"
              title="سورة عشوائية" aria-label="سورة عشوائية"
            >
              <Shuffle size={14} aria-hidden="true" />
            </button>

            <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 text-xs opacity-75 transition focus-within:opacity-100">
              <Volume2 size={13} className="text-[var(--accent)]" />
              <select
                aria-label="القارئ"
                value={prefs.quranReciter}
                onChange={(event) => setPrefs({ quranReciter: event.target.value })}
                className="bg-transparent text-xs outline-none"
                style={{ color: 'var(--fg, #fff)', backgroundColor: 'transparent' }}
              >
                {QURAN_RECITERS.map((reciter) => (
                  <option
                    key={reciter.id}
                    value={reciter.id}
                    className="bg-[#101814] text-white"
                    style={{ backgroundColor: '#101814', color: '#ffffff' }}
                  >
                    {reciter.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Theme color dots */}
            <div className="mr-auto flex items-center gap-1">
              {(["default", "sepia", "midnight", "parchment", "forest", "rose", "ocean", "desert", "dawn"] as const).map((t) => (
                <button type="button"
                  key={t}
                  onClick={() => setPrefs({ quranTheme: t })}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${prefs.quranTheme === t ? "scale-125 border-[var(--accent)]" : "border-[var(--stroke)] opacity-50 hover:opacity-80"}`}
                  style={{ background: { default: "#1e1b2e", sepia: "#c8a97a", midnight: "#0d1b2a", parchment: "#f0e6c8", forest: "#0a1a0e", rose: "#2a0a12", ocean: "#0a1525", desert: "#2a1a08", dawn: "#1a0d22" }[t] }}
                  title={{ default: "افتراضي", sepia: "سيبيا", midnight: "ليلي", parchment: "رق", forest: "غابة", rose: "وردي", ocean: "بحر", desert: "صحراء", dawn: "فجر" }[t]}
                  aria-label={{ default: "افتراضي", sepia: "سيبيا", midnight: "ليلي", parchment: "رق", forest: "غابة", rose: "وردي", ocean: "بحر", desert: "صحراء", dawn: "فجر" }[t]}
                />
              ))}
            </div>

            {/* Bookmarks count pill */}
            {bookmarkedCount > 0 && (
              <button type="button"
                onClick={() => setShowBookmarks((v) => !v)}
                aria-pressed={showBookmarks}
                aria-label={showBookmarks ? "إخفاء المحفوظات" : "عرض المحفوظات"}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-sm transition ${showBookmarks ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-55 hover:opacity-90"}`}
              >
                <Bookmark size={13} aria-hidden="true" />
                <span className="tabular-nums">{bookmarkedCount}</span>
              </button>
            )}
          </div>

          {/* Bookmarks panel */}
          {showBookmarks && bookmarksList.length > 0 && (
            <div style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 40%, transparent)" }}>
              {bookmarksList.map((bm) => {
                const hlSwatches: Record<string, string> = { gold: "rgba(251,191,36,0.85)", green: "rgba(52,211,153,0.85)", blue: "rgba(96,165,250,0.85)", red: "rgba(248,113,113,0.85)" };
                return (
                  <button type="button"
                    key={`${bm.surahId}:${bm.ayahIndex}`}
                    onClick={() => navigate(`/mushaf?surah=${bm.surahId}&ayah=${bm.ayahIndex}`)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--card)] transition text-right"
                    style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 20%, transparent)" }}
                  >
                    {bm.highlight && hlSwatches[bm.highlight] && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hlSwatches[bm.highlight] }} />}
                    <span className="arabic-text text-sm font-medium">{bm.surahName}</span>
                    <span className="text-xs opacity-45 tabular-nums mr-auto">﴿{bm.ayahIndex.toLocaleString("ar-EG")}﴾</span>
                    {bm.note && <span className="text-[11px] opacity-45 truncate max-w-[100px]">{bm.note.slice(0, 40)}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Recently visited surahs ─────────────────────── */}
          {recentSurahs.length > 0 && !query && !showBookmarks && (
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 30%, transparent)" }}
            >
              <div className="text-[10px] font-semibold opacity-40 mb-2 uppercase tracking-wider">تصفحت مؤخرًا</div>
              <div className="flex gap-2 flex-wrap">
                {recentSurahs.slice(0, 6).map((sid) => {
                  const surah = data?.find((s) => s.id === sid);
                  if (!surah) return null;
                  const pct = surah.ayahs.length ? Math.min(100, Math.round(((readingHistory[String(sid)] ?? 0) / surah.ayahs.length) * 100)) : 0;
                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => { recordRecentSurah(sid); navigate(`/mushaf?surah=${sid}`); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition active:scale-95"
                      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent)" }}
                    >
                      <span className="arabic-text font-semibold">{surah.name}</span>
                      {pct > 0 && <span className="opacity-60 tabular-nums">{pct.toLocaleString("ar-EG")}٪</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Juz strip ──────────────────────────────────────── */}
          <div
            className="quran-juz-strip px-3 py-2"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 30%, transparent)" }}
          >
            <button type="button" className={`quran-juz-btn ${filterJuz === null ? "active" : ""}`} onClick={() => setFilterJuz(null)}>الكل</button>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => {
              const jpct = juzProgress[j] ?? 0;
              const isDone = jpct >= 100;
              const isActive = filterJuz === j;
              return (
                <button type="button"
                  key={j}
                  className={`quran-juz-btn ${isActive ? "active" : ""}`}
                  onClick={() => setFilterJuz(filterJuz === j ? null : j)}
                  aria-label={`الجزء ${j.toLocaleString("ar-EG")}${jpct > 0 ? ` — ${jpct.toLocaleString("ar-EG")}٪` : ""}`}
                  aria-pressed={filterJuz === j}
                  style={!isActive && jpct > 0 ? {
                    background: isDone ? "rgba(52,211,153,0.18)" : `color-mix(in srgb, var(--accent) ${Math.round(12 + jpct * 0.45)}%, transparent)`,
                    borderColor: isDone ? "rgba(52,211,153,0.4)" : "var(--accent-subtle, rgba(var(--accent-rgb),0.3))"
                  } : undefined}
                >
                  {j.toLocaleString("ar-EG")}
                  {isDone && <span className="block text-[7px] leading-none" style={{ color: "var(--ok)" }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Juz filter label */}
          {filterJuz !== null && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 25%, transparent)" }}>
              <span className="opacity-55" aria-live="polite" aria-atomic="true">{sortedFiltered.length.toLocaleString("ar-EG")} سورة — الجزء {(filterJuz as number).toLocaleString("ar-EG")}</span>
              {(juzProgress[filterJuz] ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full border tabular-nums font-semibold"
                  style={(juzProgress[filterJuz] ?? 0) >= 100
                    ? { background: "rgba(52,211,153,0.12)", color: "var(--ok)", borderColor: "rgba(52,211,153,0.25)" }
                    : { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}
                >
                  {(juzProgress[filterJuz] ?? 0).toLocaleString("ar-EG")}٪
                </span>
              )}
              <button type="button" onClick={() => setFilterJuz(null)} className="mr-auto opacity-45 hover:opacity-80 transition" aria-label="إزالة فلتر الجزء">✕</button>
            </div>
          )}

          {/* Phase 64: Sort mode summary bar */}
          {(sortMode === "nearly" || sortMode === "unread") && sortedFiltered.length > 0 && (() => {
            if (sortMode === "nearly") {
              const totalRemaining = sortedFiltered.reduce((sum, s) => {
                const maxRead = readingHistory[String(s.id)] ?? 0;
                return sum + Math.max(0, s.ayahs.length - maxRead);
              }, 0);
              const readMins = Math.max(1, Math.round(totalRemaining / 8));
              return (
                <div className="px-4 py-1.5 text-[10px] opacity-50 flex items-center gap-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 25%, transparent)" }}>
                  <span>{sortedFiltered.length.toLocaleString("ar-EG")} سورة قيد القراءة</span>
                  <span>·</span>
                  <span>{totalRemaining.toLocaleString("ar-EG")} آية متبقية (~{readMins.toLocaleString("ar-EG")} دقيقة)</span>
                </div>
              );
            }
            if (sortMode === "unread") {
              const totalAyahs = sortedFiltered.reduce((sum, s) => sum + s.ayahs.length, 0);
              const readMins = Math.max(1, Math.round(totalAyahs / 8));
              return (
                <div className="px-4 py-1.5 text-[10px] opacity-50 flex items-center gap-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 25%, transparent)" }}>
                  <span>{sortedFiltered.length.toLocaleString("ar-EG")} سورة لم تُقرأ</span>
                  <span>·</span>
                  <span>{totalAyahs.toLocaleString("ar-EG")} آية (~{readMins.toLocaleString("ar-EG")} دقيقة)</span>
                </div>
              );
            }
            return null;
          })()}

          {/* ── Surah list — clean full-width rows ─────────────── */}
          <div id="quran-surah-list" role="list" aria-label="قائمة السور">
            {sortedFiltered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
                <span className="text-3xl" aria-hidden="true">🔍</span>
                <p className="text-sm">لا توجد سور تطابق البحث</p>
                <button
                  type="button"
                  className="text-xs underline opacity-70"
                  onClick={() => { setFilterJuz(null); setQuery(""); }}
                >
                  إزالة الفلتر
                </button>
              </div>
            )}
            {sortedFiltered.map((s, idx) => {
              const maxRead = readingHistory[String(s.id)] ?? 0;
              const pct = s.ayahs.length ? Math.min(100, Math.round((maxRead / s.ayahs.length) * 100)) : 0;
              const isMedinan = SURAH_REVELATION[s.id] === "medinan";
              const isCurrent = lastRead?.surahId === s.id;
              const currJuz = getSurahJuz(s.id);
              const prevJuz = idx > 0 ? getSurahJuz(sortedFiltered[idx - 1]!.id) : null;
              const showJuzHeader = sortMode === "mushaf" && !filterJuz && !query && (idx === 0 || currJuz !== prevJuz);
              const sajdasHere = sajdaInSurah(s.id);
              return (
                <React.Fragment key={s.id}>
                  {showJuzHeader && (
                    <div
                      className="px-5 py-1.5 text-[10px] font-semibold opacity-35 tracking-wider"
                      style={idx > 0 ? { borderTop: "1px solid color-mix(in srgb, var(--stroke) 40%, transparent)", marginTop: "4px" } : undefined}
                      role="separator"
                      aria-label={`الجزء ${currJuz}`}
                    >
                      جزء {toArabicNumeral(currJuz)}
                    </div>
                  )}
                <div role="listitem" ref={isCurrent ? currentSurahRef : undefined}
                  className="relative">
                <button type="button"
                  onClick={() => { recordRecentSurah(s.id); navigate(`/mushaf?surah=${s.id}`); }}
                  className="w-full flex items-center gap-4 ps-5 pe-2 py-4 text-right transition hover:bg-[var(--card)] active:bg-[var(--card)]"
                  style={idx > 0 ? { borderTop: "1px solid color-mix(in srgb, var(--stroke) 22%, transparent)" } : undefined}
                >
                  {/* Number badge */}
                  <div className={`surah-num-badge shrink-0 ${isCurrent ? "ring-2 ring-accent-50" : ""}`}>
                    {toArabicNumeral(s.id)}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[17px] arabic-text font-semibold leading-snug">{s.name}</span>
                      {isCurrent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>جاري</span>}
                      {pct >= 100 && <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--ok)" }}>✓</span>}
                      {bookmarkedSurahs.has(s.id) && <Bookmark size={10} aria-hidden="true" className="shrink-0 opacity-70" style={{ color: "var(--accent)" }} />}
                      {sajdasHere.length > 0 ? (
                        <span title="في السورة موضع سجدة" className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                          سجدة
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] opacity-45">
                      {s.englishName && <span lang="en">{s.englishName}</span>}
                      {s.englishName && <span>·</span>}
                      <span className={`surah-type-${isMedinan ? "madani" : "maki"} px-1.5 py-0 rounded-full border text-[9px]`}>
                        {isMedinan ? "مدنية" : "مكية"}
                      </span>
                      <span>·</span>
                      <span className="tabular-nums" aria-label={`عدد آيات السورة: ${s.ayahs.length}`}>{s.ayahs.length.toLocaleString("ar-EG")} آية</span>
                      {sortMode === "unread" && (() => {
                        const mins = Math.max(1, Math.round(s.ayahs.length / 8));
                        return <span>· ~{mins.toLocaleString("ar-EG")} دق</span>;
                      })()}
                      {sortMode === "nearly" && maxRead > 0 && maxRead < s.ayahs.length && (
                        <span className="tabular-nums" style={{ color: "var(--accent)" }}>
                          · {(s.ayahs.length - maxRead).toLocaleString("ar-EG")} آية متبقية
                        </span>
                      )}
                    </div>
                    {/* Progress line */}
                    {pct > 0 && pct < 100 && (
                      <div
                        className="mt-1.5 h-0.5 rounded-full overflow-hidden w-20"
                        style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`قرأت ${Math.round(pct)}٪ من السورة`}
                      >
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                      </div>
                    )}
                  </div>

                  {/* Ayah count */}
                  <div className="text-sm opacity-40 tabular-nums arabic-text shrink-0 text-left">
                    {toArabicNumeral(s.ayahs.length)}<br />
                    <span className="text-[10px]">آية</span>
                  </div>

                  {/* Info button (Phase 1: opens SurahInfoModal) */}
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); setInfoSurahId(s.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }}
                    aria-label={`معلومات سورة ${s.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-transparent text-[var(--muted-2)] transition hover:bg-[var(--card-2)] hover:text-[var(--accent)] hover:border-accent-35">
                    <Info size={14} aria-hidden="true" />
                  </button>
                </button>
                </div>
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-5 quran-surface" role="tabpanel" id="quran-panel-ayahs" aria-labelledby="quran-tab-ayahs" tabIndex={0}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold quran-title">نتائج البحث</div>
            <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
              {ayahTotalFound > ayahResults.length && (
                <span className="text-[11px] opacity-55">أول {ayahResults.length.toLocaleString("ar-EG")} من {ayahTotalFound.toLocaleString("ar-EG")}</span>
              )}
              <Badge className="tabular-nums">{ayahResults.length.toLocaleString("ar-EG")}</Badge>
            </div>
          </div>

          {ayahResults.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 text-center py-4">
              <div className="text-2xl opacity-40">🔍</div>
              <div className="text-sm opacity-55">
                {query.length < 2 ? "اكتب كلمتين على الأقل" : "لا توجد نتائج للبحث"}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {ayahResults.map((r) => (
                <button type="button"
                  key={`${r.surahId}:${r.ayahIndex}`}
                  onClick={() => navigate(`/mushaf?surah=${r.surahId}&ayah=${r.ayahIndex}`)}
                  className="glass rounded-3xl p-4 text-right hover:bg-[var(--card-2)] transition border border-[var(--stroke)] w-full"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold arabic-text truncate">
                        {r.surahName} • ﴿{r.ayahIndex.toLocaleString("ar-EG")}﴾
                      </div>
                      <div className="mt-2 text-sm opacity-80 leading-8 arabic-text line-clamp-3">
                        {highlightAyah(r.text, deferredQuery)}
                      </div>
                    </div>
                    <div className="text-xs opacity-60 tabular-nums">{r.surahId.toLocaleString("ar-EG")}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Phase 1 — Surah info modal (opens from the i-button on each row) */}
      <SurahInfoModal
        open={infoSurahId !== null}
        surah={infoSurahId !== null ? (data?.find((s) => s.id === infoSurahId) ?? null) : null}
        onClose={() => setInfoSurahId(null)}
      />

      {/* Phase 1 — Context-aware Athar (knows which surah the user is browsing,
          sort/filter state, recent surahs, khatma target) */}
      <FloatingAthar
        modalMode
        context={{
          icon: "📖",
          title: lastRead
            ? `تتصفّح القرآن — آخر قراءة: ${lastReadSurahName ?? `سورة ${lastRead.surahId}`}`
            : "تتصفّح فهرس القرآن",
          subtitle: [
            filterJuz !== null ? `الجزء ${filterJuz}` : null,
            filterRevelation ? (filterRevelation === "meccan" ? "مكية" : "مدنية") : null,
            sortMode !== "mushaf" ? `الترتيب: ${sortMode}` : null,
          ].filter(Boolean).join(" · "),
          hint: `الزائر يتصفّح قائمة سور القرآن. الفلتر النشط: ${[
            filterJuz !== null ? `الجزء ${filterJuz}` : "كل الأجزاء",
            filterRevelation ? (filterRevelation === "meccan" ? "مكية" : "مدنية") : "كل أنواع النزول",
            sortMode !== "mushaf" ? `الترتيب: ${sortMode}` : null,
          ].filter(Boolean).join("، ")}. آخر قراءة: ${lastReadSurahName ?? "لم يبدأ بعد"}. السور الحديثة: ${recentSurahs.slice(0, 5).map((id) => data?.find((s) => s.id === id)?.name ?? "").filter(Boolean).join("، ")}. إذا سأل عن سورة معينة فحدّثه بمعلوماتها الأساسية واقترح الافتتاح بها.`,
        }}
        prefill={
          query
            ? `ما رأيك في سور القرآن بحسب ما أبحث عنه: «${query}»؟ اقترح ٣ سور تناسب قصدي وافتح لي أيها تريد.`
            : lastRead
              ? `اقترح عليَّ ختمةً أو ترتيب قراءة يناسب وضعي الحالي. آخر قراءة لي: ${lastReadSurahName ?? `سورة ${lastRead.surahId}`} (الآية ${lastRead.ayahIndex}).${khatma ? ` ختمتي: ${khatma.meta.percent}٪ مكتملة.` : ""}`
              : "ما أحسن خطة لبدء قراءة القرآن؟ راعِ أنني مبتدئ (أو: منتظم/متقدم حسب ما تعرفه)."
        }
      />
    </div>
  );
}
