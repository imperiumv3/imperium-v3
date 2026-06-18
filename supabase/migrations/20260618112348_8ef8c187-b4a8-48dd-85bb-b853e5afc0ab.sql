
CREATE OR REPLACE FUNCTION public.verify_admin_password(_email TEXT, _password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE lower(email) = lower(_email)
      AND password_hash = crypt(_password, password_hash)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.verify_admin_password(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT, TEXT) TO service_role;
