-- 043_users_auth_isolate_credential.sql
-- Tahap 2 (2026-08-11) — isolasi kredensial user (admin/operator) ke tabel `users_auth`.
-- APPLIED LIVE via Supabase MCP 2026-08-11.
--
-- LATAR: users.password_hash bocor anon (grant SELECT tingkat-tabel, sama kasus atlet).
--   Revoke per-kolom tak mempan. Solusi: pindah hash ke tabel sendiri deny-all anon.
-- Additive & aman: kode lama tetap baca users.password_hash sampai kode baru deploy.
-- Backfill terverifikasi: 48/48 user, fidelity beda=0, semua bcrypt.
--
-- ROLLBACK: DROP TABLE public.users_auth; ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.users_auth (
  user_id       uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users_auth FROM anon, authenticated;
-- Tanpa policy = deny-all utk anon/authenticated; service_role (route server) bypass RLS.

INSERT INTO public.users_auth (user_id, password_hash)
SELECT id, password_hash
FROM public.users
WHERE password_hash IS NOT NULL AND password_hash <> ''
ON CONFLICT (user_id) DO NOTHING;

-- Longgarkan NOT NULL supaya kolom lama bisa dikosongkan pasca-deploy (migration 044).
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
