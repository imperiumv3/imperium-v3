import { GlassCard } from "../components/GlassCard";

const CARDS = [
  { num: "01", title: "THE JOURNEY", desc: "From a single line of code to a complete operating system for ambition.", glow: "rgba(120,180,255,0.55)" },
  { num: "02", title: "THE BUILD", desc: "Engineered solo. Designed without compromise. Every pixel is a choice.", glow: "rgba(255,90,90,0.55)" },
  { num: "03", title: "THE VISION", desc: "An empire of agents working in lockstep — for the operator, not against them.", glow: "rgba(255,140,90,0.55)" },
  { num: "04", title: "THE FUTURE", desc: "Voice. Vision. Autonomy. The next chapter is already being written.", glow: "rgba(160,120,255,0.55)" },
] as const;

export function CreatorSection() {
  return (
    <section data-section={11} className="lv2-shell-section lv2-tone-ink lv2s11">
      <div className="lv2s11-bg" aria-hidden />
      <div className="lv2-shell-inner">
        <header className="lv2-shell-head">
          <span className="lv2-shell-index">— 11 / 12</span>
          <span className="lv2-shell-label">THE CREATOR</span>
        </header>

        <div className="lv2s11-row">
          <div className="lv2s11-left">
            <p className="lv2s11-kicker">DESIGNED &amp; BUILT BY</p>
            <h2 className="lv2s11-name">
              <span className="lv2s11-name-solid">DINESH</span>
              <span className="lv2s11-name-outline" aria-hidden>DINESH</span>
            </h2>
            <p className="lv2s11-bio">
              One builder. One belief: that ambition deserves better tools.
              IMPERIUM is the operating system I wish I had when I was applying
              for my first role — and the one I built so no one ever has to apply alone again.
            </p>
            <div className="lv2s11-stats">
              <div><strong>4</strong><span>AGENTS</span></div>
              <div><strong>12</strong><span>CHAPTERS</span></div>
              <div><strong>1</strong><span>OPERATOR</span></div>
            </div>
          </div>

          <div className="lv2s11-cards">
            {CARDS.map((c) => (
              <GlassCard key={c.num} className="lv2s11-card" glowColor={c.glow} tilt>
                <span className="lv2s11-card-num">{c.num}</span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
