/**
 * Shared skill categorizer. Buckets a flat list of skills into professional,
 * ATS-friendly groups (Languages, Frontend, Backend, Cloud & DevOps, ...).
 * Returns one or more ResumeSkillGroup so templates can render side headings
 * instead of one long clumsy paragraph mixing every tech together.
 */
import type { ResumeSkillGroup } from "@frontend/resume/schema";

const SKILL_CATEGORIES: Array<{ label: string; match: RegExp }> = [
  { label: "Languages", match: /^(python|javascript|typescript|java|c\+\+|c#|go|golang|rust|kotlin|swift|ruby|php|scala|r|dart|elixir|haskell|perl|lua|matlab|sql)$/i },
  { label: "Frontend", match: /(react|next\.?js|vue|angular|svelte|html5?|css3?|tailwind|redux|zustand|sass|scss|webpack|vite|three\.?js|d3|chakra|mui|material[- ]?ui|shadcn)/i },
  { label: "Backend", match: /(node\.?js|express|fastapi|django|flask|spring|nest\.?js|rails|laravel|graphql|grpc|rest|api|hapi|koa|gin|fiber|asp\.net|\.net)/i },
  { label: "Databases", match: /(postgres|mysql|mongo|redis|sqlite|dynamodb|snowflake|bigquery|elasticsearch|cassandra|neo4j|firestore|supabase|prisma|drizzle|sequelize|typeorm|mongoose)/i },
  { label: "Cloud & DevOps", match: /(aws|gcp|azure|cloudflare|vercel|netlify|docker|kubernetes|k8s|terraform|jenkins|ci\/cd|github actions|gitlab|ansible|helm|nginx|linux|bash)/i },
  { label: "AI & ML", match: /(pytorch|tensorflow|keras|scikit|pandas|numpy|langchain|llama[- ]?index|huggingface|openai|gemini|claude|anthropic|rag|llm|embeddings|ai agent|machine learning|deep learning|nlp|computer vision)/i },
  { label: "Tools", match: /^(git|github|gitlab|jira|figma|postman|vs ?code|notion|confluence|slack|miro|datadog|sentry|grafana|prometheus)$/i },
  { label: "Core Concepts", match: /(data structures|algorithms|oop|system design|problem solving|design patterns|microservices|distributed systems|tdd|agile|scrum)/i },
  { label: "Soft Skills", match: /^(communication|team collaboration|adaptability|ownership|time management|leadership|critical thinking|mentoring|public speaking)$/i },
];

export function categorizeResumeSkills(skills: string[]): ResumeSkillGroup[] {
  const buckets = new Map<string, string[]>();
  const other: string[] = [];
  for (const raw of skills) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    const rule = SKILL_CATEGORIES.find((r) => r.match.test(v));
    if (rule) {
      const list = buckets.get(rule.label) ?? [];
      if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) list.push(v);
      buckets.set(rule.label, list);
    } else if (!other.some((x) => x.toLowerCase() === v.toLowerCase())) {
      other.push(v);
    }
  }
  const ordered: ResumeSkillGroup[] = SKILL_CATEGORIES
    .map((r) => r.label)
    .filter((l) => (buckets.get(l)?.length ?? 0) > 0)
    .map((l) => ({ category: l, items: buckets.get(l)! }));
  if (other.length) ordered.push({ category: "Other", items: other });
  return ordered;
}
