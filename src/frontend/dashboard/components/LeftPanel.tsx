import type { DashboardData } from "../dashboard.data";
import {
  IconBriefcase, IconStrength, IconEnergy, IconVelocity, IconFocus, IconInfo,
} from "./icons";

/** Identity + real profile-derived signals. */
export function LeftPanel({ data }: { data: DashboardData }) {
  const { identity, attributes } = data;
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
          <Attr icon={<IconStrength width={18} height={18}/>} label="ATS Readiness"  value={attributes.atsReadiness} suffix="%" />
          <Attr icon={<IconEnergy   width={18} height={18}/>} label="Resume Quality" value={attributes.resumeQuality} suffix="%" />
          <Attr icon={<IconVelocity width={18} height={18}/>} label="Response Rate"  value={attributes.responseRate}  suffix="%" />
          <Attr icon={<IconFocus    width={18} height={18}/>} label="Skills Covered" value={attributes.skillsCovered} suffix="%" />
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
