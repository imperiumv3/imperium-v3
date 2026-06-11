/**
 * PDF Export — renders the resume node inside a sandboxed iframe so the
 * project's global Tailwind v4 / oklch() tokens never leak into the page
 * html2canvas is rasterizing. Without this isolation the rasterizer throws
 * `Attempting to parse an unsupported color function "lab"` whenever it
 * walks computed styles inherited from <body>.
 */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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
  if (estimatedPages > 2) warnings.push(`Resume estimated at ${estimatedPages} pages — consider trimming.`);
  const overflow = contentH > paperH * 3;
  if (overflow) warnings.push("Content significantly exceeds page area — review for clipping.");
  return { warnings, estimatedPages, overflow };
}

/**
 * Mounts a deep clone of the resume node inside a freshly created iframe
 * with no inherited CSS, waits for fonts/images, runs html2canvas, then
 * cleans up. This is the only reliable way to escape oklch/lab tokens that
 * Tailwind v4 publishes onto :root.
 */
async function rasterizeInIsolatedFrame(
  node: HTMLElement,
  width: number,
): Promise<HTMLCanvasElement> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-100000px";
  iframe.style.top = "0";
  iframe.style.width = `${width}px`;
  iframe.style.height = `${Math.max(node.scrollHeight, 1200)}px`;
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument!;
    doc.open();
    // Intentionally empty <head> — NO Tailwind, NO design tokens. Resume
    // templates only rely on inline styles + their own CSS variables.
    doc.write(`<!doctype html><html><head>
      <meta charset="utf-8" />
      <style>
        html, body { margin: 0; padding: 0; background: #ffffff; color: #0f172a;
                     font-family: Arial, Helvetica, sans-serif; }
        * { box-sizing: border-box; }
        a { color: inherit; }
        ul { list-style: disc; }
      </style>
    </head><body></body></html>`);
    doc.close();

    // Wait a tick for the new document to be ready, then mount the clone.
    await new Promise((r) => setTimeout(r, 30));
    const clone = node.cloneNode(true) as HTMLElement;
    // Force a known-safe width on the clone so html2canvas measures correctly.
    clone.style.width = `${width}px`;
    doc.body.appendChild(clone);

    // Pull in the host page's @font-face declarations only (best-effort), so
    // text uses the right typeface — but skip any stylesheet that contains
    // oklch/lab/color-mix so we don't reintroduce the bug.
    try {
      const fontFaces: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules ?? [])) {
            if (rule instanceof CSSFontFaceRule) fontFaces.push(rule.cssText);
          }
        } catch { /* cross-origin */ }
      }
      if (fontFaces.length) {
        const s = doc.createElement("style");
        s.textContent = fontFaces.join("\n");
        doc.head.appendChild(s);
      }
    } catch { /* ignore */ }

    try {
      const fonts = (doc as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
      if (fonts?.ready) await fonts.ready;
    } catch { /* ignore */ }

    return await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: width,
      windowHeight: clone.scrollHeight,
      width,
      height: clone.scrollHeight,
    });
  } finally {
    document.body.removeChild(iframe);
  }
}

function buildPdfFromCanvas(canvas: HTMLCanvasElement, paper: "A4" | "Letter"): jsPDF {
  const pdf = new jsPDF({
    unit: "pt",
    format: paper === "A4" ? "a4" : "letter",
    orientation: "portrait",
    compress: true,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  let remaining = imgH;
  let position = 0;
  pdf.addImage(dataUrl, "JPEG", 0, position, imgW, imgH, undefined, "FAST");
  remaining -= pageH;
  while (remaining > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(dataUrl, "JPEG", 0, position, imgW, imgH, undefined, "FAST");
    remaining -= pageH;
  }
  return pdf;
}

export async function exportResumeToPdf(node: HTMLElement, resume: ResumeJSON): Promise<void> {
  if (!node) throw new Error("Preview not ready — please wait a moment and try again.");
  const filename = `${resume.personal.name || "resume"}-${resume.meta.templateId}`
    .toLowerCase()
    .replace(/\s+/g, "-");
  const width = node.scrollWidth || (resume.meta.paper === "A4" ? 794 : 816);
  const canvas = await rasterizeInIsolatedFrame(node, width);
  const pdf = buildPdfFromCanvas(canvas, resume.meta.paper);
  pdf.save(`${filename}.pdf`);
}

export async function renderResumeToPdfBlob(
  node: HTMLElement,
  resume: ResumeJSON,
): Promise<{ blob: Blob; base64: string; filename: string }> {
  if (!node) throw new Error("Preview not ready");
  const filename =
    `${resume.personal.name || "resume"}-${resume.meta.templateId}`
      .toLowerCase()
      .replace(/\s+/g, "-") + ".pdf";
  const width = node.scrollWidth || (resume.meta.paper === "A4" ? 794 : 816);
  const canvas = await rasterizeInIsolatedFrame(node, width);
  const pdf = buildPdfFromCanvas(canvas, resume.meta.paper);
  const blob = pdf.output("blob") as Blob;
  const dataUriBase64 = pdf.output("datauristring") as string;
  const base64 = dataUriBase64.split(",")[1] ?? "";
  return { blob, base64, filename };
}
