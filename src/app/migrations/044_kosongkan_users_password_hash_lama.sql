-- 044_kosongkan_users_password_hash_lama.sql
-- Tahap 2 (2026-08-11) — PENUTUP bocor kredensial user. APPLIED LIVE 2026-08-11.
--
-- Prasyarat terpenuhi: kode baru (baca/tulis users_auth) SUDAH deploy di produksi
--   (dibuktikan: change-password tolak cookie palsu 401; round-trip create+login prod 200).
--   users_auth lengkap 48/48, fidelity beda=0, semua bcrypt.
--
-- Efek: kolom lama users.password_hash (anon-readable krn grant tabel) dikosongkan
--   → tak ada lagi hash admin/operator yg bisa dipanen anon. Hash aman di users_auth.
--   Diverifikasi: login admin tetap 200 setelah pengosongan.
--
-- ROLLBACK: tidak diperlukan (hash asli aman di users_auth).

UPDATE public.users SET password_hash = NULL WHERE password_hash IS NOT NULL;
