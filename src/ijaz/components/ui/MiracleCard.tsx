
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Miracle } from '@/ijaz/types';
import { getCategoryLabel, getVisualizationColor, truncate } from '@/ijaz/lib/utils';

interface MiracleCardProps {
  miracle: Miracle;
  index: number;
}

export default function MiracleCard({ miracle, index }: MiracleCardProps) {
  const accentColor = getVisualizationColor(miracle.visualizationType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: 'relative', zIndex: 1 }}
      whileHover={{ zIndex: 20 }}
    >
      <Link to={`/ijaz/miracles/${miracle.slug}`} className="block group">
        <div className="glass-card miracle-glow p-6 h-full flex flex-col gap-4">
          {/* Top: Category Badge + Visualization Type */}
          <div className="flex items-center justify-between">
            <span
              className="category-badge"
              style={{
                borderColor: `${accentColor}30`,
                background: `${accentColor}10`,
                color: accentColor,
              }}
            >
              <span className="text-base">
                {miracle.visualizationType === 'cosmos' && '🌌'}
                {miracle.visualizationType === 'microscopic' && '🧬'}
                {miracle.visualizationType === 'earth' && '🌍'}
                {miracle.visualizationType === 'timeline' && '📜'}
                {miracle.visualizationType === 'logic' && '🧠'}
              </span>
              <span className="font-tajawal text-xs">{getCategoryLabel(miracle.category)}</span>
            </span>
            <span className="text-text-muted text-xs font-tajawal">
              #{miracle.order}
            </span>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h3 className="text-gold-primary font-amiri text-xl font-bold leading-tight group-hover:text-gold-light transition-colors">
              {miracle.titleAr}
            </h3>
            <p className="text-text-secondary text-sm font-tajawal">
              {miracle.title}
            </p>
          </div>

          {/* Verse Preview */}
          {miracle.verses[0] && (
            <div className="relative p-4 rounded-xl bg-vanta/50 border border-border-subtle">
              <p className="font-amiri text-verse-green text-base leading-relaxed line-clamp-2" dir="rtl">
                {truncate(miracle.verses[0].arabicText, 120)}
              </p>
              <p className="text-text-muted text-xs mt-2 font-tajawal">
                سورة {miracle.verses[0].surah} : {miracle.verses[0].ayahNumber}
                {miracle.verses[0].ayahNumberEnd && `-${miracle.verses[0].ayahNumberEnd}`}
              </p>
            </div>
          )}

          {/* Summary */}
          <p className="text-text-secondary text-sm font-tajawal leading-relaxed line-clamp-3 flex-1">
            {miracle.summaryAr}
          </p>

          {/* Bottom: Evidence Count + Source */}
          <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
            <div className="flex items-center gap-3 text-xs text-text-muted font-tajawal">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                {miracle.scientificEvidence.length} أدلة
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                {miracle.bookSource.bookTitleAr}
              </span>
            </div>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: `${accentColor}15`, color: accentColor }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
