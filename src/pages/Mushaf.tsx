import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Bookmark, Globe, MoreVertical, Play, Pause,
  ChevronDown, Copy, Share2, VolumeX, Volume2, X, Pencil,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Mic2, Repeat2,
  Eye, EyeOff, CheckCircle2, Languages, Search, HelpCircle,
  Repeat, SkipForward, ArrowUpRight, Settings, Info, Shuffle,
  Radio, Timer, Download, SlidersHorizontal,
} from "lucide-react";
import { useQuranDB } from "@/data/useQuranDB";
import { useQuranPageMap } from "@/data/useQuranPageMap";
import { useNoorStore } from "@/store/noorStore";
import { getSurahJuz, getSurahRevelationLabel, toArabicNumeral } from "@/lib/quranMeta";
import { stripDiacritics } from "@/lib/arabic";
import { QURAN_RECITERS } from "@/lib/quranReciters";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import { loadWbwSurah, renderTajweed, type WbwSurah } from "@/lib/quranWBW";
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
  pink:  { swatch: "rgba(249,168,212,0.85)", bg: "rgba(249,168,212,0.18)" },
} as const;
type HlColor = keyof typeof HL_COLORS;

// Q18: Sujood positions
const SAJDA_AYAHS = new Set([
  "7:206","13:15","16:50","17:109","19:58","22:18","22:77","25:60",
  "27:26","32:15","38:24","41:38","53:62","84:21","96:19",
]);

// A4: Quran Radio stations (public mp3quran.net streams)
const QURAN_RADIO_STATIONS: Array<{ label: string; url: string }> = [
  { label: "راديو القرآن",         url: "https://media.mp3quran.net/quran/radio/" },
  { label: "مشاري العفاسي",        url: "https://media.mp3quran.net/alafasy/radio/" },
  { label: "سعد الغامدي",          url: "https://media.mp3quran.net/ghamadi/radio/" },
  { label: "ياسر الدوسري",         url: "https://media.mp3quran.net/yasser/radio/" },
  { label: "ماهر المعيقلي",        url: "https://media.mp3quran.net/maher/radio/" },
];

