/**
 * Tafsir (التفسير) browse page.
 *
 * Lists every tafsir edition the app ships with and offers a
 * surah-by-surah reader for the bundled "muyassar" commentary. Deep-links
 * from Mushaf or any "open tafsir" button land here via /tafsir?surah=N
 * (and optionally &ayah=K) — fixing the previously-blank /tafsir route.
 */
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, CheckCircle2, ChevronLeft, Download, Loader2, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { useQuranDB } from "@/data/useQuranDB";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import {
  countCachedTafsirSurahs,
  getTafsirEditionSlug,
  loadTafsirSurah,
  removeCachedTafsirEdition,
  TAFSIR_API_BASE,
  TAFSIR_EDITIONS,
  type TafsirEdition,
} from "@/lib/tafsirEditions";
import { removeSavedTafsirEdition, saveTafsirEdition, savedTafsirSurahs, SURAH_COUNT } from "@/lib/tafsirOffline";
import { loadMuyassarCache } from "@/lib/tafseerLocal";
import { toArabicNumeral } from "@/lib/quranMeta";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { arCount, arNum } from "@/lib/formatNumber";
import { buildTafsirAyahEntries } from "@/lib/tafsirDisplay";


function parseAyahParam(raw: string | null) {
  if (!raw) return null;
  const cleaned = raw.replace(/[\u0660-\u0669]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** Saved surahs per downloadable edition (null: not known yet / cannot tell). */
function useSavedEditions() {
  const [saved, setSaved] = React.useState<Record<string, number | null>>({});
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const slugs = TAFSIR_EDITIONS.filter((e) => !e.isBundled).map((e) => e.slug);
      const counts = await Promise.all(slugs.map(async (slug) =>
        [slug, await savedTafsirSurahs(TAFSIR_API_BASE, slug, () => countCachedTafsirSurahs(slug))] as const));
      if (alive) setSaved(Object.fromEntries(counts));
    })();
    return () => {
      alive = false;
    };
  }, [version]);
  const refresh = React.useCallback(() => setVersion((v) => v + 1), []);
  return { saved, refresh };
}

/**
 * «التفسير دون إنترنت» for one edition: save it whole (in the apps the phone's
 * background downloader carries on with the app closed), see how much is
 * saved, or remove it.
 */
