import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ─── Particle layout (offsets from center) ──────────────────────────── */
const PARTICLES: { x: number; y: number; size: number; delay: number; dur: number }[] = [
  { x: -148, y: -72,  size: 3, delay: 0.20, dur: 2.2 },
  { x:  118, y: -118, size: 2, delay: 0.50, dur: 1.9 },
  { x:  168, y:   28, size: 4, delay: 0.80, dur: 2.5 },
  { x: -108, y:  104, size: 2, delay: 0.30, dur: 2.1 },
  { x:   82, y:  136, size: 3, delay: 1.00, dur: 2.3 },
  { x:  -64, y: -156, size: 2, delay: 0.60, dur: 2.0 },
  { x:  210, y:  -58, size: 2, delay: 1.20, dur: 2.1 },
  { x: -192, y:   18, size: 3, delay: 0.40, dur: 2.4 },
  { x:   42, y: -178, size: 2, delay: 0.90, dur: 2.0 },
  { x:  -22, y:  188, size: 3, delay: 0.70, dur: 2.2 },
  { x:  138, y:  -96, size: 2, delay: 1.10, dur: 1.7 },
  { x: -166, y:  -42, size: 2, delay: 0.45, dur: 2.6 },
  { x:   -8, y:  -96, size: 2, delay: 1.40, dur: 2.0 },
  { x:  240, y:   60, size: 2, delay: 0.65, dur: 2.3 },
  { x: -230, y:  -90, size: 2, delay: 1.30, dur: 2.1 },
];

/* ─── Inline CSS (zero extra bundle) ─────────────────────────────────── */
const SPLASH_CSS = `
  @keyframes _sRing {
    0%   { transform: translate(-50%, -50%) scale(0.45); opacity: 0.75; }
    100% { transform: translate(-50%, -50%) scale(3.2);  opacity: 0; }
  }
  @keyframes _sPart {
    0%   { opacity: 0; transform: scale(0); }
    25%  { opacity: 1; transform: scale(1); }
    75%  { opacity: 0.9; transform: scale(1) translateY(-6px); }
    100% { opacity: 0; transform: scale(0.4) translateY(-14px); }
  }
  @keyframes _sFloat {
    0%, 100% { transform: translateY(0px)   scale(1);    }
    50%       { transform: translateY(-11px) scale(1.03); }
  }
  @keyframes _sEnter {
    0%   { opacity: 0; transform: scale(0.68) translateY(16px); }
    60%  { opacity: 1; transform: scale(1.04) translateY(-2px); }
    100% { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes _sTagline {
    0%   { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes _sGlow {
    0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1);    }
    50%       { opacity: 0.80; transform: translate(-50%, -50%) scale(1.18); }
  }
`;

/* ─── Component ──────────────────────────────────────────────────────── */
export const SPLASH_SESSION_KEY = "athar_splash_shown";

export function SplashIntro({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const exit = setTimeout(() => setVisible(false), 2800);
    const done = setTimeout(onDone, 3500);
    return () => { clearTimeout(exit); clearTimeout(done); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: "easeOut" } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0a0c12",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <style>{SPLASH_CSS}</style>

          {/* ── Pulsing sonar rings ── */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: "50%",
                border: "1.5px solid rgba(126,200,164,0.55)",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) scale(0.45)",
                animation: `_sRing 2.6s cubic-bezier(.2,.8,.4,1) ${i * 0.65}s infinite`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* ── Ambient glow behind logo ── */}
          <div
            style={{
              position: "absolute",
              width: 340,
              height: 340,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(126,200,164,0.22) 0%, rgba(47,79,55,0.10) 50%, transparent 72%)",
              filter: "blur(18px)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) scale(1)",
              animation: "_sGlow 4s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* ── Sparkle particles ── */}
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: "rgba(126,200,164,0.95)",
                left: `calc(50% + ${p.x}px)`,
                top: `calc(50% + ${p.y}px)`,
                boxShadow: `0 0 ${p.size * 3}px rgba(126,200,164,0.7)`,
                animation: `_sPart ${p.dur}s ease-in-out ${p.delay}s infinite`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* ── Logo ── */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              animation: "_sEnter 0.75s cubic-bezier(.22,1,.36,1) forwards, _sFloat 3.6s ease-in-out 0.9s infinite",
            }}
          >
            <svg
              viewBox="0 0 512 512"
              width={220}
              height={220}
              xmlns="http://www.w3.org/2000/svg"
              aria-label="أثر"
            >
              <defs>
                <radialGradient id="sg" cx="50%" cy="42%" r="60%">
                  <stop offset="0" stopColor="#7EC8A4" stopOpacity="0.50" />
                  <stop offset="1" stopColor="#7EC8A4" stopOpacity="0" />
                </radialGradient>
                <filter id="ss" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" />
                </filter>
                <filter id="sd" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#000" floodOpacity="0.40" />
                </filter>
                <filter id="sglow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* BG */}
              <rect width="512" height="512" fill="#0a0c12" />
              <rect width="512" height="512" fill="url(#sg)" />

              {/* Fingerprint */}
              <g transform="translate(256 228)" filter="url(#sd)">
                <circle r="116" fill="#7EC8A4" fillOpacity="0.10" />
                <g
                  fill="none"
                  stroke="#7EC8A4"
                  strokeOpacity="0.92"
                  strokeLinecap="round"
                  filter="url(#ss)"
                >
                  <path d="M -86 -4 C -56 -66, 56 -66, 86 -4"  strokeWidth="6.5" />
                  <path d="M -92 18 C -60 -56, 60 -56, 92 18"  strokeWidth="5.5" />
                  <path d="M -86 42 C -54 -38, 54 -38, 86 42"  strokeWidth="5" />
                  <path d="M -72 66 C -42 -22, 42 -22, 72 66"  strokeWidth="4.5" />
                  <path d="M -52 86 C -28 -8,  28 -8,  52 86"  strokeWidth="4" />
                  <path d="M -28 102 C -14 18, 14 18, 28 102"  strokeWidth="3.5" />
                </g>
              </g>

              {/* App name */}
              <g filter="url(#sglow)">
                <text
                  x="256"
                  y="380"
                  textAnchor="middle"
                  fontFamily="'Noto Naskh Arabic','Noto Sans Arabic',Tahoma,Arial,sans-serif"
                  fontSize="112"
                  fontWeight="700"
                  fill="#f0ece4"
                  textRendering="optimizeLegibility"
                >
                  أثر
                </text>
              </g>
            </svg>
          </div>

          {/* ── Tagline (HTML for crisp Arabic rendering) ── */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              marginTop: 8,
              color: "rgba(240,236,228,0.60)",
              fontSize: 15,
              fontFamily: "'Noto Naskh Arabic','Noto Sans Arabic',Tahoma,Arial,sans-serif",
              direction: "rtl",
              letterSpacing: 0.2,
              animation: "_sTagline 0.8s ease-out 0.5s both",
            }}
          >
            همسة تطمئن قلبك، وتترك أثرًا.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
