import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { clearAdminSession, getAdminSession } from "./adminSession";
import "./admin.css";

const NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/announcements", label: "Announcements" },
  { to: "/admin/maintenance", label: "Maintenance" },
  { to: "/admin/feedback", label: "Feedback" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [session, setSession] = useState(() => getAdminSession());

  useEffect(() => {
    const s = getAdminSession();
    if (!s) {
      navigate({ to: "/admin/login" });
      return;
    }
    setSession(s);
  }, [navigate]);

  if (!session) return null;

  function logout() {
    clearAdminSession();
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="brand"><span className="dot" /> Imperium Admin</div>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`admin-nav-link ${pathname === n.to ? "active" : ""}`}
            >
              {n.label}
            </Link>
          ))}
          <div className="footer">
            Signed in as<br />
            <strong>{session.email}</strong>
            <br />
            <span style={{ opacity: 0.7 }}>
              {session.source === "local" ? "local mode" : "supabase"}
            </span>
            <button className="logout" onClick={logout}>Sign out</button>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
