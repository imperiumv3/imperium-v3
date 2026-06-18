import { useState, type FormEvent } from "react";
import "./auth.css";
import { useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@backend/database/SupabaseClient";
import { PillInput } from "./components/PillInput";
import { ImperiumStage } from "./components/ImperiumStage";
import { signUpSchema } from "./validation";
import bgAsset from "./assets/bg-clock.png.asset.json";

function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden>
      <defs>
        <linearGradient id="impLogoUp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff4b4b" />
          <stop offset="100%" stopColor="#a30f0f" />
        </linearGradient>
      </defs>
      <path
        d="M8 6 L24 40 L40 6 L32 6 L24 24 L16 6 Z"
        fill="url(#impLogoUp)"
        stroke="#ff6b6b"
        strokeWidth="1"
      />
    </svg>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: redirectTo,
          data: { full_name: parsed.data.fullName },
        },
      });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase
          .from("profiles")
          .update({ name: parsed.data.fullName, email: parsed.data.email })
          .eq("id", data.session.user.id);
        navigate({ to: "/dashboard" });
      } else {
        setFormError("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="imp-shell" style={{ backgroundImage: `url(${bgAsset.url})` }}>
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
            Forge your
            <br />
            <span className="imp-h1-accent">Empire</span>
          </h1>
          <p className="imp-sub">Create your account. Command your agents.</p>

          <form className="imp-form" onSubmit={onSubmit} noValidate>
            <label className="imp-label">FULL NAME</label>
            <PillInput
              type="text"
              placeholder="Enter your name"
              autoComplete="name"
              value={values.fullName}
              onChange={set("fullName")}
              error={errors.fullName}
            />

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
              placeholder="Create a password"
              autoComplete="new-password"
              value={values.password}
              onChange={set("password")}
              error={errors.password}
            />

            <label className="imp-label">CONFIRM PASSWORD</label>
            <PillInput
              isPassword
              placeholder="Confirm your password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={set("confirmPassword")}
              error={errors.confirmPassword}
            />

            <button type="submit" className="imp-submit" disabled={submitting}>
              <span aria-hidden className="imp-submit-arrow">→</span>
              {submitting ? "FORGING…" : "FORGE ACCOUNT"}
            </button>

            {formError ? <div className="imp-error">{formError}</div> : null}

            <Link to="/auth" className="imp-switch">
              <span aria-hidden>⌥</span> Already have an account? Sign in
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

export default SignUpPage;
