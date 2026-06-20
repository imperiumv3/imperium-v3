import { GlassCard } from "../components/GlassCard";

export function StorytellingSection() {
  return (
    <section data-section={6} className="lv2-hpanel lv2s6">
      <div className="lv2s6-bg" aria-hidden />
      <div className="lv2s6-inner">
        <span className="lv2-shell-index">— 06 / 12</span>
        <h2 className="lv2s6-title" data-text="STORY">
          <span className="lv2s6-layer lv2s6-layer-a">STORY</span>
          <span className="lv2s6-layer lv2s6-layer-b">STORY</span>
          <span className="lv2s6-layer lv2s6-layer-c">STORY</span>
        </h2>
        <p className="lv2s6-kicker">TELLING</p>
        <div className="lv2s6-grid">
          <GlassCard className="lv2s6-card" glowColor="rgba(120,160,255,0.55)">
            <h3>The Origin</h3>
            <p>Every empire begins with a refusal — a refusal to accept the ordinary. IMPERIUM was forged in that refusal.</p>
          </GlassCard>
          <GlassCard className="lv2s6-card" glowColor="rgba(255,255,255,0.55)">
            <h3>The Arc</h3>
            <p>Four agents. One operator. A continuous narrative of search, craft, optimize, execute.</p>
          </GlassCard>
          <GlassCard className="lv2s6-card" glowColor="rgba(120,200,255,0.55)">
            <h3>The Promise</h3>
            <p>You write the chapters. We move the world to meet them.</p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
