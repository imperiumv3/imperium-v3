
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- admin_users
-- =========================================================
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- no policies for anon/authenticated => fully locked at the API layer

-- Seed default admin
INSERT INTO public.admin_users (email, password_hash)
VALUES (
  'admin@imperium.local',
  crypt('Admin@9398', gen_salt('bf', 10))
)
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- user_status
-- =========================================================
CREATE TABLE public.user_status (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_status TO authenticated;
GRANT ALL ON public.user_status TO service_role;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own status"
  ON public.user_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-create ACTIVE row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_status (user_id, status)
  VALUES (NEW.id, 'ACTIVE')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_status ON auth.users;
CREATE TRIGGER on_auth_user_created_status
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_status();

-- Backfill rows for existing users
INSERT INTO public.user_status (user_id, status)
SELECT id, 'ACTIVE' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================
-- announcements
-- =========================================================
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );

-- =========================================================
-- maintenance_mode (singleton)
-- =========================================================
CREATE TABLE public.maintenance_mode (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL DEFAULT 'We are performing scheduled maintenance. Please check back soon.',
  expected_return TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.maintenance_mode TO anon, authenticated;
GRANT ALL ON public.maintenance_mode TO service_role;
ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read maintenance status"
  ON public.maintenance_mode FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.maintenance_mode (id, is_enabled, message)
VALUES (1, false, 'We are performing scheduled maintenance. Please check back soon.')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- feedback
-- =========================================================
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_admin_users_updated BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_user_status_updated BEFORE UPDATE ON public.user_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_maintenance_updated BEFORE UPDATE ON public.maintenance_mode
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
