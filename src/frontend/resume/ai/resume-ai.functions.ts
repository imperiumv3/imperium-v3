/**
 * AI server functions for Resume Studio. Local-first: routes through
 * ModelRouter, which prefers Ollama (Qwen3:8B) when configured, then
 * falls back to OpenRouter / OpenAI / Anthropic. Returns small,
 * deterministic JSON shapes safe to merge into ResumeJSON.
 */
import { createServerFn } from "@tanstack/react-start";
import { routeBrainCall } from "@backend/ai/ModelRouter.server";

interface ResumeContext {
  name: string;
  title: string;
  summary: string;
  skills: string[];
  experienceSnippets: string[];
  projectSnippets: string[];
}

function detectRole(jd?: string, fallback?: string): string {
  if (jd) {
    const m = jd.match(/\b(senior |lead |principal |staff )?(full[- ]stack|backend|front[- ]end|frontend|software|data|ml|ai|cloud|devops|platform|mobile|security|qa)\s+(engineer|developer|scientist|analyst|architect)\b/i);
    if (m) return m[0].replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return (fallback || "Software Engineer").trim();
}

function bucketSkills(skills: string[]): string[] {
  const lang: string[] = [];
  const frame: string[] = [];
  const cloud: string[] = [];
  const other: string[] = [];
  for (const s of skills) {
    if (/^(python|javascript|typescript|java|c\+\+|c#|go|rust|kotlin|swift|ruby|php|scala)$/i.test(s)) lang.push(s);
    else if (/(react|next|vue|angular|svelte|node|express|fastapi|django|flask|spring|nest|rails)/i.test(s)) frame.push(s);
    else if (/(aws|gcp|azure|docker|kubernetes|terraform|cloudflare|vercel)/i.test(s)) cloud.push(s);
    else other.push(s);
  }
  const ordered = [...lang.slice(0, 4), ...frame.slice(0, 3), ...cloud.slice(0, 2), ...other.slice(0, 2)];
  // De-dupe while preserving order
  const seen = new Set<string>();
  return ordered.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
}

function fallbackSummary(resume: ResumeContext, jd?: string): string {
  const role = detectRole(jd, resume.title);
  const topSkills = bucketSkills(resume.skills);
  const techPhrase = topSkills.length ? topSkills.join(", ") : "modern web and backend technologies";

  const projectProof = resume.projectSnippets[0]?.replace(/[.]+$/, "");
  const expProof = resume.experienceSnippets[0]?.replace(/[.]+$/, "");

  const sentences: string[] = [];
  sentences.push(`${role} with hands-on experience designing, building, and shipping production-grade software using ${techPhrase}.`);

  if (projectProof) {
    sentences.push(`Delivered project work including ${projectProof.slice(0, 140)}, focused on measurable user impact and clean engineering.`);
  } else if (expProof) {
    sentences.push(`Professional track record of ${expProof.slice(0, 140)}, with emphasis on reliability and maintainability.`);
  } else {
    sentences.push(`Strong foundations in data structures, algorithms, and system design, validated through end-to-end project execution.`);
  }

  sentences.push(`Seeking ${role.toLowerCase()} roles where I can contribute scalable, well-tested solutions aligned to product and business goals.`);

  return sentences.join(" ");
}


function safeParse<T>(text: string, fallback: T): T {
  try {
    // tolerate ```json ... ``` fenced output
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

/** Generate a 2–3 sentence professional summary. */
export const aiGenerateSummary = createServerFn({ method: "POST" })
  .inputValidator((data: { resume: ResumeContext; jd?: string }) => data)
  .handler(async ({ data }) => {
    const sys =
      'You write ATS-grade resume summaries. Output ONLY a JSON object {"summary": string}. Exactly 3 sentences (60-90 words): (1) role + years/level + 3-5 core technologies, (2) concrete delivery proof drawn from the provided projects/experience (never invent metrics), (3) target alignment statement. Third person, no fluff, no "I", no "passionate", no "results-driven". Use ATS keywords from skills + JD verbatim.';
    const user = JSON.stringify({
      role: data.resume.title || "Candidate",
      skills: data.resume.skills.slice(0, 12),
      recent: data.resume.experienceSnippets.slice(0, 3),
      projects: data.resume.projectSnippets.slice(0, 2),
      jd: data.jd?.slice(0, 1200) ?? "",
    });
    let result: Awaited<ReturnType<typeof routeBrainCall>> | null = null;
    try {
      result = await routeBrainCall({ system: sys, user, json: true, max_tokens: 400 });
    } catch (error) {
      console.warn("[resume-ai] Using offline summary fallback:", error);
      return {
        summary: fallbackSummary(data.resume, data.jd),
        model: "offline-resume-writer",
      };
    }
    const parsed = safeParse<{ summary?: string }>(result.content, {});
    return {
      summary: parsed.summary || fallbackSummary(data.resume, data.jd),
      model: result.model,
    };
  });

/** Rewrite a bullet to start with an action verb and include a metric where reasonable. */
export const aiImproveBullet = createServerFn({ method: "POST" })
  .inputValidator((data: { bullet: string; jd?: string }) => data)
  .handler(async ({ data }) => {
    const sys =
      'Rewrite the resume bullet. Start with a strong action verb, keep it 14–30 words, integrate a measurable outcome when one is implied (do not invent numbers). Output ONLY {"bullet": string}.';
    const user = JSON.stringify({ bullet: data.bullet, jd: data.jd?.slice(0, 800) ?? "" });
    const result = await routeBrainCall({ system: sys, user, json: true, max_tokens: 250 });
    const parsed = safeParse<{ bullet?: string }>(result.content, {});
    return { bullet: parsed.bullet ?? data.bullet, model: result.model };
  });

/** Suggest missing fields the resume lacks for the given JD. */
export const aiFillMissing = createServerFn({ method: "POST" })
  .inputValidator((data: { resume: ResumeContext; jd?: string }) => data)
  .handler(async ({ data }) => {
    const sys =
      'You analyze a resume against a job description. Output ONLY JSON: {"missingSkills": string[], "missingSections": string[], "suggestedBullets": string[]}. Keep suggestedBullets generic-true, never fabricate employer-specific facts.';
    const user = JSON.stringify({
      resume: data.resume,
      jd: data.jd?.slice(0, 1500) ?? "",
    });
    const result = await routeBrainCall({ system: sys, user, json: true, max_tokens: 700 });
    const parsed = safeParse<{
      missingSkills?: string[];
      missingSections?: string[];
      suggestedBullets?: string[];
    }>(result.content, {});
    return {
      missingSkills: parsed.missingSkills ?? [],
      missingSections: parsed.missingSections ?? [],
      suggestedBullets: parsed.suggestedBullets ?? [],
      model: result.model,
    };
  });

/** Extract structured intent from a job description. */
export const aiAnalyzeJd = createServerFn({ method: "POST" })
  .inputValidator((data: { jd: string }) => data)
  .handler(async ({ data }) => {
    const sys =
      'Extract JD signals. Output ONLY JSON: {"requiredSkills": string[], "keywords": string[], "technologies": string[], "softSkills": string[], "responsibilities": string[]}. Max 12 items per array. Lowercase.';
    const result = await routeBrainCall({
      system: sys,
      user: data.jd.slice(0, 2500),
      json: true,
      max_tokens: 600,
    });
    const parsed = safeParse<{
      requiredSkills?: string[];
      keywords?: string[];
      technologies?: string[];
      softSkills?: string[];
      responsibilities?: string[];
    }>(result.content, {});
    return {
      requiredSkills: parsed.requiredSkills ?? [],
      keywords: parsed.keywords ?? [],
      technologies: parsed.technologies ?? [],
      softSkills: parsed.softSkills ?? [],
      responsibilities: parsed.responsibilities ?? [],
      model: result.model,
    };
  });

/** Generate a tailored cover letter for the given resume + JD. */
export const aiGenerateCoverLetter = createServerFn({ method: "POST" })
  .inputValidator((data: { resume: ResumeContext; jd?: string; company?: string; role?: string }) => data)
  .handler(async ({ data }) => {
    const sys =
      'You write concise, sincere cover letters (220-320 words, 3 short paragraphs). No clichés ("I am writing to..."), no fabrication. Output ONLY {"letter": string}.';
    const user = JSON.stringify({
      candidate: { name: data.resume.name, title: data.resume.title, summary: data.resume.summary },
      skills: data.resume.skills.slice(0, 10),
      recent: data.resume.experienceSnippets.slice(0, 3),
      projects: data.resume.projectSnippets.slice(0, 2),
      company: data.company ?? "",
      role: data.role ?? "",
      jd: data.jd?.slice(0, 1500) ?? "",
    });
    try {
      const result = await routeBrainCall({ system: sys, user, json: true, max_tokens: 900 });
      const parsed = safeParse<{ letter?: string }>(result.content, {});
      const letter = parsed.letter?.trim();
      if (letter) return { letter, model: result.model };
    } catch (error) {
      console.warn("[resume-ai] cover-letter fallback:", error);
    }
    // Deterministic offline fallback.
    const name = data.resume.name || "Candidate";
    const role = data.role || data.resume.title || "this role";
    const company = data.company || "your team";
    const skills = data.resume.skills.slice(0, 4).join(", ") || "the listed skills";
    const proof = data.resume.experienceSnippets[0] || data.resume.projectSnippets[0] || "shipped end-to-end features in production";
    const letter = [
      `Dear Hiring Team at ${company},`,
      `I'm applying for ${role}. My background centers on ${skills}, and I've used those skills to ${proof.replace(/[.]+$/, "")}.`,
      `What draws me to ${company} is the chance to work on real problems where careful engineering matters. I want to keep building things that hold up under load and are pleasant to maintain.`,
      `I'd welcome the chance to discuss how my experience maps to your needs. Thank you for your time.`,
      `Sincerely,\n${name}`,
    ].join("\n\n");
    return { letter, model: "offline-cover-letter" };
  });

/** Generate likely interview questions tailored to the candidate and JD. */
export const aiInterviewPrep = createServerFn({ method: "POST" })
  .inputValidator((data: { resume: ResumeContext; jd?: string; role?: string }) => data)
  .handler(async ({ data }) => {
    const sys =
      'Generate interview questions. Output ONLY {"behavioral": string[], "technical": string[], "projectDeepDive": string[]}. 5 per array, specific to the candidate signals provided, no generic filler.';
    const user = JSON.stringify({
      role: data.role ?? data.resume.title ?? "",
      skills: data.resume.skills.slice(0, 12),
      experience: data.resume.experienceSnippets.slice(0, 4),
      projects: data.resume.projectSnippets.slice(0, 3),
      jd: data.jd?.slice(0, 1500) ?? "",
    });
    try {
      const result = await routeBrainCall({ system: sys, user, json: true, max_tokens: 900 });
      const parsed = safeParse<{ behavioral?: string[]; technical?: string[]; projectDeepDive?: string[] }>(result.content, {});
      if ((parsed.behavioral?.length ?? 0) + (parsed.technical?.length ?? 0) > 0) {
        return {
          behavioral: parsed.behavioral ?? [],
          technical: parsed.technical ?? [],
          projectDeepDive: parsed.projectDeepDive ?? [],
          model: result.model,
        };
      }
    } catch (error) {
      console.warn("[resume-ai] interview-prep fallback:", error);
    }
    const top = data.resume.skills.slice(0, 5);
    return {
      behavioral: [
        "Tell me about a project you shipped end-to-end. What were the hardest tradeoffs?",
        "Describe a time you disagreed with a teammate. How did you resolve it?",
        "When have you missed a deadline? What did you change afterwards?",
        "Walk me through a bug that took longer than expected to find.",
        "What's the most useful feedback you've received recently?",
      ],
      technical: top.length
        ? top.map((s) => `Explain how you would design a small system that uses ${s}. What would you measure?`)
        : ["Walk through a system you've designed and the tradeoffs."],
      projectDeepDive: (data.resume.projectSnippets.length ? data.resume.projectSnippets : data.resume.experienceSnippets)
        .slice(0, 5)
        .map((p) => `Drill in: "${p.slice(0, 120)}" — what was your specific contribution and what would you do differently now?`),
      model: "offline-interview-prep",
    };
  });
