-- 042_kosongkan_atlet_password_hash_lama.sql
-- Tahap 2 (2026-08-11) — PENUTUP bocor kredensial atlet. APPLIED LIVE 2026-08-11.
--
-- Prasyarat terpenuhi sebelum dijalankan:
--   1. Kode baru (baca/tulis atlet_auth) SUDAH deploy di produksi (migration 041 + kode).
--   2. Dibuktikan: login produksi password benar → 200, password salah → 401 "Password salah".
--   3. atlet_auth lengkap: 1097/1097 hash, fidelity beda=0, semua valid bcrypt.
--
-- Efek: kolom lama atlet.atlet_password_hash (yang anon-readable krn grant tabel)
--   dikosongkan → tak ada lagi hash yg bisa dipanen anon. Row-visibility tak berubah;
--   hanya isi kolom kredensial yg hilang (sudah aman tersimpan di atlet_auth).
--   Diverifikasi: login akun tetap 200 setelah pengosongan.
--
-- ROLLBACK: tidak diperlukan (hash asli tetap ada di atlet_auth). Kolom lama sengaja
--   dibiarkan kosong; penghapusan kolom dpt dilakukan di masa depan setelah dipastikan
--   tak ada kode yg mereferensikannya.

UPDATE public.atlet SET atlet_password_hash = NULL
WHERE atlet_password_hash IS NOT NULL;
