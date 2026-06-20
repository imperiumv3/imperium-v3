import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import futureAgentsAsset from "../assets/section-04-future-agents/future-agents.webp.asset.json";

const CARDS = [
  {
    title: "Research Agent",
    description: "Collects information, analyzes sources and generates intelligence reports.",
  },
  {
    title: "Coding Agent",
    description: "Creates software, builds systems and generates scalable solutions.",
  },
  {
    title: "Job Agent",
    description: "Discovers opportunities, optimizes resumes and automates applications.",
  },
] as const;

export function FutureAgentsSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const cards = ref.current.querySelectorAll<HTMLElement>(".lv2s4-hotspot");
      const poster = ref.current.querySelector<HTMLElement>(".lv2s4-poster");

      gsap.from(poster, {
        scale: 1.04,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });

      gsap.from(cards, {
        y: 18,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
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
    <section ref={ref} data-section={4} className="lv2-section lv2s4">
      <span className="lv2-sec-index">— 04 / 12</span>
      <div className="lv2s4-poster-wrap">
        <img
          src={futureAgentsAsset.url}
          alt="Imperium Future Agents poster"
          className="lv2s4-poster"
          loading="lazy"
          decoding="async"
        />

        {CARDS.map((card, index) => (
          <article key={card.title} className={`lv2s4-hotspot lv2s4-hotspot-${index + 1}`}>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