function OfflineEditionCard({
  edition,
  savedCount,
  onChanged,
}: {
  edition: TafsirEdition;
  savedCount: number | null | undefined;
  onChanged: () => void;
}) {
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const complete = savedCount === SURAH_COUNT;
  const partial = typeof savedCount === "number" && savedCount > 0 && !complete;

  const save = async () => {
    setProgress({ done: 0, total: SURAH_COUNT });
    try {
      const result = await saveTafsirEdition({
        base: TAFSIR_API_BASE,
        slug: edition.slug,
        label: edition.label,
        onProgress: (done, total) => setProgress({ done, total }),
        loadSurah: (surahId) => loadTafsirSurah(edition.slug, surahId),
      });
      if (result.saved >= result.total) toast.success(`حُفظ تفسير ${edition.label} للقراءة دون إنترنت`);
      else toast.error(`حُفظ ${arNum(result.saved)} من ${arNum(result.total)} سورة؛ أعد المحاولة عند توفر الاتصال لإكمال الباقي`);
    } catch {
      toast.error("تعذّر التنزيل. تأكد من الاتصال وحاول مجددًا");
    } finally {
      setProgress(null);
      onChanged();
    }
  };

  const remove = async () => {
    setConfirmRemove(false);
    await removeSavedTafsirEdition(TAFSIR_API_BASE, edition.slug, () => removeCachedTafsirEdition(edition.slug));
    toast.success("حُذف التفسير المحفوظ");
    onChanged();
  };

  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <div className="rounded-2xl border border-(--stroke) bg-(--card) p-3 mt-4 stack-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            {complete ? <CheckCircle2 size={14} className="text-(--ok)" aria-hidden="true" /> : <Download size={14} className="text-(--accent)" aria-hidden="true" />}
            {complete ? `«${edition.label}» محفوظ للقراءة دون إنترنت` : `احفظ «${edition.label}» للقراءة دون إنترنت`}
          </div>
          <div className="text-[11px] opacity-60 mt-0.5 leading-5">
            {progress
              ? `جارٍ التنزيل… ${arNum(progress.done)} من ${arCount(progress.total, { one: "سورة", two: "سورتين", few: "سور" })}`
              : complete
                ? "كل السور على هاتفك، تُقرأ بلا اتصال"
                : partial
                  ? `محفوظ ${arNum(savedCount!)} من ${arNum(SURAH_COUNT)} سورة — أكمل الباقي`
                  : "ينزل كاملًا في الخلفية، ويكمل حتى لو أغلقت التطبيق"}
          </div>
        </div>
        {progress ? (
          <Loader2 size={18} className="animate-spin text-(--accent) shrink-0" aria-hidden="true" />
        ) : complete ? (
          confirmRemove ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="ghost" className="text-xs min-h-[40px] px-3" onClick={() => setConfirmRemove(false)}>إبقاء</Button>
              <Button className="text-xs min-h-[40px] px-3" onClick={() => void remove()}>حذف</Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl opacity-60 hover:opacity-100 shrink-0"
              aria-label={`حذف تفسير ${edition.label} المحفوظ`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )
        ) : (
          <Button className="text-xs min-h-[40px] px-3 shrink-0" onClick={() => void save()}>
            {partial ? "أكمل التنزيل" : "تنزيل"}
          </Button>
        )}
      </div>
      {progress && (
        <div className="h-1.5 rounded-full bg-(--card-2) overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="تقدم تنزيل التفسير">
          <div className="h-full rounded-full bg-(--accent) transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function TafsirPage() {
  useScrollRestoration();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { data: quranDB, isLoading: quranLoading } = useQuranDB();

  const requestedSurah = React.useMemo(() => {
    const raw = sp.get("surah");
    if (!raw) return null;
    const cleaned = raw.replace(/[^\d]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) && n >= 1 && n <= 114 ? n : null;
  }, [sp]);
  const requestedAyah = parseAyahParam(sp.get("ayah"));
  const requestedSource = getTafsirEditionSlug(sp.get("source")) ?? "muyassar";

  const [selectedSurah, setSelectedSurah] = React.useState<number | null>(requestedSurah);
  const [selectedSource, setSelectedSource] = React.useState<string>(
    requestedSource ?? "muyassar"
  );
  const [ayahs, setAyahs] = React.useState<string[]>([]);
  const [loadedSelection, setLoadedSelection] = React.useState<string | null>(null);
  const tafsirEntries = React.useMemo(() => buildTafsirAyahEntries(ayahs), [ayahs]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const loadRequestId = React.useRef(0);
  const { saved: savedEditions, refresh: refreshSaved } = useSavedEditions();
  const selectedEdition = TAFSIR_EDITIONS.find((e) => e.slug === selectedSource) ?? null;

  React.useEffect(() => {
    if (requestedSurah !== null) setSelectedSurah(requestedSurah);
  }, [requestedSurah]);
  React.useEffect(() => {
    if (requestedSource) setSelectedSource(requestedSource);
  }, [requestedSource]);

  const surahs = quranDB ?? [];
  const currentSurah =
    selectedSurah !== null ? surahs.find((s) => s.id === selectedSurah) ?? null : null;

  // Load tafsir text. Only the bundled "muyassar" is fetched from
  // src/lib/tafseerLocal.ts; the rest are lazy-loaded through tafsirEditions
  // when the user explicitly opens Mushaf to keep this page snappy. Showing
  // "افتح في المصحف" for non-bundled editions aligns with the README/docs.
  const loadTafsirForSurah = React.useCallback(
    async (surahId: number, source: string) => {
      const requestId = ++loadRequestId.current;
      const isCurrentRequest = () => loadRequestId.current === requestId;
      setLoading(true);
      setError(null);
      try {
        if (source === "muyassar") {
          const cache = await loadMuyassarCache();
          if (!isCurrentRequest()) return;
          const list = cache[String(surahId)] ?? [];
          if (!list || list.length === 0) {
            setAyahs([]);
            setError("لا يوجد تفسير محفوظ لهذه السورة بعد.");
          } else {
            setAyahs(list as string[]);
          }
          setLoadedSelection(`${surahId}:${source}`);
        } else {
          const list = await loadTafsirSurah(source, surahId);
          if (!isCurrentRequest()) return;
          if (!list || list.length === 0) {
            setAyahs([]);
            setError("سيتم تحميل التفسير عند فتح المصحف — الإصدار متاح هناك.");
          } else {
            setAyahs(list);
          }
          setLoadedSelection(`${surahId}:${source}`);
        }
      } catch {
        if (!isCurrentRequest()) return;
        setAyahs([]);
        setError("تعذر تحميل التفسير. تأكد من الاتصال وحاول مجددًا.");
        setLoadedSelection(`${surahId}:${source}`);
      } finally {
        if (isCurrentRequest()) setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (selectedSurah === null) {
      setAyahs([]);
      setError(null);
      setLoading(false);
      setLoadedSelection(null);
    } else {
      void loadTafsirForSurah(selectedSurah, selectedSource);
    }
    return () => {
      loadRequestId.current += 1;
    };
  }, [selectedSurah, selectedSource, loadTafsirForSurah]);

  const selectionIsLoaded = selectedSurah !== null && loadedSelection === `${selectedSurah}:${selectedSource}`;
  const currentLoading = selectedSurah !== null && (loading || !selectionIsLoaded);
  const currentError = selectionIsLoaded ? error : null;
  const currentEntries = selectionIsLoaded ? tafsirEntries : [];

  // A link to one ayah («/tafsir?surah=2&ayah=255») scrolls to it once loaded.
  const hasEntries = currentEntries.length > 0;
  React.useEffect(() => {
    if (!hasEntries || !requestedAyah) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`tafsir-ayah-${requestedAyah}`)?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasEntries, requestedAyah, selectedSurah, selectedSource]);

  return (
    <div className="stack-y-4 page-enter">
      <Card className="p-5 quran-surface overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-(--accent)" aria-hidden="true" />
          <span className="text-[11px] opacity-55 uppercase tracking-wider">التفسير</span>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--accent)" }}>
          تفسير القرآن الكريم
        </h1>
        <p className="text-sm opacity-70 leading-7">
          اختر سورة ومفسرًا لقراءة التفسير. «الميسر» مضمَّن في التطبيق، ويمكنك حفظ أي مفسر آخر
          على هاتفك لتقرأه دون إنترنت.
        </p>
      </Card>

      <Card className="p-4 quran-surface">
        <div className="text-[11px] font-semibold opacity-50 uppercase tracking-wider mb-2">
          السورة
        </div>
        {quranLoading ? (
          <div className="flex items-center gap-2 text-sm opacity-65">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            جارٍ تحميل قائمة السور…
          </div>
        ) : (
          <select
            aria-label="قائمة السور"
            dir="rtl"
            value={selectedSurah === null ? "" : String(selectedSurah)}
            onChange={(event) => {
              const surahId = Number(event.currentTarget.value);
              if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) return;
              setSelectedSurah(surahId);
              navigate(`/tafsir?surah=${surahId}&source=${selectedSource}`, { replace: true });
            }}
            className="w-full rounded-2xl border border-(--stroke) bg-(--card) px-3 py-2.5 text-sm text-(--text)"
          >
            <option value="">اختر سورة</option>
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>{`${s.name} ﴿${toArabicNumeral(s.id)}﴾`}</option>
            ))}
          </select>
        )}

        <div className="mt-4 text-[11px] font-semibold opacity-50 uppercase tracking-wider mb-2">
          المفسر
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="اختر المفسر">
          {TAFSIR_EDITIONS.map((ed) => (
            <button
              key={ed.slug}
              type="button"
              role="radio"
              aria-checked={selectedSource === ed.slug}
              onClick={() => {
                setSelectedSource(ed.slug);
                if (selectedSurah !== null) {
                  navigate(`/tafsir?surah=${selectedSurah}&source=${ed.slug}`, { replace: true });
                }
              }}
              className={`text-right rounded-2xl border px-3 py-2 min-h-[44px] text-xs transition ${
                selectedSource === ed.slug
                  ? "bg-accent-15 border-accent-35 text-(--accent)"
                  : "bg-(--card) border-(--stroke) opacity-65 hover:opacity-100"
              }`}
            >
              <div className="font-semibold">{ed.label}</div>
              {ed.isBundled ? (
                <div className="text-[10px] opacity-60 mt-0.5">مضمَّن، بلا إنترنت</div>
              ) : savedEditions[ed.slug] === SURAH_COUNT ? (
                <div className="text-[10px] mt-0.5 text-(--ok)">محفوظ على الهاتف</div>
              ) : null}
            </button>
          ))}
        </div>
        {selectedEdition && !selectedEdition.isBundled && (
          <OfflineEditionCard
            key={selectedEdition.slug}
            edition={selectedEdition}
            savedCount={savedEditions[selectedEdition.slug]}
            onChanged={refreshSaved}
          />
        )}
      </Card>

      {selectedSurah !== null && currentSurah ? (
        <Card className="p-5 quran-surface overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-(--accent)" aria-hidden="true" />
              <h2 className="arabic-text text-lg font-bold">{currentSurah.name}</h2>
            </div>
            <span className="text-[11px] opacity-55">
              {currentLoading
                ? "جارٍ التحميل…"
                : arCount(currentEntries.length, { one: "آية", two: "آيتان", few: "آيات" })}
            </span>
          </div>

          {!currentLoading ? (
            <Button
              variant="ghost"
              className="w-full justify-center text-xs mb-2"
              onClick={() => {
                const params = new URLSearchParams({
                  surah: String(selectedSurah),
                  source: selectedSource,
                });
                if (requestedAyah) params.set("ayah", String(requestedAyah));
                navigate(`/mushaf?${params.toString()}`);
              }}
            >
              اقرأ مع الآيات في المصحف
              <ChevronLeft size={14} className="ms-1" aria-hidden="true" />
            </Button>
          ) : null}

          {currentLoading ? (
            <div className="flex items-center gap-2 text-sm opacity-65 py-3">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              جارٍ تحميل التفسير…
            </div>
          ) : null}

          {currentError ? (
            <div className="text-sm opacity-70 py-2">{currentError}</div>
          ) : null}

          {!currentLoading && !currentError && currentEntries.length > 0 ? (
            <ol className="stack-y-3 mt-2" aria-label={`تفسير ${currentSurah.name}`}>
              {currentEntries.map(({ ayahNumber, text }) => (
                <li
                  key={ayahNumber}
                  className="rounded-2xl border border-(--stroke) p-3"
                  id={`tafsir-ayah-${ayahNumber}`}
                >
                  <div className="text-[11px] font-bold opacity-60 mb-1.5 tabular-nums">
                    ﴿{toArabicNumeral(ayahNumber)}﴾
                  </div>
                  <p
                    className={`arabic-text leading-7 ${
                      requestedAyah === ayahNumber ? "text-(--accent)" : ""
                    }`}
                  >
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
