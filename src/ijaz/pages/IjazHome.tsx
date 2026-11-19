
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import VerseDisplay from '@/ijaz/components/ui/VerseDisplay';
import { miracles } from '@/ijaz/data/miracles';
import { categories } from '@/ijaz/data/categories';
import { verses } from '@/ijaz/data/verses';
import { ScrollReveal, TextReveal, AnimatedCounter } from '@/ijaz/components/effects/ScrollAnimations';
import { CinematicTypewriter, AnimatedGradientText } from '@/ijaz/components/effects/TextEffects';
import { useIsMobile } from '@/ijaz/hooks/useIsMobile';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { IjazIcon } from '@/ijaz/components/ui/IjazIcon';
import { IjazProgressCard } from '@/ijaz/components/ui/IjazProgressCard';
import { useIjazPrefs } from '@/ijaz/lib/ijazPrefs';
import { MIRACLE, REVELATION_YEAR, yearsAr, discoveryYear, verseRefAr, yearAr } from '@/ijaz/lib/utils';
import { arNum } from '@/lib/formatNumber';
import { countAr, type CountForms } from '@/lib/arabicCount';

const PATHS: CountForms = { one: 'مسار واحد', two: 'مساران', few: 'مسارات', many: 'مسارًا' };

/* ================================================================
   DATA
   ================================================================ */
/** Before/after spotlights. The verse, its reference, the year and the gap come from the miracle itself. */
const SHOWCASE_SOURCE = [
  { miracleSlug: 'universe-expansion', before: 'البشرية كلها ظنت الكون ثابتًا ساكنًا', after: 'إدوين هابل يرصد تباعد المجرات', icon: 'cosmos' },
  { miracleSlug: 'embryology-stages', before: 'لم يكن لدى البشر مجاهر ولا علم أجنة', after: 'علم الأجنة يصف أطوار الجنين بالمجهر', icon: 'microscopic' },
  { miracleSlug: 'mountains-as-pegs', before: 'الجبال تضاريس على سطح الأرض فحسب', after: 'المسوح الزلزالية تكشف جذور الجبال', icon: 'mountain' },
  { miracleSlug: 'deep-sea-darkness', before: 'لم يغص أحد إلى أعماق البحر', after: 'علم البحار يثبت طبقات الظلام في الأعماق', icon: 'sea' },
];

const beforeAfterShowcases = SHOWCASE_SOURCE.flatMap((x) => {
  const m = miracles.find((mm) => mm.slug === x.miracleSlug);
  const verse = m?.verses[0];
  const year = m ? discoveryYear(m) : null;
  if (!m || !verse || !year) return [];
  return [{
    ...x,
    quranText: verse.arabicText,
    surah: verseRefAr(verse.surah, verse.ayahNumber, verse.ayahNumberEnd),
    beforeYear: 'القرن السابع',
    afterYear: `${yearAr(year)}م`,
    gap: yearsAr(year - REVELATION_YEAR),
  }];
});

/** The longest head start in the whole section, counted from the data. */
const LONGEST_GAP = Math.max(...miracles.map((m) => (discoveryYear(m) ?? REVELATION_YEAR) - REVELATION_YEAR));
const TOTAL_PROOFS = miracles.reduce((n, m) => n + m.scientificEvidence.length, 0);
const TOTAL_VERSES = new Set(miracles.flatMap((m) => m.verses.map((v) => `${v.surahNumber}:${v.ayahNumber}`))).size;

const seekerPaths = [
  { icon: 'scientist', titleAr: 'أنا عالِم', descAr: 'اكتشف كيف سبق القرآن كل الاكتشافات', href: '/ijaz/categories/cosmological', color: '#4A90D9' },
  { icon: 'logic', titleAr: 'أنا فيلسوف', descAr: 'براهين منطقية تثبت وجود الخالق', href: '/ijaz/categories/logical-philosophical', color: '#9b59b6' },
  { icon: 'skeptic', titleAr: 'أنا متشكك', descAr: 'تحدّ الشبهات واحدة تلو الأخرى', href: '/ijaz/refute', color: '#e74c3c' },
  { icon: 'seeker', titleAr: 'أنا باحث عن الحق', descAr: 'رحلة مرشدة من الشك إلى اليقين', href: '/ijaz/journey', color: '#2dd4a8' },
];

const objections = [
  {
    objection: '«محمد نقل من حضارات سابقة»',
    refutation: 'الحضارات السابقة كاليونانية والهندية كانت مخطئة علميًا. القرآن لم يأخذ منها بل خالفها وأصاب! غالينوس قال المني يأتي من الدم — القرآن قال من نطفة. أرسطو قال الكون أزلي — القرآن قال له بداية.',
    icon: 'book',
  },
  {
    objection: '«هذه مجرد تفسيرات بأثر رجعي»',
    refutation: 'الألفاظ العربية في الآيات دقيقة علميًا بشكل لا يقبل التأويل. "لموسعون" اسم فاعل يفيد الاستمرار — هذا لا يحتمل معنى آخر. "علقة" تعني حرفيًا شيئًا معلقًا كالعلقة — وهذا بالضبط ما نراه بالمجهر.',
    icon: 'skeptic',
  },
  {
    objection: '«الإصابة في مواضع كثيرة مجرد حظ»',
    refutation: 'قد تصيب عبارةٌ واحدة بالصدفة، أما أن تصيب عشرات العبارات في علوم متباعدة، من الفلك إلى الأجنة إلى البحار، في كتاب نزل قبل أربعة عشر قرنًا، ولا يأتي فيه ما يناقض حقيقة علمية ثابتة، فهذا ما لا تفسره الصدفة.',
    icon: 'spark',
  },
];

/* ================================================================
   SCROLL PROGRESS
   ================================================================ */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-100 origin-left"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #6366f1, #a5b4fc, #e879f9, #2dd4a8)',
      }}
    />
  );
}

/* ================================================================
   FLOATING NAV
   ================================================================ */
