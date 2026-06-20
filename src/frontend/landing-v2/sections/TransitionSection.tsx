import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Pure motion transition. No text. A 70vh dark bridge with:
 * - a horizontal light sweep tied to scroll
 * - a drifting particle field
 * - top/bottom morphing gradient lines
 */
export function TransitionSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const sweep = ref.current.querySelector(".lv2s5-sweep");
      const particles = ref.current.querySelectorAll<HTMLElement>(".lv2s5-particle");
      const lineTop = ref.current.querySelector(".lv2s5-line-top");
      const lineBot = ref.current.querySelector(".lv2s5-line-bot");

      if (sweep) {
        gsap.fromTo(
          sweep,
          { xPercent: -120, opacity: 0 },
          {
            xPercent: 120,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      }
      gsap.to(particles, {
        y: (i) => -60 - (i % 5) * 20,
        x: (i) => (i % 2 ? 30 : -30),
        opacity: (i) => 0.2 + (i % 4) * 0.18,
        ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.9 },
      });
      [lineTop, lineBot].forEach((line) => {
        if (!line) return;
        gsap.fromTo(line, { scaleX: 0.2 }, {
          scaleX: 1, ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top bottom", end: "center center", scrub: 0.8 },
        });
      });

      return () => {
        ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={5} className="lv2-shell-section lv2-tone-ink lv2s5">
      <span className="lv2s5-line-top" aria-hidden />
      <span className="lv2s5-line-bot" aria-hidden />
      <div className="lv2s5-sweep" aria-hidden />
      <div className="lv2s5-field" aria-hidden>
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="lv2s5-particle"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 29) % 100}%`,
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
