
# Apply → Tracker → Local Agent: Real Automation Pipeline

Goal: clicking **Apply** in Resume Studio creates a tracker row, queues an `application_job`, dispatches the local agent automatically, and the tracker shows live execution state driven by real agent events. All local. No cloud browsers. No simulated status.

The local agent stays the only browser-execution surface. The web app never launches a browser — Cloudflare Workers can't. Playwright replaces Selenium **inside** the local agent.

---

## 1. Data model — split user record from execution record

New table `application_jobs` (Lovable Cloud / Supabase). Migration adds it with RLS scoped to `auth.uid()`.

```
application_jobs
  id                uuid pk
  application_id    uuid fk → applications.id (cascade)
  user_id           uuid fk → auth.users
  status            text  -- queued|dispatching|running|awaiting_human|submitted|failed|cancelled|agent_offline
  current_step      text  -- 'launch_browser' | 'open_job' | 'upload_resume' | ...
  agent_run_id      text  -- id returned by local agent /apply
  job_url           text
  job_source        text  -- linkedin|naukri|greenhouse|...
  resume_pdf_path   text  -- supabase storage path
  resume_version    text
  payload           jsonb -- full dispatch envelope (profile snapshot, job meta, answers map)
  pending_question  jsonb -- when awaiting_human: {field, label, options, asked_at}
  error             jsonb -- {message, step, screenshot_url, occurred_at}
  attempts          int   default 0
  started_at        timestamptz
  finished_at       timestamptz
  created_at / updated_at
```

New table `application_job_events` (append-only execution timeline):
```
id, job_id fk, ts, level (info|success|warn|error), step, message, url, screenshot_url
```

Realtime enabled on both tables so the tracker subscribes for live updates.

Existing `applications` table keeps its user-facing status (`applied`, `interview`, …). Job-execution status lives on `application_jobs`. **An application can have many jobs (retries) without duplicating the application row.**

Resume PDFs uploaded to existing `avatars` bucket sibling: new private bucket `resumes`, path `userId/applicationId/v{n}.pdf`.

---

## 2. Server functions (TanStack `createServerFn`)

New file `src/backend/applications/ApplicationJobs.functions.ts`:

- `enqueueApplicationJob({ applicationId, jobUrl, jobSource, resumeVersion, resumePdfBase64, jobMeta, profileSnapshot })`
  1. Insert `application_jobs` row, status `queued`.
  2. Upload resume PDF to `resumes` bucket, store path.
  3. Return `{ jobId, payload }` to caller.
- `markJobAgentOffline(jobId)` — status `agent_offline`.
- `recordJobDispatched(jobId, agentRunId)` — status `dispatching` → `running`.
- `appendJobEvent(jobId, event)` — called by the **client-side bridge** every time it polls/streams agent events (until we add a webhook from agent).
- `updateJobStatus(jobId, status, patch)` — single mutation used by polling loop.
- `cancelApplicationJob(jobId)` — POSTs to agent `/cancel/{runId}` and sets `cancelled`.
- `retryApplicationJob(jobId)` — clones payload into a new job row (no duplicate application).

All `.middleware([requireSupabaseAuth])`. RLS ensures user can only touch their own jobs.

---

## 3. Local agent client (browser-side)

Replace `src/backend/automation/SeleniumBrowserBridge.ts` with `LocalAgentClient.ts` (same transport, new endpoints + cancel):

```
GET  /health          → { ok, browser: 'playwright', version }
POST /apply           → { run_id }
GET  /runs/:id        → { status, current_step, started_at, finished_at, error, pending_question }
GET  /events/:id      → { events: [...] }   (full log; client computes delta)
POST /cancel/:id      → { ok }
POST /resume/:id      → { ok }              (after human answers a pending question)
```

Default base URL `http://127.0.0.1:8000`, overridable via `VITE_LOCAL_AGENT_URL`.

New hook `useAgentJobMonitor(jobId, agentRunId)`:
- polls `/runs/:id` + `/events/:id` every 1.5s while status is non-terminal,
- diffs events and pushes new ones into Supabase via `appendJobEvent`,
- writes status transitions via `updateJobStatus`,
- stops on `submitted | failed | cancelled | awaiting_human`.

Polling is the v1 transport (works locally with zero infra). A later upgrade swaps to SSE on `/events/:id` — endpoint already exists.

