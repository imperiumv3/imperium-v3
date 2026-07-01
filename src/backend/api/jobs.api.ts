/**
 * Job Discovery Engine — TanStack server functions.
 * Auth: every endpoint requires a Supabase session. Per-user profile is
 * loaded from the `profiles` table and merged with the form filters.
 *
 * Flow:  discoverJobs → retrieve → normalize+rank → cache → log history
 *        getDiscoveredJob → read cached row
 *        selectJobForResume → stage handoff for Resume Studio
 *        getProfileMetrics → live left-rail metrics
 */
import { requireSupabaseAuth } from "@backend/database/AuthMiddleware";
import {
  normalizeMany,
  selectTop5,
  type NormalizedJob,
} from "@backend/jobs/JobNormalizationService.server";
import type { CandidateContext, ExperienceBucket } from "@backend/jobs/JobRankingService.server";
import { retrieveJobs } from "@backend/jobs/JobRetrievalService.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ExperienceBucketEnum = z.enum(["fresher", "0-2", "3-5", "5+"]);

const DiscoverInput = z.object({
  title: z.string().max(200).default(""),
  skills: z.string().max(500).default(""),
  location: z.string().max(200).default(""),
  experience: z.union([ExperienceBucketEnum, z.literal("")]).default(""),
  workMode: z.string().max(50).default(""),
  salaryMin: z.number().int().min(0).max(100_000_000).nullable().optional(),
  freshnessDays: z.number().int().min(1).max(365).optional().default(30),
});

type DiscoverFilters = z.infer<typeof DiscoverInput>;

function buildCandidateContext(profile: any, filters: Partial<DiscoverFilters>): CandidateContext {
  const profileSkills = Array.isArray(profile?.skills) ? (profile.skills as string[]) : [];
  const formSkills = (filters.skills ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = Array.from(
    new Set([...profileSkills, ...formSkills].map((s) => s.trim()).filter(Boolean)),
  );
  const role = filters.title || profile?.target_role || profile?.headline || "Software Engineer";
  // When work mode is "remote", search with empty location to get ALL remote jobs
  // from every source, then filter by remote flag post-retrieval.
  const workMode = (filters.workMode ?? "").toLowerCase();
  const location =
    workMode === "remote"
      ? filters.location || "" // empty = worldwide search for remote jobs
      : filters.location || profile?.location || "Remote";
  const desiredSalaryMin =
    filters.salaryMin ?? (profile?.salary_expectation?.min as number | undefined) ?? null;
  const bucket: ExperienceBucket | null = filters.experience
    ? (filters.experience as ExperienceBucket)
    : null;
  return {
    role,
    skills: merged,
    experience: "",
    experienceBucket: bucket,
    location,
    desiredSalaryMin,
  };
}

async function loadProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select(
      "name, email, phone, location, headline, target_role, seniority, skills, experience, education, projects, certifications, languages, summary, linkedin_url, github_url, portfolio_url",
    )
    .eq("id", userId)
    .maybeSingle();
  return data;
}

// Per-user in-memory cache (Worker process lifetime). Resets between deploys.
const userJobCache = new Map<
  string,
  { taskId: string; jobs: (NormalizedJob & { id: string })[]; cachedAt: string }
>();

