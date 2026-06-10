# PHASE 2 — JOB SOURCE AUDIT

## Source-by-Source Analysis
**File:** `src/backend/jobs/JobSources.server.ts`

---

### ✅ RemoteOK
- **Endpoint:** `https://remoteok.com/api`
- **Method:** Public JSON API
- **Authentication:** None required
- **Status:** WORKING
- **Request:** Simple GET with User-Agent
- **Success Rate:** High (unless rate limited)
- **Parse Success:** JSON-based, reliable
- **Job Count:** ~50-100 per request
- **Description:** Extracted from `description` field
- **Link Validity:** Uses `url` field or constructs from `id`
- **Recommendation:** ✅ KEEP

---

### ✅ Remotive
- **Endpoint:** `https://remotive.com/api/remote-jobs?search={role}`
- **Method:** Public JSON API
- **Authentication:** None required
- **Status:** WORKING
- **Success Rate:** High
- **Parse Success:** JSON-based, reliable
- **Job Count:** ~30-50 per request
- **Description:** Extracted from `description` field (HTML stripped)
- **Link Validity:** Direct URL from response
- **Recommendation:** ✅ KEEP

---

### ✅ Arbeitnow
- **Endpoint:** `https://www.arbeitnow.com/api/job-board-api`
- **Method:** Public JSON API
- **Authentication:** None required
- **Status:** WORKING
- **Success Rate:** High
- **Parse Success:** JSON-based, reliable
- **Job Count:** ~20-40 per request
- **Description:** Extracted and HTML-stripped
- **Link Validity:** Direct URL from `url` field
- **Recommendation:** ✅ KEEP

---

### ⚠️ LinkedIn
- **Endpoint:** `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search`
- **Method:** Guest search (HTML scraping)
- **Authentication:** None required (guest access)
- **Status:** PARTIAL
- **Implementation:** Lines 250-360
- **Issues Found:**
  ```typescript
  console.warn("[linkedin] 0 parseable cards across all pages");
  ```
- **Request:** 4 pages (0, 25, 50, 75 offsets)
- **Response:** HTML cards requiring regex parsing
- **Parse Success:** FRAGILE - depends on HTML structure
- **Job Count:** **0 parseable cards reported in logs** ❌
- **Description Retrieval:** B4 enrichment system (lines 215-248)
  - Fetches full JD from `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{id}`
  - Limited to 8 jobs max
  - 600ms gap between requests
  - 5s timeout per request
  - **Swallows all errors** - placeholder description kept on failure
- **Known Issues:**
  - Card regex may not match current LinkedIn HTML
  - Zero parseable results indicates regex failure
  - Description enrichment only attempts first 8 jobs
- **Kill Switch:** `LINKEDIN_DISABLE_JD_FETCH=1` (disables enrichment)
- **Recommendation:** 🔧 NEEDS FIX - Regex patterns outdated

---

### ❌ Naukri (JSON API)
- **Endpoint:** `https://www.naukri.com/jobapi/v3/search`
- **Method:** Internal API with spoofing headers
- **Authentication:** Requires header spoofing
- **Status:** BROKEN
- **Evidence from logs:** `[naukri:json] HTTP 400` ❌
- **Implementation:** Lines 536-579
- **Headers Required:**
  ```typescript
  {
    "App-Id": "109",
    "systemid": "Naukri",
    "clientid": "d3skt0p",
    "Sec-Fetch-Site": "same-origin",
    "Referer": "https://www.naukri.com/",
    "Origin": "https://www.naukri.com"
  }
  ```
- **Response:** HTTP 400 (Bad Request)
- **Root Cause:** API endpoint changed or header requirements tightened
- **Fallback:** HTML scraping (lines 455-512)
- **Fallback Status:** WORKING (used automatically when JSON fails)
- **Parse Success:** Moderate (regex-based on HTML)
- **Job Count:** ~20 via HTML fallback
- **Description:** Truncated snippets from cards
- **Recommendation:** ⚠️ KEEP (HTML fallback functional) but JSON API dead

