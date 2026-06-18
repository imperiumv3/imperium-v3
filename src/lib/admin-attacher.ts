// Function middleware that attaches the admin token from localStorage on every server fn call.
// The server side only trusts the token after HMAC verification via verifyAdminToken().
import { createMiddleware } from "@tanstack/react-start";

export const attachAdminToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("imperium_admin_session");
        if (raw) token = (JSON.parse(raw) as { token?: string })?.token || null;
      } catch { /* ignore */ }
    }
    return next({ headers: token ? { "x-admin-token": token } : {} });
  },
);
