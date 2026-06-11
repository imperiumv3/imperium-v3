import { useCallback, useEffect, useState } from "react";
import heroImg from "@/assets/dashboard/hero-portrait.png";
import { supabase } from "@backend/database/SupabaseClient";

const BUCKET = "avatars";

type Mode = "image" | "spline" | "three";

interface Props {
  mode?: Mode;
  src?: string;
  alt?: string;
}

/** Center hero. Renders the signed-in user's uploaded avatar when present
 *  (kept in sync with AvatarUploader via auth metadata `avatar_path`),
 *  falling back to the Imperium default illustration otherwise. */
export function HeroPortrait({ mode = "image", src, alt = "Profile portrait" }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const sync = useCallback(async (meta: Record<string, unknown>) => {
    const path = typeof meta.avatar_path === "string" ? meta.avatar_path : "";
    if (path) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      setAvatarUrl(signed?.signedUrl ?? null);
      return;
    }
    setAvatarUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : null);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      void sync((data.user?.user_metadata ?? {}) as Record<string, unknown>);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void sync((s?.user?.user_metadata ?? {}) as Record<string, unknown>);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [sync]);

  const resolved = src ?? avatarUrl ?? heroImg;
  const isUserPhoto = !!avatarUrl && !src;

  return (
    <div className="dash-hero" data-user={isUserPhoto ? "true" : "false"}>
      <div className="halo" />
      <div className="dots" aria-hidden />
      {mode === "image" && (
        <img
          src={resolved}
          alt={alt}
          loading="eager"
          className={isUserPhoto ? "dash-hero-avatar" : ""}
        />
      )}
    </div>
  );
}
