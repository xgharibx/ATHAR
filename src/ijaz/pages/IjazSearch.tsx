
import { useState } from 'react';
import { motion } from 'framer-motion';
import SearchBar from '@/ijaz/components/ui/SearchBar';
import MiracleCard from '@/ijaz/components/ui/MiracleCard';
import CategoryBadge from '@/ijaz/components/ui/CategoryBadge';
import { searchMiracles, getSemanticSuggestions } from '@/ijaz/lib/search';
import { miracles } from '@/ijaz/data/miracles';
import { categories } from '@/ijaz/data/categories';
import { SearchResult, MiracleCategory } from '@/ijaz/types';

const presetQueries = [
  { label: 'توسع الكون', queryText: 'توسع الكون' },
  { label: 'مراحل الجنين', queryText: 'مراحل الجنين' },
  { label: 'الجبال أوتاد', queryText: 'الجبال أوتاد' },
  { label: 'حاجز البحرين', queryText: 'البحرين حاجز' },
  { label: 'دليل الخالق', queryText: 'دليل وجود الخالق' },
  { label: 'النبوة', queryText: 'إثبات النبوة' },
  { label: 'الانفجار العظيم', queryText: 'الانفجار العظيم Big Bang' },
  { label: 'العسل شفاء', queryText: 'العسل شفاء' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim().length >= 2) {
      setResults(searchMiracles(q));
      setHasSearched(true);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="font-amiri text-4xl md:text-5xl font-bold mb-4 gold-gradient-text">
            محرك البراهين
          </h1>
          <p className="text-text-secondary font-tajawal text-base mb-2">Proof Engine</p>
          <p className="text-text-secondary font-tajawal text-sm max-w-2xl mx-auto">
            ابحث عن أي معجزة علمية أو دليل عقلي أو آية قرآنية — البحث يشمل العناوين والأوصاف والآيات والكلمات المفتاحية
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative">
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-deep-navy/80 backdrop-blur-xl border border-border-subtle focus-within:border-gold-primary/50 focus-within:shadow-gold-md transition-all">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-primary flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="ابحث عن معجزة... كيف بدأ الكون؟ ما هي مراحل الجنين؟"
                className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted font-tajawal text-lg"
                dir="rtl"
                autoFocus
              />
              {query && (
                <button onClick={() => handleSearch('')} className="text-text-muted hover:text-text-primary transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Preset Queries */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <p className="text-text-muted text-sm font-tajawal mb-3">أمثلة للبحث:</p>
            <div className="flex flex-wrap gap-2">
              {presetQueries.map((pq) => (
                <button
                  key={pq.queryText}
                  onClick={() => handleSearch(pq.queryText)}
                  className="px-4 py-2 rounded-xl bg-space-blue/30 border border-border-subtle text-text-secondary text-sm font-tajawal hover:border-gold-primary/30 hover:text-gold-primary transition-all"
                >
                  {pq.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {hasSearched && (
          <div>
            <p className="text-text-muted text-sm font-tajawal mb-6">
              {results.length} نتيجة للبحث عن &ldquo;{query}&rdquo;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {results.map((result, i) => (
                <MiracleCard key={result.miracle.id} miracle={result.miracle} index={i} />
              ))}
            </div>

            {results.length === 0 && (
              <div className="text-center py-16">
                <p className="text-text-muted font-tajawal text-lg mb-2">لم نجد نتائج</p>
                <p className="text-text-muted font-tajawal text-sm">جرّب كلمات بحث مختلفة</p>
              </div>
            )}
          </div>
        )}

        {/* Browse by Category */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-gold-primary font-amiri text-xl font-bold mb-4">أو تصفح حسب القسم</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const count = miracles.filter((m) => m.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSearch(cat.nameAr)}
                    className="glass-card p-4 text-right hover:scale-[1.02] transition-all flex items-center gap-4"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${cat.color}15` }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-text-primary font-amiri text-base font-bold">{cat.nameAr}</h3>
                      <p className="text-text-muted text-xs font-tajawal">{count} معجزة</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
