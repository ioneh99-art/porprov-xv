-- 020_cleanup_fase_a.sql
-- Fase A remediasi (2026-07-19) — cleanup ringan, non-destruktif. Sudah diterapkan ke live.

-- A2. Sinkronkan is_posted: 108 atlet berstatus 'Posted' tapi is_posted=false.
--     Alur posting ke depan sudah set keduanya di /api/verifikasi (action='posting').
UPDATE atlet SET is_posted = true
WHERE status_registrasi = 'Posted' AND (is_posted IS DISTINCT FROM true);

-- A3. Tandai tabel cabor legacy (ruang cabor_master) yang tak dipanggil kode app.
--     Kanonik operasional = cabang_olahraga. cabor_kuota TIDAK ditandai (dipakai
--     /api/atlet/create untuk cek kuota soft).
COMMENT ON TABLE cabor_master IS
  'LEGACY/DEAD (2026-07-19): ruang id 1-108 beda dari cabang_olahraga (kanonik operasional). Tidak dipanggil kode app. Jangan pakai untuk fitur baru.';
COMMENT ON TABLE operator_cabor IS
  'LEGACY/DEAD (2026-07-19): kosong (0 baris), tidak dipanggil kode. Role operator disimpan di users.role/users.cabor_id (ruang cabang_olahraga).';
