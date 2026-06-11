import "./autopilot.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  localAgentHealth,
  localAgentDispatch,
  localAgentApprove,
  localAgentReject,
  localAgentEvents,
  localAgentStatus,
  type LocalAgentEvent,
  type LocalAgentRun,
} from "@backend/automation/SeleniumBrowserBridge";
import { useResumeStore } from "@frontend/resume/state/useResumeStore";

type StepStatus = "pending" | "running" | "done" | "error";
type Step = { id: number; title: string; subtitle: string; status: StepStatus; ts?: string };

/** Map backend `step` names → execution-row id. */
const STEP_FOR: Record<string, number> = {
  boot: 1, brain: 1, profile: 1,
  navigate: 2,
  classify: 3, listing: 3,
  upload: 4,
  fill: 5, easy_apply: 5, external: 5, external_apply: 5,
  submit: 6, approval: 6, needs_human: 6, login: 6, captcha: 6,
  submitted: 7, done: 7,
};

const INITIAL_STEPS: Step[] = [
  { id: 1, title: "Launch Browser",        subtitle: "Opening Chrome...",                status: "pending" },
  { id: 2, title: "Navigate to Job URL",   subtitle: "Loading job page...",              status: "pending" },
  { id: 3, title: "Extract Job Details",   subtitle: "Reading job information...",       status: "pending" },
  { id: 4, title: "Upload Resume",         subtitle: "Uploading resume.pdf...",          status: "pending" },
  { id: 5, title: "Fill Application Form", subtitle: "Filling personal and job details", status: "pending" },
  { id: 6, title: "Submit Application",    subtitle: "Submitting application...",        status: "pending" },
  { id: 7, title: "Verify Submission",     subtitle: "Verifying application status...",  status: "pending" },
];

function fmtTime(d = new Date()) {
  return d.toLocaleTimeString(undefined, { hour12: true });
}
function fmtDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}
function fmtEventTime(ts?: string) {
  if (!ts) return fmtTime();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? fmtTime() : fmtTime(d);
}
function hostOf(url: string) {
  try { return new URL(url).host; } catch { return ""; }
}

