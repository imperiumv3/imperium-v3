import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementsPanel } from "@frontend/admin/AnnouncementsPanel";

export const Route = createFileRoute("/admin/announcements")({
  ssr: false,
  component: AnnouncementsPanel,
});
