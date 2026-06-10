/** Sticky bottom action bar — template picker, saved indicator, exports, AI, Apply. */
import { useApplicationsStore } from "@frontend/applications/state/useApplicationsStore";
import { aiGenerateSummary, aiGenerateCoverLetter, aiInterviewPrep } from "@frontend/resume/ai/resume-ai.functions";
import { useAiRunner } from "@frontend/resume/ai/useAi";
import { analyzeAts } from "@frontend/resume/ats/AtsEngine";
import { analyzeHealth } from "@frontend/resume/ats/HealthEngine";
import { analyzeJdMatch } from "@frontend/resume/ats/JdMatchEngine";
import { exportResumeToDocx } from "@frontend/resume/export/docx";
import { exportResumeToPdf } from "@frontend/resume/export/pdf";
import type { PrintHandle } from "@frontend/resume/export/PrintRenderer";
import { useResumeStore } from "@frontend/resume/state/useResumeStore";
import { getTemplate, TEMPLATES } from "@frontend/resume/templates/registry";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  FileDown,
  FileText,
  LayoutTemplate,
  Mail,
  MessageSquare,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function ActionBar({
  printHandleRef,
}: {
  printHandleRef: React.MutableRefObject<PrintHandle | null>;
}) {
  const resume = useResumeStore((s) => s.resume);
  const selectedJob = useResumeStore((s) => s.selectedJob);
  const versions = useResumeStore((s) => s.versions);
  const saveVersion = useResumeStore((s) => s.saveVersion);
  const patch = useResumeStore((s) => s.patch);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const create = useApplicationsStore((s) => s.createFromResumeStudio);
  const navigate = useNavigate();

  const { run: runAi } = useAiRunner();
  const summaryFn = useServerFn(aiGenerateSummary);
  const coverFn = useServerFn(aiGenerateCoverLetter);
  const prepFn = useServerFn(aiInterviewPrep);

  const jd = selectedJob?.description ?? "";
  const ats = useMemo(() => analyzeAts(resume, jd), [resume, jd]);
  const health = useMemo(() => analyzeHealth(resume), [resume]);
  const jdMatch = useMemo(() => analyzeJdMatch(resume, jd), [resume, jd]);
  const activeTemplate = getTemplate(resume.meta.templateId);

  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverText, setCoverText] = useState<string | null>(null);
  const [prepBusy, setPrepBusy] = useState(false);
  const [prepData, setPrepData] = useState<{ behavioral: string[]; technical: string[]; projectDeepDive: string[] } | null>(null);
  const tplRef = useRef<HTMLDivElement | null>(null);

  // Close template picker on outside click
  useEffect(() => {
    if (!tplOpen) return;
    const onClick = (e: MouseEvent) => {
      if (tplRef.current && !tplRef.current.contains(e.target as Node)) setTplOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [tplOpen]);

  const handleSave = () => {
    saveVersion(undefined, {
      atsScore: ats.atsScore,
      resumeHealth: health.score,
      jdMatch: jdMatch.score,
    });
    toast.success("Resume saved");
  };

  const handlePdf = async () => {
    const h = printHandleRef.current;
    if (!h) {
      toast.error("Preview not ready yet — try again in a moment");
      return;
    }
    setExporting("pdf");
    try {
      await exportResumeToPdf(h.node, resume);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF export failed";
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  };

  const handleDocx = async () => {
    setExporting("docx");
    try {
      await exportResumeToDocx(resume);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DOCX export failed";
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  };

  const handleGenerate = async () => {
    setAiBusy(true);
    try {
      const ctx = {
        name: resume.personal.name,
        title: resume.personal.title,
        summary: resume.summary,
        skills: resume.skills.flatMap((g) => g.items),
        experienceSnippets: resume.experience.flatMap((e) => e.bullets).slice(0, 6),
        projectSnippets: resume.projects.flatMap((p) => p.bullets).slice(0, 4),
      };
      const res = await runAi({
        feature: "summary",
        label: "Generate with AI",
        cacheInput: ctx,
        cacheJd: jd,
        call: () => summaryFn({ data: { resume: ctx, jd } }),
      });
      if (res.summary) {
        patch((r) => { r.summary = res.summary; });
        toast.success("Summary regenerated");
      } else {
        toast.error("AI returned an empty summary — try again");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI generation failed";
      toast.error(
        msg.includes("no AI provider")
          ? "No AI provider configured. Set OLLAMA_BASE_URL or OPENROUTER_API_KEY in .env"
          : msg,
      );
      console.error("[ActionBar] AI generation failed:", err);
    } finally {
      setAiBusy(false);
    }
  };

  const resumeCtx = () => ({
    name: resume.personal.name,
    title: resume.personal.title,
    summary: resume.summary,
    skills: resume.skills.flatMap((g) => g.items),
    experienceSnippets: resume.experience.flatMap((e) => e.bullets).slice(0, 6),
    projectSnippets: resume.projects.flatMap((p) => p.bullets).slice(0, 4),
  });

  const handleCoverLetter = async () => {
    setCoverBusy(true);
    try {
      const res = await coverFn({
        data: {
          resume: resumeCtx(),
          jd,
          company: selectedJob?.company,
          role: selectedJob?.title,
        },
      });
      setCoverText(res.letter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover letter failed");
    } finally {
      setCoverBusy(false);
    }
  };

  const handleInterviewPrep = async () => {
    setPrepBusy(true);
    try {
      const res = await prepFn({
        data: { resume: resumeCtx(), jd, role: selectedJob?.title },
      });
      setPrepData({
        behavioral: res.behavioral,
        technical: res.technical,
        projectDeepDive: res.projectDeepDive,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Interview prep failed");
    } finally {
      setPrepBusy(false);
    }
  };

  const handleApply = async () => {
    if (!selectedJob) {
      toast.error("Select a job first");
      return;
    }
    const versionLabel = versions[versions.length - 1]?.label ?? "V1";
    try {
      const app = await create({
        job: {
          title: selectedJob.title,
          company: selectedJob.company,
          description: selectedJob.description,
        },
        resume: {
          resumeId: "current",
          resumeVersion: versionLabel,
          templateUsed: activeTemplate?.name ?? resume.meta.templateId,
        },
        atsScore: ats.atsScore,
        matchScore: jdMatch.score,
      });
      if (!app) {
        toast.error("Failed to submit application — please try again");
        return;
      }
      setApplied(true);
      toast.success(`Added to tracker: ${selectedJob.title} @ ${selectedJob.company}`);
      setTimeout(() => navigate({ to: "/applications" }), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit application";
      toast.error(msg);
      console.error("[ActionBar] handleApply failed:", err);
    }
  };

  return (
    <div className="rs-actionbar">
      <div className="rs-actionbar-left">
        <span className="rs-saved-indicator">
          <Check size={14} className="rs-saved-check" aria-hidden /> All changes saved
        </span>
      </div>

      <div className="rs-actionbar-center">
        {/* Template picker (replaces Version History — versions live in Insights rail) */}
        <div className="rs-tpl-wrap" ref={tplRef}>
          <button
            className="rs-btn rs-btn-ghost"
            onClick={() => setTplOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={tplOpen}
          >
            <LayoutTemplate size={16} aria-hidden /> Template: {activeTemplate?.name ?? "Default"}
          </button>
          {tplOpen && (
            <div className="rs-tpl-menu" role="menu">
              {TEMPLATES.map((t) => {
                const active = t.id === resume.meta.templateId;
                return (
                  <button
                    key={t.id}
                    role="menuitem"
                    className={`rs-tpl-row${active ? " is-active" : ""}`}
                    onClick={() => {
                      setTemplate(t.id);
                      setTplOpen(false);
                      toast.success(`Template: ${t.name}`);
                    }}
                  >
                    <div className="rs-tpl-row-main">
                      <span className="rs-tpl-name">{t.name}</span>
                      <span className="rs-tpl-cat">{t.category}</span>
                    </div>
                    <div className="rs-tpl-row-meta">
                      <span title="ATS compatibility">ATS {t.atsCompatibility}</span>
                      {active && <Check size={14} aria-hidden />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button className="rs-btn rs-btn-ghost" onClick={handleSave}>
          <Save size={16} aria-hidden /> Save
        </button>
        <button className="rs-btn rs-btn-ghost" onClick={handlePdf} disabled={exporting !== null}>
          <FileDown size={16} aria-hidden /> {exporting === "pdf" ? "Exporting…" : "Export PDF"}
        </button>
        <button className="rs-btn rs-btn-ghost" onClick={handleDocx} disabled={exporting !== null}>
          <FileText size={16} aria-hidden /> {exporting === "docx" ? "Exporting…" : "Export DOCX"}
        </button>
      </div>

      <div className="rs-actionbar-right">
        <button className="rs-btn rs-btn-ghost" onClick={handleCoverLetter} disabled={coverBusy} title="Generate cover letter">
          <Mail size={16} aria-hidden /> {coverBusy ? "Writing…" : "Cover Letter"}
        </button>
        <button className="rs-btn rs-btn-ghost" onClick={handleInterviewPrep} disabled={prepBusy} title="Interview prep">
          <MessageSquare size={16} aria-hidden /> {prepBusy ? "Preparing…" : "Interview Prep"}
        </button>
        <button
          className="rs-btn rs-btn-primary"
          onClick={handleGenerate}
          disabled={aiBusy}
        >
          <Sparkles size={16} aria-hidden /> {aiBusy ? "Generating…" : "Generate Summary"}
        </button>
        <button
          className="rs-btn rs-btn-primary"
          onClick={handleApply}
          disabled={!selectedJob || applied}
          title={!selectedJob ? "Select a job first" : "Submit to tracker"}
        >
          <Send size={16} aria-hidden /> {applied ? "Added" : "Apply"}
        </button>
      </div>

      {coverText !== null && (
        <div className="rs-modal-overlay" onClick={() => setCoverText(null)}>
          <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rs-modal-head">
              <h3>Cover Letter</h3>
              <button className="rs-btn rs-btn-ghost" onClick={() => setCoverText(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <textarea className="rs-modal-textarea" value={coverText} onChange={(e) => setCoverText(e.target.value)} rows={16} />
            <div className="rs-modal-foot">
              <button className="rs-btn rs-btn-ghost" onClick={() => { void navigator.clipboard.writeText(coverText); toast.success("Copied"); }}>Copy</button>
              <button className="rs-btn rs-btn-primary" onClick={() => {
                const blob = new Blob([coverText], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `cover-letter-${(selectedJob?.company || "draft").replace(/\s+/g, "-").toLowerCase()}.txt`; a.click();
                URL.revokeObjectURL(url);
              }}>Download</button>
            </div>
          </div>
        </div>
      )}

      {prepData && (
        <div className="rs-modal-overlay" onClick={() => setPrepData(null)}>
          <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rs-modal-head">
              <h3>Interview Prep{selectedJob?.title ? ` — ${selectedJob.title}` : ""}</h3>
              <button className="rs-btn rs-btn-ghost" onClick={() => setPrepData(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="rs-prep-body">
              {([
                ["Behavioral", prepData.behavioral],
                ["Technical", prepData.technical],
                ["Project Deep-Dive", prepData.projectDeepDive],
              ] as const).map(([label, items]) => items.length > 0 && (
                <section key={label}>
                  <h4>{label}</h4>
                  <ol>{items.map((q, i) => <li key={i}>{q}</li>)}</ol>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
