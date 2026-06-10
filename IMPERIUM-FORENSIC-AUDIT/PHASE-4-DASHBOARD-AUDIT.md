# PHASE 4 — DASHBOARD AUDIT

## Executive Summary
**STATUS:** ❌ DASHBOARD IS 100% THEATER - NOT CONNECTED TO REAL DATA

---

## Component Architecture

**Main File:** `src/frontend/dashboard/DashboardPage.tsx`
**Data Hook:** `src/frontend/dashboard/dashboard.data.ts`
**Sub-components:**
- `TopBar.tsx` - Gems/Coins display
- `LeftPanel.tsx` - Identity, Rank, Attributes, Powers
- `CenterPanel.tsx` - Career Overview, Recent Activity, CTA Button
- `RightPanel.tsx` - Profile Card, Core Module, Inventory, Crest

---

## Data Flow Analysis

### Current Implementation:
```
useDashboardData()
  ↓
Returns BASE constant (hardcoded)
  ↓
Overlays session.fullName + session.email ONLY
  ↓
All other data remains static
```

### What User Sees vs Reality:

| Component | Display | Data Source | Real? |
|-----------|---------|-------------|-------|
| **Profile Image** | Generic icon | None | ❌ No upload |
| **Gems** | 297 | Hardcoded | ❌ Fake |
| **Coins** | 1,258 | Hardcoded | ❌ Fake |
| **Jobs Found** | 128 (+12) | Hardcoded | ❌ Not counted |
| **Applications** | 23 (+5) | Hardcoded | ❌ Not counted |
| **Interviews** | 7 (+2) | Hardcoded | ❌ Not counted |
| **Offers** | 3 (+1) | Hardcoded | ❌ Not counted |
| **Recent Activity** | 4 items | Hardcoded | ❌ Fake events |
| **ATS Score Attribute** | 85 | Hardcoded | ❌ Never computed |
| **Capacity** | 78 | Hardcoded | ❌ Meaningless |
| **Speed** | 72 | Hardcoded | ❌ Meaningless |
| **Accuracy** | 88 | Hardcoded | ❌ Meaningless |
| **Powers (3)** | Levels 12, 9, 7 | Hardcoded | ❌ Static |
| **Rank** | 0 | Hardcoded | ❌ Never changes |
| **XP** | 0 / 1000 | Hardcoded | ❌ Never increases |
| **Stars** | 0 | Hardcoded | ❌ Never awarded |

---

##  CRITICAL ISSUE #1: Career Overview

**File:** `src/frontend/dashboard/components/CenterPanel.tsx:12-16`

```typescript
<Stat label="Jobs Found"   value={o.jobsFound.value}   delta={o.jobsFound.delta} />
<Stat label="Applications" value={o.applications.value} delta={o.applications.delta} />
<Stat label="Interviews"   value={o.interviews.value}   delta={o.interviews.delta} />
<Stat label="Offers"       value={o.offers.value}       delta={o.offers.delta} />
```

**Data Source:** `dashboard.data.ts:109-114`
```typescript
careerOverview: {
  jobsFound: { value: 128, delta: 12 },     // ❌ HARDCODED
  applications: { value: 23, delta: 5 },    // ❌ HARDCODED
  interviews: { value: 7, delta: 2 },       // ❌ HARDCODED
  offers: { value: 3, delta: 1 },           // ❌ HARDCODED
},
```

**What SHOULD Happen:**
```typescript
// Query Supabase
const jobs = await supabase.from('job_listings').select('id').eq('user_id', userId);
const applications = await supabase.from('applications').select('id').eq('user_id', userId);
const interviews = applications.filter(a => a.status === 'interview');
const offers = applications.filter(a => a.status === 'offer');

careerOverview: {
  jobsFound: { value: jobs.length, delta: jobsThisWeek },
  applications: { value: applications.length, delta: appsThisWeek },
  interviews: { value: interviews.length, delta: interviewsThisWeek },
  offers: { value: offers.length, delta: offersThisWeek },
}
```

**Impact:** User has NO IDEA how many jobs they've actually applied to

---

## ❌ CRITICAL ISSUE #2: Recent Activity

**File:** `src/frontend/dashboard/components/CenterPanel.tsx:21-30`

**Data Source:** `dashboard.data.ts:115-120`
```typescript
recentActivity: [
  { id: "a1", iconKey: "resume", label: "Resume generated for Senior AI Engineer at NovaTech", timeAgo: "2h ago" },  // ❌ FAKE
  { id: "a2", iconKey: "applied", label: "Applied for Data Scientist at FutureNet", timeAgo: "1d ago" },             // ❌ FAKE
  { id: "a3", iconKey: "interview", label: "Interview scheduled with TechNova", timeAgo: "2d ago" },                 // ❌ FAKE
  { id: "a4", iconKey: "ats", label: "Profile optimized for ATS", timeAgo: "3d ago" },                               // ❌ FAKE
],
```

