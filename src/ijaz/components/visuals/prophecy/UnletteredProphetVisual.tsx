
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 📖 النبي الأمي — The Unlettered Prophet
// "وَمَا كُنتَ تَتْلُو مِن قَبْلِهِ مِن كِتَابٍ وَلَا تَخُطُّهُ بِيَمِينِكَ"
// A man who could not read or write delivers the most eloquent book in Arabic history
// Visual: contrast between empty page (illiteracy) and the magnificent Quran

export default function UnletteredProphetVisual({ className }: MiracleVisualProps) {
  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-[#0a0812] to-[#080510] flex items-center justify-center p-6 ${className || ''}`}>
      {/* Radiating light */}
      <motion.div
        animate={{ opacity: [0.05, 0.12, 0.05] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.08), transparent 70%)' }}
      />

      {/* Continuous descending revelation particles */}
      {[0, 1, 2, 3, 4].map((n) => (
        <motion.div
          key={n}
          aria-hidden
          className="absolute top-0 w-1 h-1 rounded-full"
          style={{
            left: `${42 + n * 4}%`,
            background: 'radial-gradient(circle, rgba(212,168,83,0.9), transparent 70%)',
            boxShadow: '0 0 8px rgba(212,168,83,0.6)',
          }}
          animate={{ y: ['-5%', '45vh'], opacity: [0, 0.9, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: n * 0.5, ease: 'easeIn' }}
        />
      ))}

      <div className="relative z-10 flex items-center gap-8 md:gap-16">
        {/* LEFT: Empty page — illiteracy */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="w-28 h-40 md:w-36 md:h-48 bg-[#1a1520]/40 border border-border-subtle rounded-md flex items-center justify-center relative">
            {/* Blank page */}
            <div className="w-20 h-32 md:w-24 md:h-36 bg-[#f5f0e0]/5 rounded-sm flex items-center justify-center">
              {/* Faint crossed-out pen */}
              <svg viewBox="0 0 40 40" className="w-10 h-10 opacity-20">
                <line x1="10" y1="30" x2="30" y2="10" stroke="#888" strokeWidth="2" />
                <line x1="28" y1="12" x2="32" y2="8" stroke="#888" strokeWidth="2" />
                {/* Crossed out */}
                <line x1="5" y1="5" x2="35" y2="35" stroke="#c0392b" strokeWidth="1.5" />
              </svg>
            </div>
            {/* Label */}
            <div className="absolute -bottom-6 left-0 right-0 text-center">
              <p className="font-amiri text-sm text-red-400/60">مَا كُنتَ تَتْلُو</p>
              <p className="text-[9px] text-text-muted font-tajawal">لا يقرأ ولا يكتب</p>
            </div>
          </div>
        </motion.div>

        {/* CENTER: Transformation arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
          className="flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg viewBox="0 0 40 20" className="w-10 h-5">
              <path d="M 5 10 L 30 10" stroke="#d4a853" strokeWidth="2" />
              <path d="M 25 5 L 35 10 L 25 15" stroke="#d4a853" strokeWidth="2" fill="none" />
            </svg>
          </motion.div>
          <p className="font-amiri text-xs text-gold-primary/60">وحي</p>
        </motion.div>

        {/* RIGHT: Magnificent Quran */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-center"
        >
          <div className="w-28 h-40 md:w-36 md:h-48 relative">
            {/* Quran glow */}
            <motion.div
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 rounded-lg"
              style={{ boxShadow: '0 0 40px rgba(212,168,83,0.2)' }}
            />
            {/* Book shape */}
            <div className="w-full h-full bg-gradient-to-br from-[#2a2015] to-[#1a1508] border border-gold-primary/30 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* Ornamental border pattern */}
              <div className="absolute inset-1 border border-gold-primary/10 rounded-md" />
              <div className="absolute inset-2 border border-gold-primary/5 rounded-sm" />

              {/* Text lines — representing Quranic text */}
              <div className="space-y-1.5 px-3">
                {[1, 0.8, 0.9, 0.7, 0.85, 0.6, 0.95, 0.5].map((w, i) => (
                  <motion.div
                    key={i}
                    initial={{ width: 0 }}
                    animate={{ width: `${w * 100}%` }}
                    transition={{ delay: 1.2 + i * 0.1, duration: 0.3 }}
                    className="h-1 bg-gold-primary/20 rounded-full mx-auto"
                  />
                ))}
              </div>

              {/* Central bismillah hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 2 }}
                className="absolute top-3 font-amiri text-[8px] text-gold-primary"
              >
                بِسْمِ اللَّهِ
              </motion.p>
            </div>
            {/* Label */}
            <div className="absolute -bottom-6 left-0 right-0 text-center">
              <p className="font-amiri text-sm text-verse-green/70">القرآن الكريم</p>
              <p className="text-[9px] text-text-muted font-tajawal">أبلغ كتاب في التاريخ</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Contrast statement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="absolute bottom-16 left-0 right-0 text-center z-10"
      >
        <p className="text-text-secondary text-xs font-tajawal max-w-md mx-auto px-4">
          كيف لرجل أمي لم يقرأ كتابًا قط أن يأتي بأعظم كتاب عرفته البشرية؟
        </p>
      </motion.div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 2 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10"
      >
        <p className="font-amiri text-xs md:text-sm text-verse-green/60 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.2)' }}>
          وَمَا كُنتَ تَتْلُو مِن قَبْلِهِ مِن كِتَابٍ وَلَا تَخُطُّهُ بِيَمِينِكَ
        </p>
        <p className="text-gold-primary/40 text-xs font-tajawal mt-1">العنكبوت : 48</p>
      </motion.div>
    </div>
  );
}
