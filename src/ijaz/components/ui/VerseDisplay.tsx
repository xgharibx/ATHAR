
import { motion } from 'framer-motion';
import { QuranicVerse } from '@/ijaz/types';
import { formatVerseReference } from '@/ijaz/lib/utils';

interface VerseDisplayProps {
  verse: QuranicVerse;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTranslation?: boolean;
  animated?: boolean;
  className?: string;
}

export default function VerseDisplay({
  verse,
  size = 'md',
  showTranslation = true,
  animated = true,
  className = '',
}: VerseDisplayProps) {
  const sizeClasses = {
    sm: 'text-lg md:text-xl',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl md:text-3xl lg:text-verse-xl',
    xl: 'text-3xl md:text-verse-xl lg:text-verse-2xl',
  };

  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated
    ? {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative ${className}`}
    >
      <div className="relative p-6 md:p-8 rounded-2xl bg-vanta/60 backdrop-blur-xl border border-verse-green/10 overflow-hidden">
        {/* Decorative corner ornaments */}
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-gold-primary/30 rounded-tr-lg" />
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-gold-primary/30 rounded-tl-lg" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-gold-primary/30 rounded-br-lg" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-gold-primary/30 rounded-bl-lg" />

        {/* Subtle glow behind text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-1/2 bg-verse-green/5 rounded-full blur-3xl" />
        </div>

        {/* Bismillah ornament */}
        <div className="text-center mb-4">
          <span className="text-gold-primary/40 text-sm font-amiri">﷽</span>
        </div>

        {/* Arabic Verse Text */}
        <div className="relative z-10 text-center" dir="rtl">
          <p
            className={`font-amiri ${sizeClasses[size]} text-verse-green leading-relaxed`}
            style={{
              textShadow: '0 0 40px rgba(45, 212, 168, 0.15)',
              letterSpacing: '0.03em',
              wordSpacing: '0.15em',
            }}
          >
            {verse.arabicText}
          </p>
        </div>

        {/* Verse Reference */}
        <div className="text-center mt-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-verse-green/10 border border-verse-green/20 text-verse-green text-sm font-tajawal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            سورة {formatVerseReference(verse.surah, verse.ayahNumber, verse.ayahNumberEnd)}
          </span>
        </div>

        {/* Translation */}
        {showTranslation && (
          <div className="mt-6 pt-4 border-t border-border-subtle">
            <p className="text-text-secondary text-sm md:text-base font-tajawal leading-relaxed text-center italic" dir="ltr">
              &ldquo;{verse.translation}&rdquo;
            </p>
          </div>
        )}

        {/* Transliteration */}
        {verse.transliteration && (
          <p className="text-text-muted text-xs mt-3 text-center font-tajawal" dir="ltr">
            {verse.transliteration}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
