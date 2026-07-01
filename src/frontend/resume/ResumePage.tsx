import { getProfile } from "@backend/api/imperium.api";
import { getDiscoveredJob } from "@backend/api/jobs.api";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PrintRenderer, type PrintHandle } from "./export/PrintRenderer";
import "./export/print.css";
import { ActionBar } from "./panes/ActionBar";
import { EditorPane } from "./panes/EditorPane";
import { InsightsPane } from "./panes/InsightsPane";
import { PreviewPane } from "./panes/PreviewPane";
import { analyzeJdMatch } from "./ats/JdMatchEngine";
import "./resume.css";
import { useResumeStore } from "./state/useResumeStore";
import { categorizeResumeSkills } from "./utils/skillCategorizer";

interface ResumePageProps {
  jobId?: string;
}

export function ResumePage({ jobId }: ResumePageProps) {
  const selectedJob = useResumeStore((s) => s.selectedJob);
  const setSelectedJob = useResumeStore((s) => s.setSelectedJob);
  const updateSelectedJob = (jd: string) => {
    if (!selectedJob) {
      setSelectedJob({ company: "", title: "", description: jd });
    } else {
      setSelectedJob({ ...selectedJob, description: jd });
    }
  };

  const setResume = useResumeStore((s) => s.setResume);
  const versions = useResumeStore((s) => s.versions);
  const resume = useResumeStore((s) => s.resume);
  const navigate = useNavigate();
  const getJobFn = useServerFn(getDiscoveredJob);
  const getProfileFn = useServerFn(getProfile);

  const [loadingJob, setLoadingJob] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);

  // Always load profile on mount — no localStorage persistence means we
  // always start from the server-side profile data for the current user.
  useEffect(() => {
    if (profileFetched) return;
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
            skills: profile.skills?.length ? categorizeResumeSkills(profile.skills) : [],
            languages: (profile.languages ?? []).map(
              (l: { name: string; proficiency?: string }) => ({
                name: l.name,
                proficiency: l.proficiency,
              }),
            ),
            interests: profile.interests ?? [],
            experience: (profile.experience || []).map((e: any, idx: number) => ({
              id: `exp_${Date.now()}_${idx}`,
              company: e.company || "",
              title: e.title || "",
              location: e.location || "",
              start: e.start || "",
              end: e.current ? "" : e.end || "",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileFetched]);

  // Load job when jobId present in URL
  useEffect(() => {
    if (jobId && selectedJob?.id !== jobId && !loadingJob) {
      setLoadingJob(true);
      getJobFn({ data: { jobId } })
        .then((job) => {
          if (job) {
            setSelectedJob({
              id: job.id,
              company: job.company,
              title: job.title,
              description: job.description,
              url: (job as { url?: string }).url,
            });
          }
          setLoadingJob(false);
        })
        .catch((err) => {
          console.error("[ResumePage] Failed to load job:", err);
          setLoadingJob(false);
        });
    }
  }, [jobId, selectedJob?.id, loadingJob, getJobFn, setSelectedJob]);

  const printHandleRef = useRef<PrintHandle | null>(null);
  const [jdOpen, setJdOpen] = useState(false);

  const latest = versions[versions.length - 1];
  const company = selectedJob?.company ?? "";
  const role = selectedJob?.title ?? "";
  const initials = company ? company.slice(0, 1).toUpperCase() : "";
  const matchScore = useMemo(
    () => (selectedJob?.description ? analyzeJdMatch(resume, selectedJob.description).score : 0),
    [resume, selectedJob?.description],
  );

  if (loadingJob) {
    return (
      <div
        className="rs-root"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}
      >
        <div>Loading job details...</div>
      </div>
    );
  }

  if (jobId && !selectedJob && !loadingJob) {
    return (
      <div
        className="rs-root"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}
      >
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
            <div className="rs-job-logo" aria-hidden>
              {initials}
            </div>
            <div className="rs-job-meta">
              <div className="rs-job-company">
                {company}{" "}
                <span className="rs-job-link" aria-hidden>
                  ↗
                </span>
              </div>
              <div className="rs-job-role">{role}</div>
            </div>
            <span className="rs-job-caret" aria-hidden>
              ▾
            </span>
          </div>

          {selectedJob && (
            <div className="rs-stat">
              <div className="rs-stat-label">Match Score</div>
              <div
                className={`rs-stat-value ${matchScore >= 70 ? "rs-stat-good" : matchScore >= 40 ? "rs-stat-mid" : "rs-stat-low"}`}
              >
                ● {selectedJob.description ? `${matchScore}%` : "No JD"}
              </div>
            </div>
          )}

          <div className="rs-stat">
            <div className="rs-stat-label">Resume Version</div>
            <div className="rs-stat-value">
              {latest?.label ?? "V1"}{" "}
              <span className="rs-job-caret" aria-hidden>
                ▾
              </span>
            </div>
          </div>
        </div>

        <div className="rs-topbar-right">
          <button className="rs-icon-btn" aria-label="Previous">
            ‹
          </button>
          <button className="rs-icon-btn" aria-label="Next">
            ›
          </button>
          <button type="button" className="rs-jd-btn" onClick={() => setJdOpen(true)}>
            <FileText size={14} aria-hidden />{" "}
            {selectedJob?.description ? "View / Edit JD" : "Paste Job Description"}
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
      <PrintRenderer
        resume={resume}
        registerHandle={(h) => {
          printHandleRef.current = h;
        }}
      />

      {/* ============ JD MODAL — editable: drives ATS/keyword scoring ============ */}
      {jdOpen && (
        <JdEditorModal
          role={role}
          company={company}
          initial={selectedJob?.description ?? ""}
          onClose={() => setJdOpen(false)}
          onSave={(text) => {
            updateSelectedJob(text);
            setJdOpen(false);
          }}
        />
      )}
    </div>
  );
}

function JdEditorModal({
  role,
  company,
  initial,
  onClose,
  onSave,
}: {
  role: string;
  company: string;
  initial: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <div className="rs-modal-backdrop" onClick={onClose}>
      <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rs-modal-head">
          <div>
            <div className="rs-modal-title">{role || "Job Description"}</div>
            <div className="rs-modal-sub">
              {company || "Paste the JD below to tailor your resume"}
            </div>
          </div>
          <button className="rs-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="rs-modal-body">
          <textarea
            className="rs-jd-textarea"
            value={text}
            placeholder="Paste the full job description here. The Resume Studio uses this text to score your resume, extract missing keywords, and tailor the AI-generated summary."
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="rs-modal-foot">
          <button className="rs-btn rs-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="rs-btn rs-btn-primary" onClick={() => onSave(text)}>
            <FileText size={14} aria-hidden /> Save JD &amp; rescore
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResumePage;
