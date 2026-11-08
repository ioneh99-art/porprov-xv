-- 076_kode_pic_tersimpan.sql
-- Kode PIC bisa dilihat & disalin ulang oleh admin (8 Nov 2026, permintaan KONI Kab. Bandung:
-- banyak tautan kode belum sempat dikirim ke cabor, padahal kode hanya tampil sekali).
-- kode_sandi = kode yang disandikan AES-GCM di server (kuncinya diturunkan dari rahasia server,
-- tidak ada di database). Tabel ini hanya bisa dibaca service_role. kode_hash tetap dipakai
-- untuk mencocokkan kode saat PIC masuk.

alter table public.lapor_akses add column if not exists kode_sandi text;
