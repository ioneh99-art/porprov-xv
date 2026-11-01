-- 064_alarm_beda_data.sql
-- Alarm beda data: hasil laga di situs panitia dibandingkan dengan laporan kita.
-- skor_sebelum/berubah_at mencatat bila panitia mengoreksi skor setelah dibaca;
-- dicek_* menyimpan perbandingan yang sudah ditandai "sudah dicek" oleh KONIDA
-- (satu kunci per baris; kunci berubah bila salah satu sisi berubah, sehingga alarm
-- muncul lagi dengan sendirinya).

alter table public.hasil_luar
  add column if not exists skor_sebelum text,
  add column if not exists berubah_at   timestamptz,
  add column if not exists dicek_kunci  text,
  add column if not exists dicek_oleh   text,
  add column if not exists dicek_at     timestamptz;
