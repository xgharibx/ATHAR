
import { TypeAnimation } from 'react-type-animation';

// =============================================
// Cinematic typewriter text component
// =============================================

interface CinematicTypewriterProps {
  sequences: (string | number)[];
  className?: string;
  speed?: number;
  cursor?: boolean;
  repeat?: number;
  wrapper?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
}

export function CinematicTypewriter({
  sequences,
  className = '',
  speed = 50,
  cursor = true,
  repeat = Infinity,
  wrapper = 'span',
}: CinematicTypewriterProps) {
  return (
    <TypeAnimation
      sequence={sequences}
      wrapper={wrapper}
      speed={speed as any}
      repeat={repeat}
      cursor={cursor}
      className={className}
    />
  );
}

// =============================================
// Glitch Text Effect
// =============================================

interface GlitchTextProps {
  text: string;
  className?: string;
}

export function GlitchText({ text, className = '' }: GlitchTextProps) {
  return (
    <span className={`glitch-text ${className}`} data-text={text}>
      {text}
    </span>
  );
}

// =============================================
// Gradient Text with Animation
// =============================================

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}

export function AnimatedGradientText({
  children,
  className = '',
  colors = ['#d4a853', '#f0d078', '#2dd4a8', '#4a90d9', '#a855f7', '#d4a853'],
}: AnimatedGradientTextProps) {
  const gradient = colors.join(', ');
  
  return (
    <span
      className={`animated-gradient-text ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradient})`,
        backgroundSize: '300% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'gradient-shift 8s ease infinite',
      }}
    >
      {children}
    </span>
  );
}

// =============================================
// Morphing Number Display
// =============================================

interface MorphingNumberProps {
  value: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function MorphingNumber({
  value,
  className = '',
  suffix = '',
  prefix = '',
}: MorphingNumberProps) {
  const digits = value.toString().split('');
  
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      {prefix && <span className="text-[0.5em] opacity-70 ml-1">{prefix}</span>}
      {digits.map((digit, i) => (
        <span
          key={`${i}-${digit}`}
          className="inline-block morphing-digit"
          style={{
            animationDelay: `${i * 0.1}s`,
          }}
        >
          {digit}
        </span>
      ))}
      {suffix && <span className="text-[0.5em] opacity-70 mr-1">{suffix}</span>}
    </span>
  );
}

// =============================================
// Floating Label
// =============================================

interface FloatingLabelProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FloatingLabel({ children, className = '', delay = 0 }: FloatingLabelProps) {
  return (
    <span
      className={`inline-block floating-label ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </span>
  );
}
