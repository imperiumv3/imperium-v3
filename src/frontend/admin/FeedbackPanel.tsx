import { useEffect, useState } from "react";
import { adminListFeedback, adminResolveFeedback, adminDeleteFeedback } from "@/lib/admin.functions";
import { AdminShell } from "./AdminShell";

type Item = {
  id: string; user_id: string; user_email: string;
  category: string; message: string; status: string; created_at: string;
};

export function FeedbackPanel() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await adminListFeedback();
      if (res.ok) { setItems(res.items as Item[]); setLocalMode(res.localMode); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }
  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    setBusy(id);
    try { await adminResolveFeedback({ data: { id } }); await load(); }
    finally { setBusy(null); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this feedback?")) return;
    setBusy(id);
    try { await adminDeleteFeedback({ data: { id } }); await load(); }
    finally { setBusy(null); }
  }

  return (
    <AdminShell>
      <h1 className="admin-h1">
        Feedback
        {localMode && <span className="admin-local-badge">Local mode</span>}
      </h1>
      <p className="admin-sub">User-submitted bug reports, feature requests and feedback.</p>
      {err && <div className="admin-error">{err}</div>}
      <div className="admin-panel">
        {items === null ? <div className="admin-empty">Loading…</div>
          : items.length === 0 ? <div className="admin-empty">No feedback yet.</div>
          : (
            <table className="admin-table">
              <thead><tr><th>User</th><th>Category</th><th>Message</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.user_email || it.user_id.slice(0, 8)}</td>
                    <td style={{ textTransform: "capitalize" }}>{it.category}</td>
                    <td style={{ maxWidth: 380 }}>{it.message}</td>
                    <td><span className={`admin-status ${it.status === "resolved" ? "resolved" : "open"}`}>{it.status}</span></td>
                    <td>{new Date(it.created_at).toLocaleDateString()}</td>
                    <td>
                      {it.status !== "resolved" && (
                        <button className="admin-btn" disabled={busy === it.id} onClick={() => resolve(it.id)}>Resolve</button>
                      )}{" "}
                      <button className="admin-btn danger" disabled={busy === it.id} onClick={() => remove(it.id)}>Delete</button>
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

export default FeedbackPanel;
