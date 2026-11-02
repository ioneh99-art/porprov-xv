-- 067_tutup_kontak_atlet.sql
-- Menutup HP, telepon, email, dan kecamatan atlet dari kunci anon (2 Nov 2026).
--
-- SEBELUM: keempat kolom ini masih terbaca kunci anon — langsung dari tabel
-- atlet (hak per kolom dari migrasi 052) dan lewat view atlet_umum. Selama
-- kolomnya kosong tidak ada yang bocor; sebelum diisi dari ekspor portal
-- (± 1.100 nomor HP & email), pintunya ditutup dulu.
--
-- SESUDAH: kolomnya dikeluarkan dari atlet_umum dan hak bacanya dicabut dari
-- anon & authenticated. Halaman KONIDA mengambilnya lewat /api/konida/atlet-pii
-- (bergerbang sesi), seperti NIK & rekening.
--
-- MEMBATALKAN: grant select (no_hp, telepon, email, kecamatan) on public.atlet
-- to anon, authenticated; lalu buat ulang atlet_umum dengan kolom-kolom itu.

drop view if exists public.atlet_umum;
do $$
declare kol text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into kol
  from information_schema.columns
  where table_schema='public' and table_name='atlet'
    and column_name not in ('no_ktp','no_rekening','nama_bank','no_hp','telepon','email','kecamatan');
  execute format(
    'create view public.atlet_umum with (security_invoker = true) as select %s from public.atlet', kol);
  execute 'grant select on public.atlet_umum to anon, authenticated';
end $$;

revoke select (no_hp, telepon, email, kecamatan) on public.atlet from anon;
revoke select (no_hp, telepon, email, kecamatan) on public.atlet from authenticated;
