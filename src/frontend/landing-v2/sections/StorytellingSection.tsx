import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import storytellingAsset from "../assets/section-06-storytelling/storytelling.webp.asset.json";

export function StorytellingSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const poster = ref.current.querySelector(".lv2s6-poster");
      gsap.fromTo(
        poster,
        { scale: 1.06, yPercent: 4 },
        {
          scale: 1,
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        },
      );
      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === ref.current) t.kill();
        });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={6} className="lv2-section lv2s6">
      <span className="lv2-sec-index">— 06 / 12</span>
      <div className="lv2s6-frame">
        <img
          src={storytellingAsset.url}
          alt="Storytelling poster artwork"
          className="lv2s6-poster"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  );
}
