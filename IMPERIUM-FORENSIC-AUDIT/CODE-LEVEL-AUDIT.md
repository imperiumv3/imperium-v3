# CODE-LEVEL AUDIT — EVIDENCE ONLY

## 1. FRESHERS FILTERING

### Issue: Experience bucket filter exists but may not work as expected

**File:** `src/backend/api/jobs.api.ts`
**Function:** `discoverJobs.handler`
**Lines:** 56-60

```typescript
if (candidate.experienceBucket) {
  normalized = normalized.filter(
    (j) => j.experienceBucket == null || j.experienceBucket === candidate.experienceBucket,
  );
}
```

**Root Cause:** Filter allows jobs with `null` experience bucket through. When job sources return jobs without classifiable experience, they pass fresher filter.

**Reproduction:**
1. Set filter to "fresher"
2. Job source returns job with title "Software Engineer" (no experience indicators)
3. `classifyExperience()` returns `null`
4. Condition `j.experienceBucket == null` is true → job passes filter
5. User sees 3+ year jobs in fresher results

**Fix:**
```typescript
if (candidate.experienceBucket) {
  normalized = normalized.filter(
    (j) => j.experienceBucket === candidate.experienceBucket,
  );
  // Remove null check - only show jobs that match exact bucket
}
```

---

## 2. EXPERIENCE FILTERING

**File:** `src/backend/jobs/JobRankingService.server.ts`
**Function:** `classifyExperience`
**Lines:** 126-177

```typescript
export function classifyExperience(title: string, description: string, experienceText?: string | null): ExperienceBucket | null {
  const t = title.toLowerCase();
  
  if (/\b(senior|sr\.?|lead|principal|staff|architect|head of|director|vp|manager)\b/.test(t)) return "5+";
  if (/\b(intern|graduate|fresher|trainee|entry[- ]level|junior|jr\.?)\b/.test(t)) return "fresher";
  // ... rest of logic
  
  return null; // Unknown — caller decides what to do.
}
```

**Root Cause:** Function returns `null` when experience cannot be classified. Design intent is to keep job (with penalty), but filter logic passes nulls through.

**Reproduction:**
1. Job titled "Software Engineer" (no senior/junior/etc)
2. Description has no "X years" text
3. No experienceText from source
4. Returns `null`
5. Filter sees `null`, allows through

**Evidence in Code:**
- Line 177: `return null; // Unknown — caller decides what to do.`
- Line 187: Comment says "unknown: small penalty, NOT a mismatch"
- But filter at Line 57-60 in jobs.api.ts treats null as "pass"

**Fix:** Change filter to strict matching OR add penalty-based filtering

---

## 3. DATE FILTERING (>15 DAYS)

### Issue: No date filter implemented in discovery API

**File:** `src/backend/api/jobs.api.ts`
**Function:** `discoverJobs.handler`
**Lines:** 55-68

```typescript
if (candidate.experienceBucket) { /* filter */ }
if (candidate.desiredSalaryMin && candidate.desiredSalaryMin > 0) { /* filter */ }
const mode = (data.workMode || "").toLowerCase();
if (mode === "remote") normalized = normalized.filter((j) => j.remote);
else if (mode === "onsite") normalized = normalized.filter((j) => !j.remote);
// NO DATE FILTER
```

**Root Cause:** Discovery API does not have date/freshness filter parameter or logic.

**Evidence:**
- Input validator (Line 21-28): No `postedWithinDays` or `freshnessDays` field
- Filter block (Line 55-68): No freshness check
- `NormalizedJob` HAS `freshnessDays` field (Line 48 in JobNormalizationService)
- Top5 selector uses `freshnessDays <= 30` (Line 124 in JobNormalizationService)

**Reproduction:**
1. User searches for jobs
2. Results include 6-month-old postings
3. No UI filter to exclude old posts
4. User manually checks dates

**Fix:**
Add to DiscoverInput schema:
```typescript
freshnessDays: z.number().int().min(1).max(365).optional(),
```
Add filter after Line 68:
```typescript
if (data.freshnessDays) {
  normalized = normalized.filter((j) => j.freshnessDays <= data.freshnessDays!);
}
```

---

## 4. TOP5 GENERATION

**File:** `src/backend/jobs/JobNormalizationService.server.ts`
**Function:** `selectTop5`
**Lines:** 120-130

```typescript
export function selectTop5(jobs: NormalizedJob[]): NormalizedJob[] {
  const allowedTiers: LocationTier[] = ["same_city", "same_state", "remote", "same_country"];
  return jobs
    .filter((j) =>
      j.qualityStatus === "ok" &&
      j.qualityScore >= 60 &&
      !j.titleMismatch &&
      j.matchScore >= 0.5 &&
      j.freshnessDays <= 30 &&
      allowedTiers.includes(j.locationTier),
    )
    .slice(0, 5);
}
```

