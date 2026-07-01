import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSession } from "@frontend/auth/session";
import { SplineScene } from "@/components/ui/spline-scene";
import { TextScramble } from "@/components/ui/text-scramble";
import { DottedSurface } from "@/components/ui/dotted-surface";

const STEPS = [
  "Create and configure your profile",
  "Discover jobs matched to your skills",
  "Generate ATS-optimized resumes",
  "Track applications from one dashboard",
];

/** Section 2 — What IMPERIUM is (left text + right Spline model). */
export function ManifestoSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();
  const [scrambleTrigger, setScrambleTrigger] = useState(false);

  useGSAP(
    () => {
      if (!ref.current) return;

      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 70%",
        once: true,
        onEnter: () => setScrambleTrigger(true),
      });

      const leftContent = ref.current.querySelector(".lv2-mf2-left");
      if (leftContent) {
        const children = leftContent.children;
        gsap.from(children, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 65%", once: true },
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

  function handleExplore() {
    navigate({ to: session ? "/jobs" : "/auth" });
  }

  return (
    <section ref={ref} data-section={2} className="lv2-section lv2-manifesto2">
      <DottedSurface className="lv2-mf2-dots" />

      <div className="lv2-mf2-grid">
        {/* Left content */}
        <div className="lv2-mf2-left">
          <span className="lv2-sec-index">— 02 / 12</span>

          <h2 className="lv2-mf2-heading">
            <TextScramble
              as="span"
              trigger={scrambleTrigger}
              duration={1.2}
              speed={0.03}
              className="lv2-mf2-heading-line"
            >
              One Platform.
            </TextScramble>
            <br />
            <TextScramble
              as="span"
              trigger={scrambleTrigger}
              duration={1.2}
              speed={0.03}
              className="lv2-mf2-heading-line"
            >
              Multiple Possibilities.
            </TextScramble>
          </h2>

          <p className="lv2-mf2-desc">
            IMPERIUM provides a foundation for building and orchestrating
            specialized AI agents. The current implementation focuses on an
            intelligent Job Agent for career automation.
          </p>

          <ul className="lv2-mf2-steps">
            {STEPS.map((s) => (
              <li key={s} className="lv2-mf2-step">
                <span className="lv2-mf2-step-check" aria-hidden>✓</span>
                {s}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="lv2-mf2-btn lv2-mf2-btn-primary"
            onClick={handleExplore}
          >
            Explore the Job Agent →
          </button>
        </div>

        {/* Right Spline model */}
        <div className="lv2-mf2-right">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="lv2-mf2-spline"
          />
        </div>
      </div>
    </section>
  );
}
