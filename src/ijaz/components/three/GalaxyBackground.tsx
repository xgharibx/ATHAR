
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField({ count = 5000, color = '#d4a853' }: { count?: number; color?: string }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 20;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.015;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color={color} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function GlowingOrb({ position, color, size = 0.3 }: { position: [number, number, number]; color: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.15);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={position}>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </Float>
  );
}

export default function GalaxyBackground() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.05} />
        <pointLight position={[0, 0, 5]} intensity={0.3} color="#d4a853" />

        <Stars radius={200} depth={80} count={6000} factor={3} saturation={0} fade speed={0.3} />
        <ParticleField count={3000} color="#d4a853" />
        <ParticleField count={2000} color="#4A90D9" />

        <GlowingOrb position={[-5, 3, -8]} color="#4A90D9" size={0.2} />
        <GlowingOrb position={[6, -2, -10]} color="#d4a853" size={0.25} />
        <GlowingOrb position={[-3, -4, -6]} color="#2dd4a8" size={0.15} />
        <GlowingOrb position={[4, 4, -12]} color="#a855f7" size={0.3} />
        <GlowingOrb position={[0, -5, -15]} color="#F59E0B" size={0.2} />
      </Canvas>
    </div>
  );
}
