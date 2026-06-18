// User-facing server functions: read maintenance, read announcements, submit feedback,
// and check own status. These run with the user's bearer token (RLS).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


// Public read of maintenance — uses the publishable-key browser client on the SERVER too via
// a tiny server-local instantiation. anon role is allowed by RLS.
export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { is_enabled: false, message: "", expected_return: null };
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });
    const { data } = await sb.from("maintenance_mode").select("is_enabled,message,expected_return").eq("id", 1).maybeSingle();
    return (data as { is_enabled: boolean; message: string; expected_return: string | null } | null)
      ?? { is_enabled: false, message: "", expected_return: null };
  } catch {
    return { is_enabled: false, message: "", expected_return: null };
  }
});

export const getActiveAnnouncement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("announcements")
      .select("title,message,start_at,end_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as { title: string; message: string; start_at: string; end_at: string | null } | null;
  });

export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_status").select("status").eq("user_id", context.userId).maybeSingle();
    return { status: (data?.status as string) || "ACTIVE" };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category: "bug" | "feature" | "general"; message: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.message?.trim()) return { ok: false as const, error: "Message required" };
    const { error } = await context.supabase.from("feedback").insert({
      user_id: context.userId,
      category: data.category,
      message: data.message.trim(),
    } as never);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
