-- 059_jadwal_tampil_publik.sql
-- Halaman publik jadwal kontingen (kab-bandung.vercel.app, tanpa login)
-- hanya menampilkan baris jadwal_cabor yang tampil_publik = true. Admin
-- menyalakan/mematikannya dari halaman Kelola Jadwal.
--
-- Sejak 21 Okt 2026 isi halaman publik mengikuti berkas "Matriks Jadwal
-- Harian" KONI Kab. Bandung. Enam baris lama tidak ada di matriks itu dan
-- disembunyikan (tetap ada untuk admin):
--   Aerosport - Paramotor, Akuatik - Renang (kembaran tanggal lama dari
--   "Aquatic - Renang"), Marathon, Aerosport - Terbang Layang,
--   Akuatik - Loncat Indah, Ice Skating.

alter table public.jadwal_cabor
  add column if not exists tampil_publik boolean not null default true;

comment on column public.jadwal_cabor.tampil_publik is
  'true = tampil di halaman publik jadwal kontingen (tanpa login).';

update public.jadwal_cabor set tampil_publik = false
where cabor_disiplin in ('Aerosport - Paramotor', 'Akuatik - Renang', 'Marathon',
                         'Aerosport - Terbang Layang', 'Akuatik - Loncat Indah', 'Ice Skating');
