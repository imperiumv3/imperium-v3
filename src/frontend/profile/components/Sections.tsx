import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { InfoCard, Field } from "./InfoCard";
import { fileToBase64 } from "../profile.extraction";
import type { ProfilePageData } from "../profile.data";
import {
  importProfileFromPdf,
  importProfileFromLinkedin,
  saveProfile,
} from "@backend/api/imperium.api";

function formatSalary(s: ProfilePageData["profile"]["salary_expectation"]): string {
  if (!s || (!s.min && !s.max)) return "—";
  const cur = s.currency ?? "";
  const per = s.period === "month" ? "/mo" : s.period === "hour" ? "/hr" : "";
  if (s.min && s.max) return `${cur} ${s.min} – ${s.max}${per}`.trim();
  return `${cur} ${s.min ?? s.max}${per}`.trim();
}

export function EducationCard({ data }: { data: ProfilePageData }) {
  const e = data.profile.education[0];
  return (
    <InfoCard title="EDUCATION" icon="🎓" tone="violet" section="education">
      <Field label="DEGREE" value={e?.degree ?? "—"} />
      <Field label="SPECIALIZATION" value={e?.field ?? "—"} />
      <Field label="COLLEGE" value={e?.school ?? "—"} />
      <div className="profile-grid-2">
        <Field label="GRADUATION YEAR" value={e?.end ?? "—"} />
        <Field label="CGPA" value={e?.gpa ?? "—"} />
      </div>
    </InfoCard>
  );
}

