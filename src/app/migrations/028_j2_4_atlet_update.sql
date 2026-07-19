-- 028_j2_4_atlet_update.sql
-- Jenis 2 / J2-4 (2026-07-19) — sudah diterapkan ke live.
-- Update atlet dipindah ke /api/atlet/edit (service key, cek kepemilikan kontingen/cabor,
-- whitelist kolom tanpa id/kontingen_id, audit UPDATE_ATLET). Cabut policy UPDATE anon.
-- atlet: INSERT (Fase B) + UPDATE (ini) service-only; SELECT anon tetap.
-- Teruji: anon update 0 baris, route own 200, cross-kontingen 403.
DROP POLICY IF EXISTS konida_update_atlet ON atlet;
