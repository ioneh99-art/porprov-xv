-- 056_laporan_lawan_jam.sql
-- Dua isian tambahan pada laporan hasil lapangan, supaya jurnal bisa dicetak
-- dalam format "Matrix Jadwal Harian" KONI Kab. Bandung, yang memuat kolom
-- Jam dan Lawan.
--
-- Keduanya boleh kosong: PIC di lapangan tidak selalu tahu nama lawan, dan
-- bila jam tidak diisi, jurnal memakai jam laporan dikirim.

alter table public.laporan_hasil add column if not exists lawan text;
alter table public.laporan_hasil add column if not exists jam   text;

alter table public.laporan_hasil drop constraint if exists laporan_hasil_jam_bentuk;
alter table public.laporan_hasil add constraint laporan_hasil_jam_bentuk
  check (jam is null or jam ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

comment on column public.laporan_hasil.lawan is 'Lawan atau pesaing terdekat, ditulis bebas oleh PIC. Boleh kosong.';
comment on column public.laporan_hasil.jam   is 'Jam pertandingan (HH:MM, WIB). Kosong = jurnal memakai jam laporan dikirim.';
