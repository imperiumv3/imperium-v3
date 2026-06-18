// Admin server functions. All admin writes go through here using the service role.
// Falls back to ENV-based local admin credentials when Supabase is unavailable.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

// ---------- helpers ----------
function envAdminEmail(): string {
  return process.env.ADMIN_EMAIL || "admin@imperium.local";
}
function envAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "Admin@9398";
}
function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getAdmin() {
  if (!supabaseConfigured()) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}

async function requireAdminClaims() {
  const { verifyAdminToken } = await import("./admin-token.server");
  const header = getRequestHeader("x-admin-token") || "";
  const claims = verifyAdminToken(header);
  if (!claims) throw new Error("Unauthorized");
  return claims;
}

// ============================================================
// LOGIN
// ============================================================
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { issueAdminToken } = await import("./admin-token.server");
    const email = (data.email || "").trim().toLowerCase();
    const password = data.password || "";
    if (!email || !password) return { ok: false as const, error: "Email and password required" };

    // 1) Try Supabase admin_users via bcrypt-verified RPC
    const sb = await getAdmin();
    if (sb) {
      try {
        const { data: ok } = await sb.rpc("verify_admin_password" as never, {
          _email: email,
          _password: password,
        } as never) as { data: boolean | null };
        if (ok === true) {
          return {
            ok: true as const,
            token: issueAdminToken(email, "supabase"),
            email,
            source: "supabase" as const,
          };
        }
      } catch {
        // ignore, fall through
      }
    }


    // 2) ENV-based fallback (local mode or Supabase-table miss)
    if (email === envAdminEmail().toLowerCase() && password === envAdminPassword()) {
      return {
        ok: true as const,
        token: issueAdminToken(email, "local"),
        email,
        source: supabaseConfigured() ? ("supabase" as const) : ("local" as const),
      };
    }

    return { ok: false as const, error: "Invalid admin credentials" };
  });

// ============================================================
// DASHBOARD STATS
// ============================================================
export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminClaims();
  const sb = await getAdmin();
  if (!sb) {
    return { ok: true as const, localMode: true, totalUsers: 0, activeUsers: 0, totalApplications: 0, totalFeedback: 0 };
  }
  const client = sb;
  const safeCount = async (table: string, eqCol?: string, eqVal?: string) => {
    try {
      let q = client.from(table as never).select("*", { count: "exact", head: true });
      if (eqCol && eqVal !== undefined) q = (q as never as { eq: (a: string, b: string) => typeof q }).eq(eqCol, eqVal);
      const { count, error } = await q;
      if (error) return 0;
      return count || 0;
    } catch { return 0; }
  };

  let totalUsers = 0;
  try {
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1 });
    totalUsers = (data as { total?: number } | null)?.total ?? 0;
    if (!totalUsers) {
      // Some Supabase versions don't return total; do a paginated approximation
      const { data: all } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      totalUsers = all?.users?.length ?? 0;
    }
  } catch { totalUsers = 0; }

  const activeUsers = await safeCount("user_status", "status", "ACTIVE");
  const totalApplications = await safeCount("application_jobs");
  const totalFeedback = await safeCount("feedback");

  return { ok: true as const, localMode: false, totalUsers, activeUsers, totalApplications, totalFeedback };
});

// ============================================================
// USERS
// ============================================================
export const adminListUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminClaims();
  const sb = await getAdmin();
  if (!sb) return { ok: true as const, localMode: true, users: [] };

  try {
    const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return { ok: true as const, localMode: false, users: [] };
    const users = data?.users ?? [];
    const ids = users.map((u) => u.id);
    let statusMap = new Map<string, string>();
    if (ids.length) {
      const { data: rows } = await sb.from("user_status").select("user_id,status").in("user_id", ids);
      statusMap = new Map((rows || []).map((r) => [r.user_id as string, r.status as string]));
    }
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await sb.from("profiles").select("id,name").in("id", ids);
      nameMap = new Map((profs || []).map((p) => [p.id as string, (p.name as string) || ""]));
    }
    return {
      ok: true as const,
      localMode: false,
      users: users.map((u) => ({
        id: u.id,
        email: u.email || "",
        name: nameMap.get(u.id) || (u.user_metadata?.name as string) || "",
        status: statusMap.get(u.id) || "ACTIVE",
        created_at: u.created_at,
      })),
    };
  } catch {
    return { ok: true as const, localMode: false, users: [] };
  }
});

