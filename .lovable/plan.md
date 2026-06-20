# Section 1 Hero — Full Rebuild (poster-accurate)

Scope: only `src/frontend/landing-v2/sections/HeroSection.tsx`, the `.lv2h-*` block in `src/frontend/landing-v2/landing-v2.css`, and the two hero asset pointers. Sections 2–12, top frame, bottom frame, transitions, horizontal scroll, and routing are not touched.

## 1. Replace hero assets

Overwrite the existing `.asset.json` pointers via the `lovable-assets` CLI from the user-uploads mount:

- `/mnt/user-uploads/file_0000000029a87209aa51bcf66f42ed12.png` → `src/frontend/landing-v2/assets/hero_bg.png.asset.json` (white / red band / white poster background with smoke corners)
- `/mnt/user-uploads/file_000000004018720993a3238ea9e0cdfa.png` → `src/frontend/landing-v2/assets/hero_character.png.asset.json` (transparent suit character, no black bg)

Same filenames, so all imports keep working.

## 2. Hero DOM — exactly 4 layers + KING label

```
<section class="lv2h-hero">
  <img class="lv2h-bg" src={heroBg.url} />           // Layer 1
  <span class="lv2h-king">KING</span>                // poster label (in red band, upper-left)
  <h1 class="lv2h-word lv2h-back">IMPERIUM</h1>      // Layer 2 (solid white)
  <img class="lv2h-character" src={heroChar.url} />  // Layer 3 (transparent PNG)
  <h1 class="lv2h-word lv2h-front">IMPERIUM</h1>     // Layer 4 (outline)
  <div class="lv2h-sweep" />                         // scan sweep
</section>
```

No cards, panels, gradients, grain, dark overlays, HUD, or extra typography. Both `lv2h-word` elements share identical font/size/position/transform-origin so the outline sits pixel-perfect over the solid layer.

## 3. Static composition rules (must match poster before any animation)

- `.lv2h-hero`: `position: relative; height: 100vh; overflow: hidden; background: #fff;` — break out of the top-frame padding as the current implementation does.
- `.lv2h-bg`: `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center;` — fills entire hero, no tint/overlay.
- `.lv2h-word` (both): Anton, `font-size: clamp(220px, 28vw, 520px); line-height: 0.85; letter-spacing: -0.01em; white-space: nowrap; width: max-content; position: absolute; left: 50%; top: 58%; transform: translate(-50%, -50%); transform-origin: 50% 50%;`
- `.lv2h-back`: `color: #fff; z-index: 2;`
- `.lv2h-character`: `position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); height: 105vh; width: auto; z-index: 3; pointer-events: none;` — head reaches into upper white area, arms/body overlap typography naturally because character sits between back text (z2) and outline text (z4).
- `.lv2h-front`: `color: transparent; -webkit-text-stroke: 2.5px #fff; z-index: 4;`
- `.lv2h-king`: Anton, `color: #fff; font-size: clamp(36px, 4.5vw, 84px); position: absolute; left: 7vw; top: 42%; z-index: 4;` — positioned inside the red band, above-left of IMPERIUM as in the reference.
- Mobile (`max-width: 900px`): word `clamp(96px, 22vw, 220px)`, character `height: 88vh`, KING smaller.

Checkpoint: take a Playwright screenshot at 1280×800. Only if it visibly matches the reference poster do effects in step 4 get wired up.

## 4. Effects (added only after static passes)

Inside `useGSAP` in HeroSection, cleaned up on unmount:

