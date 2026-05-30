
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// =============================================
// Scroll-triggered cinematic reveal components
// =============================================

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'rotate' | 'split' | 'blur';
  delay?: number;
  duration?: number;
  stagger?: number;
  scrub?: boolean;
}

export function ScrollReveal({
  children,
  className = '',
  variant = 'fade-up',
  delay = 0,
  duration = 1,
  stagger = 0,
  scrub = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const animations: Record<string, gsap.TweenVars> = {
      'fade-up': { y: 60, opacity: 0 },
      'fade-down': { y: -60, opacity: 0 },
      'fade-left': { x: 80, opacity: 0 },
      'fade-right': { x: -80, opacity: 0 },
      'scale': { scale: 0.8, opacity: 0 },
      'rotate': { rotation: 10, opacity: 0, y: 40 },
      'split': { clipPath: 'inset(50% 0 50% 0)', opacity: 0 },
      'blur': { filter: 'blur(20px)', opacity: 0, y: 30 },
    };

    const from = animations[variant] || animations['fade-up'];

    gsap.set(el, from);

    const scrollConfig: ScrollTrigger.Vars = {
      trigger: el,
      start: 'top 85%',
      end: 'top 20%',
      toggleActions: scrub ? undefined : 'play none none none',
      scrub: scrub ? 1 : false,
    };

    gsap.to(el, {
      ...Object.fromEntries(
        Object.keys(from).map((key) => [
          key,
          key === 'opacity' ? 1 : key === 'scale' ? 1 : key === 'clipPath' ? 'inset(0% 0 0% 0)' : key === 'filter' ? 'blur(0px)' : 0,
        ])
      ),
      duration,
      delay,
      ease: 'power3.out',
      stagger,
      scrollTrigger: scrollConfig,
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [variant, delay, duration, stagger, scrub]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// =============================================
// Parallax Section
// =============================================

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
}

export function ParallaxSection({
  children,
  className = '',
  speed = 0.3,
  direction = 'up',
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const yAmount = direction === 'up' ? -100 * speed : 100 * speed;

    gsap.to(el, {
      y: yAmount,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [speed, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// =============================================
// Magnetic Cursor Component
// =============================================

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function Magnetic({ children, className = '', strength = 0.3 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      gsap.to(el, {
        x: deltaX,
        y: deltaY,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.3)',
      });
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// =============================================
// Text Reveal Animation
// =============================================

interface TextRevealProps {
  text: string;
  className?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  stagger?: number;
  delay?: number;
}

export function TextReveal({
  text,
  className = '',
  tag: Tag = 'h2',
  stagger = 0.03,
  delay = 0,
}: TextRevealProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const words = el.querySelectorAll('.word');

    gsap.set(words, { y: '100%', opacity: 0 });

    gsap.to(words, {
      y: '0%',
      opacity: 1,
      duration: 0.8,
      stagger,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [stagger, delay]);

  const words = text.split(' ').map((word, i) => (
    <span key={i} className="inline-block overflow-hidden mx-[0.15em]">
      <span className="word inline-block">{word}</span>
    </span>
  ));

  return (
    <Tag ref={containerRef as any} className={className}>
      {words}
    </Tag>
  );
}

// =============================================
// Counter Animation
// =============================================

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  className = '',
  duration = 2,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const countRef = useRef({ value: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    gsap.to(countRef.current, {
      value: target,
      duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      onUpdate: () => {
        if (el) {
          el.textContent = `${prefix}${Math.round(countRef.current.value)}${suffix}`;
        }
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [target, suffix, prefix, duration]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}

// =============================================
// Horizontal Scroll Section
// =============================================

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScroll({ children, className = '' }: HorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !trackRef.current) return;

    const container = containerRef.current;
    const track = trackRef.current;
    
    const scrollWidth = track.scrollWidth - container.offsetWidth;

    gsap.to(track, {
      x: -scrollWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        pin: true,
        scrub: 1,
        start: 'top top',
        end: () => `+=${scrollWidth}`,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === container) st.kill();
      });
    };
  }, []);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <div ref={trackRef} className="flex gap-8 items-start" style={{ width: 'max-content' }}>
        {children}
      </div>
    </div>
  );
}
