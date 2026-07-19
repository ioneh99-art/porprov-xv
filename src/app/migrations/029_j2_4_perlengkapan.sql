-- 029_j2_4_perlengkapan.sql
-- Jenis 2 / J2-4 (2026-07-19) — sudah diterapkan ke live.
-- Tulis atlet_perlengkapan -> /api/operator/perlengkapan (service key, cek kepemilikan
-- atlet, upsert onConflict atlet_id, audit). Cabut 3 policy tulis anon; SELECT tetap.
DROP POLICY IF EXISTS perlengkapan_insert_any ON atlet_perlengkapan;
DROP POLICY IF EXISTS perlengkapan_update_any ON atlet_perlengkapan;
DROP POLICY IF EXISTS perlengkapan_delete_any ON atlet_perlengkapan;
