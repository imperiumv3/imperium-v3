import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginPage } from "@frontend/admin/AdminLoginPage";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLoginPage,
});
