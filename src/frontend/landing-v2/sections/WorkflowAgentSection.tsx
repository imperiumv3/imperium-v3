import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import workflowAgentAsset from "../assets/section-09-workflow-agent/workflow-agent.webp.asset.json";

const CARDS = [
  "Job Discovery Engine",
  "Resume Studio",
  "Application Tracker",
] as const;

export function WorkflowAgentSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const cards = ref.current.querySelectorAll(".lv2s9-hotspot");
      gsap.from(cards, {
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 72%", once: true },
      });
      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === ref.current) t.kill();
        });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={9} className="lv2-section lv2s9">
      <span className="lv2-sec-index">— 09 / 12</span>
      <div className="lv2s9-wrap">
        <img src={workflowAgentAsset.url} alt="Workflow agent orchestration poster" className="lv2s9-poster" loading="lazy" decoding="async" />
        {CARDS.map((title, index) => (
          <article key={title} className={`lv2s9-hotspot lv2s9-hotspot-${index + 1}`}>
            <h3>{title}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
