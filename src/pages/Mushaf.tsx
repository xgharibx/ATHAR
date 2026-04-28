import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Bookmark, Globe, MoreVertical, Play, Pause,
  ChevronDown, Copy, Share2, VolumeX, Volume2, X, Pencil,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
} from "lucide-react";
import { useQuranDB } from "@/data/useQuranDB";
import { useQuranPageMap } from "@/data/useQuranPageMap";
import { useNoorStore } from "@/store/noorStore";
import { getSurahJuz, toArabicNumeral } from "@/lib/quranMeta";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────
interface PageItem {
  surahId: number;
  surahName: string;
  originalAyah: number;
  displayAyah: number; // 0 = basmalah header (not numbered)
  text: string;
  isBasmalahHeader: boolean;
}

interface SurahGroup {
  surahId: number;
  surahName: string;
  startsHere: boolean;
  hasBasmalah: boolean;
  items: PageItem[];
}

// ── Constants ──────────────────────────────────────────────────
const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const BASMALAH_VARIANTS = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "بِسْمِ ٱللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "بسم الله الرحمن الرحيم",
];
// Pre-normalized variants for robust comparison regardless of diacritic combining order
const BASMALAH_NFC = BASMALAH_VARIANTS.map((v) => v.normalize("NFC"));

const HL_COLORS = {
  gold:  { swatch: "rgba(251,191,36,0.85)",  bg: "rgba(251,191,36,0.22)"  },
  green: { swatch: "rgba(52,211,153,0.85)",  bg: "rgba(52,211,153,0.18)" },
  blue:  { swatch: "rgba(96,165,250,0.85)",  bg: "rgba(96,165,250,0.18)" },
  red:   { swatch: "rgba(248,113,113,0.85)", bg: "rgba(248,113,113,0.18)" },
} as const;
type HlColor = keyof typeof HL_COLORS;

