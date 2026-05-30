
import { useEffect } from 'react';
import Header from '@/ijaz/components/layout/Header';
import Footer from '@/ijaz/components/layout/Footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  /* Lenis smooth scroll — registered globally */
  useEffect(() => {
    let lenis: { raf: (time: number) => void; destroy: () => void } | null = null;
    let raf: number;
    
    (async () => {
      const Lenis = (await import('lenis')).default;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        touchMultiplier: 2,
      });

      function step(time: number) {
        lenis?.raf(time);
        raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    })();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