function FloatingNav() {
  const [activeSection, setActiveSection] = useState(0);
  const sectionLabels = [
    'البداية',
    'المقارنة',
    'الأرقام',
    'مسارك',
    'آية',
    'الشبهات',
    'الأقسام',
    'المصادر',
  ];

  useEffect(() => {
    const handleScroll = () => {
      const sectionEls = document.querySelectorAll('[data-section]');
      sectionEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          setActiveSection(i);
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3 items-center">
      {sectionLabels.map((label, i) => (
        <button
          key={i}
          onClick={() => {
            const el = document.querySelectorAll('[data-section]')[i];
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group relative flex items-center"
        >
          <span
            className={`absolute left-0 -translate-x-full pr-3 text-xs font-tajawal whitespace-nowrap transition-all duration-300 ${
              i === activeSection
                ? 'opacity-100 text-gold-primary'
                : 'opacity-0 group-hover:opacity-70 text-text-muted'
            }`}
          >
            {label}
          </span>
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === activeSection
                ? 'bg-gold-primary scale-150 shadow-[0_0_10px_rgba(212,168,83,0.5)]'
                : 'bg-text-muted/30 hover:bg-text-muted/60'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

type StaticStarsBackdropVariant = 'hero' | 'gold' | 'emerald' | 'violet';

function StaticStarsBackdrop({
  variant,
  mobile = false,
  className = '',
}: {
  variant: StaticStarsBackdropVariant;
  mobile?: boolean;
  className?: string;
}) {
  const palette = {
    hero: {
      blobA: 'rgba(212,168,83,0.28)',
      blobB: 'rgba(45,212,168,0.20)',
      blobC: 'rgba(74,144,217,0.16)',
      grid: 'rgba(212,168,83,0.06)',
      ring: 'rgba(255,255,255,0.10)',
      node: 'rgba(240,214,138,0.72)',
      line: 'rgba(212,168,83,0.18)',
      spotlight: 'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.08) 0%, rgba(212,168,83,0.05) 24%, transparent 64%)',
      overlay:
        'radial-gradient(circle at 50% 30%, rgba(212,168,83,0.14) 0%, rgba(212,168,83,0.05) 28%, transparent 58%), linear-gradient(180deg, rgba(10,10,15,0.08) 0%, rgba(10,10,15,0.42) 58%, rgba(10,10,15,0.84) 100%)',
      nodes: [
        { x: 16, y: 18, r: 1.3 },
        { x: 26, y: 15, r: 1.1 },
        { x: 34, y: 24, r: 1.15 },
        { x: 67, y: 16, r: 1.2 },
        { x: 77, y: 22, r: 1.4 },
        { x: 72, y: 32, r: 1.05 },
      ],
      lines: [[0, 1], [1, 2], [3, 4], [4, 5], [2, 5]] as Array<[number, number]>,
      sparkles: [
        { x: '12%', y: '28%', size: 4, delay: '0s', duration: '4.2s', color: 'rgba(255,255,255,0.82)' },
        { x: '83%', y: '18%', size: 5, delay: '0.8s', duration: '5.4s', color: 'rgba(240,214,138,0.90)' },
        { x: '72%', y: '62%', size: 3, delay: '1.6s', duration: '4.8s', color: 'rgba(45,212,168,0.78)' },
        { x: '21%', y: '72%', size: 4, delay: '0.4s', duration: '5.1s', color: 'rgba(74,144,217,0.72)' },
        { x: '58%', y: '26%', size: 3, delay: '1.1s', duration: '4.6s', color: 'rgba(255,255,255,0.74)' },
      ],
    },
    gold: {
      blobA: 'rgba(212,168,83,0.20)',
      blobB: 'rgba(240,214,138,0.12)',
      blobC: 'rgba(74,144,217,0.10)',
      grid: 'rgba(212,168,83,0.05)',
      ring: 'rgba(240,214,138,0.08)',
      node: 'rgba(240,214,138,0.68)',
      line: 'rgba(212,168,83,0.14)',
      spotlight: 'radial-gradient(circle at 50% 50%, rgba(212,168,83,0.08) 0%, transparent 62%)',
      overlay:
        'radial-gradient(circle at 50% 40%, rgba(212,168,83,0.08) 0%, transparent 55%), linear-gradient(180deg, rgba(10,10,15,0.02) 0%, rgba(10,10,15,0.22) 100%)',
      nodes: [
        { x: 24, y: 24, r: 1.1 },
        { x: 36, y: 20, r: 1.15 },
        { x: 48, y: 27, r: 1.05 },
        { x: 61, y: 22, r: 1.2 },
        { x: 74, y: 28, r: 1.25 },
      ],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4]] as Array<[number, number]>,
      sparkles: [
        { x: '18%', y: '18%', size: 3, delay: '0s', duration: '5.6s', color: 'rgba(240,214,138,0.85)' },
        { x: '78%', y: '24%', size: 4, delay: '1.1s', duration: '4.9s', color: 'rgba(255,255,255,0.78)' },
        { x: '62%', y: '72%', size: 3, delay: '0.5s', duration: '5.2s', color: 'rgba(212,168,83,0.82)' },
        { x: '28%', y: '70%', size: 4, delay: '1.7s', duration: '4.5s', color: 'rgba(255,255,255,0.74)' },
      ],
    },
    emerald: {
      blobA: 'rgba(45,212,168,0.18)',
      blobB: 'rgba(212,168,83,0.12)',
      blobC: 'rgba(74,144,217,0.12)',
      grid: 'rgba(45,212,168,0.05)',
      ring: 'rgba(45,212,168,0.08)',
      node: 'rgba(45,212,168,0.66)',
      line: 'rgba(45,212,168,0.14)',
      spotlight: 'radial-gradient(circle at 50% 42%, rgba(45,212,168,0.08) 0%, transparent 58%)',
      overlay:
        'radial-gradient(circle at 50% 35%, rgba(45,212,168,0.08) 0%, transparent 54%), linear-gradient(180deg, rgba(10,10,15,0.04) 0%, rgba(10,10,15,0.20) 100%)',
      nodes: [
        { x: 18, y: 30, r: 1.1 },
        { x: 30, y: 24, r: 1.2 },
        { x: 42, y: 34, r: 1.15 },
        { x: 66, y: 26, r: 1.1 },
        { x: 76, y: 36, r: 1.3 },
      ],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4]] as Array<[number, number]>,
      sparkles: [
        { x: '16%', y: '22%', size: 3, delay: '0.3s', duration: '5.3s', color: 'rgba(45,212,168,0.85)' },
        { x: '82%', y: '18%', size: 4, delay: '1.1s', duration: '4.7s', color: 'rgba(255,255,255,0.76)' },
        { x: '64%', y: '62%', size: 3, delay: '1.7s', duration: '5s', color: 'rgba(212,168,83,0.72)' },
        { x: '24%', y: '76%', size: 4, delay: '0.7s', duration: '5.5s', color: 'rgba(74,144,217,0.72)' },
      ],
    },
    violet: {
      blobA: 'rgba(168,85,247,0.20)',
      blobB: 'rgba(212,168,83,0.16)',
      blobC: 'rgba(74,144,217,0.10)',
      grid: 'rgba(168,85,247,0.05)',
      ring: 'rgba(168,85,247,0.09)',
      node: 'rgba(196,181,253,0.70)',
      line: 'rgba(168,85,247,0.15)',
      spotlight: 'radial-gradient(circle at 50% 44%, rgba(168,85,247,0.10) 0%, transparent 60%)',
      overlay:
        'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.10) 0%, transparent 56%), linear-gradient(180deg, rgba(10,10,15,0.03) 0%, rgba(10,10,15,0.28) 100%)',
      nodes: [
        { x: 20, y: 20, r: 1.1 },
        { x: 28, y: 30, r: 1.2 },
        { x: 40, y: 22, r: 1.05 },
        { x: 70, y: 18, r: 1.1 },
        { x: 82, y: 28, r: 1.25 },
        { x: 74, y: 40, r: 1.1 },
      ],
      lines: [[0, 1], [1, 2], [3, 4], [4, 5]] as Array<[number, number]>,
      sparkles: [
        { x: '14%', y: '26%', size: 3, delay: '0.1s', duration: '5.1s', color: 'rgba(196,181,253,0.86)' },
        { x: '82%', y: '16%', size: 4, delay: '1.2s', duration: '4.8s', color: 'rgba(255,255,255,0.78)' },
        { x: '68%', y: '60%', size: 3, delay: '1.8s', duration: '5.4s', color: 'rgba(168,85,247,0.82)' },
        { x: '26%', y: '72%', size: 4, delay: '0.6s', duration: '4.9s', color: 'rgba(212,168,83,0.75)' },
      ],
    },
  }[variant];

  const visibleNodeCount = mobile ? Math.min(4, palette.nodes.length) : palette.nodes.length;
  const visibleNodes = palette.nodes.slice(0, visibleNodeCount);
  const visibleLines = palette.lines.filter(([from, to]) => from < visibleNodeCount && to < visibleNodeCount);
  const visibleSparkles = mobile ? palette.sparkles.slice(0, 3) : palette.sparkles;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <div className="absolute inset-0 dhikr-page-stars" style={{ opacity: mobile ? 0.18 : 0.28 }} />
      <div className="absolute inset-0 dhikr-card-stars" style={{ opacity: mobile ? 0.12 : 0.18 }} />
      <div className="absolute inset-0" style={{ background: palette.spotlight }} />
      <div
        className="absolute inset-0"
        style={{
          opacity: mobile ? 0.08 : 0.14,
          backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
          backgroundSize: mobile ? '56px 56px' : '76px 76px',
          maskImage: 'radial-gradient(circle at center, black 0%, rgba(0,0,0,0.75) 46%, transparent 84%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, rgba(0,0,0,0.75) 46%, transparent 84%)',
        }}
      />
      <div
        className="absolute left-1/2 top-[18%] rounded-full border"
        style={{
          width: mobile ? 220 : 420,
          height: mobile ? 220 : 420,
          transform: 'translateX(-50%)',
          borderColor: palette.ring,
          boxShadow: `0 0 32px ${palette.line}`,
          opacity: mobile ? 0.36 : 0.52,
        }}
      />
      <div
        className="absolute left-1/2 top-[24%] rounded-full border"
        style={{
          width: mobile ? 140 : 280,
          height: mobile ? 140 : 280,
          transform: 'translateX(-50%)',
          borderColor: palette.line,
          opacity: mobile ? 0.24 : 0.34,
        }}
      />
      <div
        className="absolute left-[10%] right-[10%] top-[16%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${palette.line}, transparent)`,
          opacity: mobile ? 0.5 : 0.8,
        }}
      />
      <svg
        className="absolute inset-0"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ opacity: mobile ? 0.34 : 0.55, mixBlendMode: 'screen' }}
      >
        {visibleLines.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={visibleNodes[from]?.x}
            y1={visibleNodes[from]?.y}
            x2={visibleNodes[to]?.x}
            y2={visibleNodes[to]?.y}
            stroke={palette.line}
            strokeWidth="0.18"
          />
        ))}
        {visibleNodes.map((node, index) => (
          <g key={`${variant}-node-${index}`}>
            <circle cx={node.x} cy={node.y} r={node.r * 1.9} fill={palette.line} opacity="0.22" />
            <circle cx={node.x} cy={node.y} r={node.r} fill={palette.node} />
          </g>
        ))}
      </svg>
      {visibleSparkles.map((sparkle, index) => (
        <div
          key={`${variant}-sparkle-${index}`}
          className="absolute rounded-full"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
            background: sparkle.color,
            boxShadow: `0 0 ${sparkle.size * 5}px ${sparkle.color}`,
            opacity: 0.75,
            animation: `glowPulse ${sparkle.duration} ease-in-out ${sparkle.delay} infinite`,
          }}
        />
      ))}
      <div
        className="athar-bg-blob"
        style={{
          width: mobile ? 260 : 420,
          height: mobile ? 260 : 420,
          left: '-10%',
          top: '-8%',
          background: palette.blobA,
          animation: mobile ? undefined : 'atharFloatA 18s ease-in-out infinite',
        }}
      />
      <div
        className="athar-bg-blob"
        style={{
          width: mobile ? 300 : 500,
          height: mobile ? 300 : 500,
          right: '-16%',
          top: variant === 'violet' ? '4%' : '12%',
          background: palette.blobB,
          animation: mobile ? undefined : 'atharFloatB 22s ease-in-out infinite',
        }}
      />
      {!mobile && (
        <div
          className="athar-bg-blob"
          style={{
            width: 560,
            height: 560,
            left: '18%',
            bottom: '-32%',
            background: palette.blobC,
            animation: 'atharFloatA 26s ease-in-out infinite',
          }}
        />
      )}
      <div className="absolute inset-0" style={{ background: palette.overlay }} />
    </div>
  );
}

