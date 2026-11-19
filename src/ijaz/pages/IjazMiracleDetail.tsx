
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, Navigate } from 'react-router-dom';
import { getMiracleBySlug, getRelatedMiracles, miracles } from '@/ijaz/data/miracles';
import { Bookmark, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { arNum } from '@/lib/formatNumber';
import { useIjazPrefs } from '@/ijaz/lib/ijazPrefs';
import { videos } from '@/ijaz/data/videos';
import VerseDisplay from '@/ijaz/components/ui/VerseDisplay';
import MiracleCard from '@/ijaz/components/ui/MiracleCard';
import VideoOverlay, { VideoThumbnail } from '@/ijaz/components/ui/VideoOverlay';
import { REVELATION_YEAR, yearsAr, yearAr, arabicTags, authorAr, discoveryYear, getCategoryLabel, getVisualizationColor } from '@/ijaz/lib/utils';
import MiracleVisual from '@/ijaz/components/visuals/MiracleVisualRegistry';
import { ScrollReveal } from '@/ijaz/components/effects/ScrollAnimations';
import { AnimatedGradientText } from '@/ijaz/components/effects/TextEffects';
import { useIsMobile } from '@/ijaz/hooks/useIsMobile';
import DeepDivePanel from '@/ijaz/components/ui/DeepDivePanel';

/* Dynamic 3D — no SSR */
import ParticleField from '@/ijaz/components/effects/ParticleField';
import SacredGeometry from '@/ijaz/components/effects/SacredGeometry';

/* Category -> particle variant mapping */
const categoryParticle: Record<string, 'stars' | 'gold-dust' | 'divine-light' | 'nebula' | 'geometric'> = {
  cosmological: 'stars',
  biological: 'divine-light',
  'earth-sciences': 'nebula',
  prophecies: 'geometric',
  'logical-philosophical': 'gold-dust',
};

export default function MiracleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const miracle = getMiracleBySlug(slug ?? '');
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const showEnglish = useIjazPrefs((s) => s.showEnglish);
  const canonical = miracle?.slug ?? '';
  const saved = useIjazPrefs((s) => (canonical ? s.saved.includes(canonical) : false));
  const toggleSaved = useIjazPrefs((s) => s.toggleSaved);
  const markRead = useIjazPrefs((s) => s.markRead);

  // Counts as read after a few seconds on the page.
  useEffect(() => {
    if (!canonical) return;
    const t = setTimeout(() => markRead(canonical), 4000);
    return () => clearTimeout(t);
  }, [canonical, markRead]);

  useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [slug]);

  // An address that was merged into another miracle moves to it.
  if (miracle && miracle.slug !== slug) {
    return <Navigate to={`/ijaz/miracles/${miracle.slug}`} replace />;
  }

  if (!miracle) {
    return <Navigate to="/ijaz/miracles" replace />;
  }

  const relatedMiracles = getRelatedMiracles(miracle.id);
  // Videos behind miracles are disabled for now (per product decision).
  const VIDEOS_ENABLED = false;
  const miracleVideos = VIDEOS_ENABLED ? videos.filter((v) => miracle.videoIds?.includes(v.id)) : [];
  const accentColor = getVisualizationColor(miracle.visualizationType);
  const particleVariant = categoryParticle[miracle.category] || 'stars';
  const year = discoveryYear(miracle);
  const ordered = [...miracles].sort((a, b) => a.order - b.order);
  const at = ordered.findIndex((m) => m.id === miracle.id);
  const prev = at > 0 ? ordered[at - 1] : null;
  const next = at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : null;
  const share = async () => {
    const verse = miracle.verses[0];
    const text = `${miracle.titleAr}\n\n${verse ? `﴿${verse.arabicText}﴾ [${verse.surah}: ${arNum(verse.ayahNumber)}]\n\n` : ''}${miracle.summaryAr}`;
    try {
      if (navigator.share) await navigator.share({ title: miracle.titleAr, text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* cancelled */
    }
  };

  return (
    <main className="min-h-screen" dir="rtl">
      {/* ========= IMMERSIVE HERO ========= */}
      <section className="relative isolate h-[60vh] sm:h-[75vh] min-h-[480px] flex items-end overflow-hidden">
        {/* Miracle-specific 3D visual — unique per miracle */}
        <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-x-0 top-16 sm:top-20 bottom-36 sm:bottom-40 lg:bottom-44">
            <MiracleVisual miracleId={miracle.id} className="miracle-visual-stage w-full h-full select-none" />
          </div>
        </div>

        {/* Particle overlay on top of the visual — disabled on mobile for performance */}
        {!isMobile && (
          <div className="absolute inset-0 z-1 pointer-events-none">
            <ParticleField variant={particleVariant} density={0.8} speed={0.4} />
          </div>
        )}

        {/* Lightweight CSS starfield — works on mobile too (no WebGL) */}
        <div aria-hidden className="ijaz-stars absolute inset-0 z-1 pointer-events-none" />

        {/* Multi-layer gradient overlays for depth — kept subtle so visual can breathe */}
        <div className="absolute inset-0 z-2 bg-linear-to-t from-vanta via-vanta/10 to-transparent" />
        <div className="absolute inset-0 z-2 bg-linear-to-r from-vanta/20 via-transparent to-vanta/20" />
        <div className="absolute bottom-0 left-0 right-0 z-2 h-40 bg-linear-to-t from-vanta via-vanta/80 to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 pb-8 sm:pb-10 lg:pb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="font-amiri text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3">
              <AnimatedGradientText colors={[accentColor, '#d4a853', '#ffffff', accentColor]}>
                {miracle.titleAr}
              </AnimatedGradientText>
            </h1>
            {showEnglish && <p className="text-text-secondary font-tajawal text-lg md:text-xl" dir="ltr" lang="en">{miracle.title}</p>}
            {year ? (
              <p className="mt-2 inline-flex flex-wrap items-center gap-x-1.5 rounded-full px-3 py-1 text-[13px] font-tajawal text-text-secondary" style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
                كشفه العلم عام {yearAr(year)}م، بعد {yearsAr(year - REVELATION_YEAR)} من نزول الوحي
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => toggleSaved(miracle.slug)} aria-pressed={saved}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-tajawal border border-white/10 bg-white/5 hover:bg-white/10 transition"
                style={saved ? { color: '#d4a853', borderColor: '#d4a85355' } : undefined}
              >
                <Bookmark size={15} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} /> {saved ? 'محفوظة' : 'احفظها'}
              </button>
              <button type="button" onClick={share}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-tajawal border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                <Share2 size={15} aria-hidden="true" /> مشاركة
              </button>
            </div>
          </motion.div>
        </div>

        {/* Decorative bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 z-3 h-px bg-linear-to-r from-transparent via-gold-primary/20 to-transparent" />
      </section>

      {/* ========= CONTENT ========= */}
      <section className="relative py-16">
        {/* Subtle background pattern — disabled on mobile */}
        {!isMobile && (
          <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
            <SacredGeometry color={accentColor} intensity={0.15} />
          </div>
        )}

        <div className="relative z-10 container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content (2 cols) */}
            <div className="lg:col-span-2 stack-y-14">
              {/* Summary and section index */}
              <div className="holographic-card rounded-2xl p-5" style={{ borderColor: `${accentColor}30` }}>
                <p className="text-xs font-tajawal font-bold mb-2" style={{ color: accentColor }}>الخلاصة</p>
                <p className="text-text-primary font-tajawal text-base leading-loose">{miracle.summaryAr}</p>
                <nav aria-label="أقسام الصفحة" className="mt-4 flex flex-wrap gap-2">
                  {[
                    ['ijaz-verses', `الآيات (${arNum(miracle.verses.length)})`],
                    ['ijaz-explain', 'الشرح'],
                    ['ijaz-evidence', `الأدلة (${arNum(miracle.scientificEvidence.length)})`],
                    ['ijaz-source', 'المصدر'],
                  ].map(([id, label]) => (
                    <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id!)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      className="px-3 py-1.5 rounded-full text-xs font-tajawal border border-white/10 text-text-secondary hover:bg-white/5 transition"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Quranic Verses */}
              <ScrollReveal variant="fade-up">
                <div>
                  <h2 id="ijaz-verses" className="scroll-mt-28 text-verse-green font-amiri text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="w-1 h-10 bg-linear-to-b from-verse-green to-transparent rounded-full" />
                    {'الآيات القرآنية'}
                  </h2>
                  <div className="stack-y-6">
                    {miracle.verses.map((verse) => (
                      <div key={verse.id} className="cosmic-border rounded-2xl">
                        <VerseDisplay verse={verse} size="md" />
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* Description */}
              <ScrollReveal variant="fade-up">
                <div>
                  <h2 id="ijaz-explain" className="scroll-mt-28 text-gold-primary font-amiri text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="w-1 h-10 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }} />
                    {'الشرح التفصيلي'}
                  </h2>
                  <div className="holographic-card rounded-2xl p-8">
                    <p className="text-text-primary font-tajawal text-base md:text-lg leading-loose" dir="rtl">
                      {miracle.descriptionAr}
                    </p>
                    {miracle.deepDiveAr && (
                      <DeepDivePanel
                        content={miracle.deepDiveAr}
                        dir="rtl"
                        accentColor={accentColor}
                        lang="ar"
                      />
                    )}
                    {showEnglish && (
                    <div className="mt-6 pt-4 border-t border-white/5" lang="en">
                      <p className="text-text-muted font-tajawal text-sm leading-relaxed" dir="ltr">
                        {miracle.description}
                      </p>
                      {miracle.deepDive && (
                        <DeepDivePanel
                          content={miracle.deepDive}
                          dir="ltr"
                          accentColor={accentColor}
                          lang="en"
                        />
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>

              {/* Scientific Evidence */}
              <ScrollReveal variant="fade-up">
                <div>
                  <h2 id="ijaz-evidence" className="scroll-mt-28 font-amiri text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: accentColor }}>
                    <span className="w-1 h-10 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }} />
                    {'الأدلة العلمية'}
                  </h2>
                  <div className="stack-y-4">
                    {miracle.scientificEvidence.map((evidence, i) => (
                      <motion.div
                        key={evidence.id || `evidence-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-premium rounded-xl p-6 group hover:scale-[1.01] transition-transform"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                            style={{ background: `${accentColor}15`, color: accentColor, boxShadow: `0 0 20px ${accentColor}10` }}
                          >
                            {arNum(i + 1)}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-text-primary font-tajawal font-bold text-base mb-1">
                              {evidence.titleAr || evidence.title}
                            </h4>
                            {(evidence.scientist || evidence.year) && (
                              <p className="text-text-muted text-xs font-tajawal mb-2">
                                {[evidence.scientist && !/[A-Za-z]/.test(evidence.scientist) ? evidence.scientist : null, evidence.year && /^\d{3,4}$/.test(evidence.year) ? `${yearAr(evidence.year)}م` : null].filter(Boolean).join('، ')}
                              </p>
                            )}
                            {showEnglish && evidence.titleAr && (
                              <p className="text-text-muted text-xs font-tajawal mb-2" dir="ltr" lang="en">{evidence.title}</p>
                            )}
                            <p className="text-text-secondary font-tajawal text-sm leading-relaxed">
                              {evidence.descriptionAr || evidence.description}
                            </p>
                            {showEnglish && evidence.descriptionAr && (
                              <p className="text-text-muted font-tajawal text-xs leading-relaxed mt-2 italic" dir="ltr" lang="en">
                                {evidence.description}
                              </p>
                            )}
                            {evidence.source && (
                              <div className="text-text-muted text-xs font-tajawal mt-3 pt-2 border-t border-white/5">
                                <span className="block mb-1">المرجع</span>
                                <p dir="ltr" lang="en" className="text-left leading-relaxed opacity-80">{evidence.source}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* Videos */}
              {miracleVideos.length > 0 && (
                <ScrollReveal variant="fade-up">
                  <div>
                    <h2 className="text-gold-primary font-amiri text-2xl font-bold mb-6 flex items-center gap-3">
                      <span className="w-1 h-10 bg-linear-to-b from-gold-primary to-transparent rounded-full" />
                      {'مقاطع مرئية'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {miracleVideos.map((video) => (
                        <div key={video.id} className="holographic-card rounded-xl overflow-hidden">
                          <VideoThumbnail
                            youtubeId={video.youtubeId}
                            title={video.title}
                            titleAr={video.titleAr}
                            duration={video.duration}
                            onClick={() => setActiveVideo(video.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}
            </div>

            {/* Sidebar (1 col) */}
            <div className="stack-y-6">
              <ScrollReveal variant="fade-up">
                <div className="glass-premium rounded-2xl p-6 sticky top-28">
                  {/* Book Source */}
                  <h3 id="ijaz-source" className="scroll-mt-28 text-gold-primary font-amiri text-lg font-bold mb-4 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                    {'المصدر'}
                  </h3>
                  <div className="stack-y-3 mb-6">
                    <div>
                      <p className="text-text-primary font-amiri text-base font-bold">
                        {miracle.bookSource.bookTitleAr}
                      </p>
                      {showEnglish && <p className="text-text-muted text-xs font-tajawal" dir="ltr" lang="en">{miracle.bookSource.bookTitle}</p>}
                    </div>
                    <div className="text-sm font-tajawal text-text-secondary stack-y-1">
                      <p>المؤلف: {authorAr(miracle.bookSource.author, miracle.bookSource.authorAr)}</p>
                      {(miracle.bookSource.chapterAr || miracle.bookSource.chapter) && <p>الفصل: {miracle.bookSource.chapterAr || miracle.bookSource.chapter}</p>}
                      {miracle.bookSource.pageRange && <p>الصفحات: {arNum(miracle.bookSource.pageRange)}</p>}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="pt-4 border-t border-white/5">
                    <h4 className="text-text-muted text-xs font-tajawal mb-3">{'الكلمات المفتاحية'}</h4>
                    <div className="flex flex-wrap gap-2">
                      {(showEnglish ? miracle.tags : arabicTags(miracle.tags)).map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-text-secondary text-xs font-tajawal"
                          style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Nav */}
                  <div className="mt-6 pt-4 border-t border-white/5 stack-y-2">
                    <Link
                      to={`/ijaz/categories/${miracle.category}`}
                      className="flex items-center gap-2 text-sm font-tajawal text-text-secondary hover:text-gold-primary transition-colors group"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                      {'المزيد من'} {getCategoryLabel(miracle.category)}
                    </Link>
                    <Link
                      to="/ijaz/miracles"
                      className="flex items-center gap-2 text-sm font-tajawal text-text-secondary hover:text-gold-primary transition-colors group"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                      {'جميع المعجزات'}
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* Previous / next, in the book's order */}
          <nav aria-label="التنقل بين المعجزات" className="mt-16 grid grid-cols-2 gap-3">
            {prev ? (
              <Link to={`/ijaz/miracles/${prev.slug}`} className="glass-premium rounded-2xl p-4 flex items-center gap-2 hover:bg-white/5 transition">
                <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
                <span className="min-w-0">
                  <span className="block text-xs text-text-muted font-tajawal">السابقة</span>
                  <span className="block truncate font-amiri text-base text-gold-primary">{prev.titleAr}</span>
                </span>
              </Link>
            ) : <span />}
            {next ? (
              <Link to={`/ijaz/miracles/${next.slug}`} className="glass-premium rounded-2xl p-4 flex items-center justify-end gap-2 text-left hover:bg-white/5 transition">
                <span className="min-w-0">
                  <span className="block text-xs text-text-muted font-tajawal">التالية</span>
                  <span className="block truncate font-amiri text-base text-gold-primary">{next.titleAr}</span>
                </span>
                <ChevronLeft size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
              </Link>
            ) : <span />}
          </nav>

          {/* Related Miracles */}
          {relatedMiracles.length > 0 && (
            <ScrollReveal variant="fade-up">
              <div className="mt-24">
                <h2 className="text-gold-primary font-amiri text-2xl font-bold mb-8 text-center">
                  {'معجزات ذات صلة'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedMiracles.map((m, i) => (
                    <div key={m.id} className="holographic-card rounded-xl overflow-hidden">
                      <MiracleCard miracle={m} index={i} />
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* Video Overlay */}
      <AnimatePresence>
        {activeVideo && (() => {
          const video = videos.find((v) => v.id === activeVideo);
          if (!video) return null;
          return (
            <VideoOverlay
              youtubeId={video.youtubeId}
              title={video.title}
              titleAr={video.titleAr}
              thumbnailUrl={video.thumbnailUrl}
              onClose={() => setActiveVideo(null)}
            />
          );
        })()}
      </AnimatePresence>
    </main>
  );
}
