
import { motion } from 'framer-motion';

const timeline = [
  { year: '610 CE', event: 'Quran revealed to an unlettered prophet', highlight: true },
  { year: '632 CE', event: 'Prophet passes away; challenge still open', highlight: false },
  { year: '1000 CE', event: "Al-Baqillani's \"I'jaz al-Quran\" — no counter found", highlight: false },
  { year: '2024 CE', event: '1400 years later — challenge unanswered', highlight: true },
];

const proofs = [
  { icon: '📖', text: 'Unlettered prophet — could not read or write (7:157)' },
  { icon: '🔤', text: 'Unique rhythm: neither poetry nor prose' },
  { icon: '🔬', text: 'No contradiction in 1400 years of scrutiny (4:82)' },
  { icon: '⚔️', text: "Arab masters chose to fight — not to respond linguistically (8:31)" },
];

export default function QuranChallengeVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-10 gap-4 px-6 pb-6 select-none overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1117] to-[#0f0a15] pointer-events-none" />

      {/* Decorative Arabic calligraphy background */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]"
        aria-hidden="true"
      >
        <span className="font-arabic text-white" style={{ fontSize: '14rem', lineHeight: 1 }}>قُرآن</span>
      </div>

      {/* Main challenge verse */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.55 }}
        className="relative z-10 rounded-xl px-4 py-3 text-center w-full max-w-sm"
        style={{ background: 'rgba(212,168,83,0.07)', border: '1px solid rgba(212,168,83,0.28)' }}
      >
        <p className="text-gold-primary font-arabic text-base leading-relaxed dir-rtl" dir="rtl">
          قُل لَّئِنِ اجْتَمَعَتِ الْإِنسُ وَالْجِنُّ عَلَىٰ أَن يَأْتُوا بِمِثْلِ هَٰذَا الْقُرْآنِ
        </p>
        <p className="text-gold-primary font-arabic text-base leading-relaxed dir-rtl mt-1" dir="rtl">
          لَا يَأْتُونَ بِمِثْلِهِ وَلَوْ كَانَ بَعْضُهُمْ لِبَعْضٍ ظَهِيرًا
        </p>
        <p className="text-gray-400 text-xs mt-2 italic">
          &ldquo;If all mankind and jinn gathered to produce the like of this Quran, they could not&rdquo; — 17:88
        </p>
      </motion.div>

      {/* Timeline */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col gap-1.5">
          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span
                className="text-xs font-mono font-bold shrink-0 w-16 text-right"
                style={{ color: item.highlight ? '#d4a853' : '#6b7280' }}
              >
                {item.year}
              </span>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: item.highlight ? '#d4a853' : '#374151' }}
              />
              <p className={`text-xs ${item.highlight ? 'text-white font-medium' : 'text-gray-400'}`}>
                {item.event}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
