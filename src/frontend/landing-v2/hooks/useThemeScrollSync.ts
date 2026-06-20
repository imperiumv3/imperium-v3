import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Page-wide light↔dark transition. Scrubbed across Section 5 (light→dark)
 * and Section 11 (dark→light) so the user can stop mid-scroll and see any
 * intermediate state — no instant theme switch.
 */
export function useThemeScrollSync() {
  useEffect(() => {
    const root = document.documentElement;
    const LIGHT_BG = "#DFF5FD";
    const LIGHT_FG = "#0a0a0a";
    const DARK_BG = "#0a0a0a";
    const DARK_FG = "#f1ece6";

    const setTheme = (t: "light" | "dark") => root.setAttribute("data-lv2-theme", t);
    setTheme("light");
    gsap.set(root, { "--lv2-bg": LIGHT_BG, "--lv2-fg": LIGHT_FG });

    const triggers: ScrollTrigger[] = [];

    const sec5 = document.querySelector('[data-section="5"]');
    const sec11 = document.querySelector('[data-section="11"]');

    if (sec5) {
      const tween = gsap.fromTo(
        root,
        { "--lv2-bg": LIGHT_BG, "--lv2-fg": LIGHT_FG },
        {
          "--lv2-bg": DARK_BG,
          "--lv2-fg": DARK_FG,
          ease: "none",
          scrollTrigger: {
            trigger: sec5,
            start: "top 80%",
            end: "bottom 20%",
            scrub: true,
            onUpdate: (self) => setTheme(self.progress > 0.5 ? "dark" : "light"),
          },
        },
      );
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    }

    if (sec11) {
      const tween = gsap.fromTo(
        root,
        { "--lv2-bg": DARK_BG, "--lv2-fg": DARK_FG },
        {
          "--lv2-bg": LIGHT_BG,
          "--lv2-fg": LIGHT_FG,
          ease: "none",
          scrollTrigger: {
            trigger: sec11,
            start: "top 80%",
            end: "bottom 20%",
            scrub: true,
            onUpdate: (self) => setTheme(self.progress > 0.5 ? "light" : "dark"),
          },
        },
      );
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    }

    return () => {
      triggers.forEach((t) => t.kill());
      root.removeAttribute("data-lv2-theme");
      gsap.set(root, { clearProps: "--lv2-bg,--lv2-fg" });
    };
  }, []);
}
