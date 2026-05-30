
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ==================================
// Islamic Geometric Pattern Generator
// Procedural Sacred Geometry in WebGL
// ==================================

const geometricVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Subtle wave
    float wave = sin(pos.x * 2.0 + uTime * 0.3) * cos(pos.y * 2.0 + uTime * 0.2) * 0.05;
    pos.z += wave;
    vElevation = wave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const geometricFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uScale;
  
  varying vec2 vUv;
  varying float vElevation;
  
  #define PI 3.14159265359
  
  // Hexagonal distance
  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.73))), p.x);
  }
  
  // Star pattern
  float star(vec2 p, float n, float r) {
    float an = PI / n;
    float en = PI / n;
    vec2 acs = vec2(cos(an), sin(an));
    vec2 ecs = vec2(cos(en), sin(en));
    float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
    p = length(p) * vec2(cos(bn), abs(sin(bn)));
    p -= r * acs;
    p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
    return length(p) * sign(p.x);
  }
  
  // Islamic 8-fold pattern
  float islamicPattern(vec2 uv) {
    float scale = uScale;
    vec2 p = uv * scale;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    
    float d = 1.0;
    
    // 8-pointed star
    float s = star(f, 8.0, 0.3);
    d = min(d, abs(s) - 0.02);
    
    // Connecting lines
    float line1 = abs(f.x) - 0.01;
    float line2 = abs(f.y) - 0.01;
    float line3 = abs(f.x + f.y) * 0.707 - 0.01;
    float line4 = abs(f.x - f.y) * 0.707 - 0.01;
    
    d = min(d, line1);
    d = min(d, line2);
    d = min(d, line3);
    d = min(d, line4);
    
    return smoothstep(0.02, 0.0, d);
  }
  
  // Octagonal tessellation
  float octagonPattern(vec2 uv) {
    float scale = uScale * 0.7;
    vec2 p = uv * scale;
    
    float hex1 = hexDist(fract(p) - 0.5);
    float hex2 = hexDist(fract(p + 0.5) - 0.5);
    
    float pattern = min(hex1, hex2);
    float lines = smoothstep(0.02, 0.0, abs(pattern - 0.3) - 0.01);
    lines += smoothstep(0.02, 0.0, abs(pattern - 0.2) - 0.01) * 0.5;
    
    return lines;
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Animated UV offset
    uv += vec2(sin(uTime * 0.05), cos(uTime * 0.03)) * 0.02;
    
    // Multi-layer patterns
    float pattern1 = islamicPattern(uv) * 0.6;
    float pattern2 = octagonPattern(uv + vec2(uTime * 0.01)) * 0.3;
    float pattern3 = islamicPattern(uv * 2.0 + 0.25) * 0.15;
    
    float finalPattern = pattern1 + pattern2 + pattern3;
    
    // Pulsing glow
    float pulse = sin(uTime * 0.5) * 0.15 + 0.85;
    
    // Edge glow
    float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edgeFade = smoothstep(0.0, 0.3, edgeDist);
    
    vec3 color = uColor * (1.0 + vElevation * 5.0);
    float alpha = finalPattern * uOpacity * pulse * edgeFade;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

function IslamicGeometryMesh({
  color = '#d4a853',
  opacity = 0.25,
  scale = 8,
  patternScale = 6,
}: {
  color?: string;
  opacity?: number;
  scale?: number;
  patternScale?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uScale: { value: patternScale },
  }), [color, opacity, patternScale]);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[scale, scale, 64, 64]} />
      <shaderMaterial
        vertexShader={geometricVertexShader}
        fragmentShader={geometricFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function FloatingGeometricRing({
  radius = 3,
  color = '#d4a853',
  speed = 0.5,
  yOffset = 0,
}: {
  radius?: number;
  color?: string;
  speed?: number;
  yOffset?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.2 + Math.PI / 2;
      ringRef.current.rotation.z = state.clock.elapsedTime * speed * 0.1;
      ringRef.current.position.y = yOffset + Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.5;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, yOffset, 0]}>
      <torusGeometry args={[radius, 0.02, 16, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} toneMapped={false} />
    </mesh>
  );
}

// =============================================
// MAIN EXPORT: Sacred Geometry Background
// =============================================

interface SacredGeometryProps {
  className?: string;
  color?: string;
  intensity?: number;
}

export default function SacredGeometry({
  className = '',
  color = '#d4a853',
  intensity = 1,
}: SacredGeometryProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 5, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <IslamicGeometryMesh 
          color={color} 
          opacity={0.2 * intensity} 
          scale={20} 
          patternScale={6} 
        />
        <IslamicGeometryMesh 
          color={color} 
          opacity={0.1 * intensity} 
          scale={15} 
          patternScale={4} 
        />
        {[2, 3.5, 5, 6.5].map((r, i) => (
          <FloatingGeometricRing 
            key={i} 
            radius={r} 
            color={color} 
            speed={0.3 + i * 0.1}
            yOffset={i * 0.5 - 1}
          />
        ))}
      </Canvas>
    </div>
  );
}
