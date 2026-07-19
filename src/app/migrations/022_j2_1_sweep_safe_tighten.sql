-- 022_j2_1_sweep_safe_tighten.sql
-- Jenis 2 / J2-1 (2026-07-19) — sudah diterapkan ke live. Perketat TULIS 15 tabel
-- yang browser TAK menulisnya (no-writer atau tulis lewat API service_role).
-- BACA (SELECT anon) DIPERTAHANKAN. Terbukti: baca 200 OK, tulis anon 401 ditolak.

-- (a) Sudah ada policy SELECT terpisah → cukup drop policy tulis
DROP POLICY IF EXISTS public_all_atlet_accounts ON atlet_accounts;
DROP POLICY IF EXISTS dq_audit_insert_all       ON atlet_data_quality_audit;
DROP POLICY IF EXISTS atlet_dokumen_insert_any  ON atlet_dokumen;
DROP POLICY IF EXISTS atlet_dokumen_update_any  ON atlet_dokumen;
DROP POLICY IF EXISTS atlet_dokumen_delete_any  ON atlet_dokumen;
DROP POLICY IF EXISTS admin_all_klasemen        ON klasemen_medali;
DROP POLICY IF EXISTS admin_all_peserta         ON peserta_nomor;

-- (b) Cuma punya policy ALL → drop + ganti SELECT-only (baca dipertahankan)
DROP POLICY IF EXISTS cabor_kuota_all ON cabor_kuota;
CREATE POLICY cabor_kuota_read ON cabor_kuota FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS public_all_event_info ON event_info;
CREATE POLICY event_info_read ON event_info FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS public_all_import ON import_historis;
CREATE POLICY import_historis_read ON import_historis FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS allow_all_invoice_items ON invoice_items;
CREATE POLICY invoice_items_read ON invoice_items FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS allow_all_invoices ON invoices;
CREATE POLICY invoices_read ON invoices FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS public_read_jadwal ON jadwal_pertandingan;
CREATE POLICY jadwal_pertandingan_read ON jadwal_pertandingan FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS public_all_klaster ON klaster;
CREATE POLICY klaster_read ON klaster FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS public_all_performa ON rekam_performa;
CREATE POLICY rekam_performa_read ON rekam_performa FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS rekap_log_all ON rekap_import_log;
CREATE POLICY rekap_import_log_read ON rekap_import_log FOR SELECT TO public USING (true);

-- (c) Tabel mati → drop total
DROP POLICY IF EXISTS operator_own_data ON operator_cabor;

-- CATATAN: invoices/invoice_items masih anon-READABLE (leak finansial ringan);
-- pengetatan BACA menyusul di cluster keuangan J2-2.