function yearsBetween(start?: string, end?: string): number {
  if (!start) return 0;
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export function ExperienceCard({ data }: { data: ProfilePageData }) {
  const exp = data.profile.experience;
  const current = exp[0];
  const previous = exp[1];
  const totalYears = exp.reduce((acc, x) => acc + yearsBetween(x.start, x.end), 0);
  return (
    <InfoCard title="EXPERIENCE" icon="💼" tone="green" section="experience">
      <Field label="CURRENT ROLE" value={current?.title ?? "—"} />
      <Field label="COMPANY" value={current?.company ?? "—"} />
      <Field label="YEARS OF EXPERIENCE" value={totalYears > 0 ? `${totalYears.toFixed(1)} Years` : "—"} />
      <Field label="PREVIOUS ROLE" value={previous?.title ?? "—"} />
    </InfoCard>
  );
}

export function JobPreferencesCard({ data }: { data: ProfilePageData }) {
  const p = data.profile;
  return (
    <InfoCard title="JOB PREFERENCES" icon="🎯" tone="sky" section="jobPreferences">
      <Field label="PREFERRED ROLE" value={p.target_role || "—"} />
      <div className="profile-grid-2">
        <Field label="PREFERRED LOCATION" value={p.target_locations.slice(0, 2).join(", ") || "—"} />
        <Field label="WORK MODE" value={p.work_mode || "—"} />
      </div>
      <div className="profile-grid-2">
        <Field label="SENIORITY" value={p.seniority || "—"} />
        <Field label="EXPECTED CTC" value={formatSalary(p.salary_expectation)} />
      </div>
    </InfoCard>
  );
}

export function SummaryCard({ data }: { data: ProfilePageData }) {
  return (
    <InfoCard title="PROFESSIONAL SUMMARY" icon="👤" tone="violet" className="profile-info--wide" section="summary">
      <p className="profile-summary-body">{data.profile.summary || "No summary on file. Import a resume or LinkedIn profile to populate."}</p>
    </InfoCard>
  );
}

export function SkillsCard({ data }: { data: ProfilePageData }) {
  return (
    <InfoCard title="SKILLS" icon="</>" tone="violet" section="skills">
      <div className="profile-skills">
        {data.profile.skills.length === 0 && <span className="profile-skill muted">No skills on file</span>}
        {data.profile.skills.slice(0, 12).map((s) => (
          <span key={s} className="profile-skill"><span className="dot" />{s}</span>
        ))}
      </div>
    </InfoCard>
  );
}

export function ProjectsCard({ data }: { data: ProfilePageData }) {
  return (
    <InfoCard title="PROJECTS" icon="🗂️" tone="amber" section="projects">
      {data.profile.projects.length === 0 && <div className="profile-empty">No projects on file.</div>}
      <ul className="profile-projects">
        {data.profile.projects.slice(0, 3).map((p) => (
          <li key={p.name}>
            <span className="ico" aria-hidden>◇</span>
            <div>
              <div className="name">{p.name}</div>
              <div className="desc">{p.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}

export function ResumeCard({ data }: { data: ProfilePageData }) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(data.resume.fileName);
  const [size, setSize] = useState(data.resume.sizeLabel);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const importPdf = useServerFn(importProfileFromPdf);
  const save = useServerFn(saveProfile);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const base64 = await fileToBase64(f);
      const extracted = await importPdf({ data: { base64 } });
      await save({ data: extracted as Record<string, unknown> });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setName(f.name);
      setSize(`${(f.size / 1024 / 1024).toFixed(2)} MB`);
      toast.success("Resume parsed and profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume import failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <InfoCard title="RESUME" icon="📄" tone="sky" editable={false}>
      <div className="profile-resume-file">
        <span className="ico">📑</span>
        <div className="meta">
          <div className="name">{name}</div>
          <div className="sub">{size}</div>
        </div>
        <button className="dl" onClick={() => ref.current?.click()} aria-label="Replace resume" disabled={busy}>
          {busy ? "…" : "⤓"}
        </button>
        <input ref={ref} type="file" accept=".pdf" hidden onChange={onFile} />
      </div>
      <div className="profile-resume-row">
        <span className="lbl">MASTER RESUME</span>
        <span className={`pill ${data.resume.active ? "active" : ""}`}>
          {data.resume.active ? "Active" : "Not uploaded"}
        </span>
      </div>
      {data.resume.extracted && (
        <div className="profile-resume-row">
          <span className="ok">✓ Resume Extracted Successfully</span>
        </div>
      )}
    </InfoCard>
  );
}

export function CertificationsCard({ data }: { data: ProfilePageData }) {
  return (
    <InfoCard title="CERTIFICATIONS" icon="🏅" tone="amber" className="profile-info--wide" section="certifications">
      {data.profile.certifications.length === 0 ? (
        <div className="profile-empty">No certifications on file.</div>
      ) : (
        <table className="profile-table">
          <tbody>
            {data.profile.certifications.slice(0, 6).map((c) => (
              <tr key={c.name}>
                <td><span className="ico">●</span> {c.name}</td>
                <td>{c.issuer || "—"}</td>
                <td className="muted">{c.year ? `Issued: ${c.year}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </InfoCard>
  );
}

export function JobPrefDetailedCard({ data }: { data: ProfilePageData }) {
  const [url, setUrl] = useState(data.profile.linkedin_url);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const importLinkedin = useServerFn(importProfileFromLinkedin);
  const save = useServerFn(saveProfile);

  async function importLi() {
    if (!url || url.length < 8) {
      toast.error("Enter a valid LinkedIn URL");
      return;
    }
    setBusy(true);
    try {
      const extracted = await importLinkedin({ data: { url } });
      await save({ data: { ...(extracted as Record<string, unknown>), linkedin_url: url } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("LinkedIn profile imported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "LinkedIn import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <InfoCard title="JOB PREFERENCES (DETAILED)" icon="🎯" tone="sky" className="profile-info--wide" section="jobPreferences">
      <div className="profile-grid-3">
        <Field label="PREFERRED ROLE" value={data.profile.target_role || "—"} />
        <Field label="SENIORITY" value={data.profile.seniority || "—"} />
        <Field label="PREFERRED LOCATION" value={data.profile.target_locations.join(", ") || "—"} />
        <Field label="EXPECTED CTC" value={(() => {
          const s = data.profile.salary_expectation;
          if (!s || (!s.min && !s.max)) return "—";
          const cur = s.currency ?? "";
          if (s.min && s.max) return `${cur} ${s.min} – ${s.max}`.trim();
          return `${cur} ${s.min ?? s.max}`.trim();
        })()} />
        <Field label="WORK MODE" value={data.profile.work_mode || "—"} />
        <Field label="HEADLINE" value={data.profile.headline || "—"} />
      </div>
      <div className="profile-linkedin-import">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/username"
        />
        <button type="button" onClick={importLi} disabled={busy}>
          {busy ? "Importing…" : "Import from LinkedIn"}
        </button>
      </div>
    </InfoCard>
  );
}
