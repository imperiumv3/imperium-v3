import { CpuArchitecture } from "@/components/ui/cpu-architecture";

export function StorytellingSection() {
  return (
    <section data-section={6} className="lv2-hpanel lv2s6">
      <div className="lv2s6-bg" aria-hidden />
      <div className="lv2s6-inner">
        <div className="lv2s6-content">
          <span className="lv2-shell-index">— 06 / 12</span>
          <span className="lv2s6-label">06 JOURNEY</span>
          <h2 className="lv2s6-heading">Start Your Journey</h2>
          <p className="lv2s6-desc">
            Every successful application begins with a single step. Set up your
            profile, define your goals, and let IMPERIUM guide your path toward
            the right opportunities.
          </p>
          <p className="lv2s6-supporting">
            Your profile becomes the foundation for intelligent job matching,
            resume optimization, and application automation throughout the
            platform.
          </p>
        </div>
        <div className="lv2s6-visual">
          <CpuArchitecture
            text="JOURNEY"
            showCpuConnections={true}
            animateText={true}
            animateLines={true}
            animateMarkers={true}
            className="lv2s6-cpu"
          />
        </div>
      </div>
    </section>
  );
}
