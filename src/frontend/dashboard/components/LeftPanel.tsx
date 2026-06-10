import type { DashboardData } from "../dashboard.data";
import {
  IconBriefcase, IconStrength, IconEnergy, IconVelocity, IconFocus, IconInfo,
} from "./icons";

/** Identity + real profile-derived attributes. Replaces the old
 *  XP/rank/powers gamification with concrete profile signals.
 *  Visual structure (cards, spacing, attribute bars) is preserved. */
export function LeftPanel({ data }: { data: DashboardData }) {
  const { identity, attributes, careerOverview } = data;
  const profileComplete = attributes.profileStrength;

  return (
    <div className="dash-col">
      <div className="dash-card dash-identity">
        <div className="name">{(identity.fullName || "Operator").toUpperCase()}</div>
        <div className="title">{identity.title}</div>
      </div>

      <div className="dash-card dash-rank">
        <div className="badge"><IconBriefcase width={26} height={26} /></div>
        <div>
          <div className="label">Profile Strength</div>
          <div className="xpbar"><div style={{ width: `${profileComplete}%` }} /></div>
          <div className="xp-text">{profileComplete}% complete</div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-title">
          Profile Signals
          <IconInfo width={14} height={14} style={{ color: "#cdb6a4" }} />
        </div>
        <div className="dash-attrs">
          <Attr icon={<IconStrength width={18} height={18}/>} label="ATS Readiness"   value={attributes.atsReadiness} />
          <Attr icon={<IconEnergy   width={18} height={18}/>} label="Resume Quality"  value={attributes.resumeQuality} />
          <Attr icon={<IconVelocity width={18} height={18}/>} label="Response Rate"   value={attributes.responseRate} suffix="%" />
          <Attr icon={<IconFocus    width={18} height={18}/>} label="Profile Strength" value={attributes.profileStrength} />
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-title">Pipeline Snapshot</div>
        <div className="dash-attrs">
          <MiniRow label="Applications" value={careerOverview.applications} />
          <MiniRow label="Under Review" value={careerOverview.underReview} />
          <MiniRow label="Interviews"   value={careerOverview.interviews} />
          <MiniRow label="Offers"       value={careerOverview.offers} />
        </div>
      </div>
    </div>
  );
}

function Attr({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <div className="dash-attr">
      <span className="ico">{icon}</span>
      <span className="label">{label}</span>
      <span className="val">{value}{suffix ?? ""}</span>
      <div className="bar"><div style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--dash-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
