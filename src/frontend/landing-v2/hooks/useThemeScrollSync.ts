import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Drives the page-wide light↔dark transition by scrubbing CSS vars on a
 * pinned root. Section 5 turns the page dark. The horizontal panel (7–10)
 * stays dark. Section 11 returns to light.
 */
export function useThemeScrollSync() {
  useEffect(() => {
    const root = document.documentElement;
    const setTheme = (t: "light" | "dark") => root.setAttribute("data-lv2-theme", t);
    setTheme("light");

    const triggers: ScrollTrigger[] = [];

    const sec5 = document.querySelector('[data-section="5"]');
    const hp = document.querySelector('[data-section="7-10"]');
    const sec11 = document.querySelector('[data-section="11"]');

    if (sec5) {
      triggers.push(
        ScrollTrigger.create({
          trigger: sec5,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: () => {
            setTheme("dark");
            gsap.to(root, { "--lv2-bg": "#0a0a0a", "--lv2-fg": "#f1ece6", duration: 1.2, ease: "power2.inOut" });
          },
          onLeaveBack: () => {
            setTheme("light");
            gsap.to(root, { "--lv2-bg": "#e8e3dc", "--lv2-fg": "#0a0a0a", duration: 1.2, ease: "power2.inOut" });
          },
        }),
      );
    }
    if (hp) {
      triggers.push(
        ScrollTrigger.create({
          trigger: hp,
          start: "top center",
          end: "bottom center",
          onEnter: () => setTheme("dark"),
          onEnterBack: () => setTheme("dark"),
        }),
      );
    }
    if (sec11) {
      triggers.push(
        ScrollTrigger.create({
          trigger: sec11,
          start: "top 70%",
          end: "bottom 30%",
          onEnter: () => {
            setTheme("light");
            gsap.to(root, { "--lv2-bg": "#e8e3dc", "--lv2-fg": "#0a0a0a", duration: 1.2, ease: "power2.inOut" });
          },
          onLeaveBack: () => {
            setTheme("dark");
            gsap.to(root, { "--lv2-bg": "#0a0a0a", "--lv2-fg": "#f1ece6", duration: 1.2, ease: "power2.inOut" });
          },
        }),
      );
    }

    return () => {
      triggers.forEach((t) => t.kill());
      root.removeAttribute("data-lv2-theme");
      gsap.set(root, { clearProps: "--lv2-bg,--lv2-fg" });
    };
  }, []);
}
