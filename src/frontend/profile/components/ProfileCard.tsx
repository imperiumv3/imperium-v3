import avatar from "@/assets/profile/avatar-placeholder.jpg";
import type { ProfilePageData } from "../profile.data";

function inferYearsExperience(experience: ProfilePageData["profile"]["experience"]): number {
  if (!experience || experience.length === 0) return 0;
  // Sum month-spans across roles, then convert to years (floor).
  let months = 0;
  for (const e of experience) {
    const startStr = (e.start ?? "").trim();
    if (!startStr) continue;
    const start = new Date(startStr);
    const endStr = (e.current ? "" : (e.end ?? "")).trim();
    const end = endStr ? new Date(endStr) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (m > 0) months += m;
  }
  return Math.floor(months / 12);
}

export function ProfileCard({ data }: { data: ProfilePageData }) {
  const { profile } = data;
  const years = inferYearsExperience(profile.experience);
  const expLabel = years <= 0 ? "Fresher" : `${years} Year${years === 1 ? "" : "s"} Exp`;
  const city = profile.location?.split(",")[0]?.trim() || "—";
  return (
    <div className="profile-card">
      <div className="profile-card-badge" aria-hidden />
      <img src={avatar} alt={profile.name || "Profile"} className="profile-card-img" width={768} height={1024} loading="lazy" />
      <div className="profile-card-meta">
        <div className="role">{profile.headline || "—"}</div>
        <div className="name">{profile.name || "—"}</div>
        <div className="meta-row">
          <span>{expLabel}</span><span className="dot" /><span>{city}</span>
        </div>
      </div>
    </div>
  );
}
