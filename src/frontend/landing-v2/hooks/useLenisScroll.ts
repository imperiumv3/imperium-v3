import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Mount Lenis once and bridge it into ScrollTrigger. */
export function useLenisScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1.2 });
    lenis.on("scroll", ScrollTrigger.update);

    let raf = 0;
    const tick = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // expose for programmatic scroll (footer brand click)
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    ScrollTrigger.refresh();
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);
}

export function scrollToTop() {
  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
  if (lenis) lenis.scrollTo(0, { duration: 1.4 });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}
