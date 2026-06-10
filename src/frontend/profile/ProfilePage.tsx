import "./profile.css";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useProfilePageData } from "./profile.data";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileCard } from "./components/ProfileCard";
import { StatusCard } from "./components/StatusCard";
import { RightRail } from "./components/RightRail";
import { ProfileEditDialog } from "./components/ProfileEditDialog";
import {
  EducationCard, ExperienceCard, JobPreferencesCard, SummaryCard,
  SkillsCard, ProjectsCard, ResumeCard, CertificationsCard, JobPrefDetailedCard,
} from "./components/Sections";

export function ProfilePage() {
  const data = useProfilePageData();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => {
    function open() { setEditOpen(true); }
    window.addEventListener("profile:edit", open as EventListener);
    return () => window.removeEventListener("profile:edit", open as EventListener);
  }, []);
  return (
    <div className="profile-root">
      <div className="profile-topbar">
        <div className="profile-logo" aria-hidden>◐</div>
        <div className="profile-top-actions">
          <button className="profile-gear" onClick={() => setEditOpen(true)} aria-label="Edit profile" title="Edit profile">✎ Edit</button>
          <button className="profile-gear" onClick={() => navigate({ to: "/settings" })} aria-label="Settings">⚙</button>
        </div>
      </div>

      <ProfileEditDialog open={editOpen} onClose={() => setEditOpen(false)} profile={data.profile} />


      <div className="profile-hero">
        <ProfileHeader />
        <ProfileCard data={data} />
        <RightRail data={data} />
      </div>

      <div className="profile-status-row">
        <StatusCard variant="green" tag="EXTRACT" title="Profile Extraction"
          items={data.extraction.map((e) => ({ label: (e.ok ? "✓ " : "• ") + e.label }))}
          footer="Local extraction complete" />
        <StatusCard variant="red" tag="GAPS" title="Missing Information"
          items={data.missing.length ? data.missing : [{ label: "All required fields present" }]}
          footer={`${data.missing.length} items need attention`} />
        <StatusCard variant="yellow" tag="OPTIMIZE" title="Optimization Suggestions"
          items={data.optimization}
          footer={`ATS Score: ${data.scores.atsReadiness}/100`} />
      </div>

      <div className="profile-row-3">
        <EducationCard data={data} />
        <ExperienceCard data={data} />
        <JobPreferencesCard data={data} />
      </div>

      <SummaryCard data={data} />

      <div className="profile-row-3">
        <SkillsCard data={data} />
        <ProjectsCard data={data} />
        <ResumeCard data={data} />
      </div>

      <div className="profile-row-2">
        <CertificationsCard data={data} />
        <JobPrefDetailedCard data={data} />
      </div>
    </div>
  );
}

export default ProfilePage;
