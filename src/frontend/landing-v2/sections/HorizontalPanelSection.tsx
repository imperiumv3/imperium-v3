import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const PANELS = [
  { n: 7, label: "Identity" },
  { n: 8, label: "Narrative" },
  { n: 9, label: "Digital" },
  { n: 10, label: "Future" },
] as const;

/** Sections 7–10 — pinned horizontal scroll with progress indicator. */
export function HorizontalPanelSection() {
  const ref = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(1);

  useGSAP(
    () => {
      if (!ref.current) return;
      const track = ref.current.querySelector(".lv2-hp-track") as HTMLElement;
      if (!track) return;
      const count = PANELS.length;
      const distance = (count - 1) * 100;

      const tween = gsap.to(track, {
        xPercent: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          pin: true,
          start: "top top",
          end: () => `+=${window.innerHeight * count}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const idx = Math.min(count, Math.floor(self.progress * count) + 1);
            setActive(idx);
            if (fillRef.current) {
              fillRef.current.style.transform = `scaleX(${self.progress})`;
            }
          },
        },
      });
      return () => { tween.scrollTrigger?.kill(); tween.kill(); };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section="7-10" className="lv2-section lv2-hp">
      <div className="lv2-hp-track">
        {PANELS.map(({ n, label }) => (
          <div key={n} className="lv2-hp-panel" data-section={n}>
            <span className="lv2-sec-index">— {String(n).padStart(2, "0")} / 12</span>
            <h2 className="lv2-sec-title">{label}</h2>
          </div>
        ))}
      </div>

      <div className="lv2-hp-progress" aria-hidden>
        <span className="lv2-hp-progress-track">
          <span ref={fillRef} className="lv2-hp-progress-fill" />
        </span>
        <span className="lv2-hp-progress-count">
          {String(active).padStart(2, "0")} / {String(PANELS.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
