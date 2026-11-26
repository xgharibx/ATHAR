/**
 * «القرآن الكريم» — التنزيلات: what comes with the app (the Quran itself, its
 * pages' layout, «الميسّر», the tajweed data of every word) and what can be
 * kept on the device to read and listen with no connection: the Madina
 * mushaf's page fonts (plain or in the tajweed colours), every tafsir, the
 * reciters' whole recitations (phones), the translations of the meanings, the
 * meanings of the words, the grammar and roots, and the tajweed engine.
 */
import * as React from "react";
import { Check, CheckCircle2, CloudDownload, Loader2, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useQ2Meta, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { arDigits } from "../data/arabic";
import { cacheDelete, cachedKeys, cacheGet } from "../data/cache";
import { madinaFontsSaved, madinaTajweedIsSvg, removeMadinaFonts, saveMadinaFonts, type MadinaFontKind } from "../data/madina";
import { Q2_BUNDLED_TAFSIR, Q2_TAFSIRS, removeTafsirOffline, saveTafsirOffline, savedTafsirSurahCount } from "../data/tafsir";
import { Q2_TRANSLATIONS, loadSurahTranslation } from "../data/translations";
import { Q2_WORD_LANGS, loadWordMeanings } from "../data/wordMeanings";
import { MORPHOLOGY_COMMIT, loadMorphology } from "../data/morphology";
import { Q2_RECITERS, loadSurahTiming, type Q2SurahTiming } from "../data/timings";
import { useQuranLook } from "../look";
import { TajweedEngineCard } from "../tasmee/TajweedEngineCard";
import { downloadNativeRecitations, hasNativeRecitation, nativeRemoveDownloads, nativeSavedUrls } from "@/lib/nativeRecitation";
import { LISTEN_MAX_FILE_BYTES, LISTEN_MAX_TOTAL_BYTES } from "@/lib/listen/downloads";

type Job = {
  /** How many parts there are (pages, surahs), and how many are on the device. */
  total: number;
  count: () => Promise<number>;
  run: (onProgress: (done: number) => void, signal: AbortSignal) => Promise<number>;
  remove?: () => Promise<void>;
};

/** Every surah, a few at a time; returns how many are now on the device. */
async function eachSurah(load: (s: number) => Promise<unknown>, onProgress: (done: number) => void, signal: AbortSignal, already = 0): Promise<number> {
  let done = already;
  let next = 0;
  const worker = async () => {
    while (next < 114 && !signal.aborted) {
      const s = ++next;
      try {
        await load(s);
        done++;
      } catch {
        // Fetched again on the next try.
      }
      onProgress(Math.min(114, done));
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return Math.min(114, done);
}

const keyCount = async (prefix: string) => new Set(await cachedKeys(prefix)).size;

function DownloadRow({ title, sub, job: given, unit = "سورة" }: { title: string; sub: string; job: Job; unit?: string }) {
  // A row's job is fixed when it first shows (the page shows rows once the Quran is loaded).
  const [job] = React.useState(given);
  const [saved, setSaved] = React.useState<number | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [version, setVersion] = React.useState(0);
  const abort = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    let alive = true;
    void job.count().then((n) => alive && setSaved(n), () => alive && setSaved(0));
    return () => {
      alive = false;
    };
  }, [job, version]);
  React.useEffect(() => () => abort.current?.abort(), []);

  const complete = saved !== null && saved >= job.total;
  const start = async () => {
    const ctrl = new AbortController();
    abort.current = ctrl;
    setProgress(saved ?? 0);
    const got = await job.run((d) => setProgress(d), ctrl.signal);
    abort.current = null;
    setProgress(null);
    setVersion((v) => v + 1);
    if (ctrl.signal.aborted) return;
    if (got >= job.total) toast.success(`«${title}» على جهازك`);
    else toast.error("نُزِّل بعضه، أكمل عند توفر الاتصال");
  };

  return (
    <div className="q2-dl">
      <div className="q2-dl-text">
        <b>{title}</b>
        <span>{sub}</span>
        {progress !== null ? (
          <span className="q2-dl-bar" role="progressbar" aria-valuemin={0} aria-valuemax={job.total} aria-valuenow={progress} aria-label={`تنزيل ${title}`}>
            <i style={{ width: `${Math.max(3, (progress / job.total) * 100)}%` }} />
          </span>
        ) : null}
        {progress !== null ? (
          <span className="q2-dl-state">
            {arDigits(progress)} من {arDigits(job.total)} {unit}
          </span>
        ) : complete ? (
          <span className="q2-dl-state is-done">
            <CheckCircle2 size={14} aria-hidden="true" /> على جهازك
          </span>
        ) : saved ? (
          <span className="q2-dl-state">
            {arDigits(saved)} من {arDigits(job.total)} {unit} على جهازك
          </span>
        ) : null}
      </div>
      {progress !== null ? (
        <button type="button" className="q2-icon-btn q2-press" aria-label={`أوقف تنزيل ${title}`} onClick={() => abort.current?.abort()}>
          <X size={18} aria-hidden="true" />
        </button>
      ) : complete ? (
        job.remove ? (
          <button
            type="button"
            className="q2-icon-btn q2-press"
            aria-label={`احذف ${title} من الجهاز`}
            onClick={() => void job.remove!().then(() => setVersion((v) => v + 1))}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        ) : (
          <span className="q2-icon-btn" aria-hidden="true">
            <Check size={18} />
          </span>
        )
      ) : (
        <button type="button" className="q2-dl-go q2-press" onClick={() => void start()} aria-label={saved ? `أكمل تنزيل ${title}` : `نزّل ${title}`}>
          {saved === null ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <CloudDownload size={18} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="q2-section">
      <h2 className="q2-dl-head">{title}</h2>
      {note ? <p className="q2-small" style={{ marginBottom: 8 }}>{note}</p> : null}
      {children ? <div className="q2-card q2-dl-list">{children}</div> : null}
    </section>
  );
}

/** A reciter's whole recitation (114 surahs) on the phone, through the app's native downloader. */
function recitationJob(reciter: number, name: string): Job {
  const timingsKept = async () => {
    const out: Q2SurahTiming[] = [];
    for (const key of await cachedKeys(`timing:${reciter}:`)) {
      const t = await cacheGet<Q2SurahTiming>(key);
      if (t?.audioUrl) out.push(t);
    }
    return out;
  };
  return {
    total: 114,
    count: async () => {
      const urls = (await timingsKept()).map((t) => t.audioUrl);
      const saved = await nativeSavedUrls(urls);
      return saved?.size ?? 0;
    },
    run: async (onProgress, signal) => {
      const urls: string[] = [];
      for (let s = 1; s <= 114 && !signal.aborted; s++) {
        try {
          urls.push((await loadSurahTiming(reciter, s)).audioUrl);
        } catch {
          // Missing a surah's address: the others are still saved.
        }
      }
      if (signal.aborted) return 0;
      const result = await downloadNativeRecitations(urls, (done) => onProgress(done), `تلاوة ${name} كاملة`, "quran2", LISTEN_MAX_FILE_BYTES, LISTEN_MAX_TOTAL_BYTES);
      return result?.saved ?? 0;
    },
    remove: async () => {
      await nativeRemoveDownloads((await timingsKept()).map((t) => t.audioUrl));
    },
  };
}

export default function Q2Downloads() {
  const text = useQ2Text();
  const meta = useQ2Meta();
  const { look } = useQuranLook();
  const translation = useQ2Store((s) => s.prefs.translation);
  const [usage, setUsage] = React.useState<number | null>(null);
  React.useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setUsage(e.usage ?? null), () => undefined);
  }, []);

  const ayahCounts = React.useMemo(() => meta.data?.surahs.map((s) => s.ayahs) ?? [], [meta.data]);
  const wordCounts = React.useCallback((s: number) => text.data?.surahs[s - 1]?.ayahs.map((a) => a.words.length) ?? [], [text.data]);
  const tajweedKind: MadinaFontKind = look === "night" ? "tajweed-dark" : "tajweed";
  const svg = madinaTajweedIsSvg();

  const fontJob = (kind: MadinaFontKind): Job => ({
    total: 604,
    count: () => madinaFontsSaved(kind),
    run: async (onProgress, signal) => (await saveMadinaFonts(kind, (d) => onProgress(d), signal)).saved,
    remove: () => removeMadinaFonts(kind),
  });

  const ready = Boolean(text.data && meta.data);
  const translations = [...Q2_TRANSLATIONS].sort((a, b) => (a.id === translation ? -1 : b.id === translation ? 1 : 0));

  return (
    <main className="q2-main">
      <section className="q2-card q2-dl-included">
        <b>مع التطبيق، دون إنترنت</b>
        <ul>
          <li><Check size={15} aria-hidden="true" /> المصحف كاملًا بالرسم العثماني</li>
          <li><Check size={15} aria-hidden="true" /> صفحات مصحف المدينة بأسطرها الخمسة عشر</li>
          <li><Check size={15} aria-hidden="true" /> التفسير الميسّر</li>
          <li><Check size={15} aria-hidden="true" /> بيانات التجويد لكل كلمة</li>
        </ul>
        {usage !== null ? <span className="q2-small">يشغل التطبيق على جهازك الآن نحو {arDigits(Math.max(1, Math.round(usage / 1_000_000)))} م.ب</span> : null}
      </section>

      {ready ? (
        <>
          <Group title="مصحف المدينة" note="خطوط مجمع الملك فهد لكل صفحة، لتفتح صفحات المصحف بخطها دون اتصال. تُحفظ الصفحة أيضًا كلما قرأتها.">
            <DownloadRow title="بخطه الأصلي" sub="٦٠٤ صفحة، نحو ٧٠ م.ب" unit="صفحة" job={fontJob("plain")} />
            <DownloadRow title="بألوان التجويد" sub={`٦٠٤ صفحة، نحو ${svg ? "١٩٠" : "٤٠"} م.ب${look === "night" ? "، بطبعة الليل" : ""}`} unit="صفحة" job={fontJob(tajweedKind)} />
          </Group>

          <Group title="التفاسير" note="الميسّر مع التطبيق؛ ونزّل غيره لتقرأه دون اتصال.">
            {Q2_TAFSIRS.filter((t) => t.id !== Q2_BUNDLED_TAFSIR).map((t) => (
              <DownloadRow
                key={t.id}
                title={t.name}
                sub={t.author}
                job={{
                  total: 114,
                  count: () => savedTafsirSurahCount(t.id),
                  run: async (onProgress, signal) => (await saveTafsirOffline(t.id, ayahCounts, (d) => onProgress(d), signal)).saved,
                  remove: () => removeTafsirOffline(t.id),
                }}
              />
            ))}
          </Group>

          <Group title="التلاوات مع تتبّع الكلمات" note={hasNativeRecitation() ? "التلاوة كاملة لتسمعها في المصحف المرتّل دون اتصال (نحو ٥٠٠ م.ب إلى غيغابايت للقارئ)، والأفضل عبر Wi‑Fi." : "حفظ التلاوات كاملة متاح في تطبيق أثر على الهاتف."}>
            {hasNativeRecitation()
              ? Q2_RECITERS.map((r) => <DownloadRow key={r.id} title={r.name} sub={r.style} job={recitationJob(r.id, r.name)} />)
              : null}
          </Group>

          <Group title="ترجمات المعاني">
            {translations.map((t) => (
              <DownloadRow
                key={t.id}
                title={t.label}
                sub={t.by}
                job={{
                  total: 114,
                  count: () => keyCount(`translation:${t.id}:`),
                  run: async (onProgress, signal) => eachSurah((s) => loadSurahTranslation(t.id, s), onProgress, signal),
                  remove: async () => cacheDelete(await cachedKeys(`translation:${t.id}:`)),
                }}
              />
            ))}
          </Group>

          <Group title="معاني الكلمات">
            {Q2_WORD_LANGS.map((l) => (
              <DownloadRow
                key={l.code}
                title={l.label}
                sub="معنى كل كلمة تحتها"
                job={{
                  total: 114,
                  count: () => keyCount(`wbw:${l.code}:`),
                  run: async (onProgress, signal) => eachSurah((s) => loadWordMeanings(l.code, s, wordCounts(s)), onProgress, signal),
                  remove: async () => cacheDelete(await cachedKeys(`wbw:${l.code}:`)),
                }}
              />
            ))}
          </Group>

          <Group title="الصرف والإعراب والجذور">
            <DownloadRow
              title="صرف كل كلمة وإعرابها وجذرها"
              sub="لعدسة الكلمة ومعجم الجذور، نحو ١ م.ب"
              unit="ملف"
              job={{
                total: 1,
                count: async () => ((await cachedKeys(`morph:${MORPHOLOGY_COMMIT}`)).length ? 1 : 0),
                run: async () => {
                  await loadMorphology();
                  return 1;
                },
              }}
            />
          </Group>

          <Group title="محرك التجويد">
            <div style={{ padding: 12 }}>
              <TajweedEngineCard />
            </div>
          </Group>
        </>
      ) : null}
    </main>
  );
}
