import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import journeyAsset from "../assets/section-07-journey/journey.webp.asset.json";

const CARDS = [
  { title: "PROFILE ANALYZE", body: "Analyze profile strengths, skills and opportunities." },
  { title: "ORCHESTRATED", body: "Coordinate specialized agents, assign tasks intelligently." },
  { title: "EXECUTE THAT", body: "Execute actions automatically, apply workflows and deliver outcomes." },
] as const;

export function JourneySection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const cards = ref.current.querySelectorAll(".lv2s7-card");
      const poster = ref.current.querySelector(".lv2s7-poster");
      gsap.from(cards, {
        y: 42,
        opacity: 0,
        duration: 0.75,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
      gsap.to(poster, {
        yPercent: -4,
        ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.7 },
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
    <section ref={ref} data-section={7} className="lv2-section lv2s7">
      <span className="lv2-sec-index">— 07 / 12</span>
      <div className="lv2s7-wrap">
        <img src={journeyAsset.url} alt="Journey begin racing poster" className="lv2s7-poster" loading="lazy" decoding="async" />
        <div className="lv2s7-cards" aria-hidden>
          {CARDS.map((card, index) => (
            <article key={card.title} className={`lv2s7-card lv2s7-card-${index + 1}`}>
              <span className="lv2s7-card-num">{String(index + 1).padStart(2, "0")}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
