import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Sections 7–10 — pinned, horizontal scroll of 4 panels. */
export function HorizontalPanelSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const track = ref.current.querySelector(".lv2-hp-track") as HTMLElement;
      if (!track) return;
      const panels = track.querySelectorAll(".lv2-hp-panel");
      const distance = (panels.length - 1) * 100; // % of viewport width

      const tween = gsap.to(track, {
        xPercent: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          pin: true,
          start: "top top",
          end: () => `+=${window.innerHeight * panels.length}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      return () => { tween.scrollTrigger?.kill(); tween.kill(); };
    },
    { scope: ref },
  );

  const labels = [7, 8, 9, 10];
  return (
    <section ref={ref} data-section="7-10" className="lv2-section lv2-hp">
      <div className="lv2-hp-track">
        {labels.map((n) => (
          <div key={n} className="lv2-hp-panel" data-section={n}>
            <span className="lv2-sec-meta lv2-sec-index">— {String(n).padStart(2, "0")} / 12</span>
            <h2 className="lv2-sec-title">SECTION {n}</h2>
          </div>
        ))}
      </div>
      <span className="lv2-hp-cue" aria-hidden>↔ HORIZONTAL</span>
    </section>
  );
}
