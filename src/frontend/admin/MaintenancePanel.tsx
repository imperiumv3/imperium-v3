import { useEffect, useState } from "react";
import { adminGetMaintenance, adminSetMaintenance } from "@/lib/admin.functions";
import { AdminShell } from "./AdminShell";

type Mode = { is_enabled: boolean; message: string; expected_return: string | null };

function toLocal(dt?: string | null): string {
  if (!dt) return "";
  const d = new Date(dt); if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function fromLocal(s: string): string | null { return s ? new Date(s).toISOString() : null; }

export function MaintenancePanel() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await adminGetMaintenance();
      if (res.ok) {
        setLocalMode(res.localMode);
        setMode((res.mode as Mode) ?? { is_enabled: false, message: "", expected_return: null });
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }
  useEffect(() => { load(); }, []);

  async function save(nextEnabled?: boolean) {
    if (!mode) return;
    setBusy(true); setErr(null);
    try {
      const res = await adminSetMaintenance({
        data: {
          is_enabled: nextEnabled ?? mode.is_enabled,
          message: mode.message,
          expected_return: mode.expected_return,
        },
      });
      if (!res.ok) setErr(res.error || "Failed");
      else await load();
    } finally { setBusy(false); }
  }

  return (
    <AdminShell>
      <h1 className="admin-h1">
        Maintenance Mode
        {localMode && <span className="admin-local-badge">Local mode</span>}
      </h1>
      <p className="admin-sub">Block normal users from the app. Admins are never blocked.</p>
      {err && <div className="admin-error">{err}</div>}
      <div className="admin-panel">
        {mode === null ? <div className="admin-empty">Loading…</div> : (
          <div className="admin-form">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className={`admin-status ${mode.is_enabled ? "disabled" : "active"}`}>
                {mode.is_enabled ? "MAINTENANCE ON" : "OPERATIONAL"}
              </span>
              <button
                className={`admin-btn ${mode.is_enabled ? "" : "primary"}`}
                disabled={busy} onClick={() => save(!mode.is_enabled)}
              >
                {mode.is_enabled ? "Disable maintenance" : "Enable maintenance"}
              </button>
            </div>
            <div className="row">
              <label>Maintenance message</label>
              <textarea value={mode.message} onChange={(e) => setMode({ ...mode, message: e.target.value })} />
            </div>
            <div className="row">
              <label>Expected return</label>
              <input type="datetime-local" value={toLocal(mode.expected_return)} onChange={(e) => setMode({ ...mode, expected_return: fromLocal(e.target.value) })} />
            </div>
            <div className="actions">
              <button className="admin-btn primary" disabled={busy} onClick={() => save()}>Save</button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default MaintenancePanel;
