import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveProfile } from "@backend/api/imperium.api";
import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  ImperiumProfile,
  LanguageItem,
  ProjectItem,
  SalaryExpectation,
} from "@backend/profile/ProfileTypes";

type SectionKey =
  | "identity"
  | "summary"
  | "jobPreferences"
  | "links"
  | "skills"
  | "achievements"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "languages";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: ImperiumProfile;
  section?: string;
}

const SECTION_TITLES: Record<SectionKey, string> = {
  identity: "identity",
  summary: "professional summary",
  jobPreferences: "job preferences",
  links: "links",
  skills: "skills",
  achievements: "achievements",
  experience: "experience",
  education: "education",
  projects: "projects",
  certifications: "certifications",
  languages: "languages",
};

function normalizeSection(section?: string): SectionKey | undefined {
  const value = (section ?? "").toLowerCase();
  if (!value) return undefined;
  if (value.includes("education")) return "education";
  if (value.includes("experience")) return "experience";
  if (value.includes("job") || value.includes("preference")) return "jobPreferences";
  if (value.includes("summary")) return "summary";
  if (value.includes("skill")) return "skills";
  if (value.includes("project")) return "projects";
  if (value.includes("cert")) return "certifications";
  if (value.includes("language")) return "languages";
  if (value.includes("achievement")) return "achievements";
  if (value.includes("link")) return "links";
  return "identity";
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
function cloneArray<T>(arr: T[] | undefined, fallback: T): T[] {
  if (!arr || arr.length === 0) return [fallback];
  return JSON.parse(JSON.stringify(arr)) as T[];
}
function hasAnyValue(item: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => {
    const value = item[key];
    return Array.isArray(value) ? value.length > 0 : typeof value === "boolean" ? value : String(value ?? "").trim().length > 0;
  });
}

const blankEducation = (): EducationItem => ({ school: "", degree: "", field: "", start: "", end: "", gpa: "", description: "" });
const blankExperience = (): ExperienceItem => ({ title: "", company: "", location: "", start: "", end: "", current: false, description: "", highlights: [] });
const blankProject = (): ProjectItem => ({ name: "", description: "", stack: [], url: "", start: "", end: "", current: false, highlights: [] });
const blankCertification = (): CertificationItem => ({ name: "", issuer: "", year: "", url: "" });
const blankLanguage = (): LanguageItem => ({ name: "", proficiency: "conversational" });