// ── Page index builder ────────────────────────────────────────
function buildPageIndex(
  quranDB: { id: number; name: string; ayahs: string[] }[],
  pageMap: Record<string, number>,
): Map<number, PageItem[]> {
  const result = new Map<number, PageItem[]>();
  for (const surah of quranDB) {
    // Normalize to NFC so combining diacritics are in canonical order before any comparison
    const raw = surah.ayahs.map((a) => (a ?? "").replace(/^\uFEFF/, "").normalize("NFC").trim());
    const firstText = raw[0] ?? "";

    // Al-Fatiha (id=1): entire first ayah IS just the basmalah — skip as header placeholder
    const firstIsBasmalah = firstText.length > 0 && (
      surah.id === 1 || BASMALAH_NFC.some((v) => firstText === v)
    );
    // All other surahs (except 9): basmalah is prepended to the first ayah's text
    const firstHasBasmalahPrefix = !firstIsBasmalah && firstText.length > 0 &&
      BASMALAH_NFC.some((v) => firstText.startsWith(v));
    const hasBasmalahHeader = surah.id !== 9 && (firstIsBasmalah || firstHasBasmalahPrefix);

    for (let i = 0; i < raw.length; i++) {
      const originalAyah = i + 1;
      const pageNum = Number(pageMap[`${surah.id}:${originalAyah}`]);
      if (!Number.isFinite(pageNum) || pageNum < 1) continue;

      // Only Fatiha's first ayah is a pure basmalah placeholder (gets filtered out)
      // For Fatiha (id=1): the basmalah IS ayah 1 — show it numbered, don't skip it
      // For other surahs where first ayah == pure basmalah: skip it (show as header only)
      const isBasmalahHeader = firstIsBasmalah && i === 0 && surah.id !== 1;
      // Fatiha: keep original ayah numbering (1=basmalah, 2=الحمد..., 7=وَلَا الضَّالِّينَ)
      // Other surahs with pure-basmalah first ayah: shift numbering (basmalah=0/filtered, rest -1)
      const displayAyah = (firstIsBasmalah && surah.id !== 1) ? (isBasmalahHeader ? 0 : originalAyah - 1) : originalAyah;

      // Strip basmalah prefix from the first ayah text of non-Fatiha surahs
      let text = raw[i] ?? "";
      if (i === 0 && firstHasBasmalahPrefix) {
        for (const v of BASMALAH_NFC) {
          if (text.startsWith(v)) { text = text.slice(v.length).trim(); break; }
        }
      }

      if (!result.has(pageNum)) result.set(pageNum, []);
      result.get(pageNum)!.push({
        surahId: surah.id,
        surahName: surah.name,
        originalAyah,
        displayAyah,
        text,
        isBasmalahHeader,
      });
    }
  }
  for (const [, items] of result) {
    items.sort((a, b) => a.surahId - b.surahId || a.originalAyah - b.originalAyah);
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────
export function MushafPage() {
  const navigate = useNavigate();
  const { page: pageParam } = useParams<{ page?: string }>();
  const [sp] = useSearchParams();

  const { data: quranDB, isLoading: dbLoading } = useQuranDB();
  const { data: pmData, isLoading: pmLoading } = useQuranPageMap();

  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const bookmarks = useNoorStore((s) => s.quranBookmarks);
  const toggleBookmark = useNoorStore((s) => s.toggleQuranBookmark);
  const setLastRead = useNoorStore((s) => s.setQuranLastRead);
  const highlights = useNoorStore((s) => s.quranHighlights);
  const setQuranHighlight = useNoorStore((s) => s.setQuranHighlight);
  const notes = useNoorStore((s) => s.quranNotes);
  const setQuranNote = useNoorStore((s) => s.setQuranNote);
  const clearQuranNote = useNoorStore((s) => s.clearQuranNote);
  const recordQuranRead = useNoorStore((s) => s.recordQuranRead);

  const totalPages = pmData?.totalPages ?? 604;
  const pageMap = pmData?.map ?? {};

  // Build page index (one-time, memoized)
  const pageIndex = React.useMemo(() => {
    if (!quranDB || Object.keys(pageMap).length === 0) return new Map<number, PageItem[]>();
    return buildPageIndex(quranDB, pageMap);
  }, [quranDB, pageMap]);

  // Current page state
  const surahParam = Number(sp.get("surah"));
  const rawPage = Number(pageParam) || 0;

  const [currentPage, setCurrentPage] = React.useState<number>(() =>
    rawPage >= 1 ? Math.min(rawPage, 604) : (prefs.quranMushafPage ?? 1)
  );

  // Handle ?surah= param: jump to first page of that surah
  const didJumpRef = React.useRef(false);
  React.useEffect(() => {
    if (!surahParam || Object.keys(pageMap).length === 0 || didJumpRef.current) return;
    didJumpRef.current = true;
    const p = Number(pageMap[`${surahParam}:1`]) || Number(pageMap[`${surahParam}:2`]) || 1;
    setCurrentPage(p);
    navigate(`/mushaf/${p}`, { replace: true });
  }, [surahParam, pageMap, navigate]);

  // Sync URL param when navigating via browser back/forward
  React.useEffect(() => {
    if (rawPage >= 1 && rawPage !== currentPage) setCurrentPage(Math.min(rawPage, 604));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPage]);

  const goPage = React.useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setCurrentPage(clamped);
    setPrefs({ quranMushafPage: clamped });
    navigate(`/mushaf/${clamped}`, { replace: true });
  }, [navigate, setPrefs, totalPages]);

  // Page items
  const pageItems = pageIndex.get(currentPage) ?? [];

  // Group by surah
  const surahGroups = React.useMemo((): SurahGroup[] => {
    const groups: SurahGroup[] = [];
    let cur: SurahGroup | null = null;
    for (const item of pageItems) {
      if (!cur || cur.surahId !== item.surahId) {
        cur = {
          surahId: item.surahId,
          surahName: item.surahName,
          startsHere: item.originalAyah === 1,
          hasBasmalah: item.isBasmalahHeader,
          items: [item],
        };
        groups.push(cur);
      } else {
        cur.items.push(item);
        if (item.isBasmalahHeader) cur.hasBasmalah = true;
        if (item.originalAyah === 1) cur.startsHere = true;
      }
    }
    return groups;
  }, [pageItems]);

  const firstItem = pageItems[0];
  const lastItem = pageItems[pageItems.length - 1];
  const pageJuz = firstItem ? getSurahJuz(firstItem.surahId) : 1;
  const pageSurahName = lastItem?.surahName ?? "";
  const pageSurahEnglish = React.useMemo(() => {
    if (!quranDB || !lastItem) return "";
    return quranDB.find((s) => s.id === lastItem.surahId)?.englishName ?? "";
  }, [quranDB, lastItem]);

  // Chrome auto-hide
  const [showChrome, setShowChrome] = React.useState(true);
  const chromeTimer = React.useRef<number | null>(null);
  const flashChrome = React.useCallback(() => {
    setShowChrome(true);
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = window.setTimeout(() => setShowChrome(false), 4000);
  }, []);
  React.useEffect(() => { flashChrome(); }, [currentPage, flashChrome]);
  React.useEffect(() => () => { if (chromeTimer.current) clearTimeout(chromeTimer.current); }, []);

  // Selected ayah
  const [selectedItem, setSelectedItem] = React.useState<PageItem | null>(null);
  const handleAyahTap = React.useCallback((e: React.MouseEvent, item: PageItem) => {
    e.stopPropagation();
    if (item.isBasmalahHeader || item.displayAyah === 0) return;
    setSelectedItem((prev) =>
      prev?.surahId === item.surahId && prev?.originalAyah === item.originalAyah ? null : item
    );
    setLastRead(item.surahId, item.displayAyah);
    recordQuranRead(1);
    flashChrome();
  }, [flashChrome, recordQuranRead, setLastRead]);

  // Note sheet
  const [noteSheetOpen, setNoteSheetOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");
  React.useEffect(() => {
    if (!selectedItem) { setNoteSheetOpen(false); return; }
    const key = `${selectedItem.surahId}:${selectedItem.displayAyah}`;
    setNoteDraft(notes[key] ?? "");
  }, [notes, selectedItem]);

  // Audio
  const [playingKey, setPlayingKey] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [audioBarVisible, setAudioBarVisible] = React.useState(true);

  const playAyah = React.useCallback((surahId: number, originalAyah: number, displayAyah: number) => {
    const key = `${surahId}:${displayAyah}`;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingKey === key) { setPlayingKey(null); return; }
    const s = String(surahId).padStart(3, "0");
    const a = String(originalAyah).padStart(3, "0");
    const reciter = prefs.quranReciter ?? "Alafasy_128kbps";
    const audio = new Audio(`https://everyayah.com/data/${reciter}/${s}${a}.mp3`);
    audioRef.current = audio;
    setPlayingKey(key);
    audio.play().catch(() => toast.error("تعذر تشغيل التلاوة"));
    audio.onended = () => setPlayingKey(null);
  }, [playingKey, prefs.quranReciter]);

  React.useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }, []);

  // Page jump
  const [showJump, setShowJump] = React.useState(false);
  const [jumpInput, setJumpInput] = React.useState("");

  // Font scale: 0.7 – 1.6 in 0.1 steps
  const [fontScale, setFontScale] = React.useState<number>(() => prefs.mushafFontScale ?? 0.78);
  const bumpFont = React.useCallback((delta: number) => {
    setFontScale((prev) => {
      const next = Math.round(Math.max(0.7, Math.min(1.6, prev + delta)) * 10) / 10;
      setPrefs({ mushafFontScale: next });
      return next;
    });
  }, [setPrefs]);

  const doJump = () => {
    const p = Number(jumpInput);
    if (p >= 1 && p <= 604) { goPage(p); setShowJump(false); setJumpInput(""); }
    else toast.error("رقم صفحة غير صالح (1–604)");
  };

  // Touch swipe (horizontal only)
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dy = Math.abs((e.changedTouches[0]?.clientY ?? 0) - touchStartY.current);
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 55 || dy > Math.abs(dx) * 0.8) return;
    if (dx > 0) goPage(currentPage - 1);
    else goPage(currentPage + 1);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPage(currentPage + 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goPage(currentPage - 1); }
      else if (e.key === "Escape") {
        if (showJump) { setShowJump(false); return; }
        if (noteSheetOpen) { setNoteSheetOpen(false); return; }
        if (selectedItem) { setSelectedItem(null); return; }
        navigate("/quran");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, goPage, navigate, noteSheetOpen, selectedItem, showJump]);

  // Share selected ayah
  const doShare = async () => {
    if (!selectedItem) return;
    try {
      const verse = `${selectedItem.text} ﴿${toArabicNumeral(selectedItem.displayAyah)}﴾`;
      const blob = await renderDhikrPosterBlob({
        text: verse,
        subtitle: `${selectedItem.surahName} • ${selectedItem.surahId}:${selectedItem.displayAyah}`,
        footerAppName: "ATHAR • أثر",
        footerUrl: "xgharibx.github.io/ATHAR",
      });
      const file = new File([blob], `athar-${selectedItem.surahId}-${selectedItem.displayAyah}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { toast.error("تعذر المشاركة"); }
  };

  const doCopy = async () => {
    if (!selectedItem) return;
    try {
      await navigator.clipboard.writeText(
        `${selectedItem.text} ﴿${toArabicNumeral(selectedItem.displayAyah)}﴾\n(${selectedItem.surahName} ${selectedItem.surahId}:${selectedItem.displayAyah})`
      );
      toast.success("تم النسخ");
    } catch { toast.error("تعذر النسخ"); }
  };

  // ── Loading ────────────────────────────────────────────────
  if (dbLoading || pmLoading) {
    return (
      <div className="mushaf-reader" dir="rtl">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#2F4F37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-sm opacity-60">تحميل المصحف…</div>
          </div>
        </div>
      </div>
    );
  }

  const selKey = selectedItem ? `${selectedItem.surahId}:${selectedItem.displayAyah}` : "";
  const isSelBookmarked = selectedItem ? !!bookmarks[selKey] : false;
  const selHL = (selectedItem ? (highlights[selKey] ?? null) : null) as HlColor | null;

  return (
    <div
      className="mushaf-reader"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Top chrome bar ───────────────────────────────── */}
      <div
        className={`mushaf-chrome-top${showChrome || !!selectedItem ? "" : " chrome-hidden"}`}
        onClick={flashChrome}
      >
        <button
          className="mushaf-chrome-icon-btn"
          onClick={(e) => { e.stopPropagation(); navigate("/quran"); }}
          aria-label="رجوع إلى القرآن"
        >
          <ArrowRight size={18} />
        </button>
        <div className="mushaf-chrome-info" onClick={(e) => e.stopPropagation()}>
          <div className="mushaf-chrome-surah-name">{pageSurahEnglish || pageSurahName}</div>
          <div className="mushaf-chrome-meta">Page {currentPage}, Juz&apos; {pageJuz}</div>
        </div>
        <a
          className="mushaf-chrome-icon-btn"
          href={`https://quran.com/ar/${lastItem?.surahId ?? 1}`}
          target="_blank"
          rel="noopener noreferrer"
          title="تفسير"
          onClick={(e) => e.stopPropagation()}
        >
          <Globe size={17} />
        </a>
        <button
          className="mushaf-chrome-icon-btn"
          title="تصغير الخط"
          aria-label="تصغير"
          onClick={(e) => { e.stopPropagation(); bumpFont(-0.1); }}
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="mushaf-chrome-icon-btn"
          title="تكبير الخط"
          aria-label="تكبير"
          onClick={(e) => { e.stopPropagation(); bumpFont(0.1); }}
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="mushaf-chrome-icon-btn"
          title="انتقال للصفحة"
          aria-label="انتقال"
          onClick={(e) => { e.stopPropagation(); setShowJump(true); }}
        >
          <MoreVertical size={17} />
        </button>
      </div>

      {/* ── Scrollable page area ─────────────────────────── */}
      <div
        className="mushaf-page-area"
        onClick={() => { setSelectedItem(null); flashChrome(); }}
      >
        <div className="mushaf-page-content" dir="rtl" style={{ "--mushaf-font-scale": fontScale } as React.CSSProperties}>
          {/* Always-visible tiny strip */}
          <div className="mushaf-page-info-strip">
            <span>{pageSurahName}</span>
            <span>الجزء {toArabicNumeral(pageJuz)}</span>
          </div>

          {/* Surah groups — fills available space and centers content */}
          <div className="mushaf-page-main">
          {surahGroups.map((group) => (
            <React.Fragment key={group.surahId}>
              {group.startsHere && (
                <div className="mushaf-surah-frame">
                  <div className="mushaf-surah-frame-corner tl" aria-hidden="true" />
                  <div className="mushaf-surah-frame-corner tr" aria-hidden="true" />
                  <div className="mushaf-surah-frame-corner bl" aria-hidden="true" />
                  <div className="mushaf-surah-frame-corner br" aria-hidden="true" />
                  <span className="mushaf-surah-frame-name">{group.surahName}</span>
                </div>
              )}
              {group.startsHere && group.surahId !== 9 && group.surahId !== 1 && (
                <div className="mushaf-basmalah-line">{BASMALAH}</div>
              )}
              <div className="mushaf-text-block">
                {group.items
                  .filter((item) => !item.isBasmalahHeader)
                  .map((item) => {
                    const k = `${item.surahId}:${item.displayAyah}`;
                    const isSel = selectedItem?.surahId === item.surahId && selectedItem?.originalAyah === item.originalAyah;
                    const hl = (highlights[k] ?? null) as HlColor | null;
                    const isBookmarked = !!bookmarks[k];
                    return (
                      <span
                        key={k}
                        className={`mushaf-ayah-span${isSel ? " selected" : ""}${hl ? ` hl-${hl}` : ""}`}
                        style={hl && !isSel ? { background: HL_COLORS[hl].bg } : undefined}
                        onClick={(e) => handleAyahTap(e, item)}
                      >
                        {item.text}
                        {"\u200F"}
                        <span className={`mushaf-ayah-num${isBookmarked ? " bookmarked" : ""}`}>
                          ﴿{toArabicNumeral(item.displayAyah)}﴾
                        </span>
                        {" "}
                      </span>
                    );
                  })}
              </div>
            </React.Fragment>
          ))}
          </div>

          {/* Page number */}
          <div className={`mushaf-page-num ${currentPage % 2 === 0 ? "left" : "right"}`}>
            {currentPage}
          </div>

          {/* Bottom page nav */}
          <div className="mushaf-page-nav">
            <button
              className="mushaf-page-nav-btn"
              onClick={(e) => { e.stopPropagation(); goPage(currentPage + 1); }}
              disabled={currentPage >= totalPages}
              aria-label="الصفحة التالية"
            >
              <ChevronLeft size={15} />
              <span>التالية</span>
            </button>
            <span className="mushaf-page-nav-num">{currentPage} / {totalPages}</span>
            <button
              className="mushaf-page-nav-btn"
              onClick={(e) => { e.stopPropagation(); goPage(currentPage - 1); }}
              disabled={currentPage <= 1}
              aria-label="الصفحة السابقة"
            >
              <span>السابقة</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom action bar (ayah selected) ────────────── */}
      {selectedItem && (
        <div className="mushaf-action-bar" onClick={(e) => e.stopPropagation()}>
          <button className="mushaf-action-btn" onClick={doCopy} title="نسخ الآية">
            <Copy size={18} />
            <span>نسخ</span>
          </button>
          <button
            className={`mushaf-action-btn${isSelBookmarked ? " active" : ""}`}
            onClick={() => {
              toggleBookmark(selectedItem.surahId, selectedItem.displayAyah);
              toast.success(isSelBookmarked ? "أُزيلت العلامة" : "✓ تم الحفظ");
            }}
            title="علامة"
          >
            <Bookmark size={18} fill={isSelBookmarked ? "currentColor" : "none"} />
            <span>علامة</span>
          </button>
          <button
            className={`mushaf-action-btn${playingKey === selKey ? " active" : ""}`}
            onClick={() => playAyah(selectedItem.surahId, selectedItem.originalAyah, selectedItem.displayAyah)}
            title="استماع"
          >
            {playingKey === selKey ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>تلاوة</span>
          </button>
          {/* Highlight swatches */}
          <div className="mushaf-action-btn" style={{ gap: "0.2rem" }}>
            <div className="flex gap-1">
              {(Object.keys(HL_COLORS) as HlColor[]).map((c) => (
                <button
                  key={c}
                  className={`mushaf-hl-swatch${selHL === c ? " active" : ""}`}
                  style={{ background: HL_COLORS[c].swatch }}
                  onClick={(e) => { e.stopPropagation(); setQuranHighlight(selectedItem.surahId, selectedItem.displayAyah, selHL === c ? null : c); }}
                  aria-label={c}
                />
              ))}
            </div>
            <span>تظليل</span>
          </div>
          <button
            className={`mushaf-action-btn${notes[selKey] ? " active" : ""}`}
            onClick={(e) => { e.stopPropagation(); setNoteSheetOpen(true); }}
            title="ملاحظة"
          >
            <Pencil size={18} />
            <span>ملاحظة</span>
          </button>
          <button className="mushaf-action-btn" onClick={doShare} title="مشاركة">
            <Share2 size={18} />
            <span>إرسال</span>
          </button>
          <a
            className="mushaf-action-btn"
            href={`https://quran.ksu.edu.sa/tafseer/katheer/sura${selectedItem.surahId}-aya${selectedItem.displayAyah}.html#katheer`}
            target="_blank"
            rel="noopener noreferrer"
            title="تفسير"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe size={18} />
            <span>تفسير</span>
          </a>
          <button
            className="mushaf-action-btn"
            style={{ opacity: 0.55 }}
            onClick={() => setSelectedItem(null)}
            title="إغلاق"
          >
            <X size={18} />
            <span>إغلاق</span>
          </button>
        </div>
      )}

      {/* ── Audio player bar ──────────────────────────────── */}
      {!selectedItem && audioBarVisible && (
        <div className="mushaf-audio-bar" onClick={(e) => e.stopPropagation()}>
          <button
            className="mushaf-audio-play-btn"
            onClick={() => {
              if (playingKey && audioRef.current) { audioRef.current.pause(); setPlayingKey(null); }
            }}
            aria-label="إيقاف التلاوة"
          >
            {playingKey ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <div className="mushaf-audio-reciter">
            {playingKey
              ? `▶ يُشغَّل · آية ${playingKey.split(":")[1] ?? ""}`
              : (prefs.quranReciter ?? "Alafasy_128kbps").replace(/_128kbps|_64kbps/g, "").replace(/_/g, " ")}
          </div>
          <button
            className="mushaf-audio-toggle"
            onClick={() => setAudioBarVisible(false)}
            aria-label="إخفاء"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      )}

      {/* Audio bar hidden → show button near page nav */}
      {!selectedItem && !audioBarVisible && (
        <button
          className="mushaf-audio-show-btn"
          onClick={(e) => { e.stopPropagation(); setAudioBarVisible(true); }}
          aria-label="إظهار المشغل"
        >
          <Volume2 size={14} />
        </button>
      )}

      {/* ── Page jump sheet ───────────────────────────────── */}
      {showJump && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowJump(false)} />
          <div className="mushaf-jump-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="mushaf-sheet-title">الانتقال إلى صفحة</div>
            <div className="flex gap-2 mt-3">
              <input
                type="number"
                min={1}
                max={604}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder="1 – 604"
                autoFocus
                className="mushaf-input flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") doJump(); }}
              />
              <button className="mushaf-btn-primary" onClick={doJump}>انتقال</button>
            </div>
            <div className="mushaf-sheet-hint">
              الصفحة الحالية: {currentPage} · المجموع: {totalPages}
            </div>
          </div>
        </>
      )}

      {/* ── Note sheet ────────────────────────────────────── */}
      {noteSheetOpen && selectedItem && (
        <>
          <div className="mushaf-overlay" onClick={() => setNoteSheetOpen(false)} />
          <div className="mushaf-note-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-3">
              <span className="mushaf-sheet-title">
                ملاحظة للآية ﴿{toArabicNumeral(selectedItem.displayAyah)}﴾
              </span>
              <button
                className="mushaf-icon-close"
                onClick={() => setNoteSheetOpen(false)}
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="اكتب ملاحظة…"
              rows={3}
              autoFocus
              className="mushaf-textarea"
            />
            <div className="flex gap-2 mt-3">
              <button
                className="mushaf-btn-primary flex-1"
                onClick={() => {
                  const clean = noteDraft.trim();
                  if (clean) { setQuranNote(selectedItem.surahId, selectedItem.displayAyah, clean); toast.success("تم الحفظ"); }
                  else clearQuranNote(selectedItem.surahId, selectedItem.displayAyah);
                  setNoteSheetOpen(false);
                }}
              >
                حفظ
              </button>
              {notes[selKey] && (
                <button
                  className="mushaf-btn-secondary"
                  onClick={() => {
                    clearQuranNote(selectedItem.surahId, selectedItem.displayAyah);
                    setNoteDraft("");
                    setNoteSheetOpen(false);
                    toast.success("تم الحذف");
                  }}
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
