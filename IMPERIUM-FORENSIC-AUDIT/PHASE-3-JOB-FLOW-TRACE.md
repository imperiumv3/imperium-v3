# PHASE 3 — JOB FLOW TRACE

## Complete Job Data Flow: Discovery → Details → Resume Studio

---

## Flow Diagram

```
User Search
    ↓
Backend: discoverJobs()
    ↓
Job Sources (6 working, 3 broken)
    ↓
Normalization + Ranking + Filtering
    ↓
Frontend: Jobs Page
    ↓
Job Cards Display
    ↓
User Clicks "View Details"
    ↓
Job Details Panel Opens
    ↓
User Clicks "Select for Resume"  ← useSelectJob()
    ↓
Backend: selectJobForResume(jobId)
    ↓
Navigate to /resume?jobId=xxx
    ↓
❌ BREAKPOINT: Resume Page NEVER reads jobId
    ↓
selectedJob remains NULL
    ↓
Fallback: "Imperium Labs / Senior Frontend Engineer"
    ↓
ATS/Match engines use EMPTY description
    ↓
Apply button creates application with WRONG data
```

---

## Step-by-Step Trace with Evidence

### STEP 1: Job Discovery
**File:** `src/backend/api/jobs.api.ts:19-86`
**Function:** `discoverJobs`

**Input:**
```typescript
{
  title: string,      // e.g. "Frontend Developer"
  location: string,   // e.g. "Bangalore"
  experience: string, // e.g. "fresher"
  skills: string[],
  workMode: "remote" | "onsite" | "hybrid" | null,
  salaryMin: number | null
}
```

**Process:**
1. Converts experience string to ExperienceBucket
2. Builds CandidateContext
3. Calls all job sources in parallel
4. Normalizes responses
5. Ranks and filters
6. Caches in-memory per-user

**Output:**
```typescript
{
  all: NormalizedJob[],  // Full list
  top5: NormalizedJob[]  // Best matches
}
```

**Data Fields Preserved:**
- ✅ `title` - Job title
- ✅ `company` - Company name
- ✅ `description` - Full or partial JD
- ✅ `salary` - Formatted string
- ✅ `location` - Location string
- ✅ `matchScore` - 0-1 weighted score
- ✅ `breakdown` - Component scores
- ✅ `skills` - Extracted tech stack
- ✅ `url` - Job posting URL
- ✅ `source` - Source adapter name

---

### STEP 2: Jobs Page Display
**File:** `src/frontend/jobs/JobsPage.tsx`

**Data Loaded:**
```typescript
const { data } = useDiscovery();
const all = data?.all ?? [];
const top5 = data?.top5 ?? [];
```

**Card Rendering:**
- Top 5 shown in featured row
- All jobs shown in grid below
- Each card shows: title, company, location, salary, matchScore, tags

**Data Integrity Check:**
✅ All fields from backend preserved
✅ Match scores displayed correctly
✅ Job cards clickable

---

### STEP 3: View Job Details
**File:** `src/frontend/jobs/components/JobIntelPanel.tsx`

**Triggered by:** User clicks job card
**State Update:** `setSelectedId(jobId)`

**Details Panel Shows:**
```typescript
const selectedJob = all.find(j => j.id === selectedId) ?? null;
```

**Data Available:**
- ✅ `title` - Displayed in header
- ✅ `company` - Displayed in header
- ✅ `description` - **THIS IS THE CRITICAL FIELD**
- ✅ `salary` - Displayed
- ✅ `location` - Displayed
- ✅ `matchScore` - Displayed as percentage
- ✅ `breakdown` - Shown as component bars

**Evidence:** Job details panel reads from in-memory `all` array (line in JobsPage.tsx:39)

---

### STEP 4: Select Job for Resume ❌ BREAK POINT
**File:** `src/frontend/jobs/jobs.logic.ts:79-89`
**Function:** `useSelectJob()`

**Code:**
```typescript
export function useSelectJob() {
  const fn = useServerFn(selectJobForResume);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (jobId: string) => fn({ data: { jobId } }),
    onSuccess: (res) => {
      navigate({ to: "/resume", search: { jobId: res.jobId } as never }).catch(() => {
        window.location.href = res.redirect;
      });
    },
  });
}
```

**Backend Handler:**
**File:** `src/backend/api/jobs.api.ts:104-109`
```typescript
export const selectJobForResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => JobIdInput.parse(i))
  .handler(async ({ data }) => {
    return { ok: true, selectionId: undefined, jobId: data.jobId, redirect: `/resume?jobId=${data.jobId}` };
  });
```

**What Happens:**
1. Backend receives `jobId`
2. Backend returns `{ jobId, redirect: "/resume?jobId=xxx" }`
3. Frontend navigates to `/resume?jobId=xxx`
4. **jobId is passed as URL query parameter** ✅

