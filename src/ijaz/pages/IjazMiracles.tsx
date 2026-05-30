
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MiracleCard from '@/ijaz/components/ui/MiracleCard';
import CategoryBadge from '@/ijaz/components/ui/CategoryBadge';
import SearchBar from '@/ijaz/components/ui/SearchBar';
import { miracles } from '@/ijaz/data/miracles';
import { categories } from '@/ijaz/data/categories';
import { MiracleCategory } from '@/ijaz/types';
import { ScrollReveal } from '@/ijaz/components/effects/ScrollAnimations';
import { AnimatedGradientText } from '@/ijaz/components/effects/TextEffects';

import ParticleField from '@/ijaz/components/effects/ParticleField';
import SacredGeometry from '@/ijaz/components/effects/SacredGeometry';

export default function MiraclesPage() {
  const [selectedCategory, setSelectedCategory] = useState<MiracleCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'category'>('order');

  const filteredMiracles = useMemo(() => {
    let result = selectedCategory === 'all'
      ? [...miracles]
      : miracles.filter((m) => m.category === selectedCategory);

    if (sortBy === 'category') {
      result.sort((a, b) => a.category.localeCompare(b.category));
    } else {
      result.sort((a, b) => a.order - b.order);
    }
    return result;
  }, [selectedCategory, sortBy]);

  return (
    <main className="min-h-screen relative" dir="rtl">
      {/* Background effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleField variant="gold-dust" density={0.6} speed={0.2} />
      </div>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <SacredGeometry color="#d4a853" intensity={0.15} />
      </div>

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
                {'\u0627\u0644\u0645\u0639\u062C\u0632\u0627\u062A \u0627\u0644\u0639\u0644\u0645\u064A\u0629'}
              </AnimatedGradientText>
            </h1>
            <p className="text-text-secondary font-tajawal text-base md:text-lg max-w-3xl mx-auto mb-8 leading-relaxed">
              {'\u0645\u062C\u0645\u0648\u0639\u0629 \u0634\u0627\u0645\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0639\u062C\u0632\u0627\u062A \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0641\u064A \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064A\u0645 \u0648\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0646\u0628\u0648\u064A\u0629\u060C \u0645\u0633\u062A\u062E\u0631\u062C\u0629 \u0645\u0646 \u0645\u0624\u0644\u0641\u0627\u062A \u062F. \u0647\u064A\u062B\u0645 \u0637\u0644\u0639\u062A\u060C \u0645\u0639 \u0627\u0644\u0623\u062F\u0644\u0629 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629 \u0648\u0627\u0644\u0622\u064A\u0627\u062A \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629'}
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
                  {'\u0627\u0644\u0643\u0644'} ({miracles.length})
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
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'order' | 'category')}
                className="bg-vanta/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-text-primary font-tajawal focus:outline-none focus:border-gold-primary/50 backdrop-blur-sm"
              >
                <option value="order">{'\u062A\u0631\u062A\u064A\u0628 \u062D\u0633\u0628 \u0627\u0644\u0631\u0642\u0645'}</option>
                <option value="category">{'\u062A\u0631\u062A\u064A\u0628 \u062D\u0633\u0628 \u0627\u0644\u0642\u0633\u0645'}</option>
              </select>
            </div>
          </motion.div>

          {/* Results Count */}
          <p className="text-text-muted text-sm font-tajawal mb-6">
            {filteredMiracles.length} {'\u0645\u0639\u062C\u0632\u0629'}
            {selectedCategory !== 'all' &&
              ` ${'\u0641\u064A \u0642\u0633\u0645'} ${categories.find((c) => c.id === selectedCategory)?.nameAr || ''}`}
          </p>

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
              <p className="text-text-muted font-tajawal text-lg">{'\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C'}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
