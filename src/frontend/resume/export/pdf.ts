/**
 * PDF Export — opens the rendered template in a print window and triggers
 * the browser's native "Save as PDF". This is dramatically more reliable
 * than html2canvas, which crashes on web fonts, external images, and
 * complex CSS. The user gets a true vector PDF with selectable text.
 */
import type { ResumeJSON } from "@frontend/resume/schema";

export interface PrintValidation {
  warnings: string[];
  estimatedPages: number;
  overflow: boolean;
}

export function validatePrintLayout(node: HTMLElement, resume: ResumeJSON): PrintValidation {
  const warnings: string[] = [];
  const paperH = resume.meta.paper === "A4" ? 1123 : 1056;
  const contentH = node.scrollHeight;
  const estimatedPages = Math.max(1, Math.ceil(contentH / paperH));

  const headings = Array.from(node.querySelectorAll("h1, h2, h3"));
  for (const h of headings) {
    const top = (h as HTMLElement).offsetTop;
    const remainder = top % paperH;
    if (remainder > paperH - 60) {
      warnings.push(`Section "${h.textContent?.slice(0, 40)}" may render orphaned near a page break.`);
    }
  }

  if (estimatedPages > 2) warnings.push(`Resume estimated at ${estimatedPages} pages — consider trimming.`);
  const overflow = contentH > paperH * 3;
  if (overflow) warnings.push("Content significantly exceeds page area — review for clipping.");
  return { warnings, estimatedPages, overflow };
}

function collectDocumentStyles(): string {
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) parts.push(rule.cssText);
    } catch {
      // Cross-origin sheet — fall back to <link> tag
      const href = (sheet as CSSStyleSheet).href;
      if (href) parts.push(`@import url("${href}");`);
    }
  }
  return parts.join("\n");
}

export async function exportResumeToPdf(node: HTMLElement, resume: ResumeJSON): Promise<void> {
  if (!node) throw new Error("Preview not ready — please wait a moment and try again.");

  const filename = `${resume.personal.name || "resume"}-${resume.meta.templateId}`
    .toLowerCase()
    .replace(/\s+/g, "-");

  const paper = resume.meta.paper === "A4" ? "A4" : "letter";
  const styles = collectDocumentStyles();
  const html = node.outerHTML;

  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    throw new Error("Pop-up blocked. Please allow pop-ups for this site to export PDF.");
  }

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${filename}</title>
  <style>
    ${styles}
    @page { size: ${paper}; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .resume-print-root, #resume-print-root { box-shadow: none !important; }
  </style>
</head>
<body>${html}</body>
</html>`);
  win.document.close();

  // Wait for fonts + images before printing
  await new Promise<void>((resolve) => {
    const ready = () => {
      const imgs = Array.from(win.document.images);
      const pending = imgs.filter((i) => !i.complete);
      if (pending.length === 0) {
        resolve();
        return;
      }
      let left = pending.length;
      pending.forEach((i) => {
        const done = () => { if (--left === 0) resolve(); };
        i.addEventListener("load", done, { once: true });
        i.addEventListener("error", done, { once: true });
      });
    };
    if (win.document.readyState === "complete") ready();
    else win.addEventListener("load", ready, { once: true });
    // Hard timeout — never hang the UI
    setTimeout(resolve, 2500);
  });

  try {
    const fonts = (win.document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts && fonts.ready) await fonts.ready;
  } catch {
    // ignore
  }


  win.focus();
  win.print();
  // Most browsers auto-close after print; close manually on cancel
  setTimeout(() => { try { win.close(); } catch { /* noop */ } }, 500);
}
