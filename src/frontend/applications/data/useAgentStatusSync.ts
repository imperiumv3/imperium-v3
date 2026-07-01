/**
 * useAgentStatusSync — polls the local Python agent for application run
 * status and syncs completed submissions back to the Supabase tracker.
 *
 * Finds applications with `agentRunId` and status "applied", polls the
 * local agent endpoint, and when a run completes (submitted/failed),
 * updates the Supabase application status accordingly.
 */
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useApplicationsStore, APPLICATIONS_DATA_EVENT } from "../state/useApplicationsStore";
import { updateApplicationStatus as updateStatusFn } from "@backend/api/imperium.api";

const POLL_INTERVAL = 10_000; // 10 seconds

interface AgentRunStatus {
  status: string;
  progress: number;
  current_step: string;
  current_action: string;
  error?: string;
}

async function fetchAgentStatus(jobId: string): Promise<AgentRunStatus | null> {
  try {
    const base = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_LOCAL_AGENT_URL) || "http://127.0.0.1:8000";
    const res = await fetch(`${base}/status/${jobId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useAgentStatusSync() {
  const updateStatus = useServerFn(updateStatusFn);
  const syncedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(async () => {
      const apps = useApplicationsStore.getState().applications;

      // Find apps with agentRunId that are still "applied" (not yet synced)
      const pending = apps.filter(
        (a) =>
          a.agentRunId &&
          a.status === "applied" &&
          !syncedRef.current.has(a.agentRunId),
      );

      for (const app of pending) {
        if (!app.agentRunId) continue;

        const run = await fetchAgentStatus(app.agentRunId);
        if (!run) continue;

        if (run.status === "submitted") {
          syncedRef.current.add(app.agentRunId);
          try {
            await updateStatus({ data: { id: app.id, status: "submitted" } });
            window.dispatchEvent(new CustomEvent(APPLICATIONS_DATA_EVENT));
          } catch (e) {
            console.error("[AgentSync] Failed to update status:", e);
          }
        } else if (run.status === "failed") {
          syncedRef.current.add(app.agentRunId);
          // Keep status as "applied" but note the failure
          try {
            await updateStatus({ data: { id: app.id, status: "applied" } });
            window.dispatchEvent(new CustomEvent(APPLICATIONS_DATA_EVENT));
          } catch {
            // swallow
          }
        }
        // "running", "awaiting_approval" — keep polling
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [updateStatus]);
}
