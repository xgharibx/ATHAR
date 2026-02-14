import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function Starfield(props: { count?: number }) {
  const ref = React.useRef<THREE.Points>(null!);
  const count = props.count ?? 1800;

  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
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

export default function NoorStarfield() {
  const [enabled, setEnabled] = React.useState(true);

  if (!enabled) return null;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 3], fov: 60 }}
      style={{ position: "absolute", inset: 0 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        const onLost = () => setEnabled(false);
        canvas.addEventListener("webglcontextlost", onLost, { once: true });
      }}
    >
      <ambientLight intensity={0.7} />
      <Starfield />
    </Canvas>
  );
}
