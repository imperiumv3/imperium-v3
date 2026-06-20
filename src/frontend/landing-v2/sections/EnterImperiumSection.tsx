import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSession } from "@frontend/auth/session";
import charAsset from "../assets/section-11-creator/creator-character.png.asset.json";

export function EnterImperiumSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();

  useGSAP(
    () => {
      if (!ref.current) return;
      const st = { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 } as const;
      gsap.fromTo(".lv2s12n-char", { y: 40 }, { y: -40, ease: "none", scrollTrigger: st });
      return () => ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
    },
    { scope: ref },
  );

  function onEnter() { navigate({ to: session ? "/dashboard" : "/auth" }); }

  return (
    <section ref={ref} data-section={12} className="lv2s12n">
      <div className="lv2s12n-bg" aria-hidden />
      <div className="lv2s12n-rocks" aria-hidden>
        <span /><span />
      </div>

      {/* right nav */}
      <nav className="lv2s12n-nav" aria-label="Section nav">
        <button type="button">HOME</button>
        <button type="button" className="lv2s12n-nav-active">CHARACTER</button>
        <button type="button">MOVIE</button>
        <button type="button">SERVICE</button>
      </nav>

      {/* huge sideways title */}
      <div className="lv2s12n-title" aria-label="Hunter Sung Jinwoo - Shadow Monarch">
        <span className="lv2s12n-chip">HUNTER</span>
        <span className="lv2s12n-word">SUNG</span>
        <span className="lv2s12n-word lv2s12n-word--outline">JINWOO</span>
      </div>
      <p className="lv2s12n-sub">SHADOW MONARCH</p>
      <p className="lv2s12n-quote">"THE SYSTEM USES ME, AND I USE THE SYSTEM."</p>

      {/* magenta paint splash */}
      <div className="lv2s12n-splash" aria-hidden />

      {/* character lying horizontally */}
      <img src={charAsset.url} alt="" className="lv2s12n-char" aria-hidden loading="lazy" />

      {/* tag column bottom-left */}
      <p className="lv2s12n-tag">I AM A GRAPHIC DESIGNER, DZULVERSE.</p>

      {/* explore button */}
      <button type="button" className="lv2s12n-cta" onClick={onEnter}>
        <span>EXPLORE THE WORLD</span>
        <i aria-hidden>→</i>
      </button>

      {/* small footer brand */}
      <span className="lv2s12n-brand">Part of <strong>RUANG EDIT</strong></span>
    </section>
  );
}
