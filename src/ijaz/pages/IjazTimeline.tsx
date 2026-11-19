/**
 * «الخط الزمني»: every miracle placed at the year science first confirmed it,
 * counted from the revelation (610م), grouped by century, filterable by
 * section. Built from the miracles themselves, so it always matches them.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { miracles } from '@/ijaz/data/miracles';
import { categories } from '@/ijaz/data/categories';
import type { MiracleCategory } from '@/ijaz/types';
import { IjazIcon } from '@/ijaz/components/ui/IjazIcon';
import { useIjazPrefs } from '@/ijaz/lib/ijazPrefs';
import { MIRACLE, REVELATION_YEAR, yearsAr, discoveryYear, yearAr } from '@/ijaz/lib/utils';
import { arNum } from '@/lib/formatNumber';
import { countAr } from '@/lib/arabicCount';

type Event = { slug: string; year: number; title: string; what: string; category: MiracleCategory; color: string };

const COLOR: Record<string, string> = Object.fromEntries(categories.map((c) => [c.id, c.color]));

const EVENTS: Event[] = miracles
  .flatMap((m) => {
    const year = discoveryYear(m);
    if (!year) return [];
    const ev = m.scientificEvidence.find((e) => String(e.year ?? '').includes(String(year)));
    return [{ slug: m.slug, year, title: m.titleAr, what: ev?.titleAr ?? '', category: m.category, color: COLOR[m.category] ?? '#d4a853' }];
  })
  .sort((a, b) => a.year - b.year);

const ORDINAL = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون'];

function centuryOf(year: number): string {
  const c = Math.floor((year - 1) / 100) + 1;
  return `القرن ${ORDINAL[c] ?? arNum(c)} الميلادي`;
}

export default function TimelinePage() {
  const [filter, setFilter] = useState<MiracleCategory | 'all'>('all');
  const read = useIjazPrefs((s) => s.read);

  const groups = useMemo(() => {
    const shown = EVENTS.filter((e) => filter === 'all' || e.category === filter);
    const out: { century: string; events: Event[] }[] = [];
    for (const e of shown) {
      const c = centuryOf(e.year);
      const last = out[out.length - 1];
      if (last?.century === c) last.events.push(e);
      else out.push({ century: c, events: [e] });
    }
    return out;
  }, [filter]);

  const count = groups.reduce((n, g) => n + g.events.length, 0);

  return (
    <main className="min-h-screen pt-10 pb-20" dir="rtl">
      <div className="container mx-auto px-5 max-w-3xl">
        <header className="text-center mb-8">
          <h1 className="font-amiri text-4xl md:text-5xl font-bold mb-3 gold-gradient-text">الخط الزمني</h1>
          <p className="text-text-secondary font-tajawal text-base leading-relaxed">
            كل معجزة في العام الذي أكدها فيه العلم، وكم سبقه القرآن إليها.
          </p>
        </header>

        <div className="flex flex-wrap justify-center gap-2 mb-8" role="radiogroup" aria-label="القسم">
          {[{ id: 'all' as const, nameAr: 'الكل', color: '#d4a853' }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={filter === c.id}
              onClick={() => setFilter(c.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-tajawal border transition"
              style={filter === c.id ? { background: `${c.color}22`, borderColor: c.color, color: c.color } : { borderColor: 'rgba(255,255,255,0.1)', color: 'var(--ijaz-text-muted, #9aa3b2)' }}
            >
              {c.id !== 'all' && <IjazIcon name={c.id} size={14} />}
              {c.nameAr.replace(/^الإعجاز\s+/, '')}
            </button>
          ))}
        </div>

        <p className="text-center text-text-muted text-sm font-tajawal mb-8">{countAr(count, MIRACLE)}</p>

        <ol className="relative border-r border-gold-primary/25 pr-6 stack-y-3">
          <li className="relative mb-6">
            <span className="absolute -right-[33px] top-1.5 w-4 h-4 rounded-full bg-gold-primary shadow-[0_0_14px_rgba(212,168,83,0.6)]" aria-hidden="true" />
            <div className="glass-premium rounded-2xl p-4">
              <p className="text-gold-primary font-tajawal text-sm font-bold">{yearAr(REVELATION_YEAR)}–{yearAr(632)}م</p>
              <h2 className="font-amiri text-xl font-bold text-text-primary mt-1">نزول القرآن الكريم</h2>
              <p className="text-text-secondary text-sm font-tajawal mt-1 leading-relaxed">ومنه يُحسب سبق كل معجزة بعده.</p>
            </div>
          </li>

          {groups.map((g) => (
            <li key={g.century} className="relative">
              <h2 className="font-amiri text-lg font-bold text-gold-primary/90 mb-3 mt-4">{g.century}</h2>
              <ol className="stack-y-3">
                {g.events.map((e) => (
                  <li key={e.slug} className="relative">
                    <span className="absolute -right-[31px] top-5 w-3 h-3 rounded-full border-2 border-vanta" style={{ background: e.color, boxShadow: `0 0 10px ${e.color}80` }} aria-hidden="true" />
                    <Link to={`/ijaz/miracles/${e.slug}`} className="block glass-card rounded-2xl p-4 hover:bg-white/5 transition">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-sm font-bold font-tajawal" style={{ background: `${e.color}18`, color: e.color }}>
                          {yearAr(e.year)}م
                        </span>
                        <span className="text-xs font-tajawal text-text-muted">بعد {yearsAr(e.year - REVELATION_YEAR)} من نزول الوحي</span>
                        {read[e.slug] && <span className="text-xs font-tajawal" style={{ color: e.color }}>قرأتها</span>}
                      </div>
                      <h3 className="font-amiri text-lg font-bold text-text-primary mt-2 leading-snug">{e.title}</h3>
                      {e.what ? <p className="text-text-secondary text-sm font-tajawal mt-1 leading-relaxed">{e.what}</p> : null}
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-tajawal font-bold" style={{ color: e.color }}>
                        اقرأها <ChevronLeft size={13} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