export const adminSetUserStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; status: "ACTIVE" | "DISABLED" }) => d)
  .handler(async ({ data }) => {
    await requireAdminClaims();
    const sb = await getAdmin();
    if (!sb) return { ok: false as const, error: "Supabase not configured" };
    const { error } = await sb
      .from("user_status")
      .upsert({ user_id: data.userId, status: data.status }, { onConflict: "user_id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============================================================
// ANNOUNCEMENTS
// ============================================================
export const adminListAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminClaims();
  const sb = await getAdmin();
  if (!sb) return { ok: true as const, localMode: true, items: [] };
  const { data, error } = await sb
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { ok: true as const, localMode: false, items: [] };
  return { ok: true as const, localMode: false, items: data || [] };
});

export const adminUpsertAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string;
    title: string;
    message: string;
    start_at?: string | null;
    end_at?: string | null;
    is_active?: boolean;
  }) => d)
  .handler(async ({ data }) => {
    await requireAdminClaims();
    const sb = await getAdmin();
    if (!sb) return { ok: false as const, error: "Supabase not configured" };
    if (data.id) {
      const { error } = await sb.from("announcements").update({
        title: data.title,
        message: data.message,
        start_at: data.start_at || undefined,
        end_at: data.end_at || undefined,
        is_active: data.is_active ?? false,
      } as never).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await sb.from("announcements").insert({
        title: data.title,
        message: data.message,
        start_at: data.start_at || new Date().toISOString(),
        end_at: data.end_at || undefined,
        is_active: data.is_active ?? false,
      } as never);
      if (error) return { ok: false as const, error: error.message };
    }

    return { ok: true as const };
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminClaims();
    const sb = await getAdmin();
    if (!sb) return { ok: false as const, error: "Supabase not configured" };
    const { error } = await sb.from("announcements").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============================================================
// MAINTENANCE
// ============================================================
export const adminGetMaintenance = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminClaims();
  const sb = await getAdmin();
  if (!sb) return { ok: true as const, localMode: true, mode: null };
  const { data } = await sb.from("maintenance_mode").select("*").eq("id", 1).maybeSingle();
  return { ok: true as const, localMode: false, mode: data };
});

export const adminSetMaintenance = createServerFn({ method: "POST" })
  .inputValidator((d: { is_enabled: boolean; message?: string; expected_return?: string | null }) => d)
  .handler(async ({ data }) => {
    await requireAdminClaims();
    const sb = await getAdmin();
    if (!sb) return { ok: false as const, error: "Supabase not configured" };
    const patch: Record<string, unknown> = { is_enabled: data.is_enabled };
    if (typeof data.message === "string") patch.message = data.message;
    if (data.expected_return !== undefined) patch.expected_return = data.expected_return || null;
    const { error } = await sb.from("maintenance_mode").update(patch).eq("id", 1);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============================================================
// FEEDBACK
// ============================================================
export const adminListFeedback = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminClaims();
  const sb = await getAdmin();
  if (!sb) return { ok: true as const, localMode: true, items: [] };
  const { data, error } = await sb
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return { ok: true as const, localMode: false, items: [] };

  // Join user emails
  const ids = Array.from(new Set(data.map((r) => r.user_id as string)));
  const emailMap = new Map<string, string>();
  if (ids.length) {
    try {
      const { data: users } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of users?.users || []) emailMap.set(u.id, u.email || "");
    } catch { /* ignore */ }
  }
  return {
    ok: true as const,
    localMode: false,
    items: data.map((r) => ({ ...r, user_email: emailMap.get(r.user_id as string) || "" })),
  };
});

export const adminResolveFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminClaims();
    const sb = await getAdmin();
    if (!sb) return { ok: false as const, error: "Supabase not configured" };
    const { error } = await sb.from("feedback").update({ status: "resolved" }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminDeleteFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdminClaims();
    const sb = await getAdmin();
    if (!sb) return { ok: false as const, error: "Supabase not configured" };
    const { error } = await sb.from("feedback").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
