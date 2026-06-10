import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveProfile } from "@backend/api/imperium.api";
import type { ImperiumProfile } from "@backend/profile/ProfileTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: ImperiumProfile;
}

function asLines(arr: string[] | undefined): string {
  return (arr ?? []).join("\n");
}
function fromLines(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}
function asCsv(arr: string[] | undefined): string {
  return (arr ?? []).join(", ");
}
function fromCsv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
function jsonText(v: unknown): string {
  try { return JSON.stringify(v ?? [], null, 2); } catch { return "[]"; }
}
function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export function ProfileEditDialog({ open, onClose, profile }: Props) {
  const qc = useQueryClient();
  const save = useServerFn(saveProfile);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [location, setLocation] = useState(profile.location);
  const [summary, setSummary] = useState(profile.summary);
  const [targetRole, setTargetRole] = useState(profile.target_role);
  const [seniority, setSeniority] = useState(profile.seniority);
  const [workMode, setWorkMode] = useState(profile.work_mode);
  const [targetLocations, setTargetLocations] = useState(asCsv(profile.target_locations));
  const [salMin, setSalMin] = useState(String(profile.salary_expectation?.min ?? ""));
  const [salMax, setSalMax] = useState(String(profile.salary_expectation?.max ?? ""));
  const [salCur, setSalCur] = useState(profile.salary_expectation?.currency ?? "INR");
  const [salPer, setSalPer] = useState(profile.salary_expectation?.period ?? "year");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url);
  const [githubUrl, setGithubUrl] = useState(profile.github_url);
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolio_url);
  const [skills, setSkills] = useState(asCsv(profile.skills));
  const [achievements, setAchievements] = useState(asLines(profile.achievements));
  const [experienceJson, setExperienceJson] = useState(jsonText(profile.experience));
  const [educationJson, setEducationJson] = useState(jsonText(profile.education));
  const [projectsJson, setProjectsJson] = useState(jsonText(profile.projects));
  const [certsJson, setCertsJson] = useState(jsonText(profile.certifications));
  const [languagesJson, setLanguagesJson] = useState(jsonText(profile.languages));

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSave() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name, headline, email, phone, location, summary,
        target_role: targetRole, seniority, work_mode: workMode,
        target_locations: fromCsv(targetLocations),
        salary_expectation: {
          min: salMin ? Number(salMin) : undefined,
          max: salMax ? Number(salMax) : undefined,
          currency: salCur || undefined,
          period: salPer || undefined,
        },
        linkedin_url: linkedinUrl,
        github_url: githubUrl,
        portfolio_url: portfolioUrl,
        skills: fromCsv(skills),
        achievements: fromLines(achievements),
        experience: parseJson(experienceJson, []),
        education: parseJson(educationJson, []),
        projects: parseJson(projectsJson, []),
        certifications: parseJson(certsJson, []),
        languages: parseJson(languagesJson, []),
        onboarded: true,
      };
      await save({ data: payload });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-edit-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-edit-head">
          <h2>Edit profile</h2>
          <button className="profile-edit-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="profile-edit-body">
          <section>
            <h3>Identity</h3>
            <div className="pe-grid-2">
              <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>Headline<input value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
              <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label className="pe-span-2">Location<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
              <label className="pe-span-2">Professional summary
                <textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </label>
            </div>
          </section>

          <section>
            <h3>Job preferences</h3>
            <div className="pe-grid-2">
              <label>Target role<input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} /></label>
              <label>Seniority
                <select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                  <option value="">—</option>
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </label>
              <label>Work mode
                <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
                  <option value="">—</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                  <option value="any">Any</option>
                </select>
              </label>
              <label>Target locations (comma-separated)
                <input value={targetLocations} onChange={(e) => setTargetLocations(e.target.value)} />
              </label>
              <label>Salary min<input value={salMin} onChange={(e) => setSalMin(e.target.value)} /></label>
              <label>Salary max<input value={salMax} onChange={(e) => setSalMax(e.target.value)} /></label>
              <label>Currency<input value={salCur} onChange={(e) => setSalCur(e.target.value)} /></label>
              <label>Period
                <select value={salPer} onChange={(e) => setSalPer(e.target.value as "year" | "month" | "hour")}>
                  <option value="year">per year</option>
                  <option value="month">per month</option>
                  <option value="hour">per hour</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3>Links</h3>
            <div className="pe-grid-2">
              <label className="pe-span-2">LinkedIn URL<input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} /></label>
              <label className="pe-span-2">GitHub URL<input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} /></label>
              <label className="pe-span-2">Portfolio URL<input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} /></label>
            </div>
          </section>

          <section>
            <h3>Skills & achievements</h3>
            <label>Skills (comma-separated)
              <textarea rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} />
            </label>
            <label>Achievements (one per line)
              <textarea rows={4} value={achievements} onChange={(e) => setAchievements(e.target.value)} />
            </label>
          </section>

          <section>
            <h3>Detailed sections (JSON)</h3>
            <p className="pe-hint">Advanced. Edit as JSON arrays. Invalid JSON will reset to empty.</p>
            <label>Experience<textarea rows={6} value={experienceJson} onChange={(e) => setExperienceJson(e.target.value)} /></label>
            <label>Education<textarea rows={6} value={educationJson} onChange={(e) => setEducationJson(e.target.value)} /></label>
            <label>Projects<textarea rows={6} value={projectsJson} onChange={(e) => setProjectsJson(e.target.value)} /></label>
            <label>Certifications<textarea rows={5} value={certsJson} onChange={(e) => setCertsJson(e.target.value)} /></label>
            <label>Languages<textarea rows={4} value={languagesJson} onChange={(e) => setLanguagesJson(e.target.value)} /></label>
          </section>
        </div>
        <div className="profile-edit-foot">
          <button className="pe-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="pe-btn primary" onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

export default ProfileEditDialog;
