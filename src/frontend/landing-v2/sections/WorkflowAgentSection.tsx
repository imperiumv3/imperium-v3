import { GlassCard } from "../components/GlassCard";

const NODES = [
  { tag: "01", title: "Job Discovery Engine", desc: "Continuously scans markets, surfaces only the matches that matter.", glow: "rgba(255,255,255,0.6)" },
  { tag: "02", title: "Resume Studio", desc: "Crafts a tailored resume for every role — automatically.", glow: "rgba(120,200,255,0.55)" },
  { tag: "03", title: "Application Tracker", desc: "Closes the loop. Follow-ups, status, and learnings in one stream.", glow: "rgba(255,150,90,0.55)" },
] as const;

export function WorkflowAgentSection() {
  return (
    <section data-section={9} className="lv2-hpanel lv2s9">
      <div className="lv2s9-yin" aria-hidden />
      <div className="lv2s9-inner">
        <header className="lv2s9-head">
          <span className="lv2-shell-index">— 09 / 12</span>
          <h2>WORKFLOW<br/><em>AGENT.</em></h2>
          <p>The orchestrator. Black on white. Signal on noise.</p>
        </header>

        <div className="lv2s9-arc">
          <svg className="lv2s9-connectors" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden>
            <path d="M 100 250 Q 500 50 900 250" fill="none" stroke="url(#wfg)" strokeWidth="1.5" strokeDasharray="6 8" />
            <defs>
              <linearGradient id="wfg" x1="0" x2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.7)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
              </linearGradient>
            </defs>
          </svg>
          {NODES.map((n, i) => (
            <GlassCard key={n.tag} className={`lv2s9-node lv2s9-node-${i + 1}`} glowColor={n.glow} tilt>
              <span className="lv2s9-tag">{n.tag}</span>
              <h3>{n.title}</h3>
              <p>{n.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