**Real Data Available:**
- Application events table exists (`application_events`)
- Resume version saves (useResumeStore)
- Profile updates (could track in Supabase)

**What SHOULD Happen:**
```typescript
// Fetch real timeline
const events = await supabase
  .from('application_events')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

recentActivity: events.map(e => ({
  id: e.id,
  iconKey: mapEventType(e.type),
  label: e.description,
  timeAgo: formatTimeAgo(e.created_at),
}))
```

**Impact:** User sees fake activity, real actions invisible

---

## ❌ CRITICAL ISSUE #3: Continue Your Journey Button

**File:** `src/frontend/dashboard/components/CenterPanel.tsx:37-39`

```typescript
<button className="dash-cta">
  Continue Your Journey <IconArrowRight width={18} height={18} />
</button>
```

**❌ NO onClick HANDLER**
**❌ NO NAVIGATION**
**❌ COMPLETELY DEAD**

**What SHOULD Happen:**
```typescript
<button className="dash-cta" onClick={() => navigate({ to: '/jobs' })}>
  Continue Your Journey <IconArrowRight />
</button>
```

Or smart routing based on user state:
```typescript
const nextStep = computeNextAction(data);
// If no profile → /profile
// If profile complete, no searches → /jobs
// If applications pending → /applications
// etc.
```

**Impact:** Primary CTA button does nothing

---

## ❌ ISSUE #4: Profile Photo

**File:** `src/frontend/dashboard/components/RightPanel.tsx:27`

```typescript
<div className="avatar"><IconUser width={28} height={28} /></div>
```

**❌ NO UPLOAD CAPABILITY**
**❌ NO EDIT BUTTON**
**❌ GENERIC ICON ONLY**

**Missing:**
- File upload modal
- Image cropping
- Supabase Storage integration
- Profile table `avatar_url` column

**Impact:** Users cannot personalize dashboard

---

## ❌ ISSUE #5: Diamond/Coin System

**File:** `src/frontend/dashboard/components/TopBar.tsx`

**Display:** Shows gems (297) and coins (1,258) with dropdowns

**Backend Integration:** NONE
**Purpose:** UNKNOWN
**Usage:** NOWHERE

**Coin/Gem References in Codebase:**
```bash
# Search results: Only in dashboard.data.ts
resources: { gems: 297, coins: 1258 }
```

**Decision Required:** REMOVE or IMPLEMENT
- If gamification planned → needs full system (earning, spending, rewards)
- If decorative → misleading, should remove

**Impact:** Confusing decorative elements

---

## ❌ ISSUE #6: Attributes (Strength/Energy/Velocity/Focus)

**File:** `src/frontend/dashboard/components/LeftPanel.tsx:28-31`

```typescript
<Attr icon={<IconStrength/>} label="Strength" sub="(ATS Score)" value={attributes.atsScore} />
<Attr icon={<IconEnergy/>}   label="Energy"   sub="(Capacity)"  value={attributes.capacity} />
<Attr icon={<IconVelocity/>} label="Velocity" sub="(Speed)"     value={attributes.speed} />
<Attr icon={<IconFocus/>}    label="Focus"    sub="(Accuracy)"  value={attributes.accuracy} />
```

**Values:** `{atsScore: 85, capacity: 78, speed: 72, accuracy: 88}` (hardcoded)

**ATS Score Says "ATS Score" But:**
- Not actual ATS score from resume
- Resume ATS engine computes real score
- Never synced to dashboard

**Other Attributes:**
- "Capacity", "Speed", "Accuracy" - meaningless metrics
- No definition of what they measure
- Never change based on usage

**What SHOULD Happen (if keeping):**
```typescript
// Real metrics
attributes: {
  atsScore: await getLatestResumeAtsScore(userId),      // From Resume Studio
  applicationRate: calculateWeeklyApplications(userId),  // Applications per week
  responseRate: calculateResponseRate(userId),           // Interview invites / applications
  successRate: calculateOfferRate(userId),               // Offers / interviews
}
```

**Impact:** Fake progress indicators

---

## ❌ ISSUE #7: Powers System

**File:** `src/frontend/dashboard/components/LeftPanel.tsx:34-48`

**Powers Displayed:**
1. "Resume Mastery" - Level 12
2. "Interview Power" - Level 9
3. "Application Speed" - Level 7

**Data:** Hardcoded in `dashboard.data.ts:99-108`
**Leveling Logic:** NONE
**Earning Mechanism:** NONE

