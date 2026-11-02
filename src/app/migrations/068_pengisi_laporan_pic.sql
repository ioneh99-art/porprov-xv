-- 068_pengisi_laporan_pic.sql
-- Nama & jabatan orang yang benar-benar mengisi laporan PIC (2 Nov 2026).
-- Satu kode/tautan PIC bisa dipinjam orang lain di lapangan; pelapor_nama tetap
-- menyimpan pemilik kode, kolom baru ini menyimpan si pengisi. Laporan lama: kosong.
-- Jadwal partai cukup memakai kolom teks dibuat_oleh/diubah_oleh yang sudah ada.

alter table public.laporan_hasil
  add column if not exists pengisi_nama    text,
  add column if not exists pengisi_jabatan text;

alter table public.catatan_lapangan
  add column if not exists pengisi_nama    text,
  add column if not exists pengisi_jabatan text;
