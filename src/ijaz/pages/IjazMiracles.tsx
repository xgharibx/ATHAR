
import { Select } from "@/components/ui/Pickers";
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MiracleCard from '@/ijaz/components/ui/MiracleCard';
import CategoryBadge from '@/ijaz/components/ui/CategoryBadge';
import SearchBar from '@/ijaz/components/ui/SearchBar';
import { miracles } from '@/ijaz/data/miracles';
import { categories } from '@/ijaz/data/categories';
import { MiracleCategory } from '@/ijaz/types';
import { AnimatedGradientText } from '@/ijaz/components/effects/TextEffects';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useSearchParams } from 'react-router-dom';
import { useIjazPrefs } from '@/ijaz/lib/ijazPrefs';
import { MIRACLE } from '@/ijaz/lib/utils';
import { arNum } from '@/lib/formatNumber';
import { countAr } from '@/lib/arabicCount';

type Status = 'all' | 'unread' | 'saved';
const STATUS: [Status, string][] = [['all', 'الكل'], ['unread', 'لم أقرأها'], ['saved', 'المحفوظة']];
import { useIsMobile } from '@/ijaz/hooks/useIsMobile';

import ParticleField from '@/ijaz/components/effects/ParticleField';
import SacredGeometry from '@/ijaz/components/effects/SacredGeometry';

export default function MiraclesPage() {
  useScrollRestoration();
  const isMobile = useIsMobile();
  const [selectedCategory, setSelectedCategory] = useState<MiracleCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'category'>('order');
  const [params, setParams] = useSearchParams();
  const status: Status = params.get('saved') ? 'saved' : params.get('unread') ? 'unread' : 'all';
  const setStatus = (s: Status) => setParams(s === 'all' ? {} : { [s]: '1' }, { replace: true });
  const read = useIjazPrefs((s) => s.read);
  const saved = useIjazPrefs((s) => s.saved);

  const filteredMiracles = useMemo(() => {
    let result = selectedCategory === 'all'
      ? [...miracles]
      : miracles.filter((m) => m.category === selectedCategory);
    if (status === 'saved') result = result.filter((m) => saved.includes(m.slug));
    else if (status === 'unread') result = result.filter((m) => !read[m.slug]);

    if (sortBy === 'category') {
      result.sort((a, b) => a.category.localeCompare(b.category));
    } else {
      result.sort((a, b) => a.order - b.order);
    }
    return result;
  }, [selectedCategory, sortBy, status, saved, read]);

  return (
    <main className="min-h-screen relative" dir="rtl">
      {/* Background effects — disabled on mobile for performance/battery */}
      {!isMobile && (
        <>
          <div className="fixed inset-0 z-0 pointer-events-none">
            <ParticleField variant="gold-dust" density={0.6} speed={0.2} />
          </div>
          <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
            <SacredGeometry color="#d4a853" intensity={0.15} />
          </div>
        </>
      )}

      {/* Hero Section */}
      <section className="relative z-10 pt-28 pb-12">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-amiri text-4xl md:text-5xl lg:text-6xl font-bold mb-5">
              <AnimatedGradientText colors={['#d4a853', '#f0e6b8', '#ffffff', '#d4a853']}>
                {'المعجزات العلمية'}
              </AnimatedGradientText>
            </h1>
            <p className="text-text-secondary font-tajawal text-base md:text-lg max-w-3xl mx-auto mb-8 leading-relaxed">
              {`${countAr(miracles.length, MIRACLE)} في القرآن الكريم والسنة النبوية، من مؤلفات د. هيثم طلعت، مع آياتها وأدلتها العلمية`}
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto mb-8">
              <SearchBar />
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-premium rounded-2xl p-5 mb-8"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Categories */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-1.5 rounded-full text-sm font-tajawal border transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-gold-primary/20 border-gold-primary text-gold-primary shadow-[0_0_15px_rgba(212,168,83,0.15)]'
                      : 'border-white/10 text-text-muted hover:text-text-primary hover:border-white/20'
                  }`}
                >
                  {'الكل'} ({arNum(miracles.length)})
                </button>
                {categories.map((cat) => (
                  <CategoryBadge
                    key={cat.id}
                    category={cat.id}
                    interactive
                    selected={selectedCategory === cat.id}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                  />
                ))}
              </div>

              {/* Sort */}
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'order' | 'category')}
                className="bg-vanta/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-text-primary font-tajawal focus:outline-hidden focus:border-gold-primary/50 backdrop-blur-xs"
              >
                <option value="order">{'ترتيب حسب الرقم'}</option>
                <option value="category">{'ترتيب حسب القسم'}</option>
              </Select>
            </div>
          </motion.div>

          {/* Status + count */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="flex gap-2" role="radiogroup" aria-label="عرض">
              {STATUS.map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={status === k} onClick={() => setStatus(k)}
                  className={`px-3 py-1.5 rounded-full text-sm font-tajawal border transition ${status === k ? 'bg-gold-primary/20 border-gold-primary text-gold-primary' : 'border-white/10 text-text-muted hover:text-text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-text-muted text-sm font-tajawal mr-auto">
              {filteredMiracles.length ? countAr(filteredMiracles.length, MIRACLE) : ''}
              {selectedCategory !== 'all' && filteredMiracles.length ? ` في ${categories.find((c) => c.id === selectedCategory)?.nameAr || ''}` : ''}
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredMiracles.map((miracle, i) => (
                <motion.div
                  key={miracle.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className="holographic-card rounded-xl overflow-hidden"
                >
                  <MiracleCard miracle={miracle} index={i} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredMiracles.length === 0 && (
            <div className="text-center py-20">
              <p className="text-text-muted font-tajawal text-lg">
                {status === 'saved' ? 'لم تحفظ معجزة بعد، اضغط «احفظها» في صفحتها.' : status === 'unread' ? 'قرأتها كلها، بارك الله فيك.' : 'لا توجد نتائج'}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
