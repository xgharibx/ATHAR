
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================
// Custom GLSL Shaders for extreme visual effects
// =============================================

const vertexShader = `
  uniform float uTime;
  uniform float uFrequency;
  uniform float uAmplitude;
  
  attribute float aRandom;
  attribute float aSize;
  
  varying float vRandom;
  varying vec3 vPosition;
  varying float vAlpha;
  
  void main() {
    vRandom = aRandom;
    vPosition = position;
    
    vec3 pos = position;
    
    // Organic wave motion
    float wave1 = sin(pos.x * uFrequency + uTime * 0.5) * uAmplitude;
    float wave2 = cos(pos.y * uFrequency * 0.8 + uTime * 0.3) * uAmplitude * 0.7;
    float wave3 = sin(pos.z * uFrequency * 0.6 + uTime * 0.7) * uAmplitude * 0.5;
    
    pos.x += wave2 + wave3 * aRandom;
    pos.y += wave1 + wave3 * (1.0 - aRandom);
    pos.z += wave1 * 0.5 + wave2 * aRandom;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size attenuation
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    // Distance-based alpha
    float dist = length(pos);
    vAlpha = smoothstep(20.0, 0.0, dist) * (0.5 + 0.5 * aRandom);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  
  varying float vRandom;
  varying vec3 vPosition;
  varying float vAlpha;
  
  void main() {
    // Soft circle shape
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;
    
    float softEdge = 1.0 - smoothstep(0.2, 0.5, dist);
    
    // Color mixing based on random + position
    vec3 color = mix(uColor1, uColor2, vRandom);
    color = mix(color, uColor3, sin(vPosition.x * 0.5 + uTime * 0.2) * 0.5 + 0.5);
    
    // Pulsing glow
    float pulse = sin(uTime * 2.0 + vRandom * 6.28) * 0.3 + 0.7;
    
    gl_FragColor = vec4(color, softEdge * vAlpha * pulse);
  }
`;

// Nebula volume shader
const nebulaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uOpacity;
  
  varying vec2 vUv;
  
  // Simplex noise approximation
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vec2 uv = vUv - 0.5;
    float t = uTime * 0.1;
    
    // Multi-octave noise for nebula clouds
    float n1 = snoise(vec3(uv * 3.0, t)) * 0.5;
    float n2 = snoise(vec3(uv * 6.0, t * 1.3)) * 0.25;
    float n3 = snoise(vec3(uv * 12.0, t * 1.7)) * 0.125;
    float noise = n1 + n2 + n3;
    
    // Radial falloff
    float radial = 1.0 - length(uv) * 1.5;
    radial = smoothstep(0.0, 1.0, radial);
    
    // Color gradient
    vec3 color = mix(uColor1, uColor2, noise + 0.5);
    
    float alpha = noise * radial * uOpacity;
    alpha = max(alpha, 0.0);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// =============================================
// COMPONENTS
// =============================================

function ShaderParticleCloud({
  count = 5000,
  color1 = new THREE.Color('#d4a853'),
  color2 = new THREE.Color('#4a90d9'),
  color3 = new THREE.Color('#2dd4a8'),
  spread = 15,
  frequency = 0.5,
  amplitude = 0.8,
}: {
  count?: number;
  color1?: THREE.Color;
  color2?: THREE.Color;
  color3?: THREE.Color;
  spread?: number;
  frequency?: number;
  amplitude?: number;
}) {
  const meshRef = useRef<THREE.Points>(null);
  
  const { positions, randoms, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    const sz = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Spherical distribution with density falloff
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * spread;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      rand[i] = Math.random();
      sz[i] = Math.random() * 3 + 1;
    }
    
    return { positions: pos, randoms: rand, sizes: sz };
  }, [count, spread]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFrequency: { value: frequency },
    uAmplitude: { value: amplitude },
    uColor1: { value: color1 },
    uColor2: { value: color2 },
    uColor3: { value: color3 },
  }), [frequency, amplitude, color1, color2, color3]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function NebulaPlane({
  color1 = new THREE.Color('#1a1040'),
  color2 = new THREE.Color('#0d2137'),
  opacity = 0.4,
  scale = 30,
  position = [0, 0, -5] as [number, number, number],
}: {
  color1?: THREE.Color;
  color2?: THREE.Color;
  opacity?: number;
  scale?: number;
  position?: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: color1 },
    uColor2: { value: color2 },
    uOpacity: { value: opacity },
  }), [color1, color2, opacity]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[scale, scale]} />
      <shaderMaterial
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function FloatingOrbs({ count = 8 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const orbs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
      ] as [number, number, number],
      scale: Math.random() * 0.5 + 0.2,
      color: ['#d4a853', '#4a90d9', '#2dd4a8', '#a855f7'][i % 4],
      speed: Math.random() * 0.5 + 0.5,
      offset: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const orb = orbs[i];
        child.position.y = orb.position[1] + Math.sin(state.clock.elapsedTime * orb.speed + orb.offset) * 2;
        child.position.x = orb.position[0] + Math.cos(state.clock.elapsedTime * orb.speed * 0.7 + orb.offset) * 1.5;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position} scale={orb.scale}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.15}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// =============================================
// MAIN EXPORT: Shader Background Scene
// =============================================

interface ShaderBackgroundProps {
  variant?: 'cosmic' | 'divine' | 'deep' | 'golden';
  className?: string;
  intensity?: number;
}

export default function ShaderBackground({
  variant = 'cosmic',
  className = '',
  intensity = 1,
}: ShaderBackgroundProps) {
  const configs = {
    cosmic: {
      particleCount: Math.round(6000 * intensity),
      color1: new THREE.Color('#d4a853'),
      color2: new THREE.Color('#4a90d9'),
      color3: new THREE.Color('#a855f7'),
      nebulaColor1: new THREE.Color('#1a1040'),
      nebulaColor2: new THREE.Color('#0d2137'),
      spread: 18,
    },
    divine: {
      particleCount: Math.round(4000 * intensity),
      color1: new THREE.Color('#2dd4a8'),
      color2: new THREE.Color('#10b981'),
      color3: new THREE.Color('#d4a853'),
      nebulaColor1: new THREE.Color('#0a2020'),
      nebulaColor2: new THREE.Color('#0d2137'),
      spread: 15,
    },
    deep: {
      particleCount: Math.round(8000 * intensity),
      color1: new THREE.Color('#4a90d9'),
      color2: new THREE.Color('#1a1040'),
      color3: new THREE.Color('#a855f7'),
      nebulaColor1: new THREE.Color('#050510'),
      nebulaColor2: new THREE.Color('#0d0d2e'),
      spread: 22,
    },
    golden: {
      particleCount: Math.round(5000 * intensity),
      color1: new THREE.Color('#d4a853'),
      color2: new THREE.Color('#f0d078'),
      color3: new THREE.Color('#b8902e'),
      nebulaColor1: new THREE.Color('#1a1508'),
      nebulaColor2: new THREE.Color('#0f0d0a'),
      spread: 16,
    },
  };

  const config = configs[variant];

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 75 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <ShaderParticleCloud
          count={config.particleCount}
          color1={config.color1}
          color2={config.color2}
          color3={config.color3}
          spread={config.spread}
        />
        <NebulaPlane
          color1={config.nebulaColor1}
          color2={config.nebulaColor2}
          opacity={0.3}
          scale={35}
          position={[0, 0, -8]}
        />
        <NebulaPlane
          color1={config.nebulaColor2}
          color2={config.color1}
          opacity={0.15}
          scale={25}
          position={[5, 3, -12]}
        />
        <FloatingOrbs count={10} />
      </Canvas>
    </div>
  );
}
