import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import avatar from "@/assets/profile/avatar-placeholder.jpg";
import { supabase, isSupabaseConfigured } from "@backend/database/SupabaseClient";
import type { ProfilePageData } from "../profile.data";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;

function inferYearsExperience(experience: ProfilePageData["profile"]["experience"]): number {
  if (!experience || experience.length === 0) return 0;
  let months = 0;
  for (const e of experience) {
    const startStr = (e.start ?? "").trim();
    if (!startStr) continue;
    const start = new Date(startStr);
    const endStr = (e.current ? "" : (e.end ?? "")).trim();
    const end = endStr ? new Date(endStr) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (m > 0) months += m;
  }
  return Math.floor(months / 12);
}

export function ProfileCard({ data }: { data: ProfilePageData }) {
  const { profile } = data;
  const years = inferYearsExperience(profile.experience);
  const expLabel = years <= 0 ? "Fresher" : `${years} Year${years === 1 ? "" : "s"} Exp`;
  const city = profile.location?.split(",")[0]?.trim() || "—";

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      setPhotoUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const meta = (s?.user?.user_metadata ?? {}) as Record<string, unknown>;
      setPhotoUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  async function onPick(file: File) {
    if (!isSupabaseConfigured()) {
      toast.error("Backend not configured.");
      return;
    }
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > MAX_BYTES) { toast.error("Image must be under 5 MB."); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not signed in.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;
      const upd = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (upd.error) throw upd.error;
      setPhotoUrl(publicUrl);
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const src = photoUrl ?? avatar;
  return (
    <div className="profile-card">
      <div className="profile-card-badge" aria-hidden />
      <img src={src} alt={profile.name || "Profile"} className="profile-card-img" width={768} height={1024} loading="lazy" />
      <button
        type="button"
        className="profile-card-photo-btn"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label="Change profile photo"
        title="Change profile photo"
      >
        {busy ? "…" : "📷"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
          e.target.value = "";
        }}
      />
      <div className="profile-card-meta">
        <div className="role">{profile.headline || "—"}</div>
        <div className="name">{profile.name || "—"}</div>
        <div className="meta-row">
          <span>{expLabel}</span><span className="dot" /><span>{city}</span>
        </div>
      </div>
    </div>
  );
}