- **Per-letter cursor lift**: split both words into `<span class="lv2h-char">`. On `pointermove`, compute distance from cursor to each char center; `y: -3 * falloff`, `opacity: 1 - 0.15*falloff` via `gsap.quickTo`, radius 220px. No scale/rotate/skew.
- **Character parallax**: `x: ±8px`, `y: ±4px` via quickTo based on normalized cursor offset.
- **Scan sweep**: thin white-gradient bar across IMPERIUM, `mix-blend-mode: screen`, low opacity, GSAP repeat every 4.5s, `xPercent -120 → 120` over 1.4s.
- **Glitch**: every 7s, 3 × 50ms `x: ±2px` steps applied only to `.lv2h-front`. No RGB split, no flashing.
- **Scroll**: single ScrollTrigger scrub, no pin. Typography `yPercent: -3`, character `yPercent: -2`, opacity `1 → 0.85` between `top top` and `bottom top`.

## 5. CSS cleanup

In `landing-v2.css`, replace the entire current `.lv2h-*` block (hero, bg, grain, stack, word, back, character, front, sweep, mobile) with the rules above. Remove `.lv2h-grain` and `.lv2h-stack` (no longer used). Inject Anton via `<link>` in HeroSection (existing pattern).

## 6. Out of scope

- No edits to `LandingV2Page.tsx`, `TopFrame.tsx`, `BottomFrame.tsx`, transition, sections 2–12, hooks, or routing.
- No new dependencies.

## Verification

1. Playwright screenshot of `/` at 1280×800 → confirm composition matches the reference (background fills hero, red band centered, IMPERIUM near full width, character dominant with head above type, outline aligned, KING inside red band upper-left, no black rectangle).
2. Hover over IMPERIUM → letters lift subtly, no jumpiness.
3. Scroll a bit → motion is gentle (~3%), section 2 still renders normally.
4. Apply only these final changes to the existing Section 1 Hero implementation. Do not modify anything else.
  1. Change IMPERIUM positioning:
  ```css
  top: 54%;

  ```
  instead of:
  ```css
  top: 58%;

  ```
  Reason: maintain safe spacing from the fixed bottom frame while keeping the word centered in the red band.
  ---
  2. Change KING positioning:
  ```css
  left: 10vw;
  top: 34%;

  ```
  instead of:
  ```css
  left: 7vw;
  top: 42%;

  ```
  Reason: place KING correctly inside the red band above the main IMPERIUM word, matching the poster composition.
  ---
  3. Character sizing:
  Keep:
  ```css
  height: 105vh;

  ```
  Add:
  ```css
  max-height: none;

  ```
  Reason: prevent responsive constraints from shrinking the character.
  ---
  4. IMPERIUM text layers:
  Add:
  ```css
  max-width: none;

  ```
  to both:
  ```css
  .lv2h-back
  .lv2h-front

  ```
  Reason: prevent layout constraints from limiting the typography width.
  ---
  5. Background positioning:
  Replace:
  ```css
  object-position: center;

  ```
  with:
  ```css
  object-position: center 45%;

  ```
  Reason: align the red band perfectly with the typography and character composition.
  ---
  6. Outline text rendering:
  Add to `.lv2h-front`:
  ```css
  paint-order: stroke fill;

  ```
  Reason: cleaner and sharper outline rendering on large typography.
  ---
  7. Cursor interaction:
  Clamp letter lift.
  Maximum movement:
  ```css
  translateY(-3px);

  ```
  Never exceed -3px regardless of cursor proximity.
  ---
  8. Character interaction:
  Ensure character remains:
  ```css
  pointer-events: none;
  user-select: none;

  ```
  Reason: character must never intercept typography hover interactions.
  ---
  9. Scroll behavior:
  Remove hero opacity animation completely.
  Delete:
  ```css
  opacity: 1 → 0.85

  ```
  Keep only:
  ```css
  Typography Y = -3%
  Character Y = -2%

  ```
  No fading.
  Reference composition stays visually solid while scrolling.
  ---
  10. Verification:
  Capture screenshots at:
  - 1920×1080
  - 1366×768
  Confirm:
  - Red band centered
  - IMPERIUM fills width correctly
  - Character remains dominant
  - KING sits inside red band
  - Fixed frames remain untouched
  - No overlap with top or bottom frame
  - No black rectangle
  - Poster composition matches reference
  ```

  ```