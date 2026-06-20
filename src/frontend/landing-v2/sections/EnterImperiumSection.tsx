import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useSession } from "@frontend/auth/session";
import { GlassCard } from "../components/GlassCard";

function scrollToSection(index: number) {
  document.querySelector<HTMLElement>(`[data-section="${index}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function EnterImperiumSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.to(ref.current.querySelectorAll(".lv2s12-fog span"), {
        x: (i) => (i % 2 ? 80 : -80),
        duration: 14, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: 0.4,
      });
    },
    { scope: ref },
  );

  function onEnter() { navigate({ to: session ? "/dashboard" : "/auth" }); }

  return (
    <section ref={ref} data-section={12} className="lv2-shell-section lv2-tone-red lv2s12">
      <div className="lv2s12-bg" aria-hidden />
      <div className="lv2s12-fog" aria-hidden>
        <span /><span /><span /><span />
      </div>
      <div className="lv2-shell-inner">
        <header className="lv2-shell-head">
          <span className="lv2-shell-index">— 12 / 12</span>
          <span className="lv2-shell-label">ENTER IMPERIUM</span>
        </header>

        <div className="lv2s12-stage">
          <h2 className="lv2s12-title">
            <span>THE RISE OF</span>
            <span className="lv2s12-title-imperium">
              <span className="lv2s12-imp-solid">IMPERIUM</span>
              <span className="lv2s12-imp-outline" aria-hidden>IMPERIUM</span>
            </span>
          </h2>
          <p className="lv2s12-tagline">The empire is open. Step in.</p>

          <div className="lv2s12-ctas">
            <button type="button" className="lv2s12-btn" onClick={() => scrollToSection(3)}>EXPLORE SYSTEM</button>
            <button type="button" className="lv2s12-btn" onClick={() => scrollToSection(4)}>VIEW AGENTS</button>
            <button type="button" className="lv2s12-btn lv2s12-btn-primary" onClick={onEnter}>
              ENTER IMPERIUM <span aria-hidden>→</span>
            </button>
          </div>

          <div className="lv2s12-trailers">
            <GlassCard className="lv2s12-trailer" glowColor="rgba(255,90,90,0.55)" onClick={() => navigate({ to: session ? "/jobs" : "/auth" })}>
              <span className="lv2s12-trailer-play" aria-hidden>▶</span>
              <div>
                <strong>JOB AGENT</strong>
                <span>01:48 · Watch in action</span>
              </div>
            </GlassCard>
            <GlassCard className="lv2s12-trailer" glowColor="rgba(255,180,90,0.55)" onClick={() => navigate({ to: session ? "/dashboard" : "/auth" })}>
              <span className="lv2s12-trailer-play" aria-hidden>▶</span>
              <div>
                <strong>WORKFLOW AGENT</strong>
                <span>02:35 · Watch in action</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
