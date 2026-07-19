-- 027_j2_3_kuota_kualifikasi.sql
-- Jenis 2 / J2-3 (2026-07-19) — sudah diterapkan ke live.
-- Tulis kuota_kualifikasi -> /api/operator/kuota-kualifikasi (service key, sesi, cek
-- cabor non-admin, onConflict nomor_id,kontingen_id, audit). Policy ALL -> SELECT-only.
DROP POLICY IF EXISTS all_kuota ON kuota_kualifikasi;
CREATE POLICY kuota_kualifikasi_read ON kuota_kualifikasi FOR SELECT TO public USING (true);
