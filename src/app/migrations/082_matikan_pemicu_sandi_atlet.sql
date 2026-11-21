-- 082_matikan_pemicu_sandi_atlet.sql — 21 Nov 2026, APPLIED LIVE.
-- Menutup bocor laten sandi atlet:
--   pemicu trg_generate_atlet_credentials (BEFORE UPDATE atlet) menulis 4 digit terakhir NIK
--   MENTAH ke atlet.atlet_password_hash + portal_aktif=true setiap status_registrasi berubah ke
--   Verified/Posted, sementara kolom itu masih ber-GRANT SELECT untuk anon → setiap verifikasi
--   lewat /api/verifikasi akan membuat sandi atlet terbaca publik.
-- Sejak migrasi 041/042 sandi disimpan di atlet_auth (tak terbaca anon) dan kolom lama dikosongkan
-- (per 21 Nov: 0 baris terisi). Atlet yang baru Verified membuat sandi sendiri lewat
-- /api/atlet/register (portal_aktif masih false → boleh daftar), jadi pemicu tidak dibutuhkan.
--
-- ROLLBACK (tidak disarankan): buat ulang fungsi & pemicu dari definisi lama di bawah,
--   lalu GRANT SELECT (atlet_password_hash) ON public.atlet TO anon, authenticated.
--   Definisi lama: IF NEW.status_registrasi IN ('Verified','Posted') AND OLD.status_registrasi
--   IS DISTINCT FROM NEW.status_registrasi AND NEW.atlet_password_hash IS NULL THEN
--   NEW.atlet_password_hash := RIGHT(COALESCE(NEW.no_ktp,'0000'),4); NEW.portal_aktif := true; END IF;

drop trigger if exists trg_generate_atlet_credentials on public.atlet;
drop function if exists public.generate_atlet_credentials();

-- Kolom sandi lama tidak boleh terbaca/tertulis lewat kunci publik.
revoke select (atlet_password_hash), insert (atlet_password_hash), update (atlet_password_hash), references (atlet_password_hash)
  on public.atlet from anon, authenticated;
