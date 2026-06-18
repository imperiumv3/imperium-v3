import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@frontend/admin/AdminDashboard";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});
