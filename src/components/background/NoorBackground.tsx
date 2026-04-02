import * as React from "react";
import { useNoorStore } from "@/store/noorStore";

const NoorStarfield = React.lazy(() => import("@/components/background/NoorStarfield"));

function useIsMobile() {
  const [mobile, setMobile] = React.useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export function NoorBackground() {
  const enable3D = useNoorStore((s) => s.prefs.enable3D);
  const reduceMotion = useNoorStore((s) => s.prefs.reduceMotion);
  const theme = useNoorStore((s) => s.prefs.theme);
  const transparent = useNoorStore((s) => s.prefs.transparentMode);
  const [webglOk, setWebglOk] = React.useState(true);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (reduceMotion || !enable3D) return;
    try {
      const canvas = document.createElement("canvas");
      const gl2 = canvas.getContext("webgl2");
      const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setWebglOk(!!(gl2 || gl1));
    } catch {
      setWebglOk(false);
    }
  }, [enable3D, reduceMotion]);

  const petals = React.useMemo(() => {
    if (reduceMotion) return [];
    if (theme !== "roses") return [];
    const count = isMobile ? 8 : 14;
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100;
      const size = 8 + Math.random() * 14;
      const delay = Math.random() * 6;
      const duration = 8 + Math.random() * 6;
      return { i, left, size, delay, duration };
    });
  }, [reduceMotion, theme, isMobile]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {/* Always-on gradient layer */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 600px at 18% 10%, var(--accent), transparent 62%), radial-gradient(900px 650px at 82% 28%, var(--accent-2), transparent 60%), radial-gradient(900px 700px at 50% 120%, var(--accent), transparent 62%)",
            opacity: transparent ? 0.22 : 0.14
          }}
        />

        {/* Live blobs — reduced on mobile for performance */}
        <div className="absolute inset-0">
          <div
            className="athar-bg-blob"
            style={{
              width: isMobile ? 320 : 520,
              height: isMobile ? 320 : 520,
              left: "-10%",
              top: "-12%",
              background: "var(--accent)",
              animation: reduceMotion ? undefined : "atharFloatA 14s ease-in-out infinite",
              contain: "layout style",
            }}
          />
          <div
            className="athar-bg-blob"
            style={{
              width: isMobile ? 380 : 620,
              height: isMobile ? 380 : 620,
              right: "-18%",
              top: "8%",
              background: "var(--accent-2)",
              animation: reduceMotion ? undefined : "atharFloatB 18s ease-in-out infinite",
              contain: "layout style",
            }}
          />
          {!isMobile && (
            <div
              className="athar-bg-blob"
              style={{
                width: 680,
                height: 680,
                left: "15%",
                bottom: "-28%",
                background: "var(--accent)",
                animation: reduceMotion ? undefined : "atharFloatA 22s ease-in-out infinite",
                contain: "layout style",
              }}
            />
          )}
        </div>

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,8,11,.00) 0%, rgba(7,8,11,.35) 35%, rgba(7,8,11,.75) 72%, rgba(7,8,11,.95) 100%)"
          }}
        />
      </div>

      {/* Roses petals overlay */}
      {petals.length ? (
        <div className="absolute inset-0 overflow-hidden">
          {petals.map((p) => (
            <div
              key={p.i}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                top: -140,
                width: p.size,
                height: p.size * 1.4,
                borderRadius: "9999px",
                background: "var(--accent)",
                opacity: 0.35,
                filter: "blur(0.2px)",
                animation: `atharFall ${p.duration}s linear ${p.delay}s infinite`
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Optional 3D layer — reduced on mobile instead of fully disabled */}
      {enable3D && !reduceMotion && webglOk ? (
        <React.Suspense fallback={null}>
          <NoorStarfield mobile={isMobile} />
        </React.Suspense>
      ) : null}
    </div>
  );
}
