-- 024_j2_3_nomor_pertandingan.sql
-- Jenis 2 / J2-3 (2026-07-19) — sudah diterapkan ke live.
-- Tulis nomor_pertandingan dipindah ke /api/operator/nomor (service key, cabor dari
-- sesi, cek kepemilikan saat hapus, audit). Policy ALL -> SELECT-only (baca tetap).
-- Teruji: anon write 401, anon read OK, route POST/DELETE 200.
DROP POLICY IF EXISTS admin_all_nomor ON nomor_pertandingan;
CREATE POLICY nomor_pertandingan_read ON nomor_pertandingan FOR SELECT TO public USING (true);
