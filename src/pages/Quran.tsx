import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookOpen, Search, Shuffle, Sparkles, X } from "lucide-react";

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
    return <div className="p-6 opacity-80">... تحميل المصحف</div>;
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
            {quranStats.started > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/8 border border-white/10 tabular-nums">
                  📖 {quranStats.started} سورة بدأت
                </span>
                {quranStats.completed > 0 && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full border tabular-nums"
                    style={{ background: "color-mix(in srgb, var(--ok) 10%, transparent)", borderColor: "color-mix(in srgb, var(--ok) 25%, transparent)", color: "var(--ok)" }}
                  >
                    ✅ {quranStats.completed} مكتملة
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/8 border border-white/10 tabular-nums">
                  {quranStats.totalAyahs.toLocaleString("ar-SA")} آية
                </span>
              </div>
            )}
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
            className="mt-4 glass rounded-3xl p-4 border border-white/10 text-right w-full hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs opacity-70">آية اليوم</div>
              <Sparkles size={14} className="opacity-70" />
            </div>
            <div className="mt-2 text-sm arabic-text leading-8 line-clamp-2">{dailyVerse.text}</div>
            <div className="mt-2 text-xs opacity-65">{dailyVerse.surahName} • ﴿{dailyVerse.ayahIndex}﴾</div>
          </button>
        ) : null}
      </Card>

      {mode === "surahs" ? (
        <Card className="p-5 quran-surface">
          <div className="text-sm font-semibold mb-3 quran-title">السور</div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/quran/${s.id}`)}
                className={`glass rounded-3xl p-4 text-right hover:bg-white/10 transition border ${
                  lastRead?.surahId === s.id
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/8"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold arabic-text line-clamp-2 leading-snug">{s.name}</div>
                    <div className="mt-1 text-xs opacity-60 truncate">{s.englishName || ""}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs opacity-65 tabular-nums">{s.id}</div>
                    {bookmarkedSurahs.has(s.id) ? (
                      <Bookmark size={10} className="text-[var(--accent)] opacity-80" />
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 text-[11px] opacity-60 tabular-nums">{s.ayahs.length} آية</div>
                {(() => {
                  const maxAyah = readingHistory[String(s.id)] ?? 0;
                  if (!maxAyah || !s.ayahs.length) return null;
                  const pct = Math.min(100, Math.round((maxAyah / s.ayahs.length) * 100));
                  return (
                    <div className="mt-2">
                      <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${pct}%`, background: pct >= 100 ? "var(--ok)" : "var(--accent)" }}
                        />
                      </div>
                      <div className="mt-0.5 text-[10px] opacity-45 tabular-nums text-left">{pct}%</div>
                    </div>
                  );
                })()}
              </button>
            ))}
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