/* ================================================================
   MOBILE GALAXY BACKDROP — nebula gradients + deferred NoorStarfield
   ================================================================ */
function MobileGalaxyBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Deep galaxy nebula — purple/indigo core */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 90% 52% at 50% 14%, rgba(55,28,105,0.58) 0%, rgba(18,12,44,0.36) 44%, transparent 74%)',
            'radial-gradient(ellipse 52% 62% at 10% 64%, rgba(18,42,92,0.26) 0%, transparent 64%)',
            'radial-gradient(ellipse 48% 46% at 90% 36%, rgba(28,14,68,0.22) 0%, transparent 60%)',
            'radial-gradient(ellipse 38% 48% at 62% 82%, rgba(8,30,62,0.18) 0%, transparent 66%)',
          ].join(', '),
        }}
      />
      {/* Galactic center gold glow */}
      <div
        className="absolute"
        style={{
          top: '-8%',
          left: '-18%',
          right: '-18%',
          height: '58%',
          background: 'radial-gradient(ellipse 68% 58% at 50% 30%, rgba(212,168,83,0.10) 0%, transparent 72%)',
        }}
      />
      {/* Bottom-fade for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(8,11,18,0.06) 0%, rgba(8,11,18,0.40) 55%, rgba(8,11,18,0.92) 100%)',
        }}
      />
    </div>
  );
}

/* ================================================================
   HOME PAGE
   ================================================================ */
export default function HomePage() {
  const [activeShowcase, setActiveShowcase] = useState(0);
  const isMobile = useIsMobile();
  const showEnglish = useIjazPrefs((s) => s.showEnglish);
  const activeHeroShowcase = beforeAfterShowcases[activeShowcase];

  const heroBadges = [
    { label: `${countAr(miracles.length, MIRACLE)} موثقة`, color: '#f0d68a', tone: 'rgba(212,168,83,0.12)', border: 'rgba(212,168,83,0.20)' },
    { label: `${countAr(seekerPaths.length, PATHS)} للدخول`, color: '#8ef2d7', tone: 'rgba(45,212,168,0.10)', border: 'rgba(45,212,168,0.18)' },
    { label: `سبق حتى ${activeHeroShowcase.gap}`, color: '#9cc8ff', tone: 'rgba(74,144,217,0.10)', border: 'rgba(74,144,217,0.18)' },
  ] as const;

  const heroStats = [
    { value: arNum(miracles.length), label: 'معجزة موثقة', color: '#f0d68a', tone: 'rgba(212,168,83,0.12)', border: 'rgba(212,168,83,0.20)' },
    { value: arNum(categories.length), label: 'أقسام كبرى', color: '#8ef2d7', tone: 'rgba(45,212,168,0.10)', border: 'rgba(45,212,168,0.18)' },
    { value: activeHeroShowcase.gap, label: 'سبق قرآني', color: '#9cc8ff', tone: 'rgba(74,144,217,0.10)', border: 'rgba(74,144,217,0.18)' },
  ] as const;

  const featuredVerse = verses[0];

  useEffect(() => {
    const timer = setInterval(
      () => setActiveShowcase((p) => (p + 1) % beforeAfterShowcases.length),
      5000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="relative min-h-screen">
      {!isMobile && <ScrollProgress />}
      {!isMobile && <FloatingNav />}

      {/* ═══════════ SECTION 1: CINEMATIC HERO ═══════════ */}
      <section data-section className="relative min-h-svh flex items-center justify-center overflow-hidden">
        {isMobile
          ? <MobileGalaxyBackdrop />
          : <StaticStarsBackdrop variant="hero" mobile={false} className="z-0" />}

        {/* Gradient overlays */}
        <div className="absolute inset-0 z-2 bg-linear-to-b from-vanta/40 via-transparent to-vanta pointer-events-none" />
        <div className="absolute inset-0 z-2 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(10,10,15,0.2)_100%)] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 text-center py-16 md:py-20 lg:py-24 2xl:py-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Bismillah */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mb-4 md:mb-6 lg:mb-8"
            >
              <span className="font-amiri text-gold-primary/40 text-2xl">{'﷽'}</span>
            </motion.div>

            {/* Signal badges */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.8 }}
              className="mb-4 md:mb-6 flex flex-wrap items-center justify-center gap-2.5"
            >
              {heroBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] sm:text-xs font-tajawal font-semibold backdrop-blur-md"
                  style={{
                    color: badge.color,
                    background: badge.tone,
                    border: `1px solid ${badge.border}`,
                    boxShadow: `0 0 24px ${badge.tone}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: badge.color, boxShadow: `0 0 10px ${badge.color}` }}
                  />
                  {badge.label}
                </span>
              ))}
            </motion.div>

            {/* Hook question */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mb-6 md:mb-8"
            >
              <div
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xs"
                style={{ background: 'rgba(212,168,83,0.07)', border: '1px solid rgba(212,168,83,0.18)' }}
              >
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0.4, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-gold-primary shrink-0"
                />
                <span className="font-tajawal text-gold-primary/85 text-sm md:text-lg tracking-wide">
                  {'هل تجرؤ على أن تسأل نفسك...'}
                </span>
              </div>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              className="font-amiri text-3xl sm:text-4xl md:text-5xl lg:text-7xl 2xl:text-8xl font-bold mb-4 md:mb-6 leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 1 }}
            >
              <span className="text-text-primary">
                {'كيف عرف رجل'}
              </span>
              <AnimatedGradientText className="font-amiri text-3xl sm:text-4xl md:text-5xl lg:text-7xl 2xl:text-8xl font-bold">
                {' أُمّيّ '}
              </AnimatedGradientText>
              <span className="text-text-primary">
                {'في الصحراء'}
              </span>
              <br />
              <span className="text-verse-green verse-glow-pulse">
                {'أسرار الكون '}
              </span>
              <span className="text-text-primary">
                {'قبل أن يعرفها '}
              </span>
              <span className="text-gold-primary">
                {'أيّ عالِم؟'}
              </span>
            </motion.h1>

            {/* Sub text */}
            <motion.div
              className="max-w-3xl mx-auto mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <p className="text-text-secondary font-tajawal text-lg md:text-xl leading-relaxed">
                {'ما ستراه هنا ليس كلامًا — إنه أدلة علمية موثقة من '}
                <span className="text-gold-primary font-bold">{countAr(miracles.length, MIRACLE)}</span>
                {' تجعلك تتساءل: من الذي أخبر محمدًا ﷺ؟'}
              </p>
            </motion.div>

            {/* Hero spotlight panel */}
            <motion.div
              className="mt-6 md:mt-8 max-w-6xl mx-auto"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="relative overflow-hidden rounded-[30px] p-3 md:p-4 glass-premium"
                style={{
                  border: '1px solid rgba(212,168,83,0.14)',
                  background: 'linear-gradient(160deg, rgba(9,11,18,0.92) 0%, rgba(14,18,28,0.88) 55%, rgba(9,11,18,0.94) 100%)',
                  boxShadow: '0 28px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,rgba(212,168,83,0.12),transparent_44%)]" />
                <div className="absolute inset-0 dhikr-card-stars opacity-30" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeHeroShowcase.miracleSlug}
                    initial={{ opacity: 0, y: isMobile ? 8 : 16, ...(isMobile ? {} : { filter: 'blur(8px)' }) }}
                    animate={{ opacity: 1, y: 0, ...(isMobile ? {} : { filter: 'blur(0px)' }) }}
                    exit={{ opacity: 0, y: isMobile ? -6 : -12, ...(isMobile ? {} : { filter: 'blur(8px)' }) }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="relative grid gap-3 lg:grid-cols-[1.2fr_0.95fr]"
                  >
                    <div
                      className="rounded-[24px] px-4 py-5 md:px-6 md:py-6 text-right overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, rgba(17,23,36,0.90) 0%, rgba(12,17,26,0.86) 100%)',
                        border: '1px solid rgba(212,168,83,0.10)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top_right,rgba(45,212,168,0.10),transparent_38%)]" />
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <span
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-tajawal font-semibold"
                          style={{
                            color: '#f0d68a',
                            background: 'rgba(212,168,83,0.10)',
                            border: '1px solid rgba(212,168,83,0.18)',
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-primary shadow-[0_0_10px_rgba(212,168,83,0.65)]" />
                          نافذة من الإعجاز
                        </span>
                        <IjazIcon name={activeHeroShowcase.icon} size={34} className="text-gold-primary" />
                      </div>

                      <div className="relative z-10 mt-5">
                        <p className="font-amiri text-[1.55rem] md:text-4xl leading-[1.95] text-verse-green verse-glow-pulse">
                          {activeHeroShowcase.quranText}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-[11px] md:text-xs font-tajawal">
                          <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,214,138,0.78)' }}
                          >
                            {activeHeroShowcase.surah}
                          </span>
                          <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: 'rgba(74,144,217,0.10)', border: '1px solid rgba(74,144,217,0.16)', color: '#9cc8ff' }}
                          >
                            سبق حتى {activeHeroShowcase.gap}
                          </span>
                        </div>
                        <p className="mt-4 text-sm md:text-base text-text-secondary font-tajawal leading-relaxed max-w-2xl mr-auto">
                          {activeHeroShowcase.after}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid grid-cols-3 gap-3">
                        {heroStats.map((stat) => (
                          <div
                            key={stat.label}
                            className="rounded-[22px] px-3 py-4 text-center"
                            style={{
                              background: stat.tone,
                              border: `1px solid ${stat.border}`,
                              boxShadow: `0 0 24px ${stat.tone}`,
                            }}
                          >
                            <div className="font-amiri text-lg md:text-2xl font-bold leading-none" style={{ color: stat.color }}>
                              {stat.value}
                            </div>
                            <div className="mt-2 text-[10px] md:text-[11px] font-tajawal text-text-secondary leading-snug">
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className="rounded-[24px] px-4 py-4 md:px-5 text-right"
                        style={{
                          background: 'linear-gradient(180deg, rgba(14,18,28,0.92) 0%, rgba(9,12,18,0.92) 100%)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="text-[11px] font-tajawal tracking-wide text-red-300/70">قبل أن يصل إليه العلم</div>
                        <p className="mt-2 text-sm md:text-[15px] text-text-secondary font-tajawal leading-relaxed">
                          {activeHeroShowcase.before}
                        </p>
                        <div className="mt-4 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-tajawal text-text-muted">يتبدل المشهد تلقائياً</span>
                          <div className="flex items-center gap-2">
                            {beforeAfterShowcases.map((item, index) => (
                              <button
                                key={item.miracleSlug}
                                type="button"
                                onClick={() => setActiveShowcase(index)}
                                className="p-2 -m-2 flex items-center justify-center"
                                aria-label={`عرض المشهد ${index + 1}`}
                              >
                                <span
                                  className={`h-2 rounded-full transition-all duration-300 block ${
                                    index === activeShowcase ? 'w-7 bg-gold-primary shadow-[0_0_10px_rgba(212,168,83,0.45)]' : 'w-2 bg-white/20'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-4 mt-5 md:mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
            >
              <Link
                to="/ijaz/journey"
                className="group relative overflow-hidden px-10 py-4 rounded-2xl font-tajawal font-bold text-lg text-white holographic-card breathing-glow"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #e879f9)' }}
              >
                <span className="ijaz-cta-shine" aria-hidden />
                <span className="relative z-10">
                  {'ابدأ رحلة اليقين'}
                </span>
              </Link>
              <Link
                to="/ijaz/miracles"
                className="px-8 py-4 rounded-2xl border border-gold-primary/30 text-gold-primary font-tajawal font-bold hover:bg-gold-primary/10 transition-all cosmic-border"
              >
                {'استكشف الأدلة'}
              </Link>
            </motion.div>

            {/* Typewriter miracle preview — desktop only (avoids mobile re-render cost) */}
            {!isMobile && (
            <motion.div
              className="mt-5 md:mt-7 lg:mt-8 rounded-2xl px-5 py-4 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2 }}
              style={{
                background: 'linear-gradient(180deg, rgba(10,10,15,0.78) 0%, rgba(14,17,24,0.72) 100%)',
                border: '1px solid rgba(212,168,83,0.10)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.24)',
              }}
            >
              <p className="text-text-muted text-xs font-tajawal mb-2">
                {'معجزات تنتظرك:'}
              </p>
              <CinematicTypewriter
                sequences={[
                  `توسع الكون، ذُكر قبل هابل بـ${yearsAr(1929 - REVELATION_YEAR)}`,
                  2000,
                  'مراحل الجنين — دقة مذهلة بدون مجهر',
                  2000,
                  'الجبال أوتاد — جذور عميقة تثبت الأرض',
                  2000,
                  'البرهان الكوني — الكون له بداية فله مبدئ',
                  2000,
                ]}
                className="text-gold-primary font-tajawal text-base"
                speed={40}
                cursor
              />
            </motion.div>
            )}
          </motion.div>
        </div>

        {/* Scroll indicator — positioned relative to section, always at bottom */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-tajawal text-text-muted/50">
              {'اسحب لأسفل'}
            </span>
            <div className="w-5 h-8 rounded-full border border-gold-primary/30 flex justify-center pt-2">
              <motion.div
                className="w-1 h-2 rounded-full bg-gold-primary/60"
                animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ SECTION 2: BEFORE / AFTER TIMELINE ═══════════ */}
      <section data-section className="relative py-16 md:py-28 overflow-hidden">
        <StaticStarsBackdrop variant="gold" mobile={isMobile} className="z-0" />

        <div className="container mx-auto px-6 relative z-10">
          <ScrollReveal variant="blur">
            <div className="text-center mb-16">
              <p className="text-gold-primary/60 font-tajawal text-sm tracking-widest uppercase mb-3">
                {'التحدي المستحيل'}
              </p>
              <TextReveal
                text={'ماذا عرف البشر وماذا قال القرآن؟'}
                className="font-amiri text-3xl md:text-5xl font-bold gold-gradient-text"
                tag="h2"
              />
              <p className="text-text-secondary font-tajawal max-w-2xl mx-auto mt-4">
                {'في القرن السابع لم تكن توجد مجاهر ولا تلسكوبات ولا غواصات — فمن أين جاءت هذه المعلومات؟'}
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              {beforeAfterShowcases.map(
                (item, idx) =>
                  idx === activeShowcase && (
                    <motion.div
                      key={item.miracleSlug}
                      initial={{ opacity: 0, y: isMobile ? 16 : 30, ...(isMobile ? {} : { filter: 'blur(10px)' }) }}
                      animate={{ opacity: 1, y: 0, ...(isMobile ? {} : { filter: 'blur(0px)' }) }}
                      exit={{ opacity: 0, y: isMobile ? -10 : -30, ...(isMobile ? {} : { filter: 'blur(10px)' }) }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link to={'/ijaz/miracles/' + item.miracleSlug}>
                        <div
                          className="relative cursor-pointer group rounded-3xl overflow-hidden"
                          style={{
                            background: 'linear-gradient(160deg, rgba(12,14,22,0.99) 0%, rgba(16,20,32,0.99) 100%)',
                            border: '1px solid rgba(212,168,83,0.12)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 80px rgba(0,0,0,0.7)',
                          }}
                        >
                          {/* HUD corner brackets */}
                          <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-gold-primary/20 pointer-events-none z-20" />
                          <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-gold-primary/20 pointer-events-none z-20" />
                          <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-gold-primary/20 pointer-events-none z-20" />
                          <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-gold-primary/20 pointer-events-none z-20" />

                          {/* Hover shimmer */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,168,83,0.06)_0%,transparent_60%)]" />

                          {/* ── VERSE HERO ── */}
                          <div className="relative px-8 pt-10 pb-6 text-center">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(45,212,168,0.07)_0%,transparent_70%)]" />
                            <motion.p
                              key={item.miracleSlug + '-v'}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                              className="font-amiri text-verse-green text-2xl md:text-4xl leading-loose verse-glow-pulse relative z-10"
                            >
                              {item.quranText}
                            </motion.p>
                            <p className="text-gold-primary/50 text-sm font-tajawal mt-2 relative z-10 tracking-widest">{item.surah}</p>
                            <div className="flex items-center justify-center gap-3 mt-5 relative z-10">
                              <div className="h-px flex-1 max-w-[140px] bg-linear-to-r from-transparent to-gold-primary/15" />
                              <div className="w-1.5 h-1.5 rotate-45 bg-gold-primary/25" />
                              <div className="h-px flex-1 max-w-[140px] bg-linear-to-l from-transparent to-gold-primary/15" />
                            </div>
                          </div>

                          {/* ── SPLIT COMPARISON ── */}
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch">

                            {/* PAST panel */}
                            <div className="relative px-6 md:px-10 py-8">
                              <div className="absolute inset-0 bg-linear-to-br from-red-950/60 via-red-900/15 to-transparent" />
                              <div className="absolute top-6 bottom-6 right-0 w-px bg-linear-to-b from-transparent via-red-500/15 to-transparent" />
                              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-px w-8 bg-red-400/25" />
                                  <span className="text-red-400/55 text-[10px] font-tajawal tracking-[0.2em]">{item.beforeYear}</span>
                                  <div className="h-px w-8 bg-red-400/25" />
                                </div>
                                <motion.div
                                  animate={!isMobile ? { boxShadow: ['0 0 15px rgba(220,38,38,0.06)', '0 0 50px rgba(220,38,38,0.3)', '0 0 15px rgba(220,38,38,0.06)'] } : undefined}
                                  transition={!isMobile ? { duration: 3, repeat: Infinity } : undefined}
                                  className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-6xl"
                                  style={{ background: 'radial-gradient(circle, rgba(127,29,29,0.45) 0%, rgba(69,10,10,0.15) 100%)', border: '1px solid rgba(220,38,38,0.18)' }}
                                >
                                  <HelpCircle size={30} aria-hidden="true" />
                                </motion.div>
                                <p className="text-red-300/40 text-[10px] font-tajawal uppercase tracking-[0.15em]">{'ما عرفه البشر'}</p>
                                <p className="text-text-secondary/80 font-tajawal text-sm md:text-base leading-relaxed max-w-[170px]">{item.before}</p>
                              </div>
                            </div>

                            {/* CENTER divider */}
                            <div className="flex flex-col items-center justify-center gap-4 px-5 md:px-10 py-6 relative">
                              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-linear-to-b from-transparent via-gold-primary/20 to-transparent" />
                              <motion.div
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 12, -12, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                className="text-4xl md:text-5xl relative z-10"
                                style={{ filter: 'drop-shadow(0 0 12px rgba(212,168,83,0.5))' }}
                              >
                                <IjazIcon name={item.icon} size={30} />
                              </motion.div>
                              <div
                                className="relative z-10 rounded-2xl px-4 md:px-6 py-3 text-center"
                                style={{
                                  background: 'rgba(16,20,30,0.97)',
                                  border: '1px solid rgba(212,168,83,0.22)',
                                  boxShadow: '0 0 25px rgba(212,168,83,0.08), inset 0 1px 0 rgba(212,168,83,0.05)',
                                }}
                              >
                                <motion.p
                                  key={item.miracleSlug + '-g'}
                                  initial={{ scale: 0.85, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="text-gold-primary font-bold font-amiri text-2xl md:text-3xl leading-none"
                                >
                                  {item.gap}
                                </motion.p>
                                <p className="text-text-muted text-[9px] font-tajawal tracking-widest mt-1.5">{'الفارق الزمني'}</p>
                              </div>
                              <div className="w-2 h-2 rotate-45 border border-gold-primary/20 relative z-10" />
                            </div>

                            {/* DISCOVERY panel */}
                            <div className="relative px-6 md:px-10 py-8">
                              <div className="absolute inset-0 bg-linear-to-bl from-emerald-950/60 via-emerald-900/15 to-transparent" />
                              <div className="absolute top-6 bottom-6 left-0 w-px bg-linear-to-b from-transparent via-emerald-500/15 to-transparent" />
                              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-px w-8 bg-verse-green/20" />
                                  <span className="text-verse-green/60 text-[10px] font-tajawal tracking-[0.2em]">{item.afterYear}</span>
                                  <div className="h-px w-8 bg-verse-green/20" />
                                </div>
                                <motion.div
                                  animate={!isMobile ? { boxShadow: ['0 0 15px rgba(45,212,168,0.08)', '0 0 60px rgba(45,212,168,0.4)', '0 0 15px rgba(45,212,168,0.08)'] } : undefined}
                                  transition={!isMobile ? { duration: 3, repeat: Infinity, delay: 1.5 } : undefined}
                                  className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-6xl"
                                  style={{ background: 'radial-gradient(circle, rgba(6,78,59,0.55) 0%, rgba(2,44,34,0.18) 100%)', border: '1px solid rgba(45,212,168,0.22)' }}
                                >
                                  <CheckCircle2 size={30} aria-hidden="true" />
                                </motion.div>
                                <p className="text-verse-green/50 text-[10px] font-tajawal uppercase tracking-[0.15em]">{'ما أثبته العلم'}</p>
                                <p className="text-text-secondary/80 font-tajawal text-sm md:text-base leading-relaxed max-w-[170px]">{item.after}</p>
                              </div>
                            </div>
                          </div>

                          {/* Bottom bar */}
                          <div className="relative px-8 py-5 text-center">
                            <div className="absolute top-0 left-8 right-8 h-px bg-linear-to-r from-transparent via-gold-primary/10 to-transparent" />
                            <p className="text-text-muted/55 text-xs font-tajawal group-hover:text-gold-primary transition-colors duration-300 tracking-wide">
                              {'اضغط لاستكشاف الدليل الكامل ←'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ),
              )}
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-1 mt-8">
              {beforeAfterShowcases.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveShowcase(i)}
                  className="p-2 -m-2 flex items-center justify-center"
                  aria-label={`عرض المعجزة ${i + 1}`}
                >
                  <span
                    className={`h-2 rounded-full transition-all duration-500 block ${
                      i === activeShowcase
                        ? 'bg-gold-primary w-8 shadow-[0_0_10px_rgba(212,168,83,0.4)]'
                        : 'bg-text-muted/20 w-2'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 3: CONVICTION COUNTER ═══════════ */}
      <section data-section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,168,83,0.04)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gold-primary/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gold-primary/20 to-transparent" />

        <div className="container mx-auto px-6 relative z-10">
          <ScrollReveal variant="scale">
            <div className="text-center mb-16">
              <h2 className="font-amiri text-3xl md:text-5xl font-bold mb-4">
                <AnimatedGradientText className="font-amiri text-3xl md:text-5xl font-bold">
                  {'بالأرقام'}
                </AnimatedGradientText>
              </h2>
              <p className="text-text-secondary font-tajawal max-w-2xl mx-auto text-lg">
                {'ما في هذا القسم، محسوبًا من مادته نفسها'}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { target: miracles.length, suffix: '', label: 'معجزة في خمسة أقسام', color: '#a5b4fc' },
              { target: TOTAL_VERSES, suffix: '', label: 'آية مستشهد بها', color: '#2dd4a8' },
              { target: TOTAL_PROOFS, suffix: '', label: 'دليلًا علميًّا موثّقًا', color: '#d4a853' },
              { target: LONGEST_GAP, suffix: '', label: 'سنة، أطول سبق', color: '#4A90D9' },
            ].map((item, i) => (
              <ScrollReveal key={i} variant="fade-up" delay={i * 0.15}>
                <div className="text-center glass-premium rounded-2xl p-6">
                  <AnimatedCounter
                    target={item.target}
                    suffix={item.suffix}
                    className="text-4xl md:text-5xl font-bold font-amiri"
                    duration={2.5}
                  />
                  <p className="text-text-secondary text-sm font-tajawal mt-3">{item.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal variant="fade-up" delay={0.6}>
            <IjazProgressCard />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ SECTION 4: WHO ARE YOU? ═══════════ */}
      <section data-section className="relative py-16 md:py-28">
        <div className="container mx-auto px-6">
          <ScrollReveal variant="blur">
            <div className="text-center mb-16">
              <h2 className="font-amiri text-3xl md:text-5xl font-bold mb-4">
                <span className="text-text-primary">{'من '}</span>
                <AnimatedGradientText className="font-amiri text-3xl md:text-5xl font-bold">
                  {'أنت؟'}
                </AnimatedGradientText>
              </h2>
              <p className="text-text-secondary font-tajawal text-lg">
                {'اختر طريقك — كل مسار مصمم لك'}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {seekerPaths.map((path, i) => (
              <ScrollReveal key={path.href} variant="fade-up" delay={i * 0.1}>
                <Link to={path.href}>
                  <div
                    className="glass-premium rounded-2xl p-6 text-center h-full hover:scale-[1.05] transition-all duration-500 group holographic-card"
                    style={{ borderColor: path.color + '15' }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                      style={{ background: path.color + '12' }}
                    >
                      <IjazIcon name={path.icon} size={28} style={{ color: path.color }} />
                    </div>
                    <h3 className="font-amiri text-lg font-bold mb-1" style={{ color: path.color }}>
                      {path.titleAr}
                    </h3>
                    <p className="text-text-secondary text-sm font-tajawal">{path.descAr}</p>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 5: FEATURED VERSE ═══════════ */}
      <section data-section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-cosmic-purple/10 to-transparent" />
        <StaticStarsBackdrop variant="emerald" mobile={isMobile} className="z-0" />
        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <ScrollReveal variant="scale">
            <VerseDisplay verse={featuredVerse} size="lg" />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ SECTION 6: DOUBT RESOLVER ═══════════ */}
      <section data-section className="relative py-16 md:py-28">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-red-950/5 to-transparent" />
        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <ScrollReveal variant="blur">
            <div className="text-center mb-16">
              <p className="text-red-400/60 text-xs font-tajawal tracking-widest uppercase mb-3">
                {'أشهر الشبهات'}
              </p>
              <h2 className="font-amiri text-3xl md:text-5xl font-bold mb-4">
                <span className="text-text-primary">
                  {'ربما تقول: '}
                </span>
                <span className="text-red-400/80">
                  {'«هذه مجرد صدف»'}
                </span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="stack-y-6">
            {objections.map((item, i) => (
              <ScrollReveal key={i} variant="fade-left" delay={i * 0.15}>
                <div className="glass-premium rounded-2xl overflow-hidden holographic-card">
                  <div className="px-6 py-4 bg-red-500/5 border-b border-red-500/10 flex items-center gap-3">
                    <IjazIcon name={item.icon} size={20} className="text-gold-primary" />
                    <p className="font-amiri text-red-400/80 text-lg font-bold">{item.objection}</p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-verse-green/15 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2dd4a8" strokeWidth="3">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </div>
                      <p className="text-text-secondary font-tajawal text-sm leading-relaxed">{item.refutation}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}

            <ScrollReveal variant="fade-up" delay={0.5}>
              <div className="text-center mt-10">
                <Link
                  to="/ijaz/refute"
                  className="px-8 py-3 rounded-2xl border border-[rgba(99,102,241,0.40)] text-indigo-300 font-tajawal text-sm font-bold hover:bg-indigo-500/10 transition-all cosmic-border"
                >
                  {'استكشف جميع الردود ←'}
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 7: CATEGORIES ═══════════ */}
      <section data-section className="relative py-24">
        <div className="container mx-auto px-6">
          <ScrollReveal variant="blur">
            <div className="text-center mb-16">
              <h2 className="font-amiri text-3xl md:text-5xl font-bold mb-4 gold-gradient-text">
                {'أقسام الإعجاز'}
              </h2>
              <p className="text-text-secondary font-tajawal text-lg max-w-2xl mx-auto">
                {'خمسة مجالات من الأدلة الساحقة التي لا يمكن تفسيرها بغير الوحي'}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {categories.map((cat, i) => (
              <ScrollReveal key={cat.id} variant="fade-up" delay={i * 0.08}>
                <Link to={`/ijaz/categories/${cat.id}`} className="block group">
                  <div
                    className="glass-premium rounded-2xl p-6 text-center hover:scale-[1.05] transition-all duration-500 holographic-card h-full"
                    style={{ borderColor: cat.color + '20' }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                      style={{ background: cat.color + '15' }}
                    >
                      <IjazIcon name={cat.id} size={28} style={{ color: cat.color }} />
                    </div>
                    <h3 className="text-text-primary font-amiri text-lg font-bold mb-1">{cat.nameAr}</h3>
                    {showEnglish && <p className="text-text-muted text-xs font-tajawal" dir="ltr" lang="en">{cat.name}</p>}
                    <p className="text-text-muted text-xs font-tajawal mt-2 line-clamp-2">{cat.descriptionAr}</p>
                    <span
                      className="inline-block mt-3 text-xs font-tajawal font-semibold px-3 py-1 rounded-full"
                      style={{ background: cat.color + '15', color: cat.color }}
                    >
                      {countAr(miracles.filter((m) => m.category === cat.id).length, MIRACLE)}
                    </span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 8: BOOKS SOURCE ═══════════ */}
      <section data-section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-6 max-w-5xl">
          <ScrollReveal variant="blur">
            <div className="text-center mb-16">
              <h2 className="font-amiri text-3xl md:text-5xl font-bold mb-4 gold-gradient-text">
                {'المصادر'}
              </h2>
              <p className="text-text-secondary font-tajawal text-lg">
                {'مادة هذا القسم مستخرجة من مؤلفات د. هيثم طلعت'}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                titleAr: 'بصائر',
                title: 'Basaer',
                descAr:
                  'براهين عقلية على وجود الخالق ودحض الإلحاد',
                icon: 'logic',
                color: '#a5b4fc',
              },
              {
                titleAr: 'الإعجاز العلمي',
                title: 'Scientific Miracles',
                descAr:
                  'توثيق شامل للإعجاز العلمي في القرآن والسنة',
                icon: 'cosmos',
                color: '#4A90D9',
              },
              {
                titleAr:
                  'علم الكتاب',
                title: 'Science of the Book',
                descAr:
                  'دراسة معمقة في علوم القرآن وإثبات صدق الوحي',
                icon: 'book',
                color: '#2dd4a8',
              },
              {
                titleAr:
                  'رسول الأميين',
                title: 'Prophet of the Unlettered',
                descAr:
                  'إثبات نبوة محمد ﷺ بالأدلة العقلية والتاريخية',
                icon: 'seeker',
                color: '#9b59b6',
              },
            ].map((book, i) => (
              <ScrollReveal key={book.title} variant="fade-up" delay={i * 0.1}>
                <div className="glass-premium rounded-2xl p-6 flex items-start gap-4 holographic-card h-full">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: book.color + '15' }}
                  >
                    <IjazIcon name={book.icon} size={24} style={{ color: book.color }} />
                  </div>
                  <div>
                    <h3 className="text-text-primary font-amiri text-xl font-bold">{book.titleAr}</h3>
                    {showEnglish && <p className="text-text-muted text-xs font-tajawal" dir="ltr" lang="en">{book.title}</p>}
                    <p className="text-text-secondary text-sm font-tajawal mt-2">{book.descAr}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal variant="fade-up" delay={0.4}>
            <div className="text-center mt-10">
              <p className="text-text-muted text-sm font-tajawal">
                {'د. هيثم طلعت — باحث في مجال مقارنة الأديان وإثبات وجود الله'}
              </p>
              <a
                href="https://www.youtube.com/@Dr.HaithamTalaat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-gold-primary text-sm font-tajawal hover:text-gold-light transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                  <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#0a0a0f" />
                </svg>
                {'قناة د. هيثم طلعت على يوتيوب'}
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="relative py-20 md:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-cosmic-purple/15 to-vanta" />
        <StaticStarsBackdrop variant="violet" mobile={isMobile} className="z-0" />

        <div className="container mx-auto px-6 text-center relative z-10">
          <ScrollReveal variant="scale">
            <p className="font-amiri text-verse-green text-2xl md:text-4xl leading-relaxed mb-8 verse-glow-pulse">
              {'أفلا يتدبرون القرآن أم على قلوب أقفالها'}
            </p>
            <p className="text-gold-primary/40 text-sm font-tajawal mb-14">
              {'محمد: ٢٤'}
            </p>
            <Link
              to="/ijaz/journey"
              className="group relative inline-flex items-center gap-3 overflow-hidden px-14 py-6 rounded-2xl font-tajawal font-bold text-xl text-white holographic-card breathing-glow"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #e879f9)' }}
            >
              <span className="relative z-10">
                {'ابدأ رحلتك الآن'}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="relative z-10 rotate-180"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
