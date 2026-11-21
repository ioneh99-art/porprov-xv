-- 083_atlet_umum_tanpa_sandi_dan_nik.sql — 21 Nov 2026, APPLIED LIVE.
--
-- 1) PEMULIHAN: view atlet_umum (security_invoker) memuat kolom atlet_password_hash. Setelah
--    migrasi 082 mencabut hak publik atas kolom itu, SELECT apa pun ke atlet_umum lewat kunci
--    anon gagal ("permission denied for table atlet") → Data Atlet, Dashboard, Dokumen, Laporan,
--    dan Kejuaraan Kab. Bandung tidak memuat data. View dibuat ulang TANPA atlet_password_hash
--    dan TANPA original_data (potret data lama yang memuat NIK). Tidak ada halaman yang memakai
--    kedua kolom itu dari view ini.
-- 2) BOCOR NIK: view v_status_atlet (bukan security_invoker → berjalan dengan hak pemilik)
--    mengembalikan no_ktp ke kunci anon. Tidak dipakai kode mana pun → hak publik dicabut.
-- 3) BOCOR NIK: atlet.original_data memuat salinan NIK (potret perbaikan kualitas data) dan masih
--    terbaca anon → hak publik atas kolom itu dicabut (dibaca server dgn service key saja).

drop view if exists public.atlet_umum;
create view public.atlet_umum with (security_invoker = true) as
select id, kontingen_id, cabor_id, disiplin_id, no_kk, nama_lengkap, gender, tgl_lahir, tempat_lahir,
  alamat, provinsi, kota_kab, alamat_domisili, status_registrasi, status_verifikasi, catatan_registrasi,
  catatan_verifikasi, nomor_peserta, is_posted, foto_url, created_by, updated_by, created_at, updated_at,
  approved_cabor_at, approved_cabor_by, catatan_cabor, approved_admin_at, approved_admin_by, posted_at,
  posted_by, agama, gol_darah, kelurahan, kode_pos, no_hp_darurat, nama_kontak_darurat, status_kontingen,
  nama_pemilik_rekening, cabang_bank, npwp, nama_npwp, no_bpjs_kesehatan, no_bpjs_ketenagakerjaan, faskes,
  ukuran_kemeja, ukuran_celana, ukuran_sepatu, ukuran_topi, kode_asal_daerah, nama_asal_daerah,
  no_registrasi_koni, cabor_nama_raw, portal_aktif, last_login, login_count, is_public,
  data_quality_status, data_quality_notes, is_locked, locked_reason, locked_at, rekap_synced_at,
  tes_fisik_status, tes_fisik_kategori, tes_fisik_persen, tes_fisik_rating, tes_fisik_id, public_slug,
  prioritas_emas, prioritas_capaian, prioritas_sumber
from public.atlet;
grant select on public.atlet_umum to anon, authenticated, service_role;

revoke all on public.v_status_atlet from anon, authenticated;

revoke select (original_data), insert (original_data), update (original_data), references (original_data)
  on public.atlet from anon, authenticated;
