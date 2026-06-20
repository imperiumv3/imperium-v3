import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { supabase } from "@backend/database/SupabaseClient";
import { useSession } from "@frontend/auth/session";
import { GlassCard } from "../components/GlassCard";

const BUCKET = "avatars";

const METRICS = [
  { key: "strength", label: "Profile Strength", target: 9.4, max: 10, color: "#ff5a5a" },
  { key: "readiness", label: "Job Readiness", target: 8.8, max: 10, color: "#ffd166" },
  { key: "ats", label: "ATS Score", target: 92, max: 100, color: "#7bd389" },
  { key: "match", label: "Match Index", target: 88, max: 100, color: "#5bc6ff" },
] as const;

const TRAITS = ["Leadership", "Technical", "Communication", "Adaptability", "Vision", "Execution"];

export function ProfileAnalyzeSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const syncAvatar = useCallback(async (meta: Record<string, unknown>) => {
    const avatarPath = typeof meta.avatar_path === "string" ? meta.avatar_path : "";
    if (avatarPath) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(avatarPath, 3600);
      setAvatarUrl(data?.signedUrl ?? null);
      return;
    }
    setAvatarUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : null);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      void syncAvatar((data.user?.user_metadata ?? {}) as Record<string, unknown>);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void syncAvatar((s?.user?.user_metadata ?? {}) as Record<string, unknown>);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [syncAvatar]);

  useGSAP(
    () => {
      if (!ref.current) return;
      ref.current.querySelectorAll<HTMLElement>("[data-target]").forEach((el) => {
        const target = Number(el.dataset.target || 0);
        const isInt = target >= 20;
        const state = { v: 0 };
        gsap.to(state, {
          v: target, duration: 1.6, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => { el.textContent = isInt ? Math.round(state.v).toString() : state.v.toFixed(1); },
        });
      });
      ref.current.querySelectorAll<SVGCircleElement>("circle[data-pct]").forEach((c) => {
        const pct = Number(c.dataset.pct || 0);
        const len = Number(c.getAttribute("data-len") || 283);
        gsap.fromTo(c, { strokeDashoffset: len }, {
          strokeDashoffset: len - (len * pct) / 100,
          duration: 1.6, ease: "power2.out",
          scrollTrigger: { trigger: c, start: "top 90%", once: true },
        });
      });
      return () => {
        ScrollTrigger.getAll().forEach((t) => { if (ref.current?.contains(t.trigger as Node)) t.kill(); });
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} data-section={8} className="lv2-hpanel lv2s8">
      <div className="lv2s8-bg" aria-hidden />
      <div className="lv2s8-inner">
        <header className="lv2s8-head">
          <span className="lv2-shell-index">— 08 / 12</span>
          <h2>PROFILE<br/><em>INTELLIGENCE.</em></h2>
          <p>Real-time signal across every dimension of your career.</p>
        </header>

        <div className="lv2s8-grid">
          <GlassCard className="lv2s8-avatar-card" glowColor="rgba(255,80,80,0.45)">
            <div className="lv2s8-rings" aria-hidden>
              <span /><span /><span />
            </div>
            <div className="lv2s8-avatar-wrap">
              {session && avatarUrl ? (
                <img src={avatarUrl} alt="Your profile" className="lv2s8-avatar-img" />
              ) : (
                <div className="lv2s8-avatar-placeholder" aria-hidden>◐</div>
              )}
            </div>
            <div className="lv2s8-avatar-meta">
              <span className="lv2s8-pulse" /> LIVE SIGNAL
            </div>
          </GlassCard>

          <div className="lv2s8-metrics">
            {METRICS.map((m) => {
              const pct = (m.target / m.max) * 100;
              return (
                <GlassCard key={m.key} className="lv2s8-metric" glowColor={`${m.color}88`}>
                  <div className="lv2s8-metric-head">
                    <span>{m.label}</span>
                    <strong data-target={m.target}>{m.max === 100 ? "0" : "0.0"}</strong>
                  </div>
                  <svg viewBox="0 0 110 110" className="lv2s8-ring">
                    <circle cx="55" cy="55" r="45" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
                    <circle cx="55" cy="55" r="45" stroke={m.color} strokeWidth="6" fill="none"
                      strokeLinecap="round" strokeDasharray="283" data-len="283" data-pct={pct}
                      transform="rotate(-90 55 55)"
                    />
                  </svg>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard className="lv2s8-radar" glowColor="rgba(120,200,255,0.45)">
            <h4>Trait Map</h4>
            <ul className="lv2s8-traits">
              {TRAITS.map((t, i) => (
                <li key={t}>
                  <span>{t}</span>
                  <span className="lv2s8-bar"><span style={{ width: `${65 + ((i * 13) % 30)}%` }} /></span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        <button type="button" className="lv2s8-cta" onClick={() => navigate({ to: session ? "/profile" : "/auth" })}>
          COMMAND UP →
        </button>
      </div>
    </section>
  );
}
