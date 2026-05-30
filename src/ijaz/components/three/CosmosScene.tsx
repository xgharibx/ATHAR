
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

function StarField() {
  return <Stars radius={300} depth={100} count={8000} factor={4} saturation={0.1} fade speed={0.5} />;
}

function ExpandingRings() {
  const groupRef = useRef<THREE.Group>(null);
  const ringsCount = 6;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });

  const rings = useMemo(() => {
    return Array.from({ length: ringsCount }, (_, i) => {
      const radius = 3 + i * 2.5;
      const geometry = new THREE.RingGeometry(radius, radius + 0.02, 128);
      const opacity = 0.3 - i * 0.04;
      return { geometry, opacity, key: i };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {rings.map(({ geometry, opacity, key }) => (
        <mesh key={key} geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#d4a853" transparent opacity={opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function GlowingSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          color="#0d2137"
          emissive="#4A90D9"
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#4A90D9" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </Float>
  );
}

function CosmicParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 3000;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 25;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const cols = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#4A90D9'),
      new THREE.Color('#d4a853'),
      new THREE.Color('#2dd4a8'),
      new THREE.Color('#a855f7'),
      new THREE.Color('#ffffff'),
    ];
    for (let i = 0; i < count; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return cols;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function Nebula() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.01;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={[8, 3, -15]}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial
        color="#1a1040"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function CosmosScene() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#4A90D9" />
        <pointLight position={[-10, -5, 5]} intensity={0.3} color="#d4a853" />

        <StarField />
        <GlowingSphere />
        <ExpandingRings />
        <CosmicParticles />
        <Nebula />
      </Canvas>
    </div>
  );
}
