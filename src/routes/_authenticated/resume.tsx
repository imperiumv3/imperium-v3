import { ResumePage } from "@frontend/resume/ResumePage";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ResumeSearchSchema = z.object({
  jobId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/resume")({
  validateSearch: (search: Record<string, unknown>) => ResumeSearchSchema.parse(search),
  component: () => {
    const { jobId } = Route.useSearch();
    return <ResumePage jobId={jobId} />;
  },
});
