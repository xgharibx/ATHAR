
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚔️ معركة بدر — Battle of Badr
// "وَلَقَدْ نَصَرَكُمُ اللَّهُ بِبَدْرٍ وَأَنتُمْ أَذِلَّةٌ"
// 313 vs 1000 — the impossible victory predicted by the Quran

export default function BattleBadrVisual({ className }: MiracleVisualProps) {
  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#0a0815] to-[#050508] flex flex-col items-center justify-center p-4 ${className || ''}`}>
      {/* Desert atmosphere */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#1a1008]/30 to-transparent" />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="text-center mb-6 relative z-10"
      >
        <p className="font-amiri text-xl md:text-2xl text-gold-primary">غزوة بدر الكبرى</p>
        <p className="text-text-muted text-xs font-tajawal mt-1">17 رمضان 2 هجري — النصر المستحيل</p>
      </motion.div>

      {/* VS Comparison */}
      <div className="relative z-10 flex items-center gap-4 md:gap-8 w-full max-w-lg">
        {/* Muslims side */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex-1 text-center"
        >
          <div className="bg-verse-green/5 border border-verse-green/20 rounded-xl p-4">
            <p className="font-amiri text-sm text-verse-green/80 mb-2">المسلمون</p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="text-3xl md:text-4xl font-bold text-verse-green"
            >
              313
            </motion.p>
            <div className="mt-3 space-y-1 text-[10px] text-text-muted font-tajawal">
              <p>🐴 فرسان: 2</p>
              <p>🐪 إبل: 70</p>
              <p>⚔️ سيوف قليلة</p>
            </div>
            {/* Dot grid representing 313 */}
            <div className="mt-3 flex flex-wrap justify-center gap-[2px]">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.02 }}
                  className="w-1 h-1 rounded-full bg-verse-green/40"
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* VS */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="flex-shrink-0"
        >
          <div className="w-12 h-12 rounded-full bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center">
            <span className="font-amiri text-gold-primary text-sm font-bold">ضد</span>
          </div>
        </motion.div>

        {/* Quraysh side */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex-1 text-center"
        >
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <p className="font-amiri text-sm text-red-400/80 mb-2">قريش</p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="text-3xl md:text-4xl font-bold text-red-400"
            >
              1000
            </motion.p>
            <div className="mt-3 space-y-1 text-[10px] text-text-muted font-tajawal">
              <p>🐴 فرسان: 100</p>
              <p>🐪 إبل: 700</p>
              <p>⚔️ تسليح كامل</p>
            </div>
            {/* Dot grid representing ~1000 */}
            <div className="mt-3 flex flex-wrap justify-center gap-[2px]">
              {Array.from({ length: 80 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.01 }}
                  className="w-1 h-1 rounded-full bg-red-400/35"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Result */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.8 }}
        className="mt-6 text-center relative z-10"
      >
        <motion.div
          animate={{ boxShadow: ['0 0 0px rgba(45,212,168,0)', '0 0 20px rgba(45,212,168,0.2)', '0 0 0px rgba(45,212,168,0)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block bg-verse-green/10 border border-verse-green/30 rounded-lg px-6 py-2"
        >
          <p className="font-amiri text-lg text-verse-green">نَصْرٌ من اللَّه</p>
          <p className="text-text-muted text-[10px] font-tajawal mt-1">313 هزموا 1000 — بإذن الله</p>
        </motion.div>
      </motion.div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 2 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10"
      >
        <p className="font-amiri text-sm md:text-base text-verse-green/70 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.2)' }}>
          وَلَقَدْ نَصَرَكُمُ اللَّهُ بِبَدْرٍ وَأَنتُمْ أَذِلَّةٌ
        </p>
        <p className="text-gold-primary/40 text-xs font-tajawal mt-1">آل عمران : 123</p>
      </motion.div>
    </div>
  );
}
