import { getProfile } from "@backend/api/imperium.api";
import { getDiscoveredJob } from "@backend/api/jobs.api";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { PrintRenderer, type PrintHandle } from "./export/PrintRenderer";
import "./export/print.css";
import { ActionBar } from "./panes/ActionBar";
import { EditorPane } from "./panes/EditorPane";
import { InsightsPane } from "./panes/InsightsPane";
import { PreviewPane } from "./panes/PreviewPane";
import "./resume.css";
import { useResumeStore } from "./state/useResumeStore";

interface ResumePageProps {
  jobId?: string;
}

export function ResumePage({ jobId }: ResumePageProps) {
  const selectedJob = useResumeStore((s) => s.selectedJob);
  const setSelectedJob = useResumeStore((s) => s.setSelectedJob);
  const setResume = useResumeStore((s) => s.setResume);
  const versions = useResumeStore((s) => s.versions);
  const resume = useResumeStore((s) => s.resume);
  const navigate = useNavigate();
  const getJobFn = useServerFn(getDiscoveredJob);
  const getProfileFn = useServerFn(getProfile);

  const [loadingJob, setLoadingJob] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);

  // Load profile once if resume is empty
  useEffect(() => {
    if (!profileFetched && resume.personal.name === "") {
      setProfileFetched(true);
      getProfileFn()
        .then((result) => {
          if (result?.profile) {
            const profile = result.profile as any;
            setResume({
              ...resume,
              personal: {
                name: profile.name || "",
                title: profile.headline || "",
                email: profile.email || "",
                phone: profile.phone || "",
                location: profile.location || "",
                links: [
                  profile.linkedin_url && { label: "LinkedIn", url: profile.linkedin_url },
                  profile.github_url && { label: "GitHub", url: profile.github_url },
                  profile.portfolio_url && { label: "Portfolio", url: profile.portfolio_url },
                ].filter(Boolean) as { label: string; url: string }[],
              },
              summary: profile.summary || "",
              skills: profile.skills?.length ? [{ category: "Skills", items: profile.skills }] : [],
              experience: (profile.experience || []).map((e: any, idx: number) => ({
                id: `exp_${Date.now()}_${idx}`,
                company: e.company || "",
                title: e.title || "",
                location: e.location || "",
                start: e.start || "",
                end: e.current ? "" : (e.end || ""),
                bullets: e.highlights || (e.description ? [e.description] : []),
              })),
              projects: (profile.projects || []).map((p: any, idx: number) => ({
                id: `prj_${Date.now()}_${idx}`,
                name: p.name || "",
                stack: p.stack || [],
                url: p.url || "",
                bullets: p.highlights || (p.description ? [p.description] : []),
              })),
              education: (profile.education || []).map((e: any, idx: number) => ({
                id: `edu_${Date.now()}_${idx}`,
                school: e.school || "",
                degree: e.degree || "",
                field: e.field || "",
                start: e.start || "",
                end: e.end || "",
                gpa: e.gpa || "",
              })),
              certifications: (profile.certifications || []).map((c: any, idx: number) => ({
                id: `cert_${Date.now()}_${idx}`,
                name: c.name || "",
                issuer: c.issuer || "",
                date: c.year || "",
                url: c.url || "",
              })),
            });
          }
        })
        .catch((err) => {
          console.error("[ResumePage] Failed to load profile:", err);
        });
    }
  }, [profileFetched, resume.personal.name, getProfileFn, setResume, resume]);

  // Load job when jobId present in URL
  useEffect(() => {
    if (jobId && !selectedJob && !loadingJob) {
      setLoadingJob(true);
      getJobFn({ data: { jobId } })
        .then((job) => {
          if (job) {
            setSelectedJob({
              company: job.company,
              title: job.title,
              description: job.description,
            });
          }
          setLoadingJob(false);
        })
        .catch((err) => {
          console.error("[ResumePage] Failed to load job:", err);
          setLoadingJob(false);
        });
    }
  }, [jobId, selectedJob, loadingJob, getJobFn, setSelectedJob]);

  const printHandleRef = useRef<PrintHandle | null>(null);
  const [jdOpen, setJdOpen] = useState(false);

  const latest = versions[versions.length - 1];
  const company = selectedJob?.company ?? "";
  const role = selectedJob?.title ?? "";
  const initials = company ? company.slice(0, 1).toUpperCase() : "";

  if (loadingJob) {
    return (
      <div className="rs-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div>Loading job details...</div>
      </div>
    );
  }

  if (jobId && !selectedJob && !loadingJob) {
    return (
      <div className="rs-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div>
          <p>Job not found</p>
          <button onClick={() => navigate({ to: "/jobs" })}>← Back to Jobs</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rs-root">
      {/* ============ TOP BAR ============ */}
      <header className="rs-topbar">
        <div className="rs-topbar-left">
          <button
            type="button"
            className="rs-back"
            onClick={() => navigate({ to: "/applications" })}
          >
            <span aria-hidden>←</span> Back to Resumes
          </button>
        </div>

        <div className="rs-topbar-center">
          <div className="rs-job-chip">
            <div className="rs-job-logo" aria-hidden>{initials}</div>
            <div className="rs-job-meta">
              <div className="rs-job-company">
                {company} <span className="rs-job-link" aria-hidden>↗</span>
              </div>
              <div className="rs-job-role">{role}</div>
            </div>
            <span className="rs-job-caret" aria-hidden>▾</span>
          </div>

          {selectedJob && (
            <div className="rs-stat">
              <div className="rs-stat-label">Match Score</div>
              <div className="rs-stat-value rs-stat-good">● Calculating...</div>
            </div>
          )}

          <div className="rs-stat">
            <div className="rs-stat-label">Resume Version</div>
            <div className="rs-stat-value">
              {latest?.label ?? "V1"} <span className="rs-job-caret" aria-hidden>▾</span>
            </div>
          </div>
        </div>

        <div className="rs-topbar-right">
          <button className="rs-icon-btn" aria-label="Previous">‹</button>
          <button className="rs-icon-btn" aria-label="Next">›</button>
          <button
            type="button"
            className="rs-jd-btn"
            onClick={() => setJdOpen(true)}
          >
            <span aria-hidden>📄</span> View Job Description
          </button>
        </div>
      </header>

      {/* ============ THREE COLUMNS ============ */}
      <div className="rs-layout">
        <aside className="rs-col rs-col-editor">
          <EditorPane />
        </aside>
        <main className="rs-col rs-col-preview">
          <PreviewPane />
        </main>
        <aside className="rs-col rs-col-insights">
          <InsightsPane />
        </aside>
      </div>

      {/* ============ BOTTOM ACTION BAR ============ */}
      <ActionBar printHandleRef={printHandleRef} />

      {/* hidden full-size renderer for PDF export */}
      <PrintRenderer resume={resume} registerHandle={(h) => { printHandleRef.current = h; }} />

      {/* ============ JD MODAL ============ */}
      {jdOpen && (
        <div className="rs-modal-backdrop" onClick={() => setJdOpen(false)}>
          <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rs-modal-head">
              <div>
                <div className="rs-modal-title">{role}</div>
                <div className="rs-modal-sub">{company}</div>
              </div>
              <button className="rs-icon-btn" onClick={() => setJdOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="rs-modal-body">
              {selectedJob?.description ?? "No job description attached."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumePage;
