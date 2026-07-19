-- 026_j2_3_kualifikasi_atlet.sql
-- Jenis 2 / J2-3 (2026-07-19) — sudah diterapkan ke live.
-- Tulis kualifikasi_atlet dipindah ke /api/operator/kualifikasi (service key, sesi
-- operator, op=upsert|update, cek cabor non-admin, audit). Policy ALL -> SELECT-only.
DROP POLICY IF EXISTS all_kualifikasi ON kualifikasi_atlet;
CREATE POLICY kualifikasi_atlet_read ON kualifikasi_atlet FOR SELECT TO public USING (true);
