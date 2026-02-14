import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Copy, Shuffle, ChevronsRight, ChevronRight, ChevronLeft, ChevronsLeft } from "lucide-react";

import { useQuranDB } from "@/data/useQuranDB";
import { useQuranPageMap } from "@/data/useQuranPageMap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";

const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const BASMALAH_VARIANTS = [
  BASMALAH,
  "بِسْمِ ٱللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "بسم الله الرحمن الرحيم"
];

function toArabicIndic(n: number) {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const s = String(Math.max(0, Math.floor(n)));
  return s.replace(/\d/g, (d) => map[Number(d)] ?? d);
}

function shouldShowBasmalah(surahId: number) {
  // Per UX: show basmalah header once at the top for every surah except At-Tawbah.
  return surahId !== 9;
}

function stripBasmalahPrefixIfPresent(text: string) {
  const t = (text ?? "").replace(/^\uFEFF/, "").trim();
  if (!t) return t;
  for (const v of BASMALAH_VARIANTS) {
    if (t.startsWith(v)) return t.slice(v.length).trim();
  }
  return t;
}

export function SurahPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [sp] = useSearchParams();

  const { data, isLoading, error } = useQuranDB();
  const quranPageMapQuery = useQuranPageMap();

  const bookmarks = useNoorStore((s) => s.quranBookmarks);
  const toggleBookmark = useNoorStore((s) => s.toggleQuranBookmark);
  const setLastRead = useNoorStore((s) => s.setQuranLastRead);
  const lastRead = useNoorStore((s) => s.quranLastRead);
  const notes = useNoorStore((s) => s.quranNotes);
  const setQuranNote = useNoorStore((s) => s.setQuranNote);
  const clearQuranNote = useNoorStore((s) => s.clearQuranNote);
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);

  const surahId = Number(params.id);
  const focusAyah = Number(sp.get("a") ?? "0");
  const focusOriginalAyah = Number(sp.get("oa") ?? "0");
  const pageModeParam = sp.get("pm");

  const pageRef = React.useRef<HTMLDivElement>(null);

  const [selectedAyah, setSelectedAyah] = React.useState<number | null>(null);
  const [noteDraft, setNoteDraft] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [jumpAyah, setJumpAyah] = React.useState("");
  const [pageMode, setPageMode] = React.useState<"ayah" | "mushaf">("ayah");
  const [currentMushafPage, setCurrentMushafPage] = React.useState<number | null>(null);
  const [jumpMushafPage, setJumpMushafPage] = React.useState("");

  const surah = React.useMemo(() => {
    if (!data || !Number.isFinite(surahId)) return null;
    return data.find((s) => s.id === surahId) ?? null;
  }, [data, surahId]);

  const displayAyahs = React.useMemo(() => {
    if (!surah) return [] as Array<{ text: string; displayAyah: number; originalAyah: number }>;

    const raw = surah.ayahs.map((a) => (a ?? "").replace(/^\uFEFF/, "").trim());

    // If the first ayah is literally the basmalah (common in Al-Fatiha datasets),
    // drop it and show the basmalah only in the top header.
    const firstIsBasmalah = raw.length > 0 && BASMALAH_VARIANTS.some((v) => raw[0] === v);
    const startIndex = shouldShowBasmalah(surah.id) && firstIsBasmalah ? 1 : 0;

    const out: Array<{ text: string; displayAyah: number; originalAyah: number }> = [];
    for (let i = startIndex; i < raw.length; i++) {
      const originalAyah = i + 1;
      const displayAyah = i - startIndex + 1;
      const text = i === 0 ? stripBasmalahPrefixIfPresent(raw[i] ?? "") : (raw[i] ?? "");
      out.push({ text, displayAyah, originalAyah });
    }
    return out;
  }, [surah]);

  const pageSize = Math.max(6, Math.min(24, prefs.quranPageSize || 12));

  const pageMap = quranPageMapQuery.data?.map;
  const totalMushafPages = quranPageMapQuery.data?.totalPages ?? 604;

  const surahMushafPages = React.useMemo(() => {
    if (!surah || !pageMap) return [] as number[];
    const pages = new Set<number>();

    for (const a of displayAyahs) {
      const p = Number(pageMap[`${surah.id}:${a.originalAyah}`]);
      if (Number.isFinite(p) && p >= 1) pages.add(p);
    }

    return Array.from(pages).sort((a, b) => a - b);
  }, [displayAyahs, pageMap, surah]);

  const isMushafMode = pageMode === "mushaf" && surahMushafPages.length > 0;

  const totalPages = Math.max(1, Math.ceil(displayAyahs.length / pageSize));

  const currentMushafIndex = React.useMemo(() => {
    if (!isMushafMode || !currentMushafPage) return 1;
    const idx = surahMushafPages.indexOf(currentMushafPage);
    return idx >= 0 ? idx + 1 : 1;
  }, [currentMushafPage, isMushafMode, surahMushafPages]);

  const navPage = isMushafMode ? currentMushafIndex : currentPage;
  const navTotal = isMushafMode ? Math.max(1, surahMushafPages.length) : totalPages;

  const pageAyahs = React.useMemo(() => {
    if (isMushafMode) {
      if (!surah || !pageMap) return [];
      const activePage = currentMushafPage ?? surahMushafPages[0];
      if (!activePage) return [];
      return displayAyahs.filter((a) => Number(pageMap[`${surah.id}:${a.originalAyah}`]) === activePage);
    }

    const start = (currentPage - 1) * pageSize;
    return displayAyahs.slice(start, start + pageSize);
  }, [currentMushafPage, currentPage, displayAyahs, isMushafMode, pageMap, pageSize, surah, surahMushafPages]);

  React.useEffect(() => {
    if (!surah) return;

    const mappedDisplayFromOriginal =
      Number.isFinite(focusOriginalAyah) && focusOriginalAyah > 0
        ? (displayAyahs.find((x) => x.originalAyah === focusOriginalAyah)?.displayAyah ?? 1)
        : null;

    const preferredAyah =
      mappedDisplayFromOriginal && mappedDisplayFromOriginal > 0
        ? mappedDisplayFromOriginal
        :
      Number.isFinite(focusAyah) && focusAyah > 0
        ? focusAyah
        : lastRead?.surahId === surah.id && lastRead.ayahIndex > 0
          ? lastRead.ayahIndex
          : 1;
    const clampedAyah = Math.max(1, Math.min(displayAyahs.length, preferredAyah));
    const nextPage = Math.min(totalPages, Math.max(1, Math.ceil(clampedAyah / pageSize)));
    setCurrentPage(nextPage);
    setSelectedAyah(clampedAyah > 0 ? clampedAyah : null);

    if (surahMushafPages.length > 0 && pageMap) {
      const item = displayAyahs.find((x) => x.displayAyah === clampedAyah) ?? displayAyahs[0];
      const mapped = Number(pageMap[`${surah.id}:${item?.originalAyah ?? 1}`]);
      if (mapped >= 1 && surahMushafPages.includes(mapped)) setCurrentMushafPage(mapped);
      else setCurrentMushafPage(surahMushafPages[0]);
    } else {
      setCurrentMushafPage(null);
    }
  }, [displayAyahs, focusAyah, focusOriginalAyah, lastRead?.ayahIndex, lastRead?.surahId, pageMap, pageSize, surah, surahMushafPages, totalPages]);

  React.useEffect(() => {
    if (pageModeParam === "mushaf" && surahMushafPages.length > 0) {
      setPageMode("mushaf");
    }
  }, [pageModeParam, surahMushafPages]);

  React.useEffect(() => {
    if (!pageRef.current) return;
    pageRef.current.scrollTo({ top: 0, behavior: prefs.reduceMotion ? "auto" : "smooth" });
  }, [currentPage, prefs.reduceMotion]);

  React.useEffect(() => {
    if (!selectedAyah) return;

    if (isMushafMode) {
      const exists = pageAyahs.some((x) => x.displayAyah === selectedAyah);
      if (!exists) setSelectedAyah(null);
      return;
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = start + pageSize - 1;
    if (selectedAyah < start || selectedAyah > end) {
      setSelectedAyah(null);
    }
  }, [currentPage, isMushafMode, pageAyahs, pageSize, selectedAyah]);

  const doCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const doShareSelectedAyahImage = async () => {
    try {
      if (!surah || !selectedAyah) return;
      const a = displayAyahs.find((x) => x.displayAyah === selectedAyah);
      if (!a) return;

      const verse = `${a.text} ﴿${toArabicIndic(selectedAyah)}﴾`;
      const poster = await renderDhikrPosterBlob({
        text: verse,
        subtitle: `${surah.name} • ${surah.id}:${selectedAyah}`,
        footerAppName: "ATHAR • أثر",
        footerUrl: "xgharibx.github.io/ATHAR"
      });

      const filename = `athar-quran-${surah.id}-${selectedAyah}.png`;
      const file = new File([poster], filename, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ATHAR" });
        return;
      }

      const url = URL.createObjectURL(poster);
      const el = document.createElement("a");
      el.href = url;
      el.download = filename;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error("تعذر مشاركة الصورة");
    }
  };

  React.useEffect(() => {
    if (!surah || !selectedAyah) return;
    const key = `${surah.id}:${selectedAyah}`;
    setNoteDraft(notes[key] ?? "");
  }, [notes, selectedAyah, surah]);

  const fullSurahText = React.useMemo(() => {
    const parts: string[] = [];
    if (!surah) return "";
    if (shouldShowBasmalah(surah.id)) parts.push(BASMALAH);
    displayAyahs.forEach((a) => {
      parts.push(`${a.text} (${a.displayAyah})`);
    });
    return parts.join("\n");
  }, [displayAyahs, surah]);

  const selectedAyahText = React.useMemo(() => {
    if (!surah || !selectedAyah) return "";
    const row = displayAyahs.find((x) => x.displayAyah === selectedAyah);
    if (!row) return "";
    return `${row.text} ﴿${toArabicIndic(selectedAyah)}﴾\n(${surah.name} ${surah.id}:${selectedAyah})`;
  }, [displayAyahs, selectedAyah, surah]);

  const bookmarkedInSurah = React.useMemo(() => {
    if (!surah) return 0;
    let c = 0;
    for (let i = 1; i <= displayAyahs.length; i++) {
      if (bookmarks[`${surah.id}:${i}`]) c += 1;
    }
    return c;
  }, [displayAyahs.length, bookmarks, surah]);

  const readingProgress = React.useMemo(() => {
    if (!surah || !displayAyahs.length) return 0;
    const current =
      lastRead?.surahId === surah.id
        ? Math.min(displayAyahs.length, Math.max(0, Number(lastRead.ayahIndex) || 0))
        : 0;
    return Math.max(0, Math.min(100, Math.round((current / displayAyahs.length) * 100)));
  }, [displayAyahs.length, lastRead?.ayahIndex, lastRead?.surahId, surah]);

  const goToAyah = (ayahIndex: number) => {
    if (!surah) return;
    const clamped = Math.max(1, Math.min(displayAyahs.length, ayahIndex));
    const page = Math.ceil(clamped / pageSize);
    setCurrentPage(page);

    const item = displayAyahs.find((x) => x.displayAyah === clamped);
    if (item && pageMap && surahMushafPages.length > 0) {
      const mapped = Number(pageMap[`${surah.id}:${item.originalAyah}`]);
      if (mapped >= 1 && surahMushafPages.includes(mapped)) {
        setCurrentMushafPage(mapped);
      }
    }

    setSelectedAyah(clamped);
    setLastRead(surah.id, clamped);
  };

  const goFirstPage = () => {
    if (isMushafMode) setCurrentMushafPage(surahMushafPages[0] ?? null);
    else setCurrentPage(1);
  };

  const goPrevPage = () => {
    if (isMushafMode) {
      const idx = Math.max(0, currentMushafIndex - 2);
      setCurrentMushafPage(surahMushafPages[idx] ?? surahMushafPages[0] ?? null);
      return;
    }
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const goNextPage = () => {
    if (isMushafMode) {
      const idx = Math.min(surahMushafPages.length - 1, currentMushafIndex);
      setCurrentMushafPage(surahMushafPages[idx] ?? surahMushafPages[surahMushafPages.length - 1] ?? null);
      return;
    }
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const goLastPage = () => {
    if (isMushafMode) setCurrentMushafPage(surahMushafPages[surahMushafPages.length - 1] ?? null);
    else setCurrentPage(totalPages);
  };

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
      <Card className="p-5 quran-surface">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconButton aria-label="رجوع" onClick={() => navigate("/quran")}> 
              <ArrowRight size={18} />
            </IconButton>
            <div>
              <div className="text-sm font-semibold arabic-text quran-title">{surah.name}</div>
              <div className="mt-1 text-xs opacity-65">{surah.englishName || ""} • {surah.id}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="tabular-nums">{displayAyahs.length} آية</Badge>
            <Badge className="tabular-nums">{bookmarkedInSurah} علامة</Badge>
            <Badge className="tabular-nums">{readingProgress}%</Badge>
            <IconButton aria-label="نسخ السورة" onClick={() => doCopyText(fullSurahText)}>
              <Copy size={16} />
            </IconButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
          <div className="glass rounded-3xl p-3 border border-white/10">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs opacity-70">
                {isMushafMode
                  ? `صفحة المصحف ${currentMushafPage ?? surahMushafPages[0] ?? 1} من ${totalMushafPages} • (${navPage}/${navTotal})`
                  : `صفحة ${currentPage} / ${totalPages}`}
              </div>
              <div className="flex items-center gap-1">
                <IconButton aria-label="أول صفحة" onClick={goFirstPage} disabled={navPage <= 1}>
                  <ChevronsRight size={16} />
                </IconButton>
                <IconButton aria-label="الصفحة السابقة" onClick={goPrevPage} disabled={navPage <= 1}>
                  <ChevronRight size={16} />
                </IconButton>
                <IconButton aria-label="الصفحة التالية" onClick={goNextPage} disabled={navPage >= navTotal}>
                  <ChevronLeft size={16} />
                </IconButton>
                <IconButton aria-label="آخر صفحة" onClick={goLastPage} disabled={navPage >= navTotal}>
                  <ChevronsLeft size={16} />
                </IconButton>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${readingProgress}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <Button
              variant={pageMode === "ayah" ? "primary" : "secondary"}
              onClick={() => setPageMode("ayah")}
            >
              صفحات ذكية
            </Button>
            <Button
              variant={pageMode === "mushaf" ? "primary" : "secondary"}
              onClick={() => {
                if (surahMushafPages.length === 0) {
                  toast.error("تعذر تحميل صفحات المصحف ٦٠٤ الآن");
                  return;
                }
                setPageMode("mushaf");
                setCurrentMushafPage((prev) => prev ?? surahMushafPages[0]);
              }}
            >
              صفحات المصحف ٦٠٤
            </Button>
            {[8, 12, 16].map((size) => (
              <Button
                key={size}
                variant={pageSize === size ? "primary" : "secondary"}
                onClick={() => setPrefs({ quranPageSize: size })}
                disabled={isMushafMode}
              >
                {size} آية
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center">
          <Button variant="secondary" onClick={() => {
            const randomAyah = Math.floor(Math.random() * displayAyahs.length) + 1;
            goToAyah(randomAyah);
            toast.success(`آية عشوائية: ${toArabicIndic(randomAyah)}`);
          }}>
            <Shuffle size={16} /> آية عشوائية
          </Button>
          <Input
            type="number"
            min={1}
            max={displayAyahs.length}
            value={jumpAyah}
            onChange={(e) => setJumpAyah(e.target.value)}
            placeholder={`الانتقال إلى آية (1-${displayAyahs.length})`}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const num = Number(jumpAyah);
              if (!Number.isFinite(num) || num <= 0) {
                toast.error("أدخل رقم آية صحيح");
                return;
              }
              goToAyah(num);
            }}
          >
            انتقال
          </Button>
          {isMushafMode ? (
            <>
              <Input
                type="number"
                min={1}
                max={totalMushafPages}
                value={jumpMushafPage}
                onChange={(e) => setJumpMushafPage(e.target.value)}
                placeholder={`الانتقال إلى صفحة المصحف (1-${totalMushafPages})`}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  const pageNum = Number(jumpMushafPage);
                  if (!Number.isFinite(pageNum) || pageNum <= 0 || pageNum > totalMushafPages) {
                    toast.error("أدخل رقم صفحة صحيح");
                    return;
                  }
                  const idx = surahMushafPages.indexOf(pageNum);
                  if (idx < 0) {
                    toast.error("هذه الصفحة لا تحتوي على آيات من هذه السورة");
                    return;
                  }
                  setCurrentMushafPage(pageNum);
                }}
              >
                انتقال للصفحة
              </Button>
            </>
          ) : null}
          <Button variant="secondary" onClick={() => setPrefs({ quranHideMarkers: !prefs.quranHideMarkers })}>
            {prefs.quranHideMarkers ? "إظهار الأرقام" : "إخفاء الأرقام"}
          </Button>
        </div>

        {shouldShowBasmalah(surah.id) ? (
          <div className="mt-4 quran-basmalah">
            <div className="arabic-text quran-basmalah-text">{BASMALAH}</div>
          </div>
        ) : null}
      </Card>

      <Card className="p-5 quran-surface">
        <div
          ref={pageRef}
          className="quran-page"
        >
          <div
            className="quran-page-inner"
          >
            <div
              className="arabic-text quran-text whitespace-pre-wrap"
              style={{
                fontSize: `${18 * prefs.quranFontScale}px`,
                lineHeight: prefs.quranLineHeight
              }}
            >
              {pageAyahs.map((a) => {
                const ayahIndex = a.displayAyah;
                const k = `${surah.id}:${ayahIndex}`;
                const isBookmarked = !!bookmarks[k];

                return (
                  <span key={k} data-ayah={ayahIndex} className="inline">
                    <span
                      className="inline"
                      onClick={() => {
                        setLastRead(surah.id, ayahIndex);
                        setSelectedAyah(ayahIndex);
                      }}
                    >
                      {a.text}{" "}
                    </span>
                    {!prefs.quranHideMarkers ? (
                      <button
                        type="button"
                        onClick={() => {
                          toggleBookmark(surah.id, ayahIndex);
                          setLastRead(surah.id, ayahIndex);
                          setSelectedAyah(ayahIndex);
                        }}
                        className="ayah-marker"
                        data-bookmarked={isBookmarked ? "true" : "false"}
                        aria-label={`آية ${ayahIndex}`}
                        title={isBookmarked ? "إزالة علامة" : "إضافة علامة"}
                      >
                        ﴿{toArabicIndic(ayahIndex)}﴾
                      </button>
                    ) : null}
                    {" "}
                  </span>
                );
              })}
            </div>

            <div className="mt-4 text-xs opacity-65">
              اضغط على الآية لتحديث موضع القراءة، واضغط على رقم الآية لإضافة علامة.
            </div>

            {selectedAyah ? (
              <div className="mt-5 glass rounded-3xl p-4 border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">ملاحظة للآية ﴿{toArabicIndic(selectedAyah)}﴾</div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => doCopyText(selectedAyahText)}>
                      نسخ الآية
                    </Button>
                    <Button variant="secondary" onClick={doShareSelectedAyahImage}>
                      مشاركة كصورة
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (!surah) return;
                        const clean = (noteDraft ?? "").trim();
                        if (clean) {
                          setQuranNote(surah.id, selectedAyah, clean);
                          toast.success("تم حفظ الملاحظة");
                        } else {
                          clearQuranNote(surah.id, selectedAyah);
                          toast.success("تم حذف الملاحظة");
                        }
                      }}
                    >
                      حفظ
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (!surah) return;
                        clearQuranNote(surah.id, selectedAyah);
                        setNoteDraft("");
                        toast.success("تم حذف الملاحظة");
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="اكتب ملاحظة قصيرة…"
                  className="mt-3 w-full min-h-[96px] rounded-3xl bg-white/6 border border-white/10 p-4 text-sm leading-7 outline-none focus:border-white/20"
                />
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
