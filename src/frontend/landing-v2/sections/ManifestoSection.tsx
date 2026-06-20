import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const LINES = [
  "VISUAL SYSTEMS WHERE",
  "MULTIPLE AI AGENTS",
  "OPERATE AS A SINGLE",
  "INTELLIGENT SYSTEM.",
];

/** Section 2 — manifesto headline + abstract 3D object. */
export function ManifestoSection() {
  const ref = useRef<HTMLElement>(null);
  const objRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const lines = ref.current.querySelectorAll(".lv2-mf-line");
      gsap.from(lines, {
        y: 60,
        opacity: 0,
        filter: "blur(10px)",
        duration: 1.1,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
      });
      gsap.from(ref.current.querySelector(".lv2-mf-cta"), {
        y: 20,
        opacity: 0,
        duration: 0.9,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 60%", once: true },
      });

      // Subtle parallax + scroll-linked rotation on the 3D-ish object.
      if (objRef.current) {
        gsap.to(objRef.current, {
          rotateX: 25,
          rotateY: 35,
          yPercent: -15,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
        });
      }

      // Pointer parallax
      const onMove = (e: PointerEvent) => {
        if (!ref.current || !objRef.current) return;
        const r = ref.current.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(objRef.current, { rotateY: nx * 18, rotateX: -ny * 14, duration: 0.6, ease: "power3.out", overwrite: "auto" });
      };
      ref.current.addEventListener("pointermove", onMove);
      return () => {
        ref.current?.removeEventListener("pointermove", onMove);
        ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={2} className="lv2-section lv2-manifesto">
      <div className="lv2-mf-grid">
        <div className="lv2-mf-left">
          <span className="lv2-sec-index">— 02 / 12</span>
          <h2 className="lv2-mf-headline">
            {LINES.map((l, i) => (
              <span key={i} className="lv2-mf-line">{l}</span>
            ))}
          </h2>
          <a className="lv2-mf-cta" href="#explore">
            <span>EXPLORE IMPERIUM</span>
            <span className="lv2-mf-cta-arrow" aria-hidden>→</span>
          </a>
        </div>
        <div className="lv2-mf-right">
          <div className="lv2-mf-stage">
            <div ref={objRef} className="lv2-mf-object" aria-hidden>
              <span className="lv2-mf-face lv2-mf-face-1" />
              <span className="lv2-mf-face lv2-mf-face-2" />
              <span className="lv2-mf-face lv2-mf-face-3" />
              <span className="lv2-mf-face lv2-mf-face-4" />
              <span className="lv2-mf-face lv2-mf-face-5" />
              <span className="lv2-mf-face lv2-mf-face-6" />
            </div>
            <span className="lv2-mf-stage-floor" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
