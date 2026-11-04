-- 071: satu cabor (atau satu disiplin cabor) hanya boleh punya SATU kode PIC aktif.
-- Kunci terakhir di database; aplikasi sudah menolak lebih dulu dengan pesan yang jelas.
-- Kode koordinator (disiplin kosong) & kode per disiplin tetap boleh berdampingan.
-- Jalur 'konida' (Input Langsung tanpa kode) tidak ikut.
create unique index if not exists lapor_akses_satu_kode_aktif
  on public.lapor_akses (kontingen_id, cabor_id, coalesce(disiplin, ''))
  where aktif and jalur = 'pic';
