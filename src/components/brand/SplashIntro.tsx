import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ─── Session key ────────────────────────────────────────────────────── */
export const SPLASH_SESSION_KEY = "athar_splash_shown";

/* ─── Inline keyframes ───────────────────────────────────────────────── */
const CSS = `
  @keyframes _aFadeUp {
    0%   { opacity: 0; transform: translateY(24px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes _aTagline {
    0%   { opacity: 0; transform: translateY(14px); }
    100% { opacity: 0.70; transform: translateY(0); }
  }
  @keyframes _aShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

export function SplashIntro({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const exit = setTimeout(() => setVisible(false), 2400);
    const done = setTimeout(onDone, 3100);
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
            background: "#2F4F37",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            direction: "rtl",
            overflow: "hidden",
          }}
        >
          <style>{CSS}</style>

          {/* App name */}
          <div
            style={{
              fontFamily: "'Noto Naskh Arabic','Noto Sans Arabic',Tahoma,serif",
              fontSize: "clamp(72px, 22vw, 120px)",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: "transparent",
              backgroundImage:
                "linear-gradient(120deg, #c8a84b 0%, #f0d480 40%, #c8a84b 60%, #e8c55a 100%)",
              backgroundSize: "400px 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              animation: "_aFadeUp 0.8s cubic-bezier(.22,1,.36,1) 0.15s both, _aShimmer 3s linear 1s infinite",
              textRendering: "optimizeLegibility",
            }}
          >
            أثر
          </div>

          {/* Tagline */}
          <div
            style={{
              fontFamily: "'Noto Naskh Arabic','Noto Sans Arabic',Tahoma,serif",
              fontSize: "clamp(15px, 4vw, 20px)",
              fontWeight: 400,
              color: "#e8d5a0",
              opacity: 0,
              letterSpacing: 0.3,
              animation: "_aTagline 0.8s ease-out 0.55s both",
            }}
          >
            همسة تطمئن قلبك، وتترك أثرًا.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
