import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ImperiumNavbar } from "./ImperiumNavbar";
import { supabase } from "@backend/database/SupabaseClient";
import { getMaintenanceStatus, getMyStatus } from "@/lib/user-system.functions";
import { getAdminSession } from "@frontend/admin/adminSession";
import { MaintenancePage } from "@frontend/admin/MaintenancePage";

/** App shell used by the _authenticated layout.
 *  - Maintenance mode blocks non-admin users.
 *  - Disabled users are signed out.
 *  - On /dashboard: render children only (RPG command center owns the chrome).
 *  - Everywhere else: floating Imperium navbar + animated route transitions. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname === "/dashboard";
  const isResumeStudio = pathname === "/resume";

  const [gateState, setGateState] = useState<
    | { kind: "loading" }
    | { kind: "ok" }
    | { kind: "maintenance"; message: string; expected_return: string | null }
    | { kind: "disabled" }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const isAdmin = !!getAdminSession();
        const maint = await getMaintenanceStatus().catch(() => null);
        if (!cancelled && maint?.is_enabled && !isAdmin) {
          setGateState({ kind: "maintenance", message: maint.message, expected_return: maint.expected_return });
          return;
        }
        const status = await getMyStatus().catch(() => ({ status: "ACTIVE" }));
        if (!cancelled && status.status === "DISABLED") {
          await supabase.auth.signOut().catch(() => {});
          window.location.href = "/auth?disabled=1";
          return;
        }
        if (!cancelled) setGateState({ kind: "ok" });
      } catch {
        if (!cancelled) setGateState({ kind: "ok" }); // fail open
      }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  if (gateState.kind === "loading") return null;
  if (gateState.kind === "maintenance") {
    return <MaintenancePage message={gateState.message} expectedReturn={gateState.expected_return} />;
  }
  if (gateState.kind === "disabled") return null;

  if (isDashboard || isResumeStudio) return <>{children}</>;

  return (
    <>
      <ImperiumNavbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          className="imp-page"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </>
  );
}
