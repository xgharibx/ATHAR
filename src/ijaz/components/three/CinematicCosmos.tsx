
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// =============================================
// Ultra-immersive cinematic cosmic background
// =============================================

// Volumetric nebula cloud using custom shaders
function VolumetricNebula() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  const vertShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragShader = `
    uniform float uTime;
    varying vec2 vUv;
    
    // FBM noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec2 uv = vUv - 0.5;
      float t = uTime * 0.05;
      
      // Warped domain FBM for organic clouds
      vec2 q = vec2(fbm(uv + t * 0.1), fbm(uv + vec2(1.7, 9.2)));
      vec2 r = vec2(fbm(uv + q * 4.0 + vec2(1.7, 9.2) + t * 0.15), fbm(uv + q * 4.0 + vec2(8.3, 2.8) + t * 0.126));
      float f = fbm(uv + r * 4.0);
      
      // Color palette
      vec3 col1 = vec3(0.1, 0.05, 0.2);   // Deep purple
      vec3 col2 = vec3(0.05, 0.1, 0.25);   // Deep blue
      vec3 col3 = vec3(0.83, 0.66, 0.33);  // Gold
      vec3 col4 = vec3(0.18, 0.83, 0.66);  // Divine green
      
      vec3 color = mix(col1, col2, clamp(f * f * 4.0, 0.0, 1.0));
      color = mix(color, col3, clamp(length(q), 0.0, 1.0) * 0.3);
      color = mix(color, col4, clamp(length(r.x), 0.0, 1.0) * 0.15);
      
      // Radial fade
      float radial = 1.0 - length(uv) * 1.4;
      radial = smoothstep(0.0, 0.8, radial);
      
      float alpha = (f * f * f + 0.6 * f * f + 0.5 * f) * radial * 0.35;
      
      gl_FragColor = vec4(color, alpha);
    }
  `;

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -15]}>
      <planeGeometry args={[120, 80]} />
      <shaderMaterial
        vertexShader={vertShader}
        fragmentShader={fragShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Animated constellation lines
function ConstellationWeb({ count = 200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const { positions, linePositions, lineCount } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const stars: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 25;
      const z = (Math.random() - 0.5) * 15 - 5;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      stars.push(new THREE.Vector3(x, y, z));
    }
    
    // Connect nearby stars
    const lines: number[] = [];
    const maxDist = 4;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (stars[i].distanceTo(stars[j]) < maxDist) {
          lines.push(
            stars[i].x, stars[i].y, stars[i].z,
            stars[j].x, stars[j].y, stars[j].z
          );
        }
      }
    }
    
    return {
      positions: pos,
      linePositions: new Float32Array(lines),
      lineCount: lines.length / 6,
    };
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
      pointsRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.03) * 0.05;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
      linesRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.03) * 0.05;
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#d4a853"
          size={0.08}
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lineCount * 2}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#d4a853"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

// Glowing divine orbs
function DivineOrbs() {
  const orbsData = useMemo(() => [
    { pos: [-8, 4, -6] as [number, number, number], color: '#d4a853', scale: 1.2, speed: 0.4 },
    { pos: [10, -3, -8] as [number, number, number], color: '#4a90d9', scale: 0.8, speed: 0.6 },
    { pos: [-5, -6, -4] as [number, number, number], color: '#2dd4a8', scale: 1.0, speed: 0.5 },
    { pos: [7, 5, -10] as [number, number, number], color: '#a855f7', scale: 0.6, speed: 0.7 },
    { pos: [0, 8, -7] as [number, number, number], color: '#f0d078', scale: 0.9, speed: 0.3 },
    { pos: [-12, 0, -9] as [number, number, number], color: '#10b981', scale: 0.7, speed: 0.55 },
  ], []);

  return (
    <>
      {orbsData.map((orb, i) => (
        <Float key={i} speed={orb.speed} rotationIntensity={0.2} floatIntensity={2}>
          <mesh position={orb.pos} scale={orb.scale}>
            <sphereGeometry args={[1, 32, 32]} />
            <MeshDistortMaterial
              color={orb.color}
              transparent
              opacity={0.12}
              distort={0.3}
              speed={2}
              roughness={0}
              metalness={0}
              toneMapped={false}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

// Spiral galaxy arm
function SpiralArm({ particleCount = 3000 }: { particleCount?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const sz = new Float32Array(particleCount);
    
    const goldColor = new THREE.Color('#d4a853');
    const blueColor = new THREE.Color('#4a90d9');
    const whiteColor = new THREE.Color('#ffffff');
    
    for (let i = 0; i < particleCount; i++) {
      // Spiral distribution
      const angle = (i / particleCount) * Math.PI * 8;
      const radius = (i / particleCount) * 15 + Math.random() * 2;
      const armOffset = Math.random() * 1.5 - 0.75;
      
      pos[i * 3] = Math.cos(angle) * radius + armOffset;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 2] = Math.sin(angle) * radius + armOffset - 10;
      
      // Color gradient along arm
      const t = i / particleCount;
      const c = t < 0.5
        ? goldColor.clone().lerp(blueColor, t * 2)
        : blueColor.clone().lerp(whiteColor, (t - 0.5) * 2);
      
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      
      sz[i] = Math.random() * 2 + 0.5;
    }
    
    return { positions: pos, colors: col, sizes: sz };
  }, [particleCount]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = 0.3;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particleCount} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// =============================================
// MAIN EXPORT
// =============================================

interface CinematicCosmosProps {
  className?: string;
  variant?: 'full' | 'minimal' | 'golden';
}

export default function CinematicCosmos({ className = '', variant = 'full' }: CinematicCosmosProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        style={{ background: 'transparent' }}
      >
        {/* Deep space stars */}
        <Stars
          radius={100}
          depth={60}
          count={variant === 'minimal' ? 3000 : 8000}
          factor={4}
          saturation={0.2}
          fade
          speed={0.5}
        />

        {/* Volumetric nebula clouds */}
        <VolumetricNebula />

        {/* Constellation web */}
        {variant !== 'minimal' && <ConstellationWeb count={variant === 'full' ? 200 : 100} />}

        {/* Spiral galaxy arm */}
        {variant === 'full' && <SpiralArm particleCount={3000} />}

        {/* Divine orbs */}
        <DivineOrbs />

        {/* Post-processing */}
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0005, 0.0005)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette
            offset={0.3}
            darkness={0.6}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
