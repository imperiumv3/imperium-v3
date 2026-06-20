import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Cinematic light → dark scrub.
 *
 * Drives CSS custom properties on <html> based on scroll progress through the
 * dedicated transition section (data-lv2-transition). Output is fully
 * interpolated — pausing mid-scroll reveals a mixed state. Progress also feeds
 * --lv2-dark-mix (0 → 1) so grain / banding atmosphere fades in with it.
 */
export function useThemeScrollSync() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-lv2-theme", "light");

    const lerp = (a: number, b: number, p: number) => Math.round(a + (b - a) * p);
    const startBg: [number, number, number] = [223, 245, 253]; // #DFF5FD
    const endBg: [number, number, number] = [10, 10, 10]; // #0a0a0a
    const startFg: [number, number, number] = [10, 10, 10];
    const endFg: [number, number, number] = [241, 236, 230]; // #f1ece6

    const applyVars = (p: number) => {
      const bg = `rgb(${lerp(startBg[0], endBg[0], p)},${lerp(startBg[1], endBg[1], p)},${lerp(startBg[2], endBg[2], p)})`;
      const fg = `rgb(${lerp(startFg[0], endFg[0], p)},${lerp(startFg[1], endFg[1], p)},${lerp(startFg[2], endFg[2], p)})`;
      const mr = lerp(startFg[0], endFg[0], p);
      const mg = lerp(startFg[1], endFg[1], p);
      const mb = lerp(startFg[2], endFg[2], p);
      root.style.setProperty("--lv2-bg", bg);
      root.style.setProperty("--lv2-fg", fg);
      root.style.setProperty("--lv2-muted", `rgba(${mr},${mg},${mb},0.6)`);
      root.style.setProperty("--lv2-line", `rgba(${mr},${mg},${mb},0.22)`);
      root.style.setProperty("--lv2-dark-mix", String(p));
      root.setAttribute("data-lv2-theme", p > 0.5 ? "dark" : "light");
    };

    applyVars(0);

    let st: ScrollTrigger | null = null;
    const init = () => {
      const el = document.querySelector<HTMLElement>("[data-lv2-transition]");
      if (!el) {
        // retry once trees mount
        requestAnimationFrame(init);
        return;
      }
      st = ScrollTrigger.create({
        trigger: el,
        start: "top 80%",
        end: "bottom 30%",
        scrub: 0.6,
        onUpdate: (self) => applyVars(self.progress),
      });
    };
    init();

    return () => {
      st?.kill();
      root.removeAttribute("data-lv2-theme");
      ["--lv2-bg", "--lv2-fg", "--lv2-muted", "--lv2-line", "--lv2-dark-mix"].forEach((v) =>
        root.style.removeProperty(v),
      );
    };
  }, []);
}
