
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

// =============================================
// Smooth scrolling provider using Lenis
// Ultra-smooth, buttery scroll experience
// =============================================

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Integrate with GSAP ScrollTrigger
    if (typeof window !== 'undefined') {
      import('gsap').then(({ gsap }) => {
        import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
          gsap.registerPlugin(ScrollTrigger);
          
          lenis.on('scroll', () => {
            ScrollTrigger.update();
          });
          
          ScrollTrigger.scrollerProxy(document.body, {
            scrollTop(value?: number) {
              if (arguments.length && value !== undefined) {
                lenis.scrollTo(value, { immediate: true });
              }
              return lenis.scroll;
            },
            getBoundingClientRect() {
              return {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
              };
            },
          });

          ScrollTrigger.defaults({ scroller: document.body });
        });
      });
    }

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
