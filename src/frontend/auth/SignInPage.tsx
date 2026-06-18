import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@backend/database/SupabaseClient";
import { PillInput } from "./components/PillInput";
import { ImperiumStage } from "./components/ImperiumStage";
import { signInSchema } from "./validation";

function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden>
      <defs>
        <linearGradient id="impLogo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff4b4b" />
          <stop offset="100%" stopColor="#a30f0f" />
        </linearGradient>
      </defs>
      <path
        d="M8 6 L24 40 L40 6 L32 6 L24 24 L16 6 Z"
        fill="url(#impLogo)"
        stroke="#ff6b6b"
        strokeWidth="1"
      />
    </svg>
  );
}

export function SignInPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setFormError(msg.includes("Invalid login") ? "Incorrect email or password." : msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="imp-shell">
      <div className="imp-left">
        <Link to="/" className="imp-back">
          <span aria-hidden>←</span> BACK
        </Link>

        <motion.div
          className="imp-left-inner"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="imp-brand">
            <LogoMark />
            <div className="imp-brand-text">
              <span className="imp-brand-name">IMPERIUM</span>
              <span className="imp-brand-sub">AI COMMAND SYSTEM</span>
            </div>
          </div>

          <h1 className="imp-h1">
            Welcome back,
            <br />
            <span className="imp-h1-accent">Commander</span>
          </h1>
          <p className="imp-sub">Access your empire. Command your agents.</p>

          <form className="imp-form" onSubmit={onSubmit} noValidate>
            <label className="imp-label">EMAIL</label>
            <PillInput
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
            />

            <label className="imp-label">PASSWORD</label>
            <PillInput
              isPassword
              placeholder="Enter your password"
              autoComplete="current-password"
              value={values.password}
              onChange={set("password")}
              error={errors.password}
            />

            <div className="imp-row">
              <label className="imp-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="imp-check-box" aria-hidden />
                Remember me
              </label>
              <Link to="/reset-password" className="imp-forgot">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="imp-submit" disabled={submitting}>
              <span aria-hidden className="imp-submit-arrow">→</span>
              {submitting ? "ENTERING…" : "ENTER IMPERIUM"}
            </button>

            {formError ? <div className="imp-error">{formError}</div> : null}

            <Link to="/signup" className="imp-switch">
              <span aria-hidden>⌥</span> Switch account
            </Link>
          </form>
        </motion.div>

        <div className="imp-footer">© 2025 IMPERIUM. All rights reserved.</div>
      </div>

      <div className="imp-right">
        <ImperiumStage />
      </div>
    </div>
  );
}

export default SignInPage;
