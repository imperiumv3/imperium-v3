import { Link } from "@tanstack/react-router";
import type { DashboardData } from "../dashboard.data";
import { AvatarUploader } from "./AvatarUploader";
import { IconMail, IconBriefcase, IconDoc, IconUsers, IconHandshake } from "./icons";

export function RightPanel({ data }: { data: DashboardData }) {
  return (
    <div className="dash-col dash-col-right">
      <ProfileCard data={data} />
      <ThisWeekCard data={data} />
      <QuickActionsCard />
    </div>
  );
}

function ProfileCard({ data }: { data: DashboardData }) {
  const i = data.identity;
  return (
    <div className="dash-card dash-profile">
      <AvatarUploader fullName={i.fullName} size={56} />
      <div>
        <div className="name">{(i.fullName || "Operator").toUpperCase()}</div>
        <div className="sub">{i.title}</div>
        <div className="meta" style={{ gridTemplateColumns: "1fr" }}>
          <div className="meta-row">
            <IconMail width={14} height={14}/>
            <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {i.email || "—"}
            </strong>
          </div>
        </div>
        <div className="tabs" style={{ gap: 12 }}>
          <Link to="/profile" style={{ color: "var(--dash-coral)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            Edit profile →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ThisWeekCard({ data }: { data: DashboardData }) {
  const w = data.weekly;
  const cell = (label: string, value: number, fg: string, bg: string) => (
    <div style={{ background: bg, borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--dash-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: "Inter Tight, sans-serif", fontWeight: 800, fontSize: 22, color: fg, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
  return (
    <div className="dash-card">
      <div className="dash-card-title">This Week</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {cell("Applications", w.applicationsThisWeek, "#ee7b5a", "#fde2d7")}
        {cell("Interviews",   w.interviewsThisWeek,   "#8c79c4", "#e6dff6")}
        {cell("Offers",       w.offersThisWeek,       "#39a896", "#d6efe9")}
        {cell("Active Days",  w.activeDays,           "#cc9a1e", "#fceeca")}
      </div>
    </div>
  );
}

function QuickActionsCard() {
  const linkStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 12,
    background: "#fff7f1", color: "var(--dash-text)",
    textDecoration: "none", fontSize: 13, fontWeight: 600,
    border: "1px solid #f3e8de",
  };
  return (
    <div className="dash-card">
      <div className="dash-card-title">Quick Actions</div>
      <div style={{ display: "grid", gap: 8 }}>
        <Link to="/jobs" style={linkStyle}><IconBriefcase width={16} height={16}/> Discover Jobs</Link>
        <Link to="/resume" style={linkStyle}><IconDoc width={16} height={16}/> Open Resume Studio</Link>
        <Link to="/applications" style={linkStyle}><IconUsers width={16} height={16}/> Application Tracker</Link>
        <Link to="/autopilot" style={linkStyle}><IconHandshake width={16} height={16}/> Autopilot</Link>
      </div>
    </div>
  );
}