**Root Cause:** STRICT filtering may return fewer than 5 jobs.

**Reproduction:**
1. User searches
2. 50 jobs found
3. Only 3 pass strict filters (qualityScore >= 60, matchScore >= 0.5, freshnessDays <= 30, no titleMismatch)
4. Top5 shows only 3 jobs
5. User expects 5

**Evidence:**
- Comment Line 111: "never pad"
- Filter chain is AND logic (all conditions must pass)
- No fallback when <5 jobs qualify

**Fix:** Loosen filters progressively if <5 found:
```typescript
let top5 = strictFilter(jobs);
if (top5.length < 5) top5 = loosenedFilter(jobs);
return top5.slice(0, 5);
```

---

## 5. JOB DESCRIPTION RETRIEVAL

### Issue: LinkedIn JD enrichment limited to 8 jobs, silent failures

**File:** `src/backend/jobs/JobSources.server.ts`
**Function:** `fetchLinkedIn`
**Lines:** 215-248, 332-360

```typescript
const LINKEDIN_JD_FETCH_MAX = 8;
const LINKEDIN_JD_FETCH_GAP_MS = 600;
const LINKEDIN_JD_FETCH_TIMEOUT_MS = 5000;
const LINKEDIN_PLACEHOLDER_DESCRIPTION = "LinkedIn listing — click through for full job description.";

async function fetchLinkedInJd(id: string): Promise<{ description: string; html: string } | null> {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LINKEDIN_JD_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { /* ... */ });
    if (!res.ok) return null;  // ❌ SILENT FAILURE
    // ... parse description
    if (description.length < 40) return null;  // ❌ SILENT FAILURE
    return { description, html: block.slice(0, 12000) };
  } catch {
    return null;  // ❌ SILENT FAILURE
  } finally {
    clearTimeout(timer);
  }
}
```

**Enrichment loop (Lines 340-357):**
```typescript
if (process.env.LINKEDIN_DISABLE_JD_FETCH === "1") return out;
const toFetch = out.slice(0, LINKEDIN_JD_FETCH_MAX);  // ❌ ONLY FIRST 8
for (const job of toFetch) {
  try {
    const jd = await fetchLinkedInJd(job.external_id);
    if (jd?.description) {
      job.description = jd.description;
      // ...
    }
  } catch {
    // Swallow — placeholder description is fine.  // ❌ SILENT
  }
  await new Promise((r) => setTimeout(r, LINKEDIN_JD_FETCH_GAP_MS));
}
```

**Root Cause:**
1. Only first 8 jobs enriched (LINKEDIN_JD_FETCH_MAX = 8)
2. All HTTP/parse failures return null silently
3. Jobs beyond 8 keep placeholder description
4. No logging of enrichment success rate

**Reproduction:**
1. LinkedIn returns 100 jobs
2. Only first 8 have JD fetch attempted
3. If fetch fails (403/timeout), placeholder kept
4. Jobs 9-100 have placeholder
5. Resume Studio ATS scoring uses placeholder → poor scores

**Evidence:**
- Line 215: `const LINKEDIN_JD_FETCH_MAX = 8;`
- Line 232: `if (!res.ok) return null;` (no log)
- Line 240: `if (description.length < 40) return null;` (no log)
- Line 243: `} catch { return null; }` (no log)
- Line 349: `} catch { // Swallow` (no log)

**Fix:**
1. Increase LINKEDIN_JD_FETCH_MAX to 20
2. Log enrichment attempts/failures
3. Add retry logic for transient failures
4. Surface enrichment stats to UI

---

## 6. JOB URL VALIDATION

**File:** `src/backend/jobs/JobValidationService.server.ts`
**Function:** `validateJob`
**Lines:** 106-107, 130

```typescript
const urlOk = isValidUrl(raw.url);
if (!urlOk) reasons.push("invalid_url");
// ...
else if (!urlOk) qualityStatus = "invalid_url";
```

**Function:** `isValidUrl` (same file, Lines 32-36)
```typescript
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}
```

**Root Cause:** Only validates URL format, does NOT check if link is live/404.

**Reproduction:**
1. Job source returns URL: `https://example.com/job/12345`
2. URL format valid → passes
3. User clicks → 404 Not Found
4. No validation caught this

**Evidence:**
- Line 34: Only checks `new URL(url)` succeeds
- Line 35: Only checks protocol is http/https
- No HTTP GET request to verify link alive
- No 404 detection

**Fix:** Add live link checker (optional, performance cost):
```typescript
async function isLiveUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', timeout: 3000 });
    return res.ok;
  } catch { return false; }
}
```

OR rely on user reports + source reliability scoring (current approach).

---

## 7. RESUME GENERATION PIPELINE

