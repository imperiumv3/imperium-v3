import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import heroBg from "../assets/hero_bg.png.asset.json";
import heroChar from "../assets/hero_character.png.asset.json";

const WORD = "IMPERIUM";

/**
 * Section 1 — IMPERIUM hero (poster composition).
 * Four layers only: background, solid IMPERIUM, character, outline IMPERIUM.
 */
export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const frontRef = useRef<HTMLHeadingElement>(null);

  // Inject Anton font once.
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
      const character = stage.querySelector<HTMLElement>(".lv2h-character");

      // Subtle scroll parallax (no fade)
      const st = { trigger: stage, start: "top top", end: "bottom top", scrub: 0.5 } as const;
      gsap.to([".lv2h-back", ".lv2h-front", ".lv2h-king"], { yPercent: -3, ease: "none", scrollTrigger: st });
      gsap.to(".lv2h-character", { yPercent: -2, ease: "none", scrollTrigger: st });

      // Per-char pointer interaction (clamped to -3px)
      const pairs = Array.from(backChars).map((bEl, i) => {
        const fEl = frontChars[i];
        return {
          bEl,
          y: gsap.quickTo([bEl, fEl], "y", { duration: 0.5, ease: "power3.out" }),
          opacity: gsap.quickTo(bEl, "opacity", { duration: 0.4, ease: "power2.out" }),
        };
      });

      // Character parallax
      const charX = character ? gsap.quickTo(character, "x", { duration: 0.7, ease: "power3.out" }) : null;
      const charY = character ? gsap.quickTo(character, "y", { duration: 0.7, ease: "power3.out" }) : null;

      const onMove = (e: PointerEvent) => {
        pairs.forEach(({ bEl, y, opacity }) => {
          const r = bEl.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
          const f = Math.max(0, 1 - dist / 220);
          y(-3 * f); // clamped to -3px max
          opacity(1 - 0.15 * f);
        });
        if (charX && charY) {
          const nx = (e.clientX / window.innerWidth) * 2 - 1;
          const ny = (e.clientY / window.innerHeight) * 2 - 1;
          charX(nx * 8);
          charY(ny * 4);
        }
      };
      const onLeave = () => {
        pairs.forEach(({ y, opacity }) => { y(0); opacity(1); });
        if (charX && charY) { charX(0); charY(0); }
      };
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);

      // Scan sweep
      const sweep = stage.querySelector(".lv2h-sweep");
      const sweepTl = gsap.timeline({ repeat: -1, repeatDelay: 3.1 });
      sweepTl
        .fromTo(sweep, { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: 0.45, duration: 1.4, ease: "power1.inOut" })
        .to(sweep, { opacity: 0, duration: 0.2 }, "-=0.2");

      // Subtle glitch on outline layer
      const glitchTl = gsap.timeline({ repeat: -1, repeatDelay: 7 });
      glitchTl
        .to(frontRef.current, { x: 2, duration: 0.05, ease: "steps(1)" })
        .to(frontRef.current, { x: -2, duration: 0.05, ease: "steps(1)" })
        .to(frontRef.current, { x: 0, duration: 0.05, ease: "steps(1)" });

      return () => {
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
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
      <img className="lv2h-bg" src={heroBg.url} alt="" aria-hidden draggable={false} />

      <span className="lv2h-king" aria-hidden>KING</span>

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
    </section>
  );
}
