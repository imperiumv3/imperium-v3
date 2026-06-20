import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const COLS: { label: string; value: string; value2?: string }[] = [
  { label: "LOCATION", value: "India,", value2: "Hyderabad" },
  { label: "REVISIONS", value: "+15" },
  { label: "FOUNDED", value: "2026" },
];

/** Section 3 — three-column metrics strip. */
export function IndexStripSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const cells = ref.current.querySelectorAll(".lv2-is-cell");
      gsap.from(cells, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
      return () => ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={3} className="lv2-section lv2-indexstrip">
      <span className="lv2-sec-index">— 03 / 12</span>
      <div className="lv2-is-grid">
        {COLS.map((c, i) => (
          <div key={c.label} className="lv2-is-cell" data-i={i}>
            <span className="lv2-is-label">{c.label}</span>
            <div className="lv2-is-value">
              <span>{c.value}</span>
              {c.value2 && <span>{c.value2}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
