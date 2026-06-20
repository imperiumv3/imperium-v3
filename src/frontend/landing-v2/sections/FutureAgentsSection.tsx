import { GlassCard } from "../components/GlassCard";
import researchImg from "../assets/section-04-future-agents/agent-research.png";
import codingImg from "../assets/section-04-future-agents/agent-coding.png";
import jobImg from "../assets/section-04-future-agents/agent-job.png";
import workflowImg from "../assets/section-04-future-agents/agent-workflow.png";

const AGENTS = [
  { num: "01", title: "Research Agent", img: researchImg, glow: "rgba(255,140,55,0.55)", desc: "Synthesizes sources, surfaces signal, drafts intelligence." },
  { num: "02", title: "Coding Agent", img: codingImg, glow: "rgba(95,205,255,0.55)", desc: "Generates scalable systems and ships software with you." },
  { num: "03", title: "Job Agent", img: jobImg, glow: "rgba(255,90,90,0.55)", desc: "Hunts opportunities, optimizes resumes, automates apply." },
  { num: "04", title: "Workflow Agent", img: workflowImg, glow: "rgba(180,130,255,0.55)", desc: "Orchestrates every agent into one continuous flow." },
] as const;

export function FutureAgentsSection() {
  return (
    <section data-section={4} className="lv2-shell-section lv2-tone-dark lv2s4">
      <div className="lv2s4-grid-bg" aria-hidden />
      <div className="lv2-shell-inner">
        <header className="lv2-shell-head">
          <span className="lv2-shell-index">— 04 / 12</span>
          <span className="lv2-shell-label">FUTURE AGENTS</span>
        </header>
        <div className="lv2s4-headline">
          <h2>
            FOUR AGENTS.
            <br />
            <span className="lv2s4-accent">ONE EMPIRE.</span>
          </h2>
          <p>Each agent operates alone. Together, they build IMPERIUM.</p>
        </div>

        <div className="lv2s4-row">
          {AGENTS.map((a) => (
            <GlassCard key={a.num} className="lv2s4-card" glowColor={a.glow} tilt>
              <img src={a.img} alt={a.title} className="lv2s4-char" loading="lazy" decoding="async" />
              <div className="lv2s4-meta">
                <span className="lv2s4-num">{a.num}</span>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
                <span className="lv2s4-cta">Activate →</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
