import { useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSession } from "@frontend/auth/session";
import executeAsset from "../assets/section-10-execute/execute.webp.asset.json";

const STEPS = ["SEARCH", "MATCH", "OPTIMIZE", "APPLY"] as const;

export function ExecuteSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();

  useGSAP(
    () => {
      if (!ref.current) return;
      const steps = ref.current.querySelectorAll(".lv2s10-step-indicator");
      gsap.fromTo(
        steps,
        { opacity: 0.35 },
        {
          opacity: 1,
          stagger: 0.18,
          repeat: -1,
          yoyo: true,
          duration: 0.8,
          ease: "power1.inOut",
        },
      );
      const panel = ref.current.querySelector(".lv2s10-panel-glow");
      if (panel) {
        gsap.to(panel, {
          opacity: 0.9,
          duration: 1.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === ref.current) t.kill();
        });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={10} className="lv2-section lv2s10">
      <span className="lv2-sec-index">— 10 / 12</span>
      <div className="lv2s10-wrap">
        <img src={executeAsset.url} alt="Execute automation poster" className="lv2s10-poster" loading="lazy" decoding="async" />

        <button
          type="button"
          className="lv2s10-execute-btn"
          onClick={() => navigate({ to: session ? "/jobs" : "/auth" })}
        >
          EXECUTE TASK
        </button>

        <Link to={session ? "/jobs" : "/auth"} className="lv2s10-panel-link" aria-label="Watch automation in action">
          <span className="lv2s10-panel-glow" aria-hidden />
        </Link>

        <div className="lv2s10-steps" aria-hidden>
          {STEPS.map((step, index) => (
            <div key={step} className={`lv2s10-step-indicator lv2s10-step-${index + 1}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
