-- 046_bucket_foto_atlet.sql
-- Wadah penyimpanan pasfoto atlet.
--
-- Temuan yang melatari: storage.buckets ternyata KOSONG — wadah 'dokumen-atlet'
-- yang dirujuk /api/atlet/upload-dokumen tidak pernah ada, jadi unggah dokumen
-- lewat rute itu selalu gagal. Migrasi ini hanya membuat wadah foto; perbaikan
-- rute dokumen dikerjakan terpisah agar perubahannya tetap kecil dan terlacak.
--
-- public = true: kartu identitas memuat foto lewat <img src>, jadi berkasnya
-- harus terbaca tanpa token. Sebagai gantinya nama berkas diberi imbuhan acak
-- (lihat rute unggah) supaya alamatnya tidak bisa ditebak dari id atlet.
--
-- Batas 3 MB: foto sudah dikecilkan di peramban ke ~60 KB, jadi batas ini
-- semata jaring pengaman bila ada yang mengunggah berkas mentah.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foto-atlet', 'foto-atlet', true, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Baca: terbuka (dibutuhkan kartu identitas).
drop policy if exists "foto_atlet_baca_publik" on storage.objects;
create policy "foto_atlet_baca_publik" on storage.objects
  for select using (bucket_id = 'foto-atlet');

-- Tulis/ubah/hapus: TIDAK ada kebijakan untuk anon maupun authenticated.
-- Hanya service_role (yang melewati RLS) yang boleh menulis, yaitu lewat
-- rute server yang sudah memeriksa sesi dan kepemilikan atlet.
