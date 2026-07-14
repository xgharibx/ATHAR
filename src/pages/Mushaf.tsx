import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Bookmark, MoreVertical, Play, Pause,
  ChevronDown, Copy, Share2, VolumeX, Volume2, X, Pencil,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Mic2, Repeat2,
  Eye, EyeOff, CheckCircle2, Languages, Search, WholeWord,
  ArrowUpRight, Settings, Info, Shuffle,
  Radio, Timer, Download, SlidersHorizontal,
  Image as ImageIcon, Sparkles,
} from "lucide-react";
import { useQuranDB } from "@/data/useQuranDB";
import { useQuranPageMap } from "@/data/useQuranPageMap";
import { useQuranPageIndex } from "@/data/useQuranPageIndex";
import { buildPageIndexForCache } from "@/data/pageIndexBuilder";
import { useNoorStore } from "@/store/noorStore";
import { getHizbForAyah, getJuzForAyah, getSurahJuz, getSurahRevelationLabel, toArabicNumeral } from "@/lib/quranMeta";
import { stripDiacritics, normalizeArabicSearch } from "@/lib/arabic";
import type { TranslationId } from "@/lib/quranTranslations";
import {
  TRANSLATION_SOURCES,
  getTranslationForAyah,
  loadTranslationForSurahs,
} from "@/lib/quranTranslations";
import { QURAN_RECITERS } from "@/lib/quranReciters";
import {
  getRadioState,
  playRadio,
  QURAN_RADIO_STATIONS,
  selectRadioStation,
  stopRadio,
  subscribeRadio,
  toggleRadio as toggleSharedRadio,
} from "@/lib/radioPlayer";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import { downloadAllWbwSurahs, loadWbwSurah, renderTajweed, type WbwSurah } from "@/lib/quranWBW";
import { loadMuyassarCache } from "@/lib/tafseerLocal";
import { FloatingAthar } from "@/components/companion/FloatingAthar";
import { CompanionModal } from "@/components/companion/CompanionModal";
import { TAFSIR_EDITIONS, getTafsirLabel, loadTafsirSurah } from "@/lib/tafsirEditions";
import { getMutashabihatForAyah, type MutashabihMatch } from "@/lib/mutashabihat";
import { ensureMushafCoreOffline } from "@/lib/mushafOffline";
import { TranslationPicker } from "@/components/quran/TranslationPicker";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────
// PageItem is sourced from src/data/pageIndexBuilder.ts so Mushaf and the
// IDB-cached builder in quranLoad share the exact same shape.
import type { PageItem } from "@/data/pageIndexBuilder";

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
  gold:  { swatch: "rgba(251,191,36,0.85)",  bg: "rgba(251,191,36,0.22)",  dot: "rgba(251,191,36,0.85)"  },
  green: { swatch: "rgba(52,211,153,0.85)",  bg: "rgba(52,211,153,0.18)",  dot: "rgba(52,211,153,0.85)"  },
  blue:  { swatch: "rgba(96,165,250,0.85)",  bg: "rgba(96,165,250,0.18)",  dot: "rgba(96,165,250,0.85)"  },
  red:   { swatch: "rgba(248,113,113,0.85)", bg: "rgba(248,113,113,0.18)", dot: "rgba(248,113,113,0.85)" },
  pink:  { swatch: "rgba(249,168,212,0.85)", bg: "rgba(249,168,212,0.18)", dot: "rgba(249,168,212,0.85)" },
} as const;
type HlColor = keyof typeof HL_COLORS;

// Q18: Sujood positions — synced with src/data/quranExtras.ts (SAJDA_VERSES)
const SAJDA_AYAHS = new Set([
  "7:206","13:15","16:50","17:109","19:58","22:26","22:77","25:60",
  "27:26","32:15","38:24","41:38","53:62","84:21","96:19",
]);

function useRadioState() {
  const [state, setState] = React.useState(getRadioState);
  React.useEffect(() => subscribeRadio(() => setState(getRadioState())), []);
  return state;
}

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
      <button type="button" className="mushaf-btn-primary w-full mt-3" onClick={() => onConfirm(dialPage)}>
        انتقال ←
      </button>
    </div>
  );
}

// ── Page index builder ────────────────────────────────────────

/**
 * Slice an Arabic verse at the last word boundary before `n` characters, so
 * FloatingAthar's prefill / hint never lands mid-word (which used to produce
 * torn text like "الزائر يقرأ حاليًا الآية «﴿الحمد لله رب العالم﴾»...").
 * Falls back to `n` if no space or ﴿ is found.
 */
export function sliceAtWordBoundary(text: string, n: number): string {
  if (text.length <= n) return text;
  const slice = text.slice(0, n);
  const lastSpace = slice.search(/[\s﴿﴾]+[^]*$/);
  if (lastSpace <= 0) return slice.trimEnd();
  return slice.slice(0, lastSpace).trimEnd();
}

/** Local convenience alias around the shared builder. */
function buildPageIndex(
  quranDB: Parameters<typeof buildPageIndexForCache>[0],
  pageMap: Record<string, number>,
): Map<number, PageItem[]> {
  return buildPageIndexForCache(quranDB, pageMap);
}

