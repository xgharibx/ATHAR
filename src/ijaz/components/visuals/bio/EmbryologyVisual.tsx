
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🧬 أطوار الجنين — Embryology Stages
// "وَلَقَدْ خَلَقْنَا الْإِنسَانَ مِن سُلَالَةٍ مِّن طِينٍ ۝ ثُمَّ جَعَلْنَاهُ نُطْفَةً فِي قَرَارٍ مَّكِينٍ ۝
//  ثُمَّ خَلَقْنَا النُّطْفَةَ عَلَقَةً فَخَلَقْنَا الْعَلَقَةَ مُضْغَةً فَخَلَقْنَا الْمُضْغَةَ عِظَامًا فَكَسَوْنَا الْعِظَامَ لَحْمًا"
// Progressive stages: نطفة → علقة → مضغة → عظام → لحم

const stages = [
  {
    id: 'nutfah',
    nameAr: 'نُطْفَة',
    nameEn: 'Nutfah (Drop)',
    desc: 'نطفة في قرار مكين',
    color: '#a8d8ea',
    bgFrom: '#0a1628',
    bgTo: '#0d2137',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Single cell / zygote */}
        <defs>
          <radialGradient id="cell-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c8e6f0" />
            <stop offset="60%" stopColor="#7eb8d0" />
            <stop offset="100%" stopColor="#4a90b0" />
          </radialGradient>
          <radialGradient id="nucleus-grad" cx="45%" cy="45%" r="40%">
            <stop offset="0%" stopColor="#5a3e8a" />
            <stop offset="100%" stopColor="#3a2060" />
          </radialGradient>
        </defs>
        {/* Outer membrane */}
        <circle cx="100" cy="100" r="55" fill="url(#cell-grad)" opacity="0.8" />
        <circle cx="100" cy="100" r="55" fill="none" stroke="#a8d8ea" strokeWidth="2" opacity="0.6" />
        {/* Nucleus */}
        <circle cx="95" cy="95" r="18" fill="url(#nucleus-grad)" opacity="0.9" />
        {/* Highlight */}
        <circle cx="80" cy="82" r="12" fill="white" opacity="0.15" />
        {/* Small organelles */}
        <circle cx="120" cy="85" r="4" fill="#8ab8c8" opacity="0.5" />
        <circle cx="110" cy="118" r="3" fill="#8ab8c8" opacity="0.4" />
        <circle cx="82" cy="115" r="3.5" fill="#8ab8c8" opacity="0.45" />
      </svg>
    ),
  },
  {
    id: 'alaqah',
    nameAr: 'عَلَقَة',
    nameEn: 'Alaqah (Clinging Clot)',
    desc: 'شيء عالق يتعلق بجدار الرحم',
    color: '#c0392b',
    bgFrom: '#1a0a0a',
    bgTo: '#2a1015',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Leech-like clinging mass */}
        <defs>
          <radialGradient id="alaqah-grad" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#d94a3a" />
            <stop offset="70%" stopColor="#8a2020" />
            <stop offset="100%" stopColor="#4a1010" />
          </radialGradient>
        </defs>
        {/* Uterine wall */}
        <path d="M 0 30 Q 100 10 200 30 L 200 0 L 0 0 Z" fill="#6a3040" opacity="0.4" />
        <path d="M 0 30 Q 100 10 200 30" fill="none" stroke="#8a4050" strokeWidth="2" opacity="0.6" />
        {/* Alaqah — clinging mass */}
        <ellipse cx="100" cy="80" rx="35" ry="45" fill="url(#alaqah-grad)" />
        {/* Blood vessel connections to wall */}
        <path d="M 85 38 Q 80 30 75 30" stroke="#c0392b" strokeWidth="2" fill="none" opacity="0.7" />
        <path d="M 100 36 Q 100 25 105 28" stroke="#c0392b" strokeWidth="2" fill="none" opacity="0.7" />
        <path d="M 115 40 Q 120 30 125 32" stroke="#c0392b" strokeWidth="2" fill="none" opacity="0.7" />
        {/* Surface texture */}
        <ellipse cx="90" cy="70" rx="8" ry="12" fill="#e05040" opacity="0.3" />
        <ellipse cx="112" cy="85" rx="7" ry="10" fill="#e05040" opacity="0.25" />
      </svg>
    ),
  },
  {
    id: 'mudghah',
    nameAr: 'مُضْغَة',
    nameEn: 'Mudghah (Chewed Lump)',
    desc: 'كقطعة لحم ممضوغة',
    color: '#e67e22',
    bgFrom: '#1a0f05',
    bgTo: '#2a1a08',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Chewed appearance — somites visible */}
        <defs>
          <radialGradient id="mudghah-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8915a" />
            <stop offset="70%" stopColor="#b86830" />
            <stop offset="100%" stopColor="#7a4020" />
          </radialGradient>
        </defs>
        {/* Main body — irregular, chewed shape */}
        <path d="M 65 70 Q 60 55 75 50 Q 90 42 105 48 Q 120 42 135 52 Q 145 62 140 80 Q 145 100 135 115 Q 125 130 110 135 Q 95 140 80 132 Q 65 125 60 110 Q 55 95 58 80 Z" fill="url(#mudghah-grad)" />
        {/* Somites — teeth-mark-like ridges (the "chewed" look) */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={i}
            d={`M ${70 + i * 3} ${55 + i * 11} Q ${100} ${52 + i * 11} ${130 - i * 2} ${58 + i * 11}`}
            stroke="#d4804a"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
        ))}
        {/* Early limb buds */}
        <ellipse cx="62" cy="75" rx="6" ry="4" fill="#c87040" opacity="0.6" />
        <ellipse cx="62" cy="105" rx="5" ry="3.5" fill="#c87040" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'izam',
    nameAr: 'عِظَامًا',
    nameEn: 'Izam (Bones)',
    desc: 'فَخَلَقْنَا الْمُضْغَةَ عِظَامًا',
    color: '#ecf0f1',
    bgFrom: '#0a0a12',
    bgTo: '#12121a',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Skeletal framework forming */}
        <defs>
          <linearGradient id="bone-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0eee8" />
            <stop offset="100%" stopColor="#c8c0b0" />
          </linearGradient>
        </defs>
        {/* Spine */}
        <path d="M 100 35 L 100 140" stroke="url(#bone-grad)" strokeWidth="5" strokeLinecap="round" />
        {/* Skull */}
        <circle cx="100" cy="30" r="18" fill="none" stroke="#e0dcd0" strokeWidth="3" />
        <circle cx="93" cy="26" r="3" fill="#c0b8a8" opacity="0.4" />
        <circle cx="107" cy="26" r="3" fill="#c0b8a8" opacity="0.4" />
        {/* Ribcage */}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <path d={`M 100 ${60 + i * 12} Q ${75 - i * 2} ${65 + i * 12} ${70 - i} ${58 + i * 12}`} stroke="#d8d0c0" strokeWidth="2" fill="none" />
            <path d={`M 100 ${60 + i * 12} Q ${125 + i * 2} ${65 + i * 12} ${130 + i} ${58 + i * 12}`} stroke="#d8d0c0" strokeWidth="2" fill="none" />
          </g>
        ))}
        {/* Pelvis */}
        <path d="M 85 135 Q 75 145 80 155 Q 90 160 100 155 Q 110 160 120 155 Q 125 145 115 135" stroke="#d8d0c0" strokeWidth="2.5" fill="none" />
        {/* Arms */}
        <path d="M 100 62 L 65 85 L 55 110" stroke="#d8d0c0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 100 62 L 135 85 L 145 110" stroke="#d8d0c0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Legs */}
        <path d="M 92 150 L 82 180" stroke="#d8d0c0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 108 150 L 118 180" stroke="#d8d0c0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'lahm',
    nameAr: 'لَحْمًا',
    nameEn: 'Lahm (Flesh)',
    desc: 'فَكَسَوْنَا الْعِظَامَ لَحْمًا',
    color: '#e8a090',
    bgFrom: '#120808',
    bgTo: '#1a1010',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Fetus with flesh covering bones */}
        <defs>
          <radialGradient id="skin-grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#f0c0a8" />
            <stop offset="70%" stopColor="#d89878" />
            <stop offset="100%" stopColor="#b07060" />
          </radialGradient>
        </defs>
        {/* Body — fetal position */}
        <ellipse cx="100" cy="105" rx="40" ry="50" fill="url(#skin-grad)" opacity="0.9" />
        {/* Head */}
        <circle cx="100" cy="48" r="25" fill="url(#skin-grad)" />
        <circle cx="100" cy="48" r="25" fill="none" stroke="#c8987060" strokeWidth="1" />
        {/* Eyes closed */}
        <path d="M 90 45 Q 93 43 96 45" stroke="#a07060" strokeWidth="1.5" fill="none" />
        <path d="M 104 45 Q 107 43 110 45" stroke="#a07060" strokeWidth="1.5" fill="none" />
        {/* Curled arms */}
        <path d="M 70 85 Q 60 95 65 110 Q 70 115 80 110" stroke="#d8a088" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M 130 85 Q 140 95 135 110 Q 130 115 120 110" stroke="#d8a088" strokeWidth="8" fill="none" strokeLinecap="round" />
        {/* Curled legs */}
        <path d="M 85 140 Q 75 155 80 165 Q 90 170 95 160" stroke="#d8a088" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M 115 140 Q 125 155 120 165 Q 110 170 105 160" stroke="#d8a088" strokeWidth="9" fill="none" strokeLinecap="round" />
        {/* Umbilical connection */}
        <path d="M 100 155 Q 95 170 100 185" stroke="#c87868" strokeWidth="3" fill="none" />
      </svg>
    ),
  },
];

