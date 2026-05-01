import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Copy, Shuffle, ChevronsRight, ChevronRight, ChevronLeft, ChevronsLeft, Bookmark, Share2, X as XIcon, Maximize2, Minimize2, Pencil, Volume2, VolumeX, Eye, EyeOff, Timer, Search, ChevronDown, Repeat, SkipForward, Languages, HelpCircle } from "lucide-react";
import { stripDiacritics } from "@/lib/arabic";
import { getSurahRevelationLabel, getSurahJuz, SURAH_REVELATION } from "@/lib/quranMeta";
import type { QuranSurah } from "@/data/quranTypes";

import { useQuranDB } from "@/data/useQuranDB";
import { useQuranPageMap } from "@/data/useQuranPageMap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
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

// Pre-normalized for robust comparison (Quran data uses non-canonical diacritic ordering)
const BASMALAH_NFC = BASMALAH_VARIANTS.map((v) => v.normalize("NFC"));

function stripBasmalahPrefixIfPresent(text: string) {
  const t = (text ?? "").replace(/^\uFEFF/, "").normalize("NFC").trim();
  if (!t) return t;
  for (const v of BASMALAH_NFC) {
    if (t.startsWith(v)) return t.slice(v.length).trim();
  }
  return t;
}

const HIGHLIGHT_COLORS = {
  gold:  { swatch: "rgba(251,191,36,0.85)",  bg: "rgba(251,191,36,0.16)",  label: "ذهبي"  },
  green: { swatch: "rgba(52,211,153,0.85)",  bg: "rgba(52,211,153,0.15)",  label: "أخضر"  },
  blue:  { swatch: "rgba(96,165,250,0.85)",  bg: "rgba(96,165,250,0.15)",  label: "أزرق"  },
  red:   { swatch: "rgba(248,113,113,0.85)", bg: "rgba(248,113,113,0.15)", label: "أحمر"  },
  pink:  { swatch: "rgba(249,168,212,0.85)", bg: "rgba(249,168,212,0.15)", label: "وردي"  },
} as const;
type HighlightColor = keyof typeof HIGHLIGHT_COLORS;

