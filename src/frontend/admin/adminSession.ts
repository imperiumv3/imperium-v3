// Client-side admin session helpers. Token + email stored in localStorage.
// Separate key from user session — admin and user sessions never overlap.
const KEY = "imperium_admin_session";

export type AdminSession = { email: string; token: string; source: "supabase" | "local"; issuedAt: number };

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSession;
  } catch { return null; }
}

export function setAdminSession(s: AdminSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function adminAuthHeaders(): Record<string, string> {
  const s = getAdminSession();
  return s ? { "x-admin-token": s.token } : {};
}
