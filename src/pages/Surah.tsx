import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkCheck, Copy } from "lucide-react";

import { useQuranDB } from "@/data/useQuranDB";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";

const BASMALAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

function shouldShowBasmalah(surahId: number) {
  // Common Quran convention: no basmalah header for Al-Fatiha (it is verse 1) and At-Tawbah.
  return surahId !== 1 && surahId !== 9;
}

function stripBasmalahFromFirstAyahIfPresent(text: string) {
  const t = (text ?? "").trim();
  if (!t) return t;
  if (t.startsWith(BASMALAH)) return t.slice(BASMALAH.length).trim();
  return t;
}

export function SurahPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [sp] = useSearchParams();

  const { data, isLoading, error } = useQuranDB();

  const bookmarks = useNoorStore((s) => s.quranBookmarks);
  const toggleBookmark = useNoorStore((s) => s.toggleQuranBookmark);
  const setLastRead = useNoorStore((s) => s.setQuranLastRead);

  const surahId = Number(params.id);
  const focusAyah = Number(sp.get("a") ?? "0");

  const listRef = React.useRef<HTMLDivElement>(null);

  const surah = React.useMemo(() => {
    if (!data || !Number.isFinite(surahId)) return null;
    return data.find((s) => s.id === surahId) ?? null;
  }, [data, surahId]);

  React.useEffect(() => {
    if (!surah) return;
    // Set last read to start when opening.
    setLastRead(surah.id, 0);
  }, [surah, setLastRead]);

  React.useEffect(() => {
    if (!surah || !listRef.current) return;
    if (!Number.isFinite(focusAyah) || focusAyah <= 0) return;

    const el = listRef.current.querySelector(`[data-ayah='${focusAyah}']`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [surah, focusAyah]);

  if (isLoading) return <div className="p-6 opacity-80">... تحميل السورة</div>;
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold">حدث خطأ</div>
          <div className="opacity-70 mt-2 text-sm leading-6">تعذر تحميل بيانات القرآن.</div>
        </Card>
      </div>
    );
  }

  if (!surah) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold">سورة غير موجودة</div>
          <div className="opacity-70 mt-2 text-sm leading-6">تحقق من رقم السورة.</div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => navigate("/quran")}>العودة</Button>
          </div>
        </Card>
      </div>
    );
  }

  const ayahs: string[] = surah.ayahs.map((a, idx) => (idx === 0 ? stripBasmalahFromFirstAyahIfPresent(a) : a));

  const doCopyAyah = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconButton aria-label="رجوع" onClick={() => navigate("/quran")}> 
              <ArrowRight size={18} />
            </IconButton>
            <div>
              <div className="text-sm font-semibold arabic-text">{surah.name}</div>
              <div className="mt-1 text-xs opacity-65">{surah.englishName || ""} • {surah.id}</div>
            </div>
          </div>
          <Badge className="tabular-nums">{ayahs.length} آية</Badge>
        </div>

        {shouldShowBasmalah(surah.id) ? (
          <div className="mt-4 glass rounded-3xl p-4 border border-white/10">
            <div className="arabic-text text-center text-base leading-8">{BASMALAH}</div>
          </div>
        ) : null}
      </Card>

      <div ref={listRef} className="space-y-3">
        {ayahs.map((text, idx) => {
          const ayahIndex = idx + 1;
          const key = `${surah.id}:${ayahIndex}`;
          const isBookmarked = !!bookmarks[key];

          return (
            <Card
              key={key}
              className="p-5"
              data-ayah={ayahIndex}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="tabular-nums">{ayahIndex}</Badge>
                  <div className="text-xs opacity-65">آية</div>
                </div>

                <div className="flex items-center gap-2">
                  <IconButton
                    aria-label="نسخ الآية"
                    onClick={() => doCopyAyah(`${text} ﴿${surah.name}:${ayahIndex}﴾`)}
                  >
                    <Copy size={16} />
                  </IconButton>

                  <IconButton
                    aria-label="إضافة علامة"
                    onClick={() => {
                      toggleBookmark(surah.id, ayahIndex);
                      setLastRead(surah.id, ayahIndex);
                      toast.success(isBookmarked ? "تمت إزالة العلامة" : "تمت إضافة علامة");
                    }}
                  >
                    {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </IconButton>
                </div>
              </div>

              <div
                className="mt-4 arabic-text whitespace-pre-wrap text-base leading-9"
                style={{ overflowWrap: "anywhere" }}
                onClick={() => setLastRead(surah.id, ayahIndex)}
              >
                {text}
              </div>

              <div className="mt-3 text-xs opacity-60">اضغط على الآية لتحديث موضع القراءة</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