// Q18: Sujood At-Tilawa ayah positions — key: `${surahId}:${displayAyah}`
const SAJDA_AYAHS = new Set([
  "7:206","13:15","16:50","17:109","19:58",
  "22:18","22:77","25:60","27:26","32:15",
  "38:24","41:38","53:62","84:21","96:19",
]);

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
  const highlights = useNoorStore((s) => s.quranHighlights);
  const setQuranHighlight = useNoorStore((s) => s.setQuranHighlight);
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const recordQuranRead = useNoorStore((s) => s.recordQuranRead);

  const surahId = Number(params.id);
  const focusAyah = Number(sp.get("a") ?? "0");
  const focusOriginalAyah = Number(sp.get("oa") ?? "0");
  const pageModeParam = sp.get("pm");

  const pageRef = React.useRef<HTMLDivElement>(null);

  const [selectedAyah, setSelectedAyah] = React.useState<number | null>(null);
  const [noteDraft, setNoteDraft] = React.useState<string>("");

  // De15: Right-click context menu
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number; surahId: number; ayahIndex: number } | null>(null);
  React.useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("touchstart", close);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("touchstart", close); };
  }, [ctxMenu]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [jumpAyah, setJumpAyah] = React.useState("");
  const [pageMode, setPageMode] = React.useState<"ayah" | "mushaf">("ayah");
  const [currentMushafPage, setCurrentMushafPage] = React.useState<number | null>(null);
  const [jumpMushafPage, setJumpMushafPage] = React.useState("");
  const [focusMode, setFocusMode] = React.useState(false);

  // Tooltip & action sheet state
  const [tooltipPos, setTooltipPos] = React.useState<{ x: number; y: number; below: boolean } | null>(null);
  const [noteSheetOpen, setNoteSheetOpen] = React.useState(false);

  // Fullscreen chrome auto-hide
  const [fsChrome, setFsChrome] = React.useState(true);
  const fsChromeTimer = React.useRef<number | null>(null);

  // Touch swipe ref
  const touchStartXRef = React.useRef<number | null>(null);

  // Audio playback
  const [playingAyah, setPlayingAyah] = React.useState<number | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Memorization mode
  const [memMode, setMemMode] = React.useState(false);
  const [revealedAyahs, setRevealedAyahs] = React.useState<Set<number>>(new Set());

  // Session timer
  const [sessionSeconds, setSessionSeconds] = React.useState(0);
  const sessionTimerRef = React.useRef<number | null>(null);

  // Completion ref (fire once per surah)
  const completionFiredRef = React.useRef(false);

  // In-surah text search
  const [inSurahSearch, setInSurahSearch] = React.useState("");
  const [showInSurahSearch, setShowInSurahSearch] = React.useState(false);

  // Autoscroll teleprompter (FS mode)
  const [autoScroll, setAutoScroll] = React.useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = React.useState(2); // 1–5
  const rafRef = React.useRef<number | null>(null);

  // Surah info panel
  const [showSurahInfo, setShowSurahInfo] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  // Q21: Keyboard shortcuts panel
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  // Q3: Inline translation
  const [showTranslation, setShowTranslation] = React.useState(false);
  const [translationData, setTranslationData] = React.useState<string[]>([]);
  const [translationLoading, setTranslationLoading] = React.useState(false);

  // Q7 / Q8 / Q4: Enhanced audio controls
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [autoAdvance, setAutoAdvance] = React.useState(false);
  const [loopAyah, setLoopAyah] = React.useState(false);
  const [loopCount, setLoopCount] = React.useState(3); // -1 = ∞

  // Q5: Range audio loop
  const [loopRange, setLoopRange] = React.useState(false);
  const [loopRangeStart, setLoopRangeStart] = React.useState(1);
  const [loopRangeEnd, setLoopRangeEnd] = React.useState(1);

  // Q10: Full surah translation view
  const [translationViewAll, setTranslationViewAll] = React.useState(false);

  // Q11: Inline tafsir sheet
  const [tafsirSheetAyah, setTafsirSheetAyah] = React.useState<number | null>(null);

  // Audio play-state ref (avoids stale closures in onended callbacks)
  const audioPlayRef = React.useRef<{
    active: boolean; loop: boolean; loopRemaining: number;
    advance: boolean; speed: number; totalAyahs: number; pageSize: number;
    useRange: boolean; rangeStart: number; rangeEnd: number;
  }>({ active: false, loop: false, loopRemaining: 0, advance: false, speed: 1, totalAyahs: 0, pageSize: 12, useRange: false, rangeStart: 1, rangeEnd: 1 });

  // Ref to the recursive core audio player (allows onended to call it without stale closure)
  const playAyahCoreRef = React.useRef<((sId: number, aNum: number) => void) | null>(null);

  // Immersive focus: hide nav / header while reading
  React.useEffect(() => {
    if (focusMode) document.body.classList.add("quran-focus-mode");
    else document.body.classList.remove("quran-focus-mode");
    return () => document.body.classList.remove("quran-focus-mode");
  }, [focusMode]);

  // Fullscreen chrome auto-hide
  const showFsChrome = React.useCallback(() => {
    setFsChrome(true);
    if (fsChromeTimer.current) clearTimeout(fsChromeTimer.current);
    fsChromeTimer.current = window.setTimeout(() => setFsChrome(false), 3500);
  }, []);

  React.useEffect(() => {
    if (focusMode) { showFsChrome(); }
    else {
      setFsChrome(true);
      if (fsChromeTimer.current) clearTimeout(fsChromeTimer.current);
    }
    return () => { if (fsChromeTimer.current) clearTimeout(fsChromeTimer.current); };
  }, [focusMode, showFsChrome]);

  // Sync tooltip + note sheet when selectedAyah clears
  React.useEffect(() => {
    if (selectedAyah === null) {
      setTooltipPos(null);
      setNoteSheetOpen(false);
    }
  }, [selectedAyah]);

  const surah = React.useMemo(() => {
    if (!data || !Number.isFinite(surahId)) return null;
    return data.find((s) => s.id === surahId) ?? null;
  }, [data, surahId]);

  const prevSurahName = React.useMemo(() => {
    if (!data || surahId <= 1) return null;
    return data.find((s) => s.id === surahId - 1)?.name ?? null;
  }, [data, surahId]);

  const nextSurahName = React.useMemo(() => {
    if (!data || surahId >= 114) return null;
    return data.find((s) => s.id === surahId + 1)?.name ?? null;
  }, [data, surahId]);

  const displayAyahs = React.useMemo(() => {
    if (!surah) return [] as Array<{ text: string; displayAyah: number; originalAyah: number }>;

    // Normalize to NFC so combining diacritics are in canonical order before comparison
    const raw = surah.ayahs.map((a) => (a ?? "").replace(/^\uFEFF/, "").normalize("NFC").trim());

    // Al-Fatiha (id=1) always has the basmalah as its first ayah regardless of encoding;
    // all other surahs have it prepended to ayah 1 text (startsWith check)
    const firstIsBasmalah = raw.length > 0 && (
      surah.id === 1 || BASMALAH_NFC.some((v) => raw[0] === v)
    );
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

  // Filtered ayahs for in-surah search (normal page mode only)
  const filteredPageAyahs = React.useMemo(() => {
    if (!inSurahSearch.trim()) return pageAyahs;
    const q = stripDiacritics(inSurahSearch.trim());
    return pageAyahs.filter((a) => stripDiacritics(a.text).includes(q));
  }, [pageAyahs, inSurahSearch]);

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

  // Session timer + audio cleanup on unmount
  React.useEffect(() => {
    sessionTimerRef.current = window.setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, []);

  // Autoscroll teleprompter RAF loop
  React.useEffect(() => {
    if (!autoScroll || !focusMode) {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    if (!pageRef.current) return;
    const speed = autoScrollSpeed * 0.35;
    const tick = () => {
      if (pageRef.current) pageRef.current.scrollTop += speed;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [autoScroll, autoScrollSpeed, focusMode]);

  // Record reads + completion detection
  React.useEffect(() => {
    if (!surah || selectedAyah === null) return;
    recordQuranRead(1);
    if (
      !completionFiredRef.current &&
      selectedAyah >= displayAyahs.length &&
      displayAyahs.length > 0
    ) {
      completionFiredRef.current = true;
      setTimeout(() => toast.success(`🎉 أكملت قراءة سورة ${surah.name}`), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAyah]);

  // Q3: Reset translation data when surah changes
  React.useEffect(() => {
    setTranslationData([]);
  }, [surahId]);

  // Q3/Q11: Fetch English translation on demand (for translation panel or tafsir sheet)
  React.useEffect(() => {
    if ((!showTranslation && tafsirSheetAyah === null) || !surah || translationData.length > 0) return;
    setTranslationLoading(true);
    fetch(`https://api.alquran.cloud/v1/surah/${surah.id}/en.sahih`)
      .then((r) => r.json())
      .then((json: { data?: { ayahs?: Array<{ numberInSurah: number; text: string }> } }) => {
        if (json?.data?.ayahs) {
          const arr: string[] = new Array((json.data.ayahs.at(-1)?.numberInSurah ?? 0) + 1).fill("");
          for (const a of json.data.ayahs) arr[a.numberInSurah] = a.text;
          setTranslationData(arr);
        }
      })
      .catch(() => toast.error("تعذر تحميل الترجمة"))
      .finally(() => setTranslationLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTranslation, tafsirSheetAyah, surah?.id]);

  // Q7/Q8/Q4: Keep playAyahCoreRef updated with latest reciter (avoids stale closure in onended)
  React.useEffect(() => {
    playAyahCoreRef.current = (sId: number, aNum: number) => {
      const pst = audioPlayRef.current;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const sStr = String(sId).padStart(3, "0");
      const aStr = String(aNum).padStart(3, "0");
      const reciter = prefs.quranReciter ?? "Alafasy_128kbps";
      const audio = new Audio(`https://everyayah.com/data/${reciter}/${sStr}${aStr}.mp3`);
      audio.playbackRate = pst.speed;
      audioRef.current = audio;
      setPlayingAyah(aNum);
      audio.play().catch(() => {
        toast.error("تعذر تشغيل التلاوة");
        pst.active = false;
        setPlayingAyah(null);
      });
      audio.onended = () => {
        if (!pst.active) { setPlayingAyah(null); return; }
        if (pst.loop) {
          const rem = pst.loopRemaining;
          if (rem === -1 || rem > 1) {
            if (rem > 0) pst.loopRemaining--;
            playAyahCoreRef.current?.(sId, aNum);
          } else {
            pst.active = false;
            setPlayingAyah(null);
          }
        } else if (pst.advance) {
          const rangeMax = pst.useRange ? pst.rangeEnd : pst.totalAyahs;
          const rangeMin = pst.useRange ? pst.rangeStart : 1;
          const next = aNum + 1;
          if (next <= rangeMax) {
            setSelectedAyah(next);
            const nextPage = Math.ceil(next / pst.pageSize);
            setCurrentPage(nextPage);
            playAyahCoreRef.current?.(sId, next);
          } else if (pst.useRange) {
            // Loop back to range start
            setSelectedAyah(rangeMin);
            const startPage = Math.ceil(rangeMin / pst.pageSize);
            setCurrentPage(startPage);
            playAyahCoreRef.current?.(sId, rangeMin);
          } else {
            pst.active = false;
            setPlayingAyah(null);
            toast.success("✅ انتهت التلاوة");
          }
        } else {
          pst.active = false;
          setPlayingAyah(null);
        }
      };
    };
  }, [prefs.quranReciter]);

  // Q7/Q8/Q4: Enhanced playAyah — supports speed, loop, auto-advance via playAyahCoreRef
  const playAyah = React.useCallback((sId: number, aNum: number) => {
    const pst = audioPlayRef.current;
    // Toggle off if same ayah
    if (pst.active && playingAyah === aNum) {
      pst.active = false;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPlayingAyah(null);
      return;
    }
    // Stop existing audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    // Set up play-state
    pst.active = true;
    pst.speed = playbackSpeed;
    pst.loop = loopAyah;
    pst.loopRemaining = loopAyah ? loopCount : 0;
    pst.advance = autoAdvance;
    pst.totalAyahs = displayAyahs.length;
    pst.pageSize = pageSize;
    pst.useRange = loopRange;
    pst.rangeStart = Math.max(1, loopRangeStart);
    pst.rangeEnd = Math.min(displayAyahs.length, Math.max(loopRangeStart, loopRangeEnd));
    playAyahCoreRef.current?.(sId, aNum);
  }, [playingAyah, playbackSpeed, loopAyah, loopCount, autoAdvance, displayAyahs.length, pageSize, loopRange, loopRangeStart, loopRangeEnd]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

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

  const notesInSurah = React.useMemo(() => {
    if (!surah) return 0;
    let c = 0;
    for (let i = 1; i <= displayAyahs.length; i++) {
      if (notes[`${surah.id}:${i}`]) c += 1;
    }
    return c;
  }, [displayAyahs.length, notes, surah]);

  const highlightsInSurah = React.useMemo(() => {
    if (!surah) return 0;
    let c = 0;
    for (let i = 1; i <= displayAyahs.length; i++) {
      if (highlights[`${surah.id}:${i}`]) c += 1;
    }
    return c;
  }, [displayAyahs.length, highlights, surah]);

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

  // Keyboard shortcuts: arrows=page nav, Space=play, m=memory, f=focus
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";

      if (e.key === "Escape") {
        if (noteSheetOpen) { setNoteSheetOpen(false); return; }
        if (selectedAyah !== null) { setSelectedAyah(null); return; }
        if (focusMode) { setFocusMode(false); setAutoScroll(false); }
        return;
      }
      if (isTyping) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goNextPage(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); goPrevPage(); return; }
      if (e.key === " " && selectedAyah !== null && surah) {
        e.preventDefault();
        playAyah(surah.id, selectedAyah);
        return;
      }
      if (e.key === "m") { setMemMode((v) => !v); setRevealedAyahs(new Set()); return; }
      if (e.key === "f") { setFocusMode((v) => !v); return; }
      if (e.key === "s") { setShowSettings((v) => !v); return; }
      if (e.key === "?") { setShowShortcuts((v) => !v); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusMode, goNextPage, goPrevPage, noteSheetOpen, playAyah, selectedAyah, surah]);

  // Ayah tap: capture viewport position and open tooltip
  const handleAyahClick = React.useCallback((e: React.MouseEvent, ayahIdx: number) => {
    e.stopPropagation();
    if (!surah) return;
    setLastRead(surah.id, ayahIdx);
    if (selectedAyah === ayahIdx) {
      setSelectedAyah(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rawX = rect.left + rect.width / 2;
    const x = Math.min(Math.max(rawX, 180), window.innerWidth - 180);
    const y = rect.top;
    setSelectedAyah(ayahIdx);
    setTooltipPos({ x, y, below: y < 70 });
    setNoteSheetOpen(false);
  }, [selectedAyah, surah, setLastRead]);

  // Clicks outside an ayah close the tooltip
  const handlePageClick = React.useCallback(() => {
    setSelectedAyah(null);
  }, []);

  // Swipe left/right to turn pages (Arabic convention: right = prev, left = next)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx > 0) goPrevPage();
    else goNextPage();
  };

  // ─── Ayah renderer (shared between normal + fullscreen views) ───────────────
  const renderAyah = (a: { text: string; displayAyah: number; originalAyah: number }, s: QuranSurah) => {
    const ayahIndex = a.displayAyah;
    const k = `${s.id}:${ayahIndex}`;
    const isBookmarked = !!bookmarks[k];
    const hasNote = !!notes[k];
    const isSelected = selectedAyah === ayahIndex;
    const hl = (highlights[k] ?? null) as HighlightColor | null;

    // Q18: Sujood At-Tilawa
    const isSajda = SAJDA_AYAHS.has(`${s.id}:${ayahIndex}`);
    // Q20: Last-read indicator
    const isLastRead = lastRead?.surahId === s.id && lastRead?.ayahIndex === ayahIndex;
    // Q17: Search match highlight
    const isSearchMatch = !!inSurahSearch.trim() &&
      stripDiacritics(a.text).includes(stripDiacritics(inSurahSearch.trim()));
    // Q16: Dim non-selected ayahs when one is active
    const isDimmed = !memMode && selectedAyah !== null && !isSelected;

    return (
      <span
        key={k}
        data-ayah={ayahIndex}
        className="inline"
        style={isDimmed ? { opacity: 0.28, transition: "opacity 0.2s" } : { transition: "opacity 0.2s" }}
        onContextMenu={(e) => { e.preventDefault(); const mx = Math.min(e.clientX, window.innerWidth - 200); const my = Math.min(e.clientY, window.innerHeight - 140); setCtxMenu({ x: mx, y: my, surahId: s.id, ayahIndex }); }}
      >
        <span
          className={[
            "inline rounded-sm cursor-pointer",
            isSelected ? "ayah-selected" : "",
            !isSelected && hl ? `ayah-hl-${hl}` : "",
            isSearchMatch && !isSelected ? "ayah-search-match" : "",
          ].filter(Boolean).join(" ")}
          style={isSelected && hl ? { background: HIGHLIGHT_COLORS[hl].bg } : undefined}
          onClick={
            memMode
              ? (e) => { e.stopPropagation(); setRevealedAyahs((prev) => { const n = new Set(prev); if (n.has(ayahIndex)) n.delete(ayahIndex); else n.add(ayahIndex); return n; }); }
              : (e) => handleAyahClick(e, ayahIndex)
          }
        >
          {memMode
            ? <span className={`quran-mem-span${revealedAyahs.has(ayahIndex) ? " revealed" : ""}`}>{a.text}</span>
            : a.text}{" "}
        </span>
        {!prefs.quranHideMarkers ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(s.id, ayahIndex);
              setLastRead(s.id, ayahIndex);
              const rect = e.currentTarget.getBoundingClientRect();
              const rawX = rect.left + rect.width / 2;
              setSelectedAyah(ayahIndex);
              setTooltipPos({
                x: Math.min(Math.max(rawX, 180), window.innerWidth - 180),
                y: rect.top,
                below: rect.top < 70,
              });
            }}
            className={`ayah-marker${isLastRead ? " ayah-marker--last-read" : ""}`}
            data-bookmarked={isBookmarked ? "true" : "false"}
            data-has-note={hasNote ? "true" : "false"}
            data-highlight={hl ?? undefined}
            aria-label={`آية ${ayahIndex}`}
            title={isBookmarked ? "إزالة علامة" : "إضافة علامة"}
          >
            ﴿{toArabicIndic(ayahIndex)}﴾
          </button>
        ) : null}
        {/* Q18: Sujood At-Tilawa badge */}
        {isSajda && (
          <span
            className="inline-flex items-center text-[9px] px-1 rounded-md border mx-0.5 align-middle select-none"
            style={{
              color: "rgba(167,243,208,0.9)",
              borderColor: "rgba(167,243,208,0.3)",
              background: "rgba(167,243,208,0.08)",
              lineHeight: "1.6",
            }}
            title="سجدة التلاوة"
          >
            سجدة
          </span>
        )}
        {" "}
      </span>
    );
  };

  // ─── Floating ayah tooltip ────────────────────────────────────────────────
  const renderTooltip = (s: QuranSurah) => {
    if (!tooltipPos || !selectedAyah) return null;
    const key = `${s.id}:${selectedAyah}`;
    const isBookmarked = !!bookmarks[key];
    const currentHL = (highlights[key] ?? null) as HighlightColor | null;
    const hasNote = !!notes[key];
    const { x, y, below } = tooltipPos;
    const top = below ? y + 38 : y - 50;

    return (
      <div
        className="ayah-tooltip-pill"
        style={{ left: x, top }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Copy */}
        <button className="ayah-tooltip-btn" onClick={() => doCopyText(selectedAyahText)} title="نسخ الآية">
          <Copy size={13} /><span className="hidden sm:inline">نسخ</span>
        </button>
        <div className="ayah-tooltip-sep" />
        {/* Audio */}
        <button
          className={`ayah-tooltip-btn ${playingAyah === selectedAyah ? "is-active" : ""}`}
          onClick={() => playAyah(s.id, selectedAyah)}
          title="استماع"
        >
          {playingAyah === selectedAyah ? <VolumeX size={13} /> : <Volume2 size={13} />}
          <span className="hidden sm:inline">{playingAyah === selectedAyah ? "إيقاف" : "استماع"}</span>
        </button>
        <div className="ayah-tooltip-sep" />
        {/* Bookmark */}
        <button
          className={`ayah-tooltip-btn ${isBookmarked ? "is-active" : ""}`}
          onClick={() => { toggleBookmark(s.id, selectedAyah); toast.success(isBookmarked ? "أُزيلت العلامة" : "تمت الإضافة"); }}
          title="علامة"
        >
          <Bookmark size={13} fill={isBookmarked ? "currentColor" : "none"} />
          <span className="hidden sm:inline">{isBookmarked ? "✓" : "علامة"}</span>
        </button>
        <div className="ayah-tooltip-sep" />
        {/* 4 color swatches inline */}
        {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((c) => (
          <button
            key={c}
            className="ayah-tooltip-btn"
            style={{ padding: "5px 4px" }}
            onClick={() => setQuranHighlight(s.id, selectedAyah, currentHL === c ? null : c)}
            title={HIGHLIGHT_COLORS[c].label}
          >
            <span
              className="block rounded-full w-[14px] h-[14px] flex-shrink-0 transition-all"
              style={{
                background: HIGHLIGHT_COLORS[c].swatch,
                boxShadow: currentHL === c ? "0 0 0 2px rgba(255,255,255,0.55)" : undefined,
                transform: currentHL === c ? "scale(1.18)" : undefined,
              }}
            />
          </button>
        ))}
        <div className="ayah-tooltip-sep" />
        {/* Note */}
        <button
          className={`ayah-tooltip-btn ${hasNote ? "is-active" : ""}`}
          onClick={(e) => { e.stopPropagation(); setNoteSheetOpen(true); showFsChrome(); }}
          title="ملاحظة"
        >
          <Pencil size={13} /><span className="hidden sm:inline">{hasNote ? "✓" : "ملاحظة"}</span>
        </button>
        <div className="ayah-tooltip-sep" />
        {/* Share */}
        <button className="ayah-tooltip-btn" onClick={doShareSelectedAyahImage} title="مشاركة">
          <Share2 size={13} /><span className="hidden sm:inline">إرسال</span>
        </button>
        <div className="ayah-tooltip-sep" />
        {/* Q11: Tafsir - opens inline sheet first, with external link inside */}
        <button
          className="ayah-tooltip-btn"
          title="تفسير الآية"
          onClick={(e) => { e.stopPropagation(); setTafsirSheetAyah(selectedAyah); setSelectedAyah(null); }}
        >
          <ArrowUpRight size={13} /><span className="hidden sm:inline">تفسير</span>
        </button>
        <div className="ayah-tooltip-sep" />
        {/* Close */}
        <button
          className="ayah-tooltip-btn"
          style={{ padding: "5px 7px", opacity: 0.5 }}
          onClick={(e) => { e.stopPropagation(); setSelectedAyah(null); }}
          title="إغلاق"
        >
          <XIcon size={12} />
        </button>
      </div>
    );
  };

  // ─── Note bottom sheet ────────────────────────────────────────────────────
  const renderNoteSheet = (s: QuranSurah) => {
    if (!selectedAyah) return null;
    const key = `${s.id}:${selectedAyah}`;
    const hl = (highlights[key] ?? null) as HighlightColor | null;

    return (
      <div className="quran-note-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="quran-note-sheet__handle" />
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {hl && (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: HIGHLIGHT_COLORS[hl].swatch }}
              />
            )}
            <span className="text-sm font-semibold arabic-text">
              ملاحظة للآية ﴿{toArabicIndic(selectedAyah)}﴾
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNoteSheetOpen(false)}
            className="w-7 h-7 rounded-xl bg-white/8 flex items-center justify-center opacity-55 hover:opacity-100 transition"
          >
            <XIcon size={14} />
          </button>
        </div>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="اكتب ملاحظة…"
          rows={5}
          className="w-full rounded-2xl bg-white/6 border border-white/10 p-3 text-sm leading-7 outline-none focus:border-white/22 resize-none"
          autoFocus
        />
        <div className="flex items-center justify-between mt-1 mb-2 px-1">
          <span className="text-[10px] opacity-30">{noteDraft.length} حرف</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              const clean = (noteDraft ?? "").trim();
              if (clean) { setQuranNote(s.id, selectedAyah, clean); toast.success("تم الحفظ"); }
              else { clearQuranNote(s.id, selectedAyah); }
              setNoteSheetOpen(false);
            }}
          >
            حفظ
          </Button>
          {!!notes[key] && (
            <Button
              variant="secondary"
              onClick={() => {
                clearQuranNote(s.id, selectedAyah);
                setNoteDraft("");
                setNoteSheetOpen(false);
                toast.success("تم الحذف");
              }}
            >
              حذف
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Q11: Inline tafsir sheet — shows ayah text + EN translation + external link
  const renderTafsirSheet = (s: QuranSurah) => {
    if (tafsirSheetAyah === null) return null;
    const ayahData = displayAyahs.find((a) => a.displayAyah === tafsirSheetAyah);
    const enText = translationData[ayahData?.originalAyah ?? tafsirSheetAyah];
    return (
      <>
        <div
          className="fixed inset-0 z-[90] bg-black/50"
          onClick={() => setTafsirSheetAyah(null)}
        />
        <div
          className="quran-note-sheet"
          style={{ zIndex: 91, maxHeight: "70vh", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="quran-note-sheet__handle" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm font-semibold arabic-text">
              تفسير الآية ﴿{toArabicIndic(tafsirSheetAyah)}﴾ · {s.name}
            </span>
            <button
              type="button"
              onClick={() => setTafsirSheetAyah(null)}
              className="w-7 h-7 rounded-xl bg-white/8 flex items-center justify-center opacity-55 hover:opacity-100 transition shrink-0"
            >
              <XIcon size={14} />
            </button>
          </div>
          {/* Arabic ayah text */}
          {ayahData && (
            <div className="arabic-text text-lg leading-10 mb-3 opacity-90 quran-text text-center p-3 rounded-2xl bg-white/4 border border-white/8" dir="rtl">
              {ayahData.text}
              <span className="ml-2 text-[var(--accent)] opacity-60 text-base">﴿{toArabicIndic(tafsirSheetAyah)}﴾</span>
            </div>
          )}
          {/* EN Translation */}
          <div className="text-sm leading-7 opacity-80 p-3 rounded-2xl bg-white/4 border border-white/8 mb-3" dir="ltr">
            {translationLoading ? (
              <span className="opacity-40 italic text-xs">Loading translation…</span>
            ) : enText ? (
              enText
            ) : (
              <span className="opacity-40 italic text-xs">Translation not available. Toggle translation on first.</span>
            )}
          </div>
          {/* External tafsir link */}
          <a
            href={`https://quran.ksu.edu.sa/tafseer/katheer/sura${s.id}-aya${tafsirSheetAyah}.html#katheer`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs opacity-55 hover:opacity-90 transition w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowUpRight size={13} />
            <span>تفسير ابن كثير الكامل</span>
          </a>
        </div>
      </>
    );
  };

  // ─── Fullscreen immersive reading mode early return ─────────────────────
  if (focusMode && surah && !isLoading && !error) {
    const showChrome = fsChrome || selectedAyah !== null;
    return (
      <div
        className="quran-fs-reader"
        data-quran-theme={prefs.quranTheme}
        onClick={handlePageClick}
        onTouchMove={showFsChrome}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        dir="rtl"
      >
        {/* Top chrome bar */}
        <div
          className={`quran-fs-header${showChrome ? "" : " quran-fs-chrome--hidden"}`}
          onClick={(e) => { e.stopPropagation(); showFsChrome(); }}
        >
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-white/8 transition shrink-0"
            onClick={(e) => { e.stopPropagation(); setFocusMode(false); setAutoScroll(false); }}
            aria-label="خروج من وضع الشاشة الكاملة"
            title="خروج"
          >
            <Minimize2 size={17} />
          </button>
          <span className="arabic-text quran-title text-sm font-semibold flex-1 truncate text-right px-2">
            {surah.name}
          </span>
          <span className="text-xs opacity-40 tabular-nums shrink-0">{navPage}/{navTotal}</span>
          {/* Font size controls */}
          <div
            className="flex items-center rounded-xl bg-white/7 overflow-hidden shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center hover:bg-white/8 transition text-base leading-none"
              onClick={() => setPrefs({ quranFontScale: Math.max(0.85, +(prefs.quranFontScale - 0.1).toFixed(2)) })}
            >−</button>
            <span className="text-[10px] opacity-45 px-1 select-none tabular-nums min-w-[32px] text-center">
              {Math.round(prefs.quranFontScale * 100)}%
            </span>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center hover:bg-white/8 transition text-base leading-none"
              onClick={() => setPrefs({ quranFontScale: Math.min(1.8, +(prefs.quranFontScale + 0.1).toFixed(2)) })}
            >+</button>
          </div>

          {/* Autoscroll teleprompter control */}
          <div
            className="flex items-center gap-1 rounded-xl bg-white/7 overflow-hidden shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={`px-2.5 h-8 text-[10px] transition ${autoScroll ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "hover:bg-white/8 opacity-55 hover:opacity-100"}`}
              onClick={() => setAutoScroll((v) => !v)}
              title="تمرير تلقائي"
              aria-label="تمرير تلقائي"
            >
              {autoScroll ? "■" : "▶"}
            </button>
            {autoScroll && (
              <>
                <button
                  type="button"
                  className="w-7 h-8 flex items-center justify-center hover:bg-white/8 transition text-xs leading-none"
                  onClick={() => setAutoScrollSpeed((v) => Math.max(1, v - 1))}
                  aria-label="تبطيء التمرير"
                >−</button>
                <span className="text-[9px] opacity-45 tabular-nums w-4 text-center select-none">{autoScrollSpeed}</span>
                <button
                  type="button"
                  className="w-7 h-8 flex items-center justify-center hover:bg-white/8 transition text-xs leading-none"
                  onClick={() => setAutoScrollSpeed((v) => Math.min(5, v + 1))}
                  aria-label="تسريع التمرير"
                >+</button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable reading area */}
        <div className="quran-fs-content quran-two-col" ref={pageRef}>
          {shouldShowBasmalah(surah.id) && (
            <div className="quran-basmalah-ornate mb-4">
              <div className="quran-basmalah-ornate-text">{BASMALAH}</div>
            </div>
          )}
          <div className="surah-header-banner mb-5" onClick={(e) => e.stopPropagation()}>
            <div className="surah-header-banner-name">{surah.name}</div>
            <div className="surah-header-banner-meta">
              <span>{getSurahRevelationLabel(surah.id)}</span>
              <span className="opacity-40">•</span>
              <span>{toArabicIndic(displayAyahs.length)} آية</span>
              <span className="opacity-40">•</span>
              <span>ج{toArabicIndic(getSurahJuz(surah.id))}</span>
              <span className="opacity-40">•</span>
              <span>⏱ {toArabicIndic(Math.max(1, Math.round(displayAyahs.length / 13)))} د</span>
            </div>
          </div>
          <div className="quran-parchment-block">
          <div
            className="arabic-text quran-text"
            style={{
              fontSize: `${18 * prefs.quranFontScale}px`,
              lineHeight: prefs.quranLineHeight,
              letterSpacing: `${prefs.quranLetterSpacing ?? 0}em`,
              wordSpacing: `${prefs.quranWordSpacing ?? 0}em`,
            }}
          >
            {pageAyahs.map((a) => renderAyah(a, surah))}
          </div>
          </div>
          <div className="text-center text-xs opacity-20 mt-8 mb-2 select-none arabic-text">
            اسحب يميناً للسابقة · اسحب يساراً للتالية
          </div>
        </div>

        {/* Bottom chrome bar */}
        <div
          className={`quran-fs-footer${showChrome ? "" : " quran-fs-chrome--hidden"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/8 transition text-sm disabled:opacity-25"
            onClick={goPrevPage}
            disabled={navPage <= 1}
            aria-label="الصفحة السابقة"
          >
            <ChevronLeft size={16} /> السابقة
          </button>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${(navPage / navTotal) * 100}%`, transition: "width 0.3s ease" }}
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/8 transition text-sm disabled:opacity-25"
            onClick={goNextPage}
            disabled={navPage >= navTotal}
            aria-label="الصفحة التالية"
          >
            التالية <ChevronRight size={16} />
          </button>
          {/* Surah navigation */}
          {surahId > 1 && (
            <button
              type="button"
              className="px-2 py-2 rounded-xl hover:bg-white/8 transition opacity-50 hover:opacity-100"
              onClick={() => { navigate(`/quran/${surahId - 1}`); }}
              title={prevSurahName ?? "السورة السابقة"}
              aria-label="السورة السابقة"
            >
              <ChevronsRight size={14} />
            </button>
          )}
          {surahId < 114 && (
            <button
              type="button"
              className="px-2 py-2 rounded-xl hover:bg-white/8 transition opacity-50 hover:opacity-100"
              onClick={() => { navigate(`/quran/${surahId + 1}`); }}
              title={nextSurahName ?? "السورة التالية"}
              aria-label="السورة التالية"
            >
              <ChevronsLeft size={14} />
            </button>
          )}
        </div>

        {renderTooltip(surah)}
        {noteSheetOpen && selectedAyah !== null && renderNoteSheet(surah)}
        {tafsirSheetAyah !== null && renderTafsirSheet(surah)}
      </div>
    );
  }

  if (isLoading) return (
    <div className="space-y-4 page-enter" dir="rtl">
      <div className="glass rounded-3xl p-5 animate-pulse border border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-white/8 shrink-0" />
          <div>
            <div className="h-4 w-24 bg-white/8 rounded-xl mb-1.5" />
            <div className="h-3 w-16 bg-white/6 rounded-xl" />
          </div>
        </div>
        <div className="mt-4 h-10 bg-white/6 rounded-3xl" />
      </div>
      <div className="glass rounded-3xl p-5 border border-white/6">
        <div className="space-y-4">
          {["w-full", "w-4/5", "w-11/12", "w-3/4", "w-full", "w-5/6"].map((w, i) => (
            <div key={i} className={`${w} h-6 bg-white/6 rounded-xl animate-pulse`} style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
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
    <div className="space-y-3 page-enter" onClick={handlePageClick}>
      {/* ── Slim reader top bar ───────────────────────────── */}
      <div className="quran-reader-bar">
        <IconButton aria-label="رجوع" onClick={() => navigate("/quran")}>
          <ArrowRight size={18} />
        </IconButton>
        <div className="flex-1 min-w-0 px-1">
          <div className="text-sm font-bold arabic-text quran-title leading-tight">{surah.name}</div>
          <div className="mt-0.5 text-[11px] opacity-50 flex items-center gap-1.5 flex-wrap">
            <span>{surah.englishName}</span>
            <span className="opacity-40">·</span>
            <span className={SURAH_REVELATION[surah.id] === "medinan" ? "text-blue-300/70" : "text-amber-300/70"}>
              {getSurahRevelationLabel(surah.id)}
            </span>
            <span className="opacity-40">·</span>
            <span className="arabic-text">{toArabicIndic(displayAyahs.length)} آية</span>
          </div>
        </div>
        <div className="flex items-center gap-0 shrink-0">
          {surahId > 1 && (
            <button
              aria-label={prevSurahName ?? "السورة السابقة"}
              title={prevSurahName ?? undefined}
              onClick={() => navigate(`/quran/${surahId - 1}`)}
              className="w-9 h-9 rounded-xl hover:bg-white/8 flex items-center justify-center opacity-60 hover:opacity-100 transition"
            >
              <ChevronRight size={16} />
            </button>
          )}
          {surahId < 114 && (
            <button
              aria-label={nextSurahName ?? "السورة التالية"}
              title={nextSurahName ?? undefined}
              onClick={() => navigate(`/quran/${surahId + 1}`)}
              className="w-9 h-9 rounded-xl hover:bg-white/8 flex items-center justify-center opacity-60 hover:opacity-100 transition"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
            aria-label="إعدادات القراءة"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition text-base ${
              showSettings
                ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                : "bg-white/6 opacity-60 hover:opacity-100 hover:bg-white/10"
            }`}
          >
            ⚙
          </button>
          {/* Q21: Keyboard shortcuts hint button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowShortcuts((v) => !v); }}
            aria-label="اختصارات لوحة المفاتيح"
            title="اختصارات (?)"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition bg-white/6 opacity-45 hover:opacity-100 hover:bg-white/10"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* ── Progress & page info strip ────────────────────── */}
      <div className="quran-reader-strip">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${readingProgress}%`, background: "var(--accent)" }}
          />
        </div>
        <span className="text-[11px] opacity-40 tabular-nums shrink-0">{navPage}/{navTotal}</span>
        {sessionSeconds >= 30 && (
          <div className="quran-timer-badge">
            <Timer size={10} />
            <span>{formatTimer(sessionSeconds)}</span>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setFocusMode((v) => !v); }}
          className="flex items-center gap-1 px-2.5 h-7 rounded-xl bg-white/6 border border-white/10 text-xs opacity-65 hover:opacity-100 transition shrink-0"
          aria-label="قراءة كاملة"
        >
          <Maximize2 size={13} />
          <span className="hidden sm:inline text-[11px]">قراءة</span>
        </button>
      </div>

      {/* ── Memorization mode banner ─────────────────────── */}
      {memMode && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, rgba(10,12,18,0.6))",
            borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
            color: "var(--accent)",
          }}
        >
          <span className="text-base">🧠</span>
          <span className="font-semibold">وضع الحفظ</span>
          <span className="opacity-70 mr-1">— اضغط على الآية لكشفها</span>
          <span className="ml-auto mr-1 tabular-nums opacity-80 text-[11px]">
            {toArabicIndic(Array.from(revealedAyahs).filter((n) => pageAyahs.some((a) => a.displayAyah === n)).length)}
            <span className="opacity-50">/</span>
            {toArabicIndic(pageAyahs.length)}
          </span>
          <button
            type="button"
            className="text-[10px] opacity-55 hover:opacity-100 underline underline-offset-2 transition"
            onClick={(e) => {
              e.stopPropagation();
              setRevealedAyahs((prev) => {
                const n = new Set(prev);
                for (const a of pageAyahs) n.add(a.displayAyah);
                return n;
              });
            }}
          >
            إظهار الكل
          </button>
          <button
            type="button"
            className="text-[10px] opacity-55 hover:opacity-100 underline underline-offset-2 transition"
            onClick={(e) => { e.stopPropagation(); setRevealedAyahs(new Set()); }}
          >
            إخفاء الكل
          </button>
        </div>
      )}

      {/* ── Settings sheet (fixed bottom sheet) ─────────── */}
      {showSettings && (
        <>
        <div className="quran-settings-backdrop" onClick={(e) => { e.stopPropagation(); setShowSettings(false); }} />
        <div className="quran-settings-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="quran-settings-sheet__handle" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold opacity-65">إعدادات القراءة</span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="w-7 h-7 rounded-xl bg-white/8 flex items-center justify-center opacity-50 hover:opacity-100 transition"
              aria-label="إغلاق الإعدادات"
            >
              <XIcon size={14} />
            </button>
          </div>
          {/* Page mode + page size */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-2xl bg-white/6 border border-white/10 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setPageMode("ayah")}
                className={`px-4 h-9 text-xs transition ${
                  pageMode === "ayah"
                    ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                ذكية
              </button>
              <button
                type="button"
                onClick={() => {
                  if (surahMushafPages.length === 0) {
                    toast.error("تعذر تحميل صفحات المصحف ٦٠٤ الآن");
                    return;
                  }
                  setPageMode("mushaf");
                  setCurrentMushafPage((prev) => prev ?? surahMushafPages[0]);
                }}
                className={`px-4 h-9 text-xs transition ${
                  pageMode === "mushaf"
                    ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                ص٦٠٤
              </button>
            </div>
            <div className={`flex rounded-2xl bg-white/6 border border-white/10 overflow-hidden shrink-0 transition ${
              isMushafMode ? "opacity-30 pointer-events-none" : ""
            }`}>
              {[8, 12, 16].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPrefs({ quranPageSize: size })}
                  className={`px-3 h-9 text-xs transition ${
                    pageSize === size
                      ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {size}
                </button>
              ))}
              <span className="text-[10px] opacity-40 flex items-center pr-2.5 pl-1 select-none">آية</span>
            </div>
          </div>

          {/* Font scale + letter spacing */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs opacity-50 shrink-0">الخط</span>
            <div className="flex items-center gap-0 rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
              {([["ﺗ", 0.85], ["س", 1.0], ["م", 1.15], ["ك", 1.35], ["كب", 1.6]] as [string, number][]).map(([label, scale]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPrefs({ quranFontScale: scale })}
                  className={`px-3 h-9 text-xs transition ${
                    Math.abs(prefs.quranFontScale - scale) < 0.08
                      ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold"
                      : "hover:bg-white/8 opacity-55 hover:opacity-100"
                  }`}
                  title={`خط ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setPrefs({ quranLetterSpacing: Math.max(0, +((prefs.quranLetterSpacing ?? 0) - 0.01).toFixed(3)) })}
                className="w-7 h-9 flex items-center justify-center hover:bg-white/8 transition text-xs opacity-65"
                aria-label="تضييق التشكيل"
              >ض</button>
              <span className="text-[9px] opacity-40 select-none w-3 text-center">أ</span>
              <button
                type="button"
                onClick={() => setPrefs({ quranLetterSpacing: Math.min(0.12, +((prefs.quranLetterSpacing ?? 0) + 0.01).toFixed(3)) })}
                className="w-7 h-9 flex items-center justify-center hover:bg-white/8 transition text-xs opacity-65"
                aria-label="توسيع التشكيل"
              >و</button>
            </div>
          </div>

          {/* Theme selector */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {(["default", "sepia", "midnight", "parchment"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPrefs({ quranTheme: t })}
                className={`text-[10px] px-2.5 py-1 rounded-xl border transition ${
                  prefs.quranTheme === t
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                    : "bg-white/6 border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                {{ default: "🌑 افتراضي", sepia: "🟫 سيبيا", midnight: "🌙 ليلي", parchment: "📜 رق" }[t]}
              </button>
            ))}
          </div>

          {/* Utility toggles */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => {
                const randomAyah = Math.floor(Math.random() * displayAyahs.length) + 1;
                goToAyah(randomAyah);
                toast.success(`آية عشوائية: ${toArabicIndic(randomAyah)}`);
              }}
            >
              <Shuffle size={16} /> آية عشوائية
            </Button>
            <Button variant="secondary" onClick={() => setPrefs({ quranHideMarkers: !prefs.quranHideMarkers })}>
              {prefs.quranHideMarkers ? "إظهار الأرقام" : "إخفاء الأرقام"}
            </Button>
            <button
              type="button"
              onClick={() => { setMemMode((v) => !v); setRevealedAyahs(new Set()); }}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-2xl border text-xs transition ${
                memMode
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                  : "bg-white/6 border-white/10 opacity-65 hover:opacity-100"
              }`}
              aria-label="وضع الحفظ"
            >
              {memMode ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{memMode ? "إيقاف الحفظ" : "وضع الحفظ"}</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowInSurahSearch((v) => !v); if (showInSurahSearch) setInSurahSearch(""); }}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-2xl border text-xs transition ${
                showInSurahSearch
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                  : "bg-white/6 border-white/10 opacity-65 hover:opacity-100"
              }`}
              aria-label="بحث آية"
            >
              <Search size={15} />
              <span>بحث آية</span>
            </button>
            <IconButton aria-label="نسخ السورة" onClick={() => doCopyText(fullSurahText)}>
              <Copy size={16} />
            </IconButton>
          </div>

          {/* ── Q3: Translation toggle ─────────────────────────────── */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowTranslation((v) => !v)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-2xl border text-xs transition ${
                showTranslation
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                  : "bg-white/6 border-white/10 opacity-65 hover:opacity-100"
              }`}
            >
              <Languages size={14} />
              <span>{showTranslation ? "إخفاء الترجمة" : "الترجمة الإنجليزية"}</span>
            </button>
          </div>

          {/* ── Q7/Q8/Q4: Audio controls ────────────────────────────── */}
          <div className="mt-3">
            <div className="text-[11px] opacity-45 mb-2 select-none">التلاوة</div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Playback speed */}
              <div className="flex rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
                {([0.75, 1, 1.25, 1.5, 2] as number[]).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setPlaybackSpeed(sp)}
                    className={`px-2.5 h-9 text-[10px] transition ${
                      playbackSpeed === sp
                        ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={`سرعة ${sp}×`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>
              {/* Auto-advance */}
              <button
                type="button"
                onClick={() => setAutoAdvance((v) => !v)}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-2xl border text-xs transition ${
                  autoAdvance
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                    : "bg-white/6 border-white/10 opacity-65 hover:opacity-100"
                }`}
                title="تقدم تلقائي للآية التالية"
              >
                <SkipForward size={14} />
                <span>تقدم تلقائي</span>
              </button>
              {/* Loop ayah */}
              <button
                type="button"
                onClick={() => setLoopAyah((v) => !v)}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-2xl border text-xs transition ${
                  loopAyah
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                    : "bg-white/6 border-white/10 opacity-65 hover:opacity-100"
                }`}
                title="تكرار الآية"
              >
                <Repeat size={14} />
                <span>تكرار</span>
              </button>
            </div>
            {/* Loop count selector (shown when loop is on) */}
            {loopAyah && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] opacity-45 shrink-0">عدد التكرار</span>
                <div className="flex rounded-2xl bg-white/6 border border-white/10 overflow-hidden">
                  {([2, 3, 5, 7, 10, -1] as number[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLoopCount(n)}
                      className={`px-2.5 h-9 text-xs transition ${
                        loopCount === n
                          ? "bg-[var(--accent)]/20 text-[var(--accent)] font-semibold"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {n === -1 ? "∞" : `${n}×`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Q5: Range loop (only meaningful with auto-advance) */}
            {autoAdvance && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] opacity-45">تكرار نطاق الآيات</span>
                  <button
                    type="button"
                    onClick={() => {
                      const on = !loopRange;
                      setLoopRange(on);
                      if (on) {
                        setLoopRangeStart(filteredPageAyahs[0]?.displayAyah ?? 1);
                        setLoopRangeEnd(filteredPageAyahs[filteredPageAyahs.length - 1]?.displayAyah ?? displayAyahs.length);
                      }
                    }}
                    className={`relative w-9 h-5 rounded-full transition ${loopRange ? "bg-[var(--accent)]" : "bg-white/15"}`}
                    aria-checked={loopRange}
                    role="switch"
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${loopRange ? "right-0.5" : "right-4.5"}`} />
                  </button>
                </div>
                {loopRange && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] opacity-45 shrink-0">من آية</span>
                    <input
                      type="number" min={1} max={displayAyahs.length}
                      value={loopRangeStart}
                      onChange={(e) => setLoopRangeStart(Math.max(1, Math.min(displayAyahs.length, Number(e.target.value))))}
                      className="w-14 rounded-xl bg-white/6 border border-white/10 px-2 py-1 text-xs text-center"
                    />
                    <span className="text-[11px] opacity-45 shrink-0">إلى آية</span>
                    <input
                      type="number" min={loopRangeStart} max={displayAyahs.length}
                      value={loopRangeEnd}
                      onChange={(e) => setLoopRangeEnd(Math.max(loopRangeStart, Math.min(displayAyahs.length, Number(e.target.value))))}
                      className="w-14 rounded-xl bg-white/6 border border-white/10 px-2 py-1 text-xs text-center"
                    />
                    <span className="text-[11px] opacity-35 shrink-0">/ {displayAyahs.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* In-surah search bar */}
          {showInSurahSearch && (
            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
                <input
                  type="text"
                  value={inSurahSearch}
                  onChange={(e) => setInSurahSearch(e.target.value)}
                  placeholder="بحث داخل آيات هذه الصفحة…"
                  className="w-full rounded-2xl bg-white/6 border border-white/10 pl-3 pr-9 py-2 text-sm outline-none focus:border-white/22 placeholder:opacity-45"
                  autoFocus
                  dir="rtl"
                />
              </div>
              {inSurahSearch && (
                <span className="text-[11px] opacity-55 shrink-0 tabular-nums">
                  {filteredPageAyahs.length} / {pageAyahs.length}
                </span>
              )}
              <button
                type="button"
                className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center opacity-55 hover:opacity-100 transition"
                onClick={() => { setInSurahSearch(""); setShowInSurahSearch(false); }}
                aria-label="إلغاء البحث"
              >
                <XIcon size={13} />
              </button>
            </div>
          )}

          {/* Jump to ayah */}
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={displayAyahs.length}
              value={jumpAyah}
              onChange={(e) => setJumpAyah(e.target.value)}
              placeholder={`آية (1–${displayAyahs.length})`}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={() => {
                const num = Number(jumpAyah);
                if (!Number.isFinite(num) || num <= 0) {
                  toast.error("أدخل رقم آية صحيح");
                  return;
                }
                goToAyah(num);
                setShowSettings(false);
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
                  placeholder={`صفحة (1–${totalMushafPages})`}
                  className="flex-1"
                />
                <Button
                  variant="primary"
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
                    setShowSettings(false);
                  }}
                >
                  انتقال للصفحة
                </Button>
              </>
            ) : null}
          </div>

          {/* Surah info */}
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSurahInfo((v) => !v); }}
              className="flex items-center gap-1.5 text-xs opacity-50 hover:opacity-90 transition"
              aria-expanded={showSurahInfo}
            >
              {showSurahInfo ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>معلومات السورة</span>
            </button>
            {showSurahInfo && (
              <div className="mt-2 glass rounded-2xl p-4 border border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <div className="text-[11px] opacity-50 mb-1">النوع</div>
                  <div className="font-semibold">{getSurahRevelationLabel(surah.id)}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-50 mb-1">الجزء</div>
                  <div className="font-semibold arabic-text">{toArabicIndic(getSurahJuz(surah.id))}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-50 mb-1">عدد الآيات</div>
                  <div className="font-semibold arabic-text tabular-nums">{toArabicIndic(displayAyahs.length)}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-50 mb-1">رقم السورة</div>
                  <div className="font-semibold arabic-text tabular-nums">{toArabicIndic(surah.id)}</div>
                </div>
                {surah.englishName && (
                  <div>
                    <div className="text-[11px] opacity-50 mb-1">الاسم بالإنجليزية</div>
                    <div className="font-semibold text-xs" dir="ltr">{surah.englishName}</div>
                  </div>
                )}
                {surahMushafPages.length > 0 && (
                  <div>
                    <div className="text-[11px] opacity-50 mb-1">صفحات المصحف</div>
                    <div className="font-semibold arabic-text tabular-nums text-xs">
                      {toArabicIndic(surahMushafPages[0])}–{toArabicIndic(surahMushafPages[surahMushafPages.length - 1])}
                    </div>
                  </div>
                )}
                {bookmarkedInSurah > 0 && (
                  <div>
                    <div className="text-[11px] opacity-50 mb-1">علامات</div>
                    <div className="font-semibold arabic-text tabular-nums">{toArabicIndic(bookmarkedInSurah)}</div>
                  </div>
                )}
                {notesInSurah > 0 && (
                  <div>
                    <div className="text-[11px] opacity-50 mb-1">ملاحظات</div>
                    <div className="font-semibold arabic-text tabular-nums">{toArabicIndic(notesInSurah)}</div>
                  </div>
                )}
                {highlightsInSurah > 0 && (
                  <div>
                    <div className="text-[11px] opacity-50 mb-1">تظليل</div>
                    <div className="font-semibold arabic-text tabular-nums">{toArabicIndic(highlightsInSurah)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* ── Quran text card (content-first!) ──────────── */}
      <Card className="p-5 quran-surface">
        <div
          ref={pageRef}
          className="quran-page quran-page-frame"
          data-quran-theme={prefs.quranTheme}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="quran-page-inner quran-two-col">
            {shouldShowBasmalah(surah.id) ? (
              <div className="mb-4 quran-basmalah-ornate">
                <div className="quran-basmalah-ornate-text">{BASMALAH}</div>
              </div>
            ) : null}
            <div className="surah-header-banner mb-4" onClick={(e) => e.stopPropagation()}>
              <div className="surah-header-banner-name">{surah.name}</div>
              <div className="surah-header-banner-meta">
                <span>{getSurahRevelationLabel(surah.id)}</span>
                <span className="opacity-40">•</span>
                <span>{toArabicIndic(displayAyahs.length)} آية</span>
                <span className="opacity-40">•</span>
                <span>ج{toArabicIndic(getSurahJuz(surah.id))}</span>
                <span className="opacity-40">•</span>
                <span>⏱ {toArabicIndic(Math.max(1, Math.round(displayAyahs.length / 13)))} د</span>
              </div>
            </div>
            <div className="quran-parchment-block">
            <div
              className="arabic-text quran-text"
              style={{
                fontSize: `${18 * prefs.quranFontScale}px`,
                lineHeight: prefs.quranLineHeight,
                letterSpacing: `${prefs.quranLetterSpacing ?? 0}em`,
                wordSpacing: `${prefs.quranWordSpacing ?? 0}em`,
              }}
            >
              {filteredPageAyahs.map((a) => renderAyah(a, surah))}
            </div>
            </div>

            {/* Mushaf page number */}
            <div className="quran-mushaf-page-num">
              <span>{isMushafMode ? `ص\u202f${toArabicIndic(currentMushafPage ?? 1)}` : `${toArabicIndic(navPage)} / ${toArabicIndic(navTotal)}`}</span>
            </div>

            {/* Bottom page navigation */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                onClick={goPrevPage}
                disabled={navPage <= 1}
              >
                <ChevronRight size={15} /> السابقة
              </Button>
              <span className="text-xs opacity-40 tabular-nums">{navPage} / {navTotal}</span>
              <Button
                variant={navPage < navTotal ? "primary" : "secondary"}
                onClick={goNextPage}
                disabled={navPage >= navTotal}
              >
                التالية <ChevronLeft size={15} />
              </Button>
            </div>

          </div>
        </div>
      </Card>

      {/* Floating tooltip pill + note + tafsir sheets */}
      {renderTooltip(surah)}
      {noteSheetOpen && selectedAyah !== null && renderNoteSheet(surah)}
      {tafsirSheetAyah !== null && renderTafsirSheet(surah)}

      {/* ── Q3: Per-ayah English translation panel ────── */}
      {showTranslation && (
        <Card className="p-4" dir="ltr">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold opacity-55 flex items-center gap-1.5">
              <Languages size={13} />
              {translationLoading ? "Loading translation…" : "Sahih International"}
            </span>
            <div className="flex items-center gap-1">
              {/* Q10: Toggle full surah vs current page */}
              <button
                type="button"
                onClick={() => setTranslationViewAll((v) => !v)}
                className={`px-2.5 h-6 rounded-lg text-[10px] border transition ${translationViewAll ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-55 hover:opacity-100"}`}
                title={translationViewAll ? "عرض الصفحة فقط" : "عرض السورة كاملة"}
              >
                {translationViewAll ? "الصفحة" : "السورة"}
              </button>
              <button
                type="button"
                onClick={() => setShowTranslation(false)}
                className="w-6 h-6 rounded-lg bg-white/8 flex items-center justify-center opacity-50 hover:opacity-100 transition"
              >
                <XIcon size={12} />
              </button>
            </div>
          </div>
          {translationLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-white/6 rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          ) : (
            <div className="space-y-4 text-sm leading-7">
              {(translationViewAll ? displayAyahs : filteredPageAyahs).map((a) => (
                <div key={a.displayAyah} className="flex gap-3">
                  <span className="text-[11px] opacity-35 shrink-0 tabular-nums pt-1 font-mono">
                    ({a.originalAyah})
                  </span>
                  <p className="flex-1 text-sm leading-6 opacity-80">
                    {translationData[a.originalAyah] ?? <span className="opacity-30 italic">—</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Q21: Keyboard shortcuts modal ─────────────── */}
      {showShortcuts && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[90vw] max-w-sm glass rounded-3xl border border-white/12 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold opacity-80">اختصارات لوحة المفاتيح</span>
              <button
                type="button"
                className="w-7 h-7 rounded-xl bg-white/8 flex items-center justify-center opacity-55 hover:opacity-100 transition"
                onClick={() => setShowShortcuts(false)}
              >
                <XIcon size={13} />
              </button>
            </div>
            <div className="space-y-1.5 text-sm">
              {([
                ["←", "الصفحة التالية"],
                ["→", "الصفحة السابقة"],
                ["Space", "تشغيل / إيقاف الآية المحددة"],
                ["m", "وضع الحفظ"],
                ["f", "وضع القراءة الكاملة"],
                ["s", "إعدادات القراءة"],
                ["?", "قائمة الاختصارات"],
                ["Esc", "إلغاء / رجوع"],
              ] as [string, string][]).map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-1.5 border-b border-white/6 last:border-0">
                  <span className="opacity-70">{desc}</span>
                  <kbd className="bg-white/8 px-2 py-0.5 rounded-lg text-[11px] font-mono shrink-0 border border-white/12 opacity-90">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* De15: Right-click context menu */}
      {ctxMenu && (
        <div
          className="ctx-menu"
          style={{ position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="ctx-menu-item"
            onClick={() => {
              const k = `${ctxMenu.surahId}:${ctxMenu.ayahIndex}`;
              const surahData = data?.find((s) => s.id === ctxMenu.surahId);
              const txt = surahData?.ayahs[ctxMenu.ayahIndex - 1] ?? "";
              navigator.clipboard.writeText(txt).then(() => toast.success("نُسخت الآية")).catch(() => {});
              setCtxMenu(null);
            }}
          >نسخ الآية</button>
          <button
            className="ctx-menu-item"
            onClick={() => {
              const k = `${ctxMenu.surahId}:${ctxMenu.ayahIndex}`;
              const isBookmarked = !!bookmarks[k];
              toggleBookmark(ctxMenu.surahId, ctxMenu.ayahIndex);
              toast.success(isBookmarked ? "أُزيلت العلامة" : "تمت الإضافة للعلامات");
              setCtxMenu(null);
            }}
          >{bookmarks[`${ctxMenu.surahId}:${ctxMenu.ayahIndex}`] ? "إزالة العلامة" : "إضافة علامة"}</button>
          <div className="ctx-menu-separator" />
          <button
            className="ctx-menu-item"
            onClick={() => {
              const surahData = data?.find((s) => s.id === ctxMenu.surahId);
              const txt = surahData?.ayahs[ctxMenu.ayahIndex - 1] ?? "";
              const shareText = `${txt}\n﴿${ctxMenu.ayahIndex}﴾ ${surahData?.name ?? ""}`;
              if (navigator.share) {
                navigator.share({ text: shareText }).catch(() => {});
              } else {
                navigator.clipboard.writeText(shareText).then(() => toast.success("نُسخ للمشاركة")).catch(() => {});
              }
              setCtxMenu(null);
            }}
          >مشاركة</button>
        </div>
      )}
    </div>
  );
}

