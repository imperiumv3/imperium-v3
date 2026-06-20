import { useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSession } from "@frontend/auth/session";
import enterAsset from "../assets/section-12-enter/enter-imperium.webp.asset.json";

function scrollToSection(index: number) {
  const el = document.querySelector<HTMLElement>(`[data-section="${index}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function EnterImperiumSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();

  useGSAP(
    () => {
      if (!ref.current) return;
      const poster = ref.current.querySelector(".lv2s12-poster");
      const trailers = ref.current.querySelectorAll(".lv2s12-trailer");
      gsap.fromTo(
        poster,
        { scale: 1.05 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.8,
          },
        },
      );
      gsap.from(trailers, {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
      return () => {
        ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); });
      };
    },
    { scope: ref },
  );

  function onEnter() {
    if (session) navigate({ to: "/dashboard" });
    else navigate({ to: "/auth" });
  }

  return (
    <section ref={ref} data-section={12} className="lv2-section lv2s12">
      <img
        src={enterAsset.url}
        alt="The Rise of Imperium — cinematic hero"
        className="lv2s12-poster"
        loading="lazy"
        decoding="async"
      />
      <div className="lv2s12-fog" aria-hidden />

      <div className="lv2s12-ctas">
        <button type="button" className="lv2s12-btn lv2s12-btn-secondary" onClick={() => scrollToSection(3)}>
          EXPLORE SYSTEM
        </button>
        <button type="button" className="lv2s12-btn lv2s12-btn-secondary" onClick={() => scrollToSection(4)}>
          VIEW AGENTS
        </button>
        <button type="button" className="lv2s12-btn lv2s12-btn-primary" onClick={onEnter}>
          ENTER IMPERIUM <span aria-hidden>→</span>
        </button>
      </div>

      <div className="lv2s12-trailers" aria-hidden>
        <Link to={session ? "/jobs" : "/auth"} className="lv2s12-trailer">
          <span className="lv2s12-trailer-play" aria-hidden>▶</span>
          <strong>JOB AGENT</strong>
          <span className="lv2s12-trailer-time">01:48</span>
        </Link>
        <Link to={session ? "/dashboard" : "/auth"} className="lv2s12-trailer">
          <span className="lv2s12-trailer-play" aria-hidden>▶</span>
          <strong>WORKFLOW AGENT</strong>
          <span className="lv2s12-trailer-time">02:35</span>
        </Link>
      </div>
    </section>
  );
}