// ── Component ─────────────────────────────────────────────────
export function MushafPage() {
  const navigate = useNavigate();
  const { page: pageParam } = useParams<{ page?: string }>();
  const [sp] = useSearchParams();

  const { data: quranDB, isLoading: dbLoading, isError: dbError, refetch: refetchQuranDB } = useQuranDB();
  const { data: pmData, isLoading: pmLoading, isError: pmError, refetch: refetchPageMap } = useQuranPageMap();
  const { data: piData, isLoading: piLoading, isError: piError, refetch: refetchPageIndex } = useQuranPageIndex();
  // Keep a ref so audio callbacks can access latest DB without closure stale-ness
  const quranDBRef = React.useRef(quranDB);
  React.useEffect(() => { quranDBRef.current = quranDB; }, [quranDB]);
  // Mark Mushaf as "opened at least once" so App.tsx can warm the heavy
  // Tajweed color data set on subsequent launches, but never on first install.
  React.useEffect(() => {
    try { localStorage.setItem("athar_mushaf_opened", "1"); } catch { /* ignore */ }
  }, []);
  // Track which surahs we've already toasted a completion for this session
  const sessionSurahCompletedRef = React.useRef(new Set<number>());
  // Refs so the audio onended callback (set up in an effect keyed only on the
  // reciter) can always reach the *current* page-map/page/navigator without
  // going stale — same pattern as quranDBRef above.
  const pageMapRef = React.useRef<Record<string, number>>({});
  const currentPageRef = React.useRef<number>(1);
  const goPageRef = React.useRef<(p: number) => void>(() => {});

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
  const reviewedPagesToday = useNoorStore((s) => s.reviewedPagesToday);
  const markQuranPageReviewed = useNoorStore((s) => s.markQuranPageReviewed);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const setKhatmaDone = useNoorStore((s) => s.setKhatmaDone);
  const lastRead = useNoorStore((s) => s.quranLastRead);

  const totalPages = pmData?.totalPages ?? 604;
  const pageMap = React.useMemo(() => pmData?.map ?? {}, [pmData]);

  // Build page index. Prefer the IDB-cached, async-loaded version
  // (`useQuranPageIndex`) — on subsequent visits this is instant. On a cold
  // start we fall back to a synchronous build once both quranDB + pageMap are
  // ready, then keep the cache hot.
  const pageIndex = React.useMemo(() => {
    if (piData && piData.entries.length > 0) {
      const m = new Map<number, PageItem[]>();
      for (const [page, items] of piData.entries) {
        m.set(page, items as PageItem[]);
      }
      return m;
    }
    if (!quranDB || Object.keys(pageMap).length === 0) return new Map<number, PageItem[]>();
    return buildPageIndex(quranDB, pageMap);
  }, [piData, quranDB, pageMap]);

  // Current page state
  const surahParam = Number(sp.get("surah"));
  const ayahParam = Number(sp.get("ayah"));
  const rawPage = Number(pageParam) || 0;

  const [currentPage, setCurrentPage] = React.useState<number>(() =>
    rawPage >= 1 ? Math.min(rawPage, 604) : (prefs.quranMushafPage ?? 1)
  );
  const pageScrollMemoryRef = React.useRef<Record<number, number>>({});

  // Handle ?surah= param: jump to first page of that surah (or specific ayah).
  // Keyed on the actual params + pageIndex so deep-links fire every time the
  // URL changes (e.g. user navigates from a hadith ayah-link back into Mushaf
  // for a different surah) — the previous one-shot ref blocked all subsequent
  // jumps after the very first mount.
  React.useEffect(() => {
    if (!surahParam || Object.keys(pageMap).length === 0) return;
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
    if (p === currentPage) return; // already there, nothing to do
    setCurrentPage(p);
    // Keep quranMushafPage in sync so the Home 'تابع سورة' button returns to the correct page
    setPrefs({ quranMushafPage: p });
    navigate(`/mushaf/${p}`, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahParam, ayahParam, pageMap, pageIndex]);

  // Sync URL param when navigating via browser back/forward
  React.useEffect(() => {
    if (rawPage >= 1 && rawPage !== currentPage) setCurrentPage(Math.min(rawPage, 604));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPage]);

  const goPage = React.useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    // M2: Quick slide animation direction (snappy, no loading flash)
    if (clamped !== currentPage) {
      if (pageContentRef.current) {
        pageScrollMemoryRef.current[currentPage] = pageContentRef.current.scrollTop;
      }
      setPageTransDir(clamped > currentPage ? "left" : "right");
      if (pageTransTimer.current) clearTimeout(pageTransTimer.current);
      pageTransTimer.current = window.setTimeout(() => setPageTransDir(null), 220);
    }
    setCurrentPage(clamped);
    setPrefs({ quranMushafPage: clamped });
    navigate(`/mushaf/${clamped}`, { replace: true });
  }, [navigate, setPrefs, totalPages, currentPage]);

  React.useEffect(() => { pageMapRef.current = pageMap; }, [pageMap]);
  React.useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  React.useEffect(() => { goPageRef.current = goPage; }, [goPage]);

  // Page items
  const pageItems = React.useMemo(() => pageIndex.get(currentPage) ?? [], [pageIndex, currentPage]);
  const playableItems = React.useMemo(
    () => pageItems.filter((item) => !item.isBasmalahHeader && item.displayAyah > 0),
    [pageItems]
  );

  // Pass A: `prefs.quranScrollMode === "scroll"` — render the current page plus
  // the next pages stacked into the same scroll container so the reader flows
  // continuously across page boundaries. The user can still navigate using
  // the page indicator and search/jump; arrows disable in scroll mode.
  const scrollModeEnabled = prefs.quranScrollMode === "scroll";
  const SCROLL_TRAILING_PAGES = 3; // safe upper bound — even long pages render under a few KB each
  const scrollFlowItems = React.useMemo(() => {
    if (!scrollModeEnabled) return null;
    const seen = new Set<string>();
    const collected: typeof pageItems = [];
    for (let p = currentPage; p < currentPage + SCROLL_TRAILING_PAGES && p <= totalPages; p++) {
      const items = pageIndex.get(p) ?? [];
      for (const it of items) {
        const k = `${it.surahId}:${it.originalAyah}`;
        if (seen.has(k)) continue;
        seen.add(k);
        collected.push(it);
      }
    }
    return collected;
  }, [scrollModeEnabled, currentPage, totalPages, pageIndex]);
  const firstPlayableItem = playableItems[0] ?? null;

  // Continuous "auto-advance" playback queue: every remaining ayah of the
  // CURRENT surah starting from (surahId, fromOriginalAyah), spanning as many
  // mushaf pages as the surah covers — not just the current page. pageIndex
  // already holds every page in memory, so this is a synchronous scan, no
  // extra fetch. Range-loop keeps its own page-scoped items (its start/end
  // indices are UI-bound to the current page's playableItems).
  const buildSurahQueue = React.useCallback(
    (surahId: number, fromOriginalAyah: number) => {
      const queue: { surahId: number; originalAyah: number; displayAyah: number }[] = [];
      for (let p = currentPage; p <= totalPages; p++) {
        const items = pageIndex.get(p);
        if (!items) break;
        const matches = items.filter((it) => !it.isBasmalahHeader && it.displayAyah > 0 && it.surahId === surahId);
        if (matches.length === 0) {
          if (queue.length > 0) break; // the surah has already ended on an earlier page
          continue;
        }
        for (const it of matches) {
          if (p === currentPage && it.originalAyah < fromOriginalAyah) continue;
          queue.push({ surahId: it.surahId, originalAyah: it.originalAyah, displayAyah: it.displayAyah });
        }
      }
      return queue;
    },
    [pageIndex, currentPage, totalPages]
  );

  // Group by surah
  const surahGroups = React.useMemo((): SurahGroup[] => {
    const groups: SurahGroup[] = [];
    let cur: SurahGroup | null = null;
    // Pass A: in scroll mode we group the multi-page flow instead of just the
    // single page so `mushaf-page-main` can render continuously.
    const flowItems = scrollModeEnabled && scrollFlowItems ? scrollFlowItems : pageItems;
    for (const item of flowItems) {
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
  }, [pageItems, scrollFlowItems, scrollModeEnabled]);

  const firstItem = pageItems[0];
  const lastItem = pageItems[pageItems.length - 1];
  // On a page that spans two surahs, the chrome should announce the FIRST
  // surah on the page (the primary one), not the last — that matches what
  // the user sees at the top of the screen. The last is used for the audio
  // bar title where it makes more sense.
  const firstNonBasmalah = pageItems.find((i) => !i.isBasmalahHeader) ?? pageItems[0];
  const primarySurahId = firstNonBasmalah?.surahId;
  const primarySurahName = firstNonBasmalah?.surahName ?? "";
  const pageJuz = firstItem ? getSurahJuz(firstItem.surahId) : 1;
  const pageSurahName = primarySurahName;
  const pageSurahEnglish = React.useMemo(() => {
    if (!quranDB || primarySurahId === undefined) return "";
    return quranDB.find((s) => s.id === primarySurahId)?.englishName ?? "";
  }, [quranDB, primarySurahId]);

  // Chrome auto-hide
  const [showChrome, setShowChrome] = React.useState(true);
  const showChromeRef = React.useRef(true);
  React.useEffect(() => { showChromeRef.current = showChrome; }, [showChrome]);
  const chromeTimer = React.useRef<number | null>(null);
  const lastScrollYRef = React.useRef(0);
  const scrollIntentRef = React.useRef(0);
  const flashChrome = React.useCallback((durationMs = 2200) => {
    scrollIntentRef.current = 0;
    setShowChrome(true);
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = window.setTimeout(() => setShowChrome(false), durationMs);
  }, []);
  // Hide only on clear downward reading intent. Scroll bounce must not re-show chrome.
  const handleContentScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    pageScrollMemoryRef.current[currentPage] = y;
    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;
    if (Math.abs(delta) < 4) return;

    if (y <= 4) {
      scrollIntentRef.current = 0;
      return;
    }

    if (delta > 0) {
      scrollIntentRef.current = Math.max(0, scrollIntentRef.current + delta);
    } else {
      scrollIntentRef.current = Math.max(0, scrollIntentRef.current + delta * 0.5);
    }

    if (scrollIntentRef.current > 36) {
      setShowChrome(false);
      if (chromeTimer.current) { clearTimeout(chromeTimer.current); chromeTimer.current = null; }
      scrollIntentRef.current = 0;
    }
  }, [currentPage]);
  React.useEffect(() => { lastScrollYRef.current = 0; scrollIntentRef.current = 0; if (showChromeRef.current) flashChrome(); }, [currentPage, flashChrome]);
  React.useEffect(() => () => { if (chromeTimer.current) clearTimeout(chromeTimer.current); }, []);

  // Set browser tab title
  React.useEffect(() => {
    document.title = `المصحف الشريف — صفحة ${currentPage} — أثر`;
    return () => { document.title = "أثر"; };
  }, [currentPage]);

  // Selected ayah
  const [selectedItem, setSelectedItem] = React.useState<PageItem | null>(null);
  // Ref so handleAyahTap can check the *currently-selected* ayah without
  // depending on selectedItem itself (which would re-create the callback and
  // tear down its long-press timer every render).
  const selectedItemRef = React.useRef<PageItem | null>(null);
  React.useEffect(() => { selectedItemRef.current = selectedItem; }, [selectedItem]);

  // Auto-select ayah when navigating from ?surah=X&ayah=Y deeplinks.
  // Keyed on params + page so the selection fires every time the user lands on
  // a new surah/ayah deep-link (the previous one-shot ref made subsequent
  // deeplinks silently no-op).
  React.useEffect(() => {
    if (!surahParam || !ayahParam || pageIndex.size === 0) return;
    const items = pageIndex.get(currentPage) ?? [];
    const item = items.find(
      (i) => i.surahId === surahParam && (i.displayAyah === ayahParam || i.originalAyah === ayahParam)
    );
    if (item) setSelectedItem(item);
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
    const isSame = selectedItemRef.current?.surahId === item.surahId && selectedItemRef.current?.originalAyah === item.originalAyah;
    setSelectedItem((prev) =>
      prev?.surahId === item.surahId && prev?.originalAyah === item.originalAyah ? null : item
    );
    setLastRead(item.surahId, item.originalAyah);
    sessionAyahCountRef.current += 1;
    recordQuranRead(1);
    // Only re-flash the chrome when the user lands on a different ayah —
    // re-tapping the same ayah (or toggling selection off) shouldn't make the
    // top/bottom bars pop back in every single tap. The chrome stays visible
    // for 5s on a new selection so it doesn't blink away too fast either.
    if (!isSame) flashChrome(5000);
  }, [flashChrome, memorizationMode, recordQuranRead, setLastRead]);

  // Note sheet
  const [noteSheetOpen, setNoteSheetOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");

  // Share-options sheet (Ayah-style)
  const [shareSheetOpen, setShareSheetOpen] = React.useState(false);
  const [shareBusy, setShareBusy] = React.useState(false);

  // Phase 2F: Reading timer
  const sessionStartRef = React.useRef(Date.now());
  const pagesReadRef = React.useRef(new Set<number>());
  const sessionAyahCountRef = React.useRef(0);
  const [showSessionSummary, setShowSessionSummary] = React.useState(false);
  const [sessionDurationMin, setSessionDurationMin] = React.useState(0);

  // Phase 2F: Page scrubber strip
  const pageStripRef = React.useRef<HTMLButtonElement>(null);
  const pageContentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      if (!pageContentRef.current) return;
      const savedTop = pageScrollMemoryRef.current[currentPage];
      pageContentRef.current.scrollTop = Number.isFinite(savedTop) ? savedTop : 0;
      lastScrollYRef.current = pageContentRef.current.scrollTop;
    });
    return () => window.cancelAnimationFrame(id);
  }, [currentPage]);
  React.useEffect(() => {
    if (!selectedItem) { setNoteSheetOpen(false); setShareSheetOpen(false); return; }
    const key = `${selectedItem.surahId}:${selectedItem.displayAyah}`;
    setNoteDraft(notes[key] ?? "");
  }, [notes, selectedItem]);

  // Phase 2F: Track pages visited in this session
  React.useEffect(() => {
    pagesReadRef.current.add(currentPage);
  }, [currentPage]);

  // Dismiss any open word-translation popup when the page changes
  React.useEffect(() => {
    setActiveWord(null);
  }, [currentPage]);

  // Phase 2F: Auto-scroll page strip to keep current page centred
  React.useEffect(() => {
    if (!pageStripRef.current) return;
    const chip = pageStripRef.current.querySelector<HTMLElement>(`[data-page="${currentPage}"]`);
    if (chip) chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentPage]);

  // Audio refs & state
  const [playingKey, setPlayingKey] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [audioBarVisible, setAudioBarVisible] = React.useState(true);
  const [showReciterSheet, setShowReciterSheet] = React.useState(false);

  // Q4/Q7/Q8: Enhanced audio controls (replaces simple repeatMode)
  const [loopEnabled, setLoopEnabled] = React.useState(false);
  const [loopCount, setLoopCount] = React.useState(3); // -1=∞
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [audioVolume, setAudioVolume] = React.useState<number>(() => {
    try { const raw = localStorage.getItem("noor_mushaf_volume"); return raw === null ? 1 : Math.max(0, Math.min(1, parseFloat(raw) || 1)); } catch { return 1; }
  });
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = audioVolume;
  }, [audioVolume]);
  React.useEffect(() => {
    try { localStorage.setItem("noor_mushaf_volume", String(audioVolume)); } catch { /* ignore */ }
  }, [audioVolume]);
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

  // Q3: Translation — initialized from prefs so the Settings picker drives Mushaf.
  const [showTranslation, setShowTranslation] = React.useState(() => prefs.mushafShowTranslation ?? true);
  // Wrap the setter to mirror into prefs so the Settings picker stays in sync
  // with the in-Mushaf toggle ("t" key, action bar, etc.).
  const setShowTranslationPref = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setShowTranslation((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      setPrefs({ mushafShowTranslation: next });
      return next;
    });
  }, [setPrefs]);
  const [translationData, setTranslationData] = React.useState<Record<number, string[]>>({});
  const quranTranslationId: TranslationId = prefs.quranTranslationId ?? "saheeh";
  const prevTranslationIdRef = React.useRef<TranslationId>(quranTranslationId);

  // Q11-B: Inline tafseer mode (قراءة mode)
  const [inlineTafseer, setInlineTafseerState] = React.useState(() => prefs.mushafInlineTafseer ?? false);
  const setInlineTafseer = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setInlineTafseerState(v);
  }, []);
  // Sync inline tafseer setting to prefs
  React.useEffect(() => {
    setPrefs({ mushafInlineTafseer: inlineTafseer });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineTafseer]);
  const [inlineTafseerSource, setInlineTafseerSource] = React.useState<string>("muyassar");
  const [inlineTafseerData, setInlineTafseerData] = React.useState<Record<number, string[]>>({});
  const [inlineTafseerLoading, setInlineTafseerLoading] = React.useState(false);

  // Phase 2A: Word-by-word translation
  // Phase 2B: WBW data used by Tajweed mode
  const [wbwData, setWbwData] = React.useState<Record<number, WbwSurah>>({});
  const [wbwLoading, setWbwLoading] = React.useState(false);

  // Phase 2B: Tajweed color mode
  const [tajweedMode, setTajweedModeState] = React.useState(() => prefs.mushafTajweedMode ?? true);
  const setTajweedMode = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setTajweedModeState(v);
  }, []);
  // Sync tajweed setting to prefs
  React.useEffect(() => {
    setPrefs({ mushafTajweedMode: tajweedMode });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tajweedMode]);

  // Word-by-word tap-to-translate mode: opt-in so it never interferes with the
  // existing tap-to-select-ayah interaction. The wbwData pipeline already fetches
  // translation + transliteration per word (used today only for Tajweed coloring) —
  // this just surfaces what was already being downloaded but never shown.
  const [wbwMode, setWbwModeState] = React.useState(() => prefs.mushafWbwMode ?? false);
  const setWbwMode = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setWbwModeState(v);
  }, []);
  React.useEffect(() => {
    setPrefs({ mushafWbwMode: wbwMode });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wbwMode]);
  const [activeWord, setActiveWord] = React.useState<{ ar: string; tr: string; tl: string } | null>(null);

  // Q17: In-page search
  const [inPageSearch, setInPageSearch] = React.useState("");
  const [showSearch, setShowSearch] = React.useState(false);



  // Q15: Surah info panel
  const [showSurahInfo, setShowSurahInfo] = React.useState(false);

  // Settings sheet
  const [showSettings, setShowSettings] = React.useState(false);
  // More actions sheet
  const [showMoreSheet, setShowMoreSheet] = React.useState(false);

  // Q11: Tafsir sheet
  const [tafsirItem, setTafsirItem] = React.useState<PageItem | null>(null);
  const [companionOpen, setCompanionOpen] = React.useState(false);
  const [tadabburSeed, setTadabburSeed] = React.useState<string>("");

  // Mutashabihat (similar ayahs) shown alongside tafsir for the open ayah
  const [mutashabihatMatches, setMutashabihatMatches] = React.useState<MutashabihMatch[]>([]);
  const [mutashabihatLoading, setMutashabihatLoading] = React.useState(false);

  // M2: Page slide direction
  const [pageTransDir, setPageTransDir] = React.useState<"left" | "right" | null>(null);
  const pageTransTimer = React.useRef<number | null>(null);

  // M4: Pinch-to-zoom refs
  const pinchStartDist = React.useRef<number | null>(null);
  const pinchStartScale = React.useRef<number>(0.88);

  // Phase 2F: Back with session summary
  const handleBack = React.useCallback(() => {
    const elapsed = Math.round((Date.now() - sessionStartRef.current) / 60000);
    if (elapsed >= 1) {
      setSessionDurationMin(elapsed);
      setShowSessionSummary(true);
    } else {
      navigate("/quran", { replace: true });
    }
  }, [navigate]);

  // M6: Juz overlay
  const [juzOverlay, setJuzOverlay] = React.useState<string | null>(null);
  const juzOverlayTimer = React.useRef<number | null>(null);
  const prevPageRef = React.useRef<number | null>(null);

  // M7: Long-press bookmark
  const longPressTimer = React.useRef<number | null>(null);
  const longPressPointerId = React.useRef<number | null>(null);
  const longPressFired = React.useRef(false);

  // A2: Offline audio cache progress
  const [cacheProgress, setCacheProgress] = React.useState<{ done: number; total: number } | null>(null);
  // Tajweed offline download progress
  const [tajweedDownloadProgress, setTajweedDownloadProgress] = React.useState<{ done: number; total: number } | null>(null);
  // A2-B: Per-reciter page download progress
  const [reciterDownloadProgress, setReciterDownloadProgress] = React.useState<Record<string, { done: number; total: number } | "done">>({});
  React.useEffect(() => {
    let alive = true;
    ensureMushafCoreOffline()
      .catch(() => undefined)
      .finally(() => {
        if (!alive) return;
      });
    return () => { alive = false; };
  }, []);

  // A4: Quran Radio
  const radioState = useRadioState();

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
      audio.volume = audioVolume;
      setPlayingKey(key);
      // Cross-page auto-advance: if the ayah now playing isn't on the page
      // the reader is looking at, turn the mushaf to follow it — otherwise
      // playback would keep going while the screen sits on the old page.
      const targetPage = Number(pageMapRef.current[`${surahId}:${originalAyah}`]);
      if (Number.isFinite(targetPage) && targetPage >= 1 && targetPage !== currentPageRef.current) {
        goPageRef.current(targetPage);
      }
      audio.volume = audioVolume;
      audio.play().catch(() => toast.error("تعذر تشغيل التلاوة"));
      audio.onended = () => {
        // Guard: if component unmounted or a newer audio took over, bail out
        if (audioRef.current !== audio) return;
        if (!pst.active) { setPlayingKey(null); return; }
        // Surah completion celebration (once per surah per session)
        const surahInfo = quranDBRef.current?.find((s) => s.id === surahId);
        if (surahInfo && originalAyah === surahInfo.ayahs.length && !sessionSurahCompletedRef.current.has(surahId)) {
          sessionSurahCompletedRef.current.add(surahId);
          toast.success(`أتممت سورة ${surahInfo.name} 🌟`, { duration: 3500 });
        }
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
          } else if (pst.useRange && pst.items.length > 0) {
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
    // Range-loop stays page-scoped (its start/end indices are bound to the
    // current page's playableItems in the UI); plain auto-advance spans the
    // whole surah across pages so playback no longer stops mid-surah.
    const snapshot = (autoAdvance && !loopRange)
      ? buildSurahQueue(surahId, originalAyah)
      : playableItems.map((i) => ({ surahId: i.surahId, originalAyah: i.originalAyah, displayAyah: i.displayAyah }));
    const curIdx = snapshot.findIndex((i) => i.surahId === surahId && i.originalAyah === originalAyah);
    pst.items = snapshot;
    pst.currentIdx = curIdx >= 0 ? curIdx : 0;
    pst.useRange = loopRange;
    pst.rangeStartIdx = Math.max(0, loopRangeStartIdx);
    pst.rangeEndIdx = Math.min(snapshot.length - 1, Math.max(loopRangeStartIdx, loopRangeEndIdx));
    playItemCoreRef.current?.(surahId, originalAyah, displayAyah);
  }, [playingKey, playbackSpeed, loopEnabled, loopCount, autoAdvance, playableItems, loopRange, loopRangeStartIdx, loopRangeEndIdx, buildSurahQueue]);

  React.useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }, []);

  // Q3: Fetch translation for all surahs on current page when translation panel is open.
  // Source-change detection uses a ref rather than a companion "clear cache" effect —
  // see the identical fix/explanation on the tafsir fetch effect above; two effects
  // both keyed on the same "source" state race each other's closures otherwise.
  React.useEffect(() => {
    if (!showTranslation && tafsirItem === null) return;
    const sourceChanged = prevTranslationIdRef.current !== quranTranslationId;
    prevTranslationIdRef.current = quranTranslationId;
    const surahIds = [...new Set(pageItems.map((i) => i.surahId))];
    if (tafsirItem) surahIds.push(tafsirItem.surahId);
    const toFetch = sourceChanged ? surahIds : surahIds.filter((sid) => !translationData[sid]);
    if (toFetch.length === 0) return;
    let mounted = true;
    loadTranslationForSurahs(quranTranslationId, toFetch)
      .then((fetched) => {
        if (!mounted) return;
        setTranslationData((prev) => ({ ...(sourceChanged ? {} : prev), ...fetched }));
      })
      .catch(() => { if (mounted) toast.error("تعذر تحميل الترجمة"); });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTranslation, tafsirItem, currentPage, quranTranslationId]);

  // Q17: Normalized search for ayah matching
  const normalizedSearch = React.useMemo(
    () => (showSearch && inPageSearch ? normalizeArabicSearch(inPageSearch.trim()) : ""),
    [showSearch, inPageSearch]
  );

  // Q11-B: Shared cache ref so the inline + popup fetches don't double-load the
  // same surah+source. Keyed on tafsirItem + inlineTafseerSource so source
  // changes re-fetch and surface the new tafsir.
  const tafsirCache = React.useRef<Map<string, string[]>>(new Map());
  const tafsirInflight = React.useRef<Map<string, Promise<string[]>>>(new Map());
  const tafsirCacheKey = (sid: number, src: string) => `${src}:${sid}`;
  const loadTafsirCached = React.useCallback((src: string, sid: number): Promise<string[]> => {
    const key = tafsirCacheKey(sid, src);
    const cached = tafsirCache.current.get(key);
    if (cached) return Promise.resolve(cached);
    const inflight = tafsirInflight.current.get(key);
    if (inflight) return inflight;
    const p: Promise<string[]> =
      src === "muyassar"
        ? loadMuyassarCache().then((cache) => (cache[String(sid)] ?? []) as string[])
        : loadTafsirSurah(src, sid);
    tafsirInflight.current.set(key, p);
    p.then((data) => {
      tafsirCache.current.set(key, data);
      tafsirInflight.current.delete(key);
    }).catch(() => { tafsirInflight.current.delete(key); });
    return p;
  }, []);

  // Q11-B: Fetch tafseer for all surahs on current page when inline tafseer is on.
  // Source changes are tracked via a ref rather than a second "clear on change" effect —
  // two effects both keyed on inlineTafseerSource run with the SAME closure snapshot, so
  // a separate clear-effect's setInlineTafseerData({}) wasn't visible to this effect's
  // `toFetch` filter in the same pass; every surah looked "already fetched" (under the
  // old source) and a source switch silently never refetched anything.
  const prevTafseerSourceRef = React.useRef(inlineTafseerSource);
  React.useEffect(() => {
    if (!inlineTafseer) return;
    const sourceChanged = prevTafseerSourceRef.current !== inlineTafseerSource;
    prevTafseerSourceRef.current = inlineTafseerSource;
    const surahIds = [...new Set(pageItems.map((i) => i.surahId))];
    const toFetch = sourceChanged ? surahIds : surahIds.filter((sid) => !inlineTafseerData[sid]);
    if (toFetch.length === 0) return;
    let mounted = true;
    setInlineTafseerLoading(true);
    // Use the shared tafsirCache so inline + popup fetches share results
    const loadData = Promise.all(
      toFetch.map((sid) =>
        loadTafsirCached(inlineTafseerSource, sid).then((ayahs) => ({ sid, ayahs }))
      ),
    );
    loadData.then((results) => {
      if (!mounted) return;
      setInlineTafseerData((prev) => {
        const upd = sourceChanged ? {} : { ...prev };
        for (const { sid, ayahs } of results) upd[sid] = ayahs;
        return upd;
      });
    }).catch(() => { if (mounted) toast.error("تعذر تحميل التفسير"); })
      .finally(() => { if (mounted) setInlineTafseerLoading(false); });
    return () => { mounted = false; };
  }, [inlineTafseer, inlineTafseerSource, currentPage, inlineTafseerData, loadTafsirCached]);

  // Phase 2A/2B: Fetch word-by-word data for all surahs on current page
  // Triggered by either WBW mode or Tajweed mode (both need the same data)
  React.useEffect(() => {
    const surahIds = [...new Set(pageItems.map((i) => i.surahId))];
    const toFetch = surahIds.filter((sid) => !wbwData[sid]);
    if (toFetch.length === 0) return;
    let mounted = true;
    setWbwLoading(true);
    Promise.all(toFetch.map((sid) => loadWbwSurah(sid).then((data) => ({ sid, data }))))
      .then((results) => {
        if (!mounted) return;
        setWbwData((prev) => {
          const upd = { ...prev };
          for (const { sid, data } of results) upd[sid] = data;
          return upd;
        });
      })
      .catch(() => { if (mounted) toast.error("تعذر تحميل البيانات"); })
      .finally(() => { if (mounted) setWbwLoading(false); });
    return () => { mounted = false; };
  // pageItems is empty until quranDB finishes loading; including it (not just
  // currentPage) makes this effect re-fire once real data arrives instead of
  // permanently fetching nothing for the page the reader first lands on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageItems]);

  // Q11-B: Fetch tafseer for popup when tafsirItem opens (works even when inline tafseer is OFF)
  React.useEffect(() => {
    if (!tafsirItem) return;
    const sid = tafsirItem.surahId;
    let mounted = true;
    setInlineTafseerLoading(true);
    loadTafsirCached(inlineTafseerSource, sid)
      .then((ayahs) => {
        if (!mounted) return;
        setInlineTafseerData((prev) => ({ ...prev, [sid]: ayahs }));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setInlineTafseerLoading(false); });
    return () => { mounted = false; };
  }, [tafsirItem, inlineTafseerSource, loadTafsirCached]);

  // Mutashabihat: look up similar-ayah matches for the open ayah once the Quran DB is loaded
  React.useEffect(() => {
    if (!tafsirItem || !quranDB) { setMutashabihatMatches([]); return; }
    let mounted = true;
    setMutashabihatLoading(true);
    getMutashabihatForAyah(quranDB, tafsirItem.surahId, tafsirItem.originalAyah)
      .then((matches) => { if (mounted) setMutashabihatMatches(matches); })
      .catch(() => { if (mounted) setMutashabihatMatches([]); })
      .finally(() => { if (mounted) setMutashabihatLoading(false); });
    return () => { mounted = false; };
  }, [tafsirItem, quranDB]);

  // Jump to a specific surah/ayah from within an already-mounted Mushaf page — bypasses
  // the ?surah=&ayah= URL-param effect above, which only ever fires once per mount
  // (didJumpRef), so it can't handle a second in-app jump while already on this page.
  const jumpToAyah = React.useCallback((surahId: number, ayahIndex: number) => {
    const page = Number(pageMap[`${surahId}:${ayahIndex}`]) || Number(pageMap[`${surahId}:1`]) || null;
    if (!page) { toast.error("تعذر تحديد صفحة الآية"); return; }
    setTafsirItem(null);
    setCurrentPage(page);
    setPrefs({ quranMushafPage: page });
    navigate(`/mushaf/${page}`, { replace: false });
  }, [pageMap, navigate, setPrefs]);

  // Page jump
  const [showJump, setShowJump] = React.useState(false);

  // Font scale: 0.7 – 1.6 in 0.1 steps — default 1.0 fills mobile viewport naturally
  const [fontScale, setFontScale] = React.useState<number>(() => prefs.mushafFontScale ?? 1.0);
  const bumpFont = React.useCallback((delta: number) => {
    setFontScale((prev) => Math.round(Math.max(0.7, Math.min(1.6, prev + delta)) * 10) / 10);
  }, []);
  // Sync font scale to prefs whenever it changes
  React.useEffect(() => {
    setPrefs({ mushafFontScale: fontScale });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontScale]);

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
    // Arabic Mushaf: swipe right (dx > 0) = next page (forward in Arabic reading order)
    if (dx > 0) goPage(currentPage + 1);
    else goPage(currentPage - 1);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPage(currentPage + 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goPage(currentPage - 1); }
      else if (e.key === "m") setMemorizationMode((v) => { if (v) setRevealedItems(new Set()); return !v; });
      else if (e.key === "t") setShowTranslationPref((v) => !v);
      else if (e.key === "/") { e.preventDefault(); setShowSearch((v) => !v); }
      else if (e.key === "s") setShowSettings((v) => !v);
      else if (e.key === "Escape") {
        if (showSettings) { setShowSettings(false); return; }
        if (showSearch) { setShowSearch(false); setInPageSearch(""); return; }
        if (tafsirItem) { setTafsirItem(null); return; }
        if (showJump) { setShowJump(false); return; }
        if (noteSheetOpen) { setNoteSheetOpen(false); return; }
        if (shareSheetOpen) { setShareSheetOpen(false); return; }
        if (selectedItem) { setSelectedItem(null); return; }
        handleBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, goPage, handleBack, navigate, noteSheetOpen, selectedItem, setShowTranslationPref, showJump, showSettings, showSearch, tafsirItem]);

  // Share selected ayah
  const doCopy = async () => {
    if (!selectedItem) return;
    try {
      await navigator.clipboard.writeText(
        `${selectedItem.text} ﴿${toArabicNumeral(selectedItem.displayAyah)}﴾\n(${selectedItem.surahName} ${selectedItem.surahId}:${selectedItem.displayAyah})`
      );
      toast.success("تم النسخ");
    } catch { toast.error("تعذر النسخ"); }
  };

  // ── Ayah share options (Ayah-style sheet) ──────────────
  // Fetch the translation for a single ayah using the user's currently-selected
  // source. Cache hit on `translationData` is fast; cache miss lazily triggers a
  // full fetch via the unified `getTranslationForAyah` (memoized + IDB-cached).
  const getAyahTranslation = React.useCallback(async (surahId: number, originalAyah: number): Promise<string> => {
    const cached = translationData[surahId]?.[originalAyah];
    if (cached) return cached;
    try {
      const text = await getTranslationForAyah(quranTranslationId, surahId, originalAyah);
      if (text) {
        setTranslationData((prev) => {
          const arr = prev[surahId] ? [...prev[surahId]] : [""];
          arr[originalAyah] = text;
          return { ...prev, [surahId]: arr };
        });
      }
      return text ?? "";
    } catch { return ""; }
  }, [translationData, quranTranslationId]);

  const shareAyahImage = async (withTranslation: boolean) => {
    if (!selectedItem) return;
    setShareBusy(true);
    try {
      const verse = `${selectedItem.text} ﴿${toArabicNumeral(selectedItem.displayAyah)}﴾`;
      const translation = withTranslation
        ? await getAyahTranslation(selectedItem.surahId, selectedItem.originalAyah)
        : undefined;
      const blob = await renderDhikrPosterBlob({
        text: verse,
        sectionTitle: `${selectedItem.surahName} • ${selectedItem.surahId}:${selectedItem.displayAyah}`,
        footerUrl: "www.athark.org",
        translation: translation || undefined,
      });
      const file = new File([blob], `athar-${selectedItem.surahId}-${selectedItem.displayAyah}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); }
      else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setShareSheetOpen(false);
    } catch { toast.error("تعذر المشاركة"); }
    finally { setShareBusy(false); }
  };

  const shareAyahText = async (withTranslation: boolean) => {
    if (!selectedItem) return;
    setShareBusy(true);
    try {
      const ref = `(${selectedItem.surahName} ${selectedItem.surahId}:${selectedItem.displayAyah})`;
      let body = `${selectedItem.text} ﴿${toArabicNumeral(selectedItem.displayAyah)}﴾\n${ref}`;
      if (withTranslation) {
        const tr = await getAyahTranslation(selectedItem.surahId, selectedItem.originalAyah);
        if (tr) body += `\n\n${tr}`;
      }
      if (navigator.share) { await navigator.share({ text: body }); }
      else { await navigator.clipboard.writeText(body); toast.success("تم النسخ"); }
      setShareSheetOpen(false);
    } catch { toast.error("تعذر المشاركة"); }
    finally { setShareBusy(false); }
  };

  const markPageReviewed = React.useCallback(() => {
    const playableItems = pageItems.filter((item) => !item.isBasmalahHeader && item.displayAyah > 0);
    const lastPlayable = playableItems[playableItems.length - 1];
    if (!lastPlayable) return;
    if (reviewedPagesToday.includes(String(currentPage))) {
      toast("تمت مراجعة هذه الصفحة سابقًا اليوم", { icon: "✓" });
      return;
    }
    setLastRead(lastPlayable.surahId, lastPlayable.originalAyah);
    sessionAyahCountRef.current += playableItems.length;
    recordQuranRead(playableItems.length);
    markQuranPageReviewed(currentPage);
    toast.success("تم حفظ مراجعة الصفحة");
  }, [pageItems, recordQuranRead, setLastRead, reviewedPagesToday, currentPage, markQuranPageReviewed]);

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
    const hizb = firstItem ? getHizbForAyah(firstItem.surahId, firstItem.originalAyah) : 1;
    setJuzOverlay(`الجزء ${toArabicNumeral(juzNum)} · الحزب ${toArabicNumeral(hizb)}`);
    if (juzOverlayTimer.current) clearTimeout(juzOverlayTimer.current);
    juzOverlayTimer.current = window.setTimeout(() => setJuzOverlay(null), 2600);
  }, [currentPage, pageJuz, firstItem]);
  React.useEffect(() => () => {
    if (juzOverlayTimer.current) clearTimeout(juzOverlayTimer.current);
    if (pageTransTimer.current) clearTimeout(pageTransTimer.current);
  }, []);

  // M7: Long-press bookmark handlers.
  // Multi-touch safe: only the pointer that started the long-press can cancel
  // it, so a second finger landing during the 600ms window doesn't kill the
  // first finger's pending timer (which used to silently swallow bookmarks
  // when the user tapped quickly with two thumbs).
  const handlePointerDown = React.useCallback((e: React.PointerEvent, item: PageItem) => {
    if (item.isBasmalahHeader || item.displayAyah === 0) return;
    longPressFired.current = false;
    longPressPointerId.current = e.pointerId;
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      const k = `${item.surahId}:${item.displayAyah}`;
      const wasBookmarked = !!bookmarks[k];
      toggleBookmark(item.surahId, item.displayAyah);
      toast.success(wasBookmarked ? "أُزيلت العلامة 🔖" : "✓ إشارة مرجعية محفوظة");
    }, 600);
  }, [bookmarks, toggleBookmark]);
  const handlePointerUp = React.useCallback((e: React.PointerEvent) => {
    if (longPressPointerId.current !== null && longPressPointerId.current !== e.pointerId) return;
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressPointerId.current = null;
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

  // A2-C: Bulk offline download — whole surah or whole juz, not just the
  // current page. pageIndex already holds every page in memory (same data
  // buildSurahQueue uses for continuous playback), so this is a synchronous
  // scan + sequential cache.add() loop, no extra fetching required.
  const [bulkDownloadProgress, setBulkDownloadProgress] = React.useState<{ done: number; total: number; label: string } | null>(null);

  const collectAudioItems = React.useCallback(
    (predicate: (surahId: number, originalAyah: number) => boolean) => {
      const items: { surahId: number; originalAyah: number }[] = [];
      for (const list of pageIndex.values()) {
        for (const it of list) {
          if (!it.isBasmalahHeader && it.displayAyah > 0 && predicate(it.surahId, it.originalAyah)) {
            items.push({ surahId: it.surahId, originalAyah: it.originalAyah });
          }
        }
      }
      return items;
    },
    [pageIndex]
  );

  const runBulkDownload = React.useCallback(
    async (items: { surahId: number; originalAyah: number }[], label: string, successLabel: string) => {
      if (!("caches" in window)) { toast.error("التخزين غير متاح في هذا المتصفح"); return; }
      if (items.length === 0) return;
      setBulkDownloadProgress({ done: 0, total: items.length, label });
      try {
        const cache = await caches.open("mushaf-audio-v1");
        let done = 0;
        for (const item of items) {
          const s = String(item.surahId).padStart(3, "0");
          const a = String(item.originalAyah).padStart(3, "0");
          const url = `https://everyayah.com/data/${prefs.quranReciter ?? "Alafasy_128kbps"}/${s}${a}.mp3`;
          try { await cache.add(url); } catch { /* network or CORS — skip */ }
          done++;
          setBulkDownloadProgress({ done, total: items.length, label });
        }
        toast.success(`✓ تم تخزين ${successLabel} كاملة (${done} آية) للاستماع دون إنترنت`);
      } catch { toast.error("تعذر التحميل"); }
      finally { setBulkDownloadProgress(null); }
    },
    [prefs.quranReciter]
  );

  const downloadSurahAudio = React.useCallback(async () => {
    const anchor = lastItem ?? firstItem;
    if (!anchor) return;
    const items = collectAudioItems((surahId) => surahId === anchor.surahId);
    await runBulkDownload(items, anchor.surahName, anchor.surahName);
  }, [lastItem, firstItem, collectAudioItems, runBulkDownload]);

  const downloadJuzAudio = React.useCallback(async () => {
    const anchor = firstItem;
    if (!anchor) return;
    const targetJuz = getJuzForAyah(anchor.surahId, anchor.originalAyah);
    const items = collectAudioItems((surahId, ayah) => getJuzForAyah(surahId, ayah) === targetJuz);
    await runBulkDownload(items, `الجزء ${targetJuz}`, `الجزء ${toArabicNumeral(targetJuz)}`);
  }, [firstItem, collectAudioItems, runBulkDownload]);

  // Tajweed offline: download WBW/Tajweed data for all 114 surahs into IndexedDB
  const downloadAllTajweedData = React.useCallback(async () => {
    setTajweedDownloadProgress({ done: 0, total: 114 });
    try {
      await downloadAllWbwSurahs(({ done, total }) => {
        setTajweedDownloadProgress({ done, total });
      });
      toast.success("✓ تم تحميل بيانات التجويد كاملةً للعمل دون إنترنت");
    } catch {
      toast.error("تعذر تحميل بيانات التجويد — تحقق من الاتصال");
    } finally {
      setTajweedDownloadProgress(null);
    }
  }, []);

  // A2-B: Download current page audio for a specific reciter (from reciter sheet)
  const downloadReciterPage = React.useCallback(async (reciterId: string) => {
    if (!("caches" in window)) { toast.error("التخزين غير متاح في هذا المتصفح"); return; }
    const items = playableItems.slice();
    if (items.length === 0) return;
    setReciterDownloadProgress((prev) => ({ ...prev, [reciterId]: { done: 0, total: items.length } }));
    try {
      const cache = await caches.open("mushaf-audio-v1");
      let done = 0;
      for (const item of items) {
        const s = String(item.surahId).padStart(3, "0");
        const a = String(item.originalAyah).padStart(3, "0");
        const url = `https://everyayah.com/data/${reciterId}/${s}${a}.mp3`;
        try { await cache.add(url); } catch { /* skip */ }
        done++;
        setReciterDownloadProgress((prev) => ({ ...prev, [reciterId]: { done, total: items.length } }));
      }
      setReciterDownloadProgress((prev) => ({ ...prev, [reciterId]: "done" }));
      const name = QURAN_RECITERS.find((r) => r.id === reciterId)?.label ?? reciterId;
      toast.success(`✓ تم تحميل الصفحة لـ ${name}`);
    } catch {
      setReciterDownloadProgress((prev) => { const upd = { ...prev }; delete upd[reciterId]; return upd; });
    }
  }, [playableItems]);

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
  const handleRadioToggle = React.useCallback(() => {
    if (!radioState.playing) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingKey(null); }
      audioPlayRef.current.active = false;
    }
    toggleSharedRadio();
  }, [radioState.playing]);

  const handleRadioStationSelect = React.useCallback((idx: number) => {
    selectRadioStation(idx);
    if (radioState.playing) playRadio(idx);
  }, [radioState.playing]);

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
          stopRadio();
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
          <div className="text-center" role="status">
            <div className="w-10 h-10 border-2 border-[#2F4F37] border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
            <div className="text-sm opacity-60">فتح المصحف…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!quranDB || !pmData || dbError || pmError) {
    return (
      <div className="mushaf-reader" dir="rtl">
        <div className="flex-1 flex items-center justify-center p-5">
          <div className="max-w-sm text-center rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-5">
            <div className="text-3xl mb-3" aria-hidden="true">📖</div>
            <div className="font-semibold mb-2">تعذر فتح المصحف</div>
            <p className="text-sm opacity-70 leading-7">
              يحتاج التطبيق إلى تحميل بيانات المصحف مرة واحدة. اتصل بالإنترنت واضغط إعادة المحاولة، ثم يمكنك تحميله للقراءة دون إنترنت.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--on-accent)]"
              onClick={() => { void refetchQuranDB(); void refetchPageMap(); }}
            >
              إعادة المحاولة
            </button>
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
      className="mushaf-reader page-enter"
      data-mushaf-theme={prefs.quranTheme}
      data-mushaf-clean={(prefs.mushafCleanMode ?? true) ? "1" : "0"}
      data-mushaf-scroll={scrollModeEnabled ? "1" : "0"}
      {...(prefs.mushafTextColor ? {
        "data-mushaf-tc": "1",
        style: { "--mushaf-custom-tc": prefs.mushafTextColor } as React.CSSProperties,
      } : {})}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
    >
      {/* ── Top chrome bar ───────────────────────────────── */}
      <div
        className={`mushaf-chrome-top${showChrome || !!selectedItem ? "" : " chrome-hidden"}`}
        onClick={() => flashChrome()}
      >
        {/* Q19: Reading progress bar */}
        <div className="mushaf-progress-strip" aria-hidden="true">
          <div className="mushaf-progress-fill" style={{ width: `${(currentPage / totalPages) * 100}%` }} />
        </div>
        <button type="button"
          className="mushaf-chrome-icon-btn"
          onClick={(e) => { e.stopPropagation(); handleBack(); }}
          aria-label="رجوع إلى القرآن"
        >
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <div className="mushaf-chrome-info" onClick={(e) => e.stopPropagation()}>
          <div className="mushaf-chrome-surah-name">{pageSurahName || pageSurahEnglish}</div>
          <div className="mushaf-chrome-meta">صفحة {toArabicNumeral(currentPage)} · الجزء {toArabicNumeral(pageJuz)}</div>
        </div>
        {/* Focus / reading mode */}
        <button type="button"
          className="mushaf-chrome-icon-btn"
          aria-label="وضع القراءة"
          onClick={(e) => { e.stopPropagation(); if (chromeTimer.current) clearTimeout(chromeTimer.current); chromeTimer.current = null; setShowChrome(false); }}
        >
          <EyeOff size={15} aria-hidden="true" />
        </button>
        <button type="button"
          className={`mushaf-chrome-icon-btn${tajweedMode ? " active" : ""}`}
          aria-label={tajweedMode ? "إيقاف التجويد" : "تشغيل التجويد"}
          onClick={(e) => { e.stopPropagation(); setTajweedMode((v) => !v); }}
          title={tajweedMode ? "إيقاف التجويد" : "تشغيل التجويد"}
        >
          <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>ت</span>
        </button>
        <button type="button"
          className={`mushaf-chrome-icon-btn${wbwMode ? " active" : ""}`}
          aria-label={wbwMode ? "إيقاف الترجمة الفورية للكلمات" : "تشغيل الترجمة الفورية للكلمات"}
          onClick={(e) => { e.stopPropagation(); setWbwMode((v) => !v); setActiveWord(null); }}
          title={wbwMode ? "إيقاف الترجمة الفورية للكلمات" : "تشغيل الترجمة الفورية للكلمات — انقر أي كلمة لمعناها"}
        >
          <WholeWord size={16} aria-hidden="true" />
        </button>
        {/* Settings (font size, tajweed & all reading options live here) */}
        <button type="button"
          className={`mushaf-chrome-icon-btn${showSettings ? " active" : ""}`}
          aria-label="إعدادات"
          onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
        >
          <Settings size={16} aria-hidden="true" />
        </button>
        {/* More actions */}
        <button type="button"
          className={`mushaf-chrome-icon-btn${showMoreSheet ? " active" : ""}`}
          aria-label="المزيد"
          onClick={(e) => { e.stopPropagation(); setShowMoreSheet((v) => !v); }}
        >
          <MoreVertical size={17} aria-hidden="true" />
        </button>
      </div>

      {/* ── Q17: In-page search bar ───────────────────────── */}
      {showSearch && (
        <div className="mushaf-search-bar" role="search" aria-label="بحث في الصفحة" onClick={(e) => e.stopPropagation()}>
          <Search size={14} aria-hidden="true" className="shrink-0 opacity-50" />
          <input
            type="search"
            value={inPageSearch}
            onChange={(e) => setInPageSearch(e.target.value)}
            placeholder="بحث في الصفحة…"
            aria-label="البحث في الصفحة الحالية"
            className="flex-1 bg-transparent outline-none text-sm"
            autoFocus
            dir="rtl"
          />
          {inPageSearch && (
            <span className="text-[11px] opacity-45 shrink-0">
              {playableItems.filter((i) => normalizeArabicSearch(i.text).includes(normalizedSearch)).length} نتيجة
            </span>
          )}
          <button type="button"
            className="mushaf-chrome-icon-btn"
            onClick={() => { setInPageSearch(""); setShowSearch(false); }}
            aria-label="إغلاق البحث"
          >
            <X size={14} aria-hidden="true" />
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
          <button type="button"
            className="mushaf-mem-btn"
            onClick={() => setRevealedItems(new Set(playableItems.map((i) => `${i.surahId}:${i.displayAyah}`)))}
          >إظهار الكل</button>
          <button type="button"
            className="mushaf-mem-btn"
            onClick={() => setRevealedItems(new Set())}
          >إخفاء الكل</button>
        </div>
      )}

      {/* ── M6: Juz / Hizb overlay chip ─────────────────── */}
      {juzOverlay && (
        <div className="mushaf-juz-overlay" aria-live="polite" aria-atomic="true">{juzOverlay}</div>
      )}

      {/* ── A5: Sleep timer countdown chip ───────────────── */}
      {sleepMinutes > 0 && (
        <div className="mushaf-sleep-chip" role="button" tabIndex={0} onClick={() => activateSleepTimer(0)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateSleepTimer(0); } }} aria-label="إلغاء مؤقت النوم">
          <Timer size={11} aria-hidden="true" />
          <span>{Math.floor(sleepRemaining / 60)}:{String(sleepRemaining % 60).padStart(2, "0")}</span>
        </div>
      )}

      {/* ── Word-by-word tap-to-translate info bar ───────── */}
      {wbwMode && activeWord && (
        <div className="mushaf-word-bar" role="status" onClick={(e) => e.stopPropagation()}>
          <div className="mushaf-word-bar-ar arabic-text">{activeWord.ar}</div>
          <div className="mushaf-word-bar-meta">
            {activeWord.tl && <span className="mushaf-word-bar-tl" dir="ltr">{activeWord.tl}</span>}
            {activeWord.tr && <span className="mushaf-word-bar-tr" dir="ltr">{activeWord.tr}</span>}
          </div>
          <button
            type="button"
            className="mushaf-word-bar-close"
            aria-label="إغلاق"
            onClick={() => setActiveWord(null)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Scrollable page area ─────────────────────────── */}
      <div
        className="mushaf-page-area"
        onClick={() => { setSelectedItem(null); flashChrome(); }}
      >
        <div
          ref={pageContentRef}
          className={`mushaf-page-content${pageTransDir ? " page-sliding" : ""}`}
          dir="rtl"
          style={{
            "--mushaf-font-scale": fontScale,
            "--mushaf-line-height": prefs.quranLineHeight,
            "--mushaf-letter-spacing": `${prefs.quranLetterSpacing ?? 0}em`,
            "--mushaf-word-spacing": `${prefs.quranWordSpacing ?? 0}em`,
            ...(pageTransDir ? { "--mushaf-slide-dir": pageTransDir === "left" ? "-1" : "1" } : {}),
          } as React.CSSProperties}
          onScroll={handleContentScroll}
        >
          {/* Always-visible tiny strip */}
          <div className="mushaf-page-info-strip">
            <span>{pageSurahName}</span>
            {memorizationMode ? <span>وضع الحفظ</span> : null}
            {scrollModeEnabled ? <span>وضع التمرير</span> : null}
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
                    const isSearchMatch = normalizedSearch ? normalizeArabicSearch(item.text).includes(normalizedSearch) : false;
                    // Q3: Translation text
                    const transText = showTranslation ? (translationData[item.surahId]?.[item.originalAyah] ?? "") : "";
                    // Q11-B: Inline tafseer text
                    const tafseerText = inlineTafseer ? (inlineTafseerData[item.surahId]?.[item.originalAyah] ?? "") : "";
                    // Phase 2B: Word-by-word data for Tajweed mode
                    const wbwVerse = wbwData[item.surahId]?.[item.originalAyah] ?? null;
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
                          ...(hl && !isSel ? {
                            background: HL_COLORS[hl].bg,
                            boxShadow: `inset 0 -2px 0 ${HL_COLORS[hl].dot}`,
                          } : {}),
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
                        {/* Phase 2B: Tajweed coloring OR plain text; each word becomes a tap
                            target for its translation/transliteration when wbwMode is on */}
                        {wbwVerse ? (
                          wbwVerse.map((word, wi) => (
                            <React.Fragment key={wi}>
                              {wbwMode ? (
                                <span
                                  className="mushaf-wbw-word"
                                  onClick={(e) => { e.stopPropagation(); setActiveWord(word); }}
                                >
                                  {tajweedMode ? renderTajweed(word.tj) : word.ar}
                                </span>
                              ) : (
                                tajweedMode ? renderTajweed(word.tj) : word.ar
                              )}
                              {" "}
                            </React.Fragment>
                          ))
                        ) : (
                            prefs.stripDiacritics ? stripDiacritics(item.text) : item.text
                          )}
                        {tajweedMode && wbwLoading && !wbwVerse ? (
                          <span className="mushaf-wbw-loading">⋯</span>
                        ) : null}
                        {"\u200F"}
                        {!prefs.quranHideMarkers && (
                          <span className={`mushaf-ayah-num${isBookmarked ? " bookmarked" : ""}${isLastRead ? " last-read" : ""}`}>
                            ﴿{toArabicNumeral(item.displayAyah)}﴾
                          </span>
                        )}
                        {isSajda && <span className="mushaf-sajda-badge" aria-label="سجدة تلاوة">ۖ</span>}
                        {" "}
                        {/* Q3: Inline translation (only show if wbw mode is off) */}
                        {!wbwVerse && transText ? (
                          <p className="mushaf-trans-inline italic opacity-65 text-[0.72em] leading-6 mt-1 px-1" dir="ltr" lang="en">
                            {transText}
                          </p>
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
                                <span className="w-3 h-3 border border-[var(--stroke)] border-t-[var(--accent)] rounded-full animate-spin inline-block" aria-hidden="true" />
                                جارٍ تحميل التفسير…
                              </span>
                            ) : tafseerText ? (
                              <>
                                <span className="block text-[10px] font-semibold mb-1 opacity-40" style={{ color: "var(--accent)" }}>
                                  {`✦ تفسير ${getTafsirLabel(inlineTafseerSource)}`}
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

        </div>
      </div>

      {/* ── Bottom action bar (ayah selected) ────────────── */}
      {selectedItem && (
        <div className="mushaf-action-bar" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="mushaf-action-btn" onClick={doCopy} aria-label="نسخ الآية">
            <Copy size={18} aria-hidden="true" />
            <span>نسخ</span>
          </button>
          <button type="button"
            className={`mushaf-action-btn${isSelBookmarked ? " active" : ""}`}
            onClick={() => {
              toggleBookmark(selectedItem.surahId, selectedItem.displayAyah);
              toast.success(isSelBookmarked ? "أُزيلت العلامة" : "✓ تم الحفظ");
            }}
            aria-label={isSelBookmarked ? "إزالة العلامة" : "إضافة علامة"}
            aria-pressed={isSelBookmarked}
          >
            <Bookmark size={18} aria-hidden="true" fill={isSelBookmarked ? "currentColor" : "none"} />
            <span>علامة</span>
          </button>
          <button type="button"
            className={`mushaf-action-btn${playingKey === selKey ? " active" : ""}`}
            onClick={() => playAyah(selectedItem.surahId, selectedItem.originalAyah, selectedItem.displayAyah)}
            aria-label="تلاوة"
          >
            {playingKey === selKey ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            <span>تلاوة</span>
          </button>
          <button type="button"
            className={`mushaf-action-btn${loopEnabled ? " active" : ""}`}
            onClick={() => setLoopEnabled((v) => !v)}
            aria-label="تكرار الآية"
          >
            <Repeat2 size={18} />
            <span>تكرار</span>
          </button>
          {/* Highlight swatches */}
          <div className="mushaf-action-btn" style={{ gap: "0.2rem" }}>
            <div className="flex gap-1">
              {(Object.keys(HL_COLORS) as HlColor[]).map((c) => (
                <button type="button"
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
          <button type="button"
            className={`mushaf-action-btn${notes[selKey] ? " active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!notes[selKey]) {
                setNoteDraft(`${selectedItem.surahName} ﴿${toArabicNumeral(selectedItem.displayAyah)}﴾\n\n`);
              }
              setNoteSheetOpen(true);
            }}
            aria-label="تدبّر"
          >
            <Pencil size={18} aria-hidden="true" />
            <span>تدبّر</span>
          </button>
          <button type="button" className="mushaf-action-btn" onClick={() => setShareSheetOpen(true)} aria-label="مشاركة">
            <Share2 size={18} />
            <span>إرسال</span>
          </button>
          {/* Inline tadabbur handoff — opens the companion modal preloaded with the verse */}
          <button type="button"
            className="mushaf-action-btn"
            aria-label="تدبّر مع أثر"
            onClick={(e) => {
              e.stopPropagation();
              setTadabburSeed(`${selectedItem.surahName} ﴿${toArabicNumeral(selectedItem.displayAyah)}﴾\n﴿${selectedItem.text.slice(0, 380)}﴾`);
              setCompanionOpen(true);
              setSelectedItem(null);
            }}
          >
            <Sparkles size={18} aria-hidden="true" />
            <span>أثر</span>
          </button>
          {/* Q11: Inline tafsir */}
          <button type="button"
            className="mushaf-action-btn"
            aria-label="تفسير"
            onClick={(e) => { e.stopPropagation(); setTafsirItem(selectedItem); setSelectedItem(null); }}
          >
            <ArrowUpRight size={18} aria-hidden="true" />
            <span>تفسير</span>
          </button>
          <button type="button"
            className="mushaf-action-btn"
            style={{ opacity: 0.55 }}
            onClick={() => setSelectedItem(null)}
            aria-label="إغلاق"
          >
            <X size={18} aria-hidden="true" />
            <span>إغلاق</span>
          </button>
        </div>
      )}

      {/* ── Bottom bar: prev/next + page strip (auto-hide with chrome) ─── */}
      <div className={`mushaf-bottom-bar${showChrome || !!selectedItem ? "" : " chrome-hidden"}`} onClick={(e) => e.stopPropagation()}>
        <button type="button"
          className="mushaf-bottom-nav-btn"
          onClick={(e) => { e.stopPropagation(); goPage(currentPage - 1); }}
          disabled={currentPage <= 1}
          aria-label="الصفحة السابقة"
          aria-keyshortcuts="ArrowRight"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button type="button"
          className="mushaf-page-indicator"
          ref={pageStripRef}
          onClick={(e) => { e.stopPropagation(); setShowJump(true); }}
          aria-label="الانتقال إلى صفحة"
        >
          <span className="mushaf-page-indicator-num">{toArabicNumeral(currentPage)}</span>
        </button>
        <button type="button"
          className="mushaf-bottom-nav-btn"
          onClick={(e) => { e.stopPropagation(); goPage(currentPage + 1); }}
          disabled={currentPage >= totalPages}
          aria-label="الصفحة التالية"
          aria-keyshortcuts="ArrowLeft"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
      </div>

      {/* ── Audio player bar ──────────────────────────────── */}
      {!selectedItem && audioBarVisible && (
        <div className={`mushaf-audio-bar${showChrome ? "" : " chrome-hidden"}`} onClick={(e) => e.stopPropagation()}>
          <button type="button"
            className="mushaf-audio-play-btn"
            onClick={() => {
              if (playingKey && audioRef.current) { audioRef.current.pause(); setPlayingKey(null); }
              else if (firstPlayableItem) playAyah(firstPlayableItem.surahId, firstPlayableItem.originalAyah, firstPlayableItem.displayAyah);
            }}
            aria-label={playingKey ? "إيقاف التلاوة" : "تشغيل التلاوة"}
          >
            {playingKey ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          </button>
          <button type="button"
            className="mushaf-audio-reciter mushaf-audio-reciter-btn"
            onClick={() => setShowReciterSheet(true)}
            aria-label="اختيار القارئ"
          >
            <Mic2 size={12} aria-hidden="true" style={{ opacity: 0.6, flexShrink: 0 }} />
            <span>
              {playingKey
                ? `▶ يُشغَّل · آية ${playingKey.split(":")[1] ?? ""}`
                : (QURAN_RECITERS.find((r) => r.id === (prefs.quranReciter ?? "Alafasy_128kbps"))?.label ?? "مشاري العفاسي")}
            </span>
            <ChevronDown size={12} aria-hidden="true" style={{ opacity: 0.5, flexShrink: 0 }} />
          </button>
          <button type="button"
            className="mushaf-audio-toggle"
            onClick={() => setAudioBarVisible(false)}
            aria-label="إخفاء"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Reciter picker sheet ─────────────────────────── */}
      {showReciterSheet && (
        <>
          <div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowReciterSheet(false)} />
          <div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="اختر القارئ" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowReciterSheet(false); } }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="mushaf-sheet-title">اختر القارئ</div>
            <div className="mushaf-reciter-grid">
              {QURAN_RECITERS.map((r) => {
                const dlState = reciterDownloadProgress[r.id];
                const isActive = (prefs.quranReciter ?? "Alafasy_128kbps") === r.id;
                return (
                  <div key={r.id} className="flex items-center gap-1">
                    <button type="button"
                      className={`mushaf-reciter-chip flex-1${isActive ? " active" : ""}`}
                      onClick={() => {
                        setPrefs({ quranReciter: r.id });
                        if (playingKey && audioRef.current) {
                          audioRef.current.pause();
                          setPlayingKey(null);
                        }
                        setShowReciterSheet(false);
                      }}
                    >
                      <Mic2 size={14} aria-hidden="true" />
                      {r.label}
                    </button>
                    {/* Per-reciter page download */}
                    <button type="button"
                      aria-label={`تحميل الصفحة لـ ${r.label}`}
                      disabled={typeof dlState === "object"}
                      onClick={(e) => { e.stopPropagation(); if (dlState !== "done") downloadReciterPage(r.id); }}
                      className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-xl border transition
                        ${dlState === "done"
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                          : typeof dlState === "object"
                            ? "bg-accent-10 border-accent-20 text-[var(--accent)] cursor-wait"
                            : "bg-[var(--card)] border-[var(--stroke)] opacity-55 hover:opacity-90"}`}
                    >
                      {dlState === "done"
                        ? <CheckCircle2 size={11} aria-hidden="true" />
                        : typeof dlState === "object"
                          ? <span className="text-[8px] tabular-nums leading-none">{dlState.done}</span>
                          : <Download size={11} aria-hidden="true" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Audio bar hidden → show button near page nav */}
      {!selectedItem && !audioBarVisible && (
        <button type="button"
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
          <div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowJump(false)} />
          <div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="الانتقال إلى صفحة" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowJump(false); } }} onClick={(e) => e.stopPropagation()} dir="rtl">
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

      {/* ── Share-options sheet (Ayah-style) ─────────────── */}
      {shareSheetOpen && selectedItem && (
        <>
          <div className="mushaf-overlay" aria-hidden="true" onClick={() => setShareSheetOpen(false)} />
          <div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="خيارات المشاركة" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShareSheetOpen(false); } }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-2">
              <span className="mushaf-sheet-title">
                مشاركة · {selectedItem.surahName} ﴿{toArabicNumeral(selectedItem.displayAyah)}﴾
              </span>
              <button type="button" className="mushaf-icon-close" onClick={() => setShareSheetOpen(false)} aria-label="إغلاق">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="mushaf-tadabbur-quote" dir="rtl">{selectedItem.text}</div>
            <div className="mushaf-share-grid" aria-busy={shareBusy}>
              <button type="button" className="mushaf-share-opt" disabled={shareBusy} onClick={() => shareAyahImage(false)}>
                <ImageIcon size={20} aria-hidden="true" />
                <span>صورة</span>
              </button>
              <button type="button" className="mushaf-share-opt" disabled={shareBusy} onClick={() => shareAyahImage(true)}>
                <ImageIcon size={20} aria-hidden="true" />
                <span>صورة مع الترجمة</span>
              </button>
              <button type="button" className="mushaf-share-opt" disabled={shareBusy} onClick={() => shareAyahText(false)}>
                <Share2 size={20} aria-hidden="true" />
                <span>نص الآية</span>
              </button>
              <button type="button" className="mushaf-share-opt" disabled={shareBusy} onClick={() => shareAyahText(true)}>
                <Languages size={20} aria-hidden="true" />
                <span>النص مع الترجمة</span>
              </button>
              <button type="button" className="mushaf-share-opt" disabled={shareBusy} onClick={() => { doCopy(); setShareSheetOpen(false); }}>
                <Copy size={20} aria-hidden="true" />
                <span>نسخ النص</span>
              </button>
            </div>
            {shareBusy && <div className="text-center text-[11px] opacity-50 mt-2">جارٍ التحضير…</div>}
          </div>
        </>
      )}

      {/* ── تدبّر (Reflection) sheet ──────────────────────── */}
      {noteSheetOpen && selectedItem && (
        <>
          <div className="mushaf-overlay" aria-hidden="true" onClick={() => setNoteSheetOpen(false)} />
          <div className="mushaf-note-sheet" role="dialog" aria-modal="true" aria-label="تدبّر" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setNoteSheetOpen(false); } }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-3">
              <span className="mushaf-sheet-title">
                تدبّر · {selectedItem.surahName} ﴿{toArabicNumeral(selectedItem.displayAyah)}﴾
              </span>
              <button type="button"
                className="mushaf-icon-close"
                onClick={() => setNoteSheetOpen(false)}
                aria-label="إغلاق"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {/* Quoted ayah text */}
            <div className="mushaf-tadabbur-quote" dir="rtl">{selectedItem.text}</div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="اكتب تدبّرك في هذه الآية…"
              aria-label="تدبّر الآية"
              rows={4}
              autoFocus
              className="mushaf-textarea mt-2"
            />
            <div className="flex items-center justify-between mt-1 mb-2 px-1">
              <span className="text-[10px] opacity-30">{noteDraft.length} حرف</span>
            </div>
            <div className="flex gap-2 mt-1">
              <button type="button"
                className="mushaf-btn-primary flex-1"
                onClick={() => {
                  const clean = noteDraft.trim();
                  if (clean) { setQuranNote(selectedItem.surahId, selectedItem.displayAyah, clean); toast.success("تم الحفظ ✓"); }
                  else clearQuranNote(selectedItem.surahId, selectedItem.displayAyah);
                  setNoteSheetOpen(false);
                }}
              >
                حفظ
              </button>
              <button type="button"
                className="mushaf-btn-secondary"
                aria-label="مشاركة التدبّر"
                onClick={async () => {
                  const reflection = noteDraft.trim();
                  if (!reflection) { toast.error("اكتب تدبّرك أولاً"); return; }
                  try {
                    const blob = await renderDhikrPosterBlob({
                      text: reflection,
                      sectionTitle: `${selectedItem.surahName} · آية ${toArabicNumeral(selectedItem.displayAyah)}`,
                      footerUrl: "athar.app",
                    });
                    const fname = `tadabbur-${selectedItem.surahId}-${selectedItem.displayAyah}.png`;
                    const file = new File([blob], fname, { type: "image/png" });
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ files: [file] });
                    } else {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 5000);
                    }
                  } catch { toast.error("تعذرت المشاركة"); }
                }}
              >
                <Share2 size={15} />
              </button>
              {notes[selKey] && (
                <button type="button"
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

      {/* ── Inline tadabbur sheet: companion modal preloaded with the verse ─── */}
      <CompanionModal
        open={companionOpen}
        onClose={() => { setCompanionOpen(false); setTadabburSeed(""); }}
        prefill={tadabburSeed ? `تدبَّر معي هذه الآية: اشرحها شرحًا ميسَّرًا واذكر لي ثلاث فوائد عملية لحياتي اليومية.\n﴿${tadabburSeed}﴾` : undefined}
      />

      {/* ── Q11: Inline tafsir sheet ────────────────────── */}
      {tafsirItem && (
        <>
          <div className="mushaf-overlay" aria-hidden="true" onClick={() => setTafsirItem(null)} />
          {/* zIndex must be > overlay (210) — do NOT set lower */}
          <div
            className="mushaf-note-sheet"
            role="dialog" aria-modal="true" aria-label="تفسير"
            style={{ maxHeight: "78vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setTafsirItem(null); } }}
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
                <span style={{ color: "var(--accent)" }} aria-hidden="true">📖</span>
                <span>تفسير ﴿{toArabicNumeral(tafsirItem.displayAyah)}﴾</span>
                <span className="opacity-40 text-xs font-normal">· {tafsirItem.surahName}</span>
              </span>
              <div className="flex items-center gap-1">
                {/* Copy button */}
                <button type="button"
                  className="mushaf-icon-close"
                  aria-label="نسخ"
                  onClick={() => {
                    const ayahTxt = `${tafsirItem.text} ﴿${tafsirItem.displayAyah}﴾`;
                    const tafseerTxt = inlineTafseerData[tafsirItem.surahId]?.[tafsirItem.originalAyah] ?? "";
                    const src = `تفسير ${getTafsirLabel(inlineTafseerSource)}`;
                    navigator.clipboard.writeText(`${ayahTxt}\n\n${src}:\n${tafseerTxt}`).then(() => toast.success("تم النسخ ✓")).catch(() => {});
                  }}
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
                <button type="button" className="mushaf-icon-close" onClick={() => setTafsirItem(null)} aria-label="إغلاق">
                  <X size={15} aria-hidden="true" />
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

            {/* Source tabs — 10 tafsirs, horizontally scrollable */}
            <div className="flex gap-1.5 p-1 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] mb-3 overflow-x-auto no-scrollbar">
              {TAFSIR_EDITIONS.map(({ slug, label }) => (
                <button type="button"
                  key={slug}
                  onClick={() => setInlineTafseerSource(slug)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    inlineTafseerSource === slug
                      ? "bg-accent-20 text-[var(--accent)] border border-accent-30"
                      : "opacity-55 hover:opacity-80"
                  }`}
                >
                  {label}
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
                  <span className="w-3 h-3 border border-[var(--stroke)] border-t-[var(--accent)] rounded-full animate-spin inline-block" aria-hidden="true" />
                  جارٍ تحميل التفسير…
                </span>
              ) : inlineTafseerData[tafsirItem.surahId]?.[tafsirItem.originalAyah] ? (
                <p className="opacity-90 leading-8">{inlineTafseerData[tafsirItem.surahId][tafsirItem.originalAyah]}</p>
              ) : (
                <span className="opacity-35 text-xs">لا يوجد تفسير لهذه الآية</span>
              )}
            </div>

            {/* Mutashabihat — similar-wording ayahs, a common memorization stumbling block */}
            {(mutashabihatLoading || mutashabihatMatches.length > 0) && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold opacity-70">
                  <span aria-hidden="true">🔀</span>
                  <span>آيات متشابهة{mutashabihatMatches.length > 0 ? ` (${toArabicNumeral(mutashabihatMatches.length)})` : ""}</span>
                </div>
                {mutashabihatLoading ? (
                  <span className="flex items-center gap-2 py-1 opacity-40 text-xs">
                    <span className="w-3 h-3 border border-[var(--stroke)] border-t-[var(--accent)] rounded-full animate-spin inline-block" aria-hidden="true" />
                    جارٍ البحث عن آيات متشابهة…
                  </span>
                ) : mutashabihatMatches.length === 0 ? (
                  <p className="opacity-50 text-xs py-1">لا توجد آيات متشابهة لهذه الآية.</p>
                ) : (
                  <div className="space-y-1.5">
                    {mutashabihatMatches.map((m, i) => {
                      const surah = quranDB?.find((s) => s.id === m.ref.surahId);
                      const snippet = surah?.ayahs?.[m.ref.ayahStart - 1] ?? "";
                      const isSameAyah = m.ref.surahId === tafsirItem.surahId && m.ref.ayahStart === tafsirItem.originalAyah;
                      if (isSameAyah) return null;
                      return (
                        <button type="button"
                          key={`${m.ref.surahId}-${m.ref.ayahStart}-${i}`}
                          onClick={() => jumpToAyah(m.ref.surahId, m.ref.ayahStart)}
                          className="w-full text-right p-2.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                              {surah?.name ?? ""} ﴿{toArabicNumeral(m.ref.ayahStart)}{m.ref.ayahEnd !== m.ref.ayahStart ? `-${toArabicNumeral(m.ref.ayahEnd)}` : ""}﴾
                            </span>
                            <ArrowUpRight size={12} aria-hidden="true" className="opacity-40 shrink-0" />
                          </div>
                          <div className="arabic-text text-xs opacity-75 line-clamp-2" dir="rtl">{snippet}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      )}

      {/* ── Settings sheet ──────────────────────────────── */}
      {showSettings && (
        <>
          <div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowSettings(false)} />
          <div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="إعدادات القراءة" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowSettings(false); } }} style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <span className="mushaf-sheet-title">إعدادات القراءة</span>
              <button type="button" aria-label="إغلاق" className="mushaf-icon-close" onClick={() => setShowSettings(false)}><X size={16} aria-hidden="true" /></button>
            </div>
            {/* Font scale */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs opacity-55 shrink-0">الخط</span>
              <button type="button" aria-label="تصغير الخط" className="mushaf-btn-secondary" onClick={() => bumpFont(-0.1)}><ZoomOut size={14} aria-hidden="true" /></button>
              <span className="text-xs opacity-60 tabular-nums w-8 text-center">{Math.round(fontScale * 100)}%</span>
              <button type="button" aria-label="تكبير الخط" className="mushaf-btn-secondary" onClick={() => bumpFont(0.1)}><ZoomIn size={14} aria-hidden="true" /></button>
            </div>
            {/* Q3: Translation — same picker + same prefs as Settings.tsx */}
            <TranslationPicker
              enabled={showTranslation}
              value={quranTranslationId}
              onEnabledChange={setShowTranslationPref}
              onChange={(id) => setPrefs({ quranTranslationId: id })}
            />
            {/* Q11-B: Inline Tafseer */}
            <div className="mb-3 p-3 rounded-2xl border"
              style={{
                background: inlineTafseer ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--card)",
                borderColor: inlineTafseer ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--stroke)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">📖</span>
                  <div>
                    <div className="text-xs font-semibold" style={inlineTafseer ? { color: "var(--accent)" } : {}}>عرض التفسير</div>
                    <div className="text-[10px] opacity-45">تفسير تحت كل آية</div>
                  </div>
                </div>
                <button type="button"
                  onClick={() => setInlineTafseer((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${inlineTafseer ? "bg-green-500" : "bg-red-500/25 ring-1 ring-red-500/30"}`}
                  role="switch" aria-checked={inlineTafseer}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${inlineTafseer ? "right-1" : "right-7"}`} />
                </button>
              </div>
              {inlineTafseer && (
                <div className="flex gap-1.5 p-1 rounded-xl bg-black/20 border border-[var(--stroke)] overflow-x-auto no-scrollbar">
                  {TAFSIR_EDITIONS.map(({ slug, label }) => (
                    <button type="button"
                      key={slug}
                      onClick={() => setInlineTafseerSource(slug)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        inlineTafseerSource === slug
                          ? "bg-accent-20 text-[var(--accent)] border border-accent-30"
                          : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reciter */}
            <button type="button" className="mushaf-btn-secondary w-full mb-3" onClick={() => { setShowSettings(false); setShowReciterSheet(true); }}>
              <Mic2 size={14} aria-hidden="true" />
              {QURAN_RECITERS.find((r) => r.id === (prefs.quranReciter ?? "Alafasy_128kbps"))?.label ?? "مشاري العفاسي"}
            </button>
            {/* Q7: Playback speed */}
            <div className="mb-3">
              <div className="text-xs opacity-50 mb-1.5">سرعة التلاوة</div>
              <div className="flex gap-1 flex-wrap">
                {([0.75, 1, 1.25, 1.5, 2] as number[]).map((sp) => (
                  <button type="button"
                    key={sp}
                    onClick={() => setPlaybackSpeed(sp)}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${playbackSpeed === sp ? "bg-accent-20 border-accent-30 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                  >{sp}×</button>
                ))}
              </div>
            </div>
            {/* Audio volume control — persisted per-device so the user
                doesn't have to adjust it on every session. */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs opacity-50">مستوى الصوت</span>
                <span className="text-[10px] opacity-50 tabular-nums">{Math.round(audioVolume * 100).toLocaleString("ar-EG")}٪</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                aria-label="مستوى الصوت"
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to left, var(--accent) 0%, var(--accent) ${audioVolume * 100}%, color-mix(in srgb, var(--stroke) 80%, transparent) ${audioVolume * 100}%, color-mix(in srgb, var(--stroke) 80%, transparent) 100%)`,
                }}
              />
            </div>
            {/* Q4: Loop count */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs opacity-50">تكرار الآية</span>
                <button type="button"
                  onClick={() => setLoopEnabled((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${loopEnabled ? "bg-green-500" : "bg-red-500/25 ring-1 ring-red-500/30"}`}
                  role="switch" aria-checked={loopEnabled}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${loopEnabled ? "right-1" : "right-7"}`} />
                </button>
              </div>
              {loopEnabled && (
                <div className="flex gap-1 flex-wrap">
                  {([2, 3, 5, 7, 10, -1] as number[]).map((n) => (
                    <button type="button"
                      key={n}
                      onClick={() => setLoopCount(n)}
                      aria-label={n === -1 ? "تكرار لا نهائي" : `تكرار ${n} مرات`}
                      aria-pressed={loopCount === n}
                      className={`px-2.5 py-1 rounded-xl text-xs border transition ${loopCount === n ? "bg-accent-20 border-accent-30 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                    >{n === -1 ? "∞" : `${n}×`}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Q8: Auto-advance */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs opacity-65">تقدم تلقائي للآية التالية</span>
              <button type="button"
                onClick={() => setAutoAdvance((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${autoAdvance ? "bg-green-500" : "bg-red-500/25 ring-1 ring-red-500/30"}`}
                role="switch" aria-checked={autoAdvance}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${autoAdvance ? "right-1" : "right-7"}`} />
              </button>
            </div>
            {/* Q5: Range loop */}
            {autoAdvance && (
              <div className="mb-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--stroke)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs opacity-65">تكرار نطاق</span>
                  <button type="button"
                    onClick={() => {
                      const on = !loopRange;
                      setLoopRange(on);
                      if (on) { setLoopRangeStartIdx(0); setLoopRangeEndIdx(Math.max(0, playableItems.length - 1)); }
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${loopRange ? "bg-green-500" : "bg-red-500/25 ring-1 ring-red-500/30"}`}
                    role="switch" aria-checked={loopRange}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${loopRange ? "right-1" : "right-7"}`} />
                  </button>
                </div>
                {loopRange && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] opacity-45 shrink-0">من</span>
                    <input type="number" min={0} max={playableItems.length - 1} value={loopRangeStartIdx}
                      aria-label="بداية التكرار"
                      onChange={(e) => setLoopRangeStartIdx(Math.max(0, Math.min(playableItems.length - 1, Number(e.target.value))))}
                      className="w-12 rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-1.5 py-1 text-xs text-center" />
                    <span className="text-[11px] opacity-45 shrink-0">إلى</span>
                    <input type="number" min={loopRangeStartIdx} max={playableItems.length - 1} value={loopRangeEndIdx}
                      aria-label="نهاية التكرار"
                      onChange={(e) => setLoopRangeEndIdx(Math.max(loopRangeStartIdx, Math.min(playableItems.length - 1, Number(e.target.value))))}
                      className="w-12 rounded-xl bg-[var(--card)] border border-[var(--stroke)] px-1.5 py-1 text-xs text-center" />
                    <span className="text-[11px] opacity-35 shrink-0">/ {playableItems.length}</span>
                  </div>
                )}
              </div>
            )}
            {/* Q15: Surah info */}
            <div className="mt-1">
              <button type="button"
                onClick={() => setShowSurahInfo((v) => !v)}
                aria-expanded={showSurahInfo}
                aria-controls="mushaf-surah-info"
                className="flex items-center gap-1.5 text-xs opacity-55 hover:opacity-90 transition mb-2"
              >
                <Info size={13} aria-hidden="true" />
                <span>معلومات السورة</span>
              </button>
              {showSurahInfo && lastItem && (
                <div id="mushaf-surah-info" className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] text-center text-sm">
                  {[
                    ["السورة", lastItem.surahName],
                    ["الاسم بالإنجليزية", pageSurahEnglish || ""],
                    ["النوع", getSurahRevelationLabel(lastItem.surahId)],
                    ["الجزء", String(getSurahJuz(lastItem.surahId))],
                    ["عدد الآيات", (quranDB?.find((s) => s.id === lastItem.surahId)?.ayahs.length ?? 0).toLocaleString("ar-EG")],
                    ["وقت القراءة", `~${Math.max(1, Math.ceil((quranDB?.find((s) => s.id === lastItem.surahId)?.ayahs.length ?? 0) / 8)).toLocaleString("ar-EG")} دقيقة`],
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
                {(["default", "sepia", "midnight", "parchment", "forest", "rose", "ocean", "desert", "dawn"] as const).map((t) => (
                  <button type="button"
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    className={`text-[10px] px-2.5 py-1.5 rounded-xl border transition ${prefs.quranTheme === t ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                  >{{ default: "🌑 افتراضي", sepia: "🟫 سيبيا", midnight: "🌙 ليلي", parchment: "📜 رق", forest: "🌲 غابة", rose: "🌹 وردي", ocean: "🌊 بحر", desert: "🏜️ صحراء", dawn: "🌅 فجر" }[t]}</button>
                ))}
              </div>
            </div>

            {/* ── M3b: Reading layout (clean vs classic frame) ── */}
            <div className="mt-1 mb-3">
              <div className="text-xs opacity-50 mb-1.5">نمط الصفحة</div>
              <div className="flex gap-1.5">
                <button type="button"
                  onClick={() => setPrefs({ mushafCleanMode: true })}
                  aria-pressed={(prefs.mushafCleanMode ?? true)}
                  className={`flex-1 text-[11px] px-2.5 py-2 rounded-xl border transition ${(prefs.mushafCleanMode ?? true) ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                >📖 قراءة مريحة</button>
                <button type="button"
                  onClick={() => setPrefs({ mushafCleanMode: false })}
                  aria-pressed={!(prefs.mushafCleanMode ?? true)}
                  className={`flex-1 text-[11px] px-2.5 py-2 rounded-xl border transition ${!(prefs.mushafCleanMode ?? true) ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                >🌺 إطار زخرفي</button>
              </div>
            </div>

            {/* Pass A: `prefs.quranScrollMode` — page-by-page vs continuous flow */}
            <div className="mt-1 mb-3">
              <div className="text-xs opacity-50 mb-1.5">نمط التمرير</div>
              <div className="flex gap-1.5">
                <button type="button"
                  onClick={() => setPrefs({ quranScrollMode: "page" })}
                  aria-pressed={(prefs.quranScrollMode ?? "page") === "page"}
                  className={`flex-1 text-[11px] px-2.5 py-2 rounded-xl border transition ${(prefs.quranScrollMode ?? "page") === "page" ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                >📄 صفحة صفحة</button>
                <button type="button"
                  onClick={() => setPrefs({ quranScrollMode: "scroll" })}
                  aria-pressed={prefs.quranScrollMode === "scroll"}
                  className={`flex-1 text-[11px] px-2.5 py-2 rounded-xl border transition ${prefs.quranScrollMode === "scroll" ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                >📜 تمرير متصل</button>
              </div>
            </div>

            {/* ── M4: Font / text colour ────────────────────── */}
            <div className="mt-1 mb-3">
              <div className="text-xs opacity-50 mb-1.5 flex items-center gap-1.5">
                لون الخط
                {tajweedMode && <span className="text-[10px] opacity-70" style={{ color: "#d97706" }}>· التجويد يلوّن الحركات</span>}
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                <button type="button"
                  onClick={() => setPrefs({ mushafTextColor: undefined })}
                  className={`text-[10px] px-2.5 py-1.5 rounded-xl border transition ${
                    !prefs.mushafTextColor ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"
                  }`}
                >افتراضي</button>
                {([
                  { color: "#000000", label: "أسود" },
                  { color: "#1a1208", label: "حبر" },
                  { color: "#2d3557", label: "نيلي" },
                  { color: "#1a3a1a", label: "أخضر" },
                  { color: "#5c2a00", label: "بني" },
                  { color: "#c9a227", label: "ذهبي" },
                  { color: "#e8d8c8", label: "فاتح" },
                  { color: "#ffffff", label: "أبيض" },
                ] as const).map(({ color, label }) => (
                  <button type="button"
                    key={color}
                    title={label}
                    aria-label={label}
                    onClick={() => setPrefs({ mushafTextColor: color })}
                    className={`w-7 h-7 rounded-full border-2 transition shrink-0 ${
                      prefs.mushafTextColor === color ? "border-[var(--accent)] scale-110" : "border-transparent"
                    }`}
                    style={{ background: color, boxShadow: "0 0 0 1px rgba(0,0,0,0.18)" }}
                  />
                ))}
              </div>
            </div>

          </div>
        </>
      )}

      {/* ── More actions sheet ──────────────────────────── */}
      {showMoreSheet && (
        <>
          <div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowMoreSheet(false)} />
          <div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="الإجراءات السريعة" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowMoreSheet(false); } }} style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <span className="mushaf-sheet-title">الإجراءات السريعة</span>
              <button type="button" aria-label="إغلاق" className="mushaf-icon-close" onClick={() => setShowMoreSheet(false)}><X size={16} aria-hidden="true" /></button>
            </div>

            {/* ── سجّل ورد اليوم — only when khatma plan active ── */}
            {khatmaStartISO && (
              <button type="button"
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
                <span className="text-2xl" aria-hidden="true">📅</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>سجّل ورد اليوم</div>
                  <div className="text-[11px] opacity-55">تحديد اليوم كمكتمل في خطة الختمة</div>
                </div>
              </button>
            )}

            {/* ── Toggle rows ── */}
            {([
              { label: "بحث في الصفحة", sub: "ابحث داخل آيات الصفحة الحالية", icon: <Search size={16} aria-hidden="true" />, active: showSearch,
                onPress: () => { setShowSearch((v) => !v); if (showSearch) setInPageSearch(""); setShowMoreSheet(false); } },
              { label: "الترجمة", sub: (() => { const m = TRANSLATION_SOURCES.find((s) => s.id === quranTranslationId); return m ? `${m.ar} — ${m.en}` : ""; })(), icon: <Languages size={16} aria-hidden="true" />, active: showTranslation,
                onPress: () => { setShowTranslationPref((v) => !v); setShowMoreSheet(false); } },
              { label: memorizationMode ? "إيقاف وضع الحفظ" : "وضع الحفظ", sub: "اختبر حفظك آية بآية", icon: memorizationMode ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />, active: memorizationMode,
                onPress: () => { setMemorizationMode((v) => { if (v) setRevealedItems(new Set()); return !v; }); flashChrome(); setShowMoreSheet(false); } },
            ] as Array<{ label: string; sub: string; icon: React.ReactNode; active: boolean; onPress: () => void }>).map(({ label, sub, icon, active, onPress }) => (
              <button type="button"
                key={label}
                className="w-full flex items-center justify-between gap-3 py-3.5 px-1 border-b transition"
                style={{ borderColor: "var(--stroke)" }}
                onClick={onPress}
              >
                <div className="flex items-center gap-3">
                  <span className="opacity-55">{icon}</span>
                  <div className="text-right">
                    <div className="text-sm">{label}</div>
                    <div className="text-[10px] opacity-40">{sub}</div>
                  </div>
                </div>
                <div className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${active ? "bg-green-500" : "bg-red-500/25 ring-1 ring-red-500/30"}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${active ? "right-1" : "right-7"}`} />
                </div>
              </button>
            ))}

            {/* ── Mark page reviewed ── */}
            <button type="button"
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "var(--stroke)" }}
              onClick={() => { markPageReviewed(); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><CheckCircle2 size={16} /></span>
              <div>
                <div className="text-sm">حفظ مراجعة الصفحة</div>
                <div className="text-[10px] opacity-40">تسجيل قراءة جميع آيات هذه الصفحة</div>
              </div>
            </button>

            {/* ── Jump to page ── */}
            <button type="button"
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "var(--stroke)" }}
              onClick={() => { setShowJump(true); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><MoreVertical size={16} aria-hidden="true" /></span>
              <div>
                <div className="text-sm">الانتقال إلى صفحة</div>
                <div className="text-[10px] opacity-40">الصفحة {currentPage} من {totalPages}</div>
              </div>
            </button>

            {/* ── Random ayah ── */}
            <button
              type="button"
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "var(--stroke)" }}
              onClick={() => {
                if (!quranDB || quranDB.length === 0) return;
                const randomSurah = quranDB[Math.floor(Math.random() * quranDB.length)]!;
                const randomAyah = Math.floor(Math.random() * randomSurah.ayahs.length) + 1;
                setShowMoreSheet(false);
                navigate(`/mushaf?surah=${randomSurah.id}&ayah=${randomAyah}`);
              }}
            >
              <span className="opacity-55"><Shuffle size={16} aria-hidden="true" /></span>
              <div>
                <div className="text-sm">آية عشوائية</div>
                <div className="text-[10px] opacity-40">انتقال سريع إلى موضع جديد للتلاوة</div>
              </div>
            </button>

            {/* ── Offline and audio quick tools ── */}
            <div className="mb-3 mt-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--stroke)]">
              <div className="text-xs opacity-50 mb-2">أدوات سريعة</div>

              <button type="button"
                className="mushaf-btn-secondary w-full flex items-center gap-2 justify-center mb-2"
                onClick={downloadPageAudio}
                disabled={!!cacheProgress || !!bulkDownloadProgress}
              >
                <Download size={14} aria-hidden="true" />
                {cacheProgress
                  ? `جاري التحميل… ${cacheProgress.done}/${cacheProgress.total}`
                  : "تحميل الصفحة للاستماع دون إنترنت"}
              </button>

              <button type="button"
                className="mushaf-btn-secondary w-full flex items-center gap-2 justify-center mb-2"
                onClick={downloadSurahAudio}
                disabled={!!cacheProgress || !!bulkDownloadProgress}
              >
                <Download size={14} aria-hidden="true" />
                {bulkDownloadProgress
                  ? `${bulkDownloadProgress.label}… ${bulkDownloadProgress.done}/${bulkDownloadProgress.total}`
                  : `تحميل ${pageSurahName} كاملة`}
              </button>

              <button type="button"
                className="mushaf-btn-secondary w-full flex items-center gap-2 justify-center mb-2"
                onClick={downloadJuzAudio}
                disabled={!!cacheProgress || !!bulkDownloadProgress}
              >
                <Download size={14} aria-hidden="true" />
                تحميل الجزء {toArabicNumeral(pageJuz)} كاملًا
              </button>
              {bulkDownloadProgress && (
                <div className="mb-2 h-1.5 rounded-full bg-[var(--card)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(bulkDownloadProgress.done / bulkDownloadProgress.total) * 100}%`, background: "var(--accent)" }}
                  />
                </div>
              )}

              <button type="button"
                className="mushaf-btn-secondary w-full flex items-center gap-2 justify-center mb-2"
                onClick={downloadAllTajweedData}
                disabled={!!tajweedDownloadProgress}
              >
                <Download size={14} aria-hidden="true" />
                {tajweedDownloadProgress
                  ? `جارٍ التحميل… ${tajweedDownloadProgress.done}/114 سورة`
                  : "تحميل ألوان التجويد كاملة"}
              </button>
              {tajweedDownloadProgress && (
                <div className="mb-2 h-1.5 rounded-full bg-[var(--card)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(tajweedDownloadProgress.done / 114) * 100}%`, background: "var(--accent)" }}
                  />
                </div>
              )}

              <div className="mb-2">
                <div className="text-xs opacity-50 mb-1.5 flex items-center gap-1">
                  <Timer size={12} aria-hidden="true" />
                  مؤقت النوم
                  {sleepMinutes > 0 && (
                    <span className="text-[10px] text-[var(--accent)] mr-1">{Math.floor(sleepRemaining / 60)}:{String(sleepRemaining % 60).padStart(2, "0")}</span>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {([0, 15, 30, 45, 60, 90] as const).map((m) => (
                    <button type="button"
                      key={m}
                      onClick={() => activateSleepTimer(m)}
                      className={`text-[10px] px-2.5 py-1.5 rounded-xl border transition ${sleepMinutes === m ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                    >{m === 0 ? "إيقاف" : `${m} د`}</button>
                  ))}
                </div>
              </div>

              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs opacity-50 flex items-center gap-1"><Radio size={12} aria-hidden="true" />راديو القرآن</span>
                  <button type="button"
                    onClick={handleRadioToggle}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${radioState.playing ? "bg-accent-20 border-accent-30 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                  >{radioState.loading ? "جارٍ التشغيل…" : radioState.playing ? "⏹ إيقاف" : "▶ تشغيل"}</button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {QURAN_RADIO_STATIONS.map((st, i) => (
                    <button type="button"
                      key={st.label}
                      onClick={() => handleRadioStationSelect(i)}
                      className={`text-[10px] px-2 py-1 rounded-xl border transition ${radioState.stationIdx === i ? "bg-accent-15 border-accent-35 text-[var(--accent)]" : "bg-[var(--card)] border-[var(--stroke)] opacity-65"}`}
                    >{st.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs opacity-50 flex items-center gap-1"><SlidersHorizontal size={12} aria-hidden="true" />المعادل الصوتي</span>
                  <button type="button"
                    onClick={() => setEqEnabled((v) => !v)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${eqEnabled ? "bg-green-500" : "bg-red-500/25 ring-1 ring-red-500/30"}`}
                    role="switch" aria-checked={eqEnabled}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${eqEnabled ? "right-1" : "right-7"}`} />
                  </button>
                </div>
                {eqEnabled && (
                  <div className="space-y-2 p-3 rounded-2xl bg-[var(--card)] border border-[var(--stroke)]">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] opacity-50 w-10 shrink-0">باس</span>
                      <input type="range" min={-12} max={12} step={1} value={bassGain}
                        aria-label="درجة الباس"
                        onChange={(e) => setBassGain(Number(e.target.value))}
                        className="flex-1 h-1 accent-[var(--accent)]" />
                      <span className="text-[11px] opacity-50 w-8 text-left tabular-nums">{bassGain > 0 ? "+" : ""}{bassGain}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] opacity-50 w-10 shrink-0">تريبل</span>
                      <input type="range" min={-12} max={12} step={1} value={trebleGain}
                        aria-label="درجة التريبل"
                        onChange={(e) => setTrebleGain(Number(e.target.value))}
                        className="flex-1 h-1 accent-[var(--accent)]" />
                      <span className="text-[11px] opacity-50 w-8 text-left tabular-nums">{trebleGain > 0 ? "+" : ""}{trebleGain}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Reading plans ── */}
            <button type="button"
              className="w-full flex items-center gap-3 py-3.5 px-1 text-right transition"
              onClick={() => { setShowMoreSheet(false); navigate("/quran/plans"); }}
            >
              <span className="opacity-55 text-lg" aria-hidden="true">📅</span>
              <div>
                <div className="text-sm">خطط التلاوة</div>
                <div className="text-[10px] opacity-40">إدارة ورد الختمة والمراجعة اليومية</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── Session summary (Phase 2F) ───────────────────── */}
      {showSessionSummary && (
        <>
          <div
            className="mushaf-overlay"
            style={{ zIndex: 249 }}
            onClick={() => { setShowSessionSummary(false); navigate("/quran", { replace: true }); }}
          />
          <div className="mushaf-session-card" role="dialog" aria-modal="true" aria-label="ملخص جلسة القراءة" dir="rtl">
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }} aria-hidden="true">📖</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>جلسة قراءة</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.65, marginBottom: sessionSurahCompletedRef.current.size > 0 ? "0.75rem" : "1.25rem" }}>
              {toArabicNumeral(sessionDurationMin)} دقيقة · {toArabicNumeral(pagesReadRef.current.size)} صفحة
              {sessionAyahCountRef.current > 0 && <span> · {toArabicNumeral(sessionAyahCountRef.current)} آية</span>}
              {(() => {
                const todayKey = new Date().toISOString().slice(0, 10);
                const todayAyahs = quranDailyAyahs?.[todayKey] ?? 0;
                return todayAyahs > 0 ? <span> · {toArabicNumeral(todayAyahs)} آية اليوم</span> : null;
              })()}
            </div>
            {sessionSurahCompletedRef.current.size > 0 && (
              <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
                {[...sessionSurahCompletedRef.current].map((sid) => {
                  const name = quranDB?.find((s) => s.id === sid)?.name;
                  if (!name) return null;
                  return (
                    <span key={sid} style={{ fontSize: "0.78rem", padding: "0.2rem 0.65rem", borderRadius: "999px", background: "rgba(61,220,151,0.15)", color: "#3ddc97", border: "1px solid rgba(61,220,151,0.3)" }}>
                      {name} ✓
                    </span>
                  );
                })}
              </div>
            )}
            <button type="button"
              className="mushaf-btn-primary"
              style={{ width: "100%" }}
              onClick={() => { setShowSessionSummary(false); navigate("/quran", { replace: true }); }}
            >
              حسنًا
            </button>
          </div>
        </>
      )}

      <FloatingAthar
        modalMode
        context={{
          icon: "📖",
          title: selectedItem
            ? `${selectedItem.surahName} • ${toArabicNumeral(selectedItem.surahId)}:${toArabicNumeral(selectedItem.displayAyah)}`
            : `صفحة ${toArabicNumeral(currentPage)} من المصحف`,
          subtitle: selectedItem ? `${toArabicNumeral(selectedItem.surahId)}:${toArabicNumeral(selectedItem.displayAyah)}` : "",
          hint: selectedItem
            ? `الزائر يقرأ حاليًا الآية «﴿${sliceAtWordBoundary(selectedItem.text, 120)}﴾» ويريد شرحها مع فوائد عملية.`
            : `الزائر يتصفح صفحة ${toArabicNumeral(currentPage)} من المصحف.`,
        }}
        prefill={
          selectedItem
            ? `تدبَّر معي هذه الآية: اشرحها شرحًا ميسَّرًا مع فوائد عملية لحياتي اليومية:\n﴿${sliceAtWordBoundary(selectedItem.text, 400)}﴾`
            : "ما الذي ينفعني في هذه الصفحة من المصحف الآن؟"
        }
      />
    </div>
  );
}
