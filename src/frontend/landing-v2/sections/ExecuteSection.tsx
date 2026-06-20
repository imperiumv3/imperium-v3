import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@frontend/auth/session";
import { GlassCard } from "../components/GlassCard";

const STEPS = [
  { num: "01", label: "SEARCH" },
  { num: "02", label: "MATCH" },
  { num: "03", label: "OPTIMIZE" },
  { num: "04", label: "APPLY" },
] as const;

const LOG = [
  "▶ booting imperium.execute()",
  "✓ index 4,219 fresh roles  · 12 sources",
  "✓ filtered to 84 high-match opportunities",
  "✓ resume tailored · keyword density 0.94",
  "✓ cover letter generated · tone: confident",
  "▶ dispatching applications…",
  "✓ 18 applied · 4 follow-ups queued",
  "■ execution complete · awaiting next directive",
];

export function ExecuteSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();
  const [step, setStep] = useState(0);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const stepTimer = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1600);
    return () => clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    let i = 0;
    setLines([]);
    const t = setInterval(() => {
      setLines((prev) => (i < LOG.length ? [...prev, LOG[i++]] : prev));
      if (i >= LOG.length) clearInterval(t);
    }, 480);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} data-section={10} className="lv2-hpanel lv2s10">
      <div className="lv2s10-bg" aria-hidden />
      <div className="lv2s10-inner">
        <header className="lv2s10-head">
          <span className="lv2-shell-index">— 10 / 12</span>
          <h2>EXECUTE.</h2>
          <p>One command. Four agents move.</p>
        </header>

        <div className="lv2s10-steps" role="list">
          {STEPS.map((s, i) => (
            <div key={s.num} role="listitem" className={`lv2s10-step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}>
              <span className="lv2s10-step-num">{s.num}</span>
              <span className="lv2s10-step-label">{s.label}</span>
              <span className="lv2s10-step-bar" aria-hidden />
            </div>
          ))}
        </div>

        <GlassCard className="lv2s10-console" glowColor="rgba(255,80,80,0.55)">
          <div className="lv2s10-console-bar" aria-hidden>
            <span /><span /><span />
            <em>imperium ~ /execute</em>
          </div>
          <pre className="lv2s10-log">
            {lines.join("\n")}
            <span className="lv2s10-caret" aria-hidden>▍</span>
          </pre>
        </GlassCard>

        <button type="button" className="lv2s10-cta" onClick={() => navigate({ to: session ? "/jobs" : "/auth" })}>
          EXECUTE TASK →
        </button>
      </div>
    </section>
  );
}
