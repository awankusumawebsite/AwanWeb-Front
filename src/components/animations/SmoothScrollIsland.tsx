import { useEffect } from 'react';
import Lenis from 'lenis';
import { ScrollTrigger, gsap } from '../../lib/gsap';

type WindowWithAwanLenis = {
  lenis?: Lenis;
};

export default function SmoothScrollIsland() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      gsap.defaults({ duration: 0, stagger: 0 });
    }

    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0 : 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !prefersReducedMotion,
      syncTouch: false,
    });

    const smoothWindow = window as unknown as WindowWithAwanLenis;
    smoothWindow.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(500, 33);

    const refreshFrame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      lenis.off('scroll', ScrollTrigger.update);
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      delete smoothWindow.lenis;
    };
  }, []);

  return null;
}