export function ProfileEditDialog({ open, onClose, profile, section }: Props) {
  const qc = useQueryClient();
  const save = useServerFn(saveProfile);
  const activeSection = useMemo(() => normalizeSection(section), [section]);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [targetLocations, setTargetLocations] = useState("");
  const [salMin, setSalMin] = useState("");
  const [salMax, setSalMax] = useState("");
  const [salCur, setSalCur] = useState("INR");
  const [salPer, setSalPer] = useState<NonNullable<SalaryExpectation["period"]>>("year");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skills, setSkills] = useState("");
  const [achievements, setAchievements] = useState("");
  const [experience, setExperience] = useState<ExperienceItem[]>([blankExperience()]);
  const [education, setEducation] = useState<EducationItem[]>([blankEducation()]);
  const [projects, setProjects] = useState<ProjectItem[]>([blankProject()]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([blankCertification()]);
  const [languages, setLanguages] = useState<LanguageItem[]>([blankLanguage()]);

  useEffect(() => {
    if (!open) return;
    setName(profile.name ?? "");
    setHeadline(profile.headline ?? "");
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setLocation(profile.location ?? "");
    setSummary(profile.summary ?? "");
    setTargetRole(profile.target_role ?? "");
    setSeniority(profile.seniority ?? "");
    setWorkMode(profile.work_mode ?? "");
    setTargetLocations(asCsv(profile.target_locations));
    setSalMin(String(profile.salary_expectation?.min ?? ""));
    setSalMax(String(profile.salary_expectation?.max ?? ""));
    setSalCur(profile.salary_expectation?.currency ?? "INR");
    setSalPer(profile.salary_expectation?.period ?? "year");
    setLinkedinUrl(profile.linkedin_url ?? "");
    setGithubUrl(profile.github_url ?? "");
    setPortfolioUrl(profile.portfolio_url ?? "");
    setSkills(asCsv(profile.skills));
    setAchievements(asLines(profile.achievements));
    setExperience(cloneArray(profile.experience, blankExperience()));
    setEducation(cloneArray(profile.education, blankEducation()));
    setProjects(cloneArray(profile.projects, blankProject()));
    setCertifications(cloneArray(profile.certifications, blankCertification()));
    setLanguages(cloneArray(profile.languages, blankLanguage()));
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const show = (key: SectionKey) => !activeSection || activeSection === key;
  const title = activeSection ? `Edit ${SECTION_TITLES[activeSection]}` : "Edit profile";

  function addPayload(payload: Record<string, unknown>, key: SectionKey) {
    if (!show(key)) return;
    if (key === "identity") Object.assign(payload, { name, headline, email, phone, location });
    if (key === "summary") Object.assign(payload, { summary });
    if (key === "jobPreferences") {
      Object.assign(payload, {
        target_role: targetRole,
        seniority,
        work_mode: workMode,
        target_locations: fromCsv(targetLocations),
        salary_expectation: {
          min: salMin ? Number(salMin) : undefined,
          max: salMax ? Number(salMax) : undefined,
          currency: salCur || undefined,
          period: salPer || undefined,
        },
      });
    }
    if (key === "links") Object.assign(payload, { linkedin_url: linkedinUrl, github_url: githubUrl, portfolio_url: portfolioUrl });
    if (key === "skills") Object.assign(payload, { skills: fromCsv(skills) });
    if (key === "achievements") Object.assign(payload, { achievements: fromLines(achievements) });
    if (key === "experience") {
      Object.assign(payload, {
        experience: experience
          .map((x) => ({ ...x, highlights: x.highlights ?? [] }))
          .filter((x) => hasAnyValue(x as Record<string, unknown>, ["title", "company", "location", "start", "end", "description", "highlights"])),
      });
    }
    if (key === "education") {
      Object.assign(payload, {
        education: education.filter((x) => hasAnyValue(x as Record<string, unknown>, ["school", "degree", "field", "start", "end", "gpa", "description"])),
      });
    }
    if (key === "projects") {
      Object.assign(payload, {
        projects: projects
          .map((x) => ({ ...x, stack: x.stack ?? [], highlights: x.highlights ?? [] }))
          .filter((x) => hasAnyValue(x as Record<string, unknown>, ["name", "description", "stack", "url", "start", "end", "highlights"])),
      });
    }
    if (key === "certifications") {
      Object.assign(payload, {
        certifications: certifications.filter((x) => hasAnyValue(x as Record<string, unknown>, ["name", "issuer", "year", "url"])),
      });
    }
    if (key === "languages") {
      Object.assign(payload, {
        languages: languages.filter((x) => hasAnyValue(x as Record<string, unknown>, ["name", "proficiency"])),
      });
    }
  }

  async function onSave() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { onboarded: true };
      (["identity", "summary", "jobPreferences", "links", "skills", "achievements", "experience", "education", "projects", "certifications", "languages"] as SectionKey[])
        .forEach((key) => addPayload(payload, key));
      await save({ data: payload });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(activeSection ? `${SECTION_TITLES[activeSection]} saved` : "Profile saved");
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
          <h2>{title}</h2>
          <button className="profile-edit-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="profile-edit-body">
          {show("identity") && (
            <section>
              <h3>Identity</h3>
              <div className="pe-grid-2">
                <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label>Headline<input value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
                <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                <label className="pe-span-2">Location<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
              </div>
            </section>
          )}

          {show("summary") && (
            <section>
              <h3>Professional summary</h3>
              <label>Summary<textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
            </section>
          )}

          {show("jobPreferences") && (
            <section>
              <h3>Job preferences</h3>
              <div className="pe-grid-2">
                <label>Target role<input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} /></label>
                <label>Seniority
                  <select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                    <option value="">—</option><option value="entry">Entry</option><option value="mid">Mid</option><option value="senior">Senior</option><option value="lead">Lead</option>
                  </select>
                </label>
                <label>Work mode
                  <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
                    <option value="">—</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option><option value="any">Any</option>
                  </select>
                </label>
                <label>Target locations<input value={targetLocations} onChange={(e) => setTargetLocations(e.target.value)} /></label>
                <label>Salary min<input value={salMin} onChange={(e) => setSalMin(e.target.value)} /></label>
                <label>Salary max<input value={salMax} onChange={(e) => setSalMax(e.target.value)} /></label>
                <label>Currency<input value={salCur} onChange={(e) => setSalCur(e.target.value)} /></label>
                <label>Period
                  <select value={salPer} onChange={(e) => setSalPer(e.target.value as NonNullable<SalaryExpectation["period"]>)}>
                    <option value="year">per year</option><option value="month">per month</option><option value="hour">per hour</option>
                  </select>
                </label>
              </div>
            </section>
          )}

          {show("links") && (
            <section>
              <h3>Links</h3>
              <div className="pe-grid-2">
                <label className="pe-span-2">LinkedIn URL<input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} /></label>
                <label className="pe-span-2">GitHub URL<input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} /></label>
                <label className="pe-span-2">Portfolio URL<input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} /></label>
              </div>
            </section>
          )}

          {show("skills") && (
            <section>
              <h3>Skills</h3>
              <label>Skills<textarea rows={4} value={skills} onChange={(e) => setSkills(e.target.value)} /></label>
            </section>
          )}

          {show("achievements") && (
            <section>
              <h3>Achievements</h3>
              <label>Achievements<textarea rows={5} value={achievements} onChange={(e) => setAchievements(e.target.value)} /></label>
            </section>
          )}

          {show("education") && (
            <section>
              <h3>Education</h3>
              {education.map((item, index) => (
                <div className="pe-item" key={item.id ?? index}>
                  <div className="pe-item-head"><strong>Education {index + 1}</strong><button type="button" onClick={() => setEducation((rows) => rows.filter((_, i) => i !== index))}>Remove</button></div>
                  <div className="pe-grid-2">
                    <label>Degree<input value={item.degree ?? ""} onChange={(e) => setEducation((rows) => rows.map((x, i) => i === index ? { ...x, degree: e.target.value } : x))} /></label>
                    <label>Specialization<input value={item.field ?? ""} onChange={(e) => setEducation((rows) => rows.map((x, i) => i === index ? { ...x, field: e.target.value } : x))} /></label>
                    <label>College<input value={item.school ?? ""} onChange={(e) => setEducation((rows) => rows.map((x, i) => i === index ? { ...x, school: e.target.value } : x))} /></label>
                    <label>Graduation year<input value={item.end ?? ""} onChange={(e) => setEducation((rows) => rows.map((x, i) => i === index ? { ...x, end: e.target.value } : x))} /></label>
                    <label>Start year<input value={item.start ?? ""} onChange={(e) => setEducation((rows) => rows.map((x, i) => i === index ? { ...x, start: e.target.value } : x))} /></label>
                    <label>CGPA<input value={item.gpa ?? ""} onChange={(e) => setEducation((rows) => rows.map((x, i) => i === index ? { ...x, gpa: e.target.value } : x))} /></label>
                    <label className="pe-span-2">Description<textarea rows={3} value={item.description ?? ""} onChange={(e) => setEducation((rows) => rows.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} /></label>
                  </div>
                </div>
              ))}
              <button className="pe-add" type="button" onClick={() => setEducation((rows) => [...rows, blankEducation()])}>+ Add education</button>
            </section>
          )}

          {show("experience") && (
            <section>
              <h3>Experience</h3>
              {experience.map((item, index) => (
                <div className="pe-item" key={item.id ?? index}>
                  <div className="pe-item-head"><strong>Experience {index + 1}</strong><button type="button" onClick={() => setExperience((rows) => rows.filter((_, i) => i !== index))}>Remove</button></div>
                  <div className="pe-grid-2">
                    <label>Role<input value={item.title ?? ""} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} /></label>
                    <label>Company<input value={item.company ?? ""} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, company: e.target.value } : x))} /></label>
                    <label>Location<input value={item.location ?? ""} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, location: e.target.value } : x))} /></label>
                    <label>Start<input value={item.start ?? ""} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, start: e.target.value } : x))} /></label>
                    <label>End<input value={item.end ?? ""} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, end: e.target.value } : x))} /></label>
                    <label className="pe-check"><input type="checkbox" checked={!!item.current} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, current: e.target.checked } : x))} /> Current role</label>
                    <label className="pe-span-2">Description<textarea rows={3} value={item.description ?? ""} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} /></label>
                    <label className="pe-span-2">Highlights<textarea rows={3} value={asLines(item.highlights)} onChange={(e) => setExperience((rows) => rows.map((x, i) => i === index ? { ...x, highlights: fromLines(e.target.value) } : x))} /></label>
                  </div>
                </div>
              ))}
              <button className="pe-add" type="button" onClick={() => setExperience((rows) => [...rows, blankExperience()])}>+ Add experience</button>
            </section>
          )}

          {show("projects") && (
            <section>
              <h3>Projects</h3>
              {projects.map((item, index) => (
                <div className="pe-item" key={item.id ?? index}>
                  <div className="pe-item-head"><strong>Project {index + 1}</strong><button type="button" onClick={() => setProjects((rows) => rows.filter((_, i) => i !== index))}>Remove</button></div>
                  <div className="pe-grid-2">
                    <label>Name<input value={item.name ?? ""} onChange={(e) => setProjects((rows) => rows.map((x, i) => i === index ? { ...x, name: e.target.value } : x))} /></label>
                    <label>URL<input value={item.url ?? ""} onChange={(e) => setProjects((rows) => rows.map((x, i) => i === index ? { ...x, url: e.target.value } : x))} /></label>
                    <label>Stack<input value={asCsv(item.stack)} onChange={(e) => setProjects((rows) => rows.map((x, i) => i === index ? { ...x, stack: fromCsv(e.target.value) } : x))} /></label>
                    <label>End<input value={item.end ?? ""} onChange={(e) => setProjects((rows) => rows.map((x, i) => i === index ? { ...x, end: e.target.value } : x))} /></label>
                    <label className="pe-span-2">Description<textarea rows={3} value={item.description ?? ""} onChange={(e) => setProjects((rows) => rows.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} /></label>
                    <label className="pe-span-2">Highlights<textarea rows={3} value={asLines(item.highlights)} onChange={(e) => setProjects((rows) => rows.map((x, i) => i === index ? { ...x, highlights: fromLines(e.target.value) } : x))} /></label>
                  </div>
                </div>
              ))}
              <button className="pe-add" type="button" onClick={() => setProjects((rows) => [...rows, blankProject()])}>+ Add project</button>
            </section>
          )}

          {show("certifications") && (
            <section>
              <h3>Certifications</h3>
              {certifications.map((item, index) => (
                <div className="pe-item" key={item.id ?? index}>
                  <div className="pe-item-head"><strong>Certification {index + 1}</strong><button type="button" onClick={() => setCertifications((rows) => rows.filter((_, i) => i !== index))}>Remove</button></div>
                  <div className="pe-grid-2">
                    <label>Name<input value={item.name ?? ""} onChange={(e) => setCertifications((rows) => rows.map((x, i) => i === index ? { ...x, name: e.target.value } : x))} /></label>
                    <label>Issuer<input value={item.issuer ?? ""} onChange={(e) => setCertifications((rows) => rows.map((x, i) => i === index ? { ...x, issuer: e.target.value } : x))} /></label>
                    <label>Year<input value={item.year ?? ""} onChange={(e) => setCertifications((rows) => rows.map((x, i) => i === index ? { ...x, year: e.target.value } : x))} /></label>
                    <label>URL<input value={item.url ?? ""} onChange={(e) => setCertifications((rows) => rows.map((x, i) => i === index ? { ...x, url: e.target.value } : x))} /></label>
                  </div>
                </div>
              ))}
              <button className="pe-add" type="button" onClick={() => setCertifications((rows) => [...rows, blankCertification()])}>+ Add certification</button>
            </section>
          )}

          {show("languages") && (
            <section>
              <h3>Languages</h3>
              {languages.map((item, index) => (
                <div className="pe-item" key={index}>
                  <div className="pe-item-head"><strong>Language {index + 1}</strong><button type="button" onClick={() => setLanguages((rows) => rows.filter((_, i) => i !== index))}>Remove</button></div>
                  <div className="pe-grid-2">
                    <label>Name<input value={item.name ?? ""} onChange={(e) => setLanguages((rows) => rows.map((x, i) => i === index ? { ...x, name: e.target.value } : x))} /></label>
                    <label>Proficiency<select value={item.proficiency ?? ""} onChange={(e) => setLanguages((rows) => rows.map((x, i) => i === index ? { ...x, proficiency: e.target.value as LanguageItem["proficiency"] } : x))}><option value="">—</option><option value="basic">Basic</option><option value="conversational">Conversational</option><option value="fluent">Fluent</option><option value="native">Native</option></select></label>
                  </div>
                </div>
              ))}
              <button className="pe-add" type="button" onClick={() => setLanguages((rows) => [...rows, blankLanguage()])}>+ Add language</button>
            </section>
          )}
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
