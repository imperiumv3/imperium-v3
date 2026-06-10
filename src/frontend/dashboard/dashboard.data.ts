/**
 * Dashboard data layer — REAL DATA ONLY.
 *
 * All gamification (XP, levels, coins, gems, powers, attributes, fake
 * activity, fake KPIs) was removed in the V3 cleanup. The dashboard now
 * derives every metric from the authenticated user's applications +
 * timeline rows in Supabase. Zero-state is honest: counts render as 0 with
 * helpful CTAs when the user has not yet applied to anything.
 */
import { useMemo } from "react";
import { useSession } from "@frontend/auth/session";
import {
  useApplicationsSync,
} from "@frontend/applications/data/useApplicationsData";
import { useApplicationsStore } from "@frontend/applications/state/useApplicationsStore";
import type { Application, ApplicationEvent, ApplicationStatus } from "@frontend/applications/schema";

export interface DashboardIdentity {
  fullName: string;
  email: string;
}

export interface DashboardKpis {
  applicationsSubmitted: number;
  underReview: number;
  interviews: number;
  offers: number;
  responseRate: number; // 0..1
  active: number;
}

export interface DashboardActivityItem {
  id: string;
  label: string;
  timeAgo: string;
  status?: ApplicationStatus;
}

export interface DashboardData {
  identity: DashboardIdentity;
  kpis: DashboardKpis;
  recentActivity: DashboardActivityItem[];
  loading: boolean;
  hasAnyData: boolean;
}

const RESPONDED: ReadonlySet<ApplicationStatus> = new Set([
  "viewed",
  "under_review",
  "assessment",
  "interview",
  "offer",
  "rejected",
]);

const ACTIVE: ReadonlySet<ApplicationStatus> = new Set([
  "applied",
  "viewed",
  "under_review",
  "assessment",
  "interview",
  "offer",
]);

function computeKpis(apps: Application[]): DashboardKpis {
  const total = apps.length;
  const interviews = apps.filter((a) => a.status === "interview").length;
  const offers = apps.filter((a) => a.status === "offer").length;
  const underReview = apps.filter(
    (a) => a.status === "under_review" || a.status === "assessment",
  ).length;
  const responses = apps.filter((a) => RESPONDED.has(a.status)).length;
  const active = apps.filter((a) => ACTIVE.has(a.status)).length;
  return {
    applicationsSubmitted: total,
    underReview,
    interviews,
    offers,
    responseRate: total ? responses / total : 0,
    active,
  };
}

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function buildActivity(events: ApplicationEvent[], apps: Application[]): DashboardActivityItem[] {
  const appMap = new Map(apps.map((a) => [a.id, a]));
  return [...events]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 6)
    .map((e) => {
      const app = appMap.get(e.applicationId);
      const where = app ? `${app.role} @ ${app.company}` : "Application";
      return {
        id: e.id,
        label: `${e.title} — ${where}`,
        timeAgo: timeAgo(e.timestamp),
        status: app?.status,
      };
    });
}

export function useDashboardData(): DashboardData {
  const session = useSession();
  const { loading } = useApplicationsSync();
  const apps = useApplicationsStore((s) => s.applications);
  const events = useApplicationsStore((s) => s.events);

  return useMemo<DashboardData>(() => {
    const kpis = computeKpis(apps);
    return {
      identity: {
        fullName: session?.fullName?.split(" ")[0] || "there",
        email: session?.email || "",
      },
      kpis,
      recentActivity: buildActivity(events, apps),
      loading,
      hasAnyData: apps.length > 0,
    };
  }, [session, apps, events, loading]);
}
