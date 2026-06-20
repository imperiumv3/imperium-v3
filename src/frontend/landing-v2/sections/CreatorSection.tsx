import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import creatorAsset from "../assets/section-11-creator/creator.webp.asset.json";

const CARDS = [
  { num: "01", title: "THE JOURNEY", accent: "blue" },
  { num: "02", title: "THE BUILD", accent: "red" },
  { num: "03", title: "THE VISION", accent: "red" },
  { num: "04", title: "THE FUTURE", accent: "blue" },
] as const;

export function CreatorSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const cards = ref.current.querySelectorAll(".lv2s11-card");
      gsap.from(cards, {
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
      return () => {
        ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={11} className="lv2-section lv2s11">
      <img
        src={creatorAsset.url}
        alt="The Creator — Dinesh, builder of Imperium"
        className="lv2s11-poster"
        loading="lazy"
        decoding="async"
      />
      <div className="lv2s11-cards" aria-hidden>
        {CARDS.map((card) => (
          <article key={card.num} className={`lv2s11-card lv2s11-card-${card.accent}`}>
            <span className="lv2s11-card-num">{card.num}</span>
            <h3 className="lv2s11-card-title">{card.title}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
