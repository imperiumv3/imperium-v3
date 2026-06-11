/**
 * Dashboard data layer — REAL DATA ONLY.
 *
 * Restores the original 3-column dashboard layout but every metric is now
 * derived from the authenticated user's applications + timeline rows in
 * Supabase. All gamification (XP, levels, coins, gems, powers, inventory)
 * has been removed. Types kept here are the contract consumed by the
 * restored panel components.
 */
import { useMemo } from "react";
import { useSession } from "@frontend/auth/session";
import { useApplicationsSync } from "@frontend/applications/data/useApplicationsData";
import { useApplicationsStore } from "@frontend/applications/state/useApplicationsStore";
import { useProfilePageData } from "@frontend/profile/profile.data";
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  ApplicationEventType,
} from "@frontend/applications/schema";

// Kept so dashboard.logic.ts keeps its public API stable.
export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type ModuleColor = "coral" | "mint" | "lavender" | "butter" | "sky" | "rose";

export interface IdentityData {
  fullName: string;
  email: string;
  title: string;
}

export interface AttributesData {
  /** Each value is 0..100. Labels are real profile signals, not RPG stats. */
  profileStrength: number;
  atsReadiness: number;
  resumeQuality: number;
  responseRate: number;
  skillsCovered: number;
}

export interface WeeklySnapshot {
  applicationsThisWeek: number;
  interviewsThisWeek: number;
  offersThisWeek: number;
  activeDays: number;
}

export interface CareerOverviewData {
  jobsDiscovered: number;
  applications: number;
  underReview: number;
  interviews: number;
  offers: number;
  responseRatePct: number;
}

export interface ActivityItem {
  id: string;
  iconKey: "resume" | "applied" | "interview" | "ats";
  label: string;
  timeAgo: string;
}

export interface DashboardData {
  identity: IdentityData;
  attributes: AttributesData;
  careerOverview: CareerOverviewData;
  weekly: WeeklySnapshot;
  recentActivity: ActivityItem[];
  loading: boolean;
  hasAnyData: boolean;
  jobsDiscoveredKnown: boolean;
}

const RESPONDED: ReadonlySet<ApplicationStatus> = new Set([
  "viewed",
  "under_review",
  "assessment",
  "interview",
  "offer",
  "rejected",
]);

function pickIcon(type: ApplicationEventType): ActivityItem["iconKey"] {
  switch (type) {
    case "interview_scheduled":
      return "interview";
    case "offer_received":
      return "ats";
    case "note_added":
      return "resume";
    case "application_submitted":
    case "status_changed":
    case "rejected":
    case "withdrawn":
    default:
      return "applied";
  }
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

function computeOverview(apps: Application[]): CareerOverviewData {
  const total = apps.length;
  const interviews = apps.filter((a) => a.status === "interview").length;
  const offers = apps.filter((a) => a.status === "offer").length;
  const underReview = apps.filter(
    (a) => a.status === "under_review" || a.status === "assessment",
  ).length;
  const responses = apps.filter((a) => RESPONDED.has(a.status)).length;
  return {
    // Until we expose a real "jobs discovered" counter via the job pipeline
    // we use applications as a known-good lower bound for the metric tile.
    jobsDiscovered: total,
    applications: total,
    underReview,
    interviews,
    offers,
    responseRatePct: total ? Math.round((responses / total) * 100) : 0,
  };
}

function buildActivity(events: ApplicationEvent[], apps: Application[]): ActivityItem[] {
  const appMap = new Map(apps.map((a) => [a.id, a]));
  return [...events]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 6)
    .map((e) => {
      const app = appMap.get(e.applicationId);
      const where = app ? `${app.role} @ ${app.company}` : "Application";
      return {
        id: e.id,
        iconKey: pickIcon(e.type),
        label: `${e.title} — ${where}`,
        timeAgo: timeAgo(e.timestamp),
      };
    });
}

export function useDashboardData(): DashboardData {
  const session = useSession();
  const { loading: appsLoading } = useApplicationsSync();
  const apps = useApplicationsStore((s) => s.applications);
  const events = useApplicationsStore((s) => s.events);
  const profilePage = useProfilePageData();

  return useMemo<DashboardData>(() => {
    const overview = computeOverview(apps);
    const skillCount = profilePage.profile?.skills?.length ?? 0;
    const skillsCovered = Math.min(100, Math.round((skillCount / 15) * 100));

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = apps.filter((a) => Date.parse(a.appliedAt) >= weekAgo);
    const recentEvents = events.filter((e) => Date.parse(e.timestamp) >= weekAgo);
    const interviewsThisWeek = recentEvents.filter((e) => e.type === "interview_scheduled").length;
    const offersThisWeek = recentEvents.filter((e) => e.type === "offer_received").length;
    const activeDays = new Set(recentEvents.map((e) => e.timestamp.slice(0, 10))).size;

    return {
      identity: {
        fullName: session?.fullName?.split(" ")[0] || "Operator",
        email: session?.email || "",
        title: profilePage.profile?.target_role || profilePage.profile?.headline || "Imperium Operator",
      },
      attributes: {
        profileStrength: profilePage.scores.strength,
        atsReadiness: profilePage.scores.atsReadiness,
        resumeQuality: profilePage.scores.resumeQuality,
        responseRate: overview.responseRatePct,
        skillsCovered,
      },
      careerOverview: overview,
      weekly: {
        applicationsThisWeek: recent.length,
        interviewsThisWeek,
        offersThisWeek,
        activeDays,
      },
      recentActivity: buildActivity(events, apps),
      loading: appsLoading || profilePage.loading,
      hasAnyData: apps.length > 0,
      jobsDiscoveredKnown: false,
    };
  }, [session, apps, events, appsLoading, profilePage]);
}
