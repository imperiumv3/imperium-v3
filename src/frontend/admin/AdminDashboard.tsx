import { useEffect, useState } from "react";
import { adminStats } from "@/lib/admin.functions";
import { AdminShell } from "./AdminShell";

type Stats = {
  totalUsers: number; activeUsers: number;
  totalApplications: number; totalFeedback: number;
  localMode: boolean;
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminStats();
        if (!cancelled && res.ok) {
          setStats({
            totalUsers: res.totalUsers,
            activeUsers: res.activeUsers,
            totalApplications: res.totalApplications,
            totalFeedback: res.totalFeedback,
            localMode: res.localMode,
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <AdminShell>
      <h1 className="admin-h1">
        Dashboard
        {stats?.localMode && <span className="admin-local-badge">Local mode</span>}
      </h1>
      <p className="admin-sub">Live system metrics.</p>
      {err && <div className="admin-error">{err}</div>}
      <div className="admin-cards">
        <Card label="Total Users" value={stats?.totalUsers} />
        <Card label="Active Users" value={stats?.activeUsers} />
        <Card label="Total Applications" value={stats?.totalApplications} />
        <Card label="Total Feedback" value={stats?.totalFeedback} />
      </div>
    </AdminShell>
  );
}

function Card({ label, value }: { label: string; value?: number }) {
  return (
    <div className="admin-card">
      <div className="label">{label}</div>
      <div className="value">{value ?? "—"}</div>
    </div>
  );
}

export default AdminDashboard;
