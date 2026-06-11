/**
 * Server functions for the Application Jobs pipeline.
 *
 * An application_job is the *execution record* for one automation attempt.
 * The user-facing applications row stays unchanged; retries create new jobs
 * pointing at the same application_id.
 *
 * Tables `application_jobs` and `application_job_events` were added in a
 * migration after DatabaseTypes was generated, so we type the supabase
 * client as `any` here.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@backend/database/AuthMiddleware";

export type ApplicationJobStatus =
  | "queued"
  | "dispatching"
  | "running"
  | "awaiting_human"
  | "submitted"
  | "failed"
  | "cancelled"
  | "agent_offline";

const TERMINAL: ApplicationJobStatus[] = ["submitted", "failed", "cancelled", "agent_offline"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
type JsonObject = { [k: string]: JsonValue };

const j = (v: unknown): JsonValue => JSON.parse(JSON.stringify(v ?? null)) as JsonValue;
const jObj = (v: unknown): JsonObject => {
  const out = j(v);
  return out && typeof out === "object" && !Array.isArray(out) ? (out as JsonObject) : {};
};

/* ---------- enqueue ---------- */

const EnqueueInput = z.object({
  applicationId: z.string().uuid(),
  jobUrl: z.string().min(1),
  jobSource: z.string().default("other"),
  resumeVersion: z.string().default(""),
  resumePdfBase64: z.string().optional(),
  resumeFilename: z.string().default("resume.pdf"),
  jobMeta: z.record(z.unknown()).default({}),
  profileSnapshot: z.record(z.unknown()).default({}),
  answers: z.record(z.unknown()).default({}),
});

export const enqueueApplicationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EnqueueInput.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;

    let resumePdfPath = "";
    if (data.resumePdfBase64) {
      const bytes = Uint8Array.from(atob(data.resumePdfBase64), (c) => c.charCodeAt(0));
      const path = `${userId}/${data.applicationId}/${Date.now()}-${data.resumeFilename}`;
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (!upErr) resumePdfPath = path;
      // upload failures are non-fatal — agent still receives base64 in payload.
    }

    const payload = {
      application_id: data.applicationId,
      user_id: userId,
      job: { url: data.jobUrl, source: data.jobSource, ...data.jobMeta },
      resume: {
        version: data.resumeVersion,
        pdf_base64: data.resumePdfBase64 ?? "",
        filename: data.resumeFilename,
        storage_path: resumePdfPath,
      },
      profile: data.profileSnapshot,
      answers: data.answers,
    };

    const { data: row, error } = await supabase
      .from("application_jobs")
      .insert({
        user_id: userId,
        application_id: data.applicationId,
        status: "queued",
        current_step: "queued",
        job_url: data.jobUrl,
        job_source: data.jobSource,
        resume_pdf_path: resumePdfPath,
        resume_version: data.resumeVersion,
        payload,
        attempts: 1,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const jobId = (row as { id: string }).id;

    await supabase.from("application_job_events").insert({
      user_id: userId,
      job_id: jobId,
      level: "info",
      step: "queued",
      message: `Queued for ${data.jobSource}`,
      url: data.jobUrl,
    });

    return { jobId, payload: JSON.parse(JSON.stringify(payload)) as Record<string, unknown> };
  });

/* ---------- status / event mutations ---------- */

const StatusInput = z.object({
  jobId: z.string().uuid(),
  status: z.enum([
    "queued", "dispatching", "running", "awaiting_human",
    "submitted", "failed", "cancelled", "agent_offline",
  ]),
  currentStep: z.string().optional(),
  agentRunId: z.string().optional(),
  pendingQuestion: z.record(z.unknown()).nullable().optional(),
  error: z.record(z.unknown()).nullable().optional(),
});

export const updateApplicationJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StatusInput.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.currentStep !== undefined) patch.current_step = data.currentStep;
    if (data.agentRunId !== undefined) patch.agent_run_id = data.agentRunId;
    if (data.pendingQuestion !== undefined) patch.pending_question = data.pendingQuestion;
    if (data.error !== undefined) patch.error = data.error;
    if (data.status === "running" && data.currentStep !== "queued") patch.started_at = new Date().toISOString();
    if (TERMINAL.includes(data.status)) patch.finished_at = new Date().toISOString();

    const { error } = await supabase
      .from("application_jobs")
      .update(patch)
      .eq("id", data.jobId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const EventInput = z.object({
  jobId: z.string().uuid(),
  level: z.enum(["info", "success", "warn", "error"]).default("info"),
  step: z.string().default(""),
  message: z.string().default(""),
  url: z.string().default(""),
  screenshotUrl: z.string().default(""),
  ts: z.string().optional(),
});

export const appendApplicationJobEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EventInput.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    const { error } = await supabase.from("application_job_events").insert({
      user_id: userId,
      job_id: data.jobId,
      level: data.level,
      step: data.step,
      message: data.message,
      url: data.url,
      screenshot_url: data.screenshotUrl,
      ...(data.ts ? { ts: data.ts } : {}),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- queries ---------- */

const ListInput = z.object({ applicationId: z.string().uuid().optional() }).default({});

export const listApplicationJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListInput.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    let q = supabase
      .from("application_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data.applicationId) q = q.eq("application_id", data.applicationId);
    const { data: rows, error } = await q.limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<Record<string, unknown>>;
  });

const EventsInput = z.object({
  jobId: z.string().uuid(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const listApplicationJobEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EventsInput.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    const { data: rows, error } = await supabase
      .from("application_job_events")
      .select("*")
      .eq("user_id", userId)
      .eq("job_id", data.jobId)
      .order("ts", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<Record<string, unknown>>;
  });

/* ---------- retry ---------- */

const RetryInput = z.object({ jobId: z.string().uuid() });

export const retryApplicationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RetryInput.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    const { data: prev, error: rErr } = await supabase
      .from("application_jobs")
      .select("*")
      .eq("id", data.jobId)
      .eq("user_id", userId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!prev) throw new Error("Job not found");

    const row = prev as Record<string, unknown>;
    const { data: created, error: iErr } = await supabase
      .from("application_jobs")
      .insert({
        user_id: userId,
        application_id: row.application_id as string,
        status: "queued",
        current_step: "queued",
        job_url: row.job_url as string,
        job_source: row.job_source as string,
        resume_pdf_path: row.resume_pdf_path as string,
        resume_version: row.resume_version as string,
        payload: row.payload,
        attempts: ((row.attempts as number) ?? 0) + 1,
      })
      .select("*")
      .single();
    if (iErr) throw new Error(iErr.message);
    return created as Record<string, unknown>;
  });
