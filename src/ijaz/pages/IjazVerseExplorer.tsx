
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import VerseDisplay from '@/ijaz/components/ui/VerseDisplay';
import { verses, getVersesByKeyword } from '@/ijaz/data/verses';
import { miracles } from '@/ijaz/data/miracles';
import { QuranicVerse } from '@/ijaz/types';

// Flatten all verses from miracles + standalone verses
function getAllVerses(): QuranicVerse[] {
  const verseMap = new Map<string, QuranicVerse>();

  // Add from standalone verses data
  verses.forEach((v) => verseMap.set(v.id, v));

  // Add from miracles data
  miracles.forEach((m) => {
    m.verses.forEach((v) => {
      if (!verseMap.has(v.id)) verseMap.set(v.id, v);
    });
  });

  return Array.from(verseMap.values());
}

const keywords = [
  'الكون', 'الأرض', 'السماء', 'الماء', 'الجبال', 'البحر',
  'الشمس', 'القمر', 'النجوم', 'الإنسان', 'الجنين', 'العسل',
  'الحديد', 'النطفة', 'العلقة', 'المضغة', 'الظلمات',
];

export default function VerseExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerse, setSelectedVerse] = useState<QuranicVerse | null>(null);
  const allVerses = useMemo(() => getAllVerses(), []);

  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) return allVerses;
    const q = searchQuery.toLowerCase();
    return allVerses.filter(
      (v) =>
        v.arabicText.includes(q) ||
        v.translation.toLowerCase().includes(q) ||
        v.surah.includes(q) ||
        v.keywords.some((k) => k.includes(q))
    );
  }, [allVerses, searchQuery]);

  const relatedMiracles = useMemo(() => {
    if (!selectedVerse) return [];
    return miracles.filter((m) => m.verses.some((v) => v.id === selectedVerse.id));
  }, [selectedVerse]);

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="font-amiri text-4xl md:text-5xl font-bold mb-4 gold-gradient-text">
            مستكشف الآيات
          </h1>
          <p className="text-text-secondary font-tajawal text-base max-w-2xl mx-auto">
            تصفح الآيات القرآنية المتعلقة بالإعجاز العلمي — ابحث بالكلمة المفتاحية أو اسم السورة
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Verse List */}
          <div className="lg:col-span-2">
            {/* Search */}
            <div className="mb-6">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-deep-navy/80 border border-border-subtle focus-within:border-verse-green/50 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-verse-green">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في الآيات..."
                  className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted font-tajawal text-sm"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap gap-2 mb-6">
              {keywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => setSearchQuery(kw)}
                  className={`px-3 py-1 rounded-full text-xs font-tajawal border transition-all ${
                    searchQuery === kw
                      ? 'bg-verse-green/20 border-verse-green/40 text-verse-green'
                      : 'border-border-subtle text-text-muted hover:text-verse-green hover:border-verse-green/30'
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-text-muted text-sm font-tajawal mb-4">{filteredVerses.length} آية</p>

            {/* Verses Grid */}
            <div className="space-y-4">
              {filteredVerses.map((verse, i) => (
                <motion.button
                  key={verse.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedVerse(verse)}
                  className={`w-full text-right glass-card p-5 transition-all hover:scale-[1.01] ${
                    selectedVerse?.id === verse.id ? 'ring-1 ring-verse-green/50 shadow-lg' : ''
                  }`}
                >
                  <p className="font-amiri text-verse-green text-lg leading-relaxed line-clamp-2" dir="rtl">
                    {verse.arabicText}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-text-muted text-xs font-tajawal">
                      سورة {verse.surah} : {verse.ayahNumber}
                    </span>
                    <div className="flex gap-1">
                      {verse.keywords.slice(0, 3).map((kw) => (
                        <span key={kw} className="px-2 py-0.5 rounded-full bg-verse-green/10 text-verse-green text-xs font-tajawal">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Right: Detail Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <AnimatePresence mode="wait">
                {selectedVerse ? (
                  <motion.div
                    key={selectedVerse.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <VerseDisplay verse={selectedVerse} size="lg" />

                    {/* Related Miracles */}
                    {relatedMiracles.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-gold-primary font-amiri text-lg font-bold mb-3">المعجزات المرتبطة</h3>
                        <div className="space-y-2">
                          {relatedMiracles.map((m) => (
                            <Link
                              key={m.id}
                              to={`/ijaz/miracles/${m.slug}`}
                              className="block glass-card p-3 hover:border-gold-primary/30 transition-all"
                            >
                              <h4 className="text-gold-primary font-amiri text-sm font-bold">{m.titleAr}</h4>
                              <p className="text-text-muted text-xs font-tajawal mt-0.5">{m.title}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-8 text-center"
                  >
                    <div className="text-4xl mb-4">📖</div>
                    <p className="text-text-muted font-tajawal text-sm">
                      اختر آية من القائمة لعرض تفاصيلها
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