**What SHOULD Happen Next:**
Resume Page should:
1. Read `jobId` from route search params
2. Fetch job from cache or API using `getDiscoveredJob(jobId)`
3. Populate `selectedJob` state with fetched data
4. Pass to ATS/match engines

---

### STEP 5: Resume Page Load ❌ CRITICAL FAILURE

**Route File:** `src/routes/_authenticated/resume.tsx`
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { ResumePage } from "@frontend/resume/ResumePage";

export const Route = createFileRoute("/_authenticated/resume")({
  component: ResumePage,
});
```

**❌ MISSING:**
- No `validateSearch` to parse jobId from URL
- No `beforeLoad` to fetch job data
- No `loader` to provide job to component
- Component receives NO props

**Resume Page Component:** `src/frontend/resume/ResumePage.tsx:13-23`
```typescript
const selectedJob = useResumeStore((s) => s.selectedJob);
const versions = useResumeStore((s) => s.versions);
const resume = useResumeStore((s) => s.resume);
const navigate = useNavigate();

const printHandleRef = useRef<PrintHandle | null>(null);
const [jdOpen, setJdOpen] = useState(false);

const latest = versions[versions.length - 1];
const company = selectedJob?.company ?? "Imperium Labs";       // ❌ FALLBACK
const role = selectedJob?.title ?? "Senior Frontend Engineer"; // ❌ FALLBACK
```

**❌ MISSING:**
- No logic to read jobId from URL search params
- No call to fetch job data
- No call to `setSelectedJob()`
- **`selectedJob` always null or stale from localStorage**

**Result:**
```typescript
company = "Imperium Labs"                  // ❌ HARDCODED FALLBACK
role = "Senior Frontend Engineer"          // ❌ HARDCODED FALLBACK
```

---

### STEP 6: Resume Store State
**File:** `src/frontend/resume/state/useResumeStore.ts:76-108`

**Initial State:**
```typescript
export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      resume: INITIAL,
      selectedJob: null,  // ❌ STARTS NULL
      versions: [],
      // ...
    }),
    {
      name: "imperium-resume-studio-v1",  // ⚠️ NO USER SCOPING
    }
  )
);
```

**Interface:**
```typescript
interface SelectedJob {
  company: string;
  title: string;
  description: string;  // ← THIS IS WHAT ATS ENGINES NEED
}
```

**Setter Available:**
```typescript
setSelectedJob: (j: SelectedJob | null) => void;
```

**❌ NEVER CALLED** - No code in ResumePage.tsx invokes this setter

**localStorage Key:** `imperium-resume-studio-v1`
- **⚠️ Security Issue:** Not user-scoped (cross-user data leak)
- **❌ Stale Data:** selectedJob persists across sessions but becomes outdated

---

### STEP 7: ATS/Match Score Computation
**File:** `src/frontend/resume/panes/ActionBar.tsx:22-38`

**ATS Engine Invocation:**
```typescript
const jd = selectedJob?.description ?? "";  // ❌ EMPTY STRING
const ats = useMemo(() => analyzeAts(resume, jd), [resume, jd]);
const jdMatch = useMemo(() => analyzeJdMatch(resume, jd), [resume, jd]);
```

**When selectedJob is null:**
```typescript
jd = ""  // ❌ EMPTY
ats.atsScore = ~36% (low because keyword match is 0%)
jdMatch.score = 0% (no skills/tech to match)
```

**But ResumePage Shows:**
**File:** `src/frontend/resume/ResumePage.tsx:59`
```typescript
<div className="rs-stat-value">94%</div>  // ❌ HARDCODED, IGNORES COMPUTED SCORE
```

---

### STEP 8: Apply Button Flow
**File:** `src/frontend/resume/panes/ActionBar.tsx:90-108`

**When User Clicks "Apply":**
```typescript
function handleApply() {
  if (!selectedJob) return;  // ❌ EXITS IF NULL
  const versionLabel = versions[versions.length - 1]?.label ?? "V1";
  create({
    job: {
      title: selectedJob.title,         // ❌ "Senior Frontend Engineer"
      company: selectedJob.company,     // ❌ "Imperium Labs"
      description: selectedJob.description,  // ❌ EMPTY or STALE
    },
    resume: {
      resumeId: "current",
      resumeVersion: versionLabel,
      templateUsed: activeTemplate?.name ?? resume.meta.templateId,
    },
    atsScore: ats.atsScore,      // ❌ LOW (computed from empty JD)
    matchScore: jdMatch.score,   // ❌ 0% (no JD to match)
  });
  setApplied(true);
  setTimeout(() => navigate({ to: "/applications" }), 600);
}
```

**Application Created With:**
- **Wrong company** ("Imperium Labs" instead of real selected job)
- **Wrong title** ("Senior Frontend Engineer" instead of real selected job)
- **Empty/stale description** (ATS can't analyze real JD)
- **Wrong ATS score** (computed without real JD)
- **Wrong match score** (0% because no real JD)

---

### STEP 9: Application Tracker
**File:** `src/frontend/applications/state/useApplicationsStore.ts:85-115`

**Application Created:**
```typescript
const dto = await createApplicationFromResumeStudio({
  data: {
    company: "Imperium Labs",  // ❌ WRONG
    role: "Senior Frontend Engineer",  // ❌ WRONG
    location: undefined,
    salary: undefined,
    source: undefined,
    sourceUrl: undefined,
    description: "",  // ❌ EMPTY
    status: "applied",
    atsScore: 36,  // ❌ LOW (based on empty JD)
    matchScore: 0,  // ❌ ZERO
    resumeId: "current",
    resumeVersion: "V1",
    templateUsed: "classic-ats",
    origin: "resume_studio",
  },
});
```

**Persisted to Supabase:**
- `job_listings` table - Creates row with "Imperium Labs" / "Senior Frontend Engineer"
- `applications` table - Links to wrong job listing
- Metadata stored in `notes` JSON field

**Result:** Application tracker shows fake application data

---

## Data Loss Analysis

### What Gets Lost Where:

| Field | Discovery | Jobs Page | Select Job | Resume Page | Application |
|-------|-----------|-----------|------------|-------------|-------------|
| **title** | ✅ Correct | ✅ Displayed | ✅ Passed | ❌ Fallback | ❌ Wrong |
| **company** | ✅ Correct | ✅ Displayed | ✅ Passed | ❌ Fallback | ❌ Wrong |
| **description** | ⚠️ Partial | ⚠️ Partial | ✅ Passed | ❌ Never Set | ❌ Empty |
| **salary** | ✅ Correct | ✅ Displayed | ✅ Passed | ❌ Not Used | ❌ Missing |
| **location** | ✅ Correct | ✅ Displayed | ✅ Passed | ❌ Not Used | ❌ Missing |
| **matchScore** | ✅ Computed | ✅ Displayed | ✅ Passed | ❌ Recomputed | ❌ Wrong (0%) |
| **skills** | ✅ Extracted | ✅ Displayed | ✅ Passed | ❌ Not Used | ❌ Missing |
| **url** | ✅ Correct | ✅ Link Works | ✅ Passed | ❌ Not Used | ❌ Missing |

### Critical Break Point:
**Between:** `selectJobForResume()` navigation and `ResumePage` component mount
**Reason:** Resume route has no logic to consume `jobId` query parameter
**Impact:** ALL job data lost, replaced with hardcoded fallback

---

## Root Cause

### Missing Implementation:
Resume Studio was designed with infrastructure to receive job data (`selectedJob` state, `setSelectedJob()` setter, ATS engines that consume JD) but **the bridge was never built**.

### Required Implementation (Never Added):
```typescript
// File: src/routes/_authenticated/resume.tsx
export const Route = createFileRoute("/_authenticated/resume")({
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  component: ResumePage,
});