export function AutopilotPage() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const resume = useResumeStore((s) => s.resume);

  const [jobUrl, setJobUrl] = useState("https://www.linkedin.com/jobs/view/");
  const [resumePath, setResumePath] = useState<string>("");
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [jobId, setJobId] = useState<string | null>(null);
  const [run, setRun] = useState<LocalAgentRun | null>(null);
  const [events, setEvents] = useState<LocalAgentEvent[]>([]);
  const [health, setHealth] = useState<{ ok: boolean; chrome: boolean; headless: boolean } | null>(null);
  const [starting, setStarting] = useState(false);
  const [log, setLog] = useState<string[]>(["[ui] waiting for local agent on 127.0.0.1:8000…"]);
  const logSeen = useRef<Set<string>>(new Set());

  /* ── Health polling ── */
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const h = await localAgentHealth();
        if (alive) setHealth(h);
      } catch {
        if (alive) setHealth({ ok: false, chrome: false, headless: false });
      }
    };
    void tick();
    const t = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  /* ── Event/status polling for active run ── */
  useEffect(() => {
    if (!jobId) return;
    let alive = true;

    const pull = async () => {
      try {
        const [ev, st] = await Promise.all([
          localAgentEvents(jobId).catch(() => null),
          localAgentStatus(jobId).catch(() => null),
        ]);
        if (!alive) return;
        if (st) setRun(st);
        if (ev?.events) {
          setEvents(ev.events);
          // Append new lines to log
          setLog((prev) => {
            const next = [...prev];
            for (const e of ev.events) {
              const key = `${e.ts}|${e.step}|${e.action}`;
              if (logSeen.current.has(key)) continue;
              logSeen.current.add(key);
              const mark = e.level === "success" ? "✓" : e.level === "error" ? "✗" : e.level === "warn" ? "!" : "•";
              next.push(`[${fmtEventTime(e.ts)}] ${mark} ${e.step}: ${e.action}`);
            }
            return next.slice(-400);
          });
          // Update step rows
          setSteps((curr) => {
            const copy = curr.map((c) => ({ ...c }));
            for (const e of ev.events) {
              const sid = STEP_FOR[e.step];
              if (!sid) continue;
              for (const row of copy) {
                if (row.id < sid && row.status !== "done") {
                  row.status = "done"; row.ts ||= fmtEventTime(e.ts);
                }
                if (row.id === sid) {
                  row.status = e.level === "error" ? "error" : "running";
                  row.subtitle = e.action.slice(0, 80);
                }
              }
            }
            // Terminal status → mark all <= as done
            if (st && (st.status === "submitted" || st.status === "done")) {
              for (const row of copy) { row.status = "done"; row.ts ||= fmtTime(); }
            }
            return copy;
          });
        }
      } catch (err) {
        console.error("[autopilot] poll failed", err);
      }
    };

    void pull();
    const t = setInterval(pull, 1500);
    return () => { alive = false; clearInterval(t); };
  }, [jobId]);

  const startedAt = run?.created_at ? new Date(run.created_at) : null;
  const elapsed = useMemo(() => {
    if (!startedAt) return "00:00:00";
    const s = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [now, startedAt]);

  const status: "IDLE" | "RUNNING" | "AWAITING" | "DONE" | "ERROR" =
    !run ? "IDLE"
    : run.status === "submitted" || run.status === "done" ? "DONE"
    : run.status === "awaiting_approval" ? "AWAITING"
    : run.status === "error" || run.status === "rejected" || run.status === "cancelled" ? "ERROR"
    : "RUNNING";

  const isActive = status === "RUNNING" || status === "AWAITING";

  const start = useCallback(async () => {
    if (starting || isActive) return;
    const url = jobUrl.trim();
    if (url.length < 8) {
      setLog((l) => [...l, `[${fmtTime()}] ✗ enter a job URL first`]);
      return;
    }
    if (!health?.ok) {
      setLog((l) => [...l, `[${fmtTime()}] ✗ local agent offline — run \`python main.py\` in IMPERIUM/local_agent`]);
      return;
    }
    setStarting(true);
    logSeen.current = new Set();
    setEvents([]);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setLog((l) => [...l, `[${fmtTime()}] ▶ dispatching to local agent…`]);

    const profile: Record<string, unknown> = {
      name: resume.personal.name,
      email: resume.personal.email,
      phone: resume.personal.phone,
      location: resume.personal.location,
      links: resume.personal.links,
      summary: resume.summary,
      skills: resume.skills.flatMap((g) => g.items),
    };
    if (resumePath.trim()) profile.resume_path = resumePath.trim();

    try {
      const res = await localAgentDispatch({ job_url: url, profile });
      setJobId(res.job_id);
      setLog((l) => [...l, `[${fmtTime()}] ✓ queued run ${res.job_id.slice(0, 8)}…`]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLog((l) => [...l, `[${fmtTime()}] ✗ dispatch failed: ${msg}`]);
    } finally {
      setStarting(false);
    }
  }, [starting, isActive, jobUrl, health, resume, resumePath]);

  const approve = useCallback(async () => {
    if (!jobId) return;
    try {
      await localAgentApprove(jobId);
      setLog((l) => [...l, `[${fmtTime()}] ✓ approved — agent will submit`]);
    } catch (err) {
      setLog((l) => [...l, `[${fmtTime()}] ✗ approve failed: ${(err as Error).message}`]);
    }
  }, [jobId]);

  const reject = useCallback(async () => {
    if (!jobId) return;
    try {
      await localAgentReject(jobId);
      setLog((l) => [...l, `[${fmtTime()}] ! rejected — agent will exit`]);
    } catch (err) {
      setLog((l) => [...l, `[${fmtTime()}] ✗ reject failed: ${(err as Error).message}`]);
    }
  }, [jobId]);

  const reset = useCallback(() => {
    setJobId(null); setRun(null); setEvents([]);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    logSeen.current = new Set();
    setLog([`[${fmtTime()}] task reset`]);
  }, []);

  const openJobUrl = () => {
    const u = jobUrl.trim();
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  };

  /* ── Derived view data ── */
  const currentUrl = run?.current_url || hostOf(jobUrl) || "—";
  const currentAction = run?.current_action || (events.at(-1)?.action ?? "Idle");
  const portalLabel = (() => {
    const u = (run?.current_url || jobUrl).toLowerCase();
    if (u.includes("linkedin.com")) return "LinkedIn";
    if (u.includes("greenhouse")) return "Greenhouse";
    if (u.includes("lever.co")) return "Lever";
    if (u.includes("ashbyhq")) return "Ashby";
    if (u.includes("workday")) return "Workday";
    if (u.includes("imperium.jobs")) return "Imperium Jobs";
    return hostOf(jobUrl) || "—";
  })();

  return (
    <div className="la-root">
      <header className="la-header">
        <div className="la-header-center">
          <h1>Local Agent Control Center</h1>
          <p>AI Powered · Local Execution · Real Browser Automation</p>
        </div>
        <div className="la-clock">
          <div className="la-clock-time">{fmtTime(now)}</div>
          <div className="la-clock-date">{fmtDate(now)}</div>
        </div>
        <div className="la-bot" aria-hidden>🤖</div>
      </header>

      <section className="la-status-strip">
        <StatusCard label="Local Agent" value={health?.ok ? "ONLINE" : "OFFLINE"} ok={!!health?.ok} />
        <StatusCard label="Selenium" value={health?.chrome ? "READY" : "MISSING"} ok={!!health?.chrome} />
        <StatusCard label="Chrome Mode" value={health ? (health.headless ? "HEADLESS" : "HEADED") : "—"} ok={!!health} />
        <StatusCard label="System Status" value={health?.ok && health.chrome ? "HEALTHY" : "DEGRADED"} ok={!!(health?.ok && health.chrome)} />
      </section>

      <div className="la-grid">
        <div className="la-col">
          <section className="la-card">
            <div className="la-card-head">
              <div>
                <h2>New Agent Task</h2>
                <p>Tell the agent what you want to do</p>
              </div>
            </div>
            <label className="la-label">Paste Job URL</label>
            <div className="la-input-row">
              <input
                className="la-input"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://www.linkedin.com/jobs/view/..."
              />
              <button className="la-btn la-btn-primary" onClick={start} disabled={starting || isActive || !health?.ok}>
                {starting ? "Dispatching…" : isActive ? "Running…" : "▶ Start Agent"}
              </button>
            </div>
            <label className="la-label" style={{ marginTop: 10 }}>Resume Path (on this machine, optional)</label>
            <input
              className="la-input"
              value={resumePath}
              onChange={(e) => setResumePath(e.target.value)}
              placeholder="C:\Users\you\resume.pdf  (or set RESUME_PATH env var)"
            />
            <div className="la-quick">
              <span className="la-quick-label">Quick Actions:</span>
              <button className="la-chip" onClick={openJobUrl}>🌐 Open Job URL</button>
              <button className="la-chip" onClick={start} disabled={starting || isActive || !health?.ok}>📨 Apply to Job</button>
              <button className="la-chip" onClick={approve} disabled={status !== "AWAITING"}>✅ Approve</button>
              <button className="la-chip" onClick={reject} disabled={!isActive}>⛔ Reject</button>
            </div>
          </section>

          <div className="la-row-2">
            <section className="la-card">
              <h2>Agent Execution Steps</h2>
              <ul className="la-steps">
                {steps.map((s) => (
                  <li key={s.id} className={`la-step la-step-${s.status}`}>
                    <span className="la-step-num">{s.id}</span>
                    <div className="la-step-body">
                      <div className="la-step-title">{s.title}</div>
                      <div className="la-step-sub">{s.subtitle}</div>
                    </div>
                    <span className="la-step-meta">
                      {s.status === "done" ? <span className="la-tick">✓</span>
                       : s.status === "running" ? <span className="la-spin">◐</span>
                       : s.status === "error" ? <span className="la-pending">✗</span>
                       : <span className="la-pending">○</span>}
                      <span className="la-step-ts">{s.ts ?? (s.status === "pending" ? "Pending" : "—")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="la-card">
              <h2>Task Summary</h2>
              <SummaryRow k="Task Type" v="Apply to Job" />
              <SummaryRow k="Portal" v={<b>{health?.ok ? "🟢" : "🔴"} {portalLabel}</b>} />
              <SummaryRow k="Run ID" v={jobId ? <code>{jobId.slice(0, 8)}…</code> : "—"} />
              <SummaryRow k="Current Step" v={run?.current_step || "—"} />
              <SummaryRow k="Progress" v={`${run?.progress ?? 0}%`} />
              <SummaryRow k="Status" v={<span className={`la-pill la-pill-${
                status === "DONE" ? "ok" : status === "ERROR" ? "err" : status === "AWAITING" ? "warn" : status === "RUNNING" ? "run" : "idle"
              }`}>{status}</span>} />
              <SummaryRow k="Started At" v={startedAt ? fmtTime(startedAt) : "—"} />
              <SummaryRow k="Elapsed Time" v={elapsed} />
              <div className="la-sub-label">Resume</div>
              <div className="la-file">
                <span>📄 {resumePath ? resumePath.split(/[\\/]/).pop() : "from RESUME_PATH env"}</span>
                <span className="la-tick">{resumePath ? "✓" : "·"}</span>
              </div>
              <div className="la-sub-label">Form Profile</div>
              <div className="la-file">
                <span>👤 {resume.personal.name || "Default Profile"}</span>
                <span className="la-tick">✓</span>
              </div>
            </section>
          </div>

          <section className="la-card la-log-card">
            <div className="la-log-head">
              <h2>Activity Log {events.length > 0 && <small>({events.length} events)</small>}</h2>
              <div className="la-log-actions">
                <button className="la-btn-ghost" onClick={() => { setLog([]); logSeen.current = new Set(); }}>🗑 Clear Log</button>
                <button className="la-btn-ghost" onClick={() => {
                  const blob = new Blob([log.join("\n")], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob); a.download = "local-agent-log.txt"; a.click();
                }}>⬇ Download Log</button>
              </div>
            </div>
            <pre className="la-log">
              {log.map((l, i) => <div key={i} className={l.includes("✓") ? "la-log-ok" : l.includes("✗") ? "la-log-err" : "la-log-line"}>{l}</div>)}
            </pre>
          </section>
        </div>

        <div className="la-col la-col-right">
          <section className="la-card la-browser">
            <div className="la-browser-head">
              <h2>Live Browser (Chrome)</h2>
              <span className={`la-live ${isActive ? "" : "la-live-off"}`}>{isActive ? "● LIVE" : "○ IDLE"}</span>
            </div>
            <div className="la-chrome">
              <div className="la-chrome-bar">
                <span className="la-dot la-dot-r" /><span className="la-dot la-dot-y" /><span className="la-dot la-dot-g" />
                <div className="la-chrome-tab">{portalLabel}</div>
              </div>
              <div className="la-chrome-url">🔒 {currentUrl}</div>
              <div className="la-chrome-body">
                <div className="la-job-head">
                  <div className="la-job-logo">{(portalLabel[0] || "?").toUpperCase()}</div>
                  <div>
                    <div className="la-job-title">{run?.current_step || "Awaiting task…"}</div>
                    <div className="la-job-company">{currentAction}</div>
                    <div className="la-job-meta">Run progress: {run?.progress ?? 0}%</div>
                  </div>
                </div>
                <div className="la-job-tags">
                  <span className="la-tag">{status}</span>
                  {health?.headless && <span className="la-tag">Headless</span>}
                  {health?.chrome === false && <span className="la-tag">No Selenium</span>}
                </div>
                <div className="la-job-section-title">Last Event</div>
                <p className="la-job-desc">
                  {events.at(-1) ? `[${events.at(-1)!.step}] ${events.at(-1)!.action}` : "No events yet. Click Start Agent."}
                </p>
              </div>
            </div>
          </section>

          <section className="la-card">
            <div className="la-card-head"><h2>Portal Status</h2><span>🌐</span></div>
            <PortalRow k="Website" v={portalLabel} />
            <PortalRow k="Current URL" v={currentUrl} mono />
            <PortalRow k="Page Status" v={<span className={isActive ? "la-info" : "la-ok"}>{run?.current_step || "Idle"}</span>} />
            <PortalRow k="Detection" v={<span className="la-ok">{events.length} events captured</span>} />
            <PortalRow k="Next Action" v={<span className="la-info">{currentAction}</span>} />
          </section>

          <section className="la-card la-controls">
            <h2>Agent Controls</h2>
            <button className="la-btn la-btn-primary" onClick={approve} disabled={status !== "AWAITING"}>
              ✅ {status === "AWAITING" ? "Approve & Submit" : "Approve (waiting for human-step)"}
            </button>
            <button className="la-btn la-btn-warn" onClick={reset}>↻ Reset Task</button>
            <button className="la-btn la-btn-danger" onClick={reject} disabled={!isActive}>⛔ Stop / Reject</button>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="la-status-card" style={{ opacity: ok ? 1 : 0.7 }}>
      <span className="la-status-dot" style={{ background: ok ? "#22c55e" : "#ef4444" }} />
      <div>
        <div className="la-status-label">{label}</div>
        <div className="la-status-value">{value}</div>
      </div>
    </div>
  );
}
function SummaryRow({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="la-sum-row"><span className="la-sum-k">{k}</span><span className="la-sum-v">{v}</span></div>;
}
function PortalRow({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return <div className="la-portal-row"><span className="la-portal-k">{k}</span><span className={`la-portal-v ${mono ? "mono" : ""}`}>{v}</span></div>;
}

export default AutopilotPage;
