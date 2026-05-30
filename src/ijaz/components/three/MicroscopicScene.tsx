
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function DNAStrand() {
  const groupRef = useRef<THREE.Group>(null);
  const strandCount = 30;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  const strands = useMemo(() => {
    return Array.from({ length: strandCount }, (_, i) => {
      const t = (i / strandCount) * Math.PI * 4;
      const y = (i / strandCount) * 10 - 5;
      const x1 = Math.cos(t) * 1.5;
      const z1 = Math.sin(t) * 1.5;
      const x2 = Math.cos(t + Math.PI) * 1.5;
      const z2 = Math.sin(t + Math.PI) * 1.5;
      return { y, x1, z1, x2, z2, key: i };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {strands.map(({ y, x1, z1, x2, z2, key }) => (
        <group key={key}>
          {/* Backbone sphere 1 */}
          <mesh position={[x1, y, z1]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color="#2dd4a8"
              emissive="#2dd4a8"
              emissiveIntensity={0.5}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>
          {/* Backbone sphere 2 */}
          <mesh position={[x2, y, z2]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color="#4A90D9"
              emissive="#4A90D9"
              emissiveIntensity={0.5}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>
          {/* Connecting "rung" */}
          {key % 3 === 0 && (
            <mesh
              position={[(x1 + x2) / 2, y, (z1 + z2) / 2]}
              rotation={[0, Math.atan2(z2 - z1, x2 - x1) + Math.PI / 2, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.03, 0.03, 3, 8]} />
              <meshStandardMaterial
                color="#d4a853"
                emissive="#d4a853"
                emissiveIntensity={0.3}
                transparent
                opacity={0.6}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function CellParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 2000;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      const positionAttr = pointsRef.current.geometry.attributes.position;
      const posArray = positionAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i * 0.1) * 0.002;
      }
      positionAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#2dd4a8" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function CellMembrane() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05);
    }
  });

  return (
    <Float speed={0.5} rotationIntensity={0.1}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[4, 64, 64]} />
        <meshStandardMaterial
          color="#0d2137"
          emissive="#2dd4a8"
          emissiveIntensity={0.05}
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function Nucleus() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.3}>
      <mesh ref={meshRef} position={[3, 0, -3]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color="#1a1040"
          emissive="#a855f7"
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>
    </Float>
  );
}

export default function MicroscopicScene() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.15} />
        <pointLight position={[5, 5, 5]} intensity={0.6} color="#2dd4a8" />
        <pointLight position={[-5, -3, 3]} intensity={0.4} color="#4A90D9" />
        <pointLight position={[0, 0, 8]} intensity={0.3} color="#d4a853" />

        <DNAStrand />
        <CellParticles />
        <CellMembrane />
        <Nucleus />
      </Canvas>
    </div>
  );
}
