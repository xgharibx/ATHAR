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
import { BookOpen, ChevronLeft, Loader2, Sparkles } from "lucide-react";

import { useQuranDB } from "@/data/useQuranDB";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { TAFSIR_EDITIONS } from "@/lib/tafsirEditions";
import { loadMuyassarCache } from "@/lib/tafseerLocal";
import { toArabicNumeral } from "@/lib/quranMeta";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { arNum } from "@/lib/formatNumber";


function parseAyahParam(raw: string | null) {
  if (!raw) return null;
  const cleaned = raw.replace(/[\u0660-\u0669]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 1 ? n : null;
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
  const requestedSource = sp.get("source");

  const [selectedSurah, setSelectedSurah] = React.useState<number | null>(requestedSurah);
  const [selectedSource, setSelectedSource] = React.useState<string>(
    requestedSource ?? "muyassar"
  );
  const [ayahs, setAyahs] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      setLoading(true);
      setError(null);
      try {
        if (source === "muyassar") {
          const cache = await loadMuyassarCache();
          const list = cache[String(surahId)] ?? [];
          if (!list || list.length === 0) {
            setAyahs([]);
            setError("لا يوجد تفسير محفوظ لهذه السورة بعد.");
          } else {
            setAyahs(list as string[]);
          }
        } else {
          const { loadTafsirSurah } = await import("@/lib/tafsirEditions");
          const list = await loadTafsirSurah(source, surahId);
          if (!list || list.length === 0) {
            setAyahs([]);
            setError("سيتم تحميل التفسير عند فتح المصحف — الإصدار متاح هناك.");
          } else {
            setAyahs(list);
          }
        }
      } catch (err) {
        setAyahs([]);
        setError("تعذر تحميل التفسير. تأكد من الاتصال وحاول مجددًا.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (selectedSurah === null) {
      setAyahs([]);
      return;
    }
    void loadTafsirForSurah(selectedSurah, selectedSource);
  }, [selectedSurah, selectedSource, loadTafsirForSurah]);

  return (
    <div className="space-y-4 page-enter">
      <Card className="p-5 quran-surface overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-[var(--accent)]" aria-hidden="true" />
          <span className="text-[11px] opacity-55 uppercase tracking-wider">التفسير</span>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--accent)" }}>
          تفسير القرآن الكريم
        </h1>
        <p className="text-sm opacity-70 leading-7">
          اختر سورة ومفسرًا لقراءة التفسير. الإصدار الافتراضي (الميسر) يعرض النص دون اتصال.
          باقي المفسرين متاحة عبر زر «افتح في المصحف» الذي ينقلك إلى القارئ مع فتح التفسير تلقائيًا.
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
          <div
            className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-1"
            aria-label="قائمة السور"
            role="listbox"
          >
            {surahs.slice(0, 30).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSurah(s.id);
                  setSelectedSource("muyassar");
                  navigate(`/tafsir?surah=${s.id}&source=muyassar`, { replace: true });
                }}
                aria-pressed={selectedSurah === s.id}
                aria-label={`سورة ${s.name}`}
                className={`shrink-0 px-3 py-2 rounded-2xl border text-xs transition ${
                  selectedSurah === s.id
                    ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                    : "bg-[var(--card)] border-[var(--stroke)] opacity-65 hover:opacity-100"
                }`}
              >
                <span className="arabic-text">{s.name}</span>
                <span className="ms-1 opacity-50 tabular-nums">{toArabicNumeral(s.id)}</span>
              </button>
            ))}
          </div>
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
              className={`text-right rounded-2xl border px-3 py-2 text-xs transition ${
                selectedSource === ed.slug
                  ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                  : "bg-[var(--card)] border-[var(--stroke)] opacity-65 hover:opacity-100"
              }`}
            >
              <div className="font-semibold">{ed.label}</div>
              {ed.isBundled ? (
                <div className="text-[10px] opacity-60 mt-0.5">متاح بلا إنترنت</div>
              ) : null}
            </button>
          ))}
        </div>
      </Card>

      {selectedSurah !== null && currentSurah ? (
        <Card className="p-5 quran-surface overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-[var(--accent)]" aria-hidden="true" />
              <h2 className="arabic-text text-lg font-bold">{currentSurah.name}</h2>
            </div>
            <span className="text-[11px] opacity-55">
              {loading
                ? "جارٍ التحميل…"
                : `${arNum(ayahs.length)} آية`}
            </span>
          </div>

          {!selectedSource.startsWith("muyassar") && !loading ? (
            <div className="rounded-2xl border border-[var(--stroke)] p-4 text-xs leading-7 opacity-80">
              <p>
                مفسر «{TAFSIR_EDITIONS.find((e) => e.slug === selectedSource)?.label ?? selectedSource}»
                يُفتح تلقائيًا داخل المصحف. اضغط الزر للانتقال إلى القارئ وقراءة التفسير على الصفحة الكاملة.
              </p>
              <Button
                className="mt-3 w-full justify-center"
                onClick={() => {
                  navigate(`/mushaf?surah=${selectedSurah}${requestedAyah ? `&ayah=${requestedAyah}` : ""}`);
                }}
              >
                افتح في المصحف
                <ChevronLeft size={14} className="ms-1" aria-hidden="true" />
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm opacity-65 py-3">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              جارٍ تحميل التفسير…
            </div>
          ) : null}

          {error ? (
            <div className="text-sm opacity-70 py-2">{error}</div>
          ) : null}

          {!loading && !error && ayahs.length > 0 ? (
            <ol className="space-y-3 mt-2" aria-label={`تفسير ${currentSurah.name}`}>
              {ayahs.map((text, idx) => (
                <li
                  key={idx}
                  className="rounded-2xl border border-[var(--stroke)] p-3"
                  id={`tafsir-ayah-${idx + 1}`}
                >
                  <div className="text-[11px] font-bold opacity-60 mb-1.5 tabular-nums">
                    ﴿{toArabicNumeral(idx + 1)}﴾
                  </div>
                  <p
                    className={`arabic-text leading-7 ${
                      requestedAyah === idx + 1 ? "text-[var(--accent)]" : ""
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
