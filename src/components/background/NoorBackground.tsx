import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useNoorStore } from "@/store/noorStore";

function Starfield(props: { count?: number }) {
  const ref = React.useRef<THREE.Points>(null!);
  const count = props.count ?? 1800;

  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // random points inside a sphere
      const r = Math.random() * 1.8 + 0.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.03;
    ref.current.rotation.x += delta * 0.01;
  });

  return (
    <group>
      <Points ref={ref} positions={positions} stride={3}>
        <PointMaterial
          transparent
          color="#ffd780"
          size={0.006}
          sizeAttenuation
          depthWrite={false}
          opacity={0.85}
        />
      </Points>
    </group>
  );
}

export function NoorBackground() {
  const enable3D = useNoorStore((s) => s.prefs.enable3D);
  const reduceMotion = useNoorStore((s) => s.prefs.reduceMotion);
  const theme = useNoorStore((s) => s.prefs.theme);
  const transparent = useNoorStore((s) => s.prefs.transparentMode);

  const petals = React.useMemo(() => {
    if (reduceMotion) return [];
    if (theme !== "roses") return [];
    const count = 14;
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100;
      const size = 8 + Math.random() * 14;
      const delay = Math.random() * 6;
      const duration = 8 + Math.random() * 6;
      return { i, left, size, delay, duration };
    });
  }, [reduceMotion, theme]);

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

        {/* Live blobs */}
        <div className="absolute inset-0">
          <div
            className="athar-bg-blob"
            style={{
              width: 520,
              height: 520,
              left: "-10%",
              top: "-12%",
              background: "var(--accent)",
              animation: reduceMotion ? undefined : "atharFloatA 14s ease-in-out infinite"
            }}
          />
          <div
            className="athar-bg-blob"
            style={{
              width: 620,
              height: 620,
              right: "-18%",
              top: "8%",
              background: "var(--accent-2)",
              animation: reduceMotion ? undefined : "atharFloatB 18s ease-in-out infinite"
            }}
          />
          <div
            className="athar-bg-blob"
            style={{
              width: 680,
              height: 680,
              left: "15%",
              bottom: "-28%",
              background: "var(--accent)",
              animation: reduceMotion ? undefined : "atharFloatA 22s ease-in-out infinite"
            }}
          />
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

      {/* Optional 3D layer */}
      {enable3D && !reduceMotion ? (
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 3], fov: 60 }}
          style={{ position: "absolute", inset: 0 }}
        >
          <ambientLight intensity={0.7} />
          <Starfield />
        </Canvas>
      ) : null}
    </div>
  );
}
