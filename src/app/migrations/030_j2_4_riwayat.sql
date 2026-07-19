-- 030_j2_4_riwayat.sql
-- Jenis 2 / J2-4 (2026-07-19) — sudah diterapkan ke live.
-- Tulis riwayat_kejuaraan (verif) & riwayat_prestasi (insert) -> /api/operator/riwayat
-- (service key, cek kepemilikan atlet, whitelist, audit).
DROP POLICY IF EXISTS public_all_riwayat ON riwayat_kejuaraan;
CREATE POLICY riwayat_kejuaraan_read ON riwayat_kejuaraan FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS riwayat_all ON riwayat_prestasi;
DROP POLICY IF EXISTS riwayat_prestasi_insert_authenticated ON riwayat_prestasi;