### Issue: "Generate Resume" button only generates summary

**File:** `src/frontend/resume/panes/ActionBar.tsx`
**Function:** `handleGenerate`
**Lines:** 62-84

```typescript
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
    if (res.summary) patch((r) => { r.summary = res.summary; });  // ❌ ONLY SUMMARY
  } catch { /* swallow */ }
  finally { setAiBusy(false); }
};
```

**Button label (Line 131):**
```typescript
<button onClick={handleGenerate}>
  <span aria-hidden>✨</span> {aiBusy ? "Generating…" : "Generate with AI"}
</button>
```

**Root Cause:** Button labeled "Generate with AI" but only calls `aiGenerateSummary`, not full resume generation.

**Evidence:**
- Line 73-76: Only calls `summaryFn`
- Line 80: Only updates `r.summary`
- No calls to generate experience bullets, projects, skills extraction
- AI functions exist (`aiImproveBullet`, `aiFillMissing`, `aiAnalyzeJd`) but unused here

**Reproduction:**
1. User clicks "Generate with AI"
2. Expects full resume generated
3. Only 2-3 sentence summary generated
4. Rest of resume unchanged

**Fix:** 
Option 1: Rename button to "Generate Summary"
Option 2: Implement full generation:
```typescript
const res = await runAi({
  feature: "full-resume",
  call: async () => {
    const summary = await aiGenerateSummary({...});
    const improved = await Promise.all(
      resume.experience.flatMap(e => e.bullets.map(b => aiImproveBullet({bullet: b, jd})))
    );
    const missing = await aiFillMissing({resume: ctx, jd});
    return { summary, improved, missing };
  }
});
```

---

## 8. PROFILE → RESUME STUDIO DATA TRANSFER

**File:** `src/frontend/resume/state/useResumeStore.ts`
**Function:** `seedFromProfile`
**Lines:** 19-75

```typescript
function seedFromProfile(p: Pick<ImperiumProfile, /* ... */> ): ResumeJSON {
  return {
    ...EMPTY_RESUME,
    personal: {
      name: p.name,
      title: p.headline,
      email: p.email,
      phone: p.phone,
      location: p.location,
      links: [/* ... */],
    },
    summary: p.summary,
    skills: p.skills.length ? [{ category: "Skills", items: p.skills }] : [],
    experience: p.experience.map((e) => ({ /* ... */ })),
    projects: p.projects.map((pr) => ({ /* ... */ })),
    education: p.education.map((ed) => ({ /* ... */ })),
    certifications: p.certifications.map((c) => ({ /* ... */ })),
  };
}
```

**Store initialization (Lines 99-106):**
```typescript
const INITIAL = seedFromProfile(EMPTY_PROFILE);

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      resume: INITIAL,  // ❌ SEEDED FROM EMPTY_PROFILE
      selectedJob: null,
      versions: [/* V1 snapshot */],
      // ...
```

**Root Cause:** Store initialized with `EMPTY_PROFILE` constant, NOT user's real profile.

**Evidence:**
- Line 99: `const INITIAL = seedFromProfile(EMPTY_PROFILE);`
- `EMPTY_PROFILE` imported from `@backend/profile/ProfileTypes` (Line 14)
- No call to fetch real profile on mount
- Resume Studio loads with empty/default data

**Reproduction:**
1. User fills profile completely
2. Navigates to Resume Studio
3. Resume fields are empty/default
4. Profile data not transferred

**Fix:** Fetch profile on mount:
```typescript
// In ResumePage component
const profile = useProfile();
const resume = useResumeStore((s) => s.resume);
const setResume = useResumeStore((s) => s.setResume);

useEffect(() => {
  if (profile && resume.personal.name === "") {
    setResume(seedFromProfile(profile));
  }
}, [profile]);
```

OR initialize store with loader:
```typescript
export const Route = createFileRoute("/_authenticated/resume")({
  loader: async ({ context }) => {
    const profile = await getProfile({ userId: context.userId });
    return { profile };
  },
  component: ResumePage,
});
```

---

## 9. RESUME STORE POPULATION

**File:** `src/frontend/resume/state/useResumeStore.ts`
**Lines:** 99-142

```typescript
export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      resume: INITIAL,
      selectedJob: null,  // ❌ STARTS NULL
      versions: [{ /* V1 */ }],
      setResume: (r) => set({ resume: r }),
      patch: (fn) => set((s) => { /* ... */ }),
      setTemplate: (id) => set(/* ... */),
      setTheme: (id) => set(/* ... */),
      setSelectedJob: (j) => set({ selectedJob: j }),  // ✅ SETTER EXISTS
      saveVersion: (label, scores) => set(/* ... */),
      restoreVersion: (id) => { /* ... */ },
      reset: () => set({ resume: INITIAL }),
    }),
    {
      name: "imperium-resume-studio-v1",  // ❌ NO USER ID
      partialize: (s) => ({ resume: s.resume, versions: s.versions, selectedJob: s.selectedJob }),
    },
  ),
);
```

