
import { motion } from 'framer-motion';

const layers = [
  {
    label: 'Probability Problem',
    detail: '1 functional protein by chance = 1 in 10¹⁶⁴',
    icon: '🎲',
    color: '#f472b6',
  },
  {
    label: 'Chicken-and-Egg Problem',
    detail: 'DNA needs proteins; proteins need DNA',
    icon: '🔄',
    color: '#60a5fa',
  },
  {
    label: 'Natural Selection Fails',
    detail: 'Can\'t select before self-replication exists',
    icon: '✗',
    color: '#fb923c',
  },
  {
    label: 'All Naturalistic Models Failed',
    detail: 'RNA World, Vents, Clay, Panspermia → all fail',
    icon: '⚗️',
    color: '#a78bfa',
  },
];

export default function OriginOfLifeVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-10 gap-4 px-6 pb-6 select-none overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a18] via-[#0d1117] to-[#101025] pointer-events-none" />

      {/* Probability display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 rounded-2xl px-5 py-4 text-center"
        style={{ background: 'rgba(244,114,182,0.07)', border: '1px solid rgba(244,114,182,0.25)' }}
      >
        <p className="text-gray-400 text-xs mb-1">Probability of 1 functional protein forming by chance</p>
        <p className="text-white font-mono font-bold text-2xl">
          1 in 10<sup className="text-pink-400">164</sup>
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Atoms in observable universe: 10<sup>80</sup> — that&apos;s <span className="text-pink-400">84 orders of magnitude less</span>
        </p>
      </motion.div>

      {/* Four problem layers */}
      <div className="relative z-10 flex flex-col gap-2 w-full max-w-sm">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.1, duration: 0.45 }}
            className="flex items-start gap-3 rounded-lg px-3 py-2"
            style={{ background: layer.color + '0d', border: `1px solid ${layer.color}30` }}
          >
            <span className="text-base shrink-0 mt-0.5">{layer.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: layer.color }}>{layer.label}</p>
              <p className="text-gray-400 text-xs">{layer.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
