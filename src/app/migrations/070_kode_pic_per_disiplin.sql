-- 070_kode_pic_per_disiplin.sql
-- Kode PIC per disiplin (4 Nov 2026, permintaan KONI Kab. Bandung): cabor dengan
-- beberapa disiplin (Akuatik: Polo Air/Renang/OWS/Renang Artistik, Dayung, dll.)
-- dipegang PIC berbeda. disiplin = nilai pendaftaran_nomor.disiplin; kosong = semua
-- disiplin cabor itu (kode lama / koordinator cabor tetap berlaku seperti biasa).

alter table public.lapor_akses add column if not exists disiplin text;
