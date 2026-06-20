import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface Props {
  index: number;
  label?: string;
  children?: ReactNode;
  /** Minimum height in vh. Default full viewport. */
  minVh?: number;
  /** "dark" paints a self-contained black background (used for Transition). */
  variant?: "default" | "dark";
}

/** Shared full-screen placeholder with fade-up reveal and subtle parallax. */
export function SectionPlaceholder({ index, label, children, minVh = 100, variant = "default" }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const title = ref.current.querySelector(".lv2-sec-title");
      const meta = ref.current.querySelectorAll(".lv2-sec-meta");

      if (title) {
        gsap.from(title, {
          y: 60,
          opacity: 0,
          filter: "blur(10px)",
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
        });
        gsap.to(title, {
          yPercent: -8,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
        });
      }
      if (meta.length) {
        gsap.from(meta, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
        });
      }

      return () => ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === ref.current) t.kill();
      });
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      data-section={index}
      className={`lv2-section${variant === "dark" ? " lv2-section-dark" : ""}`}
      style={{ minHeight: `${minVh}vh` }}
    >
      <span className="lv2-sec-meta lv2-sec-index">— {String(index).padStart(2, "0")} / 12</span>
      <h2 className="lv2-sec-title">{label ?? `SECTION ${index}`}</h2>
      {children}
    </section>
  );
}
