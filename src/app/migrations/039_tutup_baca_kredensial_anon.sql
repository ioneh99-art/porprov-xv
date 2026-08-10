-- 039_tutup_baca_kredensial_anon.sql
-- Tahap 1c (2026-08-10) — tutup baca anon tabel kredensial. Applied live.
--
-- atlet_accounts: policy SELECT public USING(true) mengekspos password_hash ke anon.
--   Verifikasi: TAK ada pembaca browser ('use client') — hanya dibaca api/atlet/login
--   (server, service key → bypass RLS). Aman ditutup.
--
-- CATATAN — `users` SENGAJA TIDAK ditutup di sini: 4 halaman superadmin
--   (superadmin/page, /tenants, /system, /users) MASIH membaca `users` dari BROWSER
--   via anon key. Menutup sekarang akan mematikan UI itu. Pindahkan baca ke server
--   dulu = TAHAP 2. (Sesuai aturan §0.3: jangan tutup bila ada pembaca browser.)
--
-- ROLLBACK:
--   CREATE POLICY public_read_atlet_accounts ON atlet_accounts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS public_read_atlet_accounts ON atlet_accounts;
