
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🏛️ نبوءة انتصار الروم — Romans Victory Prophecy
// "الم ۝ غُلِبَتِ الرُّومُ ۝ فِي أَدْنَى الْأَرْضِ وَهُم مِّن بَعْدِ غَلَبِهِمْ سَيَغْلِبُونَ ۝ فِي بِضْعِ سِنِينَ"
// Timeline: Persians defeat Romans at Dead Sea (lowest point on earth) →
// Quran predicts Romans will win again within 3-9 years → They did (Battle of Issus 627 CE)

export default function RomansVictoryVisual({ className }: MiracleVisualProps) {
  const events = [
    { year: '614', label: 'هزيمة الروم', detail: 'الفرس يهزمون الروم في أدنى الأرض', color: '#c0392b', side: 'right' as const },
    { year: '615', label: 'نزول النبوءة', detail: 'القرآن يتنبأ بانتصار الروم في بضع سنين', color: '#d4a853', side: 'center' as const },
    { year: '622', label: 'بداية الهجوم', detail: 'الروم يبدأون الهجوم المضاد', color: '#3498db', side: 'left' as const },
    { year: '627', label: 'انتصار الروم', detail: 'الروم ينتصرون على الفرس — تحققت النبوءة!', color: '#2dd4a8', side: 'right' as const },
  ];

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#0a0815] to-[#050510] flex flex-col items-center justify-center px-4 py-6 ${className || ''}`}>
      {/* Background map aesthetic */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(212,168,83,0.3), transparent 50%), radial-gradient(circle at 70% 50%, rgba(100,50,50,0.3), transparent 50%)',
      }} />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-6 relative z-10"
      >
        <p className="font-amiri text-xl md:text-2xl text-gold-primary">نبوءة انتصار الروم</p>
        <p className="text-text-muted text-xs font-tajawal mt-1">في أدنى الأرض — البحر الميت (-430م تحت سطح البحر)</p>
      </motion.div>

      {/* Dead Sea depth indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-4 left-4 text-center opacity-40 z-10"
      >
        <div className="w-12 h-20 border border-blue-800/30 rounded-sm relative overflow-hidden">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ delay: 1, duration: 2 }}
            className="absolute bottom-0 w-full bg-blue-900/40"
          />
          <p className="absolute -bottom-5 left-0 right-0 text-[8px] text-blue-400/60 font-tajawal">-430m</p>
        </div>
        <p className="text-[8px] text-text-muted mt-6 font-tajawal">أدنى الأرض</p>
      </motion.div>

      {/* Timeline */}
      <div className="relative z-10 w-full max-w-md">
        {/* Central line */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1 }}
          className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-900/40 via-gold-primary/30 to-green-500/40 origin-top"
        />
        {/* Continuous pulse traveling down the timeline \u2014 the march of history */}
        <motion.div
          aria-hidden
          animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(45,212,168,0.9), transparent 70%)', boxShadow: '0 0 12px rgba(45,212,168,0.6)' }}
        />

        <div className="space-y-6">
          {events.map((event, i) => (
            <motion.div
              key={event.year}
              initial={{ opacity: 0, x: event.side === 'left' ? -30 : event.side === 'right' ? 30 : 0, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.8 + i * 0.5, duration: 0.6 }}
              className={`flex items-center gap-3 ${event.side === 'right' ? 'flex-row-reverse text-right' : event.side === 'center' ? 'justify-center' : 'text-left'}`}
            >
              {/* Event card */}
              <div className={`flex-1 max-w-[45%] ${event.side === 'center' ? 'max-w-[80%] text-center' : ''}`}>
                <div
                  className={`p-3 rounded-lg border backdrop-blur-sm ${event.side === 'center' ? 'border-gold-primary/30 bg-gold-primary/5' : 'border-border-subtle bg-space-blue/20'}`}
                >
                  <p className="text-xs font-mono mb-1" style={{ color: event.color }}>{event.year} م</p>
                  <p className="font-amiri text-sm font-bold text-text-primary">{event.label}</p>
                  <p className="text-text-muted text-[10px] font-tajawal mt-1">{event.detail}</p>
                </div>
              </div>

              {/* Center dot */}
              <div className="relative flex-shrink-0">
                <motion.div
                  animate={event.side === 'center' ? { scale: [1, 1.3, 1], boxShadow: ['0 0 0px rgba(212,168,83,0)', '0 0 15px rgba(212,168,83,0.5)', '0 0 0px rgba(212,168,83,0)'] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: event.color, backgroundColor: event.color + '30' }}
                />
              </div>

              {/* Spacer for layout */}
              {event.side !== 'center' && <div className="flex-1 max-w-[45%]" />}
            </motion.div>
          ))}
        </div>

        {/* Duration bracket */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="absolute -right-8 top-[15%] bottom-[10%] flex items-center"
        >
          <div className="h-full w-4 border-r-2 border-t-2 border-b-2 border-gold-primary/20 rounded-r-lg" />
          <p className="text-[10px] text-gold-primary/60 font-amiri whitespace-nowrap ml-1 -rotate-90">بِضْعِ سِنِينَ (٣-٩)</p>
        </motion.div>
      </div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 2 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-sm md:text-base text-verse-green/70 px-4 leading-relaxed" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          غُلِبَتِ الرُّومُ ۝ فِي أَدْنَى الْأَرْضِ وَهُم مِّن بَعْدِ غَلَبِهِمْ سَيَغْلِبُونَ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الروم : 2-4</p>
      </motion.div>
    </div>
  );
}
