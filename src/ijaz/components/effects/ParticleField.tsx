import { useMemo } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions, Engine } from '@tsparticles/engine';

interface ParticleFieldProps {
  variant?: 'stars' | 'gold-dust' | 'divine-light' | 'nebula' | 'geometric';
  className?: string;
  density?: number;
  speed?: number;
  interactive?: boolean;
}

// Module-level stable init callback — ParticlesProvider requires the same
// function reference across the whole app lifecycle (it manages a global engine).
const particlesInit = async (engine: Engine) => {
  await loadSlim(engine);
};

export default function ParticleField({
  variant = 'stars',
  className = '',
  density = 1,
  speed = 1,
  interactive = true,
}: ParticleFieldProps) {

  const options = useMemo((): ISourceOptions => {
    const baseConfig: Record<string, ISourceOptions> = {
      stars: {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          number: { value: Math.round(120 * density), density: { enable: true } },
          color: { value: ['#d4a853', '#ffffff', '#2dd4a8', '#a855f7', '#4a90d9'] },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.1, max: 0.8 },
            animation: { enable: true, speed: 0.5 * speed, sync: false },
          },
          size: {
            value: { min: 0.5, max: 2.5 },
            animation: { enable: true, speed: 1 * speed, sync: false },
          },
          move: {
            enable: true,
            speed: 0.3 * speed,
            direction: 'none' as const,
            random: true,
            straight: false,
            outModes: { default: 'bounce' as const },
          },
          links: {
            enable: false,
          },
          twinkle: {
            particles: { enable: true, frequency: 0.05, color: { value: '#d4a853' }, opacity: 1 },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: interactive, mode: 'grab' },
          },
          modes: {
            grab: { distance: 150, links: { opacity: 0.3, color: '#d4a853' } },
          },
        },
        detectRetina: true,
      },
      'gold-dust': {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          number: { value: Math.round(80 * density), density: { enable: true } },
          color: { value: ['#d4a853', '#f0d078', '#b8902e', '#fff4d6'] },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.2, max: 0.7 },
            animation: { enable: true, speed: 0.8 * speed, sync: false },
          },
          size: {
            value: { min: 1, max: 4 },
            animation: { enable: true, speed: 2 * speed, sync: false },
          },
          move: {
            enable: true,
            speed: 0.8 * speed,
            direction: 'top' as const,
            random: true,
            straight: false,
            outModes: { default: 'out' as const },
            gravity: { enable: true, acceleration: -0.05, maxSpeed: 1 },
          },
          wobble: {
            enable: true,
            distance: 10,
            speed: 5,
          },
        },
        interactivity: {
          events: {
            onHover: { enable: interactive, mode: 'repulse' },
          },
          modes: {
            repulse: { distance: 100, speed: 0.5 },
          },
        },
        detectRetina: true,
      },
      'divine-light': {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          number: { value: Math.round(40 * density), density: { enable: true } },
          color: { value: ['#2dd4a8', '#10b981', '#34d399'] },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.1, max: 0.5 },
            animation: { enable: true, speed: 0.3 * speed, sync: false },
          },
          size: {
            value: { min: 2, max: 8 },
            animation: { enable: true, speed: 1.5 * speed, sync: false },
          },
          move: {
            enable: true,
            speed: 0.5 * speed,
            direction: 'none' as const,
            random: true,
            straight: false,
            outModes: { default: 'bounce' as const },
          },
          shadow: {
            enable: true,
            color: '#2dd4a8',
            blur: 15,
            offset: { x: 0, y: 0 },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: interactive, mode: 'bubble' },
          },
          modes: {
            bubble: { distance: 200, size: 12, duration: 2, opacity: 0.8 },
          },
        },
        detectRetina: true,
      },
      nebula: {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          number: { value: Math.round(60 * density), density: { enable: true } },
          color: { value: ['#4a90d9', '#a855f7', '#1a1040', '#0d2137'] },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.05, max: 0.3 },
            animation: { enable: true, speed: 0.2 * speed, sync: false },
          },
          size: {
            value: { min: 10, max: 50 },
            animation: { enable: true, speed: 2 * speed, sync: false },
          },
          move: {
            enable: true,
            speed: 0.2 * speed,
            direction: 'none' as const,
            random: true,
            straight: false,
            outModes: { default: 'bounce' as const },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: false },
          },
        },
        detectRetina: true,
      },
      geometric: {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          number: { value: Math.round(50 * density), density: { enable: true } },
          color: { value: '#d4a853' },
          shape: {
            type: ['polygon'] as any,
            options: {
              polygon: { sides: 8 },
            },
          },
          opacity: {
            value: { min: 0.1, max: 0.4 },
            animation: { enable: true, speed: 0.5 * speed, sync: false },
          },
          size: {
            value: { min: 3, max: 8 },
            animation: { enable: true, speed: 1 * speed, sync: false },
          },
          move: {
            enable: true,
            speed: 0.4 * speed,
            direction: 'none' as const,
            random: true,
            straight: false,
            outModes: { default: 'bounce' as const },
          },
          rotate: {
            value: { min: 0, max: 360 },
            animation: { enable: true, speed: 3, sync: false },
          },
          links: {
            enable: true,
            distance: 150,
            color: '#d4a853',
            opacity: 0.15,
            width: 1,
          },
        },
        interactivity: {
          events: {
            onHover: { enable: interactive, mode: 'grab' },
          },
          modes: {
            grab: { distance: 200, links: { opacity: 0.4, color: '#d4a853' } },
          },
        },
        detectRetina: true,
      },
    };

    return baseConfig[variant] || baseConfig.stars;
  }, [variant, density, speed, interactive]);

  return (
    <div className={`absolute inset-0 ${className}`}>
      <ParticlesProvider init={particlesInit}>
        <Particles
          id={`particles-${variant}`}
          options={options}
          className="absolute inset-0"
        />
      </ParticlesProvider>
    </div>
  );
}
