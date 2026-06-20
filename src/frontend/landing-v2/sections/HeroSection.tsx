import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const WORD = "IMPERIUM";

/** Section 1 — hero with per-character pointer interaction. */
export function HeroSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const word = ref.current.querySelector(".lv2-hero-word");
      const chars = ref.current.querySelectorAll<HTMLSpanElement>(".lv2-hero-char");
      const bullet = ref.current.querySelector(".lv2-hero-bullet");
      const scroll = ref.current.querySelector(".lv2-hero-scroll");

      gsap.from(word, { y: 80, opacity: 0, filter: "blur(20px)", duration: 1.4, ease: "power3.out", delay: 0.15 });
      gsap.from(bullet, { scale: 0, duration: 1.1, ease: "back.out(2)", delay: 0.7 });
      gsap.from(scroll, { opacity: 0, y: 12, duration: 0.9, ease: "power2.out", delay: 1.1 });

      gsap.to(ref.current.querySelector(".lv2-hero-stack"), {
        yPercent: -22,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: 0.5 },
      });

      // Per-char pointer interaction — distance-based lift, opacity & skew.
      const setters = Array.from(chars).map((el) => ({
        el,
        y: gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" }),
        skew: gsap.quickTo(el, "skewX", { duration: 0.5, ease: "power3.out" }),
        opacity: gsap.quickTo(el, "opacity", { duration: 0.4, ease: "power2.out" }),
      }));

      const onMove = (e: PointerEvent) => {
        setters.forEach(({ el, y, skew, opacity }) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const falloff = Math.max(0, 1 - dist / 260);
          y(-14 * falloff);
          skew(-(dx / 60) * falloff);
          opacity(1 - 0.35 * falloff);
        });
      };
      const onLeave = () => setters.forEach(({ y, skew, opacity }) => { y(0); skew(0); opacity(1); });

      const stage = ref.current;
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);

      return () => {
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
        ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={1} className="lv2-section lv2-hero">
      <div className="lv2-hero-stack">
        <h1 className="lv2-hero-word" aria-label={WORD}>
          {Array.from(WORD).map((c, i) => (
            <span key={i} className="lv2-hero-char">{c}</span>
          ))}
          <span className="lv2-hero-bullet" aria-hidden />
        </h1>
        <div className="lv2-hero-rule" aria-hidden />
        <div className="lv2-hero-scroll">SCROLL</div>
      </div>
    </section>
  );
}