export const discoverJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DiscoverInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const taskId = `disc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const profile = await loadProfile(context.supabase, context.userId);
    const candidate = buildCandidateContext(profile, data);

    const { jobs: raws, perSource } = await retrieveJobs(candidate.role, candidate.location);
    let normalized = normalizeMany(raws, candidate);

    // Filter by freshness
    if (data.freshnessDays) {
      normalized = normalized.filter((j) => j.freshnessDays <= data.freshnessDays!);
    }

    if (candidate.experienceBucket) {
      // Keep jobs we couldn't classify (bucket === null) — the ranker already
      // applies a small penalty. Only drop jobs whose bucket is known AND
      // differs from what the candidate wants.
      normalized = normalized.filter(
        (j) => j.experienceBucket == null || j.experienceBucket === candidate.experienceBucket,
      );
    }
    if (candidate.desiredSalaryMin && candidate.desiredSalaryMin > 0) {
      normalized = normalized.filter((j) => {
        const cap = j.salaryMax ?? j.salaryMin;
        return cap == null || cap >= candidate.desiredSalaryMin!;
      });
    }
    const mode = (data.workMode || "").toLowerCase();
    if (mode === "remote") normalized = normalized.filter((j) => j.remote);
    else if (mode === "onsite")
      normalized = normalized.filter((j) => !j.remote && j.workMode !== "Hybrid");
    else if (mode === "hybrid")
      normalized = normalized.filter((j) => j.workMode === "Hybrid" || /hybrid/i.test(j.location));

    const cached = normalized.map((j, idx) => ({ ...j, id: `${taskId}_${idx}` }));
    userJobCache.set(context.userId, { taskId, jobs: cached, cachedAt: new Date().toISOString() });

    return {
      taskId,
      cachedAt: new Date().toISOString(),
      top5: selectTop5(cached),
      all: cached,
      perSource,
      candidate: { role: candidate.role, location: candidate.location, skills: candidate.skills },
    };
  });

const JobIdInput = z.object({ jobId: z.string().min(1) });

export const getDiscoveredJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => JobIdInput.parse(i))
  .handler(async ({ data, context }): Promise<NormalizedJob | null> => {
    const entry = userJobCache.get(context.userId);
    if (!entry) return null;
    return entry.jobs.find((j) => j.id === data.jobId) ?? null;
  });

export const selectJobForResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => JobIdInput.parse(i))
  .handler(async ({ data }) => {
    return {
      ok: true,
      selectionId: undefined,
      jobId: data.jobId,
      redirect: `/resume?jobId=${data.jobId}`,
    };
  });

export const getProfileMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await loadProfile(context.supabase, context.userId);

    // Profile Strength: weighted completeness across all profile sections
    const sectionChecks = [
      { filled: !!profile?.name, weight: 5 },
      { filled: !!profile?.email, weight: 5 },
      { filled: !!profile?.phone, weight: 5 },
      { filled: !!profile?.location, weight: 5 },
      { filled: !!profile?.headline, weight: 8 },
      { filled: !!profile?.summary && (profile.summary as string).length >= 30, weight: 12 },
      {
        filled: Array.isArray(profile?.skills) && (profile.skills as string[]).length >= 3,
        weight: 15,
      },
      {
        filled: Array.isArray(profile?.experience) && (profile.experience as unknown[]).length > 0,
        weight: 15,
      },
      {
        filled: Array.isArray(profile?.education) && (profile.education as unknown[]).length > 0,
        weight: 10,
      },
      {
        filled: Array.isArray(profile?.projects) && (profile.projects as unknown[]).length > 0,
        weight: 10,
      },
      { filled: !!profile?.linkedin_url, weight: 5 },
      { filled: !!profile?.github_url || !!profile?.portfolio_url, weight: 5 },
    ];
    const profileStrength = Math.min(
      100,
      Math.round(sectionChecks.reduce((sum, c) => sum + (c.filled ? c.weight : 0), 0)),
    );

    // ATS Readiness: how well the profile would score against an ATS parser
    const skillCount = Array.isArray(profile?.skills) ? (profile.skills as string[]).length : 0;
    const expCount = Array.isArray(profile?.experience)
      ? (profile.experience as unknown[]).length
      : 0;
    const hasSummary = !!profile?.summary && (profile.summary as string).length >= 30;
    const atsReadiness = Math.min(
      100,
      Math.round(
        (hasSummary ? 25 : 0) +
          Math.min(30, skillCount * 3) +
          Math.min(25, expCount * 8) +
          (profile?.location ? 10 : 0) +
          (profile?.target_role ? 10 : 0),
      ),
    );

    // Resume Quality: content depth (skills + experience bullets + projects)
    const expBullets = Array.isArray(profile?.experience)
      ? (profile.experience as { highlights?: string[]; description?: string }[]).reduce(
          (n, e) => n + (e.highlights?.length ?? (e.description ? 1 : 0)),
          0,
        )
      : 0;
    const projectCount = Array.isArray(profile?.projects)
      ? (profile.projects as unknown[]).length
      : 0;
    const certCount = Array.isArray(profile?.certifications)
      ? (profile.certifications as unknown[]).length
      : 0;
    const resumeQuality = Math.min(
      100,
      Math.round(
        Math.min(30, skillCount * 3) +
          Math.min(35, expBullets * 4) +
          Math.min(20, projectCount * 7) +
          Math.min(15, certCount * 5),
      ),
    );

    // Real application counts from the applications table
    const { count: appCount } = await context.supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);

    const { count: interviewCount } = await context.supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "interview");

    const applicationsSubmitted = appCount ?? 0;
    const interviewSuccessRate =
      applicationsSubmitted > 0
        ? Math.round(((interviewCount ?? 0) / applicationsSubmitted) * 100)
        : 0;

    return {
      profileStrength,
      atsReadiness,
      resumeQuality,
      applicationsSubmitted,
      interviewSuccessRate,
    };
  });
