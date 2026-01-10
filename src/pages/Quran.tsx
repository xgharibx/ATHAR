import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookOpen, Search } from "lucide-react";

import { useQuranDB } from "@/data/useQuranDB";
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

  const lastRead = useNoorStore((s) => s.quranLastRead);
  const bookmarks = useNoorStore((s) => s.quranBookmarks);

  const [query, setQuery] = React.useState("");
  const [mode, setMode] = React.useState<"surahs" | "ayahs">("surahs");

  const bookmarkedCount = React.useMemo(() => Object.values(bookmarks).filter(Boolean).length, [bookmarks]);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = normalize(query);
    if (!q) return data;

    return data.filter((s) => {
      const hay = `${s.id} ${s.name} ${s.englishName ?? ""}`;
      return normalize(hay).includes(q);
    });
  }, [data, query]);

  const ayahResults = React.useMemo(() => {
    if (!data) return [] as Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }>;
    const q = normalize(query);
    if (!q || q.length < 2) return [];

    const out: Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }> = [];
    const limit = 60;

    for (const s of data) {
      for (let i = 0; i < s.ayahs.length; i++) {
        const text = s.ayahs[i] ?? "";
        if (normalize(text).includes(q)) {
          out.push({ surahId: s.id, surahName: s.name, ayahIndex: i + 1, text });
          if (out.length >= limit) return out;
        }
      }
    }

    return out;
  }, [data, query]);

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
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">المصحف</div>
            <div className="mt-1 text-xs opacity-65">قراءة • بحث • علامات</div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="tabular-nums">{bookmarkedCount} علامة</Badge>
            {lastRead ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/quran/${lastRead.surahId}?a=${lastRead.ayahIndex}`)}
              >
                <BookOpen size={16} />
                تابع القراءة
              </Button>
            ) : null}
          </div>
        </div>

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
              toast.success("تم المسح");
            }}
          >
            <Bookmark size={16} />
          </IconButton>
        </div>
      </Card>

      {mode === "surahs" ? (
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">السور</div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/quran/${s.id}`)}
                className="glass rounded-3xl p-4 text-right hover:bg-white/10 transition border border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold arabic-text truncate">{s.name}</div>
                    <div className="mt-1 text-xs opacity-60 truncate">{s.englishName || ""}</div>
                  </div>
                  <div className="text-xs opacity-65 tabular-nums">{s.id}</div>
                </div>
                <div className="mt-2 text-[11px] opacity-60 tabular-nums">{s.ayahs.length} آية</div>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">نتائج البحث</div>
            <Badge className="tabular-nums">{ayahResults.length}</Badge>
          </div>

          {ayahResults.length === 0 ? (
            <div className="mt-4 text-sm opacity-65 leading-7">
              اكتب جزءًا من الآية لعرض النتائج.
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