// ── M5: Dial wheel component for page jump ───────────────────
function DialWheel({ current, total, onConfirm }: {
  current: number; total: number; onConfirm: (p: number) => void;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dialPage, setDialPage] = React.useState(current);
  const ITEM_H = 44;
  React.useLayoutEffect(() => {
    if (trackRef.current) trackRef.current.scrollTop = (current - 1) * ITEM_H + ITEM_H / 2;
    setDialPage(current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleScroll = () => {
    if (!trackRef.current) return;
    const idx = Math.round((trackRef.current.scrollTop - ITEM_H / 2) / ITEM_H);
    setDialPage(Math.max(1, Math.min(total, idx + 1)));
  };
  return (
    <div>
      <div className="flex items-baseline justify-center gap-2 my-2">
        <span className="tabular-nums font-bold" style={{ fontSize: "3rem", color: "var(--accent)", lineHeight: 1 }}>
          {dialPage}
        </span>
        <span className="text-sm opacity-40">/ {total}</span>
      </div>
      <div className="mushaf-dial-container">
        <div className="mushaf-dial-track" ref={trackRef} onScroll={handleScroll}>
          <div style={{ height: `${ITEM_H * 2}px` }} />
          {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
            <div key={p} className="mushaf-dial-item">{p}</div>
          ))}
          <div style={{ height: `${ITEM_H * 2}px` }} />
        </div>
        <div className="mushaf-dial-indicator" aria-hidden="true" />
      </div>
      <button className="mushaf-btn-primary w-full mt-3" onClick={() => onConfirm(dialPage)}>
        انتقال ←
      </button>
    </div>
  );
}

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
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const setKhatmaDone = useNoorStore((s) => s.setKhatmaDone);
  const lastRead = useNoorStore((s) => s.quranLastRead);

  const totalPages = pmData?.totalPages ?? 604;
  const pageMap = pmData?.map ?? {};

  // Build page index (one-time, memoized)
  const pageIndex = React.useMemo(() => {
    if (!quranDB || Object.keys(pageMap).length === 0) return new Map<number, PageItem[]>();
    return buildPageIndex(quranDB, pageMap);
  }, [quranDB, pageMap]);

  // Current page state
  const surahParam = Number(sp.get("surah"));
  const ayahParam = Number(sp.get("ayah"));
  const rawPage = Number(pageParam) || 0;

  const [currentPage, setCurrentPage] = React.useState<number>(() =>
    rawPage >= 1 ? Math.min(rawPage, 604) : (prefs.quranMushafPage ?? 1)
  );

  // Handle ?surah= param: jump to first page of that surah (or specific ayah)
  const didJumpRef = React.useRef(false);
  React.useEffect(() => {
    if (!surahParam || Object.keys(pageMap).length === 0 || didJumpRef.current) return;
    didJumpRef.current = true;
    let p: number;
    if (ayahParam > 0) {
      p = Number(pageMap[`${surahParam}:${ayahParam}`])
        || Number(pageMap[`${surahParam}:${ayahParam + 1}`])
        || Number(pageMap[`${surahParam}:1`])
        || Number(pageMap[`${surahParam}:2`])
        || 1;
    } else {
      p = Number(pageMap[`${surahParam}:1`]) || Number(pageMap[`${surahParam}:2`]) || 1;
    }
    setCurrentPage(p);
    navigate(`/mushaf/${p}`, { replace: true });
  }, [surahParam, ayahParam, pageMap, navigate]);

  // Sync URL param when navigating via browser back/forward
  React.useEffect(() => {
    if (rawPage >= 1 && rawPage !== currentPage) setCurrentPage(Math.min(rawPage, 604));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPage]);

  const goPage = React.useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    // M2: Slide animation direction
    if (clamped !== currentPage) {
      setPageTransDir(clamped > currentPage ? "left" : "right");
      if (pageTransTimer.current) clearTimeout(pageTransTimer.current);
      pageTransTimer.current = window.setTimeout(() => setPageTransDir(null), 380);
    }
    setCurrentPage(clamped);
    setPrefs({ quranMushafPage: clamped });
    navigate(`/mushaf/${clamped}`, { replace: true });
  }, [navigate, setPrefs, totalPages, currentPage]);

  // Page items
  const pageItems = pageIndex.get(currentPage) ?? [];
  const playableItems = React.useMemo(
    () => pageItems.filter((item) => !item.isBasmalahHeader && item.displayAyah > 0),
    [pageItems]
  );
  const firstPlayableItem = playableItems[0] ?? null;

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

  // Auto-select ayah when navigating from ?surah=X&ayah=Y deeplinks
  const didSelectRef = React.useRef(false);
  React.useEffect(() => {
    if (!surahParam || !ayahParam || pageIndex.size === 0 || didSelectRef.current) return;
    const items = pageIndex.get(currentPage) ?? [];
    const item = items.find(
      (i) => i.surahId === surahParam && (i.displayAyah === ayahParam || i.originalAyah === ayahParam)
    );
    if (item) {
      didSelectRef.current = true;
      setSelectedItem(item);
    }
  }, [surahParam, ayahParam, currentPage, pageIndex]);

  // Q9: Per-ayah reveal in memorization mode (must be before handleAyahTap)
  const [memorizationMode, setMemorizationMode] = React.useState(false);
  const [revealedItems, setRevealedItems] = React.useState<Set<string>>(new Set());

  const handleAyahTap = React.useCallback((e: React.MouseEvent, item: PageItem) => {
    e.stopPropagation();
    if (item.isBasmalahHeader || item.displayAyah === 0) return;
    // Q9: In memorization mode, clicking reveals/hides the ayah instead of selecting it
    if (memorizationMode) {
      const k = `${item.surahId}:${item.displayAyah}`;
      setRevealedItems((prev) => {
        const n = new Set(prev);
        if (n.has(k)) n.delete(k); else n.add(k);
        return n;
      });
      return;
    }
    setSelectedItem((prev) =>
      prev?.surahId === item.surahId && prev?.originalAyah === item.originalAyah ? null : item
    );
    setLastRead(item.surahId, item.displayAyah);
    recordQuranRead(1);
    flashChrome();
  }, [flashChrome, memorizationMode, recordQuranRead, setLastRead]);

  // Note sheet
  const [noteSheetOpen, setNoteSheetOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");
  React.useEffect(() => {
    if (!selectedItem) { setNoteSheetOpen(false); return; }
    const key = `${selectedItem.surahId}:${selectedItem.displayAyah}`;
    setNoteDraft(notes[key] ?? "");
  }, [notes, selectedItem]);

  // Audio refs & state
  const [playingKey, setPlayingKey] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [audioBarVisible, setAudioBarVisible] = React.useState(true);
  const [showReciterSheet, setShowReciterSheet] = React.useState(false);

  // Q4/Q7/Q8: Enhanced audio controls (replaces simple repeatMode)
  const [loopEnabled, setLoopEnabled] = React.useState(false);
  const [loopCount, setLoopCount] = React.useState(3); // -1=∞
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [autoAdvance, setAutoAdvance] = React.useState(false);

  // Q5: Range audio loop
  const [loopRange, setLoopRange] = React.useState(false);
  const [loopRangeStartIdx, setLoopRangeStartIdx] = React.useState(0);
  const [loopRangeEndIdx, setLoopRangeEndIdx] = React.useState(0);

  // Audio ref state machine (avoids stale closures in onended callbacks)
  const audioPlayRef = React.useRef<{
    active: boolean; loop: boolean; loopRemaining: number;
    advance: boolean; speed: number;
    items: { surahId: number; originalAyah: number; displayAyah: number }[];
    currentIdx: number; useRange: boolean; rangeStartIdx: number; rangeEndIdx: number;
  }>({ active: false, loop: false, loopRemaining: 0, advance: false, speed: 1, items: [], currentIdx: 0, useRange: false, rangeStartIdx: 0, rangeEndIdx: 0 });
  const playItemCoreRef = React.useRef<((surahId: number, originalAyah: number, displayAyah: number) => void) | null>(null);

  // Q3: Translation
  const [showTranslation, setShowTranslation] = React.useState(false);
  const [translationData, setTranslationData] = React.useState<Record<number, string[]>>({});
  const [translationLoading, setTranslationLoading] = React.useState(false);

  // Q11-B: Inline tafseer mode (قراءة mode)
  const [inlineTafseer, setInlineTafseerState] = React.useState(() => prefs.mushafInlineTafseer ?? false);
  const setInlineTafseer = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setInlineTafseerState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      setPrefs({ mushafInlineTafseer: next });
      return next;
    });
  }, [setPrefs]);
  const [inlineTafseerSource, setInlineTafseerSource] = React.useState<"muyassar" | "jalalayn">("muyassar");
  const [inlineTafseerData, setInlineTafseerData] = React.useState<Record<number, string[]>>({});
  const [inlineTafseerLoading, setInlineTafseerLoading] = React.useState(false);

  // Phase 2A: Word-by-word translation
  // Phase 2B: WBW data used by Tajweed mode
  const [wbwData, setWbwData] = React.useState<Record<number, WbwSurah>>({});
  const [wbwLoading, setWbwLoading] = React.useState(false);

  // Phase 2B: Tajweed color mode
  const [tajweedMode, setTajweedModeState] = React.useState(() => prefs.mushafTajweedMode ?? false);
  const setTajweedMode = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setTajweedModeState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      setPrefs({ mushafTajweedMode: next });
      return next;
    });
  }, [setPrefs]);

  // Q17: In-page search
  const [inPageSearch, setInPageSearch] = React.useState("");
  const [showSearch, setShowSearch] = React.useState(false);

  // Q21: Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  // Q15: Surah info panel
  const [showSurahInfo, setShowSurahInfo] = React.useState(false);

  // Settings sheet
  const [showSettings, setShowSettings] = React.useState(false);
  // More actions sheet
  const [showMoreSheet, setShowMoreSheet] = React.useState(false);

  // Q11: Tafsir sheet
  const [tafsirItem, setTafsirItem] = React.useState<PageItem | null>(null);

  // M2: Page slide direction
  const [pageTransDir, setPageTransDir] = React.useState<"left" | "right" | null>(null);
  const pageTransTimer = React.useRef<number | null>(null);

  // M4: Pinch-to-zoom refs
  const pinchStartDist = React.useRef<number | null>(null);
  const pinchStartScale = React.useRef<number>(0.88);

  // M6: Juz overlay
  const [juzOverlay, setJuzOverlay] = React.useState<string | null>(null);
  const juzOverlayTimer = React.useRef<number | null>(null);
  const prevPageRef = React.useRef<number | null>(null);

  // M7: Long-press bookmark
  const longPressTimer = React.useRef<number | null>(null);
  const longPressFired = React.useRef(false);

  // A2: Offline audio cache progress
  const [cacheProgress, setCacheProgress] = React.useState<{ done: number; total: number } | null>(null);

  // A4: Quran Radio
  const [showRadio, setShowRadio] = React.useState(false);
  const [radioPlaying, setRadioPlaying] = React.useState(false);
  const radioAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [radioStationIdx, setRadioStationIdx] = React.useState(0);

  // A5: Sleep timer
  const [sleepMinutes, setSleepMinutes] = React.useState(0);
  const [sleepRemaining, setSleepRemaining] = React.useState(0);
  const sleepTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // A6: Equalizer (Web Audio API)
  const [eqEnabled, setEqEnabled] = React.useState(false);
  const [bassGain, setBassGain] = React.useState(0);
  const [trebleGain, setTrebleGain] = React.useState(0);
  const eqEnabledRef = React.useRef(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const bassNodeRef = React.useRef<BiquadFilterNode | null>(null);
  const trebleNodeRef = React.useRef<BiquadFilterNode | null>(null);

  // M1: Ref for auto-scrolling to playing ayah
  const playingSpanRef = React.useRef<HTMLElement | null>(null);

  // playItemCoreRef: sets up audio element with onended logic (avoids stale closures)
  React.useEffect(() => {
    playItemCoreRef.current = (surahId: number, originalAyah: number, displayAyah: number) => {
      const key = `${surahId}:${displayAyah}`;
      const pst = audioPlayRef.current;
      const s = String(surahId).padStart(3, "0");
      const a = String(originalAyah).padStart(3, "0");
      const reciter = prefs.quranReciter ?? "Alafasy_128kbps";
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const audio = new Audio(`https://everyayah.com/data/${reciter}/${s}${a}.mp3`);
      audio.playbackRate = pst.speed;
      // A6: Route through Web Audio EQ if enabled
      if (eqEnabledRef.current && audioCtxRef.current && bassNodeRef.current) {
        try {
          const src = audioCtxRef.current.createMediaElementSource(audio);
          src.connect(bassNodeRef.current);
          if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume().catch(() => {});
        } catch { /* already connected or unsupported */ }
      }
      audioRef.current = audio;
      setPlayingKey(key);
      audio.play().catch(() => toast.error("تعذر تشغيل التلاوة"));
      audio.onended = () => {
        if (!pst.active) { setPlayingKey(null); return; }
        if (pst.loop) {
          const rem = pst.loopRemaining;
          if (rem === -1 || rem > 1) {
            if (rem > 0) pst.loopRemaining--;
            playItemCoreRef.current?.(surahId, originalAyah, displayAyah);
          } else {
            pst.active = false;
            setPlayingKey(null);
          }
        } else if (pst.advance) {
          const rangeMax = pst.useRange ? pst.rangeEndIdx : (pst.items.length - 1);
          const rangeMin = pst.useRange ? pst.rangeStartIdx : 0;
          const nextIdx = pst.currentIdx + 1;
          if (nextIdx <= rangeMax && nextIdx < pst.items.length) {
            pst.currentIdx = nextIdx;
            const next = pst.items[nextIdx];
            playItemCoreRef.current?.(next.surahId, next.originalAyah, next.displayAyah);
          } else if (pst.useRange) {
            pst.currentIdx = rangeMin;
            const next = pst.items[rangeMin];
            playItemCoreRef.current?.(next.surahId, next.originalAyah, next.displayAyah);
          } else {
            pst.active = false;
            setPlayingKey(null);
            toast.success("✅ انتهت التلاوة");
          }
        } else {
          pst.active = false;
          setPlayingKey(null);
        }
      };
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.quranReciter]);

  const playAyah = React.useCallback((surahId: number, originalAyah: number, displayAyah: number) => {
    const key = `${surahId}:${displayAyah}`;
    const pst = audioPlayRef.current;
    if (pst.active && playingKey === key) {
      pst.active = false;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPlayingKey(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    pst.active = true;
    pst.speed = playbackSpeed;
    pst.loop = loopEnabled;
    pst.loopRemaining = loopEnabled ? loopCount : 0;
    pst.advance = autoAdvance;
    const snapshot = playableItems.map((i) => ({ surahId: i.surahId, originalAyah: i.originalAyah, displayAyah: i.displayAyah }));
    const curIdx = snapshot.findIndex((i) => i.surahId === surahId && i.originalAyah === originalAyah);
    pst.items = snapshot;
    pst.currentIdx = curIdx >= 0 ? curIdx : 0;
    pst.useRange = loopRange;
    pst.rangeStartIdx = Math.max(0, loopRangeStartIdx);
    pst.rangeEndIdx = Math.min(snapshot.length - 1, Math.max(loopRangeStartIdx, loopRangeEndIdx));
    playItemCoreRef.current?.(surahId, originalAyah, displayAyah);
  }, [playingKey, playbackSpeed, loopEnabled, loopCount, autoAdvance, playableItems, loopRange, loopRangeStartIdx, loopRangeEndIdx]);

  React.useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }, []);

  // Q3: Fetch translation for all surahs on current page when translation panel is open
  React.useEffect(() => {
    if (!showTranslation && tafsirItem === null) return;
    const surahIds = [...new Set(pageItems.map((i) => i.surahId))];
    if (tafsirItem) surahIds.push(tafsirItem.surahId);
    const toFetch = surahIds.filter((sid) => !translationData[sid]);
    if (toFetch.length === 0) return;
    setTranslationLoading(true);
    Promise.all(toFetch.map((sid) =>
      fetch(`https://api.alquran.cloud/v1/surah/${sid}/en.sahih`)
        .then((r) => r.json())
        .then((data) => {
          const ayahs: string[] = [];
          for (const a of data?.data?.ayahs ?? []) ayahs[a.numberInSurah] = a.text;
          return { sid, ayahs };
        })
    )).then((results) => {
      setTranslationData((prev) => {
        const upd = { ...prev };
        for (const { sid, ayahs } of results) upd[sid] = ayahs;
        return upd;
      });
    }).catch(() => toast.error("تعذر تحميل الترجمة"))
      .finally(() => setTranslationLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTranslation, tafsirItem, currentPage]);

  // Q17: Normalized search for ayah matching
  const normalizedSearch = React.useMemo(
    () => (showSearch && inPageSearch ? stripDiacritics(inPageSearch.trim()) : ""),
    [showSearch, inPageSearch]
  );

  // Q11-B: Fetch tafseer for all surahs on current page when inline tafseer is on
  React.useEffect(() => {
    if (!inlineTafseer) return;
    const surahIds = [...new Set(pageItems.map((i) => i.surahId))];
    const edition = inlineTafseerSource === "jalalayn" ? "ar.jalalayn" : "ar.muyassar";
    const toFetch = surahIds.filter((sid) => !inlineTafseerData[sid]);
    if (toFetch.length === 0) return;
    setInlineTafseerLoading(true);
    Promise.all(toFetch.map((sid) =>
      fetch(`https://api.alquran.cloud/v1/surah/${sid}/${edition}`)
        .then((r) => r.json())
        .then((data: { data?: { ayahs?: Array<{ numberInSurah: number; text: string }> } }) => {
          const ayahs: string[] = [];
          for (const a of data?.data?.ayahs ?? []) ayahs[a.numberInSurah] = a.text;
          return { sid, ayahs };
        })
    )).then((results) => {
      setInlineTafseerData((prev) => {
        const upd = { ...prev };
        for (const { sid, ayahs } of results) upd[sid] = ayahs;
        return upd;
      });
    }).catch(() => toast.error("تعذر تحميل التفسير"))
      .finally(() => setInlineTafseerLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineTafseer, inlineTafseerSource, currentPage]);

  // Q11-B: Clear cached tafseer data when source changes
  React.useEffect(() => {
    setInlineTafseerData({});
  }, [inlineTafseerSource]);

  // Phase 2A/2B: Fetch word-by-word data for all surahs on current page
  // Triggered by either WBW mode or Tajweed mode (both need the same data)
  React.useEffect(() => {
    if (!tajweedMode) return;
    const surahIds = [...new Set(pageItems.map((i) => i.surahId))];
    const toFetch = surahIds.filter((sid) => !wbwData[sid]);
    if (toFetch.length === 0) return;
    setWbwLoading(true);
    Promise.all(toFetch.map((sid) => loadWbwSurah(sid).then((data) => ({ sid, data }))))
      .then((results) => {
        setWbwData((prev) => {
          const upd = { ...prev };
          for (const { sid, data } of results) upd[sid] = data;
          return upd;
        });
      })
      .catch(() => toast.error("تعذر تحميل البيانات"))
      .finally(() => setWbwLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tajweedMode, currentPage]);

  // Q11-B: Fetch tafseer for popup when tafsirItem opens (works even when inline tafseer is OFF)
  React.useEffect(() => {
    if (!tafsirItem) return;
    const sid = tafsirItem.surahId;
    const edition = inlineTafseerSource === "jalalayn" ? "ar.jalalayn" : "ar.muyassar";
    setInlineTafseerLoading(true);
    fetch(`https://api.alquran.cloud/v1/surah/${sid}/${edition}`)
      .then((r) => r.json())
      .then((data: { data?: { ayahs?: Array<{ numberInSurah: number; text: string }> } }) => {
        const ayahs: string[] = [];
        for (const a of data?.data?.ayahs ?? []) ayahs[a.numberInSurah] = a.text;
        setInlineTafseerData((prev) => ({ ...prev, [sid]: ayahs }));
      })
      .catch(() => {})
      .finally(() => setInlineTafseerLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tafsirItem, inlineTafseerSource]);

  // Page jump
  const [showJump, setShowJump] = React.useState(false);
  const [jumpInput, setJumpInput] = React.useState("");

  // Font scale: 0.7 – 1.6 in 0.1 steps
  const [fontScale, setFontScale] = React.useState<number>(() => prefs.mushafFontScale ?? 0.88);
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

  // Touch swipe (horizontal only) + M4 pinch-to-zoom
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      // M4: Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale.current = fontScale;
      touchStartX.current = null; // cancel swipe
    } else {
      touchStartX.current = e.touches[0]?.clientX ?? null;
      touchStartY.current = e.touches[0]?.clientY ?? null;
      pinchStartDist.current = null;
    }
  };
  const onTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (e.touches.length >= 2 && pinchStartDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / pinchStartDist.current;
      const newScale = Math.round(Math.max(0.7, Math.min(1.6, pinchStartScale.current * ratio)) * 100) / 100;
      setFontScale(newScale);
      setPrefs({ mushafFontScale: newScale });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPrefs]);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartDist.current !== null) {
      // Save pinch result
      setPrefs({ mushafFontScale: fontScale });
      pinchStartDist.current = null;
      return;
    }
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
      else if (e.key === "m") setMemorizationMode((v) => { if (v) setRevealedItems(new Set()); return !v; });
      else if (e.key === "t") setShowTranslation((v) => !v);
      else if (e.key === "/") { e.preventDefault(); setShowSearch((v) => !v); }
      else if (e.key === "?") setShowShortcuts((v) => !v);
      else if (e.key === "s") setShowSettings((v) => !v);
      else if (e.key === "Escape") {
        if (showSettings) { setShowSettings(false); return; }
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showSearch) { setShowSearch(false); setInPageSearch(""); return; }
        if (tafsirItem) { setTafsirItem(null); return; }
        if (showJump) { setShowJump(false); return; }
        if (noteSheetOpen) { setNoteSheetOpen(false); return; }
        if (selectedItem) { setSelectedItem(null); return; }
        navigate("/quran");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, goPage, navigate, noteSheetOpen, selectedItem, showJump, showSettings, showShortcuts, showSearch, tafsirItem]);

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

  const markPageReviewed = React.useCallback(() => {
    const playableItems = pageItems.filter((item) => !item.isBasmalahHeader && item.displayAyah > 0);
    const lastPlayable = playableItems[playableItems.length - 1];
    if (!lastPlayable) return;
    setLastRead(lastPlayable.surahId, lastPlayable.displayAyah);
    recordQuranRead(playableItems.length);
    toast.success("تم حفظ مراجعة الصفحة");
  }, [pageItems, recordQuranRead, setLastRead]);

  // M1: Auto-scroll to currently playing ayah
  React.useEffect(() => {
    if (playingKey && playingSpanRef.current) {
      playingSpanRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [playingKey]);

  // M6: Show juz + hizb overlay chip on page change
  React.useEffect(() => {
    if (prevPageRef.current === null) { prevPageRef.current = currentPage; return; }
    if (prevPageRef.current === currentPage) return;
    prevPageRef.current = currentPage;
    const juzNum = pageJuz;
    const hizb = Math.max(1, Math.ceil((currentPage / 604) * 60));
    setJuzOverlay(`الجزء ${toArabicNumeral(juzNum)} · الحزب ${toArabicNumeral(hizb)}`);
    if (juzOverlayTimer.current) clearTimeout(juzOverlayTimer.current);
    juzOverlayTimer.current = window.setTimeout(() => setJuzOverlay(null), 2600);
  }, [currentPage, pageJuz]);
  React.useEffect(() => () => {
    if (juzOverlayTimer.current) clearTimeout(juzOverlayTimer.current);
    if (pageTransTimer.current) clearTimeout(pageTransTimer.current);
  }, []);

  // M7: Long-press bookmark handlers
  const handlePointerDown = React.useCallback((e: React.PointerEvent, item: PageItem) => {
    if (item.isBasmalahHeader || item.displayAyah === 0) return;
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      const k = `${item.surahId}:${item.displayAyah}`;
      const wasBookmarked = !!bookmarks[k];
      toggleBookmark(item.surahId, item.displayAyah);
      toast.success(wasBookmarked ? "أُزيلت العلامة 🔖" : "✓ إشارة مرجعية محفوظة");
    }, 600);
  }, [bookmarks, toggleBookmark]);
  const handlePointerUp = React.useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  // A2: Download current page ayah audio for offline use
  const downloadPageAudio = React.useCallback(async () => {
    if (!("caches" in window)) { toast.error("التخزين غير متاح في هذا المتصفح"); return; }
    const items = playableItems.slice();
    if (items.length === 0) return;
    setCacheProgress({ done: 0, total: items.length });
    try {
      const cache = await caches.open("mushaf-audio-v1");
      let done = 0;
      for (const item of items) {
        const s = String(item.surahId).padStart(3, "0");
        const a = String(item.originalAyah).padStart(3, "0");
        const url = `https://everyayah.com/data/${prefs.quranReciter ?? "Alafasy_128kbps"}/${s}${a}.mp3`;
        try { await cache.add(url); } catch { /* network or CORS — skip */ }
        done++;
        setCacheProgress({ done, total: items.length });
      }
      toast.success(`✓ تم تخزين ${done} ملف صوتي للاستماع دون إنترنت`);
    } catch { toast.error("تعذر التحميل"); }
    finally { setCacheProgress(null); }
  }, [playableItems, prefs.quranReciter]);

  // A3: MediaSession API — lock-screen controls
  React.useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (playingKey) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${pageSurahName} · آية ${playingKey.split(":")[1] ?? ""}`,
        artist: QURAN_RECITERS.find((r) => r.id === (prefs.quranReciter ?? "Alafasy_128kbps"))?.label ?? "تلاوة",
        album: "القرآن الكريم · أثر",
        artwork: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      });
      navigator.mediaSession.playbackState = "playing";
    } else {
      navigator.mediaSession.playbackState = "paused";
    }
    navigator.mediaSession.setActionHandler("pause", () => {
      audioPlayRef.current.active = false;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPlayingKey(null);
    });
    navigator.mediaSession.setActionHandler("play", () => {
      const fp = playableItems[0];
      if (fp) {
        audioPlayRef.current.active = true;
        audioPlayRef.current.speed = 1;
        audioPlayRef.current.loop = false;
        audioPlayRef.current.loopRemaining = 0;
        audioPlayRef.current.advance = false;
        audioPlayRef.current.items = playableItems.map((i) => ({ surahId: i.surahId, originalAyah: i.originalAyah, displayAyah: i.displayAyah }));
        audioPlayRef.current.currentIdx = 0;
        audioPlayRef.current.useRange = false;
        playItemCoreRef.current?.(fp.surahId, fp.originalAyah, fp.displayAyah);
      }
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => goPage(currentPage + 1));
    navigator.mediaSession.setActionHandler("previoustrack", () => goPage(currentPage - 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingKey, pageSurahName, prefs.quranReciter, currentPage, playableItems]);

  // A4: Radio control functions
  const toggleRadio = React.useCallback(() => {
    if (radioPlaying) {
      radioAudioRef.current?.pause();
      setRadioPlaying(false);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingKey(null); }
      const station = QURAN_RADIO_STATIONS[radioStationIdx];
      if (!station) return;
      if (!radioAudioRef.current || radioAudioRef.current.src !== station.url) {
        if (radioAudioRef.current) radioAudioRef.current.pause();
        radioAudioRef.current = new Audio(station.url);
        radioAudioRef.current.onerror = () => { toast.error("تعذر تشغيل الراديو"); setRadioPlaying(false); };
      }
      radioAudioRef.current.play()
        .then(() => setRadioPlaying(true))
        .catch(() => { toast.error("تعذر تشغيل الراديو"); setRadioPlaying(false); });
    }
  }, [radioPlaying, radioStationIdx]);

  const selectRadioStation = React.useCallback((idx: number) => {
    setRadioStationIdx(idx);
    if (radioAudioRef.current) { radioAudioRef.current.pause(); radioAudioRef.current = null; }
    setRadioPlaying(false);
  }, []);
  React.useEffect(() => () => { radioAudioRef.current?.pause(); }, []);

  // A5: Sleep timer
  const activateSleepTimer = React.useCallback((minutes: number) => {
    if (sleepTimerRef.current) { clearInterval(sleepTimerRef.current); sleepTimerRef.current = null; }
    if (minutes === 0) { setSleepMinutes(0); setSleepRemaining(0); return; }
    setSleepMinutes(minutes);
    setSleepRemaining(minutes * 60);
    sleepTimerRef.current = setInterval(() => {
      setSleepRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(sleepTimerRef.current!);
          sleepTimerRef.current = null;
          setSleepMinutes(0);
          audioPlayRef.current.active = false;
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          setPlayingKey(null);
          radioAudioRef.current?.pause();
          setRadioPlaying(false);
          toast.success("🌙 انتهى مؤقت النوم — تم إيقاف التلاوة");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);
  React.useEffect(() => () => { if (sleepTimerRef.current) clearInterval(sleepTimerRef.current); }, []);

  // A6: Initialize / update AudioContext + EQ filter nodes
  React.useEffect(() => {
    eqEnabledRef.current = eqEnabled;
    if (!eqEnabled) return;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf"; bass.frequency.value = 100; bass.gain.value = bassGain;
      const treble = ctx.createBiquadFilter();
      treble.type = "highshelf"; treble.frequency.value = 3000; treble.gain.value = trebleGain;
      bass.connect(treble); treble.connect(ctx.destination);
      audioCtxRef.current = ctx; bassNodeRef.current = bass; trebleNodeRef.current = treble;
    } else {
      if (bassNodeRef.current) bassNodeRef.current.gain.value = bassGain;
      if (trebleNodeRef.current) trebleNodeRef.current.gain.value = trebleGain;
    }
  }, [eqEnabled, bassGain, trebleGain]);
  React.useEffect(() => () => { audioCtxRef.current?.close().catch(() => {}); }, []);

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
      data-mushaf-theme={prefs.quranTheme}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
    >
      {/* ── Top chrome bar ───────────────────────────────── */}
      <div
        className={`mushaf-chrome-top${showChrome || !!selectedItem ? "" : " chrome-hidden"}`}
        onClick={flashChrome}
      >
        {/* Q19: Reading progress bar */}
        <div className="mushaf-progress-strip" aria-hidden="true">
          <div className="mushaf-progress-fill" style={{ width: `${(currentPage / totalPages) * 100}%` }} />
        </div>
        <button
          className="mushaf-chrome-icon-btn"
          onClick={(e) => { e.stopPropagation(); navigate("/quran"); }}
          aria-label="رجوع إلى القرآن"
        >
          <ArrowRight size={18} />
        </button>
        <div className="mushaf-chrome-info" onClick={(e) => e.stopPropagation()}>
          <div className="mushaf-chrome-surah-name">{pageSurahName || pageSurahEnglish}</div>
          <div className="mushaf-chrome-meta">صفحة {toArabicNumeral(currentPage)} · الجزء {toArabicNumeral(pageJuz)}</div>
        </div>
        {/* Phase 2B: Tajweed color toggle */}
        <button
          className={`mushaf-chrome-icon-btn${tajweedMode ? " active" : ""}`}
          title="تلوين التجويد"
          aria-label="تجويد"
          onClick={(e) => { e.stopPropagation(); setTajweedMode((v) => !v); }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "system-ui" }}>ت</span>
        </button>
        {/* Settings */}
        <button
          className={`mushaf-chrome-icon-btn${showSettings ? " active" : ""}`}
          title="إعدادات"
          aria-label="إعدادات"
          onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
        >
          <Settings size={16} />
        </button>
        {/* More actions */}
        <button
          className={`mushaf-chrome-icon-btn${showMoreSheet ? " active" : ""}`}
          title="المزيد"
          aria-label="المزيد"
          onClick={(e) => { e.stopPropagation(); setShowMoreSheet((v) => !v); }}
        >
          <MoreVertical size={17} />
        </button>
      </div>

      {/* ── Q17: In-page search bar ───────────────────────── */}
      {showSearch && (
        <div className="mushaf-search-bar" onClick={(e) => e.stopPropagation()}>
          <Search size={14} className="shrink-0 opacity-50" />
          <input
            type="text"
            value={inPageSearch}
            onChange={(e) => setInPageSearch(e.target.value)}
            placeholder="بحث في الصفحة…"
            className="flex-1 bg-transparent outline-none text-sm"
            autoFocus
            dir="rtl"
          />
          {inPageSearch && (
            <span className="text-[11px] opacity-45 shrink-0">
              {playableItems.filter((i) => stripDiacritics(i.text).includes(normalizedSearch)).length} نتيجة
            </span>
          )}
          <button
            className="mushaf-chrome-icon-btn"
            onClick={() => { setInPageSearch(""); setShowSearch(false); }}
            aria-label="إغلاق البحث"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Q9: Memorization mode banner */}
      {memorizationMode && (
        <div className="mushaf-mem-banner" onClick={(e) => e.stopPropagation()}>
          <span>🧠 وضع الحفظ · اضغط على الآية لكشفها</span>
          <span className="mushaf-mem-counter">
            {revealedItems.size}/{playableItems.length}
          </span>
          <button
            className="mushaf-mem-btn"
            onClick={() => setRevealedItems(new Set(playableItems.map((i) => `${i.surahId}:${i.displayAyah}`)))}
          >إظهار الكل</button>
          <button
            className="mushaf-mem-btn"
            onClick={() => setRevealedItems(new Set())}
          >إخفاء الكل</button>
        </div>
      )}

      {/* ── M6: Juz / Hizb overlay chip ─────────────────── */}
      {juzOverlay && (
        <div className="mushaf-juz-overlay" aria-live="polite">{juzOverlay}</div>
      )}

      {/* ── A5: Sleep timer countdown chip ───────────────── */}
      {sleepMinutes > 0 && (
        <div className="mushaf-sleep-chip" onClick={() => activateSleepTimer(0)} title="انقر للإلغاء">
          <Timer size={11} />
          <span>{Math.floor(sleepRemaining / 60)}:{String(sleepRemaining % 60).padStart(2, "0")}</span>
        </div>
      )}

      {/* ── Scrollable page area ─────────────────────────── */}
      <div
        className="mushaf-page-area"
        onClick={() => { setSelectedItem(null); flashChrome(); }}
      >
        <div
          className={`mushaf-page-content${pageTransDir ? " page-sliding" : ""}`}
          dir="rtl"
          style={{ "--mushaf-font-scale": fontScale, ...(pageTransDir ? { "--mushaf-slide-dir": pageTransDir === "left" ? "-1" : "1" } : {}) } as React.CSSProperties}
        >
          {/* Always-visible tiny strip */}
          <div className="mushaf-page-info-strip">
            <span>{pageSurahName}</span>
            {memorizationMode ? <span>وضع الحفظ</span> : null}
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
                    // Q20: Last-read ring
                    const isLastRead = lastRead?.surahId === item.surahId && lastRead?.ayahIndex === item.displayAyah;
                    // Q18: Sujood badge
                    const isSajda = SAJDA_AYAHS.has(`${item.surahId}:${item.displayAyah}`);
                    // Q9: Memorization mode per-ayah reveal
                    const isRevealed = !memorizationMode || revealedItems.has(k);
                    // Q17: Search match highlight
                    const isSearchMatch = normalizedSearch ? stripDiacritics(item.text).includes(normalizedSearch) : false;
                    // Q3: Translation text
                    const transText = showTranslation ? (translationData[item.surahId]?.[item.originalAyah] ?? "") : "";
                    // Q11-B: Inline tafseer text
                    const tafseerText = inlineTafseer ? (inlineTafseerData[item.surahId]?.[item.originalAyah] ?? "") : "";
                    // Phase 2B: Word-by-word data for Tajweed mode
                    const wbwVerse = tajweedMode ? (wbwData[item.surahId]?.[item.originalAyah] ?? null) : null;
                    // M1: Real-time playing highlight
                    const isPlaying = playingKey === k;

                    const ayahSpan = (
                      <span
                        key={k}
                        ref={isPlaying ? (el: HTMLSpanElement | null) => { playingSpanRef.current = el; } : undefined}
                        className={`mushaf-ayah-span${isSel ? " selected" : ""}${hl ? ` hl-${hl}` : ""}${memorizationMode && !isRevealed ? " mem-hidden" : ""}${isSearchMatch ? " search-match" : ""}${isPlaying ? " playing" : ""}`}
                        style={{
                          // Q16: Focus dimming
                          opacity: selectedItem && !isSel ? 0.3 : 1,
                          transition: "opacity 0.18s",
                          ...(hl && !isSel ? { background: HL_COLORS[hl].bg } : {}),
                        }}
                        onPointerDown={(e) => handlePointerDown(e, item)}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onClick={(e) => {
                          if (longPressFired.current) { longPressFired.current = false; return; }
                          handleAyahTap(e, item);
                        }}
                      >
                        {/* Phase 2B: Tajweed coloring OR plain text */}
                        {wbwVerse && tajweedMode ? (
                          wbwVerse.map((word, wi) => (
                            <React.Fragment key={wi}>{renderTajweed(word.tj)}{" "}</React.Fragment>
                          ))
                        ) : (
                          item.text
                        )}
                        {tajweedMode && wbwLoading && !wbwVerse ? (
                          <span className="mushaf-wbw-loading">⋯</span>
                        ) : null}
                        {"\u200F"}
                        <span className={`mushaf-ayah-num${isBookmarked ? " bookmarked" : ""}${isLastRead ? " last-read" : ""}`}>
                          ﴿{toArabicNumeral(item.displayAyah)}﴾
                        </span>
                        {isSajda && <span className="mushaf-sajda-badge" title="سجدة تلاوة">ۖ</span>}
                        {" "}
                        {/* Q3: Inline translation (only show if wbw mode is off) */}
                        {!wbwVerse && transText ? (
                          <span className="mushaf-trans-inline" dir="ltr">{transText}</span>
                        ) : null}
                      </span>
                    );

                    // Q11-B: When inline tafseer is on, wrap ayah in block layout with tafseer below
                    if (inlineTafseer) {
                      return (
                        <div key={k} className="w-full mb-3">
                          {ayahSpan}
                          <div
                            className="block w-full mt-1.5 rounded-2xl px-4 py-3 text-sm leading-8 arabic-text text-right"
                            dir="rtl"
                            style={{
                              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent) 0%, color-mix(in srgb, var(--accent) 3%, transparent) 100%)",
                              borderRight: "3px solid",
                              borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                              borderLeft: "none",
                              borderTop: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)",
                              borderBottom: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)",
                            }}
                          >
                            {inlineTafseerLoading && !tafseerText ? (
                              <span className="flex items-center gap-2 justify-center py-1 opacity-40 text-xs">
                                <span className="w-3 h-3 border border-white/30 border-t-[var(--accent)] rounded-full animate-spin inline-block" />
                                جارٍ تحميل التفسير…
                              </span>
                            ) : tafseerText ? (
                              <>
                                <span className="block text-[10px] font-semibold mb-1 opacity-40" style={{ color: "var(--accent)" }}>
                                  {inlineTafseerSource === "muyassar" ? "✦ التفسير الميسر" : "✦ تفسير الجلالين"}
                                </span>
                                <span className="opacity-85">{tafseerText}</span>
                              </>
                            ) : (
                              <span className="opacity-30 text-xs">لم يُحمَّل التفسير بعد</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return ayahSpan;
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
          <button
            className={`mushaf-action-btn${loopEnabled ? " active" : ""}`}
            onClick={() => setLoopEnabled((v) => !v)}
            title="تكرار الآية"
          >
            <Repeat2 size={18} />
            <span>تكرار</span>
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
          {/* Q11: Inline tafsir */}
          <button
            className="mushaf-action-btn"
            title="تفسير"
            onClick={(e) => { e.stopPropagation(); setTafsirItem(selectedItem); setSelectedItem(null); }}
          >
            <ArrowUpRight size={18} />
            <span>تفسير</span>
          </button>
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
              else if (firstPlayableItem) playAyah(firstPlayableItem.surahId, firstPlayableItem.originalAyah, firstPlayableItem.displayAyah);
            }}
            aria-label={playingKey ? "إيقاف التلاوة" : "تشغيل التلاوة"}
          >
            {playingKey ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            className="mushaf-audio-reciter mushaf-audio-reciter-btn"
            onClick={() => setShowReciterSheet(true)}
            aria-label="اختيار القارئ"
          >
            <Mic2 size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
            <span>
              {playingKey
                ? `▶ يُشغَّل · آية ${playingKey.split(":")[1] ?? ""}`
                : (QURAN_RECITERS.find((r) => r.id === (prefs.quranReciter ?? "Alafasy_128kbps"))?.label ?? "مشاري العفاسي")}
            </span>
            <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
          </button>
          <button
            className="mushaf-audio-toggle"
            onClick={() => setAudioBarVisible(false)}
            aria-label="إخفاء"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Reciter picker sheet ─────────────────────────── */}
      {showReciterSheet && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowReciterSheet(false)} />
          <div className="mushaf-jump-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="mushaf-sheet-title">اختر القارئ</div>
            <div className="mushaf-reciter-grid">
              {QURAN_RECITERS.map((r) => (
                <button
                  key={r.id}
                  className={`mushaf-reciter-chip${(prefs.quranReciter ?? "Alafasy_128kbps") === r.id ? " active" : ""}`}
                  onClick={() => {
                    setPrefs({ quranReciter: r.id });
                    if (playingKey && audioRef.current) {
                      audioRef.current.pause();
                      setPlayingKey(null);
                    }
                    setShowReciterSheet(false);
                  }}
                >
                  <Mic2 size={14} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </>
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

      {/* ── Page jump sheet (M5: Dial wheel) ────────────── */}
      {showJump && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowJump(false)} />
          <div className="mushaf-jump-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="mushaf-sheet-title">الانتقال إلى صفحة</div>
            <DialWheel
              current={currentPage}
              total={totalPages}
              onConfirm={(p) => { goPage(p); setShowJump(false); }}
            />
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
              rows={5}
              autoFocus
              className="mushaf-textarea"
            />
            <div className="flex items-center justify-between mt-1 mb-2 px-1">
              <span className="text-[10px] opacity-30">{noteDraft.length} حرف</span>
            </div>
            <div className="flex gap-2 mt-1">
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

      {/* ── Q11: Inline tafsir sheet ────────────────────── */}
      {tafsirItem && (
        <>
          <div className="mushaf-overlay" onClick={() => setTafsirItem(null)} />
          {/* zIndex must be > overlay (210) — do NOT set lower */}
          <div
            className="mushaf-note-sheet"
            style={{ maxHeight: "78vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Drag-to-dismiss handle */}
            <div
              className="mushaf-sheet-handle"
              style={{ cursor: "grab", touchAction: "none", padding: "8px 0", marginBottom: 0 }}
              onPointerDown={(e) => {
                const handle = e.currentTarget as HTMLDivElement;
                const sheet = handle.parentElement as HTMLDivElement;
                const startY = e.clientY;
                let dy = 0;
                handle.setPointerCapture(e.pointerId);
                handle.style.cursor = "grabbing";
                const onMove = (ev: PointerEvent) => {
                  dy = Math.max(0, ev.clientY - startY);
                  sheet.style.transform = `translateY(${dy}px)`;
                  sheet.style.transition = "none";
                };
                const onUp = () => {
                  handle.removeEventListener("pointermove", onMove as EventListener);
                  handle.removeEventListener("pointerup", onUp);
                  handle.style.cursor = "grab";
                  if (dy > 90) {
                    sheet.style.transition = "transform 0.22s ease-in";
                    sheet.style.transform = "translateY(110%)";
                    setTimeout(() => setTafsirItem(null), 210);
                  } else {
                    sheet.style.transition = "transform 0.28s cubic-bezier(.34,1.56,.64,1)";
                    sheet.style.transform = "";
                    setTimeout(() => { sheet.style.transition = ""; }, 320);
                  }
                };
                handle.addEventListener("pointermove", onMove as EventListener);
                handle.addEventListener("pointerup", onUp);
              }}
            />

            {/* Header row */}
            <div className="flex items-center justify-between mb-3 mt-1">
              <span className="mushaf-sheet-title flex items-center gap-1.5">
                <span style={{ color: "var(--accent)" }}>📖</span>
                <span>تفسير ﴿{toArabicNumeral(tafsirItem.displayAyah)}﴾</span>
                <span className="opacity-40 text-xs font-normal">· {tafsirItem.surahName}</span>
              </span>
              <div className="flex items-center gap-1">
                {/* Copy button */}
                <button
                  className="mushaf-icon-close"
                  title="نسخ"
                  aria-label="نسخ"
                  onClick={() => {
                    const ayahTxt = `${tafsirItem.text} ﴿${tafsirItem.displayAyah}﴾`;
                    const tafseerTxt = inlineTafseerData[tafsirItem.surahId]?.[tafsirItem.originalAyah] ?? "";
                    const src = inlineTafseerSource === "muyassar" ? "التفسير الميسر" : "تفسير الجلالين";
                    navigator.clipboard.writeText(`${ayahTxt}\n\n${src}:\n${tafseerTxt}`).then(() => toast.success("تم النسخ ✓")).catch(() => {});
                  }}
                >
                  <Copy size={15} />
                </button>
                <button className="mushaf-icon-close" onClick={() => setTafsirItem(null)} aria-label="إغلاق">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Ayah text */}
            <div
              className="arabic-text text-lg leading-10 mb-3 text-center p-3 rounded-2xl border"
              dir="rtl"
              style={{
                background: "color-mix(in srgb, var(--accent) 6%, transparent)",
                borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
              }}
            >
              {tafsirItem.text}
              <span className="opacity-45 mr-1">﴿{toArabicNumeral(tafsirItem.displayAyah)}﴾</span>
            </div>

            {/* Source tabs */}
            <div className="flex gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 mb-3">
              {(["muyassar", "jalalayn"] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setInlineTafseerSource(src)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                    inlineTafseerSource === src
                      ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                      : "opacity-55 hover:opacity-80"
                  }`}
                >
                  {src === "muyassar" ? "التفسير الميسر" : "تفسير الجلالين"}
                </button>
              ))}
            </div>

            {/* Tafseer body */}
            <div
              className="text-sm leading-8 arabic-text p-4 rounded-2xl border mb-4 flex-1"
              dir="rtl"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 7%, transparent) 0%, color-mix(in srgb, var(--accent) 2%, transparent) 100%)",
                borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
              }}
            >
              {inlineTafseerLoading && !inlineTafseerData[tafsirItem.surahId]?.[tafsirItem.originalAyah] ? (
                <span className="flex items-center gap-2 justify-center py-3 opacity-40 text-xs">
                  <span className="w-3 h-3 border border-white/30 border-t-[var(--accent)] rounded-full animate-spin inline-block" />
                  جارٍ تحميل التفسير…
                </span>
              ) : inlineTafseerData[tafsirItem.surahId]?.[tafsirItem.originalAyah] ? (
                <p className="opacity-90 leading-8">{inlineTafseerData[tafsirItem.surahId][tafsirItem.originalAyah]}</p>
              ) : (
                <span className="opacity-35 text-xs">لا يوجد تفسير لهذه الآية</span>
              )}
            </div>

            {/* External reference links */}
            <div className="flex flex-wrap gap-2 pb-1">
              {[
                { label: "ابن كثير", href: `https://quran.ksu.edu.sa/tafseer/katheer/sura${tafsirItem.surahId}-aya${tafsirItem.displayAyah}.html#katheer` },
                { label: "الطبري", href: `https://tafsir.app/tabari/${tafsirItem.surahId}/${tafsirItem.displayAyah}` },
                { label: "القرطبي", href: `https://tafsir.app/qurtubi/${tafsirItem.surahId}/${tafsirItem.displayAyah}` },
                { label: "السعدي", href: `https://tafsir.app/saadi/${tafsirItem.surahId}/${tafsirItem.displayAyah}` },
                { label: "البغوي", href: `https://tafsir.app/baghawi/${tafsirItem.surahId}/${tafsirItem.displayAyah}` },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs opacity-55 hover:opacity-90 active:opacity-90 transition px-3 py-1.5 rounded-xl border"
                  style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowUpRight size={11} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Settings sheet ──────────────────────────────── */}
      {showSettings && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowSettings(false)} />
          <div className="mushaf-jump-sheet" style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <span className="mushaf-sheet-title">إعدادات القراءة</span>
              <button className="mushaf-icon-close" onClick={() => setShowSettings(false)}><X size={16} /></button>
            </div>
            {/* Font scale */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs opacity-55 shrink-0">الخط</span>
              <button className="mushaf-btn-secondary" onClick={() => bumpFont(-0.1)}><ZoomOut size={14} /></button>
              <span className="text-xs opacity-60 tabular-nums w-8 text-center">{Math.round(fontScale * 100)}%</span>
              <button className="mushaf-btn-secondary" onClick={() => bumpFont(0.1)}><ZoomIn size={14} /></button>
            </div>
            {/* Q3: Translation */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs opacity-65">الترجمة الإنجليزية</span>
              <button
                onClick={() => setShowTranslation((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${showTranslation ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}
                role="switch" aria-checked={showTranslation}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${showTranslation ? "right-1" : "right-7"}`} />
              </button>
            </div>

            {/* Phase 2B: Tajweed color coding */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs opacity-65">تلوين التجويد</div>
                <div className="text-[10px] opacity-40">تلوين الكلمات بألوان أحكام التجويد</div>
              </div>
              <button
                onClick={() => setTajweedMode((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${tajweedMode ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}
                role="switch" aria-checked={tajweedMode}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${tajweedMode ? "right-1" : "right-7"}`} />
              </button>
            </div>

            {/* Q11-B: Inline Tafseer */}
            <div className="mb-3 p-3 rounded-2xl border"
              style={{
                background: inlineTafseer ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "rgba(255,255,255,0.03)",
                borderColor: inlineTafseer ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📖</span>
                  <div>
                    <div className="text-xs font-semibold" style={inlineTafseer ? { color: "var(--accent)" } : {}}>عرض التفسير</div>
                    <div className="text-[10px] opacity-45">تفسير تحت كل آية</div>
                  </div>
                </div>
                <button
                  onClick={() => setInlineTafseer((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${inlineTafseer ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}
                  role="switch" aria-checked={inlineTafseer}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${inlineTafseer ? "right-1" : "right-7"}`} />
                </button>
              </div>
              {inlineTafseer && (
                <div className="flex gap-1.5 p-1 rounded-xl bg-black/20 border border-white/8">
                  {(["muyassar", "jalalayn"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setInlineTafseerSource(src)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                        inlineTafseerSource === src
                          ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                          : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      {src === "muyassar" ? "الميسر" : "الجلالين"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reciter */}
            <button className="mushaf-btn-secondary w-full mb-3" onClick={() => { setShowSettings(false); setShowReciterSheet(true); }}>
              <Mic2 size={14} />
              {QURAN_RECITERS.find((r) => r.id === (prefs.quranReciter ?? "Alafasy_128kbps"))?.label ?? "مشاري العفاسي"}
            </button>
            {/* Q7: Playback speed */}
            <div className="mb-3">
              <div className="text-xs opacity-50 mb-1.5">سرعة التلاوة</div>
              <div className="flex gap-1 flex-wrap">
                {([0.75, 1, 1.25, 1.5, 2] as number[]).map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setPlaybackSpeed(sp)}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${playbackSpeed === sp ? "bg-[var(--accent)]/20 border-[var(--accent)]/30 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-65"}`}
                  >{sp}×</button>
                ))}
              </div>
            </div>
            {/* Q4: Loop count */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs opacity-50">تكرار الآية</span>
                <button
                  onClick={() => setLoopEnabled((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${loopEnabled ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}
                  role="switch" aria-checked={loopEnabled}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${loopEnabled ? "right-1" : "right-7"}`} />
                </button>
              </div>
              {loopEnabled && (
                <div className="flex gap-1 flex-wrap">
                  {([2, 3, 5, 7, 10, -1] as number[]).map((n) => (
                    <button
                      key={n}
                      onClick={() => setLoopCount(n)}
                      className={`px-2.5 py-1 rounded-xl text-xs border transition ${loopCount === n ? "bg-[var(--accent)]/20 border-[var(--accent)]/30 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-65"}`}
                    >{n === -1 ? "∞" : `${n}×`}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Q8: Auto-advance */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs opacity-65">تقدم تلقائي للآية التالية</span>
              <button
                onClick={() => setAutoAdvance((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${autoAdvance ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}
                role="switch" aria-checked={autoAdvance}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${autoAdvance ? "right-1" : "right-7"}`} />
              </button>
            </div>
            {/* Q5: Range loop */}
            {autoAdvance && (
              <div className="mb-3 p-3 rounded-2xl bg-white/4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs opacity-65">تكرار نطاق</span>
                  <button
                    onClick={() => {
                      const on = !loopRange;
                      setLoopRange(on);
                      if (on) { setLoopRangeStartIdx(0); setLoopRangeEndIdx(Math.max(0, playableItems.length - 1)); }
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${loopRange ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}
                    role="switch" aria-checked={loopRange}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${loopRange ? "right-1" : "right-7"}`} />
                  </button>
                </div>
                {loopRange && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] opacity-45 shrink-0">من</span>
                    <input type="number" min={0} max={playableItems.length - 1} value={loopRangeStartIdx}
                      onChange={(e) => setLoopRangeStartIdx(Math.max(0, Math.min(playableItems.length - 1, Number(e.target.value))))}
                      className="w-12 rounded-xl bg-white/6 border border-white/10 px-1.5 py-1 text-xs text-center" />
                    <span className="text-[11px] opacity-45 shrink-0">إلى</span>
                    <input type="number" min={loopRangeStartIdx} max={playableItems.length - 1} value={loopRangeEndIdx}
                      onChange={(e) => setLoopRangeEndIdx(Math.max(loopRangeStartIdx, Math.min(playableItems.length - 1, Number(e.target.value))))}
                      className="w-12 rounded-xl bg-white/6 border border-white/10 px-1.5 py-1 text-xs text-center" />
                    <span className="text-[11px] opacity-35 shrink-0">/ {playableItems.length}</span>
                  </div>
                )}
              </div>
            )}
            {/* Q15: Surah info */}
            <div className="mt-1">
              <button
                onClick={() => setShowSurahInfo((v) => !v)}
                className="flex items-center gap-1.5 text-xs opacity-55 hover:opacity-90 transition mb-2"
              >
                <Info size={13} />
                <span>معلومات السورة</span>
              </button>
              {showSurahInfo && lastItem && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/4 border border-white/8 text-center text-sm">
                  {[
                    ["السورة", lastItem.surahName],
                    ["الاسم بالإنجليزية", pageSurahEnglish || ""],
                    ["النوع", getSurahRevelationLabel(lastItem.surahId)],
                    ["الجزء", String(getSurahJuz(lastItem.surahId))],
                    ["رقم السورة", String(lastItem.surahId)],
                    ["الصفحة", String(currentPage)],
                    ["من أصل", String(totalPages)],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div className="text-[11px] opacity-50 mb-1">{label}</div>
                      <div className="font-semibold text-xs arabic-text">{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── M3: Page theme ─────────────────────────── */}
            <div className="mt-3 mb-3">
              <div className="text-xs opacity-50 mb-1.5">لون صفحة المصحف</div>
              <div className="flex gap-1 flex-wrap">
                {(["default", "sepia", "midnight", "parchment"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    className={`text-[10px] px-2.5 py-1.5 rounded-xl border transition ${prefs.quranTheme === t ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-65"}`}
                  >{{ default: "🌑 افتراضي", sepia: "🟫 سيبيا", midnight: "🌙 ليلي", parchment: "📜 رق" }[t]}</button>
                ))}
              </div>
            </div>

            {/* ── A2: Download page audio for offline ─────── */}
            <div className="mb-3">
              <button
                className="mushaf-btn-secondary w-full flex items-center gap-2 justify-center"
                onClick={downloadPageAudio}
                disabled={!!cacheProgress}
              >
                <Download size={14} />
                {cacheProgress
                  ? `جاري التحميل… ${cacheProgress.done}/${cacheProgress.total}`
                  : "تحميل الصفحة للاستماع دون إنترنت"}
              </button>
            </div>

            {/* ── A5: Sleep timer ──────────────────────────── */}
            <div className="mb-3">
              <div className="text-xs opacity-50 mb-1.5 flex items-center gap-1">
                <Timer size={12} />
                مؤقت النوم
                {sleepMinutes > 0 && (
                  <span className="text-[10px] text-[var(--accent)] mr-1">{Math.floor(sleepRemaining / 60)}:{String(sleepRemaining % 60).padStart(2, "0")}</span>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                {([0, 15, 30, 45, 60, 90] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => activateSleepTimer(m)}
                    className={`text-[10px] px-2.5 py-1.5 rounded-xl border transition ${sleepMinutes === m ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-65"}`}
                  >{m === 0 ? "إيقاف" : `${m} د`}</button>
                ))}
              </div>
            </div>

            {/* ── A4: Quran Radio ──────────────────────────── */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs opacity-50 flex items-center gap-1"><Radio size={12} />راديو القرآن</span>
                <button
                  onClick={toggleRadio}
                  className={`px-2.5 py-1 rounded-xl text-xs border transition ${radioPlaying ? "bg-[var(--accent)]/20 border-[var(--accent)]/30 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-65"}`}
                >{radioPlaying ? "⏹ إيقاف" : "▶ تشغيل"}</button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {QURAN_RADIO_STATIONS.map((st, i) => (
                  <button
                    key={i}
                    onClick={() => selectRadioStation(i)}
                    className={`text-[10px] px-2 py-1 rounded-xl border transition ${radioStationIdx === i ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 text-[var(--accent)]" : "bg-white/6 border-white/10 opacity-65"}`}
                  >{st.label}</button>
                ))}
              </div>
            </div>

            {/* ── A6: Equalizer (Web Audio) ─────────────── */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs opacity-50 flex items-center gap-1"><SlidersHorizontal size={12} />المعادل الصوتي</span>
                <button
                  onClick={() => setEqEnabled((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${eqEnabled ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}
                  role="switch" aria-checked={eqEnabled}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${eqEnabled ? "right-1" : "right-7"}`} />
                </button>
              </div>
              {eqEnabled && (
                <div className="space-y-2 p-3 rounded-2xl bg-white/4 border border-white/8">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] opacity-50 w-10 shrink-0">باس</span>
                    <input type="range" min={-12} max={12} step={1} value={bassGain}
                      onChange={(e) => setBassGain(Number(e.target.value))}
                      className="flex-1 h-1 accent-[var(--accent)]" />
                    <span className="text-[11px] opacity-50 w-8 text-left tabular-nums">{bassGain > 0 ? "+" : ""}{bassGain}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] opacity-50 w-10 shrink-0">تريبل</span>
                    <input type="range" min={-12} max={12} step={1} value={trebleGain}
                      onChange={(e) => setTrebleGain(Number(e.target.value))}
                      className="flex-1 h-1 accent-[var(--accent)]" />
                    <span className="text-[11px] opacity-50 w-8 text-left tabular-nums">{trebleGain > 0 ? "+" : ""}{trebleGain}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── More actions sheet ──────────────────────────── */}
      {showMoreSheet && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowMoreSheet(false)} />
          <div className="mushaf-jump-sheet" style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <span className="mushaf-sheet-title">الإجراءات السريعة</span>
              <button className="mushaf-icon-close" onClick={() => setShowMoreSheet(false)}><X size={16} /></button>
            </div>

            {/* ── سجّل ورد اليوم — only when khatma plan active ── */}
            {khatmaStartISO && (
              <button
                className="w-full flex items-center gap-3 rounded-2xl p-3.5 mb-4 text-right transition active:scale-[0.98]"
                style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}
                onClick={() => {
                  const d = new Date();
                  const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                  setKhatmaDone(iso, true);
                  recordQuranRead(playableItems.length);
                  setShowMoreSheet(false);
                  toast.success("✓ سُجِّل ورد اليوم 🌟");
                }}
              >
                <span className="text-2xl">📅</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>سجّل ورد اليوم</div>
                  <div className="text-[11px] opacity-55">تحديد اليوم كمكتمل في خطة الختمة</div>
                </div>
              </button>
            )}

            {/* ── Toggle rows ── */}
            {([
              { label: "بحث في الصفحة", sub: "ابحث داخل آيات الصفحة الحالية", icon: <Search size={16} />, active: showSearch,
                onPress: () => { setShowSearch((v) => !v); if (showSearch) setInPageSearch(""); setShowMoreSheet(false); } },
              { label: "الترجمة الإنجليزية", sub: "ترجمة Sahih International", icon: <Languages size={16} />, active: showTranslation,
                onPress: () => { setShowTranslation((v) => !v); setShowMoreSheet(false); } },
              { label: memorizationMode ? "إيقاف وضع الحفظ" : "وضع الحفظ", sub: "اختبر حفظك آية بآية", icon: memorizationMode ? <EyeOff size={16} /> : <Eye size={16} />, active: memorizationMode,
                onPress: () => { setMemorizationMode((v) => { if (v) setRevealedItems(new Set()); return !v; }); flashChrome(); setShowMoreSheet(false); } },
            ] as Array<{ label: string; sub: string; icon: React.ReactNode; active: boolean; onPress: () => void }>).map(({ label, sub, icon, active, onPress }) => (
              <button
                key={label}
                className="w-full flex items-center justify-between gap-3 py-3.5 px-1 border-b transition"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
                onClick={onPress}
              >
                <div className="flex items-center gap-3">
                  <span className="opacity-55">{icon}</span>
                  <div className="text-right">
                    <div className="text-sm">{label}</div>
                    <div className="text-[10px] opacity-40">{sub}</div>
                  </div>
                </div>
                <div className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${active ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${active ? "right-1" : "right-7"}`} />
                </div>
              </button>
            ))}

            {/* ── Font size ── */}
            <div className="flex items-center justify-between py-3.5 px-1 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3">
                <span className="opacity-55"><ZoomIn size={16} /></span>
                <div className="text-right">
                  <div className="text-sm">حجم الخط</div>
                  <div className="text-[10px] opacity-40">{Math.round(fontScale * 100)}٪</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="mushaf-btn-secondary !px-2.5 !py-1.5" onClick={(e) => { e.stopPropagation(); bumpFont(-0.1); }}><ZoomOut size={14} /></button>
                <button className="mushaf-btn-secondary !px-2.5 !py-1.5" onClick={(e) => { e.stopPropagation(); bumpFont(0.1); }}><ZoomIn size={14} /></button>
              </div>
            </div>

            {/* ── Mark page reviewed ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
              onClick={() => { markPageReviewed(); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><CheckCircle2 size={16} /></span>
              <div>
                <div className="text-sm">حفظ مراجعة الصفحة</div>
                <div className="text-[10px] opacity-40">تسجيل قراءة جميع آيات هذه الصفحة</div>
              </div>
            </button>

            {/* ── Jump to page ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
              onClick={() => { setShowJump(true); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><MoreVertical size={16} /></span>
              <div>
                <div className="text-sm">الانتقال إلى صفحة</div>
                <div className="text-[10px] opacity-40">الصفحة {currentPage} من {totalPages}</div>
              </div>
            </button>

            {/* ── Keyboard shortcuts ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
              onClick={() => { setShowShortcuts(true); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><HelpCircle size={16} /></span>
              <div>
                <div className="text-sm">اختصارات لوحة المفاتيح</div>
                <div className="text-[10px] opacity-40">عرض جميع الاختصارات المتاحة</div>
              </div>
            </button>

            {/* ── Reading plans ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 text-right transition"
              onClick={() => { setShowMoreSheet(false); navigate("/quran/plans"); }}
            >
              <span className="opacity-55 text-lg">📅</span>
              <div>
                <div className="text-sm">خطط التلاوة</div>
                <div className="text-[10px] opacity-40">إدارة ورد الختمة والمراجعة اليومية</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── Q21: Keyboard shortcuts modal ──────────────── */}
      {showShortcuts && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowShortcuts(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[90vw] max-w-sm"
            style={{ background: "var(--glass-bg,rgba(18,22,30,0.95))", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}
            onClick={(e) => e.stopPropagation()} dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold opacity-80">اختصارات لوحة المفاتيح</span>
              <button className="mushaf-icon-close" onClick={() => setShowShortcuts(false)}><X size={14} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {([
                ["←", "الصفحة التالية"],
                ["→", "الصفحة السابقة"],
                ["m", "وضع الحفظ"],
                ["t", "عرض الترجمة"],
                ["/", "بحث في الصفحة"],
                ["s", "إعدادات"],
                ["?", "هذه القائمة"],
                ["Esc", "إغلاق / رجوع"],
              ] as [string, string][]).map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-3 opacity-80">
                  <kbd className="px-2 py-0.5 rounded-lg bg-white/10 text-xs font-mono shrink-0">{key}</kbd>
                  <span className="text-xs flex-1 text-right">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
