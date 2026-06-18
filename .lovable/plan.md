# Fix: Supabase env vars not loading

## Root cause

Your `.env` file is inside the `IMPERIUM/` subfolder. Vite only reads `.env` files from the **project root** — the folder containing `package.json` and `vite.config.ts`. That's why the app falls back to "local mode only" even though the variables are defined.

`IMPERIUM/local_agent/` is a separate Python project — its `.env` (if any) is unrelated to the web app's Vite build.

## Fix (you do this manually, no code changes needed)

1. **Move** (don't copy) the `.env` file from:
   ```
   C:\Users\dinesh\Desktop\FF\jobforge-opus\IMPERIUM\.env
   ```
   to:
   ```
   C:\Users\dinesh\Desktop\FF\jobforge-opus\.env
   ```
   It must sit next to `package.json`.

2. **Verify** in File Explorer that the filename is exactly `.env` (not `.env.txt`). Enable "File name extensions" in the View menu to be sure.

3. **Fully stop** `npm run dev` (Ctrl+C in the terminal), then start it again:
   ```
   npm run dev
   ```

4. Open the app. The "offline shell mode" banner should be gone and the admin login + Supabase data should work.

## Quick verification commands (Windows CMD)

Use these instead of `ls`/`cat`:

```
dir .env
type .env
```

Run from `C:\Users\dinesh\Desktop\FF\jobforge-opus\` — `dir .env` should list the file, and `type .env` should print the `VITE_SUPABASE_URL=...` lines.

## What I will change in code

**Nothing.** This is purely a file-location issue on your machine. The Vite config and Supabase client are already correct — they just need the `.env` file in the right place.

If after moving the file and restarting you still see "offline shell mode", reply with the output of `type .env` (you can redact the keys) and I'll inspect the Vite env loader.
