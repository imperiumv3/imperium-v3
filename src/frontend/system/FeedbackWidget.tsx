import { useState } from "react";
import { submitFeedback } from "@/lib/user-system.functions";
import "../admin/admin.css";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<"bug" | "feature" | "general">("general");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true); setErr(null);
    try {
      const res = await submitFeedback({ data: { category, message } });
      if (!res.ok) setErr(res.error || "Failed");
      else { setDone(true); setMessage(""); setTimeout(() => { setOpen(false); setDone(false); }, 1200); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button className="fb-fab" onClick={() => setOpen(true)}>Feedback</button>
      {open && (
        <div className="fb-modal-back" onClick={() => setOpen(false)}>
          <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send feedback</h3>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, margin: "0 0 12px" }}>
              Bug reports, feature requests, or anything else.
            </p>
            {err && <div className="admin-error">{err}</div>}
            {done ? <p style={{ color: "hsl(142 76% 36%)" }}>Thanks — feedback sent.</p> : (
              <>
                <select value={category} onChange={(e) => setCategory(e.target.value as never)}>
                  <option value="general">General</option>
                  <option value="bug">Bug report</option>
                  <option value="feature">Feature request</option>
                </select>
                <textarea
                  placeholder="What's on your mind?" value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="row">
                  <button className="admin-btn" onClick={() => setOpen(false)}>Cancel</button>
                  <button className="admin-btn primary" disabled={busy || !message.trim()} onClick={send}>
                    {busy ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
