/**
 * PDF Export — renders the resume node to a canvas via html2canvas and
 * stitches it into a paginated PDF with jsPDF. The browser downloads the
 * .pdf file directly — no print dialog, no print preview.
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

  const headings = Array.from(node.querySelectorAll("h1, h2, h3"));
  for (const h of headings) {
    const top = (h as HTMLElement).offsetTop;
    const remainder = top % paperH;
    if (remainder > paperH - 60) {
      warnings.push(
        `Section "${h.textContent?.slice(0, 40)}" may render orphaned near a page break.`,
      );
    }
  }

  if (estimatedPages > 2)
    warnings.push(`Resume estimated at ${estimatedPages} pages — consider trimming.`);
  const overflow = contentH > paperH * 3;
  if (overflow) warnings.push("Content significantly exceeds page area — review for clipping.");
  return { warnings, estimatedPages, overflow };
}

export async function exportResumeToPdf(node: HTMLElement, resume: ResumeJSON): Promise<void> {
  if (!node) throw new Error("Preview not ready — please wait a moment and try again.");

  const filename = `${resume.personal.name || "resume"}-${resume.meta.templateId}`
    .toLowerCase()
    .replace(/\s+/g, "-");

  try {
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) await fonts.ready;
  } catch {
    // ignore
  }

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });

  const isA4 = resume.meta.paper === "A4";
  const pdf = new jsPDF({
    unit: "pt",
    format: isA4 ? "a4" : "letter",
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

  pdf.save(`${filename}.pdf`);
}

/**
 * Same render pipeline as exportResumeToPdf but returns the PDF as a Blob
 * + base64 instead of triggering a download. Used by the Apply pipeline to
 * upload the rendered resume to storage and dispatch it to the local agent.
 */
export async function renderResumeToPdfBlob(
  node: HTMLElement,
  resume: ResumeJSON,
): Promise<{ blob: Blob; base64: string; filename: string }> {
  if (!node) throw new Error("Preview not ready");
  const filename =
    `${resume.personal.name || "resume"}-${resume.meta.templateId}`
      .toLowerCase()
      .replace(/\s+/g, "-") + ".pdf";

  try {
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) await fonts.ready;
  } catch { /* ignore */ }

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });

  const isA4 = resume.meta.paper === "A4";
  const pdf = new jsPDF({ unit: "pt", format: isA4 ? "a4" : "letter", orientation: "portrait", compress: true });
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

  const blob = pdf.output("blob") as Blob;
  const dataUriBase64 = pdf.output("datauristring") as string;
  const base64 = dataUriBase64.split(",")[1] ?? "";
  return { blob, base64, filename };
}
