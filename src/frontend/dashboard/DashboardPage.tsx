import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@frontend/auth/session";
import "./dashboard.css";
import { useDashboardData } from "./dashboard.data";

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi-label">{label}</div>
      <div className="dash-kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}

function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleLogout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="dash-gear-wrap" ref={ref}>
      <button className="dash-gear" aria-label="Settings" onClick={() => setOpen((v) => !v)}>⚙</button>
      {open && (
        <div className="dash-settings-pop" role="menu">
          <button onClick={() => { setOpen(false); navigate({ to: "/profile" }); }}>Profile</button>
          <button onClick={() => { setOpen(false); handleLogout(); }}>Logout</button>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const data = useDashboardData();
  const navigate = useNavigate();
  const k = data.kpis;
  const responsePct = Math.round(k.responseRate * 100);

  return (
    <div className="dash-root">
      <header className="dash-topbar">
        <div className="dash-brand">
          <div className="dash-brand-text">
            <div className="name">IMPERIUM</div>
            <div className="sub">JOB AGENT</div>
          </div>
        </div>
        <SettingsMenu />
      </header>

      <div className="dash-hero">
        <h1 className="dash-hero-title">
          {data.identity.fullName === "there"
            ? "Welcome to Imperium"
            : `Welcome back, ${data.identity.fullName}`}
        </h1>
        <p className="dash-hero-sub">
          {data.hasAnyData
            ? "Your operational control center for job discovery and applications."
            : "Discover roles, generate tailored resumes, and track every application — all in one place."}
        </p>
      </div>

      <section className="dash-kpis">
        <KpiCard label="Applications Submitted" value={k.applicationsSubmitted} />
        <KpiCard label="Under Review" value={k.underReview} />
        <KpiCard label="Interviews" value={k.interviews} accent="#39a896" />
        <KpiCard label="Offers" value={k.offers} accent="#ee7b5a" />
        <KpiCard label="Active" value={k.active} />
        <KpiCard label="Response Rate" value={k.applicationsSubmitted === 0 ? "—" : `${responsePct}%`} />
      </section>

      <section className="dash-actions">
        <button className="dash-cta" onClick={() => navigate({ to: "/jobs" })}>
          {k.applicationsSubmitted === 0 ? "Discover Jobs →" : "Find More Jobs →"}
        </button>
        <button className="dash-cta-ghost" onClick={() => navigate({ to: "/applications" })}>
          Open Tracker
        </button>
        <button className="dash-cta-ghost" onClick={() => navigate({ to: "/profile" })}>
          Update Profile
        </button>
      </section>

      <section className="dash-activity-card">
        <div className="dash-card-title">Recent Activity</div>
        {data.loading && data.recentActivity.length === 0 ? (
          <div className="dash-empty">Loading…</div>
        ) : data.recentActivity.length === 0 ? (
          <div className="dash-empty">
            No activity yet. Start by discovering jobs that match your profile.
          </div>
        ) : (
          <ul className="dash-activity">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="dash-activity-row">
                <span className="dash-activity-label">{a.label}</span>
                <span className="dash-activity-time">{a.timeAgo}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
