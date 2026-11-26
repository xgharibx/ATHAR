/**
 * A reciter in «السماع»: their recitations (riwayat and styles), every surah
 * they recorded, and your listening with them.
 */
import * as React from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CloudDownload, Heart, Loader2, Mic2, Play, Search, Shuffle } from "lucide-react";
import "@/styles/listen.css";
import {
  arabicDigits,
  findReciter,
  formatListened,
  moshafLabel,
  normalizeArabic,
  parseSurahList,
  recitationQueue,
  surahName,
  surahTrack,
  type Reciter,
} from "@/lib/listen/catalog";
import { playTracks } from "@/lib/listen/player";
import { useListenStore } from "@/lib/listen/store";
import { canDownloadListening, downloadTracks } from "@/lib/listen/downloads";
import { useListenCatalog } from "@/lib/listen/useListen";
import { ReciterMark } from "@/components/listen/ReciterMark";
import { TrackRow } from "@/components/listen/TrackRow";

export function ListenReciterPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { catalog } = useListenCatalog();
  const reciter = catalog ? findReciter(catalog, Number(id)) : undefined;
  const favorite = useListenStore((s) => s.favoriteReciters.includes(Number(id)));
  const toggleFavoriteReciter = useListenStore((s) => s.toggleFavoriteReciter);
  const preferred = useListenStore((s) => s.preferred);
  const setPreferred = useListenStore((s) => s.setPreferred);
  const listened = useListenStore((s) => (reciter ? s.byArtist[reciter.n] ?? 0 : 0));
  const [q, setQ] = React.useState("");
  const [saving, setSaving] = React.useState<{ done: number; total: number } | null>(null);
  const [confirmAll, setConfirmAll] = React.useState(false);
  const downloads = useListenStore((s) => s.downloads);

  const moshafId = Number(params.get("m")) || reciter?.m[0]?.id;
  const moshaf = reciter?.m.find((m) => m.id === moshafId) ?? reciter?.m[0];

  React.useEffect(() => {
    if (reciter) document.title = `${reciter.n} — السماع`;
  }, [reciter]);

  if (!catalog) return <div className="ls-card ls-empty" role="status">جارٍ التحميل…</div>;
  if (!reciter || !moshaf) return <div className="ls-card ls-empty">لم نجد هذا القارئ.</div>;

  const surahs = parseSurahList(moshaf.l);
  const queue = recitationQueue(reciter, moshaf, surahs);
  const nq = normalizeArabic(q);
  const shown = nq ? surahs.filter((s) => normalizeArabic(surahName(s)).includes(nq) || String(s) === q.trim()) : surahs;
  const isPreferred = preferred?.moshafId === moshaf.id;

  return (
    <div className="ls-page page-enter">
      <header className="ls-card ls-head" style={{ background: "radial-gradient(90% 70% at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%), var(--card)" }}>
        <ReciterMark name={reciter.n} gold={moshaf.s === "مجوّد"} />
        <h1>{reciter.n}</h1>
        <p>
          {moshafLabel(moshaf)}، {arabicDigits(surahs.length)} سورة
          {listened > 60 ? `، استمعت إليه ${formatListened(listened)}` : ""}
        </p>
        <div className="ls-actions">
          <button type="button" className="ls-play-btn" onClick={() => playTracks(queue, 0, { resume: true })}>
            <Play size={18} fill="currentColor" aria-hidden="true" /> تشغيل الكل
          </button>
          <button type="button" className="ls-ghost-btn" onClick={() => playTracks(queue, Math.floor(Math.random() * queue.length), { shuffle: true })}>
            <Shuffle size={17} aria-hidden="true" /> عشوائي
          </button>
          {canDownloadListening() ? (
            <button
              type="button"
              className="ls-ghost-btn"
              disabled={saving !== null}
              aria-label={`تنزيل تلاوة ${reciter.n} كاملة`}
              onClick={() => setConfirmAll(true)}
            >
              {saving ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <CloudDownload size={17} aria-hidden="true" />}
            </button>
          ) : null}
          <button
            type="button"
            className="ls-ghost-btn"
            aria-pressed={favorite}
            aria-label={favorite ? "إزالة من قرّائي" : "إضافة إلى قرّائي"}
            onClick={() => toggleFavoriteReciter(reciter.id)}
            style={favorite ? { color: "var(--accent)" } : undefined}
          >
            <Heart size={17} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </div>
        {saving ? (
          <p className="mt-2 text-[12px] text-(--muted)" aria-live="polite">
            جارٍ التنزيل في الخلفية… {arabicDigits(saving.done)} من {arabicDigits(saving.total)}
          </p>
        ) : confirmAll ? (
          <div className="mt-3 rounded-2xl border border-(--stroke) p-3 text-[12px] leading-6" role="alertdialog" aria-label="تنزيل التلاوة كاملة">
            {(() => {
              const left = queue.filter((t) => !downloads[t.id]).length;
              return left === 0 ? (
                <p>هذه التلاوة كلها على هاتفك.</p>
              ) : (
                <p>
                  تنزيل {arabicDigits(left)} سورة للاستماع دون إنترنت. التلاوة الكاملة قد تحتاج نحو غيغابايت أو أكثر، والأفضل عبر Wi‑Fi. يكمل التنزيل في الخلفية حتى لو أغلقت التطبيق.
                </p>
              );
            })()}
            <div className="mt-2 flex gap-2 justify-center">
              <button type="button" className="ls-ghost-btn" onClick={() => setConfirmAll(false)}>إلغاء</button>
              {queue.some((t) => !downloads[t.id]) ? (
                <button
                  type="button"
                  className="ls-play-btn"
                  onClick={() => {
                    setConfirmAll(false);
                    const missing = queue.filter((t) => !downloads[t.id]);
                    setSaving({ done: 0, total: missing.length });
                    void downloadTracks(missing, {
                      title: `${reciter.n} — ${moshafLabel(moshaf)}`,
                      onProgress: (done, total) => setSaving({ done, total }),
                    })
                      .then((r) => {
                        if (r && r.saved >= r.total) toast.success("حُفظت التلاوة كاملة للاستماع دون إنترنت");
                        else if (r) toast.error(`حُفظت ${arabicDigits(r.saved)} من ${arabicDigits(r.total)}؛ أعد التنزيل لإكمال الباقي`);
                      })
                      .finally(() => setSaving(null));
                  }}
                >
                  تنزيل
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className={`ls-chip mt-3 ${isPreferred ? "is-on" : ""}`}
          onClick={() => {
            setPreferred(reciter.id, moshaf.id);
            toast.success("صار صوت «لكل وقتٍ سورته» وسورة اليوم", { duration: 1800 });
          }}
        >
          <Mic2 size={13} aria-hidden="true" /> {isPreferred ? "قارئك المفضّل" : "اجعله قارئي المفضّل"}
        </button>
      </header>

      {reciter.m.length > 1 ? (
        <div className="ls-chips" role="radiogroup" aria-label="الرواية والأسلوب">
          {reciter.m.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={m.id === moshaf.id}
              className={`ls-chip ${m.id === moshaf.id ? "is-on" : ""}`}
              onClick={() => setParams({ m: String(m.id) }, { replace: true })}
            >
              {m.s}، {m.r}
            </button>
          ))}
        </div>
      ) : null}

      {surahs.length > 12 ? (
        <div className="ls-search" style={{ marginTop: 0 }}>
          <Search size={18} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="ابحث عن سورة…" aria-label="بحث عن سورة" />
        </div>
      ) : null}

      <div className="ls-list">
        {shown.map((s) => {
          const index = surahs.indexOf(s);
          return <TrackRow key={s} track={surahTrack(reciter, moshaf, s)} n={s} onPlay={() => playTracks(queue, index, { resume: true })} meta={moshaf.t ? <span>الآيات مع الصوت</span> : null} />;
        })}
        {!shown.length ? <div className="ls-empty">لا توجد سورة بهذا الاسم في هذه التلاوة.</div> : null}
      </div>
    </div>
  );
}

const RIWAYAT = ["الكل", "حفص عن عاصم", "ورش عن نافع", "قالون عن نافع", "مجوّد"];

export function ListenRecitersPage() {
  const [params] = useSearchParams();
  const { catalog } = useListenCatalog();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [riwaya, setRiwaya] = React.useState("الكل");

  React.useEffect(() => {
    document.title = "قرّاء العالم — السماع";
  }, []);

  const list = React.useMemo(() => {
    if (!catalog) return [] as Reciter[];
    const nq = normalizeArabic(q);
    const famous = new Map(catalog.famous.map((id, i) => [id, i]));
    return catalog.reciters
      .filter((r) => !nq || normalizeArabic(r.n).includes(nq))
      .filter((r) => riwaya === "الكل" || r.m.some((m) => (riwaya === "مجوّد" ? m.s === "مجوّد" : m.r.startsWith(riwaya))))
      .sort((a, b) => (famous.get(a.id) ?? 999) - (famous.get(b.id) ?? 999) || a.n.localeCompare(b.n, "ar"));
  }, [catalog, q, riwaya]);

  return (
    <div className="ls-page page-enter">
      <header>
        <h1 className="ls-title">قرّاء العالم</h1>
        <p className="ls-sub">{catalog ? `${arabicDigits(catalog.reciters.length)} قارئًا` : "…"}، والمصحف كاملًا لأكثرهم</p>
        <div className="ls-search">
          <Search size={18} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="ابحث باسم القارئ" aria-label="بحث باسم القارئ" autoFocus={Boolean(params.get("q"))} />
        </div>
      </header>
      <div className="ls-chips" role="radiogroup" aria-label="الرواية">
        {RIWAYAT.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={riwaya === r} className={`ls-chip ${riwaya === r ? "is-on" : ""}`} onClick={() => setRiwaya(r)}>
            {r === "مجوّد" ? "المصاحف المجوّدة" : r}
          </button>
        ))}
      </div>
      <div className="ls-list">
        {list.map((r) => (
          <Link key={r.id} to={`/listen/reciter/${r.id}`} className="ls-row ls-press">
            <ReciterMark name={r.n} style={{ width: 44, height: 44, fontSize: 14, flexShrink: 0 }} />
            <span className="ls-row-main">
              <span className="ls-row-title block">{r.n}</span>
              <span className="ls-row-meta">{r.m.map((m) => moshafLabel(m)).join("، ")}</span>
            </span>
          </Link>
        ))}
        {catalog && !list.length ? <div className="ls-empty">لا يوجد قارئ بهذا الاسم.</div> : null}
      </div>
    </div>
  );
}
