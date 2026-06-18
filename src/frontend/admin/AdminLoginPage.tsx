import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { adminLogin } from "@/lib/admin.functions";
import { setAdminSession } from "./adminSession";
import "./admin.css";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await adminLogin({ data: { email, password } });
      if (!res.ok) {
        setError(res.error || "Login failed");
        return;
      }
      setAdminSession({
        email: res.email,
        token: res.token,
        source: res.source,
        issuedAt: Date.now(),
      });
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login-shell">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <h1>Imperium Admin</h1>
        <p className="lede">Control panel access. Admin credentials only.</p>
        {error && <div className="admin-error">{error}</div>}
        <div className="field">
          <label htmlFor="adm-email">Email</label>
          <input
            id="adm-email" type="email" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@imperium.local" required
          />
        </div>
        <div className="field">
          <label htmlFor="adm-pw">Password</label>
          <input
            id="adm-pw" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default AdminLoginPage;