// File: src/frontend/resume/ResumePage.tsx
const { jobId } = Route.useSearch();
const { data: jobData, isLoading } = useJobDetails(jobId ?? null);
const setSelectedJob = useResumeStore((s) => s.setSelectedJob);

useEffect(() => {
  if (jobData) {
    setSelectedJob({
      company: jobData.company,
      title: jobData.title,
      description: jobData.description,
    });
  }
}, [jobData, setSelectedJob]);
```

---

## User Impact

### What User Experiences:
1. User searches for "React Developer in Bangalore"
2. Sees 50 relevant jobs with correct details
3. Clicks "TechCorp - Senior React Engineer - ₹15L"
4. Views full details, sees 87% match score
5. Clicks "Select for Resume"
6. Resume Studio opens showing:
   - ❌ Company: "Imperium Labs" (wrong)
   - ❌ Role: "Senior Frontend Engineer" (wrong)
   - ❌ Match Score: "94%" (hardcoded, wrong)
   - ❌ ATS Score: 36% (low because no JD)
7. User customizes resume (unaware of issue)
8. Clicks "Apply"
9. Application created for wrong job
10. Application Tracker shows "Imperium Labs - Senior Frontend Engineer"

### What Should Happen:
1-5. Same
6. Resume Studio opens showing:
   - ✅ Company: "TechCorp"
   - ✅ Role: "Senior React Engineer"
   - ✅ Match Score: 87% (from job ranking)
   - ✅ ATS Score: 78% (computed with real JD)
7. User customizes resume with AI analysis of real JD
8. Clicks "Apply"
9. Application created for correct job
10. Application Tracker shows "TechCorp - Senior React Engineer - ₹15L"

---

## Fix Complexity: LOW
**Required Changes:**
1. Add route validation (5 lines)
2. Read jobId in ResumePage (2 lines)
3. Fetch job data (use existing useJobDetails hook)
4. Call setSelectedJob when data arrives (useEffect, 5 lines)
5. Remove hardcoded fallbacks (2 lines)
6. Remove hardcoded 94% match score (use computed value)

**Total:** ~20 lines of code to fix entire flow
