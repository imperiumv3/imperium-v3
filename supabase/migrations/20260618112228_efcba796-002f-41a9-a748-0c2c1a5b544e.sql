
REVOKE EXECUTE ON FUNCTION public.handle_new_user_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
