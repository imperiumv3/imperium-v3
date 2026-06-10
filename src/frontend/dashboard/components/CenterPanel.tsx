import { useNavigate } from "@tanstack/react-router";
import type { DashboardData } from "../dashboard.data";
import { HeroPortrait } from "./HeroPortrait";
import {
  IconBriefcase, IconDoc, IconUsers, IconHandshake,
  IconArrowRight, ICONS_ACTIVITY,
} from "./icons";

export function CenterPanel({ data }: { data: DashboardData }) {
  const navigate = useNavigate();
  const o = data.careerOverview;
  const firstRun = !data.hasAnyData;

  return (
    <div className="dash-col">
      <HeroPortrait />

      <div className="dash-card">
        <div className="dash-card-title">Career Overview</div>
        <div className="dash-overview">
          <Stat icon={<IconBriefcase width={22} height={22}/>}  bg="#fde2d7" fg="#ee7b5a" label="Jobs Discovered" value={o.jobsDiscovered} />
          <Stat icon={<IconDoc       width={22} height={22}/>}  bg="#d6efe9" fg="#39a896" label="Applications"    value={o.applications} />
          <Stat icon={<IconUsers     width={22} height={22}/>}  bg="#e6dff6" fg="#8c79c4" label="Interviews"      value={o.interviews} />
          <Stat icon={<IconHandshake width={22} height={22}/>}  bg="#fceeca" fg="#cc9a1e" label="Offers"          value={o.offers} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Stat icon={<IconDoc   width={22} height={22}/>} bg="#fff7f1" fg="#7fb8d8" label="Under Review"  value={o.underReview} />
          <Stat icon={<IconUsers width={22} height={22}/>} bg="#fff7f1" fg="#39a896" label="Response Rate" value={o.responseRatePct} suffix="%" />
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-title">Recent Activity</div>
        {data.loading && data.recentActivity.length === 0 ? (
          <div style={{ color: "var(--dash-muted)", fontSize: 13 }}>Loading…</div>
        ) : data.recentActivity.length === 0 ? (
          <div style={{ color: "var(--dash-muted)", fontSize: 13 }}>
            No activity yet. Discover jobs to populate your timeline.
          </div>
        ) : (
          <div className="dash-activity">
            {data.recentActivity.map((a) => {
              const Icon = ICONS_ACTIVITY[a.iconKey];
              return (
                <div key={a.id} className="dash-activity-row">
                  <span className="ico"><Icon width={16} height={16} /></span>
                  <span>{a.label}</span>
                  <span className="time">{a.timeAgo}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="dash-cta" onClick={() => navigate({ to: firstRun ? "/jobs" : "/applications" })}>
        {firstRun ? "Discover Jobs" : "Continue Your Journey"}
        <IconArrowRight width={18} height={18} />
      </button>
    </div>
  );
}

function Stat({ icon, bg, fg, label, value, suffix }: { icon: React.ReactNode; bg: string; fg: string; label: string; value: number; suffix?: string }) {
  return (
    <div className="dash-stat">
      <div className="ico" style={{ background: bg, color: fg }}>{icon}</div>
      <div className="lbl">{label}</div>
      <div className="val">{value.toLocaleString()}{suffix ?? ""}</div>
    </div>
  );
}
