import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, BookOpenText, ChevronDown, Pause, Play, Share2, Shuffle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DAILY_VERSES } from "@/data/dailyVerses";
import { DAILY_WISDOMS } from "@/data/dailyWisdom";
import { QURAN_VOCAB } from "@/data/quranVocab";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useQuranDB } from "@/data/useQuranDB";
import { searchAyah } from "@/data/quranAyahIndex";
import { Button } from "@/components/ui/Button";
import { fetchDailyHadith, fetchRandomHadith, fetchSharhHadith, prewarmSharhBundle, type SharhHadith } from "@/lib/hadithSharhAPI";
import { syncSunnahWidget } from "@/lib/widgetDataBridge";
import toast from "react-hot-toast";
import { arNum } from "@/lib/formatNumber";
import { shareText } from "@/lib/shareTargets";
import { accountScopedLocalStorage } from "@/lib/accountStorageScope";


function dateIndex(dateKey: string, length: number, offset = 0): number {
  if (length === 0) return -1;
  let hash = offset;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

/** Pick a random index that differs from `current` */
function randomOtherIdx(current: number, length: number): number {
  if (length <= 1) return 0;
  let next: number;
  do { next = Math.floor(Math.random() * length); } while (next === current);
  return next;
}

const SLIDE_LABELS = ["آية اليوم", "حديث اليوم", "تدبر اليوم", "كلمة اليوم", "دعاء اليوم", "سنة اليوم"] as const;
const SLIDE_COUNT = SLIDE_LABELS.length;
type ShuffleState = Array<number | null>;
const emptyShuffle = (): ShuffleState => Array.from({ length: SLIDE_COUNT }, () => null);

/** Sections the daily dua is drawn from: every supplication the app carries. */
const DUA_SECTIONS = ["jawami_dua", "prophetic_duas", "quranic_duas", "prophets_duas"];

// Persists whatever the user last shuffled to, so closing and reopening the
// app shows the same card instead of silently reverting to the day's
// deterministic pick — shuffleIdx/hadithOverride used to be plain React
// state, gone the moment the component unmounted.
const SHUFFLE_PERSIST_KEY = "noor_daily_carousel_shuffle_v1";

type PersistedShuffle = {
  dateKey: string;
  shuffleIdx: ShuffleState;
  hadithOverrideId: string | null;
};

function readPersistedShuffle(dateKey: string): PersistedShuffle | null {
  try {
    const raw = accountScopedLocalStorage.getItem(SHUFFLE_PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShuffle;
    if (!parsed || parsed.dateKey !== dateKey) return null;
    // Saved before the dua and sunnah cards existed: pad rather than discard.
    const saved = Array.isArray(parsed.shuffleIdx) ? parsed.shuffleIdx : [];
    parsed.shuffleIdx = Array.from({ length: SLIDE_COUNT }, (_, i) => (typeof saved[i] === "number" ? saved[i] : null));
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedShuffle(state: PersistedShuffle): void {
  try {
    accountScopedLocalStorage.setItem(SHUFFLE_PERSIST_KEY, JSON.stringify(state));
  } catch {
    // non-fatal — worst case a restart loses the shuffle position
  }
}

export function DailyCarousel({ dateKey }: { dateKey: string }) {
  const navigate = useNavigate();

  const prefersReducedMotionByDefault = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  };

  // Warm the offline explanation bundle as soon as the home screen mounts, so
  // the first sharh the user opens (here or in the reader) is instant.
  React.useEffect(() => { prewarmSharhBundle(); }, []);

  const [activeIdx, setActiveIdx] = React.useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(prefersReducedMotionByDefault);
  const [autoRotate, setAutoRotate] = React.useState(() => !prefersReducedMotionByDefault());
  const [pointerInside, setPointerInside] = React.useState(false);
  const pauseUntilRef = React.useRef<number>(0);
  const touchStartX = React.useRef<number>(0);
  const pointerActivatingRotationControl = React.useRef(false);
  const pointerActivationResetTimer = React.useRef<number | null>(null);
  const slidesRef = React.useRef<Array<HTMLDivElement | null>>([]);
  const originalTabIndexes = React.useRef(new WeakMap<HTMLElement, string | null>());
  const clearPointerActivation = React.useCallback(() => {
    pointerActivatingRotationControl.current = false;
    if (pointerActivationResetTimer.current !== null) {
      window.clearTimeout(pointerActivationResetTimer.current);
      pointerActivationResetTimer.current = null;
    }
  }, []);
  const settlePointerActivation = React.useCallback(() => {
    const pointerActivationWasPending = pointerActivatingRotationControl.current;
    clearPointerActivation();
    const rotationControl = document.querySelector<HTMLElement>("[data-rotation-toggle]");
    if (pointerActivationWasPending && rotationControl?.contains(document.activeElement)) setAutoRotate(false);
  }, [clearPointerActivation]);
  const setSlideInert = React.useCallback((slide: HTMLDivElement | null, index: number) => {
    if (!slide) return;
    const inactive = activeIdx !== index;
    if (inactive && slide.contains(document.activeElement)) {
      slide.closest<HTMLElement>('[role="region"][aria-label="محتوى يومي"]')?.focus();
    }
    if (inactive) slide.setAttribute("inert", "");
    else slide.removeAttribute("inert");

    // The inert attribute is not supported by older iOS WebViews. Keep their
    // keyboard focus order in sync while preserving each element's prior value.
    const focusable = slide.querySelectorAll<HTMLElement>(
      'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, audio[controls], video[controls], summary, [contenteditable="true"], [tabindex]',
    );
    focusable.forEach((element) => {
      if (inactive) {
        if (!originalTabIndexes.current.has(element)) {
          originalTabIndexes.current.set(element, element.getAttribute("tabindex"));
        }
        element.setAttribute("tabindex", "-1");
        return;
      }

      if (!originalTabIndexes.current.has(element)) return;
      const original = originalTabIndexes.current.get(element);
      if (original === null || original === undefined) element.removeAttribute("tabindex");
      else element.setAttribute("tabindex", original);
      originalTabIndexes.current.delete(element);
    });
  }, [activeIdx]);
  React.useLayoutEffect(() => {
    slidesRef.current.forEach((slide, index) => setSlideInert(slide, index));
  });
  // null = show daily item; number = user-shuffled index (resets on new
  // dateKey). Seeded from localStorage so a shuffle survives closing and
  // reopening the app instead of silently reverting to the day's pick.
  const [shuffleIdx, setShuffleIdx] = React.useState<ShuffleState>(
    () => readPersistedShuffle(dateKey)?.shuffleIdx ?? emptyShuffle(),
  );
  const [showVocabExplain, setShowVocabExplain] = React.useState(false);
  const [showDuaBenefit, setShowDuaBenefit] = React.useState(false);

  // The daily dua and sunnah come from the adhkar database, which Home already
  // loads, so this costs nothing extra.
  const adhkarDb = useAdhkarDB();
  const quranDb = useQuranDB();
  const duaPool = React.useMemo(() => {
    const secs = adhkarDb.data?.db.sections ?? [];
    return DUA_SECTIONS.flatMap((id) => secs.find((s) => s.id === id)?.content ?? []);
  }, [adhkarDb.data]);
  const sunnahPool = React.useMemo(
    () => adhkarDb.data?.db.sections.find((s) => s.id === "sunan")?.content ?? [],
    [adhkarDb.data],
  );
  const poolLengths = [DAILY_VERSES.length, 1, DAILY_WISDOMS.length, QURAN_VOCAB.length, duaPool.length, sunnahPool.length];
  const [spinSlide, setSpinSlide] = React.useState<number | null>(null);

  // حديث اليوم — a real hadeethenc.com record (text + grade + attribution +
  // explanation all from one source), picked deterministically per day. No
  // AI generation and no cross-referencing to a second corpus involved.
  const [dailyHadith, setDailyHadith] = React.useState<SharhHadith | null>(null);
  const [hadithOverride, setHadithOverride] = React.useState<SharhHadith | null>(null);
  const [hadithLoading, setHadithLoading] = React.useState(true);
  const [showHadithExplanation, setShowHadithExplanation] = React.useState(false);
  const hadith = hadithOverride ?? dailyHadith;

  React.useEffect(() => {
    let alive = true;
    setHadithLoading(true);
    fetchDailyHadith(dateKey)
      .then((h) => {
        if (!alive) return;
        setDailyHadith(h);
      })
      .finally(() => { if (alive) setHadithLoading(false); });
    return () => { alive = false; };
  }, [dateKey]);

  // Mirror whatever hadith is currently shown (daily OR the one the user
  // shuffled to) onto the home-screen widget — same record, nothing
  // re-derived — so the widget and the card never disagree.
  React.useEffect(() => {
    if (hadith) void syncSunnahWidget({ id: hadith.id, hadeeth: hadith.hadeeth, attribution: hadith.attribution, grade: hadith.grade });
  }, [hadith]);

  // Restore a shuffled-to hadith across app restarts: shuffleIdx itself
  // persists fine (it's just numbers), but the hadith override is a full
  // fetched record, so only its id is persisted and the record is re-fetched
  // (served from hadithSharhAPI's own cache, so this is instant offline).
  // hasRestoredRef gates the write-back effect below — without it, that
  // effect's first run (before this fetch resolves, hadithOverride still
  // null) persists hadithOverrideId: null and clobbers the very value this
  // effect is about to restore.
  const hasRestoredRef = React.useRef(false);
  React.useEffect(() => {
    let alive = true;
    hasRestoredRef.current = false;
    const persisted = readPersistedShuffle(dateKey);
    if (!persisted?.hadithOverrideId) {
      hasRestoredRef.current = true;
      return;
    }
    fetchSharhHadith(persisted.hadithOverrideId)
      .then((h) => { if (alive) setHadithOverride(h); })
      .catch(() => {})
      .finally(() => { if (alive) hasRestoredRef.current = true; });
    return () => { alive = false; };
  }, [dateKey]);

  // Reset shuffles when day changes
  const prevDateKey = React.useRef(dateKey);
  if (prevDateKey.current !== dateKey) {
    prevDateKey.current = dateKey;
    setShuffleIdx(emptyShuffle());
    setHadithOverride(null);
    setShowHadithExplanation(false);
    setShowVocabExplain(false);
    setShowDuaBenefit(false);
  }

  // Keep localStorage in sync with whatever's currently shown, so the next
  // app launch resumes here instead of the day's default pick. Skipped
  // until the restore attempt above has finished — see hasRestoredRef.
  React.useEffect(() => {
    if (!hasRestoredRef.current) return;
    writePersistedShuffle({ dateKey, shuffleIdx, hadithOverrideId: hadithOverride?.id ?? null });
  }, [dateKey, shuffleIdx, hadithOverride]);

  // Daily indices (deterministic per date)
  const dailyIdxs = React.useMemo<number[]>(() => {
    const v = dateIndex(dateKey, DAILY_VERSES.length, 77);
    const h = 0;
    let wHash = 0;
    for (let i = 0; i < dateKey.length; i++) wHash = (wHash * 31 + dateKey.charCodeAt(i)) >>> 0;
    const w = DAILY_WISDOMS.length ? wHash % DAILY_WISDOMS.length : 0;
    let kHash = 0;
    for (let i = 0; i < dateKey.length; i++) kHash = (kHash * 31 + dateKey.charCodeAt(i)) >>> 0;
    const k = QURAN_VOCAB.length ? kHash % QURAN_VOCAB.length : 0;
    const d = duaPool.length ? dateIndex(dateKey, duaPool.length, 131) : 0;
    const su = sunnahPool.length ? dateIndex(dateKey, sunnahPool.length, 197) : 0;
    return [v, h, w, k, d, su];
  }, [dateKey, duaPool.length, sunnahPool.length]);

  // Active indices: shuffled override OR daily
  const activeIdxs = shuffleIdx.map((s, i) => s ?? dailyIdxs[i]);

  const verse     = DAILY_VERSES[activeIdxs[0]] ?? null;
  const wisdom    = DAILY_WISDOMS[activeIdxs[2]] ?? null;
  const vocabWord = QURAN_VOCAB[activeIdxs[3]] ?? null;
  const dua       = duaPool[activeIdxs[4]] ?? null;
  const sunnah    = sunnahPool[activeIdxs[5]] ?? null;

  // A word's meaning is thin without the verses it appears in. Searched only when
  // the person opens the explanation, so the home screen never pays for it.
  const vocabAyahs = React.useMemo(() => {
    if (!showVocabExplain || !quranDb.data || !vocabWord) return [];
    const plain = vocabWord.arabic.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "");
    try {
      return searchAyah(quranDb.data, plain, 2).results;
    } catch {
      return [];
    }
  }, [showVocabExplain, quranDb.data, vocabWord]);

  const handleShuffle = React.useCallback((slideIdx: number) => {
    if (slideIdx === 1) {
      setSpinSlide(slideIdx);
      setTimeout(() => setSpinSlide(null), 400);
      pauseUntilRef.current = Date.now() + 15000;
      setShowHadithExplanation(false);
      setHadithLoading(true);
      void fetchRandomHadith(hadith?.id).then((h) => { setHadithOverride(h); setHadithLoading(false); });
      return;
    }

    const current = shuffleIdx[slideIdx] ?? dailyIdxs[slideIdx];
    const next = randomOtherIdx(current, poolLengths[slideIdx] ?? 0);
    setShuffleIdx((prev) => {
      const copy = [...prev];
      copy[slideIdx] = next;
      return copy;
    });
    if (slideIdx === 3) setShowVocabExplain(false);
    if (slideIdx === 4) setShowDuaBenefit(false);
    setSpinSlide(slideIdx);
    setTimeout(() => setSpinSlide(null), 400);
    // Pause auto-advance for 15 s after shuffle
    pauseUntilRef.current = Date.now() + 15000;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleIdx, dailyIdxs, hadith, duaPool.length, sunnahPool.length]);

  /**
   * Share from the daily cards.
   *
   * Was `navigator.share`, which does not exist in the app's WebView at all —
   * so on a phone every one of these quietly became a clipboard copy, and a
   * hand-written "ATHAR" line did the job of an invitation without a link to
   * install anything. `shareText` reaches the real sheet through the native
   * bridge, and appends the store link itself.
   */
  const copyShare = React.useCallback(async (text: string) => {
    const result = await shareText(text);
    if (result === "downloaded") toast.success("تم النسخ");
    else if (result === "failed") toast.error("تعذّرت المشاركة");
  }, []);

  const goTo = React.useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  const goNext = React.useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % SLIDE_COUNT);
  }, []);

  const goPrev = React.useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  // Auto-advance every 4 seconds
  React.useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const pauseForReducedMotion = () => {
      setPrefersReducedMotion(media.matches);
      if (media.matches) setAutoRotate(false);
    };
    if (media.addEventListener) media.addEventListener("change", pauseForReducedMotion);
    else media.addListener?.(pauseForReducedMotion);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", pauseForReducedMotion);
      else media.removeListener?.(pauseForReducedMotion);
    };
  }, []);

  React.useEffect(() => {
    const finishPointerActivation = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-rotation-toggle]")) {
        settlePointerActivation();
        return;
      }
      if (pointerActivationResetTimer.current !== null) window.clearTimeout(pointerActivationResetTimer.current);
      pointerActivationResetTimer.current = window.setTimeout(settlePointerActivation, 1000);
    };
    window.addEventListener("pointerup", finishPointerActivation);
    window.addEventListener("pointercancel", settlePointerActivation);
    return () => {
      window.removeEventListener("pointerup", finishPointerActivation);
      window.removeEventListener("pointercancel", settlePointerActivation);
      clearPointerActivation();
    };
  }, [clearPointerActivation, settlePointerActivation]);

  React.useEffect(() => {
    if (!autoRotate || pointerInside) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() < pauseUntilRef.current) return;
      goNext();
    }, 4000);
    return () => clearInterval(timer);
  }, [autoRotate, pointerInside, goNext]);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pauseUntilRef.current = Date.now() + 99999;
  }, []);

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    pauseUntilRef.current = Date.now() + 8000;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goNext(); // swipe left → next
      else goPrev(); // swipe right → prev
    }
  }, [goNext, goPrev]);

  return (
    <>
    <style>{`@keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <Card className="p-0 overflow-hidden" role="region" aria-label="محتوى يومي" aria-roledescription="عرض دوار" tabIndex={0}
      onPointerDownCapture={(event) => {
        const target = event.target;
        if (event.button === 0 && target instanceof Element && target.closest("[data-rotation-toggle]")) {
          clearPointerActivation();
          pointerActivatingRotationControl.current = true;
        }
      }}
      onFocusCapture={(event) => {
        if (
          (event.target as HTMLElement).hasAttribute("data-rotation-toggle") &&
          pointerActivatingRotationControl.current
        ) return;
        setAutoRotate(false);
      }}
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => setPointerInside(false)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; goNext(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; goPrev(); }
      }}>
      {/* Header label */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{SLIDE_LABELS[activeIdx]}</span>
          {(activeIdx === 1 ? hadithOverride !== null : shuffleIdx[activeIdx] !== null) && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}
            >
              عشوائي
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-40">{(activeIdx === 1 ? hadithOverride !== null : shuffleIdx[activeIdx] !== null) ? "اضغط ← للتجديد" : "يتجدد يومياً"}</span>
          <button
            type="button"
            className="p-1.5 rounded-lg opacity-65 hover:opacity-100 transition"
            aria-label={autoRotate ? "إيقاف العرض التلقائي" : "تشغيل العرض التلقائي"}
            title={autoRotate ? "إيقاف العرض التلقائي" : "تشغيل العرض التلقائي"}
            data-rotation-toggle
            onClick={() => {
              clearPointerActivation();
              setAutoRotate((enabled) => !enabled);
            }}
          >
            {autoRotate ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Slides — transform-based so each slide is always 100% of the card */}
      <div
        style={{ overflow: "hidden", width: "100%" }}
        aria-live={autoRotate && !pointerInside ? "off" : "polite"}
        aria-atomic="true"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          data-carousel-track
          style={{
            display: "flex",
            direction: "ltr",
            width: "100%",
            transform: `translateX(-${activeIdx * 100}%)`,
            transition: prefersReducedMotion ? "none" : "transform 0.35s ease",
          }}
        >
          {/* Slide 1: آية اليوم */}
          <div id="carousel-slide-0" ref={(slide) => { slidesRef.current[0] = slide; }} role="group" aria-roledescription="شريحة" aria-label="آية اليوم" aria-hidden={activeIdx !== 0} style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {verse ? (
              <>
                <div
                  className="text-base leading-10 text-right arabic-text font-medium max-h-44 overflow-y-auto pr-1"
                  style={{ color: "var(--fg)" }}
                >
                  {verse.arabic}
                </div>
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Button
                      className="press-effect text-xs h-7 px-3"
                      variant="secondary"
                      onClick={() => navigate(`/mushaf?surah=${verse.surahId}&ayah=${verse.ayahIndex}`)}
                    >
                      <BookOpen size={12} aria-hidden="true" />
                      اقرأ في سياقها
                    </Button>
                    <Button
                      className="press-effect text-xs h-7 px-3"
                      variant="secondary"
                      onClick={() => navigate(`/companion?ask=${encodeURIComponent(
                        `تدبّر معي هذه الآية: اشرحها شرحًا ميسرًا مع سبب النزول إن صحّ، وثلاث فوائد عملية ليومي:\n﴿${verse.arabic.slice(0, 500)}﴾ — ${verse.surahName} (${verse.ayahIndex})`
                      )}`)}
                    >
                      <Sparkles size={12} aria-hidden="true" />
                      تدبّر بالذكاء
                    </Button>
                    <button type="button"
                      onClick={() => handleShuffle(0)}
                      className="p-1.5 rounded-lg transition press-effect"
                      aria-label="آية عشوائية"
                      title="آية جديدة"
                      style={{ color: shuffleIdx[0] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[0] !== null ? 1 : 0.55 }}
                    >
                      <Shuffle size={14} aria-hidden="true" style={spinSlide === 0 && !prefersReducedMotion ? { animation: "spin-once 0.4s ease" } : undefined} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button"
                      onClick={() => copyShare(`${verse.arabic}\n— ${verse.surahName} ﴿${verse.ayahIndex}﴾`)}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                      aria-label="مشاركة الآية"
                    >
                      <Share2 size={14} />
                    </button>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {verse.surahName} ﴿{verse.ayahIndex}﴾
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">لا توجد آية</div>
            )}
          </div>

          {/* Slide 2: حديث اليوم — text, grade, attribution, and explanation
              all come from the same hadeethenc.com record; no AI involved. */}
          <div id="carousel-slide-1" ref={(slide) => { slidesRef.current[1] = slide; }} role="group" aria-roledescription="شريحة" aria-label="حديث اليوم" aria-hidden={activeIdx !== 1} style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {hadith ? (
              <>
                <div
                  className="text-base leading-9 text-right mb-2 font-medium arabic-text max-h-44 overflow-y-auto pr-1"
                  style={{ color: "var(--fg)" }}
                >
                  {hadith.hadeeth}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                  >
                    {hadith.attribution}
                  </span>
                  {hadith.grade ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "color-mix(in srgb, var(--ok) 16%, transparent)", color: "var(--ok)" }}>
                      {hadith.grade}
                    </span>
                  ) : null}
                </div>

                {hadith.explanation ? (
                  <button type="button"
                    onClick={() => setShowHadithExplanation((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 mb-2 text-start transition press-effect"
                    style={{ background: "var(--card-2)" }}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <BookOpenText size={13} aria-hidden="true" />
                      الشرح
                    </span>
                    <ChevronDown size={14} aria-hidden="true" style={{ transform: showHadithExplanation ? "rotate(180deg)" : undefined, transition: prefersReducedMotion ? "none" : "transform 0.2s" }} />
                  </button>
                ) : null}
                {showHadithExplanation && hadith.explanation ? (
                  <div className="text-sm leading-7 mb-2 max-h-40 overflow-y-auto rounded-xl p-2.5" style={{ color: "var(--muted)", background: "var(--card-2)" }}>
                    {hadith.explanation}
                  </div>
                ) : null}

                <div className="flex items-center gap-2 justify-between flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => handleShuffle(1)}
                      className="p-1.5 rounded-lg transition press-effect"
                      aria-label="حديث عشوائي"
                      title="حديث جديد"
                      style={{ color: hadithOverride !== null ? "var(--accent)" : undefined, opacity: hadithOverride !== null ? 1 : 0.55 }}
                    >
                      <Shuffle size={14} aria-hidden="true" style={spinSlide === 1 && !prefersReducedMotion ? { animation: "spin-once 0.4s ease" } : undefined} />
                    </button>
                    <Button
                      className="press-effect text-xs h-7 px-3"
                      variant="secondary"
                      onClick={() => navigate(`/library/sharh?h=${hadith.id}`)}
                    >
                      <BookOpenText size={12} aria-hidden="true" />
                      المصدر الكامل
                    </Button>
                  </div>
                  <button type="button"
                    onClick={() =>
                      copyShare(
                        [
                          hadith.hadeeth,
                          `— ${hadith.attribution} • ${hadith.grade}`,
                          // The hadith without its شرح is the half that is easy
                          // to misread; whoever receives it should get both — and
                          // once both are in one message they have to be told apart,
                          // or the explanation reads as if it were part of the hadith
                          // itself. A ruled heading does that in plain text, which is
                          // all a share sheet can carry.
                          hadith.explanation
                            ? [
                                "",
                                "━━━━━ شرح الحديث ━━━━━",
                                hadith.explanation,
                              ].join("\n")
                            : "",
                        ]
                          .filter(Boolean)
                          .join("\n"),
                      )
                    }
                    className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                    aria-label="مشاركة الحديث"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">{hadithLoading ? "جارٍ تحميل الحديث…" : "تعذّر تحميل الحديث"}</div>
            )}
          </div>

          {/* Slide 3: تدبر اليوم */}
          <div id="carousel-slide-2" ref={(slide) => { slidesRef.current[2] = slide; }} role="group" aria-roledescription="شريحة" aria-label="تدبر اليوم" aria-hidden={activeIdx !== 2} style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            <div
              className="text-base leading-9 text-right font-medium arabic-text max-h-44 overflow-y-auto pr-1"
              style={{ color: "var(--fg)" }}
            >
              {wisdom.text}
            </div>
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => copyShare(`${wisdom.text}\n— ${wisdom.source}`)}
                  className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                  aria-label="مشاركة التدبر"
                >
                  <Share2 size={14} />
                </button>
                <button type="button"
                  onClick={() => handleShuffle(2)}
                  className="p-1.5 rounded-lg transition press-effect"
                  aria-label="تدبر عشوائي"
                  title="تدبر جديد"
                  style={{ color: shuffleIdx[2] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[2] !== null ? 1 : 0.55 }}
                >
                  <Shuffle size={14} aria-hidden="true" style={spinSlide === 2 && !prefersReducedMotion ? { animation: "spin-once 0.4s ease" } : undefined} />
                </button>
              </div>
              <span className="text-xs opacity-55 arabic-text">{wisdom?.source}</span>
            </div>
          </div>

          {/* Slide 4: كلمة اليوم — content is naturally shorter than the other
              slides (a single word + meaning), but the carousel track sizes
              every slide to the tallest one, so center it instead of leaving
              it top-aligned with a large dead gap underneath. */}
          <div id="carousel-slide-3" ref={(slide) => { slidesRef.current[3] = slide; }} role="group" aria-roledescription="شريحة" aria-label="كلمة اليوم" aria-hidden={activeIdx !== 3} className="flex flex-col justify-center" style={{ flex: "0 0 100%", width: "100%", minHeight: "100%", padding: "0.75rem 1rem 1rem" }}>
            {vocabWord ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/quran-vocab")}
                  className="w-full text-right"
                  aria-label="انتقل إلى مفردات القرآن"
                >
                  <div
                    className="text-3xl font-bold mb-1.5 leading-tight arabic-text"
                    style={{ color: "var(--accent)" }}
                    lang="ar"
                  >
                    {vocabWord.arabic}
                  </div>
                  <div className="text-sm font-medium opacity-75 mb-2">{vocabWord.meaning}</div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                    >
                      صف {vocabWord.id} • تردد {arNum(vocabWord.frequency)}×
                    </span>
                    <span className="text-[10px] opacity-40">اضغط للتعلم ❬</span>
                  </div>
                </button>
                <button type="button"
                  onClick={() => setShowVocabExplain((v) => !v)}
                  aria-expanded={showVocabExplain}
                  className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-start transition press-effect"
                  style={{ background: "var(--card-2)" }}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <BookOpenText size={13} aria-hidden="true" />
                    الشرح والأمثلة
                  </span>
                  <ChevronDown size={14} aria-hidden="true" style={{ transform: showVocabExplain ? "rotate(180deg)" : undefined, transition: prefersReducedMotion ? "none" : "transform 0.2s" }} />
                </button>
                {showVocabExplain && (
                  <div className="mt-2 space-y-2 max-h-44 overflow-y-auto rounded-xl p-2.5 text-sm leading-7" style={{ background: "var(--card-2)", color: "var(--muted)" }}>
                    {vocabWord.deepMeaning ? <p>{vocabWord.deepMeaning}</p> : null}
                    {vocabWord.wrongMeaning ? (
                      <p><b style={{ color: "var(--fg)" }}>يُفهم خطأً: </b>{vocabWord.wrongMeaning}</p>
                    ) : null}
                    {vocabWord.example ? <p className="arabic-text" style={{ color: "var(--fg)" }}>{vocabWord.example}</p> : null}
                    {vocabAyahs.map((a) => (
                      <p key={`${a.surahId}:${a.ayahIndex}`}>
                        <span className="arabic-text" style={{ color: "var(--fg)" }}>﴿{a.text}﴾</span>
                        <span className="text-xs opacity-70"> — {a.surahName} ({arNum(a.ayahIndex)})</span>
                      </p>
                    ))}
                    {!vocabWord.deepMeaning && !vocabWord.example && vocabAyahs.length === 0 ? (
                      <p>{quranDb.data ? "تكررت هذه الكلمة في القرآن نحو " + arNum(vocabWord.frequency) + " مرة. افتح «مفردات القرآن» لتتعلم معها." : "جارٍ تحميل الآيات…"}</p>
                    ) : null}
                  </div>
                )}
                <div className="pt-2 flex justify-start">
                  <button type="button"
                    onClick={() => handleShuffle(3)}
                    className="p-1.5 rounded-lg transition press-effect"
                    aria-label="كلمة عشوائية"
                    title="كلمة جديدة"
                    style={{ color: shuffleIdx[3] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[3] !== null ? 1 : 0.55 }}
                  >
                    <Shuffle size={14} aria-hidden="true" style={spinSlide === 3 && !prefersReducedMotion ? { animation: "spin-once 0.4s ease" } : undefined} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">لا توجد كلمة</div>
            )}
          </div>

          {/* Slide 5: دعاء اليوم — one of the verified duas in the dua sections */}
          <div id="carousel-slide-4" ref={(slide) => { slidesRef.current[4] = slide; }} role="group" aria-roledescription="شريحة" aria-label="دعاء اليوم" aria-hidden={activeIdx !== 4} style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {dua ? (
              <>
                <div className="text-base leading-9 text-right font-medium arabic-text max-h-44 overflow-y-auto pr-1" style={{ color: "var(--fg)" }}>
                  {dua.text}
                </div>
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => handleShuffle(4)}
                      className="p-1.5 rounded-lg transition press-effect"
                      aria-label="دعاء عشوائي"
                      title="دعاء جديد"
                      style={{ color: shuffleIdx[4] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[4] !== null ? 1 : 0.55 }}
                    >
                      <Shuffle size={14} aria-hidden="true" style={spinSlide === 4 && !prefersReducedMotion ? { animation: "spin-once 0.4s ease" } : undefined} />
                    </button>
                    <Button className="press-effect text-xs h-7 px-3" variant="secondary" onClick={() => navigate("/c/jawami_dua")}>
                      <BookOpen size={12} aria-hidden="true" />
                      كل الأدعية
                    </Button>
                    {dua.benefit ? (
                      <button type="button" onClick={() => setShowDuaBenefit((v) => !v)} aria-expanded={showDuaBenefit} className="p-1.5 rounded-lg opacity-65 hover:opacity-100 transition" aria-label="متى يُقال">
                        <ChevronDown size={14} aria-hidden="true" style={{ transform: showDuaBenefit ? "rotate(180deg)" : undefined, transition: prefersReducedMotion ? "none" : "transform 0.2s" }} />
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button"
                      onClick={() => copyShare([dua.text, (dua.source || dua.benefit) ? `— ${dua.source || dua.benefit}` : ""].filter(Boolean).join("\n"))}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                      aria-label="مشاركة الدعاء"
                    >
                      <Share2 size={14} />
                    </button>
                    {(dua.source || dua.benefit) ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                        {dua.source || dua.benefit}
                      </span>
                    ) : null}
                  </div>
                </div>
                {showDuaBenefit && dua.benefit && dua.source ? (
                  <div className="mt-2 text-sm leading-7 rounded-xl p-2.5" style={{ color: "var(--muted)", background: "var(--card-2)" }}>{dua.benefit}</div>
                ) : null}
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">{adhkarDb.isLoading ? "جارٍ التحميل…" : "لا يوجد دعاء"}</div>
            )}
          </div>

          {/* Slide 6: سنة اليوم — a sunnah with the hadith it comes from */}
          <div id="carousel-slide-5" ref={(slide) => { slidesRef.current[5] = slide; }} role="group" aria-roledescription="شريحة" aria-label="سنة اليوم" aria-hidden={activeIdx !== 5} style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {sunnah ? (
              <>
                <div className="text-base leading-9 text-right font-semibold max-h-44 overflow-y-auto pr-1" style={{ color: "var(--fg)" }}>
                  {sunnah.text}
                </div>
                {sunnah.source_label ? (
                  <div className="mt-1 text-sm leading-7 rounded-xl p-2.5 arabic-text max-h-28 overflow-y-auto" style={{ color: "var(--muted)", background: "var(--card-2)" }}>
                    {sunnah.source_label}
                  </div>
                ) : null}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => handleShuffle(5)}
                      className="p-1.5 rounded-lg transition press-effect"
                      aria-label="سنة عشوائية"
                      title="سنة جديدة"
                      style={{ color: shuffleIdx[5] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[5] !== null ? 1 : 0.55 }}
                    >
                      <Shuffle size={14} aria-hidden="true" style={spinSlide === 5 && !prefersReducedMotion ? { animation: "spin-once 0.4s ease" } : undefined} />
                    </button>
                    <Button className="press-effect text-xs h-7 px-3" variant="secondary" onClick={() => navigate("/c/forgotten_sunnahs")}>
                      <BookOpen size={12} aria-hidden="true" />
                      السنن المهجورة
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button"
                      onClick={() => copyShare([sunnah.text, sunnah.benefit, sunnah.source_label].filter(Boolean).join("\n"))}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                      aria-label="مشاركة السنة"
                    >
                      <Share2 size={14} />
                    </button>
                    {sunnah.source ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                        {sunnah.source}
                      </span>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">{adhkarDb.isLoading ? "جارٍ التحميل…" : "لا توجد سنة"}</div>
            )}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pb-3" role="tablist" aria-orientation="horizontal" aria-label="تنقل بين الشرائح">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => i).map((i) => (
          <button type="button"
            key={i}
            role="tab"
            aria-controls={`carousel-slide-${i}`}
            aria-selected={activeIdx === i}
            aria-label={SLIDE_LABELS[i]}
            onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{
              width: activeIdx === i ? "20px" : "6px",
              height: "6px",
              background: "var(--accent)",
              opacity: activeIdx === i ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </Card>
    </>
  );
}
