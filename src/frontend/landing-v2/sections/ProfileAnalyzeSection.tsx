import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { supabase } from "@backend/database/SupabaseClient";
import { useSession } from "@frontend/auth/session";
import profileAnalyzeAsset from "../assets/section-08-profile-analyze/profile-analyze.webp.asset.json";
import profileCharacterAsset from "../assets/section-08-profile-analyze/profile-character.webp.asset.json";

const BUCKET = "avatars";

export function ProfileAnalyzeSection() {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const session = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const syncAvatar = useCallback(async (meta: Record<string, unknown>) => {
    const avatarPath = typeof meta.avatar_path === "string" ? meta.avatar_path : "";
    if (avatarPath) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(avatarPath, 60 * 60);
      setAvatarUrl(signed?.signedUrl ?? null);
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
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [syncAvatar]);

  useGSAP(
    () => {
      if (!ref.current) return;
      const values = ref.current.querySelectorAll<HTMLElement>("[data-target]");
      values.forEach((el) => {
        const target = Number(el.dataset.target || 0);
        const state = { value: 0 };
        gsap.to(state, {
          value: target,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
          onUpdate: () => {
            el.textContent = state.value.toFixed(1);
          },
        });
      });

      const avatar = ref.current.querySelector(".lv2s8-avatar");
      if (avatar) {
        const onMove = (e: PointerEvent) => {
          const rect = ref.current?.getBoundingClientRect();
          if (!rect) return;
          const nx = (e.clientX - rect.left) / rect.width - 0.5;
          const ny = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(avatar, { x: nx * 16, y: ny * 10, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        };
        const onLeave = () => gsap.to(avatar, { x: 0, y: 0, duration: 0.45, ease: "power3.out" });
        ref.current.addEventListener("pointermove", onMove);
        ref.current.addEventListener("pointerleave", onLeave);
        return () => {
          ref.current?.removeEventListener("pointermove", onMove);
          ref.current?.removeEventListener("pointerleave", onLeave);
          ScrollTrigger.getAll().forEach((t) => {
            if (t.trigger === ref.current) t.kill();
          });
        };
      }
      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === ref.current) t.kill();
        });
      };
    },
    { scope: ref },
  );

  const centerImage = session && avatarUrl ? avatarUrl : profileCharacterAsset.url;

  return (
    <section ref={ref} data-section={8} className="lv2-section lv2s8">
      <span className="lv2-sec-index">— 08 / 12</span>
      <div className="lv2s8-wrap">
        <img src={profileAnalyzeAsset.url} alt="Profile intelligence poster" className="lv2s8-poster" loading="lazy" decoding="async" />

        <div className="lv2s8-avatar-shell" aria-hidden>
          <img
            src={centerImage}
            alt={session && avatarUrl ? "Your profile image" : ""}
            className={`lv2s8-avatar ${session && avatarUrl ? "is-user" : "is-poster"}`}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="lv2s8-metric lv2s8-metric-strength">
          <strong data-target="9.4">0.0</strong>
        </div>
        <div className="lv2s8-metric lv2s8-metric-readiness">
          <strong data-target="8.8">0.0</strong>
        </div>

        <button
          type="button"
          className="lv2s8-cta"
          onClick={() => navigate({ to: session ? "/profile" : "/auth" })}
        >
          COMMAND UP
        </button>
      </div>
    </section>
  );
}

