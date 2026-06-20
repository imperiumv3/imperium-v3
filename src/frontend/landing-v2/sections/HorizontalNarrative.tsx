import { useLayoutEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { StorytellingSection } from "./StorytellingSection";
import { JourneySection } from "./JourneySection";
import { ProfileAnalyzeSection } from "./ProfileAnalyzeSection";
import { WorkflowAgentSection } from "./WorkflowAgentSection";
import { ExecuteSection } from "./ExecuteSection";

gsap.registerPlugin(ScrollTrigger);

const CHIPS = [
  { id: 6, label: "STORY" },
  { id: 7, label: "JOURNEY" },
  { id: 8, label: "PROFILE" },
  { id: 9, label: "WORKFLOW" },
  { id: 10, label: "EXECUTE" },
];

/**
 * Sections 6→10 pinned as a single horizontal scrolling track.
 * Scrolling vertically translates the track horizontally.
 */
export function HorizontalNarrative() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // CSS variable for panel count → drives width
    if (trackRef.current) {
      trackRef.current.style.setProperty("--panels", CHIPS.length.toString());
    }
  }, []);

  useGSAP(
    () => {
      if (!wrapRef.current || !trackRef.current) return;
      const panels = CHIPS.length;
      const distance = (panels - 1) * window.innerWidth;
      const tween = gsap.to(trackRef.current, {
        x: () => -distance,
        ease: "none",
        scrollTrigger: {
          trigger: wrapRef.current,
          pin: true,
          scrub: 0.8,
          start: "top top",
          end: () => `+=${distance}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const idx = Math.round(self.progress * (panels - 1));
            const chips = chipsRef.current?.querySelectorAll<HTMLElement>(".lv2-hchip");
            chips?.forEach((c, i) => c.classList.toggle("is-active", i === idx));
          },
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: wrapRef },
  );

  function goPanel(idx: number) {
    const st = ScrollTrigger.getAll().find((t) => t.trigger === wrapRef.current);
    if (!st) return;
    const total = st.end - st.start;
    const target = st.start + (total * idx) / (CHIPS.length - 1);
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  return (
    <div ref={wrapRef} className="lv2-hwrap" data-horizontal-track>
      <div ref={chipsRef} className="lv2-hchips" aria-label="Horizontal section progress">
        {CHIPS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`lv2-hchip ${i === 0 ? "is-active" : ""}`}
            onClick={() => goPanel(i)}
          >
            <span className="lv2-hchip-num">{String(c.id).padStart(2, "0")}</span>
            <span className="lv2-hchip-label">{c.label}</span>
            <span className="lv2-hchip-bar" aria-hidden />
          </button>
        ))}
      </div>
      <div ref={trackRef} className="lv2-htrack">
        <StorytellingSection />
        <JourneySection />
        <ProfileAnalyzeSection />
        <WorkflowAgentSection />
        <ExecuteSection />
      </div>
    </div>
  );
}