**Root Cause:** 
1. `selectedJob` initialized to `null`
2. `setSelectedJob` setter exists but NEVER CALLED
3. localStorage key lacks user ID (cross-user leak)

**Evidence:**
- Line 108: `selectedJob: null,`
- Line 119: `setSelectedJob: (j) => set({ selectedJob: j }),` (setter defined)
- Grep search for `setSelectedJob` usage: Only in store definition, never invoked
- Line 137: `name: "imperium-resume-studio-v1",` (same key for all users)

**Reproduction:**
1. User A creates resume, selectedJob stored in localStorage
2. User A logs out
3. User B logs in on same device
4. User B sees User A's selectedJob

**Fix:**
1. Call `setSelectedJob` in ResumePage when jobId present
2. Add user ID to localStorage key:
```typescript
name: `imperium-resume-studio-v1-${userId}`,
```

---

## 10. APPLICATION TRACKER DEPENDENCY CHAIN

**File:** `src/frontend/applications/state/useApplicationsStore.ts`
**Function:** `createFromResumeStudio`
**Lines:** 85-115

```typescript
createFromResumeStudio: async (p) => {
  try {
    const dto = (await createApplicationFromResumeStudio({
      data: {
        company: p.job.company,        // ❌ FROM selectedJob (may be fallback)
        role: p.job.title,             // ❌ FROM selectedJob
        location: p.job.location,      // ❌ FROM selectedJob
        salary: p.job.salary,          // ❌ FROM selectedJob
        source: p.job.source,          // ❌ FROM selectedJob
        sourceUrl: p.job.sourceUrl,    // ❌ FROM selectedJob
        description: p.job.description,// ❌ FROM selectedJob
        status: "applied",
        atsScore: p.atsScore,          // Computed from selectedJob.description
        matchScore: p.matchScore,      // Computed from selectedJob.description
        resumeId: p.resume.resumeId,
        resumeVersion: p.resume.resumeVersion,
        templateUsed: p.resume.templateUsed,
        origin: p.origin ?? "resume_studio",
        agentRunId: p.agentRunId,
      },
    })) as BackendAppDto;
    const app = backendToApplication(dto);
    set({ applications: [app, ...get().applications] });
    dispatchInvalidate();
    return app;
  } catch (err) {
    console.error("[applications] createFromResumeStudio failed", err);
    return null;  // ❌ ERROR SWALLOWED
  }
},
```

**Dependency chain:**
```
ActionBar.handleApply (Line 90-108)
  ↓ reads selectedJob from store
  ↓ selectedJob = null (broken job flow)
  ↓ Line 91: if (!selectedJob) return;  // ❌ EXITS
  ↓ OR fallback: selectedJob = { company: "Imperium Labs", title: "Senior Frontend Engineer", description: "" }
  ↓
createFromResumeStudio({ job: selectedJob, ... })
  ↓ company: "Imperium Labs"  // ❌ WRONG
  ↓ title: "Senior Frontend Engineer"  // ❌ WRONG
  ↓ description: ""  // ❌ EMPTY
  ↓
Application created in Supabase with wrong data
```

**Root Cause:** Application Tracker depends on Resume Studio's selectedJob, which is always null due to broken job selection flow (Issue #8).

**Evidence:**
- ActionBar.tsx Line 91: `if (!selectedJob) return;`
- ActionBar.tsx Line 95-99: Uses selectedJob.title, company, description
- useResumeStore Line 108: `selectedJob: null,`
- ResumePage.tsx Line 22-23: Fallback to "Imperium Labs" / "Senior Frontend Engineer"

**Reproduction:**
1. User searches jobs
2. Selects "TechCorp - React Developer"
3. Clicks "Select for Resume"
4. Resume Studio opens with selectedJob = null (fallback kicks in)
5. User clicks "Apply"
6. Application created with company = "Imperium Labs"
7. Application Tracker shows wrong job

**Fix:** Fix Issue #8 (job selection flow), automatically fixes this.

Dependency graph:
```
Jobs Page (working)
  ↓
selectJobForResume(jobId) (working)
  ↓ Navigate to /resume?jobId=xxx (working)
  ↓
ResumePage (BROKEN - never reads jobId)
  ↓
selectedJob stays null (BROKEN)
  ↓
ActionBar.handleApply (uses null/fallback)
  ↓
Application Tracker (receives wrong data)
```

**Fix all:**
1. Read jobId from URL in ResumePage
2. Fetch job data via getDiscoveredJob
3. Call setSelectedJob with real data
4. ActionBar uses real data
5. Application Tracker receives correct data
