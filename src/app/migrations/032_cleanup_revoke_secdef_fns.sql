-- 032_cleanup_revoke_secdef_fns.sql
-- Cleanup keamanan (2026-07-20) — sudah diterapkan ke live.
-- update_user_password(uuid,text): SECURITY DEFINER, dulu executable anon, isinya
-- UPDATE users SET password_hash WHERE id=user_id TANPA cek identitas -> siapa pun bisa
-- ganti password user mana pun (eskalasi). Tak dipakai app. Dicabut dari anon/auth.
-- rls_auto_enable(): event-trigger fn, tak perlu executable langsung.
-- Teruji: anon RPC update_user_password -> 42501 permission denied.
REVOKE EXECUTE ON FUNCTION public.update_user_password(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
ALTER FUNCTION public.update_user_password(uuid, text) SET search_path = public, pg_temp;
