import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Section 1 — typographic hero matching the approved reference layout. */
export function HeroSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const word = ref.current.querySelector(".lv2-hero-word");
      const bullet = ref.current.querySelector(".lv2-hero-bullet");
      const scroll = ref.current.querySelector(".lv2-hero-scroll");

      gsap.from(word, {
        y: 80, opacity: 0, filter: "blur(20px)", duration: 1.4, ease: "power3.out", delay: 0.15,
      });
      gsap.from(bullet, { scale: 0, duration: 1.1, ease: "back.out(2)", delay: 0.7 });
      gsap.from(scroll, { opacity: 0, y: 12, duration: 0.9, ease: "power2.out", delay: 1.1 });

      gsap.to(ref.current.querySelector(".lv2-hero-stack"), {
        yPercent: -22,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: 0.5 },
      });
      return () => ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === ref.current) t.kill();
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={1} className="lv2-section lv2-hero">
      <div className="lv2-hero-stack">
        <h1 className="lv2-hero-word">
          IMPERIUM
          <span className="lv2-hero-bullet" aria-hidden />
        </h1>
        <div className="lv2-hero-rule" aria-hidden />
        <div className="lv2-hero-scroll">SCROLL</div>
      </div>
    </section>
  );
}
