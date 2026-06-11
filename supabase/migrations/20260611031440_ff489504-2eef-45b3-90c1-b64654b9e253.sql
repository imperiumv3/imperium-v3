
-- application_jobs: automation execution record (separate from user-facing applications row)
CREATE TABLE public.application_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  current_step text NOT NULL DEFAULT 'queued',
  agent_run_id text NOT NULL DEFAULT '',
  job_url text NOT NULL DEFAULT '',
  job_source text NOT NULL DEFAULT 'other',
  resume_pdf_path text NOT NULL DEFAULT '',
  resume_version text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  pending_question jsonb,
  error jsonb,
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_jobs TO authenticated;
GRANT ALL ON public.application_jobs TO service_role;

ALTER TABLE public.application_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY application_jobs_select_own ON public.application_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY application_jobs_insert_own ON public.application_jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY application_jobs_update_own ON public.application_jobs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY application_jobs_delete_own ON public.application_jobs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX application_jobs_user_idx ON public.application_jobs(user_id, created_at DESC);
CREATE INDEX application_jobs_application_idx ON public.application_jobs(application_id);

CREATE TRIGGER application_jobs_set_updated_at
  BEFORE UPDATE ON public.application_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- application_job_events: append-only timeline
CREATE TABLE public.application_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.application_jobs(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'info',
  step text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  screenshot_url text NOT NULL DEFAULT ''
);

GRANT SELECT, INSERT, DELETE ON public.application_job_events TO authenticated;
GRANT ALL ON public.application_job_events TO service_role;

ALTER TABLE public.application_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY application_job_events_select_own ON public.application_job_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY application_job_events_insert_own ON public.application_job_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY application_job_events_delete_own ON public.application_job_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX application_job_events_job_idx ON public.application_job_events(job_id, ts);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_job_events;
