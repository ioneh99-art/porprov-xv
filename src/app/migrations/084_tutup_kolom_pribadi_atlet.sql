-- 084_tutup_kolom_pribadi_atlet.sql — 21 Nov 2026, APPLIED LIVE (keputusan Bos: tutup sekarang).
-- Menutup sisa kolom pribadi atlet dari kunci anon/authenticated (melanjutkan pola 052 & 067):
--   No KK, tempat lahir, alamat (+domisili, kelurahan, kode pos), agama, golongan darah,
--   kontak darurat, rekening (nama pemilik, cabang), NPWP, BPJS, faskes.
-- Per 21 Nov kolom-kolom ini kosong untuk semua atlet (belum ada yang bocor); ditutup sebelum terisi.
-- Halaman membaca kolom ini lewat /api/konida/atlet-pii (bergerbang sesi + cek kepemilikan)
-- dan src/lib/atlet-pii-klien.ts; penulisan sudah lewat /api/atlet/edit & /api/atlet/create (service key).
-- View atlet_umum (dipakai halaman dgn kunci anon, select '*') dibuat ulang TANPA kolom-kolom itu.

drop view if exists public.atlet_umum;
create view public.atlet_umum with (security_invoker = true) as
select id, kontingen_id, cabor_id, disiplin_id, nama_lengkap, gender, tgl_lahir,
  provinsi, kota_kab, status_registrasi, status_verifikasi, catatan_registrasi,
  catatan_verifikasi, nomor_peserta, is_posted, foto_url, created_by, updated_by, created_at, updated_at,
  approved_cabor_at, approved_cabor_by, catatan_cabor, approved_admin_at, approved_admin_by, posted_at,
  posted_by, status_kontingen, ukuran_kemeja, ukuran_celana, ukuran_sepatu, ukuran_topi,
  kode_asal_daerah, nama_asal_daerah, no_registrasi_koni, cabor_nama_raw, portal_aktif, last_login,
  login_count, is_public, data_quality_status, data_quality_notes, is_locked, locked_reason, locked_at,
  rekap_synced_at, tes_fisik_status, tes_fisik_kategori, tes_fisik_persen, tes_fisik_rating, tes_fisik_id,
  public_slug, prioritas_emas, prioritas_capaian, prioritas_sumber
from public.atlet;
grant select on public.atlet_umum to anon, authenticated, service_role;

revoke select (no_kk, tempat_lahir, alamat, alamat_domisili, kelurahan, kode_pos, agama, gol_darah,
               no_hp_darurat, nama_kontak_darurat, nama_pemilik_rekening, cabang_bank, npwp, nama_npwp,
               no_bpjs_kesehatan, no_bpjs_ketenagakerjaan, faskes),
       insert (no_kk, tempat_lahir, alamat, alamat_domisili, kelurahan, kode_pos, agama, gol_darah,
               no_hp_darurat, nama_kontak_darurat, nama_pemilik_rekening, cabang_bank, npwp, nama_npwp,
               no_bpjs_kesehatan, no_bpjs_ketenagakerjaan, faskes),
       update (no_kk, tempat_lahir, alamat, alamat_domisili, kelurahan, kode_pos, agama, gol_darah,
               no_hp_darurat, nama_kontak_darurat, nama_pemilik_rekening, cabang_bank, npwp, nama_npwp,
               no_bpjs_kesehatan, no_bpjs_ketenagakerjaan, faskes)
  on public.atlet from anon, authenticated;
