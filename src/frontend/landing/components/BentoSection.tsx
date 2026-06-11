import { useCallback, useEffect, useState } from "react";
import portrait from "@frontend/landing/assets/bento_red_portrait.jpg";
import logo from "@frontend/landing/assets/imperium_logo.png";
import { useSession } from "@frontend/auth/session";
import { useProfilePageData } from "@frontend/profile/profile.data";
import { supabase } from "@backend/database/SupabaseClient";

const BUCKET = "avatars";

export default function BentoSection() {
  // Avoid SSR/CSR mismatch — render Imperium defaults until mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const session = useSession();
  const profileData = useProfilePageData();
  const signedIn = mounted && !!session;
  const profile = signedIn ? profileData.profile : null;

  // Avatar — same source of truth as navbar / dashboard / uploader.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const syncAvatar = useCallback(async (meta: Record<string, unknown>) => {
    const path = typeof meta.avatar_path === "string" ? meta.avatar_path : "";
    if (path) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      setAvatarUrl(signed?.signedUrl ?? null);
      return;
    }
    setAvatarUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : null);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      void syncAvatar((data.user?.user_metadata ?? {}) as Record<string, unknown>);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void syncAvatar((s?.user?.user_metadata ?? {}) as Record<string, unknown>);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [mounted, syncAvatar]);

  const displayName = signedIn ? (profile?.name || session?.fullName || session?.email?.split("@")[0] || "Operator") : "";
  const firstName = displayName.split(/\s+/)[0] || "Your";
  const heading = signedIn ? `${firstName}'s Profile` : "Your Profile";
  const tag = signedIn ? "( Signed in )" : "( User Profile )";
  const identityLabel = signedIn ? displayName.toUpperCase() : "IMPERIUM IDENTITY";
  const skillCount = signedIn ? (profile?.skills?.length ?? 0) : 0;
  const expCount = signedIn ? (profile?.experience?.length ?? 0) : 0;
  const projCount = signedIn ? (profile?.projects?.length ?? 0) : 0;
  const eduCount = signedIn ? (profile?.education?.length ?? 0) : 0;
  const certCount = signedIn ? (profile?.certifications?.length ?? 0) : 0;
  const strength = signedIn ? profileData.scores.strength : 0;
  const ats = signedIn ? profileData.scores.atsReadiness : 0;
  const targetRole = signedIn ? (profile?.target_role || profile?.headline || "") : "";
  const location = signedIn ? (profile?.location || "") : "";
  const headline = signedIn ? (profile?.headline || profile?.seniority || "Operator") : "";
  const initials = signedIn
    ? displayName.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
    : "";

  return (
    <section className="relative w-full bg-[#e8e4dd] py-24">
      <div className="mx-auto max-w-7xl px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-black/55">{tag}</p>
        <h2 className="mt-3 font-sans text-[clamp(48px,9vw,140px)] font-medium leading-[0.92] tracking-[-0.04em] text-black">
          {heading}
        </h2>
        {signedIn && (targetRole || location) && (
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-black/60">
            {[targetRole, location].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-3 px-4 md:grid-cols-6 md:grid-rows-3 md:gap-4 md:px-8">
        {/* Identity card */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 md:row-span-2">
          <div className="flex h-full flex-col items-center justify-between">
            {signedIn ? (
              avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#ff5a3a] font-sans text-[18px] font-medium text-white">
                  {initials || "•"}
                </div>
              )
            ) : (
              <img src={logo} alt="" className="h-12 w-12 rounded-xl" />
            )}
            <div className="font-mono text-[11px] tracking-[0.3em] text-black/70" style={{ writingMode: "vertical-rl" }}>
              {identityLabel.slice(0, 22)}
            </div>
            <div className="h-1 w-1 rounded-full bg-black/30" />
          </div>
        </div>

        {/* Skill snapshot */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 md:row-span-2">
          <div className="font-sans text-[20px] font-medium leading-tight text-black">Skill<br />Snapshot</div>
          {signedIn ? (
            <div className="mt-10 text-center">
              <div className="font-sans text-[56px] font-medium leading-none text-black">{skillCount}</div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">skills tracked</div>
              <div className="mt-4 text-[11px] text-black/60">
                {eduCount} edu · {certCount} certs
              </div>
            </div>
          ) : (
            <div className="mt-12 text-center font-serif text-[36px] text-black/80">経歴</div>
          )}
        </div>

        {/* Portrait — large center */}
        <div className="relative col-span-2 row-span-2 overflow-hidden rounded-3xl ring-1 ring-black/5 md:col-span-2">
          <img
            src={signedIn && avatarUrl ? avatarUrl : portrait}
            alt={signedIn ? displayName : ""}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <div className="absolute inset-x-6 bottom-6 text-center">
            <h3 className="font-sans text-[22px] font-medium text-white">
              {signedIn ? `Welcome back, ${firstName}` : "Own your Career Story"}
            </h3>
            <p className="mt-2 text-[12px] leading-snug text-white/85">
              <span className="opacity-60">( </span>
              {signedIn
                ? `${location || "Imperium"} • ${expCount} roles • ${projCount} projects in your dossier.`
                : "Profile data flows into every resume, cover letter and interview answer IMPERIUM crafts."}
              <span className="opacity-60"> )</span>
            </p>
          </div>
        </div>

        {/* Apply anywhere */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 md:col-span-2">
          <h3 className="font-sans text-[20px] font-medium leading-tight text-black">
            {signedIn ? <>One profile.<br /><span className="text-black/40">Live & synced.</span></> : <>One profile.<br /><span className="text-black/40">Every application.</span></>}
          </h3>
          <div className="mt-3 w-full overflow-hidden rounded-xl bg-[#0e0e10] p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">IMPERIUM© PROFILE</div>
            {signedIn ? (
              <>
                <div className="mt-2 text-[13px] font-medium text-white truncate">{displayName}</div>
                <div className="mt-1 text-[11px] text-white/70 truncate">{session?.email}</div>
                <div className="mt-1 text-[10px] text-white/50 truncate">{headline}</div>
              </>
            ) : (
              <div className="mt-2 text-[11px] text-white/60">Sign in to sync your profile.</div>
            )}
          </div>
        </div>

        {/* ATS readiness */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 md:col-span-2">
          <h3 className="font-sans text-[18px] font-medium leading-tight text-black">
            {signedIn ? "Your ATS readiness" : "Tune your tone for every role"}
          </h3>
          {signedIn ? (
            <div className="mt-4">
              <div className="font-sans text-[44px] font-medium text-[#ff5a3a]">{ats}<span className="text-[20px] text-black/40">/100</span></div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div className="h-full bg-[#ff5a3a]" style={{ width: `${ats}%` }} />
              </div>
            </div>
          ) : (
            <div className="mt-4 inline-block rounded-md border border-dashed border-[#ff5a3a]/60 px-3 py-2">
              <span className="font-sans text-[44px] font-medium text-[#ff5a3a]">あ</span>
            </div>
          )}
        </div>

        {/* Profile strength */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 md:col-span-2">
          <svg viewBox="0 0 200 120" className="h-28 w-full">
            <defs>
              <pattern id="grid" width="33" height="20" patternUnits="userSpaceOnUse">
                <path d="M 33 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="200" height="120" fill="url(#grid)" />
            <path
              d={signedIn
                ? `M 0 110 C 50 110, 80 ${110 - strength}, 200 ${110 - strength}`
                : "M 0 110 C 50 110, 80 10, 200 10"}
              fill="none" stroke="#ff5a3a" strokeWidth="2"
            />
            <line x1="0" y1="120" x2="200" y2="0" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
          </svg>
          <p className="mt-3 text-center font-sans text-[16px] font-medium text-black">
            Profile Strength{signedIn ? ` — ${strength}/100` : ""}
          </p>
        </div>

        {/* Experiences/projects */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 md:col-span-3">
          <h3 className="font-sans text-[20px] font-medium text-black">
            {signedIn ? `${expCount} experiences · ${projCount} projects` : "Always Interview Ready"}
          </h3>
          {signedIn && profile && (
            <p className="mt-2 text-[12px] text-black/60 line-clamp-2">
              {profile.summary?.slice(0, 140) || "Add a summary in your profile to showcase your story."}
            </p>
          )}
        </div>

        {/* Targeting */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 md:col-span-3">
          <h3 className="font-sans text-[20px] font-medium text-black">
            {signedIn ? (targetRole ? `Targeting: ${targetRole}` : "Build, tailor, apply.") : "Build, tailor, apply."}
          </h3>
          {signedIn && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(profile?.skills ?? []).slice(0, 6).map((s, i) => (
                <span key={i} className="rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] text-black/70">
                  {typeof s === "string" ? s : (s as { name?: string }).name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