---

## 4. Apply flow rewrite (`ActionBar.handleApply`)

```
1. Validate selectedJob + generated resume.
2. Render resume to PDF in-browser (existing pdf.ts), get blob.
3. createApplicationFromResumeStudio(...)  → applicationId
4. enqueueApplicationJob({...}) → { jobId, payload }
5. localAgent.health()
     - offline → toast "Agent offline — queued, retry from tracker", navigate.
     - online  → localAgent.apply(payload) → recordJobDispatched(jobId, runId)
6. navigate('/applications?focus={applicationId}')
```

Application creation never fails because the agent is offline — the job row is the buffer.

`payload` shape sent to agent (no demo/placeholder data — sourced from real profile + selected job + rendered resume):
```json
{
  "application_id": "...",
  "user_id": "...",
  "job": { "url", "source", "title", "company", "location", "description" },
  "resume": { "version", "pdf_base64", "filename" },
  "profile": {
    "name", "email", "phone", "location", "linkedin_url", "github_url",
    "portfolio_url", "work_authorization", "years_experience", "skills"
  },
  "answers": { /* known answers; unknowns left absent → agent will pause */ },
  "callback": { "supabase_job_id": "..." }
}
```

---

## 5. Tracker UI

`ApplicationsPage` gains a right-side **Execution** panel per selected application:

- **Agent status badge** (queued / running / awaiting human / submitted / failed / cancelled / agent offline)
- **Current step** + **last update** + **run duration**
- **Timeline** rendered from `application_job_events` (Browser Started → Job Loaded → Resume Uploaded → Form Filled → Submitted)
- **Errors block** (message, step, screenshot link if available)
- **Retry** button (calls `retryApplicationJob`, dispatches again if agent online)
- **Cancel** button (only when running/awaiting_human)
- **Answer question** form when `awaiting_human` — posts to `/resume/:id` with `{ field: value }`, also patches `pending_question` to null

Realtime: `supabase.channel('application_jobs').on('postgres_changes', …)` filtered by `user_id` keeps the panel live without polling Supabase.

`ActivityFeed` reads `application_job_events` (newest 20) joined to the application for the title/company line.

Existing in-memory store keeps working; new data is added through `useApplicationsSync`.

No `setTimeout`-driven fake transitions remain — confirmed by removing the `setApplied(true)` celebratory branch's reliance on local state and binding the button label to live `application_jobs.status`.

---

## 6. Local agent changes (Imperium V1 reuse, Playwright migration)

Stays a separate Python service under `IMPERIUM/local_agent/` — do NOT rebuild.

**API surface** (additions to existing `agent_server.py`):
- `POST /cancel/{id}` — set run status, signal worker thread to stop.
- `POST /resume/{id}` — accept `{ answers: {...} }`, clear `pending_question`, resume workflow.
- `/runs/:id` and `/events/:id` already exist (rename `/status` → `/runs` alias, keep both).
- `/apply` accepts the richer payload above; persists `pdf_base64` to local `storage/resumes/{run_id}.pdf` and passes the path to the executor.

**Browser engine migration: Selenium → Playwright**

Phased, behind a flag so existing Selenium path still works:

1. Add `playwright==1.48.*` + `playwright install chromium` to `requirements.txt`; keep selenium pinned during transition.
2. New `automation/playwright_driver.py` mirroring `selenium_driver.py` (launch, navigate, fill, upload, screenshot).
3. Engine selector: env `BROWSER_ENGINE=playwright|selenium` (default `playwright` once ported).
4. Port `resume_uploader.py`, `form_parser.py`, `workflow_executor.py` to use the driver abstraction (`Driver` protocol — `goto`, `fill`, `click`, `query`, `upload`, `screenshot`).
5. Per-portal adapters: `portals/linkedin_easy_apply.py`, `naukri.py`, `foundit.py`, `greenhouse.py`, `lever.py`, `ashby.py`, `ycombinator.py`, `workday.py`. Each implements `apply(driver, payload)` and yields steps via `models.emit`. Greenhouse/Lever/Ashby/YC share a lot — base class `GenericForm`.
6. `agents/automation_agent.run_job` picks the adapter from `payload.job.source`, falls back to `GenericForm` if URL matches a known pattern.
7. Human-in-loop: when a required field has no answer in payload, adapter calls `models.pause_for_human(run_id, question)` → status `awaiting_human`, `pending_question` populated, worker waits on a `threading.Event` that `/resume/:id` sets.
8. Failure capture: every exception in adapter wraps as `models.fail(run_id, step, exc, screenshot=driver.screenshot())`. Screenshot saved to `storage/screenshots/{run_id}/{step}.png`, returned as agent-served `GET /artifacts/{run_id}/{file}` (CORS-enabled) so the tracker can show it.

