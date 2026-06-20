import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { GlassCard } from "../components/GlassCard";
import riderImg from "../assets/section-07-journey/rider.png";

const CARDS = [
  { tag: "01", title: "Profile Analyze", desc: "Read every signal. Score every gap." },
  { tag: "02", title: "Orchestrated", desc: "Agents move in concert, not in parallel chaos." },
  { tag: "03", title: "Execution", desc: "Apply, follow up, iterate — autonomously." },
] as const;

export function JourneySection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const rider = ref.current.querySelector<HTMLElement>(".lv2s7-rider");
      if (!rider) return;
      const onMove = (e: PointerEvent) => {
        const r = ref.current!.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(rider, { x: nx * 40, y: ny * 24, rotateZ: nx * 2, duration: 0.6, ease: "power3.out", overwrite: "auto" });
      };
      const onLeave = () => gsap.to(rider, { x: 0, y: 0, rotateZ: 0, duration: 0.6, ease: "power3.out" });
      ref.current.addEventListener("pointermove", onMove);
      ref.current.addEventListener("pointerleave", onLeave);
      return () => {
        ref.current?.removeEventListener("pointermove", onMove);
        ref.current?.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={7} className="lv2-hpanel lv2s7">
      <div className="lv2s7-bg" aria-hidden />
      <div className="lv2s7-streaks" aria-hidden />
      <div className="lv2s7-inner">
        <header className="lv2s7-head">
          <span className="lv2-shell-index">— 07 / 12</span>
          <h2>YOUR<br/>JOURNEY<br/><em>BEGINS.</em></h2>
        </header>

        <img src={riderImg} alt="" className="lv2s7-rider" loading="lazy" decoding="async" />

        <div className="lv2s7-cards">
          {CARDS.map((c) => (
            <GlassCard key={c.tag} className="lv2s7-card" glowColor="rgba(255,70,70,0.55)" tilt>
              <span className="lv2s7-tag">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