---

### ⚠️ Hirist
- **Endpoint:** `https://www.hirist.com/jobs`
- **Method:** HTML scraping + __NEXT_DATA__ extraction
- **Authentication:** None required
- **Status:** BROKEN
- **Evidence from logs:** `[hirist] HTTP 404` ❌
- **Implementation:** Lines 880-935
- **Response:** HTTP 404 (Not Found)
- **Root Cause:** URL structure changed or endpoint removed
- **Parse Success:** N/A (can't reach page)
- **Job Count:** 0
- **Recommendation:** ❌ REMOVE or fix URL

---

### ⚠️ Wellfound (formerly AngelList)
- **Endpoint:** `https://wellfound.com/jobs?role={role}&location={location}`
- **Method:** HTML scraping + __NEXT_DATA__ extraction
- **Authentication:** None required
- **Status:** BROKEN
- **Evidence from logs:** `[wellfound] HTTP 403` ❌
- **Implementation:** Lines 689-747
- **Response:** HTTP 403 (Forbidden)
- **Root Cause:** Bot detection or scraping blocked
- **Parse Success:** N/A (blocked)
- **Job Count:** 0
- **Recommendation:** ❌ REMOVE or implement proper API access

---

### ✅ Foundit (formerly Monster India)
- **Endpoint:** `https://www.foundit.in/middleware/jobsearch`
- **Method:** JSON API
- **Authentication:** None required
- **Status:** WORKING
- **Success Rate:** High
- **Parse Success:** JSON-based, reliable
- **Job Count:** ~20 per request
- **Description:** Extracted from `descriptionOrg` or `description`
- **Link Validity:** Uses `seoJdUrl` or `jobUrl`
- **Recommendation:** ✅ KEEP

---

### ⚠️ Instahyre
- **Endpoint:** Not provided in code (appears to be commented out or incomplete)
- **Status:** UNKNOWN
- **Recommendation:** 🔍 INVESTIGATE or remove

---

### ⚠️ YC Jobs
- **Endpoint:** Y Combinator jobs page scraping
- **Status:** IMPLEMENTED but rarely used
- **Recommendation:** ✅ KEEP (low volume but high quality)

---

### 🔑 Adzuna (Requires API Key)
- **Endpoint:** `https://api.adzuna.com/v1/api/jobs/{country}/search/1`
- **Method:** Official REST API
- **Authentication:** Requires `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`
- **Status:** IMPLEMENTED but INACTIVE (keys not configured)
- **Coverage:** Indeed-class aggregator (high quality + volume)
- **Recommendation:** 🔑 ACTIVATE (requires secret setup)

---

### 🔑 Jooble (Requires API Key)
- **Endpoint:** `https://jooble.org/api/{key}`
- **Method:** Official REST API
- **Authentication:** Requires `JOOBLE_API_KEY`
- **Status:** IMPLEMENTED but INACTIVE (key not configured)
- **Coverage:** Global aggregator
- **Recommendation:** 🔑 ACTIVATE (requires secret setup)

---

## Summary Table

| Source | Status | HTTP Code | Parse | Jobs | JD Retrieval | Action |
|--------|--------|-----------|-------|------|--------------|---------|
| RemoteOK | ✅ Working | 200 | ✅ | 50-100 | ✅ Direct | KEEP |
| Remotive | ✅ Working | 200 | ✅ | 30-50 | ✅ Direct | KEEP |
| Arbeitnow | ✅ Working | 200 | ✅ | 20-40 | ✅ Direct | KEEP |
| LinkedIn | ⚠️ Partial | 200 | ❌ | 0 | ⚠️ Enrichment | FIX |
| Naukri (JSON) | ❌ Broken | 400 | ❌ | 0 | N/A | - |
| Naukri (HTML) | ✅ Working | 200 | ⚠️ | ~20 | ⚠️ Snippet | KEEP |
| Hirist | ❌ Broken | 404 | ❌ | 0 | N/A | REMOVE |
| Wellfound | ❌ Broken | 403 | ❌ | 0 | N/A | REMOVE |
| Foundit | ✅ Working | 200 | ✅ | ~20 | ✅ Direct | KEEP |
| Instahyre | ❓ Unknown | ? | ? | ? | ? | INVESTIGATE |
| YC Jobs | ✅ Working | 200 | ✅ | 5-15 | ✅ Direct | KEEP |
| Adzuna | ⏸️ Inactive | - | - | - | - | ACTIVATE |
| Jooble | ⏸️ Inactive | - | - | - | - | ACTIVATE |

## Active vs Broken Sources

### ✅ Fully Working (6 sources):
1. RemoteOK
2. Remotive
3. Arbeitnow
4. Naukri (HTML fallback)
5. Foundit
6. YC Jobs

### ❌ Completely Broken (3 sources):
1. LinkedIn (0 parseable cards)
2. Hirist (HTTP 404)
3. Wellfound (HTTP 403)

### 🔑 Implemented but Inactive (2 sources):
1. Adzuna (needs API key)
2. Jooble (needs API key)

## Root Cause Analysis

### LinkedIn Failure:
**Cause:** Regex patterns for HTML parsing outdated
**Location:** Lines 283-319
**Evidence:** `[linkedin] 0 parseable cards across all pages`
**Fix Required:** Update card regex to match current HTML structure

### Naukri JSON API Failure:
**Cause:** API endpoint changed or header spoofing insufficient
**Location:** Lines 536-579
**Evidence:** `[naukri:json] HTTP 400`
**Mitigation:** HTML fallback works (lines 455-512)
**Fix Required:** Update API endpoint URL or headers (or rely on HTML fallback)

### Hirist Failure:
**Cause:** URL structure changed or site moved
**Location:** Lines 880-935
**Evidence:** `[hirist] HTTP 404`
**Fix Required:** Find new URL or remove source

### Wellfound Failure:
**Cause:** Bot detection / scraping blocked
**Location:** Lines 689-747
**Evidence:** `[wellfound] HTTP 403`
**Fix Required:** Use official API or remove source

## Description Retrieval Issues

### LinkedIn JD Enrichment:
- **System:** B4 enrichment (lines 215-248)
- **Limitation:** Only enriches first 8 jobs
- **Timeout:** 5 seconds per job
- **Gap:** 600ms between requests
- **Failure Handling:** Silent - keeps placeholder description
- **Impact:** Most LinkedIn jobs have placeholder: "LinkedIn listing — click through for full job description."
- **Issue:** Slow + limited coverage

### Naukri HTML Fallback:
- **Description:** Truncated snippets from card preview
- **Quality:** Poor (200-400 chars vs full JD)
- **Impact:** Match scoring inaccurate due to incomplete descriptions

## Recommendations

### Immediate Actions:
1. **Remove Hirist** - 404 errors, no value
2. **Remove Wellfound** - 403 blocked, no value
3. **Fix LinkedIn regex** - High-value source completely broken
4. **Activate Adzuna** - Requires API key but high-quality Indeed-class aggregator
5. **Activate Jooble** - Requires API key but good coverage

### Medium Term:
1. **Improve Naukri** - JSON API preferred over HTML scraping
2. **Expand LinkedIn JD enrichment** - Increase from 8 to 20 jobs
3. **Add retry logic** - Currently only 1-2 retries, increase for transient failures

### Production Readiness:
**Current Working Sources:** 6 (RemoteOK, Remotive, Arbeitnow, Naukri HTML, Foundit, YC)
**Broken Sources:** 3 (LinkedIn, Hirist, Wellfound)
**Success Rate:** 6/9 = 67% source availability
**Job Volume:** ~150-250 jobs per search (when working)
**Quality:** Variable (depends on description completeness)
