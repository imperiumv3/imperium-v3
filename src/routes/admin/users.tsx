import { createFileRoute } from "@tanstack/react-router";
import { UsersPanel } from "@frontend/admin/UsersPanel";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: UsersPanel,
});
