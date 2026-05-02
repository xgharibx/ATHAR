import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark, BookOpen, CheckCircle2, Search, Shuffle, Volume2, X } from "lucide-react";
import { getSurahJuz, SURAH_REVELATION, toArabicNumeral } from "@/lib/quranMeta";

import { useQuranDB } from "@/data/useQuranDB";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { stripDiacritics } from "@/lib/arabic";
import { QURAN_RECITERS } from "@/lib/quranReciters";

function normalize(s: string) {
  return stripDiacritics((s ?? "").toLowerCase()).replaceAll(/\s+/g, " ").trim();
}

function parseJuzParam(raw: string | null) {
  const parsed = raw ? Number(raw) : Number.NaN;
  return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 30 ? parsed : null;
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
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useQuranDB();

  const lastRead = useNoorStore((s) => s.quranLastRead);
  const bookmarks = useNoorStore((s) => s.quranBookmarks);
  const readingHistory = useNoorStore((s) => s.quranReadingHistory);
  const quranStreak = useNoorStore((s) => s.quranStreak);
  const quranNotes = useNoorStore((s) => s.quranNotes);
  const quranHighlights = useNoorStore((s) => s.quranHighlights);
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);
  const setKhatmaPlan = useNoorStore((s) => s.setKhatmaPlan);
  const setKhatmaDone = useNoorStore((s) => s.setKhatmaDone);
  const resetKhatma = useNoorStore((s) => s.resetKhatma);

  const todayISO = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }, []);

  const [query, setQuery] = React.useState("");
  const [mode, setMode] = React.useState<"surahs" | "ayahs">("surahs");
  const [showBookmarks, setShowBookmarks] = React.useState(false);
  const [sortMode, setSortMode] = React.useState<"mushaf" | "progress">("mushaf");
  const [filterJuz, setFilterJuz] = React.useState<number | null>(() => parseJuzParam(searchParams.get("juz")));
  const [confirmKhatmaReset, setConfirmKhatmaReset] = React.useState(false);
  const [showKhatmaCard, setShowKhatmaCard] = React.useState(false);
  // Sync URL param changes (e.g. back-navigation)
  React.useEffect(() => {
    setFilterJuz(parseJuzParam(searchParams.get("juz")));
  }, [searchParams]);

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

    const days = Math.max(1, Math.min(365, Math.floor(khatmaDays)));
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
    const out: Array<{ surahId: number; surahName: string; ayahIndex: number; note?: string; highlight?: string }> = [];
    for (const [k, v] of Object.entries(bookmarks)) {
      if (!v) continue;
      const [surahIdStr, ayahStr] = k.split(":");
      const surahId = Number(surahIdStr);
      const ayahIndex = Number(ayahStr);
      const surahName = data.find((s) => s.id === surahId)?.name ?? `${surahId}`;
      const note = quranNotes[k] || undefined;
      const highlight = quranHighlights[k] || undefined;
      out.push({ surahId, surahName, ayahIndex, note, highlight });
    }
    return out.sort((a, b) => b.surahId - a.surahId || b.ayahIndex - a.ayahIndex);
  }, [bookmarks, data, quranNotes, quranHighlights]);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = normalize(query);
    if (!q) return data;

    return data.filter((s) => {
      const hay = `${s.id} ${s.name} ${s.englishName ?? ""}`;
      return normalize(hay).includes(q);
    });
  }, [data, query]);

  const sortedFiltered = React.useMemo(() => {
    let base = sortMode === "mushaf" ? filtered : [...filtered].sort((a, b) => {
      const pA = Math.min(100, Math.round(((readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length)) * 100));
      const pB = Math.min(100, Math.round(((readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length)) * 100));
      return pB - pA;
    });
    if (filterJuz !== null) base = base.filter((s) => getSurahJuz(s.id) === filterJuz);
    return base;
  }, [filtered, sortMode, readingHistory, filterJuz]);

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
    const q = normalize(query);
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
  }, [data, query]);

  const ayahResults = ayahSearch.results;
  const ayahTotalFound = ayahSearch.totalFound;

  if (isLoading) {
    return (
      <div className="space-y-4 page-enter">
        <div className="glass rounded-3xl p-5 animate-pulse border border-white/8">
          <div className="h-5 w-28 bg-white/8 rounded-xl mb-2" />
          <div className="h-3 w-20 bg-white/6 rounded-xl" />
          <div className="mt-4 h-10 bg-white/8 rounded-3xl" />
        </div>
        <div className="glass rounded-3xl p-5 border border-white/6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {LOADING_SURAH_KEYS.map((key, index) => (
              <div key={key} className="glass rounded-3xl p-4 animate-pulse border border-white/6" style={{ animationDelay: `${index * 45}ms` }}>
                <div className="h-3 w-14 bg-white/8 rounded-lg mb-2" />
                <div className="h-4 w-20 bg-white/6 rounded-lg" />
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
            <code className="px-2 py-1 rounded-lg bg-white/6 border border-white/10">public/data/quran.json</code>
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
            <div className="quran-title text-2xl font-bold" style={{ color: "var(--accent)" }}>القرآن الكريم</div>
          </div>

          {/* Search — always visible, large */}
          <div className="relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-35 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "ayahs" ? "ابحث داخل الآيات…" : "ابحث عن سورة… (مثال: الكهف، ١٨)"}
              className="pr-10 pl-9 h-11 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-90 transition"
                aria-label="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mode toggle — search surahs vs ayahs */}
          <div className="mt-3 flex rounded-2xl bg-white/6 border border-white/10 overflow-hidden w-fit">
            <button type="button" onClick={() => setMode("surahs")} className={`px-4 h-9 text-sm transition ${mode === "surahs" ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}>السور</button>
            <button type="button" onClick={() => setMode("ayahs")} className={`px-4 h-9 text-sm transition ${mode === "ayahs" ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}>بحث بالآيات</button>
          </div>
        </div>

        {/* ── Continue reading strip ─────────────────────── */}
        {lastRead ? (
          <button
            onClick={() => navigate(`/mushaf?surah=${lastRead.surahId}&ayah=${lastRead.ayahIndex}`)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-right transition hover:brightness-110 active:scale-[0.99]"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--stroke) 50%, transparent)", background: "color-mix(in srgb, var(--accent) 7%, transparent)" }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
              <BookOpen size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: "var(--accent)" }}>متابعة القراءة</div>
              <div className="text-sm arabic-text opacity-70 truncate mt-0.5">
                {lastReadSurahName ?? `سورة ${lastRead.surahId}`}
                {lastRead.ayahIndex > 0 ? ` · الآية ${toArabicNumeral(lastRead.ayahIndex)}` : ""}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-30 shrink-0"><path d="M10 8L6 4M10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        ) : null}

        {/* ── Stats row (compact, only when reading started) ── */}
        {quranStats.started > 0 && (
          <div
            className="px-5 py-2.5 flex items-center gap-4 text-xs opacity-50 flex-wrap"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--stroke) 35%, transparent)" }}
          >
            <span>📖 {quranStats.started} سورة</span>
            {quranStreak > 0 && <span>🔥 {quranStreak} يوم</span>}
            {quranStats.completed > 0 && <span style={{ color: "var(--ok)", opacity: 1 }}>✓ {quranStats.completed} مكتملة</span>}
            {/* Plans page link */}
            <button
              type="button"
              onClick={() => navigate("/quran/plans")}
              className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition mr-auto"
            >
              <span>📅 خطط التلاوة</span>
              {khatmaStartISO && khatmaDays && khatma && !khatma.isFinished && (
                <span style={{ color: "var(--accent)", opacity: 1 }}>{khatma.meta.percent}%</span>
              )}
              {khatmaStartISO && khatmaDays && khatma?.isFinished && (
                <span style={{ color: "var(--ok)", opacity: 1 }}>✓</span>
              )}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-40"><path d="M10 8L6 4M10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
        {/* Plan link row when no reading started yet */}
        {quranStats.started === 0 && (
          <div
            className="px-5 py-2 flex items-center"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--stroke) 25%, transparent)" }}
          >
            <button
              type="button"
              onClick={() => navigate("/quran/plans")}
              className="text-xs opacity-45 hover:opacity-80 transition flex items-center gap-1.5"
            >
              <span>📅 خطط التلاوة</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-50"><path d="M10 8L6 4M10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
      </Card>

      {showKhatmaCard && (
      <Card className="p-5 quran-surface">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold quran-title">خطة الختمة</div>
            <div className="text-xs opacity-65 mt-1">نقلناها هنا داخل صفحة المصحف لتبقى الرئيسية أخف</div>
          </div>

          {khatmaStartISO && khatmaDays ? (
            confirmKhatmaReset ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    resetKhatma();
                    toast.success("تمت إعادة ضبط الخطة");
                    setConfirmKhatmaReset(false);
                  }}
                >
                  تأكيد
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmKhatmaReset(false)}>
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmKhatmaReset(true)}>
                إعادة ضبط
              </Button>
            )
          ) : null}
        </div>

        {khatmaStartISO && khatmaDays && khatma && !khatma.isFinished ? (
          <div className="mt-3 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
            <div className="h-full progress-accent" style={{ width: `${khatma.meta.percent}%` }} />
          </div>
        ) : null}

        {!khatmaStartISO || !khatmaDays ? (
          <div className="mt-4">
            <div className="text-sm opacity-80">اختر مدة الختمة:</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[7, 15, 30, 60].map((days) => (
                <Button
                  key={days}
                  variant="secondary"
                  onClick={() => {
                    setKhatmaPlan({ startISO: todayISO, days });
                    setConfirmKhatmaReset(false);
                    toast.success("تم بدء الخطة");
                  }}
                >
                  {days} يوم
                </Button>
              ))}
            </div>
            <div className="mt-3 text-xs opacity-65 leading-6">
              تُحسب حصة اليوم تلقائيًا من بداية المصحف حتى النهاية.
            </div>
          </div>
        ) : isLoading ? (
          <div className="mt-4 text-sm opacity-65">... تحميل الخطة</div>
        ) : error || !khatma ? (
          <div className="mt-4 text-sm opacity-65 leading-7">تعذر تحميل خطة الختمة.</div>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                {khatma.isFinished ? "تمت الختمة" : `اليوم ${khatma.dayIndex + 1} من ${khatma.days}`}
              </Badge>
              <Badge>{`إنجاز: ${khatma.meta.doneCount}/${khatma.days} (${khatma.meta.percent}%)`}</Badge>
            </div>

            {!khatma.isFinished ? (
              <div className={`mt-3 glass rounded-3xl p-4 border transition-colors ${khatma.meta.doneToday ? "border-[var(--ok)]/30" : "border-white/10"}`}>
                {khatma.meta.doneToday ? (
                  <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--ok)" }}>
                    <CheckCircle2 size={12} />
                    اكتملت حصة اليوم
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <div className="text-xs opacity-65">حصة اليوم</div>
                  <span className="text-[10px] opacity-40 tabular-nums">{khatma.chunk} آية</span>
                </div>
                <div className="mt-2 text-sm leading-7">
                  من <span className="font-semibold">{khatma.today.first.surahName}</span> ﴿{khatma.today.first.ayahIndex}﴾
                  إلى <span className="font-semibold">{khatma.today.last.surahName}</span> ﴿{khatma.today.last.ayahIndex}﴾
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => navigate(`/mushaf?surah=${khatma.today.first.surahId}&ayah=${khatma.today.first.ayahIndex}`)}>                  
                    ابدأ القراءة
                  </Button>
                  <Button
                    variant={khatma.meta.doneToday ? "primary" : "secondary"}
                    onClick={() => {
                      setKhatmaDone(todayISO, !khatma.meta.doneToday);
                      toast.success(khatma.meta.doneToday ? "تم إلغاء الإتمام" : "تم حفظ الإتمام");
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {khatma.meta.doneToday ? "منجز اليوم" : "تمت قراءة اليوم"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 glass rounded-3xl p-4 border border-white/10">
                <div className="text-sm font-semibold">ما شاء الله — تمت الختمة</div>
                <div className="mt-2 text-xs opacity-65 leading-6">يمكنك بدء خطة جديدة من اليوم.</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[7, 15, 30, 60].map((days) => (
                    <Button
                      key={days}
                      variant="secondary"
                      onClick={() => {
                        setKhatmaPlan({ startISO: todayISO, days });
                        setConfirmKhatmaReset(false);
                        toast.success("تم بدء خطة جديدة");
                      }}
                    >
                      خطة {days} يوم
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
      )}

      {mode === "surahs" ? (
        <Card className="p-0 quran-surface overflow-hidden">

          {/* ── Controls bar ─────────────────────────────────── */}
          <div
            className="px-4 pt-3 pb-3 flex items-center gap-2 flex-wrap"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 40%, transparent)" }}
          >
            {/* Sort toggle */}
            <div className="flex rounded-xl bg-white/6 border border-white/10 overflow-hidden text-sm">
              <button
                onClick={() => setSortMode("mushaf")}
                className={`px-3.5 h-9 transition ${sortMode === "mushaf" ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}
              >
                المصحف
              </button>
              <button
                onClick={() => setSortMode("progress")}
                className={`px-3.5 h-9 transition ${sortMode === "progress" ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}
              >
                التقدم
              </button>
            </div>

            {/* Random surah */}
            <button
              type="button"
              onClick={() => { if (!data || data.length === 0) return; navigate(`/mushaf?surah=${data[Math.floor(Math.random() * data.length)]!.id}`); }}
              className="w-9 h-9 rounded-xl border bg-white/6 border-white/10 opacity-55 hover:opacity-100 flex items-center justify-center transition shrink-0"
              title="سورة عشوائية" aria-label="سورة عشوائية"
            >
              <Shuffle size={14} />
            </button>

            <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs opacity-75 transition focus-within:opacity-100">
              <Volume2 size={13} className="text-[var(--accent)]" />
              <select
                aria-label="القارئ"
                value={prefs.quranReciter}
                onChange={(event) => setPrefs({ quranReciter: event.target.value })}
                className="bg-transparent text-xs outline-none"
              >
                {QURAN_RECITERS.map((reciter) => (
                  <option key={reciter.id} value={reciter.id} className="bg-[#101814] text-white">
                    {reciter.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Theme color dots */}
            <div className="mr-auto flex items-center gap-1.5">
              {(["default", "sepia", "midnight", "parchment"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPrefs({ quranTheme: t })}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${prefs.quranTheme === t ? "scale-125 border-[var(--accent)]" : "border-white/20 opacity-50 hover:opacity-80"}`}
                  style={{ background: { default: "#1e1b2e", sepia: "#c8a97a", midnight: "#0d1b2a", parchment: "#f0e6c8" }[t] }}
                  title={{ default: "افتراضي", sepia: "سيبيا", midnight: "ليلي", parchment: "رق" }[t]}
                />
              ))}
            </div>

            {/* Bookmarks count pill */}
            {bookmarkedCount > 0 && (
              <button
                onClick={() => setShowBookmarks((v) => !v)}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-sm transition ${showBookmarks ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-55 hover:opacity-90"}`}
              >
                <Bookmark size={13} />
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
                  <button
                    key={`${bm.surahId}:${bm.ayahIndex}`}
                    onClick={() => navigate(`/mushaf?surah=${bm.surahId}&ayah=${bm.ayahIndex}`)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition text-right"
                    style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 20%, transparent)" }}
                  >
                    {bm.highlight && hlSwatches[bm.highlight] && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hlSwatches[bm.highlight] }} />}
                    <span className="arabic-text text-sm font-medium">{bm.surahName}</span>
                    <span className="text-xs opacity-45 tabular-nums mr-auto">﴿{bm.ayahIndex}﴾</span>
                    {bm.note && <span className="text-[11px] opacity-45 truncate max-w-[100px]">{bm.note.slice(0, 40)}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Juz strip ──────────────────────────────────────── */}
          <div
            className="quran-juz-strip px-3 py-2"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 30%, transparent)" }}
          >
            <button className={`quran-juz-btn ${filterJuz === null ? "active" : ""}`} onClick={() => setFilterJuz(null)}>الكل</button>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => {
              const jpct = juzProgress[j] ?? 0;
              const isDone = jpct >= 100;
              const isActive = filterJuz === j;
              return (
                <button
                  key={j}
                  className={`quran-juz-btn ${isActive ? "active" : ""}`}
                  onClick={() => setFilterJuz(filterJuz === j ? null : j)}
                  title={jpct > 0 ? `الجزء ${j}: ${jpct}%` : undefined}
                  style={!isActive && jpct > 0 ? {
                    background: isDone ? "rgba(52,211,153,0.18)" : `color-mix(in srgb, var(--accent) ${Math.round(12 + jpct * 0.45)}%, transparent)`,
                    borderColor: isDone ? "rgba(52,211,153,0.4)" : "var(--accent-subtle, rgba(var(--accent-rgb),0.3))"
                  } : undefined}
                >
                  {j}
                  {isDone && <span className="block text-[7px] leading-none" style={{ color: "var(--ok)" }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Juz filter label */}
          {filterJuz !== null && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ borderBottom: "1px solid color-mix(in srgb, var(--stroke) 25%, transparent)" }}>
              <span className="opacity-55">{sortedFiltered.length} سورة — الجزء {filterJuz}</span>
              {(juzProgress[filterJuz] ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full border tabular-nums font-semibold"
                  style={(juzProgress[filterJuz] ?? 0) >= 100
                    ? { background: "rgba(52,211,153,0.12)", color: "var(--ok)", borderColor: "rgba(52,211,153,0.25)" }
                    : { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}
                >
                  {juzProgress[filterJuz]}%
                </span>
              )}
              <button type="button" onClick={() => setFilterJuz(null)} className="mr-auto opacity-45 hover:opacity-80 transition">✕</button>
            </div>
          )}

          {/* ── Surah list — clean full-width rows ─────────────── */}
          <div>
            {sortedFiltered.map((s, idx) => {
              const maxRead = readingHistory[String(s.id)] ?? 0;
              const pct = s.ayahs.length ? Math.min(100, Math.round((maxRead / s.ayahs.length) * 100)) : 0;
              const isMedinan = SURAH_REVELATION[s.id] === "medinan";
              const isCurrent = lastRead?.surahId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/mushaf?surah=${s.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-right transition hover:bg-white/4 active:bg-white/8"
                  style={idx > 0 ? { borderTop: "1px solid color-mix(in srgb, var(--stroke) 22%, transparent)" } : undefined}
                >
                  {/* Number badge */}
                  <div className={`surah-num-badge shrink-0 ${isCurrent ? "ring-2 ring-[var(--accent)]/50" : ""}`}>
                    {toArabicNumeral(s.id)}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[17px] arabic-text font-semibold leading-snug">{s.name}</span>
                      {isCurrent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>جاري</span>}
                      {pct >= 100 && <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--ok)" }}>✓</span>}
                      {bookmarkedSurahs.has(s.id) && <Bookmark size={10} className="shrink-0 opacity-70" style={{ color: "var(--accent)" }} />}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] opacity-45">
                      {s.englishName && <span>{s.englishName}</span>}
                      {s.englishName && <span>·</span>}
                      <span className={`surah-type-${isMedinan ? "madani" : "maki"} px-1.5 py-0 rounded-full border text-[9px]`}>
                        {isMedinan ? "مدنية" : "مكية"}
                      </span>
                    </div>
                    {/* Progress line */}
                    {pct > 0 && pct < 100 && (
                      <div className="mt-1.5 h-0.5 rounded-full overflow-hidden w-20" style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                      </div>
                    )}
                  </div>

                  {/* Ayah count */}
                  <div className="text-sm opacity-40 tabular-nums arabic-text shrink-0 text-left">
                    {toArabicNumeral(s.ayahs.length)}<br />
                    <span className="text-[10px]">آية</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-5 quran-surface">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold quran-title">نتائج البحث</div>
            <div className="flex items-center gap-2">
              {ayahTotalFound > ayahResults.length && (
                <span className="text-[11px] opacity-55">أول {ayahResults.length} من {ayahTotalFound}</span>
              )}
              <Badge className="tabular-nums">{ayahResults.length}</Badge>
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
                <button
                  key={`${r.surahId}:${r.ayahIndex}`}
                  onClick={() => navigate(`/mushaf?surah=${r.surahId}&ayah=${r.ayahIndex}`)}
                  className="glass rounded-3xl p-4 text-right hover:bg-white/10 transition border border-white/10 w-full"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold arabic-text truncate">
                        {r.surahName} • ﴿{r.ayahIndex}﴾
                      </div>
                      <div className="mt-2 text-sm opacity-80 leading-8 arabic-text line-clamp-2">
                        {r.text}
                      </div>
                    </div>
                    <div className="text-xs opacity-60 tabular-nums">{r.surahId}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}


    </div>
  );
}
