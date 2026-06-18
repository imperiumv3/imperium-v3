import { useEffect, useMemo, useState } from "react";
import { adminListUsers, adminSetUserStatus, adminDeleteUser } from "@/lib/admin.functions";
import { AdminShell } from "./AdminShell";

type User = { id: string; email: string; name: string; status: string; created_at: string };

export function UsersPanel() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await adminListUsers();
      if (res.ok) {
        setUsers(res.users);
        setLocalMode(res.localMode);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle));
  }, [users, q]);

  async function toggle(u: User) {
    setBusy(u.id); setErr(null);
    const next = u.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await adminSetUserStatus({ data: { userId: u.id, status: next } });
      if (!res.ok) setErr(res.error || "Failed");
      else await load();
    } finally { setBusy(null); }
  }

  async function remove(u: User) {
    const confirmed = window.confirm(
      `Permanently delete ${u.email}?\n\nThis removes their auth account, profile, and status. This cannot be undone.`
    );
    if (!confirmed) return;
    setBusy(u.id); setErr(null);
    try {
      const res = await adminDeleteUser({ data: { userId: u.id } });
      if (!res.ok) setErr(res.error || "Failed to delete user");
      else await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  }

  return (
    <AdminShell>
      <h1 className="admin-h1">
        Users
        {localMode && <span className="admin-local-badge">Local mode</span>}
      </h1>
      <p className="admin-sub">Enable, disable, or permanently remove user accounts.</p>
      {err && <div className="admin-error">{err}</div>}
      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            type="search" placeholder="Search by name or email…"
            value={q} onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {users === null ? (
          <div className="admin-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">No users.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Status</th><th>Created</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`admin-status ${u.status === "ACTIVE" ? "active" : "disabled"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        className="admin-btn" disabled={busy === u.id}
                        onClick={() => toggle(u)}
                      >
                        {u.status === "ACTIVE" ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="admin-btn danger" disabled={busy === u.id}
                        onClick={() => remove(u)}
                        title="Permanently delete user"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}

export default UsersPanel;
