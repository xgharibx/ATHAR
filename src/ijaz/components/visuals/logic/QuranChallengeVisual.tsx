import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 📖 تحدي القرآن — The Quran's standing challenge (17:88), unanswered for 1400 years.
// Self-drawing timeline + pulsing قُرآن calligraphy + slamming "لم يُجَب" stamp.

const timeline = [
  { year: '٦١٠ م', event: 'نزول القرآن على نبي أمّي', highlight: true },
  { year: '٦٣٢ م', event: 'وفاة النبي ﷺ والتحدي قائم', highlight: false },
  { year: '١٠٠٠ م', event: 'الباقلاني «إعجاز القرآن» — لا معارض', highlight: false },
  { year: '٢٠٢٤ م', event: 'بعد ١٤٠٠ عام — التحدي بلا جواب', highlight: true },
];

const proofs = [
  { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5V5a2 2 0 0 1 2-2h14v14 M4 19.5A2.5 2.5 0 0 0 6.5 22H20', text: 'نبي أمّي لا يقرأ ولا يكتب (٧:١٥٧)' },
  { d: 'M4 7V4h16v3 M9 20h6 M12 4v16', text: 'نظم فريد: لا شعر ولا نثر' },
  { d: 'M10 2v6.5L4 18a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-9.5V2 M8.5 2h7', text: 'لا تناقض في ١٤٠٠ عام (٤:٨٢)' },
  { d: 'M14.5 17.5 3 6V3h3l11.5 11.5 M13 19l6-6 M16 16l4 4 M19 21l2-2', text: 'فصحاء العرب اختاروا القتال لا المعارضة (٨:٣١)' },
];

export default function QuranChallengeVisual({ className }: MiracleVisualProps) {
  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-start pt-8 gap-3 px-5 pb-6 select-none overflow-hidden ${className || ''}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1117] to-[#0f0a15] pointer-events-none" />

      {/* Pulsing decorative Arabic calligraphy background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
        animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.04, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="font-arabic text-gold-primary" style={{ fontSize: '14rem', lineHeight: 1 }}>قُرآن</span>
      </motion.div>

      {/* Main challenge verse */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.55 }}
        className="relative z-10 rounded-xl px-4 py-3 text-center w-full max-w-sm backdrop-blur-sm"
        style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.3)' }}
      >
        <p className="text-gold-primary font-arabic text-base leading-relaxed" dir="rtl">
          قُل لَّئِنِ اجْتَمَعَتِ الْإِنسُ وَالْجِنُّ عَلَىٰ أَن يَأْتُوا بِمِثْلِ هَٰذَا الْقُرْآنِ لَا يَأْتُونَ بِمِثْلِهِ
        </p>
        <p className="text-gray-400 text-[10px] mt-1.5 font-tajawal">سورة الإسراء · الآية ٨٨</p>
      </motion.div>

      {/* Self-drawing timeline */}
      <div className="relative z-10 w-full max-w-sm pl-1">
        {/* animated vertical line */}
        <motion.div
          className="absolute right-[60px] top-1 w-px"
          style={{ background: 'linear-gradient(to bottom, #d4a853, #374151)', transformOrigin: 'top' }}
          initial={{ scaleY: 0, height: '100%' }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.5, duration: 1.1, ease: 'easeInOut' }}
        />
        <div className="flex flex-col gap-2" dir="rtl">
          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.22, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className="text-[11px] font-mono font-bold shrink-0 w-[52px] text-left" style={{ color: item.highlight ? '#d4a853' : '#6b7280' }}>
                {item.year}
              </span>
              <motion.div
                className="w-2.5 h-2.5 rounded-full shrink-0 z-10"
                style={{ background: item.highlight ? '#d4a853' : '#374151' }}
                animate={item.highlight ? { boxShadow: ['0 0 0px rgba(212,168,83,0)', '0 0 10px rgba(212,168,83,0.8)', '0 0 0px rgba(212,168,83,0)'] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <p className={`text-[11px] font-tajawal ${item.highlight ? 'text-white font-medium' : 'text-gray-400'}`}>{item.event}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Proof chips */}
      <div className="relative z-10 grid grid-cols-2 gap-1.5 w-full max-w-sm" dir="rtl">
        {proofs.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 + i * 0.1, duration: 0.4 }}
            className="flex items-start gap-1.5 rounded-lg px-2 py-1.5"
            style={{ background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.18)' }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#d4a853" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d={p.d} />
            </svg>
            <span className="text-gray-300 text-[10px] font-tajawal leading-tight">{p.text}</span>
          </motion.div>
        ))}
      </div>

      {/* Slamming "unanswered" stamp */}
      <motion.div
        initial={{ opacity: 0, scale: 3, rotate: -28 }}
        animate={{ opacity: [0, 0, 1], scale: [3, 3, 1], rotate: -12 }}
        transition={{ delay: 2.1, duration: 0.5, times: [0, 0.6, 1], ease: 'easeOut' }}
        className="absolute z-20 left-1/2 bottom-7 -translate-x-1/2 pointer-events-none"
      >
        <div className="px-4 py-1.5 rounded-md font-amiri font-bold text-lg tracking-wide"
          style={{ color: '#ef4444', border: '3px solid #ef4444', boxShadow: '0 0 18px rgba(239,68,68,0.35)', textShadow: '0 0 8px rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.05)' }}>
          لم يُجَب · ١٤٠٠ عام
        </div>
      </motion.div>
    </div>
  );
}
