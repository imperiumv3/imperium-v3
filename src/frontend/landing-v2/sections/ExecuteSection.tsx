import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSession } from "@frontend/auth/session";
import HeroAscii from "@/components/ui/hero-ascii";

const WORKFLOW_STEPS = [
  { num: "01", label: "INPUT URL", desc: "Provide the target job posting URL" },
  { num: "02", label: "NAVIGATE", desc: "Agent navigates the application workflow" },
  { num: "03", label: "EXECUTE", desc: "Completes forms and submits applications" },
] as const;

/** Section 10 — Local Agent explanation panel. */
export function ExecuteSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();

  useGSAP(
    () => {
      if (!ref.current) return;

      const leftContent = ref.current.querySelector(".lv2s10-left");
      if (leftContent) {
        gsap.from(leftContent.children, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 60%", once: true },
        });
      }

      const steps = ref.current.querySelectorAll(".lv2s10-wf-step");
      gsap.from(steps, {
        x: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 55%", once: true },
      });

      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === ref.current) t.kill();
        });
      };
    },
    { scope: ref },
  );

  function onWatch() {
    navigate({ to: session ? "/jobs" : "/auth" });
  }

  function onView() {
    navigate({ to: session ? "/dashboard" : "/auth" });
  }

  return (
    <section ref={ref} data-section={10} className="lv2s10">
      {/* ASCII background */}
      <HeroAscii className="lv2s10-ascii" />

      {/* Dark overlay */}
      <div className="lv2s10-overlay" aria-hidden />

      {/* Corner frame accents */}
      <div className="lv2s10-frame lv2s10-frame-tl" aria-hidden />
      <div className="lv2s10-frame lv2s10-frame-tr" aria-hidden />
      <div className="lv2s10-frame lv2s10-frame-bl" aria-hidden />
      <div className="lv2s10-frame lv2s10-frame-br" aria-hidden />

      {/* Technical divider lines */}
      <div className="lv2s10-divider-top" aria-hidden />
      <div className="lv2s10-divider-bottom" aria-hidden />

      {/* Left content */}
      <div className="lv2s10-left">
        <span className="lv2s10-label">LOCAL AGENT</span>

        <h2 className="lv2s10-heading">
          EXECUTE TASKS<br />AUTONOMOUSLY
        </h2>

        <p className="lv2s10-desc">
          The Local Agent operates directly on the user's machine. Provide a job
          URL and the agent automatically navigates the application workflow,
          extracts information, interacts with web elements, and executes
          predefined actions.
        </p>

        <div className="lv2s10-btns">
          <button
            type="button"
            className="lv2s10-btn lv2s10-btn-primary"
            onClick={onWatch}
          >
            WATCH LOCAL AGENT
          </button>
          <button
            type="button"
            className="lv2s10-btn lv2s10-btn-secondary"
            onClick={onView}
          >
            VIEW WORKFLOW
          </button>
        </div>
      </div>

      {/* Right workflow visualization */}
      <div className="lv2s10-right">
        <div className="lv2s10-wf">
          {WORKFLOW_STEPS.map((s, i) => (
            <div key={s.num} className="lv2s10-wf-step">
              <div className="lv2s10-wf-num">{s.num}</div>
              <div className="lv2s10-wf-content">
                <span className="lv2s10-wf-label">{s.label}</span>
                <span className="lv2s10-wf-desc">{s.desc}</span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className="lv2s10-wf-line" aria-hidden />
              )}
            </div>
          ))}
        </div>

        <p className="lv2s10-secondary-desc">
          Transforms decisions into action through browser automation,
          intelligent form completion, and workflow execution.
        </p>
      </div>

      {/* Section indicator */}
      <div className="lv2s10-indicator">
        <span className="lv2s10-indicator-num">10</span>
        <span className="lv2s10-indicator-sep">/</span>
        <span className="lv2s10-indicator-total">12</span>
      </div>
    </section>
  );
}
