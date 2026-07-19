-- 025_j2_3_hasil_pertandingan.sql
-- Jenis 2 / J2-3 (2026-07-19) — sudah diterapkan ke live.
-- Tulis hasil_pertandingan dipindah ke /api/operator/hasil (service key, sesi operator,
-- whitelist kolom, onConflict nomor_id,atlet_id, cek cabor non-admin, audit INPUT_HASIL).
-- BONUS FIX: tambah UNIQUE(nomor_id,atlet_id) yang diniatkan kode tapi tak pernah ada
-- (upsert lama selalu error). 0 duplikat saat migrasi.
ALTER TABLE hasil_pertandingan
  ADD CONSTRAINT hasil_pertandingan_nomor_atlet_uniq UNIQUE (nomor_id, atlet_id);
DROP POLICY IF EXISTS admin_all_hasil ON hasil_pertandingan;
CREATE POLICY hasil_pertandingan_read ON hasil_pertandingan FOR SELECT TO public USING (true);
