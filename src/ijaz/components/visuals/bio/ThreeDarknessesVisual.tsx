
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌑 الظلمات الثلاث — Three Darknesses
// "يَخْلُقُكُمْ فِي بُطُونِ أُمَّهَاتِكُمْ خَلْقًا مِّن بَعْدِ خَلْقٍ فِي ظُلُمَاتٍ ثَلَاثٍ"
// Three layers: 1) بطن/جدار البطن (Anterior Abdominal Wall)
//               2) جدار الرحم (Uterine Wall)
//               3) الأغشية الأمنيوسية (Amniochorionic Membrane)

export default function ThreeDarknessesVisual({ className }: MiracleVisualProps) {
  const layers = [
    { label: 'جدار البطن', labelEn: 'Abdominal Wall', radius: 90, color: '#8B5E3C', opacity: 0.35, delay: 0.5 },
    { label: 'جدار الرحم', labelEn: 'Uterine Wall', radius: 68, color: '#A0404B', opacity: 0.45, delay: 1.0 },
    { label: 'الغشاء الأمنيوسي', labelEn: 'Amniotic Membrane', radius: 48, color: '#5A7AA0', opacity: 0.5, delay: 1.5 },
  ];

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#030305] to-[#080812] flex items-center justify-center ${className || ''}`}>
      {/* Radiating subtle light from center */}
      <motion.div
        animate={{ opacity: [0.05, 0.12, 0.05] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.1), transparent 70%)' }}
      />

      <svg viewBox="0 0 200 200" className="w-64 h-64 md:w-80 md:h-80 relative z-10">
        {/* Three darkness layers */}
        {layers.map((layer, i) => (
          <motion.g key={i}>
            {/* Layer circle */}
            <motion.circle
              cx="100" cy="100" r={layer.radius}
              fill={layer.color}
              opacity={0}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: layer.opacity,
                scale: 1,
              }}
              transition={{ delay: layer.delay, duration: 1 }}
            />
            {/* Layer edge glow */}
            <motion.circle
              cx="100" cy="100" r={layer.radius}
              fill="none"
              stroke={layer.color}
              strokeWidth="1.5"
              opacity={0}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: layer.delay + 0.3, duration: 0.8 }}
            />
            {/* Label */}
            <motion.text
              x={100 + layer.radius + 5}
              y={100 - layer.radius * 0.3}
              fill="white"
              fontSize="5"
              fontFamily="Tajawal"
              opacity={0}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 0.7, x: 0 }}
              transition={{ delay: layer.delay + 0.5, duration: 0.6 }}
            >
              {layer.label}
            </motion.text>
            {/* Indicator line */}
            <motion.line
              x1={100 + layer.radius * 0.7}
              y1={100 - layer.radius * 0.7}
              x2={100 + layer.radius + 3}
              y2={100 - layer.radius * 0.3 + 2}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: layer.delay + 0.5 }}
            />
          </motion.g>
        ))}

        {/* Fetus at center — the protected creation */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.5, duration: 1, type: 'spring' }}
        >
          {/* Amniotic fluid glow */}
          <circle cx="100" cy="100" r="30" fill="rgba(100,150,200,0.15)" />
          {/* Simplified fetus */}
          <ellipse cx="100" cy="100" rx="12" ry="16" fill="#e8c0a8" opacity="0.8" />
          <circle cx="100" cy="88" r="8" fill="#e8c0a8" opacity="0.9" />
          {/* Curled position */}
          <path d="M 92 96 Q 85 102 88 110" stroke="#d8a888" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 108 96 Q 115 102 112 110" stroke="#d8a888" strokeWidth="3" fill="none" strokeLinecap="round" />
        </motion.g>

        {/* Pulsing heartbeat at center */}
        <motion.circle
          cx="100" cy="100" r="20"
          fill="none"
          stroke="rgba(212,168,83,0.3)"
          strokeWidth="1"
          animate={{
            r: [20, 25, 20],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Number labels ١ ٢ ٣ */}
        {layers.map((layer, i) => (
          <motion.text
            key={'num' + i}
            x={100 - layer.radius - 8}
            y="103"
            fill={layer.color}
            fontSize="7"
            fontWeight="bold"
            fontFamily="Amiri"
            textAnchor="middle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: layer.delay + 0.5 }}
          >
            {['①', '②', '③'][i]}
          </motion.text>
        ))}
      </svg>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-lg md:text-xl text-verse-green/80 px-4" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          فِي ظُلُمَاتٍ ثَلَاثٍ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الزمر : 6</p>
      </motion.div>
    </div>
  );
}
