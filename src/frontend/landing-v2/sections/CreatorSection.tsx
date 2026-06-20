import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import bgAsset from "../assets/section-11-creator/creator-bg.png.asset.json";
import charAsset from "../assets/section-11-creator/creator-character.png.asset.json";
import dineshTextAsset from "../assets/section-11-creator/dinesh-text.png.asset.json";
import journeyCard from "../assets/section-11-creator/journey-card.jpg.asset.json";
import buildCard from "../assets/section-11-creator/build-card.jpg.asset.json";
import visionCard from "../assets/section-11-creator/vision-card.jpg.asset.json";
import futureCard from "../assets/section-11-creator/future-card.jpg.asset.json";

const CARDS = [
  { num: "01", title: "THE JOURNEY", img: journeyCard.url, accent: "#4aa8ff" },
  { num: "02", title: "THE BUILD", img: buildCard.url, accent: "#ff3a3a" },
  { num: "03", title: "THE VISION", img: visionCard.url, accent: "#ff3a3a" },
  { num: "04", title: "THE FUTURE", img: futureCard.url, accent: "#4aa8ff" },
] as const;

export function CreatorSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const st = { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 } as const;
      gsap.fromTo(".lv2s11n-char", { y: 30 }, { y: -30, ease: "none", scrollTrigger: st });
      gsap.fromTo(".lv2s11n-dinesh", { y: 20 }, { y: -20, ease: "none", scrollTrigger: st });
      return () => ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={11} className="lv2s11n">
      <img src={bgAsset.url} alt="" className="lv2s11n-bg" aria-hidden loading="lazy" />

      {/* corner index */}
      <span className="lv2s11n-idx">11</span>

      {/* top title */}
      <header className="lv2s11n-top">
        <span>THE</span>
        <span>CREATOR</span>
      </header>

      {/* left vertical label */}
      <span className="lv2s11n-vleft" aria-hidden>IMPERIUM SYSTEMS</span>
      {/* right vertical label */}
      <span className="lv2s11n-vright" aria-hidden>BUILDER OF IMPERIUM</span>

      {/* left info panel */}
      <aside className="lv2s11n-left-panel">
        <div>( SYSTEM RESTORE )</div>
        <div>v1.0.0_null</div>
        <div>status: <span className="lv2s11n-on">online</span></div>
        <div>builder: dinesh</div>
        <span className="lv2s11n-underline" aria-hidden />
      </aside>

      {/* right info panel */}
      <aside className="lv2s11n-right-panel">
        <div>role: <span>architect</span></div>
        <div>system: <span>imperium</span></div>
        <div>mission: <span>autonomy</span></div>
        <div>status: <span>building</span></div>
        <span className="lv2s11n-underline" aria-hidden />
      </aside>

      {/* center composition */}
      <div className="lv2s11n-stage">
        <img src={dineshTextAsset.url} alt="" className="lv2s11n-dinesh" aria-hidden loading="lazy" />
        <img src={charAsset.url} alt="" className="lv2s11n-char" aria-hidden loading="lazy" />
      </div>

      {/* signature + quote */}
      <div className="lv2s11n-sig">
        <p className="lv2s11n-sig-name">Dinesh</p>
        <p className="lv2s11n-sig-quote">
          I DON'T FOLLOW THE SYSTEM.<br />
          I BUILD WHAT <span>DOESN'T EXIST.</span>
        </p>
      </div>

      {/* dots top-left */}
      <span className="lv2s11n-dots" aria-hidden>
        <i /><i />
      </span>

      {/* bottom cards strip */}
      <div className="lv2s11n-cards">
        {CARDS.map((c) => (
          <div key={c.num} className="lv2s11n-card" style={{ ["--accent" as never]: c.accent }}>
            <div className="lv2s11n-card-img" style={{ backgroundImage: `url(${c.img})` }} />
            <div className="lv2s11n-card-body">
              <span className="lv2s11n-card-num">{c.num}</span>
              <h3>{c.title}</h3>
              <span className="lv2s11n-card-line" aria-hidden />
            </div>
          </div>
        ))}
      </div>

      {/* bottom credit */}
      <p className="lv2s11n-credit">
        CREATED BY <span>DINESH</span> <em>•</em> BUILDER OF IMPERIUM SYSTEM
      </p>
    </section>
  );
}
