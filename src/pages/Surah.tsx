import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Copy } from "lucide-react";

import { useQuranDB } from "@/data/useQuranDB";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";

const BASMALAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

function toArabicIndic(n: number) {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const s = String(Math.max(0, Math.floor(n)));
  return s.replace(/\d/g, (d) => map[Number(d)] ?? d);
}

function shouldShowBasmalah(surahId: number) {
  // Common Quran convention: no basmalah header for Al-Fatiha (it is verse 1) and At-Tawbah.
  return surahId !== 1 && surahId !== 9;
}

function stripBasmalahFromFirstAyahIfPresent(text: string) {
  const t = (text ?? "").replace(/^\uFEFF/, "").trim();
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

  const pageRef = React.useRef<HTMLDivElement>(null);

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
    if (!surah || !pageRef.current) return;
    if (!Number.isFinite(focusAyah) || focusAyah <= 0) return;

    const el = pageRef.current.querySelector(`[data-ayah='${focusAyah}']`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [surah, focusAyah]);

  const ayahs: string[] = React.useMemo(() => {
    if (!surah) return [];
    return surah.ayahs.map((a, idx) => (idx === 0 ? stripBasmalahFromFirstAyahIfPresent(a) : a));
  }, [surah]);

  const doCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const fullSurahText = React.useMemo(() => {
    const parts: string[] = [];
    if (!surah) return "";
    if (shouldShowBasmalah(surah.id)) parts.push(BASMALAH);
    ayahs.forEach((t, idx) => {
      const i = idx + 1;
      parts.push(`${t} (${i})`);
    });
    return parts.join("\n");
  }, [ayahs, surah]);

  const bookmarkedInSurah = React.useMemo(() => {
    if (!surah) return 0;
    let c = 0;
    for (let i = 1; i <= ayahs.length; i++) {
      if (bookmarks[`${surah.id}:${i}`]) c += 1;
    }
    return c;
  }, [ayahs.length, bookmarks, surah]);

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
          <div className="flex items-center gap-2">
            <Badge className="tabular-nums">{ayahs.length} آية</Badge>
            <Badge className="tabular-nums">{bookmarkedInSurah} علامة</Badge>
            <IconButton aria-label="نسخ السورة" onClick={() => doCopyText(fullSurahText)}>
              <Copy size={16} />
            </IconButton>
          </div>
        </div>

        {shouldShowBasmalah(surah.id) ? (
          <div className="mt-4 rounded-3xl p-4 border border-white/10 bg-[var(--ok)]/10">
            <div className="arabic-text text-center text-base leading-8 text-[var(--ok)]">{BASMALAH}</div>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div
          ref={pageRef}
          className="rounded-3xl border border-white/10 overflow-hidden"
        >
          <div
            className="p-5 md:p-7"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              backgroundColor: "rgba(255,255,255,0.04)"
            }}
          >
            <div
              className="arabic-text text-[17px] md:text-[18px] leading-10 whitespace-pre-wrap"
              style={{ overflowWrap: "anywhere" }}
            >
              {ayahs.map((text, idx) => {
                const ayahIndex = idx + 1;
                const k = `${surah.id}:${ayahIndex}`;
                const isBookmarked = !!bookmarks[k];

                return (
                  <span key={k} data-ayah={ayahIndex} className="inline">
                    <span
                      className="inline"
                      onClick={() => setLastRead(surah.id, ayahIndex)}
                    >
                      {text}{" "}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleBookmark(surah.id, ayahIndex);
                        setLastRead(surah.id, ayahIndex);
                      }}
                      className={
                        "inline-flex align-middle items-center justify-center mx-1 px-2.5 h-8 rounded-full border text-sm tabular-nums transition " +
                        (isBookmarked
                          ? "bg-[var(--accent)] text-black border-white/10"
                          : "bg-white/6 border-white/12 text-[var(--accent)] hover:bg-white/10")
                      }
                      aria-label={`آية ${ayahIndex}`}
                      title={isBookmarked ? "إزالة علامة" : "إضافة علامة"}
                    >
                      ﴿{toArabicIndic(ayahIndex)}﴾
                    </button>
                    {" "}
                  </span>
                );
              })}
            </div>

            <div className="mt-4 text-xs opacity-65">
              اضغط على الآية لتحديث موضع القراءة، واضغط على رقم الآية لإضافة علامة.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
