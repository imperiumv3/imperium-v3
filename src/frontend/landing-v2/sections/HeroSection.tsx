import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import heroBg from "../assets/hero_bg.png.asset.json";
import heroChar from "../assets/hero_character.png.asset.json";

const WORD = "IMPERIUM";

/**
 * Section 1 — IMPERIUM hero (poster composition).
 * Layered: bg → back solid IMPERIUM → character → front outline IMPERIUM.
 * Subtle scan sweep, occasional micro-glitch, pointer-driven per-char lift.
 */
export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const frontRef = useRef<HTMLHeadingElement>(null);

  // Inject Google Fonts (Anton) once.
  useEffect(() => {
    const id = "lv2-hero-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Anton&display=swap";
    document.head.appendChild(link);
  }, []);

  useGSAP(
    () => {
      if (!ref.current) return;
      const stage = ref.current;
      const backChars = stage.querySelectorAll<HTMLSpanElement>(".lv2h-back .lv2h-char");
      const frontChars = stage.querySelectorAll<HTMLSpanElement>(".lv2h-front .lv2h-char");
      const character = stage.querySelector(".lv2h-character");
      const wordWraps = stage.querySelectorAll(".lv2h-word");

      // Entrance
      gsap.from(wordWraps, { y: 60, opacity: 0, filter: "blur(14px)", duration: 1.2, ease: "power3.out", delay: 0.1 });
      gsap.from(character, { y: 40, opacity: 0, duration: 1.4, ease: "power3.out", delay: 0.3 });

      // Subtle scroll parallax (max ~6–8%)
      const st = { trigger: stage, start: "top top", end: "bottom top", scrub: 0.5 } as const;
      gsap.to(".lv2h-stack", { yPercent: -8, opacity: 0.25, ease: "none", scrollTrigger: st });
      gsap.to(".lv2h-character", { yPercent: -5, ease: "none", scrollTrigger: st });
      gsap.to(".lv2h-back", { yPercent: 4, ease: "none", scrollTrigger: st });

      // Per-char pointer interaction (both layers in sync)
      const pairs = Array.from(backChars).map((bEl, i) => {
        const fEl = frontChars[i];
        return {
          bEl,
          fEl,
          y: gsap.quickTo([bEl, fEl], "y", { duration: 0.5, ease: "power3.out" }),
          skew: gsap.quickTo([bEl, fEl], "skewX", { duration: 0.5, ease: "power3.out" }),
          opacityB: gsap.quickTo(bEl, "opacity", { duration: 0.4, ease: "power2.out" }),
        };
      });
      const onMove = (e: PointerEvent) => {
        pairs.forEach(({ bEl, y, skew, opacityB }) => {
          const r = bEl.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const f = Math.max(0, 1 - dist / 280);
          y(-12 * f);
          skew(-(dx / 70) * f);
          opacityB(1 - 0.25 * f);
        });
      };
      const onLeave = () => pairs.forEach(({ y, skew, opacityB }) => { y(0); skew(0); opacityB(1); });
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);

      // Scan sweep — every ~4.5s
      const sweep = stage.querySelector(".lv2h-sweep");
      const sweepTl = gsap.timeline({ repeat: -1, repeatDelay: 4 });
      sweepTl.fromTo(sweep, { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: 0.55, duration: 1.4, ease: "power1.inOut" })
             .to(sweep, { opacity: 0, duration: 0.2 }, "-=0.2");

      // Micro glitch — every 6–8s
      const glitchTl = gsap.timeline({ repeat: -1, repeatDelay: 6.5 });
      const triggerGlitch = () => {
        const offset = (Math.random() - 0.5) * 6;
        glitchTl.to(frontRef.current, { x: offset, duration: 0.05, ease: "steps(1)" })
                .to(frontRef.current, { x: -offset * 0.6, duration: 0.05, ease: "steps(1)" })
                .to(frontRef.current, { x: 0, duration: 0.05, ease: "steps(1)" });
      };
      triggerGlitch();
      const glitchInterval = window.setInterval(triggerGlitch, 7200);

      return () => {
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
        window.clearInterval(glitchInterval);
        sweepTl.kill();
        glitchTl.kill();
        ScrollTrigger.getAll().forEach((t) => { if (t.trigger === stage) t.kill(); });
      };
    },
    { scope: ref },
  );

  const chars = Array.from(WORD);

  return (
    <section ref={ref} data-section={1} className="lv2-section lv2h-hero">
      <div className="lv2h-bg" aria-hidden style={{ backgroundImage: `url(${heroBg.url})` }} />
      <div className="lv2h-grain" aria-hidden />

      <div className="lv2h-stack">
        <h1 className="lv2h-word lv2h-back" aria-label={WORD}>
          {chars.map((c, i) => <span key={i} className="lv2h-char">{c}</span>)}
        </h1>

        <img
          src={heroChar.url}
          alt=""
          className="lv2h-character"
          aria-hidden
          draggable={false}
        />

        <h1 ref={frontRef} className="lv2h-word lv2h-front" aria-hidden>
          {chars.map((c, i) => <span key={i} className="lv2h-char">{c}</span>)}
        </h1>

        <div className="lv2h-sweep" aria-hidden />
      </div>
    </section>
  );
}
