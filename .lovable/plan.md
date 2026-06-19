# Fix empty right-side panel — Option B (local-safe assets)

## Why it's empty locally
The current `*.asset.json` pointers reference Lovable's CDN (`/__l5e/assets-v1/...`). On `bun dev` that URL doesn't resolve, so the `<img>` tags load nothing and the right panel appears empty.

## Approach
Switch to **`public/`-hosted PNGs** so the images load identically on local dev, Lovable preview, and published builds — zero CDN dependency.

Per your direction: collapse sword + commander into **one combined image** (the second upload already shows them composed together), keeping the background as a separate layer for depth/parallax.

## Files to add (copy from your uploads into the repo)
```
public/auth/bg-clock.jpg      ← WhatsApp_Image_2026-06-19_at_9.32.47_AM.jpeg
public/auth/hero.png          ← WhatsApp_Image_2026-06-18_at_9.44.00_PM-2.jpeg
                                (sword + commander, already on black bg)
```

Note: `hero.png` has a solid black background, which blends seamlessly into the dark right panel — no transparency needed. Looks identical to a cut-out against `#000`.

## Code changes

### 1. `src/frontend/auth/components/ImperiumStage.tsx`
- Remove the three `import ... from "../assets/*.asset.json"` lines and their `.url` usages.
- Replace the two layers (sword + commander) with **one `<motion.img>`** pointing to `/auth/hero.png`.
- Keep the background layer pointing to `/auth/bg-clock.jpg`.
- Keep the existing parallax `useMotionValue` / `useTransform` motion on the hero layer (single shared transform), and the two `GlassWidget`s untouched.
- Layer order unchanged: `bg → hero → glass cards → form`.

### 2. Delete now-unused pointer files
```
src/frontend/auth/assets/bg-clock.png.asset.json
src/frontend/auth/assets/sword.png.asset.json
src/frontend/auth/assets/commander.png.asset.json
```

### 3. CSS (`src/frontend/auth/auth.css`)
- Replace `.imp-sword` + `.imp-commander` rules with a single `.imp-hero` rule sized/positioned to match the reference composition (right-anchored, height ~92vh, object-fit: contain).
- Keep all left-panel scale/typography rules from the previous pass untouched.

## What stays the same
- Left auth panel (logos, inputs, buttons, spacing) — no changes
- SignIn / SignUp form logic, validation, Supabase calls
- Glass widget cards and their animations
- Background parallax + fade-in entry animation

## Verification
1. `bun dev` → open `/auth` and `/signup` → confirm bg + hero render
2. Take a Playwright screenshot at 1280×800 to confirm composition matches reference
3. Check console: no 404s for `/auth/bg-clock.jpg` or `/auth/hero.png`

## Out of scope
- No backend / auth logic changes
- No re-tuning of left-panel sizing (already at the 75%-zoom target you approved)
- No re-upload to Lovable CDN — `public/` works everywhere
