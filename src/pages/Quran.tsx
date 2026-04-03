import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookOpen, Search, Shuffle, Sparkles, X, TrendingUp } from "lucide-react";
import { getSurahRevelationLabel, getSurahJuz, SURAH_REVELATION, TOTAL_QURAN_AYAHS, toArabicNumeral } from "@/lib/quranMeta";

import { useQuranDB } from "@/data/useQuranDB";
import { useQuranPageMap } from "@/data/useQuranPageMap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { stripDiacritics } from "@/lib/arabic";

function normalize(s: string) {
  return stripDiacritics((s ?? "").toLowerCase()).replace(/\s+/g, " ").trim();
}

export function QuranPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuranDB();
  const pageMapQuery = useQuranPageMap();

  const lastRead = useNoorStore((s) => s.quranLastRead);
  const bookmarks = useNoorStore((s) => s.quranBookmarks);
  const readingHistory = useNoorStore((s) => s.quranReadingHistory);

  const [query, setQuery] = React.useState("");
  const [mode, setMode] = React.useState<"surahs" | "ayahs">("surahs");
  const [jumpMushafPage, setJumpMushafPage] = React.useState("");
  const [showBookmarks, setShowBookmarks] = React.useState(false);
  const [sortMode, setSortMode] = React.useState<"mushaf" | "progress">("mushaf");

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

  const overallProgress = React.useMemo(
    () => Math.min(100, Math.round((quranStats.totalAyahs / TOTAL_QURAN_AYAHS) * 100)),
    [quranStats.totalAyahs]
  );

  // Set of surah IDs that have at least one bookmark
  const bookmarkedSurahs = React.useMemo(() => {
    const s = new Set<number>();
    for (const k of Object.keys(bookmarks)) {
      if (bookmarks[k]) s.add(Number(k.split(":")[0]));
    }
    return s;
  }, [bookmarks]);

  const bookmarksList = React.useMemo(() => {
    if (!data) return [] as Array<{ surahId: number; surahName: string; ayahIndex: number }>;
    const out: Array<{ surahId: number; surahName: string; ayahIndex: number }> = [];
    for (const [k, v] of Object.entries(bookmarks)) {
      if (!v) continue;
      const [surahIdStr, ayahStr] = k.split(":");
      const surahId = Number(surahIdStr);
      const ayahIndex = Number(ayahStr);
      const surahName = data.find((s) => s.id === surahId)?.name ?? `${surahId}`;
      out.push({ surahId, surahName, ayahIndex });
    }
    return out.sort((a, b) => a.surahId - b.surahId || a.ayahIndex - b.ayahIndex);
  }, [bookmarks, data]);

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
    if (sortMode === "mushaf") return filtered;
    return [...filtered].sort((a, b) => {
      const pA = Math.min(100, Math.round(((readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length)) * 100));
      const pB = Math.min(100, Math.round(((readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length)) * 100));
      return pB - pA;
    });
  }, [filtered, sortMode, readingHistory]);

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

  const dailyVerse = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    const d = new Date();
    const seed = Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
    const surahIndex = seed % data.length;
    const surah = data[surahIndex];
    const ayahIndex = (seed * 7) % Math.max(1, surah.ayahs.length);
    return {
      surahId: surah.id,
      surahName: surah.name,
      ayahIndex: ayahIndex + 1,
      text: surah.ayahs[ayahIndex] ?? ""
    };
  }, [data]);

  const openMushafPage = () => {
    if (!data || !pageMapQuery.data?.map) {
      toast.error("تعذر تحميل صفحات المصحف");
      return;
    }

    const total = pageMapQuery.data.totalPages ?? 604;
    const pageNumber = Number(jumpMushafPage);

    if (!Number.isFinite(pageNumber) || pageNumber < 1 || pageNumber > total) {
      toast.error(`أدخل رقم صفحة من 1 إلى ${total}`);
      return;
    }

    for (const surah of data) {
      for (let i = 0; i < surah.ayahs.length; i++) {
        const originalAyah = i + 1;
        const mapped = Number(pageMapQuery.data.map[`${surah.id}:${originalAyah}`]);
        if (mapped === pageNumber) {
          navigate(`/quran/${surah.id}?oa=${originalAyah}&pm=mushaf`);
          return;
        }
      }
    }

    toast.error("تعذر العثور على بيانات الصفحة المطلوبة");
  };

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
            {[...Array(12)].map((_, i) => (
              <div key={i} className="glass rounded-3xl p-4 animate-pulse border border-white/6" style={{ animationDelay: `${i * 45}ms` }}>
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
            تعذر تحميل بيانات القرآن. يمكنك إضافة الملف <code className="px-2 py-1 rounded-lg bg-white/6 border border-white/10">public/data/quran.json</code>
            أو التأكد من الاتصال بالإنترنت.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter">
      <Card className="p-5 quran-surface">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold quran-title">المصحف</div>
            <div className="mt-1 text-xs opacity-65">قراءة • بحث • علامات</div>
            {quranStats.started > 0 ? (
              <div className="mt-3 flex items-center gap-3">
                {/* Overall progress ring */}
                <div className="relative w-14 h-14 shrink-0">
                  <svg viewBox="0 0 56 56" className="w-14 h-14" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="28" cy="28" r="22" fill="none" strokeWidth="4" stroke="rgba(255,255,255,0.08)" />
                    <circle
                      cx="28" cy="28" r="22" fill="none" strokeWidth="4"
                      stroke="var(--accent)"
                      strokeLinecap="round"
                      strokeDasharray={`${(overallProgress / 100) * 138.2} 138.2`}
                      style={{ transition: "stroke-dasharray 0.7s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: "var(--accent)" }}>{overallProgress}%</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 opacity-70">
                    <span>📖</span>
                    <span className="tabular-nums">{quranStats.started} سورة بدأت</span>
                  </div>
                  {quranStats.completed > 0 && (
                    <div className="flex items-center gap-1.5" style={{ color: "var(--ok)" }}>
                      <span>✅</span>
                      <span className="tabular-nums">{quranStats.completed} مكتملة</span>
                    </div>
                  )}
                  <div className="opacity-55 tabular-nums">
                    {quranStats.totalAyahs.toLocaleString("ar-SA")} / {TOTAL_QURAN_AYAHS.toLocaleString("ar-SA")} آية
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookmarks((v) => !v)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-sm transition min-h-[36px]",
                showBookmarks
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 text-[var(--accent)]"
                  : "bg-white/6 border-white/10 hover:bg-white/8"
              ].join(" ")}
              aria-label="علامات القراءة"
            >
              <Bookmark size={14} />
              <span className="tabular-nums">{bookmarkedCount}</span>
            </button>
            {lastRead ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/quran/${lastRead.surahId}?a=${lastRead.ayahIndex}`)}
              >
                <BookOpen size={16} />
                {lastReadSurahName ? `${lastReadSurahName} ﴿${lastRead.ayahIndex}﴾` : `${lastRead.surahId}:${lastRead.ayahIndex}`}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                if (!data || data.length === 0) return;
                const random = data[Math.floor(Math.random() * data.length)];
                navigate(`/quran/${random.id}`);
              }}
            >
              <Shuffle size={16} />
              سورة عشوائية
            </Button>
          </div>
        </div>

        {/* Bookmarks panel */}
        {showBookmarks && (
          <div className="mt-4 rounded-3xl border border-[var(--accent)]/25 bg-[var(--accent)]/6 overflow-hidden">
            <div className="px-4 py-3 text-sm font-semibold border-b border-[var(--accent)]/15 flex items-center gap-2">
              <Bookmark size={14} className="text-[var(--accent)]" />
              علامات القراءة
            </div>
            {bookmarksList.length === 0 ? (
              <div className="px-4 py-4 text-sm opacity-55 text-center">لا توجد علامات بعد</div>
            ) : (
              <div className="divide-y divide-white/6">
                {bookmarksList.map((bm) => (
                  <button
                    key={`${bm.surahId}:${bm.ayahIndex}`}
                    onClick={() => navigate(`/quran/${bm.surahId}?a=${bm.ayahIndex}`)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/6 transition text-right"
                  >
                    <span className="text-sm arabic-text">{bm.surahName}</span>
                    <span className="text-xs opacity-55 tabular-nums">﴿{bm.ayahIndex}﴾</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant={mode === "surahs" ? "primary" : "secondary"}
              onClick={() => setMode("surahs")}
            >
              السور
            </Button>
            <Button
              variant={mode === "ayahs" ? "primary" : "secondary"}
              onClick={() => setMode("ayahs")}
            >
              بحث بالآيات
            </Button>
          </div>

          <div className="text-xs opacity-65">
            {mode === "ayahs" ? "اكتب كلمتين على الأقل" : ""}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center">
            <Search size={18} className="opacity-70" />
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "ayahs" ? "ابحث داخل الآيات…" : "ابحث عن سورة… (مثال: الكهف، 18)"}
          />
          <IconButton
            aria-label="مسح البحث"
            onClick={() => {
              setQuery("");
            }}
          >
            <X size={16} />
          </IconButton>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2">
          <Input
            type="number"
            min={1}
            max={pageMapQuery.data?.totalPages ?? 604}
            value={jumpMushafPage}
            onChange={(e) => setJumpMushafPage(e.target.value)}
            placeholder={`الانتقال لصفحة المصحف (1-${pageMapQuery.data?.totalPages ?? 604})`}
          />
          <Button variant={jumpMushafPage ? "primary" : "secondary"} onClick={openMushafPage}>
            فتح صفحة المصحف ٦٠٤
          </Button>
        </div>

        {dailyVerse ? (
          <button
            onClick={() => navigate(`/quran/${dailyVerse.surahId}?a=${dailyVerse.ayahIndex}`)}
            className="mt-4 relative overflow-hidden rounded-3xl w-full text-right hover:brightness-110 active:scale-[0.99] transition-all"
          >
            <div
              className="glass rounded-3xl p-4 border"
              style={{ borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)", background: "color-mix(in srgb, var(--accent) 7%, transparent)" }}
            >
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 65%)" }}
              />
              <div className="relative flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} style={{ color: "var(--accent)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>آية اليوم</span>
                </div>
                <span className="text-[11px] opacity-45">{dailyVerse.surahName} ﴿{dailyVerse.ayahIndex}﴾</span>
              </div>
              <div className="relative text-sm arabic-text leading-9 line-clamp-3 opacity-90">{dailyVerse.text}</div>
            </div>
          </button>
        ) : null}
      </Card>

      {mode === "surahs" ? (
        <Card className="p-5 quran-surface">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-sm font-semibold quran-title">السور</div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSortMode("mushaf")}
                className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                  sortMode === "mushaf"
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                    : "bg-white/6 border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                ترتيب المصحف
              </button>
              <button
                onClick={() => setSortMode("progress")}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border transition ${
                  sortMode === "progress"
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                    : "bg-white/6 border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                <TrendingUp size={11} />
                حسب التقدم
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {sortedFiltered.map((s) => {
              const maxRead = readingHistory[String(s.id)] ?? 0;
              const pct = s.ayahs.length ? Math.min(100, Math.round((maxRead / s.ayahs.length) * 100)) : 0;
              const isMedinan = SURAH_REVELATION[s.id] === "medinan";
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/quran/${s.id}`)}
                  className={`surah-card glass rounded-3xl p-3.5 text-right border ${
                    lastRead?.surahId === s.id
                      ? "border-[var(--accent)]/40 bg-[var(--accent)]/8"
                      : "border-white/10"
                  }`}
                >
                  {/* Number + title + bookmark */}
                  <div className="flex items-start gap-2">
                    <div className="surah-number-circle">{toArabicNumeral(s.id)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold arabic-text leading-snug line-clamp-1">{s.name}</div>
                      <div className="mt-0.5 text-[10px] opacity-50 truncate">{s.englishName || ""}</div>
                    </div>
                    {bookmarkedSurahs.has(s.id) && (
                      <Bookmark size={10} className="text-[var(--accent)] opacity-80 shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] opacity-50 tabular-nums">{s.ayahs.length} آية</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                      isMedinan
                        ? "border-blue-400/25 text-blue-300/80 bg-blue-400/8"
                        : "border-amber-400/25 text-amber-300/80 bg-amber-400/8"
                    }`}>
                      {isMedinan ? "مدنية" : "مكية"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/10 opacity-45">
                      ج{toArabicNumeral(getSurahJuz(s.id))}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {pct > 0 && (
                    <div className="mt-2">
                      <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${pct}%`, background: pct >= 100 ? "var(--ok)" : "var(--accent)" }}
                        />
                      </div>
                    </div>
                  )}
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
                  onClick={() => navigate(`/quran/${r.surahId}?a=${r.ayahIndex}`)}
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
