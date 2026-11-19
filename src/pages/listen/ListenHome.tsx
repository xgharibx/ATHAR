/**
 * «السماع» — the whole Quran, surah by surah, in the voices of the world's
 * reciters; the golden mujawwad recordings; the night prayers of the two
 * Harams; the tawasheeh of the great munshids. And your listening, kept:
 * minutes a day, a streak, the listening khatma, where you stopped.
 */
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, ChevronLeft, Flame, Heart, ListMusic, Moon, Play, Search, Sparkles } from "lucide-react";
import "@/styles/listen.css";
import { arabicDigits, cityName, findMoshaf, formatListened, hueFor, surahName, type ListenCatalog } from "@/lib/listen/catalog";
import { playTracks } from "@/lib/listen/player";
import { lastSevenDays, listeningStreak, resumable, useListenStore, dayKey } from "@/lib/listen/store";
import { isKahfTime, MOMENTS, momentTracks } from "@/lib/listen/moments";
import { useListenCatalog } from "@/lib/listen/useListen";
import { ReciterMark } from "@/components/listen/ReciterMark";

function Section({ title, sub, more, children }: { title: string; sub?: string; more?: { to: string; label?: string }; children: React.ReactNode }) {
  return (
    <section>
      <div className="ls-section-head">
        <div>
          <h2>{title}</h2>
          {sub ? <p>{sub}</p> : null}
        </div>
        {more ? (
          <Link to={more.to} className="ls-more">
            {more.label ?? "عرض الكل"}
            <ChevronLeft size={15} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TodayCard() {
  const days = useListenStore((s) => s.days);
  const goal = useListenStore((s) => s.dailyGoalMinutes);
  const khatma = useListenStore((s) => s.khatma);
  const today = Math.round((days[dayKey()] ?? 0) / 60);
  const pct = Math.min(1, today / Math.max(1, goal));
  const streak = listeningStreak(days);
  const week = lastSevenDays(days).reduce((sum, d) => sum + d.seconds, 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <Link to="/listen/stats" className="ls-card ls-today ls-press" aria-label="أثر سماعك">
      <span className="ls-ring">
        <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r={r} fill="none" stroke="color-mix(in srgb, var(--fg) 9%, transparent)" strokeWidth="7" />
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        </svg>
        <span className="ls-ring-label">
          <span>
            <b>{arabicDigits(today)}</b>
            <br />
            <span>من {arabicDigits(goal)} د</span>
          </span>
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold">{pct >= 1 ? "أتممت وِرد السماع اليوم" : today ? "واصل، أوشكت على هدفك" : "وِردك من السماع اليوم"}</span>
        <span className="ls-chips mt-2">
          <span className={`ls-chip ${streak ? "is-on" : ""}`}>
            <Flame size={13} aria-hidden="true" /> {streak ? `${arabicDigits(streak)} يوم متتالٍ` : "ابدأ سلسلتك"}
          </span>
          <span className="ls-chip">
            <Sparkles size={13} aria-hidden="true" /> الختمة {arabicDigits(khatma.done.length)}/١١٤
          </span>
          <span className="ls-chip">
            <BarChart3 size={13} aria-hidden="true" /> الأسبوع {formatListened(week)}
          </span>
        </span>
      </span>
    </Link>
  );
}

function ContinueRail() {
  const history = useListenStore((s) => s.history);
  const items = resumable(history).slice(0, 8);
  if (!items.length) return null;
  return (
    <Section title="أكمل الاستماع" sub="من حيث توقّفت">
      <div className="ls-rail">
        {items.map((h) => {
          const pct = h.durationMs ? Math.min(100, (h.positionMs / h.durationMs) * 100) : 0;
          return (
            <button
              key={h.track.id}
              type="button"
              className="ls-card ls-press text-right p-3 w-[220px] flex items-center gap-3"
              onClick={() => playTracks([h.track], 0, { resume: true })}
            >
              <ReciterMark name={h.track.artist} style={{ width: 46, height: 46, fontSize: 14, flexShrink: 0 }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold truncate">{h.track.title}</span>
                <span className="block text-[11.5px] text-(--muted) truncate">{h.track.artist}</span>
                <span className="ls-row-progress block">
                  <i style={{ width: `${pct}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function Moments({ catalog }: { catalog: ListenCatalog }) {
  const preferred = useListenStore((s) => s.preferred);
  const voice = findMoshaf(catalog, (preferred ?? { moshafId: 123 }).moshafId);
  const ordered = isKahfTime() ? MOMENTS : [...MOMENTS.filter((m) => m.id !== "kahf"), MOMENTS[0]!];
  return (
    <Section title="لكل وقتٍ سورته" sub={voice ? `بصوت ${voice.reciter.n}` : undefined}>
      <div className="ls-rail">
        {ordered.map((m) => (
          <button
            key={m.id}
            type="button"
            className="ls-tile ls-press"
            style={{ background: `radial-gradient(90% 80% at 100% 0%, ${m.from}, transparent 70%), linear-gradient(160deg, ${m.from}, ${m.to})` }}
            onClick={() => playTracks(momentTracks(catalog, m, preferred), 0, { resume: true })}
          >
            <span className="ls-tile-icon">
              {m.id === "sleep" ? <Moon size={18} aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" style={{ transform: "scaleX(-1)" }} />}
            </span>
            <b>{m.title}</b>
            <span>{m.subtitle}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

const SURAH_PICKS = [18, 36, 67, 55, 56, 1, 2, 12, 19, 20, 25, 73];

function OneSurahManyVoices() {
  return (
    <Section title="سورة واحدة بأصوات كثيرة" sub="اختر سورة واستمع إليها من قرّاء العالم">
      <div className="ls-chips">
        {SURAH_PICKS.map((n) => (
          <Link key={n} to={`/listen/surah/${n}`} className="ls-chip ls-press">
            {surahName(n)}
          </Link>
        ))}
        <Link to="/listen/surah/1?pick=1" className="ls-chip ls-press is-on">
          كل السور
        </Link>
      </div>
    </Section>
  );
}

export function ListenHomePage() {
  const navigate = useNavigate();
  const { catalog, error, retry } = useListenCatalog();
  const favoriteReciters = useListenStore((s) => s.favoriteReciters);
  const favorites = useListenStore((s) => s.favorites);
  const playlists = useListenStore((s) => s.playlists);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    document.title = "السماع — أثر";
  }, []);

  const reciterById = React.useMemo(() => new Map((catalog?.reciters ?? []).map((r) => [r.id, r])), [catalog]);
  const latestQiyam = React.useMemo(() => {
    if (!catalog) return [];
    const makkah = catalog.qiyam.filter((x) => x.city === "makkah").slice(0, 3);
    const madinah = catalog.qiyam.filter((x) => x.city === "madinah").slice(0, 3);
    return makkah.flatMap((m, i) => [m, madinah[i]].filter(Boolean)) as typeof catalog.qiyam;
  }, [catalog]);

  return (
    <div className="ls-page page-enter">
      <header className="ls-hero">
        <h1 className="ls-title">السماع</h1>
        <p className="ls-sub">القرآن كاملًا بأصوات قرّاء العالم، والتسجيلات الذهبية، وقيام الليل من الحرمين، والتواشيح. ويحفظ لك أثر سماعك.</p>
        <form
          className="ls-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/listen/reciters?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <Search size={18} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="ابحث عن قارئ… مثل: المنشاوي، الحصري، العفاسي" aria-label="بحث عن قارئ" />
        </form>
      </header>

      <TodayCard />
      <ContinueRail />

      {error ? (
        <div className="ls-card ls-empty">
          تعذّر تحميل قائمة القرّاء. تحقّق من الاتصال.
          <div className="mt-3">
            <button type="button" className="ls-ghost-btn" onClick={retry}>
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : !catalog ? (
        <div className="ls-card ls-empty" role="status">
          جارٍ التحميل…
        </div>
      ) : (
        <>
          <Moments catalog={catalog} />

          {favoriteReciters.length ? (
            <Section title="قرّاؤك">
              <div className="ls-rail">
                {favoriteReciters.map((id) => reciterById.get(id)).filter(Boolean).map((r) => (
                  <Link key={r!.id} to={`/listen/reciter/${r!.id}`} className="ls-reciter ls-press">
                    <ReciterMark name={r!.n} />
                    <span className="ls-reciter-name">{r!.n}</span>
                  </Link>
                ))}
              </div>
            </Section>
          ) : null}

          <Section title="قرّاء العالم" sub={`${arabicDigits(catalog.reciters.length)} قارئًا، بالمصحف كاملًا وبروايات متعددة`} more={{ to: "/listen/reciters" }}>
            <div className="ls-rail">
              {catalog.famous.slice(0, 24).map((id) => reciterById.get(id)).filter(Boolean).map((r) => (
                <Link key={r!.id} to={`/listen/reciter/${r!.id}`} className="ls-reciter ls-press">
                  <ReciterMark name={r!.n} />
                  <span className="ls-reciter-name">{r!.n}</span>
                </Link>
              ))}
            </div>
          </Section>

          <OneSurahManyVoices />

          <Section title="التسجيلات الذهبية" sub="المصاحف المجوّدة لأعلام دولة التلاوة" more={{ to: "/listen/golden" }}>
            <div className="ls-rail">
              {catalog.golden.map((g) => {
                const found = findMoshaf(catalog, g.moshaf);
                if (!found) return null;
                return (
                  <Link key={g.moshaf} to={`/listen/reciter/${g.reciter}?m=${g.moshaf}`} className="ls-gold ls-press">
                    <ReciterMark name={found.reciter.n} gold />
                    <span className="min-w-0">
                      <b>{found.reciter.n}</b>
                      <span>{g.note}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </Section>

          <Section title="قيام الليل في الحرمين" sub={`صلاة التراويح من الحرم المكي والمسجد النبوي، ${arabicDigits(catalog.qiyam.length)} موسمًا`} more={{ to: "/listen/qiyam" }}>
            <div className="ls-rail">
              {latestQiyam.map((y) => (
                <Link key={y.id} to={`/listen/qiyam/${y.id}`} className="ls-night ls-press">
                  <b>{cityName(y.city)}</b>
                  <span>رمضان {arabicDigits(y.year)}هـ</span>
                  <span style={{ marginTop: 26 }}>
                    <Play size={14} fill="currentColor" aria-hidden="true" style={{ display: "inline", transform: "scaleX(-1)" }} /> {arabicDigits(Object.keys(y.d).length)} سورة
                  </span>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="التواشيح والابتهالات" sub="من روائع النقشبندي وطوبار والفشني وعمران" more={{ to: "/listen/tawasheeh" }}>
            <div className="ls-rail">
              {catalog.tawasheeh.map((a) => (
                <Link key={a.id} to={`/listen/album/${a.id}`} className="ls-album ls-press">
                  <span className="ls-album-art" style={{ ["--h" as string]: hueFor(a.artist) % 60 + 15 }}>
                    {a.artist}
                  </span>
                  <b>{a.title}</b>
                  <span>{arabicDigits(a.tracks.length)} مقطعًا</span>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="مكتبتك">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/listen/favorites" className="ls-card ls-press p-4 flex items-center gap-3">
                <Heart size={20} className="text-(--accent)" aria-hidden="true" />
                <span>
                  <b className="block text-[14px]">المفضّلة</b>
                  <span className="text-[12px] text-(--muted)">{arabicDigits(Object.keys(favorites).length)} مقطعًا</span>
                </span>
              </Link>
              <Link to="/listen/stats" className="ls-card ls-press p-4 flex items-center gap-3">
                <BarChart3 size={20} className="text-(--accent)" aria-hidden="true" />
                <span>
                  <b className="block text-[14px]">أثر سماعك</b>
                  <span className="text-[12px] text-(--muted)">الأيام والختمة</span>
                </span>
              </Link>
              {playlists.map((p) => (
                <Link key={p.id} to={`/listen/playlist/${p.id}`} className="ls-card ls-press p-4 flex items-center gap-3">
                  <ListMusic size={20} className="text-(--accent)" aria-hidden="true" />
                  <span className="min-w-0">
                    <b className="block text-[14px] truncate">{p.name}</b>
                    <span className="text-[12px] text-(--muted)">{arabicDigits(p.tracks.length)} مقطعًا</span>
                  </span>
                </Link>
              ))}
            </div>
          </Section>

          <p className="ls-credit">
            التلاوات من <a href="https://mp3quran.net" target="_blank" rel="noreferrer">mp3quran.net</a>، وقيام الحرمين من{" "}
            <a href="https://quranicaudio.com" target="_blank" rel="noreferrer">QuranicAudio</a>، والتواشيح من{" "}
            <a href="https://archive.org" target="_blank" rel="noreferrer">أرشيف الإنترنت</a>. تُبث من مصادرها مباشرة.
          </p>
        </>
      )}
    </div>
  );
}
