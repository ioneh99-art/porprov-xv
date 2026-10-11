-- 054_bucket_bukti_hasil.sql
-- Wadah foto bukti laporan hasil lapangan (lembar hasil, podium).
--
-- public = false: lembar hasil memuat nama atlet kontingen lain dan belum
-- tentu sudah disahkan, jadi tidak boleh terbaca lewat alamat langsung.
-- Fotonya hanya keluar lewat rute server yang memeriksa sesi KONIDA.
--
-- Batas 3 MB: foto dikecilkan di HP PIC ke beberapa ratus KB sebelum dikirim;
-- batas ini jaring pengaman bila ada yang mengirim berkas mentah.
--
-- Tidak ada policy untuk anon maupun authenticated — hanya service_role
-- (lewat rute server) yang bisa membaca dan menulis.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti-hasil', 'bukti-hasil', false, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
