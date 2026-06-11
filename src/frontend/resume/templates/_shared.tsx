/** Shared template primitives (pure presentational). */
import type { CSSProperties } from "react";
import type { ResumeTheme } from "./themes";

export function fmtRange(start: string, end: string): string {
  const e = end || "Present";
  if (!start && !end) return "";
  return `${start ?? ""} – ${e}`;
}

export const PAPER_PX: Record<string, { w: number; h: number }> = {
  A4: { w: 794, h: 1123 },     // 96dpi @ 210x297mm
  Letter: { w: 816, h: 1056 }, // 96dpi @ 8.5x11in
};

export function pageStyle(paper: "A4" | "Letter"): CSSProperties {
  const { w, h } = PAPER_PX[paper];
  return {
    width: `${w}px`,
    minHeight: `${h}px`,
    background: "#fff",
    color: "var(--rt-text, #0f172a)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
    margin: "0 auto",
  };
}

export interface TemplateProps {
  resume: import("@frontend/resume/schema").ResumeJSON;
  theme: ResumeTheme;
}

import type { ResumeLanguage } from "@frontend/resume/schema";

/** Format a languages list as a single inline string. */
export function formatLanguages(langs: ResumeLanguage[]): string {
  return langs
    .filter((l) => l && l.name)
    .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
    .join(" · ");
}

/** Format interests as a single inline string. */
export function formatInterests(items: string[]): string {
  return items.filter(Boolean).join(" · ");
}