**What SHOULD Happen:**
```typescript
powers: [
  {
    id: "resume-mastery",
    name: "Resume Mastery",
    level: Math.floor(resumeVersionsCreated / 3),  // 1 level per 3 resumes
    xp: resumeVersionsCreated % 3,
    xpMax: 3,
  },
  // etc.
]
```

**Impact:** Static decorative elements

---

## ❌ ISSUE #8: Rank & XP System

**File:** `src/frontend/dashboard/components/LeftPanel.tsx:11-21`

```typescript
<div className="label">Rank <span className="rank-num">#{identity.rank}</span></div>
<div className="xpbar"><div style={{ width: `${xpPct}%` }} /></div>
<div className="xp-text">{identity.xp} / {identity.xpMax} XP</div>
```

**Values:** `rank: 0, xp: 0, xpMax: 1000` (hardcoded)

**XP Bar:** Always empty (0 / 1000)
**Rank:** Always #0
**Progression:** Impossible

**What SHOULD Happen:**
```typescript
// XP from actions
const xp = 
  (profileCompleteness * 100) +
  (applicationsSubmitted * 10) +
  (interviewsAttended * 50) +
  (offersReceived * 200);

const level = Math.floor(xp / 1000) + 1;
const rank = await getUserRank(userId, xp);  // Global leaderboard

identity: {
  level,
  rank,
  xp: xp % 1000,
  xpMax: 1000,
}
```

**Impact:** No sense of progression

---

## ❌ ISSUE #9: Inventory Modules

**File:** `src/frontend/dashboard/components/RightPanel.tsx:68-90`

**Modules Shown:**
- Job Agent (Level 5, Legendary)
- Resume Studio (Level 4, Epic)
- Application Tracker (Level 4, Epic)
- Autopilot (Level 3, Rare)

**Data:** Hardcoded in `dashboard.data.ts:128-133`
**Levels:** Static
**Rarity:** Decorative
**Locked State:** Has `locked?` boolean but never used

**Routes Work:** Links navigate correctly ✅

**What SHOULD Happen:**
```typescript
// Usage-based levels
inventory: [
  {
    id: "job-agent",
    level: Math.floor(jobSearchesPerformed / 10),
    locked: false,
  },
  {
    id: "resume-studio",
    level: Math.floor(resumesGenerated / 5),
    locked: resumesGenerated === 0,  // Lock until first use
  },
  // etc.
]
```

**Impact:** Fake progression UI

---

## ❌ ISSUE #10: Profile Tab System

**File:** `src/frontend/dashboard/components/RightPanel.tsx:32-36`

```typescript
<div className="tabs">
  <button>Profile</button>
  <button data-active="true">Arsenal</button>
  <button>Settings</button>
  <button className="view3d">3D View ▾</button>
</div>
```

**❌ NO onClick HANDLERS**
**❌ NO TAB SWITCHING LOGIC**
**❌ COMPLETELY NON-FUNCTIONAL**

**Impact:** Fake UI controls

---

## UI Functionality Audit

### ✅ WORKING:
1. **Navigation Links** - Inventory module links work
2. **Layout** - 3-column responsive grid renders
3. **Icons** - All SVG icons display
4. **Styling** - CSS/theming working

### ❌ BROKEN:
1. **Continue Journey Button** - No handler
2. **Profile Photo** - No upload
3. **Tab Buttons** - No switching
4. **Dropdown Carets** - Gems/Coins dropdowns don't open
5. **3D View Button** - No modal/3D viewer

### 🎭 FAKE DATA:
1. **Career Overview** - All stats hardcoded
2. **Recent Activity** - Fake events
3. **Attributes** - Not computed
4. **Powers** - Static levels
5. **Rank/XP** - Never changes
6. **Gems/Coins** - Meaningless numbers

---

## Root Cause

Dashboard was designed as a **visual mockup** and never connected to real data sources.

**Evidence:**
- Data hook returns constant `BASE` object
- Only 2 fields overlaid from session (name, email)
- No Supabase queries
- No TanStack Query integration
- No state management

---

## Fix Complexity

### Quick Wins (1-2 days):
1. Connect Career Overview to Supabase counts
2. Connect Recent Activity to application_events table
3. Fix Continue Journey button navigation
4. Remove fake Gems/Coins or hide them

### Medium Effort (3-5 days):
1. Implement real ATS Score from resume
2. Add profile photo upload
3. Compute real "Strength/Speed/Focus" metrics
4. Make tabs functional

### Long Term (1-2 weeks):
1. Full XP/leveling system with backend
2. Global leaderboard for rank
3. Power progression tied to usage
4. Gamification rewards

---

## Production Impact

**Current State:** Dashboard misleads users into thinking Imperium tracks their progress
**User Confusion:** High - shows fake data that never updates
**Trust Damage:** Severe - users realize it's fake after a few visits
**Recommendation:** Either connect to real data OR simplify to basic stats only
