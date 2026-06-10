import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@backend/database/SupabaseClient";
import { IconUser } from "./icons";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface Props {
  fullName: string;
  size?: number;
}

/** Profile photo upload / replace / remove. Stores the file in the
 *  `avatars` storage bucket and writes the private file path into
 *  `auth.users.user_metadata.avatar_path` so it survives sign-out and
 *  is shared across the app without a separate column. */
export function AvatarUploader({ fullName, size = 56 }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const syncAvatar = useCallback(async (meta: Record<string, unknown>) => {
    const avatarPath = typeof meta.avatar_path === "string" ? meta.avatar_path : "";
    if (avatarPath) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(avatarPath, 60 * 60);
      setUrl(signed?.signedUrl ?? null);
      return;
    }
    setUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : null);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      void syncAvatar(meta);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const meta = (s?.user?.user_metadata ?? {}) as Record<string, unknown>;
      void syncAvatar(meta);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [syncAvatar]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initials = (fullName || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function onPick(file: File) {
    if (!isSupabaseConfigured()) {
      toast.error("Backend not configured. Connect Lovable Cloud to upload avatars.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not signed in.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (signedError) throw signedError;
      const upd = await supabase.auth.updateUser({ data: { avatar_path: path } });
      if (upd.error) throw upd.error;
      setUrl(signed.signedUrl);
      toast.success("Profile photo updated.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function onRemove() {
    if (!isSupabaseConfigured()) return;
    setBusy(true);
    try {
      const upd = await supabase.auth.updateUser({ data: { avatar_url: null, avatar_path: null } });
      if (upd.error) throw upd.error;
      setUrl(null);
      toast.success("Profile photo removed.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not remove photo.");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={url ? "Change profile photo" : "Upload profile photo"}
        style={{
          width: size, height: size, borderRadius: "50%",
          border: "none", padding: 0, cursor: "pointer",
          background: "var(--dash-coral-soft)", color: "var(--dash-coral)",
          display: "grid", placeItems: "center", overflow: "hidden",
          boxShadow: "var(--dash-shadow)",
        }}
        disabled={busy}
      >
        {url ? (
          <img src={url} alt={fullName || "Avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initials ? (
          <span style={{ fontWeight: 800, fontSize: size * 0.36 }}>{initials}</span>
        ) : (
          <IconUser width={size * 0.5} height={size * 0.5} />
        )}
      </button>
      {menuOpen && (
        <div className="dash-settings-pop" style={{ top: size + 6, right: 0, minWidth: 160 }}>
          <button onClick={() => fileRef.current?.click()} disabled={busy}>
            {url ? "Replace photo" : "Upload photo"}
          </button>
          {url && (
            <button onClick={onRemove} disabled={busy} style={{ color: "var(--dash-coral)" }}>
              Remove photo
            </button>
          )}
        </div>
      )}
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
    </div>
  );
}
