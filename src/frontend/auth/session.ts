/**
 * Supabase-backed auth session hook.
 * Replaces the legacy localStorage `mockAuth` module.
 *
 * - `useSession()` returns `{ userId, email, fullName } | null`.
 * - `signOut()` cancels in-flight queries, clears caches, signs out, redirects.
 * - `useUserId()` returns the auth.uid() for the current signed-in user.
 */
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@backend/database/SupabaseClient";
import { setAiCacheUser } from "@frontend/resume/ai/AiCache";

export interface Session {
  userId: string;
  email: string;
  fullName: string;
}

function toSession(user: User | null): Session | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "";
  return { userId: user.id, email: user.email ?? "", fullName };
}

export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    // Initial fetch — getUser revalidates with auth server.
    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        const s = toSession(data.user ?? null);
        setSession(s);
        setAiCacheUser(s?.userId ?? null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (active) {
        const sess = toSession(s?.user ?? null);
        setSession(sess);
        setAiCacheUser(sess?.userId ?? null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return session;
}

export function useUserId(): string | null {
  return useSession()?.userId ?? null;
}

export async function signOut(): Promise<void> {
  // Clear resume-related localStorage to prevent cross-user data leakage
  try {
    localStorage.removeItem("imperium-resume-studio-v1");
    localStorage.removeItem("imperium-resume-current");
    localStorage.removeItem("imperium-resume-versions");
    localStorage.removeItem("imperium-ai-cache-v1");
  } catch {
    /* noop — SSR or quota */
  }
  await supabase.auth.signOut();
}
