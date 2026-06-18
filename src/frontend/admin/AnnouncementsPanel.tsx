import { useEffect, useState } from "react";
import {
  adminListAnnouncements, adminUpsertAnnouncement, adminDeleteAnnouncement,
} from "@/lib/admin.functions";
import { AdminShell } from "./AdminShell";

type Item = {
  id: string; title: string; message: string;
  start_at: string | null; end_at: string | null; is_active: boolean;
};

function toLocal(dt?: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function fromLocal(s: string): string | null {
  if (!s) return null;
  return new Date(s).toISOString();
}

export function AnnouncementsPanel() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await adminListAnnouncements();
      if (res.ok) {
        setItems(res.items as Item[]);
        setLocalMode(res.localMode);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.title || !editing?.message) { setErr("Title and message required"); return; }
    setBusy(true); setErr(null);
    try {
      const res = await adminUpsertAnnouncement({
        data: {
          id: editing.id,
          title: editing.title,
          message: editing.message,
          start_at: editing.start_at ?? undefined,
          end_at: editing.end_at ?? undefined,
          is_active: editing.is_active ?? false,
        },
      });
      if (!res.ok) setErr(res.error || "Failed");
      else { setEditing(null); await load(); }
    } finally { setBusy(false); }
  }

  async function toggleActive(it: Item) {
    setBusy(true);
    try {
      await adminUpsertAnnouncement({
        data: {
          id: it.id, title: it.title, message: it.message,
          start_at: it.start_at ?? undefined, end_at: it.end_at ?? undefined,
          is_active: !it.is_active,
        },
      });
      await load();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    setBusy(true);
    try { await adminDeleteAnnouncement({ data: { id } }); await load(); }
    finally { setBusy(false); }
  }

  return (
    <AdminShell>
      <h1 className="admin-h1">
        Announcements
        {localMode && <span className="admin-local-badge">Local mode</span>}
      </h1>
      <p className="admin-sub">Show messages on user dashboards.</p>
      {err && <div className="admin-error">{err}</div>}
      <div className="admin-panel">
        <div className="admin-toolbar">
          <button className="admin-btn primary" onClick={() => setEditing({ is_active: true })}>
            New Announcement
          </button>
        </div>

        {editing && (
          <div className="admin-form" style={{ marginBottom: 24 }}>
            <div className="row">
              <label>Title</label>
              <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="row">
              <label>Message</label>
              <textarea value={editing.message || ""} onChange={(e) => setEditing({ ...editing, message: e.target.value })} />
            </div>
            <div className="row">
              <label>Start time</label>
              <input type="datetime-local" value={toLocal(editing.start_at)} onChange={(e) => setEditing({ ...editing, start_at: fromLocal(e.target.value) })} />
            </div>
            <div className="row">
              <label>End time (optional)</label>
              <input type="datetime-local" value={toLocal(editing.end_at)} onChange={(e) => setEditing({ ...editing, end_at: fromLocal(e.target.value) })} />
            </div>
            <label className="admin-switch">
              <input type="checkbox" checked={editing.is_active ?? false} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>
            <div className="actions">
              <button className="admin-btn primary" disabled={busy} onClick={save}>Save</button>
              <button className="admin-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        )}

        {items === null ? <div className="admin-empty">Loading…</div>
          : items.length === 0 ? <div className="admin-empty">No announcements.</div>
          : (
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Window</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td><strong>{it.title}</strong><br /><span style={{ color: "hsl(var(--muted-foreground))" }}>{it.message.slice(0, 80)}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {it.start_at ? new Date(it.start_at).toLocaleString() : "—"}<br />
                      → {it.end_at ? new Date(it.end_at).toLocaleString() : "no end"}
                    </td>
                    <td><span className={`admin-status ${it.is_active ? "active" : "disabled"}`}>{it.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                    <td>
                      <button className="admin-btn" disabled={busy} onClick={() => toggleActive(it)}>{it.is_active ? "Deactivate" : "Activate"}</button>{" "}
                      <button className="admin-btn" disabled={busy} onClick={() => setEditing(it)}>Edit</button>{" "}
                      <button className="admin-btn danger" disabled={busy} onClick={() => remove(it.id)}>Delete</button>
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

export default AnnouncementsPanel;