export default function EmbryologyVisual({ className }: MiracleVisualProps) {
  const [activeStage, setActiveStage] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % stages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const stage = stages[activeStage];

  return (
    <div className={`relative w-full h-full overflow-hidden flex flex-col ${className || ''}`}
      style={{ background: `linear-gradient(135deg, ${stage.bgFrom}, ${stage.bgTo})` }}
    >
      {/* Stage visualization */}
      <div className="flex-1 flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6 }}
            className="w-48 h-48 md:w-64 md:h-64"
          >
            {/* Pulsing glow */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full blur-xl"
              style={{ backgroundColor: stage.color + '30' }}
            />
            {stage.svg}
          </motion.div>
        </AnimatePresence>

        {/* Stage name */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.id + '-label'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-4 left-0 right-0 text-center"
          >
            <p className="font-amiri text-3xl font-bold" style={{ color: stage.color, textShadow: `0 0 20px ${stage.color}40` }}>
              {stage.nameAr}
            </p>
            <p className="text-text-secondary text-sm font-tajawal mt-1">{stage.nameEn}</p>
            <p className="text-text-muted text-xs font-tajawal mt-0.5">{stage.desc}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stage navigation dots */}
      <div className="flex justify-center gap-3 pb-4">
        {stages.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setActiveStage(i); setAutoPlay(false); }}
            className="relative group"
          >
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${i === activeStage ? 'scale-125' : 'scale-100 opacity-40 hover:opacity-70'}`}
              style={{ backgroundColor: s.color }}
            />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-amiri opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: s.color }}>
              {s.nameAr}
            </span>
          </button>
        ))}
      </div>

      {/* Arrow indicator */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col items-center gap-1 opacity-30">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${i <= activeStage ? 'bg-gold-primary' : 'bg-border-subtle'}`} />
            {i < stages.length - 1 && <div className="w-px h-3 bg-border-subtle" />}
          </div>
        ))}
      </div>
    </div>
  );
}
