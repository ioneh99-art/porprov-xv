-- 041_atlet_auth_isolate_credential.sql
-- Tahap 2 (2026-08-11) — isolasi kredensial atlet ke tabel terpisah `atlet_auth`.
-- APPLIED LIVE via Supabase MCP 2026-08-11.
--
-- LATAR: kolom atlet.atlet_password_hash (hash password portal) bisa dibaca peran
--   `anon` karena `atlet` punya GRANT SELECT tingkat-TABEL. Revoke per-kolom TAK
--   bisa menyembunyikan 1 kolom selama grant tabel ada (grant tabel menang).
--   Solusi (keputusan owner 2026-08-11): pindahkan hash ke tabel sendiri yg
--   deny-all utk anon, lalu (pasca-deploy) kosongkan kolom lama.
--
-- Additive & aman: kode lama tetap baca kolom lama sampai kode baru deploy.
-- Backfill terverifikasi: 1097 hash tersalin, fidelity beda=0, luput=0.
--
-- ROLLBACK: DROP TABLE public.atlet_auth;

CREATE TABLE IF NOT EXISTS public.atlet_auth (
  atlet_id      integer PRIMARY KEY REFERENCES public.atlet(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atlet_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlet_auth FROM anon, authenticated;
-- Tanpa policy = deny-all utk anon/authenticated; service_role (route server) bypass RLS.

INSERT INTO public.atlet_auth (atlet_id, password_hash)
SELECT id, atlet_password_hash
FROM public.atlet
WHERE atlet_password_hash IS NOT NULL AND atlet_password_hash <> ''
ON CONFLICT (atlet_id) DO NOTHING;

-- CATATAN: pengosongan kolom lama (atlet.atlet_password_hash) ditunda ke migrasi
--   berikutnya, DIJALANKAN SETELAH kode baru (baca/tulis atlet_auth) ter-deploy,
--   supaya login produksi tidak putus di masa transisi. Lihat brief Tahap 2 §4.0.
