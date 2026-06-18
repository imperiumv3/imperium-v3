import { createFileRoute } from "@tanstack/react-router";
import { MaintenancePanel } from "@frontend/admin/MaintenancePanel";

export const Route = createFileRoute("/admin/maintenance")({
  ssr: false,
  component: MaintenancePanel,
});
