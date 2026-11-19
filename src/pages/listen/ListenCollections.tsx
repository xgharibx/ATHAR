/**
 * The collections of «السماع»: one surah in many voices, the golden
 * recordings, the night prayers of the two Harams, the tawasheeh albums,
 * and your favourites and lists.
 */
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Pencil, Play, Shuffle, Trash2 } from "lucide-react";
import "@/styles/listen.css";
import {
  albumTrack,
  arabicDigits,
  cityName,
  findMoshaf,
  formatDuration,
  hueFor,
  parseSurahList,
  qiyamTitle,
  qiyamTrack,
  surahName,
  surahTrack,
  type ListenTrack,
} from "@/lib/listen/catalog";
import { playTracks } from "@/lib/listen/player";
import { useListenStore } from "@/lib/listen/store";
import { useListenCatalog } from "@/lib/listen/useListen";
import { ReciterMark } from "@/components/listen/ReciterMark";
import { TrackRow } from "@/components/listen/TrackRow";

function Loading() {
  return (
    <div className="ls-card ls-empty" role="status">
      جارٍ التحميل…
    </div>
  );
}

function ListHeader({ title, sub, tracks, gold, artist }: { title: string; sub?: string; tracks: ListenTrack[]; gold?: boolean; artist?: string }) {
  return (
    <header className="ls-card ls-head">
      {artist ? <ReciterMark name={artist} gold={gold} /> : null}
      <h1>{title}</h1>
      {sub ? <p>{sub}</p> : null}
      {tracks.length ? (
        <div className="ls-actions">
          <button type="button" className="ls-play-btn" onClick={() => playTracks(tracks, 0, { resume: true })}>
            <Play size={18} fill="currentColor" aria-hidden="true" style={{ transform: "scaleX(-1)" }} /> تشغيل الكل
          </button>
          {tracks.length > 2 ? (
            <button type="button" className="ls-ghost-btn" onClick={() => playTracks(tracks, Math.floor(Math.random() * tracks.length), { shuffle: true })}>
              <Shuffle size={17} aria-hidden="true" /> عشوائي
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function TrackList({ tracks, meta }: { tracks: ListenTrack[]; meta?: (t: ListenTrack) => React.ReactNode }) {
  if (!tracks.length) return <div className="ls-card ls-empty">لا شيء هنا بعد.</div>;
  return (
    <div className="ls-list">
      {tracks.map((t, i) => (
        <TrackRow key={t.id} track={t} n={t.surah ?? i + 1} meta={meta?.(t)} onPlay={() => playTracks(tracks, i, { resume: true })} />
      ))}
    </div>
  );
}

/** One surah, recited by the world's reciters one after another. */
export function ListenSurahPage() {
  const { n } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { catalog } = useListenCatalog();
  const surah = Math.max(1, Math.min(114, Number(n) || 1));
  const picking = params.get("pick") === "1";

  React.useEffect(() => {
    document.title = `سورة ${surahName(surah)} بأصوات القرّاء — السماع`;
  }, [surah]);

  if (!catalog) return <Loading />;
  if (picking) {
    return (
      <div className="ls-page page-enter">
        <header>
          <h1 className="ls-title">اختر سورة</h1>
          <p className="ls-sub">ثم استمع إليها بأصوات قرّاء العالم، واحدًا بعد آخر</p>
        </header>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 114 }, (_, i) => i + 1).map((s) => (
            <button key={s} type="button" className="ls-chip ls-press justify-center" style={{ height: 40 }} onClick={() => navigate(`/listen/surah/${s}`, { replace: true })}>
              {arabicDigits(s)} · {surahName(s)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const famous = new Map(catalog.famous.map((id, i) => [id, i]));
  const voices: ListenTrack[] = [];
  for (const reciter of [...catalog.reciters].sort((a, b) => (famous.get(a.id) ?? 999) - (famous.get(b.id) ?? 999))) {
    const moshaf = reciter.m.find((m) => m.r === "حفص عن عاصم" && m.s === "مرتّل" && parseSurahList(m.l).includes(surah));
    if (moshaf) voices.push(surahTrack(reciter, moshaf, surah));
  }

  return (
    <div className="ls-page page-enter">
      <header className="ls-card ls-head">
        <h1>سورة {surahName(surah)}</h1>
        <p>بأصوات {arabicDigits(voices.length)} قارئًا، برواية حفص عن عاصم</p>
        <div className="ls-actions">
          <button type="button" className="ls-play-btn" onClick={() => playTracks(voices, 0)}>
            <Play size={18} fill="currentColor" aria-hidden="true" style={{ transform: "scaleX(-1)" }} /> صوتًا بعد صوت
          </button>
          <Link to="/listen/surah/1?pick=1" className="ls-ghost-btn">
            سورة أخرى
          </Link>
        </div>
      </header>
      <div className="ls-list">
        {voices.map((t, i) => (
          <div key={t.id} className="ls-row">
            <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-right" onClick={() => playTracks(voices, i)}>
              <ReciterMark name={t.artist} style={{ width: 40, height: 40, fontSize: 13, flexShrink: 0 }} />
              <span className="ls-row-main">
                <span className="ls-row-title block">{t.artist}</span>
                <span className="ls-row-meta">{t.timing ? "الآيات مع الصوت" : "مرتّل"}</span>
              </span>
            </button>
            <Link to={`/listen/reciter/${t.reciterId}?m=${t.moshafId}`} className="ls-more">
              المصحف كاملًا
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListenGoldenPage() {
  const { catalog } = useListenCatalog();
  if (!catalog) return <Loading />;
  return (
    <div className="ls-page page-enter">
      <header>
        <h1 className="ls-title">التسجيلات الذهبية</h1>
        <p className="ls-sub">المصاحف المجوّدة لأعلام دولة التلاوة، بالمقامات والنفَس الطويل، كما سمعها الناس في الإذاعات والمحافل.</p>
      </header>
      <div className="flex flex-col gap-3">
        {catalog.golden.map((g) => {
          const found = findMoshaf(catalog, g.moshaf);
          if (!found) return null;
          return (
            <Link key={g.moshaf} to={`/listen/reciter/${g.reciter}?m=${g.moshaf}`} className="ls-gold ls-press" style={{ width: "100%" }}>
              <ReciterMark name={found.reciter.n} gold />
              <span className="min-w-0">
                <b>{found.reciter.n}</b>
                <span>{g.note}</span>
                <span>{arabicDigits(parseSurahList(found.moshaf.l).length)} سورة</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ListenQiyamIndexPage() {
  const { catalog } = useListenCatalog();
  const [city, setCity] = React.useState<"makkah" | "madinah">("makkah");
  if (!catalog) return <Loading />;
  const years = catalog.qiyam.filter((y) => y.city === city);
  return (
    <div className="ls-page page-enter">
      <header>
        <h1 className="ls-title">قيام الليل في الحرمين</h1>
        <p className="ls-sub">صلاة التراويح كما صُلّيت في رمضان، مقسّمةً على السور، موسمًا بعد موسم.</p>
      </header>
      <div className="ls-chips" role="radiogroup" aria-label="الحرم">
        {(["makkah", "madinah"] as const).map((c) => (
          <button key={c} type="button" role="radio" aria-checked={city === c} className={`ls-chip ${city === c ? "is-on" : ""}`} onClick={() => setCity(c)}>
            {cityName(c)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {years.map((y) => (
          <Link key={y.id} to={`/listen/qiyam/${y.id}`} className="ls-night ls-press" style={{ width: "100%" }}>
            <b>رمضان {arabicDigits(y.year)}هـ</b>
            <span>{cityName(y.city)}</span>
            <span style={{ marginTop: 30 }}>{arabicDigits(Object.keys(y.d).length)} سورة</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ListenQiyamPage() {
  const { id } = useParams();
  const { catalog } = useListenCatalog();
  if (!catalog) return <Loading />;
  const year = catalog.qiyam.find((y) => y.id === id);
  if (!year) return <div className="ls-card ls-empty">لم نجد هذا الموسم.</div>;
  const tracks = Object.keys(year.d)
    .map(Number)
    .sort((a, b) => a - b)
    .map((s) => qiyamTrack(year, s));
  const total = Object.values(year.d).reduce((a, b) => a + b, 0);
  return (
    <div className="ls-page page-enter">
      <ListHeader title={qiyamTitle(year)} sub={`${arabicDigits(tracks.length)} سورة · ${formatDuration(total)}`} tracks={tracks} />
      <TrackList tracks={tracks} />
    </div>
  );
}

export function ListenTawasheehPage() {
  const { catalog } = useListenCatalog();
  if (!catalog) return <Loading />;
  return (
    <div className="ls-page page-enter">
      <header>
        <h1 className="ls-title">التواشيح والابتهالات</h1>
        <p className="ls-sub">أصوات المبتهلين الكبار التي رافقت فجر رمضان وليالي الذكر.</p>
      </header>
      <div className="grid grid-cols-2 gap-4">
        {catalog.tawasheeh.map((a) => (
          <Link key={a.id} to={`/listen/album/${a.id}`} className="ls-album ls-press" style={{ width: "100%" }}>
            <span className="ls-album-art" style={{ width: "100%", height: "auto", aspectRatio: "1", ["--h" as string]: (hueFor(a.artist) % 60) + 15 }}>
              {a.artist}
            </span>
            <b>{a.title}</b>
            <span>{arabicDigits(a.tracks.length)} مقطعًا</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ListenAlbumPage() {
  const { id } = useParams();
  const { catalog } = useListenCatalog();
  if (!catalog) return <Loading />;
  const album = catalog.tawasheeh.find((a) => a.id === id);
  if (!album) return <div className="ls-card ls-empty">لم نجد هذا الألبوم.</div>;
  const tracks = album.tracks.map((_, i) => albumTrack(album, i)).filter((t): t is ListenTrack => Boolean(t));
  return (
    <div className="ls-page page-enter">
      <ListHeader title={album.title} sub={`${album.artist} · ${arabicDigits(tracks.length)} مقطعًا`} tracks={tracks} artist={album.artist} gold />
      <TrackList tracks={tracks} meta={(t) => (t.artist !== album.artist ? <span>{t.artist}</span> : null)} />
      <p className="ls-credit">
        من <a href={album.src} target="_blank" rel="noreferrer">أرشيف الإنترنت</a>
        {album.pd ? "، في الملك العام" : ""}.
      </p>
    </div>
  );
}

export function ListenFavoritesPage() {
  const favorites = useListenStore((s) => s.favorites);
  const tracks = Object.values(favorites);
  return (
    <div className="ls-page page-enter">
      <ListHeader title="المفضّلة" sub={`${arabicDigits(tracks.length)} مقطعًا`} tracks={tracks} />
      {tracks.length ? <TrackList tracks={tracks} meta={(t) => <span>{t.artist}</span>} /> : <div className="ls-card ls-empty">اضغط ♡ في المشغّل أو في خيارات أي مقطع ليُحفظ هنا.</div>}
    </div>
  );
}

export function ListenPlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const playlist = useListenStore((s) => s.playlists.find((p) => p.id === id));
  const renamePlaylist = useListenStore((s) => s.renamePlaylist);
  const deletePlaylist = useListenStore((s) => s.deletePlaylist);
  if (!playlist) return <div className="ls-card ls-empty">لم نجد هذه القائمة.</div>;
  return (
    <div className="ls-page page-enter">
      <ListHeader title={playlist.name} sub={`${arabicDigits(playlist.tracks.length)} مقطعًا`} tracks={playlist.tracks} />
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          className="ls-ghost-btn"
          onClick={() => {
            const name = window.prompt("اسم القائمة", playlist.name);
            if (name) renamePlaylist(playlist.id, name);
          }}
        >
          <Pencil size={16} aria-hidden="true" /> إعادة التسمية
        </button>
        <button
          type="button"
          className="ls-ghost-btn"
          onClick={() => {
            if (window.confirm(`حذف «${playlist.name}»؟`)) {
              deletePlaylist(playlist.id);
              navigate("/listen", { replace: true });
            }
          }}
        >
          <Trash2 size={16} aria-hidden="true" /> حذف
        </button>
      </div>
      <TrackList tracks={playlist.tracks} meta={(t) => <span>{t.artist}</span>} />
    </div>
  );
}