State file already persists across restarts (`storage/application_history.json`) — extend to include `events`, `pending_question`, `error` so a browser restart picks up where it left off.

---

## 7. State machine

```
queued ──► dispatching ──► running ──► submitted
                              │
                              ├──► awaiting_human ──► running (after /resume)
                              ├──► failed (terminal, retry creates new job)
                              └──► cancelled
queued ──► agent_offline (terminal; retry re-checks /health)
```

Persisted on every transition (both Supabase and agent state file).

---

## 8. Verification

1. Migration applied; `application_jobs` + `application_job_events` visible with RLS.
2. Agent offline → click Apply → tracker shows row with `agent_offline`, retry button works.
3. Agent online (local `python -m IMPERIUM.local_agent.main`) → Apply on a Greenhouse test URL → timeline shows Browser Started → Job Loaded → Resume Uploaded → Submitted; final status `submitted`.
4. Force adapter to skip a required field → status `awaiting_human`, question rendered, answering resumes run.
5. Cancel mid-run → browser closes, status `cancelled`.
6. Kill agent mid-run, restart → tracker recovers state from `application_job_events` + agent's `/runs/:id` on reconnect.
7. Retry on a failed job creates new `application_jobs` row, same `application_id`.

---

## 9. Files

**Created**
- `supabase/migrations/<ts>_application_jobs.sql`
- `src/backend/applications/ApplicationJobs.functions.ts`
- `src/backend/automation/LocalAgentClient.ts` (replaces `SeleniumBrowserBridge.ts`)
- `src/frontend/applications/hooks/useAgentJobMonitor.ts`
- `src/frontend/applications/components/ExecutionPanel.tsx`
- `src/frontend/applications/components/PendingQuestionForm.tsx`
- `IMPERIUM/local_agent/automation/playwright_driver.py`
- `IMPERIUM/local_agent/automation/driver.py` (protocol)
- `IMPERIUM/local_agent/portals/{linkedin,naukri,foundit,greenhouse,lever,ashby,ycombinator,workday,generic_form}.py`

**Modified**
- `src/frontend/resume/panes/ActionBar.tsx` — new `handleApply`
- `src/frontend/applications/ApplicationsPage.tsx` — mount ExecutionPanel
- `src/frontend/applications/components/DetailsDrawer.tsx` — show error/timeline
- `src/frontend/applications/components/ActivityFeed.tsx` — join job events
- `src/frontend/applications/state/useApplicationsStore.ts` — expose jobs
- `src/frontend/applications/data/useApplicationsData.ts` — query jobs/events + realtime
- `src/frontend/applications/schema.ts` — add job & event types, new statuses
- `IMPERIUM/local_agent/api/agent_server.py` — `/cancel`, `/resume`, `/artifacts`, richer `/apply`
- `IMPERIUM/local_agent/agents/automation_agent.py` — portal dispatch, HITL
- `IMPERIUM/local_agent/shared/models.py` — `pending_question`, `error`, `pause/resume`
- `IMPERIUM/local_agent/automation/workflow_executor.py`, `resume_uploader.py`, `form_parser.py` — driver abstraction
- `IMPERIUM/local_agent/requirements.txt` — add playwright
- `IMPERIUM/local_agent/README.md` — `playwright install chromium`, `BROWSER_ENGINE` flag

**Deleted (after Playwright is stable)**
- `IMPERIUM/local_agent/automation/selenium_driver.py` and selenium deps

---

## 10. Out of scope (explicit)

- No Browserbase / Browserless / cloud browser.
- No backend Playwright on Cloudflare Workers.
- No auto-answering unknown questions.
- No fake/simulated tracker transitions.

---

Approve and I'll start with the migration + `ApplicationJobs.functions.ts` + the Apply rewrite, then move to the agent-side Playwright port portal by portal.
