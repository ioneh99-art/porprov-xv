-- 021_cabut_insert_anon_atlet.sql
-- Fase B2 (2026-07-19, disetujui user) — sudah diterapkan ke live.
-- Cabut izin INSERT anon di tabel atlet: pembuatan atlet kini WAJIB lewat route
-- server (service_role) yang tervalidasi: /api/atlet/create, /api/atlet/bulk-create,
-- /api/import. Policy SELECT/UPDATE/self-read (anon/browser) TETAP dipertahankan.
-- Terbukti: insert anon langsung -> ditolak RLS (42501); route server -> sukses.
DROP POLICY IF EXISTS konida_insert_atlet ON atlet;
