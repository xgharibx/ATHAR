
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🥛 إنتاج اللبن — Milk Production
// "وَإِنَّ لَكُمْ فِي الْأَنْعَامِ لَعِبْرَةً نُّسْقِيكُم مِّمَّا فِي بُطُونِهِ مِن بَيْنِ فَرْثٍ وَدَمٍ لَّبَنًا خَالِصًا سَائِغًا لِّلشَّارِبِينَ"
// Blood → filtered between digested food (فرث) and blood (دم) → pure white milk

export default function MilkProductionVisual({ className }: MiracleVisualProps) {
  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#0a0812] to-[#080510] flex flex-col items-center justify-center ${className || ''}`}>
      {/* Main diagram */}
      <svg viewBox="0 0 400 350" className="w-full max-w-lg h-auto relative z-10">
        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#d4a853" fontSize="14" fontFamily="Amiri" fontWeight="bold">
          مِن بَيْنِ فَرْثٍ وَدَمٍ لَّبَنًا خَالِصًا
        </text>

        {/* LEFT — فرث (Digested Food) */}
        <motion.g
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <rect x="30" y="80" rx="15" ry="15" width="100" height="180" fill="#3a5a30" opacity="0.3" stroke="#5a8a40" strokeWidth="1.5" />
          <text x="80" y="70" textAnchor="middle" fill="#7ab850" fontSize="12" fontFamily="Amiri">فَرْث</text>
          <text x="80" y="60" textAnchor="middle" fill="#5a8a40" fontSize="7" fontFamily="Tajawal">Digested Food</text>
          {/* Intestinal content particles */}
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.circle
              key={'f' + i}
              cx={50 + Math.random() * 60}
              cy={100 + Math.random() * 140}
              r={2 + Math.random() * 3}
              fill={`hsl(${80 + Math.random() * 40}, 50%, ${25 + Math.random() * 15}%)`}
              opacity={0.5}
              animate={{ y: [0, Math.random() * 6 - 3, 0] }}
              transition={{ duration: 2 + Math.random(), repeat: Infinity }}
            />
          ))}
        </motion.g>

        {/* RIGHT — دم (Blood) */}
        <motion.g
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <rect x="270" y="80" rx="15" ry="15" width="100" height="180" fill="#5a2020" opacity="0.3" stroke="#a04040" strokeWidth="1.5" />
          <text x="320" y="70" textAnchor="middle" fill="#d05050" fontSize="12" fontFamily="Amiri">دَم</text>
          <text x="320" y="60" textAnchor="middle" fill="#a04040" fontSize="7" fontFamily="Tajawal">Blood</text>
          {/* Blood cells */}
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.circle
              key={'b' + i}
              cx={290 + Math.random() * 60}
              cy={100 + Math.random() * 140}
              r={3}
              fill="#c03030"
              opacity={0.5}
              animate={{ y: [0, Math.random() * 8 - 4, 0] }}
              transition={{ duration: 1.5 + Math.random(), repeat: Infinity }}
            />
          ))}
        </motion.g>

        {/* CENTER — لبن (Pure Milk) — between the two */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 1, type: 'spring' }}
        >
          <rect x="150" y="80" rx="15" ry="15" width="100" height="180" fill="#f5f0e0" opacity="0.08" stroke="#f0e8d0" strokeWidth="1.5" />

          {/* Milk flowing */}
          <motion.path
            d="M 200 90 Q 195 120 200 150 Q 205 180 200 210 Q 195 240 200 260"
            stroke="#f0e8d0"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.5, duration: 2 }}
            opacity={0.6}
          />

          {/* Milk label */}
          <text x="200" y="70" textAnchor="middle" fill="#f0e8d0" fontSize="14" fontFamily="Amiri" fontWeight="bold">لَبَنًا خَالِصًا</text>
          <text x="200" y="58" textAnchor="middle" fill="#d0c8b0" fontSize="7" fontFamily="Tajawal">Pure Milk</text>

          {/* Milk droplets */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.circle
              key={'m' + i}
              cx={170 + Math.random() * 60}
              cy={100 + Math.random() * 150}
              r={2 + Math.random() * 2}
              fill="#f5f0e0"
              opacity={0.4}
              animate={{
                y: [0, -5, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: Math.random() }}
            />
          ))}

          {/* Purity glow */}
          <motion.circle
            cx="200"
            cy="170"
            r="50"
            fill="none"
            stroke="#f0e8d0"
            strokeWidth="0.5"
            animate={{ r: [40, 55, 40], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.g>

        {/* Arrows: food → milk ← blood */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2, duration: 1 }}
        >
          {/* Left arrow: nutrients extracted from food */}
          <path d="M 130 170 L 155 170" stroke="#7ab850" strokeWidth="2" markerEnd="url(#arrowGreen)" />
          {/* Right arrow: nutrients extracted from blood */}
          <path d="M 270 170 L 245 170" stroke="#d05050" strokeWidth="2" markerEnd="url(#arrowRed)" />

          <defs>
            <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#7ab850" />
            </marker>
            <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#d05050" />
            </marker>
          </defs>
        </motion.g>

        {/* Bottom label */}
        <motion.text
          x="200" y="295"
          textAnchor="middle"
          fill="#d4a853"
          fontSize="8"
          fontFamily="Tajawal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2.5 }}
        >
          يُستخلص اللبن النقي من بين محتويات الأمعاء والدم
        </motion.text>
      </svg>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-sm md:text-lg text-verse-green/70 px-4" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          نُّسْقِيكُم مِّمَّا فِي بُطُونِهِ مِن بَيْنِ فَرْثٍ وَدَمٍ لَّبَنًا خَالِصًا سَائِغًا لِّلشَّارِبِينَ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">النحل : 66</p>
      </motion.div>
    </div>
  );
}
