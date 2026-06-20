# Sections 4–12 — Full UI Rebuild

Goal: Build each section's UI from scratch in pure code (HTML/CSS/GSAP). Stop using the supplied reference JPGs as background `<img>` fills. References stay as visual targets only. All sections fit between the fixed top frame and bottom frame (existing). Hero is exempt.

## Global

- New helper `<SectionShell>` wrapping each section in a `100vh` viewport that respects top/bottom fixed frames (`padding-top: var(--lv2-frame-h)`, `padding-bottom: var(--lv2-foot-h)`), with consistent `inner` max-width.
- New `<ScrollProgressRail>` fixed on the right edge: vertical labeled bars for sections 4–12, active bar fills/glows based on `IntersectionObserver` — mirrors GlyphsLabs section indicator.
- Glass utility class `.lv2-glass` — `backdrop-filter: blur(22px) saturate(140%)`, `background: linear-gradient(...rgba)`, animated border-glow that follows cursor via CSS vars `--mx/--my` (no extra JS lib).
- Remove all `<img src=reference.webp>` background usage. Delete or stop importing the section reference WebP asset JSONs (keep `profile-character` and `hero_character` only).

## Section 4 — Future Agents (4 glass cards, image "comes out" of card)

- Layout: 4-card horizontal row, dark slate gradient bg, soft orange accent grid behind.
- Each card: glassmorphism panel with a character SVG/illustration absolutely positioned so head/shoulders rise ABOVE the card's top edge (`top: -40px; transform-origin: bottom`).
- Cards: Research, Coding, Job, Workflow. Number "01–04", title, 1-line description, glow ring on hover.
- Hover: cursor-driven radial glow on glass border + lift `translateY(-8px)` + character `scale(1.04)` + parallax tilt.
- Characters: 4 small pose illustrations generated via imagegen (transparent PNG, ~600x900) — minimalist line-art figures matching IMPERIUM tone.

## Section 5 — Transition (pure motion, no text)

- 80vh dark band. No headline.
- Background: scroll-driven horizontal light sweep + drifting particle field (Canvas or 30 CSS dots with GSAP).
- Top edge: thin morphing gradient line that stretches and contracts with scroll.
- Triggers next section's horizontal track.

## Sections 6 → 10 — Horizontal scrolling track (single pinned wrapper)

New component `HorizontalNarrative.tsx` pins one 100vh container and translates a horizontal track using GSAP ScrollTrigger pin + `xPercent` over `~5 * window.innerWidth` scroll distance. Inside the track, 5 panels:

```
[6 STORY] [7 JOURNEY] [8 PROFILE INTEL] [9 WORKFLOW] [10 EXECUTE]
```

A fixed mini-bar (top of horizontal area) shows 5 numbered chips; active chip highlighted (driven by track progress 0–1). Each panel is full viewport width/height between frames.

### 6 — Storytelling

- Full-bleed type-driven panel: oversized layered word "STORY" with parallax color split, animated underline; supporting paragraph fading in.
- No reference image dropped in. Built with typography + gradient bg.

### 7 — Journey (hero-style rider)

- Mirrors hero composition: large background gradient (red→black), central rider illustration (imagegen, transparent PNG), foreground glass cards with "Profile Analyze / Orchestrated / Execution" stacking at bottom.
- Hover on rider: cursor parallax + spec glow. Cards: glass with cursor-follow glow.

### 8 — Profile Intelligence (built from scratch, not reference)

- Two-column dashboard look: left = animated radar/score meter (SVG circle + GSAP), right = metric tiles (Strength 9.4, Readiness 8.8, ATS 92, Match 88) counting up.
- Center: optional avatar from auth session (keep existing `useSession` swap logic) inside a circular glass ring with rotating data ticks.
- "COMMAND UP" CTA pill (existing behaviour).

### 9 — Workflow Agent

- Ink yin-yang aesthetic built with CSS: split black/white diagonal, 3 glass cards (Job Discovery, Resume Studio, Application Tracker) arranged in arc. Cursor-glow on each. Connector SVG lines pulsing between them.

### 10 — Execute

- Red/black panel with 4 step indicators (SEARCH→MATCH→OPTIMIZE→APPLY) as glass chips on a horizontal rail with animated progress fill. Central glass "console" panel with typed pseudo-log lines. "EXECUTE TASK" CTA routes to `/jobs` or `/auth`.

## Section 11 — Creator

- Vertical-scroll resumes here. Built from scratch: left column = name "DINESH" oversized red display type with stroke variant; right column = bio paragraphs + 4 numbered glass cards (Journey/Build/Vision/Future) in a 2×2 grid with cursor-glow.

## Section 12 — Enter Imperium

- Final cinematic CTA built from typography only.
- Stacked headline "THE RISE OF / IMPERIUM" with shimmer.
- 3 glass action buttons in a row: EXPLORE SYSTEM (scrolls to 3), VIEW AGENTS (scrolls to 4), ENTER IMPERIUM (routes /dashboard or /auth).
- 2 trailer glass cards beneath linking to /jobs, /dashboard.

## Files

Created

- `components/SectionShell.tsx`
- `components/ScrollProgressRail.tsx`
- `components/GlassCard.tsx` (cursor-glow)
- `sections/HorizontalNarrative.tsx` (wraps 6–10)
- Replace each `sections/*.tsx` body (4,5,6,7,8,9,10,11,12) with new code.

Edited

- `LandingV2Page.tsx`: replace 6–10 with `<HorizontalNarrative />`; add `<ScrollProgressRail />`.
- `landing-v2.css`: append complete style blocks for new components and sections; remove now-unused poster rules.

Asset cleanup

- Stop importing `section-06/07/09/10/11/12` reference WebPs (files remain on disk, unused).
- Generate small transparent character PNGs for sections 4 and 7 via imagegen.

## Verification

After implementation: Playwright over `localhost:8080` to scroll through and screenshot sections 4 → 12, confirming:

- No raw reference image fills.
- Horizontal scroll for 6–10 pins and advances chips.
- Glass cards visibly glow under cursor.
- All CTAs route correctly.

## Out of scope

- Hero, Manifesto, IndexStrip, TopFrame, BottomFrame, Cursor untouched.
- No backend / data changes. What I'm saying complete ui build not only changes . build complete ui properly with interactive elements.all ui elements clearly work properly not reference image directly place .