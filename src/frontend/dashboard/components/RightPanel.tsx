import { Link } from "@tanstack/react-router";
import type { DashboardData } from "../dashboard.data";
import { AvatarUploader } from "./AvatarUploader";
import { IconMail, IconBriefcase, IconDoc, IconUsers, IconHandshake } from "./icons";

export function RightPanel({ data }: { data: DashboardData }) {
  return (
    <div className="dash-col dash-col-right">
      <ProfileCard data={data} />
      <QuickActionsCard />
      <PipelineCard data={data} />
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
      <div style={{ display: "grid", gap: 10 }}>
        <Link to="/jobs" style={linkStyle}><IconBriefcase width={16} height={16}/> Discover Jobs</Link>
        <Link to="/resume" style={linkStyle}><IconDoc width={16} height={16}/> Open Resume Studio</Link>
        <Link to="/applications" style={linkStyle}><IconUsers width={16} height={16}/> Application Tracker</Link>
        <Link to="/autopilot" style={linkStyle}><IconHandshake width={16} height={16}/> Autopilot</Link>
      </div>
    </div>
  );
}

function PipelineCard({ data }: { data: DashboardData }) {
  const o = data.careerOverview;
  const row = (label: string, value: number, suffix = "") => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #f1e2d6", fontSize: 13 }}>
      <span style={{ color: "var(--dash-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}{suffix}</span>
    </div>
  );
  return (
    <div className="dash-card">
      <div className="dash-card-title">Pipeline</div>
      <div>
        {row("Jobs Discovered", o.jobsDiscovered)}
        {row("Applications Submitted", o.applications)}
        {row("Under Review", o.underReview)}
        {row("Interviews", o.interviews)}
        {row("Offers", o.offers)}
        {row("Response Rate", o.responseRatePct, "%")}
      </div>
    </div>
  );
}
