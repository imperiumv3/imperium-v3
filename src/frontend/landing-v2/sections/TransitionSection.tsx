import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function TransitionSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const title = ref.current.querySelector(".lv2s5-title");
      const particles = ref.current.querySelectorAll(".lv2s5-particle");
      gsap.fromTo(
        title,
        { yPercent: 18, opacity: 0.3, scale: 0.92 },
        {
          yPercent: -10,
          opacity: 1,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.7,
          },
        },
      );
      gsap.to(particles, {
        yPercent: (_, target) => (Number((target as HTMLElement).dataset.depth) || 1) * -22,
        opacity: (_, target) => 0.25 + (Number((target as HTMLElement).dataset.depth) || 1) * 0.08,
        ease: "none",
        stagger: 0.02,
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      });
      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === ref.current) t.kill();
        });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={5} className="lv2-section lv2s5">
      <span className="lv2-sec-index">— 05 / 12</span>
      <div className="lv2s5-atmosphere" aria-hidden>
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="lv2s5-particle"
            data-depth={(i % 4) + 1}
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 19) % 100}%` }}
          />
        ))}
      </div>
      <h2 className="lv2s5-title">
        <span>FROM AGENTS</span>
        <span>TO STORIES</span>
      </h2>
    </section>
  );
}
