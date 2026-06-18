import { createFileRoute } from "@tanstack/react-router";
import { FeedbackPanel } from "@frontend/admin/FeedbackPanel";

export const Route = createFileRoute("/admin/feedback")({
  ssr: false,
  component: FeedbackPanel,
});
