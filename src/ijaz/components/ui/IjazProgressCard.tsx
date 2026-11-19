/**
 * Where you are in «الإعجاز»: how many miracles you have read, per section,
 * and what you saved, with a way back to the next unread one.
 */
import { Link } from 'react-router-dom';
import { Bookmark, BookOpenCheck } from 'lucide-react';
import { miracles } from '@/ijaz/data/miracles';
import { categories } from '@/ijaz/data/categories';
import { useIjazPrefs } from '@/ijaz/lib/ijazPrefs';
import { MIRACLE } from '@/ijaz/lib/utils';
import { arNum } from '@/lib/formatNumber';
import { countAr } from '@/lib/arabicCount';

export function IjazProgressCard() {
  const read = useIjazPrefs((s) => s.read);
  const saved = useIjazPrefs((s) => s.saved);
  const readCount = miracles.filter((m) => read[m.slug]).length;
  const nextUnread = [...miracles].sort((a, b) => a.order - b.order).find((m) => !read[m.slug]);
  const pct = Math.round((readCount / miracles.length) * 100);

  return (
    <div className="mt-12 mx-auto max-w-2xl glass-premium rounded-3xl p-6 cosmic-border" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <BookOpenCheck size={22} aria-hidden="true" className="text-gold-primary" />
        <h3 className="font-amiri text-xl font-bold text-text-primary">رحلتك في الإعجاز</h3>
        <span className="mr-auto text-sm font-tajawal text-text-secondary">
          {readCount ? `قرأت ${arNum(readCount)} من ${arNum(miracles.length)}` : 'لم تبدأ بعد'}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={miracles.length} aria-valuenow={readCount} aria-label="ما قرأته من المعجزات">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, readCount ? 2 : 0)}%`, background: 'linear-gradient(90deg, #d4a853, #2dd4a8)' }} />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {categories.map((c) => {
          const all = miracles.filter((m) => m.category === c.id);
          const done = all.filter((m) => read[m.slug]).length;
          return (
            <Link key={c.id} to={`/ijaz/categories/${c.id}`} className="rounded-xl px-1 py-2 text-center hover:bg-white/5 transition" style={{ background: `${c.color}0f` }}>
              <span className="block text-sm font-bold font-tajawal" style={{ color: c.color }}>{arNum(done)} من {arNum(all.length)}</span>
              <span className="block mt-0.5 text-[10px] leading-tight text-text-muted font-tajawal line-clamp-2">{c.nameAr.replace(/^الإعجاز\s+/, '')}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {nextUnread ? (
          <Link to={`/ijaz/miracles/${nextUnread.slug}`} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-tajawal font-bold bg-gold-primary/90 text-vanta hover:bg-gold-primary transition">
            {readCount ? 'التالية' : 'ابدأ'}: {nextUnread.titleAr}
          </Link>
        ) : (
          <span className="text-sm font-tajawal text-verse-green">أتممت {countAr(miracles.length, MIRACLE)}، بارك الله فيك</span>
        )}
        {saved.length > 0 && (
          <Link to="/ijaz/miracles?saved=1" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-tajawal border border-white/10 text-text-secondary hover:bg-white/5 transition">
            <Bookmark size={14} aria-hidden="true" /> المحفوظة ({arNum(saved.length)})
          </Link>
        )}
      </div>
    </div>
  );
}
