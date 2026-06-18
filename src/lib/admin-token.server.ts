// Server-only admin token issue/verify using HMAC-SHA256.
// Token format: base64url(JSON{email,exp,src}).base64url(hmac)
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "imperium-admin-dev-secret-change-me"
  );
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf as never)
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export type AdminClaims = { email: string; exp: number; src: "supabase" | "local" };

export function issueAdminToken(email: string, src: "supabase" | "local"): string {
  const payload: AdminClaims = { email, exp: Date.now() + TOKEN_TTL_MS, src };
  const head = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret()).update(head).digest());
  return `${head}.${sig}`;
}

export function verifyAdminToken(token: string | null | undefined): AdminClaims | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [head, sig] = parts;
  const expected = createHmac("sha256", secret()).update(head).digest();
  const got = b64urlDecode(sig);
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(head).toString("utf8")) as AdminClaims;
    if (!payload?.email || !payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
